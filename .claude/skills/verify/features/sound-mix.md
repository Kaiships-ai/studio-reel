# Sound mix

`audio/cues.json` (music, one SFX per visible hit, timed by word) plus the voice become `assets/reel-audio.wav`,
normalised to −14 LUFS.

## Sub-features

- `audio.mix`: `make_audio.py` writes `assets/{music,sfx,reel-audio}.wav` and prints the cue list.
- `audio.level`: −14.0 LUFS on the mix, true peak limited to about −2.2 dBTP (the final file is normalised again by
  `core/render/mux.mjs`).

## How to get to it (user POV)

- Edit `films/<name>/audio/cues.json`, then `node styles/kai-hand-draw/tools/make.mjs films/<name> audio`.

## Driving it with draft.mjs / make.mjs

Preconditions: `vo/vo.json` exists (voice step done).

- Run: `make.mjs films/verify-smoke audio` → cue list, then `assets/reel-audio.wav  <dur> s · -14.0 LUFS · true peak … dBTP`.
- In the reel: `draft.mjs films/verify-smoke` → "has an audio stream" ✓ and "audio length = picture ± 0.1 s" ✓.
  Listen if the change was about sound: play `films/verify-smoke/out/verify/draft.mp4` (macOS `open`, Windows
  `start`, Linux `xdg-open`).
- Level check of the mix itself: `pixi run ffmpeg -hide_banner -nostats -i films/verify-smoke/assets/reel-audio.wav
  -af ebur128=peak=true -f null -` → `I: -14.0 LUFS`.

## Gotchas

- The draft's audio is AAC 96k, unmastered: loudness of the final file is only proven by the full verify.
