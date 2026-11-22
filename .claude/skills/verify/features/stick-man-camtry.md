# Stick-man "thử góc máy" (camera previs from the film's own engine)

`styles/stick-man/tools/run/camtry.mjs` takes a director's camera note in plain words and finds the film, segment, take,
frame window and camera anchors it means. It renders 3-4 camera variants through the film's own engine (headless
Chrome, real GPU) and writes the clip, a top view, wall numbers and a stage-page section. `pick` writes the chosen
variant into the anchors and regenerates the act. The word logic is pure: `camtry-core.mjs`. The page is
`camtry.html` + `camtry-page.js`.

## Sub-features

- Resolve: the film is the newest in `films/` with a `reel.js` and its own `storyboard.json` or `<round>/gen/` (a
  segment test folder has neither), unless the note names one. The segments come from `<round>/gen/<SEG>.js` heads
  (`FRAMES` end exclusive, `CUTS`, `STAGES` clamped to the segment), else from storyboard scenes. A take is a run
  between cuts. A concept table (đua xe, cuộc đua, ngân hàng, mở đầu, đoạn kết, súng, núp, ...) matches the segment on
  whole words of the folded note (marks stripped, đ to d), so "download" is not "load" and "kết quả" is not the ending.
  The render window is always the whole segment. A narrower phrase ("take 2", "đoạn đầu/giữa/cuối …", an ordinal on a
  named stage such as "ngân hàng thứ hai") picks one take; the change range is that take widened to the anchor windows
  it touches. The first output line is the readback "Em hiểu là: … xem cả đoạn khung A-B (n take), phương án đổi …,
  máy quay …; máy …". `--frames A-B` narrows the render inside the segment and must hold the change range.
- Variants from words, on the folded note: up ("nâng", "thấp quá", "raise", "lift"), down ("hạ", "cao quá", "lower"),
  away ("ra xa", "lùi", "dính tường", "gần quá", "away", "too close"), closer ("gần lại", "xa quá", "closer"), hero aim
  ("nhìn vào xe", "look at the car"). "chút" is a 0.5 m step, "nhiều" 1.5 m, "2 m" sets it. V0 is always the film
  camera. A note that names a wall moves off the nearest wall, else back from the aim. A note with no move is vague:
  the readback says "chưa rõ hướng máy" and the set is V0, up 0.5 and 1 m, down 0.5 m. `aim: 'lift'` raises the aim
  with the camera (what an anchor's `dz` does).
- Render: the engine's `stage.render` is wrapped. Inside the change range each variant swaps the lens position and aim
  for the frame and puts the film camera back; outside it every variant is the film camera. V0 renders untouched
  (keeps its roll). All film passes run. Default 360x640 per render, tiles 270x480, every frame, 30 fps. A strip under
  the tiles shows the segment: the change range in yellow, the cuts as white ticks, the current frame as a needle. A
  tile outside the range reads "như phim".
- Numbers per variant over the change range (definitions in `camtry.json`): wall-touch frames, wall-fill frames, the
  nearest wall, mean camera height, the lead's screen height, the facade share, and the close walls by mesh name.
  Walls are static meshes at every take's first, middle and last frame, shown at one of them.
- The note: when the recommended variant still touches a wall that an unwritable variant clears, the CLI and the
  section say which variant clears it and that it is a hand change (`manualNote`).
- Top view: one row per take, one column per variant. Static set meshes drawn orthographic from above (taller is
  lighter). Bright yellow is the camera path in the change range, dim yellow outside it, red dots are wall touches,
  green is the lead's path.
- Recommendation: the smallest asked change `pick` can write that touches no wall and fills least, V0 when it is
  better. No writable change: the best asked one with `pickManual` ("áp tay"). Unwritable variants carry `applies:
  false` and "xem được, áp tay" in the section.
- Pick: `applyPick` sets `dz` to the anchor's dz at the previs run (`camtry.json` anchors) plus the variant's `up`, on
  every anchor window the change range touches (whole windows, so no pop). Picking twice does not stack; V0 restores.
  It refuses away, closer, hero aim and a tilt that holds the aim, because `dz` lifts the aim too. The CLI checks the
  anchors file is `<round>/xfer/*.json` inside the film and every generator is inside the film, writes `<xfer>.bak`,
  and puts the anchors and the generated files back when a generator fails. `--dry` (bare, or 1/true) writes nothing.
  `formatSpec` writes one anchor per line.

## How to get to it (user POV)

The "Mode: thử góc máy" section of the make-reel-stick-man skill. Kai's note goes in word for word. The section goes on
the stage page, and Kai picks there.

## Driving it

- `node styles/stick-man/tools/run/camtry.mjs "đoạn đua xe, máy quay dính tường nhà, nâng lên chút" --film films/hm-ep01
  --dry` prints the readback (whole CHASE 1347-1709, 3 takes, change "cả đoạn", the four anchors) and the variants (V3
  marked "xem được, áp tay") and writes `camtry.json`, in a second, with no render.
- Without `--dry`, on Hot Money ep01 r5 (worktree `hm-r5b`, 20/11 files): the whole CHASE, 363 frames x 4 variants at
  360x640, engine ready in 2 s, 183-212 s in all. Look for 4572 static meshes and 431 buildings, a 1080x542 clip of 363
  frames at 30 fps, and a 3 x 4 top view. V0, V1 and V2 touch a wall at 1439-1443 (take 1, "4 NGÃ TƯ", 0.02 m from an
  8.4 m building); V3 (off the wall) touches none. The recommendation is V1, with the note that only V3 clears the
  wall and must be changed by hand. Camera heights 1.49 / 1.99 / 2.49 / 1.99 m.
- `node styles/stick-man/tools/run/camtry.mjs pick <out> V1 --dry` prints the dz change for every anchor window. Without
  `--dry`, it writes the anchors file and reruns `r5/tools/xfer.mjs CHASE` and `r5/xfer/chase-extra.mjs`. A second
  `pick … V1` prints "neo đã đúng".
- Regression: `node --test test/unit/stick-camtry.test.mjs` (fixture `test/fixtures/camtry/library/`: the r5 act heads,
  the CHASE anchors, the CHASE test folder). It covers whole-segment resolve, narrowing, folded and English notes,
  word boundaries, vague notes, the recommendation, `--frames` checks, and pick's dry switch, backup, no-stack, path
  check and rollback.

## Gotchas

- Only static set meshes count as walls. Cars, cast, instanced and skinned meshes are left out.
- A re-aimed variant drops the film camera's roll. Shadows and lens focus still follow the film camera.
- The render skips the bible check: it is a preview, never a film output.
- On Kai's Mac every run goes through the shared render lock.
