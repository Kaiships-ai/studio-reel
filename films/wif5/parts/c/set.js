// wif5 part c: a care home's day room at dusk, three days on. A small table for two by the window: his cup under his hand,
// hers poured and waiting at an empty chair with her cardigan over its back. Behind, the one carer left crosses with four
// trays. Low warm window sun (LIGHT-RECIPE-V3 keeps 3.0 here) and a table lamp; plain warm walls, a wooden floor.
// Blender metres: x right, y into the scene, z up; the camera on the y < 0 side.
import { createKit, rng, tex, place, SURF } from '/styles/stick-man/kit/film.js';
import { teacup } from './props.js';

export const SUN_DIR = [-0.75, 0.35, -0.45];                          // low, from the window on the right
export const SUN_CENTER = [0, 1.5, 1.0], SUN_HALF = 6;
export const TABLE = { at: [0.075, 0.9], w: 1.35, d: 0.8, h: 0.75 };     // h: the top, at the saucer under his hand (dbg: hand z 0.81, grip 0.06)
export const MARKS = { him: [-0.2, 1.48, 0], chair: [0.25, 0.2, 0], carer: [1.6, 3.4, 0] };   // her chair across the table from him, its back to the room
export const PLACES = { hercup: [-0.06, 0.68, 0.8], chair: [0.25, 0.2, 0.85], mycup: [-0.3, 1.1, 0.8], carer: [0.6, 3.4, 1.4], trays: [0.4, 3.3, 0.85] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-3.2, -3.5], [3.2, 0.3]]];
const PROPS = ['care-home/lamp-round-floor', 'care-home/fancy-picture-frame', 'care-home/wall-clock', 'care-home/armchair', 'care-home/rug-round', 'care-home/walking-frame'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const DAYROOM = place('care-home', { light: 'dayroom-dusk', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|dayroom-dusk`, why, by })) });
export const COLLIDE = DAYROOM.COLLIDE;
const ENV_K = 0.42;

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.26, 0.22, 0.20], mid: [0.34, 0.26, 0.20], bottom: [0.16, 0.12, 0.10] }, envK: ENV_K });
  const T = K.THREE, r = rng(3);
  const M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await DAYROOM.open(stage, { kit: K, material });

  // ---- the room: honey boards, a warm sage wall with a dado and a cream upper half, the window on the right wall
  const boards = SURF.wood([0.62, 0.42, 0.24], 7, 2); boards.repeat.set(4, 4);
  K.box([-3.6, -4, -0.2], [3.6, 6, 0], M([1, 1, 1], 0.6, { map: boards }), { r: 0, cast: false });
  const low = M([0.36, 0.44, 0.34], 0.9, { map: SURF.plaster('#5e7356', 2) }), up = M([0.74, 0.64, 0.50], 0.9, { map: SURF.plaster('#b9a07e', 4) }), rail = M([0.42, 0.28, 0.16], 0.6);
  K.box([-3.6, 5.0, 0], [3.6, 5.25, 1.0], low, { r: 0 }); K.box([-3.6, 5.0, 1.0], [3.6, 5.25, 2.9], up, { r: 0 }); K.box([-3.6, 4.96, 0.98], [3.6, 5.0, 1.06], rail, { r: 0.005 });
  K.box([-3.85, -4, 0], [-3.6, 5.2, 1.0], low, { r: 0 }); K.box([-3.85, -4, 1.0], [-3.6, 5.2, 2.9], up, { r: 0 }); K.box([-3.6, -4, 0.98], [-3.56, 5.0, 1.06], rail, { r: 0.005 });
  // right wall with a wide low window (the sun comes through it): wall pieces round the opening
  const wx = 3.6; K.box([wx, -4, 0], [wx + 0.25, 5.2, 0.85], low, { r: 0 }); K.box([wx, -4, 2.3], [wx + 0.25, 5.2, 2.9], up, { r: 0 });
  K.box([wx, -4, 0.85], [wx + 0.25, 0.2, 2.3], up, { r: 0 }); K.box([wx, 3.0, 0.85], [wx + 0.25, 5.2, 2.3], up, { r: 0 });
  const frame = M([0.88, 0.82, 0.70], 0.6);
  for (const y of [0.2, 1.6, 3.0]) K.box([wx - 0.04, y - 0.04, 0.85], [wx + 0.05, y + 0.04, 2.3], frame);
  K.box([wx - 0.12, 0.2, 0.8], [wx + 0.05, 3.0, 0.86], frame); K.box([wx - 0.04, 0.2, 2.28], [wx + 0.05, 3.0, 2.34], frame);
  const dusk = SURF.grad([[0, '#3b4a78'], [0.45, '#c9785a'], [0.75, '#f0b070'], [1, '#6a5040']]);
  K.card([wx + 1.2, 1.6, 1.6], 4.0, 2.6, dusk, { rotZ: -90, emissive: 1.1 });
  K.box([-3.6, -4, 2.9], [3.6, 5.2, 3.0], M([0.40, 0.34, 0.28], 0.95), { r: 0, cast: false });

  // ---- the table for two: a cloth, his cup (in his hand: the hand prop), hers on its saucer at the empty chair
  const { at: [tx, ty], w, d, h } = TABLE, wood = M([0.36, 0.22, 0.12], 0.55);
  K.box([tx - w / 2, ty - d / 2, h - 0.04], [tx + w / 2, ty + d / 2, h], wood, { r: 0.01 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.box([tx + sx * (w / 2 - 0.08) - 0.025, ty + sy * (d / 2 - 0.08) - 0.025, 0], [tx + sx * (w / 2 - 0.08) + 0.025, ty + sy * (d / 2 - 0.08) + 0.025, h - 0.04], wood, { r: 0.008 });
  const lace = tex(256, 256, (g, W) => { g.fillStyle = '#9c8460'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(90,60,40,0.5)'; g.lineWidth = 3; for (let i = 8; i < W; i += 24) { g.beginPath(); g.arc(W / 2, W / 2, i, 0, 7); g.stroke(); } });
  K.box([tx - 0.55, ty - 0.28, h], [tx + 0.55, ty + 0.36, h + 0.004], M([1, 1, 1], 0.9, { map: lace }), { r: 0, cast: false });
  const hers = teacup(undefined, { steam: true }); hers.position.copy(K.B(...PLACES.hercup.slice(0, 2), h + 0.004)); hers.rotation.y = 0.6; K.root.add(hers);

  // ---- her chair: a wooden dining chair pulled up to the table opposite him, its back to the room, her plum cardigan
  // hung over that back on the outside (buttons, ribbed cuffs, the shoulders folded over the top rail)
  const [chx, chy] = MARKS.chair, cg = K.group([chx, chy, 0], 192), seatW = M([0.40, 0.25, 0.14], 0.6);
  K.box([-0.22, -0.22, 0.44], [0.22, 0.22, 0.49], seatW, { parent: cg, r: 0.01 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.box([sx * 0.19 - 0.022, sy * 0.19 - 0.022, 0], [sx * 0.19 + 0.022, sy * 0.19 + 0.022, 0.44], seatW, { parent: cg, r: 0.006 });
  for (const sx of [-1, 1]) K.box([sx * 0.19 - 0.022, 0.17, 0.49], [sx * 0.19 + 0.022, 0.215, 1.0], seatW, { parent: cg, r: 0.006 });
  K.box([-0.21, 0.17, 0.86], [0.21, 0.215, 0.98], seatW, { parent: cg, r: 0.008 });
  const knit = M([0.80, 0.42, 0.52], 0.95, { map: tex(256, 256, (g, W) => { g.fillStyle = '#c96f86'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(80,20,40,0.32)'; g.lineWidth = 4;
    for (let x = 6; x < W; x += 14) { g.beginPath(); for (let y = 0; y <= W; y += 8) g.lineTo(x + ((y / 8) % 2 ? 3 : -3), y); g.stroke(); }
    g.fillStyle = '#efe0c8'; g.fillRect(W / 2 - 8, 0, 16, W); }) });
  // the cardigan as a garment: body, V neck, button band, two sleeves hanging down, hung over the back rail facing the room
  const sh = new T.Shape(); sh.moveTo(-0.2, 0.0); sh.lineTo(-0.21, 0.38); sh.lineTo(-0.3, 0.36); sh.lineTo(-0.36, -0.02); sh.lineTo(-0.27, -0.04); sh.lineTo(-0.23, 0.22);
  sh.lineTo(-0.22, -0.12); sh.lineTo(-0.02, -0.12); sh.lineTo(0, 0.24); sh.lineTo(0.02, -0.12); sh.lineTo(0.22, -0.12); sh.lineTo(0.23, 0.22); sh.lineTo(0.27, -0.04); sh.lineTo(0.36, -0.02);
  sh.lineTo(0.3, 0.36); sh.lineTo(0.21, 0.38); sh.lineTo(0.08, 0.40); sh.lineTo(0, 0.30); sh.lineTo(-0.08, 0.40); sh.lineTo(-0.2, 0.38);
  const cgeo = new T.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  const uv = cgeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.36) / 0.72, (uv.getY(i) + 0.12) / 0.52);
  const card = new T.Mesh(cgeo, knit); card.position.copy(K.B(0, 0.25, 0.6)); card.castShadow = true; card.userData.noInk = true; cg.add(card);
  K.box([-0.23, 0.15, 0.96], [0.23, 0.275, 1.03], knit, { parent: cg, r: 0.03 });   // the shoulders over the top rail
  for (let i = 0; i < 4; i++) K.sphere([0.0, 0.282, 0.53 + i * 0.075], 0.014, M([0.92, 0.84, 0.62], 0.4), { parent: cg });
  for (const sx of [-1, 1]) K.box([sx * 0.315 - 0.05, 0.245, 0.54], [sx * 0.315 + 0.05, 0.295, 0.585], M([0.45, 0.15, 0.26], 0.95), { parent: cg, r: 0.015 });   // ribbed cuffs
  K.box([-0.22, 0.245, 0.43], [0.22, 0.295, 0.48], M([0.45, 0.15, 0.26], 0.95), { parent: cg, r: 0.015 });   // the hem band
  // his own chair pushed back against the wall (he cannot sit; it stands empty too)
  put('care-home/armchair', [-2.3, 3.9, 0], 180);

  // ---- the day room behind: a rug, a lamp, an empty armchair, a walking frame, a picture and the clock
  put('care-home/rug-round', [0.2, 1.4, 0], 0);
  put('care-home/lamp-round-floor', [-1.4, 2.0, 0], 0);
  put('care-home/armchair', [-2.6, 2.3, 0], 90); put('care-home/walking-frame', [-1.9, 1.2, 0], 90);
  put('care-home/fancy-picture-frame', [-0.6, 4.98, 1.55], 0); put('care-home/wall-clock', [1.6, 4.98, 1.9], 0);
  // a serving door at the back right the carer comes from
  const door = M([0.52, 0.36, 0.22], 0.6); K.box([2.2, 4.9, 0], [3.2, 5.0, 2.2], door, { r: 0.01 }); K.box([2.12, 4.88, 0], [3.28, 5.0, 2.28], frame, { r: 0.01 });
  K.card([2.7, 4.88, 1.6], 0.5, 0.12, tex(256, 64, (g) => { g.fillStyle = '#e9e0cc'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#3a3030'; g.font = '900 34px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('KITCHEN', 128, 45); }), { env: 0.6 });

  // ---- light: the low sun through the window (act light), the lamp's pool, a warm pool over the table, a cool fill
  K.point([-1.4, 1.8, 1.45], '#ffcf96', 12, 3.4);
  K.point([0.0, 0.6, 2.0], '#ffd8a8', 12, 3.0);
  K.point([1.4, 3.2, 2.2], '#ffd0a0', 10, 3.2);
  K.point([-0.6, -1.5, 1.8], '#c8d0f0', 6, 3.4);
  void r;
  return { props: K.props };
}
