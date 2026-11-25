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
};
export function heightRange(name) {
  if (PROP_HEIGHT.flat[0].test(name)) return PROP_HEIGHT.flat[1];
  const b = PROP_HEIGHT.big.find(([re]) => re.test(name));
  return b ? [PROP_HEIGHT.default[0], b[1]] : PROP_HEIGHT.default;
}
