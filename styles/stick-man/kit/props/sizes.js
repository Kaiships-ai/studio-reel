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

// Real heights of the kit's set props (kit/props/catalog.js: the CC0 .glb props and the code-built ones), metres, held by
// test/unit/stick-props-catalog.test.mjs. Most props stand between a pan (6 cm) and a shop shelf or a door (3.2 m); a
// flat one (a rug, a plate, a keyboard) is named in `flat`, a place-sized one (lamp posts, vehicles, stages, rigs, towers)
// in `big`, each with its own range.
export const PROP_HEIGHT = {
  default: [0.05, 3.2],
  flat: [/\/(rug|plate|computer-keyboard|clipboard)/, [0.005, 0.06]],
  big: [
    [/^street\/(street-light|street-lamp|traffic-light|truss-post|police-tower|screen-truck|sushi-truck|scaffolding)/, 4.8],
    [/^arena\/(concert-stage|stage|screen-rig)$/, 6],
  ],
  // a prop whose real height is known: the mic is a full stand (a list estimate of 0.2 m shrank it to 20 cm)
  real: [
    [/^arena\/mic$/, [1.4, 1.8]],
    [/^misc\/scuba-tanks$/, [0.55, 0.75]],
    [/^lab\/measuring-cup$/, [0.08, 0.16]],
  ],
};
export function heightRange(name) {
  const r = PROP_HEIGHT.real.find(([re]) => re.test(name));
  if (r) return r[1];
  if (PROP_HEIGHT.flat[0].test(name)) return PROP_HEIGHT.flat[1];
  const b = PROP_HEIGHT.big.find(([re]) => re.test(name));
  return b ? [PROP_HEIGHT.default[0], b[1]] : PROP_HEIGHT.default;
}

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
  'arena/concert-stage': 'black stage deck and truss', 'arena/stage': 'black stage skirt', 'arena/mic': 'black mic head and base',
  'arena/speaker': 'black speaker cabinet', 'lab/korean-fire-extinguisher': 'rubber hose and nozzle', 'misc/smartphone': 'screen',
};

// Too dark: the prop's whole colour, its area-weighted mean linear luminance as sRGB 0..1. No single colour of the
// armchair (0.139) and the sofa (0.162) was near black, yet both came out of the kit's contrast as black lumps. Under
// DARK.min a prop is exempt only by name, with the real reason.
export const DARK = { min: 0.24, ok: { 'kitchen-home/pan': 'a seasoned iron pan is black', 'misc/smartphone': 'its front is all screen' } };

