# sfx.py: cues.json → audio/sfx.wav from the licensed library (styles/kai-reel-3d/sfx, see LIBRARY.md). Run from project root,
# or import build() from score.py. Per cue kind = 1–3 library layers [file, gain dB, offset s]; each hit lands 1 frame after its picture;
# every layer is high-passed at 200 Hz; the whole hit is held 5 dB under the local speech (50 ms grid) so it never sits on a consonant.
import os, sys, json, wave, pathlib, numpy as np
from scipy.signal import butter, sosfilt
SR = 48000; FRAME = 1 / 30
LIB = os.environ.get('SFX_LIB') or next((str(p / 'styles/kai-reel-3d/sfx') for p in pathlib.Path(__file__).resolve().parents if (p / 'styles/kai-reel-3d/sfx').is_dir()), None)
# kind → layers (transient + body + tail). Gains are relative to the hit's loudest layer before the level pass.
KIT = {
  # reel57 kinds (kept so the template still runs them)
  'prompt':   [['ui/px-pop.wav', -2, 0], ['ui/px-click-soft.wav', -6, 0.0]],
  'enter':    [['foley/enter-clack.wav', 0, 0], ['foley/px-key-press.wav', -8, 0.005]],
  'tap':      [['clawd/toy-tap.wav', -4, 0]],
  'land':     [['clawd/toy-land.wav', -2, 0], ['clawd/toy-tap.wav', -9, 0.01]],
  'land_big': [['whoosh/px-whoosh-short.wav', -10, -0.32], ['clawd/toy-land.wav', 0, 0], ['foley/px-key-press.wav', -8, 0.0]],
  'toggle':   [['ui/toggle-danger.wav', 0, 0]],
  'rm':       [['foley/px-typing.wav', -6, -0.15], ['ui/px-glitch-1.wav', -14, 0.1]],
  'poof':     [['foley/poof.wav', 0, 0], ['whoosh/px-whoosh-short.wav', -8, -0.06], ['ui/px-pop.wav', -10, 0]],
  'poof_ui':  [['ui/px-pop.wav', -6, 0]],
  'sparkle':  [['ui/px-sparkle.wav', -4, 0]],
  'snap':     [['whoosh/px-whoosh-short.wav', -8, -0.05]],
  'stand':    [['foley/cloth-stand.wav', 0, -0.05]],
  'slump':    [['foley/cloth-stand.wav', -8, 0], ['whoosh/px-whoosh.wav', -14, 0]],
  'card':     [['ui/px-chime.wav', -2, 0]],
  # reel58 kinds
  'alarm':    [['ui/alarm-stinger.wav', 0, 0], ['impact/low-boom.wav', -14, 0]],                 # frame 1: the leak
  'flash':    [['ui/px-glitch-1.wav', -10, 0]],
  'tick':     [['ui/px-click-soft.wav', 0, 0], ['ui/px-pop.wav', -10, 0]],                      # Public badge
  'pop':      [['ui/px-pop.wav', 0, 0]],                                                        # ★ 2
  'bot':      [['ui/robot-blip.wav', 0, 0]],                                                    # one bot eye on
  'bots':     [['ui/robot-blip.wav', 0, 0], ['ui/robot-blip.wav', -4, 0.06], ['ui/robot-blip.wav', -7, 0.13]],
  'timer':    [['ui/timer-tick.wav', 0, 0]],
  'impact':   [['impact/low-boom.wav', 0, 0], ['ui/px-glitch-1.wav', -12, 0]],                  # 00:47
  'relief':   [['whoosh/px-whoosh.wav', -2, 0]],
  'check':    [['ui/px-click-soft.wav', 0, 0], ['ui/px-pop.wav', -8, 0.01]],
  'drop':     [['impact/low-boom.wav', 0, 0]],                                                  # "still in the history"
  'ping':     [['ui/sonar-ping.wav', 0, 0]],
  'flare':    [['ui/alarm-stinger.wav', -3, 0], ['ui/robot-blip.wav', -6, 0]],                  # "Right now"
  'counter':  [['ui/counter-roll.wav', 0, 0]],
  'chart':    [['whoosh/px-whoosh-short.wav', -2, 0], ['ui/px-notification.wav', -8, 0.1]],
  'whoosh':   [['whoosh/px-whoosh-short.wav', 0, -0.04]],
  'poweroff': [['foley/power-down.wav', 0, 0]],
  'eyesoff':  [['foley/power-down.wav', -6, 0.08], ['ui/px-click-soft.wav', -8, 0.05]],
  'stamp':    [['foley/enter-clack.wav', 0, 0], ['impact/low-boom.wav', -10, 0], ['ui/px-chime.wav', -10, 0.05]],
  'sit':      [['foley/cloth-stand.wav', -6, 0]],
  'keypop':   [['ui/px-pop.wav', -2, 0], ['foley/key-jingle.wav', 0, 0.12]],
  # reel61 kinds
  'chat':     [['ui/px-notification.wav', 0, 0]],                                               # #team "typing…" blips
  'branch':   [['ui/px-pop.wav', -2, 0], ['ui/px-sparkle.wav', -3, 0.06], ['whoosh/px-whoosh-short.wav', -12, -0.08]],   # the backup branch springs up
  'chime':    [['ui/px-chime.wav', 0, 0], ['ui/px-click-soft.wav', -8, 0]],                     # main restored
}
LEVEL = {'toggle': -13, 'land_big': -10, 'tap': -21, 'poof_ui': -16, 'snap': -14, 'slump': -14, 'rm': -12, 'prompt': -9, 'card': -8,
         'alarm': -4, 'flash': -18, 'tick': -14, 'pop': -12, 'bot': -16, 'bots': -12, 'timer': -14, 'impact': -7, 'relief': -14, 'check': -12,
         'drop': -9, 'ping': -12, 'flare': -8, 'counter': -15, 'chart': -14, 'whoosh': -12, 'poweroff': -6, 'eyesoff': -12, 'stamp': -8, 'sit': -16, 'keypop': -8, 'chat': -15, 'branch': -8, 'chime': -11}   # hit peak vs median speech (dB); default -8
