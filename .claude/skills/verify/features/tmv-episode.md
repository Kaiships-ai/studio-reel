# TMV episode (the paid kit's sample episode, cast and character designer)

Files ship from `tmv/`: `episode/` (the 3D engine ported from Ep1: main.js, stage.js, world.js, hud.js, assets/room.glb;
the style registry engines.mjs and the shared timeline.js; make.mjs, voice.py, designer.mjs, index.html, fonts), `episodes/sample/` (episode.json: 24 beats, about 83 s, narrated in "You" with two sourced Problems, index.html, the Gemini narrator's take
`vo/take.wav` and its cut `vo/vo.wav` + `vo/vo.json`), `characters/` (cast.js = the three seeds Nova, Theo, Blip; rig.js builds them in 3D: humans from jay.glb
recoloured and restyled, Blip from primitives) and `character-designer.html`. In the tmv zip there is no `kit/check-reel`: the sample ships rendered
(`episodes/sample/sample.mp4`) and `studio install` draws only its first 2 s (720x1280, 10 fps, 20 frames) as its test
render, then deletes it (`kit/studio.mjs`); it renders the whole sample only if `sample.mp4` is gone.
`test/clean-install.mjs` then makes `episodes/ci-smoke` (`test/tmv-smoke.mjs`: the sample's first beat, first stats card,
first card and vote beat, 13-17 s, drawn at 4 fps on Linux CI (8 fps for the full sample), voiced through the `vo` step from a take cut out of the sample's `vo/vo.wav`) with
every check ✓; `--full-episode` renders a copy of the whole sample as `episodes/ci-full` and runs its 11 gates (CI: nightly
on main, `v*` tags, by hand, the PR label `full-episode`).

## Sub-features

- `episode.vo`: `pixi run node episode/make.mjs <ep> vo` → one Gemini TTS call (`episode/gemini.mjs`; `narrator.voice`,
  default Achird; `GOOGLE_API_KEY` in `.env`, `pixi run studio key`), `vo/take.wav`, cut by `voice.py` (stretches of voice
  grouped so each line's length matches its letters) into `vo/vo.wav`, `vo/vo.json` (lines; word times at the voice's
  own pauses: the words split into one run per stretch of voice, preferring runs that end on . ? ! then , ; :, letter-weighted inside a run). Each line's pauses over 0.34 s are cut to 0.34 s before its words are
  timed (`tighten`, from Ep1's `tighten.py`), so the voice runs on (G8) and the captions and cuts follow the tightened audio. A stretch of sound under 60 ms is a click, not a word: `spoken` drops it, so it never takes a phrase's place. A stretch of noise is a breath, not a word: `spoken` drops a stretch whose median spectral flatness (100 Hz-4 kHz) is 0.28 or more (real takes: breaths 0.34-0.50, words up to 0.21), so an inhale never pulls a caption early. Inside a line, a frame that is not noise counts as voice down to -50 dB (else -38 dB), so a soft word is kept by `tighten` and gets its own stretch; `cuts` keeps -38 dB. A take that reads one line twice (a Gemini glitch seen in PR #41) stops the step with one line naming that line, its two times and "re-run vo for a new take" (`repeated`: 1.2 s windows of speech matched by DTW on cepstra inside the next 6 s; real takes: twice 0.20-0.24, good 0.39-0.45, limit 0.30; skipped when the script itself repeats 4 words). `voice.py --self-check` (synthetic doubled line, soft word, breath) runs in the tmv clean install. Errors: no key / 400 key / 429 (tries the fallback models) / no network
  (`GEMINI_HOST` points it elsewhere to test). Test-only: `TMV_VO_TAKE=<wav>` cuts that take instead of calling Gemini,
  and `studio doctor` then skips its `voice key` call; the journeys set it to the sample's `vo/take.wav`. Dev-only sync check on a Mac with whisper.cpp: `pixi run python dev/caption-sync.py <ep>` (not shipped). `core/render/reel.mjs vo` uses the same path when kai-hand-draw is absent.
- `episode.render`: `make.mjs <ep> render check` → `<ep>/<name>.mp4` at 720x1280 30 fps with the code-made bed (room tone, music, hits; `bed.py`) (ST-77 preview; `--full` only on
  request), checks size, sound, length = voice + 1.4 s, -14 LUFS, no black, no silent gap, no 1.5 s freeze, faces not blown out (`faceluma.py`: under 2 % of skin pixels washed out, frames at 2/s outside cards); `out/sheet.jpg`.
- `episode.script`: `make.mjs <ep> script` (no tools needed, runs before `requireReady`) → the shape check, then the
  rule table in `episode/script.mjs` (`RULES`: id, what, check, fix), from the real season's script-v4: `short` (≤ 12 words a
  sentence), `link` (BUT/SO: a line opening with But/So or `"link"`; card, stats, previously and the last beat exempt;
  "and then" fails), `source` (every card and stats beat), `vote` (a question, two distinct tags, the last line says
  exactly those), `you` (the lead's id or name never in a line, a third of lines say you). ✓/✗ per rule with each beat's
  line and the fix; exit 1 on a ✗. The shipped sample fails link, source and you (third-person, pre plan item 7).
  Every step first checks `episode.json` against `episode/episode.schema.json` (`shapeErrors`: one line per field,
  unknown keys at the top, in beats, palette, texts and vote are errors); cross-field checks (who in cast, seeds and
  parts, the lead in the room, card/stats fields by shot, the phone HUD, the vote words in the last line) stay in `episode()`.
  Unit test: `test/unit/tmv-script.test.mjs` with `test/fixtures/tmv-script/{good,bad}`.
- `episode.gates`: `make.mjs <ep> gates` → `episode/gates.py`, the 11 gates the real season's episode 1 passed 11/11 (size
  and 80-90 s, −14 LUFS, a cut every ≤ 3 s, no shot over 4.5 s, a cut by 1.5 s, cream explain cards with nothing faint
  behind (G4b: the share of the band in 3x3 faint patches under the paper's 90th percentile, on the beat's paper frames,
  the luma > 180 ones of 25/50/75/90 %; the card's own type is thinner than a patch; G4 takes the brightest of those frames), 15 s of faces with 3+ expressions, each idea once, voice that runs on, voice under every shot) → `out/gates.json`,
  exit 1 on a fail. A gate it cannot measure prints `–` (G6 needs an `idea` tag per beat; `make.mjs` refuses an empty one).
- `episode.style`: `"style"` in `episode.json` or `series.json` (`3d` | `paper` | `handdraw`, schema enum, `3d` when left
  out; `series.mjs new` moves it to `series.json`). `episode/engines.mjs` maps each style to its page (`episode/index.html`,
  `episode/paper/index.html`, `episode/handdraw/index.html`); `make.mjs render` copies that page into the episode folder,
  then renders it. A style whose page is missing stops before the browser with `the paper engine is not built yet (no
  episode/paper/index.html): ...`. A new engine imports `episode/timeline.js` (`loadEpisode`, `cardsOf`, `timeline`) for the
  episode, its voice, the cast cards (draw them with `toPaper` / `toHandDraw` from `core/character-card.mjs`), the shots,
  caption words and HUD, so the cuts below and the gates hold in every style. Unit test: `test/unit/tmv-engines.test.mjs`.
- `episode.handdraw` (`"style": "handdraw"`): `episode/handdraw/index.html` loads `styles/kai-hand-draw/engine/core.js` +
  `kaip.js` (paper grain, 12 fps boil) and `handdraw.js`, which draws each cast card as its `toHandDraw` presenter in the
  timeline's shots. `framing.js` (pure) picks who and how big: close = the speaker's bust with the beat's `exp`; two = the
  speaker and the lead (the lead with the first bot); wide/room = the room on its feet; phone = the lead with the phone;
  the rival's corner holds only him. A bot card is drawn as a person (`toHandDraw` lists it as lost). The speaker's mouth moves while their line's words play (`VO_WORDS`). `lettering.js`
  draws the type in the style's look: `card`, `stats` and `previously` as a paper index card on a cream ground to the
  frame's edges (G4 luma > 180, G4b no faint ground), lettered in Permanent Marker and Shantell Sans (the page loads both
  from `styles/kai-hand-draw/engine/fonts/`, kept in the tmv zip by `!` lines and checked by `missingFonts`); the HUD as a
  paper tag; the vote high in the frame (the HUD hides) as the question strip and one paper card per answer, each popping in on its spoken tag; captions
  (`phrases`/`phraseAt`, pure: up to 3 words / 18 characters of one line) on a painted ink plate at y 1580, spoken words
  cream, the live word ochre, words not yet spoken grey. `set.js` paints the world behind every story shot (never behind a card):
  the lead's room (window with the neon, string lights, desk, monitor, lamp, shelf, poster, note board) or, when the
  speaker is in the corner, the rival's corner (his `texts.sign` as a neon sign, ring light, bulbs). `settingOf` (pure)
  takes its colours from `palette` (`neon`, `left` = room lights, `right` = poster and the rival's glow, `card` = notes)
  with main.js's fallbacks; `viewOf` (pure) picks the part of the set each shot sees (close-ups look at one side of the
  room, alternating). Each element calls `boilSeed('set:…')`, so the set boils at 12 fps and holds between boil steps.
  Unit test: `test/unit/tmv-handdraw.test.mjs`. Stills, no video:
  `node core/render/still.mjs <ep> <t...> --size 1080x1920` after copying the page in as `make.mjs render` does; gates.py's
  `luma(png, 0)` and `faint(png, 0)` measure G4/G4b on a single still.
- `episode.cuts` (`episode/timeline.js`, shared by every engine): one beat per voiced line, cut every 2.6 s at most: a longer story beat splits on word starts into
  sub-shots that alternate its own angle and a cover angle (the lead: close ↔ phone; a bot: close ↔ two; the rival's
  corner: close ↔ wide), the first beat cuts by 1.5 s (on a word start no later than that, when there is one), the vote holds, a card holds up to 4 s: a longer `card` or
  `stats` beat opens on its `who` in close-up and the card lands on the first sentence that leaves it 2-4 s. Gates G3a, G3b, G7 read it.
- `episode.look` (ST-79): the Ep1 room at night (neon through the curtain, screen key, rim light, bloom, DOF, grain), the
  rival's corner (ring light, neon sign from `texts.sign`), shots close / two / wide / phone / card, cream cards, kicker
  `<SERIES> · EP N`, word-by-word captions, HUD chips that roll on change, no end card: the vote is the last frame.
- `cast.designer`: `pixi run designer` serves the page; seeds, parts, colours rebuild the same 3D figure the episode uses;
  "Copy for Claude" copies one sentence plus a cast JSON entry.
- `cast.styles`: `pixi run node episode/make.mjs styles <card>` (`<card>` = a seed, or a `.json` card: a cast entry, `{"seed": …}`
  plus overrides, or every part; `--out <file.png>`, default `workspace/<name>-styles.png`) → one 1280-wide PNG, the
  card's character side by side in 3D (`characters/rig.js` on the designer's stage, `lost3D`; top "jacket" = the hoodie
  opened over a white shirt, a shader on the hoodie material; both stages carry a low front fill so the jaw is not black), hand-draw (`toHandDraw` →
  `styles/kai-hand-draw/engine/kaip.js` on `core.js`, the only two hand-draw scripts the tmv zip keeps, with two fonts: `!` lines in
  `[tmv_exclude]`) and paper (`toPaper` → `core/paper-figure.js`), each labelled with what that style draws differently.
  Pages: `episode/three-styles/` (index.html composes 3d/hand/paper.html, one iframe each; a panel sets `window.SHOT`
  once drawn; an error in any panel fails the command through `openDemo`). A card that breaks `checkCard` or an unknown seed stops before
  the browser starts.

## Driving it

`node .claude/skills/verify/journeys.mjs --only=tmv-episode [--zip=<built tmv zip>]` (needs `pixi` on PATH; the install step is `test/clean-install.mjs`; a few
minutes): builds the zip, unzips into a fresh folder with a space in its path, `pixi run studio install` (sample
episode, every check ✓), doctor, second install no-op, designer served from the kit (3D screenshots of each seed + one
designed) and copied JSON (no `voice` field), `make.mjs styles nova` and a made-up card (two 1280-wide PNGs), planted breaks (a beat for `nobody` → `"who": "nobody" is not in the cast`; a changed line →
names the vo step). Evidence: `tmv-sample.mp4`, `tmv-sheet.jpg`, `tmv-char-*.png`, `tmv-styles-*.png`.

- `series` (slice 4): `episode/series.mjs new|next|status`; `series.json` holds series, cast, palette, texts (make.mjs and
  main.js merge it under each episode); `next --winner X` writes `previously` + the PREVIOUSLY card beat; the journey
  renders Ep2 from `features/tmv-series-ep2.json`, voiced from the sample's recorded take (no key in CI). Evidence: `tmv-series-ep1.mp4`, `tmv-series-ep2.mp4`, `tmv-series.json`.
- `one-prompt` (slice 5): `START.md` + the `/studio`, `/episode`, `/series` skills + `.claude/settings.json` (allows
  `pixi run *` and the episode scripts; buyer kit only) + `make.mjs new <name>`. Journey `tmv-one-prompt`: a fresh
  unzip, then every fenced command in START.md in order, as written; the two places Claude writes a story use the sample
  (retitled) and `features/tmv-series-ep2.json`. Ends with ep1 and the linked ep2, every check ✓. Evidence: `prompt-ep1.mp4`, `prompt-ep2.mp4`.
