"""Shot boundaries + transition type for each video. Writes data/<name>.shots.json"""
import sys, json
import numpy as np
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import load, ALL, D

TH, TW = 160, 90
CAPA, CAPB = int(0.58 * TH), int(0.82 * TH)


def thumbs(name):
    a = np.fromfile(f"{D}/{name}.thumb.rgb", np.uint8)
    return a.reshape(-1, TH, TW, 3)


def mask_cap(x):
    return np.concatenate([x[:, :CAPA], x[:, CAPB:]], axis=1) if x.ndim == 4 else np.concatenate([x[:CAPA], x[CAPB:]], 0)


def analyse(name):
    f = load(name); T = thumbs(name).astype(np.float32); N = min(len(T), len(f["hd"]))
    hd = f["hd"]
    hi = hd > 0.10
    ev = []; n = 1
    while n < N:
        if hi[n]:
            m = n
            while m + 1 < N and (hi[m + 1] or (m + 2 < N and hi[m + 2]) or (m + 3 < N and hi[m + 3])):
                m += 1
            while not hi[m]:
                m -= 1
            ev.append([n, m]); n = m + 1
        else:
            n += 1
    out = []
    for a, b in ev:
        pre, post = max(0, a - 1), min(N - 1, b)
        # for single-frame event: pre=a-1, post=a
        A = mask_cap(T[pre]); B = mask_cap(T[post])
        P = float(np.abs(A - B).mean())
        L = b - a + 1
        kind = None; ratio = None
        tmag = float(np.mean(np.hypot(f["tx"][a:b + 1], f["ty"][a:b + 1])) * 3)  # px/f at 1080
        smag = float(np.mean(np.abs(f["sc"][a:b + 1])))
        if L >= 3:
            pre2, post2 = max(0, a - 1), min(N - 1, b + 1)
            A = mask_cap(T[pre2]); B = mask_cap(T[post2]); P = float(np.abs(A - B).mean())
            rs = []; al = []
            for k in range(a, b + 1):
                F = mask_cap(T[k]); d = (A - B).ravel(); y = (F - B).ravel()
                alpha = float(np.clip(d @ y / (d @ d + 1e-6), 0, 1))
                rs.append(float(np.abs(F - (alpha * A + (1 - alpha) * B)).mean())); al.append(alpha)
            ratio = float(np.mean(rs) / (P + 1e-6))
            mono = np.all(np.diff(al) <= 0.15)
            if P > 25 and ratio < 0.33 and mono:
                kind = "dissolve"
            elif P > 25:
                kind = "move" if (tmag > 30 or smag > 0.02) else "other"
            else:
                kind = "inshot"
        else:
            if P > 30 and hd[a:b + 1].max() > 0.25:
                kind = "cut"
            else:
                kind = "inshot"
        out.append(dict(a=int(a), b=int(b), len=int(L), P=round(P, 1), ratio=None if ratio is None else round(ratio, 2),
                        kind=kind, tmag=round(tmag, 1), smag=round(smag, 4), hdmax=round(float(hd[a:b + 1].max()), 2)))
    bounds = [e for e in out if e["kind"] in ("cut", "dissolve", "move", "other")]
    # shot segments: boundary at transition midpoint
    edges = [0] + [int((e["a"] + e["b"] + 1) // 2) for e in bounds] + [N]
    shots = [(edges[i], edges[i + 1] - 1) for i in range(len(edges) - 1) if edges[i + 1] - edges[i] > 0]
    json.dump(dict(N=int(N), events=out, shots=shots), open(f"{D}/{name}.shots.json", "w"), indent=0)
    return N, out, shots


if __name__ == "__main__":
    for nm in (sys.argv[1:] or ALL):
        N, ev, sh = analyse(nm)
        kinds = {}
        for e in ev:
            kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
        L = np.array([b - a + 1 for a, b in sh])
        print(f"{nm}: N={N} shots={len(sh)} kinds={kinds} shotlen mean={L.mean()/30:.2f}s median={np.median(L)/30:.2f}s min={L.min()} max={L.max()}")
        for e in ev:
            if e["kind"] != "inshot":
                print("   ", e)
