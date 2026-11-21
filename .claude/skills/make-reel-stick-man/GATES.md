# Gates

## Every gate: evidence first

```sh
node styles/stick-man/tools/stagegate.mjs films/<slug> <1|S|2a|2b|2c|3|4|5|6|all>   # review/gate-<id>.md
```

Each gate in `styles/stick-man/tools/GATES.json` lists four kinds of evidence: **measured** (a tool that must exit 0: `develop.mjs`, `scriptlint.mjs`, `prepro.mjs --gate`, `assets.mjs` and `rigtest.mjs` (gate 3), `timing.mjs`, `facebeat.mjs` (gate 4: faces against the beat, repeated faces) and `shotgate.mjs` (gates 4 and 5), `kituse.mjs` (gates 4 and 5, one id per feature: `life` the moving hold, `depth` the far backdrop, `sound-plan`, `music` a credited kit music track, `refbench` the Rick bench of the final; a skipped one needs a `DECISIONS.json` waiver `{ "waives": "<id>", "by": "kai", "at", "status": "approved" }`), `postcheck.mjs`, `cutgate.mjs`, `colourgate.mjs` (gate 5: the final against the film's approved `colour-script.json`)), **made** (the maker's files), **judged** (`by: agent:<id>` or `person:<name>`, fresh against what it reviewed: for a JSON file, everything but non-visible metadata (`notes`, `note`, `purpose`, `why`, `comments`; in `storyboard.json` also the options that are not picked, `pick`, and the asset breakdown `assets.mjs` reads: shot `set`, `cast`, `props`, `state`, `reset` and the storyboard's `measures`) hashes the same as when the review was first seen newer than it, recorded in `review/.fresh.json`; any other file, such as `vo/vo.wav`, must be older than the review; see `tools/fresh.mjs`) and **approved** (Kai in `review/approvals.json`, after the latest evidence). States: OPEN → READY FOR KAI → LOCK. A film may add evidence in `review/gates.local.json`, never remove any.

Freshness has one limit, first sight: the hash is recorded the first time `stagegate.mjs` runs after a review is
written. If the reviewed file changes before that run, there is no record, the file is newer than the review and the
review is stale. So run `stagegate.mjs` right after each review lands. An unreadable `review/.fresh.json` is reported
with a warning and treated as no record.


```sh
node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --report films/<slug>/review/<slug>_vN-stats.txt --in <mp4>
node styles/stick-man/tools/gates.mjs --report <stats> --in <mp4> --film films/<slug> --profile pilot|full --out films/<slug>/review/<slug>_vN-gates.txt
```

`gates.mjs` prints PASS, FAIL or WAIVED for every gate, then the profile line, e.g. `profile pilot: 34 PASS, 0 blocking FAIL, 19 reference gates WAIVED`. It exits 1 on a blocking FAIL.

A film under a show bible (`styles/stick-man/bible/<show>/catalog.json` names its slugs in `governs`, e.g. `hm-ep*`) is checked before every still or mp4 render: `shot.mjs` runs `node styles/stick-man/bible/check.mjs films/<slug>` and refuses to start while it reports a blocking finding (a part outside the catalog, a body action keyed by hand where the library has the clip). Fix the film, or add an entry with a reason to `films/<slug>/bible-exceptions.json`, which the report counts. `--no-bible-check '<reason>'` renders anyway and logs the reason in `films/<slug>/bible-bypass.tsv`.

- **Never change a threshold.** Fix the film data or the kit. A gate that measures wrong is fixed in its tool, in its own commit.
- **After 2 fix rounds on one gate**, stop and show Kai the FAIL with a still.

## Script (◇S)

```sh
node styles/stick-man/tools/scriptlint.mjs films/<slug>   # review/scriptlint.md; fixes: SCRIPT.md section 6
```

◇S needs scriptlint PASS, `vo/beats.json` and `vo/facts.json`, and four reviews by agents, each newer than `vo/script.json`: `review/fact-check.md`, `review/skeptic.md`, `review/ear-retell.md`, `review/script-ab.md` (the new script must win). Then Kai approves.

## Pre-production (stage 1)

```sh
node styles/stick-man/tools/prepro.mjs films/<slug>                 # review/prepro.md, review/intensity.svg, review/shots.csv
node styles/stick-man/tools/animatic.mjs films/<slug> --v N --safe 1 # review/animatic_vNNN.mp4 + the CUTS line for reel.js
node styles/stick-man/tools/previs.mjs films/<slug> --film           # review/previs/animatic.mp4 (3D blockout, temp music) + previs.md for ◇2b
node styles/stick-man/tools/previs.mjs films/<slug> --scene <name>   # one scene: previs/<name>.json, or a storyboard scene id
```

`prepro.mjs` exits 1 on a FAIL. Its checks (ids T, B, C, P, H, I) and the fix for each are in PREPRO.md section 8. A WARN
is answered, not ignored: fixed, or a one-line reason on the shot (`hold`, `axis_cross`) or scene (`noEst`). The judged
checks (muted retell, 5-second read, explain audit, swipe test) are in PREPRO.md section 5. ◇2a needs a PASS on the final
voice; `--strict 1` (WARN counts as FAIL) is for Kai to ask for, never a default.

| Check | Threshold | Why |
|---|---|---|
| every voice line covered | ≥ 1 shot under each line | nothing said without a picture |
| shot length | ≥ 15 f (8 f for INS, CARD, whip) | a new image needs about half a second to be found |
| static hold | ≤ 4.5 s or a written reason | dead stretches lose the viewer |
| cards | ≤ 8 s in a row, ≤ 25 % of the film | explain in pictures first |
| on-screen text | ≤ 15 characters/s, ≥ 25 f, inside the text-safe box (x 6-87 %, y 14-65 %) | readable on a phone, not under the app's UI |
| continuity | no screen-direction flip or axis jump without a stated reason | reversed axes read as mistakes |
| intensity | no visual peak before the climax after the hook | the climax needs somewhere to go |

## Shot gate (◇4, ◇5)

```sh
node styles/stick-man/tools/shotgate.mjs films/<slug> [--in renders/<slug>_vN.mp4 --from <first frame>]   # review/shot-gate.md
```

Every frame of the film, frame against frame (`tools/shotfaults.mjs`). Each fault is sized as the viewer sees it: px on a
720-tall phone frame through the shot's own camera, after the motion the neighbouring frames predict, times the share of
it in view (inside the frame, not behind the figure's own head or torso, and in film mode not behind the set: `shot.mjs
--vis`). Its frames are how long it stays on screen.

What blocks comes from Kai's marks at playback speed (17/11, 12 strips from pilot-a and the bible film): he saw only a saw
11 px into a rail for 3 frames, and none of the one-frame pops of 6 to 67 px, a phone that appears in a hand (47 px), a
knee that snaps to a new pose (63 px) or a calendar page turning. So:

- A fault gone again within 2 frames (out and back, a blink, a one-frame pop) is listed as watch and never blocks.
- A contact (marked c: one thing into, through or off another) that lasts 3 frames blocks from 6 px.
- A change that stays 3 frames (a jump to a new place, a prop or figure in or out, a size, a pose snap, a change at a cut)
  blocks from 75 px, between the largest one Kai did not see (63 px) and the smallest one he complained about (97 px, S3-032).

Each blocking second gets `review/shot-gate/strip_<s>s_f<F>.jpg`: 15 frames in a row, the fault on tile 6. A film
assembled shot by shot passes its rows with `--rows`.

| Fault | Measured |
|---|---|
| prop appears / vanishes | seen and ≥ 0.2 % of the frame; no cut, not through the frame edge under a still camera, not from behind a cover; px = its size on screen; frames = how long both the old and the new state last |
| prop / figure jumps | the step into a frame lies outside the steps on either side of it in the shot, less the same measure 2 and 3 frames away (a speed-up, a landing or a sprint is no jump); what the steps around it leave of it is a jump to a new place, else it went out and back in one frame; a prop whose box changes shape (a page turning) is no jump |
| prop resizes, prop changes at cut | size changes 15 % in a frame, or a carried prop's size across a cut; px = the change on screen |
| prop gone after cut | a prop left at rest (moved < 1 cm the frame before) is not at its spot when the next shot of the place looks there; a moving prop may change place behind a cut |
| prop floats (c) | within 15 frames of a hand letting go, vertical acceleration off −g by 60 % for 3 frames; px = distance from the fall gravity predicts |
| figure appears / vanishes | inside the frame in one frame (not revealed by a pan); px = the figure's height on screen |
| joint pops | a jointstep.mjs channel over 25° in a frame whose moving points jump off their path (as prop jumps); one that holds is a pose snap |
| figure skates (c) | the body travels > 0.6 m/s for 8 frames while the stiller foot, within 10 cm of the floor, moves along > 50 %; px = its slide |
| foot slides (c) | an ankle within 3 cm of the floor in two frames moves; px = the slide over the run |
| body / prop passes through (c) | pelvis, chest, head, knees or a held prop crosses a set mesh the render draws opaque and that did not move (a light cone, glass or a hidden mesh is not a surface); it stays inside while past the crossing spot along the way it went in; px = how far |
| hand off its grip, prop in the body (c) | over 2 cm, over 1 cm (shot report (h), (i)); px = the gap on screen |
| body in the set (c) | a collision box; the engine gives no depth, so 3 frames decide |
| camera jumps | inside a shot of a film assembled shot by shot (`edit` rows): 0.3 m and 3x its last step |
| cord shakes (watch only, never blocks) | the shot report's cords line, 0.015 m/f² |

## Profiles

| Profile | Blocks | Gates |
|---|---|---|
| safety | always | the first table below |
| quality | always | the second table below |
| reference | only with `--profile full` | the third table below: numbers measured from one reference short; for an episode matched to that reference, when Kai picks it. `--profile pilot` prints them as WAIVED, read them as information |

## Safety

| Gate | Threshold | Fix |
|---|---|---|
| joint change | ≤ 25°/frame | the next key gets a longer `t`, less `antic`; `elbow` ≥ 15; hands a fist away from head and belly |
| arm length ratio | ≤ 1.03 | the arm solver is stretching: change the target pose |
| body contact | ≤ 0.1 cm into a head or torso | the engine solves contact. A FAIL means a pose aims through the body |
| collisions | none | body point inside a set `COLLIDE` box: move the mark or the pose |
| head never cut | never | reframe |
| hand-prop gap | ≤ 2 px at 1080 | the prop needs `userData.grip` |
| camera speed | ≤ 95 px/frame at 720p | a long move becomes a cut between the same framings |
| mix loudness, true peak | −14 ± 0.5 LUFS, ≤ −1 dBTP | `mix.py` targets |
| props / fx seen | every listed prop seen ≥ 3 frames in its line | frame it, or fix the storyboard entry |
| board shown | ≥ 85 % of lines | fix the picture (PROCESS.md section 7), then judge again |

## Quality

| Gate | Threshold | Fix |
|---|---|---|
| frozen run | ≤ 8 frames with no joint moving 1 mm / 0.3° | every key carries `cycle: BREATH` |
| body acting | ≥ 70 % of a lead's frames | a motion v2 lead counts from its first key; a verb-driven lead needs body verbs |
| expressions | ≥ 5 per 30 s | a strong face per line (`engine/faces.js` EXPR) |
| expression lead | the face lands ≥ 3 frames before its word | put `expr` on the word's key |
| face pops | 0 per actor: no frame jumps a face feature away from its target, or carries > 35 % of a change outside a take's accent | an engine fault: report it (`.agents/playbooks/stick-man-kit-fix.md`) |
| face timing | each change rises 10-90 % in ≥ 6 f and holds ≥ 6 f before the next key; 2-6 changes per 10 s; ≤ 4 takes a minute and 1 per 10 s; 12-30 blinks a minute; eye lead 0-3 f | space or drop keys; `small: true` or `take: false` on extra takes (REEL_DATA.md, Face timing) |
| close-up head x | 45-55 % of the width in `cu` frames | reframe |
| mouth range | CV ≥ 0.4 while talking | talking characters only |
| storyboard entries, acting plan, props / fx used | every line has an entry, an `act` and a prop or effect on ≥ 40 % of lines | complete `storyboard.json` |
| floating labels, fx in world | 0 floating stickers; every storyboard fx is a physical thing | words go on a sign, a calendar or an overlay that the picture backs |

## Reference

clear frames ≥ 94 % · still frames < 1 % · small-figure run ≤ 120 f · shadow contrast 0.235-0.388 · ink thickness 2-3 px · caption height / weight ·
duration 60-80 s · distinct sets ≥ 3 · shot variety / types / type run · establishing and insert shot · wide share ≥ 30 % · low angle
share ≥ 7 % · open on the verb · style judge ≥ 8.5 · blind test ≤ 8/12. The forensic gates measured on the mp4 (cuts, dissolves, rush,
light per place, outline, mouth movement, bed in pauses) are gone: their script was never in the repo. Colour is not a reference gate: `colourgate.mjs`
checks the final against the film's own colour script at ◇5. (Measurement details: comments in
`styles/stick-man/tools/gates.mjs`.)

## Judged gates

- **Board.** `node styles/stick-man/tools/board.mjs films/<slug> --judge 3`. It renders `review/board.jpg`, 2 stills per line: A on the entry's `still` word, B at the line's prop peak. 3 independent headless reviewers judge it; a line is shown when 2 of 3 say so. The result goes to `review/board-verdict.json`, which `gates.mjs` reads. Rerun after any change to the reel data.
- **Style judge and blind test** (reference profile). `node styles/stick-man/tools/judge.mjs films/<slug> --in <mp4> --ref <private reference dir>`. The reference stays outside the repo.
