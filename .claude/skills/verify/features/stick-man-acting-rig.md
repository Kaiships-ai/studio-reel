# Stick-man faces against the story, and the rig test

Two checks for Kai's acting and rig complaints (QA areas M7 and A2). `tools/facebeat.mjs` compares each face the
picture draws with the beat it plays and counts how often each character's face comes back. `tools/rigtest.mjs` plays
every motion-library clip through the real rig and measures the head's shape, the bones' lengths and the knee and elbow
flex in every frame; `--sheet` renders each clip's worst pose from the front, 3/4, side and back.

## Sub-features

- Face per beat: a face whose emotion family (`FAMILY`) the beat never names (`WORDS` over the beat's feel, lines and
  every shot's brief, purpose and picture) fails when held `HOLD` (15) frames on a head at least `MIN_FACE` (3 %) of the
  frame high. Neutral faces (deadpan, focus, stern, suspicious, ...) never fail. Film twins (`y_fear`) count as their kit face.
- Repeats: a non-neutral face of one character in more than `REPEAT_MAX` (2) shots fails (kai-taste TOKENS "Repeats").
- Rows: `shot.mjs --dbg` rows; a row may carry `sb` (its storyboard frame, for a re-timed picture) and `t` (its second in
  the cut). Shots come from `storyboard.json` and the film's `reel.js` `CUTS`; `--story` borrows another film's story.
- Rig test: limits `HEAD_PCT` 5 (head height to width against round), `BONE_PCT` 3 (the arm's own `ARM_STRETCH`),
  flex -2..160 deg. `RIG_KNOWN` lists the clips over a limit on 17/11 per metric and only shrinks.
- Gates: `rigtest.mjs` runs in gate 3 (Asset lock), `facebeat.mjs {film}` in gate 4 (Shot lock); both exit 1 on a fault.
- The proof page's `view=turn&az=<deg>&at=<frame>` is a still camera round the body (az 0 = from ahead).

## How to get to it (user POV)

At gate 4 of a stick-man film: `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames <first>-<last> --dbg
films/<slug>/review/shot-rows.jsonl`, then `node styles/stick-man/tools/stagegate.mjs films/<slug> 4`.

## Driving it

- `node styles/stick-man/tools/facebeat.mjs films/<slug> [--rows <jsonl>] [--h <frame height>] [--out <dir>]`: writes
  `faces.md` (off-beat faces with their second, faces per character) and `faces.json`.
- `node styles/stick-man/tools/rigtest.mjs [--json <file>] [--sheet <dir>]`: one line per clip, about 12 s without the
  sheet; the sheet is 208 small renders, one at a time (about 10 min).
- Regression: `node --test test/unit/stick-acting-rig.test.mjs`.

## Gotchas

- `--h` must be the height the rows were rendered at (head size is read in pixels).
- The word lists decide what a beat "names": a beat written without emotion words ("the climax") lets more faces pass
  through its shots' briefs only.
- The head squash is the motion layer's squash and stretch (motion.js `headSq`), not the clip: a RIG_KNOWN head row is
  fixed in motion.js or cast.js, never per clip.
