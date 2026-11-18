# sound_lib.py: the stick-man sound effects and beds, built on the kit's recorded library (styles/stick-man/sound/, CC0, see
# library.json and CREDITS). Ported from hm-ep01 round 4 (audio/samples.py).
#   lookup(name) -> Sound(how, as_, fn): how is 'names' (in NAMES), 'synth' (in SYNTH) or 'guess' (keyword guess, reported)
#   fn(rng, cue) -> mono float array at 48 kHz, peak 1;  bed(kind, n, rng) -> (L, R)
#   python styles/stick-man/tools/sound_lib.py <cue name>...   prints how each name resolves and the library files it plays
import json, os, sys
from math import gcd
from typing import Callable, NamedTuple
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, fftconvolve, butter, sosfilt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sound_dsp import SR, NOTE, lp, hp, bp, ts, osc, put
from sound_bank import BANK

KIT_SOUND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sound')
LIB = json.load(open(os.path.join(KIT_SOUND, 'library.json')))
_cache = {}
USED = set()


def load(slot):
    USED.add(slot)
    if slot not in _cache:
        y, sr = sf.read(os.path.join(KIT_SOUND, LIB[slot]['file']), always_2d=True); assert sr == SR; _cache[slot] = y
    return _cache[slot]


def mono(slot): return load(slot).mean(1)
def norm(x): return x / (np.abs(x).max() + 1e-12)
def fade(x, a=0.002, z=0.03):
    x = x.copy(); na, nz = min(len(x) // 3, int(a * SR)), min(len(x) // 3, int(z * SR))
    if na: x[:na] *= np.linspace(0, 1, na)
    if nz: x[-nz:] *= np.linspace(1, 0, nz)
    return x


def piece(slot, rng, d=None):
    """a pool slot: one onset segment (seeded pick); an event slot: the event (cut to d s)"""
    y = mono(slot); L = LIB[slot]
    if L['kind'] == 'pool' and L.get('segs'):
        segs = [s for s in L['segs'] if s[2] > 0.35] or L['segs']; s = segs[int(rng.integers(len(segs)))]
        y = y[int(s[0] * SR):int(s[1] * SR)]
    if d: y = y[:int(d * SR)]
    return fade(norm(y))


def speed(x, r):
    """tape-style speed change (r < 1 = slower and lower), the way a film slows a recording"""
    p, q = (int(round(1000 / r)), 1000) if r < 1 else (1000, int(round(1000 * r)))
    g = gcd(p, q); return resample_poly(x, p // g, q // g)


def verb(x, rng, d=1.2, wet=0.3, bright=4000):
    """a plate-like tail: seeded decaying noise IR (outdoor slap-back is added separately)"""
    t = np.arange(int(d * SR)) / SR; ir = lp(rng.standard_normal(len(t)), bright) * np.exp(-t / (d / 6)); ir /= np.sqrt((ir ** 2).sum())
    y = np.pad(x, (0, len(t))); return y + wet * fftconvolve(y, ir)[:len(y)]


def slap(x, taps=((0.11, 0.35), (0.26, 0.18), (0.47, 0.08)), f=2500):
    """echoes off nearby walls: delayed, dulled copies"""
    n = int(max(t for t, _ in taps) * SR) + len(x); y = np.zeros(n); y[:len(x)] += x; d = lp(x, f)
    for t, g in taps: k = int(t * SR); y[k:k + len(x)] += g * d
    return y


def mixl(*parts):
    n = max(len(p) for p, _, _ in parts); y = np.zeros(n)
    for p, t, g in parts:
        k = int(t * SR); m = min(len(p), n - k); y[k:k + m] += g * p[:m]
    return y


def sub(d, f0=55, f1=32, tau=0.25):
    t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / d) / SR) * np.exp(-t / tau) * np.minimum(1, t / 0.003)


# ---------------------------------------------------------------- designed sounds (recorded cores)
def gunshot_close(rng, c):
    """the hero shot: the recorded 9 mm, a sub kick under it (weight on a phone), the crack kept, a short outdoor slap-back"""
    g = piece('gunshot_close', rng, 2.0); y = mixl((g, 0, 1.0), (sub(0.5, 70, 38, 0.11), 0, 0.55), (hp(g, 3000), 0, 0.25))
    return norm(slap(verb(y, rng, 0.9, 0.18), ((0.14, 0.3), (0.33, 0.14), (0.6, 0.06)), 3000))


