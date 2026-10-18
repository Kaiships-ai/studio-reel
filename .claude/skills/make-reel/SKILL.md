---
name: make-reel
description: Make one finished hand-painted vertical reel (1080x1920 MP4 + cover) with this kit, from a topic, a script, or an example file in examples/. Use when the user types /make-reel, or asks for a reel, a video, or a short.
argument-hint: <topic | "script in quotes" | examples/<file>.json>
---

# /make-reel

Make one reel end to end and hand back the MP4. Don't ask for approval on the way. Ask one question only if the
topic is too vague to script.

Input: `$ARGUMENTS`
- **A file in `examples/`** → copy its `voice`, `rate`, `pause` and `lines` into `vo/script.json` word for word.
  Use its `concept` as a starting point. If the lines have `<placeholders>`, ask the user for the real items first.
- **A script in quotes** → speak it word for word. Split it into lines, don't edit the words.
- **A topic** → write the script per `VOICE.md` and tick its checklist.
- **Nothing** → show the three examples in `examples/README.md` and ask which one, or what topic.

Then follow `CLAUDE.md` exactly: setup if `.kit-env.json` is missing → steps 1–10 of "How a reel is made" →
"The quality bar" on every chapter. Read `REEL_GUIDE.md`, `ANIMATION_GUIDE.md` and `ref/example-STORYBOARD.md`
before the first chapter.

Done when: `out/<name>.mp4` and `out/<name>-cover.png` exist, `node make.mjs verify` passes, and `REVIEW.md` has
no ❌ (hook ≥ 8/10). Then tell the user: the two paths, the length, the hook score, one line on the concept, and any
open ⚠ rows.
