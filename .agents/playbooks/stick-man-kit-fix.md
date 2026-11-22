---
extends: bug-fix, opening-a-pr
when: A fault in the stick-man kit (motion-lib clips, the engine, props, gates, tools in styles/stick-man/), found while making a stick-man film or reported by Kai.
---

# Stick-man kit fix

The more specific playbook for a stick-man kit fault; `studio-reel.md` still applies for tiers, worktrees and heat. Kai
rated this loop 10/10 on the props and joint-gate PRs (#108-#112). The film that found the fault is never edited here:
its owner re-renders after the merge.

- **Before** "Reproduce it yourself on the matching surface" add: write the fault as Kai sees it, one row per fault,
  with the clip, the shot and the number (`motionlib.mjs` gate or `shot.mjs` report line).
- **Replace** "Reproduce it yourself on the matching surface" with: render the clip on the proof page
  (`motionlib.mjs --proof <dir> --only <clip> [--fit json]`, `tools/render/shot.mjs --film styles/stick-man/motion-lib/proof
  --query "clip=…&phys=1&view=side" --mp4 …`) in a detached worktree at `main`. That render is the "before".
- **After** "Binary-search the cause." add: a 5-whys pass by a fresh sub-agent, down to the first layer that went wrong
  (key data, retarget, solver, gate). A per-clip patch for a layer fault is not a fix.
- **Before** "Plan the fix." add: an industry check by a fresh sub-agent, "are we doing it right?", with sources (how
  animation, games and mocap pipelines solve the symptom). Redesign when the check says the approach is wrong.
- **After** "Verify on the same surface." add: an independent reviewer (Sonnet, medium) reruns the gates and probes
  for a threshold loosened, a `JOINT_KNOWN` row added, or a fault hidden by another change. The builder fixes what
  holds up. `JOINT_KNOWN` may only shrink; a gate threshold never loosens.
  The reviewer runs `draft.mjs` and `journeys.mjs` only in its own worktree, never in Kai's main checkout ([#139](https://github.com/Kaiships-ai/studio-reel/issues/139)).
- **In** "Stage the commits so the failing repro lands before the fix" add: the gate or unit test that fails on
  `main` lands first, and the PR body carries before/after numbers per fault.
- **Before** "Run **Opening a PR**." add: a proof page with one before|after video per fault (hstack of the two
  renders) plus code location and number, published as a private artifact and linked on the PR; update the Motion
  Lab artifact. Kai merges unless he said to.
- **After** "Run **Opening a PR**." add: once Kai merges, fast-forward Kai's main checkout (`git fetch && git merge --ff-only origin/main`) without being
  asked. If it is not a fast-forward, stop and report; his local changes stay.

## Kai's rules that override pstack defaults

- Never message another session (`stage-*`, a `uds:` peer, an Orca pane) without Kai's go for that message. A hook in
  the loaded settings asks before every `SendMessage` and `orca … send`.
- A new fault found while a fix PR runs is parked on the proof page as "chờ anh". It never joins the running PR.
- A builder appends one row per finished step to the run's `show-me-your-work` log; the lead posts each new row to
  Kai as one line.
- Replies are Vietnamese, short, and end with `việc · đầu ra · bằng chứng · trạng thái`.
