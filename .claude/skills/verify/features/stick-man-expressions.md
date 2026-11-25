# Stick-man expressions, head marks and face ages

Three opt-in layers on the stick-man faces (25/11, kit faces v4). An expression is one kit asset: a face and an upper-body
pose read together, plus a head mark; `styles/stick-man/engine/expressions.js` names 13 (proud, guilty, shy, bored, shocked,
angry, scared, sad, confused, excited, embarrassed, smug, sleepy). `headMarks: 'bold'` in reel.js turns on the bold head
marks (`engine/headmarks.js`), sized to read at a ~120 px head. `faceAge` on a cast spec draws its face at an age
(`engine/facestyles/s2age.js`). A film that asks for none of them draws exactly as before.

## Sub-features

- `expressionBeats(name, where, who, o)`: the pose beat, the face 2 f after the pose's anticipation, each mark `MARK_LAG`
  (3) f after the face reads on screen (`FACE_READ`: take 3, fast 7, normal 11 f after its key) and gone as the pose releases or
  `MARK_CLEAR` (6) f before the figure's next face (`markFace`, play.js), the peak held >= `MIN_HOLD` (12) f. On a word the whole moves so that the face lands `EXPR_LEAD` (4)
  f before it. `o.face / pose / mark / amp / hand / hold` override the table.
- Expression faces: `engine/facestyles/s2expr.js` adds new s2 designs (`e_proud`, `e_smug`, `e_guilty`, `e_bored`,
  `e_embarrassed` via style `s2x`, `e_shock`, `e_shy`, `e_sleepy`, `e_angry` / `e_confused` without own marks; `e_cry`,
  `e_scream`, `e_disgust` = the catalogue's with a drawing fault corrected) into s2's DESIGNS on import, and its own mouths
  (`mBeam`, `mSmirk`, `mGape`) into s2's MOUTHS; no catalogue design is edited. `expressions.js`, `s2expr.js` and `s2age.js` stay out of the stick-man pack (kit.manifest), which has no s2.
- Poses added for it in `engine/poses.js` (existing poses unchanged): `proud_chin`, `hands_behind`, `shy_twist`, `chin_prop`,
  `jolt`, `fume`, `cringe`, `droop`, `head_scratch`, `cheeks_cover`, `cheer`, `nod_off`, `arms_folded_high`. Any film can use them. A pose may turn the head (`head_yaw`,
  + = toward its right).
- Bold head marks: rest size `MARK_SIZE` >= `MARK_MIN` (0.26 of the head width), ink `MARK_INK` (0.036 of the head: 4.3 px
  at 120 px) whatever the card's size, pop-in per mark `MARK_POP`, then a hold that pulses but never shrinks away. Sparkle,
  stars and sweat carry their full ink line outside their white; "!" and "?" the head ring's (`GLYPH_INK`). Only here: `star`, `ellipsis`, `gloom` (a grey rain
  cloud over the head), `shake` (plain ink arcs both sides of the head). Anger is a mirror-symmetric vein off the upper corner.
- Face ages: `faceAge` elder | teen | child (= child_hi) | toddler (= toddler_lo) | toddler_hi. Adult, none, or a
  child / elder body alone = today's face.

## How to get to it (user POV)

- reel.js `headMarks: 'bold'`, then `beats: [...expressionBeats('guilty', { line: 'l03', on: 'sorry' }, 'kai')]`; a single
  mark is `mark: 'ellipsis'` on any beat. A cast spec: `{ ...bodySpec(look, 'elder'), faceAge: 'elder' }`.
- Sheets: `styles/stick-man/tools/series/kitexpr` (each expression held 45 f, then every bold mark; `?marks=classic` the old
  marks) and `tools/series/kitfaces-age` (+ `lineup`; `?faces=a,b` any faces alone on the adult head). A
  sheet figure's spec sets `tidyFeet` (a neutral foot shadow, no heel balls left at the root).

## Driving it with draft.mjs / make.mjs

- Not a kai-hand-draw step. `node --test test/unit/stick-head-marks.test.mjs` proves by hash (against a27faf07) that a film
  without the switches draws every mark, every face and the whole figure as before on adult, child and elder bodies;
  `stick-expressions.test.mjs` the beats, pairs, mark sizes and timing; `stick-face-age.test.mjs` the ages.
- The read: render the peak frames with `shot.mjs --film styles/stick-man/tools/series/kitexpr --frames <list> --out
  <dir>/e_%d.jpg --w 720 --h 1280`, again with `--query sil=1`, the marks frames with `--query marks=classic`, a `--dbg` of
  the frames, then `sheet.mjs --stills <dir> --sil <dir> --rows <dbg> --out <dir> --old <dir> --faces <dir>`: expr-sheet, face-only-120, -silhouettes,
  -120, marks-before-after, anger-old-new. Open each image: the tests do not judge the read.

## Gotchas

- A lead acted with motion v2 keys (`anim`) runs no verbs: `expressionBeats` only acts on a figure driven by beats.
- Without `headMarks: 'bold'`, proud, bored, sad and scared fail at load (star, ellipsis, gloom, shake): the message names the switch.
- A film's lens blur treats a mark held against a far sky as sky: keep mark ink at `MARK_INK`, thinner lines go grey.
