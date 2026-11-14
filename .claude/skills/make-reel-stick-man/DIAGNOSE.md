# Diagnose: when it "doesn't land" and nobody can say why

Use this when a review says *flat, confusing, slow, not there yet*, or when you feel it yourself. The aim is to turn a
feeling into a named cause in a named stage, fix it there, and prove the fix with the same test that found it.

## 1. The method

1. **Locate.** Run the isolation tests below, cheapest first. Each one points to a layer.
2. **Name.** Write the symptom as *shot id + what the viewer experiences* ("SH05-SH10: nothing new on screen for 27 s").
3. **Hypothesise causes**, at least two, ranked. Use the tables in section 3.
4. **Test the top cause** with a change you can undo (a re-cut, a grey panel, a re-anchored shot), not a polish pass.
5. **Fix in the stage that caused it** (SKILL.md rule). A story problem found in polish goes back to the board.
6. **Re-run the test that found it.** A fix is real when the same test passes, not when it looks better to you.
7. **Record it** in the ledger: symptom, cause, stage, fix, rounds. If it could happen to the next film, propose a rule
   or a check (that is how this skill grows).

### Isolation tests (cheapest first)

| Test | How | If it fails, the layer is |
|---|---|---|
| Audio only | listen to the voice (plus temp music) with the screen off | **script / structure**: the story itself is unclear or slow |
| Muted retell | a fresh agent watches muted and retells want / obstacle / outcome | **picture**: staging, `see`, explain devices |
| Board sheet only | the panels as a contact sheet, no timing | **staging / composition** if it fails; **timing** if the sheet reads but the animatic doesn't |
| 5-second read | per panel: what do you see first, what is it for | **composition**: focal point, silhouette, clutter |
| `prepro.mjs` | the report and `intensity.svg` | **shot design / mechanics**: coverage, cards, reading time, continuity, curve |
| Phone test | watch at 360 px wide with `--safe 1` | **readability**: size, contrast, safe zone, text speed |
| Swipe test | full speed, sound on: where would you leave? | **retention**: dead stretches, repetition, a hook that doesn't pay |

Two tests that disagree are the most useful result: audio passes but muted fails means the words do the work the
picture should do.

## 2. Translating notes

| The note says | Usually means (camera-pass codes) | Ask back (one question) |
|---|---|---|
| "chưa tới", "not there", "flat" | C flat: one size/lens/angle; or the climax isn't the visual peak | "Which shot should hit hardest?" |
| "khó hiểu", "confusing" | A unclear: missing cause or source shot, no establishing, two focal points | "At which shot did you lose it?" |
| "giật", "jumpy" | B continuity: axis, screen direction, 30° jump | "Which cut?" |
| "chán", "slow", "dài" | timing: a static hold, a card block, a repeated framing | "Where did you want to skip?" |
| "sai cảm xúc", "too comic / too harsh" | D wrong emotion: lens, angle, size against the beat, or the scene brief is wrong | "What should the viewer feel there?" |
| "rối", "busy", "chóng mặt" | E unmotivated camera, clutter behind the subject | "Which move felt unnecessary?" |
| "màu tươi quá", "looks cheap" | look, not story: fix in [1.2] / stage 2, never by re-boarding | "Which reference is closer to what you want?" |

## 3. Symptom tables

### Story and structure

| Symptom | Confirm with | Likely causes (most likely first) | Fix | Stage |
|---|---|---|---|---|
| Audio alone is boring | audio-only | a beat without an obstacle; facts not attached to a wrong move; no rehook for > 15 s | rewrite the beat as want → obstacle → outcome; give the fact to an action | 1.1 (or 0) |
| The viewer can't say what the scene was about | muted retell + audio-only | the scene opens two questions; no `key` in the brief | one question per scene; cut the second | 1.0 |
| The ending doesn't land | swipe test at the end | the recap is a summary, not a scene; the choice is words, not images | stage the recap with its own feel and shot progression (PREPRO 4.5) | 1.4 |

### Explaining

| Symptom | Confirm with | Likely causes | Fix | Stage |
|---|---|---|---|---|
| A long stretch of cards after the hook | `prepro.mjs` C5, swipe test | the script's retention template (two problems up front) was boarded literally | climb the explain ladder: event, object, counter, insert; interleave facts with the action, keep the clock running | 1.1 picture pass, 1.4 |
| A number is said but not felt | explain audit | the number is shown as digits only | a picture of quantity (compare to a known thing, count by action) | 1.4 |
| "Where did the $27,000 go?" | muted retell | a fact changes a counter with no action on screen | show the action that changes it (three deposits as three quick inserts) | 1.4 |

### Staging and composition

| Symptom | Confirm with | Likely causes | Fix | Stage |
|---|---|---|---|---|
| "Who did that?" | muted retell | the source of the action is off screen; no reverse | the three-shot pattern: source → act → result | 1.4 |
| The eye goes to the wrong place | 5-second read | brighter or more saturated thing elsewhere; the subject merges with the background | value and colour contrast on the subject; simplify the background; one focal point | 1.4 / 1.2 |
| The pose doesn't read | silhouette test (fill the figure black) | limbs on the body, a frontal pose, prop against the torso | turn the body three-quarter, separate the limbs, hold the prop out | 1.4 (then 3.3) |
| Several scenes look alike | board sheet | the same framing reused (recap in one shot, three mid shots) | change size with the beat; each scene gets a signature angle | 1.4 |

