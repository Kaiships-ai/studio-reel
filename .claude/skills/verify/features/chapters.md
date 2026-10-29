# Chapters on screen

What the viewer sees: each chapter in `src/ch/*.js` paints the 1080x1920 frame as a pure function of time, with
captions, cast, props, camera and cut wipes. This is what most edits change, and what the draft verify is for.

## Sub-features

- `ch.runs`: every frame renders without a page error, a `vo()` warning or a `[character]` warning.
- `ch.length`: picture length = voiceover.
- `ch.alive`: no frozen, black or empty (ink-less) stretch.
- `ch.preset`: a test-preset film (`"preset": "test"` in `job.json`) is drafted up to 15 s; its length row reads
  `video length = min(window.DUR, 15 s)` and `report.json` has `"preset": "test"`.
- `ch.look`: the stills sheet shows the cast on model, nothing in the caption band, the intended staging.

## How to get to it (user POV)

- Edit `films/<name>/src/ch/*.js`, `src/config.js`, `src/character.js` or `index.html`, then verify. In a browser:
  `index.html?studio` scrubs the film (not needed for proof).

## Driving it with draft.mjs / make.mjs

Preconditions: voice and mix done (`doctor` all ✓).

- Draft: `node .claude/skills/verify/draft.mjs films/<name>` → every row ✓, `✓ draft verify PASSED in <s>`, exit 0.
- Look: Read `films/<name>/out/verify/sheet.jpg`; for a specific moment add frames with
  `node styles/kai-hand-draw/tools/look.mjs films/<name> --sheet=1.2,1.5 --w=270 --out=films/<name>/out/check/x.jpg`.
- Break proofs (on a copy, see SKILL.md): an undefined helper → `✗ the page threw at …`, exit 1;
  `vo('NOT_SPOKEN')` → ✗ "no page errors"; `return;` at the top of a scene → ✗ "no empty scene" with its time range; `hair: 'mohawk'` in
  `src/character.js` → ✗ "no page errors" naming `[character] hair`.

## Gotchas

- Never use `core/render/{still,video}.mjs --size` smaller than 1080x1920 on these pages: page.css pins the canvas,
  so a small viewport crops to the top-left corner and still "passes" a size check.
- Off a Mac the GPU line is not Metal: the system GPU, or SwiftShader when there is none (CI, VMs). It renders the
  same, slower; `STUDIO_ANGLE` overrides the backend.
- A scene can be wrong and still pass every check (off-model, wrong prop): the sheet is part of the proof.
- The empty-scene threshold (0.2 % ink) fits this style; `VERIFY_INK=1` prints per-frame values to recalibrate.
