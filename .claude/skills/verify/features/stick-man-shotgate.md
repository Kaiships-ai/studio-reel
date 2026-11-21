# Stick-man measured shot gate

`styles/stick-man/tools/shotgate.mjs films/<slug>` judges every frame of a stick-man film against the frame before
(`tools/shotfaults.mjs`) and exits 1 while a fault blocks: seen by the camera, on screen 3 frames or more, and large
enough on a phone (px on a 720-tall frame × share in view, GATES.md "Shot gate"). `stagegate.mjs` runs it at ◇4 (shot lock) and
◇5 (deliver), so a film with a bag that pops, a figure that skates or a body through a truck cannot lock either gate.

## Sub-features

- Props by frame: `__dbg` rows carry `track` (engine/play.js `dbg`; a film may wrap `__dbg` and set its own `props`): every set prop by name and every hand prop as
  `<actor>:<id>`, with `shown`, `held`, `on` (what the lens sees of it, engine/visible.js), its screen `box`, its `size` (m),
  its box's `dims` (m, in its own axes) and centre `c`. The gate reads appear / vanish / jump / resize in a shot, size and spot across a cut, and floating.
- Crossings: `__dbg` rows carry `cross`: pelvis, chest, head, knees and each held prop's centre, a ray from the frame before
  to this one against the set's meshes the render draws opaque (visible.js `opaque`: bodies, held props, meshes that moved
  since the last frame, light cones, glass and hidden meshes left out).
- Cuts: a camera jump, an act change, a dissolve, or `edit: true` on a row. `motion.cut` is not used: a film directed one
  camera shot per frame sets it on every frame, and the shot report skips every such frame.
- Jumps: a step that lies outside the steps on either side of it in the same shot, less the same measure 2 and 3 frames
  away, in px through the shot's camera; history never resets at a cut. What the steps around it leave of it is a jump to a
  new place (frames = how long it stays), else it went out and back (1 frame). A prop whose `dims` change by 15 % in the
  frame changed shape (a calendar page turning) and is no jump. A prop moving into a cut may change place behind it.
- What blocks (Kai's marks at playback speed, 17/11, on 12 strips of an approved film and the bible film; he saw only #10, a saw
  11 px into a rail for 3 frames): a fault gone within 2 frames is watch only; a contact that holds 3 frames blocks from
  `CONTACT_PX` 6; a change that holds 3 frames blocks from `CHANGE_PX` 75 (the largest change he did not see held 63 px, a
  knee snapping to a new pose; the smallest he complained about held 97 px, S3-032). The same day, on a head squash: "it is
  one frame; at real playback nobody notices".
- Figures: pop in or out inside the frame, head jumps, skating (the body travels, both feet near the floor move along),
  joint pops (a jointstep.mjs channel over 25 deg whose points jump off their path), planted foot slide, hand off its grip,
  held prop in the body, collision boxes.
  Cord shake is listed as watch only. The limits and their reasons: GATES.md "Shot gate".
- Visibility: the share of a fault inside the frame and not behind the figure's own head or torso scales its severity;
  when the film has a `reel.js` (also with `--rows`), figure faults go through `shot.mjs --vis` and one behind the set is
  listed as ẩn and never blocks. Rows of a film assembled shot by shot have no page, so only the share counts.
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
- Unit check: `node --test test/unit/stick-shotgate.test.mjs`: one synthetic case per fault and the non-faults (a cut, the
  frame edge, a cover, a walk, a fall, a speed-up, a ride in a car, a one-frame blink, a page turning), and a mutation test
  on the clean rows of an approved film (`test/fixtures/shotgate/clean-film.jsonl.gz`): 30 faults that stay (a prop moved, grown or gone
  for good, an arm snapped to a new pose, a body through a surface, a foot slide) need 90 % blocked, and 15 one-frame
  spikes (a prop out and back, a prop gone for a frame, an elbow pop) need 90 % passed.
- Kai's replayable complaints, each with a fault kind and a tune / test half fixed before tuning:
  `test/fixtures/shotgate/complaints.json`.

## Gotchas

- `--frames all` reads the film's range from the page (`window.__F`, reel.js to reel2.js).
- The crossing probe needs consecutive frames from one page: the first frame of a page (each `--dbg` run, each
  per-frame page) has no crossing row.
- A prop's `c` is its bounding box centre: a prop that changes shape moves it. A shape change of 15 % in a frame reads as
  no jump; a slow one (train cars tipping over a lip, 3 to 7 % a frame) still moves the centre and is listed (seen at 0:19 of that film,
  10 px, watch).
- A prop whose builder swaps its object between shots (a hug bag, then a hand bag) is judged across the cut by size, not
  by name.
