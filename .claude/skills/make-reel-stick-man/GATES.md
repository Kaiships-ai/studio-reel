# Gates

## Every gate: evidence first

```sh
node styles/stick-man/tools/stagegate.mjs films/<slug> <1|S|2a|2b|2c|3|4|5|6|all>   # review/gate-<id>.md
```

Each gate in `styles/stick-man/tools/GATES.json` lists four kinds of evidence: **measured** (a tool that must exit 0: `develop.mjs`, `scriptlint.mjs`, `prepro.mjs --gate`, `assets.mjs`, `timing.mjs`, `postcheck.mjs`), **made** (the maker's files), **judged** (`by: agent:<id>` or `person:<name>`, newer than what it reviewed) and **approved** (Kai in `review/approvals.json`, after the latest evidence). States: OPEN → READY FOR KAI → LOCK. A film may add evidence in `review/gates.local.json`, never remove any.


```sh
node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --report films/<slug>/review/<slug>_vN-stats.txt --in <mp4>
node styles/stick-man/tools/gates.mjs --report <stats> --in <mp4> --film films/<slug> --profile pilot|full --out films/<slug>/review/<slug>_vN-gates.txt
```

`gates.mjs` prints PASS, FAIL or WAIVED for every gate, then the profile line, e.g. `profile pilot: 34 PASS, 0 blocking FAIL, 19 reference gates WAIVED`. It exits 1 on a blocking FAIL.

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
| mix loudness, true peak | −14 ± 0.5 LUFS, ≤ −1 dBTP | `sound.py` targets |
| props / fx seen | every listed prop seen ≥ 3 frames in its line | frame it, or fix the storyboard entry |
| board shown | ≥ 85 % of lines | fix the picture (PROCESS.md section 7), then judge again |

## Quality

| Gate | Threshold | Fix |
|---|---|---|
| frozen run | ≤ 8 frames with no joint moving 1 mm / 0.3° | every key carries `cycle: BREATH` |
| body acting | ≥ 70 % of a lead's frames | a motion v2 lead counts from its first key; a verb-driven lead needs body verbs |
| expressions | ≥ 5 per 30 s | a strong face per line (`engine/faces.js` EXPR) |
| expression lead | the face lands ≥ 3 frames before its word | put `expr` on the word's key |
| close-up head x | 45-55 % of the width in `cu` frames | reframe |
| mouth range | CV ≥ 0.4 while talking | talking characters only |
| storyboard entries, acting plan, props / fx used | every line has an entry, an `act` and a prop or effect on ≥ 40 % of lines | complete `storyboard.json` |
| floating labels, fx in world | 0 floating stickers; every storyboard fx is a physical thing | words go on a sign, a calendar or an overlay that the picture backs |

## Reference

clear frames ≥ 94 % · still frames < 1 % · small-figure run ≤ 120 f · colour SATAVG median 19-47 · colour per shot (YAVG
60-170, SAT 13-54, YLOW 17-101) · shadow contrast 0.235-0.388 · ink thickness 2-3 px · caption height / weight · hard cuts
≤ 0.2 per 10 s · dissolves ≥ 50 % · rush peak ≥ 90 px/f · time in moves ≥ 30 % · shot length CV ≥ 0.6 · light per place ·
first move ≤ f30 · outline thick/thin 1.7-2.5 · mouth movement · bed in pauses −12..−10 dB · duration 60-80 s · distinct
sets ≥ 3 · shot variety / types / type run · establishing and insert shot · wide share ≥ 30 % · low angle share ≥ 7 % · open
on the verb · dressing density ≥ 16 pieces · style judge ≥ 8.5 · blind test ≤ 8/12. (Measurement details: comments in
`styles/stick-man/tools/gates.mjs` and `tools/forensic/`.)

## Judged gates

- **Board.** `node styles/stick-man/tools/board.mjs films/<slug> --judge 3`. It renders `review/board.jpg`, 2 stills per line: A on the entry's `still` word, B at the line's prop peak. 3 independent headless reviewers judge it; a line is shown when 2 of 3 say so. The result goes to `review/board-verdict.json`, which `gates.mjs` reads. Rerun after any change to the reel data.
- **Style judge and blind test** (reference profile). `node styles/stick-man/tools/judge.mjs films/<slug> --in <mp4> --ref <private reference dir>`. The reference stays outside the repo.
