"""Outline thickness at full 1080x1920: head rim (rays), limb/body strokes below the head, thin dark lines elsewhere."""
import sys, json, subprocess
import numpy as np
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import ALL, D

W, H = 1080, 1920


def grab(name, frames):
    expr = "+".join(f"eq(n\\,{n})" for n in frames)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{D}/{name}.mp4", "-vf", f"select='{expr}',scale={W}:{H}:flags=bicubic", "-fps_mode", "vfr",
                          "-pix_fmt", "gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8)
    return a.reshape(-1, H, W)


def runs_1d(v, dark=80, bright=150, maxlen=40):
    """lengths of dark runs bounded by bright pixels on both sides."""
    d = v < dark
    out = []; i = 0; L = len(v)
    while i < L:
        if d[i]:
            j = i
            while j < L and d[j]:
                j += 1
            if i > 1 and j < L - 1 and j - i <= maxlen and v[max(0, i - 2)] > bright and v[min(L - 1, j + 1)] > bright:
                out.append(j - i)
            i = j
        else:
            i += 1
    return out


res = {}
for nm in ALL:
    faces = json.load(open(f"{D}/{nm}.faces.json"))
    # candidate frames: one big face (w>=60 at 540 => >=120 px at 1080), spread over the video
    cand = [(n, max(faces[n], key=lambda x: x[2])) for n in range(len(faces)) if faces[n] and max(x[2] for x in faces[n]) >= 60]
    step = max(1, len(cand) // 24)
    pick = cand[::step][:24]
    if not pick:
        continue
    imgs = grab(nm, [p[0] for p in pick])
    rim = []; rimpct = []; cvs = []; sides = []; limb = []; env = []; headw = []
    for (n, fc), Y in zip(pick, imgs):
        Y = Y.astype(np.int16)
        cx, cy, w, h = fc[0] * 2, fc[1] * 2, fc[2] * 2, fc[3] * 2
        R = w / 2; headw.append(w)
        th = []; side = []
        for ang in np.r_[np.linspace(-50, 50, 9), np.linspace(130, 230, 9)]:
            a = np.radians(ang); rr = np.arange(0.6 * R, 1.35 * R)
            xs = (cx + rr * np.cos(a)).astype(int); ys = (cy + rr * np.sin(a) * (h / w)).astype(int)
            ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H)
            v = Y[ys[ok], xs[ok]]
            # first white->dark transition then dark run
            k = 0
            while k < len(v) and v[k] > 150:
                k += 1
            if k == 0 or k >= len(v):
                continue
            j = k
            while j < len(v) and v[j] < 90:
                j += 1
            if j < len(v) and 2 <= j - k <= 60:
                th.append(j - k); side.append(0 if abs(ang) <= 50 else 1)
        if len(th) >= 5:
            t = float(np.median(th)); rim.append(t); rimpct.append(100 * t / w)
            tha = np.array(th); sd = np.array(side)
            cvs.append(float(tha.std() / tha.mean()))
            if (sd == 0).sum() >= 3 and (sd == 1).sum() >= 3:
                a_, b_ = np.median(tha[sd == 0]), np.median(tha[sd == 1]); sides.append(float(max(a_, b_) / max(1, min(a_, b_))))
        # limbs/body below head: horizontal scanlines
        y0 = int(cy + 1.3 * R); y1 = int(min(H - 1, cy + 5 * R))
        x0 = int(max(0, cx - 2 * R)); x1 = int(min(W, cx + 2 * R))
        for yy in range(y0, y1, 6):
            if 0.6 * H < yy < 0.8 * H:
                continue
            limb += runs_1d(Y[yy, x0:x1], maxlen=int(0.25 * w) + 4)
        # environment: rows/cols away from the head box and caption band
        mask_rows = [yy for yy in range(0, H, 24) if not (0.6 * H < yy < 0.8 * H) and not (cy - 3 * R < yy < cy + 6 * R)]
        for yy in mask_rows:
            env += runs_1d(Y[yy], maxlen=14)
    def mode(v):
        v = np.array(v)
        if not len(v):
            return None
        b = np.bincount(v); b[0] = 0; b[1] = 0  # ignore 1-px (aliasing)
        return int(np.argmax(b))
    r = dict(frames=len(pick), head_w_med=float(np.median(headw)), rim_px_med=round(float(np.median(rim)), 1) if rim else None,
             rim_pct_W_med=round(float(np.median(rimpct)), 2) if rim else None,
             rim_pct_iqr=[round(float(np.percentile(rimpct, 25)), 2), round(float(np.percentile(rimpct, 75)), 2)] if rim else None,
             rim_cv_med=round(float(np.median(cvs)), 2) if cvs else None, rim_side_ratio_med=round(float(np.median(sides)), 2) if sides else None,
             limb_mode_px=mode(limb), limb_med_px=float(np.median(limb)) if limb else None,
             env_mode_px=mode(env), env_med_px=float(np.median(env)) if env else None, env_runs=len(env))
    res[nm] = r; print(nm, r, flush=True)
json.dump(res, open(f"{D}/lines.json", "w"), indent=1)
