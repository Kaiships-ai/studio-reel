# Stick-man wardrobe: job uniforms, clothes, sleeves, cloth parts, palette

A stick-man cast entry (or its spec) wears `costume: ['job:doctor']` or layers one by one (`kit/README.md`, wardrobe row).
Garments are painted on the torso's own texture, inner first; trims are rigid pieces built on the torso's surface and bent
with it vertex by vertex (`kit/cast/wear.js`, `bendTorso`: the same bend as the drawn torso, ring by ring); long sleeves are
thin coloured tubes on the drawn arm lines; coat skirts, skirts, aprons and scarf ends are cloth (`kit/cast/drape.js`, stepped
from `S.face` with the frame number); hats are children of the head. A cast entry with no wardrobe item renders as before.

## How to get to it (user POV)

In a film's `reel.js`: `import '/styles/stick-man/kit/cast/wardrobe.js'`, then `cast: { doc: { spec: 'X', costume: ['job:doctor'] } }`.
A crowd: `costume: ['sweater:' + outfit(i)]` (`outfit` from wardrobe.js).

## Driving it

- The costume sheet: `styles/stick-man/wardrobe.html` draws the cells of `kit/cast/sheetcells.js`, one figure a frame on a plain
  backdrop (90 cells: each look front, 3/4 and up close, four looks on each other body, walkers, sitters):
  `node styles/stick-man/tools/render/shot.mjs --page styles/stick-man/wardrobe.html --frames 0-89 --w 540 --h 960 --out films/<name>/frames/c_%d.png`.
  A cell is the same alone or with the others. A head, hat or foot out of frame prints `[sheet]`.
- Numbers: `node --test test/unit/stick-wardrobe.test.mjs` (about 35 s): every look on every body. Trims on the shell and
  staying there through a 60 deg bend (4.5 mm); cloth through a stand, a walk, a whole sit and a floor reach: no limb, hand or
  seat through it, stretch p99 15 % walking and 22 % folding onto a seat, its area, no fold-over, a lap that hangs past the
  knee; a hand pushed outside a lap takes no step of its own; an apron's 150 deg, a coat's seam on every girth, sleeves,
  hard stripes, pieces that read at 720 wide.

## Gotchas

- What hangs below the waist is laid round the legs first (`Guide` in drape.js) and simulated second. A free-hanging tube of
  particles pushed about by thin leg lines is what crumpled.
- The torso is drawn flat between its lathe rings (0.2 m from belly to chest): a piece bent with the plain `bendPt` sat 7 mm off
  it in a 60 deg sit. Plates are cut into 1.5 cm rows for the same reason.
- A clip knows nothing of a skirt: a hand it brings inside one is posed again on the outside by the arm's own ik
  (`wardrobe.js` `S.pose2`); a hand on a knee presses the cloth onto the leg.
- `thinHull` takes the torso's own outline in under a garment; it must run before the figure's first bent pose.
