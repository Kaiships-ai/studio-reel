// Fremantle Hospital research lab, 1984, at night (ep 1: the hook l01, the drink l07, the sneak l08).
// A long bench under a warm desk lamp, glass-front cabinets of amber reagent bottles, an incubator glowing on the
// side wall, tall windows onto a navy night city, a door to the corridor where the ETHICS COMMITTEE sign is lit.
// Story props: beaker of beef broth, two culture dishes, Mabel's framed photo, 1984 calendar. Blender metres.
import { createKit, room, windowY, SURF, label, tex, rng, B, css } from '../kit.js';

export const SUN_DIR = [-0.55, -0.75, -0.38];                 // moonlight through the back windows, toward the camera side
export const SUN_CENTER = [0, 0.5, 1.0], SUN_HALF = 4.5;
export const BENCH = { x0: -2.2, x1: 2.0, y0: 0.55, y1: 1.25, h: 0.94 };
const T = BENCH.h, WALL = 2.9;
export const PLACES = { bench: [0, 0.8, T], beaker: [0.34, -0.47, 0.865], dish1: [-0.95, 0.70, T], dish2: [-0.75, 0.86, T], photo: [-0.12, -0.5, 0.865], trolley: [0.15, -0.48, 0.86], board: [1.25, -0.15, 1.45], eyepiece: [-1.47, 0.12, 1.42], scope: [-1.55, 0.12, 1.1],
  door: [2.9, 2.5, 1.0], sign: [2.9, 4.6, 1.95], calendar: [-3.2, WALL - 0.03, 1.8], window: [-1.0, WALL, 1.7], incubator: [-3.3, 1.5, 1.1] };
export const MARKS = { front: [0.1, 0.05, 0], door: [2.75, 1.85, 0], left: [-1.2, 0.0, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-3.8, -8], [3.8, 0.4]]];
export const COLLIDE = [{ name: 'bench', lo: [BENCH.x0, BENCH.y0, 0], hi: [BENCH.x1, BENCH.y1, T] }];

export function mabelPhoto() {
  return tex(256, 320, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fc6e8'); gr.addColorStop(1, '#f2d7a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5c9a5a'; g.fillRect(0, h * 0.78, w, h * 0.22);
    g.strokeStyle = '#111'; g.lineWidth = 7; g.fillStyle = '#f6efe2';            // stick Mabel: round head, sun hat, smile
    g.beginPath(); g.moveTo(w / 2, h * 0.52); g.lineTo(w / 2, h * 0.86); g.stroke();
    g.fillStyle = '#2e8c8f'; g.fillRect(w / 2 - 34, h * 0.56, 68, 70);
    g.fillStyle = '#f6efe2'; g.beginPath(); g.arc(w / 2, h * 0.38, 62, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#e8c56a'; g.beginPath(); g.ellipse(w / 2, h * 0.25, 105, 22, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(w / 2 - 50, h * 0.14, 100, 34); g.strokeRect(w / 2 - 50, h * 0.14, 100, 34);
    g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2 - 20, h * 0.38, 7, 0, 7); g.arc(w / 2 + 20, h * 0.38, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(w / 2, h * 0.42, 22, 0.2, Math.PI - 0.2); g.stroke();
  });
}

export function nightCity(seed = 7) {
  return tex(1024, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1433'); gr.addColorStop(0.55, '#1d3a78'); gr.addColorStop(0.75, '#3a5a9a'); gr.addColorStop(1, '#22305a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * r()})`; g.fillRect(r() * w, r() * h * 0.5, 2, 2); }
    g.fillStyle = '#fff8dd'; g.beginPath(); g.arc(w * 0.78, h * 0.18, 34, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,248,220,0.18)'; g.beginPath(); g.arc(w * 0.78, h * 0.18, 70, 0, 7); g.fill();
    for (let b = 0; b < 26; b++) {                                   // skyline with lit windows
      const bx = r() * w, bw = 40 + r() * 110, bh = h * (0.12 + r() * 0.3), by = h * 0.78 - bh;
      g.fillStyle = `rgb(${18 + 20 * r()},${24 + 20 * r()},${52 + 30 * r()})`; g.fillRect(bx, by, bw, bh + h * 0.3);
      for (let y = by + 10; y < h * 0.78; y += 16) for (let x = bx + 6; x < bx + bw - 8; x += 14) if (r() > 0.62) { g.fillStyle = r() > 0.3 ? '#ffd27a' : '#bfe1ff'; g.fillRect(x, y, 7, 9); }
    }
    g.fillStyle = '#0d1630'; g.fillRect(0, h * 0.78, w, h * 0.22);
  });
}

