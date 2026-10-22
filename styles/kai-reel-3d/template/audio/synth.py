# synth.py: the instrument library from the FOLD score (numpy/scipy only, no samples). Import it from score.py.
# Instruments: pluck (đàn-tranh-ish, with bend/vibrato), kick, snare, clap, hat, tom, b808, pad, bell, whoosh, riser, boom,
# clang (girder), creak, chirp/boing/pop (Clawd), step (footstep), heartbeat, hum. All return mono numpy arrays at SR.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
SR = 48000
rng = np.random.default_rng(11)
# ------------------------------------------------------------------ dsp helpers
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 200) / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, f0, f1, o=2): return sosfilt(butter(o, [f0 / (SR / 2), min(f1, SR / 2 - 200) / (SR / 2)], 'band', output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.004, d=0.3, s=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-5)) * np.exp(-t / d)
    return e
def adsr(n, a, r):
    t = np.arange(n) / SR; dur = n / SR
    return np.minimum(1, t / max(a, 1e-5)) * np.minimum(1, (dur - t) / max(r, 1e-5))
def sweep_lp(x, f0, f1, seg=1024, curve=1.0):   # time-varying low-pass (block-wise)
    y = np.zeros_like(x); n = len(x); zi = None
    for i in range(0, n, seg):
        k = (i / max(1, n - 1)) ** curve; f = f0 * (f1 / f0) ** k
        sos = butter(2, min(f, SR / 2 - 300) / (SR / 2), 'low', output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        y[i:i + seg], zi = sosfilt(sos, x[i:i + seg], zi=zi)
    return y
def sat(x, k=1.5): return np.tanh(k * x) / np.tanh(k)
def mixn(*xs):   # sum signals of different lengths
    n = max(len(x) for x in xs); y = np.zeros(n)
    for x in xs: y[:len(x)] += x
    return y
def osc(fcurve, shape='sine'):
    ph = 2 * np.pi * np.cumsum(fcurve) / SR
    if shape == 'sine': return np.sin(ph)
    if shape == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if shape == 'tri': return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
    if shape == 'sq': return np.sign(np.sin(ph))
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)   # midi → Hz
D2, F2, G2, A2, C3, D3 = 38, 41, 43, 45, 48, 50

# ------------------------------------------------------------------ instruments
def pluck(midi, dur=1.6, bend=0.0, bend_t=0.12, vib=0.0, bright=1.0):
    """đàn-tranh-ish zither pluck: additive partials, plucked brightness decay, post-attack pitch bend (nhấn) + vibrato"""
    n = int(dur * SR); t = np.arange(n) / SR
    semis = bend * np.clip((t - 0.05) / bend_t, 0, 1) ** 0.6 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.3, 0, 1)
    f = NOTE(midi) * 2 ** (semis / 12)
    y = np.zeros(n)
    for k in range(1, 10):
        a = (1 / k ** 1.1) * (0.55 if k % 2 == 0 else 1.0)
        dk = 1.4 / (1 + 0.55 * (k - 1) * bright)
        y += a * np.sin(2 * np.pi * np.cumsum(f * k * (1 + 0.0007 * k * k)) / SR) * np.exp(-t / dk)
    y += 0.25 * hp(rng.standard_normal(n), 2500) * np.exp(-t / 0.006)       # pick noise
    return y * np.minimum(1, t / 0.002) * 0.35
def kick(g=1.0, f0=150, f1=44, d=0.32):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / d)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t / 0.0025) * 0.4
    return sat(body * 1.2 + click, 1.3) * g
def snare(g=1.0):
    n = int(0.35 * SR); t = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * 185 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t / 0.06)
    nz = bp(rng.standard_normal(n), 1200, 9000) * np.exp(-t / 0.11)
    return (0.55 * tone + 0.8 * nz) * g
def clap(g=1.0):
    n = int(0.4 * SR); t = np.arange(n) / SR; nz = bp(rng.standard_normal(n), 900, 5000)
    e = sum(np.exp(-np.maximum(0, t - o) / 0.006) * (t >= o) for o in (0, 0.011, 0.023)) + np.exp(-np.maximum(0, t - 0.03) / 0.14) * (t >= 0.03)
    return nz * e * 0.5 * g
def hat(open_=False, g=1.0):
    n = int((0.32 if open_ else 0.07) * SR); t = np.arange(n) / SR
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (317, 421, 563, 709, 887, 1093)) + 0.6 * rng.standard_normal(n)
    return hp(x, 7500) * np.exp(-t / (0.12 if open_ else 0.018)) * 0.18 * g
