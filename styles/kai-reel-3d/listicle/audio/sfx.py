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
  # reel63 PIT STOP kinds (library set; SFX_SET=earshot swaps them for the earshot-forged set below)
  'lamp':     [['ui/px-click-soft.wav', 0, 0], ['ui/timer-tick.wav', -8, 0]],
  'click':    [['ui/px-click-soft.wav', 0, 0]],
  'title':    [['ui/px-pop.wav', -2, 0]],
  'wipe':     [['whoosh/px-whoosh.wav', 0, 0]],
  'tumble':   [['clawd/toy-land.wav', 0, 0], ['foley/enter-clack.wav', -8, 0]],
  'ratchet':  [['foley/enter-clack.wav', 0, 0], ['foley/px-key-press.wav', -6, 0.04]],
  'rev':      [['foley/power-down.wav', -4, 0], ['whoosh/px-whoosh.wav', -6, 0]],
  'swat':     [['whoosh/px-whoosh-short.wav', 0, 0]],
  'cheer':    [['ui/px-sparkle.wav', 0, 0], ['ui/px-chime.wav', -6, 0.05]],
  'whistle':  [['ui/px-notification.wav', 0, 0]],
  'spring':   [['ui/px-pop.wav', 0, 0]],
  'needle':   [['ui/timer-tick.wav', 0, 0], ['ui/px-error.wav', -6, 0.05]],
  'sputter':  [['ui/px-glitch-1.wav', 0, 0], ['foley/power-down.wav', -6, 0]],
  'clunk':    [['foley/enter-clack.wav', 0, 0], ['impact/low-boom.wav', -10, 0]],
  'coins':    [['ui/counter-roll.wav', 0, 0], ['ui/px-sparkle.wav', -8, 0.1]],
  'glow':     [['ui/px-sparkle.wav', 0, 0]],
  'paper':    [['foley/cloth-stand.wav', 0, 0]],
  'flutter':  [['whoosh/px-whoosh-short.wav', -2, 0], ['foley/cloth-stand.wav', -6, 0]],
  'shimmer':  [['ui/px-sparkle.wav', 0, 0]],
  'clank':    [['foley/enter-clack.wav', 0, 0], ['clawd/toy-land.wav', -6, 0]],
  'launch':   [['whoosh/px-whoosh.wav', 0, 0], ['impact/low-boom.wav', -4, 0]],
  'flag':     [['foley/cloth-stand.wav', 0, 0]],
  'hookhit':  [['impact/low-boom.wav', 0, 0], ['whoosh/px-whoosh-short.wav', -4, 0]],
}
LEVEL = {'toggle': -13, 'land_big': -10, 'tap': -21, 'poof_ui': -16, 'snap': -14, 'slump': -14, 'rm': -12, 'prompt': -9, 'card': -8,
         'alarm': -4, 'flash': -18, 'tick': -14, 'pop': -12, 'bot': -16, 'bots': -12, 'timer': -14, 'impact': -7, 'relief': -14, 'check': -12,
         'drop': -9, 'ping': -12, 'flare': -8, 'counter': -15, 'chart': -14, 'whoosh': -12, 'poweroff': -6, 'eyesoff': -12, 'stamp': -8, 'sit': -16, 'keypop': -8, 'chat': -15, 'branch': -8, 'chime': -11}   # hit peak vs median speech (dB); default -8

