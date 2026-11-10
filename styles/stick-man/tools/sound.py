# sound.py: SFX + music + mix for a stick-man film. Method and numbers from styles/kai-reel-3d (SFX.md, LISTICLE.md step 7,
# listicle/audio/sfx.py word_duck, listicle/review/levels.py), copied here, not imported.
#   python styles/stick-man/tools/sound.py films/stick01-dye-pack
# reads  vo/vo.wav (48 kHz mono, timing untouched), vo/words.json, audio/cues.json [{t, name, strength 0..1}]
# writes audio/sfx.wav, audio/music.wav, audio/vo_m.wav, audio/mix.wav (48 kHz stereo, voice + 0.5 s), audio/levels.txt, audio/preview.m4a
# Targets (Kai-approved, reel63 v2): voice ~-14.6, SFX stem ~-21, music ~-28, mix -14 LUFS; each hit 4-8 dB under the voice around it;
# duck ONLY the 2-8 kHz consonant band (STFT 1-12 kHz bins) inside words, never full band; true peak <= -1 dBTP.
import json, os, re, shutil, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sound_dsp import SR, room, hp, bp, hb, lufs, true_peak, tp_limit, comp
from sound_bank import BANK, siren
from sound_music import music

FFMPEG = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or 'ffmpeg'   # $FFMPEG, else the ffmpeg on PATH
TAIL = 0.5
HIT_DB = -4.3                                              # loudest 150 ms of a hit vs the median voice around it (full band)
LEVEL = {'step_l': -5.0, 'step_r': -5.0, 'tick': -5.0, 'siren': -1.5, 'snore': -5.0, 'blip': -5.0, 'ping': -5.0, 'ting': -5.2}
HP = {'thud': 70, 'poof': 45, 'clunk': 90, 'step_l': 70, 'step_r': 70, 'snore': 70}     # high-pass per sound (default 150 Hz)
PAN = {'step_l': -0.2, 'step_r': 0.2, 'siren': -0.35, 'whoosh': 0.15, 'flutter': 0.2, 'ping': -0.1}
SFX_LU, MUS_LU, MIX_LU, TP_CEIL = -6.4, -13.4, -14.0, -1.6   # stems relative to the voice; master; limiter ceiling (dBTP)
ROOM_S, ROOM = 0.6, {'siren': 0.0, 'ding': 0.15, 'scratch': 0.12, 'sting': 0.2}   # a small room under every hit (wet)
MAKEUP_DB = 8.0
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


