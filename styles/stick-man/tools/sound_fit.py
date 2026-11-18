# sound_fit.py: cut a licensed music track to a stick-man film's story beats, on the track's own bar lines.
#   python styles/stick-man/tools/sound_fit.py <film> <track> [--track2 <track> --track2-at a-b] [--bpm N] [--meter N]
#          [--mus-lu dB] --out <music.json>
#   python styles/stick-man/tools/sound_fit.py <film> <music stem.wav> --check <music.json>
# reads  <film>/audio/music.json arc [{t: [a, b], state, lu}], <film>/audio/sound-plan.json silences [{t: [a, b]}]
# writes a copy of music.json whose track.segments ({src, at, file, gain}) mix.py --music-plan plays: one segment per arc section,
#        starting on a downbeat that lands on the section start, cut from the part of the track whose level is nearest the
#        section's lu; no music in a silence or a section in OFF; the last section ends on the track's own ending by the film's end.
#        Without --mus-lu, mus_lu is set by mixing the film in process so the music stem sits at the kit's -26 LUFS.
# --check finds each segment's downbeat in the mixed music stem by cross-correlation and prints how far it landed from its beat.
import argparse, json, os, sys
import numpy as np, soundfile as sf
from scipy.ndimage import gaussian_filter1d, uniform_filter1d
from scipy.signal import resample_poly, fftconvolve

TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
import mix
from sound_dsp import SR, lufs

OFF = {'silence', 'drop', 'none'}
XFADE = 0.05                  # an edit on a downbeat: the incoming bar's attack hides a 50 ms equal-power crossfade before it
STEM_LU, LANE_S = -26.0, 0.5
FS, HOP, WIN = 12000, 120, 512                     # analysis at 12 kHz, 10 ms hop
FREQ = np.fft.rfftfreq(WIN, 1 / FS)
GAIN = (-6.0, 3.0)            # a segment's level trim towards its section's lu, after the energy match
METERS = (3, 4, 6, 7)


def spectrum(x):
    """magnitude spectrogram, 10 ms frames, x mono at FS"""
    fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (WIN, WIN)), WIN)[::HOP] * np.hanning(WIN)
    return np.abs(np.fft.rfft(fr, axis=1))


def flux(S):
    """onset strength per frame: positive log-spectral flux over all bins, and the rise of the energy under 200 Hz (a kick)"""
    L = np.log1p(1000 * S); d = np.maximum(np.diff(L, axis=0, prepend=L[:1]), 0)
    low = (S[:, FREQ < 200] ** 2).sum(1); return d.sum(1), np.maximum(np.diff(low, prepend=low[:1]), 0)


def chroma(S):
    """pitch-class profile per frame, 60-2000 Hz, each frame summing to 1"""
    k = (FREQ > 60) & (FREQ < 2000); pc = np.round(12 * np.log2(FREQ[k] / 440)).astype(int) % 12
    C = np.stack([S[:, k][:, pc == i].sum(1) for i in range(12)], 1); return C / (C.sum(1, keepdims=True) + 1e-9)


def click_lag():
    """seconds from a frame's index time to the click that peaks its flux, measured on one synthetic click"""
    x = np.zeros(FS * 2); x[FS:FS + 24] = 1.0; return np.argmax(flux(spectrum(x))[0]) * HOP / FS - 1.0


LAG = click_lag()


