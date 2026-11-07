"""Cut the narrator's one take into the beats' lines and join them into the voice track with timings (episode/make.mjs vo runs this).
  python episode/voice.py <episode folder>
Reads <ep>/vo/lines.json (in beat order) and <ep>/vo/take.wav (the whole narration, one Gemini call). The take is cut at
the pauses between lines: the N-1 quiet stretches that are long and sit nearest where each line should end by its letters.
Writes <ep>/vo/vo.wav (mono 24 kHz) and <ep>/vo/vo.json: {duration, lines: [{id, who, text, s, e}], words: [{w, s, e, line}]}.
Gemini gives no word timings. The line is cut where the voice pauses (quiet 0.12 s+); when the pauses match the line's
phrases (split at . , ? !), each phrase gets its own stretch of sound, so a caption never runs ahead through a pause.
Inside a stretch each word gets a share by its letters."""
import sys, os, json
import numpy as np, soundfile as sf

LEAD, PAUSE, SR = 0.25, 0.32, 24000

def spoken(a, hop=0.01, gap=0.12):
    """[(s, e)] stretches of voice in a line take: 10 ms frames over -38 dB of the take's peak, quiet gaps under `gap` merged."""
    n = int(hop * SR); f = len(a) // n
    if f == 0: return [(0.0, len(a) / SR)]
    rms = np.sqrt(np.mean(a[:f * n].reshape(f, n) ** 2, axis=1)) + 1e-9
    on = 20 * np.log10(rms / rms.max()) > -38
    seg, start = [], None
    for i, v in enumerate(on):
        if v and start is None: start = i
        if not v and start is not None: seg.append([start * hop, i * hop]); start = None
    if start is not None: seg.append([start * hop, f * hop])
    out = []
    for s_, e_ in seg:
        if out and s_ - out[-1][1] < gap: out[-1][1] = e_
        else: out.append([s_, e_])
    return [tuple(x) for x in out] or [(0.0, len(a) / SR)]

def share(ws, s, e):
    w8 = [len(w) + 2 for w in ws]; tot, acc, out = sum(w8), 0, []
    for w, k in zip(ws, w8): out.append((w, s + (e - s) * acc / tot, s + (e - s) * (acc + k) / tot)); acc += k
    return out

def timed(text, a):
    """[(word, s, e)] inside one line take: phrases on the voice's own stretches when they match, else letters over the take."""
    ws = text.split(); segs = spoken(a)
    phrases, cur = [], []
    for w in ws:
        cur.append(w)
        if w[-1] in '.,?!;:': phrases.append(cur); cur = []
    if cur: phrases.append(cur)
    if len(segs) == len(phrases) > 1:
        return [x for ph, (s, e) in zip(phrases, segs) for x in share(ph, s, e)]
    return share(ws, segs[0][0], segs[-1][1])

def cuts(a, texts):
    """[(s, e)] seconds of each line inside the take: boundaries at the longest pauses near each line's letter-share end."""
    segs = spoken(a, gap=0.12); n = len(texts)
    gaps = [(segs[i][1], segs[i + 1][0]) for i in range(len(segs) - 1)]
    if len(gaps) < n - 1: sys.exit(f'voice.py: the take has {len(segs)} stretches of voice for {n} lines: make a new take (run the vo step again)')
    s0, e0 = segs[0][0], segs[-1][1]; w = np.cumsum([len(t) for t in texts]); want = [s0 + (e0 - s0) * x / w[-1] for x in w[:-1]]
    # dp over gaps in order: score = pause length - 0.15 * distance from where the line should end
    G, K = len(gaps), n - 1
    score = lambda g, k: (gaps[g][1] - gaps[g][0]) - 0.15 * abs((gaps[g][0] + gaps[g][1]) / 2 - want[k])
    best = [[-1e9] * G for _ in range(K)]; back = [[-1] * G for _ in range(K)]
    for g in range(G): best[0][g] = score(g, 0)
    for k in range(1, K):
        run_, arg = -1e9, -1
        for g in range(G):
            if g > 0 and best[k - 1][g - 1] > run_: run_, arg = best[k - 1][g - 1], g - 1
            if arg >= 0: best[k][g] = run_ + score(g, k); back[k][g] = arg
    pick = []
    if K:
        g = max(range(G), key=lambda x: best[K - 1][x])
        for k in range(K - 1, -1, -1): pick.append(g); g = back[k][g]
        pick.reverse()
    bounds = [s0] + [x for g in pick for x in gaps[g]] + [e0]
    return [(max(bounds[2 * i] - 0.04, 0), min(bounds[2 * i + 1] + 0.06, len(a) / SR)) for i in range(n)]

if __name__ == '__main__' and sys.argv[1:2] == ['--self-check']:
    t_ = np.arange(int(2.0 * SR)) / SR; tone = 0.3 * np.sin(2 * np.pi * 220 * t_)
    tone[int(0.8 * SR):int(1.2 * SR)] = 0   # "One, two" spoken 0-0.8 s and 1.2-2.0 s
    r = timed('Hello there, friend', tone.astype(np.float32))
    assert abs(r[2][1] - 1.2) < 0.03 and r[1][2] <= 0.81, r   # "friend" starts after the pause, "there," ends before it
    two = np.concatenate([tone, np.zeros(int(0.6 * SR)), tone]).astype(np.float32)   # line 1 has a 0.4 s inner pause, 0.6 s between lines
    c = cuts(two, ['One, two', 'Three, four'])
    assert len(c) == 2 and 2.5 < c[1][0] <= 2.6 and 2.0 <= c[0][1] < 2.1, c
    print('voice.py self-check ok'); sys.exit(0)

ep = sys.argv[1]
lines = json.load(open(os.path.join(ep, 'vo', 'lines.json'), encoding='utf-8'))
take, tsr = sf.read(os.path.join(ep, 'vo', 'take.wav'), dtype='float32')
if take.ndim > 1: take = take.mean(axis=1)
if tsr != SR:
    from scipy.signal import resample_poly
    take = resample_poly(take, SR, tsr).astype(np.float32)
pieces = {L['id']: take[int(s * SR):int(e * SR)] for L, (s, e) in zip(lines, cuts(take, [L['text'] for L in lines]))}
parts, out_lines, words, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], [], [], LEAD
for L in lines:
    a = pieces[L['id']]
    d = len(a) / SR
    out_lines.append({'id': L['id'], 'who': L.get('who'), 'text': L['text'], 's': round(t, 3), 'e': round(t + d, 3)})
    for w, s, e in timed(L['text'], a):
        words.append({'w': w, 's': round(t + s, 3), 'e': round(t + e, 3), 'line': L['id']})
    parts += [a, np.zeros(int(PAUSE * SR), dtype=np.float32)]
    t += d + PAUSE
audio = np.concatenate(parts)
sf.write(os.path.join(ep, 'vo', 'vo.wav'), audio, SR)
json.dump({'duration': round(len(audio) / SR, 3), 'lines': out_lines, 'words': words}, open(os.path.join(ep, 'vo', 'vo.json'), 'w', encoding='utf-8'), indent=1)
print(f'vo.wav {len(audio) / SR:.2f} s, {len(out_lines)} lines, {len(words)} words')
