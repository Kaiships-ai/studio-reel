# Stick-man measured shot gate

`styles/stick-man/tools/shotgate.mjs films/<slug>` judges every frame of a stick-man film against the frame before
(`tools/shotfaults.mjs`) and exits 1 while a fault the camera sees remains. `stagegate.mjs` runs it at ◇4 (shot lock) and
◇5 (deliver), so a film with a bag that pops, a figure that skates or a body through a truck cannot lock either gate.

## Sub-features

- Props by frame: `__dbg` rows carry `props` (engine/play.js `dbg`): every set prop by name and every hand prop as
  `<actor>:<id>`, with `shown`, `held`, `on` (what the lens sees of it, engine/visible.js), its screen `box`, its `size` (m)
  and centre `c`. The gate reads appear / vanish / jump / resize in a shot, size and spot across a cut, and floating.
- Crossings: `__dbg` rows carry `cross`: pelvis, chest, head, knees and each held prop's centre, a ray from the frame before
  to this one against the set's meshes (bodies and held props left out).
- Cuts: a camera jump, an act change, a dissolve, or `edit: true` on a row. `motion.cut` is not used: a film directed one
  camera shot per frame sets it on every frame, and the shot report skips every such frame.
- Figures: pop in or out inside the frame, head jumps, skating (the body travels, both feet move along), joint pops
  (jointstep.mjs), planted foot slide, hand off its grip, held prop in the body, collision boxes, cord shake.
- Visibility: figure faults go through `shot.mjs --vis` (the film camera); a hidden fault is listed as ẩn and never
  blocks. Rows given with `--rows` have no page, so their figure faults count as seen.
- Strips: each blocking second gets `review/shot-gate/strip_<s>s_f<F>.jpg`, 15 frames, the fault on tile 6, cut from the
  newest `renders/*.mp4` (or `--in`, `--from` the film frame of the mp4's first frame), else rendered at 270x480.

## How to get to it (user POV)

`node styles/stick-man/tools/stagegate.mjs films/<slug> 4` lists `measured:shotgate.mjs` as FAIL until
`review/shot-gate.md` says PASS. The make-reel-stick-man stage table names it at [3.5].

## Driving it

- `node styles/stick-man/tools/shotgate.mjs films/<slug>`: runs `shot.mjs --frames all --dbg review/shot-rows.jsonl` at
  540x960, then `shot.mjs --vis`, then the strips; prints `review/shot-gate.md: PASS|FAIL · n second(s) to fix (kinds)`.
- Rows made elsewhere (a film assembled shot by shot, one page per shot): `--rows <jsonl> --w <px> --h <px>`, rows in film
  order with `F` and `edit: true` on each shot's first row.
- Unit check: `node --test test/unit/stick-shotgate.test.mjs` (one synthetic case per fault, and the non-faults: a cut,
  the frame edge, a cover, a walk, a fall).

## Gotchas

- `--frames all` reads the film's range from the page (`window.__F`, reel.js to reel2.js).
- The crossing probe needs consecutive frames from one page: the first frame of a page (each `--dbg` run, each
  per-frame page) has no crossing row.
- A prop whose builder swaps its object between shots (a hug bag, then a hand bag) is judged across the cut by size, not
  by name.
