# Gates

`node styles/stick-man/tools/gates.mjs --report <stats.txt> --in <mp4> --film films/<slug> --profile pilot|full --out <gates.txt>`
prints PASS / FAIL / WAIVED per gate (picture, sound, acting and look gates, forensic gates, story gates). The stats come from
`node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --report <stats.txt> --in <mp4>` (`--frames` and
`--in` are required, or those gates FAIL as "not in report"). Never change a threshold to pass a film: fix the data or the
kit, or show Kai the FAIL with a still.

## Gate profiles (which gates block)

| Profile | Gates | Applies |
|---|---|---|
| **safety** | camera speed, arm length ratio, joint change, head never cut, hand-prop gap, collisions, body contact, mix loudness, true peak, props / fx seen, board shown | always: a FAIL blocks |
| **quality** | frozen run, mouth range, body acting, expressions, expression lead, close-up head x, storyboard entries, props / fx used, acting plan, floating labels, fx in world | always: a FAIL blocks |
| **reference** | clear frames, still frames, small-figure run, colour SATAVG, shadow contrast, colour per shot, ink thickness, caption height, caption weight, all 10 forensic gates (hard cuts, dissolves, rush peak, time in moves, shot length CV, light per place, first move, outline thick/thin, mouth movement, bed in pauses), duration, distinct sets, shot variety, shot types, shot type run, establishing shot, insert shot, wide share, low angle share, open on the verb, dressing density, style judge, blind test | measured from one reference short. They block only with `--profile full`, for an episode matched to that reference when Kai picks it. `--profile pilot` prints them as WAIVED (pilot A, 12/11: 34 PASS, 0 blocking, 19 WAIVED) |

These numbers are information whenever they don't block: read them, and fix what Kai would see. A gate that
mis-measures (a tool gap) is fixed in the tool, in its own commit.

| Gate | Threshold | Measured as | Source |
|---|---|---|---|
| clear frames | ≥ 94 % | frame-to-frame YAVG difference ≥ 1.0, top 60 % of the frame at 270x288 (report a) | 4 reference videos (STYLE plan, section D) |
| still frames | < 1 % | YAVG difference < 0.2 (report a) | 4 reference videos (plan D) |
| camera speed | ≤ 95 px/f at 720p (a ceiling) | peak camera motion, cuts and dissolves left out (report b) | reference max 114-142 px/f at 1080 (FORENSIC.md) |
| frozen run | ≤ 8 f | longest DEAD run per actor in frame: no joint 1 mm and no angle 0.3° from where the run began; expr `sleep` exempt (report b, acting) | reel 1 build target |
| mouth range | CV ≥ 0.4 | dark mouth-area CV over the frames an actor talks (≥ 30 f), report b `micro:` | FORENSIC.md fix 8: reference 0.33–0.56, ours 0.06–0.21 |

| arm length ratio | ≤ 1.03 | (upper + fore arm) / rest arm length, per actor | reel 1 build target (no stretched arms) |
| joint change | ≤ 25 deg/f | largest one-frame change of a flex, foot pitch, torso or limb direction; the FAIL line lists the worst actor's top 5 frames (report: `joint change top 5`, `frames over 25 deg`) | reel 1 build target (no pops) |
| head never cut | never | head box above the top edge, any actor in frame | reel 1 review |
| small-figure run | ≤ 120 f | longest run where the largest figure in frame is under 30 % of the frame height (a frame with no figure resets the run) | reference wide + establishing = 32 % of runtime, shot p90 4.2-6.4 s |
| hand-prop gap | ≤ 2 px at 1080p | hand dot to the held prop's grip socket (report d) | reel 1 review (props floating off hands) |
| collisions | none | any body point inside a set `COLLIDE` box, or torso in torso (report e) | reel 1 review (man inside a pillar) |
| body contact | ≤ 0.1 cm | deepest point of an arm or hand inside a head or a torso after the contact solve (`__dbg` limbs `penCm`, motion v2 actors) | Kai 12/11: "no human scratches his head with a hand through it" (engine/body.js) |
| close-up head x | 45-55 % | subject head centre x in settled `cu` frames (report f) | reel 1 review |
| body acting | ≥ 70 % per lead | share of each lead's in-frame frames with a body verb running, or past its first motion v2 key (`__dbg` `body: 'key'`) (`__dbg` `body`: any verb but idle, talk, look_at, place, hold, mark, nod / tilt); a lead = cast `lead: true`, a `talk` beat or a shot subject (report b, `body acting:`) | judge on stick04: "characters mostly stand still" (poses/acting 3-4/10) |
| expressions | ≥ 5 per 30 s | distinct faces on screen ≥ 3 frames each, open-mouth twins count as their base (report g) | judge on stick04: "faces near-neutral dots" |
| expression lead | ≥ 3 f before the word | for every in-frame face change made by a beat with a word: word start − change frame (the engine lands it 4 f early, `EXPR_LEAD`) (report g) | the face reads before the sound |
| mix loudness | -14 ± 0.5 LUFS | ffmpeg ebur128 integrated, on the mp4 audio | house target (`make-reel`, kai-reel-3d) |
| true peak | ≤ -1 dBTP | ffmpeg ebur128 true peak, on the mp4 audio | house target |
| colour SATAVG | median 19-47 | signalstats SATAVG, same samples, median | 7 reference frames, `STYLE.md` Màu |

