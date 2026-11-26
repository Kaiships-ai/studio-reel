// wif5 part h: a lab at night, month 6. A glass womb tank in the middle of the room, a heartbeat monitor on a stand beside it
// (a big green trace), benches and cabinets along the back wall. At FLAT the trace goes flat and the monitor and the tank's
// beacon turn red: red practical light on faces and walls, the room's own light stays. Blender metres: x right, y into the
// scene, z up; camera on the y < 0 side. Light (LIGHT-RECIPE-V3): practicals reach 2.4-4.6 m at power 8-26, env x0.4.
import { createKit, rng, tex, place, SURF } from '/styles/stick-man/kit/film.js';
import { on } from './lib.js';

export const SUN_DIR = [-0.2, 0.5, -0.84];
export const SUN_CENTER = [0, 0.6, 1.2], SUN_HALF = 5;
export const TANK = [-0.3, 0.95], SCREEN = [0.45, 1.4, 2.08];
export const MARKS = { tank: [TANK[0], TANK[1], 0], screen: SCREEN };
export const PLACES = { tank: [TANK[0], TANK[1], 1.0], screen: SCREEN };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-2.6, -5], [2.6, 0.4]]];
export const FLAT = 2030;                 // film frame: the trace goes flat, the monitor turns red
const PROPS = ['lab/lab-bench', 'lab/bio-cabinet', 'lab/incubator', 'lab/chemistry-set', 'lab/stool', 'lab/industrial-microscope', 'lab/eyewash', 'lab/jars'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const LAB = place('lab', { light: 'lab-night', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|lab-night`, why, by })) });
export const COLLIDE = LAB.COLLIDE;
const ENV_K = 0.4;

// the monitor's picture: a scrolling-paper grid, a heartbeat trace and the rate (green), or the flat line and 0 (red)
function ecg(c, w, h, flat) {
  c.fillStyle = flat ? '#1c0a0a' : '#07180f'; c.fillRect(0, 0, w, h);
  c.strokeStyle = flat ? 'rgba(255,90,70,0.16)' : 'rgba(90,230,140,0.16)'; c.lineWidth = 2;
  for (let x = 0; x < w; x += w / 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += h / 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const base = h * 0.62, col = flat ? '#ff4a3a' : '#5dff8e';
  c.strokeStyle = col; c.lineWidth = h * 0.028; c.lineJoin = c.lineCap = 'round'; c.beginPath(); c.moveTo(0, base);
  if (flat) c.lineTo(w, base);
  else for (let k = 0; k < 3; k++) { const x0 = w * (0.06 + k * 0.32), s = w * 0.32;
    const pts = [[0, 0], [0.18, 0], [0.24, -0.06], [0.30, 0], [0.38, 0], [0.42, 0.10], [0.47, -0.52], [0.53, 0.22], [0.57, 0], [0.70, 0], [0.78, -0.12], [0.86, 0], [1, 0]];
    for (const [u, v] of pts) c.lineTo(x0 + u * s, base + v * h); }
  c.stroke();
  c.fillStyle = col; c.font = `900 ${h * 0.2}px InterReel, Arial Black, sans-serif`; c.textAlign = 'left';
  c.fillText(flat ? '♥ 0' : '♥ 142', w * 0.05, h * 0.24);
  c.font = `900 ${h * (flat ? 0.17 : 0.09)}px InterReel, Arial Black, sans-serif`; c.textAlign = 'right'; c.fillText(flat ? 'NO PULSE' : 'BPM', w * 0.95, h * (flat ? 0.92 : 0.2));
}

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.16, 0.19, 0.22], mid: [0.17, 0.19, 0.20], bottom: [0.09, 0.10, 0.11] }, envK: ENV_K });
  const T = K.THREE, r = rng(11), M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await LAB.open(stage, { kit: K, material });

  // ---- shell: a blue-grey vinyl floor (legs read on it), pale teal walls, a dark ceiling with light panels
  const wall = M('#6c8086', 0.9, { map: SURF.plaster('#6c8086', 4) });
  K.box([-3.2, -6, -0.2], [3.2, 3, 0], M('#ffffff', 0.5, { map: SURF.checker('#8e9aa0', '#7f8b91', 12), repeat: [4, 6] }), { r: 0 });
  K.box([-3.2, 2.6, 0], [3.2, 2.9, 3.0], wall, { r: 0 });
  for (const sx of [-3.2, 2.9]) K.box([sx, -6, 0], [sx + 0.3, 2.9, 3.0], wall, { r: 0 });
  K.box([-3.2, -6, 3.0], [3.2, 3, 3.15], M('#3e464a', 0.95), { r: 0, cast: false });
  K.box([-2.9, 2.58, 0], [2.9, 2.6, 0.12], M('#3b4548', 0.6), { r: 0 });

  // ---- the kit's lab along the back wall: benches, the safety cabinet, an incubator, glassware, a stool
  put('lab/lab-bench', [-1.6, 2.15, 0], 0); put('lab/lab-bench', [1.4, 2.15, 0], 0);
  put('lab/bio-cabinet', [2.4, 1.4, 0], -90); put('lab/incubator', [-2.5, 1.3, 0], 90);
  put('lab/chemistry-set', [-1.8, 2.2, 0.92], 0); put('lab/industrial-microscope', [1.1, 2.2, 0.92], 0); put('lab/jars', [1.8, 2.25, 0.92], 0);
  put('lab/stool', [-1.15, 1.4, 0], 0); put('lab/eyewash', [0.2, 2.58, 1.2], 0);

  // ---- the womb tank: a steel plinth, a glass column of amber fluid, the unborn child curled inside, a lid with a beacon
  const steel = M('#7f8a90', 0.35, { metal: 0.6 }), dark = M('#30373b', 0.5, { metal: 0.3 });
  const [tx, ty] = TANK;
  K.cyl([tx, ty, 0.14], 0.46, 0.28, steel, { seg: 48 }); K.cyl([tx, ty, 0.29], 0.42, 0.03, dark, { seg: 48 });
  K.cyl([tx, ty, 0.93], 0.37, 1.26, K.glass([0.80, 0.92, 0.95], { opacity: 0.22 }), { seg: 48, open: true });
  K.cyl([tx, ty, 0.88], 0.35, 1.12, M('#f3e2c4', 0.2, { opacity: 0.16, emit: '#6a4a2a', emitK: 0.15 }), { seg: 48 });
  K.cyl([tx, ty, 1.60], 0.45, 0.12, steel, { seg: 48 }); K.cyl([tx, ty, 1.68], 0.3, 0.05, dark, { seg: 40 });
  for (const a of [0.5, 2.6, 3.7, 5.7]) K.cyl([tx + Math.cos(a) * 0.40, ty + Math.sin(a) * 0.40, 0.93], 0.018, 1.26, steel, { seg: 12 });
  // the child: curled, head down-left, knees up (a soft pink figure, lit warm from inside the fluid)
  // a big head with a closed eye, the back rounded, knees drawn up to the chest, a hand by the mouth, the cord from the belly
  const skin = M('#ff9e8c', 0.6, { emit: '#c25a48', emitK: 0.5 }), k = 1.5, zc = 0.95;
  const e = (dx, dy, z, r, o) => K.sphere([tx + dx * k, ty - 0.06 + dy * k, zc + (z - zc) * k], r * k, skin, o);
  e(-0.07, 0, 1.04, 0.08); e(0.02, 0.01, 0.93, 0.075, { sx: 0.9, sy: 0.8, sz: 1.3 });
  e(0.0, -0.04, 0.85, 0.04, { sx: 1.6 }); e(-0.05, -0.05, 0.9, 0.03, { sz: 1.6 }); e(-0.07, -0.055, 0.85, 0.024, { sx: 1.3 });
  e(-0.03, -0.06, 0.96, 0.022, { sz: 1.7 }); e(-0.08, -0.07, 0.995, 0.019);
  K.box([tx - 0.12 * k, ty - 0.06 - 0.082 * k, zc + 0.095 * k], [tx - 0.085 * k, ty - 0.06 - 0.076 * k, zc + 0.102 * k], M('#4a2a22', 0.6), { r: 0.002 });
  K.point([tx, ty - 0.3, 1.0], '#ffcfa0', 6, 1.2);
  K.cyl([tx + 0.05, ty, 0.6], 0.012, 0.32, M('#c77a6a', 0.6), { seg: 8 });   // the cord to the plinth
  // hoses to a pump box beside it
  K.box([tx - 0.85, ty - 0.2, 0], [tx - 0.55, ty + 0.15, 0.55], M('#4c5a60', 0.5), { r: 0.02 });
  K.cyl([tx - 0.5, ty - 0.02, 0.45], 0.025, 0.3, dark, { axis: 'x', seg: 12 });
  const glow = K.point([tx, ty - 0.1, 0.95], '#ffb07a', 8, 2.4);                       // the fluid's own warm light
  const beacon = K.sphere([tx, ty, 1.73], 0.05, K.glow([0.25, 0.06, 0.05], 1.0));

  // ---- the monitor on its stand: the trace faces the room and the lens
  const [sx, sy, sz] = SCREEN;
  K.cyl([sx, sy + 0.05, (sz - 0.2) / 2], 0.03, sz - 0.2, dark, { seg: 16 }); K.cyl([sx, sy + 0.05, 0.02], 0.26, 0.04, dark, { seg: 32 });
  K.box([sx - 0.42, sy + 0.02, sz - 0.27], [sx + 0.42, sy + 0.1, sz + 0.27], M('#22282b', 0.5), { r: 0.02 });
  const green = tex(1024, 600, (c, w, h) => ecg(c, w, h, false)), red = tex(1024, 600, (c, w, h) => ecg(c, w, h, true));
  const screen = K.card([sx, sy, sz], 0.78, 0.48, green, { emissive: 0.85 });
  const screenL = K.point([sx - 0.1, sy - 0.3, sz - 0.05], '#62e890', 9, 2.6);

  // ---- room light: two ceiling panels (cool), a desk lamp warm on the back bench, a low fill on the faces
  for (const [x, y] of [[-1.0, 0.2], [1.0, 0.2]]) { K.box([x - 0.5, y - 0.3, 2.96], [x + 0.5, y + 0.3, 3.0], K.glow([0.62, 0.70, 0.74], 0.3), { r: 0 }); }
  const top1 = K.point([-1.0, 0.1, 2.4], '#d6e4ec', 13, 4.0), top2 = K.point([1.0, 0.1, 2.4], '#d6e4ec', 13, 4.0);
  K.point([-1.6, 2.0, 1.4], '#ffc98a', 9, 2.6);
  const fillL = K.point([0.2, -1.2, 1.5], '#e8dccb', 9, 3.0);
  const alarm = K.point([tx, ty - 0.55, 1.5], '#ff3a2e', 0, 2.6);
  // red practicals for the flat line: a lamp on the monitor's top and a wall beacon over the bench, each a visible source
  const lampM = K.sphere([sx, sy + 0.06, sz + 0.32], 0.045, K.glow([0.25, 0.06, 0.05], 1.0)); K.cyl([sx, sy + 0.06, sz + 0.28], 0.03, 0.04, dark, { seg: 12 });
  const redM = K.point([sx - 0.3, sy + 0.25, 1.45], '#ff3326', 0, 2.4);
  K.box([0.45, 2.5, 1.85], [0.75, 2.6, 2.05], dark, { r: 0.01 }); const lampW = K.sphere([0.6, 2.47, 1.95], 0.07, K.glow([0.25, 0.06, 0.05], 1.0));
  const redW = K.point([0.6, 2.2, 1.9], '#ff3326', 0, 2.2);

  // at FLAT: the trace flat and red, the monitor's light red and stronger, the beacon lit red; the panels dim a little
  const swap = new T.Group(); K.root.add(swap);
  K.anim('screen', swap, f => {
    const flat = f >= FLAT, m = screen.material; if (m.map !== (flat ? red : green)) { m.map = flat ? red : green; m.needsUpdate = true; }
    screenL.color.set(flat ? '#ff3b2f' : '#62e890'); screenL.intensity = flat ? 22 : 9;
    alarm.intensity = flat ? 20 : 0; redM.intensity = flat ? 20 : 0; redW.intensity = flat ? 10 : 0; fillL.intensity = flat ? 3 : 9;
    for (const s of [beacon, lampM, lampW]) s.material.color.setRGB(...(flat ? [2.2, 0.25, 0.18] : [0.25, 0.06, 0.05]));
    top1.intensity = top2.intensity = flat ? 5 : 13; glow.intensity = flat ? 5 : 8;
  });
  swap.position.copy(K.B(sx, sy, sz));
  return { props: K.props };
}
