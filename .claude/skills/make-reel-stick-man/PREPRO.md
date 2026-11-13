# Pre-production: the playbook (stage 1)

Stage 1 turns an approved story into a **locked animatic**: every shot chosen, timed to the real voice, its camera intent
fixed, checked by numbers and by fresh eyes, before a single asset or final render is built. Everything later (asset,
blocking, polish, post) executes this plan. A film is rarely better than its animatic.

How to use this file: section 1 is the flow, section 2 the vocabulary, section 3 the steps (each with its standard, gate
and common mistakes), section 4 the craft knowledge behind the standards, sections 5-7 reviews, fidelity and gates,
section 8 the fixes for every `prepro.mjs` check. When something feels wrong and you don't know why: DIAGNOSE.md.

---

## 1. The flow

```
[1.0] scene brief + intensity plan ──► [1.1] script + picture pass ──► [1.4a] thumbnails + floor plans + shot list
                                                                              │
   (parallel, never blocking the story)                                       ▼
   [1.2] look dev   [1.3] design                           [1.4b] rough panels ──► [1.4c] board pitch + read test
                                                                              │
                                       [1.5] scratch voice ──► [1.6] animatic v1 ──► story pass ──► timing pass
                                                                              │
                                       [1.5] final voice ──► re-time ──► camera-intent pass ──► test screening
                                                                              │
                                    ◇2a story + timing lock   ◇2b shot lock   [1.7] colour script   ◇2c look + design lock
```

Four principles run through every step:

1. **The unit of work is the shot**, not the voice line. A line may need three shots; two lines may share one. Every
   decision, note and file names a shot id (`SH040`) and, when it matters, a frame.
2. **Fidelity follows lock** (section 6). Rough until locked, real after. A pretty panel nobody wants to throw away is the
   most expensive mistake in pre-production.
3. **Story before look.** The look is chosen in parallel, but it is locked last and never changes the shot list.
4. **Measure, then judge.** `prepro.mjs` measures what can be measured (coverage, timing, reading time, safe zone,
   intensity curve, continuity flags). People and fresh agents judge what can't (clarity, feeling, appeal). Neither
   replaces the other.

---

## 2. Vocabulary (the words every shot is written in)

### Shot size: what it is for

| Size | Frame holds | Use it to | 9:16 note |
|---|---|---|---|
| EWS | the whole place, figure tiny | establish geography, scale, isolation | a figure under ~30 % of the height reads as a stick: hand over within ~4 s |
| WS | the whole figure + surroundings | show where, who is where, travel | the natural shot for action in vertical: the body fills the height |
| FS | the full body, little else | body acting, poses, a reaction with the whole body | |
| TWO | two characters | a relation, a confrontation, cause and effect in one frame | stack them in depth (near/far), not side by side |
| MS | waist up | gesture + face, explaining with hands | |
| OTS | over one shoulder onto the other | dialogue, a threat facing the hero | |
| MCU | chest up | a thought, a decision | |
| CU | the face | emotion, a take | in vertical the face sits in the upper-middle third |
| ECU | an eye, a mouth, a detail | peak emotion, the one detail that matters | |
| INS | an object | a fact the viewer must read (a number, a list, a clock) | the thing fills the text-safe box |
| POV | what a character sees | put the viewer in their shoes | carries no screen direction |
| CARD | graphics only, no world | a title, a rule, a number that has no object | last resort for explaining (4.3) |

### Angle, lens, move

| Angle | Reads as | Lens (36 mm-tall sensor) | Reads as | Move | Use when |
|---|---|---|---|---|---|
| eye | neutral, honest | 24 mm | space, speed, unease, figure dwarfed or looming | static | the action is the interest |
| high | small, trapped, overview | 35 mm | natural storytelling, default | push | to tension, to a realisation |
| low | power, threat, heroic | 50 mm | neutral, close to the eye | pull | reveal context, isolation, an ending |
| top | map, pattern, plan | 85 mm | intimacy, emotion, compressed background | pan / truck | follow travel, link two things |
| dutch | wrong, unstable | 135 mm | isolation, voyeur, peak (use once) | crane | scale, a change of state |
| pov | subjective | | | handheld | panic, chaos, documentary |
| | | | | whip | a fast link, a comic beat |

