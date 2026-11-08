# TMV release (the paid "How we make Ten Million Views" zip)

`node release/build.mjs --tier tmv` writes `tmv-studio-<version>.zip` (every entry under `tmv-studio/`): the Starter
files minus `[tmv_exclude]`, with each `tmv/<path>` replacing or adding `<path>`, and `styles/README.md` /
`styles/catalog.md` without the rows of excluded styles. Starter and Pro are unchanged.

## Sub-features

- `tmv.gate`: `[tmv_forbid]` (ignoring case, in file names and text, overlay files included) refuses what is not ours
  to sell: Clawd, Mixkit, macOS `say`, edge-tts, Kai's likeness, Ninjago/real-person roles. `core/tts/tts.py` names the
  online voice generically so the shared file passes.
- `tmv.overlay`: `tmv/LICENSE` (ST-81 terms), `tmv/product.json`, docs, `tmv/pixi.toml` + `tmv/pixi.lock` without edge-tts.

## Driving it

- `node release/build.mjs --tier tmv --dry-run` → `✓ tmv: … every check passed`; `--dry-run` without `--tier` → Starter
  and Pro ✓ as before.
- Planted break: commit a file under `styles/<any shipped style>/` containing `Clawd` on a scratch branch → `✗ tmv: 1
  problem(s)`, `… not ours to sell ("clawd")`.
