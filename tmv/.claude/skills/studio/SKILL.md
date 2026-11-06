---
name: studio
description: Install or check the How we make Ten Million Views studio in this folder. Use when the user pastes the setup prompt, says install, setup, doctor, or something does not work.
---

# /studio

Run from this folder. Each step prints one ✓ or ✗ line with the fix.

- Install (safe to run again, it skips what is done): `pixi run studio install`
- Check: `pixi run studio doctor`

On a ✗, do what the line says, then run the step again. If it fails twice, tell the user the exact
line and the support contacts in `AGENTS.md`.
