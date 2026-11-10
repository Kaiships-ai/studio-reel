# Sets, props, cast

Coordinates are Blender metres (x right, y into the scene, z up). A mark is where a figure's root stands; a place is a
prop spot or hand target. `at` / `to` take a mark or place name, a prop name, or `[x, y, z]`.

## Sets (`set:` in an act; files in `styles/stick-man/lib/sets/`)

| Set | Looks like | Marks | Places | Props (`who`) | COLLIDE |
|---|---|---|---|---|---|
| `bank-lobby` | teal-tiled bank hall, counter, vault | customer, teller, bench, door, street | plate, stack, b1, b2, note, note_end, bag_on_counter, bag_grip, sensor | plate, stack, b1, b2, note, bag, sensor | counter, raised-floor |
| `street` | pavement in front of a bank facade with columns, two shops | door, stroll_start, burst, crowd_1-3, officer, police_stop, hatchback | sensor, bag_burst, bag_rest, lamp, hydrant, mailbox, tree | sensor; opt-in with act `use`: police, bag | facade, columns, door leaves, mailbox, hydrant, planter |
| `cutaway` | marble counter top close up (tabletop scale) | stack, hand, lifter | stack, plate, thermo, hand_grip | plate, stack, pack, thermo | none (tabletop, no cast) |
| `park` | sunny park: grass, sandy path, hedge, round trees, bench, lamp, big sun up left | left, right, center, bench, walk_start, tree | sun, sky, bench_seat, lamp, ground | none | bench, tree-trunk, lamp |
| `lab` | lab / classroom: chalkboard, window, long lab bench with two flasks, shelf | left, right, center, board, door | bench_top, board, flask_l, flask_r, window | none | bench, back-wall, shelf |

