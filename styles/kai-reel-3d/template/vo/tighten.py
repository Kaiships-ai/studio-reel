# tighten.py: shorten long silences in a take (no stretch, no pitch: only dead air is cut, speech untouched).
#   python vo/tighten.py vo/takes/take-01.wav vo/takes/take-01-tight.wav [max_gap_s=0.4]
import sys, numpy as np, soundfile as sf
x, sr = sf.read(sys.argv[1]); G = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
f = int(sr * 0.01); n = len(x) // f; db = 20 * np.log10(np.sqrt((x[:n * f].reshape(n, f) ** 2).mean(1)) + 1e-9)
quiet = db < np.percentile(db, 95) - 40                            # true silence only: breaths and sigh tails stay
out, i, keep, fade = [], 0, int(G * 100), int(0.005 * sr)
while i < n:
    j = i
    while j < n and quiet[j] == quiet[i]: j += 1
    a, b = i * f, (j * f if j < n else len(x))
    if quiet[i] and j - i > keep and i > 0 and j < n:                # keep G/2 each side, crossfade the join
        h = keep // 2 * f; head, tail = x[a:a + h].copy(), x[b - h:b].copy()
        head[-fade:] *= np.linspace(1, 0, fade); tail[:fade] *= np.linspace(0, 1, fade); out += [head, tail]
    else: out.append(x[a:b])
    i = j
y = np.concatenate(out); sf.write(sys.argv[2], y, sr); print(f'{len(x) / sr:.1f}s → {len(y) / sr:.1f}s')
