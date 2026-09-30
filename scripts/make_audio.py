#!/usr/bin/env python3
"""make_audio.py: the reel's sound, made locally with numpy (no samples, no downloaded music).
A music bed that follows the chapters, cartoon SFX on the cue times, mixed under the voiceover with ducking,
loudness-normalised to about -14 LUFS / -1 dBTP.

Input:   audio/cues.json (cuts + SFX cues) and vo/vo.wav + vo/vo.json (from make_vo.py)
Output:  assets/reel-audio.wav (final mix, muxed into the MP4), assets/music.wav (music + SFX), assets/sfx.wav (SFX only)
Run:     node make.mjs audio

cues.json:
  { "bpm": 120,                       tempo of the music; keep it equal to PROJECT.bpm in src/config.js
    "mood": "bright" | "tense",       bright = major key throughout; tense = minor, resolving to major in the last chapter
    "music": 0.55, "sfx": 0.85,       bus levels (optional)
    "cuts": [ {"after": "l01"}, 7.4 ],          chapter cuts: after a voiceover line (same as cutAfter() in the page) or seconds
    "cues": [ {"word": "post", "n": 1, "sfx": "slam", "gain": 0.6, "pan": 0, "offset": 0, "note": "POST button"},
              {"t": 3.2, "sfx": "pop"} ] }
  A cue is timed by "t" (seconds) or by "word" (+ optional "n" = nth time it is spoken, "line" = only in that line,
  "offset" = seconds added). Every cut gets a brush-wipe whoosh automatically ("wipes": false turns that off).
  SFX names: see SFX below (python scripts/make_audio.py --list prints them).
"""
import os, re, sys, json, wave, subprocess, tempfile
import numpy as np
from kitenv import FFMPEG, path

SR = 48000
RNG = np.random.default_rng(1414)
A = lambda p: path(*p.split("/"))

with open(A("vo/vo.json"), encoding="utf-8") as _f: VO = json.load(_f)
with open(A("audio/cues.json"), encoding="utf-8") as _f: CUES = json.load(_f)
DUR = float(VO["duration"])
N = int(round(SR * DUR))
B = 60.0 / float(CUES.get("bpm", 120))

def _norm(s): return re.sub(r"[^a-z0-9']", "", str(s).lower())
def word_time(word, n=1, line=None):
    k = 0
    for w in VO["words"]:
        if _norm(w["w"]) == _norm(word) and (line is None or w["line"] == line):
            k += 1
            if k == n: return w["s"]
    sys.exit(f'cues.json: the word "{word}" (n={n}{", line=" + line if line else ""}) is not in the voiceover. See vo/word_times.txt.')
def cut_time(c):
    if isinstance(c, (int, float)): return float(c)
    ids = [l["id"] for l in VO["lines"]]
    if c.get("after") not in ids: sys.exit(f'cues.json: no voiceover line "{c.get("after")}"')
    i = ids.index(c["after"])
    return round((VO["lines"][i]["e"] + VO["lines"][i + 1]["s"]) / 2, 3) if i + 1 < len(ids) else DUR
CUTS = sorted(cut_time(c) for c in CUES.get("cuts", []))
# --------------------------------------------------------------------------- helpers
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12.0)
def tt(d): return np.arange(int(round(d * SR))) / SR
def noise(d): return RNG.standard_normal(int(round(d * SR)))

def env_exp(d, tau, att=0.001):
    t = tt(d); e = np.exp(-t / tau)
    na = max(1, int(att * SR)); e[:na] *= np.linspace(0, 1, na)
    return e

def fft_filter(x, lo=None, hi=None, bp=None):
    """Zero-phase smooth filter via FFT. lo=highpass cutoff, hi=lowpass cutoff, bp=(f0,q)."""
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR) + 1e-9
    H = np.ones_like(f)
    if hi is not None: H *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo is not None: H *= 1 / np.sqrt(1 + (lo / f) ** 4)
    if bp is not None:
        f0, q = bp; H *= 1 / np.sqrt(1 + (q * (f / f0 - f0 / f)) ** 2)
    return np.fft.irfft(X * H, n)

