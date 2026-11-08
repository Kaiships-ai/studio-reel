---
name: episode
description: Make one episode of the user's show (vertical, in the style /story picked, ends in a vote) from their story and characters. Use when the user says /episode, "make an episode", "episode 1", or gives a story for one episode.
---

# /episode <name> <what happens>

Run from this folder. `README.md` lists every `episode.json` field; `episodes/sample/episode.json` is a full example.

Type each command exactly as written (no `cd`, `export`, `2>&1` or pipes; if `pixi` is not found use `~/.pixi/bin/pixi`):
the allow-list only matches the plain command, and anything else makes Claude Code ask the user.

1. `pixi run node episode/make.mjs new <name>` (copies the sample's page and `episode.json` into `episodes/<name>`).
2. Rewrite `episodes/<name>/episode.json` from the user's story: `series`, `ep`, `title`, `style` (from the
   `story.md` frontmatter, `3d`, `paper` or `handdraw`; leave it out for 3d), `cast` (seeds `nova`, `theo`,
   `blip`, or entries pasted from the character designer), `narrator` (keep the voice the user picked; default Achird), 22-26 `beats` (80-90 s in all, no sentence over 12 words), each linked to the one before by But or So. Each `line` is the narrator
   saying "You" for the lead ("You shipped your app today.") and the third person for everyone else; characters never talk, so what they say becomes reported
   speech ("Views are views, he says."); `who` is the character on screen, `idea` a short tag for the beat's one idea (no two alike), HUD
   numbers that change only when a line says why, and a `vote` whose two tags the last line says ("Comment A for ..., or B for ...").
   At least 2 beats are explain cards (`"shot": "card"`, with a `source`): a real rule of the user's field, from the
   research in `story/`. Gate G4 fails without them.
3. Script, then the reader panel, then voice:
   `pixi run node episode/make.mjs episodes/<name> script` (every rule ✓ before the voice: on a ✗, rewrite what it names)
   Then follow `reader-panel` on the script (a quick simulated read: would a viewer keep watching, where do they lose
   the thread?) and fix what it finds, then run `script` again. Only then:
   `pixi run node episode/make.mjs episodes/<name> vo` (one Gemini call; a ✗ on the key means `pixi run studio key`)
   `pixi run node episode/make.mjs episodes/<name>`
4. Every check must be ✓ (size, length, sound, no black or frozen stretch, faces not blown out). On a ✗, fix what it names
   and run step 3 again. Open `episodes/<name>/out/sheet.jpg` and look at it before telling the user the MP4 path.
5. Gates: `pixi run node episode/make.mjs episodes/<name> gates` (the 11 gates; it writes `out/gates.json`). All 11 must
   pass before you say the episode is done: the checks above can be all ✓ while a gate fails. On a ✗ gate, fix what it
   names (G1 is 22-26 beats; G4 is the 2 explain cards) and run step 3 and this step again, up to twice. If it still
   fails, tell the user which gate and why instead of calling the episode done.

For a series (episode 2 follows the vote), use `/series` instead.
