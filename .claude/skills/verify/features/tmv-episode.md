# TMV episode (the paid kit's sample episode, cast and character designer)

Files ship from `tmv/`: `episode/` (engine.js, make.mjs, voice.py, index.html, fonts), `episodes/sample/` (episode.json,
index.html, the Kokoro voice baked in `vo/`), `characters/` (cast.js = the three seeds Nova, Rook, Blip; figure.js draws
them) and `character-designer.html`. In the tmv zip there is no `kit/check-reel`: `studio install` renders the sample
episode as its test render (`kit/studio.mjs`).

## Sub-features

- `episode.vo`: `pixi run -e full node episode/make.mjs <ep> vo` → Kokoro per beat (voice from the cast), `vo/vo.wav`,
  `vo/vo.json` (lines, letter-weighted word times). `core/render/reel.mjs vo` uses the same path when kai-hand-draw is absent.
- `episode.render`: `make.mjs <ep> render check` → `<ep>/<name>.mp4` at 540x960 30 fps (ST-77 preview; `--full` only on
  request), checks size, sound, length = voice + 1.4 s, -14 LUFS, no black, no 1.5 s freeze; `out/sheet.jpg`.
- `episode.look` (ST-79): navy stage, two neon lights, rim-lit cast, type system v1 cards, kicker `<SERIES> · EP N`,
  word-by-word captions, HUD chips that roll on change, no end card: the vote card is the last frame.
- `cast.designer`: seeds, parts, colours; "Copy for Claude" copies one sentence plus a cast JSON entry.

## Driving it

`node .claude/skills/verify/journeys.mjs --only=tmv-episode [--zip=<built tmv zip>]` (needs `pixi` on PATH, a few
minutes): builds the zip, unzips into a fresh folder with a space in its path, `pixi run studio install` (sample
episode, every check ✓), doctor, second install no-op, designer screenshots + copied JSON, planted break (a beat for
`nobody` → `"who": "nobody" is not in the cast`). Evidence: `tmv-sample.mp4`, `tmv-sheet.jpg`, `tmv-char-*.png`.
