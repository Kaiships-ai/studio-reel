// Real sizes of the props films carry: the longest side in metres, [smallest, largest] of the real thing. shotfaults.mjs
// holds every tracked prop whose name says its kind (bill, cop:Lpistol, you:Rhotdog) against this table, and the kit's own
// hand props (motion-lib/props.js, kit/cast/handprops.js) are held to it by test/unit/stick-prop-sizes.test.mjs. Hot Money
// ep01 r5: the round in flight was 14 cm long and 6 cm thick next to a pistol slide of 23 cm ("viên đạn to hơn hẳn khẩu súng").
//   kind: [lo, hi, source]
export const REAL_SIZE = {
  bullet: [0.008, 0.06, '9 mm Luger cartridge 29.7 mm, projectile 15 mm; 5.56 NATO cartridge 57 mm (SAAMI / C.I.P.)'],
  pistol: [0.14, 0.28, 'Glock 26 165 mm, Glock 17 202 mm, Desert Eagle 270 mm (maker specs)'],
  bill: [0.15, 0.16, 'US banknote 156 x 66 mm, euro 120-160 mm (BEP, ECB)'],
  hotdog: [0.13, 0.24, 'frankfurter bun 15-20 cm'],
  phone: [0.12, 0.25, 'smartphone 14-16 cm, desk handset 20-23 cm'],
  torch: [0.10, 0.40, 'pocket torch 10 cm, police flashlight 30-38 cm'],
  cup: [0.07, 0.14, 'mug 9-12 cm tall'],
};
// a measured size passes inside [lo / SIZE_TOL, hi * SIZE_TOL]: the drawn model, its ink and a stylised shape
export const SIZE_TOL = 1.25;
// the kind a prop id names: its last word, without a number or a one-letter variant ('cop:Lpistol' -> pistol, 'bullet2',
// 'baitBill', 'bait_bill', 'billA'). A longer word is not its kind: 'cupboard', 'billboard', 'phonebooth', 'torchlight',
// 'hotdogStand' -> null, so a set piece named so is never held to a hand prop's size.
export function kindOf(id) {
  const words = String(id).replace(/^[^:]+:[LRBH]/, '').replace(/\d+$/, '').replace(/([a-z])(?=[A-Z])/g, '$1 ').split(/[^A-Za-z]+/).filter(Boolean);
  if (words.length > 1 && /^[A-Z]$/.test(words.at(-1))) words.pop();
  const last = (words.at(-1) || '').toLowerCase();
  return Object.hasOwn(REAL_SIZE, last) ? last : null;
}
export function scaleFault(id, size) {
  const k = kindOf(id); if (!k || !(size > 0)) return null;
  const [lo, hi, src] = REAL_SIZE[k];
  if (size > hi * SIZE_TOL) return { kind: k, over: size - hi * SIZE_TOL, want: [lo, hi], src };
  if (size < lo / SIZE_TOL) return { kind: k, over: lo / SIZE_TOL - size, want: [lo, hi], src };
  return null;
}

