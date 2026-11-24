---
name: make-reel-stick-man
description: Make a vertical (1080x1920, 30 fps) stick-man 3D film by the standard animation pipeline - Development, Pre-production, Asset, Shot, Post, Publish + learn - where machine gates and independent reviewers check every step and Kai only judges rendered pictures at six touchpoints (S1 look, S2 face sheet per series; K1 previs + hook, K2 whole film, K3 change of approach, Post per episode). Use when Kai or Studio asks for a stick-man reel or stick-man story film, or Kai gives a camera note on one ("previs", "thử góc máy", "máy quay …": the camera previs mode). Trigger: /make-reel-stick-man
argument-hint: "<slug> <story idea or script>"
---

# /make-reel-stick-man

The standard process for a stick-man film (dev only).

- Run from the library root with `.pixi/envs/default/bin/node` and `.pixi/envs/default/bin/python` (written `node` / `python` below), never `pixi run`.
- The film lives in `films/<film>/` of the main checkout (git-ignored). Kit and engine changes go in a fresh worktree and a PR, merged after an independent review says CLEAN and CI is green (`.agents/playbooks/stick-man-kit-fix.md`).
- Started by Studio (the Orca bot)? Follow [WORKER.md](WORKER.md): run `node styles/stick-man/tools/run/status.mjs films/<film>` first and trust it over memory.
- Start a new film with `node styles/stick-man/tools/run/new_film.mjs`. Needs: `GOOGLE_API_KEY` in `.env` (voice), faster-whisper (align), `claude` on PATH (board judges).
- Kai reads Vietnamese: replies and page text are Vietnamese; "Em đề xuất" marks your recommended option.
- pstack: the film runs under `.agents/playbooks/stick-man-film.md`. Start a session with `/pstack:poteto-mode`.

Read [PROCESS.md](PROCESS.md) before step 1 (section 12 has every step in detail), `DIRECTOR.md` (library root) and [DEVELOP.md](DEVELOP.md) before stage 0, [SCRIPT.md](SCRIPT.md) before the script [1.1], [PREPRO.md](PREPRO.md) before stage 1, [GATES.md](GATES.md) for gate commands and Who checks what, [PUBLISH.md](PUBLISH.md) for stage 5, and [DIAGNOSE.md](DIAGNOSE.md) whenever a result "doesn't land".

## Kai's touchpoints

Kai judges rendered pictures, never a process, a number or a merge. He is asked at exactly these six points. Every
other approval is machine checks plus an independent reviewer. The list lives in `GATES.json` `touchpoints`;
`test/unit/stick-touchpoints.test.mjs` fails on a new Kai approval point that is not one of them.

| # | When | What is shown | The decision | Recorded in |
|---|---|---|---|---|
| **S1** look + colour | once per series | 3 looks rendered on 2 shots, side by side at phone size | the series look; it signs every episode's colour script | `colour-script.json` `approved: { by: "kai", at }` |
| **S2** face sheet | once per series, and for a new character | `facesheet.mjs` sheet: the face designs on every beat's expression | the faces | `review/faces-approved.json` (`facesheet.mjs --approve`) |
| **K1** previs + hook | every episode, before the build | the whole-film previs on the real voice + temp music, 3 hook options rendered side by side | the hook, and notes per segment | `approvals.json` `"2b": { by: "kai", at, hook }` |
| **K2** whole film | every episode: v1, then after one fix round | the 720p film at 1x with sound, a note box per segment, beside the last version | notes per segment, or OK | `approvals.json` `"5": { by: "kai", at, notes }` + `review/retakes.json` |
| **K3** change of approach | when `retakes.mjs` reports PREMISE (2 failed rounds on one shot and fault kind), or a gate FAIL can only end by a waiver or by dropping a decision Kai approved | 2-3 truly different approaches rendered side by side, the waiver among them | one approach, or the waiver | a PREMISE pick: `retakes.json` `k3: [{ shot, kind, round, pick, at }]`; a waiver or override: `DECISIONS.json` `{ waives \| conflict, by: "kai", at, status: "approved" }`, which `kituse.mjs`, `colourgate.mjs` and `scriptlint.mjs` read |
| **Post** | every episode | the post copy in Studio | taps Post; Studio posts | `status.json` approval (Studio writes it) |

