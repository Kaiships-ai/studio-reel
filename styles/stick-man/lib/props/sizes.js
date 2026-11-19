// Real sizes of the props films carry: the longest side in metres, [smallest, largest] of the real thing. shotfaults.mjs
// holds every tracked prop whose name says its kind (bill, cop:Lpistol, you:Rhotdog) against this table, and the kit's own
// hand props (motion-lib/props.js, lib/cast/handprops.js) are held to it by test/unit/stick-prop-sizes.test.mjs. Hot Money
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
// the kind a prop id names: 'cop:Lpistol' -> pistol, 'bill' -> bill, 'bullet2' -> bullet; null when no kind matches
export function kindOf(id) {
  const n = String(id).replace(/^[^:]+:[LRBH]/, '').toLowerCase();
  return Object.keys(REAL_SIZE).find(k => n === k || n.startsWith(k) || new RegExp(`(^|[^a-z])${k}`).test(n)) || null;
}
export function scaleFault(id, size) {
  const k = kindOf(id); if (!k || !(size > 0)) return null;
  const [lo, hi, src] = REAL_SIZE[k];
  if (size > hi * SIZE_TOL) return { kind: k, over: size - hi * SIZE_TOL, want: [lo, hi], src };
  if (size < lo / SIZE_TOL) return { kind: k, over: lo / SIZE_TOL - size, want: [lo, hi], src };
  return null;
}
