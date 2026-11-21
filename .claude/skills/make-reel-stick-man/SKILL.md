---
name: make-reel-stick-man
description: Make a vertical (1080x1920, 30 fps) stick-man 3D film by the standard animation pipeline - Development, Pre-production, Asset, Shot, Post, Publish + learn - with Kai approving each step on one page per stage, real renders for every option, independent agents checking each pass, and characters that obey Disney's 12 principles and body physics at the 'kaiships' dose. Use when Kai asks for a stick-man reel or stick-man story film, or gives a camera note on one ("previs", "thử góc máy", "máy quay …": the camera previs mode). Trigger: /make-reel-stick-man
argument-hint: "<slug> <story idea or script>"
---

# /make-reel-stick-man

The standard process for a stick-man film (dev only).

- Run from the library root with `.pixi/envs/default/bin/node` and `.pixi/envs/default/bin/python` (written `node` / `python` below), never `pixi run`.
- Work in a fresh worktree. `films/` is git-ignored; kit and engine changes go in PRs, and Kai merges.
- Worked example: `styles/stick-man/examples/pilot-a/` (copy it to `films/pilot-a/` to replay it; its README says how).
- Needs: `GOOGLE_API_KEY` in `.env` (voice), faster-whisper (align), `claude` on PATH (board judges).
- Kai reads Vietnamese: replies and page text are Vietnamese; "Em đề xuất" marks your recommended option.
- pstack: this film runs under `.agents/playbooks/stick-man-film.md` (one orchestrator session, state in `~/.claude/orchestrate/<film>/notes.md`); a kit or engine fault goes to `.agents/playbooks/stick-man-kit-fix.md` as its own PR. Start a session with `/pstack:poteto-mode`.

Read [PROCESS.md](PROCESS.md) before step 1, `DIRECTOR.md` (library root) and [DEVELOP.md](DEVELOP.md) before stage 0, [SCRIPT.md](SCRIPT.md) before the script [1.1], [PREPRO.md](PREPRO.md) before stage 1, [PUBLISH.md](PUBLISH.md) for stage 5, and [DIAGNOSE.md](DIAGNOSE.md) whenever a result "doesn't land" and the cause isn't obvious.

## The loop (every step of every stage)

1. Do one numbered step, e.g. [3.1].
2. Make the proof Kai can see: a still, a sheet, a video, or a number.
3. When there is a choice, show 2-3 options. Each option is a picture next to the current state, never text only: grey panels or grey engine stills before ◇2a, real renders after. Mark one **Em đề xuất**.
4. Before Kai sees it, a fresh independent agent challenges it, starting from Kai's taste (`~/.claude/skills/kai-taste/SKILL.md`, PROCESS.md section 2):
   - script: the fact check, the skeptic pass, the ear retell and the blind A/B (SCRIPT.md section 5);
   - board and animatic: the muted retell, the 5-second read, the explain audit and the swipe test (PREPRO.md section 5);
   - layout and camera: the camera-pass prompt;
   - poses: the blocking and 12-principles prompt;
   - every pass: the sạn hunt.

   Fix what holds up. Never score your own work.
