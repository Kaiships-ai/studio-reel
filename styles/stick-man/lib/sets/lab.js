// A simple lab / classroom (generic interior, our own set): tiled floor, a pale back wall with a green chalkboard, a
// window with sky on the left, a long lab bench with two flasks, a shelf. Blender metres: x right, y into the room, z up.
// The camera stands in the open front of the room (y < 0) looking +y. Built from the SETS.md template.
import * as THREE from 'three';
import { lin } from '../../engine/look.js';
import { setKit, canvasTex } from './kit.js';
import { dressKit, resetCollide, signTex } from './dress.js';

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
const BASE = COLLIDE.slice();
// dressing: a real school science lab. Clear floor kept for the cast: x -1.7..1.7, y -1.6..0.45, and the board and door
// marks (-1.9, 1.9) and (3.2, 0.2)
export function dress(stage) {
  const D = dressKit(stage, COLLIDE), S = { solid: true }, T = BENCH.h;
  // on the bench: a rack of coloured flasks, a burner, a microscope, a notebook; stools tucked behind
  D.put('flasks', [0.05, 0.72, T], 0, { seed: 3 }); D.put('burner', [-0.42, 0.95, T], 0); D.put('microscope', [0.45, 0.95, T], 20);
  for (const x of [-0.95, 0, 0.95]) D.put('stool', [x, 1.45, 0], 0, { c: 'blue' });
  // the back wall: a wall clock over the board, posters (periodic table, safety), a notice board, pipes in the corners
  D.put('clock', [0, WALL_Y - 0.04, 3.05], 0); D.put('poster', [2.55, WALL_Y - 0.03, 2.2], 0, { title: 'ATOMS', bg: [0.35, 0.65, 0.95], shape: 'circle', w: 0.55, h: 0.75 });
  D.put('poster', [3.3, WALL_Y - 0.03, 2.2], 0, { title: 'GOGGLES!', bg: [1.0, 0.80, 0.16], shape: 'star', seed: 3, w: 0.55, h: 0.75 });
  D.put('pipe', [-4.1, WALL_Y - 0.08, 0], 0, { h: 3.6 }); D.put('pipe', [4.1, WALL_Y - 0.08, 0], 0, { h: 3.6 });
  D.put('sign', [3.9, 1.3, 2.25], -90, { text: 'LAB 2', sub: 'SAFETY FIRST', w: 0.7, h: 0.4, bg: [0.12, 0.45, 0.30], fg: [1, 1, 1], pole: 0 });
  // left wall: the sink with a jar shelf over it, a skeleton, an extinguisher, a notice board, a tall plant
  D.put('sink', [-3.75, 1.6, 0], 90, S); D.put('shelf', [-4.05, 1.6, 1.25], 90, { w: 1.2, h: 0.9, items: 'jars', seed: 6 });
  D.put('skeleton', [-3.5, -0.3, 0], 70, S); D.put('extinguisher', [-4.05, -1.4, 0.0], 90, S);
  D.put('noticeboard', [-4.17, -2.6, 1.1], 90, { w: 1.3, h: 0.9 }); D.put('pot', [-2.9, 2.25, 0], 0, { s: 1.3, ...S });
  // right side: the teacher's desk with a globe and papers, lockers on the wall, a bin, a stack of boxes
  D.put('table', [3.0, 1.45, 0], 0, { w: 1.2, d: 0.7, c: 'wood', ...S }); D.put('globe', [3.25, 1.5, 0.76], 0); D.put('toolbox', [2.7, 1.45, 0.76], 0, { c: 'blue' });
  D.put('lockers', [4.0, -1.4, 0], -90, { n: 4, c: 'teal', ...S }); D.put('bin', [2.4, 2.1, 0], 0, { c: 'greyD', ...S }); D.put('crates', [3.2, -3.4, 0], -20, { c: 'cream', ...S });
  // the ceiling: beams and two strip lights, like a real classroom
  D.put('ceilinglight', [-1.4, 0.6, 3.0], 0, { w: 1.6 }); D.put('ceilinglight', [1.4, 0.6, 3.0], 0, { w: 1.6 });
  // the board wall, at the height a medium shot sees: notes taped to the board, a conduit with boxes, an exit sign, a
  // projector over the room, a speaker box, a thermostat, pennants; on the bench a goggles box and a notebook
  D.put('notes', [-1.2, WALL_Y - 0.07, 2.25], 0, { w: 0.8 }); D.put('notes', [1.1, WALL_Y - 0.07, 2.3], 0, { w: 0.7, seed: 7 });
  D.put('conduit', [0, WALL_Y - 0.02, 3.2], 0, { w: 8 }); D.put('exitsign', [3.2, WALL_Y - 0.02, 2.75], 0); D.put('wallbox', [-1.95, WALL_Y - 0.02, 1.7], 0);
  D.put('wallbox', [1.95, WALL_Y - 0.02, 1.4], 0, { c: 'cream' }); D.put('projector', [0, -0.8, 2.45], 0);
  D.put('goggles', [-0.85, 0.7, T], 10); D.put('book', [0.85, 0.72, T], -12, { c: 'blue' }); D.put('book', [0.15, 1.0, T], 30, { c: 'green' });
  // low cabinets along the back wall either side of the board, their tops busy: a fish tank, beakers, books, a plant
  for (const [x0, x1] of [[-4.15, -1.85], [1.85, 2.25]]) D.put('table', [(x0 + x1) / 2, WALL_Y - 0.35, 0], 0, { w: x1 - x0, d: 0.6, h: 0.9, c: 'teal', ...S });
  D.put('fishtank', [-3.5, WALL_Y - 0.35, 0.9], 0); D.put('flasks', [-2.4, WALL_Y - 0.35, 0.9], 0, { seed: 8 }); D.put('pot', [2.05, WALL_Y - 0.35, 0.9], 0, { s: 0.6 });
  D.put('shelf', [-3.0, WALL_Y - 0.36, 2.75], 0, { w: 1.6, h: 0.5, items: 'books', seed: 9 });
  // front corners near the camera: two student desks, a backpack
  D.put('desk', [-3.1, -2.6, 0], 15, { ...S }); D.put('desk', [3.0, -5.6, 0], -15, { seed: 3, ...S }); D.put('sack', [-2.2, -2.9, 0], 0, { c: 'red' });
  D.put('scatter', [0.4, -2.6, 0], 0, { w: 3, d: 1.5, kind: 'litter', n: 6, seed: 4 }); D.put('ball', [-1.6, -2.0, 0], 0, { c: 'orange', r: 0.11 });
}