// Real heights of the kit's set props (kit/props/catalog.js: the CC0 .glb props and the code-built ones), metres, by kind:
// the range the real things of that kind stand in, as the prop stands (a phone upright, a chair to the top of its back).
// Every prop is in exactly one kind (the test fails on none or two), so a new prop brings its range with it. A kind is
// narrow: a prop twice or half its size falls out of it (review 2: 34 of 166 passed at 2x, 66 at 0.5x), but for what
// really comes in any size.
export const ANY_SIZE = 'comes in any size: a present, a basket, a box, a plant, a tea set on its tray';
export const PROP_HEIGHT = [
  ['a rug, a plate', /^(care-home\/rug-round|misc\/plate-square)$/, [0.012, 0.028]],
  ['a keyboard, a clipboard lying', /^(office\/computer-keyboard|hospital\/clipboard)$/, [0.02, 0.05]],
  ['a cup, a mug, a small shoe', /^(care-home\/cup-tea|office\/mug|street\/child-shoe)$/, [0.07, 0.13]],
  ['a pan (its side)', /^kitchen-home\/pan$/, [0.05, 0.1]],
  ['a sauce pan', /^kitchen-home\/sauce-pan$/, [0.09, 0.16]],
  ['a jar, a measuring jug, a candle', /^(lab\/(measuring-cup|jars)|street\/(candle-jar|candles|jar))$/, [0.09, 0.19]],
  ['a phone stood up', /^misc\/(phone|smartphone)$/, [0.13, 0.18]],
  ['a book stood up, a pile of books', /^misc\/(book|books)$/, [0.15, 0.3]],
  ['a kettle, a toaster, a stock pot', /^kitchen-home\/(kettle|toaster|stock-pot|steriliser)$/, [0.17, 0.35]],
  ['a bottle', /^(kitchen-home\/water-bottle|misc\/(bottle|plastic-thermos)|lab\/potion-bottle)$/, [0.17, 0.34]],
  ['a lab stand, a burner', /^lab\/(tripod-stand|bunsen-burner)$/, [0.14, 0.27]],
  ['a microscope', /^lab\/(industrial-microscope|vintage-microscope)$/, [0.3, 0.55]],
  ['a laptop open', /^office\/laptop$/, [0.18, 0.3]],
  ['a screen on a desk, a patient monitor', /^(office\/computer-screen|hospital\/monitor)$/, [0.22, 0.45]],
  ['a microwave, a radio, a printer', /^(kitchen-home\/(kitchen-microwave|radio)|office\/printer)$/, [0.2, 0.4]],
  ['a dish rack, a bottle rack', /^kitchen-home\/(dishrack|bottle-rack)$/, [0.2, 0.4]],
  ['a first aid case', /^hospital\/first-aid-kit$/, [0.15, 0.3]],
  ['a drug box, flat', /^hospital\/medical-box$/, [0.07, 0.16]],
  ['a wall dispenser, an eyewash bowl, a camera', /^(hospital\/sanitiser|lab\/eyewash|supermarket\/security-camera)$/, [0.2, 0.4]],
  ['a wall clock', /^care-home\/wall-clock$/, [0.25, 0.4]],
  ['a small picture frame', /^street\/standing-picture-frame$/, [0.18, 0.35]],
  ['a wall picture, a calendar, a memory box', /^(care-home\/(fancy-picture-frame|memory-box)|kitchen-home\/calendar)$/, [0.3, 0.6]],
  ['a wall board, a wall mirror', /^(office\/wall-corkboard|supermarket\/mirror)$/, [0.4, 0.8]],
  ['a briefcase, a backpack', /^misc\/(briefcase|backpack)$/, [0.28, 0.5]],
  ['a suitcase, a cooler box, a shopping basket', /^(misc\/suit-case|supermarket\/(cooler-box|shopping-basket))$/, [0.32, 0.6]],
  ['a cake, a bunch of flowers', /^(misc\/cake-birthday|street\/bouquet)$/, [0.14, 0.38]],
  ['a fruit crate', /^supermarket\/(fruit-crate|crate-of-tomatoes)$/, [0.18, 0.35]],
  ['a desk fan, a table lamp', /^(office\/desk-fan|kitchen-home\/table-lamp)$/, [0.3, 0.6]],
  ['a traffic cone', /^street\/traffic-cone$/, [0.4, 0.75]],
  ['a gas bottle, air tanks', /^(lab\/propane-tank|misc\/scuba-tanks)$/, [0.4, 0.8]],
  [ANY_SIZE, /^(care-home\/tea-set|kitchen-home\/wicker-basket-2|lab\/chemistry-set|misc\/(present|cardboard-box|cardboard-boxes|crate)|office\/houseplant|street\/flowers)$/, [0.1, 0.65]],
  ['a rail on a bed, a lab bar', /^(hospital\/bed-rail|lab\/gantry)$/, [0.25, 0.5]],
  ['a night stand', /^care-home\/night-stand$/, [0.4, 0.7]],
  ['a safe, a till, a stage lamp', /^(misc\/safe|supermarket\/cash-register|arena\/spotlight)$/, [0.4, 0.8]],
  ['a floor sign, a fire extinguisher, a tv', /^(hospital\/wet-floor-sign|lab\/korean-fire-extinguisher|kitchen-home\/tv)$/, [0.5, 0.9]],
  ['a speaker, a hydrant, a wall sign', /^(arena\/speaker|street\/fire-hydrant|hospital\/sign-hospital)$/, [0.6, 1.1]],
  ['a chair, a sofa (to the top of its back)', /^(care-home\/(armchair|lounge-chair|rockingchair)|hospital\/wheelchair|kitchen-home\/(chair|sofa|high-chair)|office\/(desk-chair|office-chair))$/, [0.7, 1.15]],
  ['a bench without a back (its seat)', /^street\/(bench|bench-2)$/, [0.38, 0.5]],
  ['a lab stool', /^lab\/stool$/, [0.5, 0.75]],
  ['a table, a desk', /^(kitchen-home\/table|office\/(desk|metal-office-desk))$/, [0.7, 0.8]],
  ['a bed, a trolley bed (to its headboard)', /^hospital\/(bed-single|bed-twin|gurney|bassinet)$/, [0.6, 1.05]],
  ['a kitchen unit, a counter, a walker', /^(kitchen-home\/(kitchen-sink|kitchen-stove|washing-machine)|supermarket\/(counter-straight|checkout-belt|shop-trolley)|care-home\/(serving-hatch|walking-frame))$/, [0.8, 1.2]],
  ['a street barrier, a bin, a board', /^street\/(ad-board|barrier-fixed|barrier-single|construction-barrier|crowd-pen|dumpster|trashcan-large)$/, [0.75, 1.3]],
  ['a drawer trolley', /^hospital\/tool-cart$/, [0.8, 1.15]],
  ['a cart with a top, a hand truck', /^(hospital\/industrial-storage-cart|misc\/hand-truck|street\/cart|care-home\/coffee-cart)$/, [1.1, 1.8]],
  ['a whiteboard, a low partition', /^office\/(whiteboard|cubicle)$/, [0.9, 1.5]],
  ['a window blind, a nappy pyramid, a bench with its rack, a chalkboard', /^(hospital\/blind|supermarket\/(nappy-stack|standing-chalkboard)|lab\/lab-bench)$/, [1.2, 1.7]],
  ['a floor lamp, a stand, crutches, a mic on its stand', /^(care-home\/(lamp-round-floor|vintage-crutches)|hospital\/monitor-stand|arena\/mic)$/, [1.2, 1.8]],
  ['a coat stand, a drip stand, a bed curtain', /^(office\/coat-rack-standing|hospital\/(iv-stand|privacy-curtain))$/, [1.6, 2.2]],
  ['a fridge, a cabinet, a shelf', /^(kitchen-home\/kitchen-fridge|lab\/(incubator|bio-cabinet)|office\/bookcase-open|supermarket\/(can-fridge|glass-cabinet|shelf-end-cap|shelf-stocked|shelf-tall|steel-frame-shelves)|street\/market-stand)$/, [1.7, 2.4]],
  ['a door, a glass wall', /^(care-home\/fire-door|hospital\/double-door|office\/glass-wall)$/, [1.95, 2.5]],
  ['a car', /^street\/(car-hatchback|taxi)$/, [1.4, 1.75]],
  ['a truck', /^street\/(food-truck|sushi-truck)$/, [2.6, 3.2]],
  ['a screen truck, a scaffold, a watch tower', /^street\/(screen-truck|scaffolding|police-tower)$/, [3, 4.2]],
  ['a lamp post, a mast', /^(arena\/screen-rig|street\/(street-light|street-light-2|street-lamp|traffic-light|truss-post))$/, [2.8, 4.8]],
  ['a stage under its truss', /^arena\/(concert-stage|stage)$/, [3.2, 5]],
];
export const heightClasses = name => PROP_HEIGHT.filter(([, re]) => re.test(name));
export const heightRange = name => heightClasses(name)[0]?.[2] ?? null;

