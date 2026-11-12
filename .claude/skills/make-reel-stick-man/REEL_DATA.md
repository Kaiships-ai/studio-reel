# Reel data (`films/<slug>/storyboard.json`, `reel.js`, `reel2.js`)

## Storyboard (`storyboard.json`, written after align, before reel data)

One entry per `vo/script.json` line; the reel data is built to it and the story gates check it (GATES.md).

```json
{ "film": "<slug>", "lines": [
  { "id": "l05", "see": "On the street a countdown clock ticks beside his bag, the bag glows red, then explodes.",
    "shot": "ms", "set": "street", "props": ["bag"], "fx": ["dial", "glow", "burst"], "still": "explodes" } ] }
```

| Key | Meaning |
|---|---|
| `see` | one sentence: what a viewer with the sound off must see on this line |
| `shot` | a shot kind (Shots below) or `auto` / left out: the planner picks one from `role` when the reel data shoots nothing in the line's window (the gate reads the real shot from `__dbg`) |
| `role` | optional: hook, setup, fact / number, compare, reaction, twist, panic, explain, payoff (else guessed: line 1 hook, last payoff, a number, `same` / `than`, `but` / `here's`) |
| `set` | the set the line plays on |
| `props`, `fx` | set prop names and `make` effect names on screen in this line (each must be seen ≥ 3 frames) |
| `still` (`on` also read) | the word board still A is taken on: the frame that carries the line's meaning, which can be another shot than the spoken key word (pilot A l05 "snake" is spoken over the fall; its still is `track`, on the bend) |
| `act` | `{ actor: ['pose@word', ...] }`: the lead's body action per line, names from poses.js / allout (arms_crossed, hands_on_hips, point, laugh, startle, saw, ...) |
| (B) | board still B is the line's fx peak: the frame where most of its `props` / `fx` are seen, so list what carries the line |

Every process the words describe is drawn (an overlay, a prop that moves, a cutaway) on its line. Full example:
`films/pilot-a/storyboard.json` (pilot A); older auto-mode example `examples/dye-pack/storyboard.json`.

Plain data modules, no code beyond small helpers. The runtime (`styles/stick-man/engine/play.js`) reads `reel.js`, then
`reel2.js` if present, and `vo/words.json`; every frame is a pure function of its number.

## `reel.js`: the first act

