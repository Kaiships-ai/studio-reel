# Process: how each step is run

The recipes behind SKILL.md.

## 1. Stage pages (one artifact per stage)

Kai keeps one tab per stage. So there is one page per stage, and you open the next one only when its gate opens. Nothing goes on a new page that belongs on an existing one.

- **Template.** Start from `templates/stage-page.html`. It has the outline rail, the status table, decision cards and the status badges in the sidebar.
  - Publish it with the Artifact tool, `capabilities: { db: {} }`, and `icon: 'film'`.
  - Put media under `k/` and publish them as `files`.
- **Outline.** Number the sections as `[stage.step]` and end each stage with `◇` gates. Map each section id to its row ids in `MAP`.
- **Status rows.** Collection `items`, one row per step: `{ order, code, title, state: done|review|doing|todo|blocked, evidence, ask }`.
  - Kai's buttons write `kai: ok|fix` and `note`.
  - Write rows with the `ArtifactData` tool. Pin `if_version` and read the row first.
- **Decisions.** Collection `decisions`, keyed by the card's `data-d` and holding `{ choice, note }`. Read them, notes included, before acting: Kai often answers in the page notes, not the chat.
- **Keeping it clean.** Once something is locked, the page keeps only the locked result and the open items. Remove rejected options, earlier rounds and exploration. Before republishing, update every status that has gone stale.
- **Options.** Every option is a real render next to the current state, never text only. If an option can't be rendered yet, say so on its card.

## 2. Independent agents (never judge your own work)

Spawn a **fresh** agent for each check: `subagent_type: verifier`, `model: sonnet`, `effort: medium`, in the background.

- Give it files to read: per-shot strips, full frames, purposes. Never give it your conclusion.
- It writes nothing to disk.
- Review what it says against the frames yourself. A finding you disprove on a frame goes to Kai as "không phải sạn", with the frame number. A finding you can't disprove gets fixed.
- After 2 rounds on the same issue, stop and show Kai.

**Strips for agents.** Six evenly spaced frames per shot, rendered from a full 540x960 render:
`ffmpeg -i f_%d.jpg …` with an `hstack=6` of frames `a + (b-a)*k/5` for each shot range.
Label the strips with the shot's real cut frames (`CUTS`), not the animatic's rounded times.

| Check | When | Prompt core (add the story, intents, shot ranges, file paths) |
|---|---|---|
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

## 3. Camera pass (stage 3.1)

Follow `.claude/skills/animation-camera-pass/SKILL.md`. Its OUT-1 to OUT-7 outputs go on the Shot page. What follows is specific to this engine.

1. **Intent first.** Derive one "what the audience feels" line per scene from the approved voice styles, mark it `(est.)`, and stop for Kai to confirm. Story intensity comes from that line.
2. **Cut frames.** Take them from the animatic, `ffmpeg -i films/<slug>/review/animatic.mp4 -vf "select='gt(scene,0.08)',showinfo" -f null -`, and store them as `CUTS` in `reel.js`.
3. **Cameras are hand-directed** (`direct`, REEL_DATA.md).
   - Each entry's `why` starts with `P<n> · PURPOSE`.
   - Give every entry `cut: 'cut'`. Without it the director glides 16 frames between shots (`cut: 'move'` default), which smears every cut.
4. **Options as data.**
   - Write an `OPT = { <shot>: { safe, emo, bold } }` table and a `KAI` picks table. `PICK = { ...KAI, ...?opt= }`.
   - Render each option with `shot.mjs --frames <mid> --query "opt=<shot>:<name>"`.
   - Kai picks on the page and you copy his picks into `KAI`.
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
- **Cut keys.** A key on a cut stays `snap`. The engine restarts follow-through, the hat lag and the face there.
- **Timing.**
  - Every other key holds until T frames before the next key, then moves.
  - T = 7 by default, 4 for fast repeats such as saw strokes.
  - `t: n` on the next key overrides T. Use 14-22 for big arm moves and 9 for a take.
- **Anticipation.** `antic` 0.1-0.35 on wind-ups (a point, a nod, a head tilt, a scream). It shortens the action itself, so raise `t` with it.
- **Moving holds.** Every key carries `cycle: BREATH` (chest and head drift), so no pose freezes. Takes use a fast tremble: `{ 'spine.side': [1.5, 4], 'neck.tilt': [2, 5] }`.
- **Asymmetry.** Give poses `pelvis.roll` and `spine.side` opposite each other.
- **Takes.** Pop the body up (`bob` up, then land a little low): the engine stretches on the rise and squashes on the landing. Fling the arms out and up, never into the head.
- **Arm-solver traps.** A straight arm (`elbow` < 15) or a hand near the head or belly flips the IK. Keep `elbow` ≥ 15 and hands at least a fist away from the body. Measure: joint change ≤ 25°/frame.
- **Measure** with `shot.mjs --film films/<slug> --frames 0-<last> --report review/pol-stats.txt --fast 1`.
  - Check `joint change top 5`, `frames over 25 deg`, `stance-foot slide` and `actor body inside`.
  - Fix with longer `t`, smaller pose changes or other target poses. Never by loosening the gate.

## 6. Physics of props and sets

Props follow the same rules as the body.

- A falling object follows g = 9.8 from the frame it leaves support.
- It only tips once its centre overhangs.
- It never passes through the set. Sample the surface it can hit and push it out on contact. Example: `styles/stick-man/allout/sets/canyon-edge.js` samples the cliff with rays into a `faceAt` table.
- **Prove it with numbers:** log clearance per frame in a temporary build; it must stay ≥ 0.

## 7. Board (3.5)

- **Storyboard entries** (REEL_DATA.md) need `see`, `still`, `act` and `props` per line.
- **The still word** picks the frame that carries the line's meaning. The spoken key word can land on a different shot than the one that shows it.
- **Fixing a "not shown".** Fix the picture: make the snake visible, make the loupe readable, clear the stage. Never touch the wording.
- **Judges.** 3 headless judges; a line counts as shown on 2 of 3. Make the latest verdict `review/board-verdict.json`.

## 8. Sound (4.1)

- **Cues.** `beats` entries `{ f, who, do: 'sound', name, strength }`. Names come from `tools/sound_bank.py`: saw, chug, clack, flutter, crank, groan, sting, whoosh, boom, …
  - A silence can be the point: the rival's train has no sound.
- **Extract and mix.** Pull the cues with `shot.mjs --cues audio/cues.json`, then run `sound.py`.
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

Commands, profiles and thresholds: GATES.md. Always pass `--profile` (the default is `full`); Kai picks it.

- Show Kai the table: safety PASS, quality FAIL with a fix plan, reference FAIL with the reason.
- Fix quality FAILs in data or kit. Fix measuring-tool gaps in the tool (`__dbg`), with a commit that says so.

## 10. Deliver (◇5)

1. Render the final with Kai's last choices applied.
2. Run `sheet.mjs --n 21`.
3. Fill `films/<slug>/LEDGER.md` by stage (template LEDGER.md).
4. Put the final video, the sheet and the safety-gate table on the Post page.
5. Open the PR for kit and engine changes with proof in its body. Merge only on Kai's word.
