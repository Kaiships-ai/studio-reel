# Full render and delivery

The deliverable: `films/<name>/<name>.mp4` (720×1280 medium by default; 1080×1920 only after the user's go, BT.709,
−14 LUFS) and `<name>-cover.png`, checked by `make.mjs verify`. The full render is slow (minutes): only when the user
says "full".

## Sub-features

- `full.render`: frames via `core/render/video.mjs`, mux and loudness via `core/render/mux.mjs`, cover frame.
- `full.verify`: size, fps, BT.709, audio, length, LUFS/peak, freeze, black, camera ≤ 20 px/frame, CTA keyword heard.
- `full.preset-test`: a film with `"preset": "test"` in `job.json` (or `REEL_PRESET=test`) renders 270×480 at 12 fps,
  at most 15 s, fast encode; verify checks that size and skips the camera scan.
- `full.medium-default`: no preset renders `medium`, 720×1280 at the film's fps, the whole film, a fast encode; verify
  checks 720×1280 and still runs the camera scan. `reel.mjs` (any style) renders medium too.
- `full.gate`: `full` (1080×1920, lossless frames) renders only when the film has `APPROVED-FULL`, written by
  `node core/approve-full.mjs <film> --by "<who asked, when>"` after the user asks for it; without it every render
  tool stops with "needs the user's go". The TMV kit's `episode/make.mjs --full` stops the same way.

## How to get to it (user POV)

- "render" → `node styles/kai-hand-draw/tools/make.mjs films/<name> render verify` (buyers: `pixi run make …`), medium.
- "full" (the user's own words) → `node core/approve-full.mjs films/<name> --by "…"`, then `REEL_PRESET=full make.mjs films/<name> render verify`.
  `/make-reel` runs it in step 9–10.

## Driving it with draft.mjs / make.mjs

Preconditions: the draft verify passes (don't spend minutes on a film that fails in seconds).

- Run: `make.mjs films/<name> render verify` → every line ✓, `out/check/verify.json`, frames `out/check/final_*.jpg`
  (Read them).
- Files: `ls films/<name>/<name>.mp4 films/<name>/<name>-cover.png`.
- Test preset: `make.mjs new verify-test --preset=test`, then `make.mjs films/verify-test vo audio`, `draft.mjs
  films/verify-test`, `make.mjs films/verify-test render verify`. The render prints `preset test: 270×480 at 12 fps`
  and takes about 9 s for the starter's 5 s (the default render takes about 24 s); verify shows `✓ 270×480 at 12 fps`
  and `preset test: camera scan skipped`. `ffprobe` on the MP4 says `270,480,12/1`.

## Gotchas

- `video.mjs` refuses a second render to the same `--out` (`.lock`); a lock whose pid is gone, or older than 12 h,
  is taken over.
- `--workers` defaults to half the CPU cores (1–4, `kit/env.mjs`).
- A test-preset MP4 is not a deliverable: never hand it over or post it.
- The page still draws at 1080×1920 for the test preset (deviceScaleFactor shrinks the screenshot), so a frame
  costs as much as before: the time saved is the lower fps, the 15 s cap and the encode.
- `--no-asr` (or no faster-whisper in the pixi env) makes the keyword check `–` (skipped), which is not a pass;
  `--no-camscan` drops the camera row.
