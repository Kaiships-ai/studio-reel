// Set dressing kit (SETS.md "Dressing"): small, specific, toon pieces built in code, placed in clusters that tell a
// story (a bus stop with a bin and a poster, a lab bench with burners and a sink). Every piece is ONE registered object:
// the dressing gate counts how many distinct pieces the camera really sees (window.__dressCount, read by shot.mjs --dbg).
//   const D = dressKit(stage, COLLIDE);                       // COLLIDE: the set's array; solid pieces push a box into it
//   D.put('bench', [x, y, 0], rotDeg, { solid: true });       // a kit piece (PIECES below), Blender metres, deg about z
//   D.sign([x, y, z], 'BUS', { w, h, bg, fg, face: rotDeg });  // a painted sign board
//   const s = D.mark(); ...old set code...; D.since(s, 'counter')   // register meshes a set built by hand as one piece
// Blender metres: x right, y into the scene, z up. A piece's origin is its bottom centre, its front faces -y.
import * as THREE from 'three';
import { B, lin, toon } from '../../engine/look.js';
import { canvasTex } from './kit.js';

const MATS = new Map();
// shared toon material per colour (same ramp as the .glb pieces)
export function tm(rgb, o = {}) {
  const key = rgb.map(v => v.toFixed(3)).join(',') + JSON.stringify(o);
  if (!MATS.has(key)) {
    const { glowy, ...rest } = o;
    const m = toon(rgb, { rough: 0.6, sheen: 0.05, rim: 0.12, ...rest });
    if (glowy) { m.emissive = lin(...rgb).multiplyScalar(glowy); m.userData.glowy = true; }
    MATS.set(key, m);
  }
  return MATS.get(key);
}
export const C = {
  wood: [0.55, 0.30, 0.12], woodL: [0.78, 0.55, 0.30], woodD: [0.30, 0.15, 0.06], iron: [0.12, 0.13, 0.15], steel: [0.62, 0.66, 0.70],
  white: [0.94, 0.93, 0.90], cream: [0.95, 0.88, 0.70], red: [0.86, 0.16, 0.12], orange: [1.0, 0.48, 0.10], yellow: [1.0, 0.80, 0.16],
  green: [0.20, 0.55, 0.22], leaf: [0.24, 0.58, 0.22], leafD: [0.14, 0.42, 0.16], blue: [0.18, 0.42, 0.86], teal: [0.12, 0.55, 0.55],
  pink: [0.95, 0.45, 0.62], purple: [0.50, 0.30, 0.75], grey: [0.50, 0.50, 0.52], greyD: [0.26, 0.27, 0.30], terracotta: [0.78, 0.36, 0.20],
  black: [0.05, 0.05, 0.06], brass: [1.0, 0.66, 0.16], sand: [0.88, 0.76, 0.52], stone: [0.66, 0.64, 0.60], soil: [0.30, 0.18, 0.10],
  glass: [0.62, 0.84, 0.94], paper: [0.98, 0.96, 0.88], navy: [0.10, 0.16, 0.36], mint: [0.50, 0.85, 0.70],
};
const m = c => tm(Array.isArray(c) ? c : C[c]);
function lcg(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------------------------------------------------------------- painted textures (signs, posters, labels in the world)
const TEX = new Map();
export function signTex(text, { bg = [0.98, 0.96, 0.88], fg = [0.05, 0.05, 0.06], w = 512, h = 256, font = null, border = [0.05, 0.05, 0.06], sub = null } = {}) {
  const key = JSON.stringify([text, bg, fg, w, h, font, border, sub]);
  if (TEX.has(key)) return TEX.get(key);
  const css = c => `rgb(${c.map(x => Math.round(255 * Math.pow(Math.max(0, Math.min(1, x)), 1 / 2.2))).join(',')})`;
  const t = canvasTex(w, h, (g, W, H) => {
    g.fillStyle = css(bg); g.fillRect(0, 0, W, H);
    if (border) { g.strokeStyle = css(border); g.lineWidth = Math.max(6, H * 0.06); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth); }
    g.fillStyle = css(fg); g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = String(text).split('\n'), n = lines.length + (sub ? 0.6 : 0);
    let px = Math.floor(H * 0.62 / n); g.font = font || `900 ${px}px InterReel, Arial, sans-serif`;
    const wid = Math.max(...lines.map(l => g.measureText(l).width)); if (wid > W * 0.86) { px = Math.floor(px * W * 0.86 / wid); g.font = font || `900 ${px}px InterReel, Arial, sans-serif`; }
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * px * 1.1 - (sub ? px * 0.35 : 0)));
    if (sub) { g.font = `700 ${Math.floor(px * 0.42)}px InterReel, Arial, sans-serif`; g.fillText(sub, W / 2, H / 2 + lines.length * px * 0.55 + px * 0.1); }
  });
  TEX.set(key, t); return t;
}
// a poster: coloured field with a big shape and a title (invented, no brands)
export function posterTex(title, { bg = [0.95, 0.45, 0.62], fg = [0.05, 0.05, 0.06], shape = 'circle', seed = 1 } = {}) {
  const key = 'poster' + JSON.stringify([title, bg, fg, shape, seed]);
  if (TEX.has(key)) return TEX.get(key);
  const css = c => `rgb(${c.map(x => Math.round(255 * Math.pow(Math.max(0, Math.min(1, x)), 1 / 2.2))).join(',')})`;
  const r = lcg(seed * 977);
  const t = canvasTex(256, 360, (g, W, H) => {
    g.fillStyle = css(bg); g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    if (shape === 'circle') { g.beginPath(); g.arc(W / 2, H * 0.42, W * 0.3, 0, 7); g.fill(); }
    else if (shape === 'stripes') for (let i = 0; i < 5; i++) g.fillRect(0, H * (0.15 + i * 0.12), W, H * 0.05);
    else if (shape === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? W * 0.13 : W * 0.32; g.lineTo(W / 2 + rr * Math.cos(a), H * 0.42 + rr * Math.sin(a)); } g.fill(); }
    else if (shape === 'note') { g.font = `900 ${W * 0.5}px Arial`; g.textAlign = 'center'; g.fillText('♪', W / 2, H * 0.56); }
    else if (shape === 'bars') for (let i = 0; i < 5; i++) { const h = H * (0.1 + 0.08 * i); g.fillRect(W * (0.14 + i * 0.15), H * 0.62 - h, W * 0.1, h); }
    g.fillStyle = css(fg); g.font = `900 ${W * 0.16}px InterReel, Arial, sans-serif`; g.textAlign = 'center'; g.fillText(title, W / 2, H * 0.84);
    g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(W * 0.2, H * (0.9 + i * 0.025), W * (0.3 + 0.3 * r()), 3);
    g.strokeStyle = 'rgb(20,20,24)'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  });
  TEX.set(key, t); return t;
}

// ---------------------------------------------------------------- the piece-local builder
// coordinates are piece-local Blender metres; meshes go into group g
function P(g) {
  const add = (x, ink = true, cast = true) => { x.castShadow = cast; x.receiveShadow = true; if (!ink) x.userData.noInk = true; g.add(x); return x; };
  return {
    box(lo, hi, c, o = {}) { const a = B(...lo), b = B(...hi);
      const x = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(b.x - a.x) || 1e-3, Math.abs(b.y - a.y) || 1e-3, Math.abs(b.z - a.z) || 1e-3), m(c));
      x.position.copy(a).add(b).multiplyScalar(0.5); return add(x, o.ink !== false); },
    cyl(at, r, h, c, { r2 = r, seg = 14, axis = 'z', ink = true } = {}) { const x = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), m(c));
      x.position.copy(B(...at)); if (axis === 'x') x.rotation.z = Math.PI / 2; if (axis === 'y') x.rotation.x = Math.PI / 2; return add(x, ink); },
    sph(at, r, c, { sz = 1, sx = 1, seg = 12, ink = true } = {}) { const x = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), m(c));
      x.scale.set(sx, sz, sx); x.position.copy(B(...at)); return add(x, ink); },
    cone(at, r, h, c, { seg = 12 } = {}) { const x = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m(c)); x.position.copy(B(...at)); return add(x); },
    tor(at, r, t, c, { axis = 'y' } = {}) { const x = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 16), m(c)); x.position.copy(B(...at)); if (axis === 'z') x.rotation.x = Math.PI / 2; return add(x); },
    // a painted face (plane) facing -y (face 'y'), up (face 'z') or -x (face 'x'); no ink, takes the light
    card(at, w, h, map, { face = 'y', lit = true } = {}) {
      const mat = lit ? new THREE.MeshStandardMaterial({ map, roughness: 0.85 }) : new THREE.MeshBasicMaterial({ map });
      const x = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); x.position.copy(B(...at));
      if (face === 'z') x.rotation.x = -Math.PI / 2; if (face === 'x') x.rotation.y = -Math.PI / 2; if (face === '-y') x.rotation.y = Math.PI;
      x.receiveShadow = true; x.userData.noPrepass = true; g.add(x); return x; },
  };
}

