# score.py: lofi bed + tiny SFX + ducked mix at -14 LUFS. Run from project root. Reads cues.json every run.
import sys, os, json, re, subprocess, wave, pathlib
import numpy as np, json
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import synth as S
from synth import SR, lp, hp, bp, pad, bell, whoosh, chirp, boing, pop, hat, boom, riser, NOTE
from scipy.signal import fftconvolve
S.rng = np.random.default_rng(7)
rng = np.random.default_rng(7)
P = os.path.dirname(D)

def rd(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels()).mean(1)
        assert w.getframerate() == SR, f'{p} is {w.getframerate()} Hz, the mix runs at {SR}: re-run vo/make_vo.py (writes 48 kHz)'
    return x
def wr(p, x):
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
from scipy.signal import butter, sosfilt
def band(x): return sosfilt(butter(4, [200 / (SR / 2), 6000 / (SR / 2)], 'band', output='sos'), x)
def win_rms(x, w=int(0.05 * SR)):
    k = len(x) // w; return np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1))
def put(buf, y, t):
    i = int(round(t * SR))
    if i < len(buf): buf[i:i + len(y)] += y[:len(buf) - i]

cues = json.load(open(os.path.join(D, 'cues.json')))
CT = {}; [CT.setdefault(c['kind'], []).append(c['t']) for c in cues]
VL = {l['id']: l for l in json.loads(re.search(r'VO_LINES = (\[.*?\]);', open(os.path.join(P, 'src/vo.js')).read()).group(1))}
T_REEL = round((float(re.search(r'VO_END = ([\d.]+)', open(os.path.join(P, 'src/vo.js')).read()).group(1)) + 1.3) * 30) / 30   # = reel.js T_END (reel63)
vo = rd(os.path.join(P, 'vo/vo.wav')); N = int(round(T_REEL * SR)); vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]; T = N / SR
# voice leveller (verifier r1: the old chain hit a 5 ms limiter by 3–10 dB on most lines = grit): a look-ahead peak compressor, 6:1
# above the 30th-percentile peak level, 6 ms centred envelope + 4 ms gain smoothing, so the master limiter only touches stray peaks
from scipy.ndimage import uniform_filter1d
def comp(x, ratio=6.0):
    from scipy.ndimage import maximum_filter1d
    e = uniform_filter1d(maximum_filter1d(np.abs(x), int(0.006 * SR)), int(0.006 * SR)) + 1e-9    # peak envelope, centred = 3 ms look-ahead
    thr = np.percentile(e[e > 0.1 * e.max()], 30)
    g = np.minimum(1.0, (thr / e) ** (1 - 1 / ratio))
    g = uniform_filter1d(maximum_filter1d(g[::-1], 1)[::-1], int(0.004 * SR))                        # 4 ms smoothing: no zipper, no grit
    g = np.minimum(g, uniform_filter1d(np.minimum.reduceat(g, np.arange(0, len(g), int(0.02 * SR))).repeat(int(0.02 * SR))[:len(g)], int(0.04 * SR)))   # slow release floor
    return x * g
vo = comp(vo)
vb = band(vo); ve = win_rms(vb); speech_w = ve > 0.1 * ve.max()
vo_med = np.median(ve[speech_w])     # typical speaking level, band RMS per 50 ms

# ---------------- music (reel63 PIT STOP): a racing groove at 124 BPM in A minor. Hook: low bass pulse + riser under the lamps, cut
# dead on "until" (the engine cut); the groove drops in on the crates ("four"); full groove through the 4 chapters (a fill on each wipe);
# CTA: the groove stops for the 5 lamps (a riser), a hit + the full groove on the launch, a warm chord under the end card.
from synth import kick, snare, hat, b808, pluck
BPM = 124; beat = 60 / BPM
W_ = json.loads(re.search(r'VO_WORDS = (\[.*?\]);', open(os.path.join(P, 'src/vo.js')).read(), re.S).group(1))
def wt(line, w):
    for x in W_:
        if x['line'] == line and x['w'].lower().strip('.,') == w.lower(): return x['s']
    return VL[line]['s']
T_CUT, T_IN = wt('hook', 'until'), wt('hook', 'four') - beat * 0.5
T_LAMPS, T_LAUNCH, T_CARD = wt('cta', 'Comment') - 0.25, CT['launch'][0], CT['card'][0]
WIPES = CT.get('wipe', [])
mus = np.zeros(N + SR * 6)
for k in range(int(T_CUT / (beat / 2))):                                  # hook: 8th-note bass pulse + riser
    put(mus, b808(33, beat / 2 * 0.9, g=0.55), k * beat / 2)
