# How we make Ten Million Views

Make a whole series of short vertical episodes with your own characters and story, in Claude Code.

1. Unzip `tmv-studio`, open Claude Code in the folder, and trust it once.
2. Paste the one prompt from your receipt. Claude reads `START.md`, installs everything inside this
   folder, renders the sample episode (`episodes/sample/sample.mp4`), and asks you three questions.
3. Then make your episodes with `/episode` (`pixi run node episode/make.mjs new <name>`, write the story in its
   `episode.json`, render) and turn them into a series with `/series`. Each episode ends in a vote; the next one follows
   the winning comment.

Runs on macOS 14+ (Apple Silicon), Windows 10/11 x64 and Linux x64. Needs Claude Code with your own
Claude plan. Licence: `LICENSE`. Help: Discord (Buyer role) or kaiships.ai@gmail.com.

## What is in the folder

- `episodes/sample/`: the sample episode, in 3D (a room at night with neon through the curtain, a rival's corner, a
  phone, cream cards, a data card, HUD chips with meters, word-by-word captions, a code-made sound bed, the vote as the
  last frame). `episode.json` is the whole story; every word on screen comes from it (the engine has English fallbacks only for `texts` you leave out). Setup renders it to
  `episodes/sample/sample.mp4` (preview, 720x1280).
- `episode/`: the 3D engine the episodes play in (`main.js`, `stage.js`, `world.js`, `hud.js`, the room in `assets/`) and
  `bed.py` (room tone, music bed and hits under the voice, made in code, no samples).
- `episode/make.mjs`: voice (`pixi run -e full node episode/make.mjs <episode> vo`, offline Kokoro voice, after
  `pixi run fetch voice` once), then `pixi run node episode/make.mjs <episode>` for the preview MP4 and its checks.
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
| `palette` | Colours `neon` (accents), `left` (vote A, room lights), `right` (vote B, the rival's sign), `card` (card paper), as `#RRGGBB` |
| `texts` | Every other word on screen: `handle` (the lead's phone), `sign` (the rival's neon sign), `kicker` (`{series} · EP {ep}`), `phoneLabel`, `phoneHud` (which HUD label the phone shows), `phoneFoot`, `or`, `voteFooter` (`{a}`, `{b}`, `{next}` fill in) |
| `cast` | `[{ "id", "seed" }]` or the entry the designer copies. The first human in the room is the lead at the desk; `"role": "rival"` or `"place": "corner"` puts a character in the corner across town; bots stand on the desk; more humans stand in the room |
| `beats` | One per voiced line: `who`, `line`, `shot`, `exp`, `hud`, `hot`, and `card` or `stats` |
| `beats[].shot` | `room` (establishing), `close`, `two`, `wide`, `phone`, `card` (2 lines on paper: `"card": ["LINE", "LINE"]`), `stats` (a data card: `"head"`, `"stats": [{"label", "value", "extra", "bar": 0..1, "style": "danger"}]`, `"source"`) |
| `beats[].exp` | A face for the speaker: angry, determined, doubt, excited, grin, guilty, laugh, nervous, proud, relieved, sad, shock, smirk, surprise, teary, thinking, tired, worried |
| `beats[].hud` | HUD chips from this beat on: `{"VIEWS": "212"}` or `{"GOAL": {"value": "2%", "bar": 0.02, "style": "danger"}}` (a meter; `danger` = accent colour). A changed value rolls in |
| `beats[].hot` | Extra caption words to colour (numbers and the vote words already are) |
| `vote` | `question`, `a`, `b`, and the spoken tags `tagA`, `tagB` (default `A`, `B`): the last line must say them |