// ---------------------------------------------------------------- the pieces (origin bottom centre, front to -y)
export const PIECES = {
  bench(p, { c = 'wood', len = 1.8 } = {}) { const h = len / 2;
    for (const x of [-h + 0.12, h - 0.12]) { p.box([x - 0.03, -0.22, 0], [x + 0.03, 0.22, 0.44], 'iron'); p.box([x - 0.03, 0.16, 0.44], [x + 0.03, 0.22, 0.88], 'iron'); }
    for (const y of [-0.16, 0, 0.16]) p.box([-h, y - 0.06, 0.44], [h, y + 0.06, 0.48], c);
    for (const z of [0.62, 0.80]) p.box([-h, 0.18, z - 0.06], [h, 0.24, z + 0.06], c); },
  bin(p, { c = 'green' } = {}) { p.cyl([0, 0, 0.45], 0.26, 0.9, c, { r2: 0.28 }); p.cyl([0, 0, 0.93], 0.30, 0.06, 'greyD'); p.sph([0.05, 0.05, 0.98], 0.13, 'black', { sz: 0.6 }); p.box([-0.12, -0.29, 0.5], [0.12, -0.27, 0.62], 'white'); },
  pot(p, { c = 'terracotta', plant = 'leaf', s = 1 } = {}) { p.cyl([0, 0, 0.22 * s], 0.18 * s, 0.44 * s, c, { r2: 0.24 * s }); p.sph([0, 0, 0.62 * s], 0.28 * s, plant); p.sph([0.14 * s, -0.08 * s, 0.78 * s], 0.18 * s, 'leafD'); p.sph([-0.12 * s, 0.05 * s, 0.82 * s], 0.16 * s, plant); },
  planter(p, { w = 1.6, flowers = 'pink' } = {}) { p.box([-w / 2, -0.3, 0], [w / 2, 0.3, 0.42], 'woodD'); p.box([-w / 2 + 0.05, -0.25, 0.42], [w / 2 - 0.05, 0.25, 0.44], 'soil', { ink: false });
    for (let i = 0; i < 5; i++) { const x = -w / 2 + 0.2 + i * (w - 0.4) / 4; p.sph([x, 0, 0.58], 0.2, i % 2 ? 'leaf' : 'leafD'); p.sph([x + 0.05, -0.12, 0.72], 0.07, i % 2 ? flowers : 'yellow'); } },
  bush(p, { s = 1 } = {}) { p.sph([0, 0, 0.45 * s], 0.55 * s, 'leafD', { sz: 0.8 }); p.sph([0.4 * s, -0.1, 0.4 * s], 0.4 * s, 'leaf', { sz: 0.85 }); p.sph([-0.38 * s, -0.05, 0.38 * s], 0.38 * s, 'leaf'); },
  tree(p, { s = 1 } = {}) { p.cyl([0, 0, 1.1 * s], 0.13 * s, 2.2 * s, 'woodD', { r2: 0.09 * s });
    p.sph([0, 0, 2.8 * s], 1.0 * s, 'leaf'); p.sph([-0.6 * s, -0.2, 2.35 * s], 0.68 * s, 'leafD'); p.sph([0.62 * s, -0.1, 2.45 * s], 0.7 * s, 'leaf'); p.sph([0.1 * s, -0.4, 3.3 * s], 0.55 * s, [0.34, 0.66, 0.24]); },
  pine(p, { s = 1 } = {}) { p.cyl([0, 0, 0.4 * s], 0.1 * s, 0.8 * s, 'woodD'); for (let i = 0; i < 3; i++) p.cone([0, 0, (1.1 + i * 0.7) * s], (0.9 - i * 0.22) * s, 1.1 * s, i % 2 ? 'leafD' : [0.12, 0.38, 0.18]); },
  palm(p, { s = 1, lean = 0.4 } = {}) { for (let i = 0; i < 6; i++) p.cyl([lean * s * i / 6, 0, (0.3 + i * 0.5) * s], 0.11 * s, 0.52 * s, i % 2 ? 'woodD' : 'wood', { r2: 0.09 * s });
    const tx = lean * s, tz = 3.1 * s; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; p.sph([tx + Math.cos(a) * 0.7 * s, Math.sin(a) * 0.7 * s, tz - 0.15 * s], 0.55 * s, k % 2 ? 'leaf' : 'leafD', { sz: 0.25 }); }
    p.sph([tx, 0, tz], 0.18 * s, 'woodD'); },
  lamp(p, { h = 3.6, c = 'iron' } = {}) { p.cyl([0, 0, 0.15], 0.12, 0.3, c, { r2: 0.09 }); p.cyl([0, 0, h / 2], 0.05, h, c); p.cyl([0, 0, h + 0.12], 0.14, 0.26, [1.0, 0.95, 0.78], { r2: 0.2 }); p.cone([0, 0, h + 0.32], 0.22, 0.16, c); },
  bollard(p, { c = 'greyD' } = {}) { p.cyl([0, 0, 0.45], 0.1, 0.9, c); p.sph([0, 0, 0.9], 0.1, c); p.cyl([0, 0, 0.75], 0.105, 0.06, 'yellow'); },
  cone(p) { p.box([-0.2, -0.2, 0], [0.2, 0.2, 0.04], 'orange'); p.cone([0, 0, 0.36], 0.15, 0.66, 'orange'); p.cyl([0, 0, 0.36], 0.105, 0.1, 'white', { r2: 0.085 }); },
  crate(p, { s = 0.6, c = 'woodL' } = {}) { p.box([-s / 2, -s / 2, 0], [s / 2, s / 2, s], c); for (const z of [0.04, s - 0.04]) p.box([-s / 2 - 0.01, -s / 2 - 0.01, z - 0.04], [s / 2 + 0.01, -s / 2 + 0.02, z + 0.04], 'wood'); p.box([-s * 0.05, -s / 2 - 0.012, 0], [s * 0.05, -s / 2 + 0.01, s], 'wood'); },
  crates(p, { c = 'woodL' } = {}) { PIECES.crate(p, { s: 0.7, c }); p.box([0.38, -0.3, 0], [0.98, 0.3, 0.6], c); p.box([0.05, -0.25, 0.7], [0.55, 0.25, 1.2], 'wood'); p.box([0.4, -0.32, 0.25], [0.96, -0.31, 0.35], 'woodD'); },
  barrel(p, { c = 'red' } = {}) { p.cyl([0, 0, 0.45], 0.3, 0.9, c, { seg: 16 }); for (const z of [0.12, 0.45, 0.78]) p.cyl([0, 0, z], 0.31, 0.05, 'greyD', { seg: 16 }); },
  pallet(p) { for (const y of [-0.45, 0, 0.45]) p.box([-0.6, y - 0.06, 0], [0.6, y + 0.06, 0.1], 'woodL'); for (const x of [-0.55, -0.2, 0.2, 0.55]) p.box([x - 0.08, -0.5, 0.1], [x + 0.08, 0.5, 0.13], 'wood'); },
  sack(p, { c = [0.86, 0.78, 0.60] } = {}) { p.sph([0, 0, 0.28], 0.3, c, { sz: 0.95 }); p.cyl([0, 0, 0.58], 0.08, 0.12, c, { r2: 0.05 }); },
  hydrant(p) { p.cyl([0, 0, 0.04], 0.17, 0.08, 'red'); p.cyl([0, 0, 0.34], 0.13, 0.56, 'red'); p.sph([0, 0, 0.66], 0.12, 'red', { sz: 0.8 }); p.cyl([0, 0, 0.44], 0.05, 0.4, 'red', { axis: 'x' }); p.cyl([0, -0.13, 0.42], 0.06, 0.1, 'yellow', { axis: 'y' }); },
  mailbox(p) { for (const x of [-0.15, 0.15]) p.box([x - 0.03, -0.03, 0], [x + 0.03, 0.03, 0.4], 'black'); p.box([-0.22, -0.24, 0.4], [0.22, 0.24, 1.0], 'blue'); p.cyl([0, 0, 1.0], 0.22, 0.48, 'blue', { axis: 'y', seg: 16 }); p.box([-0.12, -0.25, 0.88], [0.12, -0.24, 0.93], 'black'); },
  newsbox(p, { c = 'yellow' } = {}) { p.box([-0.25, -0.22, 0.25], [0.25, 0.22, 1.05], c); p.box([-0.2, -0.23, 0.6], [0.2, -0.22, 0.95], 'glass'); p.box([-0.2, -0.235, 0.66], [0.2, -0.228, 0.86], 'paper'); for (const x of [-0.2, 0.2]) p.box([x - 0.03, -0.1, 0], [x + 0.03, 0.1, 0.25], 'greyD'); },
  phonebooth(p) { p.box([-0.5, -0.5, 0], [0.5, 0.5, 0.1], 'greyD'); for (const [x, y] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]]) p.box([x - 0.04, y - 0.04, 0.1], [x + 0.04, y + 0.04, 2.3], 'red');
    p.box([-0.5, 0.42, 0.1], [0.5, 0.5, 2.3], 'red'); p.box([-0.52, -0.52, 2.3], [0.52, 0.52, 2.45], 'red'); p.box([-0.44, -0.47, 0.9], [0.44, -0.45, 2.1], 'glass', { ink: false }); p.box([-0.15, 0.3, 1.2], [0.15, 0.42, 1.6], 'black'); },
  busstop(p) { for (const x of [-1.3, 1.3]) p.box([x - 0.04, 0.3, 0], [x + 0.04, 0.38, 2.3], 'steel'); p.box([-1.45, -0.3, 2.3], [1.45, 0.45, 2.38], 'steel'); p.box([-1.3, 0.34, 0.3], [1.3, 0.36, 2.2], 'glass', { ink: false });
    p.box([-0.9, 0.05, 0.45], [0.9, 0.3, 0.5], 'woodL'); p.box([1.32, 0.2, 0.2], [1.36, 0.6, 2.0], 'paper'); p.cyl([-1.7, -0.1, 1.3], 0.03, 2.6, 'steel'); p.cyl([-1.7, -0.1, 2.5], 0.22, 0.04, 'red', { axis: 'y', seg: 18 }); },
  kiosk(p, { c = 'pink' } = {}) { p.box([-0.7, -0.4, 0.15], [0.7, 0.4, 1.05], c); p.box([-0.72, -0.42, 1.05], [0.72, 0.42, 1.12], 'white'); for (const x of [-0.5, 0.5]) p.cyl([x, -0.42, 0.18], 0.18, 0.06, 'black', { axis: 'y', seg: 14 });
    p.cyl([0, 0, 1.9], 0.03, 1.6, 'white'); p.cone([0, 0, 2.7], 1.1, 0.5, c, { seg: 10 }); p.cyl([0, 0, 2.44], 1.1, 0.04, 'white', { seg: 10 });
    for (let i = 0; i < 3; i++) { p.cone([-0.3 + i * 0.3, -0.1, 1.2], 0.05, 0.14, 'woodL'); p.sph([-0.3 + i * 0.3, -0.1, 1.32], 0.07, ['pink', 'mint', 'cream'][i]); } },
  cafetable(p, { c = 'red' } = {}) { p.cyl([0, 0, 0.36], 0.04, 0.72, 'iron'); p.cyl([0, 0, 0.73], 0.35, 0.03, 'white'); p.cyl([0, 0, 0.02], 0.2, 0.04, 'iron');
    for (const a of [0.4, 3.5]) { const x = Math.cos(a) * 0.6, y = Math.sin(a) * 0.6; p.box([x - 0.18, y - 0.18, 0.42], [x + 0.18, y + 0.18, 0.46], 'iron'); p.box([x - 0.18, y + 0.14, 0.46], [x + 0.18, y + 0.18, 0.86], 'iron'); }
    p.cyl([0, 0, 1.5], 0.025, 1.6, 'white'); p.cone([0, 0, 2.35], 1.0, 0.35, c, { seg: 8 }); p.cyl([0.12, 0.05, 0.79], 0.04, 0.1, 'white'); },
  picnic(p) { p.box([-0.9, -0.35, 0.72], [0.9, 0.35, 0.77], 'woodL'); for (const y of [-0.62, 0.62]) p.box([-0.9, y - 0.14, 0.42], [0.9, y + 0.14, 0.46], 'woodL');
    for (const x of [-0.7, 0.7]) { p.box([x - 0.04, -0.75, 0], [x + 0.04, 0.75, 0.05], 'wood'); p.box([x - 0.04, -0.05, 0], [x + 0.04, 0.05, 0.72], 'wood'); } p.box([-0.2, -0.1, 0.77], [0.2, 0.15, 0.79], [0.9, 0.3, 0.3]); p.cyl([0.4, 0, 0.84], 0.05, 0.14, 'yellow'); },
  fountain(p) { p.cyl([0, 0, 0.45], 0.16, 0.9, 'stone', { r2: 0.12 }); p.cyl([0, 0, 0.95], 0.28, 0.12, 'stone', { r2: 0.3 }); p.cyl([0.08, 0, 1.05], 0.03, 0.12, 'steel'); },
  flowerbed(p, { w = 2.4, c = 'pink', seed = 3 } = {}) { const r = lcg(seed); p.box([-w / 2, -0.45, 0], [w / 2, 0.45, 0.12], 'soil', { ink: false });
    for (let i = 0; i < 12; i++) { const x = -w / 2 + 0.15 + r() * (w - 0.3), y = -0.35 + r() * 0.7; p.cyl([x, y, 0.2], 0.012, 0.25, 'green', { seg: 4, ink: false }); p.sph([x, y, 0.34], 0.07, [c, 'yellow', 'white', 'red'][i % 4], { seg: 8 }); } },
  fence(p, { w = 3, c = 'white' } = {}) { for (let x = -w / 2; x <= w / 2 + 1e-6; x += 0.25) { p.box([x - 0.04, -0.02, 0], [x + 0.04, 0.02, 0.8], c); p.cone([x, 0, 0.84], 0.05, 0.08, c, { seg: 4 }); }
    for (const z of [0.25, 0.6]) p.box([-w / 2, 0.02, z - 0.03], [w / 2, 0.05, z + 0.03], c); },
  hedge(p, { w = 3, h = 1.1 } = {}) { p.box([-w / 2, -0.35, 0], [w / 2, 0.35, h], 'leafD'); for (let x = -w / 2 + 0.3; x < w / 2; x += 0.6) p.sph([x, -0.1, h], 0.32, 'leaf', { sz: 0.6 }); },
  bikerack(p) { for (let i = 0; i < 4; i++) p.tor([-0.6 + i * 0.4, 0, 0.36], 0.32, 0.025, 'steel'); },
  bike(p, { c = 'blue' } = {}) { for (const x of [-0.5, 0.5]) { p.tor([x, 0, 0.34], 0.32, 0.03, 'black'); p.cyl([x, 0, 0.34], 0.03, 0.06, 'steel', { axis: 'y', seg: 8 }); }
    p.cyl([0, 0, 0.55], 0.03, 1.0, c, { axis: 'x' }); p.box([-0.52, -0.02, 0.34], [-0.48, 0.02, 0.85], c); p.box([0.48, -0.02, 0.34], [0.52, 0.02, 0.95], c); p.box([-0.62, -0.08, 0.85], [-0.38, 0.08, 0.9], 'black'); p.box([0.48, -0.25, 0.95], [0.52, 0.25, 0.98], 'black'); },
  birds(p, { n = 4, seed = 2 } = {}) { const r = lcg(seed); for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 3, z = r() * 1.2, s = 0.12 + r() * 0.08;
    for (const d of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(s, 0.015, 0.03), m('black')); w.position.copy(B(x + d * s * 0.45, 0, z + s * 0.18)); w.rotation.z = d * 0.45; w.castShadow = false; w.userData.noInk = true; p._g.add(w); } } },
  awning(p, { w = 3, c = 'red' } = {}) { const n = Math.round(w / 0.35); for (let i = 0; i < n; i++) { const x0 = -w / 2 + i * w / n; const s = p.box([x0, -1.0, 2.5], [x0 + w / n, 0, 2.56], i % 2 ? c : 'white'); s.rotation.x = 0; }
    p.box([-w / 2, -1.02, 2.3], [w / 2, -0.98, 2.56], c); for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) p.box([x - 0.02, -1.0, 2.3], [x + 0.02, 0, 2.34], 'iron'); },
  acunit(p) { p.box([-0.4, -0.3, 0], [0.4, 0.3, 0.6], 'steel'); p.cyl([0, -0.31, 0.3], 0.22, 0.02, 'greyD', { axis: 'y', seg: 18 }); for (let i = 0; i < 4; i++) p.box([-0.2, -0.32, 0.14 + i * 0.1], [0.2, -0.315, 0.16 + i * 0.1], 'black'); },
  pipe(p, { h = 3 } = {}) { p.cyl([0, 0, h / 2], 0.05, h, 'steel'); for (const z of [0.3, h / 2, h - 0.3]) p.box([-0.07, -0.02, z - 0.03], [0.07, 0.06, z + 0.03], 'greyD'); },
  shelf(p, { w = 1.4, h = 2.0, seed = 4, items = 'books' } = {}) { const r = lcg(seed); p.box([-w / 2, 0, 0], [w / 2, 0.36, 0.05], 'woodD');
    for (const x of [-w / 2, w / 2 - 0.04]) p.box([x, 0, 0], [x + 0.04, 0.36, h], 'woodD'); p.box([-w / 2, 0.32, 0], [w / 2, 0.36, h], 'wood');
    const rows = Math.floor(h / 0.48); for (let k = 1; k <= rows; k++) { const z = k * h / (rows + 0.2); p.box([-w / 2, 0, z - 0.03], [w / 2, 0.34, z], 'woodD');
      let x = -w / 2 + 0.06; const zb = (k - 1) * h / (rows + 0.2) + 0.05;
      while (x < w / 2 - 0.12) { const bw = 0.05 + r() * 0.07, bh = 0.22 + r() * 0.16, col = [C.red, C.blue, C.yellow, C.green, C.cream, C.purple, C.orange][Math.floor(r() * 7)];
        if (items === 'jars') { p.cyl([x + 0.06, 0.15, zb + 0.1], 0.06, 0.2, C.glass, { seg: 10 }); p.cyl([x + 0.06, 0.15, zb + 0.07], 0.055, 0.12, col, { seg: 10, ink: false }); x += 0.17; }
        else if (items === 'cans') { p.cyl([x + 0.07, 0.15, zb + 0.09], 0.07, 0.18, col, { seg: 10 }); x += 0.17; }
        else { p.box([x, 0.04, zb], [x + bw, 0.3, zb + bh], col); x += bw + 0.01; } } } },
  table(p, { w = 1.4, d = 0.8, h = 0.76, c = 'woodL' } = {}) { p.box([-w / 2, -d / 2, h - 0.05], [w / 2, d / 2, h], c); for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.box([x * (w / 2 - 0.08) - 0.03, y * (d / 2 - 0.08) - 0.03, 0], [x * (w / 2 - 0.08) + 0.03, y * (d / 2 - 0.08) + 0.03, h - 0.05], 'woodD'); },
  chair(p, { c = 'red' } = {}) { p.box([-0.22, -0.22, 0.44], [0.22, 0.22, 0.48], c); p.box([-0.22, 0.18, 0.48], [0.22, 0.22, 0.92], c); for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.box([x * 0.19 - 0.02, y * 0.19 - 0.02, 0], [x * 0.19 + 0.02, y * 0.19 + 0.02, 0.44], 'steel'); },
  stool(p, { c = 'red' } = {}) { p.cyl([0, 0, 0.36], 0.04, 0.72, 'steel'); p.cyl([0, 0, 0.74], 0.2, 0.08, c); p.cyl([0, 0, 0.03], 0.2, 0.06, 'steel'); p.tor([0, 0, 0.3], 0.14, 0.015, 'steel', { axis: 'z' }); },
  desk(p, { c = 'woodL', seed = 1 } = {}) { const r = lcg(seed); PIECES.table(p, { w: 1.1, d: 0.6, h: 0.74, c }); p.box([-0.5, -0.25, 0.5], [0.5, 0.28, 0.53], 'steel');
    p.box([-0.35, -0.1, 0.74], [-0.05, 0.12, 0.76], 'paper'); p.box([0.1, -0.05, 0.74], [0.35, 0.15, 0.8], ['red', 'blue', 'green'][Math.floor(r() * 3)]); p.cyl([0.4, -0.15, 0.79], 0.012, 0.1, 'yellow', { axis: 'x', seg: 6 });
    p._sub('chair', [0, -0.55, 0], 0, { c: 'blue' }); },
  lockers(p, { n = 4, c = 'teal' } = {}) { for (let i = 0; i < n; i++) { const x0 = -n * 0.2 + i * 0.4; p.box([x0, 0, 0], [x0 + 0.39, 0.45, 1.9], c); p.box([x0 + 0.08, -0.01, 1.55], [x0 + 0.3, 0, 1.7], 'greyD'); p.box([x0 + 0.3, -0.03, 0.95], [x0 + 0.33, 0, 1.1], 'steel'); } },
  clock(p, { r = 0.25 } = {}) { p.cyl([0, 0, 0], r, 0.05, 'white', { axis: 'y', seg: 24 }); p.tor([0, -0.02, 0], r, 0.025, 'black'); p.box([-0.01, -0.04, 0], [0.01, -0.035, r * 0.7], 'black'); p.box([0, -0.045, -0.01], [r * 0.5, -0.04, 0.01], 'black'); },
  extinguisher(p) { p.cyl([0, 0, 0.3], 0.09, 0.5, 'red'); p.sph([0, 0, 0.55], 0.09, 'red'); p.box([-0.02, -0.02, 0.6], [0.02, 0.02, 0.68], 'black'); p.box([0, -0.1, 0.64], [0.12, -0.07, 0.66], 'black'); },
  noticeboard(p, { w = 1.2, h = 0.8, seed = 5 } = {}) { const r = lcg(seed); p.box([-w / 2, 0, 0], [w / 2, 0.04, h], [0.70, 0.50, 0.30]); p.box([-w / 2 - 0.03, -0.01, -0.03], [w / 2 + 0.03, 0.05, 0.02], 'woodD');
    for (let i = 0; i < 7; i++) { const x = -w / 2 + 0.1 + r() * (w - 0.35), z = 0.08 + r() * (h - 0.3), pw = 0.14 + r() * 0.12; p.box([x, -0.012, z], [x + pw, -0.005, z + pw * 1.3], [C.paper, C.yellow, C.pink, C.mint, C.white][i % 5], { ink: false }); p.sph([x + pw / 2, -0.02, z + pw * 1.25], 0.012, 'red', { ink: false, seg: 6 }); } },
  vending(p, { c = 'red' } = {}) { p.box([-0.45, -0.4, 0], [0.45, 0.4, 1.9], c); p.box([-0.38, -0.41, 0.6], [0.2, -0.4, 1.8], 'glass');
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) p.cyl([-0.32 + i * 0.13, -0.3, 0.7 + k * 0.28], 0.04, 0.16, [C.yellow, C.blue, C.green, C.orange][(i + k) % 4], { seg: 8 }); p.box([0.25, -0.41, 1.2], [0.4, -0.4, 1.6], 'greyD'); p.box([-0.35, -0.41, 0.2], [0.2, -0.4, 0.4], 'black'); },
  rug(p, { w = 2.4, d = 1.6, c = 'red' } = {}) { p.box([-w / 2, -d / 2, 0], [w / 2, d / 2, 0.012], c, { ink: false }); p.box([-w / 2 + 0.15, -d / 2 + 0.15, 0.012], [w / 2 - 0.15, d / 2 - 0.15, 0.016], 'cream', { ink: false }); },
  speaker(p, { s = 1, c = 'black' } = {}) { p.box([-0.35 * s, -0.3 * s, 0], [0.35 * s, 0.3 * s, 1.0 * s], c); for (const [z, r] of [[0.32, 0.22], [0.75, 0.12]]) { p.cyl([0, -0.3 * s, z * s], r * s, 0.03, 'greyD', { axis: 'y', seg: 18 }); p.cyl([0, -0.31 * s, z * s], r * s * 0.35, 0.03, 'steel', { axis: 'y', seg: 12 }); } },
  amp(p) { p.box([-0.4, -0.25, 0], [0.4, 0.25, 0.6], 'black'); p.box([-0.38, -0.26, 0.46], [0.38, -0.25, 0.56], 'brass'); for (let i = 0; i < 6; i++) p.cyl([-0.3 + i * 0.12, -0.27, 0.51], 0.02, 0.02, 'white', { axis: 'y', seg: 8 }); p.box([-0.35, -0.26, 0.05], [0.35, -0.255, 0.42], 'greyD'); },
  micstand(p) { p.cyl([0, 0, 0.02], 0.2, 0.04, 'black'); p.cyl([0, 0, 0.75], 0.015, 1.5, 'steel'); p.sph([0, -0.06, 1.52], 0.05, 'greyD', { sz: 1.4 }); },
  barrier(p, { w = 2 } = {}) { for (const x of [-w / 2, w / 2]) p.box([x - 0.02, -0.25, 0], [x + 0.02, 0.25, 0.04], 'steel'); p.box([-w / 2, -0.02, 0.05], [w / 2, 0.02, 0.07], 'steel'); p.box([-w / 2, -0.02, 1.0], [w / 2, 0.02, 1.04], 'steel');
    for (let x = -w / 2; x <= w / 2 + 1e-6; x += 0.2) p.box([x - 0.01, -0.01, 0.05], [x + 0.01, 0.01, 1.02], 'steel'); },
  truss(p, { w = 8, h = 5 } = {}) { for (const x of [-w / 2, w / 2]) p.box([x - 0.15, -0.15, 0], [x + 0.15, 0.15, h], 'greyD'); p.box([-w / 2, -0.15, h - 0.3], [w / 2, 0.15, h], 'greyD');
    for (let x = -w / 2 + 0.8; x < w / 2; x += 1.2) { p.cyl([x, -0.25, h - 0.45], 0.14, 0.3, 'black', { seg: 10 }); p.cyl([x, -0.38, h - 0.45], 0.11, 0.02, [1.0, 0.9, 0.5], { axis: 'y', seg: 10 }); } },
  stage(p, { w = 8, d = 3, c = 'black' } = {}) { p.box([-w / 2, -d / 2, 0], [w / 2, d / 2, 0.8], c); p.box([-w / 2, -d / 2 - 0.02, 0.6], [w / 2, -d / 2, 0.8], 'red'); },
  bunting(p, { w = 6, seed = 1 } = {}) { const n = Math.round(w / 0.3); p.box([-w / 2, -0.005, -0.005], [w / 2, 0.005, 0.005], 'black', { ink: false });
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n, sag = 0.4 * (1 - Math.pow((x / (w / 2)), 2)); const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 3), m([C.red, C.yellow, C.blue, C.green, C.pink][i % 5]));
      t.rotation.x = Math.PI; t.position.copy(B(x, 0, -sag - 0.11)); p._g.add(t); t.castShadow = false; } },
  // lab bits
  burner(p) { p.cyl([0, 0, 0.02], 0.06, 0.04, 'greyD'); p.cyl([0, 0, 0.1], 0.02, 0.16, 'steel'); p.cone([0, 0, 0.22], 0.025, 0.08, [0.4, 0.7, 1.0], { seg: 8 }); },
  flasks(p, { seed = 2 } = {}) { const r = lcg(seed); for (let i = 0; i < 4; i++) { const x = -0.3 + i * 0.2, col = [C.green, C.pink, C.blue, C.yellow][Math.floor(r() * 4)];
    if (i % 2) { p.cyl([x, 0, 0.08], 0.07, 0.16, 'glass', { r2: 0.03, seg: 10 }); p.cyl([x, 0, 0.05], 0.06, 0.08, col, { r2: 0.045, seg: 10 }); p.cyl([x, 0, 0.2], 0.025, 0.08, 'glass', { seg: 8 }); }
    else { p.cyl([x, 0, 0.12], 0.035, 0.24, 'glass', { seg: 10 }); p.cyl([x, 0, 0.07], 0.032, 0.12, col, { seg: 10 }); } } p.box([-0.4, -0.08, 0], [0.4, 0.08, 0.02], 'steel'); },
  microscope(p) { p.box([-0.1, -0.12, 0], [0.1, 0.12, 0.03], 'greyD'); p.box([-0.02, 0.05, 0.03], [0.02, 0.09, 0.3], 'greyD'); p.cyl([0, 0.02, 0.32], 0.035, 0.18, 'white', { axis: 'y', seg: 10 }); p.box([-0.07, -0.08, 0.12], [0.07, 0.04, 0.14], 'black'); },
  sink(p) { p.box([-0.45, -0.3, 0], [0.45, 0.3, 0.88], 'white'); p.box([-0.35, -0.2, 0.86], [0.35, 0.2, 0.9], 'steel', { ink: false }); p.cyl([0, 0.22, 1.05], 0.02, 0.3, 'steel'); p.cyl([0, 0.12, 1.2], 0.02, 0.22, 'steel', { axis: 'y', seg: 8 }); p.box([-0.43, -0.31, 0.1], [0.43, -0.3, 0.75], 'greyD'); },
  globe(p) { p.cyl([0, 0, 0.02], 0.12, 0.04, 'woodD'); p.cyl([0, 0, 0.15], 0.015, 0.26, 'brass'); p.sph([0, 0, 0.42], 0.2, 'blue', { seg: 16 }); p.sph([0.06, -0.08, 0.48], 0.1, 'green', { sz: 0.6, seg: 10 }); p.tor([0, 0, 0.42], 0.22, 0.012, 'brass'); },
  skeleton(p) { p.cyl([0, 0, 0.02], 0.2, 0.04, 'greyD'); p.cyl([0, 0, 0.8], 0.015, 1.6, 'steel'); p.sph([0, -0.02, 1.62], 0.12, 'white', { sz: 1.15 }); p.cyl([0, -0.02, 1.25], 0.03, 0.5, 'white');
    for (let i = 0; i < 4; i++) p.box([-0.14, -0.04, 1.1 + i * 0.08], [0.14, 0.0, 1.12 + i * 0.08], 'white'); for (const x of [-0.18, 0.18]) p.cyl([x, -0.02, 1.05], 0.02, 0.6, 'white'); for (const x of [-0.08, 0.08]) p.cyl([x, -0.02, 0.6], 0.025, 0.8, 'white'); },
  // workshop bits
  toolboard(p, { w = 1.6 } = {}) { p.box([-w / 2, 0, 0], [w / 2, 0.03, 1.0], [0.78, 0.62, 0.42]); for (let i = 0; i < 6; i++) { const x = -w / 2 + 0.2 + i * (w - 0.4) / 5; p.box([x - 0.015, -0.02, 0.25], [x + 0.015, 0, 0.75], 'greyD'); p.box([x - 0.06, -0.025, 0.7], [x + 0.06, -0.005, 0.8], [C.red, C.yellow, C.blue][i % 3]); } },
  toolbox(p, { c = 'red' } = {}) { p.box([-0.3, -0.15, 0], [0.3, 0.15, 0.25], c); p.box([-0.12, -0.02, 0.25], [0.12, 0.02, 0.32], 'black'); p.box([-0.31, -0.16, 0.18], [0.31, 0.16, 0.2], 'greyD'); },
  ladder(p, { h = 2.4 } = {}) { for (const x of [-0.22, 0.22]) p.box([x - 0.03, -0.03, 0], [x + 0.03, 0.03, h], 'yellow'); for (let z = 0.3; z < h; z += 0.3) p.box([-0.22, -0.02, z - 0.02], [0.22, 0.02, z + 0.02], 'yellow'); },
  wheelbarrow(p) { p.box([-0.35, -0.3, 0.35], [0.35, 0.3, 0.6], 'green'); p.cyl([0.5, 0, 0.18], 0.18, 0.08, 'black', { axis: 'y', seg: 14 }); for (const y of [-0.22, 0.22]) p.box([-0.9, y - 0.02, 0.4], [0.5, y + 0.02, 0.44], 'woodD'); },
  tyres(p) { for (let i = 0; i < 3; i++) p.tor([0, 0, 0.12 + i * 0.22], 0.3, 0.11, 'black', { axis: 'z' }); },
  // seaside bits
  rock(p, { s = 1, c = 'stone' } = {}) { p.sph([0, 0, 0.25 * s], 0.5 * s, c, { sz: 0.6, seg: 8 }); p.sph([0.35 * s, 0.1, 0.18 * s], 0.32 * s, [0.55, 0.53, 0.5], { sz: 0.7, seg: 7 }); },
  boat(p, { c = 'red', s = 1 } = {}) { p.box([-1.2 * s, -0.4 * s, 0], [1.2 * s, 0.4 * s, 0.45 * s], c); p.box([-1.2 * s, -0.42 * s, 0.38 * s], [1.2 * s, 0.42 * s, 0.48 * s], 'white'); p.cone([1.55 * s, 0, 0.24 * s], 0.4 * s, 0.7 * s, c, { seg: 4 }).rotation.z = -Math.PI / 2;
    p.cyl([-0.1 * s, 0, 1.3 * s], 0.03 * s, 1.8 * s, 'woodD'); const sail = p.box([-0.05 * s, -0.01, 0.6 * s], [0.0, 0.01, 2.1 * s], 'white'); sail.scale.x = 18; sail.position.x += 0.45 * s; },
  buoy(p, { c = 'red' } = {}) { p.cyl([0, 0, 0.2], 0.3, 0.4, c, { r2: 0.2 }); p.cyl([0, 0, 0.6], 0.06, 0.5, c); p.sph([0, 0, 0.9], 0.1, 'yellow', { glowy: 0 }); p.cyl([0, 0, 0.3], 0.31, 0.08, 'white'); },
  hut(p, { c = 'woodL' } = {}) { p.box([-0.9, -0.8, 0], [0.9, 0.8, 1.6], c); p.box([-0.25, -0.81, 0], [0.25, -0.8, 1.1], 'woodD'); p.box([0.4, -0.81, 0.8], [0.7, -0.8, 1.1], 'glass'); const roof = p.cone([0, 0, 2.05], 1.45, 0.9, [0.78, 0.66, 0.38], { seg: 4 }); roof.rotation.y = Math.PI / 4; },
  dock(p, { len = 6 } = {}) { p.box([-0.8, -len, 0.4], [0.8, 0, 0.5], 'woodL'); for (let y = -len; y <= 0; y += 1.5) for (const x of [-0.75, 0.75]) p.cyl([x, y, 0.2], 0.08, 0.8, 'woodD'); },
  lighthouse(p) { p.cyl([0, 0, 2.0], 0.6, 4.0, 'white', { r2: 0.42 }); for (const z of [0.8, 2.2]) p.cyl([0, 0, z], 0.58 - z * 0.04, 0.5, 'red', { r2: 0.56 - z * 0.04 }); p.cyl([0, 0, 4.3], 0.35, 0.6, 'yellow', { glowy: 0.3 }); p.cone([0, 0, 4.85], 0.45, 0.5, 'red'); },
  gull(p) { PIECES.birds(p, { n: 1 }); },
  islet(p, { s = 1 } = {}) { p.cyl([0, 0, 0.1 * s], 2.0 * s, 0.2 * s, 'sand', { r2: 1.7 * s, seg: 18 }); p.sph([0, 0, 0.2 * s], 1.3 * s, 'leaf', { sz: 0.35, seg: 12 }); },
  smokestack(p) { p.cyl([0, 0, 2.5], 0.4, 5, 'terracotta', { r2: 0.32 }); p.cyl([0, 0, 4.6], 0.34, 0.3, 'white'); },
  sign(p, { text = 'SIGN', w = 0.9, h = 0.45, bg, fg, pole = 1.6, sub = null, legs = 1 } = {}) {
    if (legs === 2) for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) p.box([x - 0.03, -0.02, 0], [x + 0.03, 0.02, pole], 'greyD');
    else if (pole > 0) p.cyl([0, 0.03, pole / 2], 0.035, pole, 'greyD');
    p.box([-w / 2 - 0.03, 0, pole - 0.03], [w / 2 + 0.03, 0.03, pole + h + 0.03], 'greyD');
    p.card([0, -0.002, pole + h / 2], w, h, signTex(text, { bg, fg, sub, w: 512, h: Math.max(64, Math.round(512 * h / w)) })); },
  aboard(p, { text = 'OPEN', bg = [0.10, 0.16, 0.14], fg = [0.98, 0.98, 0.95] } = {}) { const b = p.box([-0.3, -0.03, 0], [0.3, 0.03, 0.95], 'woodD'); b.rotation.x = 0.18; b.position.z -= 0.08;
    const c = p.card([0, -0.08, 0.5], 0.5, 0.75, signTex(text, { bg, fg, w: 256, h: 384, border: null })); c.rotation.x = 0.18; p.box([-0.3, 0.1, 0], [0.3, 0.14, 0.9], 'woodD').rotation.x = -0.18; },
  poster(p, { title = 'SHOW', bg, shape, seed, w = 0.6, h = 0.85 } = {}) { p.card([0, 0, h / 2], w, h, posterTex(title, { bg, shape, seed })); },
  frame(p, { w = 0.6, h = 0.45, seed = 1 } = {}) { p.box([-w / 2 - 0.04, 0, -0.04], [w / 2 + 0.04, 0.03, h + 0.04], 'woodD'); p.card([0, -0.002, h / 2], w, h, posterTex('', { bg: [[0.4, 0.7, 0.9], [0.9, 0.7, 0.4], [0.5, 0.8, 0.5]][seed % 3], shape: ['circle', 'star', 'stripes'][seed % 3], seed })); },
  window(p, { w = 1.2, h = 1.4, sky = true } = {}) { p.card([0, 0, h / 2], w, h, signTex('', { bg: [0.55, 0.78, 0.95], border: null, w: 64, h: 64 }));
    for (const x of [-w / 2, 0, w / 2]) p.box([x - 0.04, -0.05, 0], [x + 0.04, 0.0, h], 'white'); for (const z of [0, h / 2, h]) p.box([-w / 2 - 0.04, -0.05, z - 0.04], [w / 2 + 0.04, 0.0, z + 0.04], 'white'); p.box([-w / 2 - 0.1, -0.15, -0.06], [w / 2 + 0.1, 0.0, 0.0], 'white'); },
  ceilinglight(p, { w = 1.4 } = {}) { p.box([-w / 2, -0.15, 0], [w / 2, 0.15, 0.08], 'steel'); p.box([-w / 2 + 0.05, -0.12, -0.01], [w / 2 - 0.05, 0.12, 0.0], [1.0, 0.98, 0.9], { ink: false }); for (const x of [-w / 3, w / 3]) p.box([x - 0.005, -0.005, 0.08], [x + 0.005, 0.005, 0.6], 'greyD'); },
  cashregister(p) { p.box([-0.22, -0.2, 0], [0.22, 0.2, 0.12], 'greyD'); p.box([-0.2, -0.15, 0.12], [0.2, 0.15, 0.25], 'greyD'); p.box([-0.12, 0.02, 0.25], [0.12, 0.1, 0.4], 'black'); p.box([-0.1, 0.015, 0.3], [0.1, 0.02, 0.37], [0.4, 1.0, 0.5], { ink: false }); },
  stanchions(p, { w = 2 } = {}) { for (const x of [-w / 2, 0, w / 2]) { p.cyl([x, 0, 0.02], 0.15, 0.04, 'brass'); p.cyl([x, 0, 0.5], 0.03, 1.0, 'brass'); p.sph([x, 0, 1.0], 0.05, 'brass'); }
    for (const [a, b] of [[-w / 2, 0], [0, w / 2]]) { const r = p.cyl([(a + b) / 2, 0, 0.88], 0.025, (b - a), 'red', { axis: 'x', seg: 8 }); } },
  atm(p) { p.box([-0.4, -0.3, 0], [0.4, 0.3, 1.7], 'greyD'); p.box([-0.3, -0.31, 1.0], [0.3, -0.3, 1.4], [0.3, 0.7, 0.9], { ink: false }); p.box([-0.25, -0.4, 0.85], [0.25, -0.3, 0.95], 'steel'); p.box([-0.2, -0.31, 1.5], [0.2, -0.3, 1.62], 'green'); },
  plantbig(p) { PIECES.pot(p, { c: 'cream', s: 1.6 }); },
  lifering(p) { p.tor([0, -0.05, 0], 0.3, 0.07, 'red'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; p.box([Math.cos(a) * 0.3 - 0.04, -0.13, Math.sin(a) * 0.3 - 0.04], [Math.cos(a) * 0.3 + 0.04, -0.12, Math.sin(a) * 0.3 + 0.04], 'white'); } },
  bollardsea(p) { p.cyl([0, 0, 0.25], 0.16, 0.5, 'black', { r2: 0.13 }); p.cyl([0, 0, 0.52], 0.22, 0.06, 'black'); },
  rope(p) { for (let i = 0; i < 3; i++) p.tor([0, 0, 0.04 + i * 0.05], 0.25 - i * 0.03, 0.03, [0.8, 0.7, 0.45], { axis: 'z' }); },
  // ground clutter in an area w x d: daisies | leaves | pebbles | litter (one piece: "the lawn is lived in")
  scatter(p, { w = 3, d = 2, kind = 'daisies', n = 18, seed = 6 } = {}) { const r = lcg(seed);
    for (let i = 0; i < n; i++) { const x = (r() - 0.5) * w, y = (r() - 0.5) * d;
      if (kind === 'daisies') { p.sph([x, y, 0.03], 0.035, i % 3 ? 'white' : 'yellow', { sz: 0.4, seg: 6, ink: false }); p.sph([x + 0.06, y, 0.06], 0.05, 'leaf', { sz: 1.3, seg: 5, ink: false }); }
      else if (kind === 'leaves') p.box([x - 0.05, y - 0.04, 0.003], [x + 0.05, y + 0.04, 0.01], [C.orange, C.yellow, C.terracotta][i % 3], { ink: false });
      else if (kind === 'pebbles') p.sph([x, y, 0.02], 0.04 + r() * 0.05, [C.stone, C.grey, C.sand][i % 3], { sz: 0.5, seg: 6 });
      else p.box([x - 0.06, y - 0.04, 0.003], [x + 0.06, y + 0.04, 0.01], [C.paper, C.white, C.red][i % 3], { ink: false }); } },
  ball(p, { c = 'red', r = 0.12 } = {}) { p.sph([0, 0, r], r, c, { seg: 14 }); p.tor([0, 0, r], r * 1.01, r * 0.12, 'white', { axis: 'y' }); },
  fruitstand(p) { PIECES.table(p, { w: 1.6, d: 0.8, h: 0.8, c: 'woodL' }); const r = lcg(11);
    for (let i = 0; i < 3; i++) { const x = -0.55 + i * 0.55; p.box([x - 0.24, -0.3, 0.8], [x + 0.24, 0.3, 0.98], 'woodL'); const col = [C.red, C.orange, C.yellow][i];
      for (let k = 0; k < 6; k++) p.sph([x - 0.15 + (k % 3) * 0.15, -0.12 + Math.floor(k / 3) * 0.2, 1.02], 0.07, col, { seg: 8 }); }
    for (const x of [-0.75, 0.75]) p.cyl([x, 0.35, 1.25], 0.02, 1.0, 'woodD'); p.box([-0.85, -0.2, 1.75], [0.85, 0.45, 1.8], 'green');
    p.card([0, -0.21, 1.6], 1.0, 0.25, signTex('FRESH FRUIT', { bg: [0.98, 0.94, 0.80], fg: [0.70, 0.12, 0.08] })); },
  fishtank(p) { p.box([-0.4, -0.18, 0], [0.4, 0.18, 0.04], 'black'); p.box([-0.38, -0.16, 0.04], [0.38, 0.16, 0.42], [0.35, 0.70, 0.90], { ink: true }); p.box([-0.4, -0.18, 0.42], [0.4, 0.18, 0.46], 'black');
    for (const [x, z, c] of [[-0.15, 0.22, 'orange'], [0.12, 0.3, 'yellow'], [0.22, 0.14, 'red']]) p.sph([x, -0.1, z], 0.04, c, { sx: 1, sz: 0.7, seg: 8 }); p.cyl([-0.25, 0, 0.14], 0.02, 0.2, 'leaf', { seg: 5 }); },
  projector(p) { p.box([-0.02, -0.02, 0.3], [0.02, 0.02, 0.9], 'greyD'); p.box([-0.2, -0.25, 0], [0.2, 0.15, 0.3], 'white'); p.cyl([0, -0.27, 0.15], 0.07, 0.06, 'black', { axis: 'y', seg: 12 }); },
  conduit(p, { w = 4 } = {}) { p.cyl([0, -0.05, 0], 0.035, w, 'steel', { axis: 'x' }); for (let x = -w / 2 + 0.6; x < w / 2; x += 1.6) p.box([x - 0.1, -0.1, -0.1], [x + 0.1, 0, 0.1], 'steel'); },
  exitsign(p) { p.box([-0.2, -0.06, 0], [0.2, 0, 0.18], 'white'); p.card([0, -0.062, 0.09], 0.36, 0.14, signTex('EXIT', { bg: [0.1, 0.6, 0.25], fg: [1, 1, 1], border: null, w: 256, h: 100 }), { lit: false }); },
  wallbox(p, { c = 'steel' } = {}) { p.box([-0.15, -0.08, 0], [0.15, 0, 0.25], c); p.box([-0.1, -0.085, 0.08], [0.1, -0.08, 0.18], 'greyD'); p.sph([0.08, -0.09, 0.04], 0.015, 'red', { seg: 6 }); },
  notes(p, { w = 1.0, seed = 3 } = {}) { const r = lcg(seed); for (let i = 0; i < 4; i++) { const x = -w / 2 + i * w / 3.5, z = r() * 0.25; const c = p.box([x, -0.004, z], [x + 0.16, 0, z + 0.2], [C.paper, C.yellow, C.pink, C.white][i], { ink: false }); c.rotation.y = (r() - 0.5) * 0.3; } },
  goggles(p) { p.box([-0.16, -0.1, 0], [0.16, 0.1, 0.1], 'yellow'); for (const x of [-0.07, 0.07]) p.cyl([x, -0.02, 0.13], 0.045, 0.04, [0.6, 0.85, 1.0], { axis: 'y', seg: 10 }); },
  book(p, { c = 'red' } = {}) { p.box([-0.12, -0.09, 0], [0.12, 0.09, 0.03], c); p.box([-0.11, -0.095, 0.004], [0.11, 0.09, 0.026], 'paper', { ink: false }); },
  adcolumn(p, { seed = 2 } = {}) { p.cyl([0, 0, 1.4], 0.42, 2.8, 'greyD', { seg: 18 }); p.cyl([0, 0, 2.9], 0.5, 0.2, 'green', { seg: 18 }); p.cone([0, 0, 3.15], 0.4, 0.3, 'green', { seg: 18 });
    [['JAZZ', 'note', [0.95, 0.80, 0.16]], ['CIRCUS', 'star', [0.86, 0.16, 0.12]], ['SALE', 'stripes', [0.18, 0.42, 0.86]]].forEach(([t, sh, bg], i) => { const a = -Math.PI / 2 + (i - 1) * 0.9;
      const c = p.card([Math.cos(a) * 0.43, Math.sin(a) * 0.43, 1.6], 0.5, 0.75, posterTex(t, { bg, shape: sh, seed: seed + i })); c.rotation.y = -(a + Math.PI / 2); }); },
  flagpole(p, { c = 'blue', h = 6 } = {}) { p.cyl([0, 0, h / 2], 0.05, h, 'steel'); p.sph([0, 0, h], 0.08, 'brass'); p.box([0.05, -0.01, h - 1.0], [1.4, 0.01, h - 0.15], c); p.box([0.05, -0.015, h - 0.7], [1.4, 0.015, h - 0.45], 'white'); },
  cooler(p) { p.box([-0.2, -0.2, 0], [0.2, 0.2, 1.0], 'white'); p.cyl([0, 0, 1.22], 0.17, 0.42, [0.5, 0.78, 0.95], { seg: 14 }); p.box([-0.06, -0.22, 0.7], [0.06, -0.2, 0.78], 'blue'); },
  coatstand(p) { p.cyl([0, 0, 0.02], 0.25, 0.04, 'woodD'); p.cyl([0, 0, 0.9], 0.03, 1.8, 'woodD'); p.sph([0.1, 0, 1.55], 0.16, 'navy', { sz: 2.2, seg: 10 }); p.sph([-0.05, 0.05, 1.82], 0.13, 'red', { sz: 0.5, seg: 10 }); },
  banner(p, { text = 'WELCOME', w = 4, h = 0.9, bg = [0.86, 0.16, 0.12], fg = [1, 1, 1], pole = 3.2 } = {}) { for (const x of [-w / 2 - 0.05, w / 2 + 0.05]) p.cyl([x, 0, (pole + h) / 2], 0.05, pole + h, 'steel');
    p.card([0, -0.02, pole + h / 2], w, h, signTex(text, { bg, fg, w: 1024, h: Math.round(1024 * h / w) })); p.card([0, 0.02, pole + h / 2], w, h, signTex(text, { bg, fg, w: 1024, h: Math.round(1024 * h / w) }), { face: '-y' }); },
  lightrig(p) { p.box([-0.05, -0.05, 0], [0.05, 0.05, 3.2], 'greyD'); p.box([-0.6, -0.08, 3.2], [0.6, 0.08, 3.3], 'greyD');
    for (const x of [-0.45, -0.15, 0.15, 0.45]) { p.cyl([x, -0.12, 3.05], 0.09, 0.22, 'black', { seg: 10 }); p.cyl([x, -0.2, 3.0], 0.07, 0.02, [1.0, 0.85, 0.4], { axis: 'y', seg: 10, ink: false }); } },
  walllamp(p) { p.box([-0.06, -0.04, 0], [0.06, 0, 0.2], 'iron'); p.box([-0.02, -0.25, 0.14], [0.02, -0.04, 0.18], 'iron'); p.cyl([0, -0.27, 0.0], 0.1, 0.26, [1.0, 0.94, 0.72], { r2: 0.07, glowy: 0.25 }); p.cone([0, -0.27, 0.2], 0.13, 0.12, 'iron'); },
  plaque(p, { text = 'OPEN', sub = null, w = 0.6, h = 0.4, bg = [0.02, 0.26, 0.18], fg = [1.0, 0.86, 0.5] } = {}) { p.box([-w / 2 - 0.02, -0.03, -0.02], [w / 2 + 0.02, 0, h + 0.02], 'brass'); p.card([0, -0.032, h / 2], w, h, signTex(text, { bg, fg, sub, w: 512, h: Math.round(512 * h / w) })); },
  manhole(p) { p.cyl([0, 0, 0.004], 0.4, 0.008, 'greyD', { seg: 20, ink: false }); for (let i = -2; i <= 2; i++) p.box([-0.3, i * 0.1 - 0.015, 0.008], [0.3, i * 0.1 + 0.015, 0.012], 'black', { ink: false }); },
  roadmark(p, { len = 6 } = {}) { for (let x = -len / 2; x < len / 2; x += 1.5) p.box([x, -0.06, 0.002], [x + 0.8, 0.06, 0.006], 'white', { ink: false }); },
  meterpost(p) { p.cyl([0, 0, 0.6], 0.035, 1.2, 'greyD'); p.box([-0.09, -0.07, 1.2], [0.09, 0.07, 1.5], 'steel'); p.box([-0.06, -0.075, 1.32], [0.06, -0.07, 1.42], [0.6, 0.9, 0.6], { ink: false }); p.sph([0, 0, 1.52], 0.09, 'steel', { sz: 0.6 }); },
  skateboard(p, { c = 'red' } = {}) { p.box([-0.4, -0.1, 0.06], [0.4, 0.1, 0.08], c); for (const x of [-0.28, 0.28]) for (const y of [-0.08, 0.08]) p.cyl([x, y, 0.03], 0.03, 0.03, 'white', { axis: 'y', seg: 8 }); },
  pigeons(p, { n = 4, seed = 3 } = {}) { const r = lcg(seed); for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 1.2, y = (r() - 0.5) * 0.8, a = r() * 6;
    p.sph([x, y, 0.09], 0.08, [0.55, 0.56, 0.62], { sx: 1.0, sz: 0.75, seg: 8 }); p.sph([x + Math.cos(a) * 0.07, y + Math.sin(a) * 0.07, 0.17], 0.04, [0.40, 0.42, 0.50], { seg: 8 }); p.cone([x + Math.cos(a) * 0.11, y + Math.sin(a) * 0.11, 0.17], 0.012, 0.03, 'orange', { seg: 4 }); } },
  puddle(p, { w = 1.0, d = 0.6 } = {}) { const x = p.cyl([0, 0, 0.003], 0.5, 0.004, [0.45, 0.62, 0.80], { seg: 18, ink: false }); x.scale.set(w, 1, d); },
  hopscotch(p) { for (const [x, y] of [[0, 0], [0, 0.55], [-0.28, 1.1], [0.28, 1.1], [0, 1.65], [-0.28, 2.2], [0.28, 2.2]]) { p.box([x - 0.26, y - 0.26, 0.002], [x + 0.26, y + 0.26, 0.004], 'white', { ink: false }); p.box([x - 0.22, y - 0.22, 0.004], [x + 0.22, y + 0.22, 0.006], [0.70, 0.62, 0.60], { ink: false }); } },
  bucket(p, { c = 'yellow' } = {}) { p.cyl([0, 0, 0.15], 0.13, 0.3, c, { r2: 0.16, seg: 12 }); p.tor([0, 0, 0.32], 0.15, 0.008, 'greyD', { axis: 'y' }); p.box([0.15, -0.02, 0.0], [0.4, 0.02, 0.03], 'red'); },
  shopbag(p, { c = 'cream' } = {}) { p.box([-0.16, -0.08, 0], [0.16, 0.08, 0.36], c); p.tor([0, 0, 0.38], 0.07, 0.01, 'woodD'); p.sph([0.05, 0, 0.4], 0.07, 'green', { seg: 8 }); p.cyl([-0.06, 0, 0.42], 0.03, 0.14, 'orange', { seg: 6 }); },
  newspaper(p) { const a = p.box([-0.22, -0.15, 0.002], [0.22, 0.15, 0.012], 'paper'); a.rotation.y = 0.3; p.box([-0.18, -0.1, 0.012], [0.0, 0.1, 0.014], 'greyD', { ink: false }); },
  basket(p) { p.box([-0.25, -0.17, 0], [0.25, 0.17, 0.24], 'woodL'); p.box([-0.26, -0.18, 0.2], [0.26, 0.18, 0.25], 'red'); p.tor([0, 0, 0.28], 0.2, 0.015, 'woodD'); p.sph([0.1, 0.05, 0.28], 0.07, 'red', { seg: 8 }); p.cyl([-0.1, 0, 0.3], 0.03, 0.18, 'green', { seg: 6 }); },
  frisbee(p, { c = 'orange' } = {}) { p.cyl([0, 0, 0.02], 0.13, 0.03, c, { r2: 0.11, seg: 16 }); },
  kite(p) { const k = p.box([-0.3, -0.01, 0.0], [0.3, 0.01, 0.6], 'red'); k.rotation.x = -1.35; k.position.y = 0.06; p.box([0.3, -0.4, 0.004], [0.32, 0.6, 0.008], 'yellow', { ink: false }); },
  swing(p) { for (const x of [-1.2, 1.2]) { const a = p.box([x - 0.05, -0.6, 0], [x + 0.05, -0.5, 2.3], 'red'); a.rotation.x = 0.25; a.position.y += 0.3; const b = p.box([x - 0.05, 0.5, 0], [x + 0.05, 0.6, 2.3], 'red'); b.rotation.x = -0.25; b.position.y -= 0.3; }
    p.cyl([0, 0, 2.25], 0.05, 2.5, 'red', { axis: 'x' }); for (const x of [-0.5, 0.5]) { for (const dx of [-0.2, 0.2]) p.cyl([x + dx, 0, 1.6], 0.008, 1.3, 'greyD', { seg: 4 }); p.box([x - 0.24, -0.1, 0.92], [x + 0.24, 0.1, 0.96], 'yellow'); } },
  slide(p) { for (const x of [-0.3, 0.3]) p.box([x - 0.04, 0.8, 0], [x + 0.04, 0.88, 1.6], 'blue'); for (let z = 0.3; z < 1.6; z += 0.3) p.box([-0.3, 0.8, z - 0.02], [0.3, 0.88, z + 0.02], 'blue');
    p.box([-0.35, 0.5, 1.55], [0.35, 0.95, 1.62], 'blue'); const s = p.box([-0.3, -0.9, 0.78], [0.3, 0.9, 0.82], 'yellow'); s.rotation.x = 0.72; s.position.y = 0.0; s.position.z -= 0.15; },
  backpack(p, { c = 'red' } = {}) { p.box([-0.17, -0.1, 0], [0.17, 0.1, 0.4], c); p.sph([0, -0.02, 0.4], 0.17, c, { sz: 0.45, seg: 10 }); p.box([-0.12, -0.13, 0.08], [0.12, -0.1, 0.24], [0.9, 0.85, 0.3]); },
  lunchbox(p, { c = 'blue' } = {}) { p.box([-0.15, -0.09, 0], [0.15, 0.09, 0.16], c); p.box([-0.05, -0.01, 0.16], [0.05, 0.01, 0.2], 'greyD'); },
  paperplane(p) { const a = p.box([-0.12, -0.03, 0.005], [0.12, 0.03, 0.012], 'white'); a.rotation.y = 0.5; const b = p.box([-0.08, -0.08, 0.005], [0.04, 0.0, 0.01], 'white'); b.rotation.y = 0.9; },
  cup(p) { p.cyl([0, 0, 0.06], 0.045, 0.12, 'white', { r2: 0.055, seg: 10 }); p.cyl([0, 0, 0.125], 0.057, 0.015, 'woodD', { seg: 10 }); },
  hangbasket(p) { p.cyl([0, 0, 0.6], 0.006, 1.2, 'greyD', { seg: 4 }); p.sph([0, 0, 0.0], 0.24, 'woodL', { sz: 0.6, seg: 10 }); p.sph([0, 0, 0.12], 0.22, 'leaf', { seg: 10 }); for (let i = 0; i < 5; i++) p.sph([Math.cos(i) * 0.18, Math.sin(i) * 0.18, 0.16], 0.05, ['pink', 'red', 'yellow'][i % 3], { seg: 6 }); },
  cardboard(p) { p.box([-0.3, -0.22, 0], [0.3, 0.22, 0.38], [0.72, 0.55, 0.36]); p.box([-0.3, -0.005, 0.38], [0.3, 0.005, 0.385], [0.85, 0.75, 0.5], { ink: false }); },
  cloud(p, { s = 1, seed = 4 } = {}) { const r = lcg(seed); for (let i = 0; i < 6; i++) p.sph([(i - 2.5) * 0.7 * s, (r() - 0.5) * 0.4 * s, (0.3 + 0.4 * Math.sin(i * 1.1)) * s], (0.5 + 0.35 * r()) * s, i % 2 ? 'white' : [0.86, 0.90, 0.97], { seg: 10, sz: 0.75 }); },
  zebra(p, { w = 3, n = 6 } = {}) { for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.25) * w / n; p.box([x, -1.2, 0.004], [x + w / n * 0.5, 1.2, 0.01], 'white', { ink: false }); } },
  hubcap(p) { p.cyl([0, 0, 0.015], 0.16, 0.03, 'steel', { seg: 14 }); p.cyl([0, 0, 0.03], 0.05, 0.02, 'greyD', { seg: 10 }); },
  patch(p, { w = 1.4, d = 0.9 } = {}) { p.box([-w / 2, -d / 2, 0.003], [w / 2, d / 2, 0.008], [0.16, 0.18, 0.28], { ink: false }); for (let i = 0; i < 3; i++) p.box([-w / 2 + i * 0.4, -0.02, 0.008], [-w / 2 + i * 0.4 + 0.5, 0.02, 0.01], 'black', { ink: false }); },
  net(p) { p.box([-0.8, -0.02, 0], [0.8, 0.02, 1.2], [0.4, 0.5, 0.45], { ink: false }); for (const x of [-0.8, 0.8]) p.cyl([x, 0, 0.7], 0.04, 1.4, 'woodD'); },
};

