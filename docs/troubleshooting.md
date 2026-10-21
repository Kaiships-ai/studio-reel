---
title: Troubleshooting
description: The common errors and what fixes them.
group: Help
order: 2
---

First try: tell Claude "setup failed, fix it" and paste the error.

- **`edge-tts failed`**: the voiceover needs an internet connection. Try again. A different voice can be set in
  `vo/script.json` (`.venv/bin/edge-tts --list-voices`, or `.venv\Scripts\edge-tts --list-voices` on Windows).
- **Fonts look plain**: fonts are fetched from Google Fonts when a frame renders. Offline, system fonts are used.
- **Chrome or ffmpeg not found after the folder moved**: run `node setup.mjs` again.
- **Rendering is very slow**: watercolour `fill` shapes are the cost. Use `wash` for flat colour, or fewer shapes.
  On a machine with no GPU add `--soft-gl` to `render.mjs` commands.
- **Five `WebGL: INVALID_OPERATION` warnings** when a page opens are harmless. Any other page error is real.
- **A render was interrupted**: `node render.mjs --reel --resume` continues from the frames already made.

Still stuck? DM @kaiships.ai on Instagram.
