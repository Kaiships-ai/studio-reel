// wif5 part b: a hospital nursery at night, one minute past midnight. Two rows of cradles down a pale lino aisle, every
// second one flat and empty; the full ones hold a swaddled boy. Red alarm practicals pulse on the monitors and the back
// wall; warm heat lamps make a pool over each cradle so the floor under the doctor stays light. The boy of 23:59 lies in
// the near-left cradle (CRADLE), his name card and his mother's photo taped to its front.
// Blender metres: x right, y into the scene, z up; the camera on the y < 0 side.
// Light (LIGHT-RECIPE-V3): practicals 8-26 at 2.4-4.6 m reach, sky light low, materials env x0.4; the red lives in lights.
import { createKit, rng, tex, place, SURF } from '/styles/stick-man/kit/film.js';
import { bundle, tagCanvas, photoCanvas } from './props.js';

export const SUN_DIR = [-0.3, 0.5, -0.8];
export const SUN_CENTER = [0, 3, 1.2], SUN_HALF = 8;
export const CRADLE = [-1.1, 0.4];                                   // the boy's cradle (left row, nearest the camera)
export const MARKS = { doc: [-0.98, 0.96, 0] };                      // behind the boy's cradle (its back glass at y 0.6)
export const CHEST = [-1.05, 0.4, 1.0], RIM = [-0.88, 0.6, 1.02];   // his palm on the swaddled chest; his other hand on the back rim
export const PLACES = { cradle: [-1.1, 0.4, 0.85], baby: [-1.0, 0.4, 0.95], photo: [-0.85, 0.15, 0.9], camera0: [0, -3, 1.4] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-3.4, -4.5], [3.4, 0]]];
const PROPS = ['hospital/bassinet', 'hospital/monitor-stand', 'hospital/iv-stand', 'hospital/sanitiser', 'hospital/double-door'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const NURSERY = place('hospital', { light: 'nursery-night', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|nursery-night`, why, by })) });
export const COLLIDE = NURSERY.COLLIDE;
const ENV_K = 0.4;
const ROWS = [-1.1, 1.1], N = 7, DY = 1.2, Y0 = 0.4;

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.10, 0.11, 0.16], mid: [0.20, 0.16, 0.15], bottom: [0.14, 0.13, 0.13] }, envK: ENV_K });
  const T = K.THREE, r = rng(5);
  const M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.7, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await NURSERY.open(stage, { kit: K, material });

  // ---- the room: pale mint lino (legs read on it), soft green-grey walls, a dado rail, ceiling
  const lino = SURF.tiles([0.62, 0.70, 0.66], '#7d8a84', 6, 4); lino.repeat.set(5, 5);
  K.box([-3.8, -6, -0.2], [3.8, 9.6, 0], M([1, 1, 1], 0.55, { map: lino }), { r: 0, cast: false });
  const wall = M([0.48, 0.56, 0.52], 0.9, { map: SURF.plaster('#7b8f86', 3) }), dado = M([0.30, 0.42, 0.46], 0.7);
  K.box([-3.8, 9.4, 0], [3.8, 9.7, 3.1], wall, { r: 0 });
  K.box([-3.9, -6, 0], [-3.6, 9.6, 3.1], wall, { r: 0 }); K.box([3.6, -6, 0], [3.9, 9.6, 3.1], wall, { r: 0 });
  K.box([-3.8, -6, 3.1], [3.8, 9.7, 3.25], M([0.34, 0.36, 0.38], 0.95, { map: SURF.tiles([0.40, 0.42, 0.44], '#55595c', 8, 9) }), { r: 0, cast: false });
  K.box([-3.6, 9.36, 0.95], [3.6, 9.4, 1.0], dado, { r: 0 }); for (const x of [-3.6, 3.56]) K.box([x, -6, 0.95], [x + 0.04, 9.4, 1.0], dado, { r: 0 });
  put('hospital/double-door', [0, 9.36, 0], 0);
  for (const x of [-2.6, 2.6]) put('hospital/sanitiser', [x, 9.38, 1.2], 0);
  // a wall clock over the door, stopped past midnight (00:01), and a red alarm beacon on each side
  const clk = tex(256, 256, (g, w) => { g.fillStyle = '#e8e4da'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#22242a'; g.lineWidth = 10; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = i % 3 ? 4 : 8; g.beginPath(); g.moveTo(128 + 92 * Math.sin(a), 128 - 92 * Math.cos(a)); g.lineTo(128 + 108 * Math.sin(a), 128 - 108 * Math.cos(a)); g.stroke(); }
    g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(130, 62); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(138, 34); g.stroke(); });
  K.card([0, 9.34, 2.55], 0.55, 0.55, clk, { env: 0.6 });
  const red = K.glow([1.0, 0.10, 0.06], 1.6), redOff = K.glow([0.25, 0.03, 0.02], 1.0);
  const beacons = [];
  for (const x of [-1.6, 1.6]) { const b = K.sphere([x, 9.3, 2.5], 0.09, red, { sy: 0.6 }); b.userData.noInk = true; beacons.push(b); }

  // ---- the cradles: two rows down the aisle, every second one flat and empty; a warm heat lamp over each
  for (const x of ROWS) for (let i = 0; i < N; i++) {
    const y = Y0 + i * DY, full = (i + (x < 0 ? 0 : 1)) % 2 === 0;
    put('hospital/bassinet', [x, y, 0], 0);
    if (full) { const b = bundle([[0.36, 0.56, 0.82], [0.45, 0.66, 0.86], [0.30, 0.50, 0.76]][i % 3]), his = x === CRADLE[0] && Math.abs(y - CRADLE[1]) < 0.01;
      b.position.copy(K.B(x + 0.02, y, 0.82)); b.rotation.y = his ? 0 : (r() - 0.5) * 0.3; K.root.add(b); }
    else { const bare = M([0.50, 0.56, 0.60], 0.6); K.box([x - 0.30, y - 0.15, 0.80], [x + 0.30, y + 0.15, 0.81], bare, { r: 0.01 }); }   // bare: no sheet, no baby
    if (i % 2 === 0) put('hospital/monitor-stand', [x + (x < 0 ? -0.78 : 0.78), y + 0.6, 0], 0);
    K.cyl([x, y, 1.95], 0.12, 0.08, M([0.30, 0.32, 0.34], 0.6), { r2: 0.05 }); K.cyl([x + (x < 0 ? -0.3 : 0.3), y, 1.97], 0.012, 0.6, M([0.30, 0.32, 0.34], 0.6), { axis: 'x' });
    K.cyl([x, y, 1.9], 0.1, 0.01, full ? K.glow([1.0, 0.72, 0.45], 1.1) : M([0.18, 0.18, 0.2], 0.6));   // an empty cradle's lamp is off
    if (full) K.point([x, y, 1.75], '#ffc890', 9, 2.4);
  }
  put('hospital/iv-stand', [-2.6, 5.6, 0], 0); put('hospital/iv-stand', [2.7, 2.2, 0], 0);

  // ---- the boy of 23:59: his card and his mother's photo taped to the front of his cradle (the -y glass side)
  const [cx, cy] = CRADLE;
  K.card([cx + 0.0, cy - 0.212, 0.895], 0.24, 0.156, tagCanvas(), { env: 0.7 });
  const ph = K.card([cx + 0.2, cy - 0.214, 0.885], 0.15, 0.18, photoCanvas(), { env: 0.7 }); ph.rotation.z = -0.07;
  const tape = M([0.92, 0.88, 0.70], 0.6, { opacity: 0.85 });
  for (const [dx, dz, a] of [[-0.09, 0.97, 0.4], [0.15, 0.97, -0.4], [0.22, 0.975, 0.3], [0.32, 0.97, -0.3]]) { const t = K.cube([cx + dx, cy - 0.216, dz], [0.06, 0.002, 0.022], tape, { r: 0 }); t.rotation.z = a; }
  K.point([cx, cy - 0.9, 1.25], '#ffd2a0', 8, 2.4);                  // a soft warm light on the card and the photo

  // ---- red alarm light: monitors and beacons pulse together, once a second; red pools on faces and walls
  const reds = [[-1.75, 1.0, 1.4], [0.45, 0.9, 1.5], [-0.6, 3.4, 1.6], [1.7, 4.6, 1.6], [0, 8.6, 2.4], [-2.2, 7.0, 1.6]].map(p => K.point(p, '#ff2a1a', 0, 3.4));
  // the alarm: red ceiling beacons down the aisle, each a lit dome that throws a red pool on the ceiling and the floor
  const domes = [], domeL = [];
  for (const y of [-0.6, 1.6, 3.8, 6.0, 8.2]) { domes.push(K.sphere([0, y, 3.06], 0.13, red, { sz: 0.6 })); domeL.push(K.point([0, y, 2.75], '#ff2414', 0, 4.2)); }
  const pulse = new T.Group(); K.root.add(pulse);
  K.anim('pulse', pulse, f => { const k = 0.5 + 0.5 * Math.cos(2 * Math.PI * f / 30);
    reds.forEach((l, i) => { l.intensity = (i < 2 ? 8 : 12) * (0.35 + 0.65 * k); });
    beacons.forEach(b => { b.material = k > 0.4 ? red : redOff; });
    domes.forEach(b => { b.material = k > 0.4 ? red : redOff; }); domeL.forEach(l => { l.intensity = 22 * (0.25 + 0.75 * k); }); });

  // ---- cool night fill from the corridor, a ceiling strip at the back
  K.point([0, 6.5, 2.2], '#b9c8e6', 8, 4.0); K.point([0, 2.0, 2.2], '#c7d2ea', 6, 3.2);
  return { props: K.props };
}
