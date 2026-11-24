# mix.py: the stick-man kit mixer. Voice + recorded sound effects (sound_lib.py) + beds + music, mastered to -14 LUFS. Method and
# targets from hm-ep01 round 4: voice ride, word duck 2-8 kHz, word guard, hero transients kept, peak caps, true peak <= -1.6 dBTP.
#   python styles/stick-man/tools/run/mix.py <film> [--music <track> | --music-stem <wav>] [--music-plan <json>] [--out <dir>] [--name mix] [--mux <video> <out.mp4>]
# reads  vo/vo.wav, vo/words.json, audio/cues.json [{t, name, strength, dur?, len?, gain?, pan?, lock?, keep?, seed?}]
#        (keep: true holds a locked hero hit's transient over any word, not only one naming it),
#        audio/ambience.json {amb: [[[a, z], kind, dB, what]], dips: [[a, z, dB]]} (optional), audio/sound-plan.json silences (optional),
#        audio/music.json (optional): mus_lu, amb_lu, duck_db, contour, climb, vo_ride, protect, length, arc, sections [[name, a, z]],
#        peak (a section name: the film's loudest moment), track {file, segments: [{src: [a, b], at, file?, gain?}], xfade},
#        floor (opt-in, dBFS: where the whole mix would fall under it the beds come up, up to floor_max dB, default 14)
#        (--music-plan <json> reads that file in place of audio/music.json; sound_fit.py writes one)
# music, the first that applies: --music <track> | music.json track | --music-stem <wav> (placed as it is) | none
# writes <out>/<name>.wav, <out>/stems/{vo_m,sfx,music,amb}.wav, <out>/levels.txt; with --mux an mp4 (AAC 256k, true peak <= -1 dBTP)
import argparse, json, os, shutil, subprocess, sys
import numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d, minimum_filter1d

TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from sound_dsp import SR, lp, hp, bp, room, lufs, tp_limit, comp, kw
import sound
from sound import word_duck, words_hot, loudest150, ff, win_rms, db, HIT_DB, ROOM_S
from sound_lib import lookup, BEDS, SYNTH, bed

PIXI_FF = os.path.join(TOOLS, '..', '..', '..', '..', '.pixi', 'envs', 'default', 'bin', 'ffmpeg')
sound.FFMPEG = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or PIXI_FF
MIX_LU, TP_CEIL, GUARD, MP4_TP = -14.0, -1.6, 7.5, -1.0
SFX_DB = 3.0
SMALL = {'step_l', 'step_r', 'step_wet', 'slide', 'ting', 'rustle', 'ping', 'beep', 'lamp', 'drip', 'zip', 'creak'}; SMALL_DB = 3.0
DEFAULTS = dict(mus_lu=-8.5, amb_lu=-11.5, duck_db=-5.0, contour=[], climb=[], vo_ride=[], protect=[])

# synthesised blips (sound_lib.SYNTH): level vs the voice, room, high-pass
LEVEL = {**sound.LEVEL, 'note': -3.0, 'stab': -3.0}
ROOM = {**sound.ROOM, 'stab': 0.1, 'note': 0.35}
HP = {**sound.HP, 'stab': 25, 'note': 40}
# recorded sounds: level vs HIT_DB, room, high-pass, which are hero hits
REC_LEVEL = {'gunshot': 2.0, 'gunshot_close': 2.0, 'gunshot_slowmo': 1.0, 'crash': 0.5, 'glass_smash': 0.5, 'crash_metal': 1.0, 'slam': -1.0,
             'trunk_slam': -1.0, 'impact': 0.0, 'impact_metal': 0.0, 'siren': -7.0, 'siren_long': -7.0, 'siren_rise': -6.0,
             'siren_far': -7.0, 'engine_rev': -5.0, 'engine_roar': -5.0, 'tyre_screech': -4.0, 'screech': -4.0, 'skid': -4.0, 'car_by': -2.0, 'knock': -3.0,
             'radio': -4.0, 'bullet_slowmo': -1.0, 'engine_idle': -8.0, 'engine_far': -6.0, 'street_bed': -10.0, 'steam_hiss': -8.0, 'tyres_wet': -6.0,
             'scrape_metal': -1.0, 'brake_squeal': -3.0, 'siren_stop': -5.0, 'engine_down': -5.0, 'slowmo': -2.0, 'tick': -2.0, 'gun_cock': -2.0, 'flashlight': -3.0, 'engine_int': -6.0}
HERO = {'gunshot', 'gunshot_close', 'gunshot_slowmo', 'crash', 'glass_smash', 'crash_metal', 'slam', 'trunk_slam', 'impact', 'impact_metal', 'car_by'}
STOP = {'the', 'a', 'an', 'of', 'to', 'and'}    # words that never name a hit nor cancel its keep
BIG = ('gunshot', 'gunshot_close', 'slam', 'trunk_slam', 'crash', 'glass_smash', 'impact', 'impact_metal', 'crash_metal')
PEAK_CAP = (2.0, 4.0)          # a recorded cue's sample peak <= the voice's loud peaks around it + 2 dB (+4 dB for a hero hit): a transient
                               # set by its 150 ms loudness must not drive the master limiter
