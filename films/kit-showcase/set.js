// kit-showcase set: a dusk market corner, lit as one set. Props come only from the kit catalogue (propKit through film.js place()),
// in the set's own material and light. Blender metres: x right, y into the scene, z up; camera on the y < 0 side.
import { createKit, rng, tex, place } from '/styles/stick-man/kit/film.js';

export const SUN_DIR = [0.35, 0.50, -0.78];
export const SUN_CENTER = [0, 3, 1.2], SUN_HALF = 9;
export const MARKS = { bench: [-1.7, 3.3, 0] };
export const PLACES = { bench: [-1.7, 3.3, 0.4] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-9, -12], [9, 9]]];
const STREET = ['street/market-stand', 'street/street-lamp', 'street/bench', 'street/fire-hydrant', 'street/cart', 'street/ad-board', 'street/traffic-cone',
  'street/flowers', 'street/standing-picture-frame', 'street/taxi', 'street/bench-2'];
const MISC = ['misc/present', 'misc/cake-birthday', 'misc/suit-case', 'misc/book'];
// no `light|prop|light` row exists in kit/compat.json yet (every light pair is untested): each one is waived by name, nothing loosened
const why = 'no light rows exist in compat.json (all untested); waived pair by pair for this showcase', by = 'kit-showcase builder (Kai asked to see the kit working)';
const wv = (L, ps) => ps.map(p => ({ pair: `light|${p}|${L}`, why, by }));
export const PLAZA = place('street', { light: 'plaza-dusk', props: STREET, waivers: wv('plaza-dusk', STREET) });
export const GOODS = place('misc', { light: 'plaza-dusk', props: MISC, collide: PLAZA.COLLIDE, waivers: wv('plaza-dusk', MISC) });
export const COLLIDE = PLAZA.COLLIDE;
const ENV_K = 0.4;

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.16, 0.14, 0.26], mid: [0.30, 0.20, 0.14], bottom: [0.09, 0.08, 0.08] }, envK: ENV_K });
  const T = K.THREE, r = rng(5), M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  // #205: the set's own lit material and its own parent group for every catalogue prop
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const parent = K.root;
  const A = await PLAZA.open(stage, { kit: K, material, parent }), G = await GOODS.open(stage, { kit: K, material, parent });
  const put = (p, at, deg = 0, o) => (p.startsWith('misc/') ? G : A).put(p, at, deg, o);

  const cobble = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#35333a'; g.fillRect(0, 0, w, h); const q = rng(3), n = 16, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = 0.75 + 0.4 * q(), o = (j % 2) * s / 2;
      g.fillStyle = `rgb(${112 * k},${100 * k},${98 * k})`; g.beginPath(); g.roundRect(i * s + o + 3, j * s + 3, s - 6, s - 6, 10); g.fill(); } }, { repeat: [8, 8] });
  K.box([-16, -14, -0.1], [16, 20, 0], M([1, 1, 1], 0.85, { map: cobble }), { r: 0, cast: false });

  // back row of shop fronts with lit windows
  const PL = ['#8a5a3c', '#6d3b34', '#3f5d63', '#a08154', '#4b4a6b', '#7a6248'], ledge = M([0.5, 0.52, 0.6], 0.95);
  const winOn = K.glow([1.0, 0.62, 0.30], 0.95), winOn2 = K.glow([1.0, 0.78, 0.45], 0.8), winOff = M([0.07, 0.08, 0.12], 0.3);
  let x = -14; for (const [w, h] of [[4.2, 6], [3.6, 7.5], [4.4, 5.5], [3.2, 7], [3.6, 8], [4.4, 6], [4.2, 7]]) {
    K.box([x, 9, 0], [x + w, 10.2, h], M(PL[Math.floor(r() * PL.length)], 0.85), { r: 0.02 });
    K.box([x - 0.05, 8.92, h], [x + w + 0.05, 10.25, h + 0.18], ledge, { r: 0.02 });
    for (let z = 1.2; z < h - 0.9; z += 1.9) for (let xx = x + 0.6; xx < x + w - 0.7; xx += 1.3)
      K.box([xx, 8.94, z], [xx + 0.7, 9, z + 1.05], r() < 0.6 ? (r() < 0.5 ? winOn : winOn2) : winOff, { r: 0, cast: false });
    x += w; }

  // the kit's props
  put('street/market-stand', [-6.0, 6.0, 0], 0); put('street/market-stand', [6.2, 6.4, 0], 0);
  put('street/street-lamp', [-4.6, 4.6, 0], 0); put('street/street-lamp', [4.8, 4.8, 0], 0); put('street/street-lamp', [0.2, 7.6, 0], 0);
  put('street/bench', [-1.7, 3.3, 0], 0); put('street/bench-2', [5.0, 2.2, 0], 0);
  put('street/fire-hydrant', [-1.6, 5.4, 0], 0); put('street/cart', [3.6, 6.0, 0], 0); put('street/ad-board', [1.2, 5.0, 0], 0);
  put('street/traffic-cone', [-0.4, 2.4, 0], 0); put('street/traffic-cone', [0.4, 2.4, 0], 0);
  put('street/flowers', [-5.4, 1.2, 0], 0); put('street/standing-picture-frame', [-2.3, 3.5, 0.4], 0, {}); put('street/taxi', [-8.8, 3.0, 0], 90);
  put('misc/present', [-0.9, 3.2, 0], 0); put('misc/cake-birthday', [3.6, 6.0, 0.62], 0); put('misc/suit-case', [-2.7, 3.2, 0], 0); put('misc/book', [-2.3, 3.1, 0.4], 0);

  // practicals: warm lamp pools over every group, a cool top fill
  for (const p of [[-4.6, 4.6], [4.8, 4.8], [0.2, 7.6]]) K.point([p[0], p[1] - 0.3, 3.6], '#ffc98a', 26, 6.0);
  for (const p of [[-2.4, 2.4], [-2.0, 0.4], [0.4, 0.6], [2.0, 1.8], [2.7, 2.6], [0.7, 3.0]]) K.point([p[0], p[1] - 0.6, 2.7], '#ffbe7a', 16, 4.2);
  for (const [sx, sy] of [[-6.0, 6.0], [6.2, 6.4]]) K.point([sx, sy - 1.3, 1.9], '#ffb46a', 12, 3.4);
  return { props: K.props };
}
