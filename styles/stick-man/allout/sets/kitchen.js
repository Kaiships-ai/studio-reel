// The Marshalls' kitchen, 1984, early morning (ep 1 l09): an orange-and-brown 80s kitchen, low gold sun through the
// window over the sink, a breakfast table with toast and tea, a wall clock, a calendar with the days crossed off.
// Keys: breath puff 0..1 (a green stink cloud rolls out at Mabel), calendar days 0..7 (red crosses), clock spin 0..1.
import * as THREE from 'three';
import { createKit, room, windowY, SURF, label, tex, rng, B } from '../kit.js';

export const SUN_DIR = [-0.7, 0.55, -0.45];
export const SUN_CENTER = [0, 1, 0.8], SUN_HALF = 5;
export const PLACES = { sink: [-1.6, 2.2, 0.92], table: [0.9, 0.7, 0.75], clock: [0.6, 2.58, 2.25], calendar: [1.6, 2.58, 1.65], breath: [0.25, 0.3, 1.45] };
export const MARKS = { kip: [-0.15, 0.25, 0], mabel: [0.85, 0.15, 0], sink: [-1.6, 1.6, 0] };
export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-3.8, -8], [3.8, 0.4]]]; export const COLLIDE = [];

const morning = () => tex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4b97a'); gr.addColorStop(0.55, '#ffe2b0'); gr.addColorStop(1, '#a9c48a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(3); g.fillStyle = 'rgba(255,250,230,0.9)'; g.beginPath(); g.arc(w * 0.3, h * 0.48, 40, 0, 7); g.fill(); for (let i = 0; i < 9; i++) { g.fillStyle = `rgb(${70 + 30 * r()},${120 + 40 * r()},${60 + 20 * r()})`; g.beginPath(); g.arc(r() * w, h * 0.72, 40 + 40 * r(), 0, 7); g.fill(); }
  g.fillStyle = '#d99a6c'; g.fillRect(w * 0.6, h * 0.5, 120, 120); g.fillStyle = '#8b3a2a'; g.beginPath(); g.moveTo(w * 0.58, h * 0.5); g.lineTo(w * 0.6 + 60, h * 0.38); g.lineTo(w * 0.6 + 140, h * 0.5); g.fill(); });

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.95, 0.82, 0.62], mid: [0.85, 0.66, 0.45], bottom: [0.45, 0.30, 0.18], panels: [{ dir: [-0.7, 0.6, 0.4], size: 3, color: [1, 0.85, 0.6], power: 5 }] }, envK: 0.7 });
  stage.scene.background = null;
  const M = {
    wall: K.mat([0.96, 0.86, 0.62], 0.9, { map: SURF.plaster([0.96, 0.86, 0.62], 12) }),
    tileW: K.mat([1, 1, 1], 0.3, { map: SURF.tiles([0.92, 0.66, 0.30], [0.95, 0.9, 0.8], 6, 5), repeat: [4, 1] }),
    floor: K.mat([1, 1, 1], 0.5, { map: SURF.checker([0.55, 0.32, 0.18], [0.85, 0.72, 0.52], 10), repeat: [3, 3] }),
    cab: K.mat([0.72, 0.36, 0.14], 0.45, { map: SURF.wood([0.72, 0.36, 0.14], 4, 12) }), bench: K.mat([0.95, 0.85, 0.62], 0.3, { physical: true, clearcoat: 0.6 }),
    steel: K.mat([0.82, 0.84, 0.86], 0.2, { metal: 1 }), cream: K.mat([0.96, 0.93, 0.85], 0.5), brown: K.mat([0.35, 0.20, 0.12], 0.6), green: K.mat([0.45, 0.58, 0.25], 0.5),
  };
  room(K, { x0: -3.6, x1: 3.6, y0: -8, y1: 2.6, h: 2.9, wall: M.wall, floor: M.floor, ceil: M.cream });
  // the bench run along the back wall: base cabinets, splashback tiles, wall cabinets, the sink under the window
  K.box([-3.6, 1.95, 0], [0.2, 2.6, 0.88], M.cab, { r: 0.015 }); K.box([-3.62, 1.9, 0.88], [0.22, 2.6, 0.93], M.bench, { r: 0.01 });
  for (let x = -3.5; x < 0.1; x += 0.6) { K.box([x + 0.02, 1.92, 0.12], [x + 0.56, 1.96, 0.84], M.cab, { r: 0.015 }); K.cube([x + 0.29, 1.9, 0.7], [0.1, 0.02, 0.02], M.steel, { r: 0.006 }); }
  K.box([-3.6, 2.58, 0.93], [0.2, 2.6, 1.5], M.tileW, { r: 0 });
  K.box([-3.6, 2.15, 1.9], [-2.4, 2.6, 2.7], M.cab, { r: 0.015 }); K.box([-0.8, 2.15, 1.9], [0.2, 2.6, 2.7], M.cab, { r: 0.015 });
  windowY(K, { cx: -1.6, y: 2.59, z0: 1.3, w: 1.3, h: 1.1, frame: M.cream, view: morning(), viewK: 1.35, mull: [2, 1] });
  K.box([-2.3, 2.05, 0.9], [-0.9, 2.5, 0.935], M.steel, { r: 0.01 }); K.box([-2.2, 2.1, 0.75], [-1.0, 2.45, 0.92], M.steel, { r: 0.02 });
  K.cyl([-1.6, 2.5, 1.05], 0.012, 0.25, M.steel); K.cyl([-1.6, 2.42, 1.17], 0.012, 0.18, M.steel, { axis: 'y' });
  // kettle, toaster, a fruit bowl, canisters, a curtain
  K.lathe([-0.4, 2.3, 0.93], [[0, 0], [0.12, 0], [0.13, 0.05], [0.12, 0.18], [0.06, 0.24], [0, 0.25]], M.steel); K.torus([-0.4, 2.3, 1.2], 0.07, 0.012, M.brown, { rx: 0 });
  K.cube([-2.9, 2.3, 1.03], [0.3, 0.18, 0.2], M.steel, { r: 0.04 });
  for (let i = 0; i < 3; i++) K.cyl([-3.35 + i * 0.16, 2.4, 1.03 + 0.02 * i], 0.06, 0.2 + 0.04 * i, [M.cream, M.green, K.mat([0.85, 0.45, 0.15], 0.4)][i]);
  K.card([-2.35, 2.5, 1.85], 0.4, 1.15, SURF.grad([[0, [0.95, 0.75, 0.35]], [1, [0.9, 0.6, 0.25]]]), { env: 0.5 }); K.card([-0.85, 2.5, 1.85], 0.4, 1.15, SURF.grad([[0, [0.95, 0.75, 0.35]], [1, [0.9, 0.6, 0.25]]]), { env: 0.5 });
  // fridge on the right
  K.box([2.5, 1.9, 0], [3.4, 2.55, 1.85], K.mat([0.90, 0.80, 0.55], 0.35, { physical: true, clearcoat: 0.6 }), { r: 0.06 }); K.box([2.5, 1.88, 1.15], [3.4, 1.9, 1.17], M.brown, { r: 0 });
  K.cube([2.6, 1.86, 1.4], [0.03, 0.04, 0.3], M.steel, { r: 0.01 });
  for (let i = 0; i < 5; i++) K.cube([2.7 + i * 0.13, 1.89, 1.6 + 0.05 * Math.sin(i)], [0.08, 0.005, 0.1], K.mat([[1, 0.3, 0.3], [0.3, 0.6, 1], [1, 0.85, 0.2], [0.4, 0.8, 0.4], [1, 0.5, 0.2]][i], 0.6), { r: 0.003 });
  // the breakfast table: round, check cloth, tea pot, toast rack, two cups
  const tb = K.group(PLACES.table.slice(0, 2).concat(0));
  K.cyl([0, 0, 0.37], 0.05, 0.72, M.brown, { parent: tb }); K.cyl([0, 0, 0.03], 0.3, 0.05, M.brown, { parent: tb });
  K.cyl([0, 0, 0.74], 0.62, 0.04, K.mat([1, 1, 1], 0.8, { map: SURF.checker([0.85, 0.2, 0.15], [0.96, 0.94, 0.9], 12) }), { parent: tb });
  K.lathe([0.15, 0.1, 0.76], [[0, 0], [0.08, 0], [0.11, 0.07], [0.09, 0.13], [0.03, 0.16], [0, 0.17]], K.mat([0.25, 0.55, 0.65], 0.3, { physical: true, clearcoat: 1 }), { parent: tb });
  for (const [x, y] of [[-0.3, -0.2], [0.3, -0.25]]) { K.lathe([x, y, 0.76], [[0, 0], [0.04, 0], [0.05, 0.08], [0, 0.08]], M.cream, { parent: tb }); K.cyl([x, y, 0.83], 0.045, 0.004, M.brown, { parent: tb }); }
  for (let i = 0; i < 3; i++) K.cube([-0.1 + i * 0.05, 0.25, 0.83], [0.02, 0.12, 0.12], K.mat([0.85, 0.62, 0.30], 0.9), { parent: tb, r: 0.01 });
  // wall clock (hands spin) and the calendar with days crossed off
  const clk = K.group(PLACES.clock); K.cyl([0, 0, 0], 0.24, 0.05, M.brown, { parent: clk, axis: 'y' }); K.cyl([0, -0.03, 0], 0.21, 0.02, M.cream, { parent: clk, axis: 'y' });
  const hh = K.group([0, -0.045, 0], 0, clk), mh = K.group([0, -0.05, 0], 0, clk); K.cube([0, 0, 0.05], [0.015, 0.005, 0.11], M.brown, { parent: hh }); K.cube([0, 0, 0.08], [0.01, 0.005, 0.17], M.brown, { parent: mh });
  K.anim('clock', clk, (f, v) => { const s = v('spin', 0); mh.rotation.z = -s * Math.PI * 2 * 6; hh.rotation.z = -1.0 - s * Math.PI * 2 * 0.5; });
  const cal = K.group(PLACES.calendar); K.card([0, 0, 0], 0.55, 0.62, tex(256, 300, (g, w, h) => { g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b6a3a'; g.fillRect(0, 0, w, 60);
    g.fillStyle = '#fff'; g.font = '900 40px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('JULY 1984', w / 2, 44); g.fillStyle = '#333'; g.font = '700 20px Arial';
    for (let i = 0; i < 28; i++) g.fillText(String(i + 1), 22 + (i % 7) * 35, 100 + Math.floor(i / 7) * 46); }), { parent: cal });
  const xm = K.mat([0.8, 0.08, 0.06], 0.6), crosses = [];
  for (let i = 0; i < 7; i++) { const x = K.group([-0.235 + i * 0.075, -0.004, 0.07], 0, cal); const a = K.cube([0, 0, 0], [0.06, 0.002, 0.008], xm, { parent: x, r: 0 }), b = K.cube([0, 0, 0], [0.06, 0.002, 0.008], xm, { parent: x, r: 0 }); a.rotation.z = 0.8; b.rotation.z = -0.8; crosses.push(x); }
  K.anim('calendar', cal, (f, v) => { const n = v('days', 0); crosses.forEach((c, i) => { c.visible = n > i + 0.3; }); });
  // the breath: a green cloud of soft puffs that rolls from Kip toward Mabel
  const cloud = K.group(PLACES.breath), puffs = [], R = rng(9), gm = K.mat([0.55, 0.85, 0.25], 0.9, { opacity: 0.75, emit: [0.15, 0.3, 0.05], emitK: 0.6 });
  for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + 0.06 * R(), 16, 12), gm); K.add(s, cloud, { cast: false }); puffs.push({ s, a: R() * 6.28, d: R(), z: (R() - 0.5) * 0.2 }); }
  K.anim('breath', cloud, (f, v) => { const t = v('puff', 0); cloud.visible = t > 0.01 && t < 0.99;
    puffs.forEach(q => { const k = Math.min(1, Math.max(0, t * 1.3 - q.d * 0.3)); q.s.position.copy(B(0.55 * k + 0.1 * Math.cos(q.a + f * 0.1) * k, 0.06 * Math.sin(q.a) * k, q.z * k + 0.08 * Math.sin(q.a + f * 0.12))); q.s.scale.setScalar(0.3 + 1.6 * k * (1 - 0.6 * Math.max(0, t - 0.7) / 0.3)); }); });
  // light: low morning sun through the window across the room, warm bounce, a pendant over the table
  K.area([-1.6, 2.3, 1.85], [0.5, -0.5, 0.5], 1.3, 1.1, [1, 0.82, 0.55], 12);
  K.cyl([0.9, 0.7, 2.6], 0.006, 0.6, M.brown); K.lathe([0.9, 0.7, 2.25], [[0.02, 0.1], [0.05, 0.08], [0.22, -0.04], [0.23, -0.05]], K.mat([0.85, 0.45, 0.12], 0.4, { side: 2 }));
  K.point([0.9, 0.7, 2.1], [1, 0.75, 0.45], 2.5, 4);
  return { props: K.props };
}
