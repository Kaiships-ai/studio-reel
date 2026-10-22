---
name: make-reel
description: Make one finished hand-painted vertical reel (1080x1920 MP4 + cover) in the kai-hand-draw style, starring Clawd and your presenter, from a topic, a script, or an example file in styles/kai-hand-draw/examples/. Use when the user types /make-reel, or asks for a reel, a short, or an Instagram video.
argument-hint: <topic | "script in quotes" | styles/kai-hand-draw/examples/<file>.json>
---

# /make-reel

Make one reel end to end and hand back the MP4. Don't ask for approval on the way. Ask one question only if the
topic is too vague to script.

Input: `$ARGUMENTS`
- **A file in `styles/kai-hand-draw/examples/`** → copy its `voice`, `rate`, `pause` and `lines` into
  `films/<name>/vo/script.json` word for word. Use its `concept` as a starting point. If the lines have
  `<placeholders>`, ask the user for the real items first.
- **A script in quotes** → speak it word for word. Split it into lines, don't edit the words.
- **A topic** → write the script per `styles/kai-hand-draw/VOICE.md` and tick its checklist.
- **A `character-spec v1` block** (alone or with a topic) → see **Using a character spec** below, then go on with
  the topic. A spec alone: write the character file and ask for the topic.
- **Nothing** → show the three examples in `styles/kai-hand-draw/examples/README.md` and ask which one, or what topic.

Then follow `styles/kai-hand-draw/WORKFLOW.md` exactly, steps 1–12, with `styles/kai-hand-draw/STYLE.md` as the
quality bar on every chapter. Read `REEL_GUIDE.md`, `ANIMATION_GUIDE.md` and `ref/example-STORYBOARD.md` (all in
`styles/kai-hand-draw/`) before the first chapter. Work only inside `films/<name>/`.

Done when: `films/<name>/<name>.mp4` and `<name>-cover.png` exist, `make.mjs films/<name> verify` passes (every ✓),
and `REVIEW.md` has no ❌ (hook ≥ 8/10), with `QA-REPORT.md` and `CAPTION.md` written. Then tell the user: the two
paths, the length, the hook score, one line on the concept, and any open ⚠ rows.

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
