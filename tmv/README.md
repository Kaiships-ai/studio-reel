# How we make Ten Million Views

Make a whole series of short vertical episodes with your own characters and story, in Claude Code.

1. Unzip `tmv-studio`, open Claude Code in the folder, and trust it once.
2. Paste the one prompt from your receipt. Claude reads `START.md`, installs everything inside this
   folder, renders the sample episode, and asks you three questions.
3. Then make your series: your episode 1 ends in a vote, episode 2 picks up the winner.

Runs on macOS 14+ (Apple Silicon), Windows 10/11 x64 and Linux x64. Needs Claude Code with your own
Claude plan. Licence: `LICENSE`. Help: Discord (Buyer role) or kaiships.ai@gmail.com.

## What is in the folder

- `episodes/sample/`: the sample episode. `episode.json` is the whole story: cast, beats (who says what, the shot, HUD
  numbers) and the closing vote. Setup renders it to `episodes/sample/sample.mp4` (preview, 540x960).
- `episode/make.mjs`: voice (`pixi run -e full node episode/make.mjs <episode> vo`, offline Kokoro voice, after
  `pixi run fetch voice` once), then `pixi run node episode/make.mjs <episode>` for the preview MP4 and its checks.
- `characters/cast.js`: the three seeded characters, Nova (lead), Rook (rival) and Blip (mascot).
- `character-designer.html`: open it, design your own character, press "Copy for Claude", paste into Claude Code.
