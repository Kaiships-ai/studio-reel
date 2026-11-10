// diner: a 1950s-style roadside diner inside, by day (our own design, modelled in Blender: tools/interiors.py ->
// assets/interiors/diner_*.glb, GLB.md). Black-and-white tiles, mint and cream walls, a red counter with stools along the
// back, booths by the windows on the left, a jukebox on the right, pendant lamps, a neon DINER sign, a menu board.
// Blender metres: x right, y into the room (back wall y = 3.2), z up; camera on the y < 0 side.
import { setKit } from './kit.js';
import { glbKit } from './glb.js';
import { dressKit } from './dress.js';

export const SUN_DIR = [0.55, 0.45, -0.70];
export const SUN_CENTER = [0, -0.5, 1.0], SUN_HALF = 6.5;
export const MARKS = { left: [-0.9, -0.5, 0], right: [0.9, -0.5, 0], center: [0, -0.5, 0], counter: [-0.6, 1.0, 0], booth: [-2.6, -2.4, 0], door: [3.4, -4.0, 0] };
export const PLACES = { counter_top: [-0.6, 2.15, 1.08], pie: [-1.0, 2.2, 1.2], sign: [-1.7, 3.1, 2.85], menu: [3.6, 3.08, 2.0], jukebox: [4.1, 0.6, 1.2] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-4.0, -6.6], [4.0, 0.6]]];
export const SHOTS = { wide: { shot: 'wide', lens: 18, h: 1.6, headY: 0.56, size: 0.32, angle: 12 }, medium: { shot: 'ms', angle: 10, size: 0.42 }, close: { shot: 'cu' } };
export const COLLIDE = [];
const PIECES = ['diner_counter', 'diner_stool', 'diner_booth', 'diner_jukebox', 'diner_room', 'diner_beams', 'diner_cupshelf', 'diner_hatch', 'diner_menu', 'diner_neon', 'diner_windows', 'diner_lamps', 'diner_fans', 'diner_photos', 'diner_clock'];
const DECOR = ['diner_room', 'diner_beams', 'diner_cupshelf', 'diner_hatch', 'diner_menu', 'diner_neon', 'diner_windows', 'diner_lamps', 'diner_fans', 'diner_photos', 'diner_clock'];

export async function build(stage) {
  const k = setKit(stage), g = glbKit(stage, 'interiors', COLLIDE);
  await g.load(PIECES);
  stage.scene.background = k.mat([0.6, 0.75, 0.9]).color.clone();
  g.decor(DECOR);
  g.place('diner_counter', [0, 0, 0]);
  for (let x = -3.8; x <= 2.3; x += 0.85) g.place('diner_stool', [x, 1.45, 0]);
  for (const y of [-1.4, -3.9]) g.place('diner_booth', [-3.8, y, 0]);
  g.place('diner_jukebox', [4.15, 0.6, 0], -90);
  // code-built dressing: plants, a coat stand, an OPEN sign, a bin, a cake stand on the booth table, a mop bucket
  const D = dressKit(stage, COLLIDE), S = { solid: true };
  D.put('plantbig', [4.0, 2.6, 0], 0, S); D.put('plantbig', [-4.1, 0.6, 0], 0, S); D.put('coatstand', [4.0, -2.2, 0], 0, S);
  D.put('plaque', [3.5, -6.95, 2.0], 180, { text: 'OPEN', sub: '24 HOURS', w: 0.7, h: 0.4, bg: [0.86, 0.16, 0.12], fg: [1, 1, 1] });
  D.put('bin', [3.0, 2.4, 0], 0, { c: 'red', ...S }); D.put('barrel', [3.9, -5.2, 0], 0, { c: 'yellow', scale: 0.55, ...S }); D.put('scatter', [0.6, -1.8, 0.003], 0, { w: 3, d: 1.5, kind: 'litter', n: 5 });
  D.put('poster', [4.55, -0.9, 1.4], -90, { title: 'SHAKES', bg: [0.95, 0.45, 0.62], shape: 'circle', w: 0.6, h: 0.85 });
  stage.addBounce([0, -1.0, 0.4], [1.0, 0.85, 0.70], 1.1, 6.0); stage.addBounce([-1.0, 2.0, 2.4], [1.0, 0.78, 0.60], 0.8, 4.0);
  return { props: {} };
}
