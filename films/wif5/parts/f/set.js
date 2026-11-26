// wif5 part f: a corner shop at night, month 3. Bare shelves both sides of one aisle, a gondola end at the back with one tin
// of baby milk left on it, fluorescent tubes (half of them dead), a cool street glow through the door, a warm pool over the
// tin. Blender metres: x right, y into the scene, z up; camera on the y < 0 side.
// Light (LIGHT-RECIPE-V3): practicals reach 2.4-4.6 m at power 8-26, materials env x0.4.
import { createKit, rng, tex, place, SURF } from '/styles/stick-man/kit/film.js';
import { holder, on, tin, bundle } from './lib.js';

export const SUN_DIR = [-0.3, 0.6, -0.74];
export const SUN_CENTER = [0, 1, 1.2], SUN_HALF = 6;
export const MARKS = { a: [-0.42, -0.35, 0], b: [0.42, -0.35, 0] };
export const PLACES = { tin: [0, 0.9, 1.05], shelf: [0, 1.0, 1.2] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-1.0, -6], [1.0, 0.6]]];
const PROPS = ['supermarket/shop-trolley', 'supermarket/shopping-basket', 'supermarket/cash-register', 'supermarket/counter-straight'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const SHOP = place('supermarket', { light: 'shop-night', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|shop-night`, why, by })) });
export const COLLIDE = SHOP.COLLIDE;
const ENV_K = 0.4;
// frames (film clock): the tin on the shelf until the grab, in both men's hands, then in A's hand pushed to B, then B's
export const STAND = [-0.01, 0.19, 0.667];   // the promo stand's top centre: under the two fathers' reaching hands, its lid at their height
export const TIN = { shelf: [[0, 1592]], grip: [[1592, 1622]], give: [[1622, 1700]] };

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.16, 0.18, 0.20], mid: [0.20, 0.19, 0.17], bottom: [0.10, 0.10, 0.10] }, envK: ENV_K });
  const T = K.THREE, r = rng(5), M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await SHOP.open(stage, { kit: K, material });
  const H = holder(stage, T);

  // ---- shell: a light lino floor (legs read on it), cream walls, a dark ceiling with tube fittings
  K.box([-3.5, -7, -0.2], [3.5, 4, 0], M('#ffffff', 0.55, { map: SURF.checker('#b9b2a2', '#9c9484', 10), repeat: [5, 8] }), { r: 0 });
  K.box([-3.5, 3.6, 0], [3.5, 4, 3.2], M('#8f8a7c', 0.9), { r: 0 });
  for (const sx of [-3.5, 3.25]) K.box([sx, -7, 0], [sx + 0.25, 4, 3.2], M('#857f70', 0.9), { r: 0 });
  K.box([-3.5, -7, 3.2], [3.5, 4, 3.35], M('#7a776e', 0.9), { r: 0, cast: false });

  // ---- shelving: two runs along the aisle and the gondola end at the back, every shelf bare (price strips, a torn box)
  const steel = M('#5f6a72', 0.45, { metal: 0.3 }), board = M('#c8c3b6', 0.6), strip = M('#d24a3a', 0.6), dust = M('#7a6a52', 0.9);
  const run = (x0, x1, y0, y1, face) => {
    K.box([x0, y0, 0], [x1, y1, 0.12], M('#3b3f44', 0.6));
    const back = face > 0 ? x0 : x1 - 0.03; K.box([back, y0, 0.12], [back + 0.03, y1, 2.0], steel, { r: 0 });
    for (let z = 0.42; z < 2.0; z += 0.4) { K.box([x0, y0, z], [x1, y1, z + 0.025], board, { r: 0.004 });
      const fx = face > 0 ? x1 : x0; K.box([fx - 0.005, y0, z - 0.035], [fx + 0.005, y1, z + 0.02], strip, { r: 0 }); }
    for (const y of [y0, y1]) K.box([x0, y - 0.02, 0], [x1, y + 0.02, 2.02], steel, { r: 0 });
  };
  run(-1.75, -1.2, -5.5, 0.6, 1); run(1.2, 1.75, -5.5, 0.6, -1);
  // the gondola end at the back of the aisle, facing the camera: four bare shelves, the tin on the middle one
  K.box([-0.9, 1.0, 0], [0.9, 1.5, 0.12], M('#3b3f44', 0.6)); K.box([-0.9, 1.45, 0.12], [0.9, 1.5, 2.0], steel, { r: 0 });
  for (const z of [0.5, 0.95, 1.4]) { K.box([-0.9, 1.0, z], [0.9, 1.45, z + 0.025], board, { r: 0.004 }); K.box([-0.9, 0.995, z - 0.035], [0.9, 1.005, z + 0.02], strip, { r: 0 }); }
  for (const x of [-0.9, 0.9]) K.box([x - 0.02, 1.0, 0], [x + 0.02, 1.5, 2.02], steel, { r: 0 });
  const sign = tex(512, 128, (c, w, h) => { c.fillStyle = '#2d5d8f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0e2b8'; c.font = `900 ${h * 0.5}px InterReel, Arial Black, sans-serif`; c.textAlign = 'center'; c.fillText('BABY', w / 2, h * 0.68); });
  K.card([0, 0.98, 2.2], 1.2, 0.3, sign, { env: ENV_K });
  K.box([-0.62, 1.0, 2.04], [0.62, 1.03, 2.36], M('#1d3554', 0.6), { r: 0.005 });
  // scraps on the bare shelves: a torn box, a fallen price card
  K.box([-1.7, -1.6, 0.845], [-1.42, -1.25, 0.95], dust, { r: 0.01 }); K.box([1.3, -2.8, 1.245], [1.6, -2.5, 1.27], dust, { r: 0.005 });
  K.box([0.3, 1.05, 0.525], [0.52, 1.3, 0.6], dust, { r: 0.01 });

  // the promo stand in the aisle that held the last tins: a waist-high cardboard bin, empty but for one
  const card = M('#7a5a3a', 0.85);
  K.box([STAND[0] - 0.16, STAND[1] - 0.13, 0], [STAND[0] + 0.16, STAND[1] + 0.13, STAND[2]], card, { r: 0.01 });
  K.box([STAND[0] - 0.17, STAND[1] - 0.14, STAND[2] - 0.01], [STAND[0] + 0.17, STAND[1] + 0.14, STAND[2] + 0.05], M('#2f5f94', 0.7), { r: 0.006 });
  // ---- dressing from the kit: a trolley left in the aisle, a basket on the floor, the till at the front
  put('supermarket/shop-trolley', [-0.75, -3.2, 0], 0); put('supermarket/shopping-basket', [0.85, -1.9, 0], 0);
  put('supermarket/counter-straight', [2.6, -5.6, 0], 0); put('supermarket/cash-register', [2.6, -5.6, 0.95], 0);

  // ---- light: tube fittings (glow) with point pools under the live ones; a warm pool on the gondola end (the tin)
  const tubeOn = K.glow([0.86, 0.96, 0.92], 0.85), tubeOff = M('#3a3d3f', 0.4);
  for (const [y, live] of [[-4.6, false], [-3.0, true], [-1.2, true], [0.4, false]]) {
    K.box([-0.12, y - 0.6, 3.1], [0.12, y + 0.6, 3.18], M('#2a2c2e', 0.5), { r: 0.01 });
    K.box([-0.06, y - 0.55, 3.07], [0.06, y + 0.55, 3.1], live ? tubeOn : tubeOff, { r: 0 });
    if (live) K.point([0, y, 2.85], '#cfe6dc', 18, 4.2);
  }
  K.point([0, 0.2, 2.4], '#ffc27a', 22, 3.4);          // the warm pool over the gondola end and the two men
  K.point([0.2, -1.1, 1.3], '#ffd0a0', 9, 2.6);         // a low warm fill at chest height: the faces and hands
  K.point([-2.2, -5.0, 2.2], '#7aa0d8', 12, 4.4);       // the street's cool glow from the door side

  // ---- the tin and the baby (B's, in a sling on his chest)
  const t = tin(K, tex, { s: 1 }); K.root.add(t); const S0 = 1.25;
  // the tin stands on the stand the whole part; the fathers' hands press down on its lid (the lid top at 0.98 m)
  K.anim('tin', t, f => { t.scale.setScalar(S0); t.visible = true; t.position.copy(K.B(STAND[0], STAND[1], STAND[2] + 0.05 + 0.085 * S0 + 0.02)); t.rotation.set(0, 0.25, 0); });
  // B's baby in a carrier strapped to his chest: a padded pouch, two straps over his shoulders, her head out of the top
  const baby = bundle(K, tex, { rings: false }); K.root.add(baby);
  const carrier = new T.Group(), cloth = M('#2f4f73', 0.85), trim = M('#1f344d', 0.8); K.root.add(carrier);
  const pouch = new T.Mesh(new T.SphereGeometry(1, 24, 16), cloth); pouch.scale.set(0.135, 0.15, 0.075); pouch.position.set(0, -0.13, 0.08); carrier.add(pouch);
  for (const s of [-1, 1]) { const st = new T.Mesh(new T.BoxGeometry(0.045, 0.36, 0.02), trim); st.position.set(s * 0.1, 0.13, 0.0); st.rotation.set(-0.25, 0, -s * 0.12); carrier.add(st); }
    carrier.traverse(m => { if (m.isMesh) { m.userData.noInk = true; m.castShadow = true; } });
  K.anim('carrier', carrier, f => H.hold(carrier, 'f_b', 'chest', { off: [0, -0.08, 0.1], rot: [0, 0, 0] }));
  K.anim('baby', baby, f => { baby.scale.setScalar(0.95); H.hold(baby, 'f_b', 'chest', { off: [0.01, -0.17, 0.2], rot: [0, 0, 70] });
    baby.updateMatrixWorld(true); baby.userData.look(stage.camera); });
  return { props: K.props };
}
