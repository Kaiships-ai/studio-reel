# Planned voice pauses: a vo/script.json line may carry "pause_after": <seconds>. After the take and align.py, this puts
# that much silence into vo/vo.wav after the line's last word and shifts vo/words.json to match.
#   python styles/stick-man/tools/pause.py films/<slug>
# The silence goes in the middle of the gap between the line's last word and the next line's first word (never inside a
# word). Idempotent: the take without pauses is kept as vo/vo-nopause.wav and vo/words-nopause.json, and vo/pauses.json
# records the hashes of what this tool wrote. Every run rebuilds vo.wav and words.json from the no-pause copies, so a
# second run changes nothing, and a changed pause_after is applied from scratch. A new take (vo.wav not the one this tool
# wrote) replaces the no-pause wav; words.json re-aligned on the paused wav is shifted back before it is kept.
# 16-bit (or wider) PCM wav, any channel count; standard library only.
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


def main(film):
    vo = os.path.join(film, 'vo'); P = lambda n: os.path.join(vo, n)
    S = json.load(open(P('script.json'))); lines = S['lines']
    book = json.load(open(P('pauses.json'))) if os.path.exists(P('pauses.json')) else {}
    if not os.path.exists(P('vo.wav')) or not os.path.exists(P('words.json')): sys.exit('pause.py needs vo/vo.wav and vo/words.json (voice.py --take, then align.py)')
    done = dict(book.get('applied', []))
    old = shifts([{'id': l['id'], 'pause_after': done.get(l['id'], 0)} for l in lines])
    # the no-pause take: a new vo.wav (not ours) is the new take; ours means vo-nopause.wav still holds the take
    if sha(P('vo.wav')) != book.get('wav') or not os.path.exists(P('vo-nopause.wav')):
        shutil.copyfile(P('vo.wav'), P('vo-nopause.wav')); old_wav_ours = False
    else: old_wav_ours = True
    if sha(P('words.json')) != book.get('words') or not os.path.exists(P('words-nopause.json')):
        ws = json.load(open(P('words.json')))
        if old_wav_ours and done:  # re-aligned on the paused wav: move the words back to the no-pause timeline
            for w in ws: d = old.get(w['line'], 0.0); w['t0'] = round(w['t0'] - d, 3); w['t1'] = round(w['t1'] - d, 3)
        json.dump(ws, open(P('words-nopause.json'), 'w'), indent=0)
    raw = json.load(open(P('words-nopause.json')))
    sh = shifts(lines)
    with wave.open(P('vo-nopause.wav')) as w:
        prm = w.getparams(); data = w.readframes(prm.nframes)
    if prm.sampwidth < 2: sys.exit('pause.py needs 16-bit (or wider) PCM')
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
    with wave.open(P('vo.wav'), 'wb') as w:
        w.setnchannels(prm.nchannels); w.setsampwidth(prm.sampwidth); w.setframerate(rate); w.writeframes(b''.join(parts))
    out = [{**w, 't0': round(w['t0'] + sh.get(w['line'], 0.0), 3), 't1': round(w['t1'] + sh.get(w['line'], 0.0), 3)} for w in raw]
    json.dump(out, open(P('words.json'), 'w'), indent=0)
    applied = [[l['id'], float(l['pause_after'])] for l in lines if float(l.get('pause_after') or 0) > 0]
    json.dump({'about': 'written by pause.py: hashes of the vo.wav / words.json it wrote, and the pauses in them',
               'wav': sha(P('vo.wav')), 'words': sha(P('words.json')), 'applied': applied}, open(P('pauses.json'), 'w'), indent=1)
    total = sum(s for _, s in applied)
    print(f"vo/vo.wav: {len(applied)} pause(s), +{total:.2f} s · {', '.join(f'{i} {s:g} s' for i, s in applied) or 'none'}")


if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit('usage: pause.py films/<slug>')
    main(os.path.abspath(sys.argv[1]))
