// halden-plaza: an open civic square in Halden City by day, framed by Blender kit pieces (assets/halden/*.glb, GLB.md):
// police station across the back, stone bank on the left, diner on the right, a glass tower behind; a round fountain
// in the middle, trees, benches, lamps, a bus stop and a parked taxi. Blender metres: x right, y into the square, z up;
// camera on the y < 0 side.
import { setKit, canvasTex } from './kit.js';
import * as THREE from 'three';
import { B } from '../../engine/look.js';
import { glbKit } from './glb.js';
import { dressKit, register } from './dress.js';

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

export const OPTIONAL = ['concert'];
// dressing (SETS.md "Dressing"): a lived-in civic square. The cast's ground x -2..2, y -4..-0.8 stays clear.
// use: ['concert'] adds the rock stage on the left (speakers at PLACES.speakers, where sound waves start)
PLACES.speakers = [-5.6, 9.6, 1.6]; PLACES.stage = [0, 10.6, 0.8];
export function dress(stage, use = []) {
  const D = dressKit(stage, COLLIDE), S = { solid: true };
  // the diner's terrace: cafe tables, an A-board; a hot-dog cart; flower beds round the fountain
  for (const [x, y, c] of [[13.5, -4.5, 'red'], [14.2, -1.2, 'teal'], [15.5, 2.2, 'red']]) D.put('cafetable', [x, y, 0], 10, { c, ...S });
  D.put('aboard', [12.0, -6.5, 0], 30, { text: 'DINER\nOPEN', bg: [0.86, 0.16, 0.12], ...S }); D.put('kiosk', [6.8, 1.6, 0], -20, { c: 'yellow', ...S });
  D.put('flowerbed', [-4.2, 6.2, 0], 60, { w: 2.4, c: 'pink' }); D.put('flowerbed', [4.2, 6.2, 0], -60, { w: 2.4, c: 'purple', seed: 5 });
  // civic things: flags at the station, the square's sign, bins, bikes, a news box, an advertising column, pigeons
  for (const x of [-6, 0, 6]) D.put('flagpole', [x, 16.5, 0], 0, { c: ['blue', 'green', 'red'][(x / 6 + 1) | 0], h: 7, ...S });
  D.put('sign', [3.4, -0.8, 0], -20, { text: 'HALDEN SQUARE', sub: 'EST. 1902', w: 1.6, h: 0.6, bg: [0.12, 0.30, 0.45], fg: [1, 1, 1], pole: 1.4, legs: 2, ...S });
  D.put('bin', [4.6, -1.6, 0], 0, S); D.put('bin', [-6.6, 9.0, 0], 0, { c: 'blue', ...S }); D.put('bikerack', [9.5, -7.0, 0], 0, S); D.put('bike', [9.3, -7.3, 0], 0, { c: 'blue' });
  D.put('newsbox', [-10.8, -3.6, 0], 0, { c: 'blue', ...S }); D.put('adcolumn', [10.6, 8.0, 0], 0, S); D.put('phonebooth', [-13.4, 4.0, 0], 60, S);
  D.put('scatter', [2.4, -5.2, 0.004], 0, { w: 4, d: 2, kind: 'litter', n: 7 }); D.put('birds', [1.5, -6.5, 0.05], 0, { n: 4, seed: 9 }); D.put('birds', [-3, 12, 10], 0, { n: 5 });
  D.put('bunting', [0, 9.6, 4.6], 0, { w: 12, seed: 2 }); D.put('planter', [-10.5, 1.0, 0], 90, { w: 2, ...S }); D.put('planter', [10.5, 1.0, 0], 90, { w: 2, flowers: 'red', ...S });
  if (use.includes('concert')) {
    // the rock stage across the back of the square, facing the crowd: deck, truss with lamps, two speaker towers, amps,
    // mic stands, a drum riser, a banner, crowd barriers, light towers, a mixing desk tent in front
    D.put('stage', [0, 10.6, 0], 0, { w: 9, d: 3, ...S }); D.put('truss', [0, 10.6, 0], 0, { w: 9.6, h: 5.6 });
    for (const x of [-5.6, 5.6]) { D.put('speaker', [x, 9.6, 0], 0, { s: 1.8, ...S }); D.put('speaker', [x, 9.6, 1.8], 0, { s: 1.4 }); D.put('speaker', [x, 9.6, 3.2], 0, { s: 1.0 }); }
    D.put('amp', [-2.2, 10.2, 0.8], 0); D.put('amp', [2.2, 10.2, 0.8], 0); D.put('micstand', [-1.0, 9.6, 0.8], 0); D.put('micstand', [1.2, 9.6, 0.8], 0);
    D.put('barrel', [0, 11.0, 0.8], 0, { c: 'red', scale: 0.9 }); D.put('banner', [0, 11.8, 0], 0, { text: 'HALDEN ROCKS!', w: 7, h: 1.2, pole: 4.4, bg: [0.10, 0.08, 0.12], fg: [1.0, 0.80, 0.16] });
    D.put('barrier', [-2.6, 8.3, 0], 0, { w: 3.6, ...S }); D.put('barrier', [2.6, 8.3, 0], 0, { w: 3.6, ...S });
    D.put('lightrig', [-7.6, 7.6, 0], 20, S); D.put('lightrig', [7.6, 7.6, 0], -20, S);
    D.put('poster', [-3.4, 8.3, 0.2], 0, { title: 'LIVE!', bg: [0.95, 0.45, 0.62], shape: 'note', w: 0.6, h: 0.8 });
    D.put('table', [3.6, -0.6, 0], 0, { w: 1.2, d: 0.7, c: 'greyD', ...S }); D.put('amp', [3.6, -0.6, 0.76], 0);
    D.put('cup', [-0.8, -0.6, 0], 0); D.put('scatter', [0, -1.0, 0.004], 0, { w: 5, d: 2, kind: 'litter', n: 10, seed: 12 }); D.put('pigeons', [-2.6, -0.4, 0], 0, { n: 3 }); D.put('bin', [2.6, 0.6, 0], 0, { c: 'blue', ...S }); D.put('cardboard', [1.2, 1.0, 0], 15, S); D.put('shopbag', [-1.8, 0.4, 0], 0);

  }
}

