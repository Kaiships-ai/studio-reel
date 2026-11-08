# tighten.py <take.wav> <out.wav> [cap_s] [tempo]: one take → the timeline voice. Finds the pauses (10 ms RMS frames more
# than 40 dB under the loud speech level, ≥ 0.12 s), shortens every pause longer than cap to cap (cuts the middle of the
# pause, 12 ms crossfades, never touches a word), trims the head/tail to 0.06 s, optional global tempo (ffmpeg atempo).
import sys, subprocess, numpy as np, soundfile as sf
src, out = sys.argv[1], sys.argv[2]; CAP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.38; TEMPO = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
SR = 48000
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-']), np.int16).astype(np.float32) / 32768
hop = SR // 100; n = len(x) // hop
LVL = float(sys.argv[5]) if len(sys.argv) > 5 else -16.0   # the stem's loudness in the final mix: the gate's −35 dBFS is read at this level
I = float(subprocess.run(['ffmpeg', '-nostats', '-i', src, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
x = x * 10 ** ((LVL - I) / 20)
db = 20 * np.log10(np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) for i in range(n)])) + 1e-9)
quiet = db < -33.0   # 2 dB stricter than the gate's −35 dB
runs, i = [], 0
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        runs.append((i, j)); i = j
    else: i += 1
first = next(j for a, j in runs if a == 0) if runs and runs[0][0] == 0 else 0
last = runs[-1][0] if runs and runs[-1][1] == n else n
keep, pos, xf = [], max(0, first - 6) * hop, int(0.012 * SR)
cuts = 0
for a, b in runs:
    if a == 0 or b == n: continue
    L = (b - a) / 100
    if L > CAP and L >= 0.12:
        mid_a = a * hop + int(CAP / 2 * SR); mid_b = b * hop - int(CAP / 2 * SR)
        keep.append((pos, mid_a)); pos = mid_b; cuts += 1
keep.append((pos, min(len(x), (last + 6) * hop)))
y = np.zeros(0, np.float32)
for s, e in keep:
    seg_ = x[s:e].copy()
    if len(y) >= xf and len(seg_) >= xf:
        r = np.linspace(0, 1, xf, dtype=np.float32); y[-xf:] = y[-xf:] * (1 - r) + seg_[:xf] * r; y = np.concatenate([y, seg_[xf:]])
    else: y = np.concatenate([y, seg_])
sf.write(out, y, SR)
if TEMPO != 1.0:
    tmp = out + '.tmp.wav'; sf.write(tmp, y, SR)
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'atempo={TEMPO}', '-ar', str(SR), '-ac', '1', out]); import os; os.remove(tmp)
print(f'{len(x)/SR:.2f}s → {sf.info(out).duration:.2f}s · {cuts} pauses capped at {CAP}s · tempo {TEMPO}')
