# TMV release (the paid "How we make Ten Million Views" zip)

`node release/build.mjs --tier tmv` writes `tmv-studio-<version>.zip` (`<version>` from `tmv/product.json`, which must equal a `--tag`; v1.7 is the first release) (every entry under `tmv-studio/`): the Starter
files minus `[tmv_exclude]`, with each `tmv/<path>` replacing or adding `<path>`, and `styles/README.md` /
`styles/catalog.md` without the rows of excluded styles. Starter and Pro are unchanged.

## Sub-features

- `tmv.gate`: `[tmv_forbid]` (ignoring case, in file names and text, overlay files included) refuses what is not ours
  to sell: Clawd, Mixkit, macOS `say`, edge-tts, Kai's likeness, Ninjago/real-person roles. `core/tts/tts.py` names the
  online voice generically so the shared file passes.
- `tmv.overlay`: `tmv/LICENSE` (ST-81 terms), `tmv/product.json`, docs, `tmv/pixi.toml` + `tmv/pixi.lock` without edge-tts.
- `tmv.story-skills`: fifteen story-skills 0.24.1 skills (MIT, Daniel Dewhurst) shipped unchanged from `tmv/.claude/skills/`,
  each with its `LICENSE`, credited in `tmv/THIRD_PARTY_NOTICES.md` (the build refuses a zip with any of them and without the credit).
  `[vendored]` exempts them from the English-only check only. Their CLI is `story-maintenance/scripts/story.js` (Node).
- `tmv.story`: `/story` (ours, `tmv/.claude/skills/story/`) drives them in five phases (premise, characters with a card
  each in `cards/`, the style from `make.mjs styles`, world, a six-episode season) into `episodes/<show>/`, in cook or
  step mode. `.claude/settings.json` allows `pixi run node .claude/skills/story-maintenance/scripts/story.js *`.

## Driving it

- `node release/build.mjs --tier tmv --dry-run` → `✓ tmv: … every check passed`; `--dry-run` without `--tier` → Starter
  and Pro ✓ as before.
- Planted break: commit a file under `styles/<any shipped style>/` containing `Clawd` on a scratch branch → `✗ tmv: 1
  problem(s)`, `… not ours to sell ("clawd")`.
- Story CLI from the built zip, in an empty folder: `node <unzipped>/tmv-studio/.claude/skills/story-maintenance/scripts/story.js
  init "Test" --dir t`, then in `t/`: `… add character "Mara Voss"`, `… reindex .`, `… check .` → `Checks passed: 0 errors`.
- `/story step` in an unzipped kit with a throwaway idea: after phase 2, `episodes/<show>/story` passes `story check`,
  `characters/you.md` has `lie` and `truth`, and each character has a `cards/<id>.json`.
