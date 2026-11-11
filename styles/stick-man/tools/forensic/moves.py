"""Camera re-frame moves inside shots: runs where edge speed > 8 px/f (at 1080x1920) for >= 4 frames."""
import sys, json
import numpy as np
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import load, ALL, D

res = {}
allmoves = {}
for nm in ALL:
    f = load(nm); S = json.load(open(f"{D}/{nm}.shots.json")); N = len(f["n"])
    bnd = np.zeros(N, bool)
    for e in S["events"]:
        if e["kind"] in ("cut",):
            bnd[max(0, e["a"] - 1):e["b"] + 2] = True
    bnd[0] = True
    tx = f["tx"] * 3; ty = f["ty"] * 3; z = f["sc"]
    edge = np.hypot(np.hypot(tx, ty), np.abs(z) * 1100)
    edge[bnd] = 0
    sm = np.convolve(edge, np.ones(3) / 3, mode="same")
    mv = sm > 8
    moves = []; i = 0
    while i < N:
        if mv[i]:
            j = i
            while j < N and mv[j]:
                j += 1
            if j - i >= 4:
                seg = sm[i:j]; pk = int(np.argmax(seg))
                # ramp-in frames (from 8 px/f to 90% of peak) and ramp-out
                up = int(np.argmax(seg >= 0.9 * seg.max())); dn = len(seg) - 1 - int(len(seg) - 1 - np.argmax(seg[::-1] >= 0.9 * seg.max()))
                kind = "zoom" if np.abs(z[i:j]).mean() * 1100 > np.hypot(tx[i:j], ty[i:j]).mean() else ("pan" if np.abs(tx[i:j]).mean() > np.abs(ty[i:j]).mean() else "tilt")
                moves.append(dict(a=i, b=j - 1, len=j - i, peak=round(float(seg.max()), 1), t_peak=pk, ramp_in=up,
                                  ramp_out=len(seg) - 1 - (len(seg) - 1 - int(np.argmax(seg[::-1] >= 0.9 * seg.max()))), kind=kind,
                                  zsign=int(np.sign(z[i:j].sum()))))
            i = j
        else:
            i += 1
    dur = N / 30
    L = np.array([m["len"] for m in moves]); P = np.array([m["peak"] for m in moves])
    # quiet drift between moves: median edge speed outside moves
    inmv = np.zeros(N, bool)
    for m in moves:
        inmv[m["a"]:m["b"] + 1] = True
    drift = float(np.median(edge[(~inmv) & (~bnd)]))
    # share of time camera is 'locked' (edge < 0.5 px/f)
    locked = float(((edge < 0.5) & (~bnd)).mean() * 100)
    kinds = {}
    for m in moves:
        kinds[m["kind"]] = kinds.get(m["kind"], 0) + 1
    r = dict(moves=len(moves), moves_per10s=round(len(moves) / dur * 10, 2), move_len_med=float(np.median(L)) if len(L) else 0,
             move_peak_med=round(float(np.median(P)), 1) if len(P) else 0, move_peak_p90=round(float(np.percentile(P, 90)), 1) if len(P) else 0,
             time_in_moves_pct=round(100 * inmv.sum() / N, 1), drift_med_pxf=round(drift, 2), locked_pct=round(locked, 1), kinds=kinds,
             ramp_in_med=float(np.median([m["ramp_in"] for m in moves])) if moves else 0,
             peak_pos_med=round(float(np.median([m["t_peak"] / max(1, m["len"] - 1) for m in moves])), 2) if moves else 0)
    res[nm] = r; allmoves[nm] = moves
    print(nm, r)
json.dump(dict(stats=res, moves=allmoves), open(f"{D}/moves.json", "w"), indent=0)
