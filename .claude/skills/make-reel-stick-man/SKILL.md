---
name: make-reel-stick-man
description: Make a vertical (1080x1920, 30 fps) stick-man 3D film by the standard animation pipeline - Development, Pre-production, Asset, Shot, Post, Publish + learn - with Kai approving each step on one page per stage, real renders for every option, independent agents checking each pass, and characters that obey Disney's 12 principles and body physics at the 'kaiships' dose. Use when Kai asks for a stick-man reel or stick-man story film. Trigger: /make-reel-stick-man
argument-hint: "<slug> <story idea or script>"
---

# /make-reel-stick-man

The standard process for a stick-man film (dev only).

- Run from the library root with `.pixi/envs/default/bin/node` and `.pixi/envs/default/bin/python` (written `node` / `python` below), never `pixi run`.
- Work in a fresh worktree. `films/` is git-ignored; kit and engine changes go in PRs, and Kai merges.
- Worked example: `styles/stick-man/examples/pilot-a/` (copy it to `films/pilot-a/` to replay it; its README says how).
- Needs: `GOOGLE_API_KEY` in `.env` (voice), faster-whisper (align), `claude` on PATH (board judges).
- Kai reads Vietnamese: replies and page text are Vietnamese; "Em đề xuất" marks your recommended option.

Read [PROCESS.md](PROCESS.md) before step 1, `DIRECTOR.md` (library root) and [DEVELOP.md](DEVELOP.md) before stage 0, [SCRIPT.md](SCRIPT.md) before the script [1.1], [PREPRO.md](PREPRO.md) before stage 1, [PUBLISH.md](PUBLISH.md) for stage 5, and [DIAGNOSE.md](DIAGNOSE.md) whenever a result "doesn't land" and the cause isn't obvious.

## The loop (every step of every stage)

1. Do one numbered step, e.g. [3.1].
2. Make the proof Kai can see: a still, a sheet, a video, or a number.
3. When there is a choice, show 2-3 options. Each option is a picture next to the current state, never text only: grey panels or grey engine stills before ◇2a, real renders after. Mark one **Em đề xuất**.
4. Before Kai sees it, a fresh independent agent challenges it:
   - script: the fact check, the skeptic pass, the ear retell and the blind A/B (SCRIPT.md section 5);
   - board and animatic: the muted retell, the 5-second read, the explain audit and the swipe test (PREPRO.md section 5);
   - layout and camera: the camera-pass prompt;
   - poses: the blocking and 12-principles prompt;
   - every pass: the sạn hunt.

   Fix what holds up. Never score your own work.
5. Put it on the stage page: status rows plus decision buttons. Kai picks there and may approve several steps at once.
6. Read his picks from the page's db, lock them, and strip the rejected options and stale sections from the page.
7. Reply short in Vietnamese and end with the table `việc · đầu ra · bằng chứng · trạng thái`.

Notes from Kai are acted on per shot. A note with no shot gets one question back ("shot nào?"); a vague one is translated with DIAGNOSE.md section 2 before anything is changed.

## Stages, steps and gates