def main(film):
    A = os.path.join(film, 'audio'); os.makedirs(A, exist_ok=True)
    vo, sr = sf.read(os.path.join(film, 'vo/vo.wav'), always_2d=True); vo = vo.mean(1); assert sr == SR, sr
    words = json.load(open(os.path.join(film, 'vo/words.json'))); cues = json.load(open(os.path.join(A, 'cues.json')))
    N = len(vo) + int(TAIL * SR); vo = np.pad(comp(vo), (0, N - len(vo)))       # leveller only: no timing change
    # voice reference: 50 ms full-band RMS, speech = 200-6k band above 10 % of its max
    vfb = win_rms(vo); vbd = win_rms(bp(vo, 200, 6000, 4)); sp = vbd > 0.1 * vbd.max(); tw = (np.arange(len(vfb)) + 0.5) * 0.05
    def vmed(t, r=1.5):
        m = sp & (np.abs(tw - t) < r); return np.median(vfb[m]) if m.sum() >= 6 else np.median(vfb[sp])
    # ---------------- SFX: each hit set to HIT_DB (+ its strength) vs the voice around it
    rows = []
    for i, c in enumerate(cues):
        rng = np.random.default_rng(1000 + i); name = c['name']; t = float(c['t'])
        y = siren(rng, min(2.0, (N / SR) - t - 0.02)) if name == 'siren' else BANK[name](rng)
        y = hp(room(np.pad(y, (0, int(ROOM_S * SR))), rng, d=ROOM_S, wet=ROOM.get(name, 0.5)), HP.get(name, 150), 2)
        target = LEVEL.get(name, HIT_DB) + 10 * np.log10(max(float(c.get('strength', 1.0)), 0.05))
        ref = vmed(t + 0.1); y = y * ref * 10 ** (target / 20) / loudest150(y, 0, len(y))
        i0 = int(round(t * SR)); y = y[:N - i0]
        rows.append(dict(c, i0=i0, n=len(y), y=y, set_db=target, ref=ref, g=1.0))
    for r in rows:   # measuring window: the hit up to the next cue that starts later (at most 1 s), so a neighbour is not counted
        nxt = [q['i0'] for q in rows if q['i0'] > r['i0']]; r['m'] = min(r['n'], SR, (min(nxt) - r['i0']) if nxt else SR)
    # the consonant duck takes the 1-12 kHz part of any hit that sits on a word; re-level each hit until what is LEFT after the duck
    # (its loudest 150 ms, mostly in the gaps between words) sits at its target, at most +MAKEUP_DB over the isolated level
    def render(ch=None):
        x = np.zeros(N)
        for r in rows: x[r['i0']:r['i0'] + r['n']] += r['y'] * r['g'] * (1 if ch is None else min(1, 1 - ch * PAN.get(r['name'], 0.0)))
        return x
    pre_lu = lufs([render()] * 2)
    for it in range(4):
        sfx = word_duck(render(), vo, words)
        for r in rows:
            h = db(loudest150(sfx, r['i0'], r['i0'] + r['m']) / r['ref'])
            r['g'] = min(10 ** (MAKEUP_DB / 20), r['g'] * 10 ** ((r['set_db'] - h) / 20 * 0.8))
    # stereo: each side gets its own pan gain per hit, then its own consonant duck (so each channel passes the check by itself)
    sL, sR = word_duck(render(1), vo, words), word_duck(render(-1), vo, words)
    # ---------------- music, set relative to the voice
    mp = os.path.join(A, 'music.json')
    mL, mR, sec = music(words, N, plan=json.load(open(mp)) if os.path.exists(mp) else None)
    v_lu = lufs([vo, vo]); m_lu = lufs([mL, mR]); g_m = 10 ** ((v_lu + MUS_LU - m_lu) / 20); mL, mR = mL * g_m, mR * g_m
    s_lu = lufs([sfx, sfx]); print(f'sfx vs voice: {pre_lu - v_lu:+.1f} LU before the duck, {s_lu - v_lu:+.1f} after (target {SFX_LU})')
    # ---------------- master: gain to -14 LUFS through a true-peak limiter
    G = 10 ** ((MIX_LU - lufs([vo + mL + sL, vo + mR + sR])) / 20)
    for _ in range(6):
        L, R = tp_limit([(vo + mL + sL) * G, (vo + mR + sR) * G], TP_CEIL); I = lufs([L, R])
        if abs(I - MIX_LU) < 0.1: break
        G *= 10 ** ((MIX_LU - I) / 20)
    st = lambda a, b: np.stack([a, b], 1).astype(np.float32)
    sf.write(os.path.join(A, 'mix.wav'), st(L, R), SR, subtype='PCM_24')
    sf.write(os.path.join(A, 'sfx.wav'), st(sL * G, sR * G), SR, subtype='PCM_24')
    sf.write(os.path.join(A, 'music.wav'), st(mL * G, mR * G), SR, subtype='PCM_24')
    sf.write(os.path.join(A, 'vo_m.wav'), st(vo * G, vo * G), SR, subtype='PCM_24')
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', os.path.join(A, 'mix.wav'), '-c:a', 'aac', '-b:a', '160k', os.path.join(A, 'preview.m4a')], check=True)
    # ---------------- levels.txt
    lv = {k: ff(os.path.join(A, f'{k}.wav')) for k in ('vo_m', 'sfx', 'music', 'mix')}
    tp_pre = ff(os.path.join(A, 'preview.m4a'))[1]
    hot = sorted(set(words_hot(vo * G, sL * G, words)) | set(words_hot(vo * G, sR * G, words)))
    ok = lambda b: 'PASS' if b else 'FAIL'
    out = [f'# levels for {film}  (ffmpeg ebur128; stems as they sit in the mix; {N / SR:.3f} s, {len(cues)} cues)',
           f'voice      {lv["vo_m"][0]:6.1f} LUFS   target ~-14.6',
           f'sfx stem   {lv["sfx"][0]:6.1f} LUFS   target -21 +-2   {ok(abs(lv["sfx"][0] + 21) <= 2)}',
           f'music stem {lv["music"][0]:6.1f} LUFS   target -28 +-2   {ok(abs(lv["music"][0] + 28) <= 2)}',
           f'mix        {lv["mix"][0]:6.1f} LUFS   target -14 +-0.5 {ok(abs(lv["mix"][0] + 14) <= 0.5)}',
           f'true peak  {lv["mix"][1]:6.1f} dBTP   mix.wav (preview.m4a {tp_pre:.1f})   target <= -1   {ok(lv["mix"][1] <= -1)}',
           f'words with SFX within 6 dB of the voice in 2-8 kHz: {len(hot)} {hot[:10]}   {ok(not hot)}',
           f'music sections: A 0-{sec["playful_end"]:.2f}, build {sec["build"]:.2f}-{sec["build_end"]:.2f}, stop {sec["wait"]:.2f} (Wait), B {sec["see"]:.2f}-{sec["urgent"]:.2f}, '
           f'urgent {sec["urgent"]:.2f}-{sec["so"]:.2f}, resolve {sec["so"]:.2f}-{sec["last"]:.2f} (last word)', '',
           '# per cue: loudest 150 ms of the hit (full band, up to the next cue, <= 1 s) vs the median voice within 1.5 s; set = isolated, stem = after the consonant duck',
           f'{"t":>7}  {"name":18} {"str":>4} {"set dB":>7} {"stem dB":>8}  band -8..-4']
    hs = []
    for r in rows:
        a, b = r['i0'], r['i0'] + r['m']
        h = db(loudest150(sfx, a, b) / r['ref']); hs.append(h)
        out.append(f'{r["t"]:7.2f}  {r["name"]:18} {r.get("strength", 1):4.2f} {r["set_db"]:7.1f} {h:8.1f}  {"in" if -8 <= h <= -4 else "OUT"}')
    hs = np.array(hs); out.append(f'hits: median {np.median(hs):.1f} dB, in -8..-4: {((hs >= -8) & (hs <= -4)).sum()}/{len(hs)}')
    open(os.path.join(A, 'levels.txt'), 'w').write('\n'.join(out) + '\n'); print('\n'.join(out))


if __name__ == '__main__':
    main(sys.argv[1].rstrip('/'))
