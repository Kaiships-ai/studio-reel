// The animal house, 1983 (ep 1 l06): a whitewashed barn room with a timber pen, straw, a feed trough, three healthy
// piglets, warm morning light through a high window (beams in the dust), a calendar whose pages fly off (six months),
// a clipboard "PIGLET TRIAL" with crosses. Keys: calendar n 0..6 (pages torn off), pigs trot 0..1 (they bounce about).
import * as THREE from 'three';
import { createKit, room, windowY, SURF, label, tex, rng, B } from '../kit.js';
import { daySky } from './lab-night.js';

export const SUN_DIR = [0.55, 0.65, -0.52];
export const SUN_CENTER = [0, 1, 0.5], SUN_HALF = 5;
export const PLACES = { bowl: [0.12, 0.45, 0.1], pen: [0.9, 0.9, 0.3], calendar: [-2.2, 2.78, 1.8], clip: [-1.55, 0.45, 1.05], pig1: [0.5, 0.8, 0], pig2: [1.2, 1.25, 0], pig3: [1.5, 0.55, 0] };
export const MARKS = { kip: [-0.75, 0.1, 0] };
export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-3.8, -8], [3.8, 0.4]]]; export const COLLIDE = [{ name: 'pen', lo: [-0.1, 0.0, 0], hi: [2.4, 2.2, 0.8] }];