Every move needs a reason in the story (a look, a reveal, a travel). A move without a reason is error E in the camera
taxonomy.

### Intensity (the camera-pass model, used from day one)

Story intensity (1-10) comes from the beat: stakes, tension, emotion, measured against the scene's feel. Visual intensity
is the sum of five 0-2 factors (size, lens, angle, move, cut rhythm), computed by `prepro.mjs` from the shot list. The two
curves should travel together; the picture peaks at the story's climax; the hook may spike; there is a release after the
climax. Flags: FLAT, EARLY_PEAK, MISMATCH, NO_RELEASE (section 8).

---

## 3. The steps

Each step: **why · do · standard · output · gate · mistakes**. "Mistakes" lists symptom → cause → fix, the way they show up
in review.

### [1.0] Scene brief + intensity plan (new)

**Why.** "It doesn't land" usually means nobody decided what it should feel like. Intent written first makes every later
note answerable: *does this shot serve the feel of its scene?*

**Do.**
1. Split the approved script into scenes: a scene is one place and one continuous time, or one explanation unit.
2. Per scene write: `feel` (one sentence: what the audience must feel), `whose` (whose scene: whose eyes we follow),
   `key` (the information the viewer must leave with), `question` (the question the scene opens, and whether it closes or
   upgrades it).
