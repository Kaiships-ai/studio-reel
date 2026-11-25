# Props: the shared catalog

166 set props by one name, `<place>/<slug>`: 110 CC0 `.glb` models in `assets/props/<place>/` and 56 code-built ones
(`kit/props/built.js`, marked * below). A film never cares which kind a prop is. Code: `kit/props/catalog.js`.

## Use

```js
import { propKit } from '#kit/props/catalog.js';
export const COLLIDE = [];                                     // the set module's own export: the gates read this array, no other
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
| `solid` | true | Pushes the prop's solid boxes into `COLLIDE` (below). `false` for a prop the film moves, and for a table whose knee space a sitter uses. |
| `grace` | none | Metres a body may sink into it before the gate reports it (on every box of this prop). |
| `ink` | true | The kit's ink line. |

Every prop: pivot at the bottom centre on the floor, front to -y (vehicles point +x). `catalog()` lists
`{ name, place, size: [w, d, h], tris, source: 'glb' | 'code' }`. An unknown name throws and names the closest ones.
The page needs the kit's import map (`#kit/`, `#engine/`, `three`, `three/addons/`), as every film page and
`tools/run/propsheet.html` have; without it the import above fails.
Contact sheets: `node styles/stick-man/tools/run/propsheet.mjs` (GPU machine) writes `films/kit-props-list/sheet/<place>.png`;
`--view front|back|side` turns every prop square to the camera (`<view>-<place>.png`).

## Solid boxes

The gates (body, arm and prop in the set; hands that stop on a solid) read the set module's exported `COLLIDE` and, of the
meshes, only box meshes: a `.glb` is solid through `COLLIDE` alone. So the array given to `propKit` must be that export.
`propKit` only adds to it: it never empties it and never drops an entry, and a set built again with the same placements adds
none twice. `glbKit` does empty the array it is given: create it before the first `place`. Code: `kit/props/collide.js`.

| Prop | Boxes |
|---|---|
| square to the axes (within 5 degrees) | one, from its triangles, z from its own foot to the top of what crosses `band` |
| turned | up to 6, `<prop>#1..`, cut from its footprint as placed (a point in two of them is two entries) |
| a seat or bed (`SEAT` in `sizes.js`), up to 8 | a block up to the seat plus its back, arms or headboard: sitting or lying on it is no fault, standing through it is; the block has `grace` 0.02. Turned off the axes its arms are left out, and the L sofa's boxes fill part of its inner corner |
| thin (under 6 cm: a rug, a plate, a keyboard) or wholly over the band | none |
| a wall piece (clock, blind, whiteboard, frame, camera) | one where it hangs, so a figure can stand under it; none over 1.8 m |
| a table, a desk, a counter | one to the floor, as `glbKit`: pass `solid: false` when a figure's knees go under it |

A code-built prop is in `COLLIDE` like a `.glb`; its own box meshes are marked hollow, so it is reported once.

## Names

