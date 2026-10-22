# v2 audio levels (LISTICLE step 7): ebur128 of the 3 stems; each hit vs the voice; SFX vs words in the 2–8 kHz band.
# usage (after audio/score.py): uv run -q --python 3.12 --with numpy --with scipy python review/levels.py
import json, re, subprocess, wave, numpy as np
from scipy.signal import butter, sosfilt
def rd(p):
    with wave.open(p) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768; return x, w.getframerate()
def lufs(p):
    o = subprocess.run(['ffmpeg', '-nostats', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1])
for s in ['vo_m', 'sfx', 'music', 'mix']: print(f'{s:6} {lufs(f"audio/{s}.wav"):6.1f} LUFS')
vo, sr = rd('audio/vo_m.wav'); sx, _ = rd('audio/sfx.wav'); n = min(len(vo), len(sx)); vo, sx = vo[:n], sx[:n]
w = int(0.05 * sr); k = n // w; r = lambda x: np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-12
ve = r(vo); sp = ve > 0.1 * ve.max(); vmed = np.median(ve[sp])
cues = json.load(open('audio/cues.json')); hits = []
for c in cues:
    i = int((c['t'] + 1 / 30) * sr); seg = sx[i:i + int(0.15 * sr)]
    if len(seg): hits.append((20 * np.log10(np.sqrt((seg ** 2).mean()) / vmed + 1e-12), c['kind'], c['t']))
h = np.array([x[0] for x in hits]); print(f'hits {len(h)}  vs median speech (full band, 150 ms): median {np.median(h):.1f} dB  p25 {np.percentile(h,25):.1f}  p75 {np.percentile(h,75):.1f}  in −8…−4: {((h>=-8)&(h<=-4)).sum()}  louder than −4: {(h>-4).sum()}')
hb = lambda x: sosfilt(butter(4, [2000 / (sr / 2), 8000 / (sr / 2)], 'band', output='sos'), x)
vb, sb = hb(vo), hb(sx); vfloor = 0.01 * np.abs(vb).max() / 3
W = json.loads(re.search(r'VO_WORDS = (\[.*?\]);', open('src/vo.js').read()).group(1)); bad = []
for wd in W:
    i0, i1 = int(wd['s'] * sr), int(wd['e'] * sr); m = -99; ww = int(0.05 * sr)
    for j in range(i0, max(i0 + 1, i1 - ww + 1), ww // 2):
        v = np.sqrt((vb[j:j + ww] ** 2).mean()); x = np.sqrt((sb[j:j + ww] ** 2).mean())
        if v > vfloor: m = max(m, 20 * np.log10(x / v + 1e-12))   # only where the voice has consonant energy (> max − 40 dB)
    if m > -6: bad.append((wd['w'], round(m, 1)))
print(f'2–8 kHz: words with SFX within 6 dB of the voice: {len(bad)} {bad[:8]}')