def sweep_noise(d, f0, f1, q=2.0):
    """Band-passed noise whose centre sweeps f0->f1 (STFT-block filtering)."""
    x = noise(d); out = np.zeros_like(x); blk = 512
    win = np.hanning(blk * 2)
    for i in range(0, len(x), blk):
        seg = x[i:i + blk * 2]
        if len(seg) < 8: break
        fr = i / max(1, len(x) - 1)
        fc = f0 * (f1 / f0) ** fr
        y = fft_filter(seg * win[:len(seg)], bp=(fc, q))
        out[i:i + len(seg)] += y
    return out / (np.max(np.abs(out)) + 1e-9)

def sine(f, d, ph=0.0):
    t = tt(d)
    if np.isscalar(f): return np.sin(2 * np.pi * f * t + ph)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)

def nrm(x, g=1.0): return g * x / (np.max(np.abs(x)) + 1e-9)

def put(bus, sig, t0, g=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    if n <= 0: return
    L = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2); R = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    bus[0, i:i + n] += g * L * sig[:n]; bus[1, i:i + n] += g * R * sig[:n]

def reverb(x, length=1.6, seed=7):
    r = np.random.default_rng(seed)
    n = int(length * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.standard_normal(n) * np.exp(-t / (length / 5.5))
        ir = fft_filter(ir, hi=5000); ir /= np.sqrt(np.sum(ir ** 2))
        L = len(x[c]) + n; nf = 1 << (L - 1).bit_length()
        out[c] = np.fft.irfft(np.fft.rfft(x[c], nf) * np.fft.rfft(ir, nf), nf)[:len(x[c])]
    return out

# --------------------------------------------------------------------------- instruments
def rhodes(m, d):
    f = mtof(m); t = tt(d)
    mod = 1.1 * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * t)
    s = np.sin(2 * np.pi * f * t + mod) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.3)
    s *= 1 + 0.15 * np.sin(2 * np.pi * 5 * t)       # tremolo
    e = env_exp(d, 0.9, 0.004); rel = int(0.05 * SR); e[-rel:] *= np.linspace(1, 0, rel)
    return s * e

def pluck(m, d=0.3, bright=1.0):
    f = mtof(m); t = tt(d)
    s = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (6 + 10 * k / bright)) for k in range(6))
    return s * env_exp(d, 0.18, 0.002)

def bass(m, d):
    f = mtof(m); t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    e = np.minimum(1, t / 0.006) * np.exp(-t / 0.6); rel = int(0.04 * SR); e[-rel:] *= np.linspace(1, 0, rel)
    return np.tanh(1.3 * s) * e

def kick():
    d = 0.35; t = tt(d)
    f = 48 + 110 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, 0.12, 0.0008) + 0.2 * fft_filter(noise(d), lo=2000) * env_exp(d, 0.004)

def clap():
    d = 0.25; x = fft_filter(noise(d), bp=(1400, 1.2)); e = np.zeros(len(x))
    for o in (0, 0.009, 0.018): e += np.roll(env_exp(d, 0.012), int(o * SR)) * (np.arange(len(x)) >= o * SR)
    e += 0.5 * env_exp(d, 0.08)
    return nrm(x * e)

def hat(open_=False):
    d = 0.18 if open_ else 0.06
    return nrm(fft_filter(noise(d), lo=7000) * env_exp(d, 0.06 if open_ else 0.015, 0.0005))

def pad(m, d, att=0.8, bright=1.0):
    t = tt(d); f = mtof(m)
    s = sum(np.sin(2 * np.pi * f * dt * t + k) for k, dt in enumerate((1.0, 1.004, 0.996)))
    s += 0.3 * bright * np.sin(2 * np.pi * 2 * f * t) + 0.12 * bright * np.sin(2 * np.pi * 3 * f * t)
    e = np.minimum(1, t / att) * np.clip((d - t) / min(0.6, d / 2), 0, 1)
    return s * e / 3

def saw(m, d, tau=0.12):
    t = tt(d); f = mtof(m); ph = (f * t) % 1.0
    return fft_filter(2 * ph - 1, hi=2500) * env_exp(d, tau, 0.002)

def square_beep(f, d):
    t = tt(d); return fft_filter(np.sign(np.sin(2 * np.pi * f * t)), hi=1800) * env_exp(d, d / 3, 0.003)

Dm = [38, 57, 62, 65]; Bb = [34, 58, 62, 65]; Gm = [31, 58, 62, 67]; A7 = [33, 57, 61, 64]
D = [38, 57, 62, 66]; Aa = [33, 57, 61, 64]; Bm = [35, 59, 62, 66]; G = [31, 59, 62, 67]
MINOR = [Dm, Bb, Gm, A7]; MAJOR = [D, Aa, Bm, G]

