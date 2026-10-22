# Changelog

Every release of Kaiships Studio. Newest first.

## v1.5 · 2026-10-22

- **Runs on macOS, Windows and Linux.** One setup command, `/studio`, installs everything inside the product folder
  (no admin rights, nothing installed system-wide), renders a test reel, and tells you the next step. Every release is
  tested on a clean machine of each system before it ships.
- **Design your own presenter.** Open `character-designer.html`, pick face, hair, glasses, clothes and colours, press
  "Copy for Claude" and paste it: `/make-reel` draws your presenter.
- **The full style library.** More than 50 film styles, each with its guide and a demo film, alongside the
  hand-painted reel style.
- **Pro: the content workflow.** `/ig-plan` (the week), `/ig-viral` (what is working in your niche), `/ig-reel`
  (scored hooks and the script), `/ig-human` (so it does not read like AI), `/ig-dm` (comment-to-DM automation with
  your own ChatbotX account) and `/ig-caption`. Each one writes a file in `workspace/` that the next one reads.

## v1.4.1 · 2026-10-18

- **`/make-reel` command.** One slash command runs the whole process. Type `/make-reel` with nothing after it to
  see the examples.
- **Three example scripts** in `examples/`, each with a world and camera idea, to show what the kit can animate.

## v1.4 · 2026-10-18

- **A review loop built in.** Claude now scores the hook (ships at 8/10 or better), scans the whole MP4 for problems,
  fixes them and logs every fix in `REVIEW.md`, up to 3 rounds, before it hands you the reel.
- **Better scripts.** `VOICE.md`: the script shape and rules behind a 92k-view reel, a banned-phrase list (no AI
  slop), and a pace check so the voice never sounds breathless.
- **Cinematic chapters.** Each chapter is one continuous camera move, the way our best reels are built. Two new
  transitions between chapters: an ink `splat` and an `iris`.
- **Astronaut Clawd.** `{ astro: true }` adds the dome, pack and new moods for "ship it" moments.
- **A real reference.** `ref/` has the full storyboard and review of a finished 55-second reel, so Claude aims at that bar.

## v1.3 · 2026-10-03

- Token Diet bonus (`bonus/token-diet.html`).

## First release · 2026-09-30

- First release: one prompt to a hand-painted vertical reel.
