# Plan: "How we make Ten Million Views" (tmv-studio v1)

Goal: a zip on Polar, sellable before **Tue 2026-11-10 07:00 VN** (Mon 2026-11-09 00:00 UTC).
Sources: decisions ST-14, ST-72..ST-82 and `records/2026-11-07-studio-reel-product/spec.md` (crowsnest `.bro/bro-html/studio-10k/`).
Where ST-81/ST-82 differ from the spec, they win: every OS (not Mac-only, spec 2.3), seeded cast + character design
(not 3 hair/shirt variants of Jay only), one new neutral sample episode (not Ep1 itself), zip on Polar, no show-off reel.

## What the buyer gets on day one (ST-82 "very happy")

```
 buy on Polar ─► unzip tmv-studio ─► open Claude Code in it ─► paste ONE prompt
   ─► START.md: check machine, install (pixi, all inside the folder), render the sample episode (preview)
   ─► 3 questions: your story/app · your characters (seeded or designed) · voice (Gemini key or offline)
   ─► /series <idea>: Ep1 ─► vote frame "Comment A or B" ─► Ep2 picks up the winning branch ─► ...
   = a whole series with their own characters on day one, preview quality (ST-77)
```

## Starting point (measured, not guessed)

- The current kit (`release/build.mjs`, `test/clean-install.mjs`, `install.yml`) already installs from a zip with pixi and
  renders a reel on **Linux, Windows (pwsh + Git Bash), macOS arm64 + Intel** in CI. That is the cross-platform base.
- The Ep1 3D pipeline (`films/ep01-ten-million/src/tmvfinal`, GLBs, `vo3/`, `render/shot2.mjs`, `check_reel.py`) is **on
  Kai's Pro, not this Mac**. Nothing in this repo has it. See "Kai must do".
- New gate `node release/build.mjs --tier tmv --dry-run` (slice 1) refuses what is not ours to sell. On `main` today:
  **72 problems**: 57 Clawd, 12 edge-tts, 2 Kai likeness, 1 macOS `say`. 54 of them in `styles/` (kai-hand-draw 37,
  living-screencast 12, paper-lantern 2, game-show 1, catalog/README 2), 7 in `kit/check-reel`, 3 in `core/`.

## Vertical slices (each ends in something Kai can see)

| # | Slice | Proof Kai sees | Target (VN) |
|---|---|---|---|
| 1 | **Clean kit**: `tmv` tier + `[tmv_forbid]` gate; remove/replace Clawd, edge-tts, `say`, Kai likeness in shipped files; Kokoro offline voice as the no-key default; `LICENSE.md` (ST-81 text) | Gate output 72 → 0 problems; `tmv-studio-1.0.zip` size + SHA | Sat 11-07 12:00 |
| 2 | **Seeded cast + character design**: 3 own characters (neutral lead, rival, mascot of our own) as code/rig params; `character-designer` page gives "Copy for Claude" JSON the episode reads | Screenshot sheet of the 3 seeded characters + 1 designed from the page | Sat 11-07 20:00 |
| 3 | **Sample episode** (neutral, new story, ~30-45 s) in the episode format: `episode.json` (cast, beats, HUD labels, palette, 2 vote words) → page → preview MP4 540x960 | Preview MP4 rendered on this Mac (niced) | Sun 11-08 08:00 |
| 4 | **Series flow** `/series`: makes Ep N+1 from Ep N + the vote winner (PREVIOUSLY card, ST-79), shared `series.json` | Two linked preview MP4s, Ep2 opens with "PREVIOUSLY" and the Ep1 vote winner | Sun 11-08 16:00 |
| 5 | **One prompt**: `START.md` + `/episode`, `/series` skills; `.claude/settings.json` allow-list; resumable install; `doctor` | Screen recording: fresh unzip folder, paste prompt, ends at the sample MP4 | Sun 11-08 22:00 |
| 6 | **CI on 3 OS** (below) green on the tmv zip | Green Actions run link, artifacts = MP4s per OS | Mon 11-09 04:00 |
| 7 | **Bonus: 52 styles playbook** `styles/PLAYBOOK-episode.md`: wrap any style as an episode (beats, vote frame), styles unchanged | One style (e.g. risograph) rendered as Ep format, preview | Mon 11-09 08:00 |
| 8 | **Package**: zip, Polar copy draft ("runs Claude Code", every OS, 7-day refund, no view promise), support line (Discord Buyer role + kaiships.ai@gmail.com) | Zip + Polar draft text for Kai to approve | Mon 11-09 14:00 |
| - | Buffer for CI fixes (Windows) | | to Tue 07:00 |

