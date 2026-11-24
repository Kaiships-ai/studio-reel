# Reel data (`films/<slug>/storyboard.json`, `reel.js`)

Plain data modules. `styles/stick-man/engine/play.js` reads `reel.js` and `vo/words.json`; every frame is a pure function of
its number. Worked example: Hot Money ep01 (`films/hm-ep01`, git-ignored). `new_film.mjs` writes this skeleton.

## Storyboard (`storyboard.json`)

One entry per `vo/script.json` line; the board and the story gates read it.

```json
{ "film": "my-film", "lines": [
  { "id": "l01", "see": "The engineer kneels on his own blue railway and saws a small gap in the rail.",
    "set": "edge", "props": ["joint"], "act": { "eng": ["saw@gap"] }, "still": "gap" } ] }
```

| Key | Meaning |
|---|---|
| `see` | what a viewer with the sound off must see on this line |
| `still` | the word board still A is taken on: the frame that carries the line's meaning (it can be another shot than the spoken key word) |
| `act` | the lead's body action, `{ actor: ['pose@word'] }`, pose names from `engine/poses.js` and `kit/cast/rail.js` |
| `props`, `fx` | set props and `make` effects that carry the line (each seen ≥ 3 frames in its window) |
| `set` | the set the line plays on |

## Shot list (`storyboard.json` → `scenes`, `shots`)

Written in stage 1 ([1.0] scenes, [1.4a] shots), read by `tools/gates/prepro.mjs` (checks), `tools/run/animatic.mjs` (the cut) and
stage 3 (`direct` cameras start from it). One entry per **shot**; the `lines` entries above stay one per voice line.

```json
{ "film": "hm-ep01", "fps": 30, "climax": "SH160", "last": 2490,
  "scenes": [
    { "id": "S1", "feel": "panic with greed: four minutes, ten million on the bed", "whose": "you",
      "key": "police are coming; the money is yours if it reaches the car", "question": "can you get it out in time?" } ],
  "shots": [
    { "id": "SH010", "scene": "S1", "at": "l01", "size": "WS", "angle": "high", "lens": 24, "move": "push",
      "purpose": "P1 · danger + reward in one frame: cops at the window, money on the bed", "see": "you frozen by the bed, red-blue light on the window",
      "story": 7, "screen_dir": "-", "axis": "A", "kind": "action",
      "panels": ["board/SH010_a.png", { "img": "board/SH010_b.png", "f": 40 }],
      "text": [ { "text": "4:00", "at": [0.78, 0.18] } ] } ] }
```

