// halden-street: a Halden City shopping street by day, dressed with Blender kit pieces (assets/halden/*.glb, GLB.md):
// walk-up, corner shop, stone bank, a second walk-up, a glass tower behind; lamps, trees, hydrant, bench, two cars.
// Blender metres: x along the street, y into the buildings (facades on y = 0), z up; camera on the road side (y < 0).
import { setKit } from './kit.js';
import { glbKit } from './glb.js';

export const SUN_DIR = [0.42, 0.62, -0.66];
export const SUN_CENTER = [-4, -3, 1.0], SUN_HALF = 14.0;
export const KERB_Y = -4.0, ROAD_Z = -0.16;                     // kit sidewalk 4 m deep; its kerb is 0.16 m
export const MARKS = { left: [-5.1, -2.1, 0], right: [-2.9, -2.1, 0], center: [-4.0, -2.1, 0], shop: [-10, -1.8, 0], bank: [4.0, -2.4, 0] };
export const PLACES = { lamp: [-14, -3.5, 0], hydrant: [-18.5, -3.4, 0], bench: [-12, -1.0, 0], kerb: [-4, KERB_Y, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-40, -18], [40, -0.8]]];
// shot presets for an act's `shots` ({ f, ...SHOTS.wide, of: [...] }): the wide shows the whole street with the
// figures low in frame at ~27 % height (lens 17, camera 1.7 m up, head at 56 % from the top)
export const SHOTS = {
  wide: { shot: 'wide', lens: 17, h: 1.7, headY: 0.56, size: 0.33, angle: 36 },
  medium: { shot: 'ms', angle: 10, size: 0.42 },
  close: { shot: 'cu' },
};
export const COLLIDE = [];                                       // filled by build() from the pieces' geometry
const PIECES = ['sidewalk', 'road_straight', 'brick_walkup', 'corner_shop', 'stone_bank', 'glass_tower', 'street_lamp', 'tree', 'hydrant', 'bench', 'mailbox',
  'trash_can', 'newsbox', 'sedan', 'taxi'];

export async function build(stage) {
  const k = setKit(stage), g = glbKit(stage, 'halden', COLLIDE);
  await g.load(PIECES);
  k.sky();
  // ground from the kit: sidewalk strips (kerb on y = KERB_Y, slabs back to the facades), road tiles, the far sidewalk
  // facing back; all sunk by the kerb height so the pavement top is z = 0. A plain floor under everything. No ink.
  const flat = { ink: false, solid: false }, walk = { ...flat, tint: [1.55, 1.12, 0.66] };
  k.box([-80, -60, -0.4], [80, 60, -0.2], k.mat([0.26, 0.24, 0.23], 0.9), false);
  for (let x = -56; x <= 56; x += 22.4) { g.place('sidewalk', [x, KERB_Y, ROAD_Z], 0, walk); g.place('sidewalk', [x, KERB_Y - 14, ROAD_Z], 180, walk); }
  for (let x = -60; x <= 60; x += 24) g.place('road_straight', [x, KERB_Y - 7, ROAD_Z], 0, flat);
  // buildings on the facade line (y = 0), the bank set back so its steps stay on the pavement
  g.place('brick_walkup', [-21.0, 0, 0]);
  g.place('corner_shop', [-10.2, 0, 0]);
  g.place('stone_bank', [7.6, 1.6, 0]);
  g.place('brick_walkup', [25.6, 0, 0]);
  g.place('glass_tower', [-2, 34, 0], 0, { ink: false, solid: false });
  // street furniture along the kerb; lamp arms reach over the road
  for (const x of [-14, 0, 14]) g.place('street_lamp', [x, -3.5, 0], 180);
  for (const x of [-8.5, 7.0, 20]) g.place('tree', [x, -3.0, 0]);
  g.place('hydrant', PLACES.hydrant);
  g.place('bench', PLACES.bench);
  g.place('mailbox', [-16.5, -3.2, 0]);
  g.place('trash_can', [-11.0, -3.4, 0]);
  g.place('newsbox', [-8.6, -0.8, 0]);
  // traffic: a sedan in the near lane heading +x, a taxi in the far lane heading -x
  g.place('sedan', [-9.0, -8.0, ROAD_Z]);
  g.place('taxi', [11.0, -14.2, ROAD_Z], 180);
  stage.addBounce([-4, -2.0, 0.4], [1.0, 0.80, 0.58], 1.2, 7.0);
  stage.addBounce([-12, -2.0, 0.4], [1.0, 0.80, 0.58], 0.9, 7.0);
  return { props: {} };
}
