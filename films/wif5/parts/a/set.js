// wif5 part a: a festive night town square at 23:59:50. Cobbles under thin snow, a clock tower at the back (its red second
// hand sweeps to twelve at frame 330), shop facades with warm windows, three market stalls, a food truck, a lit tree, string
// lights and bunting on catenaries, falling snow. Blender metres: x right, y into the scene, z up; camera on the y < 0 side.
// Light (LIGHT-RECIPE-V3): colour lives in the lamps: practicals reach 2.4-4.6 m at power 8-26, materials env x0.4.
import { createKit, rng, tex, place } from '/styles/stick-man/kit/film.js';

export const SUN_DIR = [0.35, 0.55, -0.76];                       // a cool moon from front-left, high
export const SUN_CENTER = [0, 3, 1.5], SUN_HALF = 11;
export const MARKS = { dad: [0, 0, 0] };
export const PLACES = { clock: [0, 11.9, 10], sky: [0, 4, 9] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-8, -9], [8, 0]]];
const PROPS = ['street/market-stand', 'street/food-truck', 'street/street-lamp', 'street/bench', 'street/trashcan-large'];
const by = 'ep-whatif1-v5-director', why = 'V5 first slice, measure not built';
export const SQUARE = place('street', { light: 'square-night', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|square-night`, why, by })) });
export const COLLIDE = SQUARE.COLLIDE;
const ENV_K = 0.4;                                                // material environment reflection x0.4 (recipe x0.35-0.45)

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.10, 0.12, 0.22], mid: [0.22, 0.17, 0.13], bottom: [0.08, 0.07, 0.07] }, envK: ENV_K });
  const T = K.THREE, r = rng(7);
  const M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  // the kit props in the set's own light (lit by the lamps, env x0.4), not the flat toon
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await SQUARE.open(stage, { kit: K, material });
  const noShadow = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); return o; };

  // ---- ground: dark cobbles, snow lying in the joints and drifted to the edges
  const cobble = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#3a383d'; g.fillRect(0, 0, w, h); const q = rng(3), n = 16, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = 0.75 + 0.4 * q(), o = (j % 2) * s / 2;
      g.fillStyle = `rgb(${104 * k},${96 * k},${98 * k})`; g.beginPath(); g.roundRect(i * s + o + 3, j * s + 3, s - 6, s - 6, 10); g.fill(); }
    for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(170,180,200,${0.18 + 0.3 * q()})`; g.beginPath(); g.ellipse(q() * w, q() * h, 6 + 30 * q(), 3 + 12 * q(), q() * 3, 0, 7); g.fill(); } }, { repeat: [7, 7] });
  K.box([-16, -12, -0.1], [16, 22, 0], M([1, 1, 1], 0.85, { map: cobble }), { r: 0, cast: false });
  const drift = M([0.60, 0.64, 0.72], 0.95);
  for (const [x, y, sx, sy] of [[-11, 4, 2.2, 22], [11, 4, 2.2, 22], [0, 14.2, 26, 1.6], [-6, -2, 1.6, 0.8], [5.5, -3, 1.2, 0.6], [-2.5, 9.5, 1.4, 0.7]])
    K.sphere([x, y, 0], 1, drift, { sx: sx / 2, sy: sy / 2, sz: 0.12 });

  // ---- facades: a row at the back and one on each side, warm and cool plaster, lit and dark windows, snow on the ledges
  const PL = ['#8a5a3c', '#6d3b34', '#3f5d63', '#a08154', '#4b4a6b', '#7a6248', '#5c3f52'];
  const winOn = K.glow([1.0, 0.62, 0.30], 0.95), winOn2 = K.glow([1.0, 0.78, 0.45], 0.8), winOff = M([0.07, 0.08, 0.12], 0.3);
  const ledge = M([0.55, 0.58, 0.66], 0.95);
  const front = (x0, x1, y, h, c, face = -1) => {   // face -1: windows on its -y side (the back row); side rows face the centre
    K.box([x0, y, 0], [x1, y + 1.2, h], M(c, 0.85), { r: 0.02 });
    K.box([x0 - 0.05, y - 0.08, h], [x1 + 0.05, y + 1.25, h + 0.18], ledge, { r: 0.02 });
    for (let z = 1.2; z < h - 0.9; z += 1.9) for (let x = x0 + 0.6; x < x1 - 0.7; x += 1.3) {
      const on = r() < 0.55; K.box([x, y - 0.06, z], [x + 0.7, y, z + 1.05], on ? (r() < 0.5 ? winOn : winOn2) : winOff, { r: 0, cast: false });
      K.box([x - 0.05, y - 0.14, z - 0.06], [x + 0.75, y, z], ledge, { r: 0.01, cast: false }); }
  };
  let x = -16; for (const [w, h] of [[4.2, 9], [3.6, 11], [4.4, 8], [3.2, 10], [3.6, 12], [4.4, 9], [3.8, 10.5], [4.2, 8.5]]) { if (Math.abs(x + w / 2) > 2.2) front(x, x + w, 15.6, h, PL[Math.floor(r() * PL.length)]); x += w; }
  const side = (sx, dir) => { for (let y = -8; y < 15; y += 4.6) { const h = 7 + 4 * r(), g = K.group([sx, y + 2.3, 0], dir * 90);
    K.box([-2.3, 0, 0], [2.3, 1.2, h], M(PL[Math.floor(r() * PL.length)], 0.85), { r: 0.02, parent: g });
    K.box([-2.35, -0.08, h], [2.35, 1.25, h + 0.18], ledge, { parent: g });
    for (let z = 1.2; z < h - 0.9; z += 1.9) for (let xx = -1.9; xx < 1.6; xx += 1.3) K.box([xx, -0.06, z], [xx + 0.7, 0, z + 1.05], r() < 0.55 ? winOn : winOff, { r: 0, parent: g, cast: false }); } };
  side(-12.6, -1); side(12.6, 1);

  // ---- the clock tower: stone shaft, a lit face at 10 m, a red second hand that reaches twelve at frame 330 (00:00)
  const stone = M('#6e6458', 0.9), trim = M('#3a3129', 0.7);
  K.box([-1.7, 12.2, 0], [1.7, 15.6, 12.6], stone, { r: 0.03 });
  K.box([-1.9, 12.0, 12.6], [1.9, 15.8, 13.0], trim);
  K.cyl([0, 13.9, 14.6], 2.7, 3.2, M('#2f4a4d', 0.7), { r2: 0.05, seg: 4 }).rotation.y = Math.PI / 4;
  K.box([-1.9, 12.0, 12.95], [1.9, 15.8, 13.06], ledge, { r: 0.01 });
  const cz = 10, cy = 12.12;
  K.cyl([0, cy + 0.02, cz], 1.45, 0.08, trim, { axis: 'y' });
  K.cyl([0, cy - 0.03, cz], 1.32, 0.04, K.glow([0.86, 0.72, 0.46], 0.85), { axis: 'y' });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, L = i % 3 ? 0.14 : 0.24;
    const t = K.cube([Math.sin(a) * (1.18 - L / 2), cy - 0.06, cz + Math.cos(a) * (1.18 - L / 2)], [0.05, 0.02, L], trim, { r: 0 }); t.rotation.z = -a; }
  const hand = (len, wdt, m, deg) => { const g = new T.Group(); g.position.copy(K.B(0, cy - 0.09, cz)); const b = new T.Mesh(new T.BoxGeometry(wdt, len, 0.02), m);
    b.position.y = len * 0.4; g.add(b); g.rotation.z = -deg * Math.PI / 180; g.userData.noInk = true; K.root.add(g); return g; };
  hand(0.7, 0.09, trim, -0.5); hand(1.05, 0.06, trim, -6);
  const sec = hand(1.12, 0.025, K.glow([0.85, 0.08, 0.06], 1.0), 0);
  K.anim('clock', sec, f => { sec.rotation.z = -((49 + f / 30) * 6) * Math.PI / 180; });   // 23:59:49 + f/30 s

  // ---- stalls, a food truck, lamps, a bench, a bin (the kit catalogue, quarter turns only)
  put('street/market-stand', [-5.0, 3.6, 0], 0); put('street/market-stand', [-1.9, 8.2, 0], 0); put('street/market-stand', [5.4, 4.6, 0], 0);
  put('street/food-truck', [7.2, 10.0, 0], 0);
  for (const p of [[-2.8, 2.2], [3.0, 1.6], [-7.2, 8.4], [2.6, 10.6]]) put('street/street-lamp', [p[0], p[1], 0], 0);
  put('street/bench', [-3.6, -0.6, 0], 0); put('street/trashcan-large', [2.0, -1.1, 0], 0);
  // the stalls' awnings in festive stripes and their warm counters
  const stripe = tex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e9dcc0' : '#b3262b'; g.fillRect(i * w / 8, 0, w / 8, h); } });
  for (const [sx, sy] of [[-5.0, 3.6], [-1.9, 8.2], [5.4, 4.6]]) {
    K.card([sx, sy - 1.06, 2.05], 2.6, 0.32, stripe, { env: ENV_K });
    K.box([sx - 1.3, sy - 1.06, 2.2], [sx + 1.3, sy + 1.0, 2.26], ledge, { r: 0.01 });   // snow on the roof
    K.point([sx, sy - 1.3, 1.9], '#ffb46a', 14, 3.4);
  }
  for (const p of [[-2.8, 2.2], [3.0, 1.6], [-7.2, 8.4], [2.6, 10.6]]) K.point([p[0], p[1] - 0.25, 3.55], '#ffc98a', 16, 4.2);

  // ---- the tree: stacked cones, coloured bulbs, a gold star
  const tg = M('#1f4a2e', 0.85);
  for (const [z, rr, h] of [[0.9, 1.7, 1.8], [2.1, 1.35, 1.6], [3.2, 1.0, 1.4], [4.2, 0.6, 1.2]]) K.cyl([3.8, 6.4, z], rr, h, tg, { r2: 0.05, seg: 20 });
  K.cyl([3.8, 6.4, 0.2], 0.16, 0.4, M('#4a3120', 0.9));
  const BULB = [[1.0, 0.55, 0.2], [0.95, 0.2, 0.18], [0.3, 0.8, 0.35], [0.35, 0.55, 1.0], [1.0, 0.8, 0.35]].map(c => K.glow(c, 1.3));
  const bulbGeo = new T.SphereGeometry(1, 10, 8);
  const bulb = (p, s, m) => { const b = new T.Mesh(bulbGeo, m); b.position.copy(K.B(...p)); b.scale.setScalar(s); b.userData.noInk = true; K.root.add(b); return b; };
  for (let i = 0; i < 70; i++) { const z = 0.3 + 4.2 * r(), rr = 1.75 * (1 - z / 5.2) + 0.04, a = r() * 6.28; bulb([3.8 + Math.cos(a) * rr, 6.4 + Math.sin(a) * rr, z], 0.05, BULB[i % 5]); }
  bulb([3.8, 6.4, 5.0], 0.18, K.glow([1.0, 0.78, 0.3], 1.2));
  K.point([3.8, 5.4, 2.4], '#ffb070', 12, 3.6);

  // ---- string lights and bunting on catenaries (wires, coloured bulbs every 0.45 m, a lamp every few metres)
  const wire = M([0.05, 0.05, 0.06], 0.6);
  const strand = (a, b, sag, { bunting = false, lamps = 0, power = 10, dist = 3.6 } = {}) => {
    const P = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.ceil(L / 0.45);
    const curve = new T.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => K.B(...P(i / 16))));
    const w = new T.Mesh(new T.TubeGeometry(curve, 48, 0.008, 4), wire); w.userData.noInk = true; K.root.add(w);
    for (let i = 1; i < n; i++) { const p = P(i / n); bulb([p[0], p[1], p[2] - 0.05], 0.042, BULB[(i + n) % 5]); }
    if (bunting) { const FL = ['#b3262b', '#d9a43a', '#2f6b45', '#2c4f8a', '#c25a2a'].map(c => M(c, 0.8, { side: T.DoubleSide }));
      for (let i = 1; i < n * 0.9; i++) { const t0 = (i - 0.35) / n, t1 = (i + 0.35) / n, p0 = P(t0), p1 = P(t1), pm = P(i / n);
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([...K.B(...p0).toArray(), ...K.B(...p1).toArray(), ...K.B(pm[0], pm[1], pm[2] - 0.34).toArray()], 3)); g.computeVertexNormals();
        const fl = new T.Mesh(g, FL[i % 5]); fl.userData.noInk = true; fl.castShadow = false; K.root.add(fl); } }
    for (let i = 1; i <= lamps; i++) { const p = P(i / (lamps + 1)); K.point([p[0], p[1], p[2] - 0.2], '#ffc078', power, dist); }
  };
  strand([-11.4, -1.4, 4.6], [11.4, -1.4, 4.6], 1.2, { lamps: 3, power: 16, dist: 4.4 });     // over the dad, in front: his face light
  strand([-11.4, 2.4, 6.0], [11.4, 2.4, 6.0], 1.5, { bunting: true, lamps: 2, power: 12, dist: 4.0 });
  strand([-11.4, 6.5, 6.6], [11.4, 6.5, 6.6], 1.6, { lamps: 2, power: 12, dist: 4.0 });
  strand([-11.4, 10.5, 7.0], [11.4, 10.5, 7.0], 1.6, { bunting: true });
  for (const [ex, ey] of [[-11.4, -4], [11.4, -4], [-11.4, 4.5], [11.4, 4.5]]) strand([0, 12.1, 8.6], [ex, ey, 6.2], 1.2, { bunting: ex < 0 });
  K.point([0, 10.6, 9.4], '#ffd29a', 18, 4.6);   // lights the clock face and tower
  K.point([-4.2, -3.4, 2.6], '#ffb46a', 18, 4.6); K.point([3.6, -2.6, 2.6], '#ffc078', 14, 4.2);   // off-frame stall lights: warm pools on the near cobbles

  // ---- falling snow: flakes as points, each a pure function of the frame (no state)
  const N = 1800, base = new Float32Array(N * 4), pos = new Float32Array(N * 3), q = rng(19);
  for (let i = 0; i < N; i++) base.set([-7 + 14 * q(), -7 + 17 * q(), 9 * q(), q() * 6.28], i * 4);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const flake = tex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const pm = new T.PointsMaterial({ size: 0.045, map: flake, color: new T.Color(0.62, 0.66, 0.74), transparent: true, depthWrite: false, sizeAttenuation: true });
  pm.userData.noToon = true; pm.userData.noPrepass = true;
  const snow = new T.Points(geo, pm); snow.frustumCulled = false; snow.userData.noInk = true; snow.userData.noPrepass = true; K.root.add(snow);
  K.anim('snow', snow, f => { const t = f / 30;
    for (let i = 0; i < N; i++) { const [bx, by, bz, ph] = base.subarray(i * 4, i * 4 + 4), z = ((bz - 0.55 * t) % 9 + 9) % 9;
      const v = K.B(bx + 0.18 * Math.sin(t * 0.9 + ph), by + 0.12 * Math.cos(t * 0.7 + ph), z); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
    geo.attributes.position.needsUpdate = true; });
  noShadow(snow);
  return { props: K.props };
}
