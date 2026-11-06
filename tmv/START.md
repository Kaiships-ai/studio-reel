# START: set up this studio and show the sample episode

Claude: the buyer pasted one prompt that sent you here. Run each step from this folder, one at a time. Each prints ✓ or ✗
with the fix; on a ✗ do the fix and run the step again. If a step fails twice, show the buyer the exact line and the
support contacts in `AGENTS.md`. Never print or commit keys.

1. Install (safe to run again; it skips what is done; a few minutes the first time). It also renders the sample
   episode as its test render:

   ```
   pixi run studio install
   ```

   No `pixi`? Install it from https://pixi.sh (one command on macOS, Linux and Windows), then run the step again.

2. Check:

   ```
   pixi run studio doctor
   ```

3. Show the buyer the sample: `episodes/sample/sample.mp4` (preview, 720x1280). Say where it is and ask them to open it.

4. Ask the buyer three questions, one at a time:
   - Your story: what is your app or project, and what happens in episode 1?
   - Your characters: keep the seeded cast (Nova, Theo, Blip), or design your own (`pixi run designer`, open the
     address it prints, press "Copy for Claude", paste it here)?
   - Voice: the offline voice (Kokoro, free, needs `pixi run fetch voice` once, about 350 MB; not on Intel Macs), or
     record the lines themselves.

5. Make their episode 1: copy `episodes/sample` to `episodes/<name>`, rewrite its `episode.json` from the answers
   (`README.md` lists every field), then:

   ```
   pixi run -e full node episode/make.mjs episodes/<name> vo
   pixi run node episode/make.mjs episodes/<name>
   ```

   The last beat's line says the two vote words; the vote is the last frame. For episode 2, copy the folder again, set
   `"ep": 2`, and write the story that follows the winning comment.