Before any touchpoint the machine gates pass and an independent reviewer has checked the work. Show only renders side by
side, never text or numbers alone; if two options do not differ clearly at phone size, do not send them.

- **The AI reviewer is advisory** until a brief passes `calibrate.mjs` on Kai's notes. It is always required, its
  verdict is on the page, and it may lock a process gate, never K1 or K2 (`stagegate.mjs` refuses an agent there).
- **80 % on the first run.** K2 v1 with at most 5 Kai notes passes; more fails. Kai's note count is the measure, never an
  agent score. Each note gets a `kind` (a `WHOCHECKS.json` row) and a `root` (kai-taste R1-R5) in `review/retakes.json`.
  When the episode posts, `node styles/stick-man/tools/series/firstrun.mjs add films/<film> --rounds <n> --minutes <m>` appends
  its row to `styles/stick-man/bench/first-run.tsv`. The next episode's ◇1 runs `firstrun.mjs check`: a note kind still
  checked only by Kai fails until it has a machine or AI check.
- **PREMISE.** Notes on the same shot and fault kind in 2 rounds mean the fix direction is wrong. `retakes.mjs` (run at
  ◇4 and ◇5) reports PREMISE and fails; there is no third round on that direction. Make K3.
- **Needs you** (to Studio, WORKER.md): K1 ready, K2 ready, K3, a bible asset missing (a series-setup run, not an
  episode), Post ready. Never: merges, gate numbers, PRs, process plans, kit faults.

## The loop (every step)

1. Do one numbered step, e.g. [3.1].
2. Make the proof: a still, a sheet, a video, or a number.
3. When there is a choice, render 2-3 options next to the current state (grey before ◇2a, real renders after) and mark **Em đề xuất**.
4. A fresh independent agent challenges it, starting from Kai's taste (`~/.claude/skills/kai-taste/SKILL.md`, PROCESS.md section 2): the script reviews (SCRIPT.md section 5), the pre-production reviews (PREPRO.md section 5), the camera pass, the blocking review, and the sạn hunt on every pass. Fix what holds up. Never score your own work.
5. The reviewer picks among options at a process step; the pick, the reason and the rejected options go in `DECISIONS.json` and on the page, where Kai can change them at his next touchpoint.
6. The episode page shows only the latest state: republish in the same turn. A page that takes Kai's notes or picks declares the `db` capability; read them back with `ArtifactData`, never from localStorage alone ([#137](https://github.com/Kaiships-ai/studio-reel/issues/137)).
7. Reply short in Vietnamese and end with the table `việc · đầu ra · bằng chứng · trạng thái`. In a session Kai runs by hand, the last block is the progress bar: one bar per stage 0-5, % = steps done (1) + in progress (0.5) over the stage's steps, the current step marked `◀`, the open gates with their `stagegate.mjs` state. A Studio worker reports through `status.json` instead.

   ```
   Tiến độ · <film>
   0 Development ██████████ 100%  ◇1 LOCK
   1 Tiền kỳ     ████░░░░░░  44%  ◀ [1.1] script · ◇S READY FOR REVIEW · ◇2b OPEN (K1)
   ```

## Notes from Kai

Kai's notes come at K1 and K2, per segment. A note with no shot gets one question back ("shot nào?"); a vague one is
translated with DIAGNOSE.md section 2. Every note goes into `films/<film>/review/retakes.json` (round, `where` = the
shot, type, `kind`, `root`) and stays open until a later round closes it. `node styles/stick-man/tools/review/retakes.mjs
films/<film>` fails a round with more notes than the one before, one that repeats a closed note, and an open PREMISE.