def gunshot_far(rng, c):
    g = piece('gunshot_far', rng, 2.6)
    return norm(slap(verb(g, rng, 1.6, 0.4, 2500), ((0.22, 0.4), (0.5, 0.2)), 1800))


def gunshot_slowmo(rng, c):
    """the bullet-cam shot: the same recording at 35 % speed (pitch drops, the crack becomes a long boom), the normal crack on top"""
    g = piece('gunshot_close', rng, 2.0); s = speed(g, 0.35)
    return norm(mixl((g, 0, 0.6), (lp(s, 3000), 0.0, 1.0), (sub(2.2, 45, 26, 0.7), 0, 0.7)))


def bullet_slowmo(rng, c):
    """the bullet in slow motion: the recorded fly-by at 25 % speed, a rising air tone, ends dead on the hit"""
    f = piece('bullet_flyby', rng, 1.4); s = speed(f, float(c.get('rate', 0.25)))
    d = float(c.get('dur', min(3.0, len(s) / SR)))
    s = np.pad(s, (0, max(0, int(d * SR) - len(s))))[:int(d * SR)]; t = np.arange(len(s)) / SR
    swell = (t / d) ** 1.5; return norm(fade(lp(s, 5000) * (0.4 + 0.6 * swell), 0.05, 0.02))


def flyby(rng, c): return norm(piece('bullet_flyby', rng, 1.2))


def impact_metal(rng, c, light=False):
    """a round through a car body: recorded metal hit + a short ring + a thump of the body"""
    m = piece('impact_metal', rng, 1.0); y = mixl((m, 0, 1.0), (sub(0.3, 90, 55, 0.06), 0, 0.0 if light else 0.4))
    return norm(lp(y, 6000) if light else verb(y, rng, 0.5, 0.12))


def glass_smash(rng, c):
    """a window: the recorded smash kept whole (CLAP: any extra layer made it read less real), a light thump and a little
    of the falling shards under its tail"""
    g = piece('glass_smash', rng, 2.4)
    return norm(mixl((g, 0, 1.0), (sub(0.25, 85, 55, 0.06), 0, 0.22), (piece('glass_debris', rng, 2.2), 0.3, 0.22)))


def glass(rng, c): return norm(piece('glass_debris', rng, 1.2))


def trunk_slam(rng, c, far=False):
    s = piece('trunk_slam', rng, 1.4); y = mixl((s, 0, 1.0), (sub(0.35, 60, 40, 0.1), 0, 0.45))
    y = slap(y, ((0.19, 0.3), (0.41, 0.15), (0.66, 0.07)), 1500)
    return norm(lp(verb(y, rng, 1.4, 0.5, 1500), 900) if far else y)


def bag_thump(rng, c):
    b = piece('bag_thump', rng, 1.0); return norm(mixl((b, 0, 1.0), (sub(0.25, 65, 45, 0.07), 0, 0.35)))


def bag_trunk(rng, c):                             # a heavy bag into a trunk: the thump + the car body giving under it
    b = bag_thump(rng, c); s = lp(piece('trunk_slam', rng, 0.6), 700)
    return norm(mixl((b, 0, 1.0), (s, 0.01, 0.25)))


def bag_drop(rng, c):                              # onto wet asphalt: the thump + a splash (a wet step's attack)
    return norm(mixl((bag_thump(rng, c), 0, 1.0), (hp(piece('step_wet', rng), 1200), 0, 0.5)))


def engine(rng, c, slot='engine_rev'):
    d = float(c.get('dur', 3.0)); e = piece(slot, rng)
    if len(e) < d * SR: e = np.concatenate([e, e[::-1]] * 3)
    return norm(fade(e[:int(d * SR)], 0.01, min(0.4, d / 4)))


def siren_(rng, c, mode='near'):
    """the recorded siren; rise = from far and dull to near; far = behind glass, falling away"""
    d = float(c.get('dur', {'near': 3.5, 'rise': 1.8, 'far': 1.8, 'long': 6.0}[mode])); s = mono('siren')
    a = int(rng.uniform(0, max(1, len(s) - d * SR - 1))); y = s[a:a + int(d * SR)]
    if len(y) < d * SR: y = np.pad(y, (0, int(d * SR) - len(y)))
    t = np.arange(len(y)) / SR; u = t / d
    if mode == 'rise': y = lp(y, 900) * (1 - u) + y * u; y = y * 10 ** ((-16 + 16 * u ** 1.3) / 20)
    elif mode == 'far': y = lp(y, 800) * np.exp(-t / 0.7)
    return norm(fade(y, 0.02, 0.15))


