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

## Shot list (`storyboard.json` → `scenes`, `shots`)

Written in stage 1 ([1.0] scenes, [1.4a] shots), read by `tools/prepro.mjs` (checks), `tools/animatic.mjs` (the cut) and
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
| `text` | on-screen words: `{ text, at: [x, y], size, color, box, f0, dur }` (`at` = the block's centre, 0-1; `size` = share of the frame height, default 0.034) or `zone`; `animatic.mjs` draws them where they will be, `prepro.mjs` checks reading speed, width and the text-safe box. Panels carry no baked text |
| `montage` | a reason a run of same-size shots is the point (a rule-of-three, a list); waives the C3/C4 checks for that run |
| `hold`, `cam2d` | a reason for a long static hold; an explicit 2D move for the animatic (`{ z: [1, 1.2], x: [0.5, 0.55], y: [0.5, 0.5] }`) |
| `options`, `pick` | camera-intent options `{ safe: {...}, emo: {...}, bold: {...} }`, each the fields it changes plus its `panels`; `pick` is Kai's choice. `--opt SH040:emo` renders or checks another pick |

## Breakdown, acting and measures (on shots and the storyboard)

| Key | Meaning |
|---|---|
| shot `set`, `cast`, `props`, `state` | what the shot needs (`assets.mjs` builds the asset list from them); `state` = story states at this shot (`{ "in_car": 2, "trunk_holes": 3 }`), numeric states never go back without `reset: ["in_car"]` |
| shot `acting` | `{ think, do, change }` for every action / reaction shot, before blocking (`timing.mjs` A5) |
| storyboard `measures` | `[{ name, story: "34 steps", meters, tol, module: "set/motel.js", path: ["door9", [x, y], "trunk"] }]`: the set measured against the story (`assets.mjs` A4); `cheat: "why"` only when Kai approved it |

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

### Motion library clips (`clip`)

A background character, or a lead's blocking start, plays a library clip instead of hand keys: an anim key
`{ f, clip, body, to?, times?, stop?, pos?, yaw?, swap?, expr?, look? }` expands into the clip's keys before playback
(`styles/stick-man/motion-lib`, catalogue `styles/stick-man/docs/MOTION-LIB.md`).

```js
import '/styles/stick-man/motion-lib/props.js';                       // bag, torch, cash, cap
SPECS.GRAN = bodySpec(SPECS.MAGNATE, 'elder');                       // motion-lib/bodies.js: proportions + mass
anim: { gran: [{ f: 0, clip: 'Idle_Breath_Loop', body: 'elder', times: 2 }, { f: 160, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [3, 0] }],
        cop:  [{ f: 0, clip: 'Act_LiftHeavy_Once', swap: { bag: 'duffel' } }, { f: 88, clip: 'Move_CarryHeavy_Walk_Loop', to: [4, 0] }] }
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
