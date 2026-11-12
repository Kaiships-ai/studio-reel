---
name: animation-principles
description: Disney's 12 principles of animation (squash & stretch, anticipation, staging, straight ahead / pose to pose, follow through, slow in / out, arcs, secondary action, timing, exaggeration, solid drawing, appeal), vendored from dylantarre/animation-principles (MIT). Use to direct or audit character animation in a reel (stick-man, 3D, hand-drawn) before blocking a scene, or when the motion feels dead, stiff or copied.
---

# Animation principles (vendored)

The 144 upstream skills sit unchanged under `skills/<category>/<name>/SKILL.md` (MIT: `LICENSE`, upstream `README.md`).
Here they are reference files, not separate skills: read the ones the task needs.

| Need | Read |
|---|---|
| One principle in depth | `skills/11-by-principle-focus/<name>/SKILL.md`: squash-stretch-mastery, anticipation-mastery, staging-mastery, straight-ahead-pose-mastery, follow-through-overlapping, slow-in-out-mastery, arc-mastery, secondary-action-mastery, timing-principle-mastery, exaggeration-mastery, solid-drawing-mastery, appeal-mastery |
| All 12 for character work | `skills/03-by-role-persona/animator-traditional/SKILL.md` |
| Camera, cutting, film language | `skills/03-by-role-persona/filmmaker/SKILL.md`, `skills/01-by-domain/video-motion-graphics/SKILL.md` |
| 3D scenes | `skills/01-by-domain/3d-spatial/SKILL.md` |
| Something feels off and the cause is unclear | `skills/02-by-thinking-style/problem-diagnosis/SKILL.md` |

Most other upstream files are about UI and web motion; skip them for reels.

## Audit a reel against the 12

1. Watch the clip at full speed, then each shot on a contact sheet every 2-3 frames.
2. For each principle and each shot: yes / partly / no, with a frame number as evidence and, where the engine gives one, a
   number (stick-man: `shot.mjs --dbg` joint paths for arcs, easing and follow-through; pose angles for exaggeration).
3. Name the cause: the shot data, a verb or pose in the kit, or the engine itself (what it cannot do yet).
4. Order the fixes by what the viewer sees most. A fix the engine cannot do yet is a kit task, not a data tweak.
5. Show the result next to the reference at the same timestamps.
