# Stick-man camera and cut gate

`styles/stick-man/tools/cutgate.mjs` measures the final render of a stick-man film and blocks gate ◇5 (Deliver) through
its row in `styles/stick-man/tools/GATES.json`. It reads two sources:

- The mp4's pixels give the hard cuts (ffmpeg scene score of 0.30 or more at 270 px wide, frames under 0.2 s apart
  merged) and the takes between them.
- The film's camera data (`__dbg` rows, cached in `review/board-dbg.jsonl` and shared with `board.mjs`) gives the camera
  height against the lead's head and how much of the lead's head is in the frame. The mp4 alone cannot tell either.

## Sub-features

- C1: at most 4 hard cuts in any 15 s window. A film average hides bursts, so the window is the length Kai judged.
- C2: the longest take is 6.5 s or more.
- C3: the camera looks up at the lead's head by more than 5° in at most 25 % of the frames with a lead in frame.
- C4: no run longer than 1 s with less than half the lead's head box inside the frame.
- Each limit's source (the Kai pick or note it comes from) is printed beside it in `review/cutgate.md`.

## How to get to it (user POV)

At stage 5, `node styles/stick-man/tools/stagegate.mjs films/<slug> 5` runs `cutgate.mjs` on the newest final render in
`renders/` (the same file `postcheck.mjs` checks). A FAIL keeps ◇5 OPEN.

## Driving it

- Film: `node styles/stick-man/tools/cutgate.mjs films/<slug>` writes `review/cutgate.md` and exits 1 on a FAIL.
- Any mp4 (a reference clip, an old cut): `node styles/stick-man/tools/cutgate.mjs --mp4 <file>` prints the table;
  add `--dbg <jsonl> --w 720 --h 1280` for camera rows made at that size, `--json 1` for JSON.
- Look for: the Hot Money bible escape cut passes (4 cuts in 15.4 s, take 6.7 s), the v7 escape cut fails (11 cuts,
  take 2.3 s), and every Rick reference clip passes (0 or 1 cut a minute).
- Regression: `node --test test/unit/stick-cutgate.test.mjs`.

## Gotchas

- A film rendered in pieces (Hot Money ep01 r2 v7: acts from `s3` to `s6` cut together) has no single reel to read the
  camera from, and a reel that does not load in Node (one that imports another film's files, like the Hot Money
  bible films) cannot give its frame range: C3 and C4 then say "not measured", `review/cutgate.md` says why, and only
  C1 and C2 judge it.
- The cut threshold misses some soft cuts (look.sh found 3 of 4 hand-verified Rick cuts) and counts a white flash as a cut.
