# kai-hand-draw: how a reel is made

The user asks for a reel in one sentence. You do everything else and hand back an MP4. This page is the order of
work; [`STYLE.md`](STYLE.md) is the look and the quality bar, [`REEL_GUIDE.md`](REEL_GUIDE.md) and
[`ANIMATION_GUIDE.md`](ANIMATION_GUIDE.md) the API, [`VOICE.md`](VOICE.md) the script. Run every command from the
library root. `<film>` is the film's folder, `films/<name>`.

## The one rule about folders

**A film never edits the library.** Everything a reel needs lives in `films/<name>/` (git ignores it): its script,
storyboard, chapters, shared props, voice, music, renders and reviews. `styles/kai-hand-draw/engine/`, `tools/`,
`core/` and the guides are read, never changed for one film. A helper only this reel uses goes in
`<film>/src/ch/c0_props.js`. An engine fix that every reel needs is a separate library change: make it, check the
demo still renders (`make.mjs styles/kai-hand-draw/demo`), and say so to the user.

## Once per machine

Run `/studio` (or `pixi run studio install` directly): it installs node, python, ffmpeg, the drawing packages and
the headless browser inside this folder, then renders a test reel. Don't ask the user to run it: run it, and ask
only for what its fix lines say only they can do (on Linux, `pixi run studio linux-deps` needs their password).

## Steps

1. **New film.** `node styles/kai-hand-draw/tools/make.mjs new <name>` copies the starter to `films/<name>/` (a
   working two-chapter example with the presenter and Clawd). Keep its structure, replace its content. If the user
   pasted a `character-spec v1` block (from `character-designer.html`), write it into `<film>/src/character.js` now
   (see `.claude/skills/make-reel/SKILL.md` → Using a character spec); otherwise keep the starter's default presenter.
2. **Script.** `<film>/vo/script.json`, one entry per sentence or beat, ids `l01`, `l02`, … The first line is the
   hook, the last says what to do next ("Comment <KEYWORD> …"). Written per `VOICE.md`, checklist ticked line by
   line. A script the user gives is spoken word for word. Every number, name, price or claim comes from the user or
   a source you can name; list them in `STORYBOARD.md` → Sources.
3. **Voice.** `make.mjs <film> vo` writes the voice, `src/vo.js` and `vo/word_times.txt`, then runs `check_vo.py`
   (rate ≤ +25 %, ≤ 28 words a line, CTA in one breath; pace 5.0–6.4 syl/s) and Whisper on every line
   (`core/tts/asr_check.py`). It fails until both pass. Read `word_times.txt`: every later step is timed from it.
4. **Storyboard.** `<film>/STORYBOARD.md` (format in `REEL_GUIDE.md`): three candidate concepts and the one you chose,
   one concept world with a continuity prop, the cast and its sizes, the hook 0–3 s on its own (hook rules in
   `REEL_GUIDE.md`), each chapter as one camera path with events tied to spoken words, the SFX, the sources.
   `ref/example-STORYBOARD.md` shows the level of detail.
5. **Prove the look.** Before the chapters: the cast at final size (`look.mjs <film> --sheet=0 --loop=kai`, `clawd`,
   `cast`) and two style frames of the hook. Check them against `STYLE.md`.
6. **Chapters.** One file per chapter in `<film>/src/ch/`, each ending in `chapter(...)`, listed in order in
   `<film>/index.html`; shared props once in `c0_props.js`. Set `name` and `cover` in `src/config.js`, and brand
   names for the captions in `PROJECT.caption.brands`.
7. **Look at it.** Sheets and stills, opened with the Read tool. Every chapter, every hit, the first three seconds
   frame by frame, `--safe` for Instagram's buttons, `--camscan` for camera speed.
   ```sh
   node styles/kai-hand-draw/tools/look.mjs <film> --sheet=0,0.3,0.6,1,1.5,2,2.5,3 --cols=4 --w=270 --out=<film>/out/check/hook.jpg
   node styles/kai-hand-draw/tools/look.mjs <film> --strip=0:1 --cols=8 --w=200 --out=<film>/out/check/hook_strip.jpg
   node styles/kai-hand-draw/tools/look.mjs <film> --stills=1.2,7.4 --safe --out=<film>/out/check/stills
   node styles/kai-hand-draw/tools/look.mjs <film> --camscan
   ```
