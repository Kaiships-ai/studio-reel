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


# ---- railroad sounds (rail-gaps, 11/11): saw, train pass, steam whistle, clickety-clack, metal groan, boom, crowd, crane
def saw(rng):            # hand saw on steel: three rasping strokes, a band of grit that rises on the push and dips on the pull
    d = 0.9; t = ts(d); n = len(t); y = np.zeros(n)
    for k in range(3):
        a, L = k * 0.3, 0.26; seg = bp(_nz(rng, L), 2200, 7000) * (0.6 + 0.4 * np.abs(np.sin(np.pi * 38 * ts(L)))) * np.sin(np.pi * ts(L) / L) ** 0.7
        put(y, seg * (1.0 if k % 2 == 0 else 0.7), a)
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.4) for f in (1830, 2470)) * 0.08
    return norm(y + ring)


def chug(rng):           # a steam train roaring past: low rumble, chuffs and wheel clanks swelling and falling (doppler)
    d = 1.6; t = ts(d); u = t / d; n = len(t)
    env = np.exp(-((u - 0.45) / 0.22) ** 2)
    rum = lp(_nz(rng, d), 180) * 3
    ch = np.zeros(n)
    for k in range(int(d / 0.11)):
        put(ch, bp(_nz(rng, 0.09), 300, 2500) * _exp(0.09, 0.03), k * 0.11 * (1 - 0.15 * (k * 0.11 / d)))
    cl = np.zeros(n)
    for k in range(6): put(cl, bp(_nz(rng, 0.03), 1500, 5000) * _exp(0.03, 0.006), 0.3 + k * 0.17)
    return norm((norm(rum) + 0.8 * norm(ch) + 0.5 * norm(cl)) * env)


def whistle(rng):        # steam whistle: three close organ-pipe tones with breath, a swell and a drop at the end
    d = 0.9; t = ts(d); f = 520 * (1 - 0.04 * np.clip((t - 0.7) / 0.2, 0, 1))
    y = sum(np.sin(2 * np.pi * np.cumsum(f * r) / SR) / (i + 1) for i, r in enumerate((1, 1.26, 1.5)))
    air = bp(_nz(rng, d), 400, 2500) * 0.25
    return norm(y + air) * adsr(len(t), 0.06, 0.18)


def clack(rng):          # clickety-clack: a wheel pair over a rail gap: two short metal knocks with a tiny ring
    d = 0.32; y = np.zeros(int(d * SR))
    for a, g in ((0.0, 1.0), (0.11, 0.8)):
        k = bp(_nz(rng, 0.04), 800, 4000) * _exp(0.04, 0.008); r = np.sin(2 * np.pi * 1450 * ts(0.12)) * np.exp(-ts(0.12) / 0.03) * 0.4
        put(y, k * g, a); put(y, r * g, a)
    return norm(y)


def groan(rng):          # steel rails groaning in the heat: a slow creaking bend, beating low partials and a scrape
    d = 1.4; t = ts(d); f = 95 + 25 * np.sin(2 * np.pi * 0.6 * t)
    y = sum(np.sin(2 * np.pi * np.cumsum(f * r) / SR) / r for r in (1, 2.01, 3.03, 4.1))
    scr = bp(_nz(rng, d), 600, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2) * 0.35
    return norm(sat(norm(y) + scr, 2.0)) * adsr(len(t), 0.25, 0.4)


def boom(rng):           # a far crash and explosion: a low thump, a roar of debris, a long tail
    d = 2.2; t = ts(d)
    th = np.sin(2 * np.pi * (55 * t - 15 * t * t)) * np.exp(-t / 0.35)
    roar = lp(_nz(rng, d), 900) * np.exp(-t / 0.7) * np.minimum(1, t / 0.02)
    deb = np.zeros(len(t))
    for k in range(30): put(deb, bp(_nz(rng, 0.02), 1000, 5000) * _exp(0.02, 0.004) * rng.uniform(0.1, 0.6), rng.uniform(0.1, 1.6))
    return norm(1.2 * th + norm(roar) + 0.4 * norm(deb))


def crowd(rng):          # a station crowd: a murmur of many voices (formant noise) with footsteps
    d = 1.8; t = ts(d); n = len(t)
    y = sum(bp(_nz(rng, d), f, f * 1.6) * (0.5 + 0.5 * lp(np.abs(rng.standard_normal(n)), 4) * 4) for f in (300, 700, 1300))
    st = np.zeros(n)
    for k in range(14): put(st, bp(_nz(rng, 0.03), 200, 1500) * _exp(0.03, 0.01) * rng.uniform(0.3, 1), rng.uniform(0, d - 0.05))
    return norm(norm(y) + 0.6 * norm(st)) * adsr(n, 0.2, 0.5)


def crank(rng):          # a crane winch / ratchet: a run of quick metal ticks under a low motor hum
    d = 0.8; t = ts(d); y = np.zeros(len(t))
    for k in range(int(d / 0.045)): put(y, bp(_nz(rng, 0.012), 1500, 6000) * _exp(0.012, 0.003), k * 0.045)
    return norm(y + 0.3 * np.sin(2 * np.pi * 110 * t) * np.sin(np.pi * t / d))


BANK = {f.__name__: f for f in (slide, thud, rustle, ting, ding, whoosh, step_l, step_r, beep, tick, poof, hiss, scratch, pop,
                                snore, clunk, blip, ping, sizzle, slide_whistle_up, flutter, wah, siren, sting,
                                saw, chug, whistle, clack, groan, boom, crowd, crank)}
BANK['step'] = step_l
