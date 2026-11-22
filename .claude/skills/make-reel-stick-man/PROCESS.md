# Process: how each step is run

The recipes behind SKILL.md.

## 1. The episode page (one artifact per episode)

One page per episode, opened with a "Bây giờ" block (where it stands, what runs, what is wrong, what Kai owes). Each stage is a section; nothing goes on a new page that belongs on this one. Kai acts on it only at his touchpoints (SKILL.md): K1, K2, K3, and S1/S2 when the series is set up.

- **Template.** Start from `templates/stage-page.html`. It has the outline rail, the status table, decision cards and the status badges in the sidebar.
  - Publish it with the Artifact tool, `capabilities: { db: {} }`, and `icon: 'film'`.
  - Put media under `k/` and publish them as `files`.
  - Every still opens at full size on click (Kai 14/11: "ảnh anh ấn vào là xem được chi tiết"): wrap it in the template's `button.zoom` with `data-full="k/full/<name>.jpg"`, a full-resolution copy (≤ 3000 px wide) published beside the small one.
- **Outline.** Number the sections as `[stage.step]` and end each stage with `◇` gates. Map each section id to its row ids in `MAP`.
- **Status rows.** Collection `items`, one row per step: `{ order, code, title, state: done|review|doing|todo|blocked, evidence, ask }`.
  - Kai's buttons write `kai: ok|fix` and `note`.
  - Write rows with the `ArtifactData` tool. Pin `if_version` and read the row first.
- **Decisions.** Collection `decisions`, keyed by the card's `data-d` and holding `{ choice, note }`. Read them, notes included, before acting: Kai often answers in the page notes, not the chat.
- **Approvals into the film.** A process gate is approved by its independent reviewer: `films/<slug>/review/approvals.json` `{ "<gate>": { "by": "agent:<id>", "at", "verdict": "READY" } }`. At K1 (◇2b) and K2 (◇5) copy Kai's answer from the page: `{ "2b": { "by": "kai", "at": "<kaiAt>", "hook": "<pick>" } }`, `{ "5": { "by": "kai", "at", "notes": <count> } }`, his choices into `DECISIONS.json` (DEVELOP.md section 5) and his notes into `review/retakes.json`. `stagegate.mjs` reads them; an approval older than the latest evidence counts as not given.
- **Gate rows show the gate checker.** A gate row's evidence is the line `stagegate.mjs` prints (READY FOR REVIEW, READY FOR KAI K1/K2, or what is missing). Never mark a gate `review` while the checker says OPEN.
- **Keeping it clean.** Once something is locked, the page keeps only the locked result and the open items. Remove rejected options, earlier rounds and exploration. Before republishing, update every status that has gone stale.
- **Options.** Every option is a picture next to the current state, never text only: grey panels or grey stills before ◇2a, real renders after it (PREPRO.md section 6). If an option can't be drawn yet, say so on its card.
- **Per-shot notes.** From the storyboard on, the page shows the shots as cards (id, panel, purpose) and takes a note per shot, so every note names a shot. Burn-in ids in every video.

## 2. Independent agents (never judge your own work)

Spawn a **fresh** agent for each check: `subagent_type: verifier`, `model: sonnet`, `effort: medium`, in the background.

The agent's report is saved as the gate's judged evidence with front matter `by: agent:<id>` and `of: <what it reviewed, version>` on its first lines (GATES.json names the files). The maker never writes a judged file.

- Every brief starts with Kai's taste: "Read `~/.claude/skills/kai-taste/SKILL.md` and the files it names. Judge as Kai
  would at 1x on a phone; name the root each finding breaks; never mark down what Kai praised." For a video, follow its
  Review procedure (`tools/look.sh`). Headless judges get the roots inline (`styles/stick-man/tools/review/taste.mjs`).
