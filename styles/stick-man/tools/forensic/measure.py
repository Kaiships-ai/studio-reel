"""Forensic measures of one rendered reel against the reference targets (FORENSIC.md, ranked fixes 1-10).
The scripts next to this file are the ones that measured the four reference shorts, so our numbers and theirs come
from the same code. Used by tools/gates.mjs ("forensic gates"); also runs alone:
  python styles/stick-man/tools/forensic/measure.py <reel.mp4> --words films/x/vo/words.json [--out x-forensic.json] [--keep 1]
Prints one JSON object: { metrics: {...}, gates: [[name, ok, got, want], ...] }. ~2-4 min for a 30 s reel.
"""
import sys, os, json, subprocess, tempfile, shutil, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("mp4"); ap.add_argument("--words", required=True); ap.add_argument("--out"); ap.add_argument("--keep", default="0")
A = ap.parse_args()

D = tempfile.mkdtemp(prefix="stick-forensic-"); nm = "reel"
env = {**os.environ, "FORENSIC_DATA": D, "FORENSIC_NAMES": nm}
os.symlink(os.path.abspath(A.mp4), f"{D}/{nm}.mp4")
ff = lambda *a: subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{D}/{nm}.mp4", *a], check=True)
ff("-vf", "scale=90:160:flags=area", "-pix_fmt", "rgb24", "-f", "rawvideo", f"{D}/{nm}.thumb.rgb")
ff("-vn", "-ac", "2", "-ar", "48000", f"{D}/{nm}.48k.wav")
W = json.load(open(A.words))
json.dump([{"start": 0, "end": 0, "text": "", "words": [{"w": w["word"], "s": w["t0"], "e": w["t1"], "p": 1} for w in W]}], open(f"{D}/{nm}.asr.json", "w"))
py = sys.executable
for s in ["perframe", "faces"]:
    subprocess.run([py, "-I", f"{HERE}/{s}.py", nm], env=env, check=True, stdout=subprocess.DEVNULL)
for s in ["shots", "moves", "acting", "lines", "render", "audio"]:
    subprocess.run([py, "-I", f"{HERE}/{s}.py", nm], env=env, check=True, stdout=subprocess.DEVNULL)

S = json.load(open(f"{D}/{nm}.shots.json")); N = S["N"]; dur = N / 30
ev = [e for e in S["events"] if e["kind"] != "inshot"]
kinds = {}
for e in ev: kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
dis = [e["len"] for e in ev if e["kind"] == "dissolve"]
L = np.array([b - a + 1 for a, b in S["shots"]])
M = json.load(open(f"{D}/moves.json")); mv = M["moves"][nm]; ms = M["stats"][nm]
first = min([e["a"] for e in ev] + [m["a"] for m in mv] + [N])
R = json.load(open(f"{D}/render.json"))["res"][nm]; per = R["per_shot"]
ya = [p["yavg"] for p in per]
LN = json.load(open(f"{D}/lines.json")).get(nm, {})
AC = json.load(open(f"{D}/acting.json"))["stats"][nm]
AU = json.load(open(f"{D}/audio.json"))[nm]
m = dict(
    dur_s=round(dur, 2), boundaries=len(ev), kinds=kinds,
    hard_cuts_per10s=round(kinds.get("cut", 0) / dur * 10, 2),
    dissolve_share=round(len(dis) / max(1, len(ev)), 2), dissolve_len_med=float(np.median(dis)) if dis else None,
    shot_len_cv=round(float(L.std() / L.mean()), 2), shot_len_med_s=round(float(np.median(L)) / 30, 2), shot_len_p90_s=round(float(np.percentile(L, 90)) / 30, 2),
    move_peak_p90=ms["move_peak_p90"], moves_per10s=ms["moves_per10s"], time_in_moves_pct=ms["time_in_moves_pct"], drift_med=ms["drift_med_pxf"],
    first_change_f=int(first),
    yavg_shot_std=round(float(np.std(ya)), 1) if ya else None, yavg_shot_min=round(min(ya), 1) if ya else None,
    yavg_shot_med=round(float(np.median(ya)), 1) if ya else None,
    outline_side_ratio=LN.get("rim_side_ratio_med"), outline_pct_W=LN.get("rim_pct_W_med"),
    mouth_cv=AC.get("mouth_area_cv_med"), mouth_tracks_pct=AC.get("mouth_tracks_pct"),
    bed_vs_voice_dB=AU["bed_minus_voice_dB"], bass_voice_minus_pause_dB=AU["low_band_speech_minus_pause_dB"], air_in_pause_dB=AU["hi_band_share_in_pause_dB"],
)
# targets: FORENSIC.md "Ranked fix list", Top 10 (reference ranges in brackets)
def rng(v, lo, hi): return v is not None and lo <= v <= hi
G = [
    ("hard cuts", m["hard_cuts_per10s"] <= 0.2, f'{m["hard_cuts_per10s"]} /10 s ({kinds})', "<= 0.2 per 10 s (ref 0-0.15)"),
    ("dissolves", m["dissolve_share"] >= 0.5 and rng(m["dissolve_len_med"], 7, 12), f'{round(100 * m["dissolve_share"])} % of boundaries, median {m["dissolve_len_med"]} f', ">= 50 %, median 7-12 f (ref 53 %, ~9 f)"),
    ("rush peak", m["move_peak_p90"] >= 90, f'p90 {m["move_peak_p90"]} px/f', ">= 90 px/f at 1080 (ref 97-106)"),
    ("time in moves", m["time_in_moves_pct"] >= 30, f'{m["time_in_moves_pct"]} %, {m["moves_per10s"]} moves /10 s', ">= 30 % (ref 33-64)"),
    ("shot length CV", m["shot_len_cv"] >= 0.6, f'{m["shot_len_cv"]} (median {m["shot_len_med_s"]} s, p90 {m["shot_len_p90_s"]} s)', ">= 0.6 (ref 0.57-1.31)"),
    ("light per place", (m["yavg_shot_std"] or 0) >= 20 and (m["yavg_shot_min"] or 999) < 95 and rng(m["yavg_shot_med"], 105, 130),
     f'shot YAVG std {m["yavg_shot_std"]}, min {m["yavg_shot_min"]}, median {m["yavg_shot_med"]}', "std >= 20, min < 95, median 105-130 (ref 23-25, 65-91, 104-129)"),
    ("first move", m["first_change_f"] <= 30, f'frame {m["first_change_f"]}', "<= f30 (ref f3-61, median ~17)"),
    ("outline thick/thin", rng(m["outline_side_ratio"], 1.7, 2.5), f'{m["outline_side_ratio"]} (rim {m["outline_pct_W"]} % W)', "1.7-2.5 (ref 1.65-2.47)"),
    ("mouth movement", (m["mouth_cv"] or 0) >= 0.4, f'mouth area CV {m["mouth_cv"]} ({m["mouth_tracks_pct"]} % of tracks)', ">= 0.4 (ref 0.33-0.56)"),
    ("bed in pauses", rng(m["bed_vs_voice_dB"], -12, -10), f'{m["bed_vs_voice_dB"]} dB vs voice', "-12..-10 dB (ref -10.3..-11.9)"),
]
out = dict(metrics=m, gates=[[n, bool(ok), got, want] for n, ok, got, want in G])
s = json.dumps(out, indent=1, default=float)
if A.out: open(A.out, "w").write(s)
print(s)
if A.keep != "1": shutil.rmtree(D, ignore_errors=True)
else: print("kept", D, file=sys.stderr)
