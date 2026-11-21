# Stick-man face style s2

A stick-man film picks a face style with `faceStyle: 's2'` in its `reel.js` default export. `engine/play.js` `boot` loads
`engine/facestyles/s2.js` and calls its `use()` before any figure or the stage is built. s2 is the rubber face Kai approved
on Hot Money ep01 r5 reel 1 (21/11, "v6 ok, ưng 9.5/10"). A film that picks nothing renders exactly as before styles
existed: every rule below is behind `faces.js` `FACE_STYLE.name`.

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

A film's `reel.js`: `export default { ...act, faceStyle: 's2' }` (or a film face layer that returns it), then beats with
`expr: 'y_fear', take: true` and the like.

## Driving it

- Unit: `node --test test/unit/stick-face-s2.test.mjs` (designs present and drawn, turned-away faces hidden, a shut
  blink draws lines, no one-frame pops and the eye shut share on Hot Money reel-1 rows).
- Kit faces unchanged: render a kit film (one made with `node styles/stick-man/tools/new_film.mjs`, or Hot Money ep01 r5 once it is in `films/`) on `main` and on
  the branch, `shot.mjs --film films/<slug> --frames 30,100,180,250,330,420,500,590 --out f_%d.png --w 720 --h 1280` and
  `--frames 0-615 --dbg rows.jsonl`; the rows match and the stills differ only by render noise (compare a second `main` run).
- The face-gate fixes on this film: `facebeat.mjs` takes each shot's end from the next storyboard shot (not the reel's
  segment `CUTS`); `faults.mjs` `editCuts` counts a one-shot-per-frame camera as one flight; `facesheet.mjs` passes
  `--query` and `--no-bible-check` on to `shot.mjs` and writes `review/face-sheet.json` only once the sheet image exists.

## Gotchas

- One face style per render: `use()` sets module state (the engine's clocks).
- A style's design names go into `EXPR` only at `use()`; a film that copies one (Hot Money's `y_fearD`) reads `DESIGNS`.