def build_music():
    """Four-on-the-floor bed on one global beat grid (beats at multiples of B, like pulse() in the page).
    Energy rises chapter by chapter; the last chapter opens on a big major chord."""
    mus = np.zeros((2, N)); drums = np.zeros((2, N)); t = np.arange(N) / SR
    edges = [0.0] + [c for c in CUTS if 0 < c < DUR] + [DUR]
    nsec = len(edges) - 1; bright = CUES.get("mood", "bright") == "bright"; bar = 4 * B
    for bi in range(int(np.ceil(DUR / B))):
        tb = bi * B
        if tb >= DUR - 0.3: break
        si = max(i for i in range(nsec) if edges[i] <= tb + 1e-6)
        last = nsec > 1 and si == nsec - 1
        en = 0.55 + 0.4 * (si / max(1, nsec - 1)) if nsec > 1 else 0.7
        prog = MAJOR if (bright or last) else MINOR
        ch = prog[int(tb // bar) % len(prog)]
        if bi % 4 == 0:
            dd = min(bar, DUR - tb) + 0.3
            for j, m in enumerate(ch[1:]): put(mus, pad(m, dd, 0.3, 1), tb, 0.05, pan=-0.4 + 0.4 * j)
        put(drums, kick(), tb, 0.35 + 0.35 * en)
        put(mus, bass(ch[0], B * 0.9), tb, 0.18 + 0.15 * en)
        put(mus, bass(ch[0] + 12, B * 0.4), tb + B / 2, 0.08 + 0.1 * en)
        for h in range(4):
            put(drums, hat(open_=(h == 2 and en > 0.7)), tb + h * B / 4, (0.025 if h % 2 else 0.04) * (0.6 + en), pan=0.25)
        if bi % 2 == 1 and en >= 0.65: put(drums, clap(), tb, 0.08 + 0.12 * en)
        seq = [ch[1], ch[2], ch[3], ch[2], ch[1] + 12, ch[2], ch[3], ch[2]]
        for h in range(4):
            put(mus, pluck(seq[(bi * 4 + h) % 8] + 12, 0.25), tb + h * B / 4, 0.03 + 0.02 * en, pan=0.4 if h % 2 else -0.4)
    if nsec > 1:   # the last chapter lands on a big chord
        for k, m in enumerate([38, 50, 57, 62, 66, 69, 74]): put(mus, rhodes(m, 2.5), edges[-2] + k * 0.015, 0.08)
    mus = mus + 0.2 * reverb(mus, 1.8)
    out = mus + drums
    out *= np.clip((DUR - t) / 0.6, 0, 1) ** 1.5      # fade out over the last 0.6 s
    return out

# --------------------------------------------------------------------------- SFX
# kind: "on" = onset at t (sharp attack at t); "peak" = amplitude peak lands on t
def s_stamp():
    d = 0.35; t = tt(d)
    th = np.sin(2 * np.pi * np.cumsum(70 + 160 * np.exp(-t / 0.02)) / SR) * env_exp(d, 0.09, 0.0005)
    pop = fft_filter(noise(d), bp=(2500, 1.5)) * env_exp(d, 0.012, 0.0003)
    return nrm(th + 0.6 * nrm(pop))

def s_scratch():
    d = 0.32; t = tt(d)
    f = 900 * (1 + 0.8 * np.sin(2 * np.pi * 9 * t)) * np.exp(-t / 0.4)
    x = sine(f, d) * 0.5 + 0.5 * fft_filter(noise(d), bp=(1800, 2)) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t))
    return nrm(np.tanh(2 * x) * env_exp(d, 0.14, 0.0005))

def s_boing(m=64):
    d = 0.4; t = tt(d); f0 = mtof(m)
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.2)) * (0.7 + 0.3 * np.minimum(1, t / 0.05))
    return nrm(np.tanh(1.5 * sine(f, d)) * env_exp(d, 0.14, 0.001))

def s_whoosh(d=0.45, f0=500, f1=3500, q=1.5):
    t = tt(d); x = sweep_noise(d, f0, f1, q)
    e = (t / d) ** 3                                   # peaks at the very end = on the cut
    rel = np.exp(-np.maximum(0, t - d) / 0.02)
    tail = sweep_noise(0.12, f1, f1 * 0.6, q) * np.exp(-tt(0.12) / 0.03)
    return nrm(np.concatenate([x * e, tail * 0.9])), d  # peak index offset