5. Put it on the stage page: status rows plus decision buttons. Kai picks there and may approve several steps at once.
6. Every page where Kai marks, picks or rates declares the `db` capability on its first publish; read his picks back
   with `ArtifactData`, never from localStorage alone ([#137](https://github.com/Kaiships-ai/studio-reel/issues/137)). Lock them, and strip the rejected options and stale sections from the page.
   A step is not done until the page shows it: republish in the same turn, unasked, with only the latest state on it
   (old drafts, superseded options and old review tables go; history lives in git and the files).
7. Reply short in Vietnamese. End with the table `việc · đầu ra · bằng chứng · trạng thái`, then, as the very last block of every reply in a session that runs this skill, the progress bar, so Kai never loses track: one bar per stage 0-5, % = steps done (1) + steps in progress (0.5) over the stage's steps, the current step marked `◀`, and the open gates with their `stagegate.mjs` state, e.g.

   ```
   Tiến độ · <film>
   0 Development ██████████ 100%  ◇1 OPEN
   1 Tiền kỳ     ████░░░░░░  44%  ◀ [1.1] script · ◇S ◇2a ◇2b ◇2c OPEN
   2 Asset       ░░░░░░░░░░   0%
   3 Shot        ░░░░░░░░░░   0%
   4 Hậu kỳ      ░░░░░░░░░░   0%
   5 Đăng        ░░░░░░░░░░   0%
   ```

   Read the gate states from the tool, never from memory.

Notes from Kai are acted on per shot. A note with no shot gets one question back ("shot nào?"); a vague one is translated with DIAGNOSE.md section 2 before anything is changed.
Every note goes into `films/<slug>/review/retakes.json` (round, shot, type: careless, style break, artistic or not
addressed, and the shot gate's fault class when one fits) and stays open until Kai accepts the fix on a later round.
`node styles/stick-man/tools/retakes.mjs films/<slug>` fails a round with more notes than the one before, or one that
repeats a closed note; show Kai its table with every new cut.

## Mode: thử góc máy (camera previs from the film's own engine)

Triggers: "previs", "thử góc máy", "máy quay …" (a camera note such as "đoạn đua xe, máy quay dính tường nhà, nâng lên
chút" or "cảnh ngân hàng thứ hai, máy gần quá"). Use it in any stage once the film renders in the engine.

1. Run `node styles/stick-man/tools/camtry.mjs "<Kai's note, word for word>"` from the film's worktree, through the
   render lock on Kai's Mac. Do not look up the film, the segment or the frames by hand: the tool finds them.
   - The film is the newest one in `films/`, unless the note names one.
   - The segment, take and frames come from the act tables `<round>/gen/<SEG>.js` (`FRAMES`, `CUTS`, `STAGES`), else
     from `storyboard.json`.
   - The camera anchors come from `<round>/xfer/<SEG>.json`.
   - The tool boots the segment's test folder `films/<slug>-<seg>/` when it exists.
2. Put its first line at the top of the reply. It is the readback: "Em hiểu là: phim X, đoạn Y, xem cả đoạn khung A-B,
   phương án đổi …, máy quay …; máy nâng …". If the readback is wrong, run again with `--film`, `--frames A-B` or a
   clearer note. Never guess. "chưa rõ hướng máy" means the note named no camera move: say so to Kai with the default
   set (up one and two steps, down one step).
3. The clip is always the whole segment Kai names, every frame at 30 fps ("đoạn đua xe" is all of CHASE, every take).
   A narrower phrase ("take 2", "đoạn đầu cuộc đua", "ngân hàng thứ hai") changes only that take, widened to the anchor
   windows it touches; the rest plays with the film camera, for context. The tool picks 3-4 variants from the note's
   words: V0 (the film camera), the asked move at one step and at two steps, and the moves together. "chút" is a 0.5 m
   step, a number in metres sets the step. Notes work with or without marks and in plain English ("raise", "lower",
   "closer", "away"). It writes to `<film>/review/camtry/<SEG>-<A>-<B>/`:
   - `variants.mp4`: the variants side by side at 360x640 each, over a timeline strip (yellow: the frames the variants
     change; white ticks: cuts; the needle: this frame). A red label marks a camera touching a wall.
   - `top.jpg`: the top view, one row per take, one column per variant.
   - `camtry.json`: the numbers over the changed frames. They are wall-touch frames, wall-fill frames, the nearest
     wall, the camera height, the subject's screen height and the facade share. Also the run time.
   - `section.html`: the stage-page section, with the clip, the top view, the numbers table and a pick box. The
     recommended variant carries **Em đề xuất**. It is always one `pick` can write; when no asked change can be, it
     says "(áp tay)". A variant `pick` cannot write is marked "xem được, áp tay".
4. Put the section on the stage page and wait for Kai's pick.
5. Run `node styles/stick-man/tools/camtry.mjs pick <out dir> <Vn>`. It sets the anchors' `dz` to their value at the
   previs run plus the lift (the whole anchor window, so the camera never pops; picking twice never stacks; V0 puts
   them back), keeps `<xfer>.bak`, and reruns the generators of that act. A failing generator puts the anchors and the
   act back. It only writes inside the film folder. Then re-render the act and rerun its gates.
   - A move the anchors cannot hold ("xa tường", "gần lại", "nhìn nhân vật") is refused with the reason. Make that
     change in the act's camera by hand, from the numbers.
   - `--dry` prints the change only.

Feature map: `.claude/skills/verify/features/stick-man-camtry.md`.

## Stages, steps and gates

| Stage | Step | Output | Proof Kai sees |
|---|---|---|---|
| **0 Development** | [0.0] benchmark | 3-5 videos of the same format: hook, sizes, rhythm, sound, swipe points; what to learn, what not to take (DEVELOP.md). The measured bar is the Rick bench: `styles/stick-man/bench/TABLE.md` (cuts, look, depth, motion, sound per metric); a new reference gets its row with `node styles/stick-man/tools/refbench.mjs <mp4> --out <row.json>` (bench/README.md) | treatment section + the Rick bench rows the film aims at |
| | [0.1] brief + treatment | `node styles/stick-man/tools/new_film.mjs <slug>` makes the folder, `vo/script.json`, `storyboard.json`, `reel.js`, `LEDGER.md`; you write `BRIEF.md` and `TREATMENT.md` (3 structures + choice, logline, arc). A reference is a quality bar, never a shot list. | the page |
| | [0.2] beat board | the whole story in ~12 panels (one beat each); pick a pilot segment that is a complete mini story (conflict + payoff) | sketch panels |
| | [0.3] hook test + decision log | a fresh agent picks a hook from thumbnails + first lines (`review/hook-test.md`); every decision in `DECISIONS.json` with `where` and a `check` when a tool can verify it; `node styles/stick-man/tools/develop.mjs films/<slug>` | hook test, decision list |
| | **◇1** brief, treatment, story (`stagegate.mjs … 1`; the structure is locked here) | | |
| **1 Pre-production** | [1.0] scene brief + intensity plan | `storyboard.json` `scenes`: feel, whose, key, question per scene; want / obstacle / outcome per beat; target story intensity and the climax (PREPRO.md [1.0]); Kai confirms the feel lines | brief table + intended curve |
| | [1.1] script (SCRIPT.md) | **a** beat outline with but/so links, plants, vote costs (`vo/beats.json`); **b** fact sheet (`vo/facts.json`) + fresh fact check; **c** draft `vo/script.json` until `node styles/stick-man/tools/scriptlint.mjs films/<slug>` has no FAIL; **d** skeptic pass; **e** table read + ear retell; **f** punch-up: 3 rewrites per flagged line, Kai picks; **g** blind A/B against the last locked script | script + lint + the four reviews + the A/B winner |
| | **◇S** script lock (`stagegate.mjs … S`; a later script change reopens it and the voice is recorded again) | | |
| | [1.1p] picture pass | per locked line `see` + an explain device from the ladder (PREPRO.md 4.3); no card where an event or object can carry the fact | line/device table |
| | [1.2] visual development (parallel) | 2-3 looks rendered as style frames on two shots of the shot list (a wide, the climax), checked at phone size with the text-safe box; Kai picks one look; it never changes a locked shot. Each frame shows the depth kit: lens blur, sky dome and air come with the engine; an exterior gets far town rows (act `backdrop: { rows, tint }`, a dark tint about 0.17 at night; `.claude/skills/verify/features/stick-man-depth.md`) | style frames with depth behind the subject |
| | [1.3] design (parallel) + floor plans | characters (model sheet, faces, profile), props; a floor plan per set with marks, paths, the 180° line per scene, camera zones and the film's screen-direction convention | sheets + plans |
| | [1.4] storyboard | **a** thumbnails + the shot list (`storyboard.json` `shots`, REEL_DATA.md); **b** grey rough panels, one per key (start/end of a move, anticipation/extreme/result of an action); **c** board pitch + muted retell by a fresh agent. `node styles/stick-man/tools/prepro.mjs films/<slug>` after each change | board sheet, `review/prepro.md`, `review/intensity.svg`, retell |
| | [1.5] voice | scratch voice for animatic v1; final voice (`voice.py --samples Achird`, `--take`, `align.py`, `pause.py` for planned `pause_after` silences) before the timing pass ends; shots are re-anchored to words, never retyped | audio + `voice-qa.md` |
| | [1.6] animatic | `node styles/stick-man/tools/animatic.mjs films/<slug> --v N --safe 1` (shots, keys, 2D moves, burn-in, UI bands); passes in order: story → timing → camera intent (2D camera pass, 3 options per flagged shot) → test screening (muted + sound-on retell, swipe test); `CUTS` it prints goes into `reel.js` | video + changelog + prepro PASS |
| | [1.6p] previs + temp-music animatic | before ◇2a: the temp music is a credited track from `styles/stick-man/sound/RESEARCH.md` (Music Kai can post), fitted to the film's music arc with `python styles/stick-man/tools/sound_fit.py films/<slug> <track> --bpm <page tempo> --out films/<slug>/audio/music-A.json`; 2-3 candidates, Kai picks one here and it goes in `DECISIONS.json` and `CREDITS`. Then `node styles/stick-man/tools/previs.mjs films/<slug> --film` cuts the whole film as a grey 3D blockout on the final voice with temp music (`audio/stems/music.wav` or `--music`): a tall red tick and CẮT at each hard cut, a small tick where the camera flies on, cuts per minute and median take beside the Rick numbers. Inside a scene the camera flies between shots (`--join scene`, Rick changes view by flights, about 1 hard cut a minute); a shot's `join: "cut"` keeps a cut. A scene that needs a staged camera gets a hand spec, `films/<slug>/previs/<name>.json` (copy `.claude/skills/make-reel-stick-man/templates/previs-bank.json`; the fields are documented at the top of `styles/stick-man/tools/previs-core.mjs`: camera rows `[t, x, y, z, look x, y, z, fov]`, stages `{ t, title, sub, kind }`, `shots` = the storyboard shots it replaces), rendered alone with `--scene <name>` in seconds. `--scene` takes a spec name first, else a storyboard scene id; every run writes `review/previs/<name>.mp4` with `vo/vo.wav` under it from the scene's start. Kai notes cuts and camera here, before any render | `review/previs/animatic.mp4`, `review/previs/previs.md` (◇2b needs it) |
| | [1.7] colour script | after ◇2a: one frame per scene from the locked shots in the chosen look, placed on the intensity curve; then the same in numbers, `colour-script.json` (copy `.claude/skills/make-reel-stick-man/templates/colour-script.json`: per scene the intent, R/B, saturation and black ranges, the hue families it may show or flood with, the light events that may jump), with the bible's `palette.signature` and `palette.offColor`; Kai approves it (`approved: { by: "kai", at }`). A look change is written here before it is graded | strip + `colour-script.json` |

Migration: a film already past [1.7] needs a signed `colour-script.json` (`approved: { by: "kai", at }`) before ◇5, or the colour gate gives DRAFT, never PASS.
| | **◇2a** story + timing lock · **◇2b** shot lock (camera intent) · **◇2c** look + design lock (PREPRO.md section 7; Kai may approve them together, ◇2c never before ◇2a) | | |
| **2 Asset** | [2.1] rig + dose | the body is `engine/body.js` (bones, joint ranges, contact, balance, carried loads; `PHYS` switches) and the dose `engine/motion.js` `STYLE_PRESETS`; prove a change on short test clips rendered with physics on and off, plus `shot.mjs --report` numbers ((h) hands on their targets, (i) held props in the body); body types and stock motion come from the motion library (`styles/stick-man/motion-lib`, `docs/MOTION-LIB.md`; `node styles/stick-man/tools/motionlib.mjs` checks it, `--proof <dir>` renders it). Every act sets the moving hold in its style: `style: { ...STYLE_PRESETS.kaiships, life: 0.75 }` (0 off, up to 2; `stick-man-acting-rig.md`) | clips + numbers |
| | [2.2] faces, set, props | only what the animatic needs: faces `engine/faces.js`, or a face style the film picks with `faceStyle: 's2'` in reel.js (`engine/facestyles/s2.js`, the rubber face Kai approved 21/11 on Hot Money reel 1: its `y_` designs for the lead, `c_` for a second character; a film that picks none keeps the kit faces exactly), sets and props `styles/stick-man/allout/` (pattern: `allout/sets/canyon-edge.js`), Blender pieces `styles/stick-man/docs/GLB.md`; per set, the far backdrop rows from `styles/stick-man/assets/backdrop/` (act `backdrop`, or `backdrop()` in the set's `build()`; new pieces from `tools/backdrop_blend.py`) | sheets, stills |
| | [2.3] run-through | every approved asset together in the real set at the chosen dose (not a film shot) | video + body numbers |
| | [2.4] breakdown + layout check | `node styles/stick-man/tools/assets.mjs films/<slug>`: the asset list and states from the shot list, kit vs film-local, the set measured against the story's distances (`measures`); every CAM LOCK shot rendered grey with the real assets beside its panel | `review/assets.md`, layout sheet |
| | **◇3** asset lock | | |
| **3 Shot** | [3.1] camera pass (execution) | places the camera intent locked at ◇2b in 3D (lens, height, distance, move timing); skill `animation-camera-pass` again on rendered strips; 3 rendered options only where a locked intent fails in 3D; previs per scene first (`previs.mjs films/<slug> --scene <name | scene id>`: blockout, camera path, Vietnamese label bar, voice under; Kai judges the camera from it), then the lock check (PROCESS.md section 3). A change of size or side of the line needs Kai | option cards, previs video |
| | [3.2] overlays | the storyboard's drawn layer (loupe, sound words, arrows) via `overlays` (REEL_DATA.md) | stills |
| | [3.3a] acting brief | per action / reaction shot: think → do → change in `review/acting.json` (shot id → brief; storyboard.json stays as locked so earlier gates hold) and 3-5 grey pose thumbnails; Kai approves the poses | `review/acting.md` |
| | [3.3] blocking | key poses by hand, `ease: 'snap'`, every shot (REEL_DATA.md motion v2), with the temp sound from the animatic | video beside the animatic |
| | Kai approves the blocking (on the page, may batch with [3.2]) | | |
| | [3.4] polish | holds, eases, anticipation, moving holds (`life`: on a locked-camera clip `refbench.mjs <mp4>` "motion while the camera is still" sits in the Rick band 1.21-3.67), asymmetry; sạn hunt; camera pass again if a shot misses its purpose | blocking vs polish video + numbers |
| | [3.4b] light per shot | key on the face, rim off the background, the subject's value contrast against its background checked at phone size; depth per shot: background soft and face crisp (a shot's `dof` wins), a far row reads as a mass, darker at night; `refbench.mjs` depth ratio against the Rick band 1.80-2.20 | stills + depth ratio |
| | [3.5] board + feel check | `board.mjs films/<slug> --judge 3` (lines shown) and a fresh agent scoring each scene 1-5 against its `feel` (`review/feel-check.md`); `node styles/stick-man/tools/timing.mjs films/<slug>`; `node styles/stick-man/tools/shotgate.mjs films/<slug>`, the measured shot gate ◇4 and ◇5 run: a prop that pops, jumps, floats or changes across a cut, a figure that pops in, skates, snaps or passes through the set, where the camera sees it (`review/shot-gate.md`, a 15-frame strip per flagged second for the reviewer) | board + votes + feel scores + shot gate strips |
| | **◇4** Shot lock (board ≥ 85 %; `kituse.mjs films/<slug> --gate 4` fails an act with no `life` or a film with no `backdrop`, unless `DECISIONS.json` waives it) | | |
| **4 Post** | [4.0] sound plan | `audio/sound-plan.json` per scene: bed, foley, music state; ≥ 2 planned silences, ≥ 2 sound transitions (DIRECTOR.md §6-7); the music arc follows the intensity curve, `silence` and `drop` allowed | plan |
| | [4.1] sound | `node styles/stick-man/tools/shot.mjs --film films/<slug> --cues films/<slug>/audio/cues.json`; cue names from the kit library (`python styles/stick-man/tools/sound_lib.py <name>` shows what plays; `styles/stick-man/sound/`); beds in `audio/ambience.json`; the kit mixer `python styles/stick-man/tools/mix.py films/<slug> --music-plan films/<slug>/audio/music-A.json` with the track Kai picked at [1.6p] (`stick-man-sound.md`) | `audio/levels.txt` (line 2 names the track) + video |
| | [4.2] render | `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --mp4 films/<slug>/renders/<slug>_vN.mp4 --audio films/<slug>/audio/mix.wav` | video + sheet |
| | [4.3] gates | the two commands in GATES.md, always with `--profile` (Kai picks pilot or full) | gate table |
| | [4.4] final QA + package | a fresh agent watches the final at 1x, sound on, phone size, `--safe 1` (retell + swipe test); `deliver/` cover, caption (skill `ig-caption`), subtitles, `CREDITS`, an alternative hook cut; `node styles/stick-man/tools/postcheck.mjs films/<slug>`; `node styles/stick-man/tools/cutgate.mjs films/<slug>` (at most 4 hard cuts in any 15 s, a take of 6.5 s or more, under 25 % low camera, no face cut off over 1 s); `node styles/stick-man/tools/colourgate.mjs films/<slug>` (the final against `colour-script.json`: cut steps, in-shot dims, cast, saturation, hero white, black level, flood, palette, film luma; a check waived only by Kai in `DECISIONS.json` as `colourgate.G<n>`); the Rick bench of the final: `node styles/stick-man/tools/refbench.mjs films/<slug>/renders/<final>.mp4 --stems films/<slug>/audio/stems --out films/<slug>/review/refbench.json` | `review/final-qa.md`, `review/cutgate.md`, `review/colourgate.md`, the film vs Rick table in `review/kituse.md`, package |
| | **◇5** deliver | `kituse.mjs films/<slug> --gate 5` (life, backdrop, sound plan, a credited kit music track, the bench row of the final mp4; a skipped one needs a waiver in `DECISIONS.json`); `sheet.mjs`, `LEDGER.md`, final mp4 and package on the page; stays OPEN until `review/final-qa.md` names a calibrated brief (`brief:`, PROCESS.md section 2), or, while none is calibrated, Kai's own OK is recorded as `kai-ok` (Who checks what) | final video |
| **5 Publish + learn** | [5.1]-[5.6] | publish; retention at 24 h and 7 d mapped to shots (`retention.mjs`); post-mortem with DIAGNOSE.md; a cause seen twice becomes a proposed rule; update the series bible (PUBLISH.md) | `review/retention.md`, `review/retro.md` |
| | **◇6** learn | | |

A later stage's problem is fixed in the stage that caused it. Never jump ahead into the engine or the gates.

**Every gate is checked by `node styles/stick-man/tools/stagegate.mjs films/<slug> <gate>`** (evidence list: `styles/stick-man/tools/GATES.json`). A gate is LOCK only when the measured checks pass, the maker's files exist, the judged evidence was written by someone else (`by: agent:<id>`) after the last change, and Kai approved it (`review/approvals.json`, copied from the stage page with its date). Show Kai a gate only when it says READY FOR KAI; never call a tool PASS an approval.

A check the gate cannot measure fails, or passes only with a written waiver naming who signed it and when ([#135](https://github.com/Kaiships-ai/studio-reel/issues/135)).
Every limit cites a film Kai picked and one he rejected; without a rejected sample its gate row says "builder judgment" ([#136](https://github.com/Kaiships-ai/studio-reel/issues/136)).

## Who checks what

Each fault kind has one checker: a machine gate, the AI review at ◇5, or Kai. Kai watches only his rows; a fault that a
gate or the AI review catches never waits on him. A row leaves Kai's column only when a replay of his notes shows the
new checker catching them (`node styles/stick-man/tools/whochecks.mjs map <private map>`). The table is generated from
`styles/stick-man/tools/WHOCHECKS.json`; `node styles/stick-man/tools/whochecks.mjs` fails when they differ.

While no review brief is calibrated, ◇5 takes Kai's own OK in place of `review/final-qa.md`: copy it from the page into
`review/approvals.json` as `"kai-ok": { "review/final-qa.md": { "at": "<kaiAt>", "note": "<his note>" } }`, newer than
the last render. `stagegate.mjs` prints it on every run; once a brief is calibrated, kai-ok no longer counts.

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
| `low-camera` | the camera looks up at the lead too often | machine | `cutgate.mjs` | ◇5 | at most 25 % of frames looking up over 5° at the lead's head | bible 1 % and v7 5 % passed, pilot-a 53 % fails; no rejected Hot Money cut has camera rows |
| `face-cut-off` | the lead's face is cut off by the frame | machine | `cutgate.mjs` | ◇5 | no run over 1 s with less than half the head in frame | Kai 12/11 note; no rejected sample with camera rows yet |
| `face-repeat` | the same face comes back too often | machine | `facebeat.mjs` | ◇4 | a non-neutral face in more than 2 takes | kai-taste Repeats; v7 rows: y_strain 5 takes fails (S3-053) |
| `face-off-beat` | a face the beat's words never name | machine | `facebeat.mjs` | ◇4 | held 0.5 s or more on a readable head | v7 rows: 1 off the beat (SH340); no 16/11 note caught |
| `library-unused` | a hand-keyed move where the motion library has a clip | machine | `check.mjs` | every render | any such move blocks the render of a Hot Money film | v7 16 of 156 actions from the library, blocked; bible cut 68 %, passes; Kai prefers the bible cut 17/11 |
| `rig-deform` | a head squashes or a bone stretches in a library clip | machine | `rigtest.mjs` | ◇3 | head 15 % when its volume holds, else 5 %; bone length 3 %; knee and elbow -2° to 160° | Kai picked option B 17/11; 0 of 52 clips over since #132 |
| `colour-jump` | the colour jumps at a cut or dims inside a shot with no light that motivates it | machine | `colourgate.mjs` | ◇5 | at a cut /luma/ 25 and /sat/ .15 in one scene, 50 and .25 at a scene change; 25 luma in 0.5 s inside a shot; a light event in colour-script.json exempts it | Hot Money ep01 r5 A v6 colour audit 21/11: LOAD-A dims 57 with no cut, LOAD-B +63 at a cut; Kai approved the gate 21/11 |
| `colour-off-script` | a shot drifts from the approved colour script: a cast, washed out, hazy blacks, a dim hero white, an off-palette hue or one hue flooding | machine | `colourgate.mjs` | ◇5 | per scene in colour-script.json (defaults R/B 0.8-1.6, S .25-.7, black 10-26, hero white >= 175 at R/B .95-1.10, off-palette <= 20 %, a flood of 90 % <= 3 s); film mean luma >= 100, dark seconds <= 15 % | Hot Money ep01 r5 A v6 colour audit 21/11: R/B 1.9 in LOAD-A, day two S .21 and hero 162-167; Kai picked amber + police blue 21/11 |
| `dark` | the film is too dark or one hue drowns it | AI review | `final-qa.md` | ◇5 | caught in both briefs, on a note the brief quotes (an upper bound) | AI trial 17/11: S3-058 hit 2 of 2; colourgate.mjs measures luma and hue only against the film's own colour script, so a script that approves a dark or one-hue film still needs this review |
| `angle` | the same camera angle over and over | AI review | `final-qa.md` | ◇5 | caught in both briefs, on a note the brief quotes (an upper bound) | AI trial 17/11: S3-060 hit 2 of 2; v002 has no camera rows for cutgate.mjs |
| `motion-feel` | motion that feels jerky or stiff with no pose that snaps and holds | Kai |  | ◇4 ◇5 | no detector | S3-035: 0 joint pops in its window; AI 0 of 2 |
| `prop-across-cut` | a prop jumps or vanishes across a cut | Kai |  | ◇4 ◇5 | no detector | S3-038 largest prop jump 2.9 px, S3-040 no prop gone after the cut; AI half on S3-038, 0 on S3-040 |
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
- **◇5**: machine `pose-snap`, `prop-appears`, `prop-floats`, `figure-skates`, `body-through-set`, `prop-in-head`, `prop-leaves-view`, `prop-out-of-scale`, `far-plane-cut`, `figure-jumps`, `too-many-cuts`, `low-camera`, `face-cut-off`, `colour-jump`, `colour-off-script` · AI review `dark`, `angle` · Kai watches `motion-feel`, `prop-across-cut`, `grip-drag`, `unreadable`, `text-load`, `story-feel`.
<!-- whochecks:end -->

## Rules (each was paid for)

| Rule | Why |
|---|---|
| Motion obeys two rulebooks: the 12 principles and body physics (no penetration, bones keep length, joints in range, balance, gravity g = 9.8, no pops). Props and sets obey physics too. | bodies that ignore physics read as lifeless |
| Style is the dose each principle is bent (`style: 'kaiships'`); physics is the floor under it | Kai's chosen dose |
| The lead's acting is keyed by hand (motion v2 `anim`); auto-acting from words only for background characters | auto-acting reads as puppets |
| Background characters and a lead's first blocking pass come from the motion library (`clip` keys, the body type's own clips); the lead's acting is then keyed by hand on top. A new stock motion goes in the library with its checks (naming, seamless loop or standard-pose ends, 25 deg/f, planted feet, (h)/(i) clean physics on), never as one film's keys | a retargeted adult walk on a child, or a bag that drags the hands off its handle, reads as fake |
| Faces sell the character: no ring-eye creep, a new face lands on a cut, a take has its anticipation, accent, hold and settle, few takes (≤ 4 a minute), keys far enough apart for each face to hold 6 f (REEL_DATA.md, Face timing) | the face sells the character |
| Every camera states its PURPOSE (what the viewer must get in its 1-2 s) and a clear size: a real wide or a real close-up, with a clean background behind faces | timid mid shots miss their purpose |
| Every script line is something the point-of-view character can know right now: seen or heard now, known by the body (skills, how the world works), said by another character, or asked as a question. The narrator never states what the character can't know (an amnesiac "you just stole… you can't remember doing it"). A fresh agent runs a logic sạn hunt on every script and hook before Kai sees it | Kai is confused in the first line, and the film fails there |
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
| A costume is a closed, smooth shell on the engine body, moved only by the engine's physics (one rig). A look Kai approved in Blender is ported 1:1: a match sheet (Blender vs engine, 4 angles), a full-resolution close-up and every frame of a head turn, as clean as the cops' uniform, before any re-render | the Hot Money hoodie took 7 rounds: an imported thin cloth inked with the hull, AO bakes and size/colour patched by numbers |
| Every on-screen counter (clock, bags, meter) follows the story math and changes on the word that causes it; a jump shows its cause in the same shot | the clock jumped 2:14 → 1:00 with no police on screen |
| A prop's path stays clear of heads and of the set's solids (every box mesh it built, plus `COLLIDE`); a box that is not solid gets `userData.hollow`. `shotgate.mjs` fails `prop in the head` / `prop in the set` | Hot Money r5 v3: a bag swung past the face 14 cm into the head and through the dresser and door 9's jamb; shotgate passed |
| A prop let go lands on what the set built (`S.rest`), so a film never adds furniture to a list for props to rest on | r5 ENDING-A: room 2's bed was in `COLLIDE_ROOM2`, the engine read `COLLIDE`; the hot dog fell to the floor |
| A prop in a hand stays in frame while its holder does (`prop leaves view`); a story prop goes in the set's `props` at real size (`lib/props/sizes.js`, `prop out of scale`); the gates see only tracked props | r5 LOAD-B: the bait bill out of the top of the frame 17 + 24 frames; GUN: a 14 cm round beside a 23 cm slide, untracked |
| An `'along'` hand prop with a top declares it (`userData.top`, the kit pistol `[0, 0, 1]`); never roll a kit prop in a film | r5 GUN: the pistol on its side on a forward arm (`test/unit/stick-prop-roll.test.mjs`) |
| No new or changed face design reaches a render Kai sees before he approves its face sheet: `facesheet.mjs films/<slug>` (with the `--query` and `--no-bible-check` the rows were rendered with) → show `review/face-sheet.jpg` (its hash is stamped on it) → `--approve "<his words>" --sheet <that hash>`; a sheet made again after he looked is refused; `facebeat.mjs` fails until then | r5 s1 round 2 (19/11 22:49): new faces first seen in the film, "xấu thậm tệ", rolled back |
| A run log (progress.md, LEDGER.md, a trail or decisions `.tsv`) is created at step 0 with its first line through `node styles/stick-man/tools/logline.mjs <log> "<line>"` and gets every later line the same way: a log never written by logline has no record, so nothing sees it written over. Old lines are never edited: ticking or fixing one in place fails every later append and every `stagegate.mjs` gate ("first N lines changed"); append a new line that corrects it instead | r5 progress.md written over 19/11 23:08; 18 lines restored by hand |
| The engine's sky dome is the only sky: no flat sky cards in a set, and no scenery straddling the camera's far (80 m) in a shot; `shotgate.mjs` fails `cut by the far plane` | r5 CHASE: motel.js's 220 x 60 m sky cards drew a straight-edged black slab over the dome (1481-1513, 1613-1637) |
| After any re-render, rerun the gates on that render before it goes to Kai | r5 v3 ENDING-A went out with a hot dog 32 cm in bag D that shotgate blocks; v3 listed no gate run |
| A 2D card's zoom or kick keeps every word inside the text-safe box on every frame | snap-zooms cropped "SOME BILLS ARE BAIT" |
| The visual-intensity line measures grey panels only (size, lens, angle, move, cut length) on a contrast scale; it never has to touch the story line. Explain that to Kai, don't chase it; the whole feel (voice, picture, sound, cutting) is measured by a dial test on a cut with sound | Kai asked why the blue line sat far below his curve |

## Files

| File | What |
|---|---|
| [PROCESS.md](PROCESS.md) | stage pages, agent prompts, camera pass, blocking/polish recipe, sạn hunt, board, sound, gate profiles, deliver |
| [DEVELOP.md](DEVELOP.md) | stage 0: benchmark, treatment standards, hook test, the decision log, ◇1 |
| [SCRIPT.md](SCRIPT.md) | the script stage [1.1] and ◇S: the steps, the writing rules R1-R10 and K1-K9 (formerly the `million-views-rule` skill), the review prompts, fixes per `scriptlint.mjs` check |
| [PUBLISH.md](PUBLISH.md) | stage 5: publish, retention mapped to shots, post-mortem, rules from evidence |
| `styles/stick-man/tools/GATES.json`, `stagegate.mjs` | the evidence each gate needs, and the checker |
| `styles/stick-man/tools/develop.mjs`, `scriptlint.mjs`, `assets.mjs`, `timing.mjs`, `postcheck.mjs`, `cutgate.mjs`, `colourgate.mjs`, `retention.mjs` | the measured checks of stages 0, 1 (script), 2, 3, 4 and 5 |
| `styles/stick-man/tools/kituse.mjs` | the kit features every film uses (◇4, ◇5): one row per feature in `KIT`; a film skips one only with an approved `DECISIONS.json` entry `{ "waives": "<feature>", "by", "at", "status": "approved" }` |
| `styles/stick-man/tools/refbench.mjs`, `styles/stick-man/bench/` | the Rick clip bench: one row of numbers per mp4, the gap table against Rick |
| `styles/stick-man/tools/mix.py`, `sound_lib.py`, `sound_fit.py`, `styles/stick-man/sound/` | the kit mixer, the recorded sound library, the music fit, and the music research (`RESEARCH.md`) |
| `styles/stick-man/tools/retakes.mjs`, `calibrate.mjs` | Kai's notes per round (repeats, regressions), and whether a review brief agrees with Kai before its review counts |
| `styles/stick-man/tools/rigtest.mjs`, `facebeat.mjs` | the rig test (gate 3: head shape, bone lengths, joint flex in every library clip; `--sheet` renders the turnaround) and faces against the story (gate 4: a face the beat never names, a face taken up more than 2 times; reads `review/shot-rows.jsonl` from `shot.mjs --dbg`) |
| `styles/stick-man/engine/solids.js`, `tools/facesheet.mjs`, `tools/logline.mjs`, `lib/props/sizes.js` | the set's solids from its geometry (props rest on them, the dbg's `propIn`), the face sheet Kai approves, the append-only run log, real prop sizes (`.claude/skills/verify/features/stick-man-props-solid.md`) |
| [PREPRO.md](PREPRO.md) | stage 1 in depth: flow, vocabulary, each step's standard, gate and mistakes, craft knowledge (story, staging in 9:16, explaining in pictures, continuity, timing), reviews, fidelity, gates, fixes per `prepro.mjs` check |
| [DIAGNOSE.md](DIAGNOSE.md) | symptom → isolation test → cause → fix → stage, note translation, process smells, a worked example |
| [AUDIT.md](AUDIT.md) | why the pre-production stage was rebuilt (Nov 2026), and the roadmap |
| [REEL_DATA.md](REEL_DATA.md) | `storyboard.json`, `reel.js` keys: motion v2 `anim`, `direct` cameras, `overlays`, `style`, beats, music |
| [GATES.md](GATES.md) | the gates by profile (safety / quality / reference) and how to fix a FAIL |
| [LEDGER.md](LEDGER.md) | the per-stage ledger template |
| `templates/stage-page.html` | the stage page |
| `styles/stick-man/tools/prepro.mjs`, `animatic.mjs`, `shotlist.mjs` | the pre-production checker, the animatic builder, and the shot-list loader they share |
| `styles/stick-man/tools/previs.mjs`, `previs-core.mjs`, `previs.html`, `templates/previs-bank.json` | the 3D previs and temp-music animatic (grey blockout, camera path, cuts vs flights, label bar), its pure camera math, the page it captures, and a worked hand spec (Hot Money's three banks as one take) |
| `styles/stick-man/tools/camtry.mjs`, `camtry-core.mjs`, `camtry.html`, `camtry-page.js` | the "thử góc máy" mode: a camera note resolved to film / segment / frames / anchors, the variants rendered by the film's own engine with wall numbers, and the pick written into the anchors |
| `styles/stick-man/docs/` | kit reference: verbs, poses, faces, sets, Blender sets |
