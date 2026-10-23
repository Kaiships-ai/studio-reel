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

One brief, "Ship it.", made in every style at 9:16 by Kaiships Studio. Click a frame for the style's rules.

<!-- GALLERY:START (tools/readme_gallery.py) -->

### Evidence Films

|   |   |   |   |
|---|---|---|---|
| <a href="styles/satellite-briefing/STYLE.md"><img src="styles/satellite-briefing/showcase.jpg" width="190" alt="Satellite Briefing"></a><br>**Satellite Briefing** | <a href="styles/briefing-board/STYLE.md"><img src="styles/briefing-board/showcase.jpg" width="190" alt="Engineering Briefing Board"></a><br>**Engineering Briefing Board** | <a href="styles/lidar-survey/STYLE.md"><img src="styles/lidar-survey/showcase.jpg" width="190" alt="LiDAR Survey"></a><br>**LiDAR Survey** | <a href="styles/white-model/STYLE.md"><img src="styles/white-model/showcase.jpg" width="190" alt="Projection on White Model"></a><br>**Projection on White Model** |
| <a href="styles/data-physical/STYLE.md"><img src="styles/data-physical/showcase.jpg" width="190" alt="Data Physicalization"></a><br>**Data Physicalization** | <a href="styles/teardown/STYLE.md"><img src="styles/teardown/showcase.jpg" width="190" alt="Exploded Teardown"></a><br>**Exploded Teardown** | <a href="styles/microscope/STYLE.md"><img src="styles/microscope/showcase.jpg" width="190" alt="Microscope Story"></a><br>**Microscope Story** | <a href="styles/archive-lighttable/STYLE.md"><img src="styles/archive-lighttable/showcase.jpg" width="190" alt="Archive Light Table"></a><br>**Archive Light Table** |

### Hand-drawn & Painting

|   |   |   |   |
|---|---|---|---|
| <a href="styles/crayon-book/STYLE.md"><img src="styles/crayon-book/showcase.jpg" width="190" alt="Crayon Picture Book"></a><br>**Crayon Picture Book** | <a href="styles/watercolor/STYLE.md"><img src="styles/watercolor/showcase.jpg" width="190" alt="Watercolor Brush"></a><br>**Watercolor Brush** | <a href="styles/ink-wash/STYLE.md"><img src="styles/ink-wash/showcase.jpg" width="190" alt="Chinese Ink Wash"></a><br>**Chinese Ink Wash** | <a href="styles/impasto/STYLE.md"><img src="styles/impasto/showcase.jpg" width="190" alt="Impasto Oil Painting"></a><br>**Impasto Oil Painting** |
| <a href="styles/one-line/STYLE.md"><img src="styles/one-line/showcase.jpg" width="190" alt="One-line Drawing"></a><br>**One-line Drawing** | <a href="styles/whiteboard/STYLE.md"><img src="styles/whiteboard/showcase.jpg" width="190" alt="Whiteboard Explainer"></a><br>**Whiteboard Explainer** | <a href="styles/urban-sketch/STYLE.md"><img src="styles/urban-sketch/showcase.jpg" width="190" alt="Urban Sketch · Pen & Wash"></a><br>**Urban Sketch · Pen & Wash** |   |

### East Asian Traditions

|   |   |   |   |
|---|---|---|---|
| <a href="styles/shadow-puppet/STYLE.md"><img src="styles/shadow-puppet/showcase.jpg" width="190" alt="Shadow Puppetry"></a><br>**Shadow Puppetry** | <a href="styles/ukiyoe/STYLE.md"><img src="styles/ukiyoe/showcase.jpg" width="190" alt="Ukiyo-e"></a><br>**Ukiyo-e** | <a href="styles/papercut-red/STYLE.md"><img src="styles/papercut-red/showcase.jpg" width="190" alt="Red Paper-cut"></a><br>**Red Paper-cut** | <a href="styles/paper-lantern/STYLE.md"><img src="styles/paper-lantern/showcase.jpg" width="190" alt="Paper-cut Lightbox"></a><br>**Paper-cut Lightbox** |

