"""Download large assets that are not in git (voice model, HDRIs, instrument sample libraries).
  pixi run fetch voice | hdri | instruments <lib> | instruments all
    voice              Kokoro TTS model (English, offline) -> core/tts/   (needs the "full" environment to use)
    hdri               Poly Haven HDRIs -> core/assets/polyhaven/
    instruments <lib>  one sample library -> core/audio/instruments/  (libs: freepats karoryfer salamander vcsl vsco2ce)
    instruments all    every sample library (about 1.4 GB)
An interrupted download resumes when you run the same command again. Needs about 2.2x the pack's size free.
Packs are the MIT-licensed Lemo-Opuscar asset release (see THIRD_PARTY_NOTICES.md); checksums in kit/assets.json.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
LIBS = 'freepats karoryfer salamander vcsl vsco2ce'.split()
a = sys.argv[1:]
if a[:1] in (['voice'], ['hdri']): packs = [a[0]]
elif a[:1] == ['instruments'] and len(a) > 1 and (a[1] in LIBS or a[1] == 'all'):
    packs = [f'instruments-{l}' for l in LIBS] if a[1] == 'all' else [f'instruments-{a[1]}']
else: sys.exit(__doc__)
import hashlib, json, os, shutil, subprocess, tarfile, time, urllib.error, urllib.request
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
man = json.load(open('kit/assets.json', encoding='utf-8'))
missing = [p for p in packs if p not in man['packs']]
if missing:
    sys.exit(f'✗ {", ".join(missing)} is not published yet (kit/assets.json has no entry).')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''): h.update(chunk)
    return h.hexdigest()


def download(url, tmp, size):
    have = lambda: os.path.getsize(tmp) if os.path.exists(tmp) else 0
    if have() > size: os.remove(tmp)                                  # not a partial copy of this pack
    if have() == size: return
    print(f'↓ {os.path.basename(url)} ({size / 1e6:.0f} MB){f", resuming at {have() / 1e6:.0f} MB" if have() else ""}', flush=True)
    fails = 0
    try:
        while have() < size:
            req = urllib.request.Request(url, headers={'Range': f'bytes={have()}-'} if have() else {})
            try: r = urllib.request.urlopen(req, timeout=60)
            except urllib.error.HTTPError as e:                       # GitHub answers 5xx now and then: try again, resuming
                fails += 1
                if e.code < 500 or fails > 3: raise
                time.sleep(2 * fails); continue
            with r:
                append = have() > 0 and r.status == 206               # a server that ignores Range sends everything again
                with open(tmp, 'ab' if append else 'wb') as f:
                    done = have() if append else 0
                    while chunk := r.read(1 << 20):
                        f.write(chunk); done += len(chunk)
                        print(f'\r  {done / size * 100:5.1f} %', end='', flush=True)
        print()
    except OSError as e:
        sys.exit(f'\n✗ download failed ({e}); check the network and run the same command again to resume')


def extract(tmp):
    with tarfile.open(tmp) as t:
        if hasattr(tarfile, 'data_filter'):                           # Python 3.12+ and the patched 3.8-3.11
            t.extractall('.', filter='data')
            return
        root = os.path.realpath('.')                                  # older Pythons: refuse anything that could leave the folder
        for m in t.getmembers():
            dest = os.path.realpath(os.path.join(root, m.name))
            link = os.path.realpath(os.path.join(os.path.dirname(dest), m.linkname)) if m.issym() else os.path.realpath(os.path.join(root, m.linkname)) if m.islnk() else dest
            if os.path.isabs(m.name) or m.isdev() or not all(x == root or x.startswith(root + os.sep) for x in (dest, link)):
                sys.exit(f'✗ the pack contains an unsafe entry ({m.name}); nothing was unpacked')
        t.extractall('.')


os.makedirs('.release', exist_ok=True)
for name in packs:
    p = man['packs'][name]
    size, tmp = p['size'], os.path.join('.release', p['file'] + '.download')
    need, free = int(size * 2.2) - (os.path.getsize(tmp) if os.path.exists(tmp) else 0), shutil.disk_usage('.').free
    if free < need:
        sys.exit(f'✗ not enough disk space: {p["file"]} is {size / 1e9:.2f} GB and needs about {need / 1e9:.1f} GB free here while it downloads and unpacks; {free / 1e9:.1f} GB is available')
    download(f'https://github.com/{man["repo"]}/releases/download/{man["tag"]}/{p["file"]}', tmp, size)
    if sha256(tmp) != p['sha256']:
        os.remove(tmp)
        sys.exit('✗ checksum mismatch. The pack on the release was probably updated after your copy of the library was.\n'
                 '  Download the latest Kaiships Studio release and run this again. If it still fails, just retry.')
    extract(tmp)
    os.remove(tmp)
    print(f'✓ {name}')
try: os.rmdir('.release')                                             # ours only when nothing else is staged there
except OSError: pass
