# Props: the shared catalog

166 set props by one name, `<place>/<slug>`: 108 CC0 `.glb` models in `assets/props/<place>/` and 58 code-built ones
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
// the set's own material and group: the trolley sits in the set's light, not the kit toon's
p.place('supermarket/shop-trolley', [3, 0, 0], 90, { material: src => K.mat(src.color), parent: K.room });
```

| Option | Default | What |
|---|---|---|
| `scale` | 1 | Props are real size already (metres). |
| `tint` | none | `[r, g, b]` multiplies the colours. |
| `shadow` | true (false for wall pieces) | Contact shadow under the prop (the figures' foot blob, sized to its footprint). |
| `solid` | true | Pushes the prop's solid boxes into `COLLIDE` (below). `false` for a prop the film moves (and the rows under **solid: false** below). |
| `grace` | none | Metres a body may sink into it before the gate reports it (on every box of this prop; its thin tops then have no reach, below). |
| `ink` | true | The kit's ink line. |
| `material` | none (the kit toon) | `(src, mesh, name) => THREE.Material`: the film's own material, so the prop takes the set's light. `src` is the prop's source material: a `.glb`'s glTF material (`color`, `map`, emissive when its name has `_e_`), a built prop's shared `tm()`. Called once per function and source material (`mesh`, `name` are of the first placing that meets it); the result is shared by every mesh and placing, never changed. With `tint`, each mesh gets a copy of it (one per tint) with its `color` multiplied and the original's shader hook and `userData`; a material without `color` is not tinted. A result with `userData.glowy` glows. |
| `parent` | the scene | An `Object3D` to add the prop to (a set's group, so its `envScale` reaches the prop). It must sit at the origin, unturned and unscaled: `COLLIDE` is measured from the prop's own position. |

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

A `COLLIDE` entry is square to the axes, so a prop has boxes only at a **quarter turn**: 0, 90, 180 or 270 degrees, within
0.5 degrees, any sign or number of turns. Its solid parts are measured once per name and scale in its own frame (cached for the
page), then turned exactly by the quarter (sides swap and change sign), so every quarter gives the same boxes.

**Any other turn** (37, 45, 120 degrees): the prop is placed with no box and is **not collision-checked**. `propKit` lists it in
`COLLIDE.unchecked` (`[{ name, why }]`, kept through a rebuild or an emptied array), the rows carry it (`unchecked`), and the shot
gate gives it its own row kind, `not collision-checked`, in every shot of its act: the shot gate then reads PARTIAL, never PASS.
Nobody's body, arm or held prop is checked against it, and a prop let go falls through it. To have it checked, turn it to a quarter.
`solid: false` is not checked either: it is listed the same way, as watch only (the film chose it), and never blocks.

One mechanism for every prop but seats and beds: its solid parts are measured from its triangles (`kit/props/parts.js`). The gaps
that count as solid: what a thing 24 cm wide cannot get into (a railing's bars, a bin, under a stage's skirt), and a gap under
0.50 m tall (under a bed, between two shelves). A box whose corner stands more than 3 cm out of the prop's plan outline (its
convex hull: a round bin, a truck's nose) is cut again, up to 24 cuts.

| Prop | Boxes |
|---|---|
| any prop | one per part (`<prop>#1..`): a deck, each post, a table's top and each end of legs, the slices of a rounded side; up to 16, 24 for a stage (over 20 m2), plus the cuts to its outline; most closed props are a few. Each reaches its part's real top, so a prop let go over a bench rests on the bench |
| a closed prop (a vehicle, a fridge, a shelf, a dumpster) | a figure more than 5 cm outside its outline is not flagged, one inside it is (`stick-props-kit.test.mjs`, 17 props, scale 1 and 1.3, the 4 quarters) |
| a thin top legs go under (a table, a desk, a counter) | one sliver more inside it, with a negative `grace`: the body gate reads ankles, knees and the torso, none at a table's height, so the top counts up (or down) to the nearest of them, over its own floor only. No other gate sees the sliver |
| a seat or bed (`SEAT` in `sizes.js`), up to 8 | a block from the floor to the seat plus its back, arms or headboard: sitting or lying on it is no fault, standing through it or sitting into its back is; the block has `grace` 0.02. Held at the 4 quarters and scales 1, 1.15, 1.3, 1.5 for every seat |
| overhead (over 1.8 m: a truss, an awning, a scaffold's deck) | none, unless it is in reach of a figure on the prop's own deck |
| thin (under 6 cm: a rug, a plate, a keyboard) or wholly over the band | none (nothing to check: not listed) |
| a wall piece (clock, blind, whiteboard, frame, camera) | one where it hangs, so a figure can stand under it; none over 1.8 m |

A figure may: stand on a stage's deck, under the scaffold or the tower, beside a leg, sit with its legs under a table, desk or
bench. A figure through a truss, a post, a top, or standing inside a deck is a fault.

Limits (measured: a box corner the body gate reads against the prop's convex outline): a box is the bounds of what it holds,
so a concave side (the L sofa's inner corner, between a truck's wheels, under a counter's overhang) stays solid. Over 5 cm:
`arena/stage`'s rounded front 10.5 cm (scale 1), 13.5 (1.3), 15.4 (1.5); seat blocks (not cut to the outline) up to 6.8 / 9.1 /
10.6 cm (`care-home/rockingchair`'s rockers), `street/bench` 4.8 / 7.1 / 8.7, `office/office-chair` 4.7 / 6.2 / 7.3,
`kitchen-home/sofa` 5.2 at 1.3; `street/food-truck` 5.0 / 5.5 / 5.8 and `street/screen-truck` 5.0 / 5.6 (a tapered nose under a
wider awning), `supermarket/glass-cabinet` 5.4 at 1.3. A figure standing that close beside them is flagged.

**solid: false** (or a caller's `grace`) is still for: a prop the film moves; a seat, bed, gurney or wheelchair with a figure's
legs or a trolley under it (a seat is a block to the floor); sitting or standing on top of a table or desk, or lying on a
counter (`grace: 0.01`: the top loses its reach, its box stays); a door or shutter the film opens; a figure inside a vehicle,
a fridge, a bin or the food truck (closed props are solid inside); a prop let go into a tray, a basket or between two shelves.
A scaffold's deck at 2 m is no rest surface (the engine leaves out what is over 1.8 m).

Cost: about 0.04 ms per box per figure per frame in the gate loop (40 mixed props: 337 boxes, 14 ms; 68303386: 246, 12 ms).
The first placing of a prop measures it: about 0.3 s a prop (0.9 s for a desk), once per name and scale; the same props
again take 2 ms each. Nothing is cached in a file.

The second `street/bench` placed is `street/bench@2`, its boxes `street/bench@2#1..` (`street/bench-2` is another prop).

A code-built prop is in `COLLIDE` like a `.glb`; its own box meshes are marked hollow, so it is reported once.

## Names

| Place | n | Props |
|---|---|---|
| `arena` | 6 | concert-stage, mic, screen-rig, speaker, spotlight, stage |
| `care-home` | 16 | armchair, coffee-cart, cup-tea*, fancy-picture-frame*, fire-door*, lamp-round-floor, lounge-chair, memory-box*, night-stand, rockingchair, rug-round, serving-hatch*, tea-set, vintage-crutches, walking-frame*, wall-clock* |
| `hospital` | 20 | bassinet*, bed-rail*, bed-single, bed-twin, blind*, clipboard*, double-door*, first-aid-kit, gurney*, industrial-storage-cart, iv-stand*, medical-box, monitor, monitor-stand*, privacy-curtain*, sanitiser*, sign-hospital, tool-cart, wet-floor-sign, wheelchair |
| `kitchen-home` | 23 | bottle-rack*, calendar*, chair, dishrack*, high-chair*, kettle, kitchen-fridge, kitchen-microwave, kitchen-sink*, kitchen-stove, pan*, radio, sauce-pan, sofa, steriliser*, stock-pot*, table, table-lamp, toaster*, tv*, washing-machine, water-bottle, wicker-basket-2 |
| `lab` | 16 | bio-cabinet*, bunsen-burner*, chemistry-set, eyewash*, gantry*, incubator*, industrial-microscope, jars, korean-fire-extinguisher, lab-bench*, measuring-cup, potion-bottle, propane-tank, stool, tripod-stand, vintage-microscope |
| `misc` | 18 | backpack, book, books, bottle, briefcase, cake-birthday, cardboard-box*, cardboard-boxes, crate, hand-truck, phone, plastic-thermos, plate-square, present, safe, scuba-tanks, smartphone, suit-case |
| `office` | 17 | bookcase-open, coat-rack-standing, computer-keyboard*, computer-screen, cubicle*, desk, desk-chair, desk-fan, glass-wall*, houseplant, laptop, metal-office-desk, mug*, office-chair, printer, wall-corkboard, whiteboard* |
| `street` | 32 | ad-board, barrier-fixed, barrier-single, bench, bench-2, bouquet*, candle-jar*, candles, car-hatchback, cart, child-shoe*, construction-barrier*, crowd-pen*, dumpster, fire-hydrant, flowers, food-truck*, jar*, market-stand, police-tower*, scaffolding*, screen-truck*, standing-picture-frame, street-lamp, street-light, street-light-2, sushi-truck, taxi, traffic-cone, traffic-light, trashcan-large, truss-post |
| `supermarket` | 18 | can-fridge, cash-register, checkout-belt*, cooler-box*, counter-straight, crate-of-tomatoes, fruit-crate, glass-cabinet*, mirror, nappy-stack*, security-camera*, shelf-end-cap*, shelf-stocked*, shelf-tall, shop-trolley*, shopping-basket*, standing-chalkboard, steel-frame-shelves |

What a name does not say: `street/flowers` is a ground patch (1.6 m of scattered single flowers), the bunch for a memorial is
`street/bouquet`; `street/jar` is a kitchen jar with a lid, the candle is `street/candle-jar`; `street/sushi-truck` is a stylised small
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
   triangles and bounds, the real height of its kind (`PROP_HEIGHT`, one kind each, twice or half the size fails but for what comes in any size), its stance (`PROP_POSE`), its front (`FRONT`), pivot on the floor, no
   colour over 0.90 sRGB or under 0.07, near black only on really black things (`BLACK_OK`), not too dark as a whole and no black part over 25 % of it (`DARK`),
   no panel split along its diagonal in two colours, this page's names and counts, `assets/props` <= 15 MB, one file <= 400 KB,
   a built prop <= 6000 triangles. `stick-props-kit.test.mjs` holds `propKit` (load, place, tint, shadow, `COLLIDE`) through the gate code.
