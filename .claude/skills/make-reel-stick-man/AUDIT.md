# Audit · make-reel-stick-man (November 2026)

Why stage 1 was rebuilt, what stayed, and what is still to do. Written after Hot Money episode 1 reached its animatic
(v3) and "felt not there yet" without a named cause.

## Verdict

Stages 2-4 were strong: physics, measurable gates, independent judges, a clear loop. Stage 1 was a list of outputs with
one line each and no standard, no intermediate steps and no way to diagnose. The film's quality is set in stage 1, so
the weakest stage was the one that mattered most.

## What stayed (it works)

- The loop: one step, proof Kai can see, 2-3 options, a fresh agent before Kai, decisions on the page.
- Fixing a problem in the stage that caused it; never loosening a threshold; stop after 2 rounds.
- The camera-pass method (intent, intensity graph, axis map, 3 options, lock check), the muted read test, the
  million-views script rules, the board judge, the floor plan of the set.

## Gaps found

| # | Gap | Where it showed (Hot Money ep. 1) | Now |
|---|---|---|---|
| 1 | The unit of stage 1 was the voice line (`storyboard.json` had an empty `shot` field); there was no shot list | 22 panels for 29 lines, one still per line, a slideshow animatic | shot list with ids, sizes, angles, lenses, moves, purposes (REEL_DATA.md, Shot list) |
| 2 | Camera intent was decided in stage 3, after assets | "Góc máy sẽ làm kỹ ở khâu 3" while ◇2 claimed to lock "cú máy" | camera-intent pass in [1.6], ◇2b; stage 3 executes |
| 3 | No scene intent before stage 3 | no way to judge "does this shot serve the scene?" | [1.0] scene brief: feel, whose, key, question, intensity plan |
| 4 | No fidelity rule | final 3D renders used as storyboard panels; every change cost a render | grey until ◇2a (PREPRO.md section 6) |
| 5 | No rule for explaining in pictures | 27 s of cards after the hook; facts the picture never showed ($27,000) | the explain ladder (PREPRO.md 4.3) + checks C5 |
| 6 | No coverage standard for actions | "who shoots?" | source → act → result (4.4); muted retell |
| 7 | No safe-zone or reading-speed standard | captions at the bottom edge | text-safe box, ≤ 15 cps, `--safe 1` overlay, check C9 |
| 8 | Animatic = stills held per line over the voice; no burn-in, no versions | notes could not name a shot or a frame | `animatic.mjs`: shots, keys, 2D moves, burn-in, versions, CUTS |
| 9 | Lock on a scratch voice allowed | 83 s animatic vs ~86 s final voice | final voice before ◇2a; shots anchored to words |
| 10 | One gate for story, shots and look | a look approval hid a story problem | ◇2a / ◇2b / ◇2c |
| 11 | No diagnosis method | "chưa tới" with no next step | DIAGNOSE.md: isolation tests, note translation, symptom tables |
| 12 | Script and picture checked separately | DAY 3 on a panel, no day three in the voice | on-screen words live in `text` per shot, checked per line |

## What changed

| File | Change |
|---|---|
| `PREPRO.md` (new) | the stage-1 playbook: flow, vocabulary, each step's standard / gate / mistakes, craft knowledge, reviews, fidelity, gates, fixes |
| `DIAGNOSE.md` (new) | symptom → test → cause → fix → stage; notes translation; process smells; the Hot Money worked example |
| `SKILL.md` | stage 1 rows rebuilt ([1.0]-[1.7], ◇2a/b/c), [3.1] now executes the locked intent, new rules, file index |
| `PROCESS.md` | options as grey pictures before ◇2a, per-shot notes, camera pass split into intent ([1.6]) and execution ([3.1]), CUTS from the shot list, stage-1 review prompts |
| `REEL_DATA.md` | the shot list format (`scenes`, `shots`, options) |
| `GATES.md` | pre-production checks and thresholds |
| `LEDGER.md` | ◇2a / ◇2b / ◇2c rows |
| `styles/stick-man/tools/prepro.mjs`, `animatic.mjs`, `shotlist.mjs` (new, kit: needs a PR) | the checker (coverage, timing, cards, text, safe zone, continuity, intensity flags, `intensity.svg`) and the animatic builder |