def s_click(m=84):
    d = 0.06; x = fft_filter(noise(d), bp=(3500, 2)) * env_exp(d, 0.004, 0.0002)
    return nrm(x + 0.5 * sine(mtof(m), d) * env_exp(d, 0.02, 0.0003))

def s_zap(m=84):
    d = 0.14; t = tt(d); f = mtof(m) * (1 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * t)))
    return nrm(np.sign(sine(f, d)) * env_exp(d, 0.04, 0.0005)) * 0.5 + 0.8 * np.pad(s_click(m), (0, int(0.08 * SR)))

def s_snap():
    d = 0.35; t = tt(d); f = 220 * (1 + 0.5 * np.exp(-t / 0.05)) * (1 + 0.04 * np.sin(2 * np.pi * 25 * t))
    tw = np.tanh(2 * sine(f, d)) * env_exp(d, 0.12, 0.0005)
    sn = fft_filter(noise(d), lo=2500) * env_exp(d, 0.006, 0.0002)
    return nrm(0.7 * tw + nrm(sn))

def s_ding(m=88, d=0.35):
    t = tt(d); f = mtof(m)
    x = np.sin(2 * np.pi * f * t + 1.5 * np.exp(-t / 0.2) * np.sin(2 * np.pi * f * 3.5 * t))
    return nrm(x * env_exp(d, min(0.3, d / 3.5), 0.001) * np.clip((d - t) / 0.05, 0, 1))

def s_flip():
    d = 0.1; return nrm(fft_filter(noise(d), bp=(2200, 1.2)) * env_exp(d, 0.02, 0.0005))

def s_coin(n=3, gap=0.06):
    out = np.zeros(int((n * gap + 0.5) * SR))
    for i in range(n):
        m = [91, 95, 98, 96, 100, 103][i % 6]
        c = s_ding(m, 0.35) * 0.8; j = int(i * gap * SR); out[j:j + len(c)] += c[:len(out) - j]
    return nrm(out)

def s_splat():
    d = 0.4; t = tt(d)
    x = fft_filter(noise(d), hi=1800) * env_exp(d, 0.08, 0.0005)
    dr = np.zeros(len(x))
    for k in range(4):
        dp = fft_filter(noise(0.05), bp=(900 + 300 * k, 3)) * env_exp(0.05, 0.01)
        j = int((0.03 + 0.04 * k) * SR); dr[j:j + len(dp)] += dp
    return nrm(x + 0.5 * nrm(dr))

def s_buzz():
    d = 0.3; t = tt(d); f = 110 * np.exp(-np.maximum(0, t - 0.12) / 0.15)
    x = np.sign(sine(f, d)) * 0.6 + 0.4 * sine(f * 1.01, d)
    return nrm(fft_filter(x, hi=2500) * np.minimum(1, t / 0.001) * np.clip((d - t) / 0.08, 0, 1))

def s_clack():
    d = 0.2; x = fft_filter(noise(d), bp=(1600, 3)) * env_exp(d, 0.02, 0.0002)
    return nrm(x + 0.6 * sine(420, d) * env_exp(d, 0.03, 0.0003))

def s_blip(m=79):
    d = 0.12; return nrm(sine(mtof(m), d) * env_exp(d, 0.04, 0.001) + 0.3 * sine(mtof(m + 12), d) * env_exp(d, 0.02, 0.001))

def s_shimmer():
    d = 0.55; out = np.zeros(int(d * SR))
    for i, m in enumerate([86, 90, 93, 98, 102, 105]):
        c = s_ding(m, 0.3); j = int(i * 0.05 * SR); out[j:j + len(c)] += c[:len(out) - j] * 0.5
    return nrm(out)

def s_tear():
    d = 0.35; t = tt(d); x = fft_filter(noise(d), lo=1500, hi=7000)
    grit = (RNG.random(len(x)) < 0.02).astype(float)
    grit = np.convolve(grit, np.ones(200) / 20, mode="same")
    return nrm(x * np.minimum(1, t / 0.001) * (0.4 + grit) * np.clip((d - t) / 0.1, 0, 1))

def s_glass():
    out = sum(pluck(m, 0.45, 3) for m in (74, 78, 81, 86)); return nrm(out + 0.4 * np.pad(s_shimmer(), (0, 0))[:len(out)])