export function piglet(K, at, s = 1, seed = 1) {
  const pink = K.mat([0.98, 0.70, 0.68], 0.55, { physical: true, sheen: 0.6, sheenColor: [1, 0.85, 0.85] }), dark = K.mat([0.1, 0.08, 0.08], 0.4), snout = K.mat([0.95, 0.55, 0.55], 0.5);
  const g = K.group(at, 0), b = K.group([0, 0, 0], 0, g);
  K.sphere([0, 0, 0.2 * s], 0.2 * s, pink, { parent: b, sy: 1.35, sz: 0.9 });
  K.sphere([0, -0.25 * s, 0.26 * s], 0.13 * s, pink, { parent: b });
  K.cyl([0, -0.37 * s, 0.25 * s], 0.055 * s, 0.05 * s, snout, { parent: b, axis: 'y' }); for (const x of [-0.02, 0.02]) K.sphere([x * s, -0.4 * s, 0.25 * s], 0.01 * s, dark, { parent: b });
  for (const x of [-0.05, 0.05]) { K.sphere([x * s, -0.34 * s, 0.31 * s], 0.017 * s, dark, { parent: b }); const e = K.cube([x * 1.6 * s, -0.22 * s, 0.38 * s], [0.06 * s, 0.02 * s, 0.07 * s], pink, { parent: b, r: 0.01 * s }); e.rotation.z = x > 0 ? 0.5 : -0.5; }
  for (const x of [-0.09, 0.09]) for (const y of [-0.15, 0.15]) K.cyl([x * s, y * s, 0.06 * s], 0.035 * s, 0.12 * s, pink, { parent: b });
  K.torus([0, 0.28 * s, 0.25 * s], 0.03 * s, 0.008 * s, pink, { parent: b, arc: 5 });
  return { g, b };
}

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.85, 0.80, 0.70], mid: [0.75, 0.65, 0.50], bottom: [0.55, 0.45, 0.30], panels: [{ dir: [-0.5, 0.6, 0.6], size: 3, color: [1, 0.9, 0.7], power: 4 }] }, envK: 0.7 });
  stage.scene.background = null;
  const M = {
    wall: K.mat([0.92, 0.89, 0.82], 0.95, { map: SURF.brick([0.93, 0.90, 0.84], [0.80, 0.77, 0.70], 5) }), floor: K.mat([0.62, 0.58, 0.52], 0.9),
    timber: K.mat([0.62, 0.42, 0.24], 0.7, { map: SURF.wood([0.62, 0.42, 0.24], 2, 9) }), straw: K.mat([0.92, 0.76, 0.38], 0.95), beam: K.mat([0.38, 0.25, 0.14], 0.7),
    steel: K.mat([0.6, 0.62, 0.64], 0.4, { metal: 0.7 }),
  };
  room(K, { x0: -3.8, x1: 3.8, y0: -8, y1: 2.8, h: 3.6, wall: M.wall, floor: M.floor, ceiling: false });
  for (let x = -3.6; x < 3.8; x += 1.4) K.box([x, -6, 3.2], [x + 0.18, 2.8, 3.42], M.beam, { r: 0.02 });
  K.box([-3.8, -8, 3.6], [3.8, 2.8, 3.7], M.beam, { r: 0, cast: true });
  windowY(K, { cx: 1.2, y: 2.79, z0: 2.0, w: 1.4, h: 1.0, frame: M.beam, view: daySky(5), viewK: 1.4, mull: [3, 2] });
  K.area([1.2, 2.5, 2.5], [0.8, 0.5, 0], 1.4, 1.0, [1, 0.88, 0.65], 10);
  // the pen: posts and rails, straw heaps, a trough, a water bowl
  const post = (x, y) => K.cube([x, y, 0.45], [0.1, 0.1, 0.9], M.timber, { r: 0.015 });
  for (const [x, y] of [[-0.1, 0.0], [1.15, 0.0], [2.4, 0.0], [-0.1, 2.2], [-0.1, 1.1]]) post(x, y);
  for (const z of [0.3, 0.65]) { K.box([-0.12, -0.04, z], [2.42, 0.04, z + 0.1], M.timber, { r: 0.015 }); K.box([-0.14, 0.0, z], [-0.06, 2.2, z + 0.1], M.timber, { r: 0.015 }); }
  const R = rng(17), strawG = new THREE.CylinderGeometry(0.004, 0.004, 0.16, 4);
  const straw = new THREE.InstancedMesh(strawG, M.straw, 2600), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 2600; i++) { const x = -0.1 + R() * 3.5, y = -0.2 + R() * 2.9; e.set(Math.PI / 2 + (R() - 0.5) * 0.6, R() * 6, (R() - 0.5) * 0.6); q.setFromEuler(e);
    m4.compose(B(x - 0.4 * (x > 2.4), y, 0.01 + 0.05 * R() + 0.2 * Math.max(0, 1 - Math.hypot(x - 2.2, y - 1.9) / 0.9)), q, new THREE.Vector3(1, 1, 1)); straw.setMatrixAt(i, m4); }
  K.add(straw);
  for (const [x, y, s] of [[2.3, 1.9, 0.6], [0.3, 2.0, 0.4]]) K.sphere([x, y, 0], s, M.straw, { sz: 0.55, seg: 20 });
  K.box([0.3, 1.7, 0], [1.3, 2.0, 0.22], M.timber, { r: 0.03 }); K.box([0.36, 1.76, 0.12], [1.24, 1.94, 0.2], K.mat([0.75, 0.62, 0.38], 0.9), { r: 0.01 });
  K.cyl([0.12, 0.45, 0.05], 0.16, 0.1, M.steel, { r2: 0.18 }); const milk = K.cyl([0.12, 0.45, 0.09], 0.14, 0.01, K.mat([0.96, 0.95, 0.9], 0.3));
  K.anim('bowl', milk, (f, v) => { milk.material.color.setRGB(0.96 - 0.5 * v('green', 0), 0.95 - 0.2 * v('green', 0), 0.9 - 0.6 * v('green', 0)); });
  // three piglets that trot about (key trot), heads up and happy
  const pigs = [piglet(K, PLACES.pig1, 1.0, 1), piglet(K, PLACES.pig2, 0.9, 2), piglet(K, PLACES.pig3, 1.05, 3)];
  pigs[0].g.rotation.y = 0.6; pigs[1].g.rotation.y = -0.4; pigs[2].g.rotation.y = 2.4;
  const pg = K.group([0, 0, 0]); K.anim('pigs', pg, (f, v) => { const t = v('trot', 0); pigs.forEach((p, i) => { const ph = f * 0.45 + i * 2; p.b.position.y = 0.03 * t * Math.abs(Math.sin(ph)); p.b.rotation.z = 0.08 * t * Math.sin(ph * 0.5);
    p.g.position.copy(B(...[PLACES.pig1, PLACES.pig2, PLACES.pig3][i].map((c, k) => c + (k < 2 ? 0.12 * t * Math.sin(f * 0.05 + i + k) : 0)))); }); });
  // calendar with 6 tearable pages and a clipboard of failed trials
  const cal = K.group(PLACES.calendar); K.cube([0, 0.01, 0], [0.5, 0.02, 0.7], M.beam, { parent: cal, r: 0.01 });
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'], pages = months.map((mn, i) => K.card([0, -0.005 - (6 - i) * 0.002, -0.03], 0.44, 0.56, label([mn, { t: '1983', s: 0.45 }], { w: 256, h: 320, bg: '#f8f4ea', fg: i % 2 ? '#1d4f8a' : '#b8231c' }), { parent: cal }));
  K.anim('calendar', cal, (f, v) => { const n = v('n', 0); pages.forEach((p, i) => { const k = Math.min(1, Math.max(0, n - i)); p.visible = k < 1; p.position.copy(B(0.4 * k * k, -0.01 - (6 - i) * 0.002 - 0.3 * k, -0.03 + 0.2 * k - 0.9 * k * k)); p.rotation.z = -1.4 * k; }); });
  const clip = K.group(PLACES.clip, 15); K.cube([0, 0, 0], [0.3, 0.02, 0.4], M.beam, { parent: clip, r: 0.01 });
  K.card([0, -0.012, -0.02], 0.26, 0.34, tex(200, 260, (g, w, h) => { g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = '900 22px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('PIGLET TRIAL', w / 2, 30);
    g.font = '700 16px Arial'; g.textAlign = 'left'; ['PIG 1  well', 'PIG 2  well', 'PIG 3  well', 'month 6  well'].forEach((s, i) => { g.fillStyle = '#222'; g.fillText(s, 16, 70 + i * 40); g.strokeStyle = '#c1271d'; g.lineWidth = 4; g.beginPath(); g.moveTo(150, 58 + i * 40); g.lineTo(180, 76 + i * 40); g.moveTo(180, 58 + i * 40); g.lineTo(150, 76 + i * 40); g.stroke(); }); }), { parent: clip });
  K.cube([-1.55, 0.45, 0.5], [0.5, 0.4, 1.0], M.timber, { r: 0.02 });
  // a hanging work lamp, buckets, a feed sack
  K.cyl([-0.6, 0.6, 3.0], 0.006, 1.2, M.beam); const sh = K.lathe([-0.6, 0.6, 2.35], [[0.02, 0.1], [0.06, 0.08], [0.2, -0.02], [0.21, -0.03]], K.mat([0.3, 0.45, 0.35], 0.4, { side: 2 }));
  K.sphere([-0.6, 0.6, 2.33], 0.04, K.glow([1, 0.85, 0.6], 3)); K.point([-0.6, 0.6, 2.2], [1, 0.78, 0.5], 3, 4);
  K.cyl([-3.2, 1.8, 0.2], 0.17, 0.4, M.steel, { r2: 0.2 }); K.cyl([-2.8, 2.2, 0.2], 0.17, 0.4, K.mat([0.75, 0.2, 0.15], 0.5), { r2: 0.2 });
  K.cube([-2.9, 1.5, 0.35], [0.5, 0.35, 0.7], K.mat([0.82, 0.74, 0.55], 0.95), { r: 0.12 }); K.card([-2.9, 1.32, 0.4], 0.35, 0.2, label('FEED', { w: 256, h: 128, bg: null, fg: '#7a2e14' }), { transparent: true });
  return { props: K.props };
}
