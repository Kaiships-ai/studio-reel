---
name: verify
description: Prove a change to a kai-hand-draw reel (films/<name>/) or to the reel tooling works, fast. Default is a draft verify (270x480 @ 8 fps, about 1 s of wall time per second of reel) that fails on page errors, missing vo() words, wrong length, missing audio, frozen, black or empty scenes, plus a stills sheet to look at. Full 1080x1920 render and verify only when the user says "full". Use after editing a chapter, script, cues, the engine, or before handing a reel over.
---

# verify (studio-reel)

The surface is a film page: `films/<name>/index.html` (a p5 + p5.brush canvas, always 1080x1920) driven
headless by `core/render/page.mjs`, which serves the library root and waits for `window.READY`. The user's
product is the MP4. Run everything from the library root. `core/` and `styles/` are read, never edited.

## Why not `core/render/video.mjs --size 270x480`

`styles/kai-hand-draw/engine/page.css` pins `#out` to `1080px × 1920px`. A smaller viewport screenshots only
the top-left corner (proven: a 270x480 still of the starter shows bare paper and a sliver of the CTA chip). The
smallest correct viewport with the core tools is 1080x1920. `draft.mjs` keeps that viewport, draws each frame full
size, and scales it down inside the page before encoding. The draw itself is the same cost; the savings are fewer
frames (8 fps), small JPEGs, a fast x264 preset, and no mux/loudness/Whisper/camscan.

The `test` preset (`core/preset.mjs`, `"preset": "test"` in `job.json`) takes the other route to a small file: the
page keeps its 1080x1920 viewport and Chromium's deviceScaleFactor (0.25) shrinks the screenshot, so `make.mjs
render verify` on a test film yields a real 270x480 @ 12 fps MP4 (at most 15 s) in about 9 s for the starter.
See `features/full-render.md` → `full.preset-test`.

## Doctor (run first, and whenever anything looks off)

```sh
node .claude/skills/verify/draft.mjs doctor films/<name>
```

Read-only. ✓ for node_modules, python/ffmpeg/ffprobe in this folder's pixi env (`kit/env.mjs`), the film's
`index.html`, `src/config.js`, `src/vo.js`, `vo/vo.json`, `assets/reel-audio.wav`, and that the page reaches `READY`
(prints the GPU: on a Mac it must say Metal; SwiftShader or "software" means no GPU, which works but is several
times slower). Exit 1 on any ✗. A ✗ on the tools means the setup is missing: `pixi run studio install` (or
`pixi run studio doctor` for the buyer-side check). A missing `vo/vo.json` or `reel-audio.wav` means run
`make.mjs <film> vo` / `audio` first.

## Every feature in one run

```sh
node .claude/skills/verify/journeys.mjs [run-id] [--only=voice,chapters] [--full] [--any=films/<reel in another style>]
```

The default before calling a change to the tooling done, about 2 minutes (needs internet for edge-tts). It drives
every file in `features/` on throwaway `films/verify-run*` with the commands a user types, prints `ok:` or `FAIL:`
per step, and exits 1 when any failed. Each break is planted in a copy and must fail with its own message. Run one
at a time: it uses every core, and a second run exits 2 while the first is alive. Without `--full` or `--any` those steps print `skip:`, which is not a pass; say so.

## Launch

Nothing stays running. Each run starts its own static server on 127.0.0.1 (random port) and its own headless
Chromium per worker, and closes them before exiting. Runs on different films can go side by side; two runs
on the same film overwrite each other's `out/verify/`, so give one `--out=`.

A film needs a voice and a mix before it can be verified with sound:

```sh
node styles/kai-hand-draw/tools/make.mjs new <name>                 # only for a new film
node styles/kai-hand-draw/tools/make.mjs films/<name> vo audio      # ~10 s for a 5 s reel (edge-tts needs internet)
```

## Drive: draft verify (the default)

```sh
node .claude/skills/verify/draft.mjs films/<name>      # options: --fps=8 --w=270 --n=6 --workers=4 --out=<dir>
```

Measured on an M5: the 5 s starter in 7 s, the 31 s `rea-xray` reel in 26 s. Exit 0 only when every check is ✓:

| Check | Catches |
|---|---|
| no page errors | `[page]` console errors and warnings, e.g. `vo("WORD") … is not in the voiceover` after a script change, or `[character] hair: "…" is not an option` from a bad `src/character.js`. An uncaught throw stops the run: `[pageerror] <message>` when it happens while the page opens, `✗ the page threw at t = … s: <message>` later. Ignored: optional-file 404s, `WebGL: INVALID_OPERATION`, and `GL Driver Message … Performance` notes |
| draft video 270×480 @ 8 fps | the encode itself |
| has an audio stream | missing `assets/reel-audio.wav` |
| video length = `window.DUR` ± 1 frame; picture = voiceover ± 1/30 s; audio = picture ± 0.1 s | `config.js` duration drift, a stale mix after a new voice |
| no frozen stretch (freezedetect n=0.003 d=0.7) | a whole frame that stops moving for 0.7 s |
| no black frames | a chapter that paints black |
| no empty scene | ≥ 0.5 s where under 0.2 % of pixels outside the caption band (y 1300–1490 of 1920) are ink-dark: a chapter that draws nothing while captions keep running. Healthy kai-hand-draw frames sit at 5–8 %; a cut wipe dips to 0 for one frame. `VERIFY_INK=1` prints every frame's value, to recalibrate on a film that looks different |

Then **open `out/verify/sheet.jpg` with Read** (6 stills spread over the reel, 270 px wide, time-labelled).
The checks do not judge the look: an off-model character, a label in the caption band or a wrong prop is only
visible there. Say what you saw.

## Drive: full (only when the user says "full")

```sh
node styles/kai-hand-draw/tools/make.mjs films/<name> render verify     # buyers: pixi run make films/<name> render verify
```

`--no-asr` skips the Whisper keyword check (it then shows `–`, which is not a pass), `--no-camscan` the camera scan.

The real pipeline: 1080x1920 @ 30 fps, BT.709, −14 LUFS, camscan, Whisper on the CTA keyword, frames in
`out/check/final_*.jpg`. Minutes, not seconds. Never run it on your own initiative.

## Evidence

Draft: `films/<name>/out/verify/` → `draft.mp4` (small, with sound), `sheet.jpg`, `report.json` (`pass`,
`seconds`, every check with its measured detail). The draft also writes the `draft` step of `films/<name>/job.json`
(`running` with `pct` in tens, then `done` or `failed`; schema in `core/README.md`). Full: `films/<name>/<name>.mp4` and `out/check/verify.json`.
`films/` is git-ignored, so evidence never lands in a commit. Quote the ✓/✗ lines and the paths in the reply.

A proof is the real page drawn by the real engine: never stub `vo()`, `chapter()` or `render()`, and never
loosen a threshold to make a film pass. If a check is wrong for a film, say why and recalibrate with
`VERIFY_INK=1` evidence.

`journeys.mjs` writes `films/verify-evidence/<run-id>/`: `transcript.txt` (every command, its output, every `ok:`),
`summary.json`, `sheet.jpg`, `report.json`, `flow.mp4` (the designer, then the reel it produced, with voice). In a
worktree it also copies them to `~/.claude/orchestrate/proof/evidence/<branch>/<run-id>/`, because `films/` goes
when the worktree does.

A video that shows an error, a blank frame or the wrong presenter is a failed proof, not a rough take. A proof goes
the user's path: real commands and the real page, no stubs, no writing a tool's output by hand.

## Proof page

A PR that changes what a user gets ends with one page Kai opens to decide it. Fill
`~/.claude/orchestrate/proof/<pr>/proof.json` and put the media beside it:

```json
{ "pr": 24, "title": "...", "risk": "low|medium|high", "prUrl": "https://github.com/...",
  "youWillSee": ["one thing Kai sees, in his words"], "video": "flow.mp4",
  "states": [{ "name": "Default", "prototype": null, "before": "before.jpg", "after": "after.jpg" }],
  "numbers": [{ "label": "Draft, 5 s reel", "source": "measured", "expected": 7, "app": 7.1, "tolerancePct": 30 }],
  "checks": [{ "label": "journeys: 33 ok, 0 failed", "ok": true }], "cost": "...", "undo": "Revert the PR" }