| Stage | Step | Output | Proof Kai sees |
|---|---|---|---|
| **0 Development** | [0.0] benchmark | 3-5 videos of the same format: hook, sizes, rhythm, sound, swipe points; what to learn, what not to take (DEVELOP.md) | treatment section |
| | [0.1] brief + treatment | `node styles/stick-man/tools/new_film.mjs <slug>` makes the folder, `vo/script.json`, `storyboard.json`, `reel.js`, `LEDGER.md`; you write `BRIEF.md` and `TREATMENT.md` (3 structures + choice, logline, arc). A reference is a quality bar, never a shot list. | the page |
| | [0.2] beat board | the whole story in ~12 panels (one beat each); pick a pilot segment that is a complete mini story (conflict + payoff) | sketch panels |
| | [0.3] hook test + decision log | a fresh agent picks a hook from thumbnails + first lines (`review/hook-test.md`); every decision in `DECISIONS.json` with `where` and a `check` when a tool can verify it; `node styles/stick-man/tools/develop.mjs films/<slug>` | hook test, decision list |
| | **◇1** brief, treatment, story (`stagegate.mjs … 1`; the structure is locked here) | | |
| **1 Pre-production** | [1.0] scene brief + intensity plan | `storyboard.json` `scenes`: feel, whose, key, question per scene; want / obstacle / outcome per beat; target story intensity and the climax (PREPRO.md [1.0]); Kai confirms the feel lines | brief table + intended curve |
| | [1.1] script (SCRIPT.md) | **a** beat outline with but/so links, plants, vote costs (`vo/beats.json`); **b** fact sheet (`vo/facts.json`) + fresh fact check; **c** draft `vo/script.json` until `node styles/stick-man/tools/scriptlint.mjs films/<slug>` has no FAIL; **d** skeptic pass; **e** table read + ear retell; **f** punch-up: 3 rewrites per flagged line, Kai picks; **g** blind A/B against the last locked script | script + lint + the four reviews + the A/B winner |
| | **◇S** script lock (`stagegate.mjs … S`; a later script change reopens it and the voice is recorded again) | | |
| | [1.1p] picture pass | per locked line `see` + an explain device from the ladder (PREPRO.md 4.3); no card where an event or object can carry the fact | line/device table |
| | [1.2] visual development (parallel) | 2-3 looks rendered as style frames on two shots of the shot list (a wide, the climax), checked at phone size with the text-safe box; Kai picks one look; it never changes a locked shot | style frames |
| | [1.3] design (parallel) + floor plans | characters (model sheet, faces, profile), props; a floor plan per set with marks, paths, the 180° line per scene, camera zones and the film's screen-direction convention | sheets + plans |
| | [1.4] storyboard | **a** thumbnails + the shot list (`storyboard.json` `shots`, REEL_DATA.md); **b** grey rough panels, one per key (start/end of a move, anticipation/extreme/result of an action); **c** board pitch + muted retell by a fresh agent. `node styles/stick-man/tools/prepro.mjs films/<slug>` after each change | board sheet, `review/prepro.md`, `review/intensity.svg`, retell |
| | [1.5] voice | scratch voice for animatic v1; final voice (`voice.py --samples Achird`, `--take`, `align.py`) before the timing pass ends; shots are re-anchored to words, never retyped | audio + `voice-qa.md` |
| | [1.6] animatic | `node styles/stick-man/tools/animatic.mjs films/<slug> --v N --safe 1` (shots, keys, 2D moves, burn-in, UI bands); passes in order: story → timing → camera intent (2D camera pass, 3 options per flagged shot) → test screening (muted + sound-on retell, swipe test); `CUTS` it prints goes into `reel.js` | video + changelog + prepro PASS |
| | [1.7] colour script | after ◇2a: one frame per scene from the locked shots in the chosen look, placed on the intensity curve | strip |
| | **◇2a** story + timing lock · **◇2b** shot lock (camera intent) · **◇2c** look + design lock (PREPRO.md section 7; Kai may approve them together, ◇2c never before ◇2a) | | |
| **2 Asset** | [2.1] rig + dose | the body is `engine/body.js` (bones, joint ranges, contact, balance; `PHYS` switches) and the dose `engine/motion.js` `STYLE_PRESETS`; prove a change on short test clips rendered with physics on and off, plus `shot.mjs --report` numbers | clips + numbers |
| | [2.2] faces, set, props | only what the animatic needs: faces `engine/faces.js`, sets and props `styles/stick-man/allout/` (pattern: `allout/sets/canyon-edge.js`), Blender pieces `styles/stick-man/docs/GLB.md` | sheets, stills |
| | [2.3] run-through | every approved asset together in the real set at the chosen dose (not a film shot) | video + body numbers |
| | [2.4] breakdown + layout check | `node styles/stick-man/tools/assets.mjs films/<slug>`: the asset list and states from the shot list, kit vs film-local, the set measured against the story's distances (`measures`); every CAM LOCK shot rendered grey with the real assets beside its panel | `review/assets.md`, layout sheet |
| | **◇3** asset lock | | |
| **3 Shot** | [3.1] camera pass (execution) | places the camera intent locked at ◇2b in 3D (lens, height, distance, move timing); skill `animation-camera-pass` again on rendered strips; 3 rendered options only where a locked intent fails in 3D; previs, lock check (PROCESS.md section 3). A change of size or side of the line needs Kai | option cards, previs video |
| | [3.2] overlays | the storyboard's drawn layer (loupe, sound words, arrows) via `overlays` (REEL_DATA.md) | stills |
| | [3.3a] acting brief | per action / reaction shot: think → do → change (`acting` on the shot) and 3-5 grey pose thumbnails; Kai approves the poses | `review/acting.md` |
| | [3.3] blocking | key poses by hand, `ease: 'snap'`, every shot (REEL_DATA.md motion v2), with the temp sound from the animatic | video beside the animatic |
| | Kai approves the blocking (on the page, may batch with [3.2]) | | |
| | [3.4] polish | holds, eases, anticipation, moving holds, asymmetry; sạn hunt; camera pass again if a shot misses its purpose | blocking vs polish video + numbers |
| | [3.4b] light per shot | key on the face, rim off the background, the subject's value contrast against its background checked at phone size | stills |
| | [3.5] board + feel check | `board.mjs films/<slug> --judge 3` (lines shown) and a fresh agent scoring each scene 1-5 against its `feel` (`review/feel-check.md`); `node styles/stick-man/tools/timing.mjs films/<slug>` | board + votes + feel scores |
| | **◇4** Shot lock (board ≥ 85 %) | | |
| **4 Post** | [4.0] sound plan | `audio/sound-plan.json` per scene: bed, foley, music state; ≥ 2 planned silences, ≥ 2 sound transitions (DIRECTOR.md §6-7); the music arc follows the intensity curve, `silence` and `drop` allowed | plan |
| | [4.1] sound | `node styles/stick-man/tools/shot.mjs --film films/<slug> --cues films/<slug>/audio/cues.json`, `audio/music.json`, `python styles/stick-man/tools/sound.py films/<slug>` | levels + video |
| | [4.2] render | `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --mp4 films/<slug>/renders/<slug>_vN.mp4 --audio films/<slug>/audio/mix.wav` | video + sheet |
| | [4.3] gates | the two commands in GATES.md, always with `--profile` (Kai picks pilot or full) | gate table |
| | [4.4] final QA + package | a fresh agent watches the final at 1x, sound on, phone size, `--safe 1` (retell + swipe test); `deliver/` cover, caption (skill `ig-caption`), subtitles, `CREDITS`, an alternative hook cut; `node styles/stick-man/tools/postcheck.mjs films/<slug>` | `review/final-qa.md`, package |
| | **◇5** deliver | `sheet.mjs`, `LEDGER.md`, final mp4 and package on the page | final video |
| **5 Publish + learn** | [5.1]-[5.6] | publish; retention at 24 h and 7 d mapped to shots (`retention.mjs`); post-mortem with DIAGNOSE.md; a cause seen twice becomes a proposed rule; update the series bible (PUBLISH.md) | `review/retention.md`, `review/retro.md` |
| | **◇6** learn | | |