### Print & Printmaking

|   |   |   |   |
|---|---|---|---|
| <a href="styles/risograph/STYLE.md"><img src="styles/risograph/showcase.jpg" width="190" alt="Risograph Print"></a><br>**Risograph Print** | <a href="styles/halftone-dossier/STYLE.md"><img src="styles/halftone-dossier/showcase.jpg" width="190" alt="Halftone Dossier"></a><br>**Halftone Dossier** | <a href="styles/woodcut/STYLE.md"><img src="styles/woodcut/showcase.jpg" width="190" alt="Woodcut Print"></a><br>**Woodcut Print** | <a href="styles/engraving/STYLE.md"><img src="styles/engraving/showcase.jpg" width="190" alt="Copperplate Engraving"></a><br>**Copperplate Engraving** |
| <a href="styles/silkscreen-poster/STYLE.md"><img src="styles/silkscreen-poster/showcase.jpg" width="190" alt="Silkscreen Travel Poster"></a><br>**Silkscreen Travel Poster** |   |   |   |

### Graphic & Type

|   |   |   |   |
|---|---|---|---|
| <a href="styles/swiss-motion/STYLE.md"><img src="styles/swiss-motion/showcase.jpg" width="190" alt="Swiss Motion Graphics"></a><br>**Swiss Motion Graphics** | <a href="styles/spy-titles/STYLE.md"><img src="styles/spy-titles/showcase.jpg" width="190" alt="60s Spy Title Sequence"></a><br>**60s Spy Title Sequence** | <a href="styles/art-deco/STYLE.md"><img src="styles/art-deco/showcase.jpg" width="190" alt="Art Deco"></a><br>**Art Deco** | <a href="styles/blueprint/STYLE.md"><img src="styles/blueprint/showcase.jpg" width="190" alt="Blueprint"></a><br>**Blueprint** |
| <a href="styles/stained-glass/STYLE.md"><img src="styles/stained-glass/showcase.jpg" width="190" alt="Stained Glass"></a><br>**Stained Glass** | <a href="styles/pictogram-motion/STYLE.md"><img src="styles/pictogram-motion/showcase.jpg" width="190" alt="Pictogram Motion"></a><br>**Pictogram Motion** | <a href="styles/ascii-crt/STYLE.md"><img src="styles/ascii-crt/showcase.jpg" width="190" alt="ASCII / CRT Terminal"></a><br>**ASCII / CRT Terminal** |   |

### Information & Keynote

|   |   |   |   |
|---|---|---|---|
| <a href="styles/dataviz/STYLE.md"><img src="styles/dataviz/showcase.jpg" width="190" alt="Data Storytelling"></a><br>**Data Storytelling** | <a href="styles/iso-infographic/STYLE.md"><img src="styles/iso-infographic/showcase.jpg" width="190" alt="Isometric Infographic"></a><br>**Isometric Infographic** | <a href="styles/dark-keynote/STYLE.md"><img src="styles/dark-keynote/showcase.jpg" width="190" alt="Dark Tech Keynote"></a><br>**Dark Tech Keynote** | <a href="styles/living-screencast/STYLE.md"><img src="styles/living-screencast/showcase.jpg" width="190" alt="Living Screencast"></a><br>**Living Screencast** |
| <a href="styles/hologram-hud/STYLE.md"><img src="styles/hologram-hud/showcase.jpg" width="190" alt="Sci-fi Hologram HUD"></a><br>**Sci-fi Hologram HUD** |   |   |   |

### Cartoon & Anime

