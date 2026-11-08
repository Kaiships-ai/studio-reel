"""gates.py: the 11 gates every Ten Million Views episode passes before anyone watches it.

    python episode/gates.py <episode folder>

Reads <episode>/<name>.mp4, episode.json, vo/vo.json and vo/vo.wav (the voice alone, no music). Prints one line per
gate, writes out/gates.json and exits 1 when a gate fails. The gates are the ones the real season's episode 1 passed
11/11 (85.5 s, 41 cuts, 2.04 s a cut). A gate the machine cannot measure says so instead of passing.

Shots come from the episode: one shot per beat, from the beat's first spoken word to the next beat's, then the vote
card to the end. `card` and `stats` beats are explain cards; `room`, `close`, `two` and `wide` show a face.
"""
import json
import os
import subprocess
import sys

EXPLAIN = {"card", "stats"}
FACE = {"room", "close", "two", "wide"}


def ff(*args):
    return subprocess.run(["ffmpeg", "-nostats", *args], capture_output=True, text=True).stderr


def probe(v):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", v],
                         capture_output=True, text=True).stdout
    j = json.loads(out)
    vs = next(s for s in j["streams"] if s["codec_type"] == "video")
    return float(j["format"]["duration"]), vs["width"], vs["height"], any(s["codec_type"] == "audio" for s in j["streams"])


def lufs(v):
    return float(ff("-i", v, "-af", "ebur128", "-f", "null", "-").split("Integrated loudness:")[1].split("I:")[1].split("LUFS")[0])


def cuts(v):
    out = ff("-i", v, "-vf", "select='gt(scene,0.2)',showinfo", "-an", "-f", "null", "-")
    return [float(x.split("pts_time:")[1].split()[0]) for x in out.splitlines() if "pts_time:" in x]


def gray(v, t, w, h):
    return subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", v, "-frames:v", "1", "-vf", f"scale={w}:{h},format=gray",
                           "-f", "rawvideo", "-"], capture_output=True).stdout


def luma(v, t):
    px = gray(v, t, 64, 114)
    return sum(px) / max(len(px), 1)


