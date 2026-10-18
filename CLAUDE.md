# Kaiships Reel Kit

This folder makes vertical Instagram reels (1080×1920, 30 fps): a hand-painted p5.brush animation starring Clawd,
an AI voiceover, captions locked to the spoken words, and music and sound effects generated on this machine. The user
asks for a reel in one sentence. You do everything else and hand back an MP4.

## First request: set up without asking

If `.kit-env.json` does not exist, run this before anything else:

```
node setup.mjs
```

It installs the npm packages, creates `.venv` with edge-tts and numpy, finds Chrome and ffmpeg (or downloads
copies into `.tools/`), and prints a ✓/✗ summary. It needs no sudo and installs nothing globally.

- Do not ask the user to install or run anything. Run it yourself.
- If a line shows ✗, run the fix it prints (for example `winget install --scope user Python.Python.3.12` or
  `brew install python`), then run `node setup.mjs` again. Ask the user only when a step needs their password or
  there is no Node.js at all.
- To prove the kit works, `node make.mjs` renders the bundled example to `out/three-checks.mp4`. You can skip
  this and go straight to the user's reel.

## How a reel is made

Read `REEL_GUIDE.md` (the reel rules, the hook rules, the kit's API) and `ANIMATION_GUIDE.md` (how to paint and
animate) before you write any chapter. Then work in this order and do not skip steps.

1. **Script.** Write the voiceover into `vo/script.json`: one entry per sentence or beat, ids `l01`, `l02`, …
   About 2.5 words per second, so a 30-second reel is roughly 70 words. The first line is the hook. The last line
   says what to do next. Write it per `VOICE.md` and tick its checklist line by line. A script the user gives is
   spoken word for word.
2. **Voiceover.** `node make.mjs vo`. It writes `vo/vo.wav`, `src/vo.js`, and `vo/word_times.txt`. Read
   `word_times.txt`: every later step is timed from it. The reel's length comes from the voiceover. Check the pace
   (5.0–6.4 syllables/s per line, no unbroken run over ~5 s) and fix the script before you build on it.
3. **Storyboard.** Write `STORYBOARD.md` (format in `REEL_GUIDE.md`). Pick **one concept**: one world or metaphor
   that carries the whole reel (a shop, a game, a lab), with a prop that carries across chapters as a progress bar.
   It has a dedicated section for the first 0–3 seconds, the hook, that follows the hook rules. Every event is tied
   to a spoken word. Plan each chapter as **one camera path** (see "The quality bar"). `ref/example-STORYBOARD.md`
   shows the level of detail of a finished reel.
4. **Chapters.** One file per chapter in `src/ch/`, each calling `chapter(...)`. List them in `studio.html` in
   order, replacing the example's three script tags. Set `name` in `src/config.js`. The example chapters show the
   pattern: read them, then replace them. Do not reuse their story.
5. **Look at it.** Render contact sheets and stills and open them with the Read tool. Check every chapter, every
   hit, and the first three seconds frame by frame. Add `--safe` to see what Instagram's buttons cover. Fix and
   look again.
   ```
   node render.mjs --sheet=0,0.3,0.6,1,1.5,2,2.5,3 --cols=4 --w=270 --out=out/check/hook.jpg
   node render.mjs --strip=0:1 --cols=8 --w=200 --out=out/check/hook_strip.jpg
   node render.mjs --stills=1.2,7.4 --safe --out=out/check/stills
   ```
6. **Music and SFX.** Write `audio/cues.json`: the chapter cuts and one sound per visible hit, timed by word.
   Then `node make.mjs audio`. It prints each cue time and the loudness (about −14 LUFS).
7. **Render.** `node make.mjs render` writes `out/<name>.mp4` (with audio) and `out/<name>-cover.png`.
8. **Verify on the real file.** `node make.mjs verify` checks the MP4 is 1080×1920 with an audio stream and the
   right length, and pulls frames from it into `out/check/final_*.jpg`. Open those frames with the Read tool. The
   character must be visible, the caption readable, and nothing cut off.
