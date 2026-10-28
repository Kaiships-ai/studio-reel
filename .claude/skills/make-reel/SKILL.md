---
name: make-reel
description: Make one finished vertical reel (1080x1920 MP4 + cover + caption) from a topic, a script, or an example file in styles/kai-hand-draw/examples/. Default style is kai-hand-draw (hand-painted, starring Clawd and your presenter); --style picks any style in the library, --type a content type, --mode cook or direct. Use when the user types /make-reel, or asks for a reel, a short, or an Instagram video.
argument-hint: <topic | "script in quotes" | styles/kai-hand-draw/examples/<file>.json> [--style <slug>] [--type <content-type>] [--mode cook|direct] [--storyboard]
---

# /make-reel

Make one reel end to end and hand back the MP4. Don't ask for approval on the way (unless `--storyboard`). In
`--mode direct`, ask one question only if the topic is too vague to script; in `--mode cook`, never ask.

Input: `$ARGUMENTS`
- **A slug with a file `workspace/scripts/<slug>.md`** (e.g. `/make-reel git-r12`), or that file's path → see
  **Input from a workspace script** below.
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
3. Reel format, overriding the guides' film defaults: 1080×1920 at 30 fps, 30–60 s, voice and word-locked
   captions, the hook built and checked as its own chapter, the CTA last. The on-screen hook lands by 3 s and the
   spoken hook line ends by 3.5 s (about 11 words). Anything that matters inside x 60–960, y 250–1320; captions in
   y 1320–1470 (Instagram's buttons cover the rest).
4. **Captions in a reel are word-locked**: each strip is on screen exactly while its line is spoken, the spoken
   word marked. DIRECTOR.md §7's 1.8 s subtitle hold does not apply to them (a strip held past its line shows the
   wrong words under the next one), and the `.srt` keeps the same timing. Every other on-screen text still passes
   `readcheck.mjs`. This is the rule, not an exception: don't log it in `TREATMENT.md` or `REVIEW.md`.
5. **Build with `core/render/reel.mjs`**, never a pipeline of your own (commands and details: `core/README.md`):
   - `vo/script.json` (format in `styles/kai-hand-draw/tools/make_vo.py`, voice rules in
     `styles/kai-hand-draw/VOICE.md`), then `node core/render/reel.mjs films/<name> vo`. It writes `src/vo.js`
     (`VO_LINES`, `VO_WORDS`, `VO_DUR`): time every picture event and the captions from it.
   - The page keeps the page contract: `window.render(t)`, `READY`, `DUR = VO_DUR`, `EV` (one event per visible
     action, `silence` events for the music cuts), `TEXTS(t)` for every text (badges and labels too, captions left
     out), `BOXES(t)` for the subject and the props, and no captions when `location.search` has `cover`.
   - `audio/sound.py`: the score, the SFX for each event type and the ambience, in the style's sound palette.
   - `node core/render/reel.mjs films/<name> audio render check --cover <s>`: `events.json`, `out/mix.wav`,
     `<name>.mp4` (lossless frames, BT.709, −14 LUFS), `<name>-cover.png`, `<name>.srt`, then `reelcheck.mjs` and
     `readcheck.mjs`. After a picture fix, run `audio render check` again.
   Every line must be ✓ (a – on the page lines means the page doesn't report `TEXTS` or `BOXES`: add them). Open
   the frames it pulls, and give the reviewers its "still needs eyes" list.
6. Review and deliver exactly as `styles/kai-hand-draw/WORKFLOW.md` steps 11–12 (fresh reviewers per area, hook
   ≥ 8/10), with the same files in `films/<name>/`: `<name>.mp4`, `<name>-cover.png`, `<name>.srt`, `STORYBOARD.md`,
   `REVIEW.md`, `QA-REPORT.md` (with the step 5 numbers), `CAPTION.md`, and the `CREDITS` file `DIRECTOR.md` §11
   asks for. Last, `node core/render/reel.mjs films/<name> check --final`: it also checks those deliverables are there.

Never post or upload, in any style: posting is the user's call.

## Progress file (`films/<name>/job.json`)

Another app can show the run's progress from `films/<name>/job.json`, so it must be current after every step. The
tools write their own steps: `make.mjs` and `reel.mjs` write `voice`, `audio`, `render` and `verify` (with `qa`,
the passed checks over all), and `make.mjs new` starts the file with `script` running. Write every other step with
one command when it starts and one when it ends. The file lists the steps in the order a run takes them: `script`,
`voice`, `storyboard`, `chapters`, `audio`, `draft`, `render`, `verify`, `review`, `deliver`. Work in that order:
the chapters, then the music and SFX (`audio`), then the draft, then the full render.

```sh
node core/job.mjs films/<name> <step> running|done|failed|waiting [--files=a,b] [--style=<slug>] [--type=<name>]
```

| Step | What it covers | `--files` when done |
|---|---|---|
| `script` | the script, from the input (first call: `--style` and `--type`) | `vo/script.json` |
| `storyboard` | the treatment and `STORYBOARD.md`; `waiting` while `--storyboard` waits for approval | `STORYBOARD.md` |
| `chapters` | the look, the chapters or the page, and the stills you check them with while you build (WORKFLOW.md steps 5 to 7) | `src/ch/` (or `index.html`) |
| `draft` | after `audio`, the last look before the full render: the hook sheet and stills of the whole reel with its mix in place (WORKFLOW.md step 7 again) | the sheet and stills |
| `review` | `REVIEW.md`, every round | `REVIEW.md` |
| `deliver` | the delivered files | `CAPTION.md`, `QA-REPORT.md`, `STORYBOARD.md`, `REVIEW.md` |

`waiting` is for any stop at a human decision (a `<placeholder>` only the user can fill, a storyboard to approve).
A step you give up on is `failed`. A tool that fails marks its own step `failed`; a tool that is killed leaves its
step `running` with its `pid`. Run the tool step again after a
fix; its step goes back to `running`, then `done`.

## Test preset (`preset: test`)

A test cook proves the pipeline, not the reel: the render is 270×480 at 12 fps, at most 15 s, in a fast low-quality
encode, so it takes seconds and the machine stays cool. Never post it. A cook asks for it with `preset: test` in the
front matter of `workspace/scripts/<slug>.md`, or with `--preset=test` on `make.mjs new <name>` (or on any
`node core/job.mjs` call); it lands in `job.json` as `"preset": "test"`. `REEL_PRESET=test` in the environment does
the same for one command. From then on `make.mjs render` and `verify` and the draft verify use it by themselves:
run the same steps, with no extra flag. `verify` then checks 270×480 at 12 fps and skips the camera scan. Only
`kai-hand-draw` films have it (`core/render/reel.mjs` warns and renders the full reel). The presets live in
`core/preset.mjs`. A preset stays in `job.json` once set, even if the front matter later drops it (a cook started
with `--preset=test` has no `preset:` line to keep it); a real render of a test film is a new film.

## Input from a workspace script (`workspace/scripts/<slug>.md`)

Written by `/ig-reel` (and `/ig-human`), or by another app that hands a script over. Treat it as **a script in
quotes**: the `## Script` section is the spoken text, one line per beat, hook first and CTA last; speak it word for
word. Name the film `<slug>` (from the front matter, else the file name). Its `campaign:` and `preset:` front matter, if any,
go into `job.json` by themselves. Use `## On-screen` as the card text and timings, and keep the `cta_keyword` spelled
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
