# Stick-man review trust: retakes and calibration

Dev-only tools in `styles/stick-man/tools/`. `retakes.mjs` counts Kai's notes per round of a film, so a note he has
to give twice is seen, and reports PREMISE when one shot and fault kind failed 2 rounds (K3). `firstrun.mjs` keeps the
first-run bench (K2 v1 ≤ 5 notes). `calibrate.mjs` scores a review brief against Kai's private replay set;
`stagegate.mjs` shows a ◇5 `review/final-qa.md` brief's calibration as an advisory row and locks only the gates its
approver signed (Kai at K1 ◇2b and K2 ◇5, an independent reviewer's READY elsewhere).

## Sub-features

- Retake log `films/<slug>/review/retakes.json`: a round fails on more notes than the round before, or on a note that
  re-opens a closed one. Every verdict shows the round's repeat count.
- `calibrate.mjs blind <key> <out> [<brief dir>] [--seed n]`: prompts with neutral ids (`c1`, `ab1`) and a seeded A/B
  order; the seed and the map back to real ids go into the key's `blind` field only.
- `calibrate.mjs score <key> <answers> --record`: the A/B is scored by the cut picked, not its position. Only `--half
  test` can set `calibrated`; `tune` and `all` record an uncalibrated row.
- PREMISE: notes with the same `where` and `kind` (else `class`) on 2 rounds, the latest still open, fail
  `retakes.mjs` and `retakes.mjs --premise` (◇4, ◇5) until `k3: [{ shot, kind, round, pick }]` records Kai's K3 pick.
- `firstrun.mjs add films/<film> --rounds N --minutes M`: one row per episode in `styles/stick-man/bench/first-run.tsv`
  from the v1 round (every note needs a WHOCHECKS `kind` and a root R1-R5); `firstrun.mjs check` (◇1) fails while a
  kind from the previous episode is still checked only by Kai.
- Touchpoints: `GATES.json` `touchpoints` (S1 S2 K1 K2 K3 Post) and each gate's `approver`; an agent approval at a Kai
  gate is refused.
- Who checks what: `whochecks.mjs` checks `WHOCHECKS.json` (each machine tool runs at its gate in `GATES.json`) and that
  the make-reel-stick-man GATES.md block is its render (`--write` regenerates it). `whochecks.mjs map <map.json>` puts
  each of Kai's complaints in one cell and fails when that cell's checker missed it, or a Kai cell has a checker's hit.

## How to get to it (user POV)

A maker runs `node styles/stick-man/tools/review/retakes.mjs films/<slug>` after each round of Kai's notes, and
`node styles/stick-man/tools/gates/stagegate.mjs films/<slug> 5` reads `calibration.json` for the advisory brief row.

## Driving it

- `node --test test/unit/stick-retakes.test.mjs test/unit/stick-whochecks.test.mjs test/unit/stick-touchpoints.test.mjs` covers every rule above with
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
