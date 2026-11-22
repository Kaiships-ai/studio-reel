# sound_dsp.py: shared DSP helpers for the stick-man sound tools (numpy/scipy only). Filters, oscillators, envelopes,
# BS.1770 loudness and a true-peak limiter. Helpers adapted from styles/kai-reel-3d/template/audio/synth.py (copied, not imported).
import numpy as np
from scipy.signal import butter, sosfilt, lfilter, resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d, maximum_filter1d

SR = 48000
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)


def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 200) / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, f0, f1, o=2): return sosfilt(butter(o, [f0 / (SR / 2), min(f1, SR / 2 - 200) / (SR / 2)], 'band', output='sos'), x)
def hb(x): return sosfilt(butter(4, [2000 / (SR / 2), 8000 / (SR / 2)], 'band', output='sos'), x)   # consonant band meter
def ts(d): return np.arange(int(d * SR)) / SR
def norm(x): return x / (np.abs(x).max() + 1e-12)
def sat(x, k=1.5): return np.tanh(k * x) / np.tanh(k)


def adsr(n, a, r):
    t = np.arange(n) / SR; dur = n / SR
    return np.clip(np.minimum(t / max(a, 1e-5), (dur - t) / max(r, 1e-5)), 0, 1)


def osc(f, shape='sine'):
    ph = 2 * np.pi * np.cumsum(f) / SR
    if shape == 'sine': return np.sin(ph)
    u = (ph / (2 * np.pi)) % 1
    if shape == 'saw': return 2 * u - 1
    if shape == 'tri': return 2 * np.abs(2 * u - 1) - 1
    return np.sign(np.sin(ph))


def sweep_bp(x, f0, f1, q=1.5, seg=512):
    """time-varying band-pass, centre glides f0 -> f1 (arrays allowed for a custom curve)"""
    n = len(x); y = np.zeros(n); fc = np.interp(np.arange(0, n, seg), [0, n], [f0, f1]) if np.isscalar(f0) else f0
    zi = None
    for k, i in enumerate(range(0, n, seg)):
        c = float(fc[min(k, len(fc) - 1)]); lo, hi = c / (1 + 0.5 / q), c * (1 + 0.5 / q)
        sos = butter(2, [lo / (SR / 2), min(hi, SR / 2 - 300) / (SR / 2)], 'band', output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        y[i:i + seg], zi = sosfilt(sos, x[i:i + seg], zi=zi)
    return y


def put(buf, y, t, g=1.0):
    i = int(round(t * SR))
    if i < 0: y, i = y[-i:], 0
    if i < len(buf): m = min(len(y), len(buf) - i); buf[i:i + m] += y[:m] * g


def room(x, rng, d=0.35, wet=0.12):
    """a small dull room: convolve with seeded exponentially decaying noise"""
    from scipy.signal import fftconvolve
    t = ts(d); ir = lp(rng.standard_normal(len(t)), 3500) * np.exp(-t / (d / 5)); ir /= np.sqrt((ir ** 2).sum())
    return x + wet * fftconvolve(x, ir)[:len(x)]


# ------------------------------------------------------------------ loudness (ITU-R BS.1770-4, 48 kHz)
def kw(x):
    x = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x)
    return lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x)


def lufs(chans):
    """integrated loudness of a list of channel arrays (stereo = [L, R])"""
    w, hop = int(0.4 * SR), int(0.1 * SR); n = len(chans[0])
    if n < w: return -99.0
    z = sum(np.array([np.mean(c[i:i + w] ** 2) for i in range(0, n - w + 1, hop)]) for c in (kw(c) for c in chans))
    l = -0.691 + 10 * np.log10(z + 1e-20); z = z[l > -70]
    if not len(z): return -99.0
    rel = -0.691 + 10 * np.log10(z.mean()) - 10; zz = z[-0.691 + 10 * np.log10(z) > rel]
    return float(-0.691 + 10 * np.log10(zz.mean()))


def true_peak(chans):
    return float(20 * np.log10(max(np.abs(resample_poly(c, 4, 1)).max() for c in chans) + 1e-12))


def tp_limit(chans, ceil_db=-1.5):
    """true-peak limiter: 4x oversampled envelope, centred 3 ms look-ahead, 40 ms smoothed release, linked stereo"""
    ceil = 10 ** (ceil_db / 20)
    env = np.max([maximum_filter1d(np.abs(resample_poly(c, 4, 1)), 4)[::4][:len(c)] for c in chans], axis=0)
    g = np.minimum(1.0, ceil / (env + 1e-12))
    g = minimum_filter1d(g, int(0.012 * SR)); g = uniform_filter1d(g, int(0.012 * SR))
    return [c * g for c in chans]


def comp(x, ratio=4.0, pct=35):
    """voice leveller from the kai-reel-3d listicle score: peak compressor above the pct-th percentile peak level"""
    e = uniform_filter1d(maximum_filter1d(np.abs(x), int(0.006 * SR)), int(0.006 * SR)) + 1e-9
    thr = np.percentile(e[e > 0.1 * e.max()], pct)
    g = np.minimum(1.0, (thr / e) ** (1 - 1 / ratio))
    g = uniform_filter1d(g, int(0.004 * SR))
    return x * g