def car_by(rng, c): return norm(piece('car_by', rng, 5.5))


def tyres(rng, c):                                 # wet tyre hiss: the pass-by, high-passed, a swell
    d = float(c.get('dur', 1.0)); y = hp(mono('car_by'), 900); k = int(np.argmax(np.abs(y))); a = max(0, k - int(d * SR / 2))
    z = y[a:a + int(d * SR)]; t = np.arange(len(z)) / SR; return norm(z * np.sin(np.pi * t / (len(z) / SR)) ** 2)


def screech(rng, c):
    d = float(c.get('dur', 1.2)); return norm(fade(piece('tyre_screech', rng)[:int(d * SR)], 0.01, 0.12))


def crash_metal(rng, c):
    x = piece('crash_metal', rng, 3.2); return norm(slap(mixl((x, 0, 1.0), (sub(0.5, 60, 35, 0.15), 0, 0.5)), ((0.15, 0.25), (0.36, 0.1)), 2500))


def crash_bins(rng, c):                            # a car into a shop front and bins: the car crash + a trash-can crash under it
    return norm(mixl((crash_metal(rng, c), 0, 1.0), (piece('bins', rng), 0.04, 0.45)))


def knock(rng, c): return norm(verb(piece('knock', rng), rng, 0.8, 0.35, 2500))
def thud(rng, c): return norm(mixl((piece('thud', rng), 0, 1.0), (sub(0.25, 70, 45, 0.07), 0, 0.3)))
def boom(rng, c): return norm(piece('boom', rng, 2.5))
def thump(rng, c): return norm(lp(boom(rng, c), 200, 4))
def hit(rng, c): return norm(mixl((piece('punch', rng), 0, 1.0), (sub(0.3), 0, 0.6)))


def gun_cock(rng, c):                              # a pistol racked: two clunks close together (recorded latch clunks)
    a, b = piece('clunk', rng), piece('clunk', rng)
    return norm(mixl((hp(a, 600), 0, 1.0), (hp(b, 900), 0.11, 0.8)))


def gun_draw(rng, c):                              # a pistol out of its holster: leather, then the metal
    return norm(mixl((piece('rustle', rng), 0, 0.5), (piece('clunk', rng), 0.12, 0.8)))


def slowmo(rng, c):                                # a slow-motion whoosh: the recorded fly-by stretched + a low swell
    return bullet_slowmo(rng, dict(c, dur=c.get('dur', 1.1), rate=0.3))


def car_stop(rng, c): return norm(mixl((lp(piece('car_door', rng), 500), 0, 0.6), (sub(0.5, 60, 42, 0.12), 0, 0.8), (piece('creak', rng), 0.08, 0.3)))
def flashlight(rng, c): return norm(piece('flashlight', rng, 0.5))


def scrape_metal(rng, c):                          # a wing grinding along a brick wall: a drag scrape high-passed, a metal ring, sparks
    d = float(c.get('dur', 0.5)); g = hp(piece('drag', rng), 700); g = np.pad(g, (0, max(0, int(d * SR) - len(g))))[:int(d * SR)]
    m = piece('impact_metal', rng, 0.4); y = mixl((g, 0, 1.0), (m, 0, 0.5), (hp(piece('glass_debris', rng, d), 3000), 0.02, 0.15))
    return norm(fade(y, 0.005, 0.08))


def brake_squeal(rng, c):                          # locked wheels: the screech's brightest part, short
    d = float(c.get('dur', 0.6)); x = hp(piece('tyre_screech', rng), 600); e = np.convolve(np.abs(x), np.ones(2400) / 2400, 'same')
    k = int(np.argmax(e)); a = max(0, k - int(d * SR * 0.3)); return norm(fade(x[a:a + int(d * SR)], 0.02, 0.1))


def engine_down(rng, c):                           # an engine dropping off the throttle: the rev played slower and falling away
    d = float(c.get('dur', 0.7)); e = speed(piece('engine_rev', rng), 0.8); k = len(e) // 2
    z = e[k:k + int(d * SR)]; t = np.arange(len(z)) / SR; return norm(fade(z * np.exp(-t / (d / 2)), 0.01, 0.08))


def engine_far(rng, c): return norm(lp(engine(rng, c, 'engine_rev'), 900, 4))


