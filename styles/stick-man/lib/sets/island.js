// island: a lone volcano island at sea (Krakatoa-style), seen from the water. Blender metres: x right, y into the scene,
// z up; camera on the y < 0 side. Prop-only set (no cast): the volcano is a named prop so inserts can frame it.
import { setKit } from './kit.js';
export const SUN_DIR = [0.35, 0.45, -0.82];
export const SUN_CENTER = [0, 6, 2.0], SUN_HALF = 14.0;
export const MARKS = { left: [-3.2, 2.4, 0.3], right: [3.2, 2.4, 0.3], center: [0, 1.6, 0.3] };
export const PLACES = { crater: [0, 6, 5.0], shore: [0, 1.5, 0.3], sea: [0, -4, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-30, -40], [30, -1]]];
export const COLLIDE = [{ name: 'volcano', lo: [-4.5, 1.5, 0], hi: [4.5, 10.5, 5.0] }];
export async function build(stage) {
  const k = setKit(stage);
  k.sky([70, 130, 210], [200, 220, 236], 10);
  k.box([-80, -80, -0.4], [80, 80, 0], k.mat([0.16, 0.46, 0.66], 0.5), false);                  // sea (no ink)
  k.cyl([0, 6, 0.15], 6.2, 0.3, k.mat([0.88, 0.78, 0.52], 0.9), { r2: 5.6 });                 // sand ring
  k.cyl([0, 6, 0.4], 5.2, 0.25, k.mat([0.36, 0.62, 0.30], 0.8), { r2: 4.6 });                 // green skirt
  const volcano = k.cyl([0, 6, 2.65], 4.4, 4.5, k.mat([0.27, 0.20, 0.17], 0.9), { r2: 0.95 }); // cone
  k.cyl([0, 6, 4.95], 0.95, 0.12, k.mat([0.86, 0.32, 0.12], 0.6), { r2: 0.7, ink: false });   // glowing crater lip
  for (const [x, y] of [[-4.8, 3.2], [4.6, 3.6], [-3.6, 1.6]]) {                                  // three palm tufts
    k.cyl([x, y, 0.9], 0.08, 1.4, k.mat([0.45, 0.30, 0.16], 0.8), { r2: 0.06 });
    k.sphere([x, y, 1.65], 0.42, k.mat([0.22, 0.55, 0.24], 0.8), { sz: 0.55 });
  }
  volcano.userData.rest = { pos: [0, 6, 2.65], rot: 0 };                               // Blender metres, like street's bag
  stage.addBounce([0, -0.6, 1.4], [1.0, 0.9, 0.75], 1.0, 9.0);
  return { props: { volcano } };
}
