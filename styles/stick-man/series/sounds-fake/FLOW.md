# Sounds Fake · per-episode flow

One episode = one 60-80 s reel. Kai has one gate: he approves the render (script, sources, board and stills in one pack). Kit commands: `.claude/skills/make-reel-stick-man/SKILL.md`; story steps: story-skills skills, run on `story/` with `node <story-skills>/skills/story-maintenance/scripts/story.js`.

| # | Stage | Input → output | Done when |
|---|---|---|---|
| 0 | Intake | Kai's script, or "next episode" → pick the top `LEDGER.md` backlog idea | one story named |
| 1 | Fit-check vs bible | the story → yes/no in 5 lines: odd act as a plain fact? a doubter on record? a hidden rule to explain? a last image? sources findable? fits 190-250 words? | 6 yes, else next idea |
| 2 | Story (story-skills) | `research` note (every claim + opened URL) → `story add chapter` + 5 beat `scene`s (`plot-structure`, `scene-craft`) → chapter prose = narration → `revision-continuity` (`story check`, `continuity`, `prose`) → `adaptation` writes `adaptations/reel/epNN.script.json` | research `verified`, `story check` 0 errors, 190-250 words |
| 3 | Voice | `vo/script.json` → `voice.py --take Achird` (≤ 3 takes, keep the one in 60-80 s) → `align.py` → `vo/words.json` | no ❌ in `voice-qa.md` |
| 4 | Storyboard | EPISODES.md beat table → `storyboard.json` (see, shot, set, props/fx, label, `act`) | every line has a picture and a body verb |
| 5 | Reel data (micro-animated) | `reel.js` / `reel2.js` from the storyboard; one act per place; new asset only if the bible's world table says "build" | stills of each line's key word look right |
| 6 | Gates | hard: format, duration 60-80 s, first word 0.00, tail ≤ 0.3 s, floating labels 0, collisions none, joint ≤ 25 deg/f, captions; principles reported, not blocking: cuts/dissolves, rush speed, light spread, wide share, places per 10 s | all hard gates PASS; principle misses listed with a reason |
| 7 | Board | `board.mjs --judge 3` (Sonnet) once | ≥ 85 % shown |
| 8 | Approval pack → Kai | script + sources + board + 6 stills + gate lines | **Kai: "render"** |
| 9 | Render | sound (`sound.py`) + `shot.mjs --mp4` | mp4 + sheet |
| 10 | Post pack | caption (hook line + "Sources: comment SOURCE"), pinned comment with sources, cover still (Bram's face + climax), AI-voice label | files in `films/<slug>/post/` |
| 11 | Ledger | `LEDGER.md` row; kit assets added; lesson; 48 h views later | row filled |

## Budget per episode (65-70 s)

| Stage | Tokens | Minutes | Note |
|---|---|---|---|
| 0-1 intake + fit-check | 3k | 2 | |
| 2 story (research 6-10 fetches, script, checks) | 35k | 15 | story-skills CLI does the bookkeeping |
| 3 voice + align | 5k | 6 | TTS + whisper, mostly wall time |
| 4 storyboard | 12k | 8 | from the beat table |
| 5 reel data | 45k | 25 | sets reused; acting by auto-acting + key verbs |
| 6-7 gates + board | 25k | 15 | 3 Sonnet judges ~14k; max 1 fix round |
| 8 Kai approval | - | Kai | |
| 9 render + sound | 5k | 15 | 2,000 frames; machine time |
| 10-11 post pack + ledger | 8k | 6 | |
| **Total** | **~140k** | **~80 + 15 render** | today: ~284k and 1-2.5 h for 30 s |
| New place or prop (first use only) | +30-60k | +20-40 | amortised; ep 1 carries kitchen + stomach + medal |

**3 a day:** ~420k tokens and ~4.5 h of agent time, pipelined: ep N+1's story (stage 2) runs while ep N renders; Kai approves three packs in one sitting. Tokens per second of video drop ~4x (284k / 30 s = 9.5k/s today vs ~140k / 67 s = 2.1k/s) because (1) the script swaps and the world stays (sets, cast, grades reused), (2) research and canon live in `story/`, not re-derived, (3) principles are reported, not gated, so fewer fix rounds (max 1, then show Kai).

**Stop rules:** a stage over 1.5× its budget → stop and tell Kai. Research not `verified` → no voice. Duration gate in `tools/gates.mjs` is still 27-33 s: the engine lane must widen it to 60-80 s before ep 1 can pass.
