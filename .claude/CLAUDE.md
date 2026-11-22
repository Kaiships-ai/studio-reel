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
| Nothing in a zip leads a buyer back to this repository: no org, repo or handle name in any file, binaries, LICENSE and notices included | `[identity]` in `kit.manifest`, `repoLinks` in `release/build.mjs`; `test/unit/build-repo-links.test.mjs` |
| `styles/catalog.md` (what `/studio` matches ideas against) lists every style with a `showcase.jpg`; regenerate it with `tools/readme_gallery.py` | `test/unit/catalog.test.mjs` |
| Buyer documents (top-level docs, skills, `content-types/`, `styles/catalog.md`, style guides) are English; Chinese only as a quoted term in inline code (`` `留白` `` (empty space)); third-party skills shipped verbatim are listed in `[vendored]` instead | `release/build.mjs`; `test/unit/build-vendored.test.mjs` |
| Starter ships exactly `studio` + `make-reel` + the stick-man pack's `make-reel-stick-man`, Pro adds the six `ig-*` skills; `verify` never ships | `release/build.mjs` |
| The stick-man pack (option B, 22/11) ships only kit.manifest `[stick]` picks plus `packs/stick-man/`: never the s2 faces, the hand camera, the finish look (contact shadows, act grade, motion blur, haze, camera key light: the shipped stage is plain), the hoodie, gates, review, bibles, the bench or a captured non-free clip; every shipped import resolves inside the pack; nothing names Kai, Hot Money or Mixamo, and no internal jargon (the reference study, gate names, judge rounds) | `[stick_forbid]` in `kit.manifest` via `release/stickpack.mjs`; `test/unit/build-stickpack.test.mjs` |
| A pack change never edits `styles/stick-man/` (the studio's live kit): the pack overlays its own files from `packs/stick-man/`, tests run in a copy outside the repo | `release/pack-guard.mjs` (checks.yml); `test/unit/pack-guard.test.mjs` |
| Kai's own likeness (`engine/kai-v3.js`) never ships; buyers design their presenter | `[dev]` in `kit.manifest`; no shipped page loads it |
| Actions minutes: work that runs on every PR lives in `checks.yml` (Linux, ~1 min); install tests are path-filtered; the five-machine matrix runs only for a `v*` tag, a manual run or the `test-all-os` label | `test/unit/ci-policy.test.mjs` |
| A PR's tmv install renders the short ci-smoke episode; the whole sample and its 11 gates run only nightly on `main`, for a `v*` tag, by hand or with the PR label `full-episode` | `fullEpisode` tests in `test/unit/ci-policy.test.mjs` |
| Before a release zip goes to Polar, the `v*` tag's install run is green on all five machines | judgment: check Actions before uploading |
| A change to what a reel does (core tools, the engine, `kit/`, the designer) updates its file in `.claude/skills/verify/features/` | `check-coverage.mjs` (checks.yml, every PR); `test/unit/verify-coverage.test.mjs` |
| Code mistakes oxlint's correctness rules find (unused imports, constant conditions, `debugger`, const reassignment) fail before CI, and so does dead code in `styles/stick-man/engine/` (unused imports, params, locals); the linter and its config live in `tools/lint/`, never in the root `package.json` | `node tools/lint/run.mjs` (pre-push hook and checks.yml) |
| Work follows `.agents/playbooks/studio-reel.md`: risk tiers, one heavy run at a time | machine lock in `journeys.mjs`; the rest is judgment |
| A worktree's linked `node_modules` and `.pixi` never get committed | `.gitignore` names them without a trailing slash, so it matches the links too |
| A change to rendering keeps `node .claude/skills/verify/draft.mjs films/verify-smoke` and `films/rea-xray` passing | judgment: CI has no GPU, so run them locally (seconds each) |
| `core/` and `styles/` are never edited for one film; a film's changes stay in `films/<name>/` | judgment (AGENTS.md) |
| A stick-man kit fault is fixed by `.agents/playbooks/stick-man-kit-fix.md` (5 whys, industry check, reviewer, before\|after proof page, merged after the reviewer says CLEAN and CI is green); a film runs under `stick-man-film.md` with one orchestrator session | pstack `check-playbooks.mjs` keeps the anchors valid; the rest is judgment |
| No message to another session (`SendMessage`, `orca … send`) without Kai's go for that message | the `peer-message-gate` PreToolUse hook in the loaded user settings (asks every time; denies when nobody can answer) |
| `stagegate.mjs` writes only inside a real film folder (a `--help` once littered the repo root with gate files) | `test/unit/stick-gates-voice.test.mjs` |
| A stick-man prop never sits in a head or a set solid; the solids come from the set's box meshes plus `COLLIDE`, never a hand list only | `prop in the head` / `prop in the set` in `shotfaults.mjs` from `engine/play.js` `propIn`; `test/unit/stick-props-solid.test.mjs` |
| A prop let go lands on every solid the set built | `engine/propobj.js` `S.rest` from `engine/solids.js`; `test/unit/stick-prop-rest.test.mjs` |
| A held prop stays in frame while its holder does; a tracked prop keeps its real size | `prop leaves view`, `prop out of scale` (`kit/props/sizes.js`) in `shotfaults.mjs`; `test/unit/stick-props-solid.test.mjs` |
| An `'along'` hand prop with a top declares `userData.top`; the engine keeps it up | `test/unit/stick-prop-roll.test.mjs` (the kit pistol in Act_PistolShoot_Once; the `ROLL_FREE` list only shrinks) |
| A stick-man shot never shows an object cut by the camera's far plane; the dome is the only sky | `cut by the far plane` in `shotfaults.mjs` from `engine/play.js` `farCut`; `test/unit/stick-props-solid.test.mjs` |
| A face's open eye never stares: the pupil fills >= 55 % of the eye's width and the upper lid rests on it (fear/shock: >= 42 %, <= 30 % white above); every s2 design and kit ring eye is measured as drawn | `tools/gates/eyegate.mjs` on `engine/eyegeom.js`; `test/unit/stick-eyes.test.mjs` |
| A face never comes out wider than drawn on a turning head (Kai 22/11, A v10a: hero's face on his hood's edge, a teller's eye a black band, while eyegate passed): a face style holds its marks back by naming the yaw faces.js wraps at, never by sliding the flat drawing; every rendered frame's stretch is measured | `faceStretch` in the dbg rows (`engine/faces.js`), `tools/gates/facegate.mjs` at ◇5; `test/unit/stick-facegate.test.mjs` |
| A grade or light never blows a hot glare pool or crushes a subject to black (Kai 22/11: the burnt door patch) | `tools/gates/valuegate.mjs` on the final mp4 + rows; `test/unit/stick-valuegate.test.mjs` |
| No face design reaches a film before its face sheet is approved at S2 | `facebeat.mjs` (3) against `review/faces-approved.json` (`facesheet.mjs`); `test/unit/stick-facesheet.test.mjs` |
| Kai's stick-man touchpoints are exactly S1 S2 K1 K2 K3 Post; every other gate locks on machine checks + an independent reviewer's READY, and an AI verdict never locks K1 (◇2b) or K2 (◇5) | `touchpoints` and `approver` in `styles/stick-man/tools/gates/GATES.json`, `stagegate.mjs`; `test/unit/stick-touchpoints.test.mjs` |
| Every row of the make-reel-stick-man Rules table names the tool, test or independent review that enforces it; SKILL.md stays ≤ 200 lines | `test/unit/stick-touchpoints.test.mjs` |
| K2 v1 passes with ≤ 5 Kai notes; each note gets a WHOCHECKS kind and a check before the next episode; 2 rounds on one shot and fault kind force K3 | `firstrun.mjs` (◇1), `retakes.mjs --premise` (◇4, ◇5); `test/unit/stick-touchpoints.test.mjs` |
| A run log only grows | `tools/run/logline.mjs` (refuses a changed log) and the `run logs` row of every `stagegate.mjs` gate; `test/unit/stick-logline.test.mjs` |

Kai's own 3D reels (Blocky Kai skits, 3D listicles) are `/make-reel-3d` → `styles/kai-reel-3d/WORKFLOW.md`, dev only; stick-man
story reels (three.js stick figures, like pilot A) are `/make-reel-stick-man` → `.claude/skills/make-reel-stick-man/SKILL.md`,
dev only (buyers get their own version from `packs/stick-man/`: `START-stick-man.md` there); every other reel request stays on `/make-reel`.

Commands: `node --test test/unit/*.test.mjs` · `node release/build.mjs --dry-run` · `node test/clean-install.mjs <unzipped folder>`.
