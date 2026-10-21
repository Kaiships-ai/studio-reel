# Kaiships studio on Lemo-Opuscar

This repository is [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT) with the Kaiships reel kit
added as one more style, `styles/kai-hand-draw`. Lemo's tested toolkit does the rendering, voice checks and
mastering; our style brings the look, the cast (Clawd, Kai), the reel format and its quality checks.

## What is whose

| Part | Owner | Rule |
|---|---|---|
| `core/` (render, tts, audio, lib), `DIRECTOR.md`, `TECHNIQUE.md`, `MY-STYLES.md`, `styles/<lemo styles>/`, `styleboard/`, `plugin/`, `tools/` | Lemo upstream | Don't edit. Take updates with `git fetch lemo && git merge lemo/main`. A fix we need goes upstream or into our style. |
| `styles/kai-hand-draw/` (engine, tools, guides, starter, demo) | Kaiships | Ours to change. A change here is a library change: re-run the demo (`make.mjs styles/kai-hand-draw/demo`) before committing. |
| `AGENTS.md` (the Kaiships section), `.claude/`, `KAISHIPS.md`, `.gitignore` (the Kaiships block) | Kaiships | Small, marked additions to upstream files, so merges stay easy. |
| `kaiships/` | Kaiships | The standalone kit's archived buyer docs (to repackage). |
| `films/<name>/` | each reel | Git ignores it. A reel never edits anything outside its folder. |

## How the style uses the core

| Step | Tool | From |
|---|---|---|
| frames | `core/render/video.mjs <film> --size 1080x1920 --fps 30` (page contract `window.render(t)`, `READY`, `DUR`) | core |
| check images | `tools/look.mjs` (sheets, strips, world-tracking crops, stills, clips, camera scan) on `core/render/page.mjs` | ours on core |
| voice | `tools/make_vo.py` (edge-tts with word timings, per-line `rate`/`say`), `tools/check_vo.py` (voice rules) | ours |
| voice check | `core/tts/asr_check.py` (Whisper, line by line, `asr` overrides) | core |
| music + SFX | `tools/make_audio.py` (cue-driven numpy score, word-timed SFX, ducking) | ours |
| master | `core/render/mux.sh` (two-pass loudnorm −14 LUFS, BT.709 via `LEMO_COLOR`) | core |
| verify | `tools/make.mjs verify` (size, fps, BT.709, length, LUFS, freeze, black, camera ≤ 20 px/frame, keyword heard) | ours |

## Updating from upstream

```sh
git fetch lemo
git merge lemo/main                 # generated files (README counts, styleboard/index.html, styles/README.md) may conflict:
python3 styleboard/build.py         # take theirs, then regenerate them with our style included
node styles/kai-hand-draw/tools/make.mjs styles/kai-hand-draw/demo   # the demo must still pass verify
```

Making a reel: [`styles/kai-hand-draw/WORKFLOW.md`](styles/kai-hand-draw/WORKFLOW.md), or `/make-reel <topic>`.