| Key | Meaning |
|---|---|
| scene `feel`, `whose`, `key`, `question` | the scene brief ([1.0]): what the audience feels, whose eyes, what they must learn, the question it opens; `noEst: "why"` when the scene needs no establishing shot |
| `climax`, `last`, `fps` | the climax shot id (else the highest `story`), the end frame (else 12 frames after the voice), the frame rate |
| `id`, `scene` | `SH010`, `SH020` … (steps of 10 leave room to insert); the scene it belongs to |
| `at` / `f0` / `dur` | where it starts: `"l03"` (the line's first word), `"l03:gap"` (a word), `"l03:gap#2"` (its second time); or a frame `f0`; or the previous shot's `dur`. It ends where the next shot starts |
| `size`, `angle`, `lens`, `move` | the vocabulary in PREPRO.md section 2 (`CARD` needs no lens); `dir` (`up`/`down`, or `L>R`/`R>L`) for pans, tilts and cranes; `fast: true`, `extreme: true` raise the intensity score |
| `purpose` | `P<n> · ` + what the viewer must get in this shot |
| `see` | what is visible, in plain words (the grey card shows it while no panel exists) |
| `story` | the beat's story intensity 1-10 (from [1.0]) |
| `screen_dir`, `axis`, `turn`, `axis_cross`, `subject` | continuity: `L>R` / `R>L` / `-`; the side of the scene's 180° line (`A`/`B`); a turn shown on screen; how a crossing is made legal; the subject id for the 30° check |
| `kind` | `action`, `reaction`, `explain`, `insert`, `reveal` (an action needs anticipation, extreme and result keys) |
| `panels` | image paths under the film folder; `{ img, f }` starts a panel `f` frames into the shot (default: evenly split) |
| `text` | on-screen words: `{ text, at: [x, y], size, color, box, f0, dur }` (`at` = the block's centre, 0-1; `size` = share of the frame height, default 0.034) or `zone`; `box` is `true`, `{ color, alpha, pad, r }` (as in the overlay below; the animatic ignores `r`) or an ffmpeg colour string, and any characters (`%`, `:`, `'`) draw as written; `animatic.mjs` draws them where they will be, `prepro.mjs` checks reading speed, width and the text-safe box. Panels carry no baked text |
| `montage` | a reason a run of same-size shots is the point (a rule-of-three, a list); waives the C3/C4 checks for that run |
| `hold`, `cam2d` | a reason for a long static hold; an explicit 2D move for the animatic (`{ z: [1, 1.2], x: [0.5, 0.55], y: [0.5, 0.5] }`) |
| `options`, `pick` | camera-intent options `{ safe: {...}, emo: {...}, bold: {...} }`, each the fields it changes plus its `panels`; `pick` is Kai's choice. `--opt SH040:emo` renders or checks another pick |

## Breakdown, acting and measures (on shots and the storyboard)

The breakdown (`set`, `cast`, `props`, `state`, `reset`, `measures`) goes into `storyboard.json` itself: it is not in the
hash that keeps the ◇2 reviews fresh (`BREAKDOWN` in `tools/gates/fresh.mjs`), so adding it in stage 2 does not stale them.

| Key | Meaning |
|---|---|
| shot `set`, `cast`, `props`, `state` | what the shot needs (`assets.mjs` builds the asset list from them); `state` = story states at this shot (`{ "in_car": 2, "trunk_holes": 3 }`), numeric states never go back without `reset: ["in_car"]` |
| shot `acting` | `{ think, do, change }` for every action / reaction shot, before blocking (`timing.mjs` A5) |
| storyboard `measures` | `[{ name, story: "34 steps", meters, tol, module: "set/motel.js", path: ["door9", [x, y], "trunk"] }]`: the set measured against the story (`assets.mjs` A4); `cheat: "why"` only when the reviewer approved it |

## Decision log (`films/<slug>/DECISIONS.json`)

```json
{ "decisions": [ { "id": "D03", "decision": "First 3 seconds: one shot, no cut", "by": "kai", "at": "2026-11-13", "status": "approved",
  "source": "season-1.md Ep1", "where": { "scenes": ["S1"] }, "check": [ { "type": "noCutBefore", "sec": 3 } ] } ] }
```

`status`: proposed (an agent), approved (only Kai), dropped (only Kai: `droppedBy`, why). `check` types read by `prepro.mjs`
(D2): `noCutBefore {sec}`, `maxSec {sec}`, `textMust {text, scenes?}`, `textMustNot {text, scenes?}`, `seeIncludes {text (regex), scenes?}`,
`sizeShare {size, min, scenes?}`.

## Sound plan (`audio/sound-plan.json`)

`{ "scenes": [ { "scene": "S5", "bed": "rain on the lot", "foley": ["bag drag", "trunk"], "music": "build|hold|silence|drop|…", "silence": "why", "transition": "J|L|none" } ] }`, read by `postcheck.mjs`.

## `reel.js`

| Key | Meaning |
|---|---|
| `title`, `fps: 30`, `frames: [0, last]` | `last` = the "last frame" line of `vo/voice-qa.md` |
| `CUTS` (export) | the animatic's cut frames, last entry = the end frame; `animatic.mjs` prints it from the shot list |
| `set`, `setModule`, `setOpts` | the place: `setModule: '/styles/stick-man/kit/sets/<name>.js'` (sets in `styles/stick-man/kit/README.md`) |
| `look`, `light`, `grade` | the approved look of the set (e.g. canyon-edge `EDGE_LOOK.look / .light / .grade`) |
| `grade.sky`, `grade.air` | tune the engine's sky dome (`{ glow, clouds }`) and air (`{ k, near, scale, desat }`) for this act, or `false` turns one off (`.claude/skills/verify/features/stick-man-depth.md`) |
| `grade.roll` | `{ knee, ceil }`: this act's highlight roll-off over the kit's 0.55 / 0.85; a close-up filled by the white head takes a lower ceiling (`kit/README.md`) |
| `backdrop` | `{ rows: [{ piece, at, rot, scale, tint }], tint }`: far town rows from `styles/stick-man/assets/backdrop/` past the set's walls; a dark `tint` about 0.17 at night. An act without it gets none; `kituse.mjs` id `depth` needs it in one act or a set that calls `backdrop()` (stick-man-depth.md) |
| `style` | `{ ...STYLE_PRESETS.kaiships, life: 0.75 }`: Kai's dose of the 12 principles (`engine/motion.js` STYLE_PRESETS); physics stays the floor. `life` is the moving hold (0 off, up to 2); every act sets it (`kituse.mjs` id `life`) |
| `faceStyle` | left out or `'s2'`: the rubber face, the default (`engine/facestyles/s2.js`, `y_` and `c_` designs); `'kit'`: the kit faces; any other name fails (`.claude/skills/verify/features/stick-man-face-style.md`) |
| `cast` | `{ name: { spec, at, yaw, expr, focus, lead, costume } }` |
| `anim` | the lead's acting: motion v2 keys (below) |
| `direct` | the cameras (below) |
| `directDrift` | share of camera-to-aim distance closed per second (0.07: held shots never freeze) |
| `make` | set props keyed by beats: `{ joint: { kind: 'ao_anim', prop: 'joint' } }` |
| `beats` | prop keys `{ f, who, do: 'set', key, to, dur, ease }` (ease: smoother, smooth, linear, step, out, in, back) and sounds `{ f, who, do: 'sound', name, strength }` (names: `styles/stick-man/tools/run/sound_bank.py`) |
| `overlays` | the drawn layer (below) |
| `lines`, `glasses`, `captions` | script line ids; `glasses: false`; `captions: { mode: 'word' }` |

## Motion v2 keys (`anim`): blocking and polish

```js
import { hold, polishAt } from '/styles/stick-man/kit/acting/keys.js';   // STAND, BREATH, hold, polishAt; ?blocking=1 = the approved blocking
export const CUTS = [0, 30, 60 /* ... */];   // the animatic's cut frames
const polish = polishAt(CUTS);               // the poses stay; a key on a cut stays a snap; others hold, then move T frames before the next
anim: { eng: polish([ hold(0, { ...KNEEL, pos: E0, yaw: -120, expr: 'sly', look: 'joint' }), hold(8, { stroke: 1, ... }), ... ]) }
// KNEEL, E0 and the other pose / position constants: the film's own reel.js (Hot Money ep01 (`films/hm-ep01`, git-ignored))
```

| Key field | Meaning |
|---|---|
| `f` | frame (CUTS for the first key of a shot) |
| `pose` + overrides | joint channels: `pos [x, y]`, `yaw`, `bob`, `spine {bend, side, twist}`, `neck {nod, tilt, turn}`, `pelvis`, `armL/armR {raise, swing (+ forward), elbow, roll}`, `legL/legR`, props (`x_hpR_saw: 1`) |
| `ease` | `snap` (a cut: no in-between, follow-through and face start fresh), `slow` (slow in/out), `flow`, `in`, `out` |
| `hold` | frames held before moving (polish writes it) |
| `antic` | 0.1-0.35: a wind-up against the move; it shortens the action itself, so give the move enough `t` |
| `t` | on the next key: move length in frames (default 7, strokes 4, big arm moves 14-22, a take 9) |
| `cycle` | `{ 'channel': [amplitude, period, phase] }` on top until the next key (breath, tremble) |
| `expr`, `look` | the face (EXPR names; how each change is timed: [Face timing](#face-timing)) and the gaze target (an actor, a prop, `camera`) |
| `take`, `small`, `exprSpeed` | on a key with `expr`: `take: true` makes any face a take, `take: false` makes a take face a fast change; `small: true` = a small take (no anticipation, 10 f); `exprSpeed: 'fast' \| 'normal' \| 'slow'` overrides the class. Beats take the same three fields |

### Face timing

`engine/acting.js` times every expression change by its class (Hot Money's r2 face research, section 10).
Frames are at 30 fps, counted from the key.

| Class | Faces | Timing |
|---|---|---|
| take | shock, scream, panic, from a face that is not one of them | anticipation 5 f before the key (lids squint, brows drop, mouth shuts, head dips, on twos), accent 4 f on ones to a 20 % overshoot, hold 3 f, settle 8 f on twos. No blink until the settle |
| small | any key with `small: true` | no anticipation, accent 4 f, done at 10 f, the head almost still |
| fast | pain, furious, angry, manic, laugh, excited; take to take | 6 f, overshoot 10 % |
| normal | every other face | 10 f, overshoot 4 %; pupils 1 f early, brows on the key, lids 1 f late, mouth 2 f late |
| slow | sad, bored, sleep, cry; a take or fast face released into a calm one | 16 f |

- A change that starts while another is still moving starts from the face on screen, so keys may come close without a
  pop. They still need room to read: a change reaches 90 % and holds 6 f before the next key (the `face timing` gate).
- A normal or slow change opens out of a blink that starts 1 f before the key (always when the eye kind changes, e.g.
  oval to `^`). Free blinks: a speaker every 60-100 f, a listener every 90-150 f; 7 f, closing faster than opening.
- A look at a new target: the pupils move first, the head follows 2 f later; a big shift brings a long blink.
- Budget per actor: 2-6 changes per 10 s, at most 4 takes a minute and 1 per 10 s (`face timing` gate).

Conventions: yaw 0 faces the camera side (-y), yaw -90 faces -x; `swing` + is forward. Keep `elbow` ≥ 15 and hands a fist
away from head and belly (the IK flips otherwise). Off screen = a far `pos` on a key at a cut frame. `style: 'kaiships'`
bends the keys by Kai's dose; the body's physics (`engine/body.js`) is the floor.

### Motion library clips (`clip`)

A background character, or a lead's blocking start, plays a library clip instead of hand keys: an anim key
`{ f, clip, body, to?, times?, stop?, pos?, yaw?, swap?, expr?, look? }` expands into the clip's keys before playback
(`styles/stick-man/motion-lib`, catalogue `styles/stick-man/docs/MOTION-LIB.md`).

```js
import '/styles/stick-man/motion-lib/props.js';                       // bag, torch, cash, cap
SPECS.GRAN = bodySpec(SPECS.MAGNATE, 'elder');                       // motion-lib/bodies.js: proportions + mass
anim: { gran: [{ f: 0, clip: 'Idle_Breath_Loop', body: 'elder', times: 2 }, { f: 160, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [3, 0] }],
        cop:  [{ f: 0, clip: 'Act_PickUp_Once' }, { f: 100, clip: 'Move_CarryBag_Walk_Loop', to: [4, 0] }] }
```

| Field | Meaning |
|---|---|
| `clip`, `body` | the clip name without body prefix and version; adult, heavy, thin, child, elder (default adult) |
| `to` / `times` / `stop` | a travelling loop walks to `to` (heading, cycles and stride fitted, first and closing steps); `times` = loop cycles; `stop: true` = the steps without `to` |
| `pos`, `yaw` | start and facing (default: where the keys before left the actor) |
| `swap` | the film's prop for the clip's (`{ bag: 'duffel' }`) |
| `expr`, `look`, `ease`, `antic`, `cycle` | onto the clip's first key |

Clips plant feet with `footW` (metres): a later hand key that moves the feet uses `footW` too (`motion-lib/base.js`
`stand(body, x)`). Carried props: `x_hp<L|R|B>_<kind>` in a hand, `x_hpH_<kind>` worn on the head, `x_kg<side>` the load
in kg (it enters the centre of mass), `x_yaw<side>` turns an upright prop about the vertical, `x_pitch<side>` tips it; `shrugL` / `shrugR`
(W, negative = dropped) pulls one shoulder down under a load.

## Hand-directed cameras (`direct`)

`{ at: { f }, intent, why, cut: 'cut', cam: { pos, aim, lens, roll }, to, move: { from, dur, ease }, kick: [{ at, amp }] }`
(Blender metres; `kit/acting/director.js`). Always write `cut: 'cut'` (the default `move` glides 16 frames between shots).
`intent` is the shot kind the gates read (`est`, `wide`, `ws`, `ms`, `mcu`, `cu`, `low`, `insert`, `top`); `why` starts with
`P<n> · PURPOSE`. Camera-pass options: `OPT = { <shot>: { safe, emo, bold } }`, `KAI` picks, `?opt=<shot>:<name>` renders one
(PROCESS.md section 3). A move must not pass through geometry and stays ≤ 95 px/f at 720p; bigger = a cut. A shot's `dof: { gain, band }` sets its lens blur round the look target and always wins over the lens's own
blur; `dof: { gain: 0 }` turns it off (stick-man-depth.md).

## Overlays (`overlays`, `engine/overlays.js`)

| Kind | Fields | Use |
|---|---|---|
| `loupe` | `from, to, look: [x, y, z], cam: { pos, aim, lens }, at: [kx, ky], r` | a magnifier with its own camera and a leader line to `look`; aim it side-on (a top view of a glowing rail reads as a blank disc) |
| `text` | `from, to, text, at: [kx, ky] \| world: [x, y, z], dx, dy, size, tilt, shake, color, box, enter` | a sound word that pops on the impact frame; with `box` a label or a clock (below) |
| `arrows` | `from, to, world, axis, len, gap, inward` | expansion; `inward: true` when ends grow into a gap, and the gap must close in the same frames |
| `meter` | `from, to, at: [kx, ky], width, label, keys: [[f, value], ...], max, unit, color, size, enter` | a labelled bar on a dark panel (SUSPICION 35%); the value eases between keys and holds outside them |
| `path` | `from, to, world: [[x, y, z], ...] \| at: [[kx, ky], ...], dur, dash, width, color, arrow, labels: [a, b], labelSize, labelDy` | a dotted route that draws on over `dur` frames (default 60 % of the span) with an arrowhead; world points stay on the set as the camera moves; `labels` sit on its ends, the end one pops when the line arrives |
| `clock` | `from, to, keys: [[f, seconds], ...], at, size, label, labelSize, color, alarm, alarmColor, dropMin, tags: [[f0, f1, text]], slots: { n, keys: [[f, count]], icon: 'bag' \| 'dot', size }, slam, edge` | the countdown that never re-pops: big outlined digits that run between keys, red under `alarm` seconds with a punch and an edge flash on every second, a jump of `dropMin` s or more shakes it and slides a red chip (`-1:17`), a `tags` range shows its text instead of the label (a time skip, no chip), slots fill and pop (engine/hud.js) |
| `threat` | `from, to, steps: [{ f, who, word, level, color, whoColor }], at, icon: 'car' \| 'dot', you, hot` | danger that never leaves the screen: who (small), one word that slams in on the step's frame, a marker that eases along a track toward YOU; between steps it holds. Put each step on the word that causes it, and say a condition as one (`IF YOU HIDE`) |
| `vote` | `from, to, choices: [a, b], hits: [fa, fb], again: [fa, fb], or, at, size, colors, beat, tint, lines: [{ f, to, text, cta, row }]` | the closing question: two choices slam in on the words that name them, in two colours that say neither is right, that half of the frame takes its colour, a heartbeat from the first hit, the call to action in rows below. The default `at` [0.465, 0.47] keeps every row inside the text-safe box |
| `endcard` | `from, to, lines: [{ f, to, text, cta, size }], at, free` | the end card: stacked cards (a `cta` card in yellow) that pop in on their frames and sit inside the text-safe box (long lines shrink to its width, a stack placed past its edge moves back in, a stack taller than the box shrinks to its height down to 30 px cards; a stack still too tall at 30 px starts at the box top and runs past its bottom, so the text gate flags it; a line wider than the box at 30 px is centred on the box and kept on the frame); `free: true` keeps the film's own place |
| `edge` | `from, to, color, peak, band` | a coloured flash in the outer band of the frame that decays over its span (alarm, hit, siren); faces sit inside the band |

- `enter`: `'pop'` (the default for `text`: overshoot in over 5 frames, shrink out over the last 4), `'fade'` (the default
  for `meter` and `path`), `'none'` (full size from `from` to `to`). Use `'none'` for a label carried across cuts and for
  a clock: one entry per tick, each `enter: 'none'`, so nothing re-pops.
- `enter: 'slam'`: lands from 1.8x over 5 frames and shrinks out over the last 4 (a stamp such as LOST THEM; add `shake`).
- `box`: `true` (ink, 82 %) or `{ color, alpha, pad, r, outline, outlineWidth }` (`pad`, `r` and `outlineWidth` in px at 1080 wide). Boxed text is white unless
  `color` is set and has no ink outline. The box is measured with every digit as 0, so a ticking clock keeps one box.
  A red clock: `box: { color: '#c62828', alpha: 0.92 }, tilt: 0`.
- Sizes are px at 1080 wide: keep `size` ≥ 42 (14 px on a 360 px phone). A meter at the default `size` 46 and `width`
  0.6 reads at 360 px.
- `dash`: `'dot'` (default) or `'dash'`. A path's `labels` are boxed, tilt 0, `labelSize` 44, `labelDy` −0.03 (share of
  the height above the end point).
- A path through a point behind the camera is cut where it crosses the camera plane: only the part in front is drawn,
  the arrowhead shows only while the tip is on a visible stretch and inside the frame, and a hidden end has no label.
- Every kind but loupe, arrows and path also gives the rows (`--dbg`) the boxes a viewer reads (`text`: kind, overlay index, text, box in shares of the frame), with the caption's; `tools/gates/textgate.mjs` checks them at ◇5 (advisory): nothing under the app's buttons, over a face or stacked, no middle dot.
- Check one on the motion-lib proof page: `tools/render/shot.mjs --film styles/stick-man/motion-lib/proof --query
  "clip=Move_CarryBag_Walk_Loop&ov=<url-encoded JSON list>" --w 540 --h 960 --frames 0,30`.

## Music (`audio/music.json`, `tools/run/mix.py`)

The kit mixer `mix.py` reads `audio/music.json` (or `--music-plan <json>`): `arc` `[{ t: [a, b], state, lu }]` (the music
arc on the intensity curve), `sections` `[[name, a, z]]`, `peak` (the section that is the film's loudest moment), the
levels `mus_lu`, `amb_lu`, `duck_db`, and `track { file, segments: [{ src: [a, b], at, file?, gain? }], xfade }`.
`sound_fit.py <film> <track> --out <json>` writes the `track` segments from the arc, cut on the track's bar lines; the
full key list is the header of `styles/stick-man/tools/run/mix.py`.

`floor` (opt-in, dBFS, e.g. `-27`): where the whole mix would fall under it, the music and the ambience come up by the
difference (measured before the master level, so the final mix lands about there; a frozen music stem stays as given), at most `floor_max` dB (default 14), never inside a planned silence (`audio/sound-plan.json` `silences`) and
never in the last 0.6 s; `levels.txt` says how long and how far. No hole of near silence between two lines, the way
Hot Money ep01 H2 V2.1 was mixed. `tools/gates/floorgate.mjs` (◇5, advisory) measures the result: holes, the bed under
the voice, the closing seconds.

## Errors

| Message | Cause |
|---|---|
| `pageerror` / syntax | `node --check films/<slug>/reel.js`; read the URL with `globalThis.location?.search` (board.mjs imports reel.js in Node) |
| `unknown ease "…"` | a `set` beat ease not in the list above |
| `beat: no "<word>" #1 in l03` | `on` is not a spoken word of that line |
| `mix.py: … has no vo/vo.wav` (or `vo/words.json`) | the voice is not recorded and aligned yet: the mixer levels and ducks everything against the voice and its words |
