# Stick-man props and sky: solid, in view, real size, upright, one sky

What Kai caught in Hot Money ep01 r5 (19/11) and the check that now catches each one. Every check reads what the
engine built, not a hand list a film keeps.

## Sub-features

- Solids from the set's geometry (`engine/solids.js`): every opaque `BoxGeometry` mesh of the act (`createKit` `K.box`
  walls, furniture, floors, jambs), outside the set's props and the actors, plus the set's `COLLIDE`. A mesh with
  `userData.hollow` is left out, so are ink hulls (BackSide) and see-through or hidden meshes. Each box is judged by its
  geometry's own bounding box (a set may translate the geometry).
- Rest surfaces (`engine/propobj.js`, `S.rest`): a prop let go falls until it lands on the floor or on the top of any
  of those solids, not only on `COLLIDE` (r5 ENDING-A: the hot dog fell through room 2's bed to the floor, bottom -0.05
  m). A box whose bottom is above 1.8 m (`solids.js OVERHEAD`: a ceiling, a lintel) is not a rest solid, so a prop let
  go under a ceiling falls straight down instead of being shoved out of the room. A headless rig without a set keeps
  `S.obstacles`; `rigClip(..., { rest })` gives it a set's solids.
- Prop in a head or in the set (`__dbg` rows `propIn: [{ id, in, cm, at }]`, shotfaults kinds `prop in the head`,
  `prop in the set`): each hand-sized prop (under 1.5 m) as a 4x4x4 grid of points inset 15 % from its drawn box,
  against every shown head (ellipsoid 0.5 x 0.5 x 0.47 head widths) and every solid, 2 cm of grace. A cap worn on the
  head (`<actor>:H…`) is left out. Contact class: blocks from 6 px held 3 frames in view.
- Drawn box (`solids.js drawnBox`): a prop's `dims` and `size` in the rows are its meshes' geometry boxes taken into
  its own frame in one step (before: each mesh boxed in the world, then boxed again, so a turned prop read up to 1.7x
  long); lights, glows, transparent cones and ink hulls are left out.
- Prop leaves view (shotfaults `prop leaves view`): a prop in a hand (within 0.35 m of a hand of a figure in frame, or
  an `<actor>:` hand prop) that was seen whole in the 6 frames before leaves the frame while its holder stays in it,
  and comes back within 45 frames (r5 LOAD-B 691-714 and 741-757: the bait bill held up out of the top of the frame).
- Prop out of scale (shotfaults `prop out of scale`, `kit/props/sizes.js REAL_SIZE`): a tracked prop whose name's last
  word is its kind (bullet, pistol, bill, hotdog, phone, torch, cup; `bullet2`, `baitBill`, `billA` too, never
  `cupboard` or `billboard`) and whose longest side is outside its real range by more
  than 1.25x, while in view. Only tracked props are seen: an object a set animates outside its `props` (the r5 s5
  round) is invisible to every gate, so a story prop goes in the set's `props`. The kit's own hand props of those kinds
  are held to the table (`test/unit/stick-prop-sizes.test.mjs`).
