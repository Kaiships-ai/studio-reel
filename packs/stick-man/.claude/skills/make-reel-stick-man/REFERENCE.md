# Stick-man reel reference

Every file a film needs, with the keys the engine reads. The worked example is the sample reel,
`styles/stick-man/examples/sample/` (copy it with `tools/pack/new.mjs --sample`). Units: metres; x right, y into the
scene, z up; the camera stands on the y < 0 side. `yaw` 0 faces the camera side, -90 faces left (-x), 90 faces right.
Frames are at 30 fps.

## Film folder (`films/<name>/`)

| File | Written by | What |
|---|---|---|
| `vo/script.json` | you (step 2) | the narration lines |
| `vo/vo.wav`, `vo/words.json`, `vo/voice-qa.md` | `voice.py`, `align.py` | the voice and every word's start and end |
| `storyboard.json` | you (step 2) | per line: what is seen, and how the auto camera frames it |
| `reel.js` | you (step 4) | the set, the cast, the acting, faces, sounds |
| `audio/ambience.json`, `audio/cues-extra.json` | `new.mjs`, you | room tone; sounds you place by hand |
| `review/frames.jsonl`, `review/check.json` | `check.mjs` | every frame's data; the check result |
| `out/<name>.mp4`, `out/<name>-cover.jpg` | `export.mjs` | the reel |

## Script (`vo/script.json`)

```json
{ "model": "gemini-3.8-flash-tts", "cast": { "nar": "Puck" }, "say": {},
  "lines": [ { "id": "l01", "who": "nar", "style": "fast, amused storyteller", "text": "Leo yawned." } ] }
```

- `cast.nar`: a Gemini voice (Puck, Kore, Charon, Fenrir, Aoede, Leda, Orus, Zephyr, and more: try 3 with `--samples`).
- `style`: how to read the line, always starting with "fast" (a reel moves). `text`: what is said; numbers as you want
  them heard. `say` maps a written token to its spoken words for the aligner (`{ "1980": "nineteen eighty" }`).

## Voice

`voice.py films/<name> --take <Voice>` records the whole script in one call (vo/takes/take-NN.wav, then vo/vo.wav).
Give the reel air before the first word and after the last (the payoff needs a beat to land), then align:

```
pixi run node styles/stick-man/tools/pack/pad.mjs films/<name> --start 0.5 --end 1.5
pixi run python styles/stick-man/tools/run/align.py films/<name>
```

## Storyboard (`storyboard.json`): the auto camera

```json
{ "film": "my-film", "lines": [
  { "id": "l01", "role": "hook", "shot": "ms", "of": ["leo"], "see": "Leo yawns on the sofa" },
  { "id": "l02", "role": "setup", "shot": "two", "on": "Maya", "see": "Maya walks in and yawns too" } ] }
```

The camera plans every line: a first shot from `shot` (or from the role), a second on the key word `on` when the line
is long enough, a rush or a dissolve between them, never the same framing twice in a row. You steer it; you never
place the camera by hand.

| Key | Meaning |
|---|---|
| `see` | what a viewer with the sound off sees on this line (you check the stills against it) |
| `role` | `hook`, `setup`, `explain`, `fact`, `number`, `compare`, `reaction`, `twist`, `panic`, `payoff` (left out: guessed from the text) |
| `shot` | the first framing: `est` (high wide), `wide`, `two` (both actors), `ms` (one actor, knees up), `cu` (a face), `low` (hero angle), `profile` (side-on two), `ots` (over a shoulder), `punch` (snap-in close-up, a gag), `dutch` (tilted close-up, panic), `top` (from above), `aerial` |
| `of` | who the shot is about (cast names); left out: the most active actor |
| `on` | the key word: the second shot lands on it |

Pick shots for what the line shows: a face that changes = `ms` or `cu` of that actor; two actors reacting = `two`;
a new place = `est`. Check the stills: a figure cut by the frame edge or hidden behind furniture means another `shot`,
another `of`, or the actors on other marks.

## Reel (`reel.js`)

