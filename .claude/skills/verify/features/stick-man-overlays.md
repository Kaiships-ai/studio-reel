# Stick-man overlays: boxed labels, clocks, meters and paths

A stick-man act's `overlays` list draws the explainer layer over the picture (`styles/stick-man/engine/overlays.js`):
the loupe, sound words, expansion arrows, and (from Hot Money ep01 round 2) boxed labels, clocks that tick without
re-popping, a labelled meter and a dotted path that draws on. They are drawn on the captions canvas, so the 3D look
never touches them. Fields: `.claude/skills/make-reel-stick-man/REEL_DATA.md` "Overlays".

## Sub-features

- `text` with `box`: a rounded box under the text (white text, no ink outline); the box is measured with every digit as
  0, so a clock keeps one box while its text changes each second.
- `enter`: `pop` (the `text` default, unchanged), `fade` (the `meter` and `path` default), `none` (full size from `from`
  to `to`: a label carried across cuts, a clock tick).
- `meter`: label left, value right (`unit`, default `%`), a bar below on a dark panel; the value eases between `keys`
  and holds outside them.
- `path`: a dotted (`dash: 'dash'` for dashes) line through `world` points projected by the shot camera every frame (or
  screen `at` points), drawn on over `dur` frames with an arrowhead; `labels: [start, end]`, the end label pops on arrival.

- Heads-up kinds (`engine/hud.js`, from Hot Money ep01 H2 V2.1): `clock` (a countdown from keys: red under `alarm`, a punch
  and an edge flash per second, a big drop shakes it and slides a chip, `tags` for a time skip, slots that pop), `threat`
  (who, one word that slams in per step, a marker easing toward YOU, held between steps), `vote` (two choices on their
  words, neutral colours, a tint per half, a heartbeat, call-to-action rows, inside the text-safe box by default), `edge`
  (a flash in the frame's outer band), `endcard` (stacked call-to-action cards kept inside the text-safe box: long lines
  shrink, a stack placed past the edge moves back in, `free: true` keeps the film's place). `enter: 'slam'` and
  `box.outline` make a stamp.
- The rows carry `text`: each readable box per frame (overlays and the caption) for `tools/gates/textgate.mjs`.

## How to get to it (user POV)

In a film's act: `overlays: [{ kind: 'meter', from: 0, to: 90, at: [0.5, 0.27], label: 'SUSPICION', keys: [[15, 0], [60, 35]] }]`,
then render the shot. Clocks: one `text` entry per tick with the same `at`, `enter: 'none'` and `box: { color: '#c62828' }`.

## Driving it

- Proof render on the motion-lib proof page, which takes an overlays list as `ov` (URL-encoded JSON):
  `node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/motion-lib/proof --w 540 --h 960 --frames 0-119
  --audio <silent.wav> --mp4 <out.mp4> --query "clip=Move_CarryBag_Walk_Loop&body=adult&ov=<json>"`. Look for: the
  clock box the same at each tick, the meter bar rising, the path drawing on and staying on the floor as the camera
  follows, the end label popping on arrival.
- Numbers: crop the clock region of frames either side of a tick and compare the box's bounding box (it must not move).
- Regression: `node --test test/unit/stick-overlays.test.mjs test/unit/stick-hud.test.mjs test/unit/stick-textgate.test.mjs` (what reaches the canvas per frame for each kind, the boxes, the text gate).

## Gotchas

- `--mp4` needs a voice track: the proof page has none, so pass `--audio` with a silent wav.
- A path segment with an end behind the camera is cut at the camera's near plane, so only its visible part is drawn;
  the arrowhead is skipped while the tip sits at that cut or off the frame, and a label on a hidden end is skipped.
- A loupe draws its ring and leader line on every frame but its picture only after the caller hands it a render
  (`grabLoupe`), as `engine/play.js` does on frames outside a dissolve.
- Animatic: a shot `text` with `box: true` or `{ color, alpha, pad }` and a `%` in the words renders (`animatic.mjs`, test `stick-animatic-text`); the box is a drawtext box, the words are not expanded.
