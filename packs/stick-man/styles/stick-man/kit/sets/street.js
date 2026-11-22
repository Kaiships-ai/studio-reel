// street: a sunny corner of a small town street. A wide sidewalk in front of a row of three shop fronts (a café with an
// awning, a bookshop, a corner shop), lamp posts, a bench, a bin, a tree in a planter; the road on the camera side and
// a far skyline past the roofs. Blender metres: x right, y into the scene, z up; the camera stands on the road (y < -1.6).
// Walk path: the sidewalk strip y -1.2 .. 0.8 is clear from x -6 to 6.
// Marks: left / center / right (on the sidewalk), bench (seat: posture 'sit'), cafe_door, shop_door, far_left / far_right
// (off screen, for walking in and out).
import { createKit, SURF, tex, rng, label } from '/styles/stick-man/kit/sets/kit.js';
import { backdrop } from '/styles/stick-man/kit/sets/backdrop.js';

export const SUN_DIR = [0.45, 0.55, -0.7];
export const SUN_CENTER = [0, 0.5, 1.0], SUN_HALF = 8;
export const MARKS = {
  left: [-1.0, -0.3, 0], center: [0, -0.3, 0], right: [1.0, -0.3, 0],
  bench: [2.6, 1.25, 0], cafe_door: [-3.0, 1.6, 0], shop_door: [3.9, 1.6, 0],
  far_left: [-8, -0.3, 0], far_right: [8, -0.3, 0],
};
export const PLACES = { bench_seat: [2.6, 1.2, 0.45], cafe_table: [-1.9, 1.3, 0.75], bin: [4.8, 1.3, 0.9] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-9, -12], [9, -0.8]]];   // the camera stays in front of the cast
export const COLLIDE = [
  { name: 'shops', lo: [-9, 2.4, 0], hi: [9, 3.0, 6] },
  { name: 'bench', lo: [1.8, 1.05, 0], hi: [3.4, 1.75, 0.45] },
  { name: 'bench_back', lo: [1.8, 1.6, 0], hi: [3.4, 1.75, 0.9] },
  { name: 'cafe_table', lo: [-2.25, 0.95, 0], hi: [-1.55, 1.65, 0.75] },
  { name: 'bin', lo: [4.55, 1.05, 0], hi: [5.05, 1.55, 0.9] },
  { name: 'planter', lo: [-5.9, 1.0, 0], hi: [-5.1, 1.8, 0.5] },
  { name: 'lamp_l', lo: [-4.3, 0.9, 0], hi: [-4.1, 1.1, 4] }, { name: 'lamp_r', lo: [5.9, 0.9, 0], hi: [6.1, 1.1, 4] },
];

