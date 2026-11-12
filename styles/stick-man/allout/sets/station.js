// Station: the city terminal of the line. A glass-and-iron train shed (vault 32 m wide, apex 25 m, iron ribs every 6 m,
// glass panes) runs along y from the front opening (y = 0) to a brick head building (y = 80) with rows of arched windows and a
// clock tower; brick side facades with two rows of arched windows; two tracks at x = +-8.5 with coaches (and a loco) on them;
// a plank platform between with a blue / white checker strip along each edge; lamp posts, benches, potted palms, a newsstand,
// a sign board on posts. Blender metres; camera inside looks +y (head building) or across x (coaches side-on).
// setOpts.mode: 'hall' (default; inside) | 'front' (outside: the brick front with the big arched glass end, a tower, a banner
// across the front, a red-carpet stage with a pile of gold coin sacks and a podium, desert ground in front).
// setOpts.banner (front banner text, default 'FIRST LINE IN TAKES IT ALL!'; an array = lines; bannerW / bannerH size it), setOpts.sign (sign board text, default 'ALL ABOARD!'),
// setOpts.name (the name over the front, default 'MESA CITY TERMINAL').
// Props: sign (key show 0..1: the board rises on its posts), sacks (key glint 0..1), banner.
import { createKit, SURF, label, tex, rng, B, css } from '../kit.js';
import { track, loco, coach, sky, atmos, slab, merged, beamMatrix, unitBox, collideFromMeshes, RSURF, mesa } from '../rail-kit.js';

export const SUN_DIR = [0.4, 0.55, -0.73];
export const SUN_CENTER = [0, 6, 0.5], SUN_HALF = 14;
export const PLACES = { sign: [-3.2, 12.5, 2.5], newsstand: [-4.4, 30, 1.6], clock: [0, 79.3, 19.5], banner: [0, -1.4, 7.4], sacks: [1.6, -7.8, 1.4], podium: [-1.5, -7.2, 1.5] };
export const MARKS = { reader: [0, 6, 0.55], crowd1: [-2.5, 11, 0.55], crowd2: [2.4, 12.5, 0.55], crowd3: [-1.2, 15.5, 0.55], crowd4: [3.4, 17, 0.56], crowd5: [-3.0, 19, 0.55], crowd6: [1.0, 21, 0.55],
  exit: [0, 74, 0.56], stage: [-0.3, -8.4, 0.45], front: [0, -14, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-15, -120], [15, 78]]];
