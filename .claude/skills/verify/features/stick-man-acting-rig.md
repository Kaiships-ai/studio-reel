# Stick-man faces against the story, and the rig test

Two checks for Kai's acting and rig complaints (QA areas M7 and A2). `tools/facebeat.mjs` compares each face the
picture draws with the beat it plays and counts how often each character's face comes back. `tools/rigtest.mjs` plays
every motion-library clip through the real rig and measures the head's shape, the bones' lengths and the knee and elbow
flex in every frame; `--sheet` renders each clip's worst pose from the front, 3/4, side and back.

## Sub-features

- Face per beat: a face whose emotion family (`FAMILY`) the beat never names (`WORDS` over the beat's feel, lines and
  every shot's brief, purpose and picture) fails when held `HOLD` (15) frames on a head at least `MIN_FACE` (3 %) of the
  frame high. Neutral faces (deadpan, focus, stern, suspicious, ...) never fail. Film twins (`y_fear`) count as their kit face.
- Coverage: a storyboard with no shots, or rows whose faces fall in no shot, is PARTIAL (exit 1, the reason on its
  first line), never PASS. A film with no `storyboard.json` stops with exit 2 and names `--story`.
- Repeats: a non-neutral face of one character taken up more than `REPEAT_MAX` (2) times fails (kai-taste TOKENS "Repeats"); a face held on across cuts is one take.
- Rows: `shot.mjs --dbg` rows; a row may carry `sb` (its storyboard frame, for a re-timed picture) and `t` (its second in
  the cut). Shots come from `storyboard.json` and the film's `reel.js` `CUTS`; `--story` borrows another film's story.
- Rig test: limits `HEAD_PCT` 5 (head height to width against round, head not keeping its volume),
  `HEAD_SQUASH_PCT` 15 (same ratio while x·y·z stays within `HEAD_VOL_TOL` 1 % of the clip's first frame: the engine's
  squash and stretch; Kai chose this 17/11, "it is one frame; at real playback nobody notices"), `BONE_PCT` 3 (the arm's own `ARM_STRETCH`),
  flex -2..160 deg. `RIG_KNOWN` lists clips over a limit per metric and only shrinks; empty since the leg-reach fix (PR #132).
- Gates: `rigtest.mjs` runs in gate 3 (Asset lock), `facebeat.mjs {film}` in gate 4 (Shot lock); both exit 1 on a fault.
- The proof page's `view=turn&az=<deg>&at=<frame>` is a still camera round the body (az 0 = from ahead).
- Moving hold (KIT-MICRO): every figure animated from keys (`anim`, motion.js `playActor`) gets `acting.js` `holdLife`
  on top: a 3-4 s breath, two-octave head drift seeded per figure, a weight shift every 24-48 f (hips 3 cm, a tilt and
  glance, almost no nod, the head `HOLD_LAG` 3 f behind), and a settle after each stop, a walk's last step included
  (chest first, head 3 f later). Full while the keys hold, none while they move or on captured (`raw`) keys. A film
  turns it off or up with the style dial `life` (0 off, 0.75 default, up to 2). Measure it on a locked camera:
  `refbench.mjs` "motion while the camera is still" (Rick band 1.21-3.67), and check it reads: a blind A|B of 30-frame
  strips at 30 fps against life 0, with no jitter call.

## How to get to it (user POV)

At gate 4 of a stick-man film: `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames <first>-<last> --dbg
films/<slug>/review/shot-rows.jsonl`, then `node styles/stick-man/tools/stagegate.mjs films/<slug> 4`.

## Driving it

- `node styles/stick-man/tools/facebeat.mjs films/<slug> [--rows <jsonl>] [--h <frame height>] [--out <dir>]`: writes
  `faces.md` (off-beat faces with their second, faces per character) and `faces.json`.
- `node styles/stick-man/tools/rigtest.mjs [--json <file>] [--sheet <dir>]`: one line per clip, about 12 s without the
  sheet; the sheet is 208 small renders, one at a time (about 10 min).
- Regression: `node --test test/unit/stick-acting-rig.test.mjs`; the moving hold: `node --test test/unit/micro-motion.test.mjs`.
- The PR #131 numbers, rerun from saved rows (`D=~/.claude/orchestrate/hm-quality/step4-rows`, its README has the
  join and the shot.mjs commands behind each rows file):
  - `node styles/stick-man/tools/facebeat.mjs $D/story-hm-ep01-r2 --rows $D/v7-rows.jsonl --h 1280 --out /tmp/faces-v7`:
    FAIL, 1 off the beat (1:20.4 y_defiant, SH340), over 2 takes y_strain 5, y_fear 5, y_shock 3, y_worried 3. The rows
    join the dbg rows hm-ep01-r2's builds saved (S1-S3 v5, S4-S5 v7, S6-S7 s6), not a fresh render.
  - `node styles/stick-man/tools/facebeat.mjs films/hm-bible-s5 --rows $D/bible-rows.jsonl --story $D/story-hm-ep01-r2 --h 1280 --out /tmp/faces-bible`:
    PASS, 0 off the beat, most-used face 2 takes. The bible cut has no storyboard of its own; it plays hm-ep01-r2's S4-S5.
  - `node styles/stick-man/tools/rigtest.mjs`: 0 of 52 over a limit, RIG_KNOWN empty (worst bone 2.3 % foreL, Act_DropInTrunk_Once f65).

## Gotchas

- `--h` must be the height the rows were rendered at (head size is read in pixels).
- Gate 4 needs the rows first: `shot.mjs --dbg` is a manual step before `stagegate.mjs`; without them facebeat exits 1.
- Nothing compares `RIG_KNOWN` with `origin/main`: a PR can raise a row and the test still passes. Review its diff.
- The word lists decide what a beat "names": a beat written without emotion words ("the climax") lets more faces pass
  through its shots' briefs only.
- The head squash is the motion layer's squash and stretch (motion.js `headSq`), not the clip; it keeps volume, so it
  counts against 15 %. A head that changes volume is something else and counts against 5 %.