Mark and place coordinates (`[x, y, z]` m, from each set's `MARKS` / `PLACES`; the source wins if they drift):

| Set | Marks | Places |
|---|---|---|
| `bank-lobby` | customer [0.92, 1.1, 0] · teller [2.34, 1, 0.33] · bench [-1.2, 4.2, 0] · door [-3.8, 1.27, 0] · street [-6.2, 1.27, 0] | plate [1.9, 0.7, 1.05] · stack [1.9, 0.7, 1.07] · b1 [1.84, 1.1, 1.05] · b2 [1.86, 1.3, 1.05] · note [1.22, 0.94, 1.05] · note_end [1.33, 0.9, 1.05] · bag_on_counter [1.53, 1.3, 1.08] · bag_grip [1.44, 1.25, 1.39] · sensor [-3.54, 2.1, 2.59] |
| `street` | door [0, -0.55, 0] · stroll_start [-5, -1.9, 0] · burst [1.2, -1.9, 0] · crowd_1 [-0.8, -2.7, 0] · crowd_2 [2.6, -1.35, 0] · crowd_3 [3.7, -3.3, 0] · officer [-1.4, -4.3, 0] · police_stop [-2.6, -5.4, 0] · hatchback [-9.6, -5.2, 0] | sensor [0.97, -0.07, 2.63] · bag_burst [1.2, -1.9, 1.55] · bag_rest [0.35, -0.9, 0.36] · lamp [-6.2, -3.55, 0] · hydrant [-4.4, -3.5, 0] · mailbox [-2.9, -3.45, 0] · tree [7.9, -2.9, 0] |
| `cutaway` | stack [0, 0, 0] · hand [0.06, -0.1, 0.26] · lifter [0.1, 0.45, 0] | stack [0, 0, 0.01] · plate [0, 0, 0] · thermo [0.22, 0.3, 0] · hand_grip [0, 0, 0.1] |
| `park` | left [-0.9, -0.2, 0] · right [0.9, -0.2, 0] · center [0, -0.2, 0] · bench [-3.3, 1.2, 0] · walk_start [-5.5, 0.2, 0] · tree [3.6, 2.2, 0] | sun [-3.2, 9, 7.2] · sky [0, 2, 3.6] · bench_seat [-3.3, 1.55, 0.46] · lamp [5.6, 1.4, 0] · ground [0, -0.2, 0] |
| `lab` | left [-0.8, -0.35, 0] · right [0.8, -0.35, 0] · center [0, -0.35, 0] · board [-1.9, 1.9, 0] · door [3.2, 0.2, 0] | bench_top [0, 0.85, 0.92] · board [0, 2.58, 1.9] · flask_l [-0.85, 0.85, 0.92] · flask_r [0.85, 0.85, 0.92] · window [-3, 2.6, 1.9] |

`cutaway` always builds plate, stack and thermo; the `pack` sits INSIDE the stack (its child): `move` the stack (the pack
rides along) or key the pack's parts (`{ kind: 'prop', prop: 'pack', keys: ['awake', 'alarm', 'dial', 'count'] }`). A `move`
on `pack` stops with "prop pack has no rest pose". Move unused props out of shot at `f: 0` (`to: [0.22, 6, 0], dur: 1`).
`cutaway` is the explainer table: tabletop scale, `zRange: [0.08, 1.2]`. People sets use `zRange: [1.1, 1.9]` (camera height);
`lab` inserts on the bench work with `zRange: [1.0, 1.9]`. Street's police car and bag exist only when an act lists them in `use`.

## Cast (`spec:` in `cast`)

| Spec | Who | File |
|---|---|---|
| `KAI` | the lead (smug robber in reel 1) | `engine/cast.js` |
| `TELLER`, `GUARD` | bank staff | `engine/cast.js` |
| `MABEL`, `OTIS`, `JUNE` | passers-by (sun hat, beanie, bun + glasses) | `lib/cast/extras.js` |
| `OFFICER` | police officer | `lib/cast/extras.js` |

Cast entry keys: `spec, at, yaw, expr, focus` (who they look at by default), `posture: 'sit'`, `watch: false` (does not
glance at the action), `head_tilt`. Kai turning red is the keyed value `{ who: 'kai', do: 'set', key: 'dye', to: 1 }`.
Also `WREN` (all white, sun hat), `BRAM` (all black, hair cap). A new character: export a spec from `lib/cast/extras.js`
(keys `name, shirt` required; `hair, clothes, glasses, skin` optional) and it registers itself under its export name (no
engine edit). A pure-black shirt renders dark grey under the toon shade: fine for "black".

## Rules every set and prop follows

| Rule | How | Checked by |
|---|---|---|
| A hand-held prop has a grip socket | `group.userData.grip = [x,y,z]` (prop-local) or `{ L: [...], R: [...] }`; the engine parents the prop so the grip sits on the hand dot | gate hand-prop gap ≤ 2 px |
| Every solid piece a body could walk into is a box | `export const COLLIDE = [{ name, lo: [x,y,z], hi: [x,y,z], grace? }]` | gate collisions = none |
| A prop that moves has a rest | `o.userData.rest = { pos, rot }` (set by `put()`) | `move`, `drive`, `hold` start from it |
| Props get the ink line | `stage.prop(o)` after `scene.add(o)` | eyes on the stills |
| Camera stays in the room | `CAMERA_ROOM = [[[x0, y0], [x1, y1]]]` | camera solver |
| One fixed shadow fit | `SUN_DIR`, `SUN_CENTER`, `SUN_HALF` | no shimmer as shots move |

## Add a new set in 15 minutes

A topic set (kitchen, desert, office) is a floor, a back wall, 2-3 dressing pieces, COLLIDE boxes and marks. Never reword a
script to dodge a missing set. `park.js` and `lab.js` were built from this file.

1. Copy the template below to `lib/sets/<name>.js` (`lib/sets/kit.js` gives `box, cyl, sphere, card, sky, mat`).
2. Register it in `SETS` at the top of `engine/play.js`: `'<name>': () => import('../lib/sets/<name>.js')`, add a row above.
3. Prove it: a two-line test film (synthetic `vo/words.json` like `films/stick-fxkit`), the cast on its marks,
   `shot.mjs --frames 0,60 --out` stills, and `--report --fast 1` shows collisions none.

```js
// <name>: one line on what it looks like. Blender metres: x right, y into the scene, z up; camera on the y < 0 side.
import { setKit } from './kit.js';
export const SUN_DIR = [0.35, 0.45, -0.82];                    // direction the light travels (front-left, high)
export const SUN_CENTER = [0, 0.5, 0.8], SUN_HALF = 6.0;         // one fixed shadow fit
export const MARKS = { left: [-0.9, -0.3, 0], right: [0.9, -0.3, 0], center: [0, -0.3, 0] };   // where figures stand
export const PLACES = { table_top: [0, 0.8, 0.9] };              // prop spots, fx anchors, hand targets
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-3.5, -8], [3.5, 0.2]]];           // x, y boxes the camera may stand in
export const COLLIDE = [{ name: 'table', lo: [-0.8, 0.5, 0], hi: [0.8, 1.1, 0.9] }];   // every solid piece a body could enter
export async function build(stage, { use = [] } = {}) {          // use: the act's opt-in props
  const k = setKit(stage);
  k.box([-6, -9, -0.2], [6, 3, 0], k.mat([0.80, 0.74, 0.62], 0.9), false);          // floor (no ink)
  k.box([-6, 2.6, 0], [6, 2.8, 3.6], k.mat([0.93, 0.88, 0.76], 0.9), false);        // back wall
  k.box([-0.8, 0.5, 0], [0.8, 1.1, 0.9], k.mat([0.55, 0.34, 0.16], 0.6));          // dressing 1: a table (inked)
  k.cyl([2.4, 2.2, 0.9], 0.25, 1.8, k.mat([0.2, 0.5, 0.25], 0.7));                  // dressing 2: a plant pot / column
  stage.addBounce([0, -0.6, 0.4], [1.0, 0.9, 0.75], 1.0, 5.0);                        // warm bounce light
  return { props: {} };                                          // named props an act can move: o.userData.rest = { pos, rot }
}
```

## Add a prop from Blender (.glb)
A whole set dressed from Blender kit pieces (export, toon, auto COLLIDE, timing): [GLB.md](GLB.md).

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

`street.js` and `kit.js` sets have no `put()`: set `position`, `scene.add`, `stage.prop` and `userData.rest` by hand, as street does for `bag`.

Prefer a prop built in code (see `lib/props/*.js`: pure functions, `userData.set(params)`) when it needs keyed parts.
Only our own designs: no brand, no third-party model without a licence note in `THIRD_PARTY_NOTICES.md`.