### Continuity

| Symptom | Confirm with | Likely causes | Fix | Stage |
|---|---|---|---|---|
| A jump at a cut | `prepro.mjs` C3, C6, C7; floor plan | axis crossed, direction flipped, < 30° change | legal crossing, keep the convention, change the angle or size | 1.4 / 1.6 |
| Facts disagree (DAY 3 vs the voice's day two) | script ↔ shot table | text on panels not tied to the script | every on-screen word lives in `text` of a shot and is checked against its line | 1.4 |

### Timing and rhythm

| Symptom | Confirm with | Likely causes | Fix | Stage |
|---|---|---|---|---|
| Slideshow feel | animatic at 1x | one still per voice line, no moves, shots = lines | board per shot and per key; 2D moves; cut on action | 1.4 / 1.6 |
| Text can't be read | `prepro.mjs` C9; phone test | too many words for the hold | fewer words, longer hold, or say it instead of writing it | 1.6 |
| Everything changed when the real voice came | compare voice lengths | the animatic was locked on a scratch voice | re-anchor shots to words, re-run tools; lock only on the final voice | 1.5 / 1.6 |
| The turn doesn't hit | animatic at 1x | no pause before it; the reveal shares a shot with the setup | a held beat or silence before; the reveal gets its own size and angle | 1.6 |

### Camera

| Symptom | Confirm with | Likely causes | Fix | Stage |
|---|---|---|---|---|
| The climax feels small | `intensity.svg` I1 / I2 | the biggest size or lens spent earlier | save the tightest size, longest lens, strongest angle for the climax | 1.6 camera-intent pass |
| A move feels pointless | camera-pass E | no story reason (no look, travel or reveal) | lock it off, or motivate it | 1.6 |
| "Camera will be done in stage 3" | the shot list has no sizes or lenses | camera intent deferred | camera intent is locked at ◇2b; stage 3 executes it | 1.6 |

### On the phone

| Symptom | Confirm with | Likely causes | Fix | Stage |
|---|---|---|---|---|
| Captions or HUD hidden by the app | animatic `--safe 1` | text in the top 7 %, bottom 25 % or right 13 % | move into the text-safe box | 1.4 / 1.6 |
| The figure reads as a speck | phone test; small-figure gate | an EWS held too long | hand over to a closer shot within ~4 s | 1.4 |
| Dark look loses the story | phone test | the grade swallowed the subject | keep the subject's value contrast inside the dark look; test L1a-style looks on locked shots | 1.2 |

## 4. Process smells (the workflow is the bug)

| Smell | Why it hurts | Instead |
|---|---|---|
| Final renders in the storyboard | every change costs a render, so nothing changes | grey until ◇2a (PREPRO section 6) |
| Everything approved in one click | a look approval hides a story problem | three gates, ◇2c after ◇2a |
| Notes without a shot | the note can't be acted on, so it gets guessed | shot id + code + feeling |
| Fixing downstream | polish can't fix a missing shot | fix in the stage that caused it |
| Tuning numbers to pass | the gate passes, the film doesn't improve | never loosen a threshold; change the picture |
| Many versions, no changelog | nobody knows what a round fixed | 3-5 lines per version |
| Same issue a third round | the cause is upstream | stop after 2 rounds, show Kai the still, go up a stage |

## 5. Worked example: Hot Money, episode 1 (animatic v3)

| Symptom | Test | Cause | Stage | Fix |
|---|---|---|---|---|
| 6.6-33.8 s is six cards in a row, the clock barely moves | C5, swipe test | the retention template boarded literally; no picture pass | 1.1, 1.4 | Problem 1 explained during trip one (tag 25 KG, step counter, clock running); Problem 2 moved to the bank scene; ≤ 8 s of cards |
| "Who shoots?" | muted retell | bullet-cam with no source shot | 1.4 | add the cop's reverse with the gun, eyeline matched to the flashlight shot |
| "Where did $27,000 go?" | muted retell | the counter changes with no action | 1.4 | three quick deposit inserts, counter drops on each |
| Recap feels flat | C3/C4, board sheet | three shots with the same framing, about 16 s | 1.4 | wide (isolation) → CU (cost) → insert (bait bill) → split HIDE / SPEND |
| DAY 3 on a panel, no day three in the voice | script ↔ shot table | text not tied to the script | 1.4 | panel text lives in `text` and is checked per line |
| Captions at the bottom edge | `--safe 1` | no safe-zone standard | 1.4 | move into the text-safe box |
| "Camera later, in stage 3" | shot list | camera intent deferred | 1.6 | camera-intent pass, ◇2b |
| Timing locked on a robot voice (83 s vs ~86 s) | voice lengths | scratch voice used for lock | 1.5 | final voice before ◇2a |
