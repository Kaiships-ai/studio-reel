# core/: the shared production tools

Command reference for `core/`. How the pieces fit together is in [`TECHNIQUE.md`](../TECHNIQUE.md). Run commands from the library root; Python is run as `pixi run python`. `<demo>` is any folder with an `index.html`.

## Install

| Command | What it does |
|---|---|
| `pixi run studio install` | first-time setup: node, Python, ffmpeg, npm packages and the headless browser, all inside this folder |
| `pixi run studio doctor` | checks the setup and names what is missing |
| `pixi run studio linux-deps` | Linux only: the system libraries the headless browser needs |
| `pixi run -e full python …` | the optional full environment: kokoro-onnx (offline Kokoro voice, `tts.py`) and numba (`pluck.py`); not available on Intel Macs. `sampler.py` needs only the default environment |
| `pixi run fetch voice` \| `hdri` \| `instruments <lib>` \| `instruments all` | Kokoro model · HDRIs · a sample library (`freepats`, `karoryfer`, `salamander`, `vcsl`, `vsco2ce`) |

Sizes are in TECHNIQUE.md §1.

## The page contract

| Global | Required | Meaning |
|---|---|---|
| `window.READY = true` | yes | set once fonts and images are loaded |
| `window.render(t)` | yes | draw the frame at second `t`; deterministic |
| `window.DUR` | video, events, readcheck | film length in seconds |
| `window.EV = [{t, type, …}]` | no | sound and cue events, exported by `events.mjs` |
| `window.TEXTS(t)` | readcheck | `[{id, text, x0, y0, x1, y1}]`: every on-screen text visible at `t`, with its box in pixels, number badges and labels included. Report an element's **full** text from its first visible frame (a typewriter that reports only the typed letters fails the check). Burned-in captions are left out, or marked `caption: true` |
| `window.BOXES(t)` | no (reelcheck) | `[{id, x0, y0, x1, y1}]`: what matters on screen at `t` besides text (the subject, a phone, a chart, the continuity prop), for reelcheck's safe-zone check |
| `?cover` in `location.search` | no (reel.mjs) | the cover still is rendered with it: hide the burned-in captions |

The viewport is 1920×1080 at device scale 1, or `--size WxH`. `--q 'k=v&…'` reaches the page as `location.search`. A page error, or an HTTP error on a script, module or the page, stops the tool (exit 1). Other missing files (fetch, images, fonts) print `optional file missing: <URL>` and the tool carries on. The tools wait up to 180 s for `window.READY`.

## Render

| Command | What it does |
|---|---|
| `node core/render/still.mjs <demo> <t> [<t> …] [--range a:b:step] [--prefix t_] [--out dir] [--quality 92]` | review stills as JPEGs (`--quality` 1–100) (default `<demo>/stills/t_<t>.jpg`) |
| `node core/render/video.mjs <demo> [--fps 24] [--workers 3] [--out <demo>/out/video.mp4] [--lossless]` | every frame to a video; up to 6 workers for a single render. Each parallel version needs its own `--out`. `--lossless`: PNG frames into a lossless full-range 4:4:4 file, for fine coloured dots (riso, halftone, dither); about 3× slower and 3× the disk |
| `node core/render/events.mjs <demo> [--out <file>]` | export `{dur, ev}` to `<demo>/events.json` |
| `node core/render/readcheck.mjs <demo> [--step 0.04] [--latin-cps 15] [--cjk-cps 4.5] [--pad 1.5] [--min 1.5]` | reading-time check (below) |
| `pixi run python core/render/sheet.py out.jpg img… [--cols 4] [--w 480]` | contact sheet |
| `pixi run python core/render/srt.py cues.json out.srt` | subtitles from `[{t0, t1, text}]` |
| `node core/render/mux.mjs video.mp4 mix.wav out.mp4 [fps=24] [grain=2]` | mux and master (below) |
| `node core/render/reelcheck.mjs <film> [--mp4 f] [--length s] [--keyword WORD] [--fps 30] [--no-files]` | delivery checks for a finished vertical reel in any style (below) |
| `node core/render/reel.mjs <film> [vo] [audio] [render] [check] [--workers N] [--cover s] [--grain N] [--no-asr] [--final]` | builds a vertical reel in any style (below) |
| `node core/job.mjs <film> <step> <status> [--files=a,b] [--pct=N] [--qa=9/9] [--style=<slug>] [--type=<name>]` | writes one step of `films/<slug>/job.json`, the run's progress file (below) |

