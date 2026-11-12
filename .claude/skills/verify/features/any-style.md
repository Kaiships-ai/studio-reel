# Reel in another style

`/make-reel <topic> --style <slug>` makes a vertical reel in any style. The film keeps the page contract
(`core/README.md`), and `core/render/reel.mjs` builds it: voice, mix, render, then `reelcheck.mjs` and `readcheck.mjs`.

## Sub-features

- `any.build`: `reel.mjs <film> vo audio render` → `<name>.mp4` (720×1280 medium, 30 fps, BT.709, −14 LUFS; 1080×1920 only after the user's go, as in [Full render](./full-render.md)), `<name>-cover.png`, `<name>.srt`.
- `any.check`: `reel.mjs <film> check` → size, colour, sound, length, frozen or black stretches, spoken hook by 3.5 s, pacing, safe zone, reading time, CTA keyword (Whisper).
- `any.final`: `check --final` also wants `CAPTION.md`, `REVIEW.md`, `QA-REPORT.md`.

## How to get to it (user POV)

- `/make-reel <topic> --style <slug>` (`.claude/skills/make-reel/SKILL.md`, "Another style").

## Driving it with draft.mjs / make.mjs

Preconditions: a finished reel made with `reel.mjs` in `films/` (git-ignored, so none comes with a fresh checkout).

- `node .claude/skills/verify/journeys.mjs --only=any-style --any=films/<reel>` copies it, then runs `audio render
  check --no-asr --cover 1` on the copy → `✓ 720×1280 at 30 fps`, `✓ BT.709 limited range`, `✓ loudness −14 ± 1 LUFS, peak ≤ −1 dBTP`,
  and the MP4 and cover exist.

## Gotchas

- `draft.mjs` is for `kai-hand-draw`: its checks assume that style's ink and caption band.
- Pacing and reading rows judge the film: an older reel can fail `something new every ≤ 1.5 s` and the tool still works.
- `reel.mjs` follows the film's preset like `make.mjs`: medium by default, `test` (270×480 at 12 fps) on request, `full`
  only with `APPROVED-FULL`; only `full` draws lossless frames.
