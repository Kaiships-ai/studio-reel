// A simple lab / classroom (generic interior, our own set): tiled floor, a pale back wall with a green chalkboard, a
// window with sky on the left, a long lab bench with two flasks, a shelf. Blender metres: x right, y into the room, z up.
// The camera stands in the open front of the room (y < 0) looking +y. Built from the SETS.md template.
import * as THREE from 'three';
import { lin } from '../../engine/look.js';
import { setKit, canvasTex } from './kit.js';

export const SUN_DIR = [0.50, 0.40, -0.77];                     // daylight through the window, from front-left
export const SUN_CENTER = [0, 0.8, 1.0], SUN_HALF = 5.0;
const WALL_Y = 2.6, BENCH = { x0: -1.3, x1: 1.3, y0: 0.55, y1: 1.15, h: 0.92 };
export const MARKS = { left: [-0.8, -0.35, 0], right: [0.8, -0.35, 0], center: [0, -0.35, 0], board: [-1.9, 1.9, 0], door: [3.2, 0.2, 0] };
export const PLACES = { bench_top: [0, 0.85, BENCH.h], board: [0, WALL_Y - 0.02, 1.9], flask_l: [-0.85, 0.85, BENCH.h], flask_r: [0.85, 0.85, BENCH.h], window: [-3.0, WALL_Y, 1.9] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-3.7, -9], [3.7, 0.3]]];
export const COLLIDE = [
  { name: 'bench', lo: [BENCH.x0, BENCH.y0, 0], hi: [BENCH.x1, BENCH.y1, BENCH.h] },
  { name: 'back-wall', lo: [-4.2, WALL_Y, 0], hi: [4.2, WALL_Y + 0.2, 3.6] },
  { name: 'shelf', lo: [2.3, 2.15, 0], hi: [3.7, WALL_Y, 2.0] },
];

export async function build(stage) {
  const k = setKit(stage), M = {
    wall: k.mat([0.93, 0.88, 0.76], 0.9), side: k.mat([0.86, 0.80, 0.68], 0.9), trim: k.mat([0.30, 0.48, 0.62], 0.6),
    bench: k.mat([0.18, 0.20, 0.24], 0.5), benchTop: k.mat([0.92, 0.92, 0.90], 0.4), wood: k.mat([0.58, 0.36, 0.18], 0.6),
    glass: new THREE.MeshStandardMaterial({ color: lin(0.70, 0.88, 0.95), roughness: 0.15 }), blue: k.mat([0.20, 0.50, 0.95], 0.3), red: k.mat([0.95, 0.30, 0.25], 0.3),
  };
  stage.scene.background = lin(0.62, 0.74, 0.86);
  // floor: big pale tiles
  const tiles = canvasTex(512, 512, (g, w, h) => { g.fillStyle = 'rgb(214,206,190)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgb(176,168,152)'; g.lineWidth = 6;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } }, true);
  tiles.repeat.set(6, 6);
  k.add(new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.8 })), false).position.set(0, -0.1, 3);
  // walls: back, left and right, a blue trim band
  k.box([-4.2, WALL_Y, 0], [4.2, WALL_Y + 0.2, 3.6], M.wall, false);
  k.box([-4.4, -9, 0], [-4.2, WALL_Y + 0.2, 3.6], M.side, false); k.box([4.2, -9, 0], [4.4, WALL_Y + 0.2, 3.6], M.side, false);
  k.box([-4.2, WALL_Y - 0.03, 0.95], [4.2, WALL_Y, 1.05], M.trim);
  // chalkboard: wood frame, green face with chalk sketches (circles, arrows, a wave)
  k.box([-1.75, WALL_Y - 0.06, 1.15], [1.75, WALL_Y, 2.65], M.wood);
  const chalk = canvasTex(1400, 600, (g, w, h) => {
    g.fillStyle = 'rgb(40,92,64)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(236,240,230,0.85)'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(220, 260, 110, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(220, 260, 40, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(400, 260); g.lineTo(640, 260); g.lineTo(610, 235); g.moveTo(640, 260); g.lineTo(610, 285); g.stroke();
    g.beginPath(); for (let x = 720; x < 1260; x += 6) g.lineTo(x, 260 + 60 * Math.sin((x - 720) / 40)); g.stroke();
    g.beginPath(); g.moveTo(140, 470); g.lineTo(1260, 470); g.stroke();
  });
  k.card([0, WALL_Y - 0.065, 1.9], 3.3, 1.38, chalk);
  // window on the left: frame and sky
  const sky = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(96,160,228)'); gr.addColorStop(1, 'rgb(186,214,240)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  k.card([-3.0, WALL_Y - 0.01, 1.95], 1.4, 1.5, sky);
  for (const x of [-3.72, -3.0, -2.28]) k.box([x - 0.04, WALL_Y - 0.06, 1.18], [x + 0.04, WALL_Y, 2.72], M.trim);
  for (const z of [1.18, 2.72]) k.box([-3.76, WALL_Y - 0.06, z - 0.04], [-2.24, WALL_Y, z + 0.04], M.trim);
  // the lab bench with two flasks
  k.box([BENCH.x0, BENCH.y0, 0], [BENCH.x1, BENCH.y1, BENCH.h - 0.05], M.bench);
  k.box([BENCH.x0 - 0.05, BENCH.y0 - 0.05, BENCH.h - 0.05], [BENCH.x1 + 0.05, BENCH.y1 + 0.05, BENCH.h], M.benchTop);
  for (const [x, m] of [[-0.85, M.blue], [0.85, M.red]]) {
    k.cyl([x, 0.85, BENCH.h + 0.09], 0.09, 0.18, M.glass, { r2: 0.035 }); k.cyl([x, 0.85, BENCH.h + 0.06], 0.075, 0.10, m, { r2: 0.05 });
    k.cyl([x, 0.85, BENCH.h + 0.24], 0.03, 0.12, M.glass);
  }
  // a shelf with books on the right
  k.box([2.3, 2.15, 0], [3.7, WALL_Y, 2.0], M.wood);
  for (let i = 0; i < 9; i++) k.box([2.38 + i * 0.14, 2.12, 1.25], [2.48 + i * 0.14, 2.3, 1.25 + 0.30 + 0.08 * ((i * 7) % 3)], k.mat([[0.85, 0.3, 0.25], [0.25, 0.45, 0.85], [0.95, 0.75, 0.25]][i % 3], 0.6));
  stage.addBounce([0, -0.6, 0.4], [1.0, 0.90, 0.75], 1.0, 5.0);
  stage.addBounce([-3.0, 1.5, 1.8], [0.80, 0.90, 1.0], 0.8, 4.0);
  return { props: {} };
}
