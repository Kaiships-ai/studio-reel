---
name: make-reel-3d
description: Make one 3D reel for @kaiships.ai with Clawd from the casting book (97 roles), voiced by Gemini TTS in one take, from an idea to a verified MP4. Two modes. `skit` = Blocky Kai and Clawd sitting together, a short funny dialogue about AI tools (Kai says skit / kịch ngắn / Kai-and-Clawd dialogue, a Morphy-style two-character reel). `listicle` = one narrator, 4–7 chapters (a list of tools or the steps of one skill), a new world per reel invented by Claude, Clawd plays a role in every chapter and moves as much as the hand-drawn reels (Kai says listicle 3D, reel 3D như reel11 / như reel COURT, reel listicle Clawd 3D). The process is fixed; the story, world, set, camera and motion are the builder's creative call. Trigger: /make-reel-3d [skit|listicle]
argument-hint: "[skit|listicle] <idea>"
---

# /make-reel-3d

Kai's own 3D reels (dev only, never shipped: see `kit.manifest`). Input: `$ARGUMENTS`

- **`skit`**, or a dialogue idea → read [`styles/kai-reel-3d/WORKFLOW.md`](../../../styles/kai-reel-3d/WORKFLOW.md) top to bottom and
  follow it.
- **`listicle`**, or a list of tools or the steps of one skill → read `WORKFLOW.md`, then
  [`styles/kai-reel-3d/LISTICLE.md`](../../../styles/kai-reel-3d/LISTICLE.md), and follow LISTICLE.md.

Both modes stop twice for Kai: the script, then the storyboard sketch. Start a film with
`node styles/kai-reel-3d/tools/make.mjs new reelNN-slug [--listicle]` (library root); the film lives in `films/reelNN-slug/` and
everything inside it runs through `pixi run`. Gemini needs `GOOGLE_API_KEY` in the library root's `.env`.
