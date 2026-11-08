"""The episode's sound under the voice, all made here in code (no samples): room tone, a soft music bed, and small hits.
  python episode/bed.py <episode folder>
Reads <ep>/episode.json and <ep>/vo/vo.json (+ vo.wav). Writes <ep>/out/mix.wav (stereo 48 kHz, as long as the episode:
voice + 1.4 s). The bed runs from the first frame to the last (no digital silence between lines, no dead tail) and ducks
under the voice. Hits: a tick when a HUD number changes, a soft swoosh on a card, a thump on each vote word."""
import sys, os, json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

ep = sys.argv[1]
SR = 48000
E = json.load(open(os.path.join(ep, 'episode.json'), encoding='utf-8'))
VO = json.load(open(os.path.join(ep, 'vo', 'vo.json'), encoding='utf-8'))
voice, vsr = sf.read(os.path.join(ep, 'vo', 'vo.wav'), dtype='float32')
if voice.ndim > 1: voice = voice.mean(axis=1)
voice = resample_poly(voice, SR, vsr).astype(np.float32)
DUR = VO['duration'] + 1.4
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
lp = lambda x, f, o=2: sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
bp = lambda x, a, b: sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)

# room tone: pink-ish noise, low, with a faint fridge hum
room = lp(rng.standard_normal(N), 900) * 0.035 + 0.006 * np.sin(2 * np.pi * 50 * t) + 0.003 * np.sin(2 * np.pi * 100 * t)

# music bed: four slow chords (i, VI, III, VII in A minor), detuned soft saws through a low-pass, plus a quiet pulse on the beat
BPM = 92; beat = 60 / BPM; bar = 4 * beat
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
saw = lambda f: 2 * ((t * f) % 1) - 1
pad = np.zeros(N)
for i, ch in enumerate(CHORDS):
    w = np.zeros(N)
    for k in range(int(DUR / bar) + 1):
        if k % 4 != i: continue
        a, b = k * bar, (k + 1) * bar
        env = np.clip((t - a) / 0.6, 0, 1) * np.clip((b + 0.6 - t) / 0.6, 0, 1)
        w += env
    for m in ch: pad += w * (saw(hz(m)) + saw(hz(m) * 1.004)) * 0.5
pad = lp(pad, 1100, 4) * 0.05
bass = np.zeros(N)
for k in range(int(DUR / beat) + 1):
    a = k * beat; root = CHORDS[int(a // bar) % 4][0] - 12
    i0 = int(a * SR); n = min(N - i0, int(0.45 * SR))
    if n <= 0: continue
    tt = np.arange(n) / SR; bass[i0:i0 + n] += np.sin(2 * np.pi * hz(root) * tt) * np.exp(-tt * 6) * (0.09 if k % 2 == 0 else 0.05)
music = pad + bass

# duck the music under the voice (envelope of the voice, smoothed)
vv = np.zeros(N); vv[:min(N, len(voice))] = voice[:N]
env = lp(np.abs(vv), 6, 1); env = env / (env.max() + 1e-9)
duck = 1 - 0.55 * np.clip(env * 4, 0, 1)
music *= duck

# hits on the timeline (the same times episode/timeline.js gives every engine)
fx = np.zeros(N)
def add(i0, x):
    i0 = int(i0 * SR); n = min(N - i0, len(x))
    if n > 0 and i0 >= 0: fx[i0:i0 + n] += x[:n]
def tick():
    tt = np.arange(int(0.08 * SR)) / SR; return np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 60) * 0.12
def swoosh():
    n = int(0.45 * SR); tt = np.arange(n) / SR; x = bp(rng.standard_normal(n), 600, 4000)
    return x * np.sin(np.pi * tt / tt[-1]) ** 2 * 0.08
def thump():
    tt = np.arange(int(0.35 * SR)) / SR; return np.sin(2 * np.pi * (70 + 60 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 9) * 0.35
L = VO['lines']
for i, b in enumerate(E['beats']):
    a = L[i]['s'] - 0.12 if i else 0
    if b.get('hud') and i: add(L[i]['s'] + 0.05, tick())
    if b.get('shot') in ('card', 'stats'): add(max(0, a - 0.1), swoosh())
last = L[-1]['id']
tags = {str(E['vote'].get('tagA', 'A')), str(E['vote'].get('tagB', 'B'))}
for w in VO['words']:
    if w['line'] == last and ''.join(c for c in w['w'] if c.isalnum()) in tags: add(w['s'], thump())

bed = room + music + fx
fade = np.clip((DUR - t) / 0.5, 0, 1) * np.clip(t / 0.15, 0, 1)   # a short fade at the very end (no dead tail before it)
mix = vv + bed * fade
peak = np.abs(mix).max()
if peak > 0.98: mix *= 0.98 / peak
# a tiny stereo spread on the bed only
st = np.stack([mix + 0.15 * bed * fade * np.sin(2 * np.pi * 0.07 * t), mix - 0.15 * bed * fade * np.sin(2 * np.pi * 0.07 * t)], axis=1)
os.makedirs(os.path.join(ep, 'out'), exist_ok=True)
sf.write(os.path.join(ep, 'out', 'mix.wav'), st.astype(np.float32), SR)
print(f'mix.wav {DUR:.2f} s (voice + room tone + music bed + hits)')