export async function build(stage, { use = [] } = {}) {
  const k = setKit(stage), g = glbKit(stage, 'halden', COLLIDE);
  await g.load(PIECES);
  k.sky();
  // paving: warm stone with a lighter grid every 3 m, a darker border band (no ink)
  // paving: warm stone setts, each its own shade, with worn joints (a texture, not a flat slab)
  { let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const t = canvasTex(1024, 1024, (c, W, H) => { c.fillStyle = 'rgb(92,84,76)'; c.fillRect(0, 0, W, H);
      for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { const v = 150 + 40 * rnd(), x = i * 128 + (j % 2) * 64, y = j * 64;
        c.fillStyle = `rgb(${v + 12},${v},${v - 14})`; c.fillRect(x + 3, y + 3, 122, 58); c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(x + 3, y + 48, 122, 13);
        if (rnd() < 0.12) { c.strokeStyle = 'rgba(40,36,32,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 20, y + 10); c.lineTo(x + 60, y + 30); c.lineTo(x + 90, y + 20); c.stroke(); } } }, true);
    t.repeat.set(40, 40);
    const m = new THREE.Mesh(new THREE.BoxGeometry(140, 0.2, 130), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); m.position.copy(B(0, 5, -0.1)); m.receiveShadow = true; stage.scene.add(m); }
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
  register('fountain', stage.scene.children.slice(-4));
  // buildings around the square
  g.place('police_station', [0, 22, 0]);
  g.place('stone_bank', [-24, 2, 0], 90);
  g.place('diner', [24, -2, 0], -90);
  g.place('glass_tower', [18, 48, 0], 0, { ink: false, solid: false, dressing: true });
  // dressing
  for (const [x, y] of [[-9, -8], [9, -8], [-9, 12], [9, 12]]) g.place('tree', [x, y, 0]);
  for (const [x, y, r] of [[-6, 0.5, 90], [6, 0.5, -90], [-3, 9.5, 180], [3, 9.5, 180]]) g.place('bench', [x, y, 0], r);
  for (const [x, y] of [[-12, -3], [12, -3], [-12, 15], [12, 15]]) g.place('street_lamp', [x, y, 0], 0);
  g.place('trash_can', [-7.5, -1.5, 0]);
  g.place('hydrant', [-15, -12, 0]);
  g.place('bus_stop', PLACES.bus_stop, 180);
  g.place('taxi', [17, -14, 0], 90);
  dress(stage, use);
  stage.addBounce([0, -2.5, 0.4], [1.0, 0.80, 0.58], 1.2, 7.0);
  return { props: {} };
}
