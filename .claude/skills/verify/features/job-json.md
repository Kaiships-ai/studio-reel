# Progress file

A `/make-reel` run keeps `films/<name>/job.json` current after every step, so Lead Studio can draw its progress.
Schema and rules: `core/README.md` → **job.json**. Writer: `core/job.mjs`.

## Sub-features

- `job.tools`: `make.mjs` and `reel.mjs` write `voice`, `audio`, `render`, `verify` (`running`, then `done`).
  `make.mjs new` starts the file with `script` running. `draft.mjs` writes `draft` with `pct` in tens.
- `job.agent`: the agent writes `script`, `storyboard`, `chapters`, `draft`, `review`, `deliver` with
  `node core/job.mjs films/<name> <step> <status>`.
- `job.failed`: a tool that exits non-zero, gets Ctrl-C or `kill` marks its running step `failed`. `kill -9`
  leaves it `running`.
- `job.campaign`: `campaign:` from the front matter of `workspace/scripts/<name>.md`.

## How to get to it (user POV)

- Run `/make-reel <slug>` with a `workspace/scripts/<slug>.md`, then read `films/<slug>/job.json` while it runs.

## Driving it with draft.mjs / make.mjs

- Unit: `node --test test/unit/job.test.mjs` (a fake run, the literal file after each step, a failed step).
- Real: `rm films/verify-smoke/job.json`, then `make.mjs films/verify-smoke vo audio` and `draft.mjs
  films/verify-smoke`. `job.json` shows `voice`, `audio` and `draft` `done`, the draft's three files in
  `outputs`.
- Killed: start `make.mjs films/verify-smoke render` in its own process group, `kill -TERM -<pgid>` while frames
  draw. `job.json` parses and `render` is `failed`.

## Gotchas

- A style's demo (`styles/<slug>/demo`) never gets a `job.json`: only a folder inside `films/` does.
- `reel.mjs vo` runs `make.mjs vo`, so `voice` is written twice. Both writes agree.
- `kill <pid>` (not the group) while `make.mjs` waits on a child step defers the signal until the child ends.