def faint(v, t, y0=0.40, y1=0.88):
    # share of faint grey pixels in the middle band: a ghost picture behind a card reads 0.07-0.08, a plain card <= 0.045
    w, h = 108, 192
    out = gray(v, t, w, h)
    px = [out[y * w + x] for y in range(int(h * y0), int(h * y1)) for x in range(w)]
    if not px:
        return 1.0
    bg = sorted(px)[len(px) // 2]
    return sum(1 for q in px if bg - 60 < q < bg - 6) / len(px)


def speech(wav):
    # spoken stretches of the voice-only file: silencedetect at -35 dB, 0.3 s
    out = ff("-i", wav, "-af", "silencedetect=n=-35dB:d=0.3", "-f", "null", "-")
    dur = probe_audio(wav)
    st = [float(l.split("silence_start:")[1]) for l in out.splitlines() if "silence_start:" in l]
    en = [float(l.split("silence_end:")[1].split("|")[0]) for l in out.splitlines() if "silence_end:" in l]
    segs, t0 = [], 0.0
    for a, b in zip(st, en + [dur] * (len(st) - len(en))):
        if a > t0:
            segs.append((t0, a))
        t0 = b
    if t0 < dur:
        segs.append((t0, dur))
    return segs


def probe_audio(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", f], capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def shots_of(ep, vo, dur):
    lines = vo["lines"]
    shots = []
    for i, (b, l) in enumerate(zip(ep["beats"], lines)):
        a = 0.0 if i == 0 else l["s"]
        e = lines[i + 1]["s"] if i + 1 < len(lines) else l["e"]
        shots.append({"id": l["id"], "a": a, "b": e, "kind": "explain" if b.get("shot") in EXPLAIN else "story",
                      "face": b.get("shot") in FACE, "expression": b.get("exp"), "idea": b.get("idea")})
    shots.append({"id": "vote", "a": shots[-1]["b"] if shots else 0.0, "b": dur, "kind": "vote", "face": False, "expression": None, "idea": "end"})
    return shots


def main():
    ep_dir = os.path.abspath(sys.argv[1])
    name = os.path.basename(ep_dir)
    v = os.path.join(ep_dir, f"{name}.mp4")
    ep = json.load(open(os.path.join(ep_dir, "episode.json")))
    vo = json.load(open(os.path.join(ep_dir, "vo", "vo.json")))
    R = []

    def g(gid, name_, ok, got):
        R.append({"id": gid, "gate": name_, "ok": ok, "got": got})

    d, w, h, au = probe(v)
    g("G1", "720x1280 (or 1080x1920 after approval), 80-90 s, with sound", (w, h) in ((720, 1280), (1080, 1920)) and 80 <= d <= 90 and au,
      f"{w}x{h}, {d:.1f} s, audio={au}")
    L = lufs(v)
    g("G2", "loudness -14 ± 1 LUFS", abs(L + 14) <= 1, f"{L:.1f} LUFS")
    c = cuts(v)
    gaps = [b - a for a, b in zip([0] + c, c + [d])]
    longest = max(gaps)
    at = ([0] + c)[gaps.index(longest)]
    g("G3a", "a cut every 3.0 s or faster on average", d / (len(c) + 1) <= 3.0, f"{len(c)} cuts, {d / (len(c) + 1):.2f} s a cut")
    g("G3b", "no shot held longer than 4.5 s", longest <= 4.5, f"longest {longest:.1f} s at {at:.1f} s")
    g("G7", "movement in the first second (a cut by 1.5 s)", bool(c) and c[0] <= 1.5, f"first cut {c[0]:.2f} s" if c else "no cut")
    shots = shots_of(ep, vo, d)
    ex = [s for s in shots if s["kind"] == "explain"]
    whites = [(s["id"], round(luma(v, (s["a"] + s["b"]) / 2))) for s in ex]
    g("G4", "at least 2 explain cards, each on a white or cream ground (luma > 180)", len(ex) >= 2 and all(l > 180 for _, l in whites),
      whites or "no explain card")
    ghost = [(s["id"], round(max(faint(v, s["a"] + (s["b"] - s["a"]) * k) for k in (0.25, 0.5, 0.75)), 3)) for s in ex]
    g("G4b", "explain cards on a plain ground, no faint picture behind (< 6 %)", bool(ex) and all(f < 0.06 for _, f in ghost), ghost or "no explain card")
    fs = [s for s in shots if s["face"]]
    fsec = sum(s["b"] - s["a"] for s in fs)
    exps = sorted({s["expression"] for s in fs if s["expression"]})
    g("G5", "a face on screen for 15 s or more, with 3+ expressions", fsec >= 15 and len(exps) >= 3, f"{fsec:.1f} s, {exps}")
    ideas = [s["idea"] for s in shots if s["idea"] and s["idea"] != "end"]
    if len(ideas) < len(shots) - 1:
        g("G6", "each idea once", None, "not measured: beats have no \"idea\" tag")
    else:
        dup = sorted({i for i in ideas if ideas.count(i) > 1})
        g("G6", "each idea once", not dup, dup or "no repeat")
    W = speech(os.path.join(ep_dir, "vo", "vo.wav"))
    end = shots[-1]["a"]
    W = [x for x in W if x[0] < end]
    sil = [(W[i][1], W[i + 1][0] - W[i][1]) for i in range(len(W) - 1) if W[i + 1][0] - W[i][1] > 0.6]
    lead = W[0][0] if W else d
    cover = (W[-1][1] - lead - sum(s for _, s in sil)) / max(end, 1) if W else 0
    long_ = [(round(a, 1), round(s, 1)) for a, s in sil if s > 1.2]
    g("G8", "voice runs on: covers 90 %+ up to the vote, at most one pause over 0.6 s, none over 1.2 s",
      cover >= 0.90 and len(sil) <= 1 and not long_, f"covers {cover:.0%}, {len(sil)} pause(s) over 0.6 s, long: {long_ or 'none'}")
    mute = [s["id"] for s in shots[:-1] if not any(a < s["b"] and b > s["a"] for a, b in W)]
    g("G9", "every shot but the vote has voice", not mute, mute or "all")

    os.makedirs(os.path.join(ep_dir, "out"), exist_ok=True)
    json.dump({"episode": name, "gates": R}, open(os.path.join(ep_dir, "out", "gates.json"), "w"), indent=1)
    passed = sum(1 for r in R if r["ok"])
    for r in R:
        mark = "✓" if r["ok"] else "–" if r["ok"] is None else "✗"
        print(f"{mark} {r['id']} {r['gate']}: {r['got']}")
    measured = [r for r in R if r["ok"] is not None]
    print(f"\n{passed}/{len(measured)} gates pass" + (f" · {len(R) - len(measured)} not measured" if len(measured) < len(R) else ""))
    sys.exit(0 if passed == len(measured) else 1)


if __name__ == "__main__":
    main()
