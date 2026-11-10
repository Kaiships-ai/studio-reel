---
name: make-reel-stick-man
description: Turn a short script or story idea into one 30 s vertical (1080x1920, 30 fps) stick-man 3D reel at the quality of reel 1 "dye pack" - one narrator (Gemini TTS), three.js stick figures acting on spoken words, every line illustrated (sets, cutaways, explainer fx), word-locked captions, SFX and music, measured gates. Use when Kai asks for a stick-man reel, a stickman story reel, or a reel like stick01 / Ricks Clips. Trigger: /make-reel-stick-man
argument-hint: "<slug> <script or idea>"
---

# /make-reel-stick-man

Goal: a fresh agent turns `$ARGUMENTS` into `films/<slug>/renders/<slug>_vN.mp4` where every spoken line is SHOWN (not two people talking), passing every gate, in about 170k tokens and under an hour. Dev only (`kit.manifest` [dev]). Run from the library root with `.pixi/envs/default/bin/node` / `.pixi/envs/default/bin/python` (`node` / `python` below), never `pixi run`. Quality bar: `styles/stick-man/examples/dye-pack/` (reel 1, with its `storyboard.json`).

| # | Stage | Command / output | Read first |
|---|---|---|---|
| 1 | script | `node styles/stick-man/tools/new_film.mjs <slug>`, then `vo/script.json`: 1 narrator, Achird pace 2.9-3.3 words/s, so 95-100 words for 30 s; every style starts `fast`; hook in line 1; each line names something drawable | `examples/dye-pack/script.json` |
| | **gate: Kai approves the script** | | |
| 2 | voice | `python styles/stick-man/tools/voice.py films/<slug> --samples Achird`, then `--take Achird` → `vo/vo.wav`; takes vary ±2 s: re-take up to 3 times, keep the shortest with no ❌ | |
| | **gate: Kai approves the voice** | | |
| 3 | align | `python styles/stick-man/tools/align.py films/<slug>` → `vo/words.json`, `vo/voice-qa.md` (❌ = re-take) | |
| 4 | storyboard | `storyboard.json`: per line what the viewer must SEE, shot, set, props / fx, `still` word; ≥ 3 sets or cutaways, ≤ 2 lines alike, ≥ 40 % with props / fx | REEL_DATA.md (Storyboard) |
| 5 | reel data | `reel.js` (+ `reel2.js` for more acts) built to the storyboard; missing set, prop or fx → SETS.md, VERBS.md; check stills with `shot.mjs --frames a,b --out <dir>/f_%d.jpg --w 540 --h 960` (`--help`) | REEL_DATA.md, VERBS.md, SETS.md |
| 6 | preview | `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --report films/<slug>/review/pre-stats.txt --fast 1` (top 5 joint pops per actor); fix before the board | GATES.md |
| 7 | board | once, after preview: `node styles/stick-man/tools/board.mjs films/<slug> --judge 3` → `review/board.jpg`, `review/board-verdict.json` (3 headless Sonnet reviews, 2 of 3 = shown, ~4.5k tokens each) | GATES.md (judged gate) |
| 8 | sound | `node styles/stick-man/tools/shot.mjs --film films/<slug> --cues films/<slug>/audio/cues.json`, write `audio/music.json` (REEL_DATA.md), then `python styles/stick-man/tools/sound.py films/<slug>` | |
| 9 | render | `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --mp4 films/<slug>/renders/<slug>_vN.mp4 --audio films/<slug>/audio/mix.wav` | |
| 10 | gates | `shot.mjs ... --report films/<slug>/review/<slug>_vN-stats.txt --in <mp4>`, then `node styles/stick-man/tools/gates.mjs --report <stats> --in <mp4> --film films/<slug> --out films/<slug>/review/<slug>_vN-gates.txt` | GATES.md |
| 11 | deliver | `node styles/stick-man/tools/sheet.mjs --in <mp4> --n 30 --out films/<slug>/review/<slug>_vN-sheet.jpg` (one tile a second); fill `LEDGER.md`; send Kai mp4, sheet, board, gates | |
| | **gate: Kai watches the video** | | |

Board before render: a line marked "not shown" is fixed in the storyboard (`still` word) and reel data (a visible fx on the key word), then the board is judged again.

| Rule | Why |
|---|---|
| `<last>` = the "last frame" line of `vo/voice-qa.md`; a beat names a spoken word (`line` + `on`), `f` only before the first word | picture follows the voice |
| A line about a process (light, heat, air, money, inside of a thing) gets an explainer fx or a cutaway on its key word | reel 2: talked about airflow, showed none |
| Held props have `userData.grip`; every set has `COLLIDE` boxes; close-ups keep head x 45-55 % | hand-prop gap, collision, framing gates |
| Fast verbs (fist_pump, point, cough, startle, wave_small) carry a built-in ease; never shorten their fades | joint gate ≤ 25 deg/f |
| A new set, prop, fx or verb goes in the kit with its rule (SETS.md template, VERBS.md row); never edit the kit for one film's taste | the next reel reuses it |
| Blender = asset workshop only (export `.glb`); never copy frames from `ref-private/`; never post or upload | one look; rights; posting is Kai's call |

**Gate rule:** Kai sees a video only when `gates.mjs` exits 0 (picture, sound and story gates). A FAIL is fixed in the data or the kit, never by loosening a threshold. After **two** fix rounds on one gate, stop and show Kai the FAIL line with a still of the frame. Log tokens (est. from context growth if no usage line) and minutes per stage in `films/<slug>/LEDGER.md`; over 1.5x the budget, stop and tell Kai.
