# Props: the shared catalog

160 set props by one name, `<place>/<slug>`: 125 CC0 `.glb` models in `assets/props/<place>/` and 35 code-built ones
(`kit/props/built.js`, marked * below). A film never cares which kind a prop is. Code: `kit/props/catalog.js`.

## Use

```js
import { propKit } from '#kit/props/catalog.js';
export const COLLIDE = [];
// in build():
const p = propKit(stage, COLLIDE);
await p.load(['street/bench', 'hospital/iv-stand']);          // before build() returns
p.place('street/bench', [2, 1, 0], 180);                       // Blender metres, degrees about z; returns the group
p.place('hospital/iv-stand', [0, 0, 0], 0, { scale: 1, tint: [1, 0.9, 0.8], shadow: true, solid: true, ink: true });
```

| Option | Default | What |
|---|---|---|
| `scale` | 1 | Props are real size already (metres). |
| `tint` | none | `[r, g, b]` multiplies the colours. |
| `shadow` | true (false for wall pieces) | Contact shadow under the prop (the figures' foot blob, sized to its footprint). |
| `solid` | true | Pushes one box into `COLLIDE` (triangles in z 0.05-1.8 m, as `glbKit`). |
| `ink` | true | The kit's ink line. |

Every prop: pivot at the bottom centre on the floor, front to -y (vehicles point +x). `catalog()` lists
`{ name, place, size: [w, d, h], tris, source: 'glb' | 'code' }`. An unknown name throws and names the closest ones.
Contact sheets: `node styles/stick-man/tools/run/propsheet.mjs` (GPU machine) writes `films/kit-props-list/sheet/<place>.png`.

## Names

| Place | n | Props |
|---|---|---|
| `arena` | 6 | concert-stage, mic, screen-rig, speaker, spotlight, stage |
| `care-home` | 16 | armchair, coffee-cart, cup-tea, fancy-picture-frame, fire-door*, lamp-round-floor, lounge-chair, memory-box*, night-stand, rockingchair, rug-round, serving-hatch*, tea-set, vintage-crutches, walking-frame*, wall-clock |
| `hospital` | 20 | bassinet*, bed-rail*, bed-single, bed-twin, blind*, clipboard, double-door*, first-aid-kit, gurney*, industrial-storage-cart, iv-stand*, medical-box, monitor, monitor-stand*, privacy-curtain*, sanitiser*, sign-hospital, tool-cart, wet-floor-sign, wheelchair |
| `kitchen-home` | 23 | bottle-rack*, calendar*, chair, dishrack, high-chair*, kettle, kitchen-fridge, kitchen-microwave, kitchen-sink, kitchen-stove, pan, radio, sauce-pan, sofa, steriliser*, stock-pot, table, table-lamp, toaster, tv*, washing-machine, water-bottle, wicker-basket-2 |
| `lab` | 16 | bio-cabinet*, bunsen-burner, chemistry-set, eyewash*, gantry*, incubator*, industrial-microscope, jars, korean-fire-extinguisher, lab-bench*, measuring-cup, potion-bottle, propane-tank, stool, tank, vintage-microscope |
| `misc` | 17 | backpack, book, books, bottle, briefcase, cake-birthday, cardboard-box, cardboard-boxes, crate, hand-truck, phone, plastic-thermos, plate-square, present, safe, smartphone, suit-case |
| `office` | 17 | bookcase-open, coat-rack-standing, computer-keyboard, computer-screen, cubicle*, desk, desk-chair, desk-fan, glass-wall*, houseplant, laptop, metal-office-desk, mug, office-chair, printer, wall-corkboard, whiteboard* |
| `street` | 29 | ad-board, barrier-fixed, barrier-single, bench, bench-2, candles, car-hatchback, cart, child-shoe*, construction-barrier, crowd-pen*, dumpster, fire-hydrant, flowers, jar, market-stand, police-tower*, scaffolding*, screen-truck*, standing-picture-frame, street-lamp, street-light, street-light-2, sushi-truck, taxi, traffic-cone, traffic-light, trashcan-large, truss-post |
| `supermarket` | 16 | can-fridge, cash-register, checkout-belt*, cooler-box, counter-straight, crate-of-tomatoes, fruit-crate, glass-cabinet*, mirror, nappy-stack*, security-camera, shelf-tall, shop-trolley*, standing-chalkboard, steel-frame-shelves, wicker-basket |

## Licences

Every `.glb` is CC0 1.0 (Poly Haven, Poly Pizza). Source, author and licence per file: `assets/props/LICENSES.md`.

## Add a prop

1. Add the item to `films/kit-props-list/manifest.json` (`items`: id, place, name, size, source files in `films/kit-props-src/<id>/`).
2. Import it headless: `nice -n 10 Blender -b --factory-startup --python styles/stick-man/tools/run/import_props.py -- --ids <id>`.
   It merges, scales to real size, puts the pivot on the floor, clamps colours, decimates, and updates
   `manifest.json` + `LICENSES.md`. `SIZE`, `ROT`, `UPRIGHT`, `SLUG`, `PLACE` in the script fix a wrong size, turn, name or place.
3. Or build it in code: an entry in `BUILT` (`kit/props/built.js`) with its declared `size` and `make(k)`.
4. `node --test test/unit/stick-props-catalog.test.mjs` holds every prop to: a file that parses with the manifest's
   triangles and bounds, a real height (`PROP_HEIGHT` in `kit/props/sizes.js`), pivot on the floor, no colour over
   0.90 sRGB or under 0.07, `assets/props` <= 15 MB, one file <= 400 KB, a built prop <= 6000 triangles.