Slice 3 ports Ep1 parts (HUD, phone UI, cards, word-cut timeline) only if Kai sends them (Kai item 1). Without them the
sample episode is built on the kit's own engines (three.js already in `core/three`) in the TMV design system (ST-79).

## CI matrix (install.yml job for the tmv zip)

| Runner | Shell | Proves |
|---|---|---|
| ubuntu-latest | bash | (a) one-prompt setup steps complete headless (`START.md` steps run as `studio install` + `doctor`, second run is a no-op); (b) sample episode renders at preview size 540x960 and passes the quick gates; (c) series flow makes Ep1 + Ep2 linked, Ep2 reads Ep1's vote winner |
| windows-latest | pwsh | same a, b, c; paths with spaces and `\`; pixi via `install.ps1` |
| macos-14 | bash | same a, b, c on arm64 |

(a) cannot run Claude Code in CI (no login, no keys). It runs the exact commands START.md tells Claude to run, from the
unzipped zip. (b) and (c) use the offline voice (no key) and 6 fps like `clean-install.mjs` does today.
Minutes: macOS counts x10, so the 3-OS run is triggered by label/dispatch/tag, as today.

## Riskiest unknowns

| Risk | Why | Plan |
|---|---|---|
| Ep1 source not on this Mac | Spec ports `tmvfinal`; it is on the Pro | Kai item 1; fallback: kit engines |
| Windows: Chromium/Playwright | headless WebGL, long paths, Defender slowness | Already green in current CI on pwsh + Git Bash; keep `ms-playwright` cache |
| Windows: ffmpeg, Python env | conda-forge ffmpeg via pixi already works; Kokoro needs `onnxruntime` + espeak-ng on win-64 | Check pixi solve for win-64/osx-arm64/linux-64 first thing in slice 1; fallback voice = file the buyer records |
| Path separators | buyer folders with spaces, `\` | CI already unzips into "Kaiships Studio" (space); keep `path.join`, no shell string paths |
| GPU-less runners | three.js in SwiftShader is seconds per frame | 6 fps preview in CI, 540x960, sample ≤ 45 s |
| Kokoro on Intel Mac | spec 2.3 says no build | Intel Mac falls back to recorded voice or Gemini key; say so in START.md |
| Clawd via the bonus | 52-style bonus is clean except kai-hand-draw (37), living-screencast (12), paper-lantern (2), game-show (1) | See below |

### Clawd and the 52-style bonus (flag for Kai)

Clawd comes back through the bonus only in 4 styles. Proposal: ship the 50 clean styles as they are; in
`living-screencast`, `paper-lantern`, `game-show` swap the Clawd figure for the kit's own seeded mascot (style unchanged,
only the cast); `kai-hand-draw` (Kai's house style, 37 hits, Clawd is its co-star) stays out of the paid kit. The
`tmv` gate enforces it: no zip can ship a Clawd mention.

## Kai must do (3 items)

1. **Copy the Ep1 parts from the Pro** into this Mac (no `frames/`, no `renders/`, no Mixkit, no `char-kai`):
   `src/tmvfinal/`, `assets/ep01/scene-room.glb`, laptop and `char-jay.glb`, `vo3/*.py`, `render/shot2.mjs`, `check_reel.py`
   (~40 MB). Or say "build without them".
2. **Say which remote CI runs on** and approve the push (`origin` = Kaiships-ai/studio-reel; `lemo` is fetch-only).
3. **Approve the Polar draft** (slice 8) once; then the agent updates the product.