// What a figure sits or lies on: its solid boxes are a seat block and what stands over it (collide.js). over: how far above
// the seat's top a part is an arm, a back or a headboard rather than a cushion or a raised mattress end, metres;
// under: how far below it a part is a foot plate, a base or a rocker, where the sitter's feet go
export const SEAT = {
  sit: /^(care-home\/(armchair|lounge-chair|rockingchair)|hospital\/wheelchair|kitchen-home\/(chair|sofa|high-chair)|lab\/stool|office\/(desk-chair|office-chair)|street\/(bench|bench-2))$/,
  lie: /^hospital\/(bed-single|bed-twin|gurney)$/,
  over: { sit: 0.10, lie: 0.30 },
  under: 0.12,
};

// How a prop stands, from the real thing, held by test/unit/stick-props-catalog.test.mjs on the bounds (Blender axes, front
// to -y). The contact sheets showed a mic stand at 20 cm, a screen rig lying on its side, a phone with its screen to +x and
// a measuring jug tipped over, each with z still its tallest side, so a 'z is tallest' rule alone misses them:
//   upright: z at least 1.5x the wider of w and d (a stand, a pole rig, a bottle)
//   front:   a flat face to the front: d (y) the thinnest side (a phone, a screen, a frame on a wall)
//   handle:  a jug or mug with its handle out to the side: z is not the longest side (tipped, it stood on its rim)
//   flat:    lies flat: h the thinnest side (a pan, a plate, a clipboard, the flowers patch)
export const PROP_POSE = {
  upright: /^(arena\/(mic|screen-rig)|misc\/(smartphone|phone|bottle)|kitchen-home\/water-bottle|hospital\/iv-stand|street\/(street-light|street-lamp|traffic-light|truss-post))$/,
  front: /^(misc\/(smartphone|phone)|kitchen-home\/tv|office\/(computer-screen|wall-corkboard|whiteboard)|hospital\/monitor|care-home\/fancy-picture-frame|supermarket\/mirror|kitchen-home\/calendar)$/,
  handle: /^(lab\/measuring-cup|office\/mug|care-home\/cup-tea)$/,
  flat: /^(kitchen-home\/pan|misc\/plate-square|hospital\/clipboard|care-home\/rug-round|office\/computer-keyboard|street\/flowers)$/,
};
export function poseFault(name, [w, d, h]) {
  const P = PROP_POSE;
  if (P.upright.test(name) && !(h >= 1.5 * Math.max(w, d))) return `upright: h ${h.toFixed(2)} < 1.5 x max(w ${w.toFixed(2)}, d ${d.toFixed(2)})`;
  if (P.front.test(name) && !(d <= Math.min(w, h))) return `front: d ${d.toFixed(2)} is not the thinnest side (w ${w.toFixed(2)}, h ${h.toFixed(2)})`;
  if (P.handle.test(name) && !(h < Math.max(w, d))) return `handle: h ${h.toFixed(2)} is the longest side (tipped over?)`;
  if (P.flat.test(name) && !(h <= Math.min(w, d))) return `flat: h ${h.toFixed(2)} is not the thinnest side`;
  return null;
}