const shopWindow = (seed, warm) => tex(256, 256, (g, w, h) => {      // a lit shop window: shelves and things on them
  g.fillStyle = warm ? '#ffe6b8' : '#dff0f7'; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (const y of [70, 140, 210]) { g.fillStyle = '#8a6a4a'; g.fillRect(0, y, w, 8);
    for (let x = 8; x < w - 20;) { const bw = 14 + r() * 26, bh = 20 + r() * 34; g.fillStyle = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1'][Math.floor(r() * 6)]; g.fillRect(x, y - bh, bw, bh); x += bw + 6; } }
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(90, 0); g.lineTo(0, 120); g.fill();
});

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.62, 0.74, 0.92], mid: [0.86, 0.84, 0.80], bottom: [0.45, 0.42, 0.38] } });
  K.skyDome({ zenith: '#4f95e8', mid: '#86bdf2', horizon: '#eaf3fa', clouds: 12 });
  await backdrop(stage, [{ piece: 'backdrop_skyline_a', at: [-12, 34, 0], rot: 0 }, { piece: 'backdrop_skyline_b', at: [20, 40, 0], rot: 0 },
    { piece: 'backdrop_roofline', at: [0, 24, 0], rot: 0 }], { tint: [0.95, 0.93, 0.92] });
  const r = rng(5);
  // ground: the road (camera side), the curb, the sidewalk tiles
  K.box([-40, -40, -0.2], [40, -1.6, -0.02], K.mat([1, 1, 1], 0.9, { map: SURF.plaster('#5b5e63', 9), repeat: [8, 8] }), { r: 0 });
  for (let x = -38; x < 38; x += 4) K.box([x, -6.1, -0.02], [x + 2, -5.95, -0.015], K.mat('#f4f1e8', 0.6), { r: 0 });   // centre line
  K.box([-40, -1.75, -0.2], [40, -1.6, 0.12], K.mat('#b9b4aa', 0.8), { r: 0.02 });
  K.box([-40, -1.6, -0.2], [40, 3.0, 0.0], K.mat([1, 1, 1], 0.85, { map: SURF.tiles('#d6d0c4', '#a8a294', 4), repeat: [40, 2.3] }), { r: 0 });
  // the shop row: three fronts with their own colours, a cornice, upper windows
  const fronts = [{ x0: -9, x1: -0.8, c: '#e8b88a', name: 'CAFÉ', aw: '#c0392b' }, { x0: -0.8, x1: 2.0, c: '#9fc1c9', name: 'BOOKS', aw: '#2e6f8e' }, { x0: 2.0, x1: 9, c: '#d8d1a8', name: 'CORNER SHOP', aw: '#2f8a52' }];
  for (const [i, F] of fronts.entries()) {
    const wall = K.mat([1, 1, 1], 0.9, { map: SURF.plaster(F.c, 11 + i) }), cx = (F.x0 + F.x1) / 2, wd = F.x1 - F.x0;
    K.box([F.x0, 2.5, 0], [F.x1, 3.0, 6.0], wall, { r: 0 });
    K.box([F.x0, 2.38, 5.6], [F.x1, 2.55, 5.85], K.mat('#f4efe6', 0.6), { r: 0.02 });
    for (let x = F.x0 + 0.9; x < F.x1 - 0.6; x += 1.6) { K.box([x - 0.45, 2.44, 3.3], [x + 0.45, 2.5, 4.6], K.mat('#f6f2ea', 0.5), { r: 0.01 });
      K.card([x, 2.43, 3.95], 0.78, 1.18, null, { emissive: 0 }).material.color.set(r() > 0.7 ? '#ffe7b0' : '#9fb9cc'); }
    // the shop window, the door, the sign and the awning
    const ww = Math.min(wd - 1.8, 3.2), wx = cx + (i === 1 ? 0 : -0.3);
    K.box([wx - ww / 2 - 0.08, 2.4, 0.4], [wx + ww / 2 + 0.08, 2.52, 2.35], K.mat('#3a3a3f', 0.5), { r: 0.01 });
    K.card([wx, 2.39, 1.37], ww, 1.85, shopWindow(20 + i, i !== 1), { emissive: 1.05 });
    K.box([wx - ww / 2, 2.2, 0.32], [wx + ww / 2, 2.42, 0.42], K.mat('#3a3a3f', 0.5), { r: 0.01 });
    const dx = i === 0 ? F.x1 - 0.9 : i === 2 ? F.x0 + 1.9 : null;
    if (dx != null) { K.box([dx - 0.5, 2.42, 0], [dx + 0.5, 2.52, 2.3], K.mat('#5a3b28', 0.6), { r: 0.02 }); K.sphere([dx + 0.32, 2.38, 1.1], 0.04, K.mat('#d9b54a', 0.3, { metal: 1 })); }
    K.card([cx, 2.37, 2.75], Math.min(wd - 0.6, 3.6), 0.5, label([F.name], { w: 512, h: 72, bg: '#f7f1e3', fg: '#22252b' }), { env: 0.8 });
    const aw = K.mat(F.aw, 0.8), aw2 = K.mat('#f7f1e3', 0.8);
    for (let x = wx - ww / 2 - 0.1, k = 0; x < wx + ww / 2 + 0.1; x += 0.4, k++) { const st = K.box([x, 1.6, 2.4], [x + 0.4, 2.45, 2.46], k % 2 ? aw2 : aw, { r: 0.005 }); st.rotation.x = -0.35; }
  }
  // street furniture: lamp posts, a bench, a bin, a café table with chairs, a planter with a tree, a hydrant
  const iron = K.mat('#2d3436', 0.45, { metal: 0.6 });
  for (const x of [-4.2, 6.0]) { K.cyl([x, 1.0, 2.0], 0.06, 4.0, iron); K.cyl([x, 0.75, 3.95], 0.03, 0.55, iron, { axis: 'y' });
    K.sphere([x, 0.5, 3.85], 0.17, K.mat('#fff6dc', 0.4, { emit: '#ffe2a0', emitK: 0.6 })); }
  const plank = K.mat('#8a5a33', 0.7);
  for (const z of [0.42, 0.45]) K.box([1.8, 1.05 + (z - 0.42) * 6, z - 0.03], [3.4, 1.65 + (z - 0.42) * 0.5, z], plank, { r: 0.01 });
  for (const z of [0.62, 0.8]) K.box([1.8, 1.62, z], [3.4, 1.72, z + 0.1], plank, { r: 0.01 });
  for (const x of [1.95, 3.25]) K.box([x - 0.04, 1.05, 0], [x + 0.04, 1.72, 0.42], iron, { r: 0.01 });
  K.cyl([4.8, 1.3, 0.45], 0.25, 0.9, K.mat('#2f6f4f', 0.6)); K.cyl([4.8, 1.3, 0.92], 0.27, 0.05, K.mat('#26583f', 0.6));
  K.cyl([-1.9, 1.3, 0.72], 0.35, 0.04, K.mat('#f2efe8', 0.4)); K.cyl([-1.9, 1.3, 0.36], 0.04, 0.72, iron);
  for (const dx of [-0.6, 0.6]) { const cx = -1.9 + dx; K.box([cx - 0.2, 1.1, 0.42], [cx + 0.2, 1.5, 0.46], K.mat('#c0392b', 0.6), { r: 0.02 });
    K.box([cx - 0.2, dx < 0 ? 1.1 : 1.46, 0.46], [cx + 0.2, dx < 0 ? 1.14 : 1.5, 0.85], K.mat('#c0392b', 0.6), { r: 0.02 }); for (const q of [-0.16, 0.16]) K.cyl([cx + q, 1.3, 0.21], 0.015, 0.42, iron); }
  K.prop('cup', K.cyl([-1.8, 1.25, 0.79], 0.04, 0.09, K.mat('#ffffff', 0.35)));
  K.box([-5.9, 1.0, 0], [-5.1, 1.8, 0.5], K.mat('#b5651d', 0.7), { r: 0.03 });
  K.cyl([-5.5, 1.4, 1.3], 0.06, 2.0, K.mat('#6b4423', 0.8));
  for (let i = 0; i < 9; i++) { const a = i * 0.7; K.sphere([-5.5 + 0.45 * Math.cos(a), 1.4 + 0.3 * Math.sin(a), 2.5 + 0.35 * Math.sin(i * 1.7)], 0.55, K.mat(i % 2 ? '#4e9a52' : '#3f8746', 0.85)); }
  K.cyl([0.4, -1.3, 0.3], 0.11, 0.6, K.mat('#d63031', 0.5)); K.sphere([0.4, -1.3, 0.62], 0.11, K.mat('#d63031', 0.5));
  K.point([-3.0, 1.0, 2.4], '#ffd9a0', 1.6, 5); K.point([3.9, 1.0, 2.4], '#ffe9c4', 1.2, 5);
  return { props: K.props };
}
