# Stick-man motion library

Ready-made motion v2 clips for the stick-man rig: background characters, and the blocking start for a lead (the lead's
acting stays hand-keyed: REEL_DATA.md "Motion v2"). One skeleton (`engine/cast.js`) for every body; a body type is its
proportions plus its own way of moving. Catalogue: `styles/stick-man/docs/MOTION-LIB.md`. Checker:
`node styles/stick-man/tools/gates/motionlib.mjs`.

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
| `clip`, `body` | the clip (name without body prefix and version) and the body: adult, heavy, thin, child, teen, toddler, elder (default adult) |
| `to` | a travelling loop walks there: heading, cycle count and stride fitted, starts and ends on the standard pose |
| `times` | loop cycles (default 1; with `to`, fixes the count); `stop: true` adds the first and closing steps without `to` |
| `pos`, `yaw` | where the clip starts and which way it faces (default: where the keys before it left the actor) |
| `swap` | a film's own prop for the clip's: `{ bag: 'duffel' }`. It lies as the kit prop does (its longest side along the same axis: a phone's up) |
| `expr`, `look`, `ease`, `antic`, `cycle` | go onto the clip's first key |

A clip key expands into the clip's keys before playback (`engine/motion.js` `compileTrack`), so the 12-principles
playback, the `style` dose and the body's physics apply exactly as to hand keys. Keys after a clip that move the feet use
`footW` (metres, planted) like the clips: a carried `footW` channel overrides `foot`. `base.js` `stand(body, x, { yaw, y })` gives
the standard pose there, facing that way: its planted prints are in the world, so a heading put on top of `stand(body, x)` (`K(f, stand(b), { yaw: 0 })`)
leaves one foot ahead of the other under a body facing the lens. A figure nobody poses with `stand()` or a clip stands
upright on every body; `bodySpec(spec, body, { posture: true })` (opt-in) stands it its body's way (an elder's stoop, a toddler's
wide feet and held-out arms) where a pose names no channel. The elder's stoop is ahead, 11 cm at the head and 1.5 cm of
height: from the front only those 1.5 cm show, so a still that has to show it turns the elder.

## Rules (checked by `tools/gates/motionlib.mjs` and `test/unit/stick-motionlib.test.mjs`)