3. Write each beat as **want → obstacle → outcome** (the three words Kai's read test already uses).
4. Give each beat a target story intensity 1-10 and mark the climax beat. Draw the intended curve before any panel exists:
   hook spike, a dip to explain, rises at each flip, the climax as the peak, a release, the CTA.
5. Kai confirms the feel lines (they are `(est.)` until he does).

**Standard.** Every scene has feel, whose, key, question. Exactly one climax. No two adjacent scenes with the same feel and
the same intensity (that is a FLAT film in waiting).
**Output.** `storyboard.json` → `scenes` (REEL_DATA.md) + the intended curve as a one-line table on the page.
**Gate.** Kai confirms the feel lines.
**Mistakes.**
- Feel lines that are topics ("the bank scene") → they describe content, not emotion → rewrite as an audience feeling
  ("smug relief that turns into dread").
- Every scene at 7-8 → nothing can rise → lower the explanation scenes, save 9-10 for one climax.

### [1.1] Script + picture pass

**Why.** A script for picture is not finished when it reads well; it is finished when every line has something to show.

**Do.** Write and check the script with the existing rules (1 narrator, 2.9-3.3 words/s for Achird, `million-views-rule`
for retention). Then the **picture pass**, line by line:
1. Write `see`: what a muted viewer must see on this line.
2. Classify the line: action, fact, number, compare, reaction, twist, recap, CTA.
3. For every fact or number, choose an **explain device** from the ladder in 4.3, highest rung first. A line whose only
   possible picture is a card is a script problem: rewrite the line so its fact happens to someone.
4. Mark lines that need two shots (a cause and its effect, a setup and a reveal) and lines that can share a shot.

**Standard.** Every line has `see` and a device. Cards only where no world object can carry the fact. No run of more than
two consecutive fact lines without an action line between them (the clock must keep ticking).
**Output.** `vo/script.json` + `storyboard.json` `lines` (`see`, `act`, `props`, `still`).
**Mistakes.**
- A block of fact lines after the hook → the script obeys the retention template (two problems) but the picture has
  nothing to do → interleave: give each fact to an action (Problem 1 explained while running the first trip).
- `see` repeats the narration word for word → the picture adds nothing → `see` names an image the words don't say (the
  bag's tag reads 25 KG while the voice says "a hundred kilos").

### [1.2] Look development (parallel)

As in SKILL.md. Two additions: render style frames on **two shots from the shot list** (a wide and a close-up, one at the
climax), not on a free composition; and check every style frame at phone size (a 360 px wide preview) with the
text-safe box on. A look that only works full screen fails on the phone.

### [1.3] Design (parallel) + floor plans

As in SKILL.md, plus a **floor plan per set** before boarding: top view with the character marks, entrances, the paths
people travel, the 180° line for each scene, and the camera zones (the side of the line the camera lives on). Write the
film's **screen-direction convention** on it (for example: escape and progress run L>R, the police come R>L). This is the
map the board, the continuity checks and stage 3 all read.

**Mistakes.** A floor plan with logic but no cameras → continuity is decided panel by panel and flips → add axis + zones.

### [1.4] Storyboard

Three sub-steps. Do not skip to the third.

**[1.4a] Thumbnails + shot list.** Small, fast, ugly: stick figures, boxes, arrows, on a grid of 9:16 frames. Two to
three options for the hook, the climax and every shot that carries a fact. In parallel, write the **shot list** in
`storyboard.json` `shots`: id, scene, anchor, size, angle, lens, move, purpose, see, story intensity, screen direction,
axis side (REEL_DATA.md). Run `prepro.mjs` as soon as the list exists: the intensity curve and continuity flags are
cheapest to fix now.

**[1.4b] Rough panels.** One panel per **key**: a static shot needs one; a moving shot needs its start and end frame; an
action needs anticipation, the extreme and the result (pose-to-pose); a reveal needs before and after. Panels carry
camera arrows (move), character arrows (travel), the text that will be on screen (in its real place), and the shot id.
Keep them grey: sketches, or engine stills of proxy characters in a draft set with the light turned flat. (A one-flag
grey preview mode in the engine is on the roadmap in AUDIT.md; until it exists, a draft set without the chosen look is
fine.)

**[1.4c] Board pitch + read test.** Present the board in order with the voice read aloud (Kai or a fresh agent). Then
the muted read test: a fresh agent sees only the panels and retells the story beat by beat with want / obstacle /
outcome, and says where it had to guess. Every guess is a missing shot or a weak staging.

**Standard.**
- Every shot has a purpose a viewer can get in its duration, and one focal point (4.2).
- Every action shows cause and effect: who does it, the act, what it does (4.4).
- Each scene establishes its space within its first two shots or says why not.
- `prepro.mjs`: no FAIL; every WARN answered (fixed, or a one-line reason in the shot's `hold` / `noEst` / `axis_cross`).
- The muted retell gets every beat with no guess on the plot points.

**Output.** `board/` panels, `storyboard.json` shots + panels, `review/prepro.md`, `review/intensity.svg`, the retell.
**Gate.** Kai sees the board sheet, the curve and the retell together.
**Mistakes.**
- Panels are final renders → every script change costs a render, nobody wants to change anything → go back to grey.
- One panel per voice line → shots inherit the line's length and the animatic becomes a slideshow → board per shot,
  per key.
- Three similar mid shots in a row → the eye stops getting new information → vary size with the beat (C4, I2).
- "Who did that?" in the retell → the source of an action is off screen → add the reverse or the wide (4.4).

### [1.5] Voice

**Scratch first, final before lock.** Animatic v1 runs on a scratch voice (TTS or a human read at the real pace). The
final voice is recorded (or chosen) **before** the timing pass ends, because every cut is anchored to its words.
Re-anchor the shots (`at: "l07:bank"`) instead of retyping frames, then re-run `prepro.mjs` and `animatic.mjs`.

**Mistakes.** Locking the animatic on a robot voice that runs 3 s shorter than the real one → every shot is re-timed in
stage 3 → lock on the final voice; if it's not available, the gate waits.

### [1.6] Animatic

**Build.** `node styles/stick-man/tools/animatic.mjs films/<slug> --v N --safe 1`: shots cut at their frames, panels
held in order, the move faked in 2D, grey cards with the shot's words where a panel is missing, burn-in of shot id,
size, lens, move, frame in shot, version and timecode. Each version is a new file; write a 3-5 line changelog.

**Four passes, in this order** (each pass changes only its own layer):
1. **Story pass.** Watch once at full speed, phone size, sound on, without stopping. Note timecodes where you were bored,
   confused or unmoved. Then per shot. Fix structure (cut, add, reorder shots) before anything else.
2. **Timing pass.** Cut points on action and on the voice's stresses; holds where a fact must land; a breath before the
   turn; text on screen long enough to read (4.6). Shorten what the story pass found slow.
3. **Camera-intent pass** (the 2D camera pass). With the final voice in: the intensity curve (`review/intensity.svg`),
   continuity (axis, screen direction, eyelines), shot size progression, 30° rule, safe zone. For each flagged shot, 3
   options (safe / emotional / bold) as panels in the animatic, Kai picks. This fixes the camera's *intent* (size,
   angle, lens class, move, side of the line). Stage 3 executes it in 3D and only refines placement.
4. **Test screening.** A fresh agent (and, when possible, a person who has not read the script) watches muted, then
   with sound: retell, the question "where would you swipe away?", the HIDE/SPEND-style choice if the film ends on one.

**Standard.**
- `prepro.mjs` PASS on the final voice.
- Length matches the brief to the frame; `CUTS` printed by `animatic.mjs` goes into `reel.js`.
- The muted and the sound-on retell both get every beat; the swipe question finds no dead stretch over ~4 s.
- Every shot has a status: CAM INTENT LOCK or FIX [items].

**Mistakes.** See DIAGNOSE.md. The usual ones: animatic as slideshow (one still per line), cards in a block, recap in one
framing, text in the UI bands, timing locked on the scratch voice.

### [1.7] Colour script

After ◇2a, from the locked shots: one frame per scene (more where the light changes), placed on the intensity curve.
Colour and value carry the curve: contrast rises with intensity, the climax owns the strongest contrast or the one
unique colour, the release goes calm. Check against the look's limits at phone size.

---

## 4. Craft knowledge

### 4.1 Story structure for a 60-90 s knowledge reel

- **One question at a time.** Each section opens one question and closes or upgrades it (million-views K3). Write it in
  the scene brief so the board can stage it.
- **Want → obstacle → outcome** in every beat. If a beat has no obstacle it is exposition: give it one or merge it.
- **Rehook** at every section boundary: a new danger, a counter that jumps, a reversal. Roughly every 10-15 s in this
  format (million-views K1 fact rhythm).
- **Escalation is visual too.** Each flip should look bigger than the last (more police, tighter framing, faster cuts),
  not only sound bigger.
- **The recap is a scene, not a summary.** It has a feel (dread, temptation), a whose, and its own shot progression.

### 4.2 Staging and composition in 9:16

- **One focal point per shot.** Lead the eye with value contrast, colour contrast, size, sharpness, and lines. Test: blur
  the panel, or squint; what you see first must be the purpose.
- **Silhouette.** Poses read as a black shape: limbs off the body, a clear line of action, props held away from the torso.
- **Vertical frame.** Stack in depth and height, not side by side: foreground at the bottom, subject in the middle,
  context above. Faces sit in the upper-middle third, inside the text-safe box. Wide shots should still hold the figure
  large enough to read (the kit's small-figure gate: under ~30 % of the height, hand over within ~4 s).
- **Safe zones.** Text, numbers and faces live in the text-safe box (x 6-87 %, y 14-65 %): Meta's Reels/Stories diagram
  joined with TikTok's button column. Action may use the full frame. Check every panel with the overlay on.
- **Headroom and lead room.** Room in front of the look and the travel; less headroom as the shot tightens.
- **Clean background behind faces** (SKILL.md rule): a busy background behind a face kills the read at phone size.

### 4.3 Explaining in pictures (the ladder)

Use the highest rung that can carry the fact:

1. **It happens.** The fact is an event in the world: the bags are too heavy, so he staggers and drops one.
2. **An object says it.** A tag reads 25 KG, the clock on the wall, the bank screen, a wanted poster.
3. **A counter moves with an action.** HUD (BAGS 2/4, 2:18, SUSPICION 35 %) that changes on the frame the action happens.
4. **An insert.** Cut to the object that proves it (the bait list with one serial circled), 1-2 s, then back.
5. **A card.** Graphics only, when there is no object at all. ≤ 2.5 s each, never more than 8 s of cards in a row,
   ≤ 25 % of the film, and the world clock keeps running around it (a beat of the hero between cards).

Numbers get a picture of **quantity**: compare to a known thing (100 kg = four bags as heavy as a child each), count by
action (seven trips drawn as seven quick cuts), never as an equation alone. Show the math as it accumulates.

### 4.4 Action, cause and effect, continuity

- **Three shots for every important action:** source (who), act, result. A bullet-cam with no shooter fails the first.
- **180° rule, 30° rule, screen direction, eyeline match** (camera-pass skill, section 3.5). Legal crossings: the camera
  moves across in-shot, a character crosses on screen, a neutral shot on the line, a re-establishing wide.
- **Match on action**: cut in the middle of a movement, the second shot finishes it.
- **Reveal**: hold on the reaction before showing the cause, or start on a detail and pull back.
- **Chase / escape**: lock screen direction; alternate hunter and hunted; shorten shots toward the catch.

### 4.5 Coverage patterns for reel beats (starting points, not quotas)

| Beat | Pattern |
|---|---|
| Hook | the strongest image first: a WS that shows danger + reward together, then a push or a CU on the threat |
| Fact | action that causes the fact → insert or object that shows it → reaction |
| Compare | a TWO or a split in depth, or two matched shots with the same size and angle (the only place a match is the point) |
| Flip / twist | hold the plan's confident shot → the surprise in a different size and angle → the reaction in CU |
| Climax | the tightest size, the longest lens or the strongest angle of the film, the fastest cutting, then a held beat |
| Recap | wide (isolation) → CU (cost on the face) → insert (the proof) → the choice, staged as two images |
| CTA | the choice as images, words inside the text-safe box, a held frame long enough to read |

### 4.6 Timing

- Work in **frames** (30 fps). A shot under 15 frames reads only as an insert or a whip.
- A new image needs about half a second to be found; an image with words needs the reading time on top.
- On-screen text: ≤ 15 characters per second, at least 25 frames. (Broadcast and streaming guides put adult reading
  speed around 15-20 cps; we take the slow end because the viewer is also watching the picture and hearing the voice.)
- Cut on the action or on the stressed word; never let a fact land on a cut.
- A pause before the turn (a few frames of silence or a held frame) makes the turn hit.
- Watch at 1x. Scrubbing hides every timing problem.

### 4.7 Animatic craft

- **Audio first.** Voice on the timeline, then pictures to it. Temp music and two or three key sounds (the bang, the
  door) belong in the animatic: rhythm without sound is guesswork.
- **Panels per key, moves in 2D.** A push is a slow zoom on the panel; a pan slides it. Enough to judge timing and intent.
- **Burn-in always** for review; clean (`--burn 0`) only to judge the feel on a phone.
- **Version and changelog** every time it goes to Kai.

---

## 5. Reviews (who checks what)

Never judge your own work (PROCESS.md section 2). Add these prompts for stage 1; give the agent files, never your
conclusion.

| Check | When | Prompt core |
|---|---|---|
| Muted retell | after [1.4c] and each animatic | "You see only these frames (or this video, muted). Retell the story beat by beat as want / obstacle / outcome. Mark every place you had to guess, and what you guessed." |
| 5-second read | after rough panels | "For each panel: what do you see first? What is this shot for? Is that the same thing? Name the one change that would make the purpose read first." |
| Explain audit | after the picture pass and the board | "List every fact and number the voice states. For each, how the picture carries it (event, object, counter, insert, card) and whether a muted viewer would get it. Flag cards that could be an event or object." |
| Swipe test | animatic with sound | "Watch once at full speed. Give the timecode of every stretch where you would swipe away and why (nothing new on screen, confusion, repetition)." |
| Continuity | after the shot list and after the animatic | "With the floor plans: for each cut, axis side, screen direction, eyeline and the 30° rule. List violations as shot pairs." |
| Camera intent | camera-intent pass | the `animation-camera-pass` skill, OUT-1/3/4/5, on the animatic frames |

Kai's notes go in this format: **shot id + error code (A-E) + the feeling he wants**. A note without a shot gets one
question back: "which shot?"

## 6. Fidelity by stage

| Artifact | Allowed fidelity before ◇2a | After ◇2a | After ◇2b |
|---|---|---|---|
| Panels | thumbnails, grey sketches, grey engine frames | cleaner keys where a fact must read | cameras matched to the chosen options |
| Characters | proxies, silhouettes | design sheets | final in stage 2 |
| Light, colour | none (grey) | colour script | final look in stage 2-3 |
| Voice | scratch | final | final |
| Sound | temp music + key sounds | same | stage 4 |

A final-looking render before ◇2a is allowed only as a **style frame** for [1.2], never as a storyboard panel.

## 7. Gates

| Gate | Locks | Evidence on the page | Pass when |
|---|---|---|---|
| ◇2a story + timing | scenes, shot order, length, voice | animatic vN (burn-in), `prepro.md`, `intensity.svg`, muted and sound-on retells, swipe test | prepro PASS on the final voice; retells get every beat; no swipe stretch Kai agrees with; Kai approves |
| ◇2b shot lock | camera intent per shot (size, angle, lens class, move, axis side) | camera-intent pass OUT-1/3/4/5, options rendered in the animatic | every shot CAM INTENT LOCK; climax is the visual peak; no continuity FAIL |
| ◇2c look + design | look, characters, sets, props, colour script | style frames on locked shots, sheets, colour script | Kai approves; nothing in it changes a locked shot |

Kai may approve the three on one page in one sitting; each keeps its own row and evidence. ◇2c is never approved before
◇2a. ◇2 is open when all three are.

## 8. Fixes for each `prepro.mjs` check

| Id | Check | Fix |
|---|---|---|
| T0 | a shot can't be placed | give it `f0`, a valid `at` anchor (a word of the line), or `dur` on the shot before |
| T1 | order, minimum length (15 f; 8 f for INS, CARD, whip) | merge with the next shot, or move its anchor later |
| T2 | static hold over 4.5 s | add a move, a second key panel, a cut to a reaction or insert, or `hold: "why"` if the breath is the point |
| T3 | the film ends before the voice | raise `last` or the last shot's length |
| B1 | scene without `feel` | write the scene brief ([1.0]) |
| C1 | a voice line with no shot | add a shot or move an anchor so a shot plays under it |
| C2 | missing or unknown fields | fill id, scene, size, angle, lens, move, purpose, see, story with the vocabulary in section 2 |
| C3 | same size, angle and lens on the same subject across a cut | change the angle ≥ 30° or the size clearly, or cut away between them; a deliberate montage carries `montage: "why"` |
| C4 | three or more shots of one size in a row | change the size with the beat (tighten as tension rises), or `montage: "why"` on each shot of a deliberate run |
| C5 | more than 8 s of cards in a row, or cards over 25 % | climb the explain ladder (4.3): event, object, counter, insert |
| C6 | screen direction flips | keep the convention from the floor plan; if the character really turns, show it (`turn: true`) |
| C7 | the camera jumps the 180° line | one of the legal crossings (4.4), written in `axis_cross` |
| C8 | a scene with no wide in its first two shots | add an establishing shot, or `noEst: "why"` on the scene (a continuation of the last place) |
| C9 | text too fast, too short, wider than the box, or outside the text-safe box | fewer words, a smaller `size`, a longer hold; centre it on the box (x ≈ 0.465, not 0.5) |
| P1 | a shot without a panel, or a missing file | draw it (grey is fine) |
| P2 | an action shot (or a hand-drawn move without `cam2d`) with one panel | draw the start and end keys, and the extreme for an action; a 2D move on one panel (`cam2d`) needs no second key |
| H1 | the first shot doesn't start at 0, or holds over 3 s with no move | open on the strongest image with a change inside 3 s |
| I1 | EARLY_PEAK (after the hook) | lower that shot (wider, normal lens, steadier) or raise the climax (tighter, longer lens, stronger angle, faster cut) |
| I2 | FLAT | vary size, lens, angle, move or rhythm along the run, following the story curve |
| I3 | MISMATCH | the shot is much calmer or much louder than its beat: match it, or lower the beat's story score if the beat is calm |
| I4 | NO_RELEASE | give the end a calm shot (wide, static, longer) before the CTA |
