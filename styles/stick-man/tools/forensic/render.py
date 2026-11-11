"""Colour/render stats: per-shot YAVG/SAT, contrast, palette, shadow tint, scene palette change; full-res grain/vignette/head shading."""
import sys, json, subprocess, colorsys
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import load, ALL, D
from shots import thumbs, mask_cap

W, H = 1080, 1920


def hsv(rgb):
    r, g, b = [rgb[..., i] / 255.0 for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); c = mx - mn
    h = np.zeros_like(mx); m = c > 1e-6
    rc = (mx == r) & m; gc = (mx == g) & m & ~rc; bc = m & ~rc & ~gc
    h[rc] = ((g - b)[rc] / c[rc]) % 6; h[gc] = (b - r)[gc] / c[gc] + 2; h[bc] = (r - g)[bc] / c[bc] + 4
    return h / 6, np.where(mx > 0, c / (mx + 1e-6), 0), mx


def kmeans(X, k=8, it=25, seed=0):
    rng = np.random.default_rng(seed); C = X[rng.choice(len(X), k, replace=False)].copy()
    for _ in range(it):
        d = ((X[:, None, :] - C[None]) ** 2).sum(-1); l = d.argmin(1)
        for j in range(k):
            if (l == j).any():
                C[j] = X[l == j].mean(0)
    cnt = np.bincount(l, minlength=k)
    o = np.argsort(-cnt)
    return C[o], cnt[o] / cnt.sum()


def grab(name, frames, fmt="rgb24", ch=3):
    expr = "+".join(f"eq(n\\,{n})" for n in frames)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{D}/{name}.mp4", "-vf", f"select='{expr}'", "-fps_mode", "vfr",
                          "-pix_fmt", fmt, "-f", "rawvideo", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, ch) if ch > 1 else np.frombuffer(raw, np.uint8).reshape(-1, H, W)


