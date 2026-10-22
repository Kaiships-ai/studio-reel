# motion metric (LISTICLE.md step 3/8): video → 10 fps, 54×96 grey, mean |Δ| between consecutive frames; median + p75.
# usage: python review/motion.py <video> [t0-t1 ...]   (ranges in seconds; no range = whole video)
import sys, subprocess, numpy as np
v = sys.argv[1]
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', v, '-vf', 'fps=10,scale=54:96,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, 96, 54).astype(float)
d = np.abs(np.diff(f, axis=0)).mean((1, 2)); t = np.arange(1, len(f)) / 10
def rep(name, m): x = d[m]; print(f'{name:>12}  median {np.median(x):5.1f}  p75 {np.percentile(x, 75):5.1f}  n {m.sum()}')
rep('all', np.ones(len(d), bool))
for r in sys.argv[2:]:
    a, b = map(float, r.split('-')); rep(r, (t > a) & (t <= b))
