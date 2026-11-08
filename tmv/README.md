# How we make Ten Million Views

Make a whole series of short vertical episodes with your own characters and story, in Claude Code.

0. Once per computer, install pixi (it installs everything else inside the folder) in a terminal, then close it:
   macOS and Linux `curl -fsSL https://pixi.sh/install.sh | sh`, Windows PowerShell
   `powershell -ExecutionPolicy ByPass -c "irm -useb https://pixi.sh/install.ps1 | iex"` (about 15 seconds).
1. Unzip `tmv-studio` to a short path (for example `~/tmv-studio`), open a **new** terminal there and start Claude Code (`claude`).
2. Claude Code asks once whether you trust the folder, with "No, exit" selected (it does that for every new folder):
   press ↓ to pick **Yes, I trust this folder**, then Enter. The folder pre-approves only its own setup and episode
   commands (`.claude/settings.json`), so Claude does not stop to ask you before each one.
3. Paste the one prompt (it is also on your receipt):

   ```text
   Set up How we make Ten Million Views in this folder: read START.md and follow it step by step.
   ```

   Claude reads `START.md`, starts the install inside this folder in the background (2-4 minutes the first time), shows
   you the sample episode (`episodes/sample/sample.mp4`, it ships ready) and, while the install runs, asks you three
   questions and helps you make a free Google AI Studio key for the narrator's voice (`pixi run studio key` opens
   `.env`; paste the key there, never in the chat). Then it makes your episode 1 (about 3 minutes).
4. To make your own show, start with `/story`: premise, characters, your character drawn in three styles to pick from, the
   world, a season of votes. Then make your episodes with `/episode` (`pixi run node episode/make.mjs new <name>`, write the story in its
   `episode.json`, render) and turn them into a series with `/series`. Each episode ends in a vote; the next one follows
   the winning comment.

**You did it** when these two files exist and play: `episodes/sample/sample.mp4` (the sample, there from the start) and
`episodes/ep1/ep1.mp4` (your own episode 1, under 10 minutes after you paste the prompt on a machine with a GPU; after
`/series` it is copied to `episodes/<show>/ep1/ep1.mp4`). `pixi run studio doctor` then shows only ✓ lines, ending in "All good".

**If something goes wrong** (the three problems seen in real runs):

| You see | Fix |
|---|---|
| `pixi: command not found` | pixi is not installed yet (step 0), or was just installed: open a new terminal in this folder and start `claude` again, or let Claude use `~/.pixi/bin/pixi` (it is allowed too) |
| `✗ voice key: no key in .env` | run `pixi run studio key`, paste the key right after `GOOGLE_API_KEY=` on the same line, **save the file**, say "xong". A `429` line means today's free voice quota is used up: the key is fine, try again after it resets |
| The install's test render says "no GPU found" | the browser found no graphics card (some Linux and Windows machines, virtual machines): it still works, only slower. Episodes take about an hour each there; use a Mac or a PC with a GPU if you can |

Still stuck: Discord (Buyer role) or kaiships.ai@gmail.com, with the ✗ line you see.

Runs on macOS 14+ (Apple Silicon), Windows 10/11 x64 and Linux x64. Needs Claude Code with your own
Claude plan, a Google account (the voice key is free) and the internet for the voice step. Licence: `LICENSE`. Help: Discord (Buyer role) or kaiships.ai@gmail.com.

## What is in the folder

- `episodes/sample/`: the sample episode, in 3D (a room at night with neon through the curtain, a rival's corner, a
  phone, cream cards, a data card, HUD chips with meters, word-by-word captions, a code-made sound bed, the vote as the
  last frame). `episode.json` is the whole story; every word on screen comes from it (the engine has English fallbacks only for `texts` you leave out). It ships rendered as
  `episodes/sample/sample.mp4` (preview, 720x1280); `pixi run node episode/make.mjs episodes/sample` renders it again.
- `episode/`: the 3D engine the episodes play in (`main.js`, `stage.js`, `world.js`, `hud.js`, the room in `assets/`) and
  `bed.py` (room tone, music bed and hits under the voice, made in code, no samples).