9. **Review loop: scan → mark → fix → update.** One file, `REVIEW.md`, updated every round (never a new file):
   1. Scan the whole MP4 segment by segment (frames from it, not from the studio). If you can start sub-agents,
      use fresh ones that did not build the reel, one per area below.
   2. Mark one row per segment: ✅ good / ❌ not good, with time range, what and why.
   3. Fix each ❌ in its chapter file, re-render, then flip the row to ✅ with "fixed in · evidence (frame path)".
   4. Repeat until no ❌, **at most 3 rounds**, then one last self-check pass over the final MP4.
   Areas: **hook** (score 0–3 s on its own, ship at ≥ 8/10) · **visuals** per chapter (alive, on-model, nothing in
   the caption band, readable on a phone, no thin or empty frame) · **facts + captions** (every on-screen claim is
   sourced, captions match the words) · **voice + audio** (pace band, keyword clearly heard, about −14 LUFS) ·
   **tech** (video length = audio ±1 frame, no frozen stretch). Measure, don't give opinions: px per frame, glyph
   height in px, syllables/s, LUFS, x/y positions, with frame paths as evidence. Format: `ref/example-REVIEW.md`.
10. **Tell the user.** Give the full path of the MP4 and the cover, the length, the hook score, and one line on what
   the reel shows. List any ⚠ rows still open after 3 rounds and anything you could not verify.

`node make.mjs` with no arguments runs steps 2, 6, 7 and 8 in one go.

## The quality bar

These rules come from reviewing many shipped reels. When a rule and an idea clash, keep the rule and find another idea.

- **1 chapter = 1 long take.** Inside a chapter there are no cuts and no whip pans: many actions happen one after
  another in the same space, and the camera drifts with them (push in, pull out, crane, track). For a new idea,
  bring the action into frame or let the camera glide to it. Transitions (`brush`, `splat`, `iris`) only happen
  between chapters. A continuous zoom into an object (into a lens, a screen) counts as one shot. "Drifts" is
  measurable: **≤ ~20 px per frame**.
- **Frame 0 is already mid-action.** A hook that starts still, or a shot that sits still or feels thin, is not done.
- **Faces stay clear.** Nothing is drawn over Clawd's face: no props, chips, titles, debris. Smoke, glow and dust go
  behind characters or stay at ≤ 30 % opacity over them. No face, label or key object in the caption band on any
  frame, including during camera moves. Labels are ≥ 46 px tall and leave the frame before a zoom, so they never
  shrink to tiny text. Backgrounds cover the frame at every camera position (no paper edge on a shake).
- **Alive, familiar, surprising.** Something always moves, reacts, lands: a motion-design showreel, not slides with a
  voiceover. Use ideas a viewer knows from life, games, sport or film so each point lands in a second. Pick the
  concept you'd be proud of, not the first safe one. Evoke brands and games in your own drawing; never copy logos.
- **Craft toolbox (a menu):** blocking (stage everything in one space so action enters the frame), motivated camera
  (something leads it), pull-back reveal / scale break for the hook's surprise, squash & stretch + anticipation +
  follow-through, a continuity prop across chapters, each SFX on its word with music ducked under the voice.
- **Clawd v3 for "ship it" moments:** `clawd(x, y, u, { astro: true, mood: 'proud' })` draws the astronaut Clawd
  (dome, pack, hoses; moods `deadpan proud reading fired skeptical dead happy`; `stamp`, `slam`, `clip` props). See
  the header of `src/clawd-v3.js`. Plain Clawd is the default.

## Rules

- **Creative direction is yours.** The user gives a topic. You choose the angle, the script, the metaphor, the
  staging and the pacing, and you do not ask them to approve each step. If the topic is too vague to script, ask
  one question and then go.