// ---------------------------------------------------------------- the registry the dressing gate reads
const REG = []; let STAGE = null;
const ray = new THREE.Raycaster(), V = new THREE.Vector3(), BX = new THREE.Box3(), BB = new THREE.Box3();
export function register(name, objs) {
  const id = REG.length + 1; REG.push({ id, name, objs });
  for (const o of objs) o.traverse(x => { if (x.isMesh) x.userData.piece = id; });
  return id;
}
// how many registered pieces the camera sees now: shown, in front, >= 0.04 % of the frame, and at least one of five
// sample points not hidden behind something else (ray from the camera)
function dressCount({ list = false } = {}) {
  if (!STAGE) return 0;
  const cam = STAGE.camera, scene = STAGE.scene; scene.updateMatrixWorld(); cam.updateMatrixWorld();
  const meshes = []; scene.traverseVisible(o => { if (o.isMesh && !o.userData.noPrepass) meshes.push(o); });
  const seen = [];
  for (const P0 of REG) {
    let shown = true;
    for (const o of P0.objs) for (let q = o; q; q = q.parent) if (!q.visible) { shown = false; break; }
    if (!shown || !P0.objs.some(o => o.parent)) continue;
    BX.makeEmpty();
    for (const o of P0.objs) o.traverseVisible(x => { if (!x.isMesh) return; if (!x.geometry.boundingBox) x.geometry.computeBoundingBox(); BB.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld); BX.union(BB); });
    if (BX.isEmpty()) continue;
    let x0 = 1, y0 = 1, x1 = -1, y1 = -1, n = 0;
    for (let i = 0; i < 8; i++) { V.set(i & 1 ? BX.max.x : BX.min.x, i & 2 ? BX.max.y : BX.min.y, i & 4 ? BX.max.z : BX.min.z).project(cam);
      if (V.z >= 1 || V.z <= -1) continue; n++; x0 = Math.min(x0, V.x); x1 = Math.max(x1, V.x); y0 = Math.min(y0, V.y); y1 = Math.max(y1, V.y); }
    if (!n) continue;
    const w = Math.min(1, x1) - Math.max(-1, x0), h = Math.min(1, y1) - Math.max(-1, y0);
    if (!(w > 0 && h > 0 && w * h / 4 >= 0.0004)) continue;
    let vis = false;
    for (const [u, v, t] of [[0.5, 0.5, 0.5], [0.25, 0.5, 0.3], [0.75, 0.5, 0.7], [0.5, 0.25, 0.8], [0.5, 0.75, 0.2]]) {
      const pt = new THREE.Vector3(BX.min.x + u * (BX.max.x - BX.min.x), BX.min.y + t * (BX.max.y - BX.min.y), BX.min.z + v * (BX.max.z - BX.min.z));
      const q = pt.clone().project(cam); if (q.z >= 1 || q.z <= -1 || Math.abs(q.x) > 1 || Math.abs(q.y) > 1) continue;
      const d = pt.distanceTo(cam.position); ray.set(cam.position, pt.clone().sub(cam.position).normalize()); ray.far = d * 1.02;
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit || hit.object.userData.piece === P0.id || hit.distance > d * 0.97) { vis = true; break; }
    }
    if (vis) seen.push(P0.name);
  }
  return list ? seen : seen.length;
}
if (typeof window !== 'undefined') { window.__dressCount = dressCount; window.__dressList = () => dressCount({ list: true }); }