def engine_idle(rng, c):                           # the idle after the start (the last seconds of the ignition take), looped
    d = float(c.get('dur', 2.5)); e = mono('engine_start'); z = e[len(e) // 2:]
    while len(z) < d * SR: z = np.concatenate([z, z])
    return norm(fade(lp(z[:int(d * SR)], 2500), 0.1, 0.3))


def siren_stop(rng, c):                            # a siren winding down: slowed and falling
    d = float(c.get('dur', 0.8)); s = mono('siren'); a = int(rng.uniform(0, len(s) - 3 * SR)); z = s[a:a + int(2 * SR)]
    r = np.linspace(1.0, 0.45, len(z)); idx = np.cumsum(r); idx = idx[idx < len(z) - 1]; y = np.interp(idx, np.arange(len(z)), z)
    y = y[:int(d * SR)]; t = np.arange(len(y)) / SR; return norm(fade(y * np.exp(-t / (d / 2.5)), 0.005, 0.1))


def steam_hiss(rng, c):                            # steam from a wrecked radiator is broadband noise: shaped noise is the real thing here
    d = float(c.get('dur', 3.0)); t = np.arange(int(d * SR)) / SR
    x = sosfilt(butter(2, [2500 / (SR / 2), 11000 / (SR / 2)], 'band', output='sos'), rng.standard_normal(len(t)))
    return norm(x * np.minimum(1, t / 0.08) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t)) * np.exp(-t / (d * 0.8)))


def street_bed(rng, c):                            # night street air as a cue: a stretch of the recorded night city, mono
    d = float(c.get('dur', 2.0)); y = mono('bed_city_night'); a = int(rng.uniform(0, len(y) - d * SR - 1))
    return norm(fade(y[a:a + int(d * SR)], 0.3, 0.4))


def simple(slot, d=None):
    """the recording alone: one pool segment or the event, cut to the cue's dur (else d)"""
    def f(rng, c): return norm(piece(slot, rng, c.get('dur', d)))
    return f


def step(slot):
    def f(rng, c): return piece(slot, rng)
    return f


# ---------------------------------------------------------------- synthesised: the musical and interface blips only
def _nz(rng, d): return rng.standard_normal(int(d * SR))
def _env(d, tau, a=0.002): t = ts(d); return np.minimum(1, t / a) * np.exp(-t / tau)


def stab(rng, c):                                  # a low minor cluster hit with a sub under it
    d = 1.0; t = ts(d); y = sum(osc(np.full(len(t), NOTE(m)), 'saw') for m in (38, 45, 51, 56))
    y = lp(y, 1800) * np.exp(-t / 0.35) + 1.5 * np.sin(2 * np.pi * NOTE(26) * t) * np.exp(-t / 0.4) + 0.5 * bp(_nz(rng, d), 300, 3000) * _env(d, 0.03)
    return norm(y * np.minimum(1, t / 0.003))


def note(rng, c):                                  # one low piano-ish note (D2): inharmonic partials, a hammer click, long decay
    d = 2.2; t = ts(d); f0 = NOTE(38); y = np.zeros(len(t))
    for k in range(1, 9):
        fk = f0 * k * np.sqrt(1 + 0.0004 * k * k); y += np.sin(2 * np.pi * fk * t) * np.exp(-t / (1.4 / k ** 0.7)) / k ** 1.1
    return norm(y * np.minimum(1, t / 0.003) + 0.1 * bp(_nz(rng, d), 2000, 6000) * _env(d, 0.004))


def send(rng, c):                                  # a message sent: a whoosh, then a ping
    y = np.zeros(int(0.9 * SR)); put(y, norm(BANK['whoosh'](rng)), 0.0); put(y, 0.5 * norm(BANK['ping'](rng)), 0.25); return norm(y)


def bank(name):
    def f(rng, c): return BANK[name](rng)
    return f


