# Process map · make-reel-stick-man

Where the pre-production stage lives and what is still open. History is in git.

## Stage 1 files

| File | Holds |
|---|---|
| `PREPRO.md` | the stage-1 playbook: flow, vocabulary, each step's standard / gate / mistakes, craft knowledge, reviews, fidelity, gates, fixes |
| `DIAGNOSE.md` | symptom → test → cause → fix → stage; notes translation; process smells |
| `SKILL.md` | stage 1 rows rebuilt ([1.0]-[1.7], ◇2a/b/c), [3.1] now executes the locked intent, new rules, file index |
| `PROCESS.md` | options as grey pictures before ◇2a, per-shot notes, camera pass split into intent ([1.6]) and execution ([3.1]), CUTS from the shot list, stage-1 review prompts |
| `REEL_DATA.md` | the shot list format (`scenes`, `shots`, options) |
| `GATES.md` | pre-production checks and thresholds |
| `LEDGER.md` | ◇2a / ◇2b / ◇2c rows |
| `styles/stick-man/tools/prepro.mjs`, `animatic.mjs`, `shotlist.mjs` | the checker (coverage, timing, cards, text, safe zone, continuity, intensity flags, `intensity.svg`) and the animatic builder |

## Roadmap (status 21 Nov 2026)

1. **Grey preview**: done as `tools/previs.mjs`, a grey three.js blockout of a scene or the whole film. The engine has
   no `?look=flat` flag.
2. **Still open**: shot cards in `templates/stage-page.html`; `board.mjs` stills per shot (today two per spoken line,
   no retell mode).
3. **`shotplan.js`** plans only the storyboard lines that name no shot. It does not read a scene's `feel` or a shot's
   `story`.