- Held prop on the hand (`engine/grip.js`, `__dbg` rows `held: [{ actor, prop, side, onScreen, gapPx, gapCm, anchor }]`,
  `tools/gates/handgrip.mjs`): the air from the hand's drawn edge (its world radius with its ink outline: figure scale
  and gloves included) to the nearest point on the prop's drawn solid triangles (`kit/props/drawn.js`, shared with
  propBox and collide.js: no contact-shadow disc, no glow), outlines included, meshes under a hidden parent left out (`anchor: 'edge'`; any other anchor is unmeasured), never the grip socket the engine
  snaps onto the hand; each hand of a two-hand prop on its own. Any on-screen frame over
  `GAP_CM` (`handgrip.limits.json`, frozen) fails, exit 1; rows with gapPx only exit 2. `--frames a-b` for a still.
  Every gripping hand (`limbs.<side>.grip`) is measured too: rows `grips: [{ actor, side, onScreen, prop, gapCm, anchor }]`
  (`engine/grip.js` `nearestGap`: the nearest shown tracked prop, held or loose, stand-ins left out); a held prop under
  `STANDIN_CM` (2) in every dimension (rows' `track.<id>.size`) is a `stand-in` fault; a gripping hand with no `grips[]`
  entry and no held prop is an `unmeasured grip` fault; no held prop and no gripping hand prints `PASS: nothing held`.
- Kit hand props baby, tin, lantern, photo, balloon (`kit/cast/handprops.js`, every drawn part a visible mesh; the lantern
  flame an additive glow drawn.js leaves out). `fits.mjs --hands` (fits_kinds.mjs `hands()`, `HAND_POSES`) plays each pose a
  film holds them in headless, engine/grip.js `gripGap` (hand mesh's drawn edge to the prop's drawn triangles) per holding
  fist, and writes `hand|<prop>|<body>|hand` rows (worst frame vs handgrip `GAP_CM`); per row, on its film pose, the prop
  touching the fist must pass and 3 cm off must fail; `holdIn` keeps a clip's own same-slot prop; `tableFaults` rejects a
  usable hand row over the limit.
- Upright along the forearm (`engine/cast.js`, `userData.top`): an `'along'` prop that declares `top` (the kit pistol:
  `[0, 0, 1]`, the slide over the grip) is rolled about the forearm so that axis faces up, or forward when the forearm
  is near vertical. Before, the shortest arc from up left the roll to chance: the kit's own Act_PistolShoot_Once held the
  pistol upside down (-1.00) at its aim frames.
- Cut by the far plane (`__dbg` rows `farCut: [{ name, at, size, far }]`, shotfaults `cut by the far plane`): every
  opaque mesh 2 m tall or more whose box reaches both nearer and further than the camera's far (80 m, look.js) with its
  near part in the frustum. The dome (BackSide, drawn first, no depth) is left out, so is the floor. The engine's dome is
  the only sky: a set's flat sky cards are hidden or come out (r5 CHASE 1481-1513, 1613-1637: motel.js's 220 x 60 m
  cards at 60-70 m drew near-black over the dome with a straight edge).
- Face sheet (`tools/series/facesheet.mjs`, `facebeat.mjs` (3)): rows carry `actors[n].exprDesign` (`faces.js designKey`, a hash
  of the expression's numbers). facebeat fails while a design held 15 frames on a readable head is not in
  `review/faces-approved.json` (by kai). `facesheet.mjs films/<slug> [--query k=v] [--no-bible-check '<reason>']` writes
  `review/face-sheet.jpg` to show Kai (the flags as the rows' render had them; `face-sheet.json` only once the jpg exists);
  `--approve "<his words>" --sheet <hash>` records his yes, only for the sheet whose hash he saw stamped on the jpg.
- Run logs (`tools/run/logline.mjs`): the one way to add a line to a run log; it records the line count and a hash in
  `.logchain.json` and refuses to append to a log whose first lines changed. `stagegate.mjs` runs the same check on the
  film folder at every gate (`run logs` row).

## Journeys

- `node --test test/unit/stick-props-solid.test.mjs test/unit/stick-prop-rest.test.mjs test/unit/stick-prop-roll.test.mjs test/unit/stick-facesheet.test.mjs test/unit/stick-logline.test.mjs test/unit/stick-prop-sizes.test.mjs`
  (fixtures in `test/fixtures/hm-r5/`, cut from the r5 v3 and fixed rows).
- A film: `node styles/stick-man/tools/render/shot.mjs --film films/<slug> --frames <a>-<b> --dbg review/shot-rows.jsonl --w 540 --h 960`,
  then `node styles/stick-man/tools/gates/shotgate.mjs films/<slug> --rows review/shot-rows.jsonl --w 540 --h 960`: the new
  kinds (and `cut by the far plane`) appear in `review/shot-gate.md` with a `fix:` in the text.

## Watch

- A set that moves a non-prop box (a car not in `props`) leaves it as a rest surface where it stood when the plan was
  built; the in-the-set test uses the live position.
- A prop hidden behind its holder's head or under a film's own HUD is not `off`; review still has to catch it.