```

`node .claude/skills/verify/proof-page.mjs ~/.claude/orchestrate/proof/<pr>` fails on a missing file, shrinks the
video (sound kept) and writes `index.html` and `comment.md`. `states` is for a change to a screen: one with no
`prototype` adds a failing check; a change with no screen leaves it empty. Publish `index.html` as a private artifact
with its media, put the URL in `comment.md`, then `gh pr comment <pr> --body-file comment.md`. Kai merges after that.

## Cleanup

`draft.mjs` closes its browsers and server itself, also on failure (`process.exit` tears them down). Nothing to
kill. `journeys.mjs` deletes its `films/verify-run*` at the end and keeps the evidence. Delete only films you created for the test (e.g. a sabotaged copy), never `out/verify/` of a film you
are reporting on, and never another film.

## Proving a check catches a break

Copy the film, break one scene, run the draft, expect exit 1, delete the copy:

```sh
cp -r films/<name> films/<name>-broken && rm -rf films/<name>-broken/out
# edit films/<name>-broken/src/ch/<chapter>.js: call an undefined helper, vo('NOT_SPOKEN'), or `return;` at the top of a scene
# or films/<name>-broken/src/character.js: an option that does not exist, e.g. hair: 'mohawk'
node .claude/skills/verify/draft.mjs films/<name>-broken; echo "exit=$?"      # expect exit=1 and the ✗ that names it
rm -rf films/<name>-broken
```

## Feature map

[`features/README.md`](features/README.md) lists what a user of this repo touches and how to prove each one.