res = {}; palettes = {}
for nm in ALL:
    f = load(nm); S = json.load(open(f"{D}/{nm}.shots.json")); T = thumbs(nm)
    shots = [s for s in S["shots"] if s[1] - s[0] >= 8]
    per = []
    mids = []
    for a, b in shots:
        m = (a + b) // 2; mids.append(m)
        rgb = mask_cap(T[m]).reshape(-1, 3).astype(np.float32)
        Y = 0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]
        h, s, v = hsv(rgb.reshape(1, -1, 3)); h, s, v = h[0], s[0], v[0]
        sel = s > 0.25
        if sel.sum() > 20:
            ang = h[sel] * 2 * np.pi; wgt = s[sel]
            dh = (np.degrees(np.arctan2((np.sin(ang) * wgt).sum(), (np.cos(ang) * wgt).sum())) % 360)
        else:
            dh = None
        # shadow tint: pixels in 10-25 % luminance quantile excluding near-black lines
        q10, q25 = np.percentile(Y, [10, 25])
        sh = (Y >= max(q10, 35)) & (Y <= q25)
        if sh.sum() > 20:
            sm = rgb[sh].mean(0); shh, shs, shv = colorsys.rgb_to_hsv(*(sm / 255))
        else:
            shh = shs = shv = None
        per.append(dict(a=a, b=b, yavg=float(np.median(f["yavg"][a:b + 1])), sat=float(np.median(f["sat"][a:b + 1])),
                        ystd=float(Y.std()), yp5=float(np.percentile(Y, 5)), yp95=float(np.percentile(Y, 95)),
                        s_med=float(np.median(s)), s_p90=float(np.percentile(s, 90)), dom_hue=dh,
                        shadow_hue=None if shh is None else shh * 360, shadow_sat=shs, shadow_val=shv))
    # palette: k-means over all mid frames
    X = np.concatenate([mask_cap(T[m]).reshape(-1, 3)[::3] for m in mids]).astype(np.float32)
    C, P = kmeans(X, 8)
    palettes[nm] = [("#%02x%02x%02x" % tuple(int(v) for v in c), round(float(p), 3)) for c, p in zip(C, P)]
    # palette change between consecutive shots: chi-like distance of 4x4x4 RGB histograms
    hs_ = []
    for m in mids:
        q = (mask_cap(T[m]).reshape(-1, 3) // 64).astype(int); idx = q[:, 0] * 16 + q[:, 1] * 4 + q[:, 2]
        hh = np.bincount(idx, minlength=64).astype(float); hs_.append(hh / hh.sum())
    chg = [0.5 * np.abs(hs_[i] - hs_[i - 1]).sum() for i in range(1, len(hs_))]
    hues = [p["dom_hue"] for p in per if p["dom_hue"] is not None]
    hue_bins = len(set(int(x // 30) for x in hues))
    # full-res: grain, vignette, head shading on 12 frames
    pick = mids[:: max(1, len(mids) // 12)][:12]
    G = grab(nm, pick, "gray", 1).astype(np.float32)
    grains = []; vign = []
    for Y in G:
        lap = ndi.laplace(Y); gx = ndi.sobel(Y, 1); gy = ndi.sobel(Y, 0); gm = np.hypot(gx, gy)
        flat = ndi.uniform_filter(gm, 9) < 12
        flat[int(0.6 * H):int(0.8 * H)] = False
        if flat.sum() > 5000:
            grains.append(float(np.median(np.abs(lap[flat]))))
        c = Y[int(0.35 * H):int(0.65 * H), int(0.3 * W):int(0.7 * W)].mean()
        corners = np.r_[Y[:200, :150].ravel(), Y[:200, -150:].ravel(), Y[-200:, :150].ravel(), Y[-200:, -150:].ravel()].mean()
        vign.append(float(corners / max(1, c)))
    # head shading: tone range inside detected big faces (full res)
    faces = json.load(open(f"{D}/{nm}.faces.json"))
    cand = [(n, max(faces[n], key=lambda x: x[2])) for n in range(len(faces)) if faces[n] and max(x[2] for x in faces[n]) >= 70]
    cand = cand[:: max(1, len(cand) // 10)][:10]
    tone = []; steps = []
    if cand:
        R = grab(nm, [c[0] for c in cand], "gray", 1).astype(np.float32)
        for (n, fc), Y in zip(cand, R):
            cx, cy, w, h = [v * 2 for v in fc[:4]]
            yy, xx = np.mgrid[0:H, 0:W]
            ell = ((xx - cx) / (0.42 * w)) ** 2 + ((yy - cy) / (0.42 * h)) ** 2 < 1
            v = Y[ell]; v = v[v > 120]  # skin only (drop eyes/lines)
            if len(v) > 500:
                tone.append(float(np.percentile(v, 97) - np.percentile(v, 3)))
                hist = np.bincount(np.clip(v.astype(int), 0, 255), minlength=256)[120:]
                hist = np.convolve(hist, np.ones(5) / 5, mode="same")
                pk = [i for i in range(2, len(hist) - 2) if hist[i] == hist[i - 2:i + 3].max() and hist[i] > 0.03 * hist.max()]
                steps.append(len(pk))
    A = lambda k: [p[k] for p in per if p[k] is not None]
    r = dict(shots=len(per), yavg_med=round(float(np.median(A("yavg"))), 1), yavg_range=[round(min(A("yavg"))), round(max(A("yavg")))],
             sat_med=round(float(np.median(A("sat"))), 1), sat_range=[round(min(A("sat")), 1), round(max(A("sat")), 1)],
             ystd_med=round(float(np.median(A("ystd"))), 1), yp5_med=round(float(np.median(A("yp5")))), yp95_med=round(float(np.median(A("yp95")))),
             hsv_s_med=round(float(np.median(A("s_med"))), 3), hsv_s_p90=round(float(np.median(A("s_p90"))), 3),
             shadow_hue_med=round(float(np.median(A("shadow_hue")))), shadow_sat_med=round(float(np.median(A("shadow_sat"))), 2),
             shadow_val_med=round(float(np.median(A("shadow_val"))), 2),
             dom_hue_bins_30deg=hue_bins, palette_change_med=round(float(np.median(chg)), 3) if chg else None,
             grain_lap_med=round(float(np.median(grains)), 2) if grains else None, vignette_corner_ratio=round(float(np.median(vign)), 2),
             head_tone_range=round(float(np.median(tone)), 1) if tone else None, head_tone_peaks=float(np.median(steps)) if steps else None)
    res[nm] = dict(stats=r, per_shot=per)
    print(nm, r, flush=True)
json.dump(dict(res=res, palettes=palettes), open(f"{D}/render.json", "w"), indent=0, default=float)
print(json.dumps(palettes))
