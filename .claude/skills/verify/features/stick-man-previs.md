# Stick-man previs and temp-music animatic

`styles/stick-man/tools/previs.mjs` turns a film's storyboard into a grey three.js blockout, captures it in headless
Chrome and lays the recorded voice (and, for the whole film, temp music) under it. Kai judges cuts and camera from it
before any render. The camera math is pure and shared with the page: `previs-core.mjs`. The page is `previs.html`.

## Sub-features

- Whole film (`--film`): storyboard shots moved onto the voice clock (each line's first shot starts where the line starts
  in `vo/words.json`), one grey zone per set with its name on the back wall, the cast as box figures on marks, the
  camera from each shot's size, angle, lens and move.
- Cut policy (`--join scene|none|all`, default `scene`): inside a scene the camera flies from one shot's framing to the
  next; between scenes it cuts. A shot's own `join: "cut" | "flight"` wins.
- Hand spec (`films/<slug>/previs/<name>.json`, worked example `test/fixtures/previs/bank.json`): explicit set blocks, figure paths, head and arm keys, props and camera keys. `--scene <name>` renders it alone;
  in `--film` it replaces the shots it lists in `shots`, with a cut on each side.
- Label bar: stage title and line in Vietnamese at the bottom, the clock and the voice line on the right, a top
  timeline with a tall red tick per hard cut and a small tick per flight, a red CẮT tag for 0.5 s after a cut. The film
  animatic adds its cut rhythm beside the Rick and last-render numbers from `styles/stick-man/bench/`.
- Evidence: every run rewrites `review/previs/previs.md` (one row per previs video: length, hard cuts, cuts per minute,
  median and longest take, most cuts in 15 s). Gate ◇2b needs this file with the `animatic` row, newer than
  `storyboard.json`.

## How to get to it (user POV)

Stage 1 [1.6p] in the make-reel-stick-man skill, before ◇2a; stage 3 [3.1] per scene. `stagegate.mjs films/<slug> 2b`
names `review/previs/previs.md` when it is missing.

## Driving it

- `node styles/stick-man/tools/previs.mjs films/<slug> --film` writes `review/previs/animatic.mp4` (720x1280, the
  voice's length) and prints its takes. `--music <wav>` and `--music-db -6` set the temp music.
- `node styles/stick-man/tools/previs.mjs films/<slug> --scene <name | scene id>` writes `review/previs/<name>.mp4`.
- `--stills 0,90,300` writes only those frames as png; `--world-only 1` writes only the compiled world json.
- Look for: on a copy of Hot Money ep01 r4 (storyboard, `vo/`, `audio/stems/music.wav`, `previs/bank.json` copied from
  `test/fixtures/previs/bank.json`), `--scene bank` takes seconds and matches the hand-made `review/previs-banks/previs_banks_A.mp4` frame for
  frame (PSNR peaks at offset 0); `--film` gives 90.1 s with 7 hard cuts (4.7 a minute, median take 11.5 s).
- Regression: `node --test test/unit/previs.test.mjs`.

## Gotchas

- The automatic blockout knows sizes, moves and who is in a shot, never the set's real layout: a scene whose camera
  matters gets a hand spec.
- Figures from different sets are separate (`you@back lot`, `you@room 9`): the zones sit 40 m apart and only the camera
  travels between them.
- Chrome runs through `playwright-core` (`chromium.launch`), the same as `shot.mjs`. On Kai's Mac every render goes
  through the shared render lock.
