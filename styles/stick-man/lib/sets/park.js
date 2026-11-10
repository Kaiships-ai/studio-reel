// A sunny park, midday (generic outdoor open space, our own set): grass, a sandy path across, a hedge and round trees
// behind, a bench, a lamp, a big sun up left for light-ray explainers. Blender metres: x right, y into the scene, z up.
// The camera stands on the near grass (y < 0) looking +y. Built from the SETS.md template.
import * as THREE from 'three';
import { B, lin } from '../../engine/look.js';
import { setKit, canvasTex } from './kit.js';

export const SUN_DIR = [0.30, 0.42, -0.86];                     // high noon sun from front-left: faces stay lit
export const SUN_CENTER = [0, 0.5, 0.8], SUN_HALF = 9.0;
export const MARKS = { left: [-0.9, -0.2, 0], right: [0.9, -0.2, 0], center: [0, -0.2, 0], bench: [-3.3, 1.2, 0], walk_start: [-5.5, 0.2, 0], tree: [3.6, 2.2, 0] };
export const PLACES = { sun: [-3.2, 9.0, 7.2], sky: [0, 2.0, 3.6], bench_seat: [-3.3, 1.55, 0.46], lamp: [5.6, 1.4, 0], ground: [0, -0.2, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-12, -14], [12, 0.9]]];
export const COLLIDE = [
  { name: 'bench', lo: [-4.3, 1.35, 0], hi: [-2.3, 1.85, 0.9] },
  { name: 'tree-trunk', lo: [3.45, 2.05, 0], hi: [3.75, 2.35, 2.2] },
  { name: 'lamp', lo: [5.5, 1.3, 0], hi: [5.7, 1.5, 4.2] },
];

export async function build(stage) {
  const k = setKit(stage), M = {
    grass: k.mat([0.30, 0.62, 0.22], 0.95), grass2: k.mat([0.26, 0.55, 0.20], 0.95), path: k.mat([0.86, 0.72, 0.48], 0.95),
    hedge: k.mat([0.14, 0.42, 0.16], 0.8), leaf: k.mat([0.20, 0.52, 0.20], 0.75), leaf2: k.mat([0.32, 0.62, 0.22], 0.75),
    bark: k.mat([0.32, 0.18, 0.08], 0.8), wood: k.mat([0.62, 0.34, 0.14], 0.6), iron: k.mat([0.10, 0.12, 0.14], 0.5),
  };
  k.sky([54, 126, 214], [178, 210, 240]);
  // the sun: a bright disc with a soft halo, far up left (rays explainers start here)
  { const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 16), new THREE.MeshBasicMaterial({ color: lin(1.0, 0.72, 0.10).multiplyScalar(1.6), fog: false }));
    s.position.copy(B(...PLACES.sun)); s.castShadow = false; stage.scene.add(s); stage.glow(s, 0.9);
    const ink = new THREE.Mesh(new THREE.SphereGeometry(0.96, 32, 16), new THREE.MeshBasicMaterial({ color: lin(0.75, 0.42, 0.05), side: THREE.BackSide })); s.add(ink); }
  // ground: mown grass with darker stripes, the sandy path across the middle
  const stripes = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgb(112,150,84)' : 'rgb(100,138,74)'; g.fillRect(0, i * h / 8, w, h / 8); } }, true);
  stripes.repeat.set(6, 6);
  k.add(new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 60), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.95 })), false).position.copy(B(0, 0, -0.1));
  k.box([-30, -1.0, -0.005], [30, 0.6, 0.012], M.path, false);
  // back: a long hedge and round trees, a few further trees for depth
  k.box([-30, 4.6, 0], [30, 5.6, 1.3], M.hedge);
  for (const [x, y, s] of [[-7.5, 3.6, 1.0], [-1.5, 6.4, 1.2], [7.8, 3.8, 1.1], [12, 6.8, 1.3], [-12.5, 6.2, 1.2]]) {
    k.cyl([x, y, 1.1 * s], 0.13 * s, 2.2 * s, M.bark, { r2: 0.10 * s });
    k.sphere([x, y, 2.8 * s], 1.05 * s, M.leaf); k.sphere([x - 0.6 * s, y - 0.2, 2.35 * s], 0.7 * s, M.leaf2); k.sphere([x + 0.6 * s, y - 0.1, 2.45 * s], 0.72 * s, M.leaf);
  }
  // the near tree at MARKS.tree (shade to stand in)
  k.cyl([3.6, 2.2, 1.1], 0.15, 2.2, M.bark, { r2: 0.11 });
  k.sphere([3.6, 2.2, 3.0], 1.25, M.leaf); k.sphere([2.9, 2.0, 2.6], 0.8, M.leaf2); k.sphere([4.3, 2.1, 2.7], 0.85, M.leaf);
  // bench: slats on two iron frames
  for (const x of [-4.1, -2.5]) { k.box([x - 0.04, 1.35, 0], [x + 0.04, 1.85, 0.44], M.iron); k.box([x - 0.04, 1.78, 0.44], [x + 0.04, 1.85, 0.9], M.iron); }
  for (const y of [1.40, 1.55, 1.70]) k.box([-4.3, y - 0.05, 0.44], [-2.3, y + 0.05, 0.48], M.wood);
  for (const z of [0.62, 0.80]) k.box([-4.3, 1.80, z - 0.05], [-2.3, 1.86, z + 0.05], M.wood);
  // lamp post
  k.cyl([5.6, 1.4, 2.0], 0.06, 4.0, M.iron); k.sphere([5.6, 1.4, 4.15], 0.20, k.mat([1.0, 0.96, 0.84], 0.3));
  stage.addBounce([0, -1.0, 0.3], [0.80, 1.0, 0.62], 0.9, 6.0);
  return { props: {} };
}
