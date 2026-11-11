# Gates

`node styles/stick-man/tools/gates.mjs --report <stats.txt> --in <mp4> --film films/<slug> --out <gates.txt>` prints PASS/FAIL
per gate (21 picture, sound, acting and look gates, 10 forensic gates, then 20 story gates: story, shot grammar and sizes, open on the verb, world and fx, acting plan, board, style judge, blind test) and exits 1 on any FAIL. The stats come from `shot.mjs --film films/<slug> --frames 0-<last> --report <stats.txt> --in <mp4>`
(`--frames` is required; without `--in` the frame-difference lines are missing and those gates FAIL as "not in report").
Never change a threshold to pass a reel: fix the reel data or the kit, or show Kai the FAIL.

| Gate | Threshold | Measured as | Source |
|---|---|---|---|
| clear frames | ≥ 94 % | frame-to-frame YAVG difference ≥ 1.0, top 60 % of the frame at 270x288 (report a) | 4 reference videos (STYLE plan, section D) |
| still frames | < 1 % | YAVG difference < 0.2 (report a) | 4 reference videos (plan D) |
| camera speed | ≤ 95 px/f at 720p (a ceiling) | peak camera motion, cuts and dissolves left out (report b) | reference max 114-142 px/f at 1080 (FORENSIC.md; was ≤ 25, the opposite of the reference's rushes) |
| frozen run | ≤ 8 f | longest run with every joint still, per actor in frame; expr `sleep` exempt (report b, acting) | reel 1 build target |
| arm length ratio | ≤ 1.03 | (upper + fore arm) / rest arm length, per actor | reel 1 build target (no stretched arms) |
| joint change | ≤ 25 deg/f | largest one-frame change of a flex, foot pitch, torso or limb direction; the FAIL line lists the worst actor's top 5 frames (report: `joint change top 5`, `frames over 25 deg`) | reel 1 build target (no pops) |
| head never cut | never | head box above the top edge, any actor in frame | reel 1 review |
| small-figure run | ≤ 120 f | longest run where the largest figure in frame is under 30 % of the frame height (a frame with no figure resets the run) | reference wide + establishing = 32 % of runtime, shot p90 4.2-6.4 s (FORENSIC.md; was 45 f) |
| hand-prop gap | ≤ 2 px at 1080p | hand dot to the held prop's grip socket (report d) | reel 1 review (props floating off hands) |
| collisions | none | any body point inside a set `COLLIDE` box, or torso in torso (report e) | reel 1 review (man inside a pillar) |
| close-up head x | 45-55 % | subject head centre x in settled `cu` frames (report f) | reel 1 review |
| body acting | ≥ 70 % per lead | share of each lead's in-frame frames with a body verb running (`__dbg` `body`: any verb but idle, talk, look_at, place, hold, mark, nod / tilt); a lead = cast `lead: true`, a `talk` beat or a shot subject (report b, `body acting:`) | judge on stick04: "characters mostly stand still" (poses/acting 3-4/10) |
| expressions | ≥ 5 per 30 s | distinct faces on screen ≥ 3 frames each, open-mouth twins count as their base (report g) | judge on stick04: "faces near-neutral dots" |
| expression lead | ≥ 3 f before the word | for every in-frame face change made by a beat with a word: word start − change frame (the engine lands it 4 f early, `EXPR_LEAD`) (report g) | the face reads before the sound |
| mix loudness | -14 ± 0.5 LUFS | ffmpeg ebur128 integrated, on the mp4 audio | house target (`make-reel`, kai-reel-3d) |
| true peak | ≤ -1 dBTP | ffmpeg ebur128 true peak, on the mp4 audio | house target |
| colour SATAVG | median 19-47 | signalstats SATAVG, same samples, median | 7 reference frames, `STYLE.md` Màu |

## Forensic gates (FORENSIC.md ranked fixes 1-10, 11/11)

`gates.mjs --film` runs `tools/forensic/measure.py <mp4> --words <words.json>` (~1 min): the same scripts that measured the
four reference shorts (copied into the kit), so our number and theirs come from one code path. Output also lands in
`<mp4 without .mp4>-forensic.json`.

| Gate | Threshold | Measured as | Reference |
|---|---|---|---|
| hard cuts | ≤ 0.2 per 10 s | shot boundaries (histogram jump), one-frame jumps = cut | 0-0.15 |
| dissolves | ≥ 50 % of boundaries, median 7-12 f | linear-blend residual < 0.33 over ≥ 3 frames | 53 %, ~9 f |
| rush peak | move peak p90 ≥ 90 px/f at 1080 | similarity fit (pan, tilt, zoom) on 8 tiles; a move = edge speed > 8 px/f for ≥ 4 f | 97-106 |
| time in moves | ≥ 30 % | frames inside moves | 33-64 % |
| shot length CV | ≥ 0.6 | std / mean of shot lengths between boundaries | 0.57-1.31 |
| light per place | shot YAVG std ≥ 20, a shot < 95, median 105-130 | median YAVG per shot (360x640) | std 23-25, darkest 65-91, median 104-129 |
| first move | ≤ frame 30 | first move or transition | f3-61, median ~17 |
| outline thick/thin | 1.7-2.5 | 18 rays round big heads at 1080, shadow-side / lit-side median | 1.65-2.47 |
| mouth movement | mouth area CV ≥ 0.4 | tracked faces with a dark mouth shape | 0.33-0.56 |
| bed in pauses | -12..-10 dB vs voice | median total power in pause frames minus speech frames (energy VAD) | -10.3..-11.9 |

## Look gates (picture style against the reference, measured on the mp4)

Same code on our mp4 and on the reference: `tools/look_measure.mjs` (ink, caption) and ffmpeg signalstats (colour,
contrast). Reference numbers: 60 tiles of `ref_sheet30_pink.jpg` + `ref_sheet30_rail.jpg` and the 3 full-size frames
`ref_close/medium/wide.jpg` (ink, caption). The mp4 is tv range, the stills full range: shadow contrast and per-shot
colour convert to full range first. Per shot and caption need `--film` (shot index and caption text from `__dbg`).

| Gate | Threshold | Measured as | Reference |
|---|---|---|---|
| shadow contrast | median 0.235-0.388 | (YLOW-16)/(YHIGH-16) per sample (P10 / P90 luma), 2 a second, median | tiles p25-p75 (median 0.289) |
| colour per shot | YAVG 60-170, SATAVG 13-54, YLOW 17-101 | per shot (act + shot index, ≥ 2 samples), median of each | the four full reference videos, same signalstats code: YAVG p5-p95 61-168, SAT 13-54, YLOW min 17 (was tiles p10-p90, which failed every dark place) |
| ink thickness | median 2-3 px at 1080 wide | thin dark runs (1-14 px, Y < 72, both sides ≥ 45 brighter and > 90) on rows and columns, caption band 60-80 % left out; median width per frame (frames with > 50 runs), median of 1 frame a second | 3 full frames: 3, 2, 2 px |
| caption height | 54 px ± 10 % at 1920 tall | white glyph rows next to black stroke in the band 60-80 %, tallest run; only frames whose caption has an ascender or capital and no descender | `ref_wide` "Then" 54 px (tiles x4: 49-51) |

Engine side (engine/look.js, one look for every set): every set and prop mesh gets the screen ink (stick figures keep
their own hull: 4.6 % of head width, x0.35-1.6 by the sun, thick on the shadow side); every plain MeshStandardMaterial gets the set toon ramp (`SET_LOOK`: form
gradient, hard blue-grey cast shadow, warm sun tint); a sun higher than 50 deg is lowered to 40 deg (longer shadows);
light shafts ray-marched through the sun's shadow map; bloom on highlights. Captions (engine/captions.js `CAP`): 72 px
weight 800, 6 px stroke outside, hard drop shadow.

Colour per shot is fixed per set in `SET_GRADE` (engine/look.js: exposure, shadow lift, gamma, saturation after the
grade pass), measured per set on a render, never by moving the gate. An act can override with `grade`.

Measured 10/11 (Q1, `films/stick05-q1-{robe,dye}/review/*_q1r3-gates.txt`): robe ink median 4 px FAIL, colour per shot
FAIL (park and lab YAVG 160-186); dye ink 3 px PASS, colour per shot FAIL (bank YLOW 30-33, street YLOW 105-111,
cutaway YAVG 174-179); shadow contrast and caption height PASS on both.

## Story gates (`--film`: storyboard.json against `__dbg`, no human)

A line's window = its first word to the next line's first word. `__dbg` rows carry `set`, `camera.shot` and `seen` (every set
prop and `make` effect shown, in front of the camera and covering ≥ 0.2 % of the frame). gates.mjs runs `shot.mjs --dbg`
itself, or takes `--dbg <jsonl>`.

| Gate | Threshold | Measured as | Why |
|---|---|---|---|
| duration | 27-33 s | frames / 30 | 30 s reels; reel 2 ran 33.9 s |
| distinct sets | ≥ 3 | sets on screen ≥ 15 frames each (a `cutaway` act counts as a set) | reel 2: one street for 34 s |
| shot variety | ≤ 2 lines alike | each line's main set + shot kind (most frames in its window); longest run of equal lines | no three lines in the same framing |
| shot types | ≥ 4 kinds (≥ 4 per 30 s) | shot kinds (`camera.shot` before the bracket) on screen ≥ 15 frames each | reference cuts between macro, wide, top-down and aerial; reel 3 judged 2-3/10 on one medium angle |
| shot type run | ≤ 2 lines | each line's main shot kind (set ignored); longest run of equal lines | same |
| establishing shot | ≥ 1 | an `est` or `aerial` on screen ≥ 15 f | the reference opens places from above |
| insert shot | ≥ 1 | an `insert`, `macro` or `top` on screen ≥ 15 f | the reference reads its numbers and props up close |
| storyboard entries | every line | an entry per `vo/script.json` line | the plan exists before reel data |
| props / fx used | ≥ 40 % of lines | lines whose entry lists a prop or fx and at least one is seen | beyond standing and talking |
| props / fx seen | all | every listed prop / fx seen ≥ 3 frames in its line's window | the plan is really on screen |
| acting plan | every line with a character on screen ≥ 15 f | the entry's `act` ({ actor: ['verb@word', ...] }) names known body verbs (poses.js, verbs), never talk | director rule: a line is acted, not said |
| board shown | ≥ 85 % | judged: `review/board-verdict.json` from the reviewer below | every spoken line illustrated |
| dressing density | ≥ 16 pieces in ≥ 85 % of frames | `dress` in each `__dbg` row: registered set pieces (lib/sets/dress.js, .glb pieces) the camera really sees (shown, ≥ 0.04 % of the frame, one of five sample points not hidden behind another mesh); cu frames, cutaway tables and dissolves left out | reference: 21 distinct objects in `ref_wide`, 16 in `ref_medium` (counted by eye, 10/11); Q4 judge: "bare park and classroom" |
| floating labels | 0 | `make` entries of kind stamp / callout / bars / split seen ≥ 3 frames | 0 text stickers in 4 reference videos (FORENSIC.md fix 9); a fact goes on a `sign`, meter or chalk |
| wide share | ≥ 30 % of frames | `est`, `aerial`, `wide` frames in `__dbg` | reference establishing + wide 32 % (FORENSIC.md fix 5) |
| low angle share | ≥ 7 % of frames | `low` frames | reference 7.3 % |
| open on the verb | ≥ 10 of frames 0-20 | a character in frame with a body verb running (not talk / look / blink) | 4/4 reference videos are mid-action on frame 0 (fix 6) |
| fx in world | every storyboard `fx` | each `fx` name's `make` kind is a physical kind (not stamp, callout, bars, split, rings, flow, rays, star, shimmer); floating text goes in the entry's `labels` (counted by the label budget, checked by props / fx seen) | the reference shows cracks, smoke, timers as things in the room |

### World and fx gates (Q4, 10/11)

How the reference was counted: every distinct physical object in the frame (a bench, a light fixture, a sign, a drain, a
door, a beam = 1 each; the floor, the walls and the sky do not count). `ref_wide` 21, `ref_medium` 16, so N = 16. Our count
is the same idea measured: one registered piece = one object (a bench, a bin, a poster, a .glb room part such as a board or
a window row). `node styles/stick-man/tools/shot.mjs --film <f> --frames <a,b> --dbg <out> --dress 1` lists the pieces seen.
A low count is fixed by dressing what the camera sees (low pieces on the near floor never cover a body), never by moving
the camera or lowering N. Proof `films/stick05-q4-levels/review/reel-gates.txt`.

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

### The judged gate: style judge + blind test (Q5, against the reference)

After the render: `node styles/stick-man/tools/judge.mjs films/<slug> --in <mp4> --ref <ref-private dir> [--tag r1]`.
The reference images stay private: the tool reads `ref_sheet30_pink.jpg` and `ref_sheet30_rail.jpg` (10 x 3 tiles of
270 x 480, JPEG q90 4:2:0) from that path, refuses a path inside the repo, and builds the reference sheets in a tmp dir it
deletes. Fair comparison, same pipeline both sides (`judge_sheets.py`): 12 reference tiles from each sheet (evenly spread)
and 24 of our frames (evenly spread over the reel, each the middle of a spoken word, every line at least once), our frames
scaled to 270 x 480 (Lanczos), every tile one JPEG pass at q90 4:2:0, sheets of 6 x 2 tiles saved at q90 4:2:0. Two
independent headless `claude -p --model sonnet` reviews (as board.mjs) each see both reference sheets and both of ours,
with the fixed prompt in `judge.mjs` (10 categories 0-10, overall, one line per category on the biggest difference, "Do
not be generous"). Writes `review/judge.json` / `judge.txt` (scores per review, mean, tokens, cost) and our two sheets.

| Gate | Threshold | Measured as |
|---|---|---|
| style judge | mean overall ≥ 8.5 and no category mean < 8 | mean of the 2 reviews |
| blind test | ≤ 8 / 12 told apart | 6 reference + 6 ours tiles shuffled (seeded), one more review labels each original / imitation; tiles labelled right, or wrong when the reviewer swapped the names (max of the two; 6 = chance, 12 = fully told apart) |

Cost: ~4 images a review; tokens per review are in `judge.json`.

## Acting gates: how to fix a FAIL

Body acting under 70 %: name a body verb for that lead in the storyboard `act` and the beats (VERBS.md "Body acting"),
or check it is a lead (auto-acting fills a lead's gaps ≥ 18 f). Expressions under 5: give each line a strong face (the
29 in VERBS.md "Faces"; neutral / calm count once). Expression lead: put the `expr` on the word itself (the engine leads by
4 f); a beat at `f` with no word is not checked. A pose that pushes a close-up head out of 45-55 %: a smaller `amp`, or
mirror it (`hand: 'L'`): a 3/4-turned figure that pitches forward moves sideways on screen.

Proof (q2, 10/11): `films/stick05-q2-levels` (stick04 with new acting only): all gates PASS, `review/reel-gates.txt`;
judged against the reference in `review/judge.md`.

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
Robe re-shot with the shot grammar (`stick05-q3-robe`, 10/11): 15/15 + 11/11 PASS (11 shot kinds, 31 shots, peak
camera 22.8 px/f, board 89 %); the style judge still scored shot variety 3/10 (`review/judge.md`).
Reel 2 (`stick02-black-robe`): duration 33.9 s, 1 set, 3 lines alike, board shown 33 % FAIL (`review/reel2-story-gates.txt`). Two rules settled 10/11: a face with
expr `sleep` never counts toward a frozen run, and a frame with no figure in it (prop-only cutaway) never counts toward
the small-figure run. Kai approved the video with these open; a new
reel still has to pass, or the FAIL goes to Kai with a still.