def s_page():
    d = 0.18; t = tt(d); x = fft_filter(noise(d), bp=(3000, 0.8))
    return nrm(x * np.minimum(1, t / 0.001) * np.exp(-t / 0.05) * (1 + 0.5 * np.sin(2 * np.pi * 40 * t)))

def s_nope():
    d = 0.4; t = tt(d); x = sweep_noise(d, 5000, 400, 1.2) * env_exp(d, 0.1, 0.0005)
    return nrm(x + 0.8 * sine(90 * np.exp(-t / 0.2) + 40, d) * env_exp(d, 0.12, 0.0005))

def s_riffle():
    out = np.zeros(int(0.45 * SR))
    for i in range(12):
        c = s_flip() * 0.7; j = int(i * 0.028 * SR); out[j:j + len(c)] += c[:len(out) - j]
    return nrm(out)

def s_rocket(d):
    t = tt(d); x = sweep_noise(d, 200, 3000, 0.8)
    rumble = fft_filter(noise(d), hi=180)
    e = 0.35 + 0.65 * (t / d) ** 2
    ign = fft_filter(noise(d), lo=400) * env_exp(d, 0.06, 0.0005)
    return nrm(nrm(x) * e + nrm(rumble) * 0.6 * e + 1.2 * nrm(ign) * np.exp(-t / 0.08))

def s_iris(d=0.8):
    t = tt(d); x = sweep_noise(d, 3000, 9000, 0.7) * (t / d) ** 4
    imp = np.concatenate([np.zeros(0), s_stamp() * 0.9])
    return nrm(np.concatenate([x, imp * 0.7])), d

def s_pop():
    d = 0.2; t = tt(d); f = 300 + 900 * np.exp(-t / 0.02)
    return nrm(sine(f, d) * env_exp(d, 0.05, 0.0004))

def s_thunder():
    d = 2.2; t = tt(d); x = fft_filter(noise(d), hi=400)
    cr = fft_filter(noise(d), lo=800, hi=5000) * env_exp(d, 0.08, 0.0005)
    e = np.minimum(1, t / 0.002) * (0.6 * np.exp(-t / 0.9) + 0.4 * np.exp(-t / 0.2))
    return nrm(nrm(x) * e + 0.5 * nrm(cr))

def s_ratchet(d=1.5):
    out = np.zeros(int((d + 0.1) * SR))
    for i, ts in enumerate(np.arange(0, d, 0.075)):
        c = s_click(70 + (i % 2) * 3) * 0.8; j = int(ts * SR); out[j:j + len(c)] += c[:len(out) - j]
    return nrm(out)

def s_tick(): return nrm(s_click(96)[:int(0.04 * SR)])
def s_key():
    d = 0.05; return nrm(fft_filter(noise(d), bp=(2800, 2.5)) * env_exp(d, 0.006, 0.0002))
def s_slam():
    st = s_stamp(); lo = fft_filter(noise(0.4), hi=250) * env_exp(0.4, 0.12, 0.0005)
    n = max(len(st), len(lo)); return nrm(1.2 * np.pad(st, (0, n - len(st))) + 0.6 * nrm(np.pad(lo, (0, n - len(lo)))))
def s_fbuzz():
    d = 0.3; t = tt(d); x = np.sign(sine(120, d)) * 0.6 + 0.4 * sine(121.5, d)
    return nrm(fft_filter(x, hi=2500) * np.minimum(1, t / 0.001) * np.clip((d - t) / 0.08, 0, 1))
def s_lock():
    return nrm(s_clack() + 0.6 * np.pad(s_click(60), (0, len(s_clack()) - len(s_click(60)))))

