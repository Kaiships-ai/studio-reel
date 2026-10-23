---
name: make-reel
description: Make one finished vertical reel (1080x1920 MP4 + cover + caption) from a topic, a script, or an example file in styles/kai-hand-draw/examples/. Default style is kai-hand-draw (hand-painted, starring Clawd and your presenter); --style picks any style in the library, --type a content type, --mode cook or direct. Use when the user types /make-reel, or asks for a reel, a short, or an Instagram video.
argument-hint: <topic | "script in quotes" | styles/kai-hand-draw/examples/<file>.json> [--style <slug>] [--type <content-type>] [--mode cook|direct] [--storyboard]
---

# /make-reel

Make one reel end to end and hand back the MP4. Don't ask for approval on the way (unless `--storyboard`). In
`--mode direct`, ask one question only if the topic is too vague to script; in `--mode cook`, never ask.

Input: `$ARGUMENTS`
- **A file in `styles/kai-hand-draw/examples/`** → copy its `voice`, `rate`, `pause` and `lines` into
  `films/<name>/vo/script.json` word for word. Use its `concept` as a starting point. If the lines have
  `<placeholders>`, ask the user for the real items first (in `--mode cook`, pick real items you can source).
- **A script in quotes** → speak it word for word. Split it into lines, don't edit the words.
- **A topic** → write the script per `styles/kai-hand-draw/VOICE.md` (any style) and the content type's beats, and
  tick VOICE.md's checklist.
- **A `character-spec v1` block** (alone or with a topic) → see **Using a character spec** below, then go on with
  the topic. A spec alone: write the character file and ask for the topic.
- **Nothing** → show the three examples in `styles/kai-hand-draw/examples/README.md` and ask which one, or what topic.

Options (any order, all optional):
- `--style <slug>`: a folder in `styles/` (default `kai-hand-draw`). Any other style: see **Another style** below.
- `--type <name>`: a file in `content-types/` (`listicle`, `education`, `why`, `explanation`, `promo`). The script follows its
  beats, timings, hook patterns and CTA rule. No type given: pick the one that fits the topic.
- `--mode cook` (default for a topic): no questions at all. You take the idea and go all out: the angle, the script,
  the concept and every shot, at the highest craft the style allows. A topic too vague to script gets your best
  reading of it, not a question. A fact only the user has and did not give (a price, an item, a number) is left
  out, never invented.
- `--mode direct` (default for a script): the user directs. Their script is spoken word for word, their storyboard
  (pasted, or a file path) is the shot list in its order and timings, and their notes override your taste. Fill only
  what they left out, and ask only for a `<placeholder>` they must fill.
- `--storyboard`: write `STORYBOARD.md`, show it, and stop until the user approves it. Without it, don't stop.

A script in quotes is always spoken word for word, in either mode.

With `kai-hand-draw`, follow `styles/kai-hand-draw/WORKFLOW.md` exactly, steps 1–12, with
`styles/kai-hand-draw/STYLE.md` as the quality bar on every chapter. Read `REEL_GUIDE.md`, `ANIMATION_GUIDE.md` and
`ref/example-STORYBOARD.md` (all in `styles/kai-hand-draw/`) before the first chapter. Work only inside `films/<name>/`.

Done when: `films/<name>/<name>.mp4` and `<name>-cover.png` exist, `make.mjs films/<name> verify` passes (every ✓),
and `REVIEW.md` has no ❌ (hook ≥ 8/10), with `QA-REPORT.md` and `CAPTION.md` written. Then tell the user: the two
paths, the length, the hook score, one line on the concept, and any open ⚠ rows.

## Another style (`--style <slug>`, not `kai-hand-draw`)

1. Read `styles/<slug>/STYLE.md`: it is fixed and it is the quality bar on every shot. Open
   `styles/<slug>/showcase.jpg`: it proves the style works at 9:16; place the title, the subject and the caption band
   the way it does.
