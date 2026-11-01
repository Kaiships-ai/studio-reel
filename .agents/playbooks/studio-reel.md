---
extends: feature, bug-fix, opening-a-pr
when: Changing the Kaiships Studio tooling, skills, styles or release in this repo. Not for making one film: that is /make-reel.
---

# Studio-reel way of work

Kai's rules for changing this repo. Kai judges what he can see, so every change that reaches a user ends in a proof he can watch.

## Risk tiers

Every change gets one tier before work starts. The report names it.

| Tier | Entry | Gate before merge | Who merges |
| --- | --- | --- | --- |
| docs | Docs, tests, the verify skill; nothing a buyer's run does changes | `checks` green | The agent |
| small | Under about 1000 lines and 10 files, no external surface | `checks` green, plus `journeys.mjs --only=<the features it touches>` | The agent, then the smoke below |
| complex | Any external surface, or above the small size | One independent reviewer and a proof page | Kai, after the proof page |

An external surface is any of these: what ships in the zip (`kit.manifest`, `release/`, `kit/`), a process being started or killed, a write outside the film's folder, or an outbound write such as Polar or a release.

Smoke after an agent's merge, on `main` in a worktree: `node .claude/skills/verify/journeys.mjs --only=new-film,voice,sound-mix,chapters`. A red smoke points at the last merge: fix or revert it before the next one.

## Who does what

- One builder and one independent reviewer per complex change, no more agents. Reviewers and fan-out readers run Sonnet at medium effort.
- A fresh worktree per task, never Kai's main checkout. Link the setup from it rather than installing again: `ln -s ../studio-reel/node_modules node_modules; ln -s ../studio-reel/.pixi .pixi`. Remove both links, then the worktree, when the branch is pushed.
- Never run `pixi run` in such a worktree: the linked `.pixi` is the main checkout's. Use `node kit/studio.mjs`.

## Kai's Mac must not get hot

- One `journeys.mjs` at a time: it takes a machine lock and refuses a second run. It uses every core.
- Run only what the change touches, with `--only`. Never rerun a green journey when only an unrelated file changed.
- `--full`, `--any` and the zip install are slow and hot: run them only when Kai asks or when a change is about that path. The install matrix belongs to CI (`test-all-os` label or a `v*` tag).
- Before a heavy run, check the load with `uptime`. Say what is running and for how long when it will take over a minute.

## Proof

- Proof goes the user's path: the commands a user types, the real page. A `skip:` is not a pass; say it.
- A complex change ends with a proof page (`.claude/skills/verify/SKILL.md`, Proof page), published as a private artifact and linked on the PR. A video that shows an error or a blank frame is a failed proof.
- Before reporting a PR as waiting on CI, read `gh run view`: a job that never started (billing) looks the same as a slow one.
- A change to core, the engine, the tools or `kit/` updates its file in `.claude/skills/verify/features/`. `check-coverage.mjs` fails the PR otherwise.
