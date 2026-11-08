# START: set up this studio, show the sample, make the buyer's episode 1

Claude: the buyer pasted one prompt that sent you here. Run the steps from this folder, in order. Each command prints ✓ or ✗
with the fix; on a ✗ do the fix and run the step again. If a step fails twice, show the buyer the exact line and the
support contacts in `AGENTS.md`. Never print or commit keys.

Type every command exactly as written here: no `cd`, no `export`, no `2>&1`, no `| tail` or `| grep`. The folder's
allow-list (`.claude/settings.json`) only matches the plain command, so anything added makes Claude Code stop and ask
the buyer. If `pixi` is not found by name, use `~/.pixi/bin/pixi` in its place (same words after it), which is also
allowed. Edit files only under `episodes/`.

Background commands (the install, the designer): start them with `run_in_background` and wait for Claude Code's
notice that they finished. Never check on them with a shell loop, `tail`, `grep`, `ls` or `sleep`: each of those makes
Claude Code stop and ask the buyer. If you need a line one printed (the designer's address), open its output file with
the Read tool.

The buyer should reach their own episode 1 in under 10 minutes. The install (2-4 minutes the first time) runs in the
background while you ask the questions and they make the key: do not wait for it before step 2.

1. Install, **in the background** (Claude Code's `run_in_background`; safe to run again, it skips what is done). It ends
   with a 2-second test render; you are told when it finishes:

   ```
   pixi run studio install
   ```

   While it runs, show the buyer the sample, which ships ready: `episodes/sample/sample.mp4` (preview, 720x1280, 44 s).
   Say where it is and ask them to open it.

   No `pixi`? Ask the buyer to install it in their own terminal, then open a new terminal and run the step again:
   macOS and Linux `curl -fsSL https://pixi.sh/install.sh | sh`, Windows PowerShell `powershell -ExecutionPolicy ByPass -c "irm -useb https://pixi.sh/install.ps1 | iex"`.

2. Ask the buyer the first question now (the install is still running): **Your story**: what is your app or project,
   and what happens in episode 1?

3. The voice key. The narrator's voice is Gemini TTS from Google (free with an AI Studio key). Tell the buyer:
   1. open https://aistudio.google.com/apikey and sign in with Google,
   2. press "Create API key", then Copy,
   3. paste it after `GOOGLE_API_KEY=` in the `.env` file this opens, save it, and say "xong" (done):

   ```
   pixi run studio key
   ```

   (It may wait a minute while the install sets up the tools; that is normal.) Never ask for the key in the chat and
   never print it.

4. Ask the other two questions, one at a time:
   - The narrator's voice: Achird (the default, the sample's voice), or hear 3 others first (Puck, Kore, Charon: make
     the episode with each in `narrator.voice` and let them pick)? Characters never speak; one narrator tells the story.
   - Your characters: keep the seeded cast (Nova, Theo, Blip), or design your own? The designer needs the install to
     have finished (it uses the 3D packages the install puts in this folder): then run `pixi run designer` in the
     background, give the buyer the address it prints, and they press "Copy for Claude" and paste it here.

   When they say "xong" for the key **and** the install has finished, check (its `voice key` line makes one tiny real
   call; on a ✗ do its fix):

   ```
   pixi run studio doctor
   ```

5. Make their episode 1 with `/episode` (the skill in `.claude/skills/episode`):

   ```
   pixi run node episode/make.mjs new ep1
   ```

   rewrite `episodes/ep1/episode.json` from the answers as third-person narration (`README.md` lists every field), then:

   ```
   pixi run node episode/make.mjs episodes/ep1 vo
   pixi run node episode/make.mjs episodes/ep1
   ```

   The last beat's line says the two vote words; the vote is the last frame.

   When `episodes/ep1/ep1.mp4` exists and its check is all ✓, tell the buyer in one short block: **you did it**:
   the sample (`episodes/sample/sample.mp4`) and their own episode 1 (`episodes/ep1/ep1.mp4`) are made, `pixi run studio
   doctor` shows all ✓, and the next step is posting episode 1 and waiting for the vote. If anything failed on the way,
   the README's "If something goes wrong" table has the three common fixes; support is Discord (Buyer role) or
   kaiships.ai@gmail.com.

6. Turn it into a series with `/series` (`.claude/skills/series`). When the buyer says which answer won:

   ```
   pixi run node episode/series.mjs new episodes/my-show --from episodes/ep1
   pixi run node episode/series.mjs next episodes/my-show --winner B
   ```

   then write episode 2's story in `episodes/my-show/ep2/episode.json` (replace every WRITE ... placeholder) and:

   ```
   pixi run node episode/make.mjs episodes/my-show/ep2 vo
   pixi run node episode/make.mjs episodes/my-show/ep2
   ```

   Ep 2 opens on PREVIOUSLY · EP 1 with the winning answer. Use the buyer's own show name instead of `my-show`.
