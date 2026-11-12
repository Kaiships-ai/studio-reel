# Worked Example: SQ020 "The Boat"

Illustrative example of a full camera pass on a two-character dialogue scene. Use it as the reference for output format and depth. Shot data is invented for the example.

---

## INPUTS

### IN-1 Shot list (current animatic)
| shot_id | description | duration_sec |
|---|---|---|
| SQ020_SH010 | Boat workshop at dusk. Tuan (father) sanding at the workbench, right of frame. | 4 |
| SQ020_SH020 | Mai (daughter) enters through the door, left. "Dad, the buyer called." | 3 |
| SQ020_SH030 | Tuan, without looking up: "It's sold." | 3 |
| SQ020_SH040 | Two-shot. Mai steps closer. Silence. | 5 |
| SQ020_SH050 | Mai: "Grandpa built it. You promised." | 3 |
| SQ020_SH060 | Tuan finally looks at her: "Promises don't pay the bank." | 3 |
| SQ020_SH070 | Mai: "Then I'll buy it back. Myself." | 3 |
| SQ020_SH080 | Tuan sits down slowly. Mai holds her ground. | 6 |

### IN-2 Feedback (director review, verbatim)
1. "The middle is flat. I don't feel her getting stronger."
2. "Why are we so close on dad so early?"
3. "SH050 feels like she jumped to the other side of the room."
4. "The ending camera is too showy."

### IN-3 Director intent
- SQ020: "The audience should feel Mai's resolve grow until she overpowers her father, who ends up small."

### IN-4 Current camera data
| shot_id | shot_size | angle | lens_mm | movement |
|---|---|---|---|---|
| SH010 | Wide | Eye level | 35 | Locked |
| SH020 | Medium | Eye level | 35 | Locked |
| SH030 | Close-up | Eye level | 85 | Locked |
| SH040 | Medium two-shot | Eye level | 35 | Locked |
| SH050 | Medium | Eye level | 35 | Locked |
| SH060 | Medium | Eye level | 35 | Locked |
| SH070 | Medium | Eye level | 35 | Locked |
| SH080 | Wide | Extreme high | 24 | Slow crane up + orbit 90 deg |

IN-7: default kit 24/35/50/85/135, 36x24mm sensor.

---

## OUT-1 Diagnosis table
| shot_id | feedback_quote | error_type | root_cause | severity |
|---|---|---|---|---|
| SH040-SH070 | "The middle is flat. I don't feel her getting stronger." | C | Four consecutive medium / 35mm / eye-level shots while the story escalates (AP-02) | 3 |
| SH030 | "Why are we so close on dad so early?" | C, D | Tightest framing of the first half used on a low beat; gives Tuan visual weight the scene later takes away (AP-01) | 2 |
| SH050 | "SH050 feels like she jumped to the other side of the room." | B | Camera placed on the north side of the Mai-Tuan axis; SH040 established the south side (AP-10) | 3 |
| SH080 | "The ending camera is too showy." | E | Crane + orbit with no motivation; draws attention away from Tuan sitting (AP-03) | 2 |

## OUT-2 Scene brief
| scene_id | director_intent | whose_scene | key_information |
|---|---|---|---|
| SQ020 | Mai's resolve grows until she overpowers her father, who ends up small. | Mai | 1. The boat is sold. 2. It matters because grandpa built it. 3. Mai commits to buying it back. 4. Tuan gives in. |

---

## OUT-3 Intensity table (current)
Visual intensity scored with SKILL.md §3.2.

| shot_id | story_intensity | visual_intensity | gap | flag |
|---|---|---|---|---|
| SH010 | 2 | 1 | -1 | |
| SH020 | 3 | 2 | -1 | |
| SH030 | 5 | 4 | -1 | EARLY_PEAK (shares max visual with SH080, before climax) |
| SH040 | 4 | 1 | -3 | FLAT |
| SH050 | 6 | 2 | -4 | FLAT, MISMATCH |
| SH060 | 7 | 2 | -5 | FLAT, MISMATCH |
| SH070 (climax) | 9 | 2 | -7 | FLAT, MISMATCH |
| SH080 | 4 | 4 | 0 | |

Graph reading: the story curve climbs to 9 at SH070, the visual curve sits at 1-2 from SH040 to SH070 and peaks at SH030 and SH080. The climax is the visually weakest moment of the scene.

**Fix list**: SH030, SH050, SH060, SH070, SH080. SH040 stays as the low-intensity baseline (deliberate affinity before the build).

---

## OUT-4 Continuity map
Overhead plan (north = back wall):

```
            N (back wall, window)
   +------------------------------------+
   |  [door]                            |
   |   Mai -----------axis----------> Tuan [workbench]
   |   (W)                             (E)|
   |                                    |
   |   C020  C040  C060   C070    C030  |
   +------------------------------------+
            S (camera side)
  Current SH050 camera sits at N, behind Tuan's shoulder -> crosses axis.
```

| cut | violation | rule |
|---|---|---|
| SH040 -> SH050 | Camera crosses to north side; Mai now faces left instead of right | 180-degree (AP-10) |
| SH050 -> SH060 | Mai's eyeline (left) does not point at Tuan (right in SH060) | Eyeline (AP-13), consequence of the crossing |

Fix: all SQ020 cameras on the south side of the axis.

---

## OUT-5 Option sheet

