# Kaiships Reel Kit

Type one prompt. Claude makes the whole reel: script, voiceover, painted animation, captions, music and sound
effects. You get a vertical MP4 (1080×1920) ready to post.

## Use it

1. Unzip this folder anywhere.
2. Have [Node.js](https://nodejs.org) 18+ and [Claude Code](https://claude.com/claude-code) installed.
3. Open the folder in Claude Code: `cd kaiships-reel-kit`, then `claude`.
4. Paste a prompt. The first run sets everything up by itself (a few minutes, needs internet).
5. Your reel is in `out/`, with a cover image next to it.

## Prompts to copy

Check the kit works:

> Render the example reel.

A topic, nothing else:

> Make a 30-second reel about 3 mistakes people make when they start running.

A tone:

> Make a 20-second reel that explains what an API is to a complete beginner. Friendly and a bit funny.

Your own facts (Claude only shows numbers and names you give it or can source):

> Make a 30-second reel for my coffee shop, Moon Beans in Austin. Facts: open 7am–6pm every day, oat flat white
> is $4.50, we roast in-house. End with "come say hi".

Your own script, word for word:

> Make a reel from this script, exactly as written: "Most people quit the gym in week three. Here's why…"

Change something after it renders:

> The first 3 seconds are too slow. Make the hook hit harder and render again.

## New in v1.4

- **A review loop built in.** Claude now scores the hook (ships at 8/10 or better), scans the whole MP4 for problems,
  fixes them and logs every fix in `REVIEW.md`, up to 3 rounds, before it hands you the reel.
- **Better scripts.** `VOICE.md`: the script shape and rules behind a 92k-view reel, a banned-phrase list (no AI
  slop), and a pace check so the voice never sounds breathless.
- **Cinematic chapters.** Each chapter is one continuous camera move, the way our best reels are built. Two new
  transitions between chapters: an ink `splat` and an `iris`.
- **Astronaut Clawd.** `{ astro: true }` adds the dome, pack and new moods for "ship it" moments.
- **A real reference.** `ref/` has the full storyboard and review of a finished 55-second reel, so Claude aims at that bar.

## Good to know

- A 30-second reel takes a few minutes to render, longer on a laptop without a dedicated GPU.
- The voiceover needs an internet connection.
- Something broke? Tell Claude "setup failed, fix it" and paste the error. Or DM @kaiships.ai on Instagram.
- Licence: unlimited videos, personal or commercial. Please don't share or resell the kit itself. See `LICENSE.md`.

## Bonus: Token Diet

Open `bonus/token-diet.html` in your browser (also as `.md`): one page on the three tools I use or recommend to keep Claude's token bill down while making reels: Caveman, CodeBurn and OmniRoute. You install them yourself; they are not part of the kit.
