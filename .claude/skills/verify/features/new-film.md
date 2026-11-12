# New film

A user starts a reel with one command and gets `films/<name>/` copied from the starter: a working film (two chapters,
`hook` and `cta`, both in `src/ch/c1_hook.js`, with shared props in `src/ch/c0_props.js`) with the presenter and
Clawd that renders as-is. The presenter comes from `src/character.js` (see [Presenter](./presenter.md)).

## Sub-features

- `new.create`: copies `styles/kai-hand-draw/starter/`, sets `name` in `src/config.js`, and starts `job.json` with
  `script` running (`--preset=test` stores the preset).
- `new.guard`: refuses a bad name or an existing folder.
- `new.presenter`: the film gets the starter's `src/character.js` (the default presenter); `index.html` loads it, and
  no shipped page loads `engine/kai-v3.js`.

## How to get to it (user POV)

- `/make-reel <topic>` (step 1 of WORKFLOW.md), or directly `node styles/kai-hand-draw/tools/make.mjs new <name>`.

## Driving it with draft.mjs / make.mjs

Preconditions: `films/<name>/` does not exist.

- Create: `node styles/kai-hand-draw/tools/make.mjs new verify-smoke` → prints `✓ films/verify-smoke/ ready`.
- Name set: `grep "name:" films/verify-smoke/src/config.js` → `name: 'verify-smoke'`.
- Guard: run the same `new` again → `✗ … already exists`, exit 1, folder unchanged; `new Bad_Name` → the usage
  line, exit 1.
- Presenter: `ls films/verify-smoke/src/character.js` exists; `grep -c kai-v3 films/verify-smoke/index.html` → 0.
- It renders: `make.mjs films/verify-smoke vo audio` then `draft.mjs films/verify-smoke` → `✓ draft verify PASSED`.

## Gotchas

- `new` works before the setup: only the other steps need the pixi env.
- Before `vo`, the starter's `src/vo.js` has no timings for this film: the page warns `vo(): "PAINT" #1 is not in
  the voiceover` and the draft fails on "no page errors". Run `vo` first; that failure is correct.