8. **Music and SFX.** `<film>/audio/cues.json`: the chapter cuts and one sound per visible hit, timed by word. Then
   `make.mjs <film> audio`.
9. **Render.** `make.mjs <film> render`: frames through `core/render/video.mjs`, mux and loudness through
   `core/render/mux.mjs` (BT.709, −14 LUFS), then `<film>/<name>.mp4` and `<film>/<name>-cover.png` (no captions).
10. **Verify the real file.** `make.mjs <film> verify` checks size, fps, BT.709, audio, length = voice ± 1 frame,
    −14 LUFS / ≤ −1 dBTP, no frozen or black stretch, camera ≤ 20 px/frame, and that Whisper hears the keyword in
    the final mix. It pulls frames into `<film>/out/check/final_*.jpg`: open them. Every check must be ✓.
11. **Review: scan → mark → fix → update**, in one file, `<film>/REVIEW.md` (format: `ref/example-REVIEW.md`).
    One round by fresh reviewers (sub-agents that did not build the reel), one per area: **hook** (0–3 s scored on
    its own, ship at ≥ 8/10) · **visuals** per chapter (alive, on model, cast size, nothing in the caption band,
    labels ≥ 46 px, no thin or empty frame) · **facts + captions** (every claim sourced, captions match the words)
    · **voice + audio** (pace, keyword heard, −14 LUFS) · **tech** (the verify checks). Measure, don't give opinions:
    px per frame, glyph height in px, syl/s, LUFS, positions, with frame paths as evidence. Fix each ❌ in its
    chapter, re-render, flip the row to ✅ with "fixed in · evidence". A second round only for a ❌ still open; at
    most three. Then one self-check pass over the final MP4.
12. **Deliver.** In `<film>/`: `<name>.mp4`, `<name>-cover.png`, `STORYBOARD.md`, `REVIEW.md`, `QA-REPORT.md`
    (concept, defects found and fixed, the verify numbers, render time) and `CAPTION.md` (the post caption and the
    pinned comment with the keyword). Tell the user: the full path of the MP4 and the cover, the length, the hook
    score, one line on what the reel shows, any ⚠ still open and anything you could not verify.

`make.mjs <film>` with no step runs 3, 8, 9 and 10 in one go.

## Rules

- **Creative direction is yours.** The user gives a topic; you choose the angle, the script, the concept, the
  staging and the pacing, without asking for approval on the way. If the topic is too vague to script, ask one
  question and go.
- **Frames are pure functions of time.** No `Math.random()`, no state between frames.
- **Lock events to words**, not typed numbers: `vo('word')`, `voLine('l02')`, `cutAfter('l02')`, so a new voice keeps
  every hit on its word. After any script change run `make.mjs <film> vo` then `audio`.
- **Safe zone:** anything that matters inside x 60–960, y 250–1300; captions take y 1320–1470.
- **Never post or upload.** The channel's series cover (the 3D eye-layout cover) is made by the `ksa-reel-3d` skill;
  this workflow makes the in-reel cover frame.

## When something fails

- **`edge-tts failed`**: the voice needs an internet connection. Try again.
- **A line fails the Whisper check**: listen to `<film>/vo/lines/<id>.wav`. If it sounds right (a brand name,
  "Clawd" heard as "Claude"), put what Whisper heard in that line's `"asr"`. If it sounds wrong, respell the word in
  `"say"`.
- **Page errors when rendering**: the tools stop on any page error and print it. Five `WebGL: INVALID_OPERATION`
  warnings when a page opens are harmless.
- **Rendering is slow**: watercolour `fill` shapes are the cost. Use `wash` for flat colour, or fewer shapes.
- **A render was interrupted**: run the render step again; `video.mjs` cleans up its own partial files.
