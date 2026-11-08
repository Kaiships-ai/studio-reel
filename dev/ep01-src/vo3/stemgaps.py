# stemgaps.py <wav>: the gate's own speech measure on a voice stem (silencedetect −35 dB, ≥ 0.3 s) → gaps > 0.45 s and the LUFS/peak.
import sys, subprocess, json
w = sys.argv[1]
out = subprocess.run(['ffmpeg', '-nostats', '-i', w, '-af', 'silencedetect=n=-35dB:d=0.3,ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(l.split('silence_start:')[1]) for l in out.splitlines() if 'silence_start:' in l]
en = [float(l.split('silence_end:')[1].split('|')[0]) for l in out.splitlines() if 'silence_end:' in l]
gaps = [(round(a, 2), round(b - a, 2)) for a, b in zip(st, en)]
I = out.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0].strip(); pk = out.split('True peak:')[1].split('Peak:')[1].split('dBFS')[0].strip()
print(f'{w}: {len(gaps)} silences ≥ 0.3 s, longest {max([g for _, g in gaps] or [0])} s, > 0.6 s: {[g for g in gaps if g[1] > 0.6]}, I {I} LUFS, peak {pk}')
