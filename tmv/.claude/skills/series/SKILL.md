---
name: series
description: Make a series of linked episodes where each one follows the comment vote of the last. Use when the user says /series, "next episode", "episode 2", "the vote is in", or names a winning answer.
---

# /series <show> [winner]

Run from this folder. A series is `episodes/<show>/series.json` (show name, cast, palette, texts, shared by every

Type each command exactly as written (no `cd`, `export`, `2>&1` or pipes; if `pixi` is not found use `~/.pixi/bin/pixi`):
the allow-list only matches the plain command, and anything else makes Claude Code ask the user.

episode) plus `ep1/`, `ep2/`, ...

- Start: make episode 1 with `/episode` (or use the sample), then
  `pixi run node episode/series.mjs new episodes/<show> --from episodes/<episode 1 folder>`.
- The vote is in (the user tells you A or B):
  `pixi run node episode/series.mjs next episodes/<show> --winner <A|B>`.
  It writes `ep<N+1>/episode.json` with the opening: a PREVIOUSLY · EP N card (the question, the winning answer) and
  one recap line. Replace the WRITE ... placeholders: the title, the recap (what the winning choice caused), 6-10 beats
  that follow it, and a new vote. Leave out `series` and `cast`: they come from `series.json`.
- Voice and render as in `/episode` step 3, with `episodes/<show>/ep<N+1>`.
- `pixi run node episode/series.mjs status episodes/<show>` lists every episode, its MP4 and its winner.
