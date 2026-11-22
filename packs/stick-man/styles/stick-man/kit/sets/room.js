// room: a warm, neutral living room. A sofa against the back wall, a low table and a rug in front of it, a floor lamp, a
// bookshelf, a plant and a window with a soft afternoon view. Blender metres: x right, y into the scene, z up; the camera
// stands on the y < 0 side. Walk paths: the rug strip y -1.6 .. 0.6 is clear from x -2.6 to 0.9 (the low table stands at x 1.05 .. 2.05).
// Marks: left / center / right (standing on the rug), sofa_l / sofa_r (seats: posture 'sit' or a SitDown clip there),
// door (off to the left, for an entrance), window (beside the window).
import { createKit, room, windowY, SURF, tex, rng } from '/styles/stick-man/kit/sets/kit.js';

export const SUN_DIR = [0.55, 0.5, -0.66];                       // afternoon light through the window, front-left and high
export const SUN_CENTER = [0, 0.4, 0.9], SUN_HALF = 5.5;
export const MARKS = {
  left: [-0.9, -0.5, 0], center: [0, -0.4, 0], right: [0.9, -0.5, 0],
  sofa_l: [-0.55, 1.18, 0], sofa_r: [0.55, 1.18, 0],
  door: [-3.4, -0.6, 0], window: [2.2, 0.9, 0],
};
export const PLACES = { table_top: [1.55, 0.2, 0.42], shelf_top: [-2.5, 1.55, 1.82], lamp: [1.75, 1.5, 1.6], window: [2.4, 1.95, 1.5] };
export const CAMERA_SIDE = [0, -1];
// the camera stays in front of the cast (never behind the table or inside a wall)
export const CAMERA_ROOM = [[[-3.1, -7.5], [3.1, -0.9]]];
// the sofa's seat is 0.45 m high (the kit SIT pose sits at that height); the table is low enough to step past
export const COLLIDE = [
  { name: 'sofa', lo: [-1.25, 1.0, 0], hi: [1.25, 2.0, 0.45] },
  { name: 'sofa_back', lo: [-1.25, 1.7, 0], hi: [1.25, 2.0, 0.95] },
  { name: 'table', lo: [1.05, -0.05, 0], hi: [2.05, 0.45, 0.42] },
  { name: 'shelf', lo: [-3.0, 1.7, 0], hi: [-2.0, 2.0, 1.8] },
  { name: 'lamp', lo: [1.65, 1.4, 0], hi: [1.85, 1.6, 1.7] },
  { name: 'plant', lo: [2.7, 1.55, 0], hi: [3.2, 2.0, 1.1] },
];

