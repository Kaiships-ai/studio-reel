// wif5 part i: a care-home lounge, an evening, years on. A round table with a cake (an 8 and a 0 for candles), armchairs
// round it, a floor lamp, a clock, pictures. The old men stand round the cake; he leans in and blows (BLOW: a puff, the
// flames bent away from him); then (EMPTY) only he is left and the chairs are empty, a paper hat on each. Blender metres:
// x right, y into the scene, z up; camera on the y < 0 side. Light (LIGHT-RECIPE-V3): practicals 8-26 power, env x0.4.
import { createKit, rng, tex, place, SURF } from '/styles/stick-man/kit/film.js';
import { holder, on } from './lib.js';

export const SUN_DIR = [0.3, 0.5, -0.81];
export const SUN_CENTER = [0, 0.6, 1.0], SUN_HALF = 5;
export const TABLE = [0, 0.55], CAKE_TOP = 0.92;
export const MARKS = { table: [TABLE[0], TABLE[1], 0], cake: [TABLE[0], TABLE[1], CAKE_TOP] };
export const PLACES = { cake: [TABLE[0], TABLE[1], CAKE_TOP] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-2.4, -5], [2.4, 0.3]]];
export const BLOW = [[2222, 2270]], EMPTY = 2270;
// the chairs round the table: [x, y, deg] (deg: the chair turned to face the table)
export const CHAIRS = [[-0.62, 1.6, -15], [0.62, 1.6, 15], [-1.1, 0.55, -80], [1.1, 0.55, 80]];
const PROPS = ['care-home/armchair', 'care-home/lamp-round-floor', 'care-home/wall-clock', 'care-home/fancy-picture-frame', 'care-home/rug-round', 'care-home/tea-set'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const LOUNGE = place('care-home', { light: 'lounge-evening', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|lounge-evening`, why, by })) });
export const COLLIDE = LOUNGE.COLLIDE;
const ENV_K = 0.4;

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.20, 0.17, 0.14], mid: [0.22, 0.18, 0.14], bottom: [0.11, 0.09, 0.07] }, envK: ENV_K });
  const T = K.THREE, r = rng(13), M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await LOUNGE.open(stage, { kit: K, material });
  const H = holder(stage, T);

  // ---- shell: a warm carpet, papered walls with a dado rail, a soft ceiling
  const paper = M('#b7896a', 0.9, { map: SURF.plaster('#b7896a', 4) });
  K.box([-3, -6, -0.2], [3, 3, 0], M('#8a5a48', 0.95), { r: 0 });
  K.box([-3, 2.4, 0], [3, 2.7, 2.8], paper, { r: 0 });
  for (const sx of [-3, 2.7]) K.box([sx, -6, 0], [sx + 0.3, 2.7, 2.8], paper, { r: 0 });
  K.box([-2.7, 2.37, 0.9], [2.7, 2.4, 0.95], M('#6e4a34', 0.6), { r: 0 }); K.box([-2.7, 2.38, 0], [2.7, 2.4, 0.9], M('#7d5a43', 0.85), { r: 0 });
  K.box([-3, -6, 2.8], [3, 3, 2.95], M('#a89a86', 0.9), { r: 0, cast: false });

  // ---- the kit's lounge: armchairs round the table, a rug, the lamp, the clock and pictures on the wall, a tea set
  put('care-home/rug-round', [TABLE[0], TABLE[1], 0], 0);
  for (const [x, y, d] of CHAIRS) put('care-home/armchair', [x, y, 0], d);
  put('care-home/lamp-round-floor', [-1.9, 1.7, 0], 0); put('care-home/wall-clock', [0.9, 2.38, 1.9], 0);
  put('care-home/fancy-picture-frame', [-0.6, 2.38, 1.55], 0); put('care-home/tea-set', [1.7, 1.9, 0], 0);

  // ---- the table and the cake: two tiers of pink icing, a drip ring, an 8 and a 0 (candles) with their flames
  const [tx, ty] = TABLE;
  K.cyl([tx, ty, 0.71], 0.5, 0.04, M('#6b4430', 0.5), { seg: 48 }); K.cyl([tx, ty, 0.36], 0.06, 0.68, M('#4e3123', 0.5), { seg: 16 });
  K.cyl([tx, ty, 0.02], 0.28, 0.04, M('#4e3123', 0.5), { seg: 32 });
  K.cyl([tx, ty, 0.74], 0.29, 0.015, M('#c7b8a8', 0.4), { seg: 48 });                                     // the plate
  const icing = M('#e9a7b4', 0.55), sponge = M('#d9a066', 0.7), cream = M('#efd7b0', 0.5);
  K.cyl([tx, ty, 0.80], 0.24, 0.11, icing, { seg: 48 }); K.cyl([tx, ty, 0.885], 0.17, 0.07, cream, { seg: 48 });
  K.torus([tx, ty, 0.855], 0.235, 0.014, M('#d97f94', 0.5)); K.torus([tx, ty, 0.92], 0.165, 0.012, M('#d97f94', 0.5));
  for (let i = 0; i < 10; i++) { const a = i * 0.628; K.sphere([tx + Math.cos(a) * 0.2, ty + Math.sin(a) * 0.2, 0.86], 0.016, M(i % 2 ? '#7fb3d9' : '#f0c75a', 0.5)); }
  // the numbers: tori standing up and facing the lens; 8 = two rings, 0 = one tall ring
  const wax = [M('#5f9fd8', 0.5), M('#f0b84a', 0.5)], flames = [], CT = CAKE_TOP;
  const ring = (x, z, R, sy, m) => { const t = new T.Mesh(new T.TorusGeometry(R, 0.013, 10, 32), m); t.position.copy(K.B(x, ty - 0.02, z)); t.scale.set(1, sy, 1); t.userData.noInk = true; t.castShadow = true; K.root.add(t); };
  ring(tx - 0.06, CT + 0.035, 0.03, 1, wax[0]); ring(tx - 0.06, CT + 0.098, 0.03, 1, wax[0]); ring(tx + 0.06, CT + 0.065, 0.045, 1.4, wax[1]);
  for (const [x, zt] of [[tx - 0.06, CT + 0.13], [tx + 0.06, CT + 0.13]]) {
    K.cyl([x, ty - 0.02, zt + 0.008], 0.002, 0.016, M('#2a2420', 0.8), { seg: 6 });
    const fl = new T.Group(); fl.position.copy(K.B(x, ty - 0.02, zt + 0.016)); K.root.add(fl);
    const cone = new T.Mesh(new T.ConeGeometry(0.022, 0.085, 16), K.glow([1.0, 0.70, 0.28], 1.6)); cone.position.y = 0.042; fl.add(cone);
    const core = new T.Mesh(new T.SphereGeometry(0.018, 12, 8), K.glow([1.0, 0.84, 0.5], 1.4)); core.position.y = 0.018; fl.add(core);
    flames.push(fl);
  }
  const candle = K.point([tx, ty - 0.12, CT + 0.2], '#ffb45e', 7, 1.8);

  // ---- room light: the lamp's warm pool, a warm pendant over the table, a cool window spill from the left, a face fill
  K.point([-1.9, 1.6, 1.55], '#ffc27f', 12, 3.2);
  K.cyl([tx, ty, 2.45], 0.2, 0.16, M('#c98a3a', 0.5), { r2: 0.06, open: true }); K.cyl([tx, ty, 2.65], 0.006, 0.3, M('#222', 0.5));
  K.sphere([tx, ty, 2.4], 0.05, K.glow([1.0, 0.8, 0.5], 1.0));
  K.point([tx, ty - 0.1, 2.2], '#ffc98a', 18, 3.6);
  K.point([-2.4, -0.5, 1.6], '#9fb6dc', 9, 3.4);
  K.point([0.3, -1.4, 1.4], '#ffd9b0', 9, 3.0);

  // ---- the blow: a puff from his mouth toward the candles, the flames leaning away from him (to the lens), the glow low
  const puff = new T.Group(), pm = K.glow([0.55, 0.72, 0.88], 1.0), sm = K.glow([0.55, 0.72, 0.88], 1.0); pm.transparent = true; pm.opacity = 0.45; pm.depthWrite = false; K.root.add(puff);
  // three wind streaks (arcs) from his lips to the flames
  for (const [x, u] of [[-0.035, 0.01], [0.0, -0.02], [0.035, 0.0]]) { const a = new T.Mesh(new T.TorusGeometry(0.16, 0.009, 8, 24, 1.1), sm); a.rotation.set(0, Math.PI / 2, 0); a.position.set(x, u - 0.16, 0.2); a.userData.noInk = true; puff.add(a); }
  for (const [d, s, u] of [[0.03, 0.03, 0.0], [0.09, 0.04, -0.015], [0.17, 0.05, -0.04]]) {
    const b = new T.Mesh(new T.SphereGeometry(s, 16, 10), pm); b.position.set((r() - 0.5) * 0.02, u, d); b.userData.noInk = true; puff.add(b); }
  K.anim('puff', puff, f => {
    const blow = on(f, BLOW);
    if (blow) H.hold(puff, 'i_m', 'head', { off: [0, -0.10, 0.24], rot: [18, 0, 0] }); else puff.visible = false;
    for (const fl of flames) { fl.rotation.set(blow ? -0.7 : 0, 0, blow ? 0.75 : 0); fl.scale.set(blow ? 1.3 : 1, blow ? 1.5 : 1, blow ? 1.3 : 1); }
    candle.intensity = blow ? 4 : 7;
  });
  // the paper hats: on the friends' heads at the party, left on the empty chairs after
  const hats = [], hatM = [M('#5f9fd8', 0.6), M('#e86a6a', 0.6), M('#7cc48a', 0.6)];
  for (let i = 0; i < 3; i++) { const h = new T.Mesh(new T.ConeGeometry(0.09, 0.22, 18), hatM[i]); h.userData.noInk = true; h.castShadow = true; K.root.add(h); hats.push(h); }
  const hatG = new T.Group(); K.root.add(hatG);
  K.anim('hats', hatG, f => {
    if (f < EMPTY) { for (const [i, who] of [[0, 'i_a'], [1, 'i_b'], [2, 'i_m']].map(x => x)) H.hold(hats[i], who, 'head', { off: [0.02, 0.30, -0.02], rot: [-8, 0, 10] }); return; }
    // after: the friends' hats lie on the seats of the chairs; his own stays on
    for (const i of [0, 1]) { const [x, y] = CHAIRS[i]; hats[i].visible = true; hats[i].position.copy(K.B(x, y - 0.12, 0.56)); hats[i].rotation.set(0.25, 0, i ? 1.2 : -1.2); }
    H.hold(hats[2], 'i_m', 'head', { off: [0.02, 0.30, -0.02], rot: [-8, 0, 10] });
  });
  return { props: K.props };
}
