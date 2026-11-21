# sound.py: the shared levels and checks a film's own mixer imports (films/<slug>/audio/mix.py): word_duck, words_hot,
# loudest150, ff, win_rms, db and the HIT_DB / LEVEL / HP / ROOM tables. Method and numbers from styles/kai-reel-3d (SFX.md,
# listicle/audio/sfx.py word_duck, listicle/review/levels.py), copied here, not imported. It has no entry point.
import os, re, shutil, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sound_dsp import SR, hb

FFMPEG = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or 'ffmpeg'   # $FFMPEG, else the ffmpeg on PATH
HIT_DB = -4.3                                              # loudest 150 ms of a hit vs the median voice around it (full band)
LEVEL = {'step_l': -5.0, 'step_r': -5.0, 'tick': -5.0, 'siren': -1.5, 'snore': -5.0, 'blip': -5.0, 'ping': -5.0, 'ting': -5.2}
HP = {'thud': 70, 'poof': 45, 'clunk': 90, 'step_l': 70, 'step_r': 70, 'snore': 70}     # high-pass per sound (default 150 Hz)
ROOM_S, ROOM = 0.6, {'siren': 0.0, 'ding': 0.15, 'scratch': 0.12, 'sting': 0.2}   # a small room under every hit (wet)
DUCK_MARGIN = -6.8                                         # SFX 2-8 kHz <= voice - 6.8 dB inside words (the check asks 6 dB)


def win_rms(x, w=int(0.05 * SR)): k = len(x) // w; return np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-12
def db(x): return 20 * np.log10(x + 1e-12)


def word_duck(out, vo, words, margin=DUCK_MARGIN):
    """listicle/audio/sfx.py word_duck: inside every word, gain ONLY the 1-12 kHz STFT bins so the SFX 10 ms RMS in 2-8 kHz stays
    margin dB under the voice; extra passes fix leftover 10 ms windows (300 Hz-12 kHz, last pass all bins). Bodies below 1 kHz stay."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    from scipy.signal import stft, istft
    w = int(0.01 * SR); k = len(out) // w; tt = np.arange(k) * 0.01
    rms = lambda x: np.sqrt((hb(x)[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-12
    se, ve = rms(out), rms(vo); inw = np.zeros(k, bool)
    for x in words: inw |= (tt + 0.01 > x['t0'] - 0.01) & (tt < x['t1'] + 0.01)
    g = np.ones(k); g[inw] = np.minimum(1, ve[inw] * 10 ** (margin / 20) / se[inw])
    g = minimum_filter1d(g, 5); gs = uniform_filter1d(np.repeat(g, w), w); gs = np.pad(gs, (0, len(out) - len(gs)), constant_values=1)
    def apply(y, gain_t, lo):
        f, t_, Z = stft(y, SR, nperseg=256, noverlap=192); gt = np.interp(t_, gain_t[0], gain_t[1])
        Z[(f >= lo) & (f <= 12000), :] *= gt[None, :]
        z = istft(Z, SR, nperseg=256, noverlap=192)[1][:len(y)]; return np.pad(z, (0, len(y) - len(z)))
    y = apply(out, (np.arange(len(gs)) / SR, gs), 1000)
    for it in range(6):
        g2 = np.ones(k); s2 = rms(y); g2[inw] = np.minimum(1, ve[inw] * 10 ** (margin / 20) / s2[inw])
        if g2.min() > 0.98: break
        y = apply(y, ((np.arange(k) + 0.5) * 0.01, minimum_filter1d(g2, 3)), 0 if it >= 3 else 300)
    # last pass on the checker's own grid (50 ms, half overlap): a window still within |margin| dB (a hiss over a 10 ms dip in the
    # voice) gets that 50 ms dipped with 5 ms ramps; reel63's sfx.py does the same in its last pass
    vb = hb(vo); ww = int(0.05 * SR); vfloor = 0.01 * np.abs(vb).max() / 3; r5 = int(0.005 * SR)
    for _ in range(3):
        yb = hb(y); hit = False
        for x in words:
            i0, i1 = int(x['t0'] * SR), int(x['t1'] * SR)
            for j in range(i0, max(i0 + 1, i1 - ww + 1), ww // 2):
                v = np.sqrt((vb[j:j + ww] ** 2).mean()); e = np.sqrt((yb[j:j + ww] ** 2).mean()) + 1e-12
                if v > vfloor and 20 * np.log10(e / v) > margin:
                    g = v * 10 ** (margin / 20) / e; env = np.ones(ww + 2 * r5); env[r5:-r5] = g
                    env[:r5] = np.linspace(1, g, r5); env[-r5:] = np.linspace(g, 1, r5)
                    a = max(0, j - r5); y[a:j + ww + r5] *= env[a - (j - r5):][:len(y[a:j + ww + r5])]; hit = True
        if not hit: break
    return y


def words_hot(vo, sx, words):
    """listicle/review/levels.py check: words where the SFX 2-8 kHz (50 ms, half-overlap) sits within 6 dB of the voice"""
    vb, sb = hb(vo), hb(sx); vfloor = 0.01 * np.abs(vb).max() / 3; bad = []; ww = int(0.05 * SR)
    for wd in words:
        i0, i1 = int(wd['t0'] * SR), int(wd['t1'] * SR); m = -99
        for j in range(i0, max(i0 + 1, i1 - ww + 1), ww // 2):
            v = np.sqrt((vb[j:j + ww] ** 2).mean()); x = np.sqrt((sb[j:j + ww] ** 2).mean())
            if v > vfloor: m = max(m, db(x / v))
        if m > -6: bad.append((wd['line'], wd['word'], round(float(m), 1)))
    return bad


def loudest150(x, a, b):
    seg = x[max(0, a):b]; w = int(0.15 * SR)
    if len(seg) <= w: return np.sqrt(np.mean(seg ** 2)) + 1e-12
    cs = np.cumsum(np.concatenate([[0], seg ** 2])); return np.sqrt(((cs[w:] - cs[:-w]) / w).max()) + 1e-12


def ff(path):
    o = subprocess.run([FFMPEG, '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', o)[-1])
