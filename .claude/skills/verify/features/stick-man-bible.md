# Stick-man show bible: the Hot Money parts catalog and the render gate

A show bible is a closed catalog of the parts one series may use: motion clips, faces, props, camera kinds and moves,
sets, looks, effects and overlays (`styles/stick-man/bible/<show>/catalog.json`, design tokens in `tokens.json`). The
catalog's `governs` list names the film slugs it holds (`hm-ep*`, `hm-bible-*` for Hot Money). `bible/check.mjs` loads a
governed film's acts in node and reports every part outside the catalog with its file and line and the part to use
instead. `tools/shot.mjs` runs that check before any still or mp4 render of a film and refuses to start on a blocking
finding. Dev only: `styles/stick-man/` is under `[dev]` in `kit.manifest`.

## Sub-features

- Rules: `hand-keyed-action` (a body action keyed by hand where the library has the clip for that body) and every
  `*-not-in-catalog` rule block; `clip-missing-for-body` is a gap; `trial-part` is info.
- Library share: clip-driven actions over all body actions, and the same over actor-frames.
- `films/<slug>/bible-exceptions.json`: `[{ rule, where, reason }]` silences a finding and counts it; no reason is refused.
- `--no-bible-check '<reason>'` on `shot.mjs` renders anyway, warns and appends a line to `films/<slug>/bible-bypass.tsv`.
- `bible/page.mjs` writes the bible page (the catalog and tokens as one HTML page) from the two JSON files.

## How to get to it (user POV)

`node styles/stick-man/bible/check.mjs films/hm-ep01-r2 --parts s4,s5,s6` prints the report in Vietnamese (`--json`
for the data). Rendering a governed film (`shot.mjs --film films/<slug>/<part> ...`) runs the same check first.

## Driving it

- Blocks: `node styles/stick-man/bible/check.mjs films/hm-ep01-r2 --parts s4,s5,s6` exits 1 with
  `BLOCK · 53 blocking ... library share 16 clip / 140 hand-keyed actions (10%)`.
- Passes: `node styles/stick-man/bible/check.mjs films/hm-bible-s5` exits 0 with `PASS ... (68%), 88% of actor-frames`.
- Gate: `node styles/stick-man/tools/shot.mjs --film films/hm-ep01-r2/s5 --frames 1100 --w 720 --h 1280 --out f_%d.jpg`
  exits 1 with `render refused: BLOCK 21 blocking` before a browser starts; the same command on `films/hm-bible-s5`
  writes the still.
- Regression: `node --test test/unit/stick-bible*.test.mjs`.

## Gotchas

- `films/hm-ep01-r2/reel.js` is a stub act with no name; the check reports it under its file. The episode's acts are in
  its parts, so check it with `--parts` or one part at a time.
- The check imports the film's modules in node with stubs for `fetch` and a 2D canvas; a film that needs a real browser
  API at import time fails to load (exit 2) and the render is refused.
