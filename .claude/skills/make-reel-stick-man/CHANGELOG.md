# Changelog · make-reel-stick-man

## p10 · 2026-11-11 · character quality pass (measured on the QlDPM and VS1Z reference shorts)

Engine-wide, every reel gets it. Look: ink is a dark warm plum, not black (`INK_RGB`, renders ~sRGB 50-65, 35-45, 40-50
like the reference); heads are white (`HEAD_WHITE`), softly shaded and receive no cast shadows (no hard hair-shadow
triangle on the face); the outline never thins below 0.6x on the lit side; curly hair is one smooth sculpted mass (soft
union); bodies are eggs (fuller belly, narrower shoulders); limbs 0.046 W, hand mitts 0.10 W. Faces: the grin is the
reference beam (0.5 W wide ink crescent, a white row of teeth, open dot eyes); smile, laugh, teeth grids, worried mouth
and talking mouth ~1.4-1.9x wider; brows 0.024 W thick. Acting: every pose plays 1.2x by default (`ACT_AMP` in play.js;
`actingAmp` / cast `amp` still override), bigger shrug, a real take (`recoil`), `present` pushes a held thing at the lens,
any pose beat takes `props`. 2D head (Kai: "the reference face is 2D, ours is a 3D sphere"): with `FACE_2D.on` (default) the
head is unlit flat white with one thin shade crescent at its edge, and the face is a flat card that always faces the lens
and slides across the head disc as the head turns (clipped at the edge, gone from behind); `faces3d.html?yaws=0,50,100`
shows the turnaround. Test bed: `faces3d.html?glasses=0&names=a,b`; a 12 s acting study `films/char-test` (local).

## p9 · 2026-11-11 · micro-animation layer (FORENSIC.md section 3, fixes 8, 14, 16, 17)

Automatic, from the words and beats: faces in-betweened through every change (faces.js `mixFace`, acting.js
`faceStateAt`: 10 f slow-in with overshoot, eyes squeeze / mouth gasps through a swap, held faces drift), mouths from the
letters of each word (acting.js `visemeTrack`), breathing shoulders, idle beats held 36-75 f instead of every 12-24 f,
moves of MOVE_T = 13 f with the reference spacing (`slowIn`: 7 % in the first eighth), head leads / body 2 f / arms 4 f.
Light: three tone steps + warm bounce on figures, cooler split tone, per-place `light` (REEL_DATA.md), sparks that light
the set. Gates: `frozen run` now means a dead pose (1 mm / 0.3 deg from the run start), new `mouth range` CV >= 0.4;
head holds / moves are principles (report `micro:`, `tools/forensic/microanim.mjs`).

## p8 · 2026-11-11 · forensic fix round (FORENSIC.md Top 10)