# ---------------------------------------------------------------- names: every cue name a film may use, one entry each
NAMES = {
    'gunshot': gunshot_close, 'gunshot_close': gunshot_close, 'gun_shot': gunshot_close, 'gunshot_far': gunshot_far,
    'gunshot_slowmo': gunshot_slowmo, 'gunshot_slow': gunshot_slowmo, 'bullet_slowmo': bullet_slowmo, 'bullet_slow': bullet_slowmo,
    'bullet_flyby': flyby, 'flyby': flyby, 'bullet_whiz': flyby,
    'slowmo': slowmo, 'slowmo_in': slowmo, 'slowmo_out': lambda r, c: norm(np.flip(slowmo(r, c))),
    'gun_draw': gun_draw, 'gun_cock': gun_cock, 'gun_rack': gun_cock,
    'impact': impact_metal, 'impact_metal': impact_metal, 'bullet_hit': impact_metal, 'bullet_impact': impact_metal, 'hole': impact_metal,
    'impact_light': lambda r, c: impact_metal(r, c, True),
    'crash': glass_smash, 'glass_smash': glass_smash, 'window_smash': glass_smash, 'glass': glass, 'glass_debris': glass,
    'slam': trunk_slam, 'trunk_slam': trunk_slam, 'lid_slam': trunk_slam, 'slam_far': lambda r, c: trunk_slam(r, c, True),
    'trunk': bag_trunk, 'bag_trunk': bag_trunk, 'bag_throw': bag_trunk, 'bag_thump': bag_thump, 'bag_drop': bag_drop,
    'bag_grab': simple('rustle', 0.4), 'bag_whoosh': simple('whoosh'), 'cloth_whoosh': simple('whoosh'),
    'thud': thud, 'thump': thump, 'boom': boom, 'hit': hit, 'knock': knock,
    'engine': lambda r, c: engine(r, c, 'engine_start'), 'engine_start': lambda r, c: engine(r, c, 'engine_start'),
    'starter': lambda r, c: engine(r, dict(c, dur=c.get('dur', 0.8)), 'engine_start'),
    'engine_rev': engine, 'engine_roar': engine, 'engine_chase': engine, 'engine_int': lambda r, c: engine(r, c, 'engine_int'),
    'engine_down': engine_down, 'engine_away': engine_down, 'engine_far': engine_far, 'engine_idle': engine_idle,
    'screech': screech, 'skid': screech, 'tyre_screech': screech, 'tire_screech': screech,
    'tyres': tyres, 'tyre_hiss': tyres, 'tyres_wet': tyres, 'brake_squeal': brake_squeal, 'brakes': brake_squeal,
    'siren': siren_, 'siren_long': lambda r, c: siren_(r, c, 'long'), 'siren_rise': lambda r, c: siren_(r, c, 'rise'),
    'siren_far': lambda r, c: siren_(r, c, 'far'), 'siren_stop': siren_stop,
    'car_by': car_by, 'car_pass': car_by, 'car_door': lambda r, c: piece('car_door', r, 1.2), 'car_stop': car_stop, 'suspension_thump': car_stop,
    'crash_metal': crash_bins, 'car_crash': crash_bins, 'bins_crash': crash_bins, 'crash_bins': crash_bins,
    'scrape_metal': scrape_metal, 'scrape': scrape_metal, 'steam_hiss': steam_hiss, 'street_bed': street_bed, 'flashlight': flashlight,
    'step_wet': step('step_wet'), 'wet_step': step('step_wet'), 'run_wet': step('step_wet'),
    'step_l': step('step_hard'), 'step_r': step('step_hard'), 'step': step('step_hard'),
    'radio': simple('radio', 1.6),
    **{s: simple(s) for s in ('creak', 'zip', 'springs', 'whoosh', 'rustle', 'breath', 'sigh', 'grunt', 'drip', 'tick', 'slide', 'slap',
                              'drag', 'flutter', 'lamp', 'ding', 'ting', 'bite', 'stamp', 'clunk', 'register', 'glass_door', 'servo', 'shout')},
}
SYNTH = {'stab': stab, 'note': note, 'send': send,
         **{s: bank(s) for s in ('ping', 'beep', 'blip', 'poof', 'snore', 'scratch', 'sting', 'crowd')}}
# an unknown name is guessed by its first matching word (a word starts one of the name's _ parts): what happens (action words) ranks before what it happens to (object
# words), so 'bag_whoosh' is a whoosh, not a bag thump, and 'gun_draw' is a draw, not a shot
ACTION = [('whoosh', 'whoosh'), ('swish', 'whoosh'), ('swing', 'whoosh'), ('grab', 'rustle'), ('draw', 'gun_draw'),
          ('cock', 'gun_cock'), ('rack', 'gun_cock'), ('drop', 'bag_drop'), ('step', 'step_wet'), ('run', 'step_wet'),
          ('walk', 'step_wet'), ('slam', 'trunk_slam'), ('smash', 'glass_smash'), ('crash', 'crash_metal'), ('screech', 'tyre_screech'),
          ('skid', 'tyre_screech'), ('rev', 'engine_rev'), ('knock', 'knock'), ('thump', 'thud'), ('thud', 'thud'), ('hit', 'impact_metal'),
          ('impact', 'impact_metal'), ('shot', 'gunshot_close'), ('fire', 'gunshot_close'), ('pass', 'car_by'), ('by', 'car_by'),
          ('click', 'flashlight'), ('breath', 'breath'), ('scrape', 'scrape_metal'), ('rustle', 'rustle'), ('creak', 'creak'), ('zip', 'zip')]