```js
import '/styles/stick-man/kit/cast/characters.js';                  // MAYA, LEO, SAM, ROB
import { sit, K } from '/styles/stick-man/motion-lib/base.js';     // standard poses, for an actor who starts seated
export default {
  title: 'my-film', fps: 30, frames: [0, 449], style: 'kaiships',
  set: 'room', setModule: '/styles/stick-man/kit/sets/room.js',
  lines: ['l01', 'l02'], captions: { mode: 'chunk' },
  cast: { leo: { spec: 'LEO', at: [-0.55, 1.05, 0], yaw: 0, posture: 'sit', expr: 'calm' },
          maya: { spec: 'MAYA', at: 'door', yaw: 90, lead: true, focus: 'leo' } },
  anim: { leo: [K(0, { ...sit('adult'), pos: [-0.55, 1.05, 0], yaw: 0 }, { ease: 'snap' }), { f: 222, clip: 'Trans_StandUp_Once', pos: [-0.55, 1.05], yaw: 0 }],
          maya: [{ f: 0, clip: 'Move_Walk_Fwd_Loop', pos: [-2.4, -0.45], to: [0.45, -0.35] }, { f: 145, clip: 'Idle_Stand_Loop', times: 3 }] },
  beats: [ { f: 6, who: 'leo', expr: 'sleep_O', take: false }, { f: 118, who: 'maya', expr: 'confused', look: 'leo' },
           { f: 362, who: 'maya', do: 'sound', name: 'ting', strength: 0.6 } ],
  overlays: [],
};
```

| Key | Meaning |
|---|---|
| `frames` | `[0, last]`: the last frame `align.py` printed, plus the tail you padded |
| `set`, `setModule` | the place (below); a film's own set: `setModule: '/films/<name>/set.js'` |
| `lines` | the script line ids, in order |
| `captions` | `{ mode: 'chunk' }` (1-3 words a caption, the default to use) or `{ mode: 'word' }` (one content word: only for slow narration) |
| `style` | `'kaiships'`: the motion dose (squash, follow-through, arcs); keep it |
| `cast.<name>` | `spec` (a character, below), `at` (a mark name or `[x, y, z]`), `yaw`, `expr` (starting face), `focus` (who they look at: a cast name or `'camera'`), `lead: true` (the main actor: the camera and the footsteps follow them), `posture: 'sit'` |
| `anim.<name>` | the acting: clip keys (below) and pose keys `K(f, pose, { ease })` |
| `beats` | `{ f, who, expr, look }` a face or a look at frame f (`take: false` = an easy change, not a big reaction); `{ f, who, do: 'sound', name, strength }` a sound |
| `overlays` | drawn on top: `{ kind: 'text', from, to, text, at: [0.5, 0.2], size: 64, box: true }` a label; keep the screen clean: captions already carry the words |

### Clips (the motion library)

`pixi run node styles/stick-man/tools/pack/clips.mjs` lists all 37 clips: walk, run, stand, talk, sit down, sit,
stand up, pick up, put down, lie down, get up, phone call, hand over, eat, push, torch, look up, and more, on five
bodies (adult, heavy, thin, child, elder).

```js
{ f: 0, clip: 'Move_Walk_Fwd_Loop', body: 'adult', pos: [-2.4, -0.45], to: [0.45, -0.35] }   // walks to a point
{ f: 145, clip: 'Idle_Stand_Loop', yaw: -25, times: 3 }                                       // a loop, 3 times
{ f: 222, clip: 'Trans_StandUp_Once', pos: [-0.55, 1.05], yaw: 0, expr: 'excited' }          // a one-off
```

- A key starts where the actor is (or at its `pos`, facing its `yaw`; a walk faces where it goes).
- A clip must end before the next key starts: `clips.mjs --end '<the key as JSON>'` prints its last frame. A key that
  cuts a clip short makes a joint snap (the joints check fails on that frame).
- `times` repeats a loop; `to` makes a walk or run cover the distance; `body` picks a body type (default adult).
- Clips that hold something (`holds bag`) bring their prop; clips that `need` a seat, a counter or a window need that
  piece in the set at the clip's spot.

### Faces (62)