def tom(midi, g=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = NOTE(midi) * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22) * g + 0.15 * bp(rng.standard_normal(n), 200, 2000) * np.exp(-t / 0.03)
def b808(midi, dur, glide_from=None, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = np.full(n, NOTE(midi))
    if glide_from is not None: f = NOTE(midi) + (NOTE(glide_from) - NOTE(midi)) * np.exp(-t * 18)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.12 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return sat(y * adsr(n, 0.004, 0.06) * np.exp(-t / 1.6) * 1.4, 1.8) * g * 0.7
def pad(midis, dur, cut=1800, a=0.6, r=0.8):
    n = int(dur * SR); y = np.zeros(n)
    for m in midis:
        for det in (-0.09, 0.0, 0.11):
            y += osc(np.full(n, NOTE(m) * 2 ** (det / 12)), 'saw') * 0.33
    return lp(y, cut, 2) * adsr(n, a, r) * 0.12
def bell(midi, dur=3.0, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = NOTE(midi)
    mod = 2.0 * np.exp(-t / 0.6) * np.sin(2 * np.pi * f * 3.5 * t)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / (dur * 0.35)) * np.minimum(1, t / 0.003) * 0.3 * g
def noise(d): return rng.standard_normal(int(d * SR))
def whoosh(d, f0=300, f1=6000, curve=1.0, shape=1.4):
    x = sweep_lp(noise(d), f0, f1, curve=curve); n = len(x); u = np.linspace(0, 1, n)
    return x / (np.abs(x).max() + 1e-9) * np.sin(np.pi * u) ** shape
def riser(d, f0=200, f1=4000):
    n = int(d * SR); u = np.linspace(0, 1, n)
    x = sweep_lp(noise(d), f0, f1, curve=2.0) * u ** 2
    tone = osc(f0 * 0.5 * (f1 / f0) ** (u ** 2) * 0.25, 'saw') * u ** 2 * 0.3
    return (x / (np.abs(x).max() + 1e-9) + lp(tone, 3000)) * 0.6
def boom(d=2.5, f0=70, f1=28):
    n = int(d * SR); t = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-t * 4)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * 0.35))
    rumble = lp(noise(d), 140) * np.exp(-t / (d * 0.3)) * 2.0
    crack = bp(noise(d), 400, 6000) * np.exp(-t / 0.05) * 0.8
    return sat(body * 1.3 + rumble * 0.6 + crack, 1.4)
def clang(d=3.0, base=97.0, g=1.0):   # struck girder: inharmonic partials
    n = int(d * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for r, a, dk in ((1, 1, 1.2), (2.76, 0.6, 0.9), (5.40, 0.45, 0.6), (8.93, 0.3, 0.4), (13.3, 0.2, 0.25), (1.51, 0.5, 1.0)):
        y += a * np.sin(2 * np.pi * base * r * t + 0.3 * np.sin(2 * np.pi * 3 * t)) * np.exp(-t / dk)
    return y * np.minimum(1, t / 0.001) * 0.4 * g
def creak(d=0.8, f=60.0):   # wood/steel groan: buzzy pulse train through a moving resonance
    n = int(d * SR); t = np.arange(n) / SR
    fr = f * (1 + 0.25 * np.sin(2 * np.pi * (1.3 + rng.random()) * t) + 0.3 * t)
    pulses = osc(fr, 'saw') * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) ** 3
    y = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        c = 500 + 1400 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * t[i] + rng.random()))
        y[i:i + seg] = bp(pulses[i:i + seg], c * 0.7, c * 1.3)
    return y * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
def chirp(f0=1800, f1=900, d=0.18, g=1.0):   # Clawd: a tiny square-wave 'eep'
    n = int(d * SR); u = np.linspace(0, 1, n); f = f0 * (f1 / f0) ** u * (1 + 0.04 * np.sin(2 * np.pi * 30 * u * d))
    return lp(osc(f, 'sq'), 5000) * adsr(n, 0.004, 0.05) * 0.18 * g
def boing(d=0.32, g=1.0):
    n = int(d * SR); u = np.linspace(0, 1, n); f = 220 + 520 * np.sin(np.pi * u * 0.9)
    return osc(f, 'tri') * np.exp(-u * 4) * 0.35 * g
def pop(g=1.0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (500 * np.exp(-t * 40) + 180) * t) * np.exp(-t / 0.02) * 0.5 * g
def step(g=1.0, bright=1.0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 60)) * t) * np.exp(-t / 0.03)
    scuff = bp(rng.standard_normal(n), 900, 4000 * bright) * np.exp(-t / 0.018)
    return (0.8 * thump + 0.5 * scuff) * g
def heartbeat(g=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    b = lambda o, a: np.sin(2 * np.pi * 52 * (t - o)) * np.exp(-np.maximum(0, t - o) / 0.07) * (t >= o) * a
    return lp(b(0, 1) + b(0.17, 0.7), 200) * g
def hum(d, f=60.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.3 * np.sign(np.sin(2 * np.pi * 3 * f * t)) * 0.2) * 0.2

