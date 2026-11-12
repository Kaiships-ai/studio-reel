---
name: make-reel-stick-man
description: Turn a short script or story idea into one 60-80 s vertical (1080x1920, 30 fps) stick-man 3D episode (the locked series length; was 30 s) at the quality of reel 1 "dye pack" - one narrator (Gemini TTS), three.js stick figures acting on spoken words, every line illustrated (sets, cutaways, explainer fx), word-locked captions, SFX and music, measured gates. Use when Kai asks for a stick-man reel, a stickman story reel, or a reel like stick01 / Ricks Clips. Trigger: /make-reel-stick-man
argument-hint: "<slug> <script or idea>"
---

# /make-reel-stick-man

Goal: a fresh agent turns `$ARGUMENTS` into `films/<slug>/renders/<slug>_vN.mp4` where every spoken line is SHOWN (not two people talking), passing every gate, in about 170k tokens and under an hour. Dev only (`kit.manifest` [dev]). Run from the library root with `.pixi/envs/default/bin/node` / `.pixi/envs/default/bin/python` (`node` / `python` below), never `pixi run`. Quality bar: `styles/stick-man/examples/dye-pack/` (reel 1, with its `storyboard.json`).

The work follows the animation pipeline in order, one phase at a time; a phase starts only after the gate before it is
approved by Kai. Never fix a later phase's problem by jumping back into the engine or the gates: go back to the phase
that caused it.

| Phase | # | Step | Command / output | Read first |
|---|---|---|---|---|
| 0 Development | 0 | show bible | the character's model sheet, faces and 12-principles test exist and are approved (Kai, gate A); the film only uses them | `engine/cast.js` (figure), `engine/faces.js` (faces) |
| | 1 | brief + treatment | `node styles/stick-man/tools/new_film.mjs <slug>`, then `BRIEF.md` (goal, viewer, length, what success looks like) and `TREATMENT.md` (DIRECTOR.md section 4: three candidate structures and the choice, logline and arc, benchmark learn / don't learn). A reference is a quality bar, never a shot list | DIRECTOR.md section 4 |
| | | **gate 1: Kai approves brief + treatment** | | |
| 1 Pre-production | 2 | script | `vo/script.json`: 1 narrator, Achird pace 2.9-3.3 words/s; every style starts `fast`; hook in line 1; each line names something drawable | `examples/dye-pack/script.json` |
| | | **gate: Kai approves the script** | | |
| | 3 | voice | `python styles/stick-man/tools/voice.py films/<slug> --samples Achird`, then `--take Achird` → `vo/vo.wav`; re-take up to 3 times, keep the shortest with no ❌ | |
| | | **gate: Kai approves the voice** | | |
| | 4 | align | `python styles/stick-man/tools/align.py films/<slug>` → `vo/words.json`, `vo/voice-qa.md` (❌ = re-take) | |
| | 5 | storyboard | `storyboard.json`: per line what the viewer must SEE, the shot, the set, the key pose of each character; then one still per panel, posed with keys held (`anim` keys with `ease: 'snap'`), `shot.mjs --frames ... --out review/sb_%d.jpg` | REEL_DATA.md (Storyboard) |
| | 6 | animatic | the storyboard stills held for their lines' time on `vo/vo.wav` → `review/animatic.mp4` (ffmpeg concat until a tool exists) | |
| | | **gate 2: Kai approves the animatic; length, story and shots are locked** | | |
| 2 Asset | 7 | missing pieces | a set, prop, fx or pose the animatic needs and the kit lacks goes in the kit with its rule (SETS.md, VERBS.md) | SETS.md, VERBS.md |
| 3 Shot | 8 | layout + blocking | `reel.js` (+ `reel2.js`): cameras from the animatic, each `direct` entry's `why` starts with the shot's PURPOSE (what the viewer must get in its 1-2 s), a clear size (real wide or real close-up), a clean background (face against sky or plain wall; other characters and trains out of frame); an independent agent challenges the layout stills against the animatic and the purposes before Kai sees them; characters as key poses only (`anim`, every key `ease: 'snap'`); stills with `shot.mjs --frames a,b --out <dir>/f_%d.jpg --w 540 --h 960` | REEL_DATA.md, `.claude/skills/animation-principles` |
| | | **gate 3: Kai approves the blocking** | | |
| | 9 | polish | eases, holds, anticipation, cycles (engine/motion.js); preview `shot.mjs --film films/<slug> --frames 0-<last> --report films/<slug>/review/pre-stats.txt --fast 1` | GATES.md |
| | 10 | board | `node styles/stick-man/tools/board.mjs films/<slug> --judge 3` → `review/board.jpg`, `review/board-verdict.json` | GATES.md (judged gate) |
| 4 Post | 11 | sound | `node styles/stick-man/tools/shot.mjs --film films/<slug> --cues films/<slug>/audio/cues.json`, write `audio/music.json` (REEL_DATA.md), then `python styles/stick-man/tools/sound.py films/<slug>` | |
| | 12 | render | `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --mp4 films/<slug>/renders/<slug>_vN.mp4 --audio films/<slug>/audio/mix.wav` | |
| | 13 | gates | `shot.mjs ... --report films/<slug>/review/<slug>_vN-stats.txt --in <mp4>`, then `node styles/stick-man/tools/gates.mjs --report <stats> --in <mp4> --film films/<slug> --out films/<slug>/review/<slug>_vN-gates.txt` | GATES.md |
| | 14 | deliver | `node styles/stick-man/tools/sheet.mjs --in <mp4> --n 30 --out films/<slug>/review/<slug>_vN-sheet.jpg`; fill `LEDGER.md`; send Kai mp4, sheet, board, gates | |
| | | **gate 4: Kai watches the video** | | |

Board before render: a line marked "not shown" is fixed in the storyboard (`still` word) and reel data (a visible fx on the key word), then the board is judged again.

| Rule | Why |
|---|---|
| `<last>` = the "last frame" line of `vo/voice-qa.md`; a beat names a spoken word (`line` + `on`), `f` only before the first word | picture follows the voice |
| A line about a process (light, heat, air, money, inside of a thing) gets an explainer fx or a cutaway on its key word | reel 2: talked about airflow, showed none |
| The lead's acting is keyed by hand in blocking (gate 3); auto-acting from the words is for background characters only; a line where the lead only stands and talks is a FAIL | stick04 judge: poses 3-4/10; rail-gaps: auto-acting read as puppets (Kai 6/10) |
| Layout is challenged by a fresh agent (stills + animatic + purposes) before Kai reviews it | pilot A layout v1: timid mid shots, noisy backgrounds, shots with no clear purpose (Kai) |
| Held props have `userData.grip`; every set has `COLLIDE` boxes; close-ups keep head x 45-55 % | hand-prop gap, collision, framing gates |
| Fast verbs (fist_pump, point, cough, startle, wave_small) carry a built-in ease; never shorten their fades | joint gate ≤ 25 deg/f |
| A new set, prop, fx or verb goes in the kit with its rule (SETS.md template, VERBS.md row); never edit the kit for one film's taste | the next reel reuses it |
| Blender = asset workshop only (export `.glb`); never copy frames from `ref-private/`; never post or upload | one look; rights; posting is Kai's call |

**Gate rule:** Kai sees a video only when `gates.mjs` exits 0 (picture, sound and story gates). A FAIL is fixed in the data or the kit, never by loosening a threshold. After **two** fix rounds on one gate, stop and show Kai the FAIL line with a still of the frame. Log tokens (est. from context growth if no usage line) and minutes per stage in `films/<slug>/LEDGER.md`; over 1.5x the budget, stop and tell Kai.