# reel63 A/B test (Kai 2026-10-17): SFX_SET=earshot → every reel63 kind (and the shared ones it uses) comes from sounds forged in code by
# earshot (github.com/Leonxlnx/earshot, MIT) in audio/earshot/<recipe>/<recipe>_0N.wav. Not in the skill yet: Kai decides after the reel.
E = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'earshot')
e_ = lambda r, n=1: os.path.join(E, r, f'{r}_0{n}.wav')
KIT_E = {
  'impact': [[e_('impact'), 0, 0], [e_('click', 3), -8, 0]], 'land': [[e_('popin', 2), 0, 0], [e_('impact', 2), -10, 0]],
  'lamp': [[e_('click', 2), 0, 0], [e_('toggle', 3), -6, 0]], 'click': [[e_('click'), 0, 0]], 'whoosh': [[e_('whoosh'), 0, 0]],
  'title': [[e_('popin'), 0, 0]], 'wipe': [[e_('whoosh', 2), 0, 0], [e_('swish'), -6, 0.02]], 'tumble': [[e_('impact', 3), -2, 0], [e_('swish', 3), -6, -0.05]],
  'ratchet': [[e_('toggle'), 0, 0], [e_('click', 3), -4, 0.05]], 'pop': [[e_('pop'), 0, 0]], 'rev': [[e_('riser'), 0, 0]],
  'swat': [[e_('swish'), 0, 0]], 'cheer': [[e_('sting'), 0, 0], [e_('shimmer', 2), -8, 0]], 'whistle': [[e_('zip'), 0, 0]],
  'spring': [[e_('zip', 2), 0, 0]], 'needle': [[e_('zip', 3), 0, 0], [e_('click'), -6, 0]], 'sputter': [[e_('glitch'), 0, 0]],
  'clunk': [[e_('impact', 2), 0, 0], [e_('toggle', 2), -4, 0]], 'coins': [[e_('shimmer'), 0, 0], [e_('pop', 2), -6, 0.05]],
  'glow': [[e_('shimmer', 2), 0, 0]], 'paper': [[e_('swish', 2), 0, 0]], 'flutter': [[e_('swish', 3), 0, 0]], 'shimmer': [[e_('shimmer'), 0, 0]],
  'drop': [[e_('subdrop'), 0, 0]], 'toggle': [[e_('toggle'), 0, 0]], 'clank': [[e_('impact', 2), 0, 0], [e_('click', 2), -4, 0]],
  'launch': [[e_('subdrop'), 0, 0], [e_('whoosh', 3), -2, 0]], 'hookhit': [[e_('impact'), 0, 0], [e_('whoosh'), -4, 0]], 'flag': [[e_('swish', 2), 0, 0]], 'card': [[e_('sting', 2), 0, 0]],
}
if os.environ.get('SFX_SET') == 'earshot': KIT.update(KIT_E)
LEVEL.update({'lamp': -14, 'click': -14, 'title': -16, 'wipe': -12, 'tumble': -12, 'ratchet': -13, 'rev': -10, 'swat': -13, 'cheer': -11,
  'whistle': -11, 'spring': -13, 'needle': -13, 'sputter': -11, 'clunk': -10, 'coins': -12, 'glow': -14, 'paper': -15, 'flutter': -15,
  'shimmer': -14, 'clank': -11, 'launch': -6, 'flag': -16, 'land': -12, 'hookhit': -4, 'impact': -11, 'tumble': -15})   # r2 #42: impact/tumble bodies -4 dB
GAIN_DB = float(os.environ.get('SFX_GAIN_DB', 0))   # v2 stem trim (dB), set in score.py
HIT_DB = (-99, -6.5)   # v2: each hit (first 150 ms, full band) vs median speech before the −2.5 dB voice bus = 4–8 dB under the final voice
TAIL_63 = {'hookhit': 0.42, 'impact': 0.6, 'drop': 1.2, 'rev': 1.0, 'cheer': 0.9, 'coins': 0.9, 'glow': 0.8, 'shimmer': 0.8, 'launch': 1.6, 'card': 1.2}
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
    if kind in ('drop', 'sputter'): fi = int(0.02 * SR); y[:fi] *= np.linspace(0, 1, fi)   # v2: the sub-drop / sputter onset click sat in a word gap (gate 'stops', 'runs')
    return y, pre
def build(cues, vo):
    N = len(vo); ve = win_rms(band(vo)); speech = ve > 0.1 * ve.max(); med = np.median(ve[speech]); out = np.zeros(N); hook_ = np.zeros(N)
    vmed_fb = np.median(win_rms(vo)[speech[:len(win_rms(vo))]])   # v2: median speech level, full band, 50 ms windows
    for c in cues:
        y, pre = hit(c['kind']); yb = band(y); w = int(0.05 * SR)
        cs = np.cumsum(np.concatenate([[0], yb ** 2])); pk = np.sqrt(((cs[w:] - cs[:-w]) / w).max()) if len(yb) > w else np.sqrt(np.mean(yb ** 2)) + 1e-9
        y = y * med * 10 ** (LEVEL.get(c['kind'], -8) / 20) / pk
        tmp = np.zeros(N); put(tmp, y, c['t'] + FRAME - pre)
        se = win_rms(band(tmp)); m = speech[:len(se)] & (se > 0.01 * se.max())
        # v2 (Kai 2026-10-17 "SFX chìm"): the v1 per-hit full-band dim (hit ≤ speech − 5 dB) is gone. Instead each hit's first 150 ms
        # (full band) is held inside HIT_DB of the median speech level; score.py's voice bus −2.5 dB then puts it 4–8 dB under the voice.
        i0 = int(round((c['t'] + FRAME) * SR)); hr = np.sqrt(np.mean(tmp[i0:i0 + int(0.15 * SR)] ** 2)) + 1e-12
        rel = 20 * np.log10(hr / vmed_fb); tmp *= 10 ** ((np.clip(rel, *HIT_DB) - rel) / 20)
        if c['kind'] in TAIL:                                                        # r2: hard tail so a hit ends before the next word
            i0 = int(round((c['t'] + FRAME + TAIL[c['kind']]) * SR)); fd = int(0.1 * SR)
            if i0 < N: tmp[max(0, i0 - fd):i0] *= np.linspace(1, 0, min(fd, i0)); tmp[i0:] = 0
        if c['kind'] == 'hookhit': hook_ += tmp; continue   # reel63 final #48: frame-0 hit skips the full-band duck (only the 2–8 kHz consonant duck)
        out += tmp
    out = (out + sosfilt(butter(4, 1500 / (SR / 2), 'low', output='sos'), hook_)) * 10 ** (GAIN_DB / 20)   # f0 hook hit: low band only (< 1.5 kHz), hard tail
    return word_duck(out, vo)   # v2: duck ONLY the 2–8 kHz band inside words (v1's full-band duck buried every hit)