## Roadmap (kit tasks, in order of value)

1. **Grey preview mode** in the engine (`?look=flat`): proxy figures, flat light, no grade, so [1.4b] panels and [1.6]
   options can be rendered from the floor plan in seconds.
2. **Stage page: shot cards** in `templates/stage-page.html`: one card per shot (panel, purpose, size/lens/move, story vs
   visual), a note box per shot, the intensity graph on top.
3. **`board.mjs` reads `shots`**: stills per shot as well as per line; the muted retell prompt as a `--retell` mode.
4. **`gates.mjs` reads `review/prepro.md`**: the pre-production checks also run at stage 4, so nothing regresses.
5. **`shotplan.js` respects the shot list**: the auto planner only fills shots the list leaves empty, and takes the
   scene's `feel` and the shot's `story` into its choice.
6. **Retrofit Hot Money ep. 1** with the new stage 1 as the second worked example (`examples/hm-ep01/`).

## First run: Hot Money episode 1 (13 Nov 2026)

`films/hm-ep01/stage1/` in the `no-memory` worktree: `v3/` is animatic 3 encoded as a shot list, `v5/` the redesign,
`build.py` makes both, `compare_v3_v5.mp4` plays them side by side on the scratch voice.

| | v3 (as made) | v5 (new stage 1) |
|---|---|---|
| shots | 22 | 40 |
| `prepro.mjs` | FAIL: 44 FAIL, 32 WARN | PASS: 0 FAIL, 3 WARN (action keys still to draw) |
| text outside the text-safe box | 43 | 0 |
| longest run of cards | 27.2 s | 3.7 s |
| cards in total | 27.2 s (33 %) | 12.6 s (15 %) |
| climax is the visual peak | tied with an earlier insert | yes, 10/10 at SH180 |

What the run changed in the tools: P2 no longer asks for a second key on a 2D move (`cam2d`); `montage` waives C3/C4 for
a deliberate run; C9 measures the width of a text block, not only its centre. Open: the scratch voice's word times are
estimated inside each line (the final Achird take of script v4 does not exist yet, and `vo/words.json` still holds an
older draft), so ◇2a cannot close until the voice is recorded.

## Round 2: every stage (14 Nov 2026)

The all-stage audit (doc "Audit quy trình make-reel-stick-man · 5 khâu") found six cross-cutting problems: decisions lost
between stages, sources out of sync, steps that can be skipped, a tool PASS read as approval, reference numbers from one
video, and no learning loop. Built: `stagegate.mjs` + `GATES.json` (evidence per gate, judged files must name an
independent reviewer, approvals must be newer than the evidence), `develop.mjs` + DEVELOP.md (stage 0), the decision log
`DECISIONS.json` with machine checks (prepro.mjs D1-D3), voice-vs-script (V1/V2), the story lock (K1), options on flagged
shots (O1), `assets.mjs` (breakdown, states, set measured against the story), `timing.mjs` (move-length spread, acting
briefs), `postcheck.mjs` (sound plan, delivery package, file spec), `retention.mjs` + PUBLISH.md (stage 5).

Proof on real data: the v5 redesign broke 5 decisions Kai approved in season-1.md Ep1 (a cut inside the approved
no-cut first 3 s, HUD "BAGS" instead of "IN CAR", no SUSPICION, 2D cards under the approved share, no split-screen ending);
the motel set's run measures 11.3 m against the story's 34 steps ≈ 15 m; the repo's voice is from an older script (30 V1
FAILs); pilot-a's delivery lacks a sound plan, cover, caption, subtitles and CREDITS. Open: grey preview mode, per-shot
stage-page cards, a light-separation measure (kit PRs), and real retention numbers.