2. Follow `AGENTS.md` → Workflow, steps 2–6 (treatment, look, storyboard only with `--storyboard`, produce,
   self-check), with `DIRECTOR.md` and `TECHNIQUE.md`, and skip its brief questions: the mode decides. Work only in
   `films/<name>/`; copy what you need from the style, never build inside `styles/`.
3. Reel format, overriding the guides' film defaults: 1080×1920 at 30 fps (`--size 1080x1920 --fps 30` on the
   render tools, `fps=30` on `mux.mjs`), 30–60 s, voice and word-locked captions, the hook built and checked as
   its own chapter (first 3 s), the CTA last. Anything that matters inside x 60–960, y 250–1300; captions in
   y 1320–1470 (Instagram's buttons cover the rest).
4. Check the real MP4: `node core/render/reelcheck.mjs films/<name> --length <voice seconds> --keyword <KEYWORD>
   --no-files` (1080×1920, 30 fps, BT.709, audio present, length = voice ± 1 frame, −14 LUFS and ≤ −1 dBTP, no
   frozen or black stretch, the keyword heard in the final mix). Every line must be ✓; open the frames it pulls.
   Add `core/render/readcheck.mjs` for every on-screen text when the page has `window.TEXTS`.
5. Review and deliver exactly as `styles/kai-hand-draw/WORKFLOW.md` steps 11–12 (fresh reviewers per area, hook
   ≥ 8/10), with the same files in `films/<name>/`: `<name>.mp4`, `<name>-cover.png`, `STORYBOARD.md`, `REVIEW.md`,
   `QA-REPORT.md` (with the step 4 numbers), `CAPTION.md`, and the `CREDITS` file `DIRECTOR.md` §11 asks for.
   Last, run `reelcheck.mjs` again without `--no-files`: it also checks those deliverables are there.

Never post or upload, in any style: posting is the user's call.

## Input from a workspace script (`workspace/scripts/<slug>.md`)

Written by `/ig-reel` (and `/ig-human`). Treat it as **a script in quotes**: the `## Script` section is the spoken
text, one line per beat, hook first and CTA last; speak it word for word. Name the film `<slug>` (from the front
matter, else the file name). Use `## On-screen` as the card text and timings, and keep the `cta_keyword` spelled
exactly as written. If the file has no `## Script` section, use its text as a topic. If `status` is `draft`, say once
that `/ig-human` has not run on it, then carry on. When done, add: next `/ig-caption <slug>`.

## Using a character spec

Buyers design their presenter in `character-designer.html` (library root) and paste a block like this:

```
character-spec v1
name: Mai
skin: #C8875A
eyes: lashes
...
pants_color: #6E6A5E
```

1. Make the film first (`make.mjs new <name>`), then write `films/<name>/src/character.js` as one object with the
   same keys and values, copied line for line (strings in quotes, keys unchanged):
   `const CHARACTER = { name: 'Mai', skin: '#C8875A', eyes: 'lashes', ..., pants_color: '#6E6A5E' };`
   The starter's `src/character.js` lists every key and its allowed values; `engine/kaip.js` (`PARTS`) is the source
   of truth. Keep `<script src="src/character.js"></script>` in `index.html`, after `config.js`.
2. Don't invent parts. A value not in the list (or a colour that isn't `#RRGGBB`) is drawn as the default and shows
   as a page warning, which fails the draft verify: fix the value, or tell the user which option is closest.
3. `name` is not drawn: use it wherever the script, captions, `STORYBOARD.md` and `CAPTION.md` name the presenter,
   never "Kai". The presenter is still drawn with `kai(pose, x, y, h, o)`; only the look changes.
4. Prove it before the chapters: `node styles/kai-hand-draw/tools/look.mjs films/<name> --stills=0 --loop=kai
   --out=films/<name>/out/check/presenter` and open the still. Hats (cap, beanie) hide a bun, spikes and the top of
   curly hair by design.
5. A user who wants to change the presenter later pastes a new block: rewrite `src/character.js`, nothing else.

No spec pasted → keep the starter's `src/character.js` (the default presenter) and don't ask for one.
