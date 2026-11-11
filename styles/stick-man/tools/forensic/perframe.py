"""Per-frame measurements for one video at 360x640 (1/3 of 1080x1920).
Outputs data/<name>.frames.npz with arrays indexed by frame number n.
Usage: python -I perframe.py <name>
"""
import sys, subprocess, json
import numpy as np
from scipy import ndimage as ndi

D = __import__("os").environ["FORENSIC_DATA"]
name = sys.argv[1]
W, H = 360, 640
CAP0, CAP1 = int(0.60 * H), int(0.80 * H)      # caption band rows (masked for camera / motion)

cmd = ["ffmpeg", "-v", "error", "-i", f"{D}/{name}.mp4", "-vf", f"scale={W}:{H}:flags=area",
       "-pix_fmt", "yuv444p", "-f", "rawvideo", "-"]
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
FS = W * H * 3

# tile grid for phase correlation (skip caption band)
TW, TH = 120, 128
tiles = []
for ty in range(0, H - TH + 1, TH):
    if ty + TH > CAP0 and ty < CAP1:
        continue
    for tx in range(0, W - TW + 1, TW):
        tiles.append((tx, ty))
win = np.outer(np.hanning(TH), np.hanning(TW)).astype(np.float32)


def phase_corr(a, b):
    A = np.fft.rfft2(a * win); B = np.fft.rfft2(b * win)
    R = A * np.conj(B); R /= np.abs(R) + 1e-6
    r = np.fft.irfft2(R, s=a.shape)
    i = np.argmax(r); y, x = np.unravel_index(i, r.shape)
    peak = r[y, x]
    # subpixel (parabolic)
    def sub(v, c, n):
        l, m, rr = v[(c - 1) % n], v[c], v[(c + 1) % n]
        d = (l - rr) / (2 * (l - 2 * m + rr) + 1e-9)
        return c + float(np.clip(d, -0.5, 0.5))
    sy = sub(r[:, x], y, r.shape[0]); sx = sub(r[y, :], x, r.shape[1])
    if sy > r.shape[0] / 2: sy -= r.shape[0]
    if sx > r.shape[1] / 2: sx -= r.shape[1]
    return sx, sy, float(peak)


def fit_sim(pts, d, w):
    """dx = tx + s*X - r*Y ; dy = ty + s*Y + r*X  (X,Y centred). weighted LS."""
    X = pts[:, 0] - W / 2; Y = pts[:, 1] - H / 2
    A = np.zeros((2 * len(X), 4)); b = np.zeros(2 * len(X)); ww = np.repeat(w, 2)
    A[0::2, 0] = 1; A[0::2, 2] = X; A[0::2, 3] = -Y; b[0::2] = d[:, 0]
    A[1::2, 1] = 1; A[1::2, 2] = Y; A[1::2, 3] = X; b[1::2] = d[:, 1]
    sw = np.sqrt(ww)
    sol, *_ = np.linalg.lstsq(A * sw[:, None], b * sw, rcond=None)
    res = (A @ sol - b).reshape(-1, 2)
    return sol, np.hypot(res[:, 0], res[:, 1])


def hsv_hist(rgb):
    r, g, b = [rgb[..., i].astype(np.float32) / 255 for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); c = mx - mn
    h = np.zeros_like(mx)
    m = c > 1e-6
    rc = (mx == r) & m; gc = (mx == g) & m & ~rc; bc = m & ~rc & ~gc
    h[rc] = ((g - b)[rc] / c[rc]) % 6; h[gc] = (b - r)[gc] / c[gc] + 2; h[bc] = (r - g)[bc] / c[bc] + 4
    h /= 6; s = np.where(mx > 0, c / (mx + 1e-6), 0)
    hi = np.minimum((h * 12).astype(int), 11); si = np.minimum((s * 4).astype(int), 3); vi = np.minimum((mx * 6).astype(int), 5)
    idx = hi * 24 + si * 6 + vi
    hist = np.bincount(idx.ravel(), minlength=288).astype(np.float32)
    return hist / hist.sum()


def yuv2rgb(Y, U, V):
    y = (Y.astype(np.float32) - 16) * 1.164; u = U.astype(np.float32) - 128; v = V.astype(np.float32) - 128
    r = y + 1.596 * v; g = y - 0.392 * u - 0.813 * v; b = y + 2.017 * u
    return np.clip(np.stack([r, g, b], -1), 0, 255).astype(np.uint8)


