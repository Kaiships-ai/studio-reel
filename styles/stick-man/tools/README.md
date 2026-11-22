# tools: the stick-man commands, one folder per stage of the work

Run every tool from the repo root: `node styles/stick-man/tools/<folder>/<tool>.mjs` (`--help` where a tool has it).

| Folder | What it holds |
|---|---|
| `run/` | make an episode's pieces: `new_film.mjs`, `status.mjs`, `logline.mjs`, `shotlist.mjs`, voice (`voice.py`, `align.py`, `pause.py`), sound (`mix.py`, `sound*.py`), `previs.mjs`, `animatic.mjs`, `camtry.mjs`, kit pieces from Blender and mocap (`export_glb.py`, `backdrop_blend.py`, `mocap_*`) |
| `render/` | frames from a reel: `shot.mjs` (every render; tiers in `tiers.mjs`, cache, the machine lock, `pro.mjs` for the Mac Pro), `pageserver.mjs`, `reel_load.mjs`, `renders.mjs`, `sheet.mjs` |
| `gates/` | the measured checks: `GATES.json` + `stagegate.mjs`, `WHOCHECKS.json` + `whochecks.mjs`, and every gate tool (`prepro`, `shotgate`, `cutgate`, `colourgate`, `readgate`, `soundgate`, `motionlib`, `rigtest`, ...) |
| `review/` | judged and AI review: `board.mjs`, `judge.mjs`, `calibrate.mjs`, `claude_headless.mjs`, `abtest.mjs`, `refbench.mjs`, `retakes.mjs`, `taste.mjs`, `microanim.mjs` |
| `series/` | once per series or across episodes: `facesheet.mjs` (S2), `firstrun.mjs` (the first-run bench), `retention.mjs` |

Tool files import each other by alias (`#tools/render/shot.mjs`); see `../kit/README.md`.