| Place | n | Props |
|---|---|---|
| `arena` | 6 | concert-stage, mic, screen-rig, speaker, spotlight, stage |
| `care-home` | 16 | armchair, coffee-cart, cup-tea, fancy-picture-frame*, fire-door*, lamp-round-floor, lounge-chair, memory-box*, night-stand, rockingchair, rug-round, serving-hatch*, tea-set, vintage-crutches, walking-frame*, wall-clock* |
| `hospital` | 20 | bassinet*, bed-rail*, bed-single, bed-twin, blind*, clipboard*, double-door*, first-aid-kit, gurney*, industrial-storage-cart, iv-stand*, medical-box, monitor, monitor-stand*, privacy-curtain*, sanitiser*, sign-hospital, tool-cart, wet-floor-sign, wheelchair |
| `kitchen-home` | 23 | bottle-rack*, calendar*, chair, dishrack*, high-chair*, kettle, kitchen-fridge, kitchen-microwave, kitchen-sink*, kitchen-stove, pan*, radio, sauce-pan, sofa, steriliser*, stock-pot*, table, table-lamp, toaster*, tv*, washing-machine, water-bottle, wicker-basket-2 |
| `lab` | 16 | bio-cabinet*, bunsen-burner*, chemistry-set, eyewash*, gantry*, incubator*, industrial-microscope, jars, korean-fire-extinguisher, lab-bench*, measuring-cup, potion-bottle, propane-tank, stool, tripod-stand, vintage-microscope |
| `misc` | 18 | backpack, book, books, bottle, briefcase, cake-birthday, cardboard-box*, cardboard-boxes, crate, hand-truck, phone, plastic-thermos, plate-square, present, safe, scuba-tanks, smartphone, suit-case |
| `office` | 17 | bookcase-open, coat-rack-standing, computer-keyboard*, computer-screen, cubicle*, desk, desk-chair, desk-fan, glass-wall*, houseplant, laptop, metal-office-desk, mug*, office-chair, printer, wall-corkboard, whiteboard* |
| `street` | 32 | ad-board, barrier-fixed, barrier-single, bench, bench-2, bouquet*, candle-jar*, candles, car-hatchback, cart, child-shoe*, construction-barrier*, crowd-pen*, dumpster, fire-hydrant, flowers, food-truck*, jar, market-stand, police-tower*, scaffolding*, screen-truck*, standing-picture-frame, street-lamp, street-light, street-light-2, sushi-truck, taxi, traffic-cone, traffic-light, trashcan-large, truss-post |
| `supermarket` | 18 | can-fridge, cash-register, checkout-belt*, cooler-box*, counter-straight, crate-of-tomatoes, fruit-crate, glass-cabinet*, mirror, nappy-stack*, security-camera*, shelf-end-cap*, shelf-stocked*, shelf-tall, shop-trolley*, shopping-basket*, standing-chalkboard, steel-frame-shelves |

What a name does not say: `street/flowers` is a ground patch (1.6 m of scattered single flowers), the bunch for a memorial is
`street/bouquet`; `street/jar` is an opaque lidded pot, the candle is `street/candle-jar`; `street/sushi-truck` is a stylised small
truck (3.3 m long, Japanese text, a chef figure), a real-size truck without text of a place is `street/food-truck`.

## Licences

Every `.glb` is CC0 (Poly Haven, Poly Pizza). Source, author and licence per file, the licence as its page states it:
`assets/props/LICENSES.md`.

## Add a prop

0. Needs: Blender (run with 5.2; its own Python carries numpy, nothing to install), and the downloads, which are not in git. From a
   clean checkout fetch each model you re-import from its `source_url` in `assets/props/list.json` into `films/kit-props-src/<id>/`:
   Poly Pizza the GLB, Poly Haven the glTF at 1k with its `.bin` and `textures/`.
1. Add the item to `assets/props/list.json` (tracked: id, place, name, size_m, source, source_url, author, licence as the page
   states it, CC0 only: the importer refuses another) and put its files in `films/kit-props-src/<id>/` (`--list`, `--src` change both).
2. Import it headless: `nice -n 10 Blender -b --factory-startup --python styles/stick-man/tools/run/import_props.py -- --ids <id>`.
   It merges, scales to real size, puts the pivot on the floor, gives each flat panel one colour, clamps colours, decimates,
   and updates `manifest.json` + `LICENSES.md`. A wrong prop is fixed in its tables, never in the file: `SIZE`, `ROT` (its front),
   `ORIENT`, `CROP`, `BUDGET`, `COLOURS`, `RECOLOUR` / `LIFT` (too dark), `SLUG`, `PLACE`, `DROP`.
3. Or build it in code: an entry in `BUILT` (`kit/props/built.js`) with its declared `size` and `make(k)`.
4. Say which way it faces, a `.glb` or a built one: a row in `FRONT` (measured on the triangles) or `NO_FRONT` (the reason; `round`
   and `the same both ways` are measured too) in `kit/props/sizes.js`. Look at
   `propsheet.mjs --view front` and `--view back` first.
5. `node --test test/unit/stick-props-catalog.test.mjs` holds every prop to: a file that parses with the manifest's
   triangles and bounds, a real height for its class (`PROP_HEIGHT`, one class each), its stance (`PROP_POSE`), its front (`FRONT`), pivot on the floor, no
   colour over 0.90 sRGB or under 0.07, near black only on really black things (`BLACK_OK`), not too dark as a whole and no black part over 25 % of it (`DARK`),
   no panel split along its diagonal in two colours, this page's names and counts, `assets/props` <= 15 MB, one file <= 400 KB,
   a built prop <= 6000 triangles. `stick-props-kit.test.mjs` holds `propKit` (load, place, tint, shadow, `COLLIDE`) through the gate code.
