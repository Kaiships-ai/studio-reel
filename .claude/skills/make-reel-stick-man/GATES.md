# Gates

`node styles/stick-man/tools/gates.mjs --report <stats.txt> --in <mp4> --out <gates.txt>` prints PASS/FAIL per gate and
exits 1 on any FAIL. The stats come from `shot.mjs --film films/<slug> --frames 0-<last> --report <stats.txt> --in <mp4>`
(`--frames` is required; without `--in` the frame-difference lines are missing and those gates FAIL as "not in report").
Never change a threshold to pass a reel: fix the reel data or the kit, or show Kai the FAIL.

| Gate | Threshold | Measured as | Source |
|---|---|---|---|
| clear frames | ≥ 94 % | frame-to-frame YAVG difference ≥ 1.0, top 60 % of the frame at 270x288 (report a) | 4 reference videos (STYLE plan, section D) |
| still frames | < 1 % | YAVG difference < 0.2 (report a) | 4 reference videos (plan D) |
| camera speed | ≤ 25 px/f at 720p | peak camera motion, cuts and dissolves left out (report b) | reel 1 build target |
| frozen run | ≤ 8 f | longest run with every joint still, per actor in frame (report b, acting) | reel 1 build target |
| arm length ratio | ≤ 1.03 | (upper + fore arm) / rest arm length, per actor | reel 1 build target (no stretched arms) |
| joint change | ≤ 25 deg/f | largest one-frame change of a flex, foot pitch, torso or limb direction | reel 1 build target (no pops) |
| head never cut | never | head box above the top edge, any actor in frame | reel 1 review |
| small-figure run | ≤ 45 f | longest run where the largest figure in frame is under 30 % of the frame height (no figure = small) | reel 1 build target |
| hand-prop gap | ≤ 2 px at 1080p | hand dot to the held prop's grip socket (report d) | reel 1 review (props floating off hands) |
| collisions | none | any body point inside a set `COLLIDE` box, or torso in torso (report e) | reel 1 review (man inside a pillar) |
| close-up head x | 45-55 % | subject head centre x in settled `cu` frames (report f) | reel 1 review |
| mix loudness | -14 ± 0.5 LUFS | ffmpeg ebur128 integrated, on the mp4 audio | house target (`make-reel`, kai-reel-3d) |
| true peak | ≤ -1 dBTP | ffmpeg ebur128 true peak, on the mp4 audio | house target |
| colour YAVG | median 109-163 | signalstats YAVG, 2 frames a second, median | 7 reference frames, `STYLE.md` Màu |
| colour SATAVG | median 19-47 | signalstats SATAVG, same samples, median | 7 reference frames, `STYLE.md` Màu |

## Not scripted (eyes, on the 24-tile sheet and stills)

| Check | Pass when |
|---|---|
| Story reads with the sound off | each line's key action is visible on its word |
| Captions | 1-3 words, never over a face (report b: head box in caption band 66-78 % = never) |
| Blinks | every actor in frame blinks, gaps ~0.5-1.5 s (report b) |
| Feet | stance-foot slide small; no moonwalk (report b, eyes on the walk stills) |

## Reel 1 (`reel1_v4b`, approved by Kai 10/11) against these gates

12 PASS, 3 FAIL: frozen run 17 f (guard asleep, frames 310-326), joint change 29.2 deg (kai, frame 399, right upper arm),
small-figure run 177 f (frames 439-615, the cutaway act with props only). Kai approved the video with these open; a new
reel still has to pass, or the FAIL goes to Kai with a still. Output: `films/stick01-dye-pack/review/reel1_v4b-gates.txt`.