class Grid:
    """a constant-tempo bar grid read from the track: beat period P s, beats per bar, downbeat times"""

    def __init__(self, y, bpm=None, meter=None):
        x = resample_poly(y.mean(1), 1, SR // FS); self.dur = len(y) / SR
        S = spectrum(x); on, low = flux(S); t = np.arange(len(on)) * HOP / FS - LAG
        on = gaussian_filter1d(np.maximum(on - uniform_filter1d(on, 100), 0), 1.5)
        low = gaussian_filter1d(np.maximum(low - uniform_filter1d(low, 100), 0), 1.5)
        n = len(on); ac = np.fft.irfft(np.abs(np.fft.rfft(on, 2 * n)) ** 2)[:n]
        lags = np.arange(n) * HOP / FS; bpms = 60 / np.maximum(lags, 1e-9)
        lo, hi = (bpm * 0.92, bpm * 1.08) if bpm else (55, 190)
        prior = 1.0 if bpm else np.exp(-0.5 * (np.log2(bpms / 120) / 0.9) ** 2)
        ok = (bpms >= lo) & (bpms <= hi); P0 = lags[ok][np.argmax((ac * prior)[ok])]
        best = (-1, None, None)
        for P in P0 * np.linspace(0.985, 1.015, 301):                 # comb over the whole track: the period to 0.01 %
            phis = np.arange(0, P, 0.002); sc = np.interp(phis[:, None] + np.arange(int((self.dur - 1) / P)) * P, t, on).sum(1)
            if sc.max() > best[0]: best = (sc.max(), P, phis[np.argmax(sc)])
        _, self.P, phi = best; self.bpm = 60 / self.P
        self.beats = phi + np.arange(int((self.dur - phi) / self.P) + 1) * self.P
        self.hit = np.interp(self.beats, t, on).mean() / (np.interp(self.beats + self.P / 2, t, on).mean() + 1e-12)
        # downbeat: the beat in the bar with the strongest accent (bass onsets) and where chords change (chroma steadiest within bars)
        acc = np.interp(self.beats, t, low / (low.mean() + 1e-12) + 0.5 * on / (on.mean() + 1e-12))
        idx = np.searchsorted(t, self.beats); C = chroma(S); B = np.array([C[a:b].mean(0) for a, b in zip(idx[:-1], idx[1:])])
        def fold(m):
            f = acc[:len(acc) // m * m].reshape(-1, m).mean(0)
            v = np.array([np.mean([B[j:j + m].var(0).sum() for j in range(r, len(B) - m, m)]) for r in range(m)])
            sc = f / f.mean() - v / v.mean(); return f.max() / f.mean(), sc
        folds = {m: fold(m) for m in set(METERS) | {meter or 4}}
        top = max(folds[m][0] for m in METERS)
        self.meter = meter or (min(m for m in METERS if folds[m][0] >= 0.92 * top) if top >= 1.3 else 4)   # no clear accent: 4/4
        self.contrast, sc = folds[self.meter]; self.downbeats = self.beats[int(np.argmax(sc))::self.meter]
        self._p = np.concatenate([[0], np.cumsum(y.mean(1) ** 2)])
        loud = np.nonzero(np.abs(y).max(1) > np.abs(y).max() * 10 ** (-50 / 20))[0]
        self.end = min(self.dur, (loud[-1] + 1) / SR + 0.3) if len(loud) else self.dur
        bars = [self.level(a, b) for a, b in zip(self.downbeats[:-1], self.downbeats[1:])]
        self.ref = np.percentile(bars, 95) if bars else 0.0

    def level(self, a, b):
        i, j = int(a * SR), max(int(a * SR) + 1, min(len(self._p) - 1, int(b * SR)))
        return 10 * np.log10((self._p[j] - self._p[i]) / (j - i) + 1e-20)

    def rel(self, a, b): return self.level(a, b) - self.ref


def load(path): return json.load(open(path)) if os.path.exists(path) else None


def music_sections(film):
    """the arc's sections that carry music, with planned silences cut out of them; the film's length (the voice)"""
    A = os.path.join(film, 'audio'); M = load(os.path.join(A, 'music.json'))
    if not M or not M.get('arc'): sys.exit(f'sound_fit.py: {film}/audio/music.json has no arc')
    sil = [tuple(s['t']) for s in (load(os.path.join(A, 'sound-plan.json')) or {}).get('silences', [])]
    out = []
    for x in M['arc']:
        a, b = x['t']
        if x['state'] in OFF: continue
        for s0, s1 in sil:
            if s0 <= a < s1: a = s1
            if s0 < b <= s1: b = s0
        if b - a > 0.2: out.append(dict(state=x['state'], lu=float(x.get('lu', -6)), a=a, b=b))
    vo = os.path.join(film, 'vo/vo.wav')
    return M, out, float(M.get('length') or (sf.info(vo).duration if os.path.exists(vo) else max(x['t'][1] for x in M['arc'])))


def fit(sections, grids, which, film_end):
    """one segment per section: the downbeat whose following stretch is nearest the section's lu, preferring unused source"""
    segs = []; used = {k: [] for k in grids}
    for i, s in enumerate(sections):
        key = which(s); g = grids[key]; D = s['b'] - s['a']; last = i == len(sections) - 1
        x_in = XFADE if i and abs(sections[i - 1]['b'] - s['a']) < 1e-6 else 0.0     # out of a silence: no pre-roll into it
        best = None
        for d in g.downbeats:
            if d - x_in < 0: continue
            if last:
                tail = g.end - d
                if tail > film_end - s['a'] or tail < 0.5: continue
                z = g.end; short = 2 * max(0.0, D - tail)          # an ending that stops before the section does
            else:
                z = d + D; short = 0.0
                if z > g.end - 0.2: continue
            e = g.rel(d, z)
            rep = sum(max(0, min(z, u1) - max(d, u0)) for u0, u1 in used[key]) / (z - d)
            cost = abs(e - s['lu']) + 3 * rep + short
            if best is None or cost < best[0]: best = (cost, d, z, e)
        if best is None: sys.exit(f'sound_fit.py: no bar of {key} fits {s["state"]} {s["a"]:.2f}-{s["b"]:.2f}')
        _, d, z, e = best; used[key].append((d, z))
        segs.append(dict(file=key, src=[round(d - x_in, 4), round(z, 4)], at=round(s['a'] - x_in, 4),
                         gain=round(float(np.clip(s['lu'] - e, *GAIN)), 2), section=s['state'], beat=s['a'], downbeat=round(d, 4),
                         level=round(e, 1), lu=s['lu']))
    return segs


def stem_lufs(film, plan):
    S = mix.prepare(film, argparse.Namespace(music=None, music_stem=None, music_plan=plan))
    _, _, G = mix.master(S, mix.TP_CEIL); return lufs([S['mL'] * G, S['mR'] * G])


def check(plan, film, stem):
    """lane 7: where each segment's downbeat sits in the mixed music stem, found by cross-correlating 1 s of source"""
    T = load(plan)['track']; ys = {}
    m = resample_poly(mix.decode(stem).mean(1), 1, SR // FS); rows = []
    for s in T['segments']:
        f = s.get('file', T['file'])
        if f not in ys: ys[f] = resample_poly(mix.decode(os.path.join(film, f)).mean(1), 1, SR // FS)
        d, L = s['downbeat'], min(1.0, s['src'][1] - s['downbeat'])
        ref = ys[f][int(d * FS):int((d + L) * FS)]; a = int(max(0, s['beat'] - 1.0) * FS)
        win = m[a:a + int((2.0 + L) * FS)]
        if len(win) < len(ref) or not ref.any(): continue
        c = fftconvolve(win, ref[::-1], 'valid'); e = np.sqrt(fftconvolve(win ** 2, np.ones(len(ref)), 'valid')) + 1e-12
        k = int(np.argmax(c / e)); rows.append((s['section'], s['beat'], a / FS + k / FS))
    print(f'{"section":10} {"beat":>7} {"cut in stem":>11} {"gap":>7}')
    for st, b, c in rows: print(f'{st:10} {b:7.2f} {c:11.3f} {c - b:+7.3f}')
    gaps = np.abs([c - b for _, b, c in rows])
    print(f'lane 7: {len(rows)} section changes, largest gap {gaps.max():.3f} s, within {LANE_S} s: {(gaps <= LANE_S).sum()}/{len(rows)}'
          f' ({100 * (gaps <= LANE_S).mean():.0f}%)   {"PASS" if (gaps <= LANE_S).all() else "FAIL"}')
    return gaps


def main():
    ap = argparse.ArgumentParser(description='fit a music track to a stick-man film')
    ap.add_argument('film'); ap.add_argument('track', nargs='?', help='the track to fit, or with --check the mixed music stem')
    ap.add_argument('--track2'); ap.add_argument('--track2-at', help='a-b: sections starting in [a, b) play --track2')
    ap.add_argument('--bpm', type=float, help='the track page tempo: search within 8%% of it')
    ap.add_argument('--bpm2', type=float); ap.add_argument('--meter', type=int); ap.add_argument('--meter2', type=int)
    ap.add_argument('--mus-lu', type=float, help='keep this mus_lu (skip the in-process level pass)')
    ap.add_argument('--out'); ap.add_argument('--check', metavar='MUSIC_JSON')
    a = ap.parse_args(); film = a.film.rstrip('/')
    if a.check:
        gaps = check(a.check, film, a.track); sys.exit(0 if (gaps <= LANE_S).all() else 1)
    if not (a.track and a.out): ap.error('<track> and --out are needed')
    M, sections, film_end = music_sections(film)
    rel = lambda p: os.path.relpath(os.path.abspath(p), os.path.abspath(film))
    grids = {rel(a.track): Grid(mix.decode(a.track), a.bpm, a.meter)}
    which = lambda s: rel(a.track)
    if a.track2:
        t0, t1 = map(float, a.track2_at.split('-')); grids[rel(a.track2)] = Grid(mix.decode(a.track2), a.bpm2, a.meter2)
        which = lambda s: rel(a.track2) if t0 <= s['a'] < t1 else rel(a.track)
    for k, g in grids.items():
        print(f'{k}: {g.bpm:.2f} BPM, {g.meter} beats a bar ({g.meter * g.P:.3f} s), first downbeat {g.downbeats[0]:.3f} s, '
              f'downbeat contrast {g.contrast:.2f}, on-beat / off-beat onset {g.hit:.2f}, ends {g.end:.2f} s of {g.dur:.2f}')
    segs = fit(sections, grids, which, film_end)
    out = dict(M, track=dict(file=rel(a.track), xfade=XFADE, segments=segs, fit=f'sound_fit.py, {len(segs)} sections'),
               mus_lu=a.mus_lu if a.mus_lu is not None else M.get('mus_lu', -8.5))
    json.dump(out, open(a.out, 'w'), indent=1)
    if a.mus_lu is None:
        for _ in range(3):
            got = stem_lufs(film, a.out); print(f'level pass: mus_lu {out["mus_lu"]:.2f} -> music stem {got:.1f} LUFS')
            if abs(got - STEM_LU) < 0.3: break
            out['mus_lu'] = round(out['mus_lu'] + STEM_LU - got, 2); json.dump(out, open(a.out, 'w'), indent=1)
    print(f'{"section":10} {"lu":>4} {"beat":>7} {"cut":>7} {"gap":>6}  {"file":34} {"src":>15} {"level":>6} {"gain":>5}')
    for s in segs:
        cut = s['at'] + (s['downbeat'] - s['src'][0])
        print(f'{s["section"]:10} {s["lu"]:4.0f} {s["beat"]:7.2f} {cut:7.2f} {cut - s["beat"]:+6.3f}'
              f'  {os.path.basename(s["file"]):34} {s["src"][0]:7.2f}-{s["src"][1]:6.2f} {s["level"]:6.1f} {s["gain"]:+5.1f}')
    e = segs[-1]['at'] + segs[-1]['src'][1] - segs[-1]['src'][0]
    print(f'music ends {e:.2f} s (film {film_end:.2f}); mus_lu {out["mus_lu"]:.2f}; wrote {a.out}')


if __name__ == '__main__':
    main()