OBJECT = [('bullet', 'bullet_flyby'), ('glass', 'glass'), ('window', 'glass'), ('engine', 'engine_rev'), ('tyre', 'tyres'),
          ('tire', 'tyres'), ('siren', 'siren'), ('door', 'car_door'), ('lid', 'trunk_slam'), ('bag', 'bag_thump'), ('foot', 'step_wet'),
          ('cloth', 'rustle'), ('paper', 'rustle'), ('light', 'flashlight'), ('gun', 'gun_cock'), ('car', 'car_by')]


class Sound(NamedTuple):
    how: str               # 'names' | 'synth' | 'guess'
    as_: str               # the name whose design plays (the cue name itself unless guessed)
    fn: Callable


def lookup(name):
    if name in NAMES: return Sound('names', name, NAMES[name])
    if name in SYNTH: return Sound('synth', name, SYNTH[name])
    tokens = name.lower().split('_')
    for word, target in ACTION + OBJECT:
        if any(t.startswith(word) for t in tokens): return Sound('guess', target, NAMES[target])
    return Sound('guess', 'thud', thud)


# ---------------------------------------------------------------- beds (stereo, recorded)
BEDS = {  # kind -> [(slot, gain dB, lowpass Hz or None)]
    'room_rain': [('bed_rain_room', 0, None), ('bed_fridge', -10, None)],
    'walkway': [('bed_walkway', 0, None)],
    'lot': [('bed_rain_lot', 0, None), ('bed_city_night', -12, None)],
    'lot_front': [('bed_rain_lot', -1, None), ('bed_city_night', -5, None)],
    'breezeway': [('bed_breezeway', 0, None), ('bed_rain_lot', -9, 1600)],
    'lane': [('bed_lane', 0, None)],
    'car_int': [('bed_car_rain', 0, None)],
    'street_day': [('bed_street_day', 0, None)],
    'dealer': [('bed_shop', 0, None)],
    'bank': [('bed_bank', 0, None)],
    'bank_low': [('bed_bank', -4, 500)],
    'office': [('bed_office', 0, None)],
    'room2': [('bed_fridge', 0, None), ('bed_rain_room', -8, 2500)],
    'tension': [('bed_tension', 0, None)],
    'lot_slow': [('bed_rain_lot', 0, 700)],
    'chase': [('bed_rain_lot', 0, None), ('bed_city_night', -4, None)],
    'lot_close': [('bed_rain_lot', 0, None), ('bed_walkway', -6, None)],
}


def bed(kind, n, rng):
    """n samples of a bed, stereo: each layer from a seeded offset, looped with 1 s equal-power crossfades when short"""
    L, R = np.zeros(n), np.zeros(n)
    for slot, g, f in BEDS[kind]:
        y = load(slot); y = y if y.shape[1] == 2 else np.repeat(y, 2, 1); x = int(1.0 * SR)
        while len(y) < n + 2 * x:
            w = np.linspace(0, 1, x)[:, None]; y = np.concatenate([y[:-x], y[-x:] * np.sqrt(1 - w) + y[:x] * np.sqrt(w), y[x:]])
        a = int(rng.uniform(0, len(y) - n)); out = y[a:a + n]
        if f: out = np.stack([lp(out[:, 0], f, 4), lp(out[:, 1], f, 4)], 1)
        gg = 10 ** (g / 20) / (np.sqrt((out ** 2).mean()) + 1e-9) * 0.1; L += out[:, 0] * gg; R += out[:, 1] * gg
    return L, R


def resolve(name):
    """how a cue name plays: {how, as, files}; files are the library recordings one render of it reads"""
    s = lookup(name); USED.clear(); y = s.fn(np.random.default_rng(1), {})
    assert len(y) and np.isfinite(y).all(), name
    return {'how': s.how, 'as': s.as_, 'files': sorted(LIB[k]['file'] for k in USED)}


if __name__ == '__main__':
    print(json.dumps({n: resolve(n) for n in (sys.argv[1:] or sorted(NAMES) + sorted(SYNTH))}, indent=1))
