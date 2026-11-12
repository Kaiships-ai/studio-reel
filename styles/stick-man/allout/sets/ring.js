// Boxing ring at night: a raised canvas square (6 m inside the ropes) with a printed centre logo, three ropes a side on
// padded corner posts (red and blue corners), a dark arena round it with rows of crowd silhouettes, a lighting truss
// overhead with hard top lights on the canvas and a haze-lit back wall. The fighters work on the canvas at z RING_Z.
// Keys: none. Marks: red / blue (the two corners' fighting spots), centre.
import * as THREE from 'three';
import { createKit, label, rng } from '../kit.js';

export const RING_Z = 1.0, HALF = 3.0;
export const SUN_DIR = [0.15, 0.25, -0.95];
export const SUN_CENTER = [0, 0, 1], SUN_HALF = 6;
export const PLACES = { centre: [0, 0, RING_Z], truss: [0, 0, 6.2] };
export const MARKS = { red: [-0.6, 0, RING_Z], blue: [0.6, 0, RING_Z], centre: [0, 0, RING_Z] };
export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-12, -12], [12, 12]]];
export const COLLIDE = [];

export async function build(stage) {
  const before = new Set(); stage.scene.traverse(o => before.add(o));
  const K = createKit(stage, { env: { top: [0.25, 0.25, 0.30], mid: [0.12, 0.12, 0.16], bottom: [0.05, 0.05, 0.07], panels: [{ dir: [0, 0, 1], size: 2, color: [1, 0.96, 0.9], power: 3 }] }, envK: 0.6 });
  stage.scene.background = new THREE.Color().setRGB(0.015, 0.016, 0.025);
  const R = rng(7), z = RING_Z, H = HALF;
  const M = {
    canvas: K.mat([0.58, 0.56, 0.54], 0.9), apron: K.mat([0.10, 0.14, 0.32], 0.7), floor: K.mat([0.06, 0.06, 0.08], 0.9),
    red: K.mat([0.78, 0.10, 0.10], 0.55), blue: K.mat([0.12, 0.24, 0.70], 0.55), white: K.mat([0.95, 0.95, 0.93], 0.6),
    steel: K.mat([0.55, 0.56, 0.60], 0.35, { metal: 0.8 }), rope: K.mat([0.92, 0.92, 0.90], 0.5), crowd: K.mat([0.07, 0.07, 0.10], 0.9),
  };
  // arena floor, the ring platform with its skirt, the canvas and the centre logo
  K.box([-14, -14, -0.02], [14, 14, 0], M.floor, { r: 0 });
  K.box([-H - 0.6, -H - 0.6, 0], [H + 0.6, H + 0.6, z - 0.04], M.apron, { r: 0.02 });
  K.box([-H - 0.6, -H - 0.6, z - 0.04], [H + 0.6, H + 0.6, z], M.canvas, { r: 0.01 });
  K.card([0, 0, z + 0.004], 2.4, 2.4, label('KAI', { w: 512, h: 512, bg: null, fg: '#1f3a8a', font: 'Arial Black', weight: 900 }), { rotX: -90, transparent: true, env: 0.8 });
  // corner posts (padded), three ropes a side; red corner at -x -y, blue at +x +y
  const corners = [[-H, -H, M.red], [H, H, M.blue], [-H, H, M.white], [H, -H, M.white]];
  for (const [x, y, pad] of corners) { K.cyl([x, y, z + 0.75], 0.06, 1.5, M.steel); K.cyl([x, y, z + 0.75], 0.11, 1.2, pad, { r2: 0.11 }); }
  for (const h of [0.45, 0.85, 1.25]) {
    for (const [a, b] of [[[-H, -H], [H, -H]], [[H, -H], [H, H]], [[H, H], [-H, H]], [[-H, H], [-H, -H]]]) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      K.cyl([mx, my, z + h], 0.025, len, M.rope, { axis: a[0] === b[0] ? 'y' : 'x', seg: 12 });
    }
  }
  // the crowd: rows of dark silhouettes on rising tiers on all four sides, a few faces catching the spill light
  const head = K.mat([0.10, 0.10, 0.13], 0.9), lit = K.mat([0.28, 0.24, 0.24], 0.8);
  for (let side = 0; side < 4; side++) for (let row = 0; row < 4; row++) for (let i = -8; i <= 8; i++) {
    if (R() < 0.12) continue;
    const d = H + 2.4 + row * 0.9, along = i * 0.62 + (R() - 0.5) * 0.2, zr = row * 0.45;
    const [x, y] = side === 0 ? [along, -d] : side === 1 ? [d, along] : side === 2 ? [-along, d] : [-d, -along];
    K.box([x - 0.22, y - 0.18, zr], [x + 0.22, y + 0.18, zr + 0.95 + R() * 0.2], M.crowd, { r: 0.08 });
    K.sphere([x, y, zr + 1.25 + R() * 0.15], 0.17, R() < 0.25 ? lit : head, { seg: 16 });
  }
  // the truss and its lights: four hard top lights on the canvas, a warm back light, a cold rim from behind
  K.box([-3.4, -3.4, 6.1], [3.4, -3.2, 6.3], M.steel, { r: 0 }); K.box([-3.4, 3.2, 6.1], [3.4, 3.4, 6.3], M.steel, { r: 0 });
  K.box([-3.4, -3.4, 6.1], [-3.2, 3.4, 6.3], M.steel, { r: 0 }); K.box([3.2, -3.4, 6.1], [3.4, 3.4, 6.3], M.steel, { r: 0 });
  for (const [x, y] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
    K.cyl([x, y, 6.0], 0.16, 0.3, M.steel); K.spot([x, y, 5.9], [x * 0.3, y * 0.3, z], [1, 0.97, 0.9], 16, { angle: 32, pen: 0.5, dist: 14, shadow: x < 0 && y < 0 });
  }
  K.point([0, 6.5, 3.5], [0.55, 0.65, 1.0], 6, 12); K.point([0, -6.5, 3.0], [1.0, 0.82, 0.6], 3, 12);
  // collision boxes from the real meshes above the canvas (posts, pads, ropes): the engine reports any body point in them
  stage.scene.updateMatrixWorld(true); const box = new THREE.Box3();
  stage.scene.traverse(o => { if (before.has(o) || !o.isMesh) return; box.setFromObject(o); if (box.isEmpty()) return;
    const lo = [box.min.x, -box.max.z, box.min.y], hi = [box.max.x, -box.min.z, box.max.y];
    if (hi[2] < z + 0.05 || Math.max(...hi.map((h, i) => h - lo[i])) > 7) return;
    COLLIDE.push({ name: o.name || 'ring mesh', lo, hi, grace: 0 }); });
  return { props: K.props };
}
