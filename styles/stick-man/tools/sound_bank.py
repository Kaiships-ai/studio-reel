# sound_bank.py: the stick-man SFX bank, every sound synthesized in numpy. One short function per sound, named after the
# cue it serves. Each takes a seeded numpy Generator (sound.py seeds it from the cue index) and returns a mono array at SR.
# Layering follows styles/kai-reel-3d/SFX.md: transient + body + tail where the sound needs it; everything high-passed later.
import numpy as np
from sound_dsp import SR, NOTE, lp, hp, bp, ts, norm, adsr, osc, sweep_bp, sat, put


def _nz(rng, d): return rng.standard_normal(int(d * SR))
def _exp(d, tau, a=0.002): t = ts(d); return np.minimum(1, t / a) * np.exp(-t / tau)


def slide(rng):          # paper bundle pushed across a counter: friction noise with grain, a little board body
    d = 0.5; t = ts(d); n = len(t); u = t / d
    grain = 0.55 + 0.45 * lp(np.abs(rng.standard_normal(n)), 60) * 3
    fr = bp(_nz(rng, d), 450, 2600) * grain * np.sin(np.pi * u) ** 0.35 * (1 - 0.2 * u)
    body = lp(_nz(rng, d), 500) * np.sin(np.pi * u) ** 1.5 * 0.9
    stop = np.zeros(n); put(stop, bp(_nz(rng, 0.03), 800, 3000) * _exp(0.03, 0.006), d - 0.04)
    return norm(fr) + 0.5 * norm(body) + 0.5 * stop


def thud(rng):           # a cash bundle landing in a canvas bag: low knock + muffled cloth puff
    d = 0.32; t = ts(d)
    knock = np.sin(2 * np.pi * (75 + 70 * np.exp(-t * 45)) * t) * _exp(d, 0.06)
    puff = lp(_nz(rng, d), 700) * _exp(d, 0.04, 0.004)
    cloth = bp(_nz(rng, d), 900, 3500) * _exp(d, 0.025, 0.003)
    return sat(norm(knock) + 0.7 * norm(puff) + 0.25 * norm(cloth), 1.2)


def rustle(rng):         # a paper stack lifted: a burst of crinkle grains over a soft swish
    d = 0.55; t = ts(d); n = len(t); y = np.zeros(n)
    for k in range(18):
        o = rng.uniform(0, d - 0.04); g = rng.uniform(0.3, 1.0)
        put(y, bp(_nz(rng, 0.03), rng.uniform(500, 900), rng.uniform(2500, 4000)) * _exp(0.03, rng.uniform(0.003, 0.008), 0.0005) * g, o)
    swish = bp(_nz(rng, d), 300, 1400) * np.sin(np.pi * t / d) ** 2
    return norm(y) + 0.6 * norm(swish)


def ting(rng):           # a small metal plate touched: three inharmonic partials, quick
    d = 0.5; t = ts(d); y = np.zeros(len(t))
    for r, a, dk in ((1, 1, 0.22), (2.32, 0.25, 0.10), (4.25, 0.1, 0.05)):
        y += a * np.sin(2 * np.pi * 1450 * r * t) * np.exp(-t / dk)
    return norm(y * np.minimum(1, t / 0.0008)) + 0.2 * hp(_nz(rng, d), 4000) * _exp(d, 0.002, 0.0003)


def ding(rng):           # desk bell: struck dome, two close partials that beat, long ring
    d = 1.3; t = ts(d); y = np.zeros(len(t))
    for f, a, dk in ((2350, 1, 0.55), (2357, 0.6, 0.5), (5480, 0.35, 0.18), (8100, 0.12, 0.08), (1180, 0.15, 0.3)):
        y += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dk)
    strike = bp(_nz(rng, d), 2000, 9000) * _exp(d, 0.0015, 0.0002)
    return norm(y * np.minimum(1, t / 0.0005)) + 0.3 * strike


def whoosh(rng):         # bag slung over a shoulder: a band of air sweeping up and back, a cloth flap at the end
    d = 0.55; t = ts(d); u = t / d
    c = 250 + 1000 * np.sin(np.pi * np.clip(u * 1.15, 0, 1)) ** 2
    air = sweep_bp(_nz(rng, d), c[::512], None, q=1.2) * np.sin(np.pi * u) ** 0.6
    flap = np.zeros(len(t)); put(flap, lp(_nz(rng, 0.06), 1500) * _exp(0.06, 0.015), d * 0.72)
    return norm(air) + 0.45 * norm(flap)


def _step(rng, pitch):   # soft shoe on tile: heel thump, then a quieter toe tap with a little tile click
    d = 0.16; t = ts(d); y = np.zeros(len(t))
    heel = np.sin(2 * np.pi * (pitch + 50 * np.exp(-t * 80)) * t) * _exp(d, 0.025)
    click = bp(_nz(rng, d), 2200, 5500) * _exp(d, 0.003, 0.0004)
    scuff = bp(_nz(rng, d), 500, 2000) * _exp(d, 0.02)
    y += norm(heel) + 0.3 * click + 0.35 * norm(scuff)
    toe = np.zeros(len(t)); put(toe, 0.4 * y[:int(0.06 * SR)], 0.075)
    return y + toe