// A base colour near black (max channel <= 0.105 sRGB: the importer lifts black to 0.08, so this is a colour it lifted) is
// allowed only where the real thing is black, by name with its reason. The street flowers' cut-out leaves sampled the
// alpha atlas's see-through black and came out as black blobs.
export const NEAR_BLACK = 0.105;
export const BLACK_OK = {
  'lab/korean-fire-extinguisher': 'rubber hose and nozzle',
};

// Too dark: the prop's whole colour, its area-weighted mean linear luminance as sRGB 0..1. No single colour of the
// armchair (0.139) and the sofa (0.162) was near black, yet both came out of the kit's contrast as black lumps. And a large
// black part: under `black` (sRGB luminance) the kit draws plain black, no form and no ink in it; a mean hides it (an
// arena stage: 54 % black deck, mean 0.40 from its white truss). Exempt only by name, with the real reason.
export const DARK = { min: 0.24, black: 0.27, max: 0.29, area: 0.25, ok: {} };

// Which way a prop faces, every one of them: FRONT (a measured side) or NO_FRONT (the reason it has none). Front is
// -y; vehicles and the hand cart point +x. A model downloaded the other way round shows its back to every camera (five
// props of one maker did on 25/11). The test measures each row on the triangles:
//   back:   the top 30 % of the prop sits in its rear half (a seat back, a headboard, a laptop lid): mean y > 0.55 of the depth
//   mark:   the colour nearest [r, g, b] faces the front: its -y area > 0.8 of its -y and +y area (a screen, a door handle, a label)
//   card:   its painted card or picture faces the front and none the back (a sign, a screen, a calendar)
//   fore:   the colour nearest [r, g, b] sits in front: its mean y < 0.45 of the depth (a tray, a latch, a ladder)
//   rear:   that colour sits behind: mean y > 0.55 (a back panel behind the open front, a push handle)
//   handle: the body sits in front of a long handle that points back: mean y of the whole < 0.45
//   detail: at least 1.25 x more triangles in the front quarter than in the rear one (drawers, doors, a keyboard)
//   x:      the cabin (top 30 %) sits behind the middle, the bonnet or the handles to +x: mean x < 0.47 of the length
//   side:   the colour nearest [r, g, b] sits to one side: mean x '<' 0.45 or '>' 0.55 of the width (a lamp on its arm, an iv bag, the order of a row of jars)
//   mass:   the part between two heights (shares of the height) sits in front or behind: mean y '<' 0.45 or '>' 0.55
export const FRONT = {
  'arena/concert-stage': ['back'], 'arena/stage': ['back'], 'arena/screen-rig': ['mark', [229, 229, 229]], 'arena/speaker': ['mark', [229, 229, 229]], 'arena/spotlight': ['mark', [229, 229, 229]],
  'care-home/armchair': ['back'], 'care-home/lounge-chair': ['back'], 'care-home/rockingchair': ['back'], 'care-home/coffee-cart': ['detail'], 'care-home/night-stand': ['detail'],
  'care-home/cup-tea': ['fore', [209, 212, 215]],
  'hospital/bed-single': ['back'], 'hospital/bed-twin': ['back'], 'hospital/wheelchair': ['back'], 'hospital/first-aid-kit': ['mark', [24, 116, 68]],
  'hospital/industrial-storage-cart': ['detail'], 'hospital/medical-box': ['detail'], 'hospital/sign-hospital': ['mark', [85, 189, 155]], 'hospital/monitor': ['mass', [0, 1], '>'], 'hospital/tool-cart': ['fore', [79, 118, 88]],
  'kitchen-home/chair': ['back'], 'kitchen-home/sofa': ['back'], 'kitchen-home/kitchen-fridge': ['mark', [191, 211, 215]], 'kitchen-home/kitchen-microwave': ['mark', [179, 212, 197]],
  'kitchen-home/kitchen-stove': ['mark', [75, 97, 97]], 'kitchen-home/radio': ['mark', [172, 75, 72]], 'kitchen-home/washing-machine': ['mark', [47, 47, 47]],
  'lab/industrial-microscope': ['detail'], 'lab/vintage-microscope': ['detail'], 'lab/korean-fire-extinguisher': ['mark', [206, 196, 180]],
  'misc/backpack': ['detail'], 'misc/books': ['mark', [39, 211, 149]], 'misc/bottle': ['mark', [178, 132, 97]], 'misc/briefcase': ['detail'], 'misc/hand-truck': ['back'],
  'misc/phone': ['mark', [56, 72, 102]], 'misc/smartphone': ['mark', [52, 66, 98]], 'misc/safe': ['mark', [41, 41, 41]],
  'office/computer-screen': ['mark', [191, 211, 215]], 'office/laptop': ['mark', [191, 211, 215]], 'office/desk-chair': ['back'], 'office/office-chair': ['back'],
  'office/desk': ['detail'], 'office/metal-office-desk': ['detail'], 'office/desk-fan': ['detail'], 'office/printer': ['back'], 'office/wall-corkboard': ['mark', [229, 195, 80]],
  'arena/mic': ['back'], 'lab/measuring-cup': ['fore', [94, 7, 17]], 'misc/scuba-tanks': ['detail'], 'street/dumpster': ['mark', [0, 163, 91]], 'kitchen-home/sauce-pan': ['handle'],
  'street/barrier-fixed': ['mark', [229, 188, 78]], 'street/barrier-single': ['mark', [209, 171, 70]], 'street/standing-picture-frame': ['mark', [229, 229, 229]], 'street/traffic-light': ['mark', [180, 4, 22]],
  'street/car-hatchback': ['x'], 'street/taxi': ['x'], 'street/cart': ['x'], 'street/sushi-truck': ['x'],
  'supermarket/can-fridge': ['mark', [229, 229, 229]], 'supermarket/cash-register': ['mark', [82, 88, 83]], 'supermarket/mirror': ['mark', [150, 197, 208]],
  'supermarket/steel-frame-shelves': ['detail'],
  // no face of their own, but not the same turned round: how the sheets show them is held
  'care-home/tea-set': ['mass', [0.5, 1], '<'], 'care-home/vintage-crutches': ['detail'], 'kitchen-home/wicker-basket-2': ['detail'], 'lab/chemistry-set': ['rear', [224, 229, 229]], 'lab/jars': ['side', [199, 138, 62], '>'],
  'misc/present': ['mass', [0, 1], '>'], 'street/candles': ['mass', [0.75, 1], '>'], 'street/flowers': ['fore', [184, 140, 191]], 'street/street-light': ['fore', [229, 229, 229]], 'street/street-light-2': ['side', [220, 167, 78], '<'],
  'hospital/iv-stand': ['side', [212, 221, 223], '>'], 'kitchen-home/bottle-rack': ['side', [226, 173, 194], '>'], 'kitchen-home/dishrack': ['rear', [221, 101, 85]], 'supermarket/nappy-stack': ['mass', [0, 1], '>'],
  // code-built
  'care-home/fancy-picture-frame': ['card'], 'care-home/fire-door': ['fore', [209, 212, 215]], 'care-home/memory-box': ['rear', [223, 212, 184]], 'care-home/serving-hatch': ['detail'],
  'care-home/walking-frame': ['fore', [124, 126, 134]], 'care-home/wall-clock': ['fore', [221, 101, 85]], 'hospital/bassinet': ['card'], 'hospital/blind': ['fore', [124, 126, 134]],
  'hospital/clipboard': ['rear', [209, 212, 215]], 'hospital/double-door': ['fore', [209, 212, 215]], 'hospital/gurney': ['back'], 'hospital/monitor-stand': ['card'], 'hospital/sanitiser': ['card'],
  'kitchen-home/calendar': ['card'], 'kitchen-home/high-chair': ['fore', [221, 221, 216]], 'kitchen-home/kitchen-sink': ['fore', [212, 221, 223]], 'kitchen-home/pan': ['handle'],
  'kitchen-home/steriliser': ['fore', [124, 126, 134]], 'kitchen-home/toaster': ['fore', [188, 192, 197]], 'kitchen-home/tv': ['fore', [80, 89, 105]], 'lab/bio-cabinet': ['fore', [206, 212, 218]],
  'lab/eyewash': ['card'], 'lab/gantry': ['detail'], 'lab/incubator': ['fore', [209, 212, 215]], 'lab/lab-bench': ['rear', [188, 192, 197]], 'misc/cardboard-box': ['fore', [221, 221, 216]],
  'office/computer-keyboard': ['rear', [229, 162, 80]], 'office/glass-wall': ['rear', [129, 166, 218]], 'office/whiteboard': ['card'], 'street/bouquet': ['fore', [226, 173, 194]],
  'street/child-shoe': ['rear', [111, 118, 124]], 'street/food-truck': ['x'], 'street/police-tower': ['fore', [229, 203, 89]], 'street/scaffolding': ['fore', [229, 162, 80]], 'street/screen-truck': ['x'],
  'supermarket/checkout-belt': ['rear', [80, 89, 105]], 'supermarket/cooler-box': ['fore', [221, 101, 85]], 'supermarket/glass-cabinet': ['rear', [144, 108, 69]], 'supermarket/security-camera': ['fore', [118, 166, 223]],
  'supermarket/shelf-end-cap': ['rear', [221, 221, 216]], 'supermarket/shelf-stocked': ['rear', [221, 221, 216]], 'supermarket/shop-trolley': ['rear', [221, 101, 85]],
};
// the first two reasons are measured (frontSigns finds no side with a mark, a part or more detail of its own)
export const NO_FRONT = {
  round: /^(care-home\/(lamp-round-floor|rug-round)|kitchen-home\/(kettle|stock-pot|table-lamp|water-bottle)|lab\/(potion-bottle|propane-tank|stool|tripod-stand)|misc\/(cake-birthday|plastic-thermos|plate-square)|office\/(coat-rack-standing|mug)|street\/(candle-jar|fire-hydrant|jar|street-lamp|traffic-cone|trashcan-large|truss-post))$/,
  'the same both ways': /^(hospital\/(bed-rail|privacy-curtain|wet-floor-sign)|kitchen-home\/table|lab\/bunsen-burner|misc\/(book|cardboard-boxes|crate|suit-case)|office\/(bookcase-open|cubicle)|street\/(ad-board|bench|bench-2|construction-barrier|crowd-pen|market-stand)|supermarket\/(counter-straight|crate-of-tomatoes|fruit-crate|shelf-tall|shopping-basket|standing-chalkboard))$/,
  'leaves all round, nothing tells one side (not measured)': /^office\/houseplant$/,
};
// tris: [{ v: [[x, y, z] x 3] Blender, c: [r, g, b] sRGB 0..1 or null }]; null = the row holds, else what it measured
export function frontFault(name, tris) {
  const row = FRONT[name]; if (!row) return null;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const at = (p, k) => (p[k] - lo[k]) / Math.max(1e-9, hi[k] - lo[k]);
  let a = 0, ay = 0, ax = 0, nf = 0, nb = 0, mf = 0, mb = 0, all = 0, ally = 0, ma = 0, my = 0, mx = 0, ba = 0, by = 0; const [kind, mark, way] = row;
  const byColour = ['mark', 'fore', 'rear', 'side'].includes(kind), near = byColour ? tris.reduce((m, t) => { if (!t.c) return m; const d = Math.hypot(...t.c.map((v, i) => v - mark[i] / 255)); return d < m.d - 1e-6 ? { d, c: t.c } : m; }, { d: Infinity, c: null }) : null;
  if (near && !(near.d < 0.06)) return `mark: no colour near ${mark} (closest ${near.d.toFixed(2)} away)`;
  for (const t of tris) {
    const c = [0, 1, 2].map(k => (t.v[0][k] + t.v[1][k] + t.v[2][k]) / 3), { n, area } = triNormal(t.v);
    all += area; ally += area * at(c, 1);
    if (at(c, 2) > 0.7) { a += area; ay += area * at(c, 1); ax += area * at(c, 0); }
    if (kind === 'mass' && at(c, 2) >= mark[0] && at(c, 2) <= mark[1]) { ba += area; by += area * at(c, 1); }
    if (at(c, 1) < 0.25) nf++; if (at(c, 1) > 0.75) nb++;
    if (near && t.c && Math.hypot(...t.c.map((v, i) => v - near.c[i])) < 0.005) { ma += area; my += area * at(c, 1); mx += area * at(c, 0); if (n[1] < -0.5) mf += area; if (n[1] > 0.5) mb += area; }
    if (kind === 'card' && t.map) { if (n[1] < -0.5) mf += area; if (n[1] > 0.5) mb += area; }
  }
  if (kind === 'back') return ay / a > 0.55 ? null : `back: the top sits at ${(ay / a).toFixed(2)} of the depth (want > 0.55, behind)`;
  const there = v => (way === '<' ? v < 0.45 : v > 0.55);
  if (kind === 'side') return there(mx / ma) ? null : `side ${mark}: it sits at ${(mx / ma).toFixed(2)} of the width (want ${way} 0.5)`;
  if (kind === 'mass') return there(by / ba) ? null : `mass ${mark}: it sits at ${(by / ba).toFixed(2)} of the depth (want ${way} 0.5)`;
  if (kind === 'x') return ax / a < 0.47 ? null : `x: the cabin sits at ${(ax / a).toFixed(2)} of the length (want < 0.47)`;
  if (kind === 'fore') return my / ma < 0.45 ? null : `fore ${mark}: it sits at ${(my / ma).toFixed(2)} of the depth (want < 0.45, in front)`;
  if (kind === 'rear') return my / ma > 0.55 ? null : `rear ${mark}: it sits at ${(my / ma).toFixed(2)} of the depth (want > 0.55, behind)`;
  if (kind === 'handle') return ally / all < 0.45 ? null : `handle: the body sits at ${(ally / all).toFixed(2)} of the depth (want < 0.45, its handle behind)`;
  if (kind === 'card') return mf > 0.8 * (mf + mb) && mf > 0 ? null : `card: ${(mf / Math.max(1e-12, mf + mb)).toFixed(2)} of its card faces the front (want > 0.8)`;
  if (kind === 'detail') return nf >= 1.25 * nb ? null : `detail: ${nf} triangles in front, ${nb} behind`;
  return mf > 0.8 * (mf + mb) && mf > 0 ? null : `mark ${mark}: ${(mf / Math.max(1e-12, mf + mb)).toFixed(2)} of it faces the front (want > 0.8)`;
}
// what tells the front of a prop from its back, for a NO_FRONT prop that says it has neither: a colour that faces one of
// them or sits at one end, or one end with 1.25 x the triangles of the other (30 more at least). [] = the same both ways
export function frontSigns(tris) {
  let lo = Infinity, hi = -Infinity, total = 0, nf = 0, nb = 0; for (const t of tris) for (const p of t.v) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  const by = new Map();
  for (const t of tris) { const { n, area } = triNormal(t.v), y = ((t.v[0][1] + t.v[1][1] + t.v[2][1]) / 3 - lo) / Math.max(1e-9, hi - lo), k = t.c ? t.c.map(v => Math.round(v * 255)).join() : t.map ? 'its card' : 'glass', o = by.get(k) || { a: 0, y: 0, f: 0, b: 0 };
    total += area; o.a += area; o.y += area * y; if (n[1] < -0.5) o.f += area; if (n[1] > 0.5) o.b += area; by.set(k, o); if (y < 0.25) nf++; if (y > 0.75) nb++; }
  const out = [];
  for (const [k, o] of by) { const s = o.f + o.b;
    if (s > 0.003 * total && Math.abs(o.f - o.b) > 0.5 * s) out.push(`${k} faces the ${o.f > o.b ? 'front' : 'back'} (${(100 * o.f / total).toFixed(1)} % against ${(100 * o.b / total).toFixed(1)} %)`);
    else if (o.a > 0.004 * total && Math.abs(o.y / o.a - 0.5) > 0.15) out.push(`${k} sits at ${(o.y / o.a).toFixed(2)} of the depth`); }
  if (Math.max(nf, nb) >= 1.25 * Math.min(nf, nb) && Math.abs(nf - nb) >= 30) out.push(`${nf} triangles in front, ${nb} behind`);
  return out;
}
export function triNormal([p, q, r]) {
  const e = [0, 1, 2].map(k => q[k] - p[k]), f = [0, 1, 2].map(k => r[k] - p[k]), n = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]], l = Math.hypot(...n);
  return { n: n.map(v => v / Math.max(l, 1e-15)), area: l / 2 };
}
const toLin = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const l2s = y => y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
const luma = c => 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]);
// the prop's area-weighted mean luminance, sRGB 0..1 (null: no flat colour at all)
export function propLuma(tris) {
  let a = 0, l = 0; for (const t of tris) if (t.c) { const { area } = triNormal(t.v); a += area; l += area * luma(t.c); }
  return a ? l2s(l / a) : null;
}
// the share of the prop's area darker than DARK.black (a picture's triangles count as not dark)
export function blackShare(tris) {
  let a = 0, d = 0; for (const t of tris) { const { area } = triNormal(t.v); a += area; if (t.c && l2s(luma(t.c)) < DARK.black && Math.max(...t.c) < DARK.max) d += area; } return a ? d / a : 0;
}
// a flat panel split along its diagonal in two colours (a photo sampled triangle by triangle): two triangles in one plane
// (2 degrees) that share the longest edge of both, >= 0.1 apart in sRGB, each >= 1 % of the prop's area. -> [largest share]
export function diagonalSplits(tris) {
  const total = tris.reduce((s, t) => s + triNormal(t.v).area, 0), key = p => p.map(v => Math.round(v * 2e4)).join(), edges = new Map(), out = [];
  for (const t of tris) {
    if (!t.c) continue; const { n, area } = triNormal(t.v); if (area < 0.01 * total) continue;
    let best = 0, e = null;
    for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) { const l = Math.hypot(...[0, 1, 2].map(k => t.v[i][k] - t.v[j][k])); if (l > best) { best = l; e = [key(t.v[i]), key(t.v[j])].sort().join('|'); } }
    const o = edges.get(e);
    if (o && o.n[0] * n[0] + o.n[1] * n[1] + o.n[2] * n[2] > 0.9994 && Math.hypot(...t.c.map((v, i) => v - o.c[i])) >= 0.1) out.push(Math.max(area, o.area) / total);
    edges.set(e, { n, c: t.c, area });
  }
  return out;
}
