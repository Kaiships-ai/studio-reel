# Presenter

Buyers design the human presenter in `character-designer.html` (repo root, opens offline by double-click), press
"Copy for Claude" and paste the `character-spec v1` block into Claude Code; `/make-reel` writes it into the film's
`src/character.js` as `const CHARACTER = {…}`, which `engine/kaip.js` draws. No spec → the default presenter, drawn
exactly as before the feature existed.

## Sub-features

- `presenter.designer`: pick parts (skin, eyes, brows, hair + colour, facial hair, glasses, accessory, top, colours),
  Randomize, Reset, Copy for Claude (falls back to selecting the text when the clipboard is refused).
- `presenter.spec`: every option in the page maps to a value `kaip.js` accepts; the allowed values are listed at the
  top of the starter's `src/character.js`.
- `presenter.guard`: an unknown value prints a `[character] <key>: "<v>" is not an option` page warning and falls
  back to the default, so the draft fails.

## How to get to it (user POV)

- Double-click `character-designer.html`, copy, paste into Claude Code (`.claude/skills/make-reel/SKILL.md`, "Using a
  character spec").

## Driving it with draft.mjs / make.mjs

Preconditions: a film with voice and mix done.

- Page: load it headless with Playwright from `node_modules` (`page.goto('file://…/character-designer.html')`),
  click "Randomize", read the `textarea` → starts with `character-spec v1`; 0 page errors; no horizontal scroll at
  390 px.
- Spec in a film: change values in `films/<name>/src/character.js` (e.g. `hair: 'long', glasses: 'square'`), run
  `draft.mjs films/<name>` → PASSED, and the sheet shows the new presenter.
- Guard: `hair: 'mohawk'` on a copy → ✗ "no page errors" naming `[character] hair`.

## Gotchas

- The page's preview is an approximation (front pose, flat colour); the film is the truth: read the sheet.
- Hats hide some hair (a cap or beanie covers a bun, spikes, the top of curly hair).
- `name` is not drawn; it is what the script, captions and storyboard call the presenter.
