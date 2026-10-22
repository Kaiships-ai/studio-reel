# Motion: make them alive

Kai (2026-10-15): "thêm chuyển động … code khi sửa có thể nhảy nhảy nhảy … thêm sức sống, Kai nói nói và có thêm các reaction."
A skit is not two statues taking turns. Every line gets a beat; the listener reacts too.

## Minimum per reel
- Each line: the speaker has a beat on a key word (lean, nod, arm, hop) **and** the listener reacts within 6–12 frames.
- Clawd "working" = visible effort: hops while typing, sparks/screen change on each "Done/Fixed".
- One big reaction moment (the turn) held ≥ 12 frames so it reads on a phone.
- Idle is never zero: breathing, small sway, blinks (`blinks()`), eye darts.

## Numbers (from `src/motion.js` and the Motion Lab method, Kai-approved 2026-10-13)
- Squash/stretch: crouch 1.2×0.75 → stretch 0.85×1.28 → land 1.25×0.7 → settle damping ≈ 0.55 (`SQ`, `SPRING`, `hop()`).
- Overlap: eyes lag 2 f, limbs 4–6 f; secondary moves 50–70 % of the hero's travel, 3–6 f later (`LAG`, `SECONDARY`).
- Holds ≥ 12 f (`HOLD_MIN`); double-take = 2 snaps of 6 f + 10 f hold (`SNAP`); key poses +10–30 % bigger for phone size.
- Camera: slow push-ins ≤ 10 % per shot (`PUSH`), shallow DOF on close-ups (`DOF`).
- Clawd stays readable: small readable hops are welcome (squash/stretch, they land); no float, no wobble, no spins for their own
  sake; one clean bump in the speed trace per beat
  (check with `review/clawd_speed.py`, `review/onion.py`).

## Bank (grow it: every new motion worth reusing gets a row + where its code lives)
| Motion | Who | Use for | Code |
|---|---|---|---|
| Proud stretch-up, arm up on "Done/Perfect" | Clawd | eager small model, success | `template/ref/morphy-clone-02/reel.js` (clawd(), Haiku beats) |
| Calm nod / scan eyes left-right | Clawd | the competent model | same file (Opus beats) |
| Squint + lean back | Clawd | suspicion, being tattled on | same file |
| Power-down: flame dies, eyes shut, tips forward | Clawd | usage limit, failure | same file (`o.flame`, `B.usage`) |
| One eye snaps open | Clawd | the button reveal | same file (`CCE` shot, 'eye' cue) |
| Lean in to whisper; bigger nods on "yes" | Kai | conspiracy, excitement | same file (kai()) |
| Hands-up "afraid" → palm thrust "Stop" | Kai | panic | test-morphy-clone clip set (`review/clips.png` there) |
| Typing hop loop: small hops every 0.24 s on the keys + key glow on each landing (squash floored at land) | Clawd | "working / fixing code" | `template/ref/reel57-permission/reel.js` (TYPE, HOPS, clawd()) |
| Celebration: 2 bounces, both arms up, HDR sparks from the head | Clawd | win | same file (cheer, BURSTS) |
| Begging bow: torso pitch pulse + both arms half up on every "Can I…" | Clawd | asking, polite | same file (bow, ask) |
| Innocent head tilt (torso roll) + happy eyes | Clawd | "you said so" | same file (roll) |
| ENTER dip: Kai + his key-stool drop 1.6 cm for 5 f on each "Yes", growing nods | Kai | approving, giving in | same file (press, NOD) |
| Relax: lean back, head up, eyes shut → double-take snap open on "Wait." | Kai | calm before the reveal | same file (relax, shut, jolt) |
| Folder poof: anticipation squash 3 f → pop to nothing 5 f + dust puff | prop | deleting / vanishing | same file (drawFolders) |
| Slump: sit clip blended to chin-in-hand (sitB 4.5) | Kai | defeat | same file (down) |
| Panic arms while seated: the arm bones of the `afraid` clip slerped over the sit pose (hands up by the face) | Kai | hook panic, scared, the frozen button face | `template/ref/reel58-api-key/reel.js` (ARMB, armsUp) |
| Bot eyes: red LED slot pairs on the dark wall open in 3 f one by one, blink, flare, shut in a slow wave | prop | "someone is watching", threat on / off | same file (props(), BOT_ON/OFF/BACK) + set.js (BOTS) |
| Power-down: gold prop flickers 0.2 s then goes grey (colour + emissive lerp) | prop | turning something off, revoking | same file (props(), apiKey) |
| Spring pop-in of a new prop (scale 0 → overshoot → 1, spin settle) + sparks from it | prop | "I made you a new one" | same file (props(), newKey; BURSTS 'key') |
| TODO: startle jump | both | surprise | |
