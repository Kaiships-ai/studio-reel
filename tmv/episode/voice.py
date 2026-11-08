"""Cut the narrator's one take into the beats' lines and join them into the voice track with timings (episode/make.mjs vo runs this).
  python episode/voice.py <episode folder>
Reads <ep>/vo/lines.json (in beat order) and <ep>/vo/take.wav (the whole narration, one Gemini call). The take is cut at
the pauses between lines: its stretches of voice are grouped so each line's length best matches its share by letters.
Writes <ep>/vo/vo.wav (mono 24 kHz) and <ep>/vo/vo.json: {duration, lines: [{id, who, text, s, e}], words: [{w, s, e, line}]}.
Gemini gives no word timings. The line is cut where the voice pauses (quiet 0.12 s+), and its words are split into one run
per stretch of sound, so a caption never runs ahead through a pause. Inside a stretch each word gets a share by its letters.
A breath is not a stretch (it is noise, flat across the spectrum); a soft word is (it has harmonics), even 50 dB down.
Before the words are timed, every pause inside a line longer than CAP is cut to CAP (the middle of the pause goes, never a
word), so the voice runs on and the word times follow the tightened audio.
A take that says one line twice (a Gemini glitch) stops it before anything is written: every caption after that line would drift."""
import sys, os, json
import numpy as np, soundfile as sf
from scipy.fft import dct

LEAD, PAUSE, CAP, SR = 0.25, 0.32, 0.34, 24000
BREATH, SOFT = 0.28, -50

def spoken(a, hop=0.01, gap=0.12, click=0.06, soft=-38):
    """[(s, e)] stretches of voice in a line take: 10 ms frames over -38 dB of the take's peak, or over `soft` dB when the frame
    is not noise (spectral flatness over 100 Hz-4 kHz under BREATH), quiet gaps under `gap` merged, stretches under `click`
    dropped (no word is that short; a click would take a phrase's place in timed()), and stretches of noise dropped (median
    flatness BREATH or more: a breath). Measured on 5 Gemini takes: breaths 0.34-0.50, words up to 0.21.
    cuts() keeps soft=-38: over a whole take a lower floor moved line cuts by up to 2 s."""
    n = int(hop * SR); f = len(a) // n
    if f == 0: return [(0.0, len(a) / SR)]
    fr = a[:f * n].reshape(f, n); rms = np.sqrt(np.mean(fr ** 2, axis=1)) + 1e-9
    P = np.abs(np.fft.rfft(fr * np.hanning(n), axis=1))[:, 1:41] ** 2 + 1e-12
    flat = np.exp(np.log(P).mean(1)) / P.mean(1); db = 20 * np.log10(rms / rms.max())
    on = (db > -38) | ((db > soft) & (flat < BREATH))
    seg, start = [], None
    for i, v in enumerate(on):
        if v and start is None: start = i
        if not v and start is not None: seg.append([start * hop, i * hop]); start = None
    if start is not None: seg.append([start * hop, f * hop])
    out = []
    for s_, e_ in seg:
        if out and s_ - out[-1][1] < gap: out[-1][1] = e_
        else: out.append([s_, e_])
    return [tuple(x) for x in out if x[1] - x[0] >= click and np.median(flat[round(x[0] / hop):round(x[1] / hop)]) < BREATH] or [(0.0, len(a) / SR)]

def tighten(a):
    """The line take with every pause in it over CAP cut to CAP: the pause's middle goes, joined with a 12 ms crossfade."""
    segs, xf, keep, pos = spoken(a, soft=SOFT), int(0.012 * SR), [], 0
    for (_, e0), (s1, _) in zip(segs, segs[1:]):
        if s1 - e0 > CAP: keep.append((pos, int((e0 + CAP / 2) * SR))); pos = int((s1 - CAP / 2) * SR)
    out = a[:0]
    for s, e in keep + [(pos, len(a))]:
        x = a[s:e].copy()
        if len(out) >= xf and len(x) >= xf:
            r = np.linspace(0, 1, xf, dtype=np.float32); x[:xf] = out[-xf:] * (1 - r) + x[:xf] * r; out = out[:-xf]
        out = np.concatenate([out, x])
    return out

def share(ws, s, e):
    w8 = [len(w) + 2 for w in ws]; tot, acc, out = sum(w8), 0, []
    for w, k in zip(ws, w8): out.append((w, s + (e - s) * acc / tot, s + (e - s) * (acc + k) / tot)); acc += k
    return out

