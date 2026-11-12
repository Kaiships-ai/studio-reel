# Reel data (`films/<slug>/storyboard.json`, `reel.js`)

Plain data modules. `styles/stick-man/engine/play.js` reads `reel.js` and `vo/words.json`; every frame is a pure function of
its number. Worked example: `styles/stick-man/examples/pilot-a/`. `new_film.mjs` writes this skeleton.

## Storyboard (`storyboard.json`)

One entry per `vo/script.json` line; the board and the story gates read it.

```json
{ "film": "pilot-a", "lines": [
  { "id": "l01", "see": "The engineer kneels on his own blue railway and saws a small gap in the rail.",
    "set": "edge", "props": ["joint"], "act": { "eng": ["saw@gap"] }, "still": "gap" } ] }
```

| Key | Meaning |
|---|---|
| `see` | what a viewer with the sound off must see on this line |
| `still` | the word board still A is taken on: the frame that carries the line's meaning (it can be another shot than the spoken key word) |
| `act` | the lead's body action, `{ actor: ['pose@word'] }`, pose names from `engine/poses.js` and `allout/` |
| `props`, `fx` | set props and `make` effects that carry the line (each seen ≥ 3 frames in its window) |
| `set` | the set the line plays on |

## `reel.js`

| Key | Meaning |
|---|---|
| `title`, `fps: 30`, `frames: [0, last]` | `last` = the "last frame" line of `vo/voice-qa.md` |
| `CUTS` (export) | the animatic's cut frames, last entry = the end frame |
| `set`, `setModule`, `setOpts` | the place: `setModule: '/styles/stick-man/allout/sets/<name>.js'` (sets in `styles/stick-man/allout/README.md`) |
| `look`, `light`, `grade` | the approved look of the set (e.g. canyon-edge `EDGE_LOOK.look / .light / .grade`) |
| `style` | `'kaiships'`: Kai's dose of the 12 principles (`engine/motion.js` STYLE_PRESETS); physics stays the floor |
| `cast` | `{ name: { spec, at, yaw, expr, focus, lead, costume } }` |
| `anim` | the lead's acting: motion v2 keys (below) |
| `direct` | the cameras (below) |
| `directDrift` | share of camera-to-aim distance closed per second (0.07: held shots never freeze) |
| `make` | set props keyed by beats: `{ joint: { kind: 'ao_anim', prop: 'joint' } }` |
| `beats` | prop keys `{ f, who, do: 'set', key, to, dur, ease }` (ease: smoother, smooth, linear, step, out, in, back) and sounds `{ f, who, do: 'sound', name, strength }` (names: `styles/stick-man/tools/sound_bank.py`) |
| `overlays` | the drawn layer (below) |
| `lines`, `glasses`, `captions` | script line ids; `glasses: false`; `captions: { mode: 'word' }` |

## Motion v2 keys (`anim`): blocking and polish

```js
const STAND = { bob: 0, sq: 0, spine: { bend: 0, side: 0, twist: 0 }, neck: { nod: 0, tilt: 0, turn: 0 }, pelvis: { pitch: 0, roll: 0, yaw: 0 },
  armL: { raise: 12, swing: 0, elbow: 15, roll: 0 }, armR: { raise: 12, swing: 0, elbow: 15, roll: 0 },
  legL: { foot: [-0.22, 0.022, 0], pitch: 0, knee: [-0.15, 0, 1] }, legR: { foot: [0.22, 0.022, 0], pitch: 0, knee: [0.15, 0, 1] } };
const BREATH = { 'spine.bend': [1.5, 40], 'neck.tilt': [1.5, 53, 1] };              // a moving hold: no pose ever freezes
const hold = (f, extra) => ({ f, pose: STAND, cycle: BREATH, ...extra, ease: 'snap' });   // blocking: every key held
const BLOCKING = new URLSearchParams(globalThis.location?.search || '').get('blocking') === '1';   // ?blocking=1 = the approved blocking
function polish(keys) {                    // the poses stay; a key on a cut stays a snap; others hold, then move T frames before the next
  if (BLOCKING) return keys;
  return keys.map((k, i) => {
    const nx = keys[i + 1], cut = CUTS.includes(k.f), sameShot = nx && !CUTS.includes(nx.f);
    const T = nx?.t ?? (k.stroke ? 4 : 7), { stroke, antic, t, ...rest } = k;
    return { ...rest, ease: cut ? 'snap' : 'slow', ...(antic ? { antic } : {}), ...(sameShot && nx.f - k.f > T + 2 ? { hold: nx.f - k.f - T } : {}) };
  });
}
anim: { eng: polish([ hold(0, { ...KNEEL, pos: E0, yaw: -120, expr: 'sly', look: 'joint' }), hold(8, { stroke: 1, ... }), ... ]) }
// KNEEL, E0 and the other pose / position constants: styles/stick-man/examples/pilot-a/reel.js
```