`neutral calm happy grin closed smug sly stern worried shock sleep manic panic blush angry furious nervous sad cry
dizzy confused excited deadpan suspicious scream pain proud disgust laugh skeptic bored`, and each with an open mouth
(`happy_O`, `sleep_O` = a yawn, `shock_O`, ...). The sheet of all of them:
`pixi run node styles/stick-man/tools/pack/render.mjs --page faces --out faces.jpg`. Faces change smoothly and blink on
their own; shock, scream and panic play as a big take unless `take: false`.

### Characters (`kit/cast/characters.js`)

| Spec | Who |
|---|---|
| `MAYA` | coral top, dark bun: curious, quick |
| `LEO` | white shirt, red tie, brown curls: easy-going, a bit too sure |
| `SAM` | heavy body, mustard top, flat cap, glasses: the calm neighbour |
| `ROB` | purple top, blue beanie: walk-ons and crowds |

A new one, in the film folder (`films/<name>/cast.js`, imported from `reel.js`):

```js
import { SPECS } from '/styles/stick-man/engine/play.js';
import { hairCap } from '/styles/stick-man/engine/cast.js';
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';
SPECS.NOVA = bodySpec({ name: 'Nova', shirt: [0.3, 0.5, 0.9], hair: [hairCap([0.1, 0.1, 0.1])], glasses: true }, 'thin');
```

Hair and hats: `curls`, `hairCap`, `flatCap`, `bandana`, `visor`, `guardCap` (`engine/cast.js`), `beanie`, `sunHat`,
`bun` (`kit/cast/extras.js`). Clothes: `{ vest: rgb }`, `{ tie: rgb }`, `{ bowtie: rgb }`, `{ vest, strap }`.

### Sets

| Set | Marks (`at`, `to`) | Good for |
|---|---|---|
| `room` | `left`, `center`, `right` (on the rug), `sofa_l`, `sofa_r` (seats), `door`, `window` | home stories, two people talking |
| `street` | `left`, `center`, `right` (sidewalk), `bench`, `cafe_door`, `shop_door`, `far_left`, `far_right` | walking, meeting, outside |
| `grey-room` | `left`, `center`, `right`, `seat`, `far_left`, `far_right` | trying a clip, a face or a shot |

A set is a module with `build(stage)` and `MARKS`, `PLACES`, `COLLIDE` (the solid boxes a body may not enter) and
`CAMERA_ROOM` (where the camera may stand). Copy `styles/stick-man/kit/sets/grey-room.js` to `films/<name>/set.js` to
make a place of your own; `kit/sets/kit.js` has the pieces (`box`, `cyl`, `sphere`, `card`, materials, lights, `room`,
`windowY`, `skyDome`). Keep the camera's side of the cast clear: furniture between the camera and an actor hides them.

### Sounds

- `beats` with `do: 'sound'`: `ting`, `ding`, `whoosh`, `pop`, `poof`, `boom`, `thud`, `slide`, `rustle`, `beep`, `tick`,
  `wah`, `sting`, `snore` and the rest of the synth bank.
- `audio/cues-extra.json`: `[{ "t": 7.4, "name": "springs", "strength": 0.6 }]` (seconds), any of the 62 recordings in
  `styles/stick-man/sound/library.json` (doors, steps, knocks, glass, crowd, cars, rain, …).
- `audio/ambience.json`: `{ "amb": [[[0, 15], "office", -4, "what it is"]] }` a room tone under the whole reel
  (`office`, `street_day`, `lane`, `walkway`, `room_rain`, `tension`, …).
- Footsteps come from the picture: every foot that lands in view gets a step.
- Music: none ships. A track the user owns: `pixi run python styles/stick-man/tools/run/mix.py films/<name> --music <file>`.

## Checks (`tools/pack/check.mjs`)

| Check | Fails when | Usual fix |
|---|---|---|
| joints | a joint turns over 40 deg in one frame where the camera sees it, or a limb is 3 cm inside the body | start the next clip after the last ends (`clips.mjs --end`) |
| feet | a planted foot slides over 2 px a frame (at 720 wide) | the same; or an actor pushed by a `pos` change mid-clip |
| captions | a word is not on screen while it is said, a caption is up under 8 frames, or one is over 22 characters | reword the line (short words between commas flash by), re-record, re-align |
