# New film

A user starts a reel with one command and gets `films/<name>/` copied from the starter: a working two-chapter film
(hook + CTA) with Kai and Clawd that renders as-is.

## Sub-features

- `new.create`: copies `styles/kai-hand-draw/starter/` and sets `name` in `src/config.js`.
- `new.guard`: refuses a bad name or an existing folder.

## How to get to it (user POV)

- `/make-reel <topic>` (step 1 of WORKFLOW.md), or directly `node styles/kai-hand-draw/tools/make.mjs new <name>`.

## Driving it with draft.mjs / make.mjs

Preconditions: `films/<name>/` does not exist.

- Create: `node styles/kai-hand-draw/tools/make.mjs new verify-smoke` → prints `✓ films/verify-smoke/ ready`.
- Name set: `grep "name:" films/verify-smoke/src/config.js` → `name: 'verify-smoke'`.
- Guard: run the same `new` again → `✗ … already exists`, exit 1, folder unchanged.
- It renders: `make.mjs films/verify-smoke vo audio` then `draft.mjs films/verify-smoke` → `✓ draft verify PASSED`.

## Gotchas

- Before `vo`, the starter's `src/vo.js` has no timings for this film: the page warns `vo(): "PAINT" #1 is not in
  the voiceover` and the draft fails on "no page errors". Run `vo` first; that failure is correct.
