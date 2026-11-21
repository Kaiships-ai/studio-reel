# Gates

## Every gate: evidence first

```sh
node styles/stick-man/tools/stagegate.mjs films/<slug> <1|S|2a|2b|2c|3|4|5|6|all>   # review/gate-<id>.md
```

Each gate in `styles/stick-man/tools/GATES.json` lists four kinds of evidence: **measured** (a tool that must exit 0: `develop.mjs`, `scriptlint.mjs`, `prepro.mjs --gate`, `assets.mjs` and `rigtest.mjs` (gate 3), `timing.mjs`, `facebeat.mjs` (gate 4: faces against the beat, repeated faces) and `shotgate.mjs` (gates 4 and 5), `kituse.mjs` (gates 4 and 5, one id per feature: `life` the moving hold, `depth` the far backdrop, `sound-plan`, `music` a credited kit music track, `refbench` the Rick bench of the final; a skipped one needs a `DECISIONS.json` waiver `{ "waives": "<id>", "by": "kai", "at", "status": "approved" }`), `postcheck.mjs`, `cutgate.mjs`, `colourgate.mjs` (gate 5: the final against the film's approved `colour-script.json`)), **made** (the maker's files), **judged** (`by: agent:<id>` or `person:<name>`, fresh against what it reviewed: for a JSON file, everything but non-visible metadata (`notes`, `note`, `purpose`, `why`, `comments`; in `storyboard.json` also the options that are not picked, `pick`, and the asset breakdown `assets.mjs` reads: shot `set`, `cast`, `props`, `state`, `reset` and the storyboard's `measures`) hashes the same as when the review was first seen newer than it, recorded in `review/.fresh.json`; any other file, such as `vo/vo.wav`, must be older than the review; see `tools/fresh.mjs`) and **approved** (`review/approvals.json`, after the latest evidence: an independent reviewer with `verdict: "READY"` at a process gate, Kai at K1 ◇2b with `hook` and at K2 ◇5 with `notes`). A calibrated review row is **advisory**: shown, never blocking. States: OPEN → READY FOR REVIEW or READY FOR KAI K1/K2 → LOCK. A film may add evidence in `review/gates.local.json`, never remove any.

Freshness has one limit, first sight: the hash is recorded the first time `stagegate.mjs` runs after a review is
written. If the reviewed file changes before that run, there is no record, the file is newer than the review and the
review is stale. So run `stagegate.mjs` right after each review lands. An unreadable `review/.fresh.json` is reported
with a warning and treated as no record.


A film under a show bible (`styles/stick-man/bible/<show>/catalog.json` names its slugs in `governs`, e.g. `hm-ep*`) is checked before every still or mp4 render: `shot.mjs` runs `node styles/stick-man/bible/check.mjs films/<slug>` and refuses to start while it reports a blocking finding (a part outside the catalog, a body action keyed by hand where the library has the clip). Fix the film, or add an entry with a reason to `films/<slug>/bible-exceptions.json`, which the report counts. `--no-bible-check '<reason>'` renders anyway and logs the reason in `films/<slug>/bible-bypass.tsv`.

- **Never change a threshold.** Fix the film data or the kit. A gate that measures wrong is fixed in its tool, in its own commit.
- **After 2 fix rounds on one gate or one shot's fault**, stop: `retakes.mjs` reports PREMISE and the next step is K3, with the FAIL and a still.

## Script (◇S)

```sh
node styles/stick-man/tools/scriptlint.mjs films/<slug>   # review/scriptlint.md; fixes: SCRIPT.md section 6
```

◇S needs scriptlint PASS, `vo/beats.json` and `vo/facts.json`, and four reviews by agents, each newer than `vo/script.json`: `review/fact-check.md`, `review/skeptic.md`, `review/ear-retell.md`, `review/script-ab.md` (the new script must win). Then an independent reviewer approves (`verdict: "READY"`).

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

What blocks comes from Kai's marks at playback speed (17/11, 12 strips from the old pilot A and the bible film): he saw only a saw
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

## Judged gates

- **Board.** `node styles/stick-man/tools/board.mjs films/<slug> --judge 3`. It renders `review/board.jpg`, 2 stills per line: A on the entry's `still` word, B at the line's prop peak. 3 independent headless reviewers judge it; a line is shown when 2 of 3 say so. The result goes to `review/board-verdict.json`. Rerun after any change to the reel data.
- **Style judge and blind test** `node styles/stick-man/tools/judge.mjs films/<slug> --in <mp4> --ref <private reference dir>`. The reference stays outside the repo.

## Who checks what

Generated from `styles/stick-man/tools/WHOCHECKS.json` (SKILL.md, Who checks what). Kai's rows are the faults he still
sees at K1 and K2; each one gets a check before the next episode (`firstrun.mjs check`).

<!-- whochecks:begin (generated from styles/stick-man/tools/WHOCHECKS.json: node styles/stick-man/tools/whochecks.mjs --write) -->
| Kind | Fault | Who | Tool | Gate | Measured limit | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `pose-snap` | a joint snaps to a new pose and holds | machine | `shotgate.mjs` | ◇4 ◇5 | a change of 75 px or more (720-tall frame) that stays 3 frames; a spike gone within 2 frames only shows on the strip | Kai marked 12 strips 17/11: only a fault held 3 frames was seen; replay S3-032 hit |
| `prop-appears` | a prop appears, vanishes or resizes inside a shot and stays | machine | `shotgate.mjs` | ◇4 ◇5 | a prop over 0.2 % of the frame, changed 75 px or 15 % in size, held 3 frames | replay S3-037 hit (v002 F784) |
| `prop-floats` | a released prop falls without weight | machine | `shotgate.mjs` | ◇4 ◇5 | vertical acceleration off gravity by 0.6 g for 3 frames, within 15 frames of the hand letting go | replay S3-039 hit (v002 F860) |
| `figure-skates` | a figure slides with no real steps | machine | `shotgate.mjs` | ◇4 ◇5 | the body travels over 0.6 m/s for 8 frames while the stiller foot near the floor moves over half as fast | replay S3-045 hit (v002 F1064) |
| `body-through-set` | a body or prop passes through the set or another body | machine | `shotgate.mjs` | ◇4 ◇5 | 6 px or more into an opaque surface, held 3 frames | Kai saw strip 10 (11 px for 3 frames) 17/11; replay S3-046 hit (v002 F1214) |
| `prop-in-head` | a prop passes through a head, or sits inside a wall, a piece of furniture or a jamb | machine | `shotgate.mjs` | ◇4 ◇5 | a hand-sized prop's inset box 2 cm or more into a head ellipsoid or a set solid (box meshes + COLLIDE), 6 px, held 3 frames | Hot Money ep01 r5 v3 LOAD-A: bag in the head 18 f, in the dresser, the bed and door 9's jamb (bench rows, PR kit/correct-hm-r5) |
| `prop-leaves-view` | a prop in a hand leaves the frame while its holder stays in it, and comes back | machine | `shotgate.mjs` | ◇4 ◇5 | seen whole in the 6 frames before, out of the frame 3 frames or more, back within 45 | Hot Money ep01 r5 v3 LOAD-B 691-714, 741-757: the bait bill out of the top of the frame |
| `prop-out-of-scale` | a tracked prop drawn at a size its real kind never has (a round bigger than the gun) | machine | `shotgate.mjs` | ◇4 ◇5 | longest side outside lib/props/sizes.js REAL_SIZE by 1.25x, in view, 6 px, 3 frames; untracked objects are not seen | Hot Money ep01 r5 GUN: round 14 cm beside a 23 cm slide |
| `far-plane-cut` | an object cut by the camera's far plane inside the shot (a straight edge in the sky), or a set's flat sky card over the engine's sky dome | machine | `shotgate.mjs` | ◇4 ◇5 | an opaque mesh 2 m tall or more reaching past far with its near part in view, 6 px, 3 frames | Hot Money ep01 r5 CHASE 1481-1513, 1613-1637: motel.js sky cards 220 x 60 m at 60-70 m, far 80 m (review/r5/p2/f1) |
| `face-unapproved` | a face design Kai has not seen on a face sheet | machine | `facebeat.mjs` | ◇4 | any expression design held 15 frames on a readable head that is not in review/faces-approved.json | Hot Money ep01 r5 s1 round 2 (19/11 22:49): new faces shown in the film first, rolled back |
| `figure-jumps` | a figure pops into the frame or to a new place | machine | `shotgate.mjs` | ◇4 ◇5 | a jump of 75 px or more that stays 3 frames | replay S3-050 hit (v002 F1372); Kai did not see a 120 px one-frame jump 17/11 |
| `too-many-cuts` | too many hard cuts, takes too short | machine | `cutgate.mjs` | ◇5 | at most 4 hard cuts in any 15 s, one take of 6.5 s or more | Kai picked the bible cut (4 cuts, 6.7 s) over v7 (11 cuts) 17/11; v002 16 cuts in 15 s fails |
| `low-camera` | the camera looks up at the lead too often | machine | `cutgate.mjs` | ◇5 | at most 25 % of frames looking up over 5° at the lead's head | bible 1 % and v7 5 % passed, an old pilot at 53 % fails; no rejected Hot Money cut has camera rows |
| `face-cut-off` | the lead's face is cut off by the frame | machine | `cutgate.mjs` | ◇5 | no run over 1 s with less than half the head in frame | Kai 12/11 note; no rejected sample with camera rows yet |
| `face-repeat` | the same face comes back too often | machine | `facebeat.mjs` | ◇4 | a non-neutral face in more than 2 takes | kai-taste Repeats; v7 rows: y_strain 5 takes fails (S3-053) |
| `face-off-beat` | a face the beat's words never name | machine | `facebeat.mjs` | ◇4 | held 0.5 s or more on a readable head | v7 rows: 1 off the beat (SH340); no 16/11 note caught |
| `library-unused` | a hand-keyed move where the motion library has a clip | machine | `check.mjs` | every render | any such move blocks the render of a Hot Money film | v7 16 of 156 actions from the library, blocked; bible cut 68 %, passes; Kai prefers the bible cut 17/11 |
| `rig-deform` | a head squashes or a bone stretches in a library clip | machine | `rigtest.mjs` | ◇3 | head 15 % when its volume holds, else 5 %; bone length 3 %; knee and elbow -2° to 160° | Kai picked option B 17/11; 0 of 52 clips over since #132 |
| `colour-jump` | the colour jumps at a cut or dims inside a shot with no light that motivates it | machine | `colourgate.mjs` | ◇5 | at a cut /luma/ 25 and /sat/ .15 in one scene, 50 and .25 at a scene change; 25 luma in 0.5 s inside a shot; a light event in colour-script.json exempts it | Hot Money ep01 r5 A v6 colour audit 21/11: LOAD-A dims 57 with no cut, LOAD-B +63 at a cut; Kai approved the gate 21/11 |
| `colour-off-script` | a shot drifts from the approved colour script: a cast, washed out, hazy blacks, a dim hero white, an off-palette hue or one hue flooding | machine | `colourgate.mjs` | ◇5 | per scene in colour-script.json (defaults R/B 0.8-1.6, S .25-.7, black 10-26, hero white >= 175 at R/B .95-1.10, off-palette <= 20 %, a flood of 90 % <= 3 s); film mean luma >= 100, dark seconds <= 15 % | Hot Money ep01 r5 A v6 colour audit 21/11: R/B 1.9 in LOAD-A, day two S .21 and hero 162-167; Kai picked amber + police blue 21/11 |
| `dark` | the film is too dark or one hue drowns it | AI review | `final-qa.md` | ◇5 | caught in both briefs, on a note the brief quotes (an upper bound) | AI trial 17/11: S3-058 hit 2 of 2; colourgate.mjs measures luma and hue only against the film's own colour script, so a script that approves a dark or one-hue film still needs this review |
| `angle` | the same camera angle over and over | machine | `cutgate.mjs` | ◇5 | C5: at most 3 takes of one angle family (side around the lead, low / eye / high, close / medium / wide) in any 5 takes in a row | AI trial 17/11: S3-060 hit 2 of 2 with no camera rows; Hot Money ep01 A v9 banks: 3 back, eye-level, medium takes in a row, inside the 80 % Kai approved 20/11 |
| `motion-feel` | motion that feels jerky or stiff with no pose that snaps and holds | Kai |  | ◇4 ◇5 | no detector | S3-035: 0 joint pops in its window; AI 0 of 2 |
| `prop-across-cut` | a prop jumps or vanishes across a cut | Kai |  | ◇4 ◇5 | shotgate.mjs now blocks a held prop that jumps 15 cm off its holder's carry or vanishes at a cut inside one scene (prop jumps / vanishes at cut), but no complaint has a measured hit yet: Kai keeps the row | S3-038 largest prop jump 2.9 px, S3-040 no prop gone after the cut (v002, its rows gone, not replayable); AI half on S3-038, 0 on S3-040; Hot Money ep01 A v9 rows: 0 at-cut faults |
| `grip-drag` | a held prop drags the arm, as if it holds the person | Kai |  | ◇4 ◇5 | no detector | S3-047: 0 grip faults in its window; AI half in one brief |
| `cloth-jitter` | cords or cloth jitter | Kai |  | ◇4 | cord shake is shown, never blocks | S3-062: CORD_SHAKE_MAX is not a gate; slice rows are gone |
| `acting` | a face that does not fit the moment, or flickers between faces | Kai |  | ◇4 | facebeat.mjs reads only the beat's words | S3-041 and S3-043 AI 0 of 2; v002 faces use names facebeat.mjs cannot read |
| `scale-kind` | an effect or prop of the wrong size or kind | Kai |  | ◇3 ◇4 | no detector | S3-048 and S3-049 AI half in one brief |
| `unreadable` | a face or action lost at phone size: blank, covered, a confusing shape | Kai |  | ◇4 ◇5 | cutgate.mjs C4 sees only the frame edge | S3-044, S3-051, S3-052 AI at most half |
| `text-load` | too much text on screen | Kai |  | ◇2a ◇5 | prepro.mjs counts card time, not words on screen | S3-059 never replayed |
| `story-feel` | the whole film's feel: frustrating, no climax | Kai |  | ◇2a ◇5 | no detector | S3-054, S3-064 |

- **Every render**: machine `library-unused`.
- **◇2a**: Kai watches `text-load`, `story-feel`.
- **◇3**: machine `rig-deform` · Kai watches `scale-kind`.
- **◇4**: machine `pose-snap`, `prop-appears`, `prop-floats`, `figure-skates`, `body-through-set`, `prop-in-head`, `prop-leaves-view`, `prop-out-of-scale`, `far-plane-cut`, `face-unapproved`, `figure-jumps`, `face-repeat`, `face-off-beat` · Kai watches `motion-feel`, `prop-across-cut`, `grip-drag`, `cloth-jitter`, `acting`, `scale-kind`, `unreadable`.
- **◇5**: machine `pose-snap`, `prop-appears`, `prop-floats`, `figure-skates`, `body-through-set`, `prop-in-head`, `prop-leaves-view`, `prop-out-of-scale`, `far-plane-cut`, `figure-jumps`, `too-many-cuts`, `low-camera`, `face-cut-off`, `colour-jump`, `colour-off-script`, `angle` · AI review `dark` · Kai watches `motion-feel`, `prop-across-cut`, `grip-drag`, `unreadable`, `text-load`, `story-feel`.
<!-- whochecks:end -->