put(mus, riser(T_CUT, 120, 3500) * 0.35, 0.0)
PROG = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]]          # Am F C G
BASS = [33, 33, 45, 33, 29, 29, 41, 29, 36, 36, 48, 36, 31, 31, 43, 31]
def groove(a, b, full=1.0):
    k = 0; t_ = a
    while t_ < b - 0.02:
        bar, q = divmod(k, 8)                                                # 8 eighths per bar
        put(mus, kick(0.9) if q % 2 == 0 else np.zeros(1), t_)
        if q in (2, 6): put(mus, snare(0.5 * full), t_)
        put(mus, hat(open_=(q % 2 == 1 and q == 7), g=0.8 if q % 2 else 0.5), t_)
        put(mus, b808(BASS[(bar % 2) * 8 + q], beat / 2 * 0.85, g=0.5), t_)
        ch = PROG[(bar // 1) % 4]
        if q in (0, 3, 6): put(mus, lp(pluck(ch[(q // 3) % 3] + 12, 0.5, bright=1.2), 3500) * 0.8 * full, t_)
        if q == 0: put(mus, pad([m + 12 for m in ch], 8 * beat / 2, cut=1500, a=0.05, r=0.3) * 0.35 * full, t_)
        t_ += beat / 2; k += 1
groove(T_IN, T_LAMPS)
for w in WIPES:                                                          # a snare fill into each chapter
    for j in range(4): put(mus, snare(0.25 + 0.12 * j), w - 0.24 + j * 0.06)
L = T_LAUNCH - T_LAMPS; put(mus, riser(L, 300, 6000) * 0.4, T_LAMPS)      # the 5 lamps: the groove holds its breath
put(mus, boom(1.4, 80, 30) * 0.5, T_LAUNCH); put(mus, kick(1.2), T_LAUNCH)
groove(T_LAUNCH, T_CARD + 0.05, full=1.1)
put(mus, pad([57, 60, 64, 69], T - T_CARD, cut=1800, a=0.05, r=0.9) * 0.7, T_CARD)
for j, m in enumerate([69, 72, 76, 81]): put(mus, lp(pluck(m, 1.2), 4000) * 0.7, T_CARD + j * 0.08)
mus = mus[:N]; mus = hp(lp(mus, 4000, 4), 60, 2)
fo = np.ones(N); fe = int(0.9 * SR); fo[-fe:] *= np.linspace(1, 0, fe) ** 1.5; mus *= fo
mr = win_rms(band(mus)); n_ = min(len(mr), len(speech_w)); ref = speech_w[:n_] & (np.arange(n_) * 0.05 > T_IN) & (np.arange(n_) * 0.05 < T_LAMPS)
music = mus * vo_med * 10 ** (-15.0 / 20) / np.median(mr[:n_][ref])   # bed 15 dB under the dialog (the per-line duck below holds it ≥ 15 dB on every word)
# room tone (library ambience) far under everything, so the silences are a room, not digital black
amb = rd(next(str(p / 'styles/kai-reel-3d/sfx/ambience/night-room-tone.wav') for p in pathlib.Path(__file__).resolve().parents if (p / 'styles/kai-reel-3d/sfx').is_dir())); amb = np.tile(amb, int(T / (len(amb) / SR)) + 2)[:N]
amb = hp(amb, 120) * vo_med * 10 ** (-30 / 20) / (np.sqrt(np.mean(band(amb) ** 2)) + 1e-9)

# per-line duck (verifier r1: quiet lines like "Finally… peace and quiet" sat only ~9 dB over the bed): music ≤ voice − 16 dB on every
# speaking 50 ms window, gain smoothed over 150 ms
me = win_rms(band(music)); n_ = min(len(me), len(ve)); gw = np.ones(n_)
sw_ = (ve > 0.02 * ve.max())[:n_]; gw[sw_] = np.minimum(1, ve[:n_][sw_] * 10 ** (-17 / 20) / (me[:n_][sw_] + 1e-9))
gw = uniform_filter1d(gw, 3); gs_ = np.interp(np.arange(N) / SR, (np.arange(n_) + 0.5) * 0.05, gw)
music = music * uniform_filter1d(gs_, int(0.15 * SR))

# ---------------- SFX: licensed library layers (audio/sfx.py)
os.environ.setdefault('SFX_GAIN_DB', '9'); os.environ.setdefault('SFX_SET', 'earshot')   # v2: earshot only (Kai), stem trim
import sfx as SFX
sfx = SFX.build(cues, vo)

# ---------------- master: two-pass loudness
def lufs(x):
    p = os.path.join(D, '_probe.wav'); wr(p, x)
    o = subprocess.run(['ffmpeg', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', o)[-1])
def limit(x, ceil=10 ** (-2.1 / 20)):   # lookahead-free smooth peak limiter on 4x-safe margin
    env = np.abs(x); out = x.copy(); over = env > ceil
    if over.any():
        gr = np.ones(len(x)); gr[over] = ceil / env[over]
        from scipy.ndimage import minimum_filter1d, uniform_filter1d
        gr = uniform_filter1d(minimum_filter1d(gr, int(0.012 * SR)), int(0.012 * SR)); out = x * gr
    return out
VO_BUS = 10 ** (-2.5 / 20)   # v2 (Kai 2026-10-17 "giọng hơi to"): voice bus −2.5 dB before the master; the bed follows the voice
vo, music = vo * VO_BUS, music * VO_BUS
raw = vo + music + sfx + amb
G = 1.0
for _ in range(3):
    I, _p = lufs(limit(raw * G)); G *= 10 ** ((-14.0 - I) / 20)
mix = limit(raw * G)
for _ in range(3):
    I, pk = lufs(mix)
    if abs(I + 14) < 0.15: break
    G *= 10 ** ((-14.0 - I) / 20); mix = limit(raw * G)
wr(os.path.join(D, 'music.wav'), music * G); wr(os.path.join(D, 'vo_m.wav'), vo * G); wr(os.path.join(D, 'sfx.wav'), sfx * G); wr(os.path.join(D, 'mix.wav'), mix)
print(f'mix {I:.2f} LUFS, true peak {pk:.2f} dBFS, gain {20*np.log10(G):+.1f} dB, {len(mix)/SR:.3f}s, cues {len(cues)}')
os.remove(os.path.join(D, '_probe.wav'))