| Rule | Check |
|---|---|
| File name `<Body>_<Group>_<Action>_<Loop\|Once>_v01.js`; shared clips have no body prefix. Groups: Idle, Move, Act, Trans, React, Gest. Body clips live in `body/<body>/`, shared in `shared/interact/` (Act) and `shared/extra/` (any group); the naming check also takes `shared/transition/` (Trans) and `shared/react/` (React), not made yet | naming |
| A record: `name, clip, body?, group, loop, frames, base, end?, style: 'kaiships', needs: { props, hands, marks? }, keys` | record |
| A loop is seamless: its last key is its first, moved on by `advance` (travelling loops) | loop seam |
| A one-off starts on its `base` and ends on its `end` (default `base`); a travelling loop's first and closing steps too. Standard poses: STAND, SIT, CARRY, LIE, HUG (`base.js`), and the poses a clip's own capture holds all through (`captureBase`: KNEEL, FLOOR) | base |
| No joint turns more than 25 deg in a frame after the `kaiships` dose (a hand on an ik target: its travel over the arm's length) | joint gate |
| A foot on the floor never slides (< 1 mm a frame): feet leave and reach the floor straight up and down | feet |
| A body the floor carries (KNEEL, FLOOR: standard poses, no clip is on them now) has its ankles and toes no more than 3 cm above the floor. A limb sunk into the floor is not seen by it (a kneel's shins were, and passed) | floor |
| A body's clip is not the adult's in another costume: against the adult's clip of the same name it is slower or quicker, its arcs smaller or bigger, its stride (a child: its cadence) its own, and its act (the hands, the face, the upper trunk, the hips' sway taken out, against the adult's clip on that body's figure) is not the same motion retimed and resized (correlation 0.85 at most, `SHAPE_C`), by the amounts in `tools/gates/bodylife.mjs`. The check sees copies: a pass says the motion is not a copy, never that it acts like that body; that is a viewer's, in motion. The teen and the toddler have their lines too; the teen's made walk and run fail theirs, so the teen only stands. Older clips that fail it are listed, dated, in `motionlib.mjs` BODY_KNOWN (only shrinks) | body |
| A batch 1 clip never stops dead: in every 2 s some part moves 2 cm within half a second (`bodylife.mjs` STILL; the mark was raised to 2.8 and put back, both after measuring). A hold a viewer calls still passes it (2.48 cm did) | still |
| A clip a film cuts to for its feeling shows its face: the head's turn and its look down (`bodylife.mjs` FACE_SEEN). A rim, a fringe or a hand over the face is not seen by it | face |
| What no check here sees: a body in contact with the floor (sunk in it, floating a little), feet skating (a foot not keyed as planted, or the visible slide between keys), how a start or a stop reads, how a clip reads in a real set and camera. A gate pass is not a review | (a viewer, in motion) |
| A (clip, body) with no own clip has no clip: `getClip` throws, naming the bodies that have one. The adult's is never played instead | (index.js) |
| Clips are written in clip space: the actor at the origin facing +x (yaw 90), metres for `pos` and `footW`, the figure frame (W) for `ik` targets | (convention) |
| Each body's locomotion is authored with that body's numbers (`bodies.js`): stride, cadence, bounce, lift, sway, stoop; never an adult clip played on another body. Shared clips are authored on the adult and scale their metres with a smaller body | (review) |
| A hand on a target (ik weight >= 0.5, or holding a prop) stays on it (<= 2 cm off); a carried prop never passes through the body (<= 1 cm) and its mass (`x_kg<side>` kg) is in the centre of mass, so balance is keyed honestly: hips back under a load, the load handed to the floor or a sill while it rests there, let go over a few frames | rig (`motionlib.mjs` runs every clip through cast.js headless; `shot.mjs --report` (h)/(i) on renders) |
| A clip plays with the film props it lists (`propChecks: [{ phone: { mode, grip, size } }]`, `props.js` heldProp), and a film checks its own key before it renders: `motionlib.mjs --only <clip> --check '{ "swap": …, "pos": …, "yaw": …, "collide": […] }'` | rig, contract (`motionlib.mjs`) |
| Grips get explicit elbow poles (`pole`): a wanted elbow through the body makes the solver swing it round, and its side can change between frames | (review; the rig line prints the solved joints' largest change a frame) |

## Files

| File | What |
|---|---|
| `index.js` | the registry (every clip file imported), `getClip(name, body)`, `placeClip`, `expandClips` |
| `base.js` | STAND, BREATH, the standard poses (stand, sit, carry), the key helper `K`, the gait builder `gaitLoop` |
| `bodies.js` | the seven body types: proportions for the rig, mass, stance, posture, walk / run / breath numbers |
| `props.js` | the hand props the clips name (bag, torch, cash, cap) |
| `body/`, `shared/` | the clips |
| `proof/` | the proof page: one clip on one body, physics on or off (`tools/gates/motionlib.mjs --proof`, `--sheet`) |

Changes to existing films: `toPose(m, scale)` puts a scaled figure's planted feet (`footW`) where they are keyed; before,
they landed `scale` times further from the root (a `scale:1.12` cop: 1.6 cm wider each side, `films/motionlib-proof/cop_feet.png`).
A two-hand prop (`x_hpB_`) is now measured from the hands' midpoint to its grip socket in `shot.mjs` (d).

A capture on another body: `mocapClip` / `gaitLoop` options `stoop` (share of the elder's bent spine and lifted head put on
an upright actor's capture: without it the elder stands up straight for a nod) and `armOut` (the heavy body's arms held out
round the belly); `bobLow` (a captured walk's hips come down before the foot lands, not after), `seam` (an in-place loop
whose capture ends a few cm off its first prints). `bridgeKeys` (`base.js`) says what it is for.

`ownClip` (a one-off or a loop in place), `ownGait` (a walk) and `floorClip` (KNEEL, FLOOR) wrap them with the body's `life`
(`bodies.js`): its clock (`rate`, `hold`, `drag`, its fastest hand `top`), the size of its arms' and trunk's moves, its weight
shift and bounce (`ref/perform.js`); and its `perform`: its arms, trunk and head follow as springs do (drag, overshoot, settle:
`perform.js` `follow`, `armLag`), the elder hesitates as a move leaves a hold, a stiff or short neck takes the trunk with a nod,
the weight shifts along the body's own path, every act breathes, a child fidgets; the stoop and arms held out are kept on every
base. These layers retime, resize and loosen one capture; they do not make another performance of it (REVIEW-3, and the shape
check: after the clock and the size, 13 of the 14 body clips the gate last judged had an act correlated 0.94 or more with the adult's, or none
that moves, and Heavy SitFloor 0.88 with 1.3 cm). So no new clip gives thin, heavy or child their own acting: none is on them. A body that has to
act its own way needs its own capture or its own keys. A recipe (`acts/<clip>.js`) says only what the action needs: the span of the capture
(`cutSource`, `loopSource`), a clap that opens (`clapSource`). `closed` (on in `ownClip` loops)
keeps a loop's last frame, so it repeats without skipping one.

New clip: write it in clip space with `K` and the standard poses, add its import to `index.js`, run the checker, render
it with `--proof <dir> --only <clip>` and read its `(h)` and `(i)` lines physics on and off.
