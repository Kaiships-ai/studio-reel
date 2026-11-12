---
name: animation-camera-pass
description: Diagnose and fix rejected camera work in an animation animatic: classify feedback, map story vs visual intensity, check continuity, propose 3 options per shot, spec previs, lock cameras.
---

# Animation Camera Pass

A repeatable method for taking an animatic whose camera work has NOT been approved and bringing it to CAM LOCK. Based on Bruce Block's intensity / contrast-affinity model (*The Visual Story*) plus standard film continuity grammar (Katz, Mascelli).

Pipeline position: after **1.6 Animatic**, before **3.1 Layout** and **3.2 Animation**. Nothing goes to animation until every shot in the sequence is CAM LOCKED.

---

## 1. Inputs

### Required
| ID | Input | Format | Notes |
|---|---|---|---|
| IN-1 | Shot list of the current animatic | Table / CSV / sheet | One row per shot. Minimum columns: `shot_id`, `description` (action + dialogue), `duration_frames` or `duration_sec`. |
| IN-2 | Review feedback on camera | Notes, transcript, comments | Raw, unedited. Keep the reviewer's own words. |
| IN-3 | Director intent per scene | One sentence per scene | Answer to: *"What should the audience feel in this scene?"* If missing, STOP and ask for it (see §6). |

### Optional (improves accuracy)
| ID | Input | Format |
|---|---|---|
| IN-4 | Current camera data per shot | Columns: `shot_size`, `angle`, `lens_mm`, `movement` |
| IN-5 | Animatic video or storyboard frames | MP4 / images |
| IN-6 | Scene layout / set plan | Image or description of character and prop positions |
| IN-7 | Project lens kit and camera constraints | e.g. `24/35/50/85/135`, sensor 36x24mm, physical-camera rules on/off |
| IN-8 | Style references | Films, frames, director notes |

Defaults when IN-4 / IN-7 are missing: infer camera data from descriptions or frames and mark every inferred value with `(est.)`; use lens kit `24/35/50/85/135`, full-frame 36x24mm sensor, physically plausible camera moves.

---

## 2. Outputs

Deliver all seven. Use the exact column names so the outputs drop into a tracker (ShotGrid, Ftrack, Kitsu, sheet).

| ID | Output | Format | Produced in |
|---|---|---|---|
| OUT-1 | **Diagnosis table** | Table: `shot_id`, `feedback_quote`, `error_type` (A-E), `root_cause`, `severity` (1-3) | Step 1 |
| OUT-2 | **Scene brief** | Per scene: `scene_id`, `director_intent`, `whose_scene`, `key_information` | Step 1 |
| OUT-3 | **Intensity graph + table** | Line chart (story vs visual intensity per shot) + table: `shot_id`, `story_intensity`, `visual_intensity`, `gap`, `flag` | Step 2 |
| OUT-4 | **Continuity map** | Per scene: overhead floor plan (diagram or structured description) with characters, movement paths, 180-degree axis, camera position per shot; list of violations | Step 3 |
| OUT-5 | **Option sheet** | For each flagged shot, 3 options: `option` (Safe / Emotional / Bold), `shot_size`, `angle`, `lens_mm`, `movement`, `composition_note`, `rationale` | Step 4 |
| OUT-6 | **Previs spec** | Per approved option: camera rig settings, lens, start/end positions, move timing in frames, framing notes | Step 5 |
| OUT-7 | **Review sheet + Shot bible** | Review checklist per shot with `status` (PENDING / FIX / CAM LOCK); final shot bible for the sequence | Step 6 |

---

## 3. Reference tables

### 3.1 Error taxonomy (use for every feedback item)
| Code | Name | Symptoms in feedback | Typical root causes |
|---|---|---|---|
| A | Unclear story | "confusing", "don't know where to look" | No establishing shot, cluttered silhouette, competing focal points |
| B | Broken continuity | "jumpy", "flipped", "disorienting" | 180-degree axis crossed, screen direction reversed, eyeline mismatch, cut with < 30-degree change |
| C | Flat / monotonous | "flat", "no punch", "boring" | Same size / lens / angle throughout; visual peak too early; no build |
| D | Wrong emotion | "feels comedic, should be sad", "too aggressive" | Lens, angle or size contradicts the beat |
| E | Unmotivated camera | "busy", "dizzy", "distracting" | Camera moves without a story reason, non-physical moves, moving camera + complex action together |