const view = () => tex(512, 512, (g, w, h) => {                    // the window's view: sky, far roofs, a tree
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fc8ef'); gr.addColorStop(0.7, '#e8f1f6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(7); g.fillStyle = '#c9b9a6';
  for (let x = 0; x < w;) { const bw = 40 + r() * 70, bh = 90 + r() * 120; g.fillRect(x, h - bh, bw - 4, bh); x += bw; }
  g.fillStyle = '#7fa36a'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(120 + i * 18, h - 200 + Math.sin(i) * 20, 50, 0, 7); g.fill(); }
});
const rug = () => tex(512, 512, (g, w, h) => {
  g.fillStyle = '#b4543c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e9d2a4'; g.lineWidth = 14; g.strokeRect(30, 30, w - 60, h - 60);
  g.lineWidth = 5; g.strokeRect(62, 62, w - 124, h - 124); g.fillStyle = '#e9d2a4';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w / 2, h / 2, 30 + i * 34, 0, 7); g.stroke(); }
});

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.78, 0.80, 0.86], mid: [0.86, 0.78, 0.66], bottom: [0.42, 0.32, 0.24],
    panels: [{ dir: [0.9, 0.6, 0.4], size: 3, color: [1, 0.95, 0.85], power: 2.5 }] } });
  room(K, { x0: -3.6, x1: 3.6, y0: -8, y1: 2.1, h: 5.5, ceiling: false,
    wall: K.mat([1, 1, 1], 0.92, { map: SURF.plaster('#e9dcc6') }),
    side: K.mat([1, 1, 1], 0.92, { map: SURF.plaster('#d9cbb2', 3) }),
    floor: K.mat([1, 1, 1], 0.7, { map: SURF.wood('#a8743f'), repeat: [5, 5] }),
    skirt: K.mat('#f3ece0', 0.6) });
  const wood = K.mat('#7a4a26', 0.55), cream = K.mat('#f1e8d8', 0.7), green = K.mat('#3f7d5a', 0.8);
  // the window (right of the sofa) and its light
  windowY(K, { cx: 2.4, y: 2.1, z0: 0.95, w: 1.1, h: 1.3, frame: K.mat('#f5f1ea', 0.5), view: view() });
  K.area([2.4, 1.8, 1.6], [0, -1, 0.9], 1.1, 1.3, '#fff1da', 5);
  // the sofa: base, seat cushions, back, arms
  const sofa = K.mat('#4f6d8f', 0.9), cush = K.mat('#5d7ea2', 0.95);
  K.box([-1.25, 1.0, 0.08], [1.25, 1.95, 0.32], sofa, { r: 0.05 });
  K.box([-1.1, 1.02, 0.32], [-0.02, 1.7, 0.45], cush, { r: 0.06 }); K.box([0.02, 1.02, 0.32], [1.1, 1.7, 0.45], cush, { r: 0.06 });
  K.box([-1.25, 1.7, 0.3], [1.25, 1.98, 0.95], sofa, { r: 0.07 });
  for (const s of [-1, 1]) K.box([s * 1.25 - (s > 0 ? 0.18 : 0), 1.0, 0.3], [s * 1.25 + (s < 0 ? 0.18 : 0), 1.95, 0.62], sofa, { r: 0.06 });
  for (const x of [-1.15, 1.15]) for (const y of [1.06, 1.9]) K.cyl([x, y, 0.04], 0.03, 0.08, wood);
  K.box([0.55, 1.62, 0.45], [0.95, 1.72, 0.78], K.mat('#e2b04a', 0.9), { r: 0.06 });   // a cushion
  // the rug, and the low table beside the sofa (out of the camera's line to it) with a mug and a book on it
  K.card([0, -0.35, 0.004], 4.2, 2.6, rug(), { rotX: -90 });
  K.box([1.05, -0.05, 0.36], [2.05, 0.45, 0.42], wood, { r: 0.015 });
  for (const x of [1.12, 1.98]) for (const y of [0.02, 0.38]) K.box([x - 0.03, y - 0.03, 0], [x + 0.03, y + 0.03, 0.36], wood, { r: 0.006 });
  K.prop('mug', K.cyl([1.8, 0.2, 0.47], 0.045, 0.1, K.mat('#f4efe2', 0.35)));
  K.box([1.2, 0.05, 0.42], [1.5, 0.25, 0.46], K.mat('#2f5f8a', 0.7), { r: 0.006 });
  // the bookshelf with books, the floor lamp, a plant, a picture
  K.box([-3.0, 1.7, 0], [-2.0, 2.0, 1.8], wood, { r: 0.015 });
  const r = rng(3), tones = ['#c0392b', '#2e86de', '#f6b93b', '#38ada9', '#8e44ad', '#e8e2d6'];
  for (const z of [0.12, 0.6, 1.08, 1.5]) {
    K.box([-2.96, 1.68, z - 0.02], [-2.04, 1.98, z], wood, { r: 0.004 });
    for (let x = -2.92; x < -2.1;) { const bw = 0.04 + r() * 0.05, bh = 0.22 + r() * 0.12; K.box([x, 1.74, z], [x + bw - 0.004, 1.96, z + bh], K.mat(tones[Math.floor(r() * tones.length)], 0.8), { r: 0.004 }); x += bw; }
  }
  K.cyl([1.75, 1.5, 0.015], 0.16, 0.03, K.mat('#2b2b2e', 0.4)); K.cyl([1.75, 1.5, 0.8], 0.015, 1.6, K.mat('#2b2b2e', 0.4));
  K.lathe([1.75, 1.5, 1.48], [[0.12, 0], [0.2, 0], [0.13, 0.26], [0.09, 0.26]], K.mat('#fbeccf', 0.8, { emit: '#ffcf8a', emitK: 0.35 }));
  K.point([1.75, 1.5, 1.55], '#ffd29a', 2.2, 5);
  K.lathe([2.95, 1.78, 0], [[0.16, 0], [0.2, 0.34], [0.2, 0.36], [0, 0.36]], K.mat('#c9673e', 0.7));
  for (let i = 0; i < 7; i++) { const a = i * 0.9; K.sphere([2.95 + 0.14 * Math.cos(a), 1.78 + 0.1 * Math.sin(a), 0.6 + 0.07 * i], 0.16, green, { sy: 0.8 }); }
  K.box([-1.0, 2.08, 1.45], [0.2, 2.1, 2.15], K.mat('#efe6d4', 0.6), { r: 0.01 });
  K.card([-0.4, 2.075, 1.8], 1.05, 0.6, tex(256, 160, (g, w, h) => { g.fillStyle = '#7fb7d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(w * 0.7, h * 0.35, 22, 0, 7); g.fill(); g.fillStyle = '#4f8a5c'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.35, h * 0.35); g.lineTo(w * 0.7, h); g.fill(); }));
  K.point([0, -1.5, 2.6], '#fff4e2', 1.4, 7);
  return { props: K.props };
}