- A video review is advisory until its brief agrees with Kai: the report's front matter carries
  `brief: <tag>` (`node styles/stick-man/tools/review/calibrate.mjs hash`), and `stagegate.mjs` shows that tag's record in
  `styles/stick-man/tools/review/calibration.json` as an advisory row. A brief that never ran, or scored under the bar (70% of
  Kai's complaints caught, at most 25% of his praised moments attacked, his pick in every A/B, on the test half only), is
  "uncalibrated": its review is still required, but it never stands in for Kai at K1 or K2. Score a brief change with `calibrate.mjs blind` (prompts with no answers in them) and `calibrate.mjs score <key>
  <answers> --record`; the key is Kai's private replay set and stays outside the repo.
- Give it files to read: per-shot strips, full frames, purposes. Never give it your conclusion.
- It writes nothing to disk.
- Review what it says against the frames yourself. A finding you disprove on a frame goes to Kai as "không phải sạn", with the frame number. A finding you can't disprove gets fixed.
- After 2 rounds on the same shot and fault kind, `retakes.mjs` reports PREMISE: stop and prepare K3.

**Strips for agents.** Six evenly spaced frames per shot, rendered from a full 540x960 render:
`ffmpeg -i f_%d.jpg …` with an `hstack=6` of frames `a + (b-a)*k/5` for each shot range.
Label the strips with the shot's real cut frames (`CUTS`), not the animatic's rounded times.

| Check | When | Prompt core (add the story, intents, shot ranges, file paths) |
|---|---|---|
| Pre-production reviews | stage 1: after the board, after each animatic version | muted retell, 5-second read, explain audit, swipe test, continuity, camera intent: prompts in PREPRO.md section 5 |
| Layout challenge | before Kai sees any camera layout | "Judge camera only: shot size, angle, lens, what the eye hits first, background clutter, phone readability in the panel's duration, continuity, purpose. The bar: a real wide or a real close-up, a clean background behind faces, an obvious purpose. PASS or FAIL + one camera fix per shot." |
| Camera pass | camera lock, or whenever Kai doubts a shot's purpose | run the skill `.claude/skills/animation-camera-pass/SKILL.md` on the current frames. Deliver OUT-1, OUT-3, OUT-4 and OUT-5 to `films/<slug>/review/campassN.md`, with a recommended option per failing shot. |
| Lock check | after previs | the camera-pass 7-point checklist per shot: CAM LOCK or FIX [items] + one fix |
| Blocking review | after blocking | "Judge the key poses: silhouette, line of action, does the pose read the beat, expression, contact with props or ground, overlay readability. PASS or FIX + one pose fix." |
| 12-principles audit | after polish | `.claude/skills/animation-principles/SKILL.md` "Audit a reel": a yes / partly / no table with frame evidence, plus the 5 most visible problems with a fix each |
| **Sạn hunt** | before every pass goes to Kai | "Find visible logic, physics and continuity slips a plain viewer would catch. Example: an overlay that claims what the picture does not show, a hat that vanishes, a face from the previous shot leaking in, an object through rock, a character where he should not be. Not camera style. Confirm each finding on a full frame." |
| Board | Shot lock | `board.mjs --judge 3` (section 7) |

Classic script sạn: a line that claims what the point-of-view character cannot know, two lines that contradict each other, a character acting with no reason, a line that needs two readings.

Classic sạn to check every time: an overlay with no motion behind it, a tool not touching its target, a hat hidden by a
very low camera, a limb looping round the head from below, a character left in a shot where he should not be, a face from
the last shot leaking across the cut, a blink inside a take, a falling object pitched the wrong way or passing through the
set, a camera move through geometry, a loupe whose content does not read.

## 3. Camera pass

Two passes, one method (`.claude/skills/animation-camera-pass/SKILL.md`):

- **Camera-intent pass, stage [1.6].** On the animatic, before any asset exists. Scene intents come from [1.0] (already
  confirmed). Story and visual intensity come from `prepro.mjs` (`review/intensity.svg`, `review/prepro.md`); the axis map
  is the floor plan from [1.3]. Options are grey panels written on the shot itself (`options: { safe, emo, bold }`, each
  holding the fields it changes plus its own `panels`) and cut into the animatic with
  `animatic.mjs --opt SH040:emo,SH060:bold` (one version per option set); the camera-pass reviewer's choice goes into the shot's `pick` and Kai sees the result at K1. The result is
  ◇2b: size, angle, lens class, move and axis side per shot. Deliver OUT-1, OUT-3, OUT-4, OUT-5 to
  `films/<slug>/review/campass1.md`.
- **Execution pass, stage [3.1].** In 3D, on real frames: place each locked intent (lens, height, distance, move timing),
  run the method again on rendered strips, and open new options only where a locked intent fails in 3D (geometry in the
  way, the figure too small, a hat under the brim). A change of size or side of the line here reopens ◇2b,
  so Kai sees it again at K1.

What follows is specific to this engine (execution pass).

1. **Intent first.** The scene `feel` lines from [1.0] are the intents (confirmed at ◇2a). Story intensity is each shot's `story` value.
2. **Cut frames.** `animatic.mjs` prints `CUTS` from the locked shot list; paste it into `reel.js`. (Only for an animatic made before the shot list existed: `ffmpeg -i films/<slug>/review/animatic.mp4 -vf "select='gt(scene,0.08)',showinfo" -f null -`.)
3. **Cameras are hand-directed** (`direct`, REEL_DATA.md).
   - Each entry's `why` starts with `P<n> · PURPOSE`.
   - Give every entry `cut: 'cut'`. Without it the director glides 16 frames between shots (`cut: 'move'` default), which smears every cut.
4. **Options as data.**
   - Write an `OPT = { <shot>: { safe, emo, bold } }` table and a `KAI` picks table. `PICK = { ...KAI, ...?opt= }`.
   - Render each option with `shot.mjs --frames <mid> --query "opt=<shot>:<name>"`.
   - The camera-pass reviewer picks (Kai at K1 when it changes the whole-film previs); copy the picks into `KAI`.
5. **Lens kit and scoring.** Lenses are 24/35/50/85 mm on a 36 mm-tall sensor. Score intensity with the skill's 0-2 table. The climax must be the visual peak; no early peak.
6. **Axis.** Along the track, look +y (wall right, drop left). Across it, look from the drop side toward the wall. Reverse close-ups for a sky background are allowed when they carry no screen direction.
7. **Real moves only.**
   - A move must not pass through set geometry. Check the frames in the middle of the move.
   - A move over about 95 px/frame at 720p (for example a 12 m pull-out in 14 frames) becomes a cut between the same two framings.
   - `kick` is for impacts only.
8. **Low and high shots.** A very low camera hides caps and hats under their brims. Lift it until the cap reads.
   - Low-angle face shots against the sky: name them `low`.
   - The opening wide: name it `est`. The gates read these names.

## 4. Overlays (stage 3.2)

`overlays` (REEL_DATA.md, `engine/overlays.js`) draw the storyboard's hand-drawn layer after the 3D look.

- **Loupe.** Gets its own camera. Choose a side-on view of the joint: a top view of a glowing rail reads as a blank disc.
- **Sound words.** Pop on the frame of the impact, not before.
- **Arrows.** They are honest only if the thing moves with them. Rail ends growing into a gap means `inward: true` arrows **and** a `gap` key that closes in the same frames.
- Never draw a fact that the picture does not show.

## 5. Blocking (3.3) and polish (3.4)

**Blocking**
- Key poses per shot, every key `ease: 'snap'`, held. Write `hold(f, {...})` keys over a `STAND` base; REEL_DATA.md has the helpers.
- Key the lead by hand: pose, `expr`, `look`.
- Put a character off screen with `pos` far away on a key at a cut frame. A non-cut key slides him across the frame.

**Polish** (`polish(keys)` in REEL_DATA.md): the blocking poses stay. Then:
- **Cut keys.** A key on a cut stays `snap`. The engine restarts follow-through and the face there.
- **Timing.**
  - Every other key holds until T frames before the next key, then moves.
  - T = 7 by default, 4 for fast repeats such as saw strokes.
  - `t: n` on the next key overrides T. Use 14-22 for big arm moves and 9 for a take.
- **Anticipation.** `antic` 0.1-0.35 on wind-ups (a point, a nod, a head tilt, a scream). It shortens the action itself, so raise `t` with it.
- **Moving holds.** Every key carries `cycle: BREATH` (chest and head drift), so no pose freezes. Takes use a fast tremble: `{ 'spine.side': [1.5, 4], 'neck.tilt': [2, 5] }`.
- **Asymmetry.** Give poses `pelvis.roll` and `spine.side` opposite each other.
- **Takes.** Pop the body up (`bob` up, then land a little low): the engine stretches on the rise and squashes on the landing. Fling the arms out and up, never into the head. The face times its own take (anticipation 5 f before the key, accent on the key): put the take's `expr` on the accent frame, not earlier; `small: true` for a quick take with no anticipation.
- **Arm-solver traps.** A straight arm (`elbow` < 15) or a hand near the head or belly flips the IK. Keep `elbow` ≥ 15 and hands at least a fist away from the body. Measure: joint change ≤ 25°/frame.
- **Measure** with `shot.mjs --film films/<slug> --frames 0-<last> --report review/pol-stats.txt --fast 1`.
  - Check `joint change top 5`, `frames over 25 deg`, `stance-foot slide` and `actor body inside`.
  - A hand, prop or joint fault the shot's camera cannot see (behind a counter, out of frame) prints on an `ẩn` line
    with its frames and number and does not fail the shot. Do not restage for it; a new camera judges it again.
  - Fix with longer `t`, smaller pose changes or other target poses. Never by loosening the gate.

## 6. Physics of props and sets

Props follow the same rules as the body.

- A falling object follows g = 9.8 from the frame it leaves support.
- It only tips once its centre overhangs.
- It never passes through the set. Sample the surface it can hit and push it out on contact. Example: `styles/stick-man/kit/sets/canyon-edge.js` samples the cliff with rays into a `faceAt` table.
- **Prove it with numbers:** log clearance per frame in a temporary build; it must stay ≥ 0.

## 7. Board (3.5)

- **Storyboard entries** (REEL_DATA.md) need `see`, `still`, `act` and `props` per line.
- **The still word** picks the frame that carries the line's meaning. The spoken key word can land on a different shot than the one that shows it.
- **Fixing a "not shown".** Fix the picture: make the snake visible, make the loupe readable, clear the stage. Never touch the wording.
- **Judges.** 3 headless judges; a line counts as shown on 2 of 3. Make the latest verdict `review/board-verdict.json`.

## 8. Sound (4.1)

- **Cues.** `beats` entries `{ f, who, do: 'sound', name, strength }`. Names come from `tools/run/sound_bank.py`: saw, chug, clack, flutter, crank, groan, sting, whoosh, boom, …
  - A silence can be the point: the rival's train has no sound.
- **Extract and mix.** Pull the cues with `shot.mjs --cues audio/cues.json`, then mix with the kit mixer `mix.py` (SKILL.md [4.1]).
- **`audio/music.json`.** The music arc, REEL_DATA.md "Music".
- **Targets** (`audio/levels.txt`):

  | | Target |
  |---|---|
  | mix | −14 ± 0.5 LUFS |
  | SFX | −21 ± 2 vs the voice |
  | music | −26 ± 2 vs the voice |
  | peak | ≤ −1 dBTP |
  | words masked by SFX | 0 |

  Hits outside the −8..−4 band are listed in `levels.txt`.

## 9. Gates (4.3)

Commands and thresholds: GATES.md.

- Put the table on the episode page: what PASSed, each FAIL with its fix plan.
- Fix FAILs in data or kit. Fix measuring-tool gaps in the tool (`__dbg`), with a commit that says so.

## 10. Deliver (◇5)

◇5 is K2. It needs every measured gate and `review/final-qa.md` by an independent agent (its brief's calibration is
advisory, section 2), then Kai watches the whole film at 1x and writes notes per segment. v1 with at most 5 notes
passes; log them in `review/retakes.json` (each with `kind` and `root`) and, when the episode is posted, its bench row
with `node styles/stick-man/tools/series/firstrun.mjs add films/<slug> --rounds <n> --minutes <m>`.

1. Render the final (720p) with the last choices applied.
2. Run `sheet.mjs --n 21`.
3. Fill `films/<slug>/LEDGER.md` by stage (template LEDGER.md).
4. Put the final video, the sheet and the safety-gate table on the Post page.
5. Open the PR for kit and engine changes with proof in its body. Merge after an independent review says CLEAN and CI is green.

## 11. Mode: thử góc máy (camera previs from the film's own engine)

Triggers and the short form are in SKILL.md. The steps:

Triggers: "previs", "thử góc máy", "máy quay …" (a camera note such as "đoạn đua xe, máy quay dính tường nhà, nâng lên
chút" or "cảnh ngân hàng thứ hai, máy gần quá"). Use it in any stage once the film renders in the engine.

1. Run `node styles/stick-man/tools/run/camtry.mjs "<Kai's note, word for word>"` from the library root, through the
   render lock. Do not look up the film, the segment or the frames by hand: the tool finds them.
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
4. Put the section on the episode page. A camera note from Kai is K2 feedback: his pick is the K2 answer for that segment.
5. Run `node styles/stick-man/tools/run/camtry.mjs pick <out dir> <Vn>`. It sets the anchors' `dz` to their value at the
   previs run plus the lift (the whole anchor window, so the camera never pops; picking twice never stacks; V0 puts
   them back), keeps `<xfer>.bak`, and reruns the generators of that act. A failing generator puts the anchors and the
   act back. It only writes inside the film folder. Then re-render the act and rerun its gates.
   - A move the anchors cannot hold ("xa tường", "gần lại", "nhìn nhân vật") is refused with the reason. Make that
     change in the act's camera by hand, from the numbers.
   - `--dry` prints the change only.


## 12. Steps in detail

The full step table behind SKILL.md's stage list. Gates and their approvers are in GATES.json (`approver`, `touch`).

| Stage | Step | Output | Proof Kai sees |
|---|---|---|---|
| **0 Development** | [0.0] benchmark | 3-5 videos of the same format: hook, sizes, rhythm, sound, swipe points; what to learn, what not to take (DEVELOP.md). The measured bar is the Rick bench: `styles/stick-man/bench/TABLE.md` (cuts, look, depth, motion, sound per metric); a new reference gets its row with `node styles/stick-man/tools/review/refbench.mjs <mp4> --out <row.json>` (bench/README.md) | treatment section + the Rick bench rows the film aims at |
| | [0.1] brief + series bible | `node styles/stick-man/tools/run/new_film.mjs <slug>` makes the folder, `vo/script.json`, `storyboard.json`, `reel.js`, `LEDGER.md`; you write `BRIEF.md` (for a series, from the bible and the state the last episode left) | the page |
| | [0.2] treatment | `TREATMENT.md`: logline, 3 structures + choice, 2-3 hooks, the intensity curve. A reference is a quality bar, never a shot list. | the page |
| | [0.3] hook test | a fresh agent picks a hook from thumbnails + first lines (`review/hook-test.md`) | hook test |
| | [0.4] beat board | the whole story in ~12 panels (one beat each); pick a pilot segment that is a complete mini story (conflict + payoff) | sketch panels |
| | [0.5] decision log | every decision in `DECISIONS.json` with `where` and a `check` when a tool can verify it; `node styles/stick-man/tools/gates/develop.mjs films/<slug>` | decision list |
| | **◇1** brief, treatment, story (`stagegate.mjs … 1`; the structure is locked here; steps and standards: DEVELOP.md) | | |
| **1 Pre-production** | [1.0] scene brief + intensity plan | `storyboard.json` `scenes`: feel, whose, key, question per scene; want / obstacle / outcome per beat; target story intensity and the climax (PREPRO.md [1.0]); an independent reviewer confirms the feel lines (`prepro.mjs --lock-story agent:<id>`) | brief table + intended curve |
| | [1.1] script (SCRIPT.md) | **a** beat outline with but/so links, plants, vote costs (`vo/beats.json`); **b** fact sheet (`vo/facts.json`) + fresh fact check; **c** draft `vo/script.json` until `node styles/stick-man/tools/gates/scriptlint.mjs films/<slug>` has no FAIL; **d** skeptic pass; **e** table read + ear retell; **f** punch-up: 3 rewrites per flagged line, a fresh judge picks; **g** blind A/B against the last locked script | script + lint + the four reviews + the A/B winner |
| | **◇S** script lock (`stagegate.mjs … S`; a later script change reopens it and the voice is recorded again) | | |
| | [1.1p] picture pass | per locked line `see` + an explain device from the ladder (PREPRO.md 4.3); no card where an event or object can carry the fact | line/device table |
| | [1.2] visual development (parallel) | 2-3 looks rendered as style frames on two shots of the shot list (a wide, the climax), checked at phone size with the text-safe box. The look is the series look Kai picked at S1 (a new series makes its S1 here); it never changes a locked shot. Each frame shows the depth kit: lens blur, sky dome and air come with the engine; an exterior gets far town rows (act `backdrop: { rows, tint }`, a dark tint about 0.17 at night; `.claude/skills/verify/features/stick-man-depth.md`) | style frames with depth behind the subject |
| | [1.3] design (parallel) + floor plans | characters (model sheet, faces, profile), props; a floor plan per set with marks, paths, the 180° line per scene, camera zones and the film's screen-direction convention | sheets + plans |
| | [1.4] storyboard | **a** thumbnails + the shot list (`storyboard.json` `shots`, REEL_DATA.md); **b** grey rough panels, one per key (start/end of a move, anticipation/extreme/result of an action); **c** board pitch + muted retell by a fresh agent. `node styles/stick-man/tools/gates/prepro.mjs films/<slug>` after each change | board sheet, `review/prepro.md`, `review/intensity.svg`, retell |
| | [1.5] voice | scratch voice for animatic v1; final voice (`voice.py --samples Achird`, `--take`, `align.py`, `pause.py` for planned `pause_after` silences) before the timing pass ends; shots are re-anchored to words, never retyped | audio + `voice-qa.md` |
| | [1.6] animatic | `node styles/stick-man/tools/run/animatic.mjs films/<slug> --v N --safe 1` (shots, keys, 2D moves, burn-in, UI bands); passes in order: story → timing → camera intent (2D camera pass, 3 options per flagged shot) → test screening (muted + sound-on retell, swipe test); `CUTS` it prints goes into `reel.js` | video + changelog + prepro PASS |
| | [1.6p] previs + temp-music animatic | before ◇2a: the temp music is a credited track from `styles/stick-man/sound/RESEARCH.md` (Music Kai can post), fitted to the film's music arc with `python styles/stick-man/tools/run/sound_fit.py films/<slug> <track> --bpm <page tempo> --out films/<slug>/audio/music-A.json`; 2-3 candidates, the reviewer picks one and it goes in `DECISIONS.json` and `CREDITS`. Then `node styles/stick-man/tools/run/previs.mjs films/<slug> --film` cuts the whole film as a grey 3D blockout on the final voice with temp music (`audio/stems/music.wav` or `--music`): a tall red tick and CẮT at each hard cut, a small tick where the camera flies on, cuts per minute and median take beside the Rick numbers. Inside a scene the camera flies between shots (`--join scene`, Rick changes view by flights, about 1 hard cut a minute); a shot's `join: "cut"` keeps a cut. A scene that needs a staged camera gets a hand spec, `films/<slug>/previs/<name>.json` (worked example: `test/fixtures/previs/bank.json`; the fields are documented at the top of `styles/stick-man/tools/run/previs-core.mjs`: camera rows `[t, x, y, z, look x, y, z, fov]`, stages `{ t, title, sub, kind }`, `shots` = the storyboard shots it replaces), rendered alone with `--scene <name>` in seconds. `--scene` takes a spec name first, else a storyboard scene id; every run writes `review/previs/<name>.mp4` with `vo/vo.wav` under it from the scene's start. Kai sees the whole-film previs with the hook options at K1, before any render | `review/previs/animatic.mp4`, `review/previs/previs.md` (◇2b needs it) |
| | [1.7] colour script | after ◇2a: one frame per scene from the locked shots in the chosen look, placed on the intensity curve; then the same in numbers, `colour-script.json` (copy `.claude/skills/make-reel-stick-man/templates/colour-script.json`: per scene the intent, R/B, saturation and black ranges, the hue families it may show or flood with, the light events that may jump), with the bible's `palette.signature` and `palette.offColor`; it carries the series signature from S1 (`approved: { by: "kai", at }`, the date Kai picked the series look). A look change is written here before it is lit into the acts (post adds no colour) | strip + `colour-script.json` |
| | **◇2a** story + timing lock · **◇2b** shot lock (camera intent) · **◇2c** look + design lock (PREPRO.md section 7; ◇2b is K1, Kai's whole-film previs + hook pick; ◇2c never before ◇2a and needs `colour-script.json` with the S1 signature) | | |
| **2 Asset** | [2.1] rig + dose | the body is `engine/body.js` (bones, joint ranges, contact, balance, carried loads; `PHYS` switches) and the dose `engine/motion.js` `STYLE_PRESETS`; prove a change on short test clips rendered with physics on and off, plus `shot.mjs --report` numbers ((h) hands on their targets, (i) held props in the body); body types and stock motion come from the motion library (`styles/stick-man/motion-lib`, `docs/MOTION-LIB.md`; `node styles/stick-man/tools/gates/motionlib.mjs` checks it, `--proof <dir>` renders it). Every act sets the moving hold in its style: `style: { ...STYLE_PRESETS.kaiships, life: 0.75 }` (0 off, up to 2; `stick-man-acting-rig.md`) | clips + numbers |
| | [2.2] faces, set, props | only what the animatic needs: faces in s2, the default face style (`engine/facestyles/s2.js`, the default rubber face: `y_` designs for the lead, `c_` for a second character; new face work goes into s2; `faceStyle: 'kit'` in reel.js keeps the old kit faces of `engine/faces.js`); every new or changed face design goes on the series face sheet (S2) before any render Kai sees (`node styles/stick-man/tools/series/facesheet.mjs films/<slug>`, then `--approve`; Rules), sets and props `styles/stick-man/kit/` (pattern: `kit/sets/canyon-edge.js`), Blender pieces `styles/stick-man/docs/GLB.md`; per set, the far backdrop rows from `styles/stick-man/assets/backdrop/` (act `backdrop`, or `backdrop()` in the set's `build()`; new pieces from `tools/run/backdrop_blend.py`) | sheets, the approved face sheet, stills |
| | [2.3] run-through | every approved asset together in the real set at the chosen dose (not a film shot) | video + body numbers |
| | [2.4] breakdown + layout check | `node styles/stick-man/tools/gates/assets.mjs films/<slug>`: the asset list and states from the shot list, kit vs film-local, the set measured against the story's distances (`measures`); every CAM LOCK shot rendered grey with the real assets beside its panel | `review/assets.md`, layout sheet |
| | **◇3** asset lock | | |
| **3 Shot** | [3.1] camera pass (execution) | places the camera intent locked at ◇2b in 3D (lens, height, distance, move timing); skill `animation-camera-pass` again on rendered strips; 3 rendered options only where a locked intent fails in 3D; previs per scene first (`previs.mjs films/<slug> --scene <name | scene id>`: blockout, camera path, Vietnamese label bar, voice under; the reviewer judges the camera from it with the camera-pass prompt), then the lock check (PROCESS.md section 3). A camera note from Kai on a rendered segment ("máy nâng lên chút") goes through `camtry.mjs` (Mode: thử góc máy). A change of size or side of the line reopens ◇2b (K1) | option cards, previs video |
| | [3.2] overlays | the storyboard's drawn layer (loupe, sound words, arrows) via `overlays` (REEL_DATA.md) | stills |
| | [3.3a] acting brief | per action / reaction shot: think → do → change in `review/acting.json` (shot id → brief; storyboard.json stays as locked so earlier gates hold) and 3-5 grey pose thumbnails; the blocking reviewer checks the poses (PROCESS.md section 2) | `review/acting.md` |
| | [3.3] blocking | key poses by hand, `ease: 'snap'`, every shot (REEL_DATA.md motion v2), with the temp sound from the animatic | video beside the animatic |
| | blocking review (PROCESS.md section 2) | | |
| | [3.4] polish | holds, eases, anticipation, moving holds (`life`: on a locked-camera clip `refbench.mjs <mp4>` "motion while the camera is still" sits in the Rick band 1.21-3.67), asymmetry; sạn hunt; camera pass again if a shot misses its purpose | blocking vs polish video + numbers |
| | [3.4b] light per shot | key on the face, rim off the background, the subject's value contrast against its background checked at phone size; depth per shot: background soft and face crisp (a shot's `dof` wins), a far row reads as a mass, darker at night; `refbench.mjs` depth ratio against the Rick band 1.80-2.20 | stills + depth ratio |
| | [3.5] board + feel check | `board.mjs films/<slug> --judge 3` (lines shown) and a fresh agent scoring each scene 1-5 against its `feel` (`review/feel-check.md`); `node styles/stick-man/tools/gates/timing.mjs films/<slug>`; `node styles/stick-man/tools/gates/shotgate.mjs films/<slug>`, the measured shot gate ◇4 and ◇5 run: a prop that pops, jumps, floats or changes across a cut, a figure that pops in, skates, snaps or passes through the set, where the camera sees it (`review/shot-gate.md`, a 15-frame strip per flagged second for the reviewer) | board + votes + feel scores + shot gate strips |
| | **◇4** Shot lock (board ≥ 85 %; `kituse.mjs films/<slug> --gate 4` fails an act with no `life` or a film with no `backdrop`, ids `life` and `depth`, unless `DECISIONS.json` waives that id; ◇4 also runs `facebeat.mjs`, which fails a face not on the S2 face sheet) | | |
| **4 Post** | [4.0] sound plan | `audio/sound-plan.json` per scene: bed, foley, music state; ≥ 2 planned silences, ≥ 2 sound transitions (DIRECTOR.md §6-7); the music arc follows the intensity curve, `silence` and `drop` allowed | plan |
| | [4.1] sound | `node styles/stick-man/tools/render/shot.mjs --film films/<slug> --cues films/<slug>/audio/cues.json`; cue names from the kit library (`python styles/stick-man/tools/run/sound_lib.py <name>` shows what plays; `styles/stick-man/sound/`); beds in `audio/ambience.json`; the kit mixer `python styles/stick-man/tools/run/mix.py films/<slug> --music-plan films/<slug>/audio/music-A.json` with the track picked at [1.6p] (`stick-man-sound.md`) | `audio/levels.txt` (line 2 names the track) + video |
| | [4.2] render | `node styles/stick-man/tools/render/shot.mjs --film films/<slug> --frames 0-<last> --mp4 films/<slug>/renders/<slug>_vN.mp4 --audio films/<slug>/audio/mix.wav` | video + sheet |
| | [4.3] gates | the gate commands in GATES.md (`stagegate.mjs films/<slug> 4`, `shotgate.mjs`) | gate table |
| | [4.4] final QA + package | a fresh agent watches the final at 1x, sound on, phone size, `--safe 1` (retell + swipe test); `deliver/` cover, caption (skill `ig-caption`), subtitles, `CREDITS`, an alternative hook cut; `node styles/stick-man/tools/gates/postcheck.mjs films/<slug>`; `node styles/stick-man/tools/gates/cutgate.mjs films/<slug>` (at most 4 hard cuts in any 15 s, a take of 6.5 s or more, under 25 % low camera, no face cut off over 1 s); `node styles/stick-man/tools/gates/colourgate.mjs films/<slug>` (the final against `colour-script.json`: cut steps, in-shot dims, cast, saturation, hero white, black level, flood, palette, film luma; a check waived only at K3 in `DECISIONS.json` as `colourgate.G<n>`); the Rick bench of the final: `node styles/stick-man/tools/review/refbench.mjs films/<slug>/renders/<final>.mp4 --stems films/<slug>/audio/stems --out films/<slug>/review/refbench.json` | `review/final-qa.md`, `review/cutgate.md`, `review/colourgate.md`, the film vs Rick table in `review/kituse.md`, package |
| | **◇5** deliver | `kituse.mjs films/<slug> --gate 5` (ids `life`, `depth` (the far backdrop), `sound-plan`, `music` (a credited kit music track), `refbench` (the bench row of the final mp4); a skipped one needs a K3 waiver in `DECISIONS.json`); `sheet.mjs`, `LEDGER.md`, final mp4 and package on the page; needs `review/final-qa.md` by an independent agent (its brief's calibration is advisory); ◇5 is K2: Kai watches the whole film at 1x and his notes go in `review/retakes.json` | final video |
| **5 Publish + learn** | [5.1]-[5.6] | publish; retention at 24 h and 7 d mapped to shots (`retention.mjs`); post-mortem with DIAGNOSE.md; a cause seen twice becomes a proposed rule; update the series bible (PUBLISH.md) | `review/retention.md`, `review/retro.md` |
| | **◇6** learn | | |

A film that locked ◇2c before the gate asked for the colour script is OPEN at ◇2c again until its `colour-script.json`
carries the S1 signature ([1.7]); without it the colour gate at ◇5 gives DRAFT, never PASS.