All four page tools take `--size WxH` (default `1920x1080`, even numbers) and `--q 'k=v'`.

**readcheck** asks the page for `window.TEXTS(t)` at every step. Each text must stay fully in frame, unchanged, for at least CJK characters ÷ 4.5 + other non-space characters ÷ 15 + 1.5 s, and never less than `--min`. A new `text` under the same `id` starts a new piece. Subtitles are checked by their `.srt`, not here.

**reelcheck** probes the reel's MP4 (`<film>/<name>.mp4` unless `--mp4`) and prints one ✓ / ✗ / – line per check: 1080×1920 at the fps, BT.709 limited range, an audio stream, length (= `--length` ± 1 frame, or `vo/vo.json`'s duration, else 15–90 s), −14 ± 1 LUFS with peak ≤ −1 dBTP, no frozen stretch, no black frames, the `--keyword` heard by Whisper around the last voice line (`vo/vo.json`, else the last 4 s), and the deliverables (`<name>-cover.png`, `CAPTION.md`, `REVIEW.md`, `QA-REPORT.md`; `--no-files` skips them). `--keyword` defaults to the word after "Comment" in the last voice line. Then the checks for what reviewers used to catch by eye: the spoken hook (line 1) ends by 3.5 s; something new on screen at least every 0.6 s in the hook (0–3 s) and every 1.5 s after it (frame differences of the MP4 above the caption band; a change is ≥ 1 % of the picture moving over 0.1 s, so a slow reveal smaller than that counts as nothing new); every `TEXTS` and `BOXES` box inside x 60–960, y 250–1320 (a `caption: true` text inside y 1320–1470) for no more than 0.3 s at a time; and never 0.3 s with only a bare number (a "3" badge, no title) on screen. A page without `TEXTS` or `BOXES` gets – on those lines, not ✓. Last it prints what no check can see (empty placeholder props, the hook's score, captions against the voice, the mix): those stay with the reviewers. It pulls six frames into `<film>/out/check/` to open and look at. `kai-hand-draw`'s `make.mjs verify` runs the MP4 checks; its `look.mjs --safe` and `--camscan` cover the frame.

**reel.mjs** is the production line for a reel in any style except `kai-hand-draw` (which has `make.mjs`), at 1080×1920 and 30 fps. The film folder holds the page (`index.html`, keeping the page contract), `vo/script.json` (format: `styles/kai-hand-draw/tools/make_vo.py`) and, for its sound, `audio/sound.py` (below). `vo` runs `kai-hand-draw`'s `make.mjs <film> vo`, which works for any film: edge-tts with word timings into `vo/vo.wav`, `vo/vo.json`, `src/vo.js` (`VO_LINES`, `VO_WORDS`, `VO_DUR` for the page), `vo/word_times.txt`, the voice rules and Whisper on every line. `audio` exports `window.EV` to `events.json` and mixes `out/mix.wav` with `core/audio/mix.py`. `render` runs `video.mjs --lossless`, masters with `mux.mjs` (BT.709, −14 LUFS, grain 0 unless `--grain`), renders `<name>-cover.png` with `?cover` at `--cover` s (default: `cover:` in `src/config.js`, else 1) and writes `<name>.srt` from the voice lines. `check` runs `reelcheck.mjs` (with `--no-files` until `--final`) and `readcheck.mjs`. No step runs all four; steps can be listed in order (`audio render check` after a picture fix).

**mux** runs a two-pass `loudnorm` to −14 LUFS / true peak −1.2 dB, adds film grain (`grain` 0 = none) and prints the measured loudness. Silent audio is left at its level with a warning; short audio is padded, long audio cut at the picture's end; missing, damaged or truncated audio is refused. It never leaves a partial file.

**job.json** is the state of one `/make-reel` run, for an app that shows its progress. It exists only for a film in a `films/` folder, and every write replaces the whole file through a rename, so a reader never sees half of it:

```json
{ "slug": "git-r12", "campaign": "git-r12", "style": "kai-hand-draw", "type": "listicle",
  "steps": [ { "name": "script", "status": "done", "files": ["vo/script.json"] },
             { "name": "voice", "status": "running" },
             { "name": "render", "status": "running", "pct": 60, "pid": 4242 } ],
  "outputs": ["git-r12.mp4", "git-r12-cover.png", "CAPTION.md"],
  "qa": "9/9" }
```

`steps` always has the ten steps in this order: `script voice storyboard chapters audio draft render verify review deliver`, each `pending`, `running`, `done`, `failed` or `waiting` (stopped at a human decision). `files` are relative to the film; a step that runs again loses its old ones until it is done. `pct` is there only while a step reports it (the draft verify does, in tens). `outputs` are the files of the `draft`, `render` and `deliver` steps once each is done. `campaign` is `campaign:` in the front matter of `workspace/scripts/<slug>.md`, or of the script there whose front matter says `slug: <slug>`, else `null`. `qa` is the last verify's passed checks over all. `make.mjs`, `reel.mjs` and the draft verify write their own steps. A step one of them marked `running` carries the tool's `pid`, and turns `failed` when the tool exits with an error. A signal (Ctrl-C, `kill`) stops the tool at once and leaves the step `running`: a reader that finds no process with that `pid` shows the step as failed. The agent's own `running` steps have no `pid`.

## Audio

| Command | What it does |
|---|---|
| `pixi run -e full python core/tts/tts.py lines.json out_dir` | Kokoro, offline (full environment). `lines.json` = `[{id, text, voice?, speed?, lang?}]` (defaults `af_bella`, `0.92`, `en-us`; Chinese: `"lang": "cmn"`, a `zf_*`/`zm_*` voice). Writes `<id>.wav` (24 kHz, trimmed) and `dur.json`. Needs a library path under 160 bytes (espeak-ng); it checks |
| `pixi run python core/tts/tts_zh.py lines.json out_dir [--voice zh-CN-XiaoxiaoNeural] [--rate +0%] [--pitch +0Hz]` | edge-tts (Microsoft), online; same outputs as `tts.py`. Per line: `voice`, `rate`, `pitch`, `say` (what is spoken when it differs from `text`). Caches in `out_dir/.cache/`. Voices: `pixi run python -m edge_tts --list-voices` |
| `pixi run python core/tts/asr_check.py lines.json voices_dir [--lang en\|zh\|auto] [--threshold 0.92] [--model base]` | speech-to-text check of every `<id>.wav`; writes `words.json` (word timestamps). English must match word for word (0–999 count the same as their words); Chinese, Japanese, Korean compare by character similarity ≥ `--threshold`. An `asr` field in a line overrides the expected text (names, decimals, times: write it as Whisper does) |
| `core/audio/sfx.py` | procedural foley and mix helpers: filters, envelopes, `click`, `whoosh`, `thump`, `ding`…, `compress`, `limit`, `add(buf, sound, at, gain, pan)` |
| `core/audio/sampler.py`, `core/audio/pluck.py` | sampled instruments and plucked-string modelling ([`audio/INSTRUMENTS.md`](audio/INSTRUMENTS.md)). A missing library is named in the error with its `pixi run fetch instruments <lib>` command. `credits(names)` writes the CREDITS lines |
| `pixi run python core/audio/mix.py <film> [--out f.wav]` | the film's sound from its page events: `events.json` + `vo/vo.wav` + `audio/sound.py` → `out/mix.wav` (below) |

**mix.py** places one sound per `window.EV` event, under the voice. The film's `audio/sound.py` holds its sound in the style's palette, every name optional: `SFX = {type: fn or (fn, gain)}` (each `fn()` returns mono audio at 48 kHz), `music(dur, ev)` (the score; it can read the `section` events, or load a WAV you made with `sampler.py`), `bed(dur)` (ambience) and `LEVELS = {'music_db': -10, 'sfx': .35, 'bed': 1, 'duck_db': -8}`. It can import `sfx.py`'s helpers. Without it, an event named like an `sfx.py` function plays that function and there is no music. A `silence` event `{t, t1}` cuts the music from `t` to `t1`. The voice is compressed and set by RMS, the music sits `music_db` under it and ducks `duck_db` under speech; the result is peak-normalised and `mux.mjs` sets the loudness. Each event type with no sound is named in a warning.

## Picture helpers

| File | What it is |
|---|---|
| `core/lib.js` | seeded random `mulberry`, `hash`, `vnoise`, `clamp(x,a,b)`, `lerp(a,b,t)`, `seg(t,a,b)` (0→1 between a and b), easing on 0–1 (`ss(t)`, `eio(t)`, `eo(t)`, `ei(t)`, `back(t,s)`, `spring(t,k,z)`), `monotone`/`track` interpolation, envelope `env` |
| `core/three/post.js` | three.js post: physical depth of field, GTAO, bloom, colour grade, 2× supersampling |
| `core/post/crt.js` | WebGL2 CRT / VHS pass over a 2D canvas |
| `core/fonts/` | Fredoka, Lilita One, IM Fell English, ZCOOL KuaiLe (OFL, [`fonts/OFL.md`](fonts/OFL.md)) as subsets; ZCOOL holds only ≈ 200 characters |
| `core/assets/polyhaven/` | CC0 HDRIs and models (`SOURCES.md`) |

## Environment variables

| Variable | Meaning |
|---|---|
| `PLAYWRIGHT_CHROME` | a Chrome / headless-shell executable instead of Playwright's |
| `STUDIO_ANGLE` | WebGL backend (default `metal` on macOS; `default` passes none) |
| `RENDER_SLOTS` | optional; limits concurrent full renders across processes |
| `STUDIO_COLOR=bt709` | `mux.mjs` writes limited-range BT.709 instead of the default full-range output |
| `WHISPER_MODEL` | Whisper model name or local folder for `asr_check.py` (same as `--model`; default `base.en` for English, `base` otherwise; `small` is more accurate for Chinese) |
| `HF_ENDPOINT` | Hugging Face mirror for the Whisper download |

## Exit codes

| Tool | 0 | 1 | 2 |
|---|---|---|---|
| render tools | done | page error, missing required file, ffmpeg failure | usage, no `index.html`, `--out` already being written |
| `readcheck.mjs` | all texts long enough | some too short or never fully visible | could not check (no `TEXTS`) |
| `mux.mjs` | film written | any failure | – |
| `reelcheck.mjs` | every check ✓ | a check ✗, or no MP4 | usage |
| `reel.mjs` | every step done (check: every line ✓ or –) | a step failed, or a check ✗ | usage, no `index.html` |
| `job.mjs` | step written (or no `films/` folder: nothing to write) | – | usage, unknown step, status or flag |
| `mix.py` | mix written | missing `events.json`, a voice not at 48 kHz, an error in `audio/sound.py` | – |
| `tts.py`, `srt.py` | done | bad input, missing model, path too long | usage |
| `tts_zh.py` | done | bad input | network unreachable |
| `asr_check.py` | all lines pass | mismatches | model failed to load |
