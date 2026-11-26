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
- Numbers: `node --test test/unit/stick-wardrobe.test.mjs` (about 3 min): every look on every body, every frame. Trims on the
  shell through a 60 and an 80 deg bend (4.5 mm); cloth through a stand, a walk, a whole sit and a floor reach against the limbs
  AS DRAWN (the curved lines and sleeves: 4 mm into an arm, 10 mm into a hand), worst single edge (25 % walking, 30 % seated)
  next to p99, a column's bend and the hem's corners, the cloth's own acceleration against the body; collars and scarves round
  the neck, whole ink lines, short sleeves out of the torso, a cap's peak, layers over layers, a coat over a skirt, unknown names
  throw, a held prop stays in its hand, lose_hat. Every clip a figure is seated in is played whole (nine today; `React_SitDisbelief_Once` is marked unsafe and must come out dirty). Run, jump and
  window leap print their faults as `todo`: cloth there is NOT clean yet (three pairs on the heavy and elder bodies are, and are
  real tests; a todo that comes out clean fails the list). The measuring code is `test/unit/wardrobe-measure.mjs`.
- A film that puts a coat, a skirt, a dress or an apron on a figure in a clip the cloth is not clean in (`kit/cast/clothsafe.js`:
  run, sprint, jump, window leap, lying down and getting up, sleeping, picking up from the floor, the trunk and the window drop,
  pushing, a seated figure throwing itself back) is reported at the shot lock gate by `tools/gates/clothgate.mjs` (advisory; `node --test test/unit/stick-clothgate.test.mjs`, 2 s).
  Every rigid piece touches what it lies on (3 mm, all its points: the shell or a piece on the shell). Cloth inside a drawn
  leg's radius (4 mm, as an arm) is measured and printed as `todo`: the cloth's points keep off a leg, its triangles do not
  (a bent knee's corner, a seated thigh's root, up to 12 mm).
- With kit faces v4 on the same spec (`faceAge`, `tidyFeet`, `head_yaw`, head marks): `node --test test/unit/stick-wardrobe-age.test.mjs`
  (3 s): the age face under a costume, the costume on the shell, a figure with no costume hashed against main 0704de3e. A police or
  pilot cap and a toque cover part of some head marks: every pair's share is printed, with no limit (an open design call).
- Which kit parts go together (`kit/compat.json`): `node --test test/unit/stick-fits.test.mjs test/unit/stick-fits-kinds.test.mjs test/unit/stick-unsafe-pairs.test.mjs`
  (about 40 s); a film: `node styles/stick-man/tools/gates/fits.mjs films/<slug>` (exit 1 names each blocked or untested pair).
- Group shots and motion: `films/kitbody-costumes/sheet2.html` (line-up at true scale, a crowd of twelve in `outfit(i)`, walk,
  run and sit clips of three outfits).

## Gotchas

- What hangs below the waist is laid round the legs first (`Guide` in drape.js) and simulated second. A free-hanging tube of
  particles pushed about by thin leg lines is what crumpled.
- The torso is drawn flat between its lathe rings (0.2 m from belly to chest): a piece bent with the plain `bendPt` sat 7 mm off
  it in a 60 deg sit. Plates are cut into 1.5 cm rows for the same reason.
- A clip knows nothing of a skirt: a free hand or forearm it brings into a raised lap is posed again on top of it by the arm's own
  ik (`wardrobe.js` `S.pose2`, `drape.js` `lapOut`); a hand that holds a prop or is on its own ik target is never moved.
- Below the waist the garment is each column hinged at its waist point and turned with the thighs, then drawn taut over the
  legs as drawn (`Guide.laid`, `taut`); a shin kicked back raises the hem over it (`cleared`).
- Over a seated knee the cloth falls toward the shin (test: hem 8 cm or more below the knee, within 25 deg of straight down
  from where it crosses the knee). That needs length: a knee-length skirt has ~9 cm past a seated knee, so dress and skirt
  are 0.54 of the leg, the apron 0.50, the coat 0.56. Past a knee a row goes no further forward than the shin (`laid`);
  the cloth clears every ring of the drawn leg (every second ring cut a bent knee's corner by 9 mm).
- A seat's top edges are rounded for the cloth (`outOfBox`) and the straight cloth between two points is kept off it (`offSolids`):
  a point on the sharp corner bent a column 80-89 deg, and one just inside the front was pushed back up on the seat. Under a skirt or a
  dress the torso is drawn in behind the cloth (`tuck`) and painted the skirt's colour: a seat squeezes the cloth above the torso's foot.
- `thinHull` takes the torso's own outline in under a garment; it must run before the figure's first bent pose.

## Sculpted toon hair (kit/cast/hair.js)

`hair: [toonHair('side' | 'crop' | 'curly' | 'elder' | 'woman' | 'girl', rgb?)]` (also from `kit/film.js`): one sculpted mass
with locks from a whorl, a hairline on the forehead, a parting and a painted groove / strand / light-band map; buns for
`woman` and `girl`. `hairCap`, `curls` and `bun` are unchanged. Look sheet:
`node styles/stick-man/tools/render/shot.mjs --page styles/stick-man/tools/run/hairsheet.html --frames 0-39 --w 720 --h 1280 --out <dir>/h_%d.png`
(rows: hairCap, bun, the six styles; columns: beat-0 front / low front, close front / 3/4 / low front, all in the coral
sweater); `?run=1` plays the six in a look-around. Numbers: `node --test test/unit/stick-toon-hair.test.mjs` (6 s): every
style builds, reaches the forehead, and stays rigid in the head's frame through a look up and a jump.

Ten more (26/11): men `pompadour`, `buzz`, `mullet`, `afro`; women `bob`, `long`, `pixie`, `ponytail`, `braids`, `lob`. New
parts of the same field: `crest` (a swept wave), `tight` (cut sides), `ball` (a mass wider than the head), `hang` (falls straight
to a hem), `grain` / `edgeDark` (a buzz cut's stubble and hairline), `grid` (box-braid parts); and locks that leave the head
(`falls`: rings of flat or braided locks; `tails`: one swept lock, the ponytail), rigid in the head's hair group like the rest.
`cut` is the length the hair-in-body check left: `node --test test/unit/stick-hair-body.test.mjs` (~3 min) plays every style
through ten clips (`CLIPS` in test/unit/hair-measure.mjs) in the coral sweater and fails a style whose drawn surface goes over
4 mm (frozen) into the torso or a limb; `node test/unit/hair-length.mjs <style>` finds the lowest cut that passes. Type sheet:
add `--query type=mw` to the sheet render (frames 0-89) and `hairsheet_compose.py <dir> <out.jpg> mw`.

Scalp coverage (26/11): one scalp line for every toon hair (`kit/cast/scalpline.js`: forehead 0.36 W, temples down to the ear's top 0.08, behind the ear to the nape -0.40). The scalp field's floor covers it whatever a style's hairline, hem or cut leaves, thin where only the floor puts hair; a style shows scalp inside it only where it declares it (`bare`: the elder's receded temples; a swept parting). A `hang` hem is the hairline above the fall too. Gate: `node styles/stick-man/tools/gates/scalpgate.mjs [style] [--png dir]` renders head + hair headless from front, 3/4, low front, back, profile and from under the chin and counts bare scalp pixels; `test/unit/stick-scalp-cover.test.mjs` holds every style (and the designed lengths) under 0.1 % per view, with a control that must fail.