def rd(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels()).mean(1)
        assert w.getframerate() == SR, p
    return x
def hp(x, f=200): return sosfilt(butter(4, f / (SR / 2), 'high', output='sos'), x)
def band(x): return sosfilt(butter(4, [200 / (SR / 2), 6000 / (SR / 2)], 'band', output='sos'), x)
def win_rms(x, w=int(0.05 * SR)): k = len(x) // w; return np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1))
def put(buf, y, t):
    i = int(round(t * SR))
    if i < 0: y, i = y[-i:], 0
    if i < len(buf): buf[i:i + len(y)] += y[:len(buf) - i]
_cache = {}
def layer(f):
    if f not in _cache: _cache[f] = hp(rd(os.path.join(LIB, f)))
    return _cache[f]
def hit(kind):
    L = KIT[kind]; pre = -min(0, min(o for _, _, o in L)); n = max(len(layer(f)) + int((o + pre) * SR) for f, _, o in L)
    y = np.zeros(n)
    for f, g, o in L: x = layer(f); x = x / (np.abs(x).max() + 1e-9) * 10 ** (g / 20); put(y, x, o + pre)
    return y, pre
def build(cues, vo):
    N = len(vo); ve = win_rms(band(vo)); speech = ve > 0.1 * ve.max(); med = np.median(ve[speech]); out = np.zeros(N)
    for c in cues:
        y, pre = hit(c['kind']); yb = band(y); w = int(0.05 * SR)
        cs = np.cumsum(np.concatenate([[0], yb ** 2])); pk = np.sqrt(((cs[w:] - cs[:-w]) / w).max()) if len(yb) > w else np.sqrt(np.mean(yb ** 2)) + 1e-9
        y = y * med * 10 ** (LEVEL.get(c['kind'], -8) / 20) / pk
        tmp = np.zeros(N); put(tmp, y, c['t'] + FRAME - pre)
        se = win_rms(band(tmp)); m = speech[:len(se)] & (se > 0.01 * se.max())
        if m.any(): tmp *= min(1.0, (ve[:len(se)][m] * 10 ** (-5 / 20) / se[m]).min())
        if c['kind'] in TAIL:                                                        # r2: hard tail so a hit ends before the next word
            i0 = int(round((c['t'] + FRAME + TAIL[c['kind']]) * SR)); fd = int(0.1 * SR)
            if i0 < N: tmp[max(0, i0 - fd):i0] *= np.linspace(1, 0, min(fd, i0)); tmp[i0:] = 0
        out += tmp
    return word_duck(out, vo)
TAIL = {'chime': 0.38}
def words():
    import re
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'vo.js')).read()
    return [(w['s'], w['e']) for w in json.loads(re.search(r'VO_WORDS = (\[.*?\]);', src, re.S).group(1))]
def hb(x): return sosfilt(butter(4, [2000 / (SR / 2), 8000 / (SR / 2)], 'band', output='sos'), x)
def word_duck(out, vo, margin=-8.0):
    """r2: inside every spoken word, SFX 10 ms RMS in 2-8 kHz <= VO - 8 dB (verifier asks >= 6 dB)."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    w = int(0.01 * SR); k = len(out) // w
    se = np.sqrt((hb(out)[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-12; ve = np.sqrt((hb(vo)[:k * w].reshape(k, w) ** 2).mean(1))
    g = np.ones(k); tt = np.arange(k) * 0.01
    inw = np.zeros(k, bool)
    for a, b in words(): inw |= (tt + 0.01 > a - 0.01) & (tt < b + 0.01)
    g[inw] = np.minimum(1, ve[inw] * 10 ** (margin / 20) / se[inw])
    g = minimum_filter1d(g, 5); gs = uniform_filter1d(np.repeat(g, w), int(0.01 * SR))
    gs = np.minimum(gs, np.repeat(g, w)) if False else gs
    gs = np.pad(gs, (0, len(out) - len(gs)), constant_values=1)
    return out * gs
if __name__ == '__main__':
    vo = rd('vo/vo.wav'); cues = json.load(open('audio/cues.json'))
    N = max(len(vo), int((max(c['t'] for c in cues) + 2.5) * SR)); vo = np.pad(vo, (0, N - len(vo)))
    s = build(cues, vo)
    with wave.open('audio/sfx_raw.wav', 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(s, -1, 1) * 32767).astype('<i2').tobytes())
    print('audio/sfx_raw.wav', len(cues), 'cues')