export function daySky(seed = 9) {
  return tex(1024, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3d8de6'); gr.addColorStop(0.6, '#a9d3f5'); gr.addColorStop(1, '#e6f1f2'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(seed); for (let i = 0; i < 10; i++) { const cx = r() * w, cy = h * (0.1 + 0.3 * r()), s = 40 + 50 * r(); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(cx + (k - 3) * s * 0.5, cy, s * 0.6, s * 0.35, 0, 0, 7); g.fill(); } }
    for (let b = 0; b < 9; b++) { const bx = b * w / 9 + r() * 30, bw = 90 + r() * 60, bh = h * (0.18 + r() * 0.2), by = h * 0.8 - bh;   // hospital blocks
      g.fillStyle = ['#d9cbb4', '#c8b79c', '#e2d8c6'][b % 3]; g.fillRect(bx, by, bw, bh + h * 0.2);
      for (let y = by + 12; y < h * 0.8; y += 22) for (let x = bx + 8; x < bx + bw - 10; x += 18) { g.fillStyle = '#5d7ea0'; g.fillRect(x, y, 10, 12); } }
    g.fillStyle = '#6f9a58'; g.fillRect(0, h * 0.8, w, h * 0.2); for (let i = 0; i < 18; i++) { g.fillStyle = '#4f7f44'; g.beginPath(); g.arc(r() * w, h * 0.8, 30 + 30 * r(), 0, 7); g.fill(); }
  });
}