REC_ROOM = {'knock': 0.3, 'radio': 0.1, 'shout': 0.0, 'slam_far': 0.6}          # recorded sounds carry their own space: a light room only
REC_HP = {'gunshot': 25, 'gunshot_close': 25, 'gunshot_slowmo': 20, 'crash': 30, 'glass_smash': 30, 'crash_metal': 25, 'slam': 30, 'trunk_slam': 30,
          'impact': 35, 'impact_metal': 35, 'bag_thump': 35, 'trunk': 35, 'bag_drop': 35, 'thud': 35, 'thump': 25, 'boom': 22, 'car_by': 30,
          'engine': 30, 'engine_rev': 30, 'engine_roar': 30, 'engine_int': 30, 'bullet_slowmo': 25, 'slowmo': 25, 'hit': 25, 'car_door': 40,
          'siren': 150, 'siren_long': 150, 'siren_rise': 150, 'siren_far': 150, 'step_wet': 60, 'step_l': 60, 'step_r': 60}


def J(p, d=None): return json.load(open(p)) if os.path.exists(p) else d


def envdb(n, pts):
    if not pts: return np.ones(n)
    t, d = zip(*pts); return 10 ** (np.interp(np.arange(n) / SR, t, d) / 20)


def lowsplit(x, g, fc=180):
    """apply gain g only above fc: the weight of a hit stays, its speech-band part gets out of the way"""
    lo = lp(x, fc, 4); return lo + (x - lo) * g