### SH030 - Tuan: "It's sold."
| option | shot_size | angle | lens_mm | movement | composition_note | rationale |
|---|---|---|---|---|---|---|
| Safe | Medium | Eye level | 50 | Locked | Tuan right third, workbench foreground | Removes the early peak; keeps Tuan neutral at the start. |
| Emotional | Medium over Mai's shoulder | Slight high (from Mai's standing height) | 50 | Locked | Mai's shoulder soft left, Tuan small and bent over the bench | Starts the power shift early by making him look down at work. |
| Bold | Wide, hold on Mai | Eye level | 35 | Locked | Tuan off-screen; we hear the line and see Mai's reaction | Keeps the scene on Mai, whose scene it is; delivers the information through reaction. |

### SH050 - Mai: "Grandpa built it. You promised."
| option | shot_size | angle | lens_mm | movement | composition_note | rationale |
|---|---|---|---|---|---|---|
| Safe | Medium single | Eye level | 50 | Locked | Camera south of axis, Mai left third looking right | Fixes the axis crossing with minimal change. |
| Emotional | Medium close-up | Eye level | 85 | Slow push-in 10% | Mai left third, lead room right toward Tuan | Starts the visual build as her conviction appears. |
| Bold | Over-the-shoulder from behind Tuan, south side | Eye level | 50 | Locked | Tuan's back blurred right, Mai sharp left | Puts her facing him directly; the father becomes an obstacle in frame. |

### SH060 - Tuan: "Promises don't pay the bank."
| option | shot_size | angle | lens_mm | movement | composition_note | rationale |
|---|---|---|---|---|---|---|
| Safe | Medium close-up | Eye level | 85 | Locked | Tuan right third, looking left at Mai | Matches SH050 size for a clean shot / reverse. |
| Emotional | Medium close-up | Slight high | 85 | Locked | Tuan right third, more ceiling than floor | His argument is pragmatic, but the camera already makes him smaller. |
| Bold | Close-up on his hands stopping on the sandpaper, then tilt up to face | Eye level | 85 | Tilt up | Hands centre, then face right third | Shows he is shaken before he speaks. |

### SH070 - Mai: "Then I'll buy it back. Myself." (climax)
| option | shot_size | angle | lens_mm | movement | composition_note | rationale |
|---|---|---|---|---|---|---|
| Safe | Close-up | Eye level | 85 | Locked | Mai left third, tight headroom | Tightest size of the scene, placed at the climax. |
| Emotional | Close-up | Low (camera at her chest height, looking up) | 135 | Slow push-in 15% | Mai left third, compressed background, window light behind | Peak contrast in size, lens and angle exactly at the story peak; low angle gives her power. |
| Bold | Medium close-up, Mai steps INTO a close-up | Low | 85 | Locked; staging does the move | She walks into frame until her face fills it | Staging in depth: her action, not the camera, raises intensity. |

### SH080 - Tuan sits; Mai holds her ground
| option | shot_size | angle | lens_mm | movement | composition_note | rationale |
|---|---|---|---|---|---|---|
| Safe | Wide two-shot | Eye level | 35 | Locked | Mai standing left, Tuan sitting right | Release after the climax; clear final state. |
| Emotional | Medium over Mai's shoulder | High (from Mai's eye height) | 50 | Locked | Mai's shoulder large foreground left, Tuan small seated right | Final image states the intent: she is now the one looking down. |
| Bold | Wide, slow pull-back on dolly | Eye level | 35 | Dolly back 1.5 m | Both shrink in the empty workshop | Motivated move (releases tension) instead of an orbit; ends quiet. |

### Sequence check with recommended picks
Recommended: SH030 Safe, SH050 Emotional, SH060 Emotional, SH070 Emotional, SH080 Emotional.

| shot_id | story | visual (new) |
|---|---|---|
| SH010 | 2 | 1 |
| SH020 | 3 | 2 |
| SH030 | 5 | 2 |
| SH040 | 4 | 1 |
| SH050 | 6 | 4 |
| SH060 | 7 | 4 |
| SH070 | 9 | 7 |
| SH080 | 4 | 2 |

Scoring notes: medium close-up counts as "Medium" (1) in §3.2; SH070 = close-up 2 + 135mm 2 + moderate low 1 + slow push 1 + 3s cut 1.

Visual intensity now peaks at the climax, builds from SH040, and releases at SH080. No new flags (largest gap is -3 on SH060).

---

## OUT-6 Previs spec (chosen: SH070 Emotional)
| field | value |
|---|---|
| sensor | 36 x 24 mm |
| lens | 135 mm |
| camera height | 1.05 m (Mai's chest; her eyes at 1.50 m) |
| distance to subject | 3.2 m start, 2.7 m end |
| tilt / roll | +8 deg up / 0 |
| rig | `cam_rig_v01`: dolly_z -0.5 m over frames 1-72 |
| easing | ease-in frames 1-12, linear, ease-out frames 60-72 |
| first frame | Mai face fills left third, eyes on upper third line, lead room right |
| key frame (f36, "Myself") | Head and shoulders, chin slightly above centre |
| last frame (f72) | Eyes on upper third, headroom near zero |
| notes | Build with proxy characters; playblast; cut into the animatic at SH070; review in sequence. |

## OUT-7 Review sheet (after previs round)
| shot_id | 1 beat | 2 axis | 3 read | 4 eye | 5 lens | 6 move | 7 cuts | status |
|---|---|---|---|---|---|---|---|---|
| SH010 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |
| SH020 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |
| SH030 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |
| SH040 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |
| SH050 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |
| SH060 | Y | Y | Y | N | Y | Y | Y | FIX (4: window highlight behind Tuan pulls the eye before his face; reframe or ask lighting to drop it) |
| SH070 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |
| SH080 | Y | Y | Y | Y | Y | Y | Y | CAM LOCK |

SH060 loops back to Step 4. When it locks, compile the shot bible: OUT-2, final intensity table, the floor plan, and final camera data per shot.
