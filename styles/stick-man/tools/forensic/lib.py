import json
import numpy as np

D = __import__("os").environ["FORENSIC_DATA"]
ALL = __import__("os").environ.get("FORENSIC_NAMES", "reel").split(",")


def load(name):
    z = np.load(f"{D}/{name}.frames.npz")
    cols = list(z["cols"]); a = z["data"]
    return {c: a[:, i] for i, c in enumerate(cols)}


def cuts(f, thr=0.30, ratio=3.0):
    """hard cuts: frame n where hist distance to n-1 is high and well above local median."""
    hd = f["hd"]; d1 = f["d1"]; N = len(hd)
    out = []
    for n in range(1, N):
        lo, hi = max(1, n - 6), min(N, n + 7)
        loc = np.median(np.r_[hd[lo:n], hd[n + 1:hi]]) if hi - lo > 1 else 0
        score = hd[n]
        if (score > thr and score > ratio * (loc + 0.02)) or (d1[n] > 38 and d1[n] > ratio * (np.median(np.r_[d1[lo:n], d1[n+1:hi]]) + 1)):
            out.append(n)
    # merge adjacent detections (keep max)
    merged = []
    for n in out:
        if merged and n - merged[-1] <= 2:
            if hd[n] > hd[merged[-1]]:
                merged[-1] = n
        else:
            merged.append(n)
    return merged


def asr(name):
    j = json.load(open(f"{D}/{name}.asr.json"))
    words = [w for s in j for w in s["words"]]
    return j, words