export async function build(stage, opts = {}) {
  const DAY = opts.mode === 'day';
  const K = createKit(stage, { env: DAY ? { top: [0.75, 0.82, 0.95], mid: [0.80, 0.80, 0.76], bottom: [0.45, 0.42, 0.38], panels: [{ dir: [0, 1, 0.3], w: 6, h: 3, color: [1, 0.97, 0.9], power: 3 }] }
    : { top: [0.20, 0.26, 0.45], mid: [0.36, 0.34, 0.40], bottom: [0.20, 0.16, 0.13],
    panels: [{ dir: [0, 1, 0.3], w: 6, h: 3, color: [0.45, 0.6, 1.0], power: 2.2 }, { dir: [0.0, 0.0, 1], w: 5, h: 2, color: [0.95, 0.98, 1.0], power: 3.0 }] }, envK: 0.75 });
  stage.scene.background = null;
  const M = {
    wall: K.mat([0.74, 0.80, 0.72], 0.9, { map: SURF.plaster([0.74, 0.80, 0.72], 3), env: 0.6 }),
    wallLow: K.mat([0.36, 0.52, 0.50], 0.7, { env: 0.6 }),
    floor: K.mat([1, 1, 1], 0.45, { map: SURF.checker([0.62, 0.66, 0.60], [0.46, 0.50, 0.48], 10), repeat: [3, 3] }),
    ceil: K.mat([0.62, 0.64, 0.62], 0.9),
    trim: K.mat([0.30, 0.34, 0.32], 0.5),
    cab: K.mat([0.42, 0.56, 0.52], 0.45), cabDark: K.mat([0.26, 0.34, 0.33], 0.5),
    top: K.mat([0.16, 0.17, 0.18], 0.35, { physical: true, clearcoat: 0.6 }),
    steel: K.mat([0.78, 0.80, 0.82], 0.28, { metal: 0.9 }), chrome: K.mat([0.9, 0.9, 0.92], 0.12, { metal: 1 }),
    wood: K.mat([0.55, 0.36, 0.20], 0.55, { map: SURF.wood([0.55, 0.36, 0.20]) }),
    frame: K.mat([0.88, 0.88, 0.84], 0.5),
    amber: K.glass([0.75, 0.40, 0.10], { opacity: 0.65 }), clear: K.glass(), green: K.glass([0.3, 0.7, 0.4], { opacity: 0.5 }), blue: K.glass([0.3, 0.45, 0.85], { opacity: 0.55 }),
    black: K.mat([0.06, 0.06, 0.07], 0.5), cream: K.mat([0.92, 0.88, 0.78], 0.6), red: K.mat([0.75, 0.12, 0.10], 0.45),
  };
  room(K, { x0: -3.9, x1: 3.9, y0: -8, y1: WALL, h: 3.3, wall: M.wall, floor: M.floor, ceil: M.ceil, doorR: [1.6, 2.4, 2.15] });
  // two-tone wall: a darker teal dado band and a trim rail
  K.box([-3.9, WALL - 0.03, 0], [3.9, WALL, 1.05], M.wallLow, { r: 0 }); K.box([-3.9, WALL - 0.06, 1.05], [3.9, WALL, 1.1], M.trim, { r: 0.008 });
  K.box([-3.9, -8, 0], [-3.87, WALL, 1.05], M.wallLow, { r: 0 }); K.box([3.87, -8, 0], [3.9, WALL, 1.05], M.wallLow, { r: 0 });
  // tall back windows onto the night city, venetian blinds half drawn
  const city = DAY ? daySky() : nightCity();
  for (const cx of [-1.9, -0.2]) windowY(K, { cx, y: WALL - 0.01, z0: 1.2, w: 1.3, h: 1.6, frame: M.frame, view: city, viewK: DAY ? 1.15 : 1.25, mull: [2, 3],
    blinds: cx < -1 ? null : { n: 7, mat: K.mat([0.86, 0.84, 0.78], 0.6), tilt: 1.25 } });
  K.area([-1.05, WALL - 0.2, 2.0], [-0.2, 0, 1.0], 3.2, 1.6, DAY ? [1.0, 0.95, 0.85] : [0.45, 0.6, 1.0], DAY ? 9 : 6.0);
  // bench: dark top, teal cabinet doors with chrome pulls, a steel sink at the left end
  K.box([BENCH.x0, BENCH.y0 + 0.05, 0.1], [BENCH.x1, BENCH.y1, T - 0.04], M.cab, { r: 0.01 });
  K.box([BENCH.x0, BENCH.y0 + 0.07, 0], [BENCH.x1, BENCH.y1, 0.1], M.cabDark, { r: 0.004 });
  K.box([BENCH.x0 - 0.03, BENCH.y0, T - 0.04], [BENCH.x1 + 0.03, BENCH.y1 + 0.02, T], M.top, { r: 0.012 });
  for (let x = BENCH.x0 + 0.3; x < BENCH.x1; x += 0.6) { K.box([x - 0.27, BENCH.y0 + 0.03, 0.16], [x + 0.27, BENCH.y0 + 0.06, T - 0.1], M.cab, { r: 0.012 }); K.cube([x + 0.18, BENCH.y0 + 0.02, T - 0.2], [0.08, 0.02, 0.018], M.chrome, { r: 0.006 }); }
  K.box([-2.1, 0.7, T - 0.02], [-1.55, 1.15, T + 0.005], M.steel, { r: 0.01 });
  K.cyl([-1.82, 1.12, T + 0.2], 0.012, 0.4, M.chrome); K.cyl([-1.82, 1.02, T + 0.39], 0.012, 0.22, M.chrome, { axis: 'y' });
  // back shelf over the bench: reagent bottles (amber, clear, blue), a row of test tubes
  K.box([-1.5, WALL - 0.32, 1.55], [1.9, WALL - 0.02, 1.58], M.wood, { r: 0.004 });
  K.box([-1.5, WALL - 0.32, 2.1], [1.9, WALL - 0.02, 2.13], M.wood, { r: 0.004 });
  const r = rng(11), bottle = (x, z, m, s = 1) => { K.lathe([x, WALL - 0.17, z], [[0, 0], [0.05 * s, 0], [0.055 * s, 0.01], [0.055 * s, 0.15 * s], [0.03 * s, 0.19 * s], [0.018 * s, 0.21 * s], [0.018 * s, 0.24 * s], [0, 0.24 * s]], m);
    K.cyl([x, WALL - 0.17, z + 0.25 * s], 0.022 * s, 0.03, M.black); if (r() > 0.4) K.card([x, WALL - 0.226 * s - 0.0, z + 0.08 * s], 0.07 * s, 0.05 * s, label(['NaCl', ''], { w: 64, h: 48 }), { env: 0.3 }); };
  for (let x = 1.6; x > 0.35; x -= 0.15 + 0.06 * r()) bottle(x, 1.58, [M.amber, M.clear, M.blue, M.amber][Math.floor(r() * 4)], 0.8 + 0.4 * r());
  for (let x = -1.4; x < 1.8; x += 0.14 + 0.08 * r()) bottle(x, 2.13, [M.amber, M.amber, M.clear, M.green][Math.floor(r() * 4)], 0.7 + 0.35 * r());
  // glass-front wall cabinet on the right with stacked glassware
  K.box([2.25, WALL - 0.45, 1.25], [3.6, WALL - 0.02, 2.75], M.cab, { r: 0.015 });
  for (let i = 0; i < 2; i++) { K.box([2.3 + i * 0.65, WALL - 0.47, 1.3], [2.9 + i * 0.65, WALL - 0.44, 2.7], K.glass([0.8, 0.9, 0.95], { opacity: 0.18 }), { r: 0.006 }); }
  for (const z of [1.62, 2.12]) { K.box([2.3, WALL - 0.42, z], [3.55, WALL - 0.05, z + 0.02], M.cream, { r: 0 }); for (let x = 2.4; x < 3.5; x += 0.13) K.lathe([x, WALL - 0.25, z + 0.02], [[0, 0], [0.045, 0], [0.045, 0.1], [0.05, 0.12], [0, 0.12]], M.clear); }
  K.box([2.25, WALL - 0.65, 0], [3.6, WALL - 0.02, 0.94], M.cabDark, { r: 0.012 });
  // incubator on the left wall: a steel box with a glowing amber window and a dial (where the bug grows)
  const inc = K.group([-3.45, 1.35, 0.0], 90);
  K.cube([0, 0, 0.55], [0.75, 0.6, 1.1], M.steel, { parent: inc, r: 0.03 }); K.cube([0, -0.31, 0.75], [0.5, 0.02, 0.4], K.glow([1.0, 0.62, 0.25], 1.6), { parent: inc, r: 0.01 });
  K.card([0, -0.311, 1.02], 0.45, 0.09, label('INCUBATOR 37°C', { w: 512, h: 96, bg: '#d9dde0' }), { parent: inc });
  K.point([-3.1, 1.35, 0.8], [1.0, 0.6, 0.25], 1.6, 2.5);
  // calendar 1984 and a clock on the back wall, a corkboard with notes
  K.card([-3.2, WALL - 0.03, 1.8], 0.7, 0.93, tex(256, 340, (g, w, h) => { g.fillStyle = '#f8f4ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8231c'; g.fillRect(0, 0, w, 88);
    g.fillStyle = '#fff'; g.font = '900 64px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('1984', w / 2, 66); g.fillStyle = '#222'; g.font = '700 22px Arial';
    for (let i = 0; i < 31; i++) g.fillText(String(i + 1), 26 + (i % 7) * 34, 130 + Math.floor(i / 7) * 42); g.strokeStyle = '#c1271d'; g.lineWidth = 4; g.beginPath(); g.arc(128, 172, 18, 0, 7); g.stroke(); }));
  const clk = K.group([1.0, WALL - 0.03, 2.55]); K.cyl([0, 0, 0], 0.22, 0.05, M.black, { parent: clk, axis: 'y' }); K.cyl([0, -0.03, 0], 0.2, 0.02, M.cream, { parent: clk, axis: 'y' });
  K.cube([0, -0.045, 0.06], [0.015, 0.005, 0.13], M.black, { parent: clk }); K.cube([0.05, -0.045, 0], [0.1, 0.005, 0.012], M.black, { parent: clk });
  K.card([2.6, WALL - 0.03, 2.95], 0.9, 0.35, label(['GASTROENTEROLOGY', { t: 'RESEARCH LAB 2', s: 0.7, w: 700 }], { w: 512, h: 196, bg: '#1d3f66', fg: '#f1f1f1' }));
  // corridor door at the right: frosted glass with a lit corridor behind, the ETHICS COMMITTEE sign across the hall
  K.box([3.8, 1.52, 0], [3.9, 1.6, 2.23], M.frame, { r: 0.01 }); K.box([3.8, 2.4, 0], [3.9, 2.48, 2.23], M.frame, { r: 0.01 }); K.box([3.8, 1.52, 2.15], [3.9, 2.48, 2.23], M.frame, { r: 0.01 });
  const door = K.group([3.95, 1.6, 0], 0);                          // the door stands open into the corridor
  K.box([0, -0.03, 0], [0.8, 0.0, 2.12], M.cab, { parent: door, r: 0.01 }); K.box([0.2, -0.035, 1.2], [0.6, -0.025, 1.9], K.glass([0.9, 0.95, 1], { opacity: 0.5 }), { parent: door, r: 0.004 });
  door.rotation.y = -1.2;
  K.anim('door', door, (f, v) => { door.rotation.y = -1.2 + 2.77 * v('shut', 0); });   // round 3: key shut 0..1 (he shuts it on the ethics committee)
  // corridor beyond the door as a backdrop seen through the open doorway (opening in the side wall)
  K.card([5.0, 2.0, 1.2], 1.6, 2.6, tex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e9efe6'); gr.addColorStop(1, '#a7b3a6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7f8c80'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = '#1d3f66'; g.fillRect(w * 0.12, h * 0.18, w * 0.76, h * 0.14);
    g.fillStyle = '#fff'; g.font = '900 30px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('ETHICS', w / 2, h * 0.24); g.fillText('COMMITTEE', w / 2, h * 0.30); }), { rotZ: -90, emissive: 1.0 });
  // ---- story props on the bench
  // beaker of beef broth (amber-brown), a printed label
  const bk = K.group(PLACES.beaker);
  K.lathe([0, 0, 0], [[0, 0], [0.07, 0], [0.072, 0.005], [0.072, 0.2], [0.08, 0.215], [0.078, 0.22], [0.068, 0.205], [0.068, 0.006], [0, 0.006]], K.glass([0.9, 0.95, 1.0], { opacity: 0.25 }), { parent: bk });
  const broth = K.cyl([0, 0, 0.075], 0.066, 0.14, K.mat([0.55, 0.30, 0.10], 0.15, { physical: true, clearcoat: 1, opacity: 0.88 }), { parent: bk });
  K.card([0, -0.0735, 0.12], 0.1, 0.06, label(['BEEF BROTH', { t: '+ H. pylori', s: 0.6, w: 700 }], { w: 256, h: 150, bg: '#f4efe2' }), { parent: bk });
  // the culture drops in (key plop 0..2: one green blob per dish), the broth clouds green; show 0/1
  const blob = [0, 1].map(() => K.sphere([0, 0, 0.3], 0.03, K.mat([0.45, 0.75, 0.2], 0.4, { physical: true, clearcoat: 1 }), { parent: bk, sz: 0.6, seg: 16 }));
  const cloud = K.cyl([0, 0, 0.1], 0.06, 0.1, K.mat([0.42, 0.62, 0.16], 0.3, { opacity: 0.0 }), { parent: bk }); cloud.material.transparent = true;
  const brothMat = broth.material, c0 = brothMat.color.clone(), cG = brothMat.color.clone().lerp(new (cloud.material.color.constructor)().setRGB(0.25, 0.32, 0.05), 0.6);
  K.anim('beaker_set', bk, (f, v) => { bk.visible = !DAY && v('show', 1) > 0.5; const p = v('plop', 0);
    blob.forEach((b, i) => { const t = Math.min(1, Math.max(0, p - i)); b.visible = t > 0 && t < 1; b.position.set(0, 0.32 - 0.2 * t * t, 0); });
    brothMat.color.copy(c0).lerp(cG, Math.min(1, p / 2)); const lv = v('level', 1); broth.visible = lv > 0.02;   // round 3: key level 0..1 (slammed down empty)
    broth.scale.y = Math.max(0.02, lv) * (1 + 0.06 * Math.min(2, p)); broth.position.y = 0.006 + 0.07 * Math.max(0.02, lv) * (1 + 0.06 * Math.min(2, p)); });
  // two culture dishes with spiral colonies; key tip 0..1: the dish rises over the beaker, tips, then goes back down empty
  const dish = (name, at, side) => { const g = K.group(at), d = K.group([0, 0, 0], 0, g); K.cyl([0, 0, 0.012], 0.085, 0.022, K.glass([0.9, 0.95, 1], { opacity: 0.3 }), { parent: d });
    const agar = K.cyl([0, 0, 0.008], 0.08, 0.012, K.mat([0.86, 0.80, 0.42], 0.3, { physical: true, clearcoat: 1, opacity: 0.92 }), { parent: d });
    const col = K.group([0, 0, 0], 0, d), rr = rng(name.length * 7); for (let i = 0; i < 22; i++) { const a = rr() * 6.28, dd = rr() * 0.065; K.sphere([Math.cos(a) * dd, Math.sin(a) * dd, 0.015], 0.006 + 0.006 * rr(), K.mat([0.42, 0.62, 0.22], 0.5), { parent: col, sz: 0.4, seg: 10 }); }
    const off = PLACES.beaker.map((x, i) => x - at[i]);
    return K.anim(name, g, (f, v) => { const t = v('tip', 0), up = Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2);
      d.position.copy(B(off[0] * up + side * 0.06 * up, off[1] * up, 0.28 * up)); d.rotation.z = side * 1.9 * Math.max(0, Math.min(1, (t - 0.25) / 0.3)) * (t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2); col.visible = t < 0.55; }); };
  dish('dish1', PLACES.dish1, -1); dish('dish2', PLACES.dish2, 1);
  if (DAY) {                                                       // 1982, Royal Perth: the two name plaques on the bench
    K.card([1.05, 0.54, T + 0.06], 0.5, 0.12, label('DR BARRY MARSHALL', { w: 768, h: 160, bg: '#20304a', fg: '#f3e6c2' }), { rotX: -15 });
    K.card([-0.35, 0.54, T + 0.06], 0.5, 0.12, label('DR ROBIN WARREN', { w: 768, h: 160, bg: '#20304a', fg: '#f3e6c2' }), { rotX: -15 });
  }
  // a small steel trolley by Kip's left with Mabel's framed photo (key down 0..1: he lays it face down)
  const trol = K.group([0.15, -0.48, 0]); K.cube([0, 0, 0.84], [0.5, 0.4, 0.03], M.steel, { parent: trol, r: 0.01 }); K.cube([0, 0, 0.35], [0.5, 0.4, 0.03], M.steel, { parent: trol, r: 0.01 });
  for (const x of [-0.23, 0.23]) for (const y of [-0.18, 0.18]) K.cyl([x, y, 0.43], 0.012, 0.85, M.chrome, { parent: trol });
  K.cube([0.1, 0.05, 0.39], [0.25, 0.2, 0.06], M.amber, { parent: trol, r: 0.01 }); trol.scale.set(1.5, 1, 1); trol.visible = !DAY;
  const ph = K.group(PLACES.photo, -8), phi = K.group([0, 0.03, 0], 0, ph); ph.visible = !DAY; K.cube([0, 0, 0.13], [0.2, 0.025, 0.26], M.wood, { parent: phi, r: 0.008 });
  K.card([0, -0.0135, 0.13], 0.16, 0.2, mabelPhoto(), { parent: phi, env: 0.4 });
  K.anim('photo', ph, (f, v) => { phi.rotation.x = -1.5 * v('down', 0); ph.visible = !DAY; });
  // 1982 pathology bench (day): a bigger microscope on a side table at the front left, eyepiece toward +x
  if (DAY) { const tb = K.group([-1.55, 0.12, 0]); K.cube([0, 0, 0.45], [0.6, 0.5, 0.9], M.cab, { parent: tb, r: 0.015 }); K.cube([0, 0, 0.91], [0.66, 0.56, 0.03], M.top, { parent: tb, r: 0.01 });
    const sc = K.group([0, 0, 0.93], -90, tb), cr = M.cream;
    K.cube([0, 0.02, 0.025], [0.22, 0.3, 0.05], M.black, { parent: sc, r: 0.015 }); K.cube([0, 0.1, 0.22], [0.07, 0.07, 0.36], cr, { parent: sc, r: 0.02 });
    K.cube([0, 0.0, 0.16], [0.18, 0.15, 0.02], M.black, { parent: sc, r: 0.005 }); K.cyl([0, -0.02, 0.27], 0.03, 0.12, M.chrome, { parent: sc });
    const tube = K.cyl([0, 0.02, 0.4], 0.035, 0.26, M.black, { parent: sc }); tube.rotation.x = -0.6; K.cyl([0, 0.1, 0.49], 0.03, 0.06, M.chrome, { parent: sc }).rotation.x = -0.6;
    K.cube([0.0, -0.02, 0.18], [0.16, 0.06, 0.004], K.glass([0.9, 0.95, 1], { opacity: 0.5 }), { parent: sc, r: 0.001 });
    K.anim('scope', tb, () => {}); K.point([-1.2, -0.3, 1.6], [1, 0.95, 0.85], 1.2, 2.5);
    const bd = K.group(PLACES.board.slice(0, 2).concat(0), -12);
    for (const x of [-0.4, 0.4]) K.cyl([x, 0.1, 0.8], 0.02, 1.6, M.wood, { parent: bd }); K.cube([0, 0.05, 1.45], [1.0, 0.04, 0.78], K.mat([0.72, 0.52, 0.32], 0.9), { parent: bd, r: 0.02 });
    K.cube([0, 0.085, 1.45], [1.06, 0.03, 0.84], M.wood, { parent: bd, r: 0.02 });
    K.card([0, 0.025, 1.9], 0.8, 0.12, label('SAMPLES · 1982', { w: 512, h: 80, bg: '#fff7e0', fg: '#222' }), { parent: bd });
    const photo = i => tex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b8cf'; g.beginPath(); g.arc(w / 2, h / 2 - 6, 48, 0, 7); g.fill(); g.strokeStyle = '#6c2a7a'; g.lineWidth = 6;
      const q = rng(30 + i); for (let k = 0; k < 2 + i; k++) { const x = w / 2 + (q() - 0.5) * 50, y = h / 2 - 6 + (q() - 0.5) * 50; g.beginPath(); for (let t = 0; t <= 1; t += 0.05) g.lineTo(x - 14 + t * 28, y + 6 * Math.sin(t * 18)); g.stroke(); }
      g.fillStyle = '#222'; g.font = '700 12px Arial'; g.textAlign = 'center'; g.fillText('PATIENT ' + (i + 1), w / 2, h - 6); });
    const pins = []; for (let i = 0; i < 6; i++) pins.push(K.card([-0.32 + (i % 3) * 0.32, 0.02, 1.62 - Math.floor(i / 3) * 0.34], 0.26, 0.26, photo(i), { parent: bd, rotZ: 0 }));
    pins.forEach((p, i) => { p.rotation.z = (i % 2 ? 1 : -1) * 0.08; });
    K.anim('board', bd, (f, v) => { const n = v('n', 0); pins.forEach((p, i) => { const k = Math.min(1, Math.max(0, n - i)); p.visible = k > 0; p.scale.setScalar(Math.max(0.01, k < 1 ? 1.25 * k : 1)); }); }); }
  // microscope, test tube rack, notebook, desk lamp (the warm key light of the room)
  const ms = K.group([-1.55, 1.0, T], 25); ms.visible = !DAY;
  K.cube([0, 0, 0.02], [0.18, 0.24, 0.04], M.black, { parent: ms, r: 0.01 }); K.cube([0, 0.08, 0.17], [0.05, 0.05, 0.3], M.cream, { parent: ms, r: 0.015 });
  K.cyl([0, 0.02, 0.27], 0.028, 0.2, M.black, { parent: ms }).rotation.x = 0.5; K.cube([0, -0.02, 0.12], [0.14, 0.12, 0.015], M.black, { parent: ms, r: 0.004 });
  const rack = K.group([0.95, 0.85, T], -8); K.cube([0, 0, 0.07], [0.32, 0.1, 0.012], M.wood, { parent: rack, r: 0.003 }); K.cube([0, 0, 0.005], [0.32, 0.1, 0.01], M.wood, { parent: rack, r: 0.003 });
  for (let i = 0; i < 6; i++) { K.cyl([-0.13 + i * 0.052, 0, 0.08], 0.014, 0.15, M.clear, { parent: rack }); K.cyl([-0.13 + i * 0.052, 0, 0.035], 0.012, 0.06, [M.green, M.amber, M.blue][i % 3], { parent: rack }); }
  K.cube([-0.65, 0.78, T + 0.012], [0.3, 0.22, 0.02], M.cream, { r: 0.004, rotZ: 14 }); K.cube([-0.65, 0.78, T + 0.024], [0.3, 0.22, 0.004], M.red, { r: 0.001, rotZ: 14 });
  const lamp = K.group([1.05, 1.1, T], 0);
  K.cyl([0, 0, 0.015], 0.09, 0.03, M.black, { parent: lamp }); K.cyl([0, 0, 0.25], 0.012, 0.48, M.black, { parent: lamp }).rotation.z = 0.25;
  const shade = K.lathe([0.08, -0.06, 0.48], [[0.02, 0.07], [0.04, 0.06], [0.1, -0.02], [0.105, -0.03]], K.mat([0.12, 0.38, 0.30], 0.4, { side: 2 }), { parent: lamp }); shade.rotation.x = -0.5;
  K.sphere([0.08, -0.08, 0.45], 0.03, K.glow([1, 0.85, 0.6], 4), { parent: lamp });
  K.spot([1.1, 0.95, T + 0.48], [0.6, 0.6, T], [1.0, 0.72, 0.42], 7, { angle: 62, pen: 0.9, dist: 6 });
  K.point([0.2, 0.2, 1.7], [1.0, 0.72, 0.45], 3.5, 5.5); K.point([-0.5, 0.6, 1.5], [1.0, 0.8, 0.55], 1.2, 2.0); K.point([-2.4, 2.2, 2.4], [0.45, 0.6, 1.0], 2.0, 4);
  // overhead: a long fluorescent fitting (off, a faint tube glow)
  K.box([-2.0, 0.6, 3.18], [2.0, 0.85, 3.3], M.cream, { r: 0.02 }); K.box([-1.9, 0.65, 3.16], [1.9, 0.8, 3.18], K.glow([0.95, 0.98, 1.0], 2.2), { r: 0 }); K.area([0, 0.1, 3.1], [0, 0.1, 0], 3.6, 1.2, [0.92, 0.96, 1.0], 6);
  // a stool, a waste bin, a coat stand with a white lab coat
  const st = K.group([-0.9, 1.6, 0], 0); K.cyl([0, 0, 0.62], 0.17, 0.05, M.black, { parent: st }); K.cyl([0, 0, 0.31], 0.02, 0.6, M.chrome, { parent: st });
  K.torus([0, 0, 0.22], 0.15, 0.008, M.chrome, { parent: st }); K.cyl([0, 0, 0.02], 0.2, 0.03, M.chrome, { parent: st });
  K.cyl([2.15, 0.2, 0.18], 0.13, 0.36, M.steel, { r2: 0.15 });
  return { props: K.props };
}