def step_l(rng): return _step(rng, 105)
def step_r(rng): return _step(rng, 118)


def beep(rng):           # door sensor: two short square-ish chirps, filtered soft
    y = np.zeros(int(0.3 * SR))
    for o, f in ((0, 1568), (0.13, 1175)):
        n = int(0.09 * SR); s = osc(np.full(n, f), 'sq') * 0.4 + osc(np.full(n, f), 'sine')
        put(y, lp(s, 4000) * adsr(n, 0.003, 0.02), o)
    return norm(y)


def tick(rng):           # kitchen-timer tick: a click on a small plastic resonance
    d = 0.07; t = ts(d)
    clk = bp(_nz(rng, d), 1500, 4000) * _exp(d, 0.0012, 0.0002)
    res = np.sin(2 * np.pi * 880 * t) * _exp(d, 0.014, 0.0005) + 0.4 * np.sin(2 * np.pi * 1320 * t) * _exp(d, 0.008, 0.0005)
    return 0.35 * norm(clk) + norm(res)


def poof(rng):           # soft powder burst: a dull swelling puff with a low push, no crack
    d = 0.9; t = ts(d); n = len(t)
    e = np.minimum(1, t / 0.025) * np.exp(-t / 0.32)
    from scipy.signal import butter, sosfilt
    nz = _nz(rng, d); air = np.zeros(n); seg = 512; zi = np.zeros((1, 2))
    for i in range(0, n, seg):                       # low-pass closing 3.5 kHz -> 350 Hz: the cloud muffles as it spreads
        sos = butter(2, (3200 * np.exp(-t[i] * 3.0) + 350) / (SR / 2), 'low', output='sos')
        air[i:i + seg], zi = sosfilt(sos, nz[i:i + seg], zi=zi)
    push = np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 12)) * t) * np.minimum(1, t / 0.02) * np.exp(-t / 0.15)
    return norm(air * e) + 0.6 * norm(push)


def hiss(rng):           # spray can / dye spray: a steady air jet with a slight flutter, quick attack and fade
    d = 0.9; t = ts(d); n = len(t)
    jet = bp(_nz(rng, d), 3500, 11000) * (1 + 0.15 * np.sin(2 * np.pi * 23 * t))
    low = bp(_nz(rng, d), 700, 1900) * (1 + 0.15 * np.sin(2 * np.pi * 23 * t))
    return norm((norm(jet) + 0.8 * norm(low)) * adsr(n, 0.02, 0.25))


def scratch(rng):        # record scratch: a record of tone + noise read at a speed curve that swings back and forth
    src_d = 1.2; s = ts(src_d)
    rec = sum(np.sin(2 * np.pi * NOTE(m) * s) for m in (57, 64, 69)) * 0.3 + 0.6 * bp(rng.standard_normal(len(s)), 300, 4000)
    d = 0.45; t = ts(d); u = t / d
    speed = 1.2 * np.sin(2 * np.pi * u * 1.5) * np.exp(-u * 0.6) - 0.15     # forward, back, forward
    pos = 0.4 * SR + np.cumsum(speed * 2.2)
    y = np.interp(pos, np.arange(len(rec)), rec)
    y *= np.clip(np.abs(speed) * 1.4, 0, 1) * adsr(len(t), 0.004, 0.05)
    return norm(lp(hp(y, 150), 5000))


def pop(rng):            # cork pop: a pitched drop with a tiny click
    d = 0.09; t = ts(d)
    y = np.sin(2 * np.pi * np.cumsum(180 + 650 * np.exp(-t * 45)) / SR) * _exp(d, 0.022, 0.0006)
    return norm(y) + 0.25 * bp(_nz(rng, d), 2000, 6000) * _exp(d, 0.0012, 0.0002)


def snore(rng):          # two soft notes: a low buzzy in-breath, then a breathy whistle out
    a_d, b_d = 0.42, 0.38; y = np.zeros(int((a_d + b_d + 0.08) * SR))
    t = ts(a_d); f = 95 * (1 + 0.15 * t / a_d) * (1 + 0.04 * np.sin(2 * np.pi * 28 * t))
    buzz = lp(osc(f, 'saw') * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t) ** 2), 900) * np.sin(np.pi * t / a_d) ** 1.5
    put(y, norm(buzz), 0)
    t = ts(b_d); wf = 880 * np.exp(-t / b_d * 0.45)
    wh = (osc(wf) * 0.7 + 0.3 * bp(rng.standard_normal(len(t)), 700, 1600)) * np.sin(np.pi * t / b_d) ** 1.4
    put(y, 0.55 * norm(wh), a_d + 0.06)
    return y


def clunk(rng):          # magnet seating: a hollow metal knock, short
    d = 0.22; t = ts(d); y = np.zeros(len(t))
    for f, a, dk in ((190, 1, 0.05), (470, 0.6, 0.03), (1130, 0.35, 0.02), (2650, 0.15, 0.01)):
        y += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dk)
    return norm(y * np.minimum(1, t / 0.0005)) + 0.3 * bp(_nz(rng, d), 1500, 6000) * _exp(d, 0.002, 0.0002)


