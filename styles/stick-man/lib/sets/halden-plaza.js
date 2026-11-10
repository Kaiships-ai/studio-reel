// halden-plaza: an open civic square in Halden City by day, framed by Blender kit pieces (assets/halden/*.glb, GLB.md):
// police station across the back, stone bank on the left, diner on the right, a glass tower behind; a round fountain
// in the middle, trees, benches, lamps, a bus stop and a parked taxi. Blender metres: x right, y into the square, z up;
// camera on the y < 0 side.
import { setKit } from './kit.js';
import { glbKit } from './glb.js';

export const SUN_DIR = [0.35, 0.55, -0.76];
export const SUN_CENTER = [0, 2, 1.0], SUN_HALF = 16.0;
export const MARKS = { left: [-1.1, -3.0, 0], right: [1.1, -3.0, 0], center: [0, -3.0, 0], fountain: [0, 3.5, 0], bench: [-6, 0, 0] };
export const PLACES = { fountain: [0, 4.0, 0.55], bus_stop: [12, -9, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-15, -22], [15, -0.5]]];
// shot presets for an act's `shots` ({ f, ...SHOTS.wide, of: [...] }): the wide shows the whole square with the
// figures low in frame at ~27 % height (lens 17, camera 1.7 m up, head at 56 % from the top)
export const SHOTS = {
  wide: { shot: 'wide', lens: 17, h: 1.7, headY: 0.56, size: 0.27, angle: 0 },
  medium: { shot: 'ms', angle: 10, size: 0.42 },
  close: { shot: 'cu' },
};
export const COLLIDE = [];
const PIECES = ['police_station', 'stone_bank', 'diner', 'glass_tower', 'street_lamp', 'tree', 'bench', 'trash_can', 'bus_stop', 'taxi', 'hydrant'];

export async function build(stage) {
  const k = setKit(stage), g = glbKit(stage, 'halden', COLLIDE);
  await g.load(PIECES);
  k.sky();
  // paving: warm stone with a lighter grid every 3 m, a darker border band (no ink)
  k.box([-70, -60, -0.2], [70, 70, 0], k.mat([0.19, 0.165, 0.14], 0.9), false);
  const line = k.mat([0.25, 0.22, 0.19], 0.9);
  for (let v = -21; v <= 21; v += 3) { k.box([v - 0.05, -21, 0], [v + 0.05, 21, 0.004], line, false); k.box([-21, v - 0.05, 0], [21, v + 0.05, 0.004], line, false); }
  for (const [lo, hi] of [[[-22, -22], [22, -21]], [[-22, 21], [22, 22]], [[-22, -22], [-21, 22]], [[21, -22], [22, 22]]]) k.box([...lo, 0], [...hi, 0.006], k.mat([0.42, 0.38, 0.36], 0.9), false);
  // fountain: a stone ring, water, a centre bowl (code-built, inked)
  const stone = k.mat([0.84, 0.80, 0.72], 0.7);
  k.cyl([0, 4.0, 0.25], 2.6, 0.5, stone, { seg: 48 });
  k.cyl([0, 4.0, 0.46], 2.35, 0.04, k.mat([0.30, 0.58, 0.78], 0.15), { seg: 48, ink: false });
  k.cyl([0, 4.0, 0.9], 0.28, 1.0, stone, { seg: 24 });
  k.cyl([0, 4.0, 1.45], 0.9, 0.14, stone, { seg: 36, r2: 1.0 });
  COLLIDE.push({ name: 'fountain', lo: [-2.6, 1.4, 0], hi: [2.6, 6.6, 0.5] });
  // buildings around the square
  g.place('police_station', [0, 22, 0]);
  g.place('stone_bank', [-24, 2, 0], 90);
  g.place('diner', [24, -2, 0], -90);
  g.place('glass_tower', [18, 48, 0], 0, { ink: false, solid: false });
  // dressing
  for (const [x, y] of [[-9, -8], [9, -8], [-9, 12], [9, 12]]) g.place('tree', [x, y, 0]);
  for (const [x, y, r] of [[-6, 0.5, 90], [6, 0.5, -90], [-3, 9.5, 180], [3, 9.5, 180]]) g.place('bench', [x, y, 0], r);
  for (const [x, y] of [[-12, -3], [12, -3], [-12, 15], [12, 15]]) g.place('street_lamp', [x, y, 0], 0);
  g.place('trash_can', [-7.5, -1.5, 0]);
  g.place('hydrant', [-15, -12, 0]);
  g.place('bus_stop', PLACES.bus_stop, 180);
  g.place('taxi', [17, -14, 0], 90);
  stage.addBounce([0, -2.5, 0.4], [1.0, 0.80, 0.58], 1.2, 7.0);
  return { props: {} };
}
