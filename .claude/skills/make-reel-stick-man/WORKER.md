# Worker started by Studio

Studio is Kai's Orca bot. It starts a Claude Code session in this repo and sends a job spec as an Orca handoff. This
page holds the rules every job shares, so a spec only says what is new.

## First, every job

Run `node styles/stick-man/tools/status.mjs films/<film>`. It reads `films/<film>/status.json` and prints the post
copy and its approval, the stage, the latest render, the kit commit, what Kai owes, what is stale, and your limits.
Trust it over memory, notes and the spec. If they disagree, the file wins; say so in your report. If it exits 1, stop
and report its message.

## Verbs

- `status <film>`: run status.mjs and report its output. Change nothing.
- `render <film> [part] [--on pro]`: render the film or one part (`parts/<seg>`) at 720p with the film's build
  script (`latest.rebuild`).
  - Here: through the render lock, one heavy render at a time.
  - `--on pro` (the Mac Pro, ssh `pro`): pull the latest code there first, copy the film over, render, copy back:
    ```
    ssh pro "cd \$PRO_REPO && git fetch -q origin && git checkout -q --detach origin/main && git rev-parse --short HEAD"
    rsync -a --exclude renders/ films/<film>/ pro:\$PRO_REPO/films/<film>/
    ssh pro "cd \$PRO_REPO && <the build script>"
    rsync -a pro:\$PRO_REPO/films/<film>/renders/ films/<film>/renders/
    ```
    `PRO_REPO` is the studio-reel checkout on the Mac Pro. Put the printed commit in `kit_commit`.

Everything else comes as a free-form spec from Studio.

## Worker rules

- Do not post or upload. Studio uploads to R2 and posts, after Kai taps Post; it writes `published`.
- Do not message people or other sessions. Your only message is the `worker_done` report.
- 720p only. 1080p or full resolution only when Kai asked for it in this job.
- Never edit `core/`, `styles/`, the engine or the kit for one film. A kit fault is its own PR with an independent
  review (`.agents/playbooks/stick-man-kit-fix.md`).
- Never set `approval.state` to `kai_approved` or `posted`. Only Kai approves; a new post copy starts as `waiting_kai`.
- One post copy: `films/<film>/deliver/current.mp4` with its cover and caption beside it, named in `deliver.current`. Move the
  cut it replaces into `deliver/archive/`. Delete nothing.
- Work in a fresh worktree, never in Kai's main checkout.

## Report: worker_done

Update `films/<film>/status.json` (run status.mjs again, it must exit 0), add one line to
`~/.orca/shared/hot-money-ledger.md` in its header's format, then send this as the content of
`orca orchestration send --to <Studio's session> --type worker_done`:

```
film:     films/<film>
version:  A v<N>
output:   <mp4, cover, caption, review page: paths or links>
proof:    <stills, clips or contact sheets Kai can look at>
review:   <independent reviewer verdict, or "none: render only">
status:   <status> · <stage> · approval <approval.state> · needs <what Kai owes now>
problems: <what failed or was skipped, and why; "none">
```

A job that fails still sends `worker_done`, with `status: blocked` and the error under `problems`.
