# studio-reel verification map

The maintained source for proving the user-facing behavior of the Kaiships reel studio: a `kai-hand-draw` film in
`films/<name>/` goes from script to MP4. Read this index, then use the matching feature file as the recipe.

## Baseline preconditions

- Run from the library root (the folder with `pixi.toml`). If `pixi` is not found, it is in `~/.pixi/bin/`.
- Setup done: `pixi run studio doctor` all ✓ (else `pixi run studio install`).
- `node .claude/skills/verify/draft.mjs doctor films/<name>` is all ✓ (on a Mac the GPU line says Metal).
- A throwaway film for tests: `node styles/kai-hand-draw/tools/make.mjs new verify-smoke` (fails if it exists;
  reuse it then). Never use a film the user is working on as a sabotage target; copy it.

## Driving conventions

- The harness is `journeys.mjs` (every feature below, `--only=<file name>` for one), `draft.mjs` (draft verify) and
  `make.mjs` (the real pipeline steps). All drive the real page through `core/render/page.mjs`; nothing is mocked.
- A feature change updates its file here and its journey, which must fail when that step breaks.
- Draft by default. `make.mjs <film> render verify` (full) only when the user says "full".
- Treat every command as literal.

## Proof and skip reporting

- Quote the ✓/✗ lines, the exit code and the evidence paths (`out/verify/report.json`, `sheet.jpg`).
- Open `sheet.jpg` with Read and say what is on it: the checks don't judge the look.
- A step that needs the network (edge-tts) and fails offline is reported as unverified, not as passed.

## Feature entry contract

Each feature file: H1 title, one paragraph, then `Sub-features`, `How to get to it (user POV)`,
`Driving it with draft.mjs / make.mjs`, `Gotchas`.

## Features

- [New film](./new-film.md): `make.mjs new <name>` gives a working two-chapter film.
- [Voice](./voice.md): `vo/script.json` → voice, timings, voice rules, Whisper.
- [Sound mix](./sound-mix.md): `audio/cues.json` → `assets/reel-audio.wav` at −14 LUFS.
- [Chapters on screen](./chapters.md): the picture, proven by the draft verify and the stills sheet.
- [Full render and delivery](./full-render.md): the 1080x1920 MP4 and cover, only on "full".
- [Setup](./setup.md): `pixi run studio install | doctor`, the buyer's first run, on macOS, Windows and Linux.
- [Progress file](./job-json.md): `films/<name>/job.json` after every step, for Lead Studio.
- [Reel in another style](./any-style.md): `core/render/reel.mjs` builds and checks a reel made with `--style <slug>`.
- [Presenter](./presenter.md): `character-designer.html` → a `character-spec v1` block → `src/character.js`.
