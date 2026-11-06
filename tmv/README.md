# How we make Ten Million Views

Make a whole series of short vertical episodes with your own characters and story, in Claude Code.

1. Unzip `tmv-studio`, open Claude Code in the folder, and trust it once.
2. Paste the one prompt from your receipt. Claude reads `START.md`, installs everything inside this
   folder, renders the sample episode, and asks you three questions.
3. Then make your series: your episode 1 ends in a vote, episode 2 picks up the winner.

Runs on macOS 14+ (Apple Silicon), Windows 10/11 x64 and Linux x64. Needs Claude Code with your own
Claude plan. Licence: `LICENSE`. Help: Discord (Buyer role) or kaiships.ai@gmail.com.

## What is in the folder

- `episodes/sample/`: the sample episode, in 3D (a room at night with neon through the curtain, a rival's corner, a
  phone, cream cards, HUD chips, word-by-word captions, the vote as the last frame). `episode.json` is the whole story:
  cast, beats (who says what, the shot: `close`, `two`, `wide`, `phone` or `card`, a face: `exp`, HUD numbers), colours
  (`palette`), texts (`texts`) and the closing vote. Setup renders it to `episodes/sample/sample.mp4` (preview, 540x960).
- `episode/`: the 3D engine the episodes play in (`main.js`, `stage.js`, `world.js`, `hud.js`, the room in `assets/`).
- `episode/make.mjs`: voice (`pixi run -e full node episode/make.mjs <episode> vo`, offline Kokoro voice, after
  `pixi run fetch voice` once), then `pixi run node episode/make.mjs <episode>` for the preview MP4 and its checks.
- `characters/cast.js`: the three seeded characters, Nova (lead), Theo (rival) and Blip (mascot, a robot);
  `characters/rig.js` builds each one in 3D from those parameters.
- `character-designer.html`: run `pixi run designer`, open the address it prints, design your own character on the same
  3D figures, press "Copy for Claude", paste into Claude Code.
