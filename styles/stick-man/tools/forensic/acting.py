"""Face tracks -> acting stats: camera-compensated head motion, holds, blinks, expression changes, mouth activity."""
import sys, json
import numpy as np
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import load, ALL, D

res = {}
alltracks = {}
for nm in ALL:
    faces = json.load(open(f"{D}/{nm}.faces.json")); f = load(nm); N = len(faces)
    S = json.load(open(f"{D}/{nm}.shots.json"))
    bnd = np.zeros(N, bool)
    for e in S["events"]:
        if e["kind"] != "inshot":
            bnd[max(0, e["a"] - 1):e["b"] + 2] = True
    tracks = []; active = []
    for n in range(N):
        fs = [x for x in faces[n] if x[2] >= 24]  # >= 48 px wide at 1080
        used = set(); new_active = []
        for t in active:
            last = t["f"][-1]
            best = None; bd = 1e9
            for i, x in enumerate(fs):
                if i in used:
                    continue
                d = np.hypot(x[0] - last[0], x[1] - last[1]); r = x[2] / last[2]
                if d < max(14, 0.45 * last[2]) and 0.75 < r < 1.33 and d < bd:
                    best, bd = i, d
            if best is not None and not bnd[n]:
                used.add(best); t["f"].append(fs[best]); t["n"].append(n); new_active.append(t)
            else:
                tracks.append(t)
        for i, x in enumerate(fs):
            if i not in used:
                new_active.append(dict(f=[x], n=[n]))
        active = new_active
    tracks += active
    tracks = [t for t in tracks if len(t["n"]) >= 12]
    spd_all = []; hold_runs = []; blinks = 0; track_frames = 0; expr = 0; mouth_tracks = 0; mouth_var = []
    for t in tracks:
        ns = np.array(t["n"]); F = t["f"]
        cx = np.array([x[0] for x in F]); cy = np.array([x[1] for x in F]); w = np.array([x[2] for x in F], float)
        # camera-predicted displacement (360-scale params -> 540-scale)
        rel = []
        for k in range(1, len(ns)):
            n = ns[k]
            X = cx[k - 1] / 1.5 - 180; Y = cy[k - 1] / 1.5 - 320
            dx = (f["tx"][n] + f["sc"][n] * X - f["rot"][n] * Y) * 1.5
            dy = (f["ty"][n] + f["sc"][n] * Y + f["rot"][n] * X) * 1.5
            rel.append(np.hypot(cx[k] - cx[k - 1] - dx, cy[k] - cy[k - 1] - dy) / w[k])  # head widths per frame
            t.setdefault("dxy", []).append([round(float((cx[k] - cx[k - 1] - dx) / w[k]), 4), round(float((cy[k] - cy[k - 1] - dy) / w[k]), 4)])
        rel = np.array(rel)
        spd_all += rel.tolist(); track_frames += len(ns)
        still = rel < 0.012
        i = 0
        while i < len(still):
            if still[i]:
                j = i
                while j < len(still) and still[j]:
                    j += 1
                hold_runs.append(j - i); i = j
            else:
                i += 1
        # eyes: holes in upper 65% of face, take two largest
        ea = []; easp = []; ma = []
        for x in F:
            top = x[1] - x[3] / 2; hgt = x[3]
            hs = [h for h in x[6] if (h[1] - top) / hgt < 0.62]
            hs.sort(key=lambda h: -h[4]); e2 = hs[:2]
            ea.append(sum(h[4] for h in e2)); easp.append(np.mean([h[3] / max(1, h[2]) for h in e2]) if e2 else 0)
            ms = [h for h in x[6] if (h[1] - top) / hgt >= 0.62]
            ma.append(sum(h[4] for h in ms))
        ea = np.array(ea, float); easp = np.array(easp); ma = np.array(ma, float)
        med = np.median(ea)
        if med > 6:
            low = ea < 0.4 * med
            i = 0
            while i < len(low):
                if low[i]:
                    j = i
                    while j < len(low) and low[j]:
                        j += 1
                    if 1 <= j - i <= 6 and i > 0 and j < len(low):
                        blinks += 1
                    i = j
                else:
                    i += 1
            # expression change: eye aspect median over 6-frame windows jumps > 35 %
            win = 6
            if len(easp) >= 3 * win:
                m = np.array([np.median(easp[k:k + win]) for k in range(0, len(easp) - win + 1, win)])
                expr += int((np.abs(np.diff(m)) / (np.maximum(m[:-1], m[1:]) + 1e-6) > 0.35).sum())
        if (ma > 0).mean() > 0.5:
            mouth_tracks += 1
            mm = ma[ma > 0]
            mouth_var.append(float(np.std(mm) / (np.mean(mm) + 1e-6)))
        t["rel"] = rel.round(4).tolist()
    spd = np.array(spd_all)
    hr = np.array(hold_runs)
    face_s = track_frames / 30
    r = dict(tracks=len(tracks), track_frames=track_frames, face_frames_pct=round(100 * sum(1 for x in faces if any(y[2] >= 24 for y in x)) / N, 1),
             head_speed_med_Wps=round(float(np.median(spd)) * 30, 3), head_speed_p90_Wps=round(float(np.percentile(spd, 90)) * 30, 2),
             moving_pct=round(100 * float((spd >= 0.012).mean()), 1),
             holds_ge6=int((hr >= 6).sum()), holds_ge6_per10s=round((hr >= 6).sum() / face_s * 10, 2) if face_s else 0,
             hold_len_med=float(np.median(hr[hr >= 6])) if (hr >= 6).any() else 0, hold_len_max=int(hr.max()) if len(hr) else 0,
             blinks=blinks, blinks_per_face_min=round(blinks / face_s * 60, 1) if face_s else 0,
             expr_changes=expr, expr_per_face_10s=round(expr / face_s * 10, 2) if face_s else 0,
             mouth_tracks_pct=round(100 * mouth_tracks / max(1, len(tracks)), 1),
             mouth_area_cv_med=round(float(np.median(mouth_var)), 2) if mouth_var else None)
    res[nm] = r
    alltracks[nm] = [dict(n=t["n"][0], len=len(t["n"]), w=float(np.median([x[2] for x in t["f"]])), rel=t["rel"], dxy=t.get("dxy", []),
                          cy=[x[1] for x in t["f"]], cx=[x[0] for x in t["f"]]) for t in tracks]
    print(nm, r, flush=True)
json.dump(dict(stats=res, tracks=alltracks), open(f"{D}/acting.json", "w"))