Gates that contradicted the reference were retargeted to the reference: camera speed <= 25 -> ceiling 95 px/f at 720;
`colour YAVG median 109-163` removed; colour per shot 60-170 / SAT 13-54 / YLOW 17-101 (measured on the 4 full reference
videos); small-figure run 45 -> 120 f; floating labels 3 -> 0. New: 10 forensic gates (`tools/forensic/measure.py`, the
reference's own measuring scripts) + wide share, low share, open-on-the-verb story gates.
Kit: act dissolves default 9 f, shot `dissolve: n`, rush camera (16-30 f, peak ~90 px/f at 1080, cap 100), planner without
cut grid (wide-first roles, hook rush by f18), act `grade.tint`, light-driven hull (0.35-1.6x by N.L), expression ramps +
syllable mouths (`_O` twins), captions without pop and with punctuation, music bed -11.5 LU + drone + air.
Proof reels stick07-robe / stick07-levels v3: forensic 8/10 and 9/10; style judge 4.5 / 5.5 (unchanged, target 8.5).

## p7 · 2026-11-10 · cheaper, steadier board gate; open SKILL_GAPS closed

Board gate: `board.mjs --judge 3` = one ≤ 1560 px image, 2 stills per line (A `still` word, B fx peak), 3 headless Sonnet
reviews, 2 of 3 = shown. Measured 4.1-4.7k tokens a review (~13k a gate) against ~80k a review before; robe 100 % in 3 of 3
gates, reel 1 100 % in 3 of 3. Judged once, after preview. Reel 1 (`reel1_v5`): board 70 % → 100 %.

### `films/stick03-robe/SKILL_GAPS.md`

| # | Gap | Status | Where |
|---|---|---|---|
| 1 | reviewer prompt has no library root | fixed: `board.mjs --prompt 1` prints it with the absolute path; `--judge` sends the image inline | board.mjs, GATES.md |
| 2 | judged gate noisy (89 % then 56 %) | fixed: 2 stills a line + 3 reviews, 2 of 3; spread 0 on 3 gates each film | board.mjs, GATES.md |
| 3 | board judged before preview | fixed: preview is stage 6, board stage 7, judged once | SKILL.md, LEDGER.md |
| 4 | `side` said "toward his right" | fixed in docs: + = his LEFT (screen right facing camera); code kept (approved reels use it) | VERBS.md, play.js comment |
| 5 | cu `dof` blurs labels, key undocumented | fixed: `dof` in VERBS.md Shots; labelled close-up takes `dof: 0` (reel 1 l03 uses it) | VERBS.md |
| 6 | body fx hidden behind the torso | fixed: `flow` / `rays` head anchor ≥ 0.3 m below the head with no `fwd` gets `fwd: 0.2` | play.js, VERBS.md |
| 7 | cutaway `move` on `pack` crashes | fixed: clear error ("no rest pose ... move its parent"); SETS.md says the pack rides in the stack | play.js, SETS.md |
| 8 | SETS.md has mark names, no coordinates | fixed: coordinate table for all 5 sets | SETS.md |
| 9 | explainer fx defaults read from source | fixed: defaults line (r, h, grow, life, ...) | VERBS.md |
| 10 | `shot.mjs` no `--help`, no args writes shot.jpg | fixed: `--help` prints the header; no args prints it and exits 2 | shot.mjs |
| 11 | page syntax error prints only `pageerror` | fixed: `node --check` on reel.js / reel2.js before the browser; pageerror prints the message | shot.mjs, REEL_DATA.md |
| 12 | walk on `f: 0` pops knees; wave while walking pops | fixed: Walks line (start at `f: -14`, only `wave_small` while walking) | VERBS.md |
| 13 | output names differ from briefs | won't fix: SKILL.md names `<slug>_vN` + sheet `--n 30`; a brief that names files wins (GATES now says 30-tile) | SKILL.md, GATES.md |
| 14 | `music.json` section meaning guessed | fixed: one line on what each section sounds like (from sound_music.py) | REEL_DATA.md |

### `films/stick02-black-robe/SKILL_GAPS.md`

| # | Gap | Status | Where |
|---|---|---|---|
| 1 | sound.py hard-coded to reel 1 words | fixed earlier (p0): `audio/music.json`; levels.txt prints the sections used | sound.py, REEL_DATA.md |
| 2 | no verb lists joint speed; report shows max only | fixed earlier: eased verbs + Joint gate line; report lists top 5 and frames over 25 | VERBS.md, shot.mjs |
| 3 | pace 3.7 w/s was reel 1's | fixed earlier: 2.9-3.3 w/s, every style starts `fast` | SKILL.md |
| 4 | street police car and bag block the frame | fixed earlier: opt-in with act `use` | SETS.md |
| 5 | only 3 sets, no set template | fixed earlier: park + lab, 15-minute template | SETS.md |
| 6 | new cast spec needs an engine edit | fixed earlier: extras.js exports register themselves | play.js, SETS.md |
| 7 | output names | won't fix: same as robe 13 | SKILL.md |
| 8 | fx units unclear (thermo, burst, star) | fixed earlier: Effects table with units; defaults line added now | VERBS.md |
| 9 | estimated words and beats | fixed earlier: craft rule (±3 f, prefer the next real word) | REEL_DATA.md |
| 10 | sub-agent has no token usage line | fixed: builder still marks "(est.)"; reviewer tokens are measured in board-verdict.json | LEDGER.md, board.mjs |
| 11 | two vs three fix rounds | fixed: two, in SKILL.md only (GATES.md has no second number) | SKILL.md |

### Also changed

- `lib/props/explain.js` stamp: `tail: 'left' | 'right'` draws a speech bubble (quoted lines).
- Reel 1 data (`films/stick01-dye-pack`, `examples/dye-pack`): LOVELY DAY! bubble on l03 (+ `dof: 0` on that cu), ?! stamp
  on l06, storyboard `still` words for l03 (`day`) and l05 (`explodes`); re-rendered `renders/reel1_v5.mp4` with the approved
  `audio/mix.wav` (the stamps carry no sound).