rows = []
prev = None; prevY = None; prevhist = None; prevcap = None
heads_all = []
n = 0
mask = np.ones((H, W), bool); mask[CAP0:CAP1] = False
while True:
    buf = p.stdout.read(FS)
    if len(buf) < FS:
        break
    a = np.frombuffer(buf, np.uint8).reshape(3, H, W)
    Y, U, V = a[0], a[1], a[2]
    Yf = Y.astype(np.float32)
    rgb = yuv2rgb(Y, U, V)
    sat = np.hypot(U.astype(np.float32) - 128, V.astype(np.float32) - 128)
    yavg = float(Yf.mean()); satavg = float(sat.mean())
    hist = hsv_hist(rgb)
    # captions: bright, unsaturated pixels inside band, adjacent to dark pixels
    band = Yf[CAP0 - 40:CAP1 + 40]; bs = sat[CAP0 - 40:CAP1 + 40]
    white = (band > 215) & (bs < 14)
    dark = band < 45
    darkn = ndi.binary_dilation(dark, iterations=2)
    capm = white & darkn
    ys, xs = np.nonzero(capm)
    if len(ys) > 40:
        cap = (int(xs.min()), int(ys.min()) + CAP0 - 40, int(xs.max()), int(ys.max()) + CAP0 - 40, int(len(ys)))
    else:
        cap = (-1, -1, -1, -1, int(len(ys)))
    capdiff = int((capm ^ prevcap).sum()) if prevcap is not None else 0
    # sharpness (laplacian var) overall and grain proxy in flat regions
    lap = ndi.laplace(Yf)
    sharp = float(lap[mask].var())
    # global motion
    tx = ty = sc = rot = 0.0; fitres = 0.0; peak = 0.0; resid = 0.0; movfrac = 0.0; d1 = 0.0; hd = 0.0
    if prevY is not None:
        d1 = float(np.abs(Yf - prevY)[mask].mean())
        hd = float(0.5 * np.abs(hist - prevhist).sum())
        pts = []; ds = []; ws = []
        for (x0, y0) in tiles:
            sx, sy, pk = phase_corr(Yf[y0:y0 + TH, x0:x0 + TW], prevY[y0:y0 + TH, x0:x0 + TW])
            pts.append((x0 + TW / 2, y0 + TH / 2)); ds.append((sx, sy)); ws.append(max(pk, 1e-3))
        pts = np.array(pts); ds = np.array(ds); ws = np.array(ws)
        peak = float(np.median(ws))
        sol, r = fit_sim(pts, ds, ws)
        for _ in range(2):
            keep = r < max(1.5, np.median(r) * 2.5)
            if keep.sum() >= 4:
                sol, r2 = fit_sim(pts[keep], ds[keep], ws[keep]); r = np.full(len(pts), 99.0); r[keep] = r2
        tx, ty, sc, rot = map(float, sol)
        fitres = float(np.median(r))
        # motion-compensated residual: warp prev by model (inverse map)
        # current pixel p came from prev pixel p - d(p)
        yy, xx = np.mgrid[0:H:4, 0:W:4].astype(np.float32)
        X = xx - W / 2; Yc = yy - H / 2
        dx = tx + sc * X - rot * Yc; dy = ty + sc * Yc + rot * X
        src = ndi.map_coordinates(prevY, [yy - dy, xx - dx], order=1, mode="nearest")
        cur = Yf[0:H:4, 0:W:4]
        m4 = mask[0:H:4, 0:W:4]
        e = np.abs(cur - src)
        resid = float(e[m4].mean()); movfrac = float((e[m4] > 18).mean())
    # head candidates: near-white blobs with dark rim
    wm = (Yf > 200) & (sat < 22)
    wm = ndi.binary_opening(wm, iterations=1)
    lab, nl = ndi.label(wm)
    heads = []
    if nl:
        objs = ndi.find_objects(lab)
        for i, sl in enumerate(objs):
            hh = sl[0].stop - sl[0].start; ww_ = sl[1].stop - sl[1].start
            if hh < 7 or ww_ < 7 or hh > H * 0.85:
                continue
            sub = lab[sl] == i + 1
            filled = ndi.binary_fill_holes(sub)
            area = filled.sum(); fill = area / (hh * ww_)
            asp = hh / ww_
            if not (0.62 < fill < 0.9 and 0.7 < asp < 1.35):
                continue
            # rim darkness
            ring = ndi.binary_dilation(filled, iterations=2) & ~ndi.binary_dilation(filled, iterations=0)
            y0, x0 = sl[0].start, sl[1].start
            ry, rx = np.nonzero(ring)
            # ring may exceed slice: compute on padded window
            pad = 4
            Y0 = max(0, y0 - pad); X0 = max(0, x0 - pad)
            Y1 = min(H, sl[0].stop + pad); X1 = min(W, sl[1].stop + pad)
            big = np.zeros((Y1 - Y0, X1 - X0), bool)
            big[y0 - Y0:y0 - Y0 + hh, x0 - X0:x0 - X0 + ww_] = filled
            rg = ndi.binary_dilation(big, iterations=3) & ~ndi.binary_dilation(big, iterations=1)
            rimdark = float((Yf[Y0:Y1, X0:X1][rg] < 70).mean()) if rg.any() else 0
            if rimdark < 0.45:
                continue
            holes = filled & ~sub
            hl, hn = ndi.label(holes)
            eyes = int(hn); holearea = int(holes.sum())
            cy, cx = ndi.center_of_mass(filled)
            heads.append((round(float(cx + x0), 1), round(float(cy + y0), 1), int(ww_), int(hh), round(float(fill), 3),
                          round(rimdark, 2), eyes, holearea))
    heads_all.append(heads)
    rows.append((n, yavg, satavg, d1, hd, tx, ty, sc, rot, fitres, peak, resid, movfrac, sharp,
                 *cap, capdiff))
    prev = rgb; prevY = Yf; prevhist = hist; prevcap = capm
    n += 1

cols = "n yavg sat d1 hd tx ty sc rot fitres peak resid movfrac sharp cx0 cy0 cx1 cy1 capn capdiff".split()
arr = np.array(rows, dtype=np.float64)
np.savez(f"{D}/{name}.frames.npz", cols=np.array(cols), data=arr)
json.dump(heads_all, open(f"{D}/{name}.heads.json", "w"))
print(name, n, "frames")