// ---------------------------------------------------------------- the kit a set uses
export function dressKit(stage, collide = null) {
  STAGE = stage;
  const { scene, prop } = stage;
  const finish = (g, name, { ink = true, solid = false, pad = 0.02, grace } = {}) => {
    g.traverse(x => { if (x.isMesh && x.material?.userData?.glowy) stage.glow(x, 0.4); });
    scene.add(g);
    if (ink) { g.traverse(x => { if (x.isMesh && !x.userData.noInk && !x.userData.noPrepass) prop(x); }); }
    register(name, [g]);
    if (solid && collide) {
      g.updateMatrixWorld(true); BX.makeEmpty();
      g.traverse(x => { if (!x.isMesh || x.userData.noPrepass) return; if (!x.geometry.boundingBox) x.geometry.computeBoundingBox(); BB.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld); if (BB.min.y < 1.8) BX.union(BB); });
      if (!BX.isEmpty()) collide.push({ name: `${name}@${g.position.x.toFixed(1)},${(-g.position.z).toFixed(1)}`, lo: [BX.min.x - pad, -BX.max.z - pad, Math.max(0, BX.min.y)], hi: [BX.max.x + pad, -BX.min.z + pad, Math.min(BX.max.y, 1.9)], ...(grace != null ? { grace } : {}) });
    }
    return g;
  };
  const build = (kind, opts, g) => {
    const p = P(g); p._g = g; p._sub = (k, at, rot, o) => { const s = new THREE.Group(); build(k, o, s); s.position.copy(B(...at)); s.rotation.y = rot * Math.PI / 180; g.add(s); };
    if (!PIECES[kind]) throw new Error(`dress: no piece ${kind}`);
    PIECES[kind](p, opts || {});
  };
  return {
    // a kit piece at Blender [x, y, z], turned rot degrees about z; opts go to the piece, plus solid / ink / scale
    put(kind, at, rot = 0, opts = {}) {
      const g = new THREE.Group(); build(kind, opts, g);
      g.position.copy(B(...at)); g.rotation.y = rot * Math.PI / 180; if (opts.scale) g.scale.setScalar(opts.scale);
      return finish(g, opts.name || kind, opts);
    },
    // a painted sign board (in-world text): on a pole (pole > 0) or flat on a wall (pole 0)
    sign(at, text, opts = {}) { return this.put('sign', at, opts.face ?? 0, { pole: 0, ...opts, text, name: opts.name || 'sign' }); },
    // several pieces in a row: kinds = ['bin', 'bench', ...] from a to b
    row(kinds, a, b, rot = 0, opts = {}) { const n = kinds.length; return kinds.map((k, i) => this.put(k, a.map((v, j) => v + (b[j] - v) * (n === 1 ? 0.5 : i / (n - 1))), rot, opts)); },
    // register meshes a set built by hand: s = D.mark() before, D.since(s, 'counter') after
    mark() { return new Set(scene.children); },
    since(before, name) { const objs = scene.children.filter(c => !before.has(c)); if (objs.length) register(name, objs); return objs; },
    register,
  };
}
// a set's COLLIDE starts from its hand list on every build (two acts can build the same set)
export function resetCollide(collide, base) { collide.length = 0; collide.push(...base.map(b => ({ ...b }))); }
// a kit piece as a bare group (no scene, no registry): props and effects reuse the pieces (lib/props/physfx.js `fall`)
export function pieceGroup(kind, opts = {}) {
  const g = new THREE.Group(), p = P(g); p._g = g;
  p._sub = (k, at, rot, o) => { const s = pieceGroup(k, o); s.position.copy(B(...at)); s.rotation.y = rot * Math.PI / 180; g.add(s); };
  if (!PIECES[kind]) throw new Error(`dress: no piece ${kind}`);
  PIECES[kind](p, opts); return g;
}