| Key | Type | Meaning |
|---|---|---|
| `title` | string | film title |
| `fps` | 30 | always 30 |
| `frames` | `[first, last]` | this file's frames; with one act, `last` = the last frame from `vo/voice-qa.md` |
| `set` | string | `bank-lobby`, `street`, `cutaway`, `park`, `lab` (SETS.md) |
| `use` | list | opt-in set props, e.g. street `['police', 'bag']` (none by default) |
| `lines` | ids | the `vo/script.json` lines this file covers, in order (captions come from them) |
| `cast` | `{ name: { spec, at, yaw, expr, focus, posture, watch, head_tilt } }` | who is in the act |
| `anim` | `{ actor: [key, ...] }` | **the lead's acting**, motion v2 keys (section below); an actor with keys is never driven by verbs or auto-acting |
| `direct` | list | **hand-directed cameras** from the camera pass (section below); with `direct` the shot planner is off |
| `beats` | list | prop keys (`set`), sounds (`do: 'sound'`), and verbs for background characters (VERBS.md) |
| `shots` | list | auto-mode camera on words (Shots, legacy); not used with `direct` |
| `directDrift` | number | share of camera-to-aim distance closed per second on every `direct` shot (pilot A 0.07: held shots never freeze) |
| `make` | `{ name: { kind, ... } }` | effects for this act (optional) |
| `name`, `show`, `zRange`, `sun` | optional | as in an act below (`name` defaults to `lobby`) |
| `glasses` | optional bool | every cast member's glasses on / off for the whole reel (a cast entry's own `glasses` wins); `false` = faces read by brows and eye shapes (stick06) |
| `style` | optional `'kaiships'` (Kai's chosen dose) \| `'real'` \| `'verse'` \| `{exaggeration, timing, squash, anticipation, followThrough, slowInOut, arcs, secondary}` (0 = simulation, 1 = stylised, 0.5 = as authored) | how far the motion v2 keys bend each of the 12 principles (engine/motion.js STYLE_PRESETS); the body's physics stays the floor; omitted = as authored |
| `overlays` | optional list: `{ kind: 'loupe', from, to, look, cam: { pos, aim, lens }, at: [kx, ky], r }`, `{ kind: 'text', from, to, text, at \| world, size, tilt, shake }`, `{ kind: 'arrows', from, to, world, axis, len, gap }` | the storyboard's drawn layer over the picture (engine/overlays.js): a magnifier with its own camera and a leader line, a pop-up sound word, arrows that spread (expansion); drawn after the 3D look, so ink and grade never touch it |
| `grade` | optional `{exp, lift, gam, sat}` | this act's colour grade over the set's `SET_GRADE` default (engine/look.js); per act too |
| `light` | optional `{lit, shade, lamp, bounce, background, sun, power, sky, ground, hemi, fill, fillPower, lamps: [{at, rgb, power, dist}]}` | this place's own light (engine/play.js): `lit` / `shade` tint the two ends of the toon ramp (night: `[0.4, 0.4, 0.56]` / `[0.3, 0.36, 0.78]`), `lamp` = gain of practical lights (point lamps, sparks with `light`), `bounce` scales the set's own bounce lights; omitted = the old daylight, unchanged |

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

## `reel2.js`: more acts

`export default { title, frames: [first, last], lines, acts: [act, ...], amend: [] }`. Each act is
`{ name, set, use, zRange, show, cast, make, beats, shots }`. `show: [{ from, dissolve }]` = the frames (or `{ line, on }`)
where this act comes on; `dissolve` frames (default 9; `0` = hard cut, which the hard-cuts gate fails). `grade: { exp, gam, lift, sat, haze, tint: [r, g, b] }` = this place's own light (a dark place: exp 0.55-0.75; the light-per-place gate wants a shot under YAVG 95). An act can come back (`show` with two entries).
`amend: [{ act, beats, shots }]` adds to an earlier act. Helper for word-timed entries:
`const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });` then `{ ...at('l05', 'ten'), who: ..., do: ... }`.

## Worked examples

Standard process: `styles/stick-man/examples/pilot-a/` (motion v2 keys, `direct` cameras, overlays, sound beats). The
short auto-mode example below (verbs, planner shots) is reel 1 `styles/stick-man/examples/dye-pack/reel.js`; use it for
background characters and quick tests only.

### Auto mode (legacy)

Two script lines ("He robs a bank, and the teller HELPS him pack the bag." / "She doesn't scream. ...") become:

```js
export default {
  title: 'Dye pack', fps: 30, frames: [0, 344], set: 'bank-lobby', lines: ['l01', 'l02'],
  cast: {
    kai: { spec: 'KAI', at: 'customer', yaw: 30, expr: 'smug', focus: 'teller' },
    teller: { spec: 'TELLER', at: 'teller', yaw: -35, expr: 'calm', focus: 'kai' },
  },
  beats: [
    { f: 0, who: 'kai', do: 'hold', prop: 'bag', hand: 'R', to: 'bag_grip', offW: [0.10, -0.03, -0.01], fade: 0 },
    { line: 'l01', on: 'robs', who: 'kai', do: 'slide', prop: 'note', hand: 'L', to: 'note_end', handOn: true },
    { line: 'l01', on: 'helps', offset: -8, who: 'teller', do: 'drop_in', prop: 'b1', hand: 'L', look: 'kai', carry: 19 },
    { line: 'l02', on: 'lifts', who: 'teller', expr: 'happy', do: 'lift', prop: 'stack', hand: 'L', up: 0.13 },
    { line: 'l02', on: 'drops', offset: -4, who: 'teller', do: 'drop_in', prop: 'stack', hand: 'L', strength: 0.8 },
  ],
  shots: [
    { f: 0, shot: 'two', of: ['kai', 'teller'], angle: -26 },
    { line: 'l02', on: 'she', shot: 'cu', of: ['teller'], angle: 8, head: 0.27, push: 0.0010, live: 0.35, kx: 0.52 },
  ],
};
```

## Craft rules

| Rule | Why |
|---|---|
| Frame 0 is mid-action (a prop already in hand) | the hook lands on frame 0 |
| Gestures only with an empty hand; `hold` a prop before a `walk_to` with `carry` | gesture throws on a busy hand |
| Read the error: `beat: no "<word>" #1 in l03` = `on` is not a spoken word of that line | |
| A syntax error in `reel.js`: `shot.mjs` runs `node --check` first; by hand `node --check films/<slug>/reel.js`. `reel.js` is also imported in Node by board.mjs: read the URL with `globalThis.location?.search` | the page only says `pageerror` |
| Any words go on a thing in the world (a sign, paper, a calendar) or a drawn overlay that the picture backs; never a floating sticker | floating labels gate = 0 |
| `set` ease names: smoother, smooth, linear, step, out, in, back | `unknown ease` page error |
| Estimated words (`est: true` in words.json) can carry beats but are ±3 f off; prefer the next real word | timing |

## Music (`audio/music.json`, read by `tools/sound.py`)

Section starts in seconds or `[line, word]` (the word without punctuation), in this order:
`playful_end` < `build` < `build_end` < `wait` < `see` < `urgent` < `so`. Pilot A:
`{ "playful_end": 8.7, "build": ["l03", "Then"], "build_end": 11.3, "wait": ["l04", "On"], "see": ["l04", "his"], "urgent": ["l05", "The"], "so": ["l05", "snake"] }`.
`playful` = bouncy opening (teasing); `build` = rising riser (the turn); `wait` = dead stop, silence on the twist word; `see` =
music back, light and curious; `urgent` = driving drums; `so` = two playful bars, then the resolve chord on the last word.
`air` (default 0.06) = the high wash level. `audio/levels.txt` prints the sections it used and every level against target.

## Shots (auto mode, legacy: `engine/camera.js`, planner `engine/shotplan.js`; a film with `direct` does not use them)

| Kind | What it is | Keys beyond the common ones |
|---|---|---|
| `est` | establishing: high wide (el 30, 20 mm) on the cast and `with` | `width` m across, `el`, `from` |
| `aerial` | drone: very high (el 50), slowly orbiting, never still | `width`, `orbit` deg/f (0.10) |
| `top` | top-down (el 84) on the cast, or on a prop | `width` (prop 1.1 m) |
| `macro` | prop insert: 55 mm, thin focus band on the prop / `label` | `width`, `at` offset, `label`; stamps and callouts take `dof: 0` (drawn on top) |
| `low` | hero angle from knee height (el -24, 18 mm) | `size`, `kx` |
| `ots` | over the shoulder of `fore` at the subject, 48 mm | `fore`, `foreX` (0.10), `kx` |
| `profile` | side-on tight two-shot, 44 mm | `size` |
| `dutch` | rolled close-up (18 deg) for panic | `roll`, `rollSide`, `head` |
| `punch` | cut-in close-up that snaps tighter over 14 f (the gag hit) | `head` |
| `two`, `ms`, `cu`, `insert`, `wide`, `follow` | the older eye-level kinds | VERBS.md Shots |

Every orbit shot takes `el`, `lens`, `angle`, `kx` / `ky`, `zMax` (an act's `zMax`: the ceiling or wall top, e.g. lab 3.3).
`est`, `aerial` and `top` are small-figure shots: hold them ≤ ~3 s (the small-figure gate is 120 f); the planner does.
A shot change rushes (camera.js: 16-30 f, peak ~90 px/f at 1080, cap 100) unless the shot asks `dissolve: n` (crossfade from the
shot before, inside the act) or `cut: true` (hidden by a flash only).

Planner (when a line has no reel shot in its window): first shot from the role (hook → est / aerial, number → est / macro /
top, compare → wide / top / profile / two, reaction → punch / low / dutch / cu, twist → low / punch / dutch, payoff → low /
punch / dutch, explain → est / low / wide / top / ots / profile), never one of the last two kinds (wide kinds may repeat
more); a line that changes scale family (wide ↔ near) opens with a 9 f dissolve; the hook rushes by frame 18; then a rush
whenever a framing has held over ~84 frames, each the opposite scale of the one before; a macro waits for its thing to pop; the shot on the key word shows the
line's things when it names 2 or more. The act's own `shots` always win.
