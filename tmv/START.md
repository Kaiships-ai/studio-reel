# START: set up this studio and show the sample episode

Claude: the buyer pasted one prompt that sent you here. Run each step from this folder, one at a time. Each prints ✓ or ✗
with the fix; on a ✗ do the fix and run the step again. If a step fails twice, show the buyer the exact line and the
support contacts in `AGENTS.md`. Never print or commit keys.

Type every command exactly as written here: no `cd`, no `export`, no `2>&1`, no `| tail` or `| grep`. The folder's
allow-list (`.claude/settings.json`) only matches the plain command, so anything added makes Claude Code stop and ask
the buyer. If `pixi` is not found by name, use `~/.pixi/bin/pixi` in its place (same words after it), which is also
allowed. Edit files only under `episodes/`.

1. Install (safe to run again; it skips what is done; a few minutes the first time). It also renders the sample
   episode as its test render:

   ```
   pixi run studio install
   ```

   No `pixi`? Ask the buyer to install it in their own terminal, then open a new terminal and run the step again:
   macOS and Linux `curl -fsSL https://pixi.sh/install.sh | sh`, Windows PowerShell `powershell -ExecutionPolicy ByPass -c "irm -useb https://pixi.sh/install.ps1 | iex"`.

2. The voice key. The narrator's voice is Gemini TTS from Google (free with an AI Studio key). Tell the buyer:
   1. open https://aistudio.google.com/apikey and sign in with Google,
   2. press "Create API key", then Copy,
   3. paste it after `GOOGLE_API_KEY=` in the `.env` file this opens, save it, and say "xong" (done):

   ```
   pixi run studio key
   ```

   Never ask for the key in the chat and never print it. When they say "xong", check (its `voice key` line makes one
   tiny real call; on a ✗ do its fix):

   ```
   pixi run studio doctor
   ```

3. Show the buyer the sample: `episodes/sample/sample.mp4` (preview, 720x1280). Say where it is and ask them to open it.

4. Ask the buyer three questions, one at a time:
   - Your story: what is your app or project, and what happens in episode 1?
   - Your characters: keep the seeded cast (Nova, Theo, Blip), or design your own (`pixi run designer`, open the
     address it prints, press "Copy for Claude", paste it here)?
   - The narrator's voice: Achird (the default, the sample's voice), or hear 3 others first (Puck, Kore, Charon: make
     the episode with each in `narrator.voice` and let them pick)? Characters never speak; one narrator tells the story.

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
