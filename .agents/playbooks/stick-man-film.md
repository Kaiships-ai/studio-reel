---
extends:
when: Running a stick-man film through stages 0-5 (/make-reel-stick-man), or taking over one in progress.
---

# Stick-man film

`.claude/skills/make-reel-stick-man/SKILL.md` is the source of truth for the stages, gates, touchpoints and the
episode page. This playbook only says how pstack fits around it. A Studio worker also follows its `WORKER.md`.

1. One orchestrator session owns the film and the kit work it needs. It spawns builders and reviewers; it never
   splits the film across peer sessions.
2. Keep the program state in `~/.claude/orchestrate/<film>/notes.md` (pstack Orchestrate): the current stage, each
   shot's state, open faults with their owner, Kai's decisions not yet in `DECISIONS.json`, and every live link.
   Rewrite it after each step so a fresh session can pick up from it alone. When an agent's PR merges or its work
   ends, check the task list, stop its leftover background work and note that in `notes.md`.
3. Log decisions with `show-me-your-work` in `films/<film>/decisions.tsv`.
4. A kit or engine fault found mid-film goes to `stick-man-kit-fix.md` as its own PR. The film waits on the merge, then
   re-renders the shots that fault touched.
5. Kai is asked only at his six touchpoints: S1 look and S2 face sheet once per series, K1 previs + hook and K2 the
   whole film every episode, K3 when `retakes.mjs` reports PREMISE, and Post. There show 2-3 rendered options side
   by side, mark "Em đề xuất", and wait. Every other choice is made by an independent reviewer and logged; pstack's
   "never block on the human" covers it.
6. Close each stage with `stagegate.mjs films/<film> <gate>`: a process gate locks on an independent reviewer's READY,
   ◇2b only on Kai's K1 and ◇5 only on Kai's K2. An AI verdict never stands in for K1 or K2.
7. Review in batches, not per step. Group a stage's steps by what depends on what, and stop for Kai only at the end of
   a batch. Stage 3: batch 1 = [3.1] camera, [3.2] overlays, [3.3a] acting on stills (run as parallel builders, renders
   share one queue); batch 2 = [3.3]-[3.5] on video, then ◇4. Small calls inside a batch take the recommended option,
   go in `decisions.tsv`, and are listed on the page so Kai can change them at K1 or K2.
8. Publish each finished piece at once. When a builder finishes, its output goes on the episode page in the same turn,
   marked "chờ soát độc lập"; the reviewer's verdict updates the page later. Kai never waits for a review, or for the
   rest of the batch, to see work that already exists (Kai 16/11: "không muốn gián đoạn flow state").
9. Every reviewer brief, at every stage, starts with Kai's taste (`~/.claude/skills/kai-taste/SKILL.md`, PROCESS.md
   section 2). A reviewer that judges only numbers misses what Kai sees (17/11: each builder had a reviewer, the cut was
   still "cực kỳ nhiều sạn").
10. When Kai asks whether more tooling is needed while the episode still doesn't land ("có thật sự cần không?"),
   start no new tooling; the episode comes first.