export const COLLIDE = [];
export const HALL_LOOK = {
  light: { sun: [1.0, 0.9, 0.75], power: 2.6, sky: [0.62, 0.66, 0.95], ground: [0.75, 0.5, 0.38], hemi: 0.55, fill: [0.8, 0.75, 1.0], fillPower: 0.5, lit: [1.04, 1.0, 0.96], shade: [0.82, 0.66, 0.92], lamp: 0.8 },
  grade: { exp: 1.04, lift: 0.02, sat: 1.12, haze: 0.4, shadow: { c: [0.36, 0.2, 0.45], k: 0.3 }, shoulder: 0.25 },
};
export const FRONT_LOOK = {
  light: { sun: [1.0, 0.88, 0.70], power: 3.4, sky: [0.58, 0.6, 0.95], ground: [0.85, 0.5, 0.36], hemi: 0.4, fill: [0.78, 0.66, 1.0], fillPower: 0.45, lit: [1.04, 1.0, 0.95], shade: [0.8, 0.6, 0.92], lamp: 0.6 },
  grade: { exp: 1.03, lift: 0.02, sat: 1.15, haze: 0.2, shadow: { c: [0.38, 0.18, 0.46], k: 0.35 }, shoulder: 0.25 },
};
const BRICK = '#9a3a2c', TRIM = '#efe4cc';
// a brick facade with rows of arched windows (white trim, dark glass with a warm glint)
function facade(cols, rows, { w = 1024, h = 512, brick = BRICK, glass = '#2c3550', seed = 3, door = false } = {}) {
  return tex(w, h, (g, W, H) => { const r = rng(seed); g.fillStyle = brick; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8) for (let x = ((y / 8) % 2) * 9; x < W; x += 18) { const k = 0.85 + 0.25 * r(); g.fillStyle = `rgba(${k > 1 ? 255 : 30},${k > 1 ? 200 : 10},${k > 1 ? 170 : 5},${Math.abs(k - 1) * 0.6})`; g.fillRect(x, y, 17, 7); }
    g.fillStyle = 'rgba(240,225,200,0.35)'; for (let y = 0; y < H; y += 8) g.fillRect(0, y + 7, W, 1);
    g.fillStyle = TRIM; g.fillRect(0, H * 0.48, W, H * 0.03); g.fillRect(0, 0, W, H * 0.04); g.fillRect(0, H * 0.96, W, H * 0.04);
    const cw = W / cols, rh = H / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const cx = (i + 0.5) * cw, ww = cw * 0.46, y0 = j * rh + rh * 0.24, y1 = j * rh + rh * 0.86;
      if (door && j === rows - 1 && i === Math.floor(cols / 2)) continue;
      g.fillStyle = TRIM; g.beginPath(); g.moveTo(cx - ww / 2 - 6, y1 + 5); g.lineTo(cx - ww / 2 - 6, y0 + ww / 2); g.arc(cx, y0 + ww / 2, ww / 2 + 6, Math.PI, 0); g.lineTo(cx + ww / 2 + 6, y1 + 5); g.closePath(); g.fill();
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#5a6c92'); gr.addColorStop(0.6, glass); gr.addColorStop(1, '#3a2c34'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(cx - ww / 2, y1); g.lineTo(cx - ww / 2, y0 + ww / 2); g.arc(cx, y0 + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, y1); g.closePath(); g.fill();
      g.strokeStyle = TRIM; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y0); g.lineTo(cx, y1); g.moveTo(cx - ww / 2, (y0 + y1) / 2 + 6); g.lineTo(cx + ww / 2, (y0 + y1) / 2 + 6); g.stroke(); }
    if (door) { const cx = W / 2, ww = cw * 0.7, y1 = H * 0.96, y0 = H - rh * 0.95; g.fillStyle = TRIM; g.fillRect(cx - ww / 2 - 8, y0 - 8, ww + 16, y1 - y0 + 8); g.fillStyle = '#3a2418'; g.fillRect(cx - ww / 2, y0, ww, y1 - y0); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(cx - 2, y0, 4, y1 - y0); }
  });
}
// glass panes with iron mullions (the vault and the arched end window)
const paneTex = (nx = 8, ny = 8) => tex(512, 512, (g, w, h) => { g.fillStyle = 'rgba(200,225,245,0.35)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,46,60,0.95)'; g.lineWidth = 6;
  for (let i = 0; i <= nx; i++) { g.beginPath(); g.moveTo(i * w / nx, 0); g.lineTo(i * w / nx, h); g.stroke(); } for (let j = 0; j <= ny; j++) { g.beginPath(); g.moveTo(0, j * h / ny); g.lineTo(w, j * h / ny); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 3 === 0) g.fillRect(i * w / nx + 6, j * h / ny + 6, w / nx * 0.4, h / ny - 12); });