def decode(path):
    """any audio file -> (n, 2) float at 48 kHz, through ffmpeg"""
    r = subprocess.run([sound.FFMPEG, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).reshape(-1, 2).astype(np.float64)


def fit(y, n):
    return np.pad(y, ((0, max(0, n - len(y))), (0, 0)))[:n]


def segments(ys, T, n):
    """cut tracks into segments placed at film times; a segment's inner edges (not the film's first start or last end) get
    equal-power ramps of xfade s, so a segment placed xfade s before the previous one ends crossfades into it"""
    segs = T['segments']; out = np.zeros((n, 2)); x = int(T.get('xfade', 0.5) * SR); e = int(0.012 * SR)
    for i, s in enumerate(segs):
        a, b = s['src']; y = ys[s.get('file', T['file'])]; seg = y[int(a * SR):int(b * SR)] * 10 ** (s.get('gain', 0.0) / 20); k = len(seg)
        u_in = int(min(x if i else e, k // 2)); u_out = int(min(x if i < len(segs) - 1 else e, k // 2))
        seg[:u_in] *= np.sin(np.linspace(0, np.pi / 2, u_in))[:, None]; seg[k - u_out:] *= np.cos(np.linspace(0, np.pi / 2, u_out))[:, None]
        i0 = int(s['at'] * SR); m = max(0, min(k, n - i0)); out[i0:i0 + m] += seg[:m]
    return out


def music_source(film, M, args, n):
    """(label, (n, 2) music, frozen): a frozen stem is a finished mix stem and skips every envelope, duck and guard"""
    if args.music: return f'track {args.music} (--music)', fit(decode(args.music), n), False
    if M.get('track'):
        T = M['track']; ys = {f: decode(os.path.join(film, f)) for f in {s.get('file', T['file']) for s in T['segments']}}
        return f'track {" + ".join(sorted(ys))}, {len(T["segments"])} segments ({args.music_plan or "music.json"})', segments(ys, T, n), False
    if args.music_stem: return f'stem {args.music_stem} placed as it is (--music-stem)', fit(decode(args.music_stem), n), True
    return 'none', np.zeros((n, 2)), True


def ambience(n, AM, missing):
    rng = np.random.default_rng(11); out = np.zeros(n); wide = np.zeros(n); x = int(0.06 * SR)   # place changes are hard cuts: 60 ms edges
    for (a, z), kind, gdb, _ in AM['amb']:
        i0, i1 = int(a * SR), min(n, int(z * SR))
        if i1 - i0 < 2 * x: continue
        if kind not in BEDS: missing.add(kind); continue
        sL_, sR_ = bed(kind, i1 - i0, rng); seg = (sL_ + sR_) / 2; side = (sL_ - sR_) / 2
        m = np.ones(len(seg)); m[:x] = np.linspace(0, 1, x); m[-x:] = np.linspace(1, 0, x)
        out[i0:i1] += seg * m * 10 ** (gdb / 20); wide[i0:i1] += side * m * 10 ** (gdb / 20)
    for a, z, d in AM.get('dips', []):                                   # a dip and back; d <= -40 is a fade-out that stays out
        r = min(0.03, (z - a) / 3)
        e_ = envdb(n, [(0, 0), (a, 0), (a + r, d), (z - r, d), (z, 0)] if d > -40 else [(0, 0), (a, 0), (z, d)]); out *= e_; wide *= e_
    return out, wide


def loud_curve(L, R, w):
    """ungated K-weighted loudness over a sliding window w s (3 s = EBU short-term, 0.4 s = momentary), 0.1 s hop; t = window end"""
    z = kw(L) ** 2 + kw(R) ** 2; cs = np.concatenate([[0], np.cumsum(z)]); n = int(w * SR)
    ends = np.arange(n, len(z) + 1, SR // 10); return ends / SR, -0.691 + 10 * np.log10((cs[ends] - cs[ends - n]) / n + 1e-20)


def contour_report(L, R, gr, M, length):
    ts_, st = loud_curve(L, R, 3.0); tm, mo = loud_curve(L, R, 0.4); ok = lambda b: 'PASS' if b else 'FAIL'
    out = ['loudness contour (ungated K-weighted; short-term = 3 s window, momentary = 0.4 s, read at the window end)']
    row = {}; SEC = M.get('sections', [])
    if SEC:
        out += ['per section only windows wholly inside it; sections under 3.5 s use momentary values, marked *',
                f'{"section":28} {"t":>11}  {"ST mean":>7} {"ST max":>6} {"M max":>6}  limiter (max gain reduction)']
    for name, a, z in SEC:
        mm = (tm >= a + 0.4) & (tm <= z)
        m = (ts_ >= a + 3.0) & (ts_ <= z) if z - a >= 3.5 else None
        if not mm.any(): continue
        row[name] = (st[m].mean(), st[m].max(), mo[mm].max()) if m is not None and m.any() else (mo[mm].mean(), mo[mm].max(), mo[mm].max())
        out.append(f'{name + (" *" if m is None else ""):28} {a:5.2f}-{z:5.2f}  {row[name][0]:7.1f} {row[name][1]:6.1f} {row[name][2]:6.1f}  {gr(a, z):5.1f} dB')
    out.append(f'short-term max of the film {st.max():.1f} LUFS at {ts_[st.argmax()]:.1f} s; momentary max {mo.max():.1f} at {tm[mo.argmax()]:.1f} s')
    if M.get('peak') in row:
        _, a0, z0 = next(s for s in SEC if s[0] == M['peak']); top = row[M['peak']]
        out_ = (ts_ < a0) | (ts_ - 3.0 > z0); mo_out = mo[(tm < a0) | (tm - 0.4 > z0)].max(); rest = st[out_].max(); rest_t = ts_[out_][st[out_].argmax()]
        out += [f'{M["peak"]} short-term max {top[1]:.1f} vs the loudest 3 s window outside it {rest:.1f} (ends {rest_t:.1f} s): {top[1] - rest:+.1f} LU   target >= +3   {ok(top[1] - rest >= 3)}',
                f'{M["peak"]} momentary max {top[2]:.1f} vs the loudest 0.4 s window outside it {mo_out:.1f}: {top[2] - mo_out:+.1f} LU',
                f'limiter over {M["peak"]} {a0:.2f}-{z0:.2f}: max {gr(a0, z0):.1f} dB']
    out.append('short-term curve, max per 2 s (LUFS):')
    for a in range(0, int(length), 10):
        out.append('  ' + '  '.join(f'{b:4.0f}s {st[(ts_ > b) & (ts_ <= b + 2)].max():5.1f}' for b in range(a, min(a + 10, int(length) + 1), 2) if ((ts_ > b) & (ts_ <= b + 2)).any()))
    return out


def prepare(film, args):
    """everything before the master: the voice, the SFX, music and beds, levelled, ducked and guarded"""
    A = os.path.join(film, 'audio'); need = [p for p in ('vo/vo.wav', 'vo/words.json') if not os.path.exists(os.path.join(film, p))]
    if need: sys.exit(f'mix.py: {film} has no {" and no ".join(need)}; the mixer levels and ducks everything against the voice and its words')
    vo, sr = sf.read(os.path.join(film, 'vo/vo.wav'), always_2d=True); vo = vo.mean(1); assert sr == SR
    words = J(os.path.join(film, 'vo/words.json'))
    cues = J(os.path.join(A, 'cues.json'), []); AM = J(os.path.join(A, 'ambience.json')); M = {**DEFAULTS, **J(args.music_plan or os.path.join(A, 'music.json'), {})}
    length = float(M.get('length', len(vo) / SR)); N = int(round(length * SR))
    n20 = int(0.02 * SR)                                                 # ducking copy: trim each word span to its voiced 20 ms frames
    for wd in words:
        a_, z_ = int(wd['t0'] * SR), int(wd['t1'] * SR); k_ = (z_ - a_) // n20
        if k_ < 2: continue
        on = np.nonzero(np.sqrt((vo[a_:a_ + k_ * n20].reshape(k_, n20) ** 2).mean(1)) > 1e-4)[0]
        if len(on): wd['t0'], wd['t1'] = float(max(wd['t0'], wd['t0'] + on[0] * 0.02)), float(min(wd['t1'], wd['t0'] + (on[-1] + 1) * 0.02 + 0.04))
    vo = np.pad(comp(vo), (0, max(0, N - len(vo))))[:N]
    vo = vo * envdb(N, M['vo_ride'])
    vfb = win_rms(vo); vbd = win_rms(bp(vo, 200, 6000, 4)); sp = vbd > 0.1 * vbd.max(); tw = (np.arange(len(vfb)) + 0.5) * 0.05
    vpw = np.abs(vo[:len(vo) // 2400 * 2400]).reshape(-1, 2400).max(1); spk = vpw > 0.1 * vpw.max(); tpk = (np.arange(len(vpw)) + 0.5) * 0.05
    def vpk(t, r=1.5):                                                   # the voice's loud peaks (90th pct of 50 ms peaks) around t
        m = spk & (np.abs(tpk - t) < r); return np.percentile(vpw[m], 90) if m.sum() >= 6 else np.percentile(vpw[spk], 90)
    def vmed(t, r=1.5):
        m = sp & (np.abs(tw - t) < r); return np.median(vfb[m]) if m.sum() >= 6 else np.median(vfb[sp])
    # ---- SFX; kit rule for the level: loudest 150 ms at HIT_DB + 10 log10(strength) vs the voice around it
    rows = []; synth = []; guessed = {}
    for i, c in enumerate(cues):
        rng = np.random.default_rng(c.get('seed', 1000 + i)); t = float(c['t']); s = lookup(c['name']); name = s.as_
        if s.how == 'guess': guessed[c['name']] = name
        y = s.fn(rng, c); rec = name not in SYNTH
        if rec:
            y = hp(room(np.pad(y, (0, int(0.3 * SR))), rng, d=0.3, wet=REC_ROOM.get(name, 0.06)), REC_HP.get(name, 50), 2)
            target = REC_LEVEL.get(name, HIT_DB)
        else:
            synth.append(name)
            y = hp(room(np.pad(y, (0, int(ROOM_S * SR))), rng, d=ROOM_S, wet=ROOM.get(name, 0.5)), HP.get(name, 150), 2)
            target = LEVEL.get(name, HIT_DB)
        target += 10 * np.log10(max(float(c['strength']), 0.02)) + SFX_DB + (SMALL_DB if name in SMALL else 0) + c.get('gain', 0.0)
        ref = vmed(t + 0.1); y = y * ref * 10 ** (target / 20) / (loudest150(y, 0, len(y)) + 1e-12)
        if rec:
            cap = vpk(t + 0.1) * 10 ** (PEAK_CAP[name in HERO] / 20); pk = np.abs(y).max()
            if pk > cap: y = y * cap / pk; target += db(cap / pk)
        if 'len' in c:
            n = int(c['len'] * SR); f8 = int(0.08 * SR); y = y[:n].copy(); y[-f8:] *= np.linspace(1, 0, f8)
        i0 = int(round(t * SR)); y = y[:max(0, N - i0)]; rows.append(dict(c, name=name, cue=c['name'], i0=i0, y=y, set_db=target, rec=rec))
    for k, v in guessed.items(): print(f'mix.py: WARNING cue name {k!r} is not in sound_lib.NAMES; guessed as {v!r}', file=sys.stderr)
    def render(ch):
        x = np.zeros(N)
        for r in rows: x[r['i0']:r['i0'] + len(r['y'])] += r['y'] * min(1, 1 - ch * r.get('pan', 0.0))
        return x
    con = envdb(N, M['contour'])
    sL, sR = word_duck(render(1) * con, vo, words), word_duck(render(-1) * con, vo, words)
    # ---- beds, set vs the voice, ducked (full band, smooth) under words
    missing = set(); v_lu = lufs([vo, vo])
    inw = np.zeros(N)
    for wd in words: inw[int(wd['t0'] * SR):int(wd['t1'] * SR)] = 1
    duck = 10 ** (M['duck_db'] * uniform_filter1d(inw, int(0.12 * SR)) / 20)
    am, aw = ambience(N, AM, missing) if AM else (np.zeros(N), np.zeros(N))
    if AM:
        ga = 10 ** ((v_lu + M['amb_lu'] - lufs([am + aw, am - aw])) / 20); am, aw = am * ga * con * duck, aw * ga * con * duck
        am, aw = word_duck(am, vo, words), word_duck(aw, vo, words)
    # ---- music: a track is levelled vs the voice and shaped like the score; a frozen stem's pre-master copy only feeds the guard
    label, mus, frozen = music_source(film, M, args, N); mL, mR = mus[:, 0], mus[:, 1]; stem = (mL, mR) if frozen else None
    if not frozen:
        g = 10 ** ((v_lu + M['mus_lu'] - lufs([mL, mR])) / 20); e = g * con * duck * envdb(N, M['climb']); mL, mR = mL * e, mR * e
    elif mus.any():
        G = 10 ** ((MIX_LU - lufs([vo + sL + am + aw, vo + sR + am - aw])) / 20)
        for _ in range(4): G *= 10 ** ((MIX_LU - lufs([(vo + sL + am + aw) * G + mL, (vo + sR + am - aw) * G + mR])) / 20)
        mL, mR = mL / G, mR / G
    pre = {r['name'] + '@' + str(r['t']): loudest150((sL + sR) / 2, r['i0'], r['i0'] + int(0.4 * SR)) for r in rows if r['name'] in BIG}
    # ---- word guard: any word whose voiced part sits under +7.5 dB vs the bed (200-6000 Hz) gets the bed dipped above 180 Hz
    shaped = lambda *x: x if frozen else x + (mL, mR)
    sL0, sR0 = sL.copy(), sR.copy()
    vb = bp(vo, 200, 6000, 4); w20 = int(0.02 * SR); k = len(vb) // w20
    ve = np.sqrt((vb[:k * w20].reshape(k, w20) ** 2).mean(1)); voiced = ve > ve.max() * 10 ** (-30 / 20)
    for _ in range(5):
        bd = bp((mL + mR) / 2 + am + (sL + sR) / 2, 200, 6000, 4); be = np.sqrt((bd[:k * w20].reshape(k, w20) ** 2).mean(1)) + 1e-9
        gdb = np.zeros(N); r = int(0.03 * SR)
        for wd in words:
            j = np.arange(int(wd['t0'] / 0.02), max(int(wd['t1'] / 0.02), int(wd['t0'] / 0.02) + 1)); j = j[j < k]; j = j[voiced[j]]
            if not len(j): continue
            short = db(np.sqrt((ve[j] ** 2).mean()) / np.sqrt((be[j] ** 2).mean())) - GUARD
            if short < 0:
                i0, i1 = int(wd['t0'] * SR), int(wd['t1'] * SR); gdb[i0:i1] = np.minimum(gdb[i0:i1], short - 0.5)
        if gdb.min() > -0.05: break
        gdb = uniform_filter1d(minimum_filter1d(gdb, 2 * r), r); gg = 10 ** (gdb / 20)
        am, aw, sL, sR, *mus_ = (lowsplit(x, gg) for x in shaped(am, aw, sL, sR))
        if mus_: mL, mR = mus_
    # a hero hit that lands on the word naming it ('smash', 'slam') keeps its first 70 ms (the transient) out of the guard: the word
    # duck (2-8 kHz) already cleared the consonants; the guard's broadband dip took 3-4 dB off the very transient. Over any other word
    # ('hit the car' under the gunshot) the guard wins, unless the cue sets "keep": true
    keep = np.zeros(N); r10 = int(0.01 * SR)
    def names_it(r_):
        a_, z_ = r_['i0'] / SR - 0.01, r_['i0'] / SR + 0.07; name = set(r_['name'].split('_')) | set(r_['cue'].lower().split('_'))
        said = {wd['word'].strip('.,?!"\'').lower() for wd in words if wd['t1'] > a_ and wd['t0'] < z_} - STOP - {''}
        return said <= name
    for r_ in rows:
        if r_['name'] in HERO and r_.get('lock') and (r_.get('keep') or names_it(r_)):
            a_, z_ = max(0, r_['i0'] - r10), min(N, r_['i0'] + int(0.07 * SR)); keep[a_:z_] = 1
    keep = uniform_filter1d(keep, r10); sL, sR = sL * (1 - keep) + sL0 * keep, sR * (1 - keep) + sR0 * keep
    for a, z, d in M['protect']:
        gp = envdb(N, [(0, 0), (a - 0.03, 0), (a, d), (z, d), (z + 0.03, 0)])
        am, aw, sL, sR, *mus_ = (lowsplit(x, gp) for x in shaped(am, aw, sL, sR))
        if mus_: mL, mR = mus_
    return dict(film=film, A=A, M=M, N=N, length=length, vo=vo, words=words, rows=rows, synth=synth, guessed=guessed, missing=missing,
                sL=sL, sR=sR, mL=mL, mR=mR, stem=stem, aL=am + aw, aR=am - aw, pre=pre, music=label, ambience='audio/ambience.json' if AM else 'none',
                silences=(J(os.path.join(A, 'sound-plan.json'), {}) or {}).get('silences', []))


def smooth_outside(up, keep):
    """a lift per 10 ms block, smoothed, that is 0 wherever keep is 0 and fades to 0 over the 0.1 s before it"""
    keep = minimum_filter1d(keep, 3)
    fade_in = np.clip(2 * uniform_filter1d(keep, 21) - 1, 0, 1)
    return uniform_filter1d(uniform_filter1d(up * keep, 12), 8) * fade_in


def fill_floor(S, floor, most=14.0):
    """opt-in sound floor (music.json "floor"): where the whole mix, at the master gain, would fall under `floor` dBFS
    (100 ms RMS, smoothed over 0.2 s) the music and the ambience come up by the difference, at most `most` dB, never inside a
    planned silence (sound-plan.json) and never in the last 0.6 s. A frozen music stem stays as it was given.
    Returns (seconds lifted, deepest lift in dB)."""
    N, hop = S['N'], SR // 100
    G = 10 ** ((MIX_LU - lufs([S['vo'] + S['mL'] + S['sL'] + S['aL'], S['vo'] + S['mR'] + S['sR'] + S['aR']])) / 20)
    L, R = summed(stems(S, G)); K = N // hop
    pw = uniform_filter1d(((L[:K * hop] ** 2 + R[:K * hop] ** 2) / 2).reshape(K, hop).mean(1), 20)
    up = np.clip(floor - 10 * np.log10(pw + 1e-12), 0, most)
    keep = np.ones(K)
    for x in S['silences']: keep[int(x['t'][0] * 100):int(x['t'][1] * 100) + 1] = 0
    keep[max(0, K - 60):] = 0
    up = smooth_outside(up, keep)
    g = 10 ** (np.interp(np.arange(N), np.arange(K) * hop + hop / 2, up) / 20)
    S['aL'], S['aR'] = S['aL'] * g, S['aR'] * g
    if not S['stem']: S['mL'], S['mR'] = S['mL'] * g, S['mR'] * g
    return float((up > 1).sum() / 100), float(up.max(initial=0))


def stems(S, G):
    """the stems at master gain G, as they sit in the mix before the limiter; a frozen music stem stays as it was given"""
    return dict(sfx=(S['sL'] * G, S['sR'] * G), music=S['stem'] or (S['mL'] * G, S['mR'] * G), amb=(S['aL'] * G, S['aR'] * G), vo_m=(S['vo'] * G, S['vo'] * G))


def summed(st): return [sum(v[c] for v in st.values()) for c in (0, 1)]


def master(S, ceil):
    """-14 LUFS through the kit's true-peak limiter at ceil dBTP; returns L, R, G"""
    G = 10 ** ((MIX_LU - lufs([S['vo'] + S['mL'] + S['sL'] + S['aL'], S['vo'] + S['mR'] + S['sR'] + S['aR']])) / 20)
    for _ in range(6):
        L, R = tp_limit(summed(stems(S, G)), ceil); I = lufs([L, R])
        if abs(I - MIX_LU) < 0.1: break
        G *= 10 ** ((MIX_LU - I) / 20)
    return L[:S['N']], R[:S['N']], G


def write(S, L, R, G, out, name):
    os.makedirs(os.path.join(out, 'stems'), exist_ok=True); N = S['N']
    paths = dict(mix=os.path.join(out, f'{name}.wav'), **{k: os.path.join(out, 'stems', f'{k}.wav') for k in ('sfx', 'music', 'amb', 'vo_m')})
    st = lambda a, b: np.stack([a[:N], b[:N]], 1).astype(np.float32)
    for k, (a, b) in dict(mix=(L, R), **stems(S, G)).items():
        sf.write(paths[k], st(a, b), SR, subtype='PCM_24')
    return paths


def video_seconds(path):
    probe = shutil.which('ffprobe', path=os.path.dirname(sound.FFMPEG)) or shutil.which('ffprobe') or 'ffprobe'
    r = subprocess.run([probe, '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration:format=duration', '-of', 'json', path],
                       capture_output=True, text=True, check=True)
    j = json.loads(r.stdout); return float(next((s['duration'] for s in j.get('streams', []) if 'duration' in s), j['format']['duration']))


def mux(video, wav, out):
    subprocess.run([sound.FFMPEG, '-y', '-v', 'error', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '256k', '-shortest', out], check=True)
    return ff(out)


def report(S, L, R, G, paths, ceil, mp4):
    N, M, rows, words = S['N'], S['M'], S['rows'], S['words']; st = stems(S, G); vo = st['vo_m'][0]
    (sL, sR), (mL, mR), (aL, aR) = st['sfx'], st['music'], st['amb']
    lv = {k: ff(p) if k == 'mix' or np.abs(st[k]).max() > 0 else (-np.inf, -np.inf) for k, p in paths.items()}   # ebur128 prints -inf for silence
    hot = sorted(set(words_hot(vo, sL, words)) | set(words_hot(vo, sR, words)))
    w20 = int(0.02 * SR); vb = bp(vo, 200, 6000, 4); k = len(vb) // w20
    bed_ = bp((mL + mR) / 2 + (aL + aR) / 2 + (sL + sR) / 2, 200, 6000, 4)
    ve = np.sqrt((vb[:k * w20].reshape(k, w20) ** 2).mean(1)); be = np.sqrt((bed_[:k * w20].reshape(k, w20) ** 2).mean(1)) + 1e-9
    voiced = ve > ve.max() * 10 ** (-30 / 20); snr = []
    for wd in words:
        j = np.arange(int(wd['t0'] / 0.02), max(int(wd['t1'] / 0.02), int(wd['t0'] / 0.02) + 1)); j = j[j < k]; j = j[voiced[j]]
        if len(j): snr.append((db(np.sqrt((ve[j] ** 2).mean()) / np.sqrt((be[j] ** 2).mean())), wd['line'], wd['word'], wd['t0']))
    s = np.array([x[0] for x in snr]); worst = sorted(snr)[:6]
    raw = np.maximum(*np.abs(summed(st))); lim = np.maximum(np.abs(L), np.abs(R))
    gr = lambda a, z: db((lim[int(a * SR):int(z * SR)].max() + 1e-12) / (raw[int(a * SR):int(z * SR)].max() + 1e-12))
    LR = (L + R) / 2; rms = lambda a, z: db(np.sqrt((LR[int(a * SR):int(z * SR)] ** 2).mean()))
    post = {r['name'] + '@' + str(r['t']): loudest150((S['sL'] + S['sR']) / 2, r['i0'], r['i0'] + int(0.4 * SR)) for r in rows if r['name'] in BIG}
    ok = lambda b: 'PASS' if b else 'FAIL'; nrec = sum(r['rec'] for r in rows)
    out = [f'# levels for {S["film"]} (kit mixer styles/stick-man/tools/run/mix.py; ffmpeg ebur128; stems as they sit in the mix; {N / SR:.3f} s = {N} samples at {SR} Hz, {len(rows)} cues)',
           f'voice: vo/vo.wav;  music: {S["music"]};  ambience: {S["ambience"]};  limiter ceiling {ceil:.2f} dBTP',
           f'recorded cues {nrec}/{len(rows)}; synthesised: {sorted(set(S["synth"]))};  guessed names (not in sound_lib.NAMES): {S["guessed"] or "none"};  beds missing: {sorted(S["missing"])}',
           f'voice      {lv["vo_m"][0]:6.1f} LUFS',
           f'sfx stem   {lv["sfx"][0]:6.1f} LUFS   kit target -21 +-2   {ok(abs(lv["sfx"][0] + 21) <= 2)}',
           f'music stem {lv["music"][0]:6.1f} LUFS   kit target -26 +-2   {ok(abs(lv["music"][0] + 26) <= 2)}',
           f'ambience   {lv["amb"][0]:6.1f} LUFS']
    if M.get('peak') in [x[0] for x in M.get('sections', [])]:
        _, a0, z0 = next(x for x in M['sections'] if x[0] == M['peak']); cut = np.ones(N, bool); cut[int(a0 * SR):int(z0 * SR)] = False
        out.append(f'  without {M["peak"]} {a0:.2f}-{z0:.2f}: sfx {lufs([x[cut] for x in (sL, sR)]):.1f}, music {lufs([x[cut] for x in (mL, mR)]):.1f} LUFS')
    out += [f'mix        {lv["mix"][0]:6.1f} LUFS   target -14 +-0.5 {ok(abs(lv["mix"][0] + 14) <= 0.5)}',
            f'true peak  {lv["mix"][1]:6.1f} dBTP   target <= -1   {ok(lv["mix"][1] <= -1)}']
    if mp4: out.append(f'mp4        {mp4["I"]:6.1f} LUFS, true peak {mp4["tp"]:.1f} dBTP (AAC 256k, measured on {mp4["path"]}, {mp4["tries"]} encode(s))   '
                       f'target -14 +-0.5, <= {MP4_TP:.1f}   {ok(mp4["tp"] <= MP4_TP and abs(mp4["I"] - MIX_LU) <= 0.5)}')
    out += [f'length     {N / SR:.3f} s   target {S["length"]:.3f}{" (music.json length)" if "length" in M else " (the voice)"}   {ok(abs(N / SR - S["length"]) < 0.001)}',
            f'words with SFX within 6 dB of the voice in 2-8 kHz: {len(hot)} {hot[:8]}   {ok(len(hot) <= 3)}',
            f'voice over everything else, 200-6000 Hz, voiced parts of each word: median {np.median(s):.1f} dB, 10th pct {np.percentile(s, 10):.1f} dB, '
            f'words under +6 dB: {(s < 6).sum()}/{len(s)}   {ok((s < 6).sum() <= 3)}',
            f'  worst words: {[(round(float(a), 1), l, w_, round(t, 2)) for a, l, w_, t in worst]}',
            'big hits, loudest 150 ms of the sfx stem before -> after the word guard (dB): ' + ', '.join(f'{k_} {db(S["pre"][k_] / post[k_]) * -1:+.1f}' for k_ in S['pre'])]
    if S['silences']: out.append('silences (mix RMS dBFS): ' + ', '.join(f'{x["t"][0]:.2f}-{x["t"][1]:.2f} {rms(*x["t"]):.1f}' for x in S['silences']))
    if M.get('arc') and np.abs(mL).max() > 0:
        mw = (mL + mR) / 2
        arc = [(x['state'], x['t'][0], db(np.sqrt((mw[int(x['t'][0] * SR):int(x['t'][1] * SR)] ** 2).mean()))) for x in M['arc'] if x['t'][1] - x['t'][0] > 0.05]
        out.append('music stem RMS per arc section (dBFS): ' + ', '.join(f'{st_} {a:.2f} {v:.1f}' for st_, a, v in arc if v > -60))
    out += [''] + contour_report(L, R, gr, M, S['length']) + ['', f'{"t":>7} {"frame":>5}  {"name":15} {"str":>4} {"set dB vs voice":>15}  src   lock']
    out += [f'{r["t"]:7.2f} {r.get("frame", ""):>5}  {r["cue"]:15} {r["strength"]:4.2f} {r["set_db"]:15.1f}  {r.get("src", ""):5} {"LOCK" if r.get("lock") else ""}'
            f'{"" if r["rec"] else "  synth"}{"  guessed as " + r["name"] if r["cue"] in S["guessed"] else ""}'
            for r in rows if r['name'] != 'tick' or r.get('lock')]
    return out


def main():
    ap = argparse.ArgumentParser(description='stick-man kit mixer')
    ap.add_argument('film'); ap.add_argument('--out'); ap.add_argument('--name', default='mix')
    ap.add_argument('--music', help='a licensed track (mp3/wav/ogg): levelled to the voice + mus_lu, then climb/contour/duck')
    ap.add_argument('--music-stem', help='a finished music stem, placed as it is (parity with an old mix)')
    ap.add_argument('--music-plan', help='a music.json to use in place of <film>/audio/music.json (a sound_fit.py candidate)')
    ap.add_argument('--mux', nargs=2, metavar=('VIDEO', 'OUT_MP4'))
    args = ap.parse_args(); film = args.film.rstrip('/'); out = args.out or os.path.join(film, 'audio')
    S = prepare(film, args); floor = None
    if S['M'].get('floor') is not None: floor = fill_floor(S, float(S['M']['floor']), float(S['M'].get('floor_max', 14)))
    if args.mux and abs(gap := (v := video_seconds(args.mux[0])) - S['N'] / SR) > 1 / 30:
        sys.exit(f'mix.py: video {v:.3f} s and mix {S["N"] / SR:.3f} s differ by more than one frame; '
                 f'muxing would cut the longer one short (set music.json length to the video)')
    if args.mux and gap: print(f'mix.py: video and mix differ by {gap * 1000:+.0f} ms; the mp4 ends with the shorter', file=sys.stderr)
    ceil = TP_CEIL; mp4 = None
    for tries in range(1, 4):
        used = ceil; L, R, G = master(S, used); paths = write(S, L, R, G, out, args.name)
        if not args.mux: break
        I, tp = mux(args.mux[0], paths['mix'], args.mux[1]); mp4 = dict(I=I, tp=tp, path=args.mux[1], tries=tries)
        print(f'mix.py: mp4 encode {tries}: {I:.1f} LUFS, true peak {tp:.1f} dBTP at limiter ceiling {used:.2f}')
        if tp <= MP4_TP: break
        ceil = used - (tp - MP4_TP + 0.3)
    lines = report(S, L, R, G, paths, used, mp4)
    if floor: lines.append(f'floor {S["M"]["floor"]} dBFS: beds lifted on {floor[0]:.1f} s, at most {floor[1]:.1f} dB')
    open(os.path.join(out, 'levels.txt' if args.name == 'mix' else f'levels-{args.name}.txt'), 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines[:16]))
    if mp4 and (mp4['tp'] > MP4_TP or abs(mp4['I'] - MIX_LU) > 0.5):
        sys.exit(f'mix.py: {mp4["path"]} is at {mp4["I"]:.1f} LUFS, true peak {mp4["tp"]:.1f} dBTP after {mp4["tries"]} encode(s); '
                 f'targets {MIX_LU:.0f} +-0.5 LUFS and <= {MP4_TP:.1f} dBTP')


if __name__ == '__main__':
    main()
