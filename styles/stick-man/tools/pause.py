# Planned voice pauses: a vo/script.json line may carry "pause_after": <seconds>. After the take and align.py, this puts
# that much silence into vo/vo.wav after the line's last word and shifts vo/words.json to match.
#   python styles/stick-man/tools/pause.py films/<slug>
# The silence goes in the middle of the gap between the line's last word and the next line's first word (never inside a
# word). Idempotent: the take without pauses is kept as vo/vo-nopause.wav and vo/words-nopause.json, and vo/pauses.json
# records the hashes of what this tool wrote. Every run rebuilds vo.wav and words.json from the no-pause copies, so a
# second run changes nothing, and a changed pause_after is applied from scratch. A new take (vo.wav not the one this tool
# wrote) replaces the no-pause wav; words.json re-aligned on the paused wav is shifted back before it is kept.
# Once pauses.json exists, a missing no-pause copy is an error: the paused take is never copied as the no-pause take.
# Writes are atomic (temp file + rename). pauses.json lists the hashes it is about to write as "pending" before vo.wav
# and words.json are replaced, so a run stopped half way still knows both files are its own.
# 16-bit (or wider) integer PCM wav, any channel count; standard library only.
import hashlib, json, os, shutil, sys, wave


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16] if os.path.exists(p) else ''


def shifts(lines):
    """Seconds every word of each line moves: the sum of pause_after of the lines before it."""
    out, acc = {}, 0.0
    for l in lines:
        out[l['id']] = acc
        acc += float(l.get('pause_after') or 0)
    return out


def put(p, write):
    """Atomic write: write(tmp path), then rename over p."""
    tmp = p + '.tmp'
    write(tmp); os.replace(tmp, p)


def put_json(p, obj, **kw):
    put(p, lambda t: json.dump(obj, open(t, 'w'), **kw))


def read_wav(p):
    try:
        with wave.open(p) as w: prm = w.getparams(); data = w.readframes(prm.nframes)
    except wave.Error as e:
        sys.exit(f'{p}: not an integer PCM wav ({e}); a 32-bit float wav must be converted first: ffmpeg -i in.wav -c:a pcm_s16le out.wav')
    if prm.sampwidth < 2: sys.exit(f'{p}: pause.py needs 16-bit (or wider) PCM, not {8 * prm.sampwidth}-bit')
    return prm, data


def main(film):
    vo = os.path.join(film, 'vo'); P = lambda n: os.path.join(vo, n)
    S = json.load(open(P('script.json'))); lines = S['lines']
    book = json.load(open(P('pauses.json'))) if os.path.exists(P('pauses.json')) else None
    if not os.path.exists(P('vo.wav')) or not os.path.exists(P('words.json')): sys.exit('pause.py needs vo/vo.wav and vo/words.json (voice.py --take, then align.py)')
    if book is not None:
        for n in ('vo-nopause.wav', 'words-nopause.json'):
            if not os.path.exists(P(n)): sys.exit(f'vo/{n} is missing but vo/pauses.json says vo/vo.wav has pauses in it: restore vo/{n}, or record a new take (voice.py --take, align.py) and delete vo/pauses.json')
    book = book or {}
    ours = lambda key, f: sha(P(f)) in {book.get(key), (book.get('pending') or {}).get(key)} - {None, ''}
    done = dict(book.get('applied', []))
    old = shifts([{'id': l['id'], 'pause_after': done.get(l['id'], 0)} for l in lines])
    wav_ours = ours('wav', 'vo.wav')
    if not wav_ours:  # a new take: it becomes the no-pause take
        read_wav(P('vo.wav')); put(P('vo-nopause.wav'), lambda t: shutil.copyfile(P('vo.wav'), t))
    if not ours('words', 'words.json'):
        ws = json.load(open(P('words.json')))
        if wav_ours and done:  # re-aligned on the paused wav: move the words back to the no-pause timeline
            for w in ws: d = old.get(w['line'], 0.0); w['t0'] = round(w['t0'] - d, 3); w['t1'] = round(w['t1'] - d, 3)
        put_json(P('words-nopause.json'), ws, indent=0)
    raw = json.load(open(P('words-nopause.json')))
    prm, data = read_wav(P('vo-nopause.wav'))
    fb, rate = prm.nchannels * prm.sampwidth, prm.framerate
    cuts = []  # (frame in the no-pause take, frames of silence)
    for k, l in enumerate(lines):
        sec = float(l.get('pause_after') or 0)
        if sec <= 0: continue
        mine = [w for w in raw if w['line'] == l['id']]
        if not mine: sys.exit(f"{l['id']}: pause_after but no words in vo/words.json (align first)")
        nxt = next((w for nl in lines[k + 1:] for w in raw if w['line'] == nl['id']), None)
        t = mine[-1]['t1'] if nxt is None else (mine[-1]['t1'] + max(mine[-1]['t1'], nxt['t0'])) / 2
        cuts.append((min(prm.nframes, round(t * rate)), round(sec * rate)))
    parts, at = [], 0
    for f, n in sorted(cuts):
        parts += [data[at * fb:f * fb], b'\0' * (n * fb)]; at = f
    parts.append(data[at * fb:])
    sh = shifts(lines)
    out = [{**w, 't0': round(w['t0'] + sh.get(w['line'], 0.0), 3), 't1': round(w['t1'] + sh.get(w['line'], 0.0), 3)} for w in raw]
    applied = [[l['id'], float(l['pause_after'])] for l in lines if float(l.get('pause_after') or 0) > 0]

    def write_wav(t):
        with wave.open(t, 'wb') as w:
            w.setnchannels(prm.nchannels); w.setsampwidth(prm.sampwidth); w.setframerate(rate); w.writeframes(b''.join(parts))
    write_wav(P('vo.wav.new')); json.dump(out, open(P('words.json.new'), 'w'), indent=0)
    new = {'wav': sha(P('vo.wav.new')), 'words': sha(P('words.json.new'))}
    about = 'written by pause.py: hashes of the vo.wav / words.json it wrote, and the pauses in them'
    put_json(P('pauses.json'), {'about': about, 'wav': book.get('wav'), 'words': book.get('words'), 'applied': book.get('applied', []), 'pending': new}, indent=1)
    os.replace(P('vo.wav.new'), P('vo.wav')); os.replace(P('words.json.new'), P('words.json'))
    put_json(P('pauses.json'), {'about': about, **new, 'applied': applied}, indent=1)
    total = sum(s for _, s in applied)
    print(f"vo/vo.wav: {len(applied)} pause(s), +{total:.2f} s · {', '.join(f'{i} {s:g} s' for i, s in applied) or 'none'}")


if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit('usage: pause.py films/<slug>')
    main(os.path.abspath(sys.argv[1]))