- `episode/make.mjs`: voice (`pixi run node episode/make.mjs <episode> vo`: one Gemini TTS call reads the whole episode
  in the narrator's voice; the key is `GOOGLE_API_KEY` in `.env`), then `pixi run node episode/make.mjs <episode>` for the preview MP4 and its checks.
- `characters/cast.js`: the three seeded characters, Nova (lead), Theo (rival) and Blip (mascot, a robot);
  `characters/rig.js` builds each one in 3D from those parameters.
- `character-designer.html`: run `pixi run designer`, open the address it prints, design your own character on the same
  3D figures, press "Copy for Claude", paste into Claude Code.

## A series

`pixi run node episode/series.mjs new episodes/<show> --from episodes/<episode 1>` makes `episodes/<show>/series.json` (the show's
name, cast, palette and texts, shared by every episode) and `ep1/`. When the vote is in,
`pixi run node episode/series.mjs next episodes/<show> --winner B` records it and writes `ep2/episode.json` with the opening
(a `"shot": "previously"` card: PREVIOUSLY · EP 1, the question, the winning answer) and a recap beat; write the rest of
the story, then `vo` and render it like any episode. `pixi run node episode/series.mjs status episodes/<show>` lists them.

## episode.json

`make.mjs` checks the fields below and names the beat or cast entry to fix.

| Field | What it is |
|---|---|
| `series`, `ep`, `title` | Show name, episode number (1, 2, ...), the title over the first shot |
| `palette` | Colours `neon` (accents: highlighted caption words, HUD meters, the room's neon), `left` (vote A, room lights), `right` (vote B, the rival's sign), `card` (card paper), `ink` (highlighted words on the cards; defaults to `neon`, set it when `neon` is too light to read on `card`), as `#RRGGBB` |
| `texts` | Every other word on screen: `handle` (the lead's phone), `sign` (the rival's neon sign), `kicker` (`{series} · EP {ep}`), `phoneLabel`, `phoneHud` (which HUD label the phone shows), `phoneFoot`, `or`, `voteFooter` (`{a}`, `{b}`, `{next}` fill in) |
| `cast` | `[{ "id", "seed" }]` or the entry the designer copies. The first human in the room is the lead at the desk; `"role": "rival"` or `"place": "corner"` puts a character in the corner across town; bots stand on the desk; more humans stand in the room |
| `narrator` | The one voice that tells the story: `{"voice": "Achird", "style": "warm storyteller, a little wry"}`. `voice` is a Gemini voice (default `Achird`; others e.g. `Puck`, `Kore`, `Charon`), `style` a few words of delivery (optional) |
| `model` | Optional Gemini TTS model (default `gemini-3.8-flash-tts`; on a 429 the vo step tries `gemini-3.8-flash-lite-tts`, then `gemini-3.1-flash-tts-preview`) |
| `beats` | One per narrated line: `who`, `line`, `shot`, `idea`, `exp`, `hud`, `hot`, and `card` or `stats` |
| `beats[].who` | Who is on screen (a cast `id`). Characters never speak; the narrator tells the story |
| `beats[].line` | What the narrator says: "You" for the lead ("You shipped your app today."), the third person for everyone else. Quotes become reported speech ("Views are views, he says.") |
| `beats[].shot` | `room` (establishing), `close`, `two`, `wide`, `phone`, `card` (2 lines on paper: `"card": ["LINE", "LINE"]`), `stats` (a data card: `"head"`, `"stats": [{"label", "value", "extra", "bar": 0..1, "style": "danger"}]`, `"source"`). A card beat over 4 s opens on its `who` in close-up, then the card |
| `beats[].exp` | A face for the character on screen: angry, determined, doubt, excited, grin, guilty, laugh, nervous, proud, relieved, sad, shock, smirk, surprise, teary, thinking, tired, worried |
| `beats[].hud` | HUD chips from this beat on: `{"VIEWS": "212"}` or `{"GOAL": {"value": "2%", "bar": 0.02, "style": "danger"}}` (a meter; `danger` = accent colour). A changed value rolls in |
| `beats[].hot` | Extra caption words to colour (numbers and the vote words already are) |
| `beats[].idea` | The beat's one idea, a short tag (`"theo-ad-hits-40k"`). No two beats share one; `make.mjs <ep> gates` checks it (G6) once every beat has a tag |
| `vote` | `question`, `a`, `b`, and the spoken tags `tagA`, `tagB` (default `A`, `B`): the last line must say them |