export async function build(stage) {
  resetCollide(COLLIDE, BASE);
  const R = dressKit(stage); let s;
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
  // ceiling with beams (no ink on the slab)
  k.box([-4.4, -9, 3.6], [4.4, WALL_Y + 0.2, 3.8], M.side, false).castShadow = false;
  s = R.mark(); for (const y of [-3.0, -0.6, 1.8]) k.box([-4.2, y - 0.12, 3.35], [4.2, y + 0.12, 3.6], M.trim).castShadow = false; R.since(s, 'beams');
  // chalkboard: wood frame
  s = R.mark();                                                  // green face with chalk sketches
  k.box([-1.75, WALL_Y - 0.06, 1.15], [1.75, WALL_Y, 2.65], M.wood);
  const chalk = canvasTex(1400, 600, (g, w, h) => {
    g.fillStyle = 'rgb(40,92,64)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(236,240,230,0.85)'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(220, 260, 110, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(220, 260, 40, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(400, 260); g.lineTo(640, 260); g.lineTo(610, 235); g.moveTo(640, 260); g.lineTo(610, 285); g.stroke();
    g.beginPath(); for (let x = 720; x < 1260; x += 6) g.lineTo(x, 260 + 60 * Math.sin((x - 720) / 40)); g.stroke();
    g.beginPath(); g.moveTo(140, 470); g.lineTo(1260, 470); g.stroke();
  });
  k.card([0, WALL_Y - 0.065, 1.9], 3.3, 1.38, chalk);
  k.box([-1.6, WALL_Y - 0.16, 1.1], [1.6, WALL_Y - 0.06, 1.15], M.wood); R.since(s, 'chalkboard');
  // window on the left: frame and sky
  s = R.mark();
  const sky = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(96,160,228)'); gr.addColorStop(1, 'rgb(186,214,240)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  k.card([-3.0, WALL_Y - 0.01, 1.95], 1.4, 1.5, sky);
  for (const x of [-3.72, -3.0, -2.28]) k.box([x - 0.04, WALL_Y - 0.06, 1.18], [x + 0.04, WALL_Y, 2.72], M.trim);
  for (const z of [1.18, 2.72]) k.box([-3.76, WALL_Y - 0.06, z - 0.04], [-2.24, WALL_Y, z + 0.04], M.trim);
  R.since(s, 'window');
  // the lab bench with two flasks
  s = R.mark();
  k.box([BENCH.x0, BENCH.y0, 0], [BENCH.x1, BENCH.y1, BENCH.h - 0.05], M.bench);
  k.box([BENCH.x0 - 0.05, BENCH.y0 - 0.05, BENCH.h - 0.05], [BENCH.x1 + 0.05, BENCH.y1 + 0.05, BENCH.h], M.benchTop);
  for (const [x, m] of [[-0.85, M.blue], [0.85, M.red]]) {
    k.cyl([x, 0.85, BENCH.h + 0.09], 0.09, 0.18, M.glass, { r2: 0.035 }); k.cyl([x, 0.85, BENCH.h + 0.06], 0.075, 0.10, m, { r2: 0.05 });
    k.cyl([x, 0.85, BENCH.h + 0.24], 0.03, 0.12, M.glass);
  }
  R.since(s, 'bench');
  // a shelf with books on the right
  s = R.mark();
  k.box([2.3, 2.15, 0], [3.7, WALL_Y, 2.0], M.wood);
  for (let i = 0; i < 9; i++) k.box([2.38 + i * 0.14, 2.12, 1.25], [2.48 + i * 0.14, 2.3, 1.25 + 0.30 + 0.08 * ((i * 7) % 3)], k.mat([[0.85, 0.3, 0.25], [0.25, 0.45, 0.85], [0.95, 0.75, 0.25]][i % 3], 0.6));
  R.since(s, 'bookshelf');
  dress(stage);
  stage.addBounce([0, -0.6, 0.4], [1.0, 0.90, 0.75], 1.0, 5.0);
  stage.addBounce([-3.0, 1.5, 1.8], [0.80, 0.90, 1.0], 0.8, 4.0);
  return { props: {} };
}
