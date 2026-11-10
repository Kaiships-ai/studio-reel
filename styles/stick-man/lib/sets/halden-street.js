// halden-street: a Halden City shopping street by day, dressed with Blender kit pieces (assets/halden/*.glb, GLB.md):
// walk-up, corner shop, stone bank, a second walk-up, a glass tower behind; lamps, trees, hydrant, bench, two cars.
// Blender metres: x along the street, y into the buildings (facades on y = 0), z up; camera on the road side (y < 0).
import { setKit } from './kit.js';
import { glbKit } from './glb.js';
import { dressKit } from './dress.js';

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
  'trash_can', 'newsbox', 'sedan', 'taxi', 'bus_stop'];

// dressing (SETS.md "Dressing"): a busy shopping street. The cast's pavement x -6.5..-1.5, y -3.6..-1.0 stays clear, and
// so does the near lane x -7.5..-3, y -11..-8.5 (the traffic act stands there)
export function dress(stage) {
  const D = dressKit(stage, COLLIDE), S = { solid: true };
  // the corner shop's pavement cafe and fruit stand: tables, an A-board, crates, a bin with bags
  D.put('cafetable', [-8.2, -2.3, 0], 15, { c: 'red', ...S }); D.put('cafetable', [-11.6, -2.4, 0], -10, { c: 'teal', ...S });
  D.put('aboard', [-7.0, -1.5, 0], -15, { text: 'HOT\nCOFFEE\n$3', ...S }); D.put('fruitstand', [-13.6, -2.0, 0], 0, S); D.put('crates', [-15.1, -1.6, 0], 10, S);
  D.put('sack', [-11.7, -3.0, 0], 0, { c: 'black' }); D.put('sack', [-10.5, -3.2, 0], 0, { c: [0.2, 0.2, 0.22] });
  // in front of the bank: planters, an advertising column at the kerb, a phone booth, bollards
  D.put('planter', [0.6, -2.0, 0], 0, { w: 1.4, ...S }); D.put('planter', [8.6, -2.0, 0], 0, { w: 1.4, flowers: 'red', ...S });
  D.put('adcolumn', [-0.6, -3.3, 0], 0, S); D.put('phonebooth', [13.8, -2.2, 0], 0, S);
  for (const x of [-9.6, -8.6, 1.8, 2.8, 5.0]) D.put('bollard', [x, -3.75, 0], 0, S);
  // bikes by the walk-up, roadworks across the road, bunting over the street, birds, litter and leaves on the pavement
  D.put('bikerack', [-19.8, -1.8, 0], 0, S); D.put('bike', [-19.5, -2.1, 0], 0, { c: 'red' }); D.put('bike', [-20.6, -2.05, 0], 0, { c: 'green' });
  D.put('barrier', [3.0, -6.2, ROAD_Z], 0, { w: 2.2 }); D.put('cone', [1.4, -6.0, ROAD_Z], 0); D.put('cone', [4.6, -6.0, ROAD_Z], 0); D.put('cone', [5.5, -6.6, ROAD_Z], 0);
  D.put('bunting', [-7, -3.6, 5.2], 0, { w: 14 }); D.put('bunting', [7, -3.6, 5.0], 0, { w: 14 });
  D.put('birds', [-4, 6, 9], 0, { n: 5 }); D.put('scatter', [-4, -2.6, 0.005], 0, { w: 6, d: 2.2, kind: 'leaves', n: 16 }); D.put('scatter', [-3, -9.6, ROAD_Z + 0.005], 0, { w: 5, d: 1.4, kind: 'litter', n: 6 });
  // right behind the cast's marks (what a medium shot sees): a news box, a bin, a leaning bike, a bench, a poster frame,
  // AC units and a pipe on the shop wall, a shop sign over the door
  D.put('newsbox', [-4.7, -1.25, 0], 0, { c: 'blue', ...S }); D.put('bin', [-3.3, -1.3, 0], 0, S); D.put('bike', [-2.3, -1.25, 0], 8, { c: 'yellow', solid: true });
  D.put('bench', [-6.4, -1.0, 0], 0, { c: 'green', ...S }); D.put('poster', [-7.6, -0.08, 0.9], 0, { title: 'SALE', bg: [1.0, 0.8, 0.16], shape: 'stripes', w: 0.8, h: 1.1 });
  D.put('acunit', [-7.0, -0.32, 3.4], 0); D.put('acunit', [-12.4, -0.32, 3.2], 0); D.put('pipe', [-5.35, -0.1, 0], 0, { h: 5.2 });
  D.put('sign', [-3.9, -1.7, 2.6], 0, { text: 'MAIN ST', w: 0.9, h: 0.28, bg: [0.08, 0.40, 0.20], fg: [1, 1, 1], pole: 0 }); D.put('lamp', [-1.6, -1.4, 0], 0, { h: 3.2, ...S });
  D.put('pot', [-5.6, -0.9, 0], 0, { s: 1.2, ...S }); D.put('pot', [-16.3, -0.9, 0], 0, { c: 'cream', s: 1.2, ...S }); D.put('newsbox', [-17.4, -3.2, 0], 0, { c: 'red', ...S });
  // the near pavement under the medium shot (low pieces only, so nothing covers a body): a chalk hopscotch, pigeons, a
  // dropped newspaper, a skateboard, a shopping bag, a puddle at the kerb, a parking meter, bollards, a box, a bucket
  const Z = 0.012;                                               // the kit pavement's top sits a few mm over z = 0
  D.put('hopscotch', [-3.0, -3.7, Z], 80); D.put('pigeons', [-4.6, -3.1, Z], 0, { n: 4 }); D.put('newspaper', [-3.3, -2.9, Z], 0); D.put('skateboard', [-4.9, -2.8, Z], 30);
  D.put('shopbag', [-2.6, -2.5, Z], 10); D.put('puddle', [-4.2, -3.8, Z], 0, { w: 1.3, d: 0.5 }); D.put('bollard', [-5.4, -3.75, 0], 0, S); D.put('bollard', [-2.3, -3.75, 0], 0, S);
  D.put('meterpost', [-2.0, -3.78, 0], 0, S); D.put('cardboard', [-6.1, -2.1, 0], 20, S); D.put('cup', [-3.7, -2.7, Z], 0);
  D.put('crates', [-5.3, -0.75, 0], 0, { c: 'woodL', ...S }); D.put('poster', [-4.85, -0.12, 0.8], 0, { title: 'GIG', bg: [0.5, 0.3, 0.75], shape: 'note', seed: 2, w: 0.55, h: 0.8 });
  // the near lane where the traffic act stands: a zebra crossing, a manhole, a tar patch, a lost hubcap, an oil puddle
  const RZ = ROAD_Z + 0.004;
  D.put('zebra', [-5.0, -9.7, RZ], 0, { w: 4.2, n: 7 }); D.put('manhole', [-7.4, -10.8, RZ], 0); D.put('patch', [-3.0, -10.9, RZ], 10); D.put('hubcap', [-6.6, -10.2, RZ], 0);
  D.put('puddle', [-4.0, -11.2, RZ], 0, { w: 1.2, d: 0.5 }); D.put('cone', [-2.4, -9.0, ROAD_Z], 0); D.put('roadmark', [-4, -11.6, RZ], 0, { len: 12 });
  D.put('bucket', [-5.2, -1.1, 0], 0, { c: 'blue' }); D.put('flowerbed', [-3.9, -1.25, 0], 0, { w: 0.9, c: 'red', seed: 4 }); D.put('frame', [-6.6, -0.06, 1.3], 0, { seed: 2, w: 0.5, h: 0.4 }); D.put('hangbasket', [-6.2, -0.9, 2.4], 0); D.put('hangbasket', [-3.0, -1.65, 2.3], 0);
}

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
  g.place('glass_tower', [-2, 34, 0], 0, { ink: false, solid: false, dressing: true });
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
  g.place('sedan', [15.5, -7.9, ROAD_Z]); g.place('taxi', [-21.5, -8.0, ROAD_Z]);
  g.place('bus_stop', [11.0, -2.9, 0], 0);
  dress(stage);
  stage.addBounce([-4, -2.0, 0.4], [1.0, 0.80, 0.58], 1.2, 7.0);
  stage.addBounce([-12, -2.0, 0.4], [1.0, 0.80, 0.58], 0.9, 7.0);
  return { props: {} };
}
