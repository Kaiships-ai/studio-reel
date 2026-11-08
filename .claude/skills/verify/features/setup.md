# Setup

A buyer unzips the product, opens it in Claude Code and types `/studio`: pixi installs node, python and ffmpeg from
`pixi.lock`, then `pixi run studio install` adds the drawing packages and the headless browser inside the folder and
renders a 5 s test reel. Nothing system-wide, no admin (except the Linux browser libraries). Owner: `kit/studio.mjs`,
tools resolved by `kit/env.mjs`.

## Sub-features

- `setup.install`: npm ci (only when `package-lock.json` changed), Playwright headless shell, a WebGL probe, then a
  test render of `kit/check-reel` through `video.mjs` + `mux.mjs`, checked with ffprobe; records `pixi.lock`'s hash in
  `.pixi/studio-installed`.
- `setup.idempotent`: a second `install` skips npm and the test render; the browser step runs again (a few seconds).
- `setup.doctor`: read-only ✓/✗ with one `fix:` line per ✗.
- `setup.linux-deps`: Linux only, the browser's system libraries (sudo).
- `setup.zip`: the same path from an unzipped release in a folder that is not a git checkout (the old installer
  cloned another repo there).

## How to get to it (user POV)

- `/studio` (`.claude/skills/studio/SKILL.md`), or directly `pixi run studio install` / `pixi run studio doctor`.

## Driving it with draft.mjs / make.mjs

Preconditions: `pixi` installed (`~/.pixi/bin/pixi`), internet for a first install.

- Install: `pixi run studio install` → ✓ for tools, drawing packages, `browser  GPU: …`, `test render  1080x1920,
  5.0 s, sound -13.9 LUFS`, then `Ready.`; run it again → `drawing packages  already installed`, `test render  passed before`, and the browser line again.
- Check: `pixi run studio doctor` → every line ✓ (seven in this repo: python, ffmpeg, ffprobe, folder path, drawing packages, browser, setup finished) and `All good.`, exit 0.
- As a buyer, on a built zip (slow, minutes): `node release/build.mjs --tier starter`, unzip
  `dist/kaiships-studio-starter-*.zip` into a folder whose name has a space, then
  `node test/clean-install.mjs "<that folder>/kaiships-studio"` → `✓ clean install passed`. CI runs the same script
  on Linux, Windows (pwsh and Git Bash) and macOS (`.github/workflows/install.yml`).

## Gotchas

- `install --force` reruns every step, including npm ci (which replaces `node_modules/`).
- A changed `pixi.lock` makes `doctor` say "the tool versions changed"; that is normal after an update: rerun install.
- On a machine with no GPU the browser line says `software`: it works, slower. CI runners always look like this.
