// workshop: a neighbourhood garage workshop (our own design, modelled in Blender: tools/interiors.py ->
// assets/interiors/workshop_*.glb, GLB.md). Concrete floor with yellow bay lines, a roller door, a pegboard of tools,
// a blue car with its bonnet up, a workbench with a vice, a red tool chest, oil drums and tyres, strip lights.
// Blender metres: x right, y into the room (back wall y = 3.2), z up; camera on the y < 0 side.
import { setKit } from './kit.js';
import { glbKit } from './glb.js';
import { dressKit } from './dress.js';

export const SUN_DIR = [0.45, 0.50, -0.74];
export const SUN_CENTER = [0, -0.5, 1.0], SUN_HALF = 7.0;
export const MARKS = { left: [-0.9, -0.8, 0], right: [0.9, -0.8, 0], center: [0, -0.8, 0], car: [1.6, 0.6, 0], bench: [3.2, 1.6, 0] };
export const PLACES = { bonnet: [1.5, 1.2, 1.2], bench_top: [3.2, 2.6, 0.95], door: [1.0, 3.1, 1.5], pegboard: [-3.1, 3.1, 1.8] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-4.4, -6.6], [4.4, 0.4]]];
export const SHOTS = { wide: { shot: 'wide', lens: 18, h: 1.6, headY: 0.56, size: 0.32, angle: -10 }, medium: { shot: 'ms', angle: 10, size: 0.42 }, close: { shot: 'cu' } };
export const COLLIDE = [];
const PIECES = ['workshop_car', 'workshop_bench', 'workshop_chest', 'workshop_drums', 'workshop_room', 'workshop_beams', 'workshop_door', 'workshop_pegboard', 'workshop_fusebox', 'workshop_pipes', 'workshop_windows', 'workshop_sign', 'workshop_lights'];
const DECOR = ['workshop_room', 'workshop_beams', 'workshop_door', 'workshop_pegboard', 'workshop_fusebox', 'workshop_pipes', 'workshop_windows', 'workshop_sign', 'workshop_lights'];

export async function build(stage) {
  const k = setKit(stage), g = glbKit(stage, 'interiors', COLLIDE);
  await g.load(PIECES);
  stage.scene.background = k.mat([0.6, 0.75, 0.9]).color.clone();
  g.decor(DECOR);
  g.place('workshop_car', [-0.6, 1.2, 0]); g.place('workshop_bench', [3.4, 2.6, 0]); g.place('workshop_chest', [4.5, 0.6, 0], -90);
  g.place('workshop_drums', [-3.9, 2.4, 0]);
  const D = dressKit(stage, COLLIDE), S = { solid: true };
  D.put('ladder', [-4.85, 0.0, 0], 90); D.put('tyres', [-4.2, -1.4, 0], 0, S); D.put('toolbox', [2.1, -0.2, 0], 20, { c: 'red' }); D.put('cone', [-2.6, -2.4, 0], 0);
  D.put('wheelbarrow', [3.8, -2.6, 0], -30, S); D.put('extinguisher', [-4.9, -3.0, 0], 90, S); D.put('pallet', [-3.4, -4.6, 0], 10); D.put('crates', [-3.4, -4.6, 0.13], 10, { c: 'woodL' });
  D.put('poster', [4.98, -1.6, 1.4], -90, { title: 'SAFETY', bg: [1.0, 0.8, 0.16], shape: 'star', w: 0.6, h: 0.85 }); D.put('wallbox', [-1.6, 3.18, 1.6], 0);
  D.put('shelf', [4.6, -4.2, 0], -90, { w: 1.6, h: 1.8, items: 'cans', seed: 5 }); D.put('bin', [2.6, 2.8, 0], 0, { c: 'greyD', ...S }); D.put('scatter', [0.4, -2.0, 0.003], 0, { w: 4, d: 2, kind: 'pebbles', n: 10 });
  stage.addBounce([0, -1.0, 0.4], [1.0, 0.86, 0.70], 1.0, 6.0); stage.addBounce([2.5, 1.5, 2.6], [0.85, 0.92, 1.0], 0.8, 4.0);
  return { props: {} };
}
