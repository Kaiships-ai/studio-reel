# sound_music.py: the stick-man music bed, a light bouncy cartoon-explainer underscore (pizzicato plucks, soft staccato bass,
# shaker / rim / soft kick, a glock). Original and synthesized. Every section starts on a spoken word from words.json, so the bed is
# a pure function of the timing (fixed seed for the noise). Sections for stick01: A playful (0 → l05 "About"), build (→ l06 "Wait",
# dead stop there), B light + curious (l07 "You" → 21 s), urgent (21 s → l10 "So"), resolve (→ a final chord on the last word).
import numpy as np
from sound_dsp import SR, NOTE, lp, hp, bp, ts, norm, adsr, osc, put, sat, room

BEAT = 0.5   # 120 BPM


class Bed:
    def __init__(self, n, seed=31):
        self.L, self.R = np.zeros(n), np.zeros(n); self.rng = np.random.default_rng(seed)

    def add(self, y, t, g=1.0, pan=0.0):
        put(self.L, y, t, g * min(1, 1 - pan)); put(self.R, y, t, g * min(1, 1 + pan))

    # ---- instruments
    def pizz(self, m, d=0.35, bright=1.0):
        t = ts(d); y = np.zeros(len(t)); f = NOTE(m)
        for k in range(1, 8):
            y += (1 / k ** 1.3) * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (0.16 / (1 + 0.6 * (k - 1) / bright)))
        y += 0.15 * bp(self.rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t / 0.004)
        return y * np.minimum(1, t / 0.002) * adsr(len(t), 0.001, 0.04)

    def bass(self, m, d=0.2):
        t = ts(d); f = NOTE(m); y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)
        return lp(y, 900) * np.minimum(1, t / 0.004) * np.exp(-t / 0.18) * adsr(len(t), 0.001, 0.03)

    def kick(self):
        t = ts(0.25); return np.sin(2 * np.pi * np.cumsum(50 + 80 * np.exp(-t * 35)) / SR) * np.exp(-t / 0.09)

    def shaker(self, g=1.0):
        t = ts(0.06); return hp(self.rng.standard_normal(len(t)), 6000) * np.sin(np.pi * t / 0.06) ** 3 * 0.25 * g

    def rim(self):
        t = ts(0.08); y = np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.01) + 0.5 * bp(self.rng.standard_normal(len(t)), 1500, 4500) * np.exp(-t / 0.006)
        return y * 0.35

    def wood(self, m=79):
        t = ts(0.1); return np.sin(2 * np.pi * NOTE(m) * t) * np.exp(-t / 0.018) * 0.5

    def glock(self, m, d=0.9):
        t = ts(d); f = NOTE(m)
        return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.08)) * np.minimum(1, t / 0.001) * 0.35

    def tremolo(self, m, d):
        t = ts(d); return lp(osc(np.full(len(t), NOTE(m)), 'saw'), 2500) * (0.55 + 0.45 * np.sin(2 * np.pi * 12 * t)) * adsr(len(t), 0.05, 0.02) * 0.18

    def riser(self, d):
        t = ts(d); u = t / d; return bp(self.rng.standard_normal(len(t)), 800, 6000) * u ** 2.2 * 0.25


F_PROG = [[53, 57, 60], [58, 62, 65], [60, 64, 67], [53, 57, 60]]          # F  Bb  C  F
F_BASS = [41, 46, 48, 41]
F_MEL = [[72, None, 69, None, 70, 72, None, 65], [74, None, 70, None, 72, 74, None, 69],
         [76, 74, 72, None, 70, None, 67, None], [69, None, 72, None, 77, None, None, None]]
D_PROG = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]          # Dm Bb C A
D_BASS = [38, 34, 36, 33]


