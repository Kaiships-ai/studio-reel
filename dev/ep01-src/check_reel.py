#!/usr/bin/env python3
"""Gate máy cho 1 tập Ten Million Views. Dùng: python3 -I check_reel.py <video.mp4> [shots.json] [vo.wav]
shots.json (builder xuất ra): [{"id","a","b","kind":"story|explain|card|vote","idea":"tag duy nhất; thẻ cuối bắt đầu bằng end","face":bool,"expression":"exp_*|null"}]
G8/G9: có vo.wav (giọng riêng, không nhạc) thì đo bằng ffmpeg silencedetect; không có thì cần whisper-cli + model (WHISPER_MODEL, mặc định ~/.cache/whisper/ggml-large-v3-turbo.bin).
In từng gate ĐẠT/TRƯỢT, thoát 1 nếu có gate trượt. Không tự chấm cái máy không đo được: phần đó cho reviewer + Kai."""
import json, os, subprocess, sys, tempfile, statistics

def run(*a): return subprocess.run(a, capture_output=True, text=True).stderr + subprocess.run(a, capture_output=True, text=True).stdout

def probe(v):
    j = json.loads(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration:stream=codec_type,width,height","-of","json",v],capture_output=True,text=True).stdout)
    vs = next(s for s in j["streams"] if s["codec_type"]=="video")
    return float(j["format"]["duration"]), vs["width"], vs["height"], any(s["codec_type"]=="audio" for s in j["streams"])

def lufs(v):
    out = subprocess.run(["ffmpeg","-nostats","-i",v,"-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
    return float(out.split("Integrated loudness:")[1].split("I:")[1].split("LUFS")[0])

def cuts(v):
    out = subprocess.run(["ffmpeg","-i",v,"-vf","select='gt(scene,0.2)',showinfo","-an","-f","null","-"],capture_output=True,text=True).stderr
    return [float(x.split("pts_time:")[1].split()[0]) for x in out.splitlines() if "pts_time:" in x]

def luma(v, t):
    out = subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",v,"-frames:v","1","-vf","scale=64:-1,format=gray","-f","rawvideo","-"],capture_output=True).stdout
    return sum(out)/max(len(out),1)

def faint(v, t, y0=0.40, y1=0.88):
    # share of faint grey pixels (bg-60..bg-6) in the middle band: a ghost sketch behind a card reads 0.07-0.08, a plain card <= 0.045
    W, H = 108, 192
    out = subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",v,"-frames:v","1","-vf",f"scale={W}:{H},format=gray","-f","rawvideo","-"],capture_output=True).stdout
    px = [out[y*W+x] for y in range(int(H*y0), int(H*y1)) for x in range(W)]
    if not px: return 1.0
    bg = sorted(px)[len(px)//2]
    return sum(1 for q in px if bg-60 < q < bg-6) / len(px)

WHISPER_MODEL = os.path.expanduser(os.environ.get("WHISPER_MODEL", "~/.cache/whisper/ggml-large-v3-turbo.bin"))

def words(v):
    """Từ + giây bằng whisper-cli (whisper.cpp). Trả [(from,to)]."""
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "a.wav")
        subprocess.run(["ffmpeg","-v","error","-y","-i",v,"-ar","16000","-ac","1",wav], check=True)
        subprocess.run(["whisper-cli","-m",WHISPER_MODEL,"-f",wav,"-l","en","-ml","1","-oj","-of",os.path.join(d,"w"),"-np"], capture_output=True, check=True)
        W = json.load(open(os.path.join(d,"w.json")))["transcription"]
    return [(w["offsets"]["from"]/1000, w["offsets"]["to"]/1000) for w in W if w["text"].strip() and not w["text"].strip().startswith("[")]

def speech_from_stem(wav):
    """Đoạn có giọng từ file giọng riêng (không nhạc) bằng silencedetect −35 dB, ≥ 0.3 s. Trả [(from,to)]."""
    out = subprocess.run(["ffmpeg","-nostats","-i",wav,"-af","silencedetect=n=-35dB:d=0.3","-f","null","-"],capture_output=True,text=True).stderr
    dur = float(json.loads(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","json",wav],capture_output=True,text=True).stdout)["format"]["duration"])
    st = [float(l.split("silence_start:")[1]) for l in out.splitlines() if "silence_start:" in l]
    en = [float(l.split("silence_end:")[1].split("|")[0]) for l in out.splitlines() if "silence_end:" in l]
    S = list(zip(st, en + [dur]*(len(st)-len(en))))
    segs, t0 = [], 0.0
    for a, b in S:
        if a > t0: segs.append((t0, a))
        t0 = b
    if t0 < dur: segs.append((t0, dur))
    return segs

def main():
    v = sys.argv[1]; shots = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
    R = []
    def g(name, ok, got): R.append((name, ok, got))
    d, w, h, au = probe(v)
    g("G1 1080x1920, 80–90 s, có tiếng", (w,h)==(1080,1920) and 80<=d<=90 and au, f"{w}x{h}, {d:.1f}s, audio={au}")
    L = lufs(v); g("G2 độ to −14 ±1 LUFS", abs(L+14)<=1, f"{L:.1f}")
    c = cuts(v); gaps = [b-a for a,b in zip([0]+c, c+[d])]
    g("G3a nhịp cắt trung bình ≤ 3.0 s", d/(len(c)+1) <= 3.0, f"{len(c)} cắt, {d/(len(c)+1):.2f} s/cắt")
    g("G3b không cảnh nào đứng > 4.5 s", max(gaps) <= 4.5, f"dài nhất {max(gaps):.1f}s tại {c[gaps.index(max(gaps))-1] if gaps.index(max(gaps)) else 0:.1f}s")
    g("G7 giây đầu có chuyển động (cắt hoặc đổi cảnh ≤ 1.5 s)", bool(c) and c[0] <= 1.5, f"cắt đầu {c[0] if c else None}")
    if shots is None:
        g("G4–G6 cần shots.json", False, "thiếu shots.json"); 
    else:
        ex = [s for s in shots if s["kind"]=="explain"]
        whites = [(s["id"], round(luma(v,(s["a"]+s["b"])/2))) for s in ex]
        g("G4 mọi cảnh giải thích nền trắng/kem (độ sáng > 180)", len(ex)>=2 and all(l>180 for _,l in whites), whites)
        ghost = [(s["id"], round(max(faint(v, s["a"]+(s["b"]-s["a"])*k) for k in (0.25,0.5,0.75)),3)) for s in ex]
        g("G4b thẻ giải thích nền thuần, không hình mờ phía sau (nét mờ < 6%)", all(f < 0.06 for _,f in ghost), ghost)
        fs = [s for s in shots if s.get("face")]
        fsec = sum(s["b"]-s["a"] for s in fs); exps = {s["expression"] for s in fs if s.get("expression")}
        g("G5 thấy mặt ≥ 15 s và ≥ 3 biểu cảm khác nhau", fsec>=15 and len(exps)>=3, f"{fsec:.1f}s, {sorted(exps)}")
        ideas = [s["idea"] for s in shots]; dup = sorted({i for i in ideas if ideas.count(i)>1})
        g("G6 mỗi ý chỉ xuất hiện 1 lần (idea không trùng)", not dup, dup or "không trùng")
    W = speech_from_stem(sys.argv[3]) if len(sys.argv) > 3 else words(v)
    end = max((s["a"] for s in (shots or []) if s.get("idea","").startswith("end")), default=d)
    W = [x for x in W if x[0] < end]
    sil = [(W[i][1], W[i+1][0]-W[i][1]) for i in range(len(W)-1) if W[i+1][0]-W[i][1] > 0.6]
    lead = W[0][0] if W else d
    cover = (W[-1][1]-lead - sum(g for _,g in sil)) / max(end, 1) if W else 0
    long_ = [(round(a,1), round(g,1)) for a,g in sil if g > 1.2]
    g("G8 giọng liền: phủ ≥ 90% tới thẻ cuối, lặng > 0.6 s ≤ 1 lần và không lần nào > 1.2 s",
      cover >= 0.90 and len(sil) <= 1 and not long_, f"phủ {cover:.0%}, {len(sil)} lần lặng > 0.6 s, dài: {long_ or 'không'}")
    if shots is not None:
        mute = [s["id"] for s in shots if not s.get("idea","").startswith("end") and not any(a < s["b"] and b > s["a"] for a,b in W)]
        g("G9 mọi shot (trừ thẻ cuối) có giọng đọc", not mute, mute or "đủ")
    bad = 0
    for n, ok, got in R:
        print(("ĐẠT   " if ok else "TRƯỢT ") + n + " · " + str(got)); bad += not ok
    print(f"\n{len(R)-bad}/{len(R)} gate đạt"); sys.exit(1 if bad else 0)

if __name__ == "__main__": main()
