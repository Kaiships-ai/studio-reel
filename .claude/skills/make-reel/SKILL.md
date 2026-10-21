---
name: make-reel
description: Make one finished hand-painted vertical reel (1080x1920 MP4 + cover) in the kai-hand-draw style, starring Clawd and Kai, from a topic, a script, or an example file in styles/kai-hand-draw/examples/. Use when the user types /make-reel, or asks for a reel, a short, or an Instagram video.
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
- **Nothing** → show the three examples in `styles/kai-hand-draw/examples/README.md` and ask which one, or what topic.

Then follow `styles/kai-hand-draw/WORKFLOW.md` exactly, steps 1–12, with `styles/kai-hand-draw/STYLE.md` as the
quality bar on every chapter. Read `REEL_GUIDE.md`, `ANIMATION_GUIDE.md` and `ref/example-STORYBOARD.md` (all in
`styles/kai-hand-draw/`) before the first chapter. Work only inside `films/<name>/`.

Done when: `films/<name>/<name>.mp4` and `<name>-cover.png` exist, `make.mjs films/<name> verify` passes (every ✓),
and `REVIEW.md` has no ❌ (hook ≥ 8/10), with `QA-REPORT.md` and `CAPTION.md` written. Then tell the user: the two
paths, the length, the hook score, one line on the concept, and any open ⚠ rows.