A later stage's problem is fixed in the stage that caused it. Never jump ahead into the engine or the gates.

**Every gate is checked by `node styles/stick-man/tools/stagegate.mjs films/<slug> <gate>`** (evidence list: `styles/stick-man/tools/GATES.json`). A gate is LOCK only when the measured checks pass, the maker's files exist, the judged evidence was written by someone else (`by: agent:<id>`) after the last change, and Kai approved it (`review/approvals.json`, copied from the stage page with its date). Show Kai a gate only when it says READY FOR KAI; never call a tool PASS an approval.

## Rules (each was paid for)

| Rule | Why |
|---|---|
| Motion obeys two rulebooks: the 12 principles and body physics (no penetration, bones keep length, joints in range, balance, gravity g = 9.8, no pops). Props and sets obey physics too. | bodies that ignore physics read as lifeless |
| Style is the dose each principle is bent (`style: 'kaiships'`); physics is the floor under it | Kai's chosen dose |
| The lead's acting is keyed by hand (motion v2 `anim`); auto-acting from words only for background characters | auto-acting reads as puppets |
| Faces sell the character: no ring-eye creep, no blink inside a take (shock, scream), a new face lands on a cut, takes land in 3 frames | the face sells the character |
| Every camera states its PURPOSE (what the viewer must get in its 1-2 s) and a clear size: a real wide or a real close-up, with a clean background behind faces | timid mid shots miss their purpose |
| An overlay may only claim what the picture shows, the same way at the same time (expansion arrows point into the gap while the rail ends close) | a fake overlay is the first sạn a viewer sees |
| Keep the direction conventions (REEL_DATA.md) and one camera axis per place (PROCESS.md section 3) | reversed axes read as mistakes |
| Never loosen a threshold. After 2 fix rounds on one gate, stop and show Kai the FAIL with a still. | gates protect the viewer |
| Numbers measured from a reference short (reference gate profile) are information, not pass/fail, unless Kai picks `--profile full` | chasing quotas makes a film choppy |
| Never copy frames, audio or wording of a reference; `ref-private/` is never committed or posted | rights |
| Renders are medium (540x960) until Post; full 1080x1920 for the Post render only | time and machine |
| A look change starts from a whole-look prototype (style frames, a Blender turntable) Kai picks by eye, never from tuning numbers one by one | number tweaks don't change the look |
| A hand, a strike or a tool lands on a real target and holds 2-4 frames; a showcase of motion means travel through space (leaps, falls), not poses in place | hands acting on air read as fake |
| The unit of pre-production is the shot: every shot has an id, a purpose, a size, an angle, a lens, a move and a story intensity before it is drawn well | boarding per voice line made slideshows and left the camera undecided |
| Fidelity follows lock: grey panels and proxies until ◇2a; a final-looking render is a style frame, never a storyboard panel | pretty panels nobody dared to change |
| Camera intent is locked in pre-production (◇2b); stage 3 executes it in 3D | "camera later" meant nobody owned the shots until assets were built |
| The script is written from a beat outline, tested by readers who did not write it (fact check, skeptic, ear retell) and locked at ◇S before a panel is drawn; a new draft replaces the old one only if it wins a blind A/B | Hot Money ep. 1 v4 passed every tool and still had a bait-bill / bank hole, a rule that answered the vote and a 27 s stop of the clock; the first rewrite lost the blind A/B |
| A fact the script states is checked against the rest of the story; a razor-close sum decides something; a rule never answers the ending vote | v4: bait bills, then a bank deposit; 238 of 240 s that decided nothing; "spend nothing", then "hide or spend?" |
| Explain in pictures first: event, object, counter, insert; a card last, ≤ 8 s of cards in a row and ≤ 25 % of the film | 27 s of cards after a hook (Hot Money ep. 1) |
| Words, numbers and faces live in the text-safe box (x 6-87 %, y 14-65 %); check with `animatic.mjs --safe 1` | captions under the app's UI |
| The animatic is locked on the final voice, timed in frames, with burn-in; every note names a shot | a scratch voice 3 s short moved every cut |
| Approved decisions live in `DECISIONS.json` and are checked at every gate; dropping one needs Kai | the approved "one shot, no cut" hook and the split-screen ending were lost between stages |
| Kai's confirmed scene feels and story scores are locked (`prepro.mjs --lock-story kai`); a later change is a FAIL | scores were lowered to clear a warning |
| Judged evidence is never written by the maker | the maker skipped the steps it was meant to prove |
| A vague note gets one question back ("which shot?"); then DIAGNOSE.md turns it into a cause and a stage | "chưa tới" can't be fixed, a named cause can |
| Blender is the asset workshop (export `.glb`); a new set, prop, fx or verb goes in the kit with its rule, never for one film's taste | the next film reuses it |

