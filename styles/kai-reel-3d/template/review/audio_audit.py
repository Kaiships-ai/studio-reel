# audio audit: run from project root. mix/stems vs vo.wav
import wave, numpy as np, subprocess, re, sys
from scipy.signal import butter, sosfilt
def rd(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        ch = w.getnchannels(); sr = w.getframerate()
    return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr
sfx, sr = rd('audio/sfx.wav'); music, _ = rd('audio/music.wav'); mix, _ = rd('audio/mix.wav'); vo, _ = rd('vo/vo.wav')
def band(x): return sosfilt(butter(4, [200 / (sr / 2), 6000 / (sr / 2)], 'band', output='sos'), x)
w = int(0.05 * sr)
def er(x): k = len(x) // w; return np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1))
# stems/mix carry the master gain G; estimate it robustly (median ratio on non-peak samples, limiter only touches peaks) and scale vo to match
res_ = (mix - music - sfx)[:len(vo)]; sel = np.abs(vo) > 0.01
G = np.median(res_[sel] / vo[sel]); vo = vo * G
def band(x): return sosfilt(butter(4, [200 / (sr / 2), 6000 / (sr / 2)], 'band', output='sos'), x)
w = int(0.05 * sr)
def er(x): k = len(x) // w; return np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1))
n = min(len(sfx), len(vo)); se, ve, me = er(band(sfx[:n])), er(band(vo[:n])), er(band(music[:n]))
speech = ve > 0.1 * ve.max(); act = se > 0.02 * se.max(); med = np.median(ve[speech])
P = np.abs(np.fft.rfft(sfx)) ** 2; f = np.fft.rfftfreq(len(sfx), 1 / sr); low = P[f < 150].sum() / P.sum() * 100
o = subprocess.run(['ffmpeg', '-nostats', '-i', 'audio/mix.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', o)[-1])
peak_rel = 20 * np.log10(se.max() / med)
over = ((se > ve * 10 ** (-3 / 20)) & speech & act).sum()
mdb = 20 * np.log10(np.median(me[speech]) / med)
res = [('mix integrated -14 ±1 LUFS', abs(I + 14) <= 1, f'{I:.2f} LUFS'),
       ('true peak <= -1.0 dBFS', TP <= -1.0, f'{TP:.2f} dBFS'),
       ('SFX energy under 150 Hz < 10%', low < 10, f'{low:.2f}%'),
       ('loudest SFX 50 ms <= -3 dB vs median speaking VO', peak_rel <= -3, f'{peak_rel:+.1f} dB'),
       ('no 50 ms window with SFX within 3 dB of speaking VO', over == 0, f'{over} windows'),
       ('music >= 15 dB under VO during speech', mdb <= -15, f'{mdb:+.1f} dB'),
       ('mix length = vo length ±33 ms', abs(len(mix) - len(vo)) <= 0.033 * sr, f'{len(mix)/sr:.3f}s vs {len(vo)/sr:.3f}s')]
for name, ok, v in res: print(('PASS' if ok else 'FAIL'), name, '·', v)
print(f'{sum(r[1] for r in res)}/{len(res)} audio checks passed')
if "-v" in sys.argv:
    for i in np.where((se > ve * 10 ** (-3 / 20)) & speech & act)[0]: print(round(i*.05,2), f'{20*np.log10(se[i]/ve[i]):+.1f}')
    print('median vo', 20*np.log10(med), 'sfx max', 20*np.log10(se.max()))
