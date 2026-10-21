---
title: Install
description: What you need and how the first run sets itself up.
group: Start
order: 1
---

## What you need

- [Node.js](https://nodejs.org) 18 or newer.
- [Claude Code](https://claude.com/claude-code).
- An internet connection for the first run and for the voiceover.

## Steps

1. Unzip the folder anywhere (or `git clone` the repo if you got the GitHub invite).
2. Open the folder in Claude Code: `cd` into it, then run `claude`.
3. Paste any prompt. The first run sets everything up by itself. It takes a few minutes and needs internet.

You do not need to install anything else yourself. On the first request Claude runs `node setup.mjs`, which installs
the npm packages, creates `.venv` with edge-tts and numpy, and finds Chrome and ffmpeg (or downloads copies into
`.tools/`). It needs no sudo and installs nothing globally. It ends with a ✓/✗ summary, and if a line shows ✗,
Claude runs the fix it prints and tries again.