|   |   |   |   |
|---|---|---|---|
| <a href="styles/rubber-hose/STYLE.md"><img src="styles/rubber-hose/showcase.jpg" width="190" alt="1930s Rubber Hose Cartoon"></a><br>**1930s Rubber Hose Cartoon** | <a href="styles/cel-anime-80s/STYLE.md"><img src="styles/cel-anime-80s/showcase.jpg" width="190" alt="80s Cel Anime"></a><br>**80s Cel Anime** | <a href="styles/scifi-toon/STYLE.md"><img src="styles/scifi-toon/showcase.jpg" width="190" alt="Sci-Fi Sitcom Toon"></a><br>**Sci-Fi Sitcom Toon** | <a href="styles/midcentury-toon/STYLE.md"><img src="styles/midcentury-toon/showcase.jpg" width="190" alt="Mid-century Cartoon"></a><br>**Mid-century Cartoon** |
| <a href="styles/kai-hand-draw/STYLE.md"><img src="styles/kai-hand-draw/showcase.jpg" width="190" alt="Kai Hand-Draw Reel"></a><br>**Kai Hand-Draw Reel** |   |   |   |

### Games

|   |   |   |   |
|---|---|---|---|
| <a href="styles/pixel-rpg/STYLE.md"><img src="styles/pixel-rpg/showcase.jpg" width="190" alt="16-bit Pixel RPG"></a><br>**16-bit Pixel RPG** | <a href="styles/hd-2d/STYLE.md"><img src="styles/hd-2d/showcase.jpg" width="190" alt="HD-2D"></a><br>**HD-2D** | <a href="styles/microgame/STYLE.md"><img src="styles/microgame/showcase.jpg" width="190" alt="Microgame Frenzy"></a><br>**Microgame Frenzy** | <a href="styles/game-show/STYLE.md"><img src="styles/game-show/showcase.jpg" width="190" alt="Game Show Flat"></a><br>**Game Show Flat** |

### Cinema & Eras

|   |   |   |   |
|---|---|---|---|
| <a href="styles/silent-film/STYLE.md"><img src="styles/silent-film/showcase.jpg" width="190" alt="1920s Silent Film"></a><br>**1920s Silent Film** | <a href="styles/backrooms/STYLE.md"><img src="styles/backrooms/showcase.jpg" width="190" alt="Liminal Found Footage"></a><br>**Liminal Found Footage** |   |   |

### Materials & 3D

|   |   |   |   |
|---|---|---|---|
| <a href="styles/brick-toy/STYLE.md"><img src="styles/brick-toy/showcase.jpg" width="190" alt="Brick Toy"></a><br>**Brick Toy** | <a href="styles/paper-popup/STYLE.md"><img src="styles/paper-popup/showcase.jpg" width="190" alt="Paper Pop-up Book"></a><br>**Paper Pop-up Book** | <a href="styles/tilt-shift/STYLE.md"><img src="styles/tilt-shift/showcase.jpg" width="190" alt="Tilt-Shift Miniature"></a><br>**Tilt-Shift Miniature** | <a href="styles/lowpoly-island/STYLE.md"><img src="styles/lowpoly-island/showcase.jpg" width="190" alt="Low-poly Isometric Island"></a><br>**Low-poly Isometric Island** |
| <a href="styles/glass-product/STYLE.md"><img src="styles/glass-product/showcase.jpg" width="190" alt="Glass Product Render"></a><br>**Glass Product Render** |   |   |   |

<!-- GALLERY:END -->

Besides `kai-hand-draw`, the studio ships 51 more film styles (watercolor, ukiyo-e, pixel RPG, blueprint, data
storytelling and more), each with a `STYLE.md` and a demo film made in code. See
[`styles/README.md`](styles/README.md) for the full list, and ask Claude for a film in any of them about your own
topic. The guides the agent follows are [`AGENTS.md`](AGENTS.md), [`DIRECTOR.md`](DIRECTOR.md) and
[`TECHNIQUE.md`](TECHNIQUE.md); to change a style and keep it as your own, see [`MY-STYLES.md`](MY-STYLES.md).

## Credits and licence

Kaiships Studio's own code is MIT ([`LICENSE`](LICENSE)). It builds on open-source work, credited with its licences in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
