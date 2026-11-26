# Stick-man camera and cut gate

`styles/stick-man/tools/gates/cutgate.mjs` measures the final render of a stick-man film and blocks gate ◇5 (Deliver) through
its row in `styles/stick-man/tools/gates/GATES.json`. It reads two sources:

- The mp4's pixels give the hard cuts (ffmpeg scene score of 0.30 or more at 270 px wide, frames under 0.2 s apart
  merged) and the takes between them.
- The film's camera data (`__dbg` rows, cached in `review/board-dbg.jsonl` and shared with `board.mjs`) gives the camera
  height against the lead's head and how much of the lead's head is in the frame. The mp4 alone cannot tell either.

## Sub-features

- C1: at most 4 hard cuts in any 15 s window. A film average hides bursts, so the window is the length Kai judged.
- C2: the longest take is 6.5 s or more.
- C3: the camera looks up at the lead's head by more than 5° in at most 25 % of the frames with a lead in frame.
- C4: no run longer than 1 s with less than half the lead's head box inside the frame.
- C6: no close face cut by the frame edge for 3 frames or more: any actor whose head box is 20 % of the frame height or
  more, with over 2 % of its height past an edge. A head whose centre moves over 1.2 % of the frame height in one frame
  is leaving the frame (a run past the lens) and is left out. `review/cutgate.md` lists each failing run (actor, frames,
  head size, how much is cut).
- Each limit's source (the Kai pick or note it comes from) is printed beside it in `review/cutgate.md`.
- Verdicts: PASS (every row measured and in limits), FAIL, or PARTIAL (no FAIL, but C3 to C6 not measured because the
  camera could not be read; the reason is printed). Only PASS exits 0.
- A film rendered in parts (a stub `reel.js`, its parts in `s4/`, `s5/`, `s6/` ...) is read part by part: each part's
  camera rows, the parts placed back to back in the render in the order of their names. Their total must match the
  render within 1 s.
- Reels that import another film (`/films/<other>/...`) or fetch a kit asset at load (the hoodie's `.glb`) load in Node.

## How to get to it (user POV)

At stage 5, `node styles/stick-man/tools/gates/stagegate.mjs films/<slug> 5` runs `cutgate.mjs` on the newest final render in
`renders/` (the same file `postcheck.mjs` checks). A FAIL or a PARTIAL keeps ◇5 OPEN, and the ◇5 line shows which: `measured:cutgate.mjs (PARTIAL)`.

## Driving it

- Film: `node styles/stick-man/tools/gates/cutgate.mjs films/<slug>` writes `review/cutgate.md` and exits 1 unless PASS.
- Any mp4 (a reference clip, an old cut): `node styles/stick-man/tools/gates/cutgate.mjs --mp4 <file>` prints the table;
  add `--dbg <jsonl> --w 720 --h 1280` for camera rows made at that size, `--json 1` for JSON.
- Look for: the Hot Money bible film (`hm-bible-s5`, cut-A) passes with C3 1 % and C4 0.0 s read live; ep01 r2 v7 fails
  C1 (11 cuts in 15 s) with C3 5 % and C4 0.1 s read from parts s4, s5, s6; a film with 53 % low shots fails C3. Every Rick reference clip passes C1 and C2 and is PARTIAL without `--dbg`.
- Regression: `node --test test/unit/stick-cutgate.test.mjs test/unit/stick-cutgate-close-head.test.mjs test/unit/stick-reel-load.test.mjs`.

## Gotchas

- Parts are read from their 3D camera rows: a 2D re-composite after the render (a crop, a split screen such as ep01's
  room 2 / shop at render frames 2222-2289) is not seen, so C4 there reflects the 3D frame.
- A film copy without its images (a plate `.png` left out) fails the camera pass in the browser: the gate says PARTIAL
  with `shot.mjs --dbg exited 1`.
- C3 measures the angle from the camera to the lead's head, so a ground-level camera on a lead 40 m away reads as level.
- The cut threshold misses some soft cuts (look.sh found 3 of 4 hand-verified Rick cuts) and counts a white flash as a cut.