Severity: 1 = polish, 2 = must fix, 3 = blocks story comprehension.

### 3.2 Visual intensity scoring (1-10 per shot)
Score each factor 0-2, then sum (max 10).
| Factor | 0 | 1 | 2 |
|---|---|---|---|
| Shot size | Wide / long | Medium | Close-up / extreme close-up |
| Lens | 35-50mm | 24-28mm or 85mm | <= 21mm or >= 135mm |
| Angle | Eye level | Moderate high / low | Extreme high / low, dutch, POV |
| Camera movement | Locked off | Slow, smooth move | Fast, handheld, whip |
| Cut rhythm | Shot > 4s | 2-4s | < 2s |

Story intensity (1-10) comes from the beat: tension, stakes, emotional weight. Anchor it to the director intent (IN-3), not to the current camera.

### 3.3 Flags from the intensity graph
| Flag | Rule | Meaning |
|---|---|---|
| `FLAT` | Visual intensity varies by <= 2 across 4+ consecutive shots while story intensity rises | Error C |
| `EARLY_PEAK` | Max visual intensity occurs before the story climax | Climax will have nowhere to go |
| `MISMATCH` | abs(story - visual) >= 4 on a single shot | Likely error D |
| `NO_RELEASE` | Visual intensity stays >= 7 after the climax | No breathing room |

### 3.4 Lens meaning (default kit)
| Lens | Feel | Use for |
|---|---|---|
| 24mm | Wide, distorted depth | Action, space, unease, characters dwarfed or looming |
| 35mm | Natural storytelling | Default coverage, walking-and-talking |
| 50mm | Close to human eye | Neutral dialogue |
| 85mm | Compressed, intimate | Close-ups, emotion |
| 135mm | Very compressed, isolating | Isolation, voyeur, peak emotion |

### 3.5 Continuity rules
- **180-degree rule**: keep all cameras on one side of the line between interacting subjects.
- **30-degree rule**: consecutive shots of the same subject differ by >= 30 degrees or a clear size change.
- **Screen direction**: movement direction stays consistent across cuts unless a turn is shown.
- **Eyeline match**: a look in shot N matches the position of its target in shot N+1.
- Legal ways to cross the axis: camera moves across it within a shot; character crosses it on screen; insert a neutral shot on the axis; cut to a wide that re-establishes.

### 3.6 Composition rules
Rule of thirds, leading lines, appropriate headroom, lead room in the direction of look or travel, foreground / midground / background depth layers, readable silhouette, one primary focal point per shot.

### 3.7 Coverage patterns (reusable)
- **Two-person dialogue**: master wide -> OTS A -> OTS B -> CU A -> CU B; tighten as tension rises.
- **Reveal**: start on detail or partial view -> pull back / pan to reveal; or hold on reaction before showing the cause.
- **Chase**: lock screen direction; alternate pursuer / pursued; shorten shots toward the catch.
- **Arrival / establishing**: extreme wide -> wide -> medium on the character.

---

## 4. Procedure

### Step 1 - Diagnose
1. Split IN-2 into individual feedback items. Keep the reviewer's wording in `feedback_quote`.
2. Map each item to a `shot_id` (or `scene` if it applies to the whole scene) and to an error code A-E (§3.1). An item can carry two codes; list the primary first.
3. Write a concrete `root_cause` for each, e.g. "SH030 crosses axis established in SH010".
4. Build OUT-2 from IN-3. For each scene also record whose scene it is (whose POV the audience follows) and the key information the audience must receive.
5. Produce **OUT-1** and **OUT-2**.

### Step 2 - Intensity graph
1. Score story intensity per shot (1-10) from the beats and director intent.
2. Score visual intensity per shot using §3.2.
3. Compute `gap = visual - story` and apply flags from §3.3.
4. Draw both curves on one line chart, shots on the x-axis in order, with the climax shot marked.
5. Add every flagged shot to the fix list with its error code.
6. Produce **OUT-3**.