def playful(b, a, z, light=1.0):
    k = 0; t = a
    while t < z - 0.02:
        bar, q = divmod(k, 8); ch = F_PROG[bar % 4]
        if q in (0, 4): b.add(b.kick(), t, 0.55 * light); b.add(b.bass(F_BASS[bar % 4] + (7 if q == 4 else 0)), t, 0.8)
        if q in (2, 6): b.add(b.rim(), t, 0.5 * light, 0.15)
        b.add(b.shaker(0.6 if q % 2 else 1.0), t, 0.5 * light, 0.35)
        m = F_MEL[bar % 4][q]
        if m: b.add(b.pizz(m), t, 0.55, -0.25)
        if q in (1, 3, 5, 7): b.add(b.pizz(ch[(q // 2) % 3] + 12, 0.22, 0.7), t, 0.22, 0.3)
        if q == 0 and bar % 2 == 1: b.add(b.glock(ch[2] + 24), t, 0.25, -0.15)
        t += BEAT / 2; k += 1


def build(b, a, z, stop):
    """11.6 → 13.8: a 16th ostinato climbing a semitone per beat over a C pedal, the shaker thickening, a riser; then a tremolo holds
    on the top note until the dead stop"""
    k = 0; t = a; n16 = BEAT / 4
    while t < z - 0.01:
        m = 72 + int((t - a) / BEAT)
        b.add(b.pizz(m if k % 2 == 0 else m - 12, 0.18), t, 0.45, -0.2 if k % 2 else 0.2)
        if k % 2 == 0: b.add(b.bass(36, 0.14), t, 0.7)
        if k % 4 == 0: b.add(b.kick(), t, 0.4 + 0.3 * (t - a) / (z - a))
        b.add(b.shaker(0.6 + 0.6 * (t - a) / (z - a)), t, 0.45, 0.35)
        t += n16; k += 1
    b.add(b.riser(z - a), a, 0.5)
    top = 72 + int((z - a) / BEAT)
    b.add(b.tremolo(top, stop - z), z, 0.9, -0.1); b.add(b.tremolo(top - 12, stop - z), z, 0.7, 0.1)


def curious(b, a, z):
    """tiptoe: staccato bass on each beat, plucks on the off-beats, a glock question every bar; no kick"""
    k = 0; t = a; walk = [38, 45, 38, 44, 38, 45, 37, 45]
    tune = [74, 77, 76, 73]
    while t < z - 0.02:
        bar, q = divmod(k, 8)
        if q % 2 == 0: b.add(b.bass(walk[(k // 2) % 8], 0.12), t, 0.75)
        if q % 2 == 1: b.add(b.pizz(D_PROG[0][(k // 2) % 3] + 12, 0.18, 0.8), t, 0.35, 0.25 if (k // 2) % 2 else -0.25)
        if q == 0: b.add(b.glock(tune[bar % 4]), t, 0.3, -0.15)
        if q == 6: b.add(b.wood(), t, 0.3, 0.3)
        b.add(b.shaker(0.5), t, 0.25, 0.35)
        t += BEAT / 2; k += 1


def urgent(b, a, z):
    """D minor, 16th pizz ostinato, pumping 8th bass, kick on the beat, rim on 2 + 4"""
    k = 0; t = a; n16 = BEAT / 4
    while t < z - 0.01:
        beat_i, s = divmod(k, 4); bar = beat_i // 4; ch = D_PROG[bar % 4]
        b.add(b.pizz(ch[[0, 1, 2, 1][s]] + 12, 0.16, 1.2), t, 0.38, -0.25 if s % 2 else 0.25)
        if s % 2 == 0: b.add(b.bass(D_BASS[bar % 4] + (12 if s == 2 else 0), 0.15), t, 0.8)
        if s == 0: b.add(b.kick(), t, 0.6)
        if s == 0 and beat_i % 2 == 1: b.add(b.rim(), t, 0.55, 0.15)
        b.add(b.shaker(1.0 if s % 2 else 0.6), t, 0.4, 0.35)
        t += n16; k += 1


def resolve(b, a, last):
    """two playful bars back in F, half the drums, a C7 lift, then the F chord lands on the last word"""
    playful(b, a, min(last - 0.05, a + 4 * BEAT), light=0.6)
    t = a + 4 * BEAT
    for j, m in enumerate([67, 70, 72, 76]):
        if t + j * BEAT / 2 < last - 0.1: b.add(b.pizz(m), t + j * BEAT / 2, 0.5, -0.2)
    if t < last - 0.1: b.add(b.bass(36, 0.3), t, 0.8)
    for m in (53, 60, 65, 69, 72): b.add(b.pizz(m, 0.6), last, 0.4, 0.0)
    b.add(b.bass(41, 0.45), last, 0.9); b.add(b.glock(77, 0.6), last, 0.35); b.add(b.kick(), last, 0.5)


# plan (optional, films/<slug>/audio/music.json): section starts as seconds or [line, word]; keys playful_end, build,
# build_end, wait (full stop), see (music back), urgent, so (resolve). Without it: reel 1's anchors.
REEL1 = dict(playful_end=11.5, build=11.6, build_end=13.8, wait=['l06', 'Wait'], see=['l07', 'You'], urgent=21.0, so=['l10', 'So'])
def music(words, n, seed=31, plan=None):
    def at(line, word):
        return next(w['t0'] for w in words if w['line'] == line and w['word'].strip('.,?!"').lower() == word.lower())
    P = {**REEL1, **(plan or {})}; T = {k: (at(*v) if isinstance(v, list) else float(v)) for k, v in P.items()}
    b = Bed(n, seed)
    t_build, t_wait, t_see = T['build'], T['wait'], T['see']
    t_urg, t_so, t_last = T['urgent'], T['so'], words[-1]['t0']
    playful(b, 0.0, T['playful_end'])
    build(b, t_build, T['build_end'], t_wait)
    curious(b, t_see, t_urg)
    urgent(b, t_urg, t_so)
    resolve(b, t_so, t_last)
    rr = np.random.default_rng(seed + 1)
    L, R = room(b.L, rr, wet=0.10), room(b.R, rr, wet=0.10)
    L, R = [hp(lp(c, 5500, 2), 45, 2) for c in (L, R)]
    i = int(t_wait * SR); f = int(0.008 * SR)                     # full stop on "Wait": 8 ms fade then silence until "You see"
    for c in (L, R): c[i - f:i] *= np.linspace(1, 0, f); c[i:int(t_see * SR) - 1] = 0
    fo = int(0.4 * SR)
    for c in (L, R): c[-fo:] *= np.linspace(1, 0, fo) ** 2
    return L, R, dict(build=t_build, wait=t_wait, see=t_see, urgent=t_urg, so=t_so, last=t_last)
