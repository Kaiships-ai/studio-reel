// island: a lone volcano island at sea (Krakatoa-style), seen from the water. Blender metres: x right, y into the scene,
// z up; camera on the y < 0 side. Prop-only set (no cast): the volcano is a named prop so inserts can frame it.
import { setKit } from './kit.js';
import { dressKit, register } from './dress.js';
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
  volcano.userData.rest = { pos: [0, 6, 2.65], rot: 0 };
  register('volcano', [volcano]);
  // dressing: a lived-on island under its volcano. Fishing huts and a dock on the beach, boats and buoys in the bay, a
  // lighthouse on a rocky islet, two more islets, palms, rocks, gulls, a tall ship on the horizon, a warning sign
  const D = dressKit(stage);
  D.put('dock', [-1.6, 0.8, 0], 0, { len: 3.0, scale: 0.6 }); D.put('hut', [-2.6, 1.8, 0.3], -10, { c: 'woodL', scale: 0.5 }); D.put('hut', [2.8, 1.9, 0.3], 15, { c: [0.85, 0.70, 0.45], scale: 0.45 });
  D.put('boat', [-3.4, -2.2, 0], 15, { c: 'red', s: 0.45 }); D.put('boat', [3.6, -1.4, 0], -30, { c: 'blue', s: 0.4 }); D.put('boat', [-9, -6, 0], 70, { c: 'yellow', s: 0.6 });
  D.put('buoy', [1.0, -3.6, 0], 0, { c: 'red', scale: 0.6 }); D.put('buoy', [-5.6, -4.2, 0], 0, { c: 'yellow', scale: 0.6 }); D.put('buoy', [6.4, -3.0, 0], 0, { c: 'red', scale: 0.6 });
  D.put('islet', [-12, 10, 0], 0, { s: 1.4 }); D.put('lighthouse', [-12, 10, 0.4], 0, { scale: 1.2 }); D.put('rock', [-10.6, 8.6, 0.2], 0, { s: 1.2 });
  D.put('islet', [13, 14, 0], 0, { s: 1.8 }); D.put('palm', [13.5, 14, 0.4], 0, { s: 1.0 }); D.put('islet', [9, -6, 0], 0, { s: 0.6 });
  for (const [x, y, s2, l] of [[2.9, 1.0, 0.75, -0.3], [5.4, 4.8, 0.9, 0.5], [-5.6, 6.8, 0.85, -0.4], [-1.0, 0.6, 0.6, 0.2]]) D.put('palm', [x, y, 0.3], 0, { s: s2, lean: l });
  for (const [x, y, s2] of [[4.4, 0.8, 0.7], [-4.2, 0.4, 0.6], [6.0, 2.6, 0.8], [0.6, 0.2, 0.4]]) D.put('rock', [x, y, 0.2], 0, { s: s2 });
  D.put('sign', [0.4, 0.4, 0.3], -10, { text: 'DANGER', sub: 'VOLCANO - KEEP OFF', w: 0.9, h: 0.55, bg: [1.0, 0.80, 0.16], fg: [0.05, 0.05, 0.06], pole: 0.9, legs: 2, scale: 0.55 });
  D.put('crates', [-0.8, 0.9, 0.5], 0, { c: 'woodL', scale: 0.5 }); D.put('barrel', [3.6, 2.2, 0.4], 0, { c: 'blue', scale: 0.5 }); D.put('net', [-3.9, 2.1, 0.3], -10, { scale: 0.5 });
  D.put('birds', [-3, 3, 7.5], 0, { n: 6, scale: 2.2 }); D.put('birds', [6, 6, 9], 0, { n: 4, seed: 5, scale: 2.5 });
  D.put('boat', [16, 20, 0], 0, { c: 'woodD', s: 2.2 });
  // the bay and the sky: more islets with palms, fishing boats, floating barrels, a raft, clouds
  D.put('islet', [-17, 4, 0], 0, { s: 1.1 }); D.put('palm', [-17, 4, 0.3], 0, { s: 0.9, lean: 0.3 }); D.put('islet', [18, 2, 0], 0, { s: 1.0 }); D.put('hut', [18, 2, 0.2], 0, { scale: 0.5 });
  D.put('boat', [-6.5, -9, 0], 20, { c: 'orange', s: 0.7 }); D.put('boat', [7.5, -8, 0], -40, { c: 'teal', s: 0.6 }); D.put('boat', [-14, 0, 0], 80, { c: 'white', s: 0.9 });
  D.put('barrel', [2.6, -5.0, -0.2], 0, { c: 'woodL', scale: 0.5 }); D.put('pallet', [-2.4, -5.6, -0.05], 30, { scale: 0.8 }); D.put('buoy', [4.4, -6.5, 0], 0, { c: 'yellow', scale: 0.6 });
  D.put('cloud', [-9, 24, 11], 0, { s: 2.2 }); D.put('cloud', [11, 28, 13], 0, { s: 2.6, seed: 7 }); D.put('cloud', [2, 34, 16], 0, { s: 3, seed: 9 }); D.put('cloud', [-16, 30, 7], 0, { s: 2, seed: 2 });
  D.put('boat', [1.6, 0.0, 0.25], 60, { c: 'green', s: 0.3 }); D.put('hut', [0.4, 1.5, 0.3], 5, { c: [0.75, 0.55, 0.40], scale: 0.38 }); D.put('flagpole', [-0.4, 1.0, 0.3], 0, { c: 'red', h: 2.4, scale: 0.6 });
  D.put('rope', [-1.4, 0.3, 0.5], 0, { scale: 0.6 }); D.put('barrel', [-2.0, 0.9, 0.3], 0, { c: 'red', scale: 0.45 }); D.put('rock', [-5.4, 2.6, 0.2], 0, { s: 0.7 }); D.put('palm', [-3.4, 3.0, 0.3], 0, { s: 0.8, lean: 0.4 });                               // Blender metres, like street's bag
  stage.addBounce([0, -0.6, 1.4], [1.0, 0.9, 0.75], 1.0, 9.0);
  return { props: { volcano } };
}
