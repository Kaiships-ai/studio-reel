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

### The judged gate: board reviewer (spawn it, never judge your own board)

Run `node styles/stick-man/tools/board.mjs films/<slug>` (writes `review/board.jpg`, no plan text on it), then spawn one
sub-agent with **model `sonnet`, effort `medium`** and exactly this prompt (fill `<slug>`). Save its JSON reply as
`films/<slug>/review/board-verdict.json`; gates.mjs reads it. A board changes (new reel data) = a new reviewer.

```text
You are an independent storyboard reviewer for a 30-second vertical explainer reel. You did not make it and you have no
other context. Open the image films/<slug>/review/board.jpg with the Read tool (absolute path under the library root).
It holds one still per spoken line; under each still are the line id and the words spoken on that line. The big white
words burned into each still are captions: ignore them as evidence.
For each line decide whether the still SHOWS what the words say, so a viewer with the sound off would get that line:
- shown = the key thing the words name is visible: the object, the action, the process (light bouncing, air rising, heat
  flowing), the number, the place, or the comparison.
- not shown = people standing or talking while the words describe something else; a thing named but not on screen;
  a process described but not drawn. A face reacting counts only when the words are about that reaction.
Be strict: if you have to guess or be generous, it is not shown.
Reply with JSON only, no prose, one entry per line on the board in order:
{"lines":[{"id":"l01","shown":true,"why":"what you see, 12 words or fewer"}]}
```

## Not scripted (eyes, on the 24-tile sheet and stills)

| Check | Pass when |
|---|---|
| Story reads with the sound off | each line's key action is visible on its word |
| Captions | 1-3 words, never over a face (report b: head box in caption band 66-78 % = never) |
| Blinks | every actor in frame blinks, gaps ~0.5-1.5 s (report b) |
| Feet | stance-foot slide small; no moonwalk (report b, eyes on the walk stills) |

## Reel 1 (`reel1_v4b`, approved by Kai 10/11) against these gates

14 PASS, 1 FAIL: joint change 29.2 deg (kai, frame 399, right upper arm). Story gates (storyboard written 10/11 after the
cut, `films/stick01-dye-pack/storyboard.json`): 6 computed PASS, board shown FAIL 70 % (l02, l03, l05 not shown in their one still; `review/board-verdict.json`).
Reel 2 (`stick02-black-robe`): duration 33.9 s, 1 set, 3 lines alike, board shown 33 % FAIL (`review/reel2-story-gates.txt`). Two rules settled 10/11: a face with
expr `sleep` never counts toward a frozen run, and a frame with no figure in it (prop-only cutaway) never counts toward
the small-figure run. Kai approved the video with these open; a new
reel still has to pass, or the FAIL goes to Kai with a still. Output: `films/stick01-dye-pack/review/reel1_v4b-gates.txt`.