def s_boom():
    d = 1.0; t = tt(d); f = 30 + 90 * np.exp(-t / 0.08)
    sub = np.tanh(1.8 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * env_exp(d, 0.28, 0.0005)
    hit = fft_filter(noise(d), lo=300, hi=6000) * env_exp(d, 0.05, 0.0003)
    return nrm(sub + 0.7 * nrm(hit) + 0.5 * np.pad(s_stamp(), (0, len(sub) - len(s_stamp()))))

def s_shutter():
    c1 = s_click(96); c2 = s_clack() * 0.7; n = int(0.09 * SR)
    out = np.zeros(n + len(c2)); out[:len(c1)] += c1; out[n:n + len(c2)] += c2
    return nrm(out + 0.4 * np.pad(s_flip(), (0, len(out) - len(s_flip()))))

def s_type(n=6, gap=0.055, seed=0):
    out = np.zeros(int((n * gap + 0.1) * SR))
    for i in range(n):
        c = s_key() * (0.7 + 0.3 * ((i * 7 + seed) % 3) / 2); j = int(i * gap * SR); out[j:j + len(c)] += c
    return nrm(out)

def splat_wipe():
    return (np.concatenate([s_whoosh(0.35, 600, 2500, 1)[0][:int(0.35 * SR)], s_splat()]), 0.35)

def brush_wipe():
    w, off = s_whoosh(0.5, 400, 4000); hit = np.zeros(len(w)); j = int(off * SR); ck = s_stamp()[:len(w) - j]
    hit[j:j + len(ck)] = ck; return (nrm(w + 0.8 * hit), off)

def title_hit():   # whoosh landing + stamp, like reel11 plugin titles
    w, off = s_whoosh(0.35, 700, 4500, 2.0); st = s_stamp(); j = int(off * SR)
    out = np.zeros(max(len(w), j + len(st))); out[:len(w)] += w * 0.6; out[j:j + len(st)] += st
    return (nrm(out), off)

# name -> (maker, kind). "on": the sound starts on the cue time. "peak": it builds up and lands on the cue time.
SFX = {
    "whoosh": (lambda: s_whoosh(0.35, 500, 3500, 1.5), "peak"), "whip": (lambda: s_whoosh(0.25, 800, 5000, 2.5), "peak"),
    "wipe": (brush_wipe, "peak"), "splat-wipe": (splat_wipe, "peak"), "title": (title_hit, "peak"), "iris": (s_iris, "peak"),
    "stamp": (s_stamp, "on"), "slam": (s_slam, "on"), "boom": (s_boom, "on"), "pop": (s_pop, "on"), "boing": (s_boing, "on"),
    "snap": (s_snap, "on"), "click": (s_click, "on"), "clack": (s_clack, "on"), "lock": (s_lock, "on"), "zap": (s_zap, "on"),
    "ding": (s_ding, "on"), "coin": (s_coin, "on"), "shimmer": (s_shimmer, "on"), "glass": (s_glass, "on"), "blip": (s_blip, "on"),
    "flip": (s_flip, "on"), "page": (s_page, "on"), "riffle": (s_riffle, "on"), "type": (s_type, "on"), "tick": (s_tick, "on"),
    "splat": (s_splat, "on"), "tear": (s_tear, "on"), "scratch": (s_scratch, "on"), "buzz": (s_buzz, "on"), "nope": (s_nope, "on"),
    "shutter": (s_shutter, "on"), "ratchet": (lambda: s_ratchet(0.3), "on"), "thunder": (s_thunder, "on"),
}
BIG = ("slam", "boom", "wipe", "splat-wipe", "title", "whip")   # hits that get extra level
HIT = 1.75

def build_cues():
    """-> [(time, kind, signal, gain, pan, peak offset, name)]"""
    C = []
    def add(t, name, gain=None, pan=0.0, note=""):
        if name not in SFX: sys.exit(f'cues.json: unknown sfx "{name}". Known: {", ".join(sorted(SFX))}')
        mk, kind = SFX[name]; sig = mk(); off = 0.0
        if kind == "peak": sig, off = sig
        g = (0.45 if gain is None else float(gain)) * (HIT if name in BIG else 1.0)
        C.append((round(float(t), 3), kind, sig, g, float(pan), off, f"{name} {note}".strip()))
    if CUES.get("wipes", True):
        for c in CUTS:
            if 0 < c < DUR: add(c, "wipe", 0.5, 0, "chapter cut")
    for q in CUES.get("cues", []):
        t = float(q["t"]) if "t" in q else word_time(q["word"], int(q.get("n", 1)), q.get("line"))
        add(t + float(q.get("offset", 0)), q["sfx"], q.get("gain"), q.get("pan", 0), q.get("note", q.get("word", "")))
    return sorted(C, key=lambda c: c[0])

def build_sfx(C):
    bus = np.zeros((2, N))
    for t, kind, sig, g, pan, off, name in C: put(bus, sig, t - off, g, pan)
    return bus

# --------------------------------------------------------------------------- mix
# --------------------------------------------------------------------------- mix
def read_wav(p):
    with wave.open(p) as w:
        assert w.getframerate() == SR and w.getsampwidth() == 2
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        return x.reshape(-1, w.getnchannels()).mean(1)

def write_wav(p, x):
    x = np.clip(x, -1, 1)
    y = (x.T * 32767).round().astype(np.int16)
    with wave.open(p, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())

def duck_gain(vo, depth_db=9.0, att=0.03, rel=0.25):
    cr = 1000; hop = SR // cr
    v = vo[:len(vo) // hop * hop].reshape(-1, hop)
    rms = np.sqrt((v ** 2).mean(1)); rms = np.convolve(rms, np.ones(20) / 20, mode="same")
    key = (rms > 0.01).astype(float)
    # hold 120 ms to bridge gaps between words
    key = np.convolve(key, np.ones(120), mode="full")[:len(key)] > 0
    g = np.zeros(len(key)); s = 0.0
    aa, ar = np.exp(-1 / (att * cr)), np.exp(-1 / (rel * cr))
    for i, k in enumerate(key):
        c = aa if k > s else ar; s = c * s + (1 - c) * k; g[i] = s
    g = np.pad(g, (0, N // hop - len(g) + 1))[:N // hop]
    g = np.interp(np.arange(N) / hop, np.arange(len(g)), g)
    return 10 ** (-depth_db * g / 20)

def ff_ebur(path):
    r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    tail = r.stderr[r.stderr.rfind("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    TP = float(re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", tail).group(1))
    return I, TP

def tp_limit(x, ceil_db=-2.2):
    ceil = 10 ** (ceil_db / 20)
    for _ in range(3):
        up = np.stack([np.fft.irfft(np.fft.rfft(c), len(c) * 4) * 4 for c in x])
        pk = np.abs(up).max(0).reshape(-1, 4).max(1)
        need = np.minimum(1, ceil / np.maximum(pk, 1e-9))
        if need.min() >= 0.999: break
        la = int(0.003 * SR)
        g = np.minimum.accumulate(np.lib.stride_tricks.sliding_window_view(np.pad(need, (0, la), constant_values=1), la + 1).min(1)[None, :], axis=0)[0]
        # release smoothing (60 ms)
        k = int(0.06 * SR); ker = np.hanning(2 * k)[k:]; ker /= ker.sum()
        g = 1 - np.convolve(1 - g, np.ones(la * 2) / (la * 2), mode="same")
        g = np.minimum(g, need)
        x = x * g
    return x

def main():
    os.makedirs(A("assets"), exist_ok=True)
    MUS, SFXG = float(CUES.get("music", 0.55)), float(CUES.get("sfx", 0.85))
    music = build_music()
    C = build_cues(); sfx = build_sfx(C)
    write_wav(A("assets/sfx.wav"), sfx * 0.9)
    bed = MUS * music + SFXG * sfx
    write_wav(A("assets/music.wav"), bed / max(1.0, np.abs(bed).max() / 0.95))

    vo = read_wav(A("vo/vo.wav")); vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
    gd = duck_gain(vo)                                # music ducks ~9 dB under speech
    gs = 10 ** ((20 * np.log10(gd)) * 6 / 9 / 20)     # SFX duck ~6 dB
    mix = MUS * music * gd + SFXG * sfx * gs + 1.25 * np.stack([vo, vo])

    tmp = tempfile.mkdtemp(); p1 = os.path.join(tmp, "pre.wav")
    for _ in range(2):  # measure -> gain -> limit -> measure again
        mix = mix / max(1.0, np.abs(mix).max())
        write_wav(p1, mix)
        I, _tp = ff_ebur(p1)
        mix = tp_limit(mix * 10 ** ((-14.0 - I) / 20))
    out = A("assets/reel-audio.wav")
    write_wav(out, mix)
    I, TP = ff_ebur(out)
    print(f"cuts: {', '.join(f'{c:.2f}' for c in CUTS) or 'none'}   ·   {len(C)} SFX cues ({len(C) / DUR:.2f} per second)")
    for t, kind, sig, g, pan, off, name in C: print(f"  {t:6.2f}  {kind:4s}  {name}")
    print(f"assets/reel-audio.wav  {DUR:.2f} s  ·  {I:.1f} LUFS  ·  true peak {TP:.1f} dBTP")

if __name__ == "__main__":
    if "--list" in sys.argv: print("\n".join(sorted(SFX))); sys.exit(0)
    main()
