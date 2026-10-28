# Progress file

A `/make-reel` run keeps `films/<name>/job.json` current after every step, so Lead Studio can draw its progress.
Schema and rules: `core/README.md` → **job.json**. Writer: `core/job.mjs`.

## Sub-features

- `job.tools`: `make.mjs` and `reel.mjs` write `voice`, `audio`, `render`, `verify` (`running`, then `done`).
  `make.mjs new` starts the file with `script` running. `draft.mjs` writes `draft` with `pct` in tens.
- `job.agent`: the agent writes `script`, `storyboard`, `chapters`, `draft`, `review`, `deliver` with
  `node core/job.mjs films/<name> <step> <status>`.
- `job.failed`: a tool that exits with an error marks its running step `failed`. A tool killed by a signal leaves
  it `running` with the dead `pid`.
- `job.stamps`: `job.mjs` stamps `started` (ISO) when a step turns `running`, `ended` when it turns `done` or
  `failed`. A rerun gets a new `started` and no `ended`; a `pct` update keeps `started`.
- `job.change`: a feedback round ends with `node core/job.mjs films/<name> deliver done --change="…"`, stored as
  the top field `change`.
- `job.campaign`: `campaign:` from the front matter of `workspace/scripts/<name>.md`, or of the script there with
  `slug: <name>`.

## How to get to it (user POV)

- Run `/make-reel <slug>` with a `workspace/scripts/<slug>.md`, then read `films/<slug>/job.json` while it runs.

## Driving it with draft.mjs / make.mjs

- Unit: `node --test test/unit/job.test.mjs` (a fake run, the literal file after each step, a failed step, the
  `started`/`ended` stamps, `--change`).
- Real: `rm films/verify-smoke/job.json`, then `make.mjs films/verify-smoke vo audio` and `draft.mjs
  films/verify-smoke`. `job.json` shows `voice`, `audio` and `draft` `done`, the draft's three files in
  `outputs`.
- Killed: start `make.mjs films/verify-smoke render`, `kill <its pid>` while frames draw. It exits at once,
  `job.json` parses, and `render` is `running` with that `pid`.

## Gotchas

- `draft.mjs` marks `draft` `running` again for each `pct`: that is one run, so `started` stays.
- A style's demo (`styles/<slug>/demo`) never gets a `job.json`: only a folder inside `films/` does.
- `reel.mjs vo` runs `make.mjs vo`, so `voice` is written twice. Both writes agree.
- A plain `kill` of `make.mjs` leaves its child step (e.g. `video.mjs`) running to the end, as before this file existed.
