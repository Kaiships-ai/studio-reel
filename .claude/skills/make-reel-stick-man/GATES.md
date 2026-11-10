# Gates

`node styles/stick-man/tools/gates.mjs --report <stats.txt> --in <mp4> --film films/<slug> --out <gates.txt>` prints PASS/FAIL
per gate (15 picture/sound gates, then 7 story gates) and exits 1 on any FAIL. The stats come from `shot.mjs --film films/<slug> --frames 0-<last> --report <stats.txt> --in <mp4>`
(`--frames` is required; without `--in` the frame-difference lines are missing and those gates FAIL as "not in report").
Never change a threshold to pass a reel: fix the reel data or the kit, or show Kai the FAIL.

| Gate | Threshold | Measured as | Source |
|---|---|---|---|
| clear frames | ≥ 94 % | frame-to-frame YAVG difference ≥ 1.0, top 60 % of the frame at 270x288 (report a) | 4 reference videos (STYLE plan, section D) |
| still frames | < 1 % | YAVG difference < 0.2 (report a) | 4 reference videos (plan D) |
| camera speed | ≤ 25 px/f at 720p | peak camera motion, cuts and dissolves left out (report b) | reel 1 build target |
| frozen run | ≤ 8 f | longest run with every joint still, per actor in frame; expr `sleep` exempt (report b, acting) | reel 1 build target |
| arm length ratio | ≤ 1.03 | (upper + fore arm) / rest arm length, per actor | reel 1 build target (no stretched arms) |
| joint change | ≤ 25 deg/f | largest one-frame change of a flex, foot pitch, torso or limb direction; the FAIL line lists the worst actor's top 5 frames (report: `joint change top 5`, `frames over 25 deg`) | reel 1 build target (no pops) |
| head never cut | never | head box above the top edge, any actor in frame | reel 1 review |
| small-figure run | ≤ 45 f | longest run where the largest figure in frame is under 30 % of the frame height (a frame with no figure resets the run) | reel 1 build target |
| hand-prop gap | ≤ 2 px at 1080p | hand dot to the held prop's grip socket (report d) | reel 1 review (props floating off hands) |
| collisions | none | any body point inside a set `COLLIDE` box, or torso in torso (report e) | reel 1 review (man inside a pillar) |
| close-up head x | 45-55 % | subject head centre x in settled `cu` frames (report f) | reel 1 review |
| mix loudness | -14 ± 0.5 LUFS | ffmpeg ebur128 integrated, on the mp4 audio | house target (`make-reel`, kai-reel-3d) |
| true peak | ≤ -1 dBTP | ffmpeg ebur128 true peak, on the mp4 audio | house target |
| colour YAVG | median 109-163 | signalstats YAVG, 2 frames a second, median | 7 reference frames, `STYLE.md` Màu |
| colour SATAVG | median 19-47 | signalstats SATAVG, same samples, median | 7 reference frames, `STYLE.md` Màu |

## Story gates (`--film`: storyboard.json against `__dbg`, no human)

A line's window = its first word to the next line's first word. `__dbg` rows carry `set`, `camera.shot` and `seen` (every set
prop and `make` effect shown, in front of the camera and covering ≥ 0.2 % of the frame). gates.mjs runs `shot.mjs --dbg`
itself, or takes `--dbg <jsonl>`.

| Gate | Threshold | Measured as | Why |
|---|---|---|---|
| duration | 27-33 s | frames / 30 | 30 s reels; reel 2 ran 33.9 s |
| distinct sets | ≥ 3 | sets on screen ≥ 15 frames each (a `cutaway` act counts as a set) | reel 2: one street for 34 s |
| shot variety | ≤ 2 lines alike | each line's main set + shot kind (most frames in its window); longest run of equal lines | no three lines in the same framing |
| storyboard entries | every line | an entry per `vo/script.json` line | the plan exists before reel data |
| props / fx used | ≥ 40 % of lines | lines whose entry lists a prop or fx and at least one is seen | beyond standing and talking |
| props / fx seen | all | every listed prop / fx seen ≥ 3 frames in its line's window | the plan is really on screen |
| board shown | ≥ 85 % | judged: `review/board-verdict.json` from the reviewer below | every spoken line illustrated |

### The judged gate: board reviewers (never judge your own board)

Run it once, after preview (stage 7): `node styles/stick-man/tools/board.mjs films/<slug> --judge 3`. It renders
`review/board.jpg` (one image ≤ 1560 px: two stills per line, A on the entry's `still` word, B at the line's fx peak, the
spoken words burned under each pair, no plan text) and sends it inline to 3 independent headless `claude -p` reviews
(sonnet, effort medium, no tools, no settings, empty cwd); a line is shown when 2 of 3 say shown. Writes
`review/board-verdict.json` (votes, reasons, tokens per review); gates.mjs reads it. New reel data = run it again.
The prompt lives in `board.mjs` (`prompt()`); `--prompt 1` prints it with the absolute board path, for an Agent-tool
reviewer when `claude` is not on PATH (that route measured ~80k tokens a review, the headless one ~4.1-4.7k).

Measured 10/11 (`films/*/review/board-verdict-*.json`): robe board 100 % in 3 of 3 gates (15 reviews, 1 split vote);
reel 1 board, 15 single reviews 90-100 %, both-of-2 pairs 80-100 %, 2-of-3 gates 100, 100, 100 % → 2 of 3 is the rule.
The old one-still board with one reviewer scored the same robe content 89 % then 56 %.

## Not scripted (eyes, on the 30-tile sheet and stills)

| Check | Pass when |
|---|---|
| Story reads with the sound off | each line's key action is visible on its word |
| Captions | 1-3 words, never over a face (report b: head box in caption band 66-78 % = never) |
| Blinks | every actor in frame blinks, gaps ~0.5-1.5 s (report b) |
| Feet | stance-foot slide small; no moonwalk (report b, eyes on the walk stills) |

## Reel 1 (`reel1_v4b`, approved by Kai 10/11) against these gates

14 PASS, 1 FAIL: joint change 29.2 deg (kai, frame 399, right upper arm). Story gates (storyboard written 10/11 after the
cut, `films/stick01-dye-pack/storyboard.json`): 6 computed PASS, board shown FAIL 70 % (one still). `reel1_v5` (10/11, p7):
same picture plus a LOVELY DAY! speech bubble (l03, `dof: 0` on that close-up) and a ?! stamp (l06), l05 still word
`explodes`; board 100 % (3 of 3 gates), all 7 story gates PASS; joint change still the one FAIL (29.9 deg, kai f401: the
same on the data without the stamps, engine drift since v4b). Output: `films/stick01-dye-pack/review/reel1_v5-gates.txt`.
Reel 2 (`stick02-black-robe`): duration 33.9 s, 1 set, 3 lines alike, board shown 33 % FAIL (`review/reel2-story-gates.txt`). Two rules settled 10/11: a face with
expr `sleep` never counts toward a frozen run, and a frame with no figure in it (prop-only cutaway) never counts toward
the small-figure run. Kai approved the video with these open; a new
reel still has to pass, or the FAIL goes to Kai with a still.
