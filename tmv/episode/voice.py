"""Cut the narrator's one take into the beats' lines and join them into the voice track with timings (episode/make.mjs vo runs this).
  python episode/voice.py <episode folder>
Reads <ep>/vo/lines.json (in beat order) and <ep>/vo/take.wav (the whole narration, one Gemini call). The take is cut at
the pauses between lines: its stretches of voice are grouped so each line's length best matches its share by letters.
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
    """[(s, e)] seconds of each text inside the take. The take's stretches of voice are grouped in order, one group per
    text, so each group's length is closest to its share by letters (dynamic programming) and each cut sits on a pause."""
    segs = spoken(a); n, m = len(texts), len(segs)
    if m < n: sys.exit(f'voice.py: the take has {m} stretches of voice for {n} lines: make a new take (run the vo step again)')
    L = [len(t) for t in texts]; r = (segs[-1][1] - segs[0][0]) / sum(L)   # seconds per letter, over the whole take
    INF = float('inf'); best = [[INF] * (m + 1) for _ in range(n + 1)]; back = [[0] * (m + 1) for _ in range(n + 1)]; best[0][0] = 0
    for i in range(1, n + 1):
        for j in range(i, m - (n - i) + 1):
            for k in range(i - 1, j):
                if best[i - 1][k] == INF: continue
                gap = segs[j][0] - segs[j - 1][1] if j < m else 1.0   # the pause after this text: longer is a likelier cut
                c = best[i - 1][k] + (segs[j - 1][1] - segs[k][0] - r * L[i - 1]) ** 2 / (r * L[i - 1]) - min(gap, 1.0)
                if c < best[i][j]: best[i][j], back[i][j] = c, k
    out, j = [], m
    for i in range(n, 0, -1): k = back[i][j]; out.append((max(segs[k][0] - 0.04, 0), min(segs[j - 1][1] + 0.06, len(a) / SR))); j = k
    return out[::-1]

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