def blip(rng):           # eyes snap open: a quick upward chirp
    d = 0.08; t = ts(d); f = 420 * (1250 / 420) ** (t / d)
    return norm(osc(f, 'sine') * adsr(len(t), 0.002, 0.025))


def ping(rng):           # radio pulse: a soft sine ping with two faint echoes
    d = 0.55; t = ts(d); y = np.zeros(len(t))
    p = (np.sin(2 * np.pi * 990 * t) + 0.1 * np.sin(2 * np.pi * 1980 * t)) * np.minimum(1, t / 0.006) * np.exp(-t / 0.09)
    for o, g in ((0, 1), (0.12, 0.3), (0.24, 0.12)): put(y, lp(p, 6000 - 2000 * o * 8) * g, o)
    return norm(y)


def sizzle(rng):         # burning: crackle pops over a frying hiss
    d = 1.0; t = ts(d); n = len(t); cr = np.zeros(n)
    for k in range(48):
        put(cr, bp(_nz(rng, 0.008), 600, 3000) * _exp(0.008, 0.0012, 0.0002) * rng.uniform(0.2, 1), rng.uniform(0, d - 0.01))
    fry = bp(_nz(rng, d), 900, 3000) * (0.5 + 0.5 * lp(np.abs(rng.standard_normal(n)), 30) * 3)
    return (norm(cr) + 0.6 * norm(fry)) * adsr(n, 0.03, 0.25)


def slide_whistle_up(rng):   # thermometer rising: a breathy sine glide with a wobble
    d = 0.55; t = ts(d); u = t / d
    f = 480 * (1650 / 480) ** (u ** 1.3) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    tone = osc(f) + 0.08 * osc(2 * f)
    br = bp(rng.standard_normal(len(t)), 800, 2500) * 0.06
    return norm((tone + br) * adsr(len(t), 0.03, 0.06))


def flutter(rng):        # bills in the air: many small paper flaps, a fast irregular rate that thins out
    d = 1.1; t = ts(d); n = len(t); y = np.zeros(n); o = 0.0
    while o < d - 0.03:
        g = rng.uniform(0.6, 1) * (1 - 0.2 * o / d)
        put(y, bp(_nz(rng, 0.025), rng.uniform(350, 600), rng.uniform(1800, 2600)) * np.sin(np.pi * ts(0.025) / 0.025) ** 2 * g, o)
        o += rng.uniform(0.022, 0.05)
    return norm(y) * adsr(n, 0.01, 0.2)


def wah(rng):            # small dry "wah-wah": a muted-horn tone, two descending notes, the mute opening and closing
    y = np.zeros(int(0.8 * SR))
    for o, m, d in ((0, 63, 0.26), (0.3, 61, 0.42)):
        t = ts(d); u = t / d; f = NOTE(m) * (1 - 0.01 * u) * (1 + 0.006 * np.sin(2 * np.pi * 5 * t))
        src = osc(f, 'saw')
        cen = 500 + 900 * np.sin(np.pi * np.clip(u * 1.3, 0, 1))
        put(y, sweep_bp(src, cen[::512], None, q=1.6) * adsr(len(t), 0.02, 0.06), o)
    return norm(y)


def siren(rng, d=2.0):   # a far-away two-tone siren: hi-lo, muffled by distance, a little room
    t = ts(d); n = len(t)
    f = np.where((t % 1.0) < 0.5, 960.0, 720.0); f = np.convolve(f, np.ones(480) / 480, 'same')
    s = osc(f, 'saw') * 0.5 + osc(f)
    s = lp(lp(s, 1600), 1600)
    from scipy.signal import fftconvolve
    ir = lp(rng.standard_normal(int(0.5 * SR)), 2000) * np.exp(-ts(0.5) / 0.12)
    s = s + 0.6 * norm(fftconvolve(s, ir)[:n])
    return norm(s * adsr(n, 0.35, 0.6))


def sting(rng):          # short final chord: bright plucked F major stab with a glock on top
    d = 0.48; t = ts(d); y = np.zeros(len(t))
    for m in (53, 60, 65, 69, 72):
        for k in range(1, 7):
            y += (1 / k ** 1.2) * np.sin(2 * np.pi * NOTE(m) * k * t) * np.exp(-t / (0.22 / (1 + 0.4 * k)))
    glk = sum(np.sin(2 * np.pi * NOTE(81) * r * t) * np.exp(-t / dk) for r, dk in ((1, 0.25), (2.76, 0.08)))
    return norm(norm(y) + 0.4 * glk) * adsr(len(t), 0.002, 0.12)


BANK = {f.__name__: f for f in (slide, thud, rustle, ting, ding, whoosh, step_l, step_r, beep, tick, poof, hiss, scratch, pop,
                                snore, clunk, blip, ping, sizzle, slide_whistle_up, flutter, wah, siren, sting)}
BANK['step'] = step_l
