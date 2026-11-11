"""Audio measures: loudness, bed level, pauses (energy VAD), non-speech transient density, ducking proxy."""
import sys, json, subprocess, re
import numpy as np
import soundfile as sf
from scipy import signal
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from lib import asr, ALL, D

res = {}
for nm in ALL:
    a, sr = sf.read(f"{D}/{nm}.48k.wav", dtype="float32")
    x = a.mean(1) if a.ndim == 2 else a
    # loudness via ffmpeg ebur128
    o = subprocess.run(["ffmpeg", "-nostats", "-i", f"{D}/{nm}.48k.wav", "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]); LRA = float(re.findall(r"LRA:\s+(-?[\d.]+) LU", o)[-1])
    TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", o)[-1])
    hop = 480; nfft = 2048
    f, t, Z = signal.stft(x, sr, nperseg=nfft, noverlap=nfft - hop, boundary=None)
    P = np.abs(Z) ** 2
    def band(lo, hi):
        m = (f >= lo) & (f < hi); return P[m].sum(0)
    voice = band(300, 3400); low = band(30, 150); hi = band(5000, 14000); tot = P.sum(0)
    vdb = 10 * np.log10(voice + 1e-12)
    # energy VAD on voice band: speech frames are within 18 dB of the 90th percentile
    ref = np.percentile(vdb, 90)
    sp = vdb > ref - 18
    # smooth
    sp = signal.medfilt(sp.astype(float), 5) > 0.5
    # pauses = runs of non-speech >= 120 ms (12 hops)
    runs = []; i = 0; T = len(sp)
    while i < T:
        if not sp[i]:
            j = i
            while j < T and not sp[j]:
                j += 1
            runs.append((i, j - i)); i = j
        else:
            i += 1
    # ignore leading/trailing
    runs = [r for r in runs if r[0] > 0 and r[0] + r[1] < T]
    pz = np.array([r[1] * 10 for r in runs if r[1] >= 12])  # ms
    dur = len(x) / sr
    # bed level: median total-power dB in pause frames vs speech frames
    tdb = 10 * np.log10(tot + 1e-12)
    pmask = ~sp
    bed_minus_voice = float(np.median(tdb[pmask]) - np.median(tdb[sp])) if pmask.any() else None
    lowdb = 10 * np.log10(low + 1e-12)
    duck = float(np.median(lowdb[sp]) - np.median(lowdb[pmask])) if pmask.any() else None
    # transients: positive spectral flux (log), peaks
    L = np.log(P + 1e-10)
    flux = np.maximum(L[:, 1:] - L[:, :-1], 0).mean(0)
    flux = np.r_[0, flux]
    thr = np.median(flux) + 3.0 * np.std(flux)
    pk, _ = signal.find_peaks(flux, height=thr, distance=8)
    tt = t[pk]
    j, w = asr(nm)
    ws = np.array([q["s"] for q in w])
    nonspeech = [p for p in tt if np.min(np.abs(ws - p)) > 0.06]
    # strong broadband hits (>= 8 dB jump in 20 ms over whole spectrum) away from word onsets
    jump = tdb[2:] - tdb[:-2]
    hp, _ = signal.find_peaks(jump, height=8, distance=10)
    hits = [t[p + 1] for p in hp if np.min(np.abs(ws - t[p + 1])) > 0.06]
    # high band energy share during pauses (whooshes / risers)
    hishare_p = float(np.median(10 * np.log10(hi[pmask] + 1e-12) - tdb[pmask])) if pmask.any() else None
    r = dict(I_LUFS=I, LRA=LRA, TP_dBFS=TP, speech_frac=round(float(sp.mean()), 3),
             pauses_ge120ms=int(len(pz)), pauses_per10s=round(len(pz) / dur * 10, 2),
             pause_med_ms=int(np.median(pz)) if len(pz) else 0, pause_p90_ms=int(np.percentile(pz, 90)) if len(pz) else 0,
             pause_max_ms=int(pz.max()) if len(pz) else 0,
             bed_minus_voice_dB=round(bed_minus_voice, 1), low_band_speech_minus_pause_dB=round(duck, 1),
             transients_per10s=round(len(tt) / dur * 10, 1), nonspeech_transients_per10s=round(len(nonspeech) / dur * 10, 1),
             hits_per10s=round(len(hits) / dur * 10, 1), hi_band_share_in_pause_dB=round(hishare_p, 1))
    res[nm] = r
    json.dump(dict(nonspeech=[float(v) for v in nonspeech], hits=[float(v) for v in hits],
                   pauses=[[int(q[0] * 10), int(q[1] * 10)] for q in runs if q[1] >= 12]), open(f"{D}/{nm}.audio_events.json", "w"))
    print(nm, r, flush=True)
json.dump(res, open(f"{D}/audio.json", "w"), indent=1)
