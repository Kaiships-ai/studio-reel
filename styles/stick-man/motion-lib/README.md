# Stick-man motion library

Ready-made motion v2 clips for the stick-man rig: background characters, and the blocking start for a lead (the lead's
acting stays hand-keyed: REEL_DATA.md "Motion v2"). One skeleton (`engine/cast.js`) for every body; a body type is its
proportions plus its own way of moving. Catalogue: `styles/stick-man/docs/MOTION-LIB.md`. Checker:
`node styles/stick-man/tools/motionlib.mjs`.

## Use

```js
import '/styles/stick-man/motion-lib/props.js';            // the clips' hand props: bag, torch, cash, cap
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';
SPECS.GRAN = bodySpec(SPECS.MAGNATE, 'elder');              // a cast spec in a body type (proportions, mass)
anim: { gran: [
  { f: 0, clip: 'Idle_Breath_Loop', body: 'elder', times: 2 },
  { f: 120, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [3, 0] },   // first step, cycles to cover 3 m, closing step
  { f: 260, clip: 'Act_Phone_Once', body: 'elder', expr: 'worried' } ] }
```

| Key field | Meaning |
|---|---|
| `clip`, `body` | the clip (name without body prefix and version) and the body: adult, heavy, thin, child, elder (default adult) |
| `to` | a travelling loop walks there: heading, cycle count and stride fitted, starts and ends on the standard pose |
| `times` | loop cycles (default 1; with `to`, fixes the count); `stop: true` adds the first and closing steps without `to` |
| `pos`, `yaw` | where the clip starts and which way it faces (default: where the keys before it left the actor) |
| `swap` | a film's own prop for the clip's: `{ bag: 'duffel' }` |
| `expr`, `look`, `ease`, `antic`, `cycle` | go onto the clip's first key |

A clip key expands into the clip's keys before playback (`engine/motion.js` `compileTrack`), so the 12-principles
playback, the `style` dose and the body's physics apply exactly as to hand keys. Keys after a clip that move the feet use
`footW` (metres, planted) like the clips: a carried `footW` channel overrides `foot`. `base.js` `stand(body, x)` gives
the standard pose there.

## Rules (checked by `tools/motionlib.mjs` and `test/unit/stick-motionlib.test.mjs`)

| Rule | Check |
|---|---|
| File name `<Body>_<Group>_<Action>_<Loop\|Once>_v01.js`; shared clips have no body prefix. Groups: Idle, Move, Act, Trans, React, Gest. Body clips live in `body/<body>/`, shared in `shared/{interact,transition,react,extra}/` | naming |
| A record: `name, clip, body?, group, loop, frames, base, end?, style: 'kaiships', needs: { props, hands, marks? }, keys` | record |
| A loop is seamless: its last key is its first, moved on by `advance` (travelling loops) | loop seam |
| A one-off starts on its `base` and ends on its `end` (default `base`); a travelling loop's first and closing steps too. Standard poses: STAND, SIT, CARRY (`base.js`) | base |
| No joint turns more than 25 deg in a frame after the `kaiships` dose (a hand on an ik target: its travel over the arm's length) | joint gate |
| A foot on the floor never slides (< 1 mm a frame): feet leave and reach the floor straight up and down | feet |
| Clips are written in clip space: the actor at the origin facing +x (yaw 90), metres for `pos` and `footW`, the figure frame (W) for `ik` targets | (convention) |
| Each body's locomotion is authored with that body's numbers (`bodies.js`): stride, cadence, bounce, lift, sway, stoop; never an adult clip played on another body. Shared clips are authored on the adult and scale their metres with a smaller body | (review) |
| A hand on a target (ik weight >= 0.5, or holding a prop) stays on it (<= 2 cm off); a carried prop never passes through the body (<= 1 cm) and its mass (`x_kg<side>` kg) is in the centre of mass, so balance is keyed honestly: hips back under a load, the load handed to the floor or a sill while it rests there, let go over a few frames | rig (`motionlib.mjs` runs every clip through cast.js headless; `shot.mjs --report` (h)/(i) on renders) |
| Grips get explicit elbow poles (`pole`): a wanted elbow through the body makes the solver swing it round, and its side can change between frames | (review; the rig line prints the solved joints' largest change a frame) |

## Files

| File | What |
|---|---|
| `index.js` | the registry (every clip file imported), `getClip(name, body)`, `placeClip`, `expandClips` |
| `base.js` | STAND, BREATH, the standard poses (stand, sit, carry), the key helper `K`, the gait builder `gaitLoop` |
| `bodies.js` | the five body types: proportions for the rig, mass, stance, posture, walk / run / breath numbers |
| `props.js` | the hand props the clips name (bag, torch, cash, cap) |
| `body/`, `shared/` | the clips |
| `proof/` | the proof page: one clip on one body, physics on or off (`tools/motionlib.mjs --proof`, `--sheet`) |

Changes to existing films: `toPose(m, scale)` puts a scaled figure's planted feet (`footW`) where they are keyed; before,
they landed `scale` times further from the root (a `scale:1.12` cop: 1.6 cm wider each side, `films/motionlib-proof/cop_feet.png`).
A two-hand prop (`x_hpB_`) is now measured from the hands' midpoint to its grip socket in `shot.mjs` (d).

New clip: write it in clip space with `K` and the standard poses, add its import to `index.js`, run the checker, render
it with `--proof <dir> --only <clip>` and read its `(h)` and `(i)` lines physics on and off.