def timed(text, a):
    """[(word, s, e)] inside one line take. The words are split into one run per stretch of voice, so each run's letters best
    match its stretch's length (dynamic programming, as in cuts()); a run that ends inside a phrase costs 1, at , ; : 0.3, at
    . ? ! nothing. With one stretch, or more stretches than words, the words share the whole take by letters."""
    ws = text.split(); segs = spoken(a, soft=SOFT); n, m = len(ws), len(segs)
    if not 1 < m <= n: return share(ws, segs[0][0], segs[-1][1])
    W = np.cumsum([0] + [len(w) + 2 for w in ws]); r = sum(e - s for s, e in segs) / W[-1]
    stop = lambda w: 0 if w[-1] in '.?!' else 0.3 if w[-1] in ',;:' else 1.0
    INF = float('inf'); best = [[INF] * (n + 1) for _ in range(m + 1)]; back = [[0] * (n + 1) for _ in range(m + 1)]; best[0][0] = 0
    for i in range(1, m + 1):
        d = segs[i - 1][1] - segs[i - 1][0]
        for j in range(i, n - (m - i) + 1):
            for k in range(i - 1, j):
                c = best[i - 1][k] + (d - r * (W[j] - W[k])) ** 2 / (r * (W[j] - W[k])) + (stop(ws[j - 1]) if j < n else 0)
                if c < best[i][j]: best[i][j], back[i][j] = c, k
    out, j = [], n
    for i in range(m, 0, -1): k = back[i][j]; out = share(ws[k:j], *segs[i - 1]) + out; j = k
    return out

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

