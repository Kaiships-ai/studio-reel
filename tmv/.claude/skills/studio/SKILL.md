---
name: studio
description: Install or check the How we make Ten Million Views studio in this folder. Use when the user pastes the setup prompt, says install, setup, doctor, or something does not work.
---

# /studio

Run from this folder. Each step prints one ✓ or ✗ line with the fix.

Type each command exactly as written (no `cd`, `export`, `2>&1` or pipes; if `pixi` is not found use `~/.pixi/bin/pixi`):
the allow-list only matches the plain command, and anything else makes Claude Code ask the user.

- Install (safe to run again, it skips what is done; 2-4 minutes the first time, so run it in the background and go on
  with the buyer): `pixi run studio install`. The sample episode ships rendered: `episodes/sample/sample.mp4`.
- Voice key (once): `pixi run studio key` opens `.env`; the user pastes the key from https://aistudio.google.com/apikey
  after `GOOGLE_API_KEY=` and saves. Never ask for the key in the chat, never print it.
- Check: `pixi run studio doctor` (its `voice key` line makes one tiny real Gemini call)

On a ✗, do what the line says, then run the step again. If it fails twice, tell the user the exact
line and the support contacts in `AGENTS.md`.