## Files

| File | What |
|---|---|
| [PROCESS.md](PROCESS.md) | stage pages, agent prompts, camera pass, blocking/polish recipe, sạn hunt, board, sound, gate profiles, deliver |
| [DEVELOP.md](DEVELOP.md) | stage 0: benchmark, treatment standards, hook test, the decision log, ◇1 |
| [SCRIPT.md](SCRIPT.md) | the script stage [1.1] and ◇S: the steps, the writing rules R1-R10 and K1-K9 (formerly the `million-views-rule` skill), the review prompts, fixes per `scriptlint.mjs` check |
| [PUBLISH.md](PUBLISH.md) | stage 5: publish, retention mapped to shots, post-mortem, rules from evidence |
| `styles/stick-man/tools/GATES.json`, `stagegate.mjs` | the evidence each gate needs, and the checker |
| `styles/stick-man/tools/develop.mjs`, `scriptlint.mjs`, `assets.mjs`, `timing.mjs`, `postcheck.mjs`, `retention.mjs` | the measured checks of stages 0, 1 (script), 2, 3, 4 and 5 |
| [PREPRO.md](PREPRO.md) | stage 1 in depth: flow, vocabulary, each step's standard, gate and mistakes, craft knowledge (story, staging in 9:16, explaining in pictures, continuity, timing), reviews, fidelity, gates, fixes per `prepro.mjs` check |
| [DIAGNOSE.md](DIAGNOSE.md) | symptom → isolation test → cause → fix → stage, note translation, process smells, a worked example |
| [AUDIT.md](AUDIT.md) | why the pre-production stage was rebuilt (Nov 2026), and the roadmap |
| [REEL_DATA.md](REEL_DATA.md) | `storyboard.json`, `reel.js` keys: motion v2 `anim`, `direct` cameras, `overlays`, `style`, beats, music |
| [GATES.md](GATES.md) | the gates by profile (safety / quality / reference) and how to fix a FAIL |
| [LEDGER.md](LEDGER.md) | the per-stage ledger template |
| `templates/stage-page.html` | the stage page |
| `styles/stick-man/tools/prepro.mjs`, `animatic.mjs`, `shotlist.mjs` | the pre-production checker, the animatic builder, and the shot-list loader they share |
| `styles/stick-man/docs/` | kit reference: verbs, poses, faces, sets, Blender sets |
