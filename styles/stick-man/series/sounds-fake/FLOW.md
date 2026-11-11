# Sounds Fake · per-episode flow

One episode = one 60-80 s reel. Kai (owner) has one gate: he approves the render (script, sources, board, stills and judge score in one pack). Kit commands: `.claude/skills/make-reel-stick-man/SKILL.md`; story steps: story-skills, run on `story/` with `node <story-skills>/skills/story-maintenance/scripts/story.js`. Quality bar: `styles/stick-man/tools/judge.mjs` PASS (mean ≥ 8.5, no category < 8).

| # | Stage | Input → output | Done when |
|---|---|---|---|
| 0 | Story backlog | `LEDGER.md` backlog: stories already through stages 2-4 (research `verified`, fact-reviewed) | ≥ 1 week ahead (≥ 21 stories at 3/day) |
| 1 | Intake | Kai's script, or "next episode" → top of the verified backlog | one story named |
| 2 | Fit-check vs bible | 6 yes/no: odd act as a plain fact? doubter on record? hidden rule to explain? a last image? sources findable? fits 195-235 words? | 6 yes, else next idea |
| 3 | Story (story-skills) | `research` note (every claim + opened URL) → `story add chapter` + beat `scene`s (`plot-structure`, `scene-craft`) → prose = narration → `revision-continuity` (`check`, `continuity`, `prose`) → `adaptation` writes `adaptations/reel/epNN.script.json` | research `verified`, `story check` 0 errors |
| 4 | Independent fact-review | a separate reviewer agent (Sonnet, never the writer) gets the script + research note only, re-opens every URL, marks each line ok / overstated / unsourced | 0 unsourced, overstated lines rewritten |
| 5 | Voice + TTS check | `voice.py --take Achird` (≤ 3 takes, keep one in 60-80 s) → listen-check every name and number in `adaptations/audiobook/production.md` (Helicobacter, Fremantle, years) → `align.py` | no ❌ in `voice-qa.md`, names said right |
| 6 | Storyboard | EPISODES.md beat table → `storyboard.json` (see, shot, set, props/fx, label, name plaque, `act`) | every line has a picture and a body verb |
| 7 | Reel data (micro-animated) | `reel.js` / `reel2.js`; one act per place; a new asset only if the bible's world table says "build" | stills of each line's key word look right |
| 8 | Sound | `music.json` sections → `sound.py`; music source note in `films/<slug>/audio/SOURCE.md` (kit-generated bed from `tools/sound_music.py`, or the track, licence and link) | mix at −14 LUFS, source noted |
| 9 | Gates + board + judge | hard gates (format, duration per the engine lane's widened 60-80 s gate in `tools/gates.mjs`, first word 0.00, tail ≤ 0.3 s, floating labels 0, collisions, joints, captions); principles reported, not blocking; `board.mjs --judge 3` once; `judge.mjs` | hard gates PASS, board ≥ 85 %, judge PASS |
| 10 | Approval pack → Kai | script + sources + review verdict + board + 6 stills + gate and judge lines | **Kai: "render"** |
| 11 | Render | `shot.mjs --mp4` with `audio/mix.wav` | mp4 + sheet |
| 12 | Post pack | caption (hook line, "Sources: comment SOURCE", "AI voice", "Don't try this at home" when the act is risky), pinned comment with sources, cover (Bram's face + climax) | files in `films/<slug>/post/` |
| 13 | Ledger | `LEDGER.md` row; kit assets added; lesson | row filled |
| 14 | Retention (48 h later) | views, avg watch %, the second where viewers drop → LEDGER | a drop at the same beat in 3 episodes → propose a bible change (minor version; principles only; hard rules only with Kai) |

## Budget per episode (65-70 s)

**Target after ep 3.** Record the real ep 1-3 numbers in `films/<slug>/LEDGER.md` and here; stop and tell Kai if any stage runs over 1.5×.

| Stage | Tokens | Minutes |
|---|---|---|
| 1-2 intake + fit-check | 3k | 2 |
| 3 story (6-10 fetches, script, checks) | 35k | 15 |
| 4 independent fact-review | 10k | 6 |
| 5 voice + TTS check + align | 6k | 7 |
| 6 storyboard | 12k | 8 |
| 7 reel data | 45k | 25 |
| 8 sound | 4k | 4 |
| 9 gates + board + judge | 30k | 18 |
| 11 render | 2k | 15 (machine) |
| 12-14 post pack, ledger, retention | 8k | 6 |
| **Total** | **~155k** | **~90 + 15 render** |
| New place or prop (first use only) | +30-60k | +20-40 (ep 1: kitchen, stomach model, medal) |

**3 a day:** ~465k tokens and ~4.5-5 h of agent time, pipelined: stages 3-4 for tomorrow's backlog run while today's episodes render; Kai approves three packs in one sitting. Today's cost: ~284k tokens and 1-2.5 h for 30 s (9.5k tokens per second of video); target ~2.3k/s, because the script swaps and the world stays, research and canon live in `story/`, and principles are reported, not gated (max 1 fix round, then show Kai).

**Stop rules:** research not `verified` or fact-review not clean → no voice. Two fix rounds on one gate → stop and show Kai the FAIL line with a still.
