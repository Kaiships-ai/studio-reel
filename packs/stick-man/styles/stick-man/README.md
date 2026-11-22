# The stick-man pack

Short vertical story reels with 3D stick figures, made in code on your computer. Start with
[`START-stick-man.md`](../../START-stick-man.md) at the library root; make reels with `/make-reel-stick-man` in Claude Code.

## What is in it

| Part | Where | What |
|---|---|---|
| Engine | `engine/`, `reel.html` | the figures (a rig with real joint limits and balance), faces, acting, camera, captions, the page that draws a reel frame by frame |
| Auto camera | `engine/shotplan.js`, `engine/camera.js` | plans every line's shots from the storyboard: 13 framings, rushes and dissolves between them |
| Motions | `motion-lib/` | 37 clips on five bodies (adult, heavy, thin, child, elder): walk, run, stand, talk, sit down, sit, stand up, pick up, put down, lie down, get up, phone, hand over, eat, push, torch, look up, … (`tools/pack/clips.mjs` lists them) |
| Faces | `engine/faces.js`, `faces.html` | 62 expressions (31 faces, each also with an open mouth), smooth changes, blinks, looks |
| Characters | `kit/cast/characters.js` | four sample characters (Maya, Leo, Sam, Rob) and the parts to make your own (hair, hats, clothes, body types) |
| Sets | `kit/sets/room.js`, `street.js`, `grey-room.js` | a living room, a town street, a grey test studio; `kit/sets/kit.js` to build your own |
| Sound | `sound/` | 62 recorded sound effects and room tones (CC0), a synthesised effects bank, the mixer (`tools/run/mix.py`) |
| Voice | `tools/run/voice.py`, `align.py` | narration with Google Gemini (your key), word timing with an offline aligner |
| Tools | `tools/pack/` | `new.mjs` start a film, `render.mjs` stills and video, `check.mjs` the three checks, `export.mjs` the finished reel, `clips.mjs`, `pad.mjs` |
| Checks | `tools/pack/check.mjs` | joints (no snaps, no limbs through the body), feet (no sliding), captions (every word shown, readable) |
| Series bible | `series-bible/` | a blank template for a series: characters, look, sets, voice, episode shape |
| Sample | `examples/sample/` | a 15 s reel made only from this pack |

## How a reel is made

```
idea -> vo/script.json -> voice.py -> align.py (words.json) -> storyboard.json + reel.js -> render.mjs (stills)
     -> check.mjs -> export.mjs (cues, mix, video, cover)
```

Every frame is a pure function of its number: a render can stop and start again, and the same files always give the
same video. Licences: [`LICENSES.md`](LICENSES.md).
