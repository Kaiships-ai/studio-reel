# Full render and delivery

The deliverable: `films/<name>/<name>.mp4` (1080x1920 @ 30 fps, BT.709, −14 LUFS) and `<name>-cover.png`, checked
by `make.mjs verify`. Slow (minutes); run only when the user says "full" or the reel is being handed over.

## Sub-features

- `full.render`: frames via `core/render/video.mjs`, mux and loudness via `core/render/mux.mjs`, cover frame.
- `full.verify`: size, fps, BT.709, audio, length, LUFS/peak, freeze, black, camera ≤ 20 px/frame, CTA keyword heard.

## How to get to it (user POV)

- "full" → `node styles/kai-hand-draw/tools/make.mjs films/<name> render verify` (buyers: `pixi run make …`).
  `/make-reel` runs it in step 9–10.

## Driving it with draft.mjs / make.mjs

Preconditions: the draft verify passes (don't spend minutes on a film that fails in seconds).

- Run: `make.mjs films/<name> render verify` → every line ✓, `out/check/verify.json`, frames `out/check/final_*.jpg`
  (Read them).
- Files: `ls films/<name>/<name>.mp4 films/<name>/<name>-cover.png`.

## Gotchas

- `video.mjs` refuses a second render to the same `--out` (`.lock`); a lock whose pid is gone, or older than 12 h,
  is taken over.
- `--workers` defaults to half the CPU cores (1–4, `kit/env.mjs`).
- `--no-asr` (or no faster-whisper in the pixi env) makes the keyword check `–` (skipped), which is not a pass;
  `--no-camscan` drops the camera row.
