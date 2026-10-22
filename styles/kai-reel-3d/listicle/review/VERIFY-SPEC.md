# listicle · verifier spec (round N) · from reel63 v2 (Kai 100/10)

Orchestrator: copy to the reel's `review/`, fill every `<…>`.

Project: `films/<reelNN-slug>/` in the studio-reel library (every command through `pixi run`). You did not build this.
Output under test: `renders/<reelNN-slug>.mp4` (1080×1920, 30 fps, motion blur `--sub 4`, audio `audio/mix_earshot.wav`).
The bar is reel63 v2 (Kai 100/10): ADHD camera, motion ≥ 12, SFX audible (hits ≈ −6.5 dB vs the voice), bright grade. Rules: `styles/kai-reel-3d/LISTICLE.md`
(frame table + step 7 + step 8 + hard rules) and `STORYBOARD.md` (camera-beat table + hard rules). Facts: `BRIEF.md`, script `vo/script.json`.

**Yardstick rule (v1 lesson):** measure every audio/visual claim with the yardstick the RULE names. SFX vs words = 2–8 kHz band only
(not full band). Camera = ADHD: fast moves are allowed and wanted; only a hidden 1-frame snap (a jump with no motion around it) is banned.
If you use another yardstick, say so and do not mark ❌ on it.

## Checks (each ✅ cites a number or a frame; each ❌ names the owner file)
1. **Hook 0–3 s** (score /10, bar 8): motion from frame 0, an event every ~0.3 s, a hit sound on frame 0, clear "don't start" story.
2. **Motion vs reference:** `review/motion.py <mp4> <one window per chapter: t0+0.15-t1-0.15> <end card window>`
   and `review/motion.py review/ref-measure/ref10.mp4` (ref 12.0 / 22.8). Target: every chapter median ≥ 12 (end card window ≥ 6). Also say
   if any chapter feels TOO busy to read (reel63 c3 read 22 and was fine).
3. **Camera beats:** a beat every 1–1.5 s keyed to a word, ECU ↔ WIDE at least every 2 s (spot-check against the STORYBOARD camera-beat table).
   Hidden snaps: `node review/ref-measure/camspeed.mjs 2>/dev/null | pixi run python review/snaps.py` → 0. `ffmpeg … freezedetect=n=0.003:d=0.7` → 0.
4. **Visuals per chapter (c0…c5):** contact sheets from the MP4 (ffmpeg, e.g. 4 fps tiles). Eyes visible on every readable Clawd, nothing
   over a face, plates/numbers fully in frame inside x 0.12–0.8 and readable (≥ 46 px glyphs), title + captions clear, chapter payoff reads
   (c0 four crates 1 2 3 4, c1 −54% / −20% / fin, c2 LIMIT / 350+ / 1.5B, c3 graph, c4 25 + SPEC…SHIP + rear wing, c5 launch + end card).
5. **Facts + captions:** every number on screen is in the script; captions match the words.
6. **Audio (LISTICLE step 7):** `pixi run python review/levels.py` (stems + per-hit + 2–8 kHz) and
   ebur128 on the MP4. Targets: MP4 −14 LUFS (TP ≤ −1), SFX stem ≈ −20 LUFS, each hit 4–8 dB under the voice (median), 0 words with SFX within
   6 dB in 2–8 kHz. Also LISTEN-proxy: are hits audible over the voice (not buried) and is any hit harsh/clipping?
   `review/gate.py` (orchestrator ran it): judge any FAIL row with the rule's yardstick (reel63: 2–3 'SFX vs words' windows at −64 dBFS in voice gaps = false alarm).
7. **Tech:** video = audio ±1 frame (ffprobe durations), 1080×1920, 30 fps.

## Output
Append `## Round N · <date> · renders/<reelNN-slug>.mp4` to `REVIEW.md`: one table row per check/segment
(`| # | time | area | status | note (number) | fix item (owner file) |`), counts (✅ / ❌), hook /10. Never edit any other file.
Report back ≤ 25 lines: counts, hook score, the ❌ list with owner files, and anything you could not measure.
