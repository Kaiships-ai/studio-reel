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

## Good to know

- A 30-second reel takes a few minutes to render, longer on a laptop without a dedicated GPU.
- The voiceover needs an internet connection.
- Something broke? Tell Claude "setup failed, fix it" and paste the error. Or DM @kaiships.ai on Instagram.
- Licence: unlimited videos, personal or commercial. Please don't share or resell the kit itself. See `LICENSE.md`.