TAIL = {'chime': 0.38, **TAIL_63}
def words():
    import re
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'vo.js')).read()
    return [(w['s'], w['e']) for w in json.loads(re.search(r'VO_WORDS = (\[.*?\]);', src, re.S).group(1))]
def hb(x): return sosfilt(butter(4, [2000 / (SR / 2), 8000 / (SR / 2)], 'band', output='sos'), x)
def word_duck(out, vo, margin=-9.5, band=None):   # v2: LISTICLE step 7 margin −6 dB on the FINAL mix = −9.5 here (voice bus −2.5 + 1 dB slack), 2–8 kHz only
    """r2: inside every spoken word, SFX 10 ms RMS in 2-8 kHz <= VO - 8 dB (verifier asks >= 6 dB)."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    w = int(0.01 * SR); k = len(out) // w
    B_ = band or hb
    se = np.sqrt((B_(out)[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-12; ve = np.sqrt((B_(vo)[:k * w].reshape(k, w) ** 2).mean(1))
    g = np.ones(k); tt = np.arange(k) * 0.01
    inw = np.zeros(k, bool)
    for a, b in words(): inw |= (tt + 0.01 > a - 0.01) & (tt < b + 0.01)
    g[inw] = np.minimum(1, ve[inw] * 10 ** (margin / 20) / se[inw])
    g = minimum_filter1d(g, 5); gs = uniform_filter1d(np.repeat(g, w), int(0.01 * SR))
    gs = np.minimum(gs, np.repeat(g, w)) if False else gs
    gs = np.pad(gs, (0, len(out) - len(gs)), constant_values=1)
    # v2: apply the gain ONLY to the 1–12 kHz bins (STFT, 5 ms frames: a 21 ms frame let transients leak into the words): the bodies and low thumps of every hit stay whole
    from scipy.signal import stft, istft
    f, tt_, Z = stft(out, SR, nperseg=256, noverlap=192); gt = np.interp(tt_, np.arange(len(gs)) / SR, gs)
    m = (f >= 1000) & (f <= 12000); Z[m, :] *= gt[None, :]   # 1–12 kHz: the order-4 2–8 kHz meter still hears a hit body down to ~1 kHz
    y = istft(Z, SR, nperseg=256, noverlap=192)[1][:len(out)]; y = np.pad(y, (0, len(out) - len(y)))
    # pass 2 (gate.py meter = order-4 2–8 kHz, 10 ms): a loud hit body below 1 kHz still leaks into that meter in the quiet gaps of a
    # word. Only in the 10 ms windows that still fail, duck the 300–1000 Hz bins too; the sub-300 Hz thump of every hit stays whole.
    for it in range(3):   # last pass: the few 10 ms windows still over (a click onset in a voice gap) are ducked in every bin
        s2 = np.sqrt((B_(y)[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-12; g2 = np.ones(k)
        g2[inw] = np.minimum(1, ve[inw] * 10 ** (margin / 20) / s2[inw])
        if g2.min() > 0.98: break
        g2 = minimum_filter1d(g2, 3); f, tt_, Z = stft(y, SR, nperseg=256, noverlap=192)
        gt = np.interp(tt_, (np.arange(k) + 0.5) * 0.01, g2); m = (f >= (0 if it == 2 else 300)) & (f <= 12000); Z[m, :] *= gt[None, :]
        y = istft(Z, SR, nperseg=256, noverlap=192)[1][:len(out)]; y = np.pad(y, (0, len(out) - len(y)))
    return y
if __name__ == '__main__':
    vo = rd('vo/vo.wav'); cues = json.load(open('audio/cues.json'))
    N = max(len(vo), int((max(c['t'] for c in cues) + 2.5) * SR)); vo = np.pad(vo, (0, N - len(vo)))
    s = build(cues, vo)
    with wave.open('audio/sfx_raw.wav', 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(s, -1, 1) * 32767).astype('<i2').tobytes())
    print('audio/sfx_raw.wav', len(cues), 'cues')
