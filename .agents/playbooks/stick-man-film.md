---
extends:
when: Running a stick-man film through stages 0-5 (/make-reel-stick-man), or taking over one in progress.
---

# Stick-man film

`.claude/skills/make-reel-stick-man/SKILL.md` is the source of truth for the stages, gates and pages. This playbook
only says how pstack fits around it.

1. One orchestrator session owns the film and the kit work it needs. It spawns builders and reviewers; it never
   splits the film across peer sessions.
2. Keep the program state in `~/.claude/orchestrate/<film>/notes.md` (pstack Orchestrate): the current stage, each
   shot's state, open faults with their owner, Kai's decisions not yet in `DECISIONS.json`, and every live link.
   Rewrite it after each step so a fresh session can pick up from it alone.
3. Log decisions with `show-me-your-work` in `films/<film>/decisions.tsv`.
4. A kit or engine fault found mid-film goes to `stick-man-kit-fix.md` as its own PR. The film waits on the merge, then
   re-renders the shots that fault touched.
5. "Kai picks" steps (script, look, board, any option with taste in it) are gates on purpose: show 2-3 rendered
   options, mark "Em đề xuất", and wait. pstack's "never block on the human" covers everything else.
6. Close each stage with `stagegate.mjs films/<film> <gate>`; a gate is LOCK only with Kai's approval.
