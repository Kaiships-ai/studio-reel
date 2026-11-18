# Pixel and audio measurements for refbench.mjs (the Rick clip benchmark). Started only by refbench.mjs through kit/env.mjs.
#   python refbench.py frames <w> <h>      reads gray rawvideo frames on stdin, prints one JSON line per frame
#   python refbench.py audio <wav> <start of the payoff's loud window s, -1 for none> [<sfx stem wav>]   prints one JSON object (16 kHz mono wav)
# Method and limits of every number: styles/stick-man/bench/README.md.
import json, sys
import numpy as np

CELL = 20            # edge and flow cells, at 360x640 (frames arrive at 720x1280)
TEXTURE = 6.0        # a cell counts for sharpness when its 95th-percentile gradient is at least this (grey levels / px)
FLOW_TEXTURE = 70.0  # min eigenvalue of the structure tensor (per cell) for a flow vector to count
CAPTION = (0.60, 0.80)  # caption band and top HUD band, left out of sharpness and flow: words pop in and out
HUD = (0.0, 0.10)


def rows_kept(h, step):
    keep = []
    for r in range(h // step):
        y = (r + 0.5) * step / h
        keep.append(not (CAPTION[0] <= y < CAPTION[1] or HUD[0] <= y < HUD[1]))
    return np.array(keep)


def cells(a, step):
    h, w = a.shape
    return a[: h // step * step, : w // step * step].reshape(h // step, step, w // step, step).swapaxes(1, 2).reshape(h // step, w // step, -1)


def sharpness(g, keep):
    # Edge sharpness per cell = p95 |Laplacian| / p95 |gradient| (1 / px). For a blurred step edge this is about
    # 1 / (blur sigma), whatever the edge contrast, so a flat wall does not read as "blurry": it has no edges and is skipped.
    gx = np.zeros_like(g); gy = np.zeros_like(g); lap = np.zeros_like(g)
    gx[:, 1:-1] = (g[:, 2:] - g[:, :-2]) / 2
    gy[1:-1, :] = (g[2:, :] - g[:-2, :]) / 2
    lap[1:-1, 1:-1] = g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:] - 4 * g[1:-1, 1:-1]
    G = np.percentile(cells(np.hypot(gx, gy), CELL), 95, axis=2)[keep]
    L = np.percentile(cells(np.abs(lap), CELL), 95, axis=2)[keep]
    s = (L / np.maximum(G, 1e-6))[G >= TEXTURE]
    if s.size < 8:
        return None
    hi, lo = np.percentile(s, 90), np.percentile(s, 25)
    return {'sharpHi': round(float(hi), 4), 'sharpLo': round(float(lo), 4), 'depthRatio': round(float(hi / max(lo, 1e-6)), 3)}


def blur3(a):
    k = np.array([1, 2, 1], np.float32) / 4
    a = k[0] * np.roll(a, 1, 0) + k[1] * a + k[2] * np.roll(a, -1, 0)
    return k[0] * np.roll(a, 1, 1) + k[1] * a + k[2] * np.roll(a, -1, 1)


def flow(p, q, keep):
    # Lucas-Kanade, one vector per 20 px cell at 360x640. Returns, for textured cells, the magnitudes (px / frame at 360
    # wide) and the magnitudes after taking out the median vector (the camera's pan), which leaves what moves in the shot.
    a, b = blur3(p), blur3(q)
    m = (a + b) / 2
    ix = np.zeros_like(m); iy = np.zeros_like(m)
    ix[:, 1:-1] = (m[:, 2:] - m[:, :-2]) / 2
    iy[1:-1, :] = (m[2:, :] - m[:-2, :]) / 2
    it = b - a
    S = lambda x: cells(x, CELL).sum(2)[keep]
    sxx, syy, sxy, sxt, syt = S(ix * ix), S(iy * iy), S(ix * iy), S(ix * it), S(iy * it)
    det = sxx * syy - sxy * sxy
    tr = sxx + syy
    lmin = tr / 2 - np.sqrt(np.maximum(tr * tr / 4 - det, 0))
    ok = lmin >= FLOW_TEXTURE
    if ok.sum() < 8:
        return None
    vx = (-syy * sxt + sxy * syt) / np.where(ok, det, 1)
    vy = (sxy * sxt - sxx * syt) / np.where(ok, det, 1)
    vx, vy = vx[ok], vy[ok]
    return np.hypot(vx, vy), np.hypot(vx - np.median(vx), vy - np.median(vy))


def frames(w, h):
    n = w * h
    # Sharpness and flow both run at half size (360x640): 720p and 1080p sources then read alike (see the noise floor).
    keep = np.repeat(rows_kept(h // 2, CELL)[:, None], w // 2 // CELL, 1)
    src = sys.stdin.buffer
    prev = None
    i = 0
    out = sys.stdout
    while True:
        buf = src.read(n)
        if len(buf) < n:
            break
        g = np.frombuffer(buf, np.uint8).reshape(h, w).astype(np.float32)
        small = g.reshape(h // 2, 2, w // 2, 2).mean((1, 3))
        row = {'i': i}
        if i % 3 == 0:
            s = sharpness(small, keep)
            if s:
                row.update(s)
        if prev is not None:
            f = flow(prev, small, keep)
            if f is not None:
                row['cam'] = round(float(np.median(f[0])), 4)
                row['top'] = round(float(np.percentile(f[1], 90)), 4)
        out.write(json.dumps(row) + '\n')
        prev = small
        i += 1
    out.flush()


SR = 16000


def block_db(a, hop):
    m = len(a) // hop
    return 10 * np.log10((a[: m * hop].reshape(m, hop).astype(np.float64) ** 2).mean(1) + 1e-12)


def onsets(a):
    # Spectral flux (log magnitude, 32 ms window, 10 ms hop) peaks over a 1 s running median; peaks 150 ms apart at least.
    from scipy.ndimage import maximum_filter1d, median_filter
    win, hop = 512, 160
    n = 1 + (len(a) - win) // hop
    if n < 3:
        return []
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    M = np.log1p(1000 * np.abs(np.fft.rfft(a[idx] * np.hanning(win)[None, :], axis=1)))
    Mp = maximum_filter1d(M, 3, axis=1)
    f = np.concatenate([[0, 0], np.maximum(M[2:] - Mp[:-2], 0).sum(1)])
    med = median_filter(f, 101)
    cand = np.where((f == maximum_filter1d(f, 7)) & (f > med + 60))[0]
    out, last = [], -99
    for c in cand:
        if c - last > 15:
            out.append(c * hop / SR)
            last = c
    return out


def audio(wav, at, sfx=None):
    import soundfile as sf
    from faster_whisper.vad import VadOptions, get_speech_timestamps
    a = sf.read(wav, dtype='float32')[0]
    dur = len(a) / SR
    speech = get_speech_timestamps(a, VadOptions(min_silence_duration_ms=150, speech_pad_ms=30, threshold=0.5))
    speech_s = sum(t['end'] - t['start'] for t in speech) / SR
    L = block_db(a, 800)  # 50 ms blocks
    sec = 100             # 5 s sections
    beds, voice = [], []
    for s in range(0, max(len(L) - sec + 1, 1), sec):
        part = L[s: s + sec]
        if len(part) < sec // 2:
            continue
        beds.append(round(float(np.percentile(part, 10)), 1))
        voice.append(float(np.percentile(part, 90)))
    res = {'speechShare': round(speech_s / dur, 3), 'beds': beds,
           'bedBelowLoud': round(float(np.median(voice) - np.median(beds)), 1) if beds else None, 'bedAtPayoff': None}
    pre = L[max(int((at - 2) * 20), 0): int(at * 20)] if at >= 0 else L[:0]
    if beds and len(pre) >= 10:
        res['bedAtPayoff'] = round(float(np.percentile(pre, 10) - np.median(beds)), 1)
    if sfx:
        b = sf.read(sfx, dtype='float32')[0]
        n = min(len(a), len(b))
        hits = onsets(b[:n])
        Lm, Ls = block_db(a[:n], 160), block_db(b[:n], 160)
        loud = [t for t in hits if (k := int(t * 100)) + 6 <= len(Ls) and Ls[k:k + 6].max() >= Lm[k:k + 6].max() - 3]
        res['sfxOnsets'] = [round(t, 3) for t in loud]
    json.dump(res, sys.stdout)


if __name__ == '__main__':
    if sys.argv[1] == 'frames':
        frames(int(sys.argv[2]), int(sys.argv[3]))
    elif sys.argv[1] == 'audio':
        audio(sys.argv[2], float(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else None)
    else:
        sys.exit(f'unknown mode {sys.argv[1]}')
