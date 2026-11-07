---
name: episode
description: Make one episode of the user's show (3D, vertical, ends in a vote) from their story and characters. Use when the user says /episode, "make an episode", "episode 1", or gives a story for one episode.
---

# /episode <name> <what happens>

Run from this folder. `README.md` lists every `episode.json` field; `episodes/sample/episode.json` is a full example.

Type each command exactly as written (no `cd`, `export`, `2>&1` or pipes; if `pixi` is not found use `~/.pixi/bin/pixi`):
the allow-list only matches the plain command, and anything else makes Claude Code ask the user.

1. `pixi run node episode/make.mjs new <name>` (copies the sample's page and `episode.json` into `episodes/<name>`).
2. Rewrite `episodes/<name>/episode.json` from the user's story: `series`, `ep`, `title`, `cast` (seeds `nova`, `theo`,
   `blip`, or entries pasted from the character designer), 8-12 `beats` (one voiced line each, 30-45 s in all), HUD
   numbers that change only when a line says why, and a `vote` whose two tags the last line says ("Comment A for ..., or B for ...").
3. Voice, then video and checks:
   `pixi run -e full node episode/make.mjs episodes/<name> vo` (offline voice; `pixi run fetch voice` once if it asks)
   `pixi run node episode/make.mjs episodes/<name>`
4. Every check must be ✓ (size, length, sound, no black or frozen stretch, faces not blown out). On a ✗, fix what it names
   and run step 3 again. Open `episodes/<name>/out/sheet.jpg` and look at it before telling the user the MP4 path.

For a series (episode 2 follows the vote), use `/series` instead.
