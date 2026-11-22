# Stick-man face style s2

s2 is the kit's default face style (Kai 21/11: "s2 thành mặc định"; new face work goes into s2). `engine/play.js` `boot`
calls `engine/facestyles/index.js` `useFaceStyle(reel.js faceStyle)` before any figure or the stage is built: left out or
`'s2'` loads `engine/facestyles/s2.js` and calls its `use()`; `'kit'` loads nothing and the film renders exactly as before
styles existed (every rule below is behind `faces.js` `FACE_STYLE.name`); any other name throws. s2 is the rubber face Kai
approved on Hot Money ep01 r5 reel 1 (21/11, "v6 ok, ưng 9.5/10").

## Sub-features

- Designs: `DESIGNS` (27: `y_` the lead's faces, `c_` a second character's) go into `EXPR` with `style: 's2'`; `faces.js`
  `drawFaceState` hands them to `STYLE_DRAW.s2`. Kit designs on other figures of the same film keep the kit drawer.
- Clocks: s2's change timing (eyes lead, brows and mouth overlap), takes eased at both ends (`TAKE.sine`), crisp blinks,
  a chew every 19 f (`acting.js` `CHEW`; the kit's faces 9 f).
- Engine rules under a style: a sagging shut eye, a lid stroke that shortens as it lifts, no gasp between shut mouths,
  fear mouths arched down, teeth that grow in, the face card a shell at the head's depth (`cast.js`), strips on whole
  pixels, face ink restored after the blooms (`look.js` `faceInk`), tense faces blinking fast, forced blinks 150 f apart,
  one turn blink per run of glances (`play.js` `turnBlinkAt`), chew and breath beats (`{ chew, breath, t }` on a beat).
- The drawer reads `F.prev` (the face 1 and 2 frames ago), `F.chg` (the change under way, with the target's name `b`),
  `F.hpx` (head height in px at 1920) and `o.sl` (the head's turn): past yaw 1.34 under a hood, 1.45 under a cap, no face.
- dbg rows add `faceVis` and `faceSlide` per actor.

## How to get to it (user POV)

Any film: beats with `expr: 'y_fear', take: true` and the like (`new_film.mjs` writes no `faceStyle`: s2). A film that
keeps the old faces: `export default { ...act, faceStyle: 'kit' }`. The design sheet: `shot.mjs --page
styles/stick-man/faces.html --view a --frames 12 --w 1560 --h 1300 --out faces.jpg` (s2; `--query style=kit` the kit's).

- Eyes (Kai 22/11, Hot Money ep01 A v9: "creepy" wide eyes): `engine/eyegeom.js` sets the open eye's pupil (`EYE.prx` x
  `EYE.pry`, a wide-eyed design shrinks it by `EYE.shrink`) and the upper lid's rest on the pupil's top (`restLid`: at most
  `capA` of the eye's height of white above the pupil, `capShock` for a design with white >= 0.6); `eye4` draws with it and
  eases the rest lid out as the eye closes. The catch light sits at the pupil's upper edge. The lid's crease line now
  draws for the rest lid too, so a calm face shows its lid resting on the pupil (intended). A design that squeezes
  (x.eCr / x.eCrR) has no open eye and is not judged; the gate checks the held open eye, not every frame of a take. `tools/gates/eyegate.mjs` holds
  every s2 design and every kit ring eye to `LIMITS` (calm: pupil >= 55 % of the eye's width, <= 10 % white above it;
  fear/shock: >= 42 %, <= 30 %) and exits 1 on a failure.

## Driving it

- Unit: `node --test test/unit/stick-face-default.test.mjs` (left out = s2, `'kit'` = no style, an unknown name throws)
  and `test/unit/stick-face-s2.test.mjs` (designs present and drawn, turned-away faces hidden, a shut
  blink draws lines, no one-frame pops and the eye shut share on Hot Money reel-1 rows).
- Kit faces unchanged: a film without `faceStyle` rendered on a commit before the s2 default, and the same film with
  `faceStyle: 'kit'` on the branch: `shot.mjs --film films/<slug> --frames all --dbg rows.jsonl --w 720 --h 1280`; the rows
  match. An s2 film (`faceStyle: 's2'`) and the same film with the key left out give the same rows.
- The face-gate fixes on this film: `facebeat.mjs` takes each shot's end from the next storyboard shot (not the reel's
  segment `CUTS`); `faults.mjs` `editCuts` counts a one-shot-per-frame camera as one flight; `facesheet.mjs` passes
  `--query` and `--no-bible-check` on to `shot.mjs` and writes `review/face-sheet.json` only once the sheet image exists.

- `node styles/stick-man/tools/gates/eyegate.mjs` prints one row per design (pupil share, white above) and `eyegate PASS`;
  `node --test test/unit/stick-eyes.test.mjs` checks the drawn pupil equals `eyegeom.js` and that v9's eye (`EYE_V9`) fails.

## Gotchas

- One face style per render: `use()` sets module state (the engine's clocks).
- A style's design names go into `EXPR` only at `use()`; a film that copies one (Hot Money's `y_fearD`) reads `DESIGNS`.
