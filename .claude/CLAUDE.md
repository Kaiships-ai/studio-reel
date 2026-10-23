# Maintaining Kaiships Studio (dev only, never shipped)

Rules for agents changing this repo, each paired with what enforces it. When Kai corrects a mistake: fix it, then
add or tighten a row here. If the row was already here and nothing enforced it, that is a repeat: enforce it (a test,
a build check, a manifest entry) in the same change. Drop a row once its mistake can no longer happen.

| Rule | Enforced by |
|---|---|
| Start python, ffmpeg, ffprobe and node only through `run()` / `start()` from `kit/env.mjs`; no `.venv` paths, no `python3`, no `.sh` scripts or `sh` spawns in the buyer path | `test/unit/lint.test.mjs` (checks.yml, every PR) |
| Where a tool lives on each OS is decided only by `LAYOUT` in `kit/env.mjs` | `test/unit/env.test.mjs` |
| Every tracked file is in exactly one section of `kit.manifest`; new dev-only files go under `[dev]` | `release/build.mjs` (checks.yml runs `--dry-run` on every PR) |
| Every font file a shipped style's css/html loads with `url(...)` ships in the zip (demo fonts are committed, not git-ignored) | `missingFonts` in `release/build.mjs` (checks.yml runs `--dry-run` on every PR); `test/unit/build-fonts.test.mjs` |
| No private names in shipped files: `/Users/`, `ksa-`, Kai's handles and hosts, Polar ids, the dev-only 3D style and the tool it came from | `[forbid]` in `kit.manifest`, checked by `release/build.mjs` |
| `styles/catalog.md` (what `/studio` matches ideas against) lists every style with a `showcase.jpg`; regenerate it with `tools/readme_gallery.py` | `test/unit/catalog.test.mjs` |
| Buyer documents (top-level docs, skills, `content-types/`, `styles/catalog.md`, style guides) are English; Chinese only as a quoted term in inline code (`` `留白` `` (empty space)) | `release/build.mjs` |
| Starter ships exactly `studio` + `make-reel`, Pro adds the six `ig-*` skills; `verify` never ships | `release/build.mjs` |
| Kai's own likeness (`engine/kai-v3.js`) never ships; buyers design their presenter | `[dev]` in `kit.manifest`; no shipped page loads it |
| Actions minutes: work that runs on every PR lives in `checks.yml` (Linux, ~1 min); install tests are path-filtered; the five-machine matrix runs only for a `v*` tag, a manual run or the `test-all-os` label | `test/unit/ci-policy.test.mjs` |
| Before a release zip goes to Polar, the `v*` tag's install run is green on all five machines | judgment: check Actions before uploading |
| A change to rendering keeps `node .claude/skills/verify/draft.mjs films/verify-smoke` and `films/rea-xray` passing | judgment: CI has no GPU, so run them locally (seconds each) |
| `core/` and `styles/` are never edited for one film; a film's changes stay in `films/<name>/` | judgment (AGENTS.md) |

Kai's own 3D reels (Blocky Kai skits, 3D listicles) are `/make-reel-3d` → `styles/kai-reel-3d/WORKFLOW.md`, dev only; every other reel request
stays on `/make-reel`.

Commands: `node --test test/unit/*.test.mjs` · `node release/build.mjs --dry-run` · `node test/clean-install.mjs <unzipped folder>`.