// Which way a .glb prop faces, every one of them: FRONT (a measured side) or NO_FRONT (the reason it has none). Front is
// -y; vehicles and the hand cart point +x. A model downloaded the other way round shows its back to every camera (five
// props of one maker did on 25/11). The test measures each row on the triangles:
//   back:   the top 30 % of the prop sits in its rear half (a seat back, a headboard, a laptop lid): mean y > 0.55 of the depth
//   mark:   the colour nearest [r, g, b] faces the front: its -y area > 0.8 of its -y and +y area (a screen, a door handle, a label)
//   detail: at least 1.25 x more triangles in the front quarter than in the rear one (drawers, doors, a keyboard)
//   x:      the cabin (top 30 %) sits behind the middle, the bonnet or the handles to +x: mean x < 0.47 of the length
//   eye:    the shape cannot tell; checked on the --view front and --view back sheets (25/11)
export const FRONT = {
  'arena/concert-stage': ['back'], 'arena/stage': ['back'], 'arena/screen-rig': ['mark', [229, 229, 229]], 'arena/speaker': ['mark', [229, 229, 229]], 'arena/spotlight': ['mark', [229, 229, 229]],
  'care-home/armchair': ['back'], 'care-home/lounge-chair': ['back'], 'care-home/rockingchair': ['back'], 'care-home/coffee-cart': ['detail'], 'care-home/night-stand': ['detail'],
  'care-home/fancy-picture-frame': ['mark', [147, 135, 122]],
  'hospital/bed-single': ['back'], 'hospital/bed-twin': ['back'], 'hospital/wheelchair': ['back'], 'hospital/clipboard': ['back'], 'hospital/first-aid-kit': ['mark', [115, 50, 48]],
  'hospital/industrial-storage-cart': ['detail'], 'hospital/medical-box': ['detail'], 'hospital/sign-hospital': ['mark', [85, 189, 155]], 'hospital/monitor': ['eye', 'the foot reaches forward'], 'hospital/tool-cart': ['eye', 'drawers'],
  'kitchen-home/chair': ['back'], 'kitchen-home/sofa': ['back'], 'kitchen-home/kitchen-fridge': ['mark', [191, 211, 215]], 'kitchen-home/kitchen-microwave': ['mark', [179, 212, 197]],
  'kitchen-home/kitchen-sink': ['mark', [175, 118, 75]], 'kitchen-home/kitchen-stove': ['mark', [75, 97, 97]], 'kitchen-home/radio': ['mark', [172, 75, 72]], 'kitchen-home/washing-machine': ['mark', [47, 47, 47]],
  'lab/industrial-microscope': ['detail'], 'lab/vintage-microscope': ['detail'], 'lab/korean-fire-extinguisher': ['mark', [206, 196, 180]],
  'misc/backpack': ['detail'], 'misc/books': ['mark', [39, 211, 149]], 'misc/bottle': ['mark', [178, 132, 97]], 'misc/briefcase': ['detail'], 'misc/hand-truck': ['back'],
  'misc/phone': ['mark', [45, 45, 45]], 'misc/smartphone': ['mark', [20, 20, 20]], 'misc/safe': ['mark', [41, 41, 41]],
  'office/computer-keyboard': ['back'], 'office/computer-screen': ['mark', [191, 211, 215]], 'office/laptop': ['mark', [191, 211, 215]], 'office/desk-chair': ['back'], 'office/office-chair': ['back'],
  'office/desk': ['detail'], 'office/metal-office-desk': ['detail'], 'office/desk-fan': ['detail'], 'office/printer': ['back'], 'office/wall-corkboard': ['mark', [229, 195, 80]],
  'street/barrier-fixed': ['mark', [229, 188, 78]], 'street/barrier-single': ['mark', [209, 171, 70]], 'street/standing-picture-frame': ['mark', [229, 229, 229]], 'street/traffic-light': ['mark', [180, 4, 22]],
  'street/car-hatchback': ['x'], 'street/taxi': ['x'], 'street/cart': ['x'], 'street/sushi-truck': ['x'],
  'supermarket/can-fridge': ['mark', [229, 229, 229]], 'supermarket/cash-register': ['mark', [82, 88, 83]], 'supermarket/mirror': ['mark', [150, 197, 208]], 'supermarket/security-camera': ['mark', [44, 44, 43]],
  'supermarket/steel-frame-shelves': ['detail'], 'supermarket/cooler-box': ['eye', 'the lid lip is in front, the hinges behind'],
};
export const NO_FRONT = {
  round: /^(arena\/mic|care-home\/(cup-tea|lamp-round-floor|rug-round|tea-set)|kitchen-home\/(kettle|pan|sauce-pan|stock-pot|table-lamp|water-bottle)|lab\/(jars|measuring-cup|potion-bottle|propane-tank|stool|tripod-stand)|misc\/(cake-birthday|plastic-thermos|plate-square|scuba-tanks)|office\/(coat-rack-standing|houseplant)|street\/(candles|fire-hydrant|flowers|jar|street-lamp|traffic-cone|trashcan-large|truss-post))$/,
  'the same both ways': /^(care-home\/vintage-crutches|hospital\/wet-floor-sign|kitchen-home\/(table|toaster|wicker-basket-2)|lab\/chemistry-set|misc\/(book|cardboard-box|cardboard-boxes|crate|present|suit-case)|office\/bookcase-open|street\/(ad-board|bench|bench-2|construction-barrier|dumpster|market-stand)|supermarket\/(counter-straight|crate-of-tomatoes|fruit-crate|shelf-tall|standing-chalkboard))$/,
  'the set turns its arm': /^street\/(street-light|street-light-2)$/,
};
// tris: [{ v: [[x, y, z] x 3] Blender, c: [r, g, b] sRGB 0..1 or null }]; null = the row holds, else what it measured
export function frontFault(name, tris) {
  const row = FRONT[name]; if (!row || row[0] === 'eye') return null;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const at = (p, k) => (p[k] - lo[k]) / Math.max(1e-9, hi[k] - lo[k]);
  let a = 0, ay = 0, ax = 0, nf = 0, nb = 0, mf = 0, mb = 0; const [kind, mark] = row;
  const near = kind === 'mark' ? tris.reduce((m, t) => { if (!t.c) return m; const d = Math.hypot(...t.c.map((v, i) => v - mark[i] / 255)); return d < m.d - 1e-6 ? { d, c: t.c } : m; }, { d: Infinity, c: null }) : null;
  if (near && !(near.d < 0.06)) return `mark: no colour near ${mark} (closest ${near.d.toFixed(2)} away)`;
  for (const t of tris) {
    const c = [0, 1, 2].map(k => (t.v[0][k] + t.v[1][k] + t.v[2][k]) / 3), { n, area } = triNormal(t.v);
    if (at(c, 2) > 0.7) { a += area; ay += area * at(c, 1); ax += area * at(c, 0); }
    if (at(c, 1) < 0.25) nf++; if (at(c, 1) > 0.75) nb++;
    if (near && t.c && Math.hypot(...t.c.map((v, i) => v - near.c[i])) < 0.005) { if (n[1] < -0.5) mf += area; if (n[1] > 0.5) mb += area; }
  }
  if (kind === 'back') return ay / a > 0.55 ? null : `back: the top sits at ${(ay / a).toFixed(2)} of the depth (want > 0.55, behind)`;
  if (kind === 'x') return ax / a < 0.47 ? null : `x: the cabin sits at ${(ax / a).toFixed(2)} of the length (want < 0.47)`;
  if (kind === 'detail') return nf >= 1.25 * nb ? null : `detail: ${nf} triangles in front, ${nb} behind`;
  return mf > 0.8 * (mf + mb) && mf > 0 ? null : `mark ${mark}: ${(mf / Math.max(1e-12, mf + mb)).toFixed(2)} of it faces the front (want > 0.8)`;
}
export function triNormal([p, q, r]) {
  const e = [0, 1, 2].map(k => q[k] - p[k]), f = [0, 1, 2].map(k => r[k] - p[k]), n = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]], l = Math.hypot(...n);
  return { n: n.map(v => v / Math.max(l, 1e-15)), area: l / 2 };
}
const toLin = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const luma = c => 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]);
// the prop's area-weighted mean luminance, sRGB 0..1 (null: no flat colour at all)
export function propLuma(tris) {
  let a = 0, l = 0; for (const t of tris) if (t.c) { const { area } = triNormal(t.v); a += area; l += area * luma(t.c); }
  if (!a) return null; const y = l / a; return y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
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
