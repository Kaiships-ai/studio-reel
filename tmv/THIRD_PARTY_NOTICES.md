# Third-party notices

How we make Ten Million Views is built on open-source work. This file lists the code it is derived from, the components that ship
in the zip or are downloaded when you install it, and their licences. This kit's own code is under the MIT
licence in [`LICENSE`](LICENSE).

## Lemo-Opuscar (MIT)

This kit is derived from Lemo-Opuscar by LemoLab: the shared toolkit in `core/`, the guides
(`AGENTS.md`) and every style in `styles/`.

```text
MIT License

Copyright (c) 2026 LemoLab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The demo films of the Lemo-Opuscar styles and their stills (posters in `styles/<slug>/`) were released by LemoLab
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): demo films by LemoLab. Third-party assets inside
each demo keep their own licences, listed in that demo's `CREDITS` file.

## story-skills (MIT)

The writing skills in `.claude/skills/` named `premise-workshop`, `character-management`, `worldbuilding`,
`interactive-fiction`, `research`, `reader-panel`, `chapter-writing`, `theme-craft`, `plot-structure`, `genre-craft`,
`submission`, `line-editing`, `feedback-triage`, `story-init` and `story-maintenance` (with its bundled `story` CLI,
`scripts/story.js`) are story-skills 0.24.1 by Daniel Dewhurst, shipped unchanged. Each of those
folders carries a copy of its `LICENSE`.

```text
MIT License

Copyright (c) 2026 Daniel Dewhurst

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## The hand-draw presenter (`styles/kai-hand-draw/engine/core.js`, `engine/kaip.js`)

`engine/core.js`, the drawing engine `episode/make.mjs styles` draws the hand-draw presenter with, comes from
ClaudeAnimationBase by John Heibel. The notice in the source file reads:

```text
From ClaudeAnimationBase (MIT, (c) 2026 John Heibel).
```

```text
MIT License

Copyright (c) 2026 John Heibel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## The 3D room and base figure (`episode/assets/room.glb`, `characters/jay.glb`)

- Both files were made for the Ten Million Views episode 1 film by Kaiships and exported from Blender (each file's
  `asset.generator` reads "Khronos glTF Blender I/O v5.2.41"). Neither contains an image or texture: every surface is a
  plain colour material. They ship under this kit's `LICENSE`.
- `room.glb` still holds that film's story props (pinned notes, a framed photo, a badge, a pizza box logo, the scene
  `World_Jay`); the episode engine hides them (`episode/main.js`).
- `jay.glb`'s skeleton uses Mixamo's bone names (`mixamorig:Hips`, ...). It has no animation clips; the kit poses it in
  code (`characters/rig.js`).

## Components installed or downloaded with this kit

`pixi run studio install` puts these into this folder (`.pixi/`, `node_modules/`); each keeps its own licence,
which you can read in its installed package.

| Component | Used for | Licence |
|---|---|---|
| [pixi](https://pixi.sh) | the installer that sets up everything below | BSD-3-Clause |
| [Node.js](https://nodejs.org) (conda-forge) | running the render and check tools | MIT and others (see its LICENSE) |
| [Python](https://www.python.org) (conda-forge) | sound, mix, subtitles, voice tools | PSF-2.0 |
| [ffmpeg](https://ffmpeg.org) (conda-forge GPL build) | encoding, muxing, loudness | GPL-2.0-or-later; downloaded at install, not in the zip |
| [p5.js](https://p5js.org) | drawing in the browser | LGPL-2.1 |
| [p5.brush](https://github.com/acamposuribe/p5.brush) | brush strokes | MIT |
| [three.js](https://threejs.org) | 3D styles | MIT |
| [Playwright](https://playwright.dev) (`playwright-core`) and its headless Chromium | rendering pages frame by frame | Apache-2.0 (Chromium: BSD-3-Clause and others) |
| [NumPy](https://numpy.org) | audio synthesis and analysis | BSD-3-Clause (with 0BSD, MIT, Zlib, CC0-1.0 parts) |
| [SciPy](https://scipy.org) | filters and signal processing | BSD-3-Clause |
| [soundfile](https://github.com/bastibe/python-soundfile) | reading and writing WAV/FLAC | BSD-3-Clause |
| [soxr](https://github.com/dofuuz/python-soxr) | resampling | LGPL-2.1-or-later |
| [Pillow](https://python-pillow.org) | contact sheets and images | MIT-CMU (HPND) |
| Gemini TTS (Google, `generativelanguage.googleapis.com`) | the narrator's voice, called with your own AI Studio key | Google's Gemini API terms |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | the speech-to-text voice check | MIT |

### Asset packs (`pixi run fetch …`)

The packs listed in [`kit/assets.json`](kit/assets.json) (`hdri`, `instruments-freepats`,
`instruments-karoryfer`, `instruments-salamander`, `instruments-vcsl`, `instruments-vsco2ce`) are downloaded from the
Lemo-Opuscar asset release by LemoLab; they are not in the zip.

- `hdri`: HDRIs from [Poly Haven](https://polyhaven.com), CC0 (sources in `core/assets/polyhaven/SOURCES.md`).
- `instruments-*`: free sample libraries (VSCO 2 CE, VCSL, Salamander, FreePats, Karoryfer). Each library keeps its
  own `LICENSE`/`README` inside `core/audio/instruments/<lib>/`; follow those when you use a sample in a film
  (`sampler.py`'s `credits()` writes the `CREDITS` lines).

### Fonts

| Font | Where | Licence |
|---|---|---|
| JetBrains Mono (The JetBrains Mono Project Authors) | `episode/fonts/` | SIL Open Font License 1.1 (`OFL-jetbrainsmono.txt`) |
| Inter Tight (The Inter Project Authors) | `episode/fonts/` | SIL Open Font License 1.1 (`OFL-intertight.txt`) |
| Permanent Marker | `styles/kai-hand-draw/engine/fonts/` | Apache License 2.0 (`LICENSE-PermanentMarker.txt`) |
| Shantell Sans (The Shantell Sans Project Authors) | `styles/kai-hand-draw/engine/fonts/` | SIL Open Font License 1.1 (`OFL-ShantellSans.txt`) |
| ZCOOL KuaiLe, Fredoka, Lilita One, IM Fell English (subsets) | `core/fonts/` | SIL Open Font License 1.1 (`core/fonts/OFL.md`) |

Fonts and other assets used by individual style demos are listed in each demo's `CREDITS` file.

### Style showcase images (`styles/<slug>/showcase.jpg`)

Made by Kaiships Studio with each style's own engine. Fonts are SIL Open Font License 1.1 (Google Fonts). Imagery
used inside three of them:

- `satellite-briefing`: NASA Black Marble 2016 (Suomi NPP VIIRS) via NASA GIBS, free to reuse with credit (credited in the image).
- `microscope`: CMU-1.svs, OpenSlide test data (Carnegie Mellon University), CC0 1.0.
- `briefing-board`: "Ring Light 25280737679.jpg" (Serhan Meewisse) and "Laptop and a mug (Unsplash).jpg" (Ryan Riggins), Wikimedia Commons, CC0 1.0.
