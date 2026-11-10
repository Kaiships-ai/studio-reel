# Sets, props, cast

Coordinates are Blender metres (x right, y into the scene, z up). A mark is where a figure's root stands; a place is a
prop spot or hand target. `at` / `to` take a mark or place name, a prop name, or `[x, y, z]`.

## Sets (`set:` in an act; files in `styles/stick-man/lib/sets/`)

| Set | Marks | Places | Props (`who`) | COLLIDE |
|---|---|---|---|---|
| `bank-lobby` | customer, teller, bench, door, street | plate, stack, b1, b2, note, note_end, bag_on_counter, bag_grip, sensor | plate, stack, b1, b2, note, bag, sensor | counter, raised-floor |
| `street` | door, stroll_start, burst, crowd_1-3, officer, police_stop, hatchback | sensor, bag_burst, bag_rest, lamp, hydrant, mailbox, tree | sensor, police, bag | facade, columns, door leaves, mailbox, hydrant, planter |
| `cutaway` | stack, hand, lifter | stack, plate, thermo, hand_grip | plate, stack, pack, thermo | none (tabletop, no cast) |

`cutaway` is the explainer table: tabletop scale, `zRange: [0.08, 1.2]`. People sets use `zRange: [1.1, 1.9]` (camera height).

## Cast (`spec:` in `cast`)

| Spec | Who | File |
|---|---|---|
| `KAI` | the lead (smug robber in reel 1) | `engine/cast.js` |
| `TELLER`, `GUARD` | bank staff | `engine/cast.js` |
| `MABEL`, `OTIS`, `JUNE` | passers-by (sun hat, beanie, bun + glasses) | `lib/cast/extras.js` |
| `OFFICER` | police officer | `lib/cast/extras.js` |

Cast entry keys: `spec, at, yaw, expr, focus` (who they look at by default), `posture: 'sit'`, `watch: false` (does not
glance at the action), `head_tilt`. Kai turning red is the keyed value `{ who: 'kai', do: 'set', key: 'dye', to: 1 }`.
A new character: add a spec object in `lib/cast/extras.js` (same keys as `MABEL`: name, shirt, hair, clothes, glasses) and
register it in `SPECS` in `engine/play.js`.

## Rules every set and prop follows

| Rule | How | Checked by |
|---|---|---|
| A hand-held prop has a grip socket | `group.userData.grip = [x,y,z]` (prop-local) or `{ L: [...], R: [...] }`; the engine parents the prop so the grip sits on the hand dot | gate hand-prop gap ≤ 2 px |
| Every solid piece a body could walk into is a box | `export const COLLIDE = [{ name, lo: [x,y,z], hi: [x,y,z], grace? }]` | gate collisions = none |
| A prop that moves has a rest | `o.userData.rest = { pos, rot }` (set by `put()`) | `move`, `drive`, `hold` start from it |
| Props get the ink line | `stage.prop(o)` after `scene.add(o)` | eyes on the stills |
| Camera stays in the room | `CAMERA_ROOM = [[[x0, y0], [x1, y1]]]` | camera solver |
| One fixed shadow fit | `SUN_DIR`, `SUN_CENTER`, `SUN_HALF` | no shimmer as shots move |

## Add a set

1. Copy `lib/sets/street.js` to `lib/sets/<name>.js`. Keep its exports: `SUN_DIR, SUN_CENTER, SUN_HALF, MARKS, PLACES,
   COLLIDE, CAMERA_SIDE, CAMERA_ROOM` and `build(stage)` returning `{ props }`.
2. Register it in `SETS` at the top of `engine/play.js`: `'<name>': () => import('../lib/sets/<name>.js')`.
3. Prove it: an act with only the cast standing on its marks, `shot.mjs --frames 0 --out` one still per mark, and
   `--report --fast 1` shows collisions none.

## Add a prop from Blender (.glb)

Blender is the asset workshop only (never per-frame renders). Model with Blender's origin at the grip (hand props) or the
bottom centre (others), real metres, flat toon colours, then export `styles/stick-man/lib/props/<name>.glb` (glTF binary,
+Y up, apply transforms). Load it in the set's `build()`:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const g = (await new GLTFLoader().loadAsync('/styles/stick-man/lib/props/<name>.glb')).scene;
g.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
g.userData.grip = [0, 0, 0];                 // hand props only
put('<name>', g, PLACES.<name>);              // bank-lobby / cutaway helper: adds, inks, sets userData.rest
```

`street.js` has no `put()`: there set `position`, `scene.add`, `stage.prop` and `userData.rest` by hand, as it does for `bag`.

Prefer a prop built in code (see `lib/props/*.js`: pure functions, `userData.set(params)`) when it needs keyed parts.
Only our own designs: no brand, no third-party model without a licence note in `THIRD_PARTY_NOTICES.md`.
