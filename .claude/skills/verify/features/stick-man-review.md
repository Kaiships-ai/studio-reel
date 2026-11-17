# Stick-man review trust: retakes and calibration

Two dev-only tools in `styles/stick-man/tools/`. `retakes.mjs` counts Kai's notes per round of a film, so a note he has
to give twice is seen. `calibrate.mjs` scores a review brief against Kai's private replay set; `stagegate.mjs` counts a
◇5 `review/final-qa.md` only when its `brief:` names a brief that passed on the test half.

## Sub-features

- Retake log `films/<slug>/review/retakes.json`: a round fails on more notes than the round before, or on a note that
  re-opens a closed one. Every verdict shows the round's repeat count.
- `calibrate.mjs blind <key> <out> [<brief dir>] [--seed n]`: prompts with neutral ids (`c1`, `ab1`) and a seeded A/B
  order; the seed and the map back to real ids go into the key's `blind` field only.
- `calibrate.mjs score <key> <answers> --record`: the A/B is scored by the cut picked, not its position. Only `--half
  test` can set `calibrated`; `tune` and `all` record an uncalibrated row.
- ◇5 while no brief is calibrated: `review/approvals.json` `"kai-ok": { "review/final-qa.md": { at, note } }` passes the
  judged row as Kai's OK in place of the AI review, printed on every run, and goes stale behind a newer `renders/*.mp4`.
  Once any brief is calibrated, kai-ok no longer counts and the row says so.
- Who checks what: `whochecks.mjs` checks `WHOCHECKS.json` (each machine tool runs at its gate in `GATES.json`) and that
  the make-reel-stick-man SKILL.md block is its render (`--write` regenerates it). `whochecks.mjs map <map.json>` puts
  each of Kai's complaints in one cell and fails when that cell's checker missed it, or a Kai cell has a checker's hit.

## How to get to it (user POV)

A maker runs `node styles/stick-man/tools/retakes.mjs films/<slug>` after each cut, and
`node styles/stick-man/tools/stagegate.mjs films/<slug> 5` reads `calibration.json` for the brief line.

## Driving it

- `node --test test/unit/stick-retakes.test.mjs test/unit/stick-whochecks.test.mjs` covers every rule above with
  fixtures, no video. The whochecks fixture holds the 31 complaint ids of the 16/11 review with their kinds and
  evidence results only; the map with Kai's words is private (`~/.claude/orchestrate/hm-quality/who-checks/`).
- A real calibration run costs paid blind reviewers: one job per clip and per A/B pair. Run it only for a brief change.

## Gotchas

- `calibration.json` is a plain file: a hand edit can mark a brief calibrated. The gate also checks the row's half is
  `test`, but nothing signs the row. Review its diff in the PR.
- Small n: replay set `hm-r2-v1` has five test complaints, one praise item and one A/B pair, so a reviewer that
  guesses the pair still passes it half the time and one item moves the hit rate 20 points. Read a pass as weak
  evidence until the set grows.
- The legacy record (`seed: null`) is the first run, made before the A/B order was seeded: A was always Kai's pick.