export async function build(stage, opts = {}) {
  const FRONT = opts.mode === 'front';
  const K = createKit(stage, { env: { top: [0.62, 0.72, 0.98], mid: [0.86, 0.74, 0.70], bottom: [0.62, 0.40, 0.30], panels: [{ dir: [0, 0, 1], w: 6, h: 6, color: [0.95, 0.97, 1], power: 3 }, { dir: [-0.4, -0.55, 0.73], size: 2.4, color: [1, 0.92, 0.8], power: 5 }] }, envK: 0.75 });
  stage.scene.background = null;
  const r = rng(51), THREE = K.THREE;
  sky(K, { sunDir: SUN_DIR, zenith: '#2a5cc2', mid: '#5a8ad6', horizon: '#d4d0e6', low: '#c8b8b0', clouds: 18, seed: 31, cloudK: 0.8 });
  const M = { brick: K.mat([1, 1, 1], 0.85, { map: SURF.brick([0.62, 0.22, 0.16], [0.82, 0.74, 0.66], 7), repeat: [6, 3] }), trim: K.mat(TRIM, 0.6), iron: K.mat([0.12, 0.13, 0.16], 0.45, { metal: 0.5 }),
    planks: K.mat([1, 1, 1], 0.75, { map: SURF.wood([0.62, 0.42, 0.28], 10, 4), repeat: [1, 1] }), checker: K.mat([1, 1, 1], 0.45, { map: SURF.checker('#2d5fae', '#eef0f2', 8), physical: true, clearcoat: 0.6, repeat: [1, 1] }),
    gold: K.mat([0.95, 0.74, 0.2], 0.3, { metal: 0.85, env: 1.4 }), green: K.mat([0.14, 0.36, 0.22], 0.6), copper: K.mat([0.30, 0.62, 0.52], 0.5, { metal: 0.3 }) };
  // ---- ground: desert outside, track bed inside, platforms
  slab(K, [-400, -400, -0.4], [400, 400, -0.02], K.mat([1, 1, 1], 0.95, { map: RSURF.sand('#d78a4a', 9) }), { step: 8, tile: 4 });
  for (let i = 0; i < 6; i++) mesa(K, { at: [-350 + 140 * i + 30 * r(), 420 + 100 * r(), -15], r: 50 + 40 * r(), h: 25 + 25 * r(), seed: i + 3, pal: i % 2 ? 'red' : 'dusk' });
  for (const x of [-8.5, 8.5]) track(K, { y0: -150, y1: 76, at: [x, 0, 0], seed: 3 + x, heroY: null, dense: [[-10, 40]], sparse: 0.08 });
  for (const s of [-1, 1]) {
    slab(K, [s > 0 ? 10.4 : -16, 0, -0.2], [s > 0 ? 16 : -10.4, 78, 0.55], M.planks, { step: 2, tile: 3 });
    K.box([s > 0 ? 10.3 : -10.5, 0, 0], [s > 0 ? 10.5 : -10.3, 78, 0.55], M.trim, { r: 0.02 }); }
  slab(K, [-6.6, 0, -0.2], [6.6, 72, 0.55], M.planks, { step: 2, tile: 3 });
  for (const s of [-1, 1]) slab(K, [s > 0 ? 4.0 : -6.6, 2, -0.2], [s > 0 ? 6.6 : -4.0, 70, 0.56], M.checker, { step: 2, tile: 2.6 });
  for (const s of [-1, 1]) K.box([s * 6.6 - 0.1, 0, 0], [s * 6.6 + 0.1, 72, 0.57], M.trim, { r: 0.02 });
  slab(K, [-16, 70, -0.2], [16, 80, 0.56], M.checker, { step: 2, tile: 2.6 });
  // ---- side facades (two rows of arched windows), the head building with the clock tower
  for (const s of [-1, 1]) { const x = s * 16;
    K.box([x - 0.3, 0, 0], [x + 0.3, 80, 10], M.brick, { r: 0 });
    K.card([x - s * 0.31, 40, 5], 80, 10, facade(16, 2, { w: 2048, h: 256, seed: 5 + s }), { rotZ: s > 0 ? -90 : 90, env: 0.5 });
    K.box([x - 0.6, 0, 9.6], [x + 0.6, 80, 10.2], M.trim, { r: 0.04 }); }
  const head = K.group([0, 80, 0]);
  K.box([-18, 0, 0], [18, 8, 17], M.brick, { parent: head, r: 0 });
  K.card([0, -0.01, 8.5], 36, 17, facade(12, 3, { w: 1536, h: 724, seed: 9, door: true }), { parent: head, env: 0.5 });
  K.box([-18.2, -0.4, 16.6], [18.2, 0.3, 17.4], M.trim, { parent: head, r: 0.05 });
  K.box([-5, -0.6, 0], [5, 7, 24], M.brick, { parent: head, r: 0.05 });
  K.card([0, -0.62, 8], 10, 16, facade(3, 3, { w: 512, h: 820, seed: 12, door: true }), { parent: head, env: 0.5 });
  K.box([-5.3, -0.9, 23.6], [5.3, 7.3, 24.4], M.trim, { parent: head, r: 0.05 });
  K.lathe([0, 3.2, 24.4], [[0, 0], [4.2, 0], [4.0, 1.0], [3.4, 2.6], [2.2, 3.8], [0.8, 4.4], [0.3, 5.6], [0.3, 6.6], [0, 6.8]], M.gold, { parent: head, seg: 28 });
  // the clock: a white face with numerals and hands, a gold ring
  const clk = K.group([0, -0.7, 19.5], 0, head);
  K.cyl([0, 0, 0], 2.1, 0.25, M.gold, { parent: clk, axis: 'y', seg: 48 });
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.85, 48), K.mat([1, 1, 1], 0.5, { map: tex(512, 512, (g, w, h) => { g.fillStyle = '#f6f2e6'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
    g.fillStyle = '#1b1b22'; g.font = '700 54px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; const N = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    N.forEach((n, i) => { const a = i / 12 * Math.PI * 2; g.fillText(n, 256 + Math.sin(a) * 200, 256 - Math.cos(a) * 200); });
    g.strokeStyle = '#1b1b22'; g.lineCap = 'round'; g.lineWidth = 16; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(-0.9) * 120, 256 - Math.cos(-0.9) * 120); g.stroke();
    g.lineWidth = 10; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(1.05) * 175, 256 - Math.cos(1.05) * 175); g.stroke(); g.fillStyle = '#b8902a'; g.beginPath(); g.arc(256, 256, 18, 0, 7); g.fill(); }) }));
  face.position.copy(B(0, -0.14, 0)); K.add(face, clk);
  // ---- the vault: glass panes over iron ribs every 6 m, purlins, a ridge lantern
  const VR = 16, VZ = 9.6;
  { const glass = new THREE.MeshStandardMaterial({ map: paneTex(6, 10), transparent: true, side: THREE.DoubleSide, roughness: 0.15, metalness: 0, envMap: K.ENV, envMapIntensity: 1.2, depthWrite: false }); glass.userData.noToon = true; glass.map.wrapS = glass.map.wrapT = THREE.RepeatWrapping; glass.map.repeat.set(10, 13);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(VR, VR, 80, 48, 20, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), glass); v.position.copy(B(0, 40, VZ)); v.renderOrder = 2; K.add(v, K.root, { cast: false }); v.userData.noCollide = true;
    const ribs = []; for (let y = 0; y <= 80; y += 6) for (let i = 0; i < 24; i++) { const a0 = Math.PI * i / 24, a1 = Math.PI * (i + 1) / 24, P = a => [Math.cos(a) * (VR - 0.15), y, VZ + Math.sin(a) * (VR - 0.15)];
      ribs.push({ m: beamMatrix(P(a0), P(a1), 0.18, 0.5) }); }
    for (let i = 1; i < 12; i++) { const a = Math.PI * i / 12; ribs.push({ m: beamMatrix([Math.cos(a) * (VR - 0.3), 0, VZ + Math.sin(a) * (VR - 0.3)], [Math.cos(a) * (VR - 0.3), 80, VZ + Math.sin(a) * (VR - 0.3)], 0.12, 0.12) }); }
    for (let y = 0; y < 80; y += 6) for (const s of [-1, 1]) ribs.push({ m: beamMatrix([s * 15.6, y, VZ + 0.4], [s * 12.4, y + 3, VZ + 7.5], 0.08, 0.08) });
    merged(K, unitBox(0.02), M.iron, ribs, { cast: true });
    // the front gable: a big arched glass end with mullions
    const endT = tex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#22325e'); gr.addColorStop(0.6, '#2d4682'); gr.addColorStop(1, '#3a5a9a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 24; i++) g.fillRect(i * w / 24 + 4, 0, w / 48, h); g.strokeStyle = '#141a2a'; g.lineWidth = 7;
      for (let i = 0; i <= 24; i++) { g.beginPath(); g.moveTo(i * w / 24, 0); g.lineTo(i * w / 24, h); g.stroke(); } for (let j = 0; j <= 10; j++) { g.beginPath(); g.moveTo(0, j * h / 10); g.lineTo(w, j * h / 10); g.stroke(); } });
    const end = new THREE.Mesh(new THREE.CircleGeometry(VR, 48, 0, Math.PI), K.mat([1, 1, 1], 0.12, { map: endT, metal: 0.25, env: 1.4, side: 2 }));
    end.position.copy(B(0, -0.05, VZ)); K.add(end, K.root, { cast: false }); end.renderOrder = 2; end.userData.noCollide = true; }
  // ---- the front: brick piers, the name band, a tower, the banner across the front
  const front = K.group([0, 0, 0]);
  for (const s of [-1, 1]) { K.box([s * 16 - 2.5, -1.2, 0], [s * 16 + 2.5, 0.6, 12], M.brick, { parent: front, r: 0.04 });
    K.card([s * 16, -1.21, 6], 5, 12, facade(2, 2, { w: 256, h: 512, seed: 21 + s }), { parent: front, env: 0.5 });
    K.box([s * 16 - 2.7, -1.4, 11.8], [s * 16 + 2.7, 0.8, 12.6], M.trim, { parent: front, r: 0.04 }); }
  K.box([-VR, -0.9, VZ - 1.4], [VR, 0.2, VZ], M.brick, { parent: front, r: 0.03 });
  K.card([0, -0.91, VZ - 0.7], 22, 1.1, label(opts.name || 'MESA CITY TERMINAL', { w: 2048, h: 110, bg: '#1d2e5a', fg: '#e9c46a', font: 'Georgia, serif', weight: 800 }), { parent: front, env: 0.5 });
  const tw = K.group([-21, -1, 0], 0, front);
  K.box([-2.4, -2.4, 0], [2.4, 2.4, 20], M.brick, { parent: tw, r: 0.05 }); K.card([0, -2.41, 10], 4.8, 20, facade(2, 5, { w: 256, h: 1024, seed: 33 }), { parent: tw, env: 0.5 });
  K.box([-2.7, -2.7, 19.6], [2.7, 2.7, 20.4], M.trim, { parent: tw, r: 0.05 });
  K.lathe([0, 0, 20.4], [[0, 0], [2.2, 0], [1.6, 3], [0.6, 6], [0.1, 9], [0, 9.2]], M.copper, { parent: tw, seg: 4 }).rotation.y = Math.PI / 4;
  K.cyl([0, 0, 30.5], 0.05, 2.4, M.iron, { parent: tw }); K.card([0.55, 0, 31.2], 1.0, 0.6, tex(64, 40, (g, w, h) => { g.fillStyle = '#c8322a'; g.fillRect(0, 0, w, h); }), { parent: tw, rotZ: 90 }).material.side = 2;
  // banner: one line across the whole front (default), or setOpts.banner as an array of lines on a narrower card
  // (setOpts.bannerW / bannerH, m) so a closer camera reads all of it
  const BL = Array.isArray(opts.banner) ? opts.banner : [opts.banner || 'FIRST LINE IN TAKES IT ALL!'], BW = opts.bannerW ?? 20, BH = opts.bannerH ?? 2.4;
  const banner = K.card([0, -1.4, 7.4 - (BH - 2.4) / 2], BW, BH, label(BL.map(t => ({ t, c: '#b3201a' })), { w: 2048, h: Math.round(2048 * BH / BW), bg: '#f6f0e2', font: 'Georgia, serif', weight: 900, border: '#b3201a' }), { cast: true, env: 0.5 });
  banner.material.side = 2; for (const x of [-10.2, 10.2]) K.cyl([x, -1.4, 4.4], 0.06, 8.8, M.iron); K.prop('banner', banner);
  // ---- the stage outside: red carpet, the pile of gold sacks, a podium
  const st = K.group([0, -7.5, 0]);
  K.box([-3.2, -2.2, 0], [3.2, 2.2, 0.42], K.mat([0.42, 0.24, 0.14], 0.7, { map: SURF.wood([0.42, 0.24, 0.14], 8, 6) }), { parent: st, r: 0.03 });
  K.box([-3.0, -2.0, 0.42], [3.0, 2.0, 0.45], K.mat([0.72, 0.06, 0.06], 0.9, { physical: true, sheen: 1, sheenColor: [1, 0.3, 0.3] }), { parent: st, r: 0.01 });
  K.box([-1.2, -6, 0], [1.2, -2.2, 0.02], K.mat([0.72, 0.06, 0.06], 0.9), { parent: st, r: 0.005 });
  const sacks = K.group([1.6, -0.3, 0.45], 0, st); sacks.name = 'sacks';
  { const sackM = K.mat([0.62, 0.42, 0.22], 0.9, { map: tex(128, 128, (g, w, h) => { g.fillStyle = '#9c6a3a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 40; i++) g.fillRect(0, i * 3.2, w, 1); g.fillStyle = '#f2c53d'; g.font = '900 70px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', w / 2, h / 2 + 4); }) });
    const coinM = K.mat([1.0, 0.80, 0.16], 0.3, { metal: 0.55, env: 1.2, emit: [0.45, 0.32, 0.02], emitK: 0.6 });
    K.lathe([0, 0, 0], [[0, 0], [1.45, 0], [1.25, 0.4], [0.85, 0.8], [0.4, 1.1], [0, 1.2]], coinM, { parent: sacks, seg: 24 });
    const coins = []; const q = rng(17); for (let i = 0; i < 160; i++) { const a = q() * 6.28, rr = Math.sqrt(q()) * 1.4, z = 1.2 * (1 - (rr / 1.45) ** 1.5); coins.push({ p: [Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.02, z)], s: [0.11, 0.11, 0.015], r: [q() * 50 - 25, q() * 50 - 25, q() * 360] }); }
    merged(K, new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateX(Math.PI / 2).rotateX(-Math.PI / 2), coinM, coins, { parent: sacks });
    for (const [x, y, z, s] of [[-0.6, -0.45, 0.72, 0.42], [0.55, -0.6, 0.66, 0.4], [0.05, 0.2, 1.12, 0.48], [-1.05, 0.45, 0.32, 0.38], [1.05, 0.3, 0.36, 0.36], [0.0, -1.15, 0.3, 0.34], [-0.3, 0.9, 0.55, 0.36]]) {
      const sk = K.lathe([x, y, z], [[0, 0], [s * 0.7, 0.02], [s * 0.9, s * 0.5], [s * 0.75, s * 1.0], [s * 0.3, s * 1.2], [s * 0.35, s * 1.35], [s * 0.15, s * 1.45], [0, s * 1.42]], sackM, { parent: sacks, seg: 18 }); sk.rotation.y = x;
      K.torus([x, y, z + s * 1.22], s * 0.3, 0.03, K.mat([0.85, 0.75, 0.5], 0.8), { parent: sacks, rx: Math.PI / 2 }); } }
  K.anim('sacks', sacks, (f, v) => { const g = v('glint', 0); sacks.scale.setScalar(1 + 0.02 * g * Math.sin(f * 0.8)); });
  const pod = K.group([-1.5, 0.3, 0.45], 0, st);
  K.lathe([0, 0, 0], [[0, 0], [0.45, 0], [0.4, 0.1], [0.28, 0.2], [0.28, 0.95], [0.4, 1.0], [0.0, 1.0]], K.mat([0.42, 0.22, 0.12], 0.5, { physical: true, clearcoat: 0.7 }), { parent: pod, seg: 8 });
  const lect = K.box([-0.38, -0.3, 0.98], [0.38, 0.25, 1.06], K.mat([0.42, 0.22, 0.12], 0.5), { parent: pod, r: 0.02 }); lect.rotation.x = 0.25;
  K.card([0, -0.29, 0.6], 0.36, 0.36, label('$', { w: 128, h: 128, bg: '#7a4420', fg: '#f2c53d', font: 'Georgia, serif' }), { parent: pod });
  if (!FRONT) { front.visible = true; st.visible = false; }
  // ---- the hall: coaches on both tracks and a loco, lamp posts, benches, palms, a newsstand, the sign board
  const C1 = coach(K, { name: 'coach_l', letters: 'RED MESA LINE', seed: 4 }); C1.group.position.copy(B(-8.5, 1.0, 0));
  const C2 = coach(K, { name: 'coach_r', color: [0.07, 0.30, 0.17], letters: 'GOLDEN SPAN EXPRESS', trim: '#e2b24a', seed: 7 }); C2.group.position.copy(B(8.5, 1.0, 0));
  const C3 = coach(K, { name: 'coach_l2', letters: 'RED MESA LINE', seed: 8 }); C3.group.position.copy(B(-8.5, 16.8, 0));
  const C4 = coach(K, { name: 'coach_r2', color: [0.07, 0.30, 0.17], letters: 'GOLDEN SPAN EXPRESS', trim: '#e2b24a', seed: 9 }); C4.group.position.copy(B(8.5, 16.8, 0));
  const LO = loco(K, { name: 'hall_loco', number: '4' }); LO.group.position.copy(B(8.5, 33, 0));
  const lampM = K.mat([1, 0.95, 0.85], 0.2, { emit: [1, 0.85, 0.6], emitK: 1.2 });
  const poles = [], heads = [];
  for (let y = 4; y < 70; y += 8) for (const x of [-5.6, 5.6, -13.4, 13.4]) { if (Math.abs(y - 6) < 2 && Math.abs(x) < 6) continue; poles.push({ p: [x, y, 0.55 + 1.9], s: [0.12, 0.12, 3.8], c: '#ffffff' }); heads.push({ p: [x, y, 4.55], s: 0.42 }, { p: [x + 0.4, y, 4.2], s: 0.3 }, { p: [x - 0.4, y, 4.2], s: 0.3 }); }
  merged(K, new THREE.CylinderGeometry(0.5, 0.6, 1, 10).rotateX(Math.PI / 2).rotateX(-Math.PI / 2), M.iron, poles);
  merged(K, new THREE.SphereGeometry(0.5, 16, 10), lampM, heads, { cast: false });
  for (const y of [12, 28, 44]) { K.point([0, y, 5], [1, 0.85, 0.65], 6, 14); }
  const bench = (x, y, rot) => { const g = K.group([x, y, 0.55], rot); const wood = K.mat([0.55, 0.32, 0.18], 0.6);
    for (const dz of [0.42, 0.46]) K.box([-0.9, -0.22 + (dz - 0.42) * 6, dz], [0.9, -0.12 + (dz - 0.42) * 6, dz + 0.04], wood, { parent: g, r: 0.01 });
    for (const dz of [0.58, 0.72]) K.box([-0.9, 0.16, dz], [0.9, 0.2, dz + 0.08], wood, { parent: g, r: 0.01 });
    for (const sx of [-0.8, 0.8]) { K.box([sx - 0.03, -0.2, 0], [sx + 0.03, 0.2, 0.44], M.iron, { parent: g, r: 0.01 }); K.box([sx - 0.03, 0.15, 0.44], [sx + 0.03, 0.2, 0.84], M.iron, { parent: g, r: 0.01 }); } return g; };
  for (const y of [9, 25, 41, 57]) { bench(-3.2, y, 90); bench(3.2, y + 4, -90); }
  const palm = (x, y) => { const g = K.group([x, y, 0.55]); K.lathe([0, 0, 0], [[0, 0], [0.32, 0], [0.42, 0.55], [0.46, 0.6], [0, 0.6]], K.mat([0.68, 0.36, 0.22], 0.7), { parent: g });
    K.cyl([0, 0, 1.1], 0.06, 1.1, K.mat([0.45, 0.33, 0.2], 0.9), { parent: g });
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, fr = K.cube([0, 0, 0], [0.16, 1.2, 0.02], K.mat(k % 2 ? [0.2, 0.5, 0.22] : [0.28, 0.6, 0.26], 0.7, { side: 2 }), { parent: g, r: 0.005 });
      fr.position.copy(B(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 1.6)); fr.rotation.order = 'YXZ'; fr.rotation.y = -a + Math.PI / 2; fr.rotation.x = 0.55; } return g; };
  for (const [x, y] of [[-5.2, 14], [5.2, 22], [-5.2, 33], [5.2, 47], [-12.5, 18], [12.5, 26], [-12.5, 50]]) palm(x, y);
  // the newsstand: a green kiosk with an awning and racks of papers
  const ns = K.group([-4.4, 30, 0.55], 90);
  { const g2 = K.mat([0.12, 0.34, 0.22], 0.55); K.box([-1.1, -0.7, 0], [1.1, 0.7, 2.2], g2, { parent: ns, r: 0.04 }); K.box([-1.25, -0.85, 2.2], [1.25, 0.85, 2.35], M.trim, { parent: ns, r: 0.03 });
    const aw = tex(256, 64, (g, w, h) => { for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#f4eee0' : '#2a7a4a'; g.fillRect(i * w / 10, 0, w / 10 + 1, h); } });
    const a = K.cube([0, -1.05, 2.15], [2.5, 0.7, 0.04], K.mat([1, 1, 1], 0.7, { map: aw }), { parent: ns, r: 0.01 }); a.rotation.x = -0.35;
    K.card([0, -0.72, 2.0], 1.8, 0.28, label('DAILY PAPERS', { w: 512, h: 80, bg: '#1d2e5a', fg: '#f2d27a' }), { parent: ns });
    const paper = tex(128, 160, (g, w, h) => { g.fillStyle = '#efe8d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1b22'; g.font = '900 16px Georgia'; g.textAlign = 'center'; g.fillText('THE CANYON', w / 2, 22); g.fillText('COURIER', w / 2, 40); g.fillRect(8, 48, w - 16, 3); for (let y = 60; y < h - 8; y += 9) g.fillRect(10, y, w - 20 - (y % 5) * 4, 4); });
    for (let i = 0; i < 6; i++) K.card([-0.75 + 0.3 * i, -0.72, 1.2 - 0.45 * (i % 2)], 0.26, 0.34, paper, { parent: ns, rotX: -12 }); }
  // the sign board on two posts (rises with key show)
  const sg = K.group([-3.2, 12.5, 0.55], 15); sg.name = 'sign';
  { const wood = K.mat([0.48, 0.30, 0.16], 0.7, { map: RSURF.tie(41) });
    for (const x of [-0.75, 0.75]) K.box([x - 0.05, -0.05, 0], [x + 0.05, 0.05, 2.2], wood, { parent: sg, r: 0.01 });
    K.box([-0.95, 0.0, 1.55], [0.95, 0.08, 2.35], wood, { parent: sg, r: 0.02 });
    K.card([0, -0.005, 1.95], 1.8, 0.72, label([{ t: opts.sign || 'ALL ABOARD!', c: '#a8241a' }, { t: 'RED MESA LINE · PLATFORM 1', s: 0.45, c: '#2a2a30', w: 700 }], { w: 768, h: 300, bg: '#f2e6c8', font: 'Georgia, serif', border: '#6a3a1a' }), { parent: sg, env: 0.4 }); }
  K.anim('sign', sg, (f, v) => { const k = v('show', 1); sg.visible = k > 0.01; sg.position.copy(B(-3.2, 12.5, 0.55 - 2.4 * (1 - Math.min(1, k)))); });
    stage.addBounce([0, 8, 1.5], [1.0, 0.78, 0.6], 1.0, 9);
  atmos(K, K.root, { haze: { color: '#c4bcd6', near: 40, dist: 500, max: 0.55 }, deep: { z: -50, depth: 50, color: '#2b358c', max: 0 }, sun: { color: '#fff0d6', k: 0.1, dir: SUN_DIR } });
  collideFromMeshes(COLLIDE, K.root, { skip: ['banner', 'sign'], big: 8, floor: 0.6 });
  return { props: K.props };
}
