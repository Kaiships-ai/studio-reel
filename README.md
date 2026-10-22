# Kaiships Studio

Kaiships Studio turns a topic into a finished, hand-drawn vertical reel (1080×1920 MP4 with a cover), directed,
drawn, scored and mixed by Claude Code writing code: no video generation, no stock footage. Its own style,
`kai-hand-draw`, stars Clawd and your presenter; a library of 52 film styles is there for other looks.

## What you need

- [Claude Code](https://claude.com/claude-code).
- An internet connection for the first setup (it downloads Node, Python, ffmpeg and a headless browser into this
  folder; nothing is installed system-wide and no admin rights are needed).
- macOS, Windows or Linux.

## Quick start

1. Unzip Kaiships Studio somewhere with a short path (for example `~/kaiships-studio`).
2. Open that folder in a terminal.
3. Start Claude Code:

   ```sh
   claude
   ```

4. Set up the studio (first time only; later runs check the setup and tell you what to do next):

   ```text
   /studio
   ```

5. Make a reel:

   ```text
   /make-reel <your topic>
   ```

`/studio` runs `pixi run studio install` for you. If something stops working later, `pixi run studio doctor`
checks the setup and names what is missing.

## Where your films go

Every film gets its own folder, `films/<name>/`, with the MP4, its cover, subtitles and the source that made it.
Nothing outside that folder is changed when you make a film, and the films are yours: no credit or watermark from us.

## The style library

Besides `kai-hand-draw`, the studio ships 51 more film styles (watercolor, ukiyo-e, pixel RPG, blueprint, data
storytelling and more), each with a `STYLE.md` and a demo film made in code. See
[`styles/README.md`](styles/README.md) for the full list, and ask Claude for a film in any of them about your own
topic. The guides the agent follows are [`AGENTS.md`](AGENTS.md), [`DIRECTOR.md`](DIRECTOR.md) and
[`TECHNIQUE.md`](TECHNIQUE.md); to change a style and keep it as your own, see [`MY-STYLES.md`](MY-STYLES.md).

## Credits and licence

Kaiships Studio's own code is MIT ([`LICENSE`](LICENSE)). It builds on open-source work, credited with its licences in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