- **Facts on screen come from the user or a cited source.** Numbers, names, prices, statistics, quotes and
  claims about real products may appear (spoken or written) only if the user gave them to you or you found them
  in a source you can name. List the sources at the bottom of `STORYBOARD.md`. If you cannot source a claim, cut
  it or rephrase it as something that needs no source. Never invent a number.
- **Frames are pure functions of time.** No `Math.random()`, no state between frames. See `ANIMATION_GUIDE.md`.
- **Lock events to words, not to typed numbers.** Use `vo('word')`, `voLine('l02')` and `cutAfter('l02')` so the
  picture stays in sync when the voiceover is regenerated. After any script change, run `node make.mjs vo` and
  then `node make.mjs audio`.
- **Keep it in the safe zone.** Anything that matters sits inside x 60–960, y 250–1300. Captions take y 1335–1455.
- **Edit the engine only when you must.** `src/core.js`, `src/clawd.js`, `src/clawd-v3.js`, `src/timeline.js`, `src/reel.js` and
  `render.mjs` are shared. Reel-specific helpers go in your chapter file. Reusable ones go in `src/kit.js`.
- **Licence.** The user may make unlimited videos with this kit, for personal and commercial use. The kit itself
  may not be resold, shared or redistributed. Do not upload the kit's files or publish them to a public repo. See
  `LICENSE.md`.

## Files

| path | what it is |
|---|---|
| `README.md` | the user's quick start and example prompts |
| `REEL_GUIDE.md` | reel rules, hook rules, storyboard format, the reel API |
| `ANIMATION_GUIDE.md` | painting and character animation: rules, principles, full engine and Clawd reference |
| `setup.mjs` | one-time setup, writes `.kit-env.json` |
| `make.mjs` | `vo`, `audio`, `render`, `verify` |
| `render.mjs` | headless renderer: sheets, strips, crops, stills, clips, the full reel |
| `vo/script.json` | the voiceover script (you write it) |
| `audio/cues.json` | chapter cuts and SFX cues (you write it) |
| `src/config.js` | name, fps, bpm, audio file, cover time |
| `src/ch/*.js` | the chapters (you write them) |
| `src/kit.js` | shared reel pieces: headers, badges, chips, cards, phone, laptop, bursts |
| `src/reel.js` | chapters, transitions (brush, splat, iris), voiceover lookups, captions, safe zone |
| `src/core.js`, `src/clawd.js`, `src/timeline.js` | the painting engine and the character |
| `src/clawd-v3.js` | the astronaut Clawd (`{ astro: true }`), moods and props |
| `VOICE.md` | how to write the script: shape, rules, banned phrases, checklist |
| `ref/example-STORYBOARD.md`, `ref/example-REVIEW.md` | a finished reel's storyboard and review, to show the bar (don't copy its story) |
| `REVIEW.md` | your review log for the current reel (you write it, step 9) |
| `scripts/make_vo.py`, `scripts/make_audio.py` | voiceover and audio generators (run through `make.mjs`) |
| `docs/emotions.jpg`, `docs/views.jpg` | Clawd's model sheets (drawn in 16:9: use them for the faces, not the layout) |

## When something fails

- **`edge-tts failed`**: the voiceover needs an internet connection. Try again. A different voice can be set in
  `vo/script.json` (`.venv/bin/edge-tts --list-voices`, or `.venv\Scripts\edge-tts --list-voices` on Windows).
- **Fonts look plain**: fonts are fetched from Google Fonts when a frame renders. Offline, system fonts are used.
- **Chrome or ffmpeg not found after the folder moved**: run `node setup.mjs` again.
- **Rendering is very slow**: watercolour `fill` shapes are the cost. Use `wash` for flat colour, or fewer shapes.
  On a machine with no GPU add `--soft-gl` to `render.mjs` commands.
- **Five `WebGL: INVALID_OPERATION` warnings** when a page opens are harmless. Any other page error is real.
- **A render was interrupted**: `node render.mjs --reel --resume` continues from the frames already made.
