// Perth, 1982, noon (ep 1 l02): a sunny main street of low verandah shops, palms, a ute, a street banner
// "PERTH · 1982", and a hot-chilli food stall on the footpath where Bram eats. Blender metres; the street runs along x,
// the shop fronts face the camera at y = 5, the footpath is y 2..5, the road y < 2.
import { createKit, SURF, label, tex, rng, B } from '../kit.js';

export const SUN_DIR = [-0.45, 0.55, -0.70];                  // high noon sun from behind-left: crisp shadows toward camera
export const SUN_CENTER = [0, 2, 0], SUN_HALF = 9;
export const PLACES = { stall: [0.6, 3.1, 1.0], counter: [0.6, 2.75, 1.05], paper: [0.25, 2.85, 1.07], bowl: [0.95, 2.85, 1.07], banner: [0, 3.8, 4.2], street: [0, 1.0, 0] };
export const MARKS = { bram: [0.55, 2.15, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-12, -14], [12, 1.8]]];
export const COLLIDE = [{ name: 'stall', lo: [-0.3, 2.55, 0], hi: [1.5, 3.4, 1.05] }];

const sky = () => tex(1024, 1024, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7fe0'); gr.addColorStop(0.6, '#8cc4f2'); gr.addColorStop(1, '#d9ecf6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const q = rng(8); for (let b = 0; b < 30; b++) { const bx = q() * w, bw = 30 + q() * 70, bh = h * (0.04 + q() * 0.16); g.fillStyle = `rgb(${150 + 40 * q()},${170 + 30 * q()},${200 + 20 * q()})`; g.fillRect(bx, h * 0.86 - bh, bw, bh + h * 0.2); }
  g.fillStyle = '#9dbb8a'; g.fillRect(0, h * 0.86, w, h * 0.14);
  const r = rng(5); for (let i = 0; i < 16; i++) { const cx = r() * w, cy = h * (0.15 + 0.4 * r()), s = 40 + 70 * r();
    for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * r()})`; g.beginPath(); g.ellipse(cx + (k - 3) * s * 0.45, cy + Math.sin(k) * s * 0.12, s * (0.5 + 0.4 * r()), s * 0.32, 0, 0, 7); g.fill(); } }
});

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.45, 0.65, 1.0], mid: [0.85, 0.85, 0.80], bottom: [0.55, 0.45, 0.35],
    panels: [{ dir: [-0.45, 0.55, 0.7], size: 2.5, color: [1, 0.95, 0.85], power: 6 }] }, envK: 0.8 });
  stage.scene.background = null;
  const r = rng(21);
  const M = {
    road: K.mat([0.30, 0.30, 0.32], 0.85, { map: tex(256, 256, (g, w, h) => { g.fillStyle = '#4c4c50'; g.fillRect(0, 0, w, h); const q = rng(2); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${q() > 0.5 ? 255 : 0},${q() > 0.5 ? 255 : 0},${q() > 0.5 ? 255 : 0},0.05)`; g.fillRect(q() * w, q() * h, 2, 2); } }), repeat: [12, 6] }),
    path: K.mat([1, 1, 1], 0.8, { map: SURF.tiles([0.78, 0.72, 0.62], [0.55, 0.50, 0.44], 4, 9), repeat: [12, 2] }),
    kerb: K.mat([0.74, 0.72, 0.68], 0.8), line: K.mat([0.95, 0.92, 0.70], 0.6),
    iron: K.mat([0.16, 0.30, 0.26], 0.45, { metal: 0.3 }), white: K.mat([0.95, 0.93, 0.88], 0.6), post: K.mat([0.92, 0.90, 0.84], 0.5),
    glassShop: K.mat([0.25, 0.35, 0.42], 0.08, { metal: 0.2, env: 1.6 }),
    trunk: K.mat([0.55, 0.42, 0.30], 0.9, { map: tex(64, 256, (g, w, h) => { g.fillStyle = '#8a6c4e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5c452f'; g.lineWidth = 4; for (let y = 0; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 5); g.stroke(); } }) }),
    frond: K.mat([0.25, 0.55, 0.22], 0.7, { side: 2 }), frond2: K.mat([0.34, 0.66, 0.26], 0.7, { side: 2 }),
  };
  // ground: road, kerb, footpath with tiles; centre line
  K.box([-30, -30, -0.2], [30, 2.0, 0], M.road, { r: 0 });
  K.box([-30, 2.0, 0], [30, 2.15, 0.14], M.kerb, { r: 0.02 });
  K.box([-30, 2.15, 0], [30, 9, 0.14], M.path, { r: 0 });
  for (let x = -28; x < 28; x += 3) K.box([x, -3.05, 0], [x + 1.6, -2.95, 0.005], M.line, { r: 0 });
  // sky backdrop (self-lit) far behind and a faint distant skyline
  K.card([0, 40, 22], 140, 64, sky(), { emissive: 1.0 });
  // the shop row: four verandah shops with lacework iron posts, signs, display windows
  const shops = [
    { x0: -11, x1: -6.2, c: [0.93, 0.78, 0.55], sign: 'NEWSAGENCY', sc: '#1d4f8a' },
    { x0: -6.2, x1: -1.6, c: [0.82, 0.38, 0.30], sign: 'CHEMIST', sc: '#2a7d4f' },
    { x0: -1.6, x1: 3.6, c: [0.96, 0.90, 0.72], sign: 'MILK BAR', sc: '#c2341f' },
    { x0: 3.6, x1: 8.6, c: [0.55, 0.70, 0.78], sign: 'HABERDASHERY', sc: '#6b3a8a' },
    { x0: 8.6, x1: 13, c: [0.88, 0.62, 0.42], sign: 'HOTEL', sc: '#1f1f2a' },
  ];
  for (const s of shops) {
    const wm = K.mat(s.c, 0.85, { map: SURF.plaster(s.c, Math.floor(s.x0 + 20)) });
    K.box([s.x0, 5.0, 0.14], [s.x1, 5.6, 6.2], wm, { r: 0.02 });
    K.box([s.x0, 4.95, 5.6], [s.x1, 5.05, 6.4], K.mat(s.c.map(x => x * 0.8), 0.7), { r: 0.03 });   // parapet
    K.card([(s.x0 + s.x1) / 2, 4.94, 5.0], (s.x1 - s.x0) * 0.7, 0.55, label(s.sign, { w: 1024, h: 160, bg: s.sc, fg: '#fff6e0' }), { env: 0.4 });
    // display window and door
    K.box([s.x0 + 0.4, 4.92, 0.6], [s.x1 - 1.6, 4.98, 2.5], M.glassShop, { r: 0.01 });
    K.box([s.x0 + 0.3, 4.9, 0.5], [s.x1 - 1.5, 4.96, 0.6], M.white, { r: 0.01 }); K.box([s.x0 + 0.3, 4.9, 2.5], [s.x1 - 1.5, 4.96, 2.6], M.white, { r: 0.01 });
    K.box([s.x1 - 1.3, 4.9, 0.14], [s.x1 - 0.4, 4.98, 2.5], K.mat([0.30, 0.20, 0.14], 0.5), { r: 0.01 });
    // upper windows
    for (let x = s.x0 + 0.8; x < s.x1 - 0.6; x += 1.4) { K.box([x, 4.95, 3.9], [x + 0.8, 5.0, 4.8], M.glassShop, { r: 0.01 }); K.box([x - 0.06, 4.93, 3.84], [x + 0.86, 4.97, 3.9], M.white, { r: 0.01 }); }
    // verandah: a striped corrugated roof on iron posts, lacework frieze
    const stripe = tex(256, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#e9e4d8' : s.sc; g.fillRect(i * w / 16, 0, w / 16, h); } });
    const roof = K.box([s.x0, 2.3, 3.0], [s.x1, 5.0, 3.08], K.mat([1, 1, 1], 0.6, { map: stripe, repeat: [(s.x1 - s.x0) / 1.5, 1] }), { r: 0 }); roof.rotation.x = -0.12;
    for (const x of [s.x0 + 0.15, s.x1 - 0.15]) { K.cyl([x, 2.45, 1.55], 0.045, 2.9, M.iron); K.cyl([x, 2.45, 0.2], 0.08, 0.12, M.iron); }
    K.card([(s.x0 + s.x1) / 2, 2.42, 2.82], s.x1 - s.x0, 0.22, tex(512, 48, (g, w, h) => { g.strokeStyle = '#26443b'; g.lineWidth = 3; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(i * w / 40 + 6, h / 2, 10, 0, 7); g.stroke(); } }), { transparent: true, env: 0.3 });
  }
  // the hot chilli stall: a cart with a red-white awning, steaming pot, sign; a newspaper on the counter
  const st = K.group([0.6, 3.1, 0.14]);
  const red = K.mat([0.80, 0.14, 0.10], 0.5), cream = K.mat([0.96, 0.92, 0.82], 0.55), wood = K.mat([0.6, 0.38, 0.2], 0.55, { map: SURF.wood([0.6, 0.38, 0.2]) });
  K.cube([0, 0, 0.45], [1.6, 0.7, 0.9], wood, { parent: st, r: 0.03 }); K.cube([0, -0.36, 0.9], [1.7, 0.1, 0.06], cream, { parent: st, r: 0.015 });
  K.cube([0, 0, 0.92], [1.75, 0.8, 0.04], cream, { parent: st, r: 0.01 });
  for (const x of [-0.78, 0.78]) for (const y of [-0.3, 0.3]) K.cyl([x, y, 1.45], 0.025, 1.1, M.post, { parent: st });
  const aw = tex(256, 64, (g, w, h) => { for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#f4eee0' : '#c8261b'; g.fillRect(i * w / 10, 0, w / 10, h); } g.fillStyle = '#c8261b'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(i * w / 10 + w / 20, h, w / 22, Math.PI, 0); g.fill(); } });
  const awn = K.cube([0, -0.1, 2.02], [1.95, 1.1, 0.05], K.mat([1, 1, 1], 0.7, { map: aw }), { parent: st, r: 0.01 }); awn.rotation.x = -0.18;
  K.card([0, -0.66, 1.84], 1.6, 0.34, label(['HOT CHILLI', { t: 'EXTRA HOT · 40c', s: 0.55, w: 700 }], { w: 768, h: 160, bg: '#fff3d6', fg: '#b3180f' }), { parent: st, rotX: -10 });
  K.card([0.3, -0.42, 0.55], 0.9, 0.5, label(['ULCER?', { t: "IT'S YOUR NERVES", s: 0.5 }], { w: 512, h: 280, bg: '#ffe066', fg: '#1b1b22' }), { parent: st });
  const pot = K.lathe([0.35, 0.05, 0.94], [[0, 0], [0.2, 0], [0.22, 0.02], [0.22, 0.28], [0.24, 0.3], [0, 0.3]], K.mat([0.7, 0.72, 0.75], 0.3, { metal: 0.8 }), { parent: st });
  K.cyl([0.35, 0.05, 1.22], 0.2, 0.02, K.mat([0.62, 0.10, 0.05], 0.2, { physical: true, clearcoat: 1 }), { parent: st });
  // chilli bowls and a jar of chillies on the counter
  for (const [x, y] of [[-0.35, -0.15], [0.0, -0.2]]) { K.lathe([x, y, 0.94], [[0, 0], [0.04, 0], [0.09, 0.05], [0.095, 0.06], [0, 0.06]], cream, { parent: st }); K.cyl([x, y, 0.995], 0.085, 0.01, K.mat([0.75, 0.15, 0.05], 0.25, { physical: true, clearcoat: 1 }), { parent: st }); }
  K.lathe([-0.62, 0.05, 0.94], [[0, 0], [0.07, 0], [0.07, 0.2], [0.05, 0.24], [0, 0.24]], K.glass([0.95, 0.6, 0.5], { opacity: 0.4 }), { parent: st });
  for (let i = 0; i < 8; i++) K.sphere([-0.62 + 0.03 * Math.sin(i * 2), 0.05 + 0.03 * Math.cos(i * 2), 0.98 + i * 0.02], 0.025, red, { parent: st, sz: 2, seg: 10 });
  // the newspaper on the counter
  K.card([-0.35, -0.42, 0.97], 0.42, 0.56, tex(256, 340, (g, w, h) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '900 30px Georgia'; g.textAlign = 'center';
    g.fillText('THE DAILY NEWS', w / 2, 34); g.fillRect(10, 44, w - 20, 3); g.font = '900 34px InterReel, Arial Black'; g.fillText('STRESS', w / 2, 100); g.fillText('CAUSES', w / 2, 140); g.fillText('ULCERS', w / 2, 180);
    g.font = '400 13px Georgia'; for (let y = 210; y < h - 10; y += 14) g.fillRect(14, y, w - 28 - (y % 3) * 10, 5); }), { parent: st, rotX: -80, rotZ: 8, env: 0.3 });
  // palms along the kerb, a street lamp, a banner across the street "PERTH · 1982"
  const palm = (x, y, h, s) => { const g = K.group([x, y, 0.14]); let p = [0, 0, 0];
    for (let i = 0; i < 8; i++) { const q = [p[0] + 0.05 * Math.sin(i * 0.4 + s), p[1], h * (i + 1) / 8]; K.cyl([(p[0] + q[0]) / 2, 0, (p[2] + q[2]) / 2], 0.13 - i * 0.008, h / 8 + 0.02, M.trunk, { parent: g, r2: 0.12 - i * 0.008 }); p = q; }
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2 + s, fr = K.cube([0, 0, 0], [0.24, 1.9, 0.02], k % 2 ? M.frond : M.frond2, { parent: g, r: 0.005 });
      fr.position.copy(B(p[0] + Math.cos(a) * 0.8, Math.sin(a) * 0.8, h - 0.1)); fr.rotation.set(0, 0, 0); fr.rotation.order = 'YXZ'; fr.rotation.y = -a + Math.PI / 2; fr.rotation.x = 0.5; }
    K.sphere([p[0], 0, h], 0.2, M.trunk, { parent: g }); };
  palm(-4.2, 2.4, 6.2, 0.3); palm(5.4, 2.5, 7.0, 1.1); palm(-9.5, 2.4, 5.6, 2.0); palm(11.5, 2.5, 6.4, 0.8);
  K.cyl([2.6, 2.35, 2.2], 0.06, 4.4, M.iron); K.cube([2.6, 2.0, 4.4], [0.1, 0.8, 0.08], M.iron, { r: 0.02 }); K.sphere([2.6, 1.65, 4.3], 0.12, K.mat([1, 0.95, 0.8], 0.2, { emit: [1, 0.9, 0.6], emitK: 0.3 }));
  // street banner on wires between two poles across the road
  for (const x of [-6.8, 6.8]) K.cyl([x, -1.0, 3.0], 0.07, 6, M.post);
  K.cyl([0, -1.0, 5.5], 0.008, 13.6, K.mat([0.1, 0.1, 0.1], 0.5), { axis: 'x' });
  const ban = K.card([0, -1.0, 4.7], 6.0, 1.3, label(['PERTH · 1982', { t: 'WESTERN AUSTRALIA', s: 0.45, w: 700 }], { w: 1024, h: 230, bg: '#1d4f8a', fg: '#ffd84a' }), { env: 0.5, cast: true });
  ban.material.side = 2; K.prop('banner', ban);
  // a parked ute (1980s pick-up): body, cab, wheels
  const ute = K.group([-3.0, 1.1, 0], 0), paint = K.mat([0.92, 0.70, 0.18], 0.35, { physical: true, clearcoat: 0.8 });
  K.cube([0, 0, 0.62], [3.8, 1.6, 0.6], paint, { parent: ute, r: 0.12 }); K.cube([0.55, 0, 1.15], [1.3, 1.5, 0.6], paint, { parent: ute, r: 0.12 });
  K.cube([0.55, -0.76, 1.18], [1.15, 0.02, 0.42], M.glassShop, { parent: ute, r: 0.03 }); K.cube([1.22, 0, 1.18], [0.02, 1.35, 0.4], M.glassShop, { parent: ute, r: 0.03 });
  for (const x of [-1.2, 1.25]) for (const y of [-0.78, 0.78]) { K.cyl([x, y, 0.35], 0.35, 0.25, K.mat([0.08, 0.08, 0.09], 0.8), { parent: ute, axis: 'y' }); K.cyl([x, y * 1.02, 0.35], 0.18, 0.25, M.post, { parent: ute, axis: 'y' }); }
  K.cube([1.92, 0, 0.55], [0.12, 1.5, 0.22], M.post, { parent: ute, r: 0.04 });
  // a second parked car, a bus stop shelter, bins, a dog on the footpath
  const car = K.group([5.6, 1.1, 0], 0), cp = K.mat([0.62, 0.12, 0.10], 0.3, { physical: true, clearcoat: 0.9 });
  K.cube([0, 0, 0.55], [3.6, 1.55, 0.55], cp, { parent: car, r: 0.14 }); K.cube([-0.1, 0, 1.0], [1.9, 1.4, 0.5], cp, { parent: car, r: 0.14 });
  K.cube([-0.1, -0.71, 1.02], [1.7, 0.02, 0.36], M.glassShop, { parent: car, r: 0.03 });
  for (const x of [-1.15, 1.15]) for (const y of [-0.76, 0.76]) { K.cyl([x, y, 0.33], 0.33, 0.24, K.mat([0.08, 0.08, 0.09], 0.8), { parent: car, axis: 'y' }); K.cyl([x, y * 1.02, 0.33], 0.16, 0.24, M.post, { parent: car, axis: 'y' }); }
  const sh = K.group([-12.5, 2.9, 0.14]); K.cube([0, 0, 2.3], [2.4, 1.1, 0.08], M.iron, { parent: sh, r: 0.02 }); for (const x of [-1.1, 1.1]) K.cyl([x, 0.4, 1.15], 0.04, 2.3, M.iron, { parent: sh });
  K.cube([0, 0.5, 1.2], [2.2, 0.03, 1.4], K.glass([0.8, 0.9, 1], { opacity: 0.3 }), { parent: sh, r: 0.01 }); K.cube([0, 0.3, 0.5], [2.0, 0.4, 0.06], M.post, { parent: sh, r: 0.02 });
  for (const x of [-1.2, 2.0, 9.4]) K.cyl([x, 2.5, 0.55], 0.25, 0.8, K.mat([0.25, 0.45, 0.30], 0.6), { r2: 0.27 });
  // pot plants and a bench on the footpath, a phone booth
  for (const x of [-2.2, 3.4, 7.2]) { K.lathe([x, 4.4, 0.14], [[0, 0], [0.22, 0], [0.28, 0.5], [0, 0.5]], K.mat([0.72, 0.38, 0.22], 0.8)); K.sphere([x, 4.4, 0.95], 0.42, M.frond2, { sz: 1.1, seg: 14 }); }
  const bo = K.group([-7.6, 3.9, 0.14]); K.cube([0, 0, 1.15], [0.9, 0.9, 2.3], K.mat([0.85, 0.18, 0.12], 0.4), { parent: bo, r: 0.05 }); K.cube([0, -0.46, 1.3], [0.7, 0.02, 1.4], M.glassShop, { parent: bo, r: 0.02 });
  K.card([0, -0.47, 2.15], 0.7, 0.16, label('TELEPHONE', { w: 512, h: 96, bg: '#fff', fg: '#c11' }), { parent: bo });
  return { props: K.props };
}
