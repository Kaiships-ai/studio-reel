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
- Draft by default. `make.mjs <film> render verify` renders medium; 1080x1920 only when the user says "full".
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
- [Full render and delivery](./full-render.md): the medium 720x1280 MP4 and cover; 1080x1920 only after the user's go.
- [Stick-man sound](./stick-man-sound.md): `styles/stick-man/tools/run/mix.py` mixes from the kit's recorded CC0 library; `--mux` keeps the mp4 at −1 dBTP.
- [Stick-man review trust](./stick-man-review.md): the retake log per round, and the reviewer calibration ◇5 needs.
- [Stick-man costume: the hoodie](./stick-man-costume.md): `costume: ['hoodie:grey']` on a stick-man cast entry.
- [Stick-man measured shot gate](./stick-man-shotgate.md): `shotgate.mjs films/<slug>`, run by ◇4 and ◇5, blocks on faults between frames.
- [Setup](./setup.md): `pixi run studio install | doctor`, the buyer's first run, on macOS, Windows and Linux.
- [Progress file](./job-json.md): `films/<name>/job.json` after every step, for Lead Studio.
- [Reel in another style](./any-style.md): `core/render/reel.mjs` builds and checks a reel made with `--style <slug>`.
- [Presenter](./presenter.md): `character-designer.html` → a `character-spec v1` block → `src/character.js`.
- [TMV episode](./tmv-episode.md): the paid TMV kit unzipped fresh installs, renders an episode, drives the cast designer and a two-episode series.
- [TMV release](./tmv-release.md): `release/build.mjs --tier tmv` builds the TMV zip and gates it.
- [Stick-man overlays](./stick-man-overlays.md): boxed labels, ticking clocks, the meter and the dotted path in `engine/overlays.js`.
- [Stick-man show bible](./stick-man-bible.md): `bible/check.mjs` holds a series to its parts catalog, and `shot.mjs` refuses to render a film that fails it.
- [Stick-man camera and cut gate](./stick-man-cut-gate.md): `cutgate.mjs` on the final render blocks ◇5 on cut bursts, short takes, low cameras and cut-off faces.
- [Stick-man previs and temp-music animatic](./stick-man-previs.md): `previs.mjs` cuts a scene or the whole film as a grey 3D blockout with the camera path, cuts vs flights, a Vietnamese label bar and the voice and temp music under it; ◇2b needs its `previs.md`.
- [Stick-man depth](./stick-man-depth.md): lens blur by the lens on every shot, a sky with form, air by distance, and far town rows (`kit/sets/backdrop.js`).
- [Stick-man kit use gate](./stick-man-kituse.md): `kituse.mjs` blocks ◇4 and ◇5 of a film with no `life`, no far backdrop, no sound plan, no credited kit music or no Rick bench of its final, unless `DECISIONS.json` waives it.
- [Stick-man render tiers](./stick-man-render-tiers.md): `shot.mjs --tier dbg|still|proof|review|final` renders for a purpose; tier mp4s are cached by their inputs, renders hold a lock, and `render/pro.mjs` runs them on the Mac Pro.
- [Stick-man face style s2](./stick-man-face-style.md): every film draws its faces in s2, the rubber style Kai approved on Hot Money reel 1, unless its reel.js sets `faceStyle: 'kit'` (the old kit faces, exactly).