def cepstra(a, hop=0.02, win=0.04, bands=40):
    """13 cepstra (c1-c13 of 40 log-mel bands, 40 ms frames every 20 ms), each normalised over the take."""
    n, h = int(win * SR), int(hop * SR); f = 1 + max(0, (len(a) - n) // h)
    X = np.abs(np.fft.rfft(a[np.arange(n)[None] + h * np.arange(f)[:, None]] * np.hanning(n), 1024)) ** 2
    mel = lambda x: 2595 * np.log10(1 + x / 700)
    b = np.floor(1025 * 700 * (10 ** (np.linspace(mel(80), mel(7600), bands + 2) / 2595) - 1) / SR).astype(int)
    fb = np.zeros((bands, 513))
    for i in range(bands):
        fb[i, b[i]:b[i + 1]] = np.linspace(0, 1, b[i + 1] - b[i], endpoint=False)
        fb[i, b[i + 1]:b[i + 2]] = np.linspace(1, 0, b[i + 2] - b[i + 1], endpoint=False)
    C = dct(np.log(X @ fb.T + 1e-8), norm='ortho', axis=1)[:, 1:14]
    return (C - C.mean(0)) / (C.std(0) + 1e-9)

def repeated(a, win=1.2, reach=6.0, limit=0.30):
    """(s, t): the voice says the same `win` seconds at s and again at t, within `reach` seconds of speech, or None.
    Each window of speech is matched (DTW, cosine distance) inside the next `reach` seconds of speech. Measured on real Gemini
    takes: a line read twice scores 0.20-0.24, the closest pair in a good take 0.39-0.45."""
    C = cepstra(a); on = np.zeros(len(C), bool)
    for s, e in spoken(a): on[int(s * 50):int(e * 50)] = True
    at = np.flatnonzero(on); V = C[at]; V = V / (np.linalg.norm(V, axis=1, keepdims=True) + 1e-9)
    W, gap, best = int(win * 50), 10, (limit, None)
    for q in range(0, len(V) - 2 * W - gap, W // 5):
        T = V[q + W + gap:q + W + gap + int(reach * 50)]; D = 1 - V[q:q + W] @ T.T; acc = D[0].copy()
        for row in D[1:]:
            acc = row + np.minimum(acc, np.minimum(np.r_[np.inf, acc[:-1]], np.r_[np.inf, np.inf, acc[:-2]]))
        if acc.min() / W < best[0]: best = (acc.min() / W, (at[q] / 50, at[q + gap + acc.argmin()] / 50))
    return best[1]

def said_twice(texts, n=4):
    """True when the script itself repeats a run of `n` words: then the take may too."""
    w = [x.strip('.,?!;:"\'').lower() for t in texts for x in t.split()]
    runs = [tuple(w[i:i + n]) for i in range(len(w) - n + 1)]
    return len(set(runs)) < len(runs)

if __name__ == '__main__' and sys.argv[1:2] == ['--self-check']:
    t_ = np.arange(int(2.0 * SR)) / SR; tone = 0.3 * np.sin(2 * np.pi * 220 * t_)
    tone[int(0.8 * SR):int(1.2 * SR)] = 0   # "One, two" spoken 0-0.8 s and 1.2-2.0 s
    r = timed('Hello there, friend', tone.astype(np.float32))
    assert abs(r[2][1] - 1.2) < 0.03 and r[1][2] <= 0.81, r   # "friend" starts after the pause, "there," ends before it
    two = np.concatenate([tone, np.zeros(int(0.6 * SR)), tone]).astype(np.float32)   # line 1 has a 0.4 s inner pause, 0.6 s between lines
    c = cuts(two, ['One, two', 'Three, four'])
    assert len(c) == 2 and 2.5 < c[1][0] <= 2.6 and 2.0 <= c[0][1] < 2.1, c
    long_ = np.concatenate([tone[:int(0.8 * SR)], np.zeros(int(1.0 * SR), np.float32), tone[int(1.2 * SR):]]).astype(np.float32)
    t2 = tighten(long_); r = timed('Hello there, friend', t2)   # a 1.0 s pause inside the line becomes CAP, "friend" moves with it
    assert abs(len(t2) / SR - (1.6 + CAP - 0.012)) < 0.02 and abs(r[2][1] - (0.8 + CAP - 0.012)) < 0.03, (len(t2) / SR, r)
    short = np.concatenate([tone[:int(0.8 * SR)], np.zeros(int(0.3 * SR), np.float32), tone[int(1.2 * SR):]]).astype(np.float32)
    assert len(tighten(short)) == len(short)   # a pause under CAP stays as it is
    rng = np.random.default_rng(7); fq = np.fft.rfftfreq(int(0.08 * SR), 1 / SR)   # a line: 27 sounds of 80 ms, each noise
    sound = lambda: np.fft.irfft(np.fft.rfft(rng.standard_normal(len(fq) * 2 - 2)) * sum(np.exp(-((fq - rng.uniform(200, 6000)) / 300) ** 2) for _ in range(3)))
    line = lambda: np.concatenate([sound() for _ in range(27)])   # through three random formants, so no two lines sound alike
    pause = np.zeros(int(0.5 * SR)); A, B, C = line(), line(), line()
    assert repeated(np.concatenate([A, pause, B, pause, C]).astype(np.float32)) is None
    r = repeated(np.concatenate([A, pause, B, pause, B, pause, C]).astype(np.float32))   # B read twice: found at B, again a reading later
    assert r and 2.6 < r[0] < 4.82 and abs(r[1] - r[0] - 2.66) < 0.1, r
    assert said_twice(['One more time, again.', 'One more time, again.']) and not said_twice(['Three nights.', 'Show the night you almost quit.'])
    clicked = np.concatenate([np.zeros(int(0.04 * SR)), tone[:int(0.01 * SR)], np.zeros(int(0.16 * SR)), tone]).astype(np.float32)
    r = timed('Hello there, friend', clicked)   # a 10 ms click before the line is not a phrase: "friend" still starts after the pause
    assert abs(r[2][1] - 1.41) < 0.03, r
    quiet = tone[int(1.2 * SR):int(1.6 * SR)] * 10 ** (-42 / 20)   # "two," 42 dB down, with 0.4 s pauses around it
    soft = np.concatenate([tone[:int(0.8 * SR)], np.zeros(int(0.4 * SR)), quiet, np.zeros(int(0.4 * SR)), tone[int(1.2 * SR):]]).astype(np.float32)
    t3 = tighten(soft); r = timed('One, two, three', t3)   # the soft word is kept: each pause goes to CAP, not one 1.2 s pause
    assert abs(len(t3) / SR - (2.0 + 2 * (CAP - 0.012))) < 0.02 and abs(r[1][1] - (0.8 + CAP - 0.012)) < 0.03, (len(t3) / SR, r)
    breath = np.concatenate([0.3 * 10 ** (-25 / 20) * rng.standard_normal(int(0.3 * SR)), np.zeros(int(0.2 * SR)), tone]).astype(np.float32)
    r = timed('Hello there, friend', breath)   # a breath (white noise, 25 dB down) is not a word: "Hello" starts with the voice
    assert abs(r[0][1] - 0.5) < 0.03 and abs(r[2][1] - 1.7) < 0.03, r
    print('voice.py self-check ok'); sys.exit(0)

ep = sys.argv[1]
lines = json.load(open(os.path.join(ep, 'vo', 'lines.json'), encoding='utf-8'))
take, tsr = sf.read(os.path.join(ep, 'vo', 'take.wav'), dtype='float32')
if take.ndim > 1: take = take.mean(axis=1)
if tsr != SR:
    from scipy.signal import resample_poly
    take = resample_poly(take, SR, tsr).astype(np.float32)
texts = [L['text'] for L in lines]; twice = None if said_twice(texts) else repeated(take)
if twice:
    once = np.concatenate([take[:int(twice[0] * SR)], take[int(twice[1] * SR):]])   # s to t is one reading: cut it, then find s
    L = lines[max(i for i, (s, _) in enumerate(cuts(once, texts)) if s <= twice[0])]
    sys.exit(f'voice.py: the take says {L["id"]} twice ("{L["text"]}" at {twice[0]:.1f} s and {twice[1]:.1f} s), so every caption after it would drift: re-run vo for a new take')
pieces = {L['id']: take[int(s * SR):int(e * SR)] for L, (s, e) in zip(lines, cuts(take, [L['text'] for L in lines]))}
parts, out_lines, words, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], [], [], LEAD
for L in lines:
    a = tighten(pieces[L['id']])
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