| Key field | Meaning |
|---|---|
| `f` | frame (CUTS for the first key of a shot) |
| `pose` + overrides | joint channels: `pos [x, y]`, `yaw`, `bob`, `spine {bend, side, twist}`, `neck {nod, tilt, turn}`, `pelvis`, `armL/armR {raise, swing (+ forward), elbow, roll}`, `legL/legR`, props (`x_hpR_saw: 1`) |
| `ease` | `snap` (a cut: no in-between, follow-through, hat lag and face start fresh), `slow` (slow in/out), `flow`, `in`, `out` |
| `hold` | frames held before moving (polish writes it) |
| `antic` | 0.1-0.35: a wind-up against the move; it shortens the action itself, so give the move enough `t` |
| `t` | on the next key: move length in frames (default 7, strokes 4, big arm moves 14-22, a take 9) |
| `cycle` | `{ 'channel': [amplitude, period, phase] }` on top until the next key (breath, tremble) |
| `expr`, `look` | the face (EXPR names; takes = shock/scream/panic/pain/furious/angry land in 3 f, never blink) and the gaze target (an actor, a prop, `camera`) |

Conventions: yaw 0 faces the camera side (-y), yaw -90 faces -x; `swing` + is forward. Keep `elbow` ≥ 15 and hands a fist
away from head and belly (the IK flips otherwise). Off screen = a far `pos` on a key at a cut frame. `style: 'kaiships'`
bends the keys by Kai's dose; the body's physics (`engine/body.js`) is the floor.

## Hand-directed cameras (`direct`)

`{ at: { f }, intent, why, cut: 'cut', cam: { pos, aim, lens, roll }, to, move: { from, dur, ease }, kick: [{ at, amp }] }`
(Blender metres; `allout/director.js`). Always write `cut: 'cut'` (the default `move` glides 16 frames between shots).
`intent` is the shot kind the gates read (`est`, `wide`, `ws`, `ms`, `mcu`, `cu`, `low`, `insert`, `top`); `why` starts with
`P<n> · PURPOSE`. Camera-pass options: `OPT = { <shot>: { safe, emo, bold } }`, `KAI` picks, `?opt=<shot>:<name>` renders one
(PROCESS.md section 3). A move must not pass through geometry and stays ≤ 95 px/f at 720p; bigger = a cut.

## Overlays (`overlays`, `engine/overlays.js`)

| Kind | Fields | Use |
|---|---|---|
| `loupe` | `from, to, look: [x, y, z], cam: { pos, aim, lens }, at: [kx, ky], r` | a magnifier with its own camera and a leader line to `look`; aim it side-on (a top view of a glowing rail reads as a blank disc) |
| `text` | `from, to, text, at: [kx, ky] \| world: [x, y, z], size, tilt, shake` | a sound word that pops on the impact frame |
| `arrows` | `from, to, world, axis, len, gap, inward` | expansion; `inward: true` when ends grow into a gap, and the gap must close in the same frames |

## Music (`audio/music.json`, `tools/sound.py`)

Section starts in seconds or `[line, word]` (word without punctuation), in this order: `playful_end` < `build` < `build_end`
< `wait` < `see` < `urgent` < `so`. Pilot A: `{ "playful_end": 8.7, "build": ["l03", "Then"], "build_end": 11.3, "wait":
["l04", "On"], "see": ["l04", "his"], "urgent": ["l05", "The"], "so": ["l05", "snake"] }`. playful = teasing opening, build =
rising, wait = dead stop on the turn, see = back and curious, urgent = driving drums, so = resolve chord on the last word.

## Errors

| Message | Cause |
|---|---|
| `pageerror` / syntax | `node --check films/<slug>/reel.js`; read the URL with `globalThis.location?.search` (board.mjs imports reel.js in Node) |
| `unknown ease "…"` | a `set` beat ease not in the list above |
| `beat: no "<word>" #1 in l03` | `on` is not a spoken word of that line |
| `StopIteration` in sound.py | a music.json word with punctuation or out of order |
