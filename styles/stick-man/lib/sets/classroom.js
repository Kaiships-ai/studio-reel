// classroom: a primary-school classroom (our own design, modelled in Blender: tools/interiors.py ->
// assets/interiors/classroom_*.glb, GLB.md). Plank floor, a blackboard with chalk sums, an alphabet strip, a clock,
// windows with plants on the left, a pinboard of drawings and cubbies with school bags on the right, the teacher's desk,
// pupils' desks with chairs, a bookcase with a globe. Same marks as `lab` (left / right / center / board / door).
// Blender metres: x right, y into the room (back wall y = 3.2), z up; camera on the y < 0 side.
import { setKit } from './kit.js';
import { glbKit } from './glb.js';
import { dressKit } from './dress.js';

export const SUN_DIR = [0.55, 0.40, -0.73];
export const SUN_CENTER = [0, -0.5, 1.0], SUN_HALF = 6.5;
export const MARKS = { left: [-0.8, -0.35, 0], right: [0.8, -0.35, 0], center: [0, -0.35, 0], board: [-1.4, 2.3, 0], door: [3.2, -1.0, 0] };
export const PLACES = { board: [0, 3.07, 1.85], board_l: [-1.1, 3.07, 1.85], board_r: [1.1, 3.07, 1.85], desk_top: [2.6, 2.0, 0.78], window: [-4.58, -1.2, 1.9] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-4.2, -6.6], [4.2, 0.6]]];
export const SHOTS = { wide: { shot: 'wide', lens: 18, h: 1.6, headY: 0.56, size: 0.32, angle: 8 }, medium: { shot: 'ms', angle: 10, size: 0.42 }, close: { shot: 'cu' } };
export const COLLIDE = [];
const PIECES = ['classroom_teacher', 'classroom_desk', 'classroom_bookcase', 'classroom_room', 'classroom_lights', 'classroom_board', 'classroom_alphabet', 'classroom_clock', 'classroom_windows', 'classroom_pinboard', 'classroom_cubbies'];
const DECOR = ['classroom_room', 'classroom_lights', 'classroom_board', 'classroom_alphabet', 'classroom_clock', 'classroom_windows', 'classroom_pinboard', 'classroom_cubbies'];

export async function build(stage) {
  const k = setKit(stage), g = glbKit(stage, 'interiors', COLLIDE);
  await g.load(PIECES);
  stage.scene.background = k.mat([0.6, 0.75, 0.9]).color.clone();
  g.decor(DECOR);
  g.place('classroom_teacher', [2.7, 2.0, 0], 0); g.place('classroom_bookcase', [-3.3, 2.8, 0]);
  for (const x of [-1.5, 1.5]) g.place('classroom_desk', [x, 1.55, 0]);                 // a row behind the cast
  for (const y of [-0.4, -2.2, -4.0]) { g.place('classroom_desk', [-3.4, y, 0]); g.place('classroom_desk', [3.4, y, 0]); }
  const D = dressKit(stage, COLLIDE), S = { solid: true };
  D.put('sack', [-2.6, -1.0, 0], 0, { c: 'red' }); D.put('ball', [2.4, -1.2, 0], 0, { c: 'blue', r: 0.12 }); D.put('bin', [4.2, 2.9, 0], 0, { c: 'blue', ...S });
  D.put('pot', [-4.2, 2.9, 0], 0, { s: 1.2, ...S }); D.put('flagpole', [4.3, 1.3, 0], 0, { c: 'blue', h: 2.6, scale: 0.6 });
  D.put('scatter', [-0.2, -2.2, 0.003], 0, { w: 3, d: 2, kind: 'litter', n: 6, seed: 3 }); D.put('book', [-0.5, -1.6, 0], 30, { c: 'green' });
  D.put('rug', [0, 0.4, 0], 0, { w: 2.6, d: 1.4, c: 'blue' });
  // around the cast: school bags and a lunch box by the desks, a paper plane, pencils, posters by the board, a bin,
  // a box of balls, a plant on the cubbies, front-row desks at the sides
  D.put('backpack', [-1.95, 1.0, 0], 15, { c: 'red' }); D.put('backpack', [1.95, 1.0, 0], -20, { c: 'yellow' }); D.put('lunchbox', [-0.7, -1.3, 0], 20, { c: 'pink' });
  D.put('paperplane', [0.6, -1.4, 0], 0); D.put('scatter', [1.2, -1.9, 0.003], 0, { w: 2, d: 1, kind: 'litter', n: 6, seed: 9 });
  D.put('poster', [-2.9, 3.17, 1.35], 0, { title: 'MAP', bg: [0.35, 0.65, 0.95], shape: 'circle', w: 0.9, h: 0.9 }); D.put('poster', [2.85, 3.17, 1.3], 0, { title: 'STARS', bg: [1.0, 0.80, 0.16], shape: 'star', seed: 4, w: 0.7, h: 0.9 });
  D.put('cardboard', [-1.7, -2.4, 0], 10, S); D.put('ball', [-1.5, -2.4, 0.38], 0, { c: 'red', r: 0.1 }); D.put('pot', [4.4, 1.3, 1.2], 0, { s: 0.7 });
  D.put('wallbox', [-2.5, 3.18, 1.1], 0, { c: 'cream' }); D.put('book', [-2.2, -1.2, 0], -30, { c: 'red' }); D.put('globe', [-0.9, 1.6, 0.7], 0, { scale: 0.7 }); D.put('lunchbox', [0.9, 1.6, 0.7], -10, { c: 'green' }); D.put('cup', [0.2, 1.55, 0.7], 0);
  stage.addBounce([0, -1.0, 0.4], [1.0, 0.88, 0.72], 1.0, 6.0); stage.addBounce([-3.5, -1.0, 1.8], [0.85, 0.92, 1.0], 0.8, 4.0);
  return { props: {} };
}
