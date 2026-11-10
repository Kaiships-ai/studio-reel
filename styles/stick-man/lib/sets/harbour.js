// harbour: a working fishing pier by day (our own design, modelled in Blender: tools/interiors.py ->
// assets/interiors/harbour_*.glb, GLB.md). Plank deck on piles, a brick warehouse "PIER 9" with two big doors, a moored
// red fishing boat, a yellow dock crane, a fish stall under a striped awning, crates and barrels, bollards, rope, gulls.
// Blender metres: x along the pier, y toward the warehouse (wall y = 4), z up; the sea is y < -5; camera on the y < 0 side.
import { setKit } from './kit.js';
import { glbKit } from './glb.js';
import { dressKit } from './dress.js';

export const SUN_DIR = [0.35, 0.55, -0.76];
export const SUN_CENTER = [0, 0, 1.0], SUN_HALF = 12.0;
export const MARKS = { left: [-1.0, -2.4, 0], right: [1.0, -2.4, 0], center: [0, -2.4, 0], edge: [0.5, -4.4, 0], stall: [4.6, 1.2, 0] };
export const PLACES = { boat: [3.0, -6.5, 1.0], crane: [-8.0, 1.5, 6.0], sea: [0, -10, 0], door: [-5.75, 3.9, 1.8] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-11, -16], [11, 3.0]]];
export const SHOTS = { wide: { shot: 'wide', lens: 17, h: 1.7, headY: 0.56, size: 0.30, angle: 18 }, medium: { shot: 'ms', angle: 10, size: 0.42 }, close: { shot: 'cu' } };
export const COLLIDE = [];
const PIECES = ['harbour_boat', 'harbour_crane', 'harbour_stall', 'harbour_cargo', 'harbour_deck', 'harbour_warehouse', 'harbour_doors', 'harbour_sign', 'harbour_windows', 'harbour_lamps'];
const DECOR = ['harbour_deck', 'harbour_warehouse', 'harbour_doors', 'harbour_sign', 'harbour_windows', 'harbour_lamps'];

export async function build(stage) {
  const k = setKit(stage), g = glbKit(stage, 'interiors', COLLIDE);
  await g.load(PIECES);
  k.sky([60, 128, 210], [190, 214, 238]);
  k.box([-90, -90, -1.2], [90, -5.1, -0.6], k.mat([0.14, 0.42, 0.62], 0.4), false);          // sea (no ink)
  g.decor(DECOR);
  g.place('harbour_boat', [3.0, -6.4, 0]); g.place('harbour_crane', [-8.4, 1.4, 0]); g.place('harbour_stall', [5.6, 2.8, 0]); g.place('harbour_cargo', [-4.2, 2.9, 0]);
  const D = dressKit(stage, COLLIDE), S = { solid: true };
  for (const x of [-9, -5.5, -2, 6.5, 9.5]) D.put('bollardsea', [x, -4.75, 0], 0, S);
  D.put('rope', [-4.6, -4.4, 0], 0); D.put('rope', [8.2, -4.3, 0], 0); D.put('lifering', [-3.2, -4.85, 0.6], 0); D.put('net', [10.2, 1.6, 0], -20, S);
  D.put('lamp', [-6.8, -4.4, 0], 0, { h: 3.4, ...S }); D.put('lamp', [6.0, -4.4, 0], 0, { h: 3.4, ...S }); D.put('bench', [-1.6, 3.4, 0], 0, { c: 'woodD', ...S });
  D.put('sign', [-10.4, -3.6, 0], 20, { text: 'NO FISHING', sub: 'FROM THE PIER', w: 0.8, h: 0.5, bg: [0.95, 0.92, 0.86], fg: [0.6, 0.08, 0.06], pole: 1.3, ...S });
  D.put('crate', [7.6, 2.6, 0], 15, { s: 0.55, ...S }); D.put('barrel', [8.4, 3.0, 0], 0, { c: 'green', ...S }); D.put('sack', [3.6, 2.8, 0], 0);
  D.put('buoy', [-6, -9, -0.6], 0, { c: 'red' }); D.put('buoy', [9, -11, -0.6], 0, { c: 'yellow' }); D.put('boat', [-12, -14, -0.6], 30, { c: 'blue', s: 1.2 });
  D.put('birds', [0, 2, 8.5], 0, { n: 6, scale: 2 }); D.put('birds', [5.4, 3.3, 2.3], 0, { n: 1, seed: 4, scale: 1.5 }); D.put('scatter', [1.4, -1.6, 0.003], 0, { w: 4, d: 3, kind: 'litter', n: 6 });
  D.put('acunit', [9.0, 3.95, 3.0], 0); D.put('pipe', [-11.5, 3.9, 0], 0, { h: 5 });
  stage.addBounce([0, -2.0, 0.4], [1.0, 0.82, 0.60], 1.1, 8.0);
  return { props: {} };
}