### Step 3 - Continuity map
1. For each scene, place characters, props and movement paths on an overhead plan (from IN-5 / IN-6 or inferred from descriptions; mark inferences).
2. Draw the 180-degree axis. If it shifts mid-scene, show where and why.
3. Place each shot's camera (position + facing direction + lens).
4. Check every cut against §3.5. Log violations as error B with the exact shot pair, e.g. `SH020 -> SH030`.
5. Produce **OUT-4**.

### Step 4 - Three options per flagged shot
For every shot in the fix list (Steps 1-3):
1. **Safe**: textbook grammar, maximum clarity, fixes the error with minimal change.
2. **Emotional**: pushes the beat using size, lens, angle and intensity target from the graph.
3. **Bold**: a different storytelling idea (POV, shadow, reaction instead of action, unusual staging) that still respects continuity.
4. Each option states `shot_size`, `angle`, `lens_mm` (from the kit), `movement`, `composition_note`, and a one-line `rationale` tied to the director intent and the error it fixes.
5. Check that the options keep the sequence's intensity curve shaped correctly (no new EARLY_PEAK, no new FLAT run).
6. Produce **OUT-5**. The reviewer CHOOSES an option per shot; options exist so feedback becomes "option 2, lower the camera" instead of "not working".

### Step 5 - Previs spec
For each chosen option:
1. Specify camera: sensor, lens, height above ground, distance to subject, tilt, roll.
2. Specify movement on the camera rig (separate dolly / crane / pan / tilt controls), start and end values, timing in frames, easing.
3. Note framing at first, key and last frame (where subject sits in thirds, headroom, lead room).
4. Instruct: build with proxy characters and blocky set, playblast, cut directly into the animatic timeline, review in sequence.
5. Produce **OUT-6**.

### Step 6 - Review and lock
1. Review rule: watch the full sequence first, then stop on individual shots.
2. Feedback format required from reviewers: `shot_id + error_code + intended audience feeling`.
3. Score each shot on the 7-point checklist:
   1. Which beat does this shot serve? Could it be cut?
   2. 180-degree axis and screen direction respected?
   3. Main action and silhouette read clearly?
   4. Where does the eye go first, and is it the right place?
   5. Lens within the kit and right for the emotion?
   6. Camera movement motivated?
   7. Cuts in and out clean (>= 30-degree change, eyelines match)?
4. Set `status`: `CAM LOCK` when all 7 pass and the director approves; otherwise `FIX` with the failing item numbers. Loop back to Step 4 for FIX shots only.
5. When every shot is CAM LOCK, compile the **Shot bible**: scene briefs, final intensity graph, floor plans, and final camera data per shot (`shot_id`, `shot_size`, `angle`, `lens_mm`, `movement`, `duration`, `rationale`).
6. Rule after lock: any camera change needs director approval; animators animate to the locked camera.
7. Produce **OUT-7**.

---

## 5. Output conventions
- Shot IDs: `SQ010_SH020`. Versioned camera files: `SQ010_SH020_cam_v002`.
- Every table uses the exact column names in §2 so it can be pasted into a tracker.
- Mark every inferred value `(est.)`.
- Keep rationales to one sentence and always tie them to the director intent.
- Recommended order of delivery: OUT-1 + OUT-2 first (so the director can confirm the diagnosis), then OUT-3, OUT-4, OUT-5 together, then OUT-6 and OUT-7 after selections.

---

## 6. Stop conditions and questions
Stop and ask before continuing when:
- IN-3 (director intent) is missing for any scene. Ask exactly: "What should the audience feel in scene <id>?"
- Feedback is only generic ("not working") with no shot reference. Ask the reviewer to point to shots or scenes, or proceed with Step 2 to surface candidate shots and ask the reviewer to confirm.
- The shot list and the animatic disagree (different shot count or order). Ask which is current.

---

## 7. Quality gate (check before delivering)
- Every feedback item appears in OUT-1 with an error code.
- Every flagged shot from Steps 1-3 has exactly 3 options in OUT-5.
- No option uses a lens outside the kit.
- No option introduces a new continuity violation.
- The visual intensity curve with the proposed options peaks at or near the story climax.
