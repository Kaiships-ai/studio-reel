# Changelog

Every release of Kaiships Studio. Newest first.

## v1.7 · unreleased

- **How we make Ten Million Views, the series kit (first release).** Pick a style for your show after you make your
  characters: 3D, cut paper or hand-drawn. Every episode renders in that style, with your own character and a world
  built from your colours and texts.
- **From an idea to a season.** The story skill takes a rough idea to a premise, characters, a style, a world and a
  season. The episode skill writes an 80-90 s script, checks it against the season's script rules (12 words a
  sentence, BUT/SO links, a source on every claim, a two-way vote, the lead as "you"), voices it, renders it and runs
  the 11 gates. The series skill asks which answer won the vote and opens the next episode with it.
- **A voice you can trust.** The voice step stops a take that reads one line twice, drops breaths from the word
  timings and keeps soft words, so captions sit on the words.
- **A fair style picture.** `make.mjs styles <card>` draws your character in all three styles, with the same accent
  colour in each and an honest list of what each style draws differently.
- Starter and Pro: shared fixes only (the character card, the paper figure, the install output is quieter).

## v1.6 · 2026-10-23

- **Every style makes reels.** All 52 styles now lay out natively at 9:16: `/make-reel <topic> --style <style>`
  makes a vertical reel with a cover and a caption in any of them. The README shows one brief made in every style.
- **A first reel from a rough idea.** `/studio` asks what the reel should be about, suggests a content type and two
  or three styles with their showcase images, and lets you choose **cook** (Claude goes all out) or **direct** (your
  script and storyboard, followed exactly).
- **Content types.** Listicle, education, why, explanation and promo: the beats, timings, hooks and CTA of each,
  usable with any style.
- **One delivery check for every style.** `core/render/reelcheck.mjs` checks size, frame rate, colour, loudness,
  frozen or black stretches, the CTA keyword in the final mix and the delivered files. It also catches what reviewers
  used to find by eye: a spoken hook longer than 3.5 s, stretches with nothing new on screen, text or the subject
  outside Instagram's safe zone, and a number badge on screen without its title.
- **One build command for every style.** `core/render/reel.mjs <film>` makes the voice, the sound (voice, music and
  SFX from the page's events, via `core/audio/mix.py`), the frames, the mastered MP4, the cover, the `.srt` and the
  checks for any page that keeps the page contract.
- `video.mjs --lossless` keeps fine coloured dots (riso, halftone, dither) sharp and their colours true.
- `still.mjs` takes `--quality` for its JPEGs.

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