## Mode: thử góc máy (camera previs from the film's own engine)

Triggers: "previs", "thử góc máy", "máy quay …" (a camera note such as "đoạn đua xe, máy quay dính tường nhà, nâng lên
chút"). Use it in any stage once the film renders in the engine.

1. `node styles/stick-man/tools/run/camtry.mjs "<Kai's note, word for word>"` through the render lock. Never look up the film, segment or frames by hand.
2. Its first line is the readback ("Em hiểu là: phim X, đoạn Y …"); put it at the top of the reply. Wrong readback: rerun with `--film`, `--frames A-B` or a clearer note.
3. Show `variants.mp4`, `top.jpg` and `section.html` from `<film>/review/camtry/<SEG>-<A>-<B>/`; then `camtry.mjs pick <out dir> <Vn>` and re-render the act and its gates.

Detail: PROCESS.md section 11. Feature map: `.claude/skills/verify/features/stick-man-camtry.md`.

## Stages and gates

Every step in detail: PROCESS.md section 12. A later stage's problem is fixed in the stage that caused it.

| Stage | Steps | Gate | Approved by |
|---|---|---|---|
| **0 Development** | [0.0] benchmark (Rick bench `styles/stick-man/bench/TABLE.md`) · [0.1] brief + series bible · [0.2] treatment · [0.3] hook test · [0.4] beat board · [0.5] decision log | ◇1 brief, treatment, story | reviewer |
| **1 Pre-production** | [1.0] scene brief + intensity · [1.1] script (SCRIPT.md) | ◇S script lock | reviewer |
| | [1.1p] picture pass · [1.2] look (the S1 series look) · [1.3] design + floor plans · [1.4] storyboard · [1.5] voice · [1.6] animatic · [1.6p] whole-film previs + temp music + 3 hooks · [1.7] colour script (S1 signature) | ◇2a story + timing · **◇2b shot lock = K1** · ◇2c look + design | reviewer · **Kai (K1)** · reviewer |
| **2 Asset** | [2.1] rig + dose · [2.2] faces (S2 sheet), set, props · [2.3] run-through · [2.4] breakdown + layout check | ◇3 asset lock | reviewer |
| **3 Shot** | [3.1] camera pass · [3.2] overlays · [3.3a] acting brief · [3.3] blocking · [3.4] polish · [3.4b] light per shot · [3.5] board + feel check + shot gate | ◇4 shot lock | reviewer |
| **4 Post** | [4.0] sound plan · [4.1] sound · [4.2] render 720p · [4.3] gates · [4.4] final QA + package | **◇5 deliver = K2** | **Kai (K2)** |
| **5 Publish + learn** | Post (Kai taps, Studio posts) · [5.1]-[5.6] retention, post-mortem, bench row, bible update (PUBLISH.md) | ◇6 learn | reviewer |

**Every gate is checked by `node styles/stick-man/tools/gates/stagegate.mjs films/<film> <gate>`** (evidence and approver:
`styles/stick-man/tools/gates/GATES.json`). A gate is LOCK when its measured checks pass, the maker's files exist, the judged
evidence was written by someone else (`by: agent:<id>`) after the last change, and its approver signed
`review/approvals.json` after the latest evidence: an independent reviewer with `verdict: "READY"` at a process gate,
Kai at K1 and K2. States: OPEN → READY FOR REVIEW or READY FOR KAI K1/K2 → LOCK. Read them from the tool, never from
memory. A check the gate cannot measure fails, or passes only with a waiver Kai gave at K3 (`DECISIONS.json`, [#135](https://github.com/Kaiships-ai/studio-reel/issues/135)).

## Who checks what

Each fault kind has one checker: a machine gate, the AI review, or Kai. The table is generated from
`styles/stick-man/tools/gates/WHOCHECKS.json` into [GATES.md](GATES.md) (`node styles/stick-man/tools/gates/whochecks.mjs --write`;
without `--write` it fails when they differ). A row leaves Kai's column only when a replay of his notes shows the new
checker catching them (`whochecks.mjs map <private map>`). A Kai note in a new kind becomes a row and a check before the
next episode (`firstrun.mjs check`).

## Rules

Each rule names what enforces it; `test/unit/stick-touchpoints.test.mjs` fails a row that names no tool, test or
independent review. Why each rule exists, with the film that paid for it, is in the `WHOCHECKS.json` sources and git.

| Rule | Enforced by |
|---|---|
| Kai is asked only at S1 S2 K1 K2 K3 Post; everything else is machine checks + an independent reviewer | `test/unit/stick-touchpoints.test.mjs`, `stagegate.mjs` |
| K2 v1 passes with at most 5 Kai notes; each note gets a kind and a root, and a check before the next episode | `firstrun.mjs` |
| Two rounds on one shot and fault kind: stop, K3 with 2-3 different approaches; never loosen a threshold | `retakes.mjs` |
| Judged evidence is never written by the maker; an approval older than its evidence does not count; rerun the gates after any re-render | `stagegate.mjs` |
| Motion obeys the 12 principles and body physics: no penetration, bones keep length, joints in range, balance, g = 9.8, no pops | `shotgate.mjs`, `rigtest.mjs` |
| Style is the dose each principle is bent (`STYLE_PRESETS.kaiships`, a moving hold `life` in every act); physics is the floor | `kituse.mjs` |
| Background characters and the lead's first blocking come from the motion library; the lead's acting is keyed by hand on top; a new stock motion goes in the library with its checks | `styles/stick-man/bible/check.mjs`, `motionlib.mjs` |
| Faces sell the character: a new face lands on a cut, few takes (≤ 4 a minute), each face held 6 f, no face beyond 2 takes | `facebeat.mjs` |
| No new or changed face design reaches a render Kai sees before the S2 face sheet has it; a sheet made again after he looked is refused | `facesheet.mjs`, `facebeat.mjs` |
| Every camera states its purpose and a clear size (a real wide or a real close-up, a clean background behind faces) | `review/campass1.md`, `prepro.mjs` |
| A figure that walks or turns keeps its face to the lens (fly it with `faceCam`); the lead is not seen from behind for 2 s | `headgate.mjs` |
| The unit of pre-production is the shot: id, purpose, size, angle, lens, move and story intensity before it is drawn well | `prepro.mjs` |
| Keep the direction conventions and one camera axis per place | `prepro.mjs` |
| Camera intent is locked in pre-production (◇2b, seen by Kai at K1); stage 3 executes it in 3D | `prepro.mjs`, `stagegate.mjs` |
| The script is written from a beat outline, tested by readers who did not write it, and locked at ◇S; a new draft replaces the old one only if it wins a blind A/B | `scriptlint.mjs`, `review/script-ab.md` |
| Every line is something the point-of-view character can know right now; a logic sạn hunt runs on every script and hook | `review/skeptic.md` |
| A fact the script states is checked against the rest of the story; a rule never answers the ending vote | `review/fact-check.md` |
| Explain in pictures first; a card last, ≤ 8 s of cards in a row and ≤ 25 % of the film | `prepro.mjs` |
| Words, numbers and faces stay in the text-safe box (x 6-87 %, y 14-65 %) on every frame, zooms included | `animatic.mjs` |
| A word on screen never sits on a face, under the app's buttons or on another card, and no word carries a middle dot or bullet | `textgate.mjs` |
| The animatic is locked on the final voice, timed in frames, with burn-in | `prepro.mjs` |
| A delivery copy is the approved film frame for frame (native 1080, the approved sound copied, motion fields from the approved pass) before it reaches the upload folder | `copycheck.mjs` |
| Approved decisions live in `DECISIONS.json` and are checked at every gate; dropping one Kai approved goes to him at K3 | `develop.mjs` |
| The confirmed scene feels and story scores are locked (`prepro.mjs --lock-story agent:<id>`); a later change is a FAIL | `prepro.mjs` |
| An overlay or an on-screen counter claims only what the picture and the story math show, changing on the word that causes it | `review/final-qa.md` |
| A hand, a strike or a tool lands on a real target and holds 2-4 frames | `shotgate.mjs` |
| Props and scenery obey the set: clear of heads and solids, in frame while the holder is, real size, the engine's sky dome the only sky | `shotgate.mjs` |
| A prop let go lands on what the set built (`S.rest`) | `test/unit/stick-prop-rest.test.mjs` |
| An `'along'` hand prop with a top declares `userData.top`; never roll a kit prop in a film | `test/unit/stick-prop-roll.test.mjs` |
| A costume is a closed shell on the engine body moved only by its physics; a Blender look is ported 1:1 with a match sheet | `test/unit/stick-cloth.test.mjs` |
| A new set, prop, fx or verb goes in the kit catalog with its rule, never for one film's taste | `styles/stick-man/bible/check.mjs` |
| The film's colour follows the colour script signed with the S1 look, lit in the acts (light + grade, `grade.exp` ≤ 1.5), never graded onto the rendered picture; a look change starts from a whole-look prototype at S1, never from number tweaks | `colourgate.mjs` (per-scene ranges and brightness from the script); `exposureWarnings` in `engine/play.js` (`test/unit/stick-exposure.test.mjs`) |
| A run log is written only through `logline.mjs`; old lines are never edited | `logline.mjs` |
| Render by purpose: T0 data, T1 stills, T2 480p proof, T3 720p review (what the pixel gates and K2 see); T4 1080p only on Kai's own request, normally for Post (`shot.mjs --tier final --kai-ok "<his words>"`) | `render/tiers.mjs` |
| The film never goes empty under its words: no holes, the bed within 18 dB of the voice, a close as full as the film (`floor` in music.json fills the holes) | `floorgate.mjs` |

Open, no check yet (a kit-fix PR): frames, audio and wording of a reference are never copied, and `ref-private/` is
never committed.

## Files

| File | What |
|---|---|
| [PROCESS.md](PROCESS.md) | the episode page, agent prompts, camera pass, blocking/polish, sạn hunt, board, sound, deliver, camtry steps, every step in detail |
| [DEVELOP.md](DEVELOP.md), [SCRIPT.md](SCRIPT.md), [PREPRO.md](PREPRO.md), [PUBLISH.md](PUBLISH.md) | stage 0, the script and ◇S, stage 1 in depth, stage 5 |
| [GATES.md](GATES.md) | gate commands, thresholds, fixes for a FAIL, and the generated Who checks what table |
| [WORKER.md](WORKER.md) | the Studio contract: status.json, verbs, worker rules, the `worker_done` report |
| [DIAGNOSE.md](DIAGNOSE.md), [REEL_DATA.md](REEL_DATA.md), [LEDGER.md](LEDGER.md) | symptom → cause → stage; `storyboard.json` and `reel.js` keys; the ledger template |
| `styles/stick-man/tools/gates/GATES.json`, `stagegate.mjs` | each gate's evidence and approver, the touchpoints, and the checker |
| `styles/stick-man/tools/review/retakes.mjs`, `tools/series/firstrun.mjs`, `tools/review/calibrate.mjs` | Kai's notes per round and PREMISE, the first-run bench, whether a review brief agrees with Kai |
| `styles/stick-man/tools/` ([README](../../../styles/stick-man/tools/README.md)) | one folder per stage of the work: `run/` (make the pieces), `render/`, `gates/` (the measured checks of each stage), `review/`, `series/` |
| `styles/stick-man/kit/` ([README](../../../styles/stick-man/kit/README.md)) | what films build with: `sets/`, `cast/`, `props/`, `acting/`, `fx/`; imported as `#kit/...` inside `styles/stick-man/` |
| `templates/stage-page.html`, `styles/stick-man/docs/` | the episode page; kit reference: verbs, poses, faces, sets, Blender sets |