Principles, not gates (report b `micro:`, tool `tools/forensic/microanim.mjs`): head moves of 12–15 f with a slow start (7 % of
the travel in the first eighth), fewer and bigger, then holds that breathe (median ≥ 12 f, some ≥ 40 f); the face redrawn
through every change (engine/acting.js `faceStateAt`, faces.js `mixFace`); the mouth from the words (acting.js `visemeTrack`).

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
| colour per shot | YAVG 60-170, SATAVG 13-54, YLOW 17-101 | per shot (act + shot index, ≥ 2 samples), median of each | the four full reference videos, same signalstats code: YAVG p5-p95 61-168, SAT 13-54, YLOW min 17 |
| ink thickness | median 2-3 px at 1080 wide | thin dark runs (1-14 px, Y < 72, both sides ≥ 45 brighter and > 90) on rows and columns, caption band 60-80 % left out; median width per frame (frames with > 50 runs), median of 1 frame a second | 3 full frames: 3, 2, 2 px |
| caption height | 54 px ± 10 % at 1920 tall | white glyph rows next to black stroke in the band 60-80 %, tallest run; only frames whose caption has an ascender or capital and no descender | `ref_wide` "Then" 54 px (tiles x4: 49-51) |

Engine side (engine/look.js, one look for every set): every set and prop mesh gets the screen ink (stick figures keep
their own hull: 4.6 % of head width, x0.35-1.6 by the sun, thick on the shadow side); every plain MeshStandardMaterial gets the set toon ramp (`SET_LOOK`: form
gradient, hard blue-grey cast shadow, warm sun tint); a sun higher than 50 deg is lowered to 40 deg (longer shadows);
light shafts ray-marched through the sun's shadow map; bloom on highlights. Captions (engine/captions.js `CAP`): 72 px
weight 800, 6 px stroke outside, hard drop shadow.

Colour per shot is fixed per set in `SET_GRADE` (engine/look.js: exposure, shadow lift, gamma, saturation after the
grade pass), measured per set on a render, never by moving the gate. An act can override with `grade`.

### World and fx gates

How the reference was counted: every distinct physical object in the frame (a bench, a light fixture, a sign, a drain, a
door, a beam = 1 each; the floor, the walls and the sky do not count). `ref_wide` 21, `ref_medium` 16, so N = 16. Our count
is the same idea measured: one registered piece = one object (a bench, a bin, a poster, a .glb room part such as a board or
a window row). `node styles/stick-man/tools/shot.mjs --film <f> --frames <a,b> --dbg <out> --dress 1` lists the pieces seen.
A low count is fixed by dressing what the camera sees (low pieces on the near floor never cover a body), never by moving
the camera or lowering N.

### The judged gate: board reviewers (never judge your own board)

Run it at Shot lock (step 3.5): `node styles/stick-man/tools/board.mjs films/<slug> --judge 3`. It renders
`review/board.jpg` (one image ≤ 1560 px: two stills per line, A on the entry's `still` word, B at the line's fx peak, the
spoken words burned under each pair, no plan text) and sends it inline to 3 independent headless `claude -p` reviews
(sonnet, effort medium, no tools, no settings, empty cwd); a line is shown when 2 of 3 say shown. Writes
`review/board-verdict.json` (votes, reasons, tokens per review); gates.mjs reads it. New reel data = run it again.
The prompt lives in `board.mjs` (`prompt()`); `--prompt 1` prints it with the absolute board path, for an Agent-tool
reviewer when `claude` is not on PATH.

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


## Acting gates: how to fix a FAIL

Body acting under 70 %: a motion v2 lead counts from its first key (`body: 'key'`); a verb-driven lead needs a body verb in
the storyboard `act` and the beats (VERBS.md "Body acting"). Joint change over 25°/f on a motion v2 lead: a longer `t`
on the next key, less `antic`, `elbow` ≥ 15, hands away from head and belly (PROCESS.md section 5). Expressions under 5: give each line a strong face (the
29 in VERBS.md "Faces"; neutral / calm count once). Expression lead: put the `expr` on the word itself (the engine leads by
4 f); a beat at `f` with no word is not checked. A pose that pushes a close-up head out of 45-55 %: a smaller `amp`, or
mirror it (`hand: 'L'`): a 3/4-turned figure that pitches forward moves sideways on screen.

## Not scripted (eyes, on the 30-tile sheet and stills)

| Check | Pass when |
|---|---|
| Story reads with the sound off | each line's key action is visible on its word |
| Captions | 1-3 words, never over a face (report b: head box in caption band 66-78 % = never) |
| Blinks | every actor in frame blinks, gaps ~0.5-1.5 s (report b) |
| Feet | stance-foot slide small; no moonwalk (report b, eyes on the walk stills) |
