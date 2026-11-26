// wif5 part g: a home kitchen at 3 a.m., month 4. Sink and counter along the back wall under a night window, bottles drying,
// a steriliser, a fridge, a wall clock at ten past three; a pendant over the chair where he falls asleep; a doorway on the
// right where the son comes in. Blender metres: x right, y into the scene, z up; camera on the y < 0 side.
// Light (LIGHT-RECIPE-V3): practicals reach 2.4-4.6 m at power 8-26, materials env x0.4; the moon is the cool window.
import { createKit, rng, tex, place, SURF, windowY } from '/styles/stick-man/kit/film.js';
import { holder, on, bundle, foldedBlanket } from './lib.js';

export const SUN_DIR = [0.25, -0.5, -0.83];
export const SUN_CENTER = [0, 0.5, 1.2], SUN_HALF = 5;
export const MARKS = { chair: [-0.75, 0.35, 0] };
export const PLACES = { window: [-1.0, 2.2, 1.6], door: [2.6, -0.4, 1.0], clock: [0.6, 2.15, 2.0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-2.4, -5], [2.4, 1.2]]];
const PROPS = ['kitchen-home/kitchen-sink', 'kitchen-home/kitchen-fridge', 'kitchen-home/kitchen-stove', 'kitchen-home/chair',
  'kitchen-home/bottle-rack', 'kitchen-home/steriliser', 'kitchen-home/kettle', 'kitchen-home/high-chair', 'kitchen-home/calendar'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const KITCHEN = place('kitchen-home', { light: 'kitchen-night', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|kitchen-night`, why, by })) });
export const COLLIDE = KITCHEN.COLLIDE;
const ENV_K = 0.4;
// film frames: walking with the crying baby, then asleep in the chair (the baby on his chest), the blanket laid over both
export const SEAT = [-0.75, 0.25];
export const WALK = [[0, 1745]], SLEEP = [[1745, 9999]], BLANKET_CARRIED = [[1745, 1830]], BLANKET_ON = [[1830, 9999]];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.10, 0.12, 0.20], mid: [0.20, 0.16, 0.12], bottom: [0.09, 0.08, 0.07] }, envK: ENV_K });
  const T = K.THREE, r = rng(9), M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await KITCHEN.open(stage, { kit: K, material });
  const H = holder(stage, T);

  // ---- shell: warm oak floor (light enough for the legs), sage walls, a doorway on the right wall
  const wall = M('#7d8a6e', 0.9, { map: SURF.plaster('#7d8a6e', 4) });
  K.box([-2.9, -5, -0.2], [2.9, 2.5, 0], M('#ffffff', 0.7, { map: SURF.wood('#a8835a', 7), repeat: [3, 4] }), { r: 0 });
  K.box([-2.9, 2.2, 0], [2.9, 2.45, 2.7], wall, { r: 0 });
  K.box([-2.9, -5, 0], [-2.6, 2.2, 2.7], wall, { r: 0 });
  K.box([2.6, -5, 0], [2.9, -1.1, 2.7], wall, { r: 0 }); K.box([2.6, 0.1, 0], [2.9, 2.2, 2.7], wall, { r: 0 }); K.box([2.6, -1.1, 2.1], [2.9, 0.1, 2.7], wall, { r: 0 });
  K.box([2.9, -1.4, 0], [3.6, 0.4, 2.7], M('#2a2622', 0.9), { r: 0 });   // the dark hall behind the doorway
  K.box([-2.9, -5, 2.7], [2.9, 2.5, 2.85], M('#45413b', 0.95), { r: 0, cast: false });
  K.box([-2.6, 2.19, 0], [2.6, 2.2, 0.1], M('#5a4632', 0.7), { r: 0 });
  // the window over the sink: a night sky with a moon (self-lit, dim)
  const night = tex(512, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1838'); g.addColorStop(1, '#2a3b66'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8dcc4'; c.beginPath(); c.arc(w * 0.68, h * 0.3, w * 0.07, 0, 7); c.fill(); c.fillStyle = '#16203f';
    for (let i = 0; i < 6; i++) c.fillRect(w * (0.05 + 0.16 * i), h * (0.72 + 0.08 * Math.sin(i * 2)), w * 0.12, h); });
  windowY(K, { cx: -1.0, y: 2.2, z0: 1.2, w: 1.1, h: 0.95, frame: M('#e3dccb', 0.6), view: night, viewK: 0.9 });

  // ---- the kit's kitchen: sink run on the back wall, stove, fridge, the bottles, a table and the chair he sleeps in
  put('kitchen-home/kitchen-sink', [-1.0, 1.85, 0], 0); put('kitchen-home/kitchen-stove', [0.25, 1.85, 0], 0); put('kitchen-home/kitchen-fridge', [1.9, 1.8, 0], 0);
  put('kitchen-home/bottle-rack', [-1.6, 1.95, 0.92], 0); put('kitchen-home/steriliser', [-0.45, 1.95, 0.92], 0); put('kitchen-home/kettle', [0.45, 1.95, 0.92], 0);
  put('kitchen-home/high-chair', [-2.0, 0.9, 0], 0);
  put('kitchen-home/chair', [MARKS.chair[0], MARKS.chair[1], 0], 0); put('kitchen-home/calendar', [-2.0, 2.18, 1.5], 0);
  // the wall clock: ten past three
  const face = tex(256, 256, (c, w) => { c.fillStyle = '#e8dfc6'; c.beginPath(); c.arc(w / 2, w / 2, w * 0.48, 0, 7); c.fill(); c.strokeStyle = '#2b2622'; c.lineWidth = w * 0.04; c.stroke();
    c.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.lineWidth = w * 0.02; c.beginPath(); c.moveTo(w / 2 + Math.sin(a) * w * 0.38, w / 2 - Math.cos(a) * w * 0.38); c.lineTo(w / 2 + Math.sin(a) * w * 0.44, w / 2 - Math.cos(a) * w * 0.44); c.stroke(); }
    const hand = (a, L, lw) => { c.lineWidth = lw; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2 + Math.sin(a) * L, w / 2 - Math.cos(a) * L); c.stroke(); };
    hand((3 + 10 / 60) * Math.PI / 6, w * 0.24, w * 0.05); hand(10 * Math.PI / 30, w * 0.36, w * 0.03); });
  K.card([0.75, 2.17, 2.05], 0.36, 0.36, face, { env: ENV_K });

  // ---- light: the pendant over the chair (warm pool), a strip under the wall cupboards, the moon at the window
  K.cyl([MARKS.chair[0] + 0.2, MARKS.chair[1] - 0.2, 2.35], 0.18, 0.16, M('#c98a3a', 0.5), { r2: 0.05, open: true });
  K.cyl([MARKS.chair[0] + 0.2, MARKS.chair[1] - 0.2, 2.55], 0.006, 0.3, M('#222', 0.5));
  K.sphere([MARKS.chair[0] + 0.2, MARKS.chair[1] - 0.2, 2.3], 0.06, K.glow([1.0, 0.8, 0.5], 1.0));
  K.point([MARKS.chair[0] + 0.2, MARKS.chair[1] - 0.4, 2.1], '#ffbf78', 20, 3.4);
  K.box([-2.4, 1.85, 1.62], [0.8, 2.2, 2.3], M('#6b5640', 0.7), { r: 0.01 });          // wall cupboards
  K.box([-2.3, 1.88, 1.6], [0.7, 1.92, 1.62], K.glow([1.0, 0.82, 0.55], 0.7), { r: 0 });
  K.point([-0.8, 1.6, 1.45], '#ffcf8a', 10, 2.8);
  K.point([-1.0, 1.4, 1.7], '#7f9ad8', 18, 3.6);                                     // the moon through the window
  K.point([1.4, -1.2, 1.2], '#ffb070', 5, 2.6);                                      // a low warm fill from the hall light
  K.point([3.2, -0.5, 2.0], '#ffc488', 14, 2.6);                                     // the hall light behind the door

  // ---- the baby (crying in his arms, asleep on his chest), the son's folded blanket, the blanket over both
  const cry = bundle(K, tex, { cry: true, colour: '#8cc4ff', foldColour: '#6fa8ec', s: 1.1, rings: false }); K.root.add(cry);
  const calm = bundle(K, tex, { colour: '#8cc4ff', foldColour: '#6fa8ec', s: 1.1, rings: false }); K.root.add(calm);
  // a thing held across both hands: its long axis (local x) from the left hand to the right, its front to the lens, fitted to the gap
  const V = (x, y, z) => new T.Vector3(x, y, z), MB = new T.Matrix4();
  const between = (obj, who, { len = 0.46, shift = [0, 0, 0] } = {}) => { const a = H.at(who, 'L'), b = H.at(who, 'R'); if (!a || !b) { obj.visible = false; return; }
    const x = V().subVectors(b, a), d = x.length(); x.normalize(); const z = V().subVectors(stage.camera.position, a).normalize();
    const y = V().crossVectors(z, x).normalize(); z.crossVectors(x, y); obj.quaternion.setFromRotationMatrix(MB.makeBasis(x, y, z));
    obj.scale.setScalar(Math.min(1.15, Math.max(0.85, (d - 0.04) / len))); obj.position.copy(a).add(b).multiplyScalar(0.5).add(K.B(...shift)); obj.visible = true; };
  // cradled across both arms against his chest: one hand under her head, the other under her feet
  K.anim('cry', cry, f => { if (on(f, WALK)) { between(cry, 'g_dad'); cry.userData.look(stage.camera); } else cry.visible = false; });
  // asleep: she lies across his lap between his two hands; under the blanket she is up on his chest, her face out at its neck
  K.anim('calm', calm, f => { if (!on(f, SLEEP)) { calm.visible = false; return; }
    if (on(f, BLANKET_ON)) { calm.scale.setScalar(1); H.hold(calm, 'g_dads', 'chest', { off: [0.03, -0.09, 0.25], rot: [0, 0, 30] }); } else between(calm, 'g_dads', { shift: [0, 0.08, 0.05] });
    calm.userData.look(stage.camera); });
  // a bead of sweat on his temple while he walks her (the kit's sweat mark sits behind the head in this three-quarter view)
  const drop = new T.Group(), dm = K.mat('#4fa6f2', 0.2, { env: 0.6 });
  const dball = new T.Mesh(new T.SphereGeometry(0.05, 18, 12), dm), dtip = new T.Mesh(new T.ConeGeometry(0.044, 0.09, 18), dm);
  dtip.position.y = 0.058; for (const m of [dball, dtip]) { m.userData.noInk = true; drop.add(m); } K.root.add(drop);
  K.anim('drop', drop, f => { if (on(f, WALK)) H.hold(drop, 'g_dad', 'head', { off: [-0.31, 0.10, 0.06], rot: [0, 0, 0] }); else drop.visible = false; });
  const fold = foldedBlanket(K, tex); K.root.add(fold);
  fold.visible = false;
  // the son's blanket on his way in: folded once lengthwise and draped over his forearm by the wrist, both halves hanging in
  // soft folds (a cloth sheet bent round the arm, not a block); x along the fold, the two halves fall either side of it
  const carry = (() => { const NX = 24, NV = 48, L = 0.5, Wd = 0.2, r = 0.022, arc = Math.PI * r / 2;
    const g = new T.PlaneGeometry(1, 1, NX, NV), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const u = uv.getX(i), v = uv.getY(i), x = (u - 0.5) * Wd, s = (v - 0.5) * L, side = Math.sign(s) || 1, a = Math.abs(s);
      let y, z; if (a < arc) { const t = a / r; y = r * Math.cos(t) - r; z = side * r * Math.sin(t); } else { const h = a - arc; y = -r - h; z = side * (r + 0.012 * h); }
      const hang = Math.max(0, a - arc); z += side * 0.018 * Math.sin(x * 46 + side) * Math.min(1, hang * 6); y += 0.02 * Math.sin(x * 23 + 1.3 * side) * Math.min(1, hang * 4);
      p.setXYZ(i, x, y, z); }
    g.computeVertexNormals(); const m = new T.Mesh(g, K.mat('#ffffff', 0.95, { env: 0.35, map: fold.children[0].material.map, side: T.DoubleSide }));
    m.castShadow = true; m.userData.noInk = true; return m; })();
  K.root.add(carry);
  K.anim('fold', carry, f => { if (on(f, BLANKET_CARRIED)) H.hold(carry, 'g_son', 'L', { off: [0.0, 0.035, 0.0], rot: [0, 0, 0] }); else carry.visible = false; });
  // the son's blanket over both: laid over his shoulders like a shawl, down over the baby on his chest and his lap, hanging
  // past his knees; it falls off his sides in soft folds and opens at the neck (his face and hers show). Built in Blender
  // coordinates relative to the seat root (y < 0 is his front), then turned to three.js by K.B.
  const sm = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
  const path = new T.CatmullRomCurve3([[0.10, 0.78], [0.0, 0.87], [-0.13, 0.83], [-0.24, 0.70], [-0.26, 0.56], [-0.42, 0.52], [-0.52, 0.34], [-0.55, 0.14]].map(([y, z]) => V(y, z, 0)));
  const NX = 44, NV = 60, bgeo = new T.PlaneGeometry(1, 1, NX, NV), bp = bgeo.attributes.position, bu = bgeo.attributes.uv;
  for (let i = 0; i < bp.count; i++) { const u = bu.getX(i), v = 1 - bu.getY(i), x = (u - 0.5) * 0.62, ax = Math.abs(x);
    const s0 = 0.5 * (1 - sm(0.11, 0.24, ax)), s = s0 + v * (1 - s0), p = path.getPointAt(s);
    const rim = 0.2 + 0.07 * sm(0.3, 0.55, s), d = Math.max(0, ax - rim);
    let y = p.x, z = p.y - 1.1 * d + 0.03 * Math.sin(x * 34 + s * 5) * Math.min(1, d * 7);
    y += 0.035 * Math.sin(x * 26 + 1) * sm(0.55, 1, s); z += 0.05 * Math.sin(x * 17 + 2) * sm(0.85, 1, s);
    y +=0 - 0.25 * d * sm(0.6, 1, s); z = Math.max(0.40 - 0.3 * sm(0.72, 1, s), z);
    const w = K.B(SEAT[0] + x * (1 + 0.15 * d), SEAT[1] + y, z); bp.setXYZ(i, w.x, w.y, w.z); }
  bgeo.computeVertexNormals();
  const blanket = new T.Mesh(bgeo, K.mat('#ffffff', 0.95, { env: 0.35, map: fold.children[0].material.map, side: T.DoubleSide }));
  blanket.castShadow = blanket.receiveShadow = true; blanket.userData.noInk = true; K.root.add(blanket);
  K.anim('blanket', blanket, f => { blanket.visible = on(f, BLANKET_ON); });
  return { props: K.props };
}
