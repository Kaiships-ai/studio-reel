// The kit's code-built set props: what no CC0 model covers (33 of them carry an `id` of the first prop list, held by
// test/unit/stick-props-catalog.test.mjs), plus those that replace a model that did not read as its name. Loaded by name through kit/props/catalog.js propKit, the same
// '<place>/<slug>' names as the .glb props, so a film never cares which kind a prop is.
// Built like kit/sets/dress.js PIECES: Blender metres (x right, y into the scene, z up), origin at the bottom centre, front
// to -y (vehicles point +x, as the .glb vehicles); toon materials via tm(). Colours stay inside the valuegate band
// (max channel <= 0.90 sRGB, never black): the Q palette below is linear, every channel <= 0.78.
//   BUILT[name] = { id, size: [w, d, h] (metres, the test holds the built bounds to it), wall?, make(k) }
import * as THREE from 'three';
import { B, toon } from '#engine/look.js';
import { P, tm, signTex } from '#kit/sets/dress.js';
import { canvasTex } from '#kit/sets/canvas.js';

const Q = {
  steel: [0.50, 0.53, 0.56], steelD: [0.20, 0.21, 0.24], chrome: [0.64, 0.66, 0.68], rubber: [0.06, 0.06, 0.07],
  off: [0.72, 0.72, 0.69], plastic: [0.62, 0.66, 0.70], cream: [0.74, 0.66, 0.48], sheet: [0.66, 0.72, 0.74],
  teal: [0.22, 0.50, 0.55], mint: [0.40, 0.66, 0.56], blue: [0.18, 0.38, 0.74], blueL: [0.36, 0.52, 0.76], navy: [0.10, 0.15, 0.34],
  red: [0.72, 0.13, 0.09], green: [0.14, 0.46, 0.20], yellow: [0.78, 0.60, 0.10], orange: [0.78, 0.36, 0.08], pink: [0.76, 0.42, 0.54],
  wood: [0.52, 0.30, 0.12], woodL: [0.70, 0.50, 0.28], woodD: [0.28, 0.15, 0.06], fabric: [0.30, 0.36, 0.46], resin: [0.16, 0.18, 0.20],
  glass: [0.40, 0.62, 0.74], screen: [0.08, 0.10, 0.14],
};
let GLASS = null;
const glassMat = () => GLASS || (GLASS = Object.assign(toon(Q.glass, { rough: 0.2, sheen: 0.3, rim: 0.2 }), { transparent: true, opacity: 0.38, depthWrite: false }));
const D = Math.PI / 180;

// the piece-local builder: dress.js P (box, cyl, sph, cone, tor, card) plus a tube between two points, glass, glow, tilt
function kit(g) {
  const p = P(g);
  return {
    ...p, g,
    tube(a, b, r, c, seg = 8) {
      const A = B(...a), Bv = B(...b), d = Bv.clone().sub(A), x = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), tm(c));
      x.position.copy(A).add(Bv).multiplyScalar(0.5); x.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      x.castShadow = x.receiveShadow = true; g.add(x); return x;
    },
    glass(x) { x.material = glassMat(); x.castShadow = false; return x; },
    glow(x, c, k = 0.6) { x.material = tm(c, { glowy: k }); return x; },
    // turn a mesh about its own centre: ax 'x' raises its +y end by deg, 'z' turns it like a set piece
    tilt(x, ax, deg) { if (ax === 'x') x.rotation.x += deg * D; else if (ax === 'z') x.rotation.y += deg * D; else x.rotation.z -= deg * D; return x; },
    wheel(x, y, r = 0.04, ax = 'x', c = Q.rubber) { return p.cyl([x, y, r], r, 0.03, c, { axis: ax, seg: 12 }); },
    sub(at, rotDeg = 0) { const s = new THREE.Group(); s.position.copy(B(...at)); s.rotation.y = rotDeg * D; g.add(s); return kit(s); },
  };
}
const css = c => `rgb(${c.map(x => Math.round(255 * Math.pow(Math.max(0, Math.min(1, x)), 1 / 2.2))).join(',')})`;
const TEX = new Map();
const tex = (key, w, h, draw) => TEX.get(key) || TEX.set(key, canvasTex(w, h, draw)).get(key);
// painted cards: a monitor trace, a half-finished bar chart, a month grid
const traceTex = () => tex('trace', 256, 192, (x, W, H) => { x.fillStyle = css([0.04, 0.08, 0.10]); x.fillRect(0, 0, W, H); x.lineWidth = 5;
  for (const [y0, c] of [[0.3, [0.3, 0.78, 0.35]], [0.62, [0.78, 0.62, 0.2]]]) { x.strokeStyle = css(c); x.beginPath();
    for (let i = 0; i <= 64; i++) { const u = i / 64, s = (u * 4) % 1; x.lineTo(u * W, H * (y0 - (s > 0.42 && s < 0.5 ? 0.16 : s > 0.5 && s < 0.56 ? -0.07 : 0))); } x.stroke(); }
  x.fillStyle = css([0.3, 0.78, 0.35]); x.font = `900 ${H * 0.2}px InterReel, Arial, sans-serif`; x.fillText('72', W * 0.74, H * 0.92); });
const chartTex = () => tex('chart', 384, 256, (x, W, H) => { x.fillStyle = css([0.72, 0.74, 0.74]); x.fillRect(0, 0, W, H);
  x.strokeStyle = css([0.1, 0.1, 0.12]); x.lineWidth = 5; x.beginPath(); x.moveTo(W * 0.1, H * 0.1); x.lineTo(W * 0.1, H * 0.88); x.lineTo(W * 0.92, H * 0.88); x.stroke();
  [[0.2, 0.3, [0.18, 0.38, 0.74]], [0.38, 0.5, [0.72, 0.13, 0.09]], [0.56, 0.7, [0.14, 0.46, 0.2]]].forEach(([u, v, c]) => { x.fillStyle = css(c); x.fillRect(W * u, H * (0.88 - v), W * 0.12, H * v); });
  x.setLineDash([12, 10]); x.strokeStyle = css([0.18, 0.38, 0.74]); x.strokeRect(W * 0.74, H * 0.08, W * 0.12, H * 0.8); });
const monthTex = () => tex('month', 192, 192, (x, W, H) => { x.fillStyle = css([0.74, 0.70, 0.60]); x.fillRect(0, 0, W, H); x.strokeStyle = css([0.2, 0.2, 0.22]); x.lineWidth = 2;
  for (let i = 0; i <= 7; i++) { x.beginPath(); x.moveTo(i * W / 7, 0); x.lineTo(i * W / 7, H); x.stroke(); }
  for (let j = 0; j <= 5; j++) { x.beginPath(); x.moveTo(0, j * H / 5); x.lineTo(W, j * H / 5); x.stroke(); }
  x.fillStyle = css([0.72, 0.13, 0.09]); x.beginPath(); x.arc(W * (3.5 / 7), H * 0.5, W * 0.06, 0, 7); x.fill(); });

// a seeded 0..1 stream (mulberry32): a stocked shelf comes out the same on every render
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const GOODS = [Q.red, Q.blue, Q.green, Q.yellow, Q.orange, Q.pink, Q.teal, Q.mint, Q.cream, Q.blueL, Q.woodL, Q.sheet];
// a supermarket gondola w metres wide, 0.5 deep, 1.8 tall: plinth, back panel, side panels, 4 stocked levels. Each level
// holds runs of one product (3-7 facings of one colour and kind): a box as deep as the shelf, a bottle with one behind it,
// or two cans stacked; a price strip on every shelf lip
function gondola(k, w, seed) {
  const r = rng(seed), h = w / 2;
  k.box([-h, -0.25, 0], [h, 0.25, 0.1], Q.steelD);
  k.box([-h, 0.2, 0.1], [h, 0.25, 1.8], Q.off);
  for (const x of [-h, h - 0.03]) k.box([x, -0.25, 0], [x + 0.03, 0.25, 1.8], Q.steel);
  k.box([-h, 0.17, 1.7], [h, 0.2, 1.8], Q.red);
  for (const z of [0.1, 0.52, 0.94, 1.36]) {
    if (z > 0.1) k.box([-h + 0.03, -0.25, z - 0.03], [h - 0.03, 0.2, z], Q.steel);
    k.box([-h + 0.03, -0.26, z - 0.05], [h - 0.03, -0.25, z + 0.01], Q.yellow, { ink: false });
    const top = z === 1.36 ? 1.66 : z + 0.38;
    for (let x = -h + 0.04; x < h - 0.07;) {
      const kind = r() < 0.5 ? 'box' : r() < 0.6 ? 'bottle' : 'can', c = GOODS[Math.floor(r() * GOODS.length)], n = 3 + Math.floor(r() * 5);
      const fw = kind === 'box' ? 0.07 + r() * 0.06 : kind === 'bottle' ? 0.075 : 0.07, fh = kind === 'box' ? 0.14 + r() * (top - z - 0.16) : kind === 'bottle' ? 0.2 + r() * 0.08 : 0.11;
      for (let i = 0; i < n && x + fw < h - 0.035; i++, x += fw + 0.006) {
        const cx = x + fw / 2;
        if (kind === 'box') k.box([x, -0.22, z], [x + fw, 0.16, z + fh], c);
        else if (kind === 'bottle') for (const y of [-0.17, 0.02]) { k.cyl([cx, y, z + fh / 2], 0.034, fh, c, { seg: 5 }); }
        else for (const zz of [0, 0.112]) k.cyl([cx, -0.17, z + zz + 0.055], 0.033, 0.11, c, { seg: 5 });
      }
      x += 0.012;
    }
  }
}

export const BUILT = {
  // ------------------------------------------------------------------ hospital
  'hospital/gurney': { id: 'cb-gurney', size: [0.7, 1.9, 0.9], make(k) {
    for (const x of [-0.25, 0.25]) for (const y of [-0.8, 0.8]) { k.cyl([x, y, 0.31], 0.02, 0.48, Q.steel, { seg: 8 }); k.wheel(x, y, 0.07); }
    k.box([-0.3, -0.92, 0.5], [0.3, 0.92, 0.56], Q.steel);
    k.box([-0.3, -0.92, 0.56], [0.3, 0.4, 0.66], Q.teal);
    k.tilt(k.box([-0.3, 0.42, 0.62], [0.3, 0.9, 0.7], Q.teal), 'x', 30);
    for (const x of [-0.33, 0.33]) { k.box([x - 0.01, -0.6, 0.7], [x + 0.01, 0.3, 0.73], Q.chrome); for (const y of [-0.55, 0.25]) k.cyl([x, y, 0.65], 0.01, 0.1, Q.chrome, { seg: 6 }); }
    k.cyl([0.28, 0.88, 0.74], 0.01, 0.32, Q.chrome, { seg: 6 }); k.box([0.24, 0.87, 0.88], [0.32, 0.89, 0.9], Q.chrome);
  } },
  'hospital/iv-stand': { id: 'cb-ivstand', size: [0.5, 0.5, 1.9], make(k) {
    k.cyl([0, 0, 0.95], 0.015, 1.8, Q.chrome, { seg: 8 });
    for (let i = 0; i < 5; i++) { const a = i * 72 * D + 90 * D, x = 0.22 * Math.cos(a), y = 0.22 * Math.sin(a); k.tube([0, 0, 0.09], [x, y, 0.05], 0.012, Q.chrome); k.sph([x, y, 0.025], 0.025, Q.rubber, { seg: 8 }); }
    k.box([-0.18, -0.01, 1.83], [0.18, 0.01, 1.85], Q.chrome);
    for (const x of [-0.16, -0.06, 0.06, 0.16]) k.cone([x, 0, 1.87], 0.01, 0.04, Q.chrome, { seg: 6 });
    k.box([0.07, -0.015, 1.58], [0.17, 0.015, 1.78], Q.sheet); k.tube([0.12, 0, 1.58], [0.03, -0.03, 1.0], 0.004, Q.sheet, 5);
  } },
  'hospital/monitor-stand': { id: 'cb-monstand', size: [0.5, 0.5, 1.5], make(k) {
    for (const [x, y] of [[0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) { k.tube([0, 0, 0.07], [x, y, 0.05], 0.015, Q.steelD); k.sph([x, y, 0.025], 0.025, Q.rubber, { seg: 8 }); }
    k.cyl([0, 0, 0.63], 0.02, 1.16, Q.steel, { seg: 8 });
    k.box([-0.2, -0.06, 1.15], [0.2, 0.03, 1.45], Q.steelD);
    k.card([0, -0.062, 1.3], 0.36, 0.26, traceTex(), { lit: false });
    k.glow(k.sph([0.17, -0.02, 1.475], 0.022, Q.green, { seg: 8 }), [0.25, 0.75, 0.3], 0.8);
  } },
  'hospital/bassinet': { id: 'cb-bassinet', size: [0.8, 0.5, 1.0], make(k) {
    for (const x of [-0.37, 0.37]) { k.box([x - 0.03, -0.22, 0.06], [x + 0.03, 0.22, 0.1], Q.chrome); k.box([x - 0.03, -0.03, 0.1], [x + 0.03, 0.03, 0.75], Q.chrome); for (const y of [-0.2, 0.2]) k.wheel(x, y, 0.04, 'x'); }
    k.cyl([0, 0, 0.4], 0.015, 0.74, Q.chrome, { axis: 'x', seg: 8 });
    k.box([-0.37, -0.22, 0.75], [0.37, 0.22, 0.77], Q.chrome);
    k.box([-0.33, -0.18, 0.77], [0.33, 0.18, 0.82], Q.pink);
    for (const [lo, hi] of [[[-0.35, -0.2, 0.77], [0.35, -0.19, 0.99]], [[-0.35, 0.19, 0.77], [0.35, 0.2, 0.99]], [[-0.35, -0.2, 0.77], [-0.34, 0.2, 0.99]], [[0.34, -0.2, 0.77], [0.35, 0.2, 0.99]]]) k.glass(k.box(lo, hi, Q.glass));
    k.card([0.2, -0.203, 0.92], 0.16, 0.07, signTex('BABY', { bg: [0.74, 0.6, 0.66], w: 256, h: 112 }));
  } },
  'hospital/sanitiser': { id: 'cb-sanitiser', size: [0.1, 0.12, 0.3], wall: true, make(k) {
    k.box([-0.05, 0.04, 0], [0.05, 0.06, 0.3], Q.plastic);
    k.box([-0.04, -0.04, 0.05], [0.04, 0.04, 0.26], Q.off);
    k.box([-0.03, -0.06, 0.19], [0.03, -0.04, 0.24], Q.blueL);
    k.cyl([0, -0.045, 0.045], 0.008, 0.03, Q.steelD, { seg: 6 });
    k.card([0, -0.0405, 0.12], 0.05, 0.06, signTex('GEL', { bg: [0.36, 0.52, 0.76], w: 128, h: 160 }));
  } },
  'hospital/privacy-curtain': { id: 'cb-privacycurtain', size: [2.4, 0.06, 2.0], make(k) {
    k.cyl([0, 0, 1.98], 0.015, 2.4, Q.chrome, { axis: 'x', seg: 8 });
    for (let i = 0; i < 8; i++) { const x = -1.12 + i * 0.15; k.tilt(k.box([x - 0.085, -0.01 + (i % 2 ? 0.02 : -0.02), 0.005], [x + 0.085, 0.01 + (i % 2 ? 0.02 : -0.02), 1.92], Q.mint), 'y', i % 2 ? 2 : -2); k.tor([x, 0, 1.95], 0.02, 0.004, Q.chrome); }
  } },
  'hospital/blind': { id: 'cb-blind', size: [1.2, 0.06, 1.4], wall: true, make(k) {
    for (const x of [-0.58, 0.58]) k.box([x - 0.02, -0.03, 0], [x + 0.02, 0.03, 1.4], Q.off);
    k.box([-0.6, -0.03, 1.34], [0.6, 0.03, 1.4], Q.off); k.box([-0.6, -0.03, 0], [0.6, 0.03, 0.04], Q.off);
    for (let i = 0; i < 14; i++) { const z = 0.08 + i * 0.09, s = k.box([-0.55, -0.02, z], [0.55, 0.02, z + 0.05], Q.cream); if (i % 5 === 2) k.tilt(s, 'x', 35); }
    k.cyl([0.5, -0.025, 0.7], 0.003, 1.26, Q.steelD, { seg: 4 });
  } },
  'hospital/double-door': { id: 'cb-doublewindowdoor', size: [1.8, 0.1, 2.1], make(k) {
    for (const x of [-0.875, 0.875]) k.box([x - 0.025, -0.05, 0], [x + 0.025, 0.05, 2.1], Q.steelD);
    k.box([-0.9, -0.05, 2.0], [0.9, 0.05, 2.1], Q.steelD);
    for (const s of [-1, 1]) {
      k.box(s < 0 ? [-0.85, -0.025, 0] : [0.015, -0.025, 0], s < 0 ? [-0.015, 0.025, 2.0] : [0.85, 0.025, 2.0], Q.blueL);
      k.glass(k.cyl([s * 0.43, 0, 1.45], 0.18, 0.06, Q.glass, { axis: 'y', seg: 20 })); k.tor([s * 0.43, -0.03, 1.45], 0.18, 0.012, Q.steelD);
      k.box([s * 0.1 - 0.04, -0.035, 1.0], [s * 0.1 + 0.04, -0.025, 1.3], Q.chrome);
    }
    k.glow(k.box([-0.2, -0.07, 2.02], [0.2, -0.05, 2.09], Q.green), [0.14, 0.6, 0.25], 0.6);
    k.card([0, -0.0705, 2.055], 0.34, 0.06, signTex('EXIT', { bg: [0.1, 0.55, 0.22], fg: [0.78, 0.78, 0.74], border: null, w: 256, h: 48 }), { lit: false });
  } },
  'hospital/bed-rail': { id: 'cb-bedrail', size: [1.0, 0.05, 0.35], make(k) {
    for (const z of [0.2, 0.335]) k.cyl([0, 0, z], 0.015, 0.96, Q.chrome, { axis: 'x', seg: 8 });
    for (const x of [-0.3, -0.1, 0.1, 0.3]) k.cyl([x, 0, 0.2], 0.012, 0.3, Q.chrome, { seg: 6 });
    for (const x of [-0.49, 0.49]) k.box([x - 0.012, -0.025, 0], [x + 0.012, 0.025, 0.35], Q.plastic);
  } },
  // ------------------------------------------------------------------ care home
  'care-home/walking-frame': { id: 'cb-walkingframe', size: [0.6, 0.5, 0.85], make(k) {
    for (const x of [-0.27, 0.27]) {
      for (const y of [-0.22, 0.22]) k.tube([x, y, 0.04], [x * 0.96, y * 0.9, 0.84], 0.013, Q.chrome);
      k.cyl([x, 0.22, 0.02], 0.018, 0.04, Q.rubber, { seg: 8 }); k.wheel(x, -0.22, 0.04, 'x', Q.steelD);
      k.cyl([x * 0.96, 0, 0.84], 0.016, 0.42, Q.chrome, { axis: 'y', seg: 8 }); k.cyl([x * 0.96, 0.05, 0.845], 0.022, 0.14, Q.rubber, { axis: 'y', seg: 8 });
    }
    k.cyl([0, -0.2, 0.6], 0.013, 0.52, Q.chrome, { axis: 'x', seg: 8 });
  } },
  'care-home/memory-box': { id: 'cb-memorybox', size: [0.3, 0.1, 0.4], wall: true, make(k0) {
    const k = k0.sub([0, -0.05, 0]);
    k.box([-0.15, 0.07, 0], [0.15, 0.1, 0.4], Q.cream);
    k.box([-0.15, 0, 0], [-0.12, 0.1, 0.4], Q.woodD); k.box([0.12, 0, 0], [0.15, 0.1, 0.4], Q.woodD);
    k.box([-0.12, 0, 0], [0.12, 0.1, 0.03], Q.woodD); k.box([-0.12, 0, 0.37], [0.12, 0.1, 0.4], Q.woodD);
    k.box([-0.1, 0.03, 0.05], [-0.02, 0.07, 0.14], Q.red); k.sph([0.05, 0.05, 0.26], 0.035, Q.yellow, { seg: 10 }); k.cyl([-0.05, 0.05, 0.28], 0.02, 0.1, Q.blue, { seg: 10 });
    k.box([-0.12, 0.02, 0.18], [0.12, 0.07, 0.19], Q.woodL);
  } },
  'care-home/fire-door': { id: 'cb-firedoor', size: [1.0, 0.1, 2.1], make(k) {
    for (const x of [-0.475, 0.475]) k.box([x - 0.025, -0.03, 0], [x + 0.025, 0.03, 2.1], Q.steelD);
    k.box([-0.5, -0.03, 2.0], [0.5, 0.03, 2.1], Q.steelD);
    k.box([-0.45, -0.025, 0], [0.45, 0.025, 2.0], Q.red);
    k.glass(k.box([-0.08, -0.03, 1.4], [0.08, 0.03, 1.8], Q.glass));
    k.cyl([0, -0.055, 1.0], 0.015, 0.7, Q.chrome, { axis: 'x', seg: 8 }); for (const x of [-0.33, 0.33]) k.box([x - 0.02, -0.055, 0.98], [x + 0.02, -0.025, 1.02], Q.chrome);
    k.glow(k.box([-0.15, -0.05, 2.02], [0.15, -0.03, 2.09], Q.green), [0.14, 0.6, 0.25], 0.6);
    k.card([0, -0.0505, 2.055], 0.26, 0.06, signTex('EXIT', { bg: [0.1, 0.55, 0.22], fg: [0.78, 0.78, 0.74], border: null, w: 256, h: 56 }), { lit: false });
  } },
  'care-home/serving-hatch': { id: 'cb-servinghatch', size: [1.2, 0.4, 0.9], make(k) {
    k.box([-0.6, 0, 0], [0.6, 0.05, 0.3], Q.cream);
    k.box([-0.6, -0.2, 0.3], [0.6, 0.2, 0.34], Q.woodL);
    for (const x of [-0.575, 0.575]) k.box([x - 0.025, -0.03, 0.34], [x + 0.025, 0.06, 0.9], Q.woodD);
    k.box([-0.6, -0.03, 0.85], [0.6, 0.06, 0.9], Q.woodD);
    k.box([-0.55, 0.03, 0.6], [0.55, 0.05, 0.85], Q.steel); for (let z = 0.63; z < 0.84; z += 0.05) k.box([-0.55, 0.025, z], [0.55, 0.03, z + 0.008], Q.steelD, { ink: false });
    for (let i = 0; i < 6; i++) k.cyl([0.3, -0.08, 0.3475 + i * 0.016], 0.1, 0.015, Q.off, { seg: 16 });
  } },
  // a school wall clock stopped at 11:59: 12 marks (the quarters heavier), hour hand at 359.5 deg, minute hand at 354
  'care-home/wall-clock': { size: [0.32, 0.05, 0.32], wall: true, make(k) {
    k.cyl([0, 0.005, 0.16], 0.16, 0.04, Q.steelD, { axis: 'y', seg: 28 });
    k.cyl([0, -0.013, 0.16], 0.145, 0.012, Q.off, { axis: 'y', seg: 28 });
    const hand = (deg, r0, r1, w, y, c) => { const a = deg * D, r = (r0 + r1) / 2, x = r * Math.sin(a), z = 0.16 + r * Math.cos(a), l = (r1 - r0) / 2;
      const m = k.box([x - w / 2, y - 0.002, z - l], [x + w / 2, y, z + l], c, { ink: false }); m.name = `clock:${deg}`; return k.tilt(m, 'y', deg); };
    for (let i = 0; i < 12; i++) hand(i * 30, i % 3 ? 0.115 : 0.1, 0.134, i % 3 ? 0.008 : 0.014, -0.0195, Q.steelD);
    hand(359.5, -0.02, 0.075, 0.016, -0.0215, Q.resin); hand(354, -0.025, 0.118, 0.009, -0.0235, Q.red);
    k.cyl([0, -0.0225, 0.16], 0.011, 0.006, Q.resin, { axis: 'y', seg: 10 });
  } },
  // ------------------------------------------------------------------ street
  'street/child-shoe': { id: 'cb-childshoe', size: [0.06, 0.15, 0.075], make(k) {
    for (const y of [-0.045, 0.045]) k.cyl([0, y, 0.006], 0.03, 0.012, Q.off, { seg: 16 });
    k.box([-0.03, -0.045, 0], [0.03, 0.045, 0.012], Q.off);
    const toe = k.sph([0, -0.035, 0.024], 0.028, Q.pink, { seg: 16 }); toe.scale.set(1, 0.95, 1.3);
    k.cyl([0, 0.035, 0.04], 0.027, 0.056, Q.pink, { r2: 0.024, seg: 16 }); k.box([-0.026, -0.035, 0.012], [0.026, 0.035, 0.042], Q.pink);
    k.cyl([0, 0.035, 0.069], 0.02, 0.004, Q.resin, { seg: 16 });
    k.box([-0.029, -0.008, 0.026], [0.029, 0.006, 0.05], Q.blue); k.sph([0.03, -0.001, 0.04], 0.006, Q.yellow, { seg: 8 });
  } },
  'street/police-tower': { id: 'cb-policetower', size: [1.5, 1.5, 3.2], make(k) {
    for (const x of [-0.68, 0.68]) for (const y of [-0.68, 0.68]) k.box([x - 0.04, y - 0.04, 0], [x + 0.04, y + 0.04, 2.2], Q.steelD);
    for (const y of [-0.68, 0.68]) { k.tube([-0.68, y, 0.2], [0.68, y, 2.0], 0.02, Q.steel); k.tube([0.68, y, 0.2], [-0.68, y, 2.0], 0.02, Q.steel); }
    k.box([-0.75, -0.75, 2.2], [0.75, 0.75, 2.28], Q.steelD);
    for (const [lo, hi] of [[[-0.75, -0.75, 2.28], [0.75, -0.7, 2.7]], [[-0.75, 0.7, 2.28], [0.75, 0.75, 2.7]], [[-0.75, -0.7, 2.28], [-0.7, 0.7, 2.7]], [[0.7, -0.7, 2.28], [0.75, 0.7, 2.7]]]) k.box(lo, hi, Q.navy);
    k.glass(k.box([-0.72, -0.72, 2.7], [0.72, 0.72, 2.86], Q.glass));
    for (const x of [-0.7, 0.7]) for (const y of [-0.7, 0.7]) k.cyl([x, y, 2.97], 0.02, 0.22, Q.steelD, { seg: 6 });
    k.box([-0.75, -0.75, 3.08], [0.75, 0.75, 3.14], Q.steelD);
    k.glow(k.sph([0, 0, 3.17], 0.04, Q.blue, { seg: 10 }), [0.2, 0.4, 0.78], 0.9);
    for (const x of [-0.2, 0.2]) k.box([x - 0.02, -0.75, 0], [x + 0.02, -0.71, 2.28], Q.yellow);
    for (let z = 0.3; z < 2.2; z += 0.3) k.box([-0.2, -0.745, z], [0.2, -0.715, z + 0.03], Q.yellow);
  } },
  'street/screen-truck': { id: 'cb-screentruck', size: [6.0, 2.5, 4.0], make(k) {
    for (const x of [-2.2, -1.2, 2.2]) for (const y of [-1.05, 1.05]) { k.cyl([x, y, 0.45], 0.45, 0.3, Q.rubber, { axis: 'y', seg: 16 }); k.cyl([x, y * 1.15, 0.45], 0.22, 0.02, Q.steel, { axis: 'y', seg: 12 }); }
    k.box([-2.95, -1.0, 0.45], [2.9, 1.0, 0.65], Q.steelD);
    k.box([1.6, -1.2, 0.65], [2.9, 1.2, 2.6], Q.red);
    k.glass(k.box([2.88, -1.0, 1.6], [2.92, 1.0, 2.4], Q.glass)); for (const y of [-1.205, 1.205]) k.glass(k.box([1.9, y - 0.005, 1.6], [2.6, y + 0.005, 2.4], Q.glass));
    k.box([-2.95, -1.2, 0.65], [1.5, 1.2, 3.0], Q.off);
    k.box([-2.8, -1.27, 1.1], [1.3, -1.2, 4.0], Q.steelD);
    k.glow(k.box([-2.7, -1.29, 1.2], [1.2, -1.27, 3.9], Q.blueL), [0.22, 0.38, 0.7], 0.5);
    k.box([2.9, -1.1, 0.4], [3.0, 1.1, 0.7], Q.steelD); k.box([-3.0, -1.1, 0.4], [-2.95, 1.1, 0.7], Q.steelD);
    for (let i = 0; i < 6; i++) k.box([-3.01, -1.1 + i * 0.367, 0.42], [-2.995, -1.1 + i * 0.367 + 0.18, 0.68], i % 2 ? Q.steelD : Q.yellow, { ink: false });
  } },
  'street/crowd-pen': { id: 'cb-crowdpen', size: [2.0, 0.6, 1.1], make(k) {
    for (const x of [-0.98, 0.98]) { k.cyl([x, 0, 0.565], 0.02, 1.07, Q.steel, { seg: 8 }); k.box([x - 0.03, -0.3, 0], [x + 0.03, 0.3, 0.03], Q.steelD); }
    for (const z of [0.3, 0.7, 1.08]) k.cyl([0, 0, z], 0.015, 1.96, Q.steel, { axis: 'x', seg: 8 });
    for (let i = 1; i < 13; i++) k.cyl([-0.98 + i * 0.151, 0, 0.69], 0.007, 0.78, Q.steel, { seg: 5 });
  } },
  'street/scaffolding': { size: [2.0, 0.8, 4.0], make(k) {
    for (const x of [-0.975, 0.975]) for (const y of [-0.375, 0.375]) { k.cyl([x, y, 2.0], 0.024, 4.0, Q.steel, { seg: 8 }); k.box([x - 0.06, y - 0.06, 0], [x + 0.06, y + 0.06, 0.01], Q.steelD); }
    for (const z of [0.15, 2.0, 3.0, 3.5, 3.97]) for (const y of [-0.375, 0.375]) k.cyl([0, y, z], 0.022, 1.95, Q.steel, { axis: 'x', seg: 8 });
    for (const z of [0.15, 2.0, 3.0]) for (const x of [-0.975, 0.975]) k.cyl([x, 0, z], 0.022, 0.75, Q.steel, { axis: 'y', seg: 8 });
    k.tube([-0.975, 0.375, 0.15], [0.975, 0.375, 2.0], 0.02, Q.steel); k.tube([0.975, 0.375, 2.0], [-0.975, 0.375, 3.0], 0.02, Q.steel);
    for (const z of [2.03, 3.03]) { for (let i = 0; i < 3; i++) k.box([-0.95, -0.33 + i * 0.225, z], [0.95, -0.33 + i * 0.225 + 0.21, z + 0.04], Q.woodL); k.box([-0.95, -0.36, z + 0.04], [0.95, -0.34, z + 0.19], Q.orange); }
  } },
  // ------------------------------------------------------------------ office
  'office/cubicle': { id: 'cb-cubicle', size: [1.6, 0.5, 1.3], make(k) {
    k.box([-0.8, -0.02, 0.04], [0.8, 0.02, 1.27], Q.fabric);
    k.box([-0.8, -0.025, 1.27], [0.8, 0.025, 1.3], Q.steelD); for (const x of [-0.8, 0.8]) k.box([x - 0.012, -0.025, 0.04], [x + 0.012, 0.025, 1.27], Q.steelD);
    for (const x of [-0.65, 0.65]) k.box([x - 0.04, -0.25, 0], [x + 0.04, 0.25, 0.04], Q.steelD);
  } },
  'office/whiteboard': { id: 'cb-whiteboard', size: [1.5, 0.05, 1.0], wall: true, make(k) {
    k.box([-0.73, -0.01, 0.06], [0.73, 0.01, 1.0], Q.off);
    k.box([-0.75, -0.015, 0.98], [0.75, 0.015, 1.0], Q.steel); k.box([-0.75, -0.015, 0.04], [0.75, 0.015, 0.06], Q.steel);
    for (const x of [-0.74, 0.74]) k.box([x - 0.01, -0.015, 0.04], [x + 0.01, 0.015, 1.0], Q.steel);
    k.box([-0.5, -0.04, 0], [0.5, -0.01, 0.04], Q.steel);
    [Q.red, Q.blue, Q.green].forEach((c, i) => k.cyl([-0.3 + i * 0.15, -0.025, 0.048], 0.008, 0.12, c, { axis: 'x', seg: 6 }));
    k.card([0, -0.012, 0.55], 1.2, 0.76, chartTex());
  } },
  'office/glass-wall': { id: 'cb-glasswall', size: [3.0, 0.36, 2.4], make(k0) {
    const k = k0.sub([0, -0.14, 0]);
    for (const x of [-1.47, -0.5, 0.5, 1.47]) k.box([x - 0.03, -0.04, 0], [x + 0.03, 0.04, 2.4], Q.steel);
    k.box([-1.5, -0.04, 2.34], [1.5, 0.04, 2.4], Q.steel); k.box([-1.5, -0.04, 0], [1.5, 0.04, 0.06], Q.steel);
    for (const [a, b] of [[-1.44, -0.53], [-0.47, 0.47], [0.53, 1.44]]) { k.glass(k.box([a, -0.01, 0.06], [b, 0.01, 2.34], Q.glass)); k.box([a, -0.012, 1.05], [b, -0.01, 1.2], Q.sheet, { ink: false }); }
    k.box([-0.45, 0.28, 0.95], [0.45, 0.32, 1.5], Q.steelD); k.glow(k.box([-0.42, 0.275, 0.98], [0.42, 0.28, 1.47], Q.blueL), [0.22, 0.38, 0.7], 0.6);
    k.cyl([0, 0.3, 0.47], 0.03, 0.94, Q.steelD, { seg: 8 });
  } },
  'office/mug': { size: [0.12, 0.085, 0.1], make(k) {
    k.cyl([-0.0175, 0, 0.05], 0.0425, 0.1, Q.blue, { seg: 20 });
    k.cyl([-0.0175, 0, 0.1], 0.036, 0.004, Q.woodD, { seg: 20 });
    k.tor([0.026, 0, 0.05], 0.027, 0.0065, Q.blue, { axis: 'y' });
  } },
  // ------------------------------------------------------------------ supermarket
  // a plastic hand basket: solid base and rim, slatted sides (the gaps show through), two hoop handles up
  'supermarket/shopping-basket': { size: [0.45, 0.3, 0.36], make(k) {
    k.box([-0.19, -0.12, 0], [0.19, 0.12, 0.015], Q.red);
    for (const z of [0.015, 0.205]) { const g = z > 0.1 ? 1 : 0.86; for (const y of [-1, 1]) k.box([-0.225 * g, y * 0.15 * g - 0.008, z], [0.225 * g, y * 0.15 * g + 0.008, z + 0.025], Q.red); for (const x of [-1, 1]) k.box([x * 0.225 * g - 0.008, -0.15 * g, z], [x * 0.225 * g + 0.008, 0.15 * g, z + 0.025], Q.red); }
    for (let i = 0; i <= 8; i++) for (const y of [-1, 1]) { const x = -0.21 + i * 0.0525; k.tube([x * 0.86, y * 0.129, 0.03], [x, y * 0.149, 0.21], 0.009, Q.red, 4); }
    for (let i = 1; i <= 4; i++) for (const x of [-1, 1]) { const y = -0.14 + i * 0.056; k.tube([x * 0.194, y * 0.86, 0.03], [x * 0.223, y, 0.21], 0.009, Q.red, 4); }
    for (const z of [0.09, 0.15]) { const g = 0.86 + 0.14 * z / 0.21; for (const y of [-1, 1]) k.cyl([0, y * 0.15 * g, z], 0.006, 0.44 * g, Q.red, { axis: 'x', seg: 5 }); for (const x of [-1, 1]) k.cyl([x * 0.225 * g, 0, z], 0.006, 0.29 * g, Q.red, { axis: 'y', seg: 5 }); }
    for (const y of [-0.035, 0.035]) { for (const x of [-1, 1]) k.tube([x * 0.215, y * 3, 0.215], [x * 0.1, y, 0.35], 0.007, Q.steelD, 6); k.cyl([0, y, 0.35], 0.01, 0.21, Q.steelD, { axis: 'x', seg: 8 }); }
  } },
  'supermarket/shop-trolley': { id: 'cb-shoptrolley', size: [0.55, 1.0, 1.0], make(k) {
    for (const x of [-0.22, 0.22]) for (const y of [-0.4, 0.4]) { k.cyl([x, y, 0.29], 0.012, 0.42, Q.chrome, { seg: 6 }); k.wheel(x, y, 0.04, 'x'); }
    k.box([-0.22, -0.4, 0.15], [0.22, 0.4, 0.17], Q.chrome);
    k.box([-0.25, -0.45, 0.5], [0.25, 0.45, 0.52], Q.chrome);
    for (const z of [0.52, 0.7, 0.9]) { for (const x of [-0.25, 0.25]) k.cyl([x, 0, z], 0.007, 0.9, Q.chrome, { axis: 'y', seg: 5 }); for (const y of [-0.45, 0.45]) k.cyl([0, y, z], 0.007, 0.5, Q.chrome, { axis: 'x', seg: 5 }); }
    for (let i = 0; i <= 8; i++) for (const x of [-0.25, 0.25]) k.cyl([x, -0.45 + i * 0.1125, 0.71], 0.005, 0.38, Q.chrome, { seg: 4 });
    for (let i = 0; i <= 4; i++) for (const y of [-0.45, 0.45]) k.cyl([-0.25 + i * 0.125, y, 0.71], 0.005, 0.38, Q.chrome, { seg: 4 });
    for (const x of [-0.24, 0.24]) k.tube([x, 0.45, 0.9], [x, 0.5, 0.97], 0.01, Q.chrome);
    k.cyl([0, 0.5, 0.97], 0.02, 0.52, Q.red, { axis: 'x', seg: 8 });
  } },
  'supermarket/checkout-belt': { id: 'cb-checkoutbelt', size: [0.5, 2.0, 0.9], make(k) {
    k.box([-0.25, -1.0, 0], [0.25, 1.0, 0.8], Q.cream); k.box([-0.255, -1.0, 0], [0.255, 1.0, 0.08], Q.steelD);
    k.box([-0.22, -0.95, 0.8], [0.22, 0.55, 0.82], Q.rubber);
    for (const y of [-0.95, 0.55]) k.cyl([0, y, 0.81], 0.02, 0.44, Q.chrome, { axis: 'x', seg: 8 });
    k.box([-0.2, -0.3, 0.82], [0.2, -0.28, 0.87], Q.red);
    k.box([-0.22, 0.6, 0.8], [0.22, 0.98, 0.84], Q.steelD); k.box([-0.18, 0.7, 0.84], [0.18, 0.95, 0.87], Q.steelD);
    k.box([-0.1, 0.9, 0.84], [0.1, 0.96, 0.9], Q.screen); k.glow(k.box([-0.08, 0.895, 0.85], [0.08, 0.9, 0.89], Q.green), [0.25, 0.7, 0.35], 0.5);
  } },
  'supermarket/glass-cabinet': { id: 'cb-glasscabinet', size: [1.0, 0.9, 1.8], make(k0) {
    const k = k0.sub([0, 0.2, 0]);
    k.box([-0.5, 0.2, 0], [0.5, 0.25, 1.8], Q.woodD);
    for (const x of [-0.48, 0.48]) k.box([x - 0.02, -0.25, 0], [x + 0.02, 0.2, 1.8], Q.woodD);
    k.box([-0.46, -0.25, 0], [0.46, 0.2, 0.1], Q.woodD); k.box([-0.46, -0.25, 1.75], [0.46, 0.2, 1.8], Q.woodD);
    for (const z of [0.55, 1.15]) k.box([-0.46, -0.22, z], [0.46, 0.2, z + 0.02], Q.woodL);
    for (const z of [0.1, 0.57, 1.17]) for (let i = 0; i < 6; i++) k.cyl([-0.38 + i * 0.152, -0.02, z + 0.06], 0.045, 0.12, [Q.yellow, Q.blueL, Q.pink][i % 3], { seg: 10 });
    const d = k.sub([-0.48, -0.25, 0], -25); d.glass(d.box([0, -0.02, 0.1], [0.95, 0, 1.75], Q.glass)); d.box([0, -0.025, 0.1], [0.03, 0.005, 1.75], Q.chrome);
    d.box([0.86, -0.05, 0.85], [0.92, -0.02, 0.95], Q.yellow);
  } },
  'supermarket/nappy-stack': { id: 'cb-nappystack', size: [1.0, 0.95, 1.4], make(k) {
    k.box([-0.5, -0.4, 0], [0.5, 0.4, 0.15], Q.cream);
    for (let l = 0; l < 4; l++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      if (l === 3 && i === 1 && j === 0) continue;
      k.box([-0.48 + i * 0.32, -0.38 + j * 0.38, 0.15 + l * 0.25], [-0.18 + i * 0.32, -0.02 + j * 0.38, 0.39 + l * 0.25], (i + j + l) % 2 ? Q.blueL : Q.sheet);
    }
    k.tilt(k.box([-0.15, 0.05, 1.18], [0.15, 0.35, 1.38], Q.blueL), 'y', 14);
    k.tilt(k.box([0.2, -0.33, 1.15], [0.46, -0.05, 1.35], Q.sheet), 'z', 20);
    k.tilt(k.box([-0.3, -0.55, 0], [0.0, -0.4, 0.22], Q.blueL), 'z', -18);
  } },
  'supermarket/shelf-stocked': { size: [2.0, 0.5, 1.8], make(k) { gondola(k, 2.0, 11); } },
  'supermarket/shelf-end-cap': { size: [1.0, 0.5, 1.8], make(k) { gondola(k, 1.0, 29); } },
  // ------------------------------------------------------------------ kitchen / home
  // a wire dish rack on a drip tray, five plates on edge (faces to +-x) and a mug upside down in the corner
  'kitchen-home/dishrack': { size: [0.45, 0.3, 0.26], make(k) {
    k.box([-0.225, -0.15, 0], [0.225, 0.15, 0.025], Q.plastic);
    for (const y of [-0.12, 0.12]) for (const z of [0.04, 0.15]) k.cyl([0, y, z], 0.004, 0.42, Q.chrome, { axis: 'x', seg: 5 });
    for (const x of [-0.21, 0.21]) for (const y of [-0.12, 0.12]) k.cyl([x, y, 0.09], 0.004, 0.12, Q.chrome, { seg: 5 });
    for (let i = 0; i < 12; i++) for (const y of [-0.06, 0.06]) k.cyl([-0.18 + i * 0.03, y, 0.075], 0.003, 0.07, Q.chrome, { seg: 4 });
    [-0.16, -0.1, -0.04, 0.02, 0.08].forEach((x, i) => k.tilt(k.cyl([x, 0, 0.145], 0.11, 0.012, i % 2 ? Q.blueL : Q.off, { axis: 'x', seg: 18 }), 'y', 8));
    k.cyl([0.165, 0.07, 0.07], 0.04, 0.09, Q.red, { seg: 12 }); k.tor([0.205, 0.07, 0.07], 0.025, 0.006, Q.red);
  } },
  'kitchen-home/high-chair': { id: 'cb-highchair', size: [0.5, 0.55, 0.9], make(k) {
    for (const x of [-1, 1]) for (const y of [-1, 1]) k.tube([x * 0.23, y * 0.23, 0], [x * 0.13, y * 0.13, 0.56], 0.016, Q.chrome);
    k.box([-0.16, -0.16, 0.55], [0.16, 0.16, 0.6], Q.mint);
    k.box([-0.15, 0.12, 0.6], [0.15, 0.16, 0.9], Q.mint);
    for (const x of [-0.15, 0.15]) k.box([x - 0.015, -0.16, 0.6], [x + 0.015, 0.12, 0.7], Q.mint);
    k.box([-0.2, -0.32, 0.7], [0.2, -0.06, 0.73], Q.off);
    k.box([-0.12, -0.24, 0.24], [0.12, -0.17, 0.26], Q.mint);
  } },
  'kitchen-home/steriliser': { id: 'cb-steriliser', size: [0.3, 0.3, 0.25], make(k) {
    k.box([-0.15, -0.15, 0], [0.15, 0.15, 0.17], Q.plastic);
    for (const [x, y] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) { k.glass(k.cyl([x, y, 0.15], 0.03, 0.12, Q.glass, { seg: 10 })); k.cone([x, y, 0.23], 0.018, 0.04, Q.yellow, { seg: 8 }); }
    k.glass(k.tilt(k.box([-0.13, -0.15, 0.17], [0.17, 0.15, 0.19], Q.glass), 'y', 6));
    k.cyl([0.02, 0.155, 0.05], 0.012, 0.03, Q.steelD, { axis: 'y', seg: 6 });
  } },
  'kitchen-home/bottle-rack': { id: 'cb-bottlerack', size: [0.4, 0.3, 0.35], make(k) {
    k.box([-0.2, -0.15, 0], [0.2, 0.15, 0.03], Q.plastic);
    for (const x of [-0.12, 0, 0.12]) for (const y of [-0.06, 0.06]) k.cyl([x, y, 0.18], 0.008, 0.3, Q.plastic, { seg: 6 });
    for (const [x, y, c] of [[-0.12, -0.06, Q.blueL], [0.12, -0.06, Q.pink], [0, 0.06, Q.mint]]) {
      k.glass(k.cyl([x, y, 0.29], 0.03, 0.12, Q.glass, { seg: 10 })); k.tor([x, y, 0.235], 0.03, 0.006, c, { axis: 'z' });
      const n = k.cone([x, y, 0.21], 0.016, 0.03, Q.yellow, { seg: 8 }); n.rotation.x = Math.PI;
    }
    k.tor([0.12, 0.06, 0.035], 0.03, 0.005, Q.pink, { axis: 'z' });
  } },
  'kitchen-home/calendar': { id: 'cb-calendar', size: [0.3, 0.02, 0.4], wall: true, make(k) {
    k.box([-0.15, 0, 0], [0.15, 0.01, 0.4], Q.cream);
    k.box([-0.15, -0.004, 0.32], [0.15, 0, 0.4], Q.red);
    k.card([0, -0.005, 0.155], 0.27, 0.27, monthTex());
    k.cyl([0, -0.006, 0.395], 0.006, 0.006, Q.steelD, { axis: 'y', seg: 6 });
  } },
  'kitchen-home/tv': { size: [1.0, 0.2, 0.65], make(k) {
    k.box([-0.2, -0.1, 0], [0.2, 0.1, 0.02], Q.steelD); k.box([-0.04, -0.01, 0.02], [0.04, 0.03, 0.08], Q.steelD);
    k.box([-0.5, -0.025, 0.08], [0.5, 0.025, 0.65], Q.steelD);
    k.box([-0.48, -0.03, 0.1], [0.48, -0.025, 0.63], Q.screen, { ink: false });
    k.glow(k.box([0.44, -0.031, 0.105], [0.455, -0.03, 0.115], Q.red), [0.7, 0.12, 0.08], 0.5);
  } },
  // ------------------------------------------------------------------ lab
  'lab/eyewash': { id: 'cb-eyewash', size: [0.4, 0.32, 0.3], wall: true, make(k) {
    k.box([-0.2, 0.12, 0], [0.2, 0.15, 0.3], Q.steel);
    k.cyl([0, -0.02, 0.02], 0.03, 0.04, Q.steelD, { seg: 8 });
    k.cyl([0, -0.02, 0.08], 0.15, 0.08, Q.yellow, { r2: 0.15, seg: 18 }); k.cyl([0, -0.02, 0.071], 0.13, 0.064, Q.steelD, { seg: 18 });
    k.cyl([0, 0.05, 0.11], 0.012, 0.14, Q.chrome, { axis: 'y', seg: 6 }); k.cyl([0, -0.02, 0.11], 0.01, 0.14, Q.chrome, { axis: 'x', seg: 6 });
    for (const x of [-0.06, 0.06]) k.cone([x, -0.02, 0.135], 0.02, 0.04, Q.green, { seg: 8 });
    k.box([-0.12, 0.115, 0.19], [0.12, 0.12, 0.29], Q.green);
    k.card([0, 0.1145, 0.24], 0.22, 0.08, signTex('EYE WASH', { bg: [0.14, 0.46, 0.2], fg: [0.78, 0.78, 0.74], border: null, w: 256, h: 96 }), { lit: false });
  } },
  // a Bunsen burner: weighted foot, air collar, barrel, gas tap with its hose, the blue flame
  'lab/bunsen-burner': { size: [0.2, 0.1, 0.24], make(k0) {
    const k = k0.sub([-0.05, 0, 0]);
    k.cyl([0, 0, 0.009], 0.05, 0.018, Q.steelD, { seg: 18 }); k.cyl([0, 0, 0.028], 0.035, 0.02, Q.steelD, { r2: 0.014, seg: 18 });
    k.cyl([0, 0, 0.06], 0.016, 0.05, Q.yellow, { seg: 14 }); k.cyl([0, 0, 0.115], 0.011, 0.09, Q.chrome, { seg: 14 }); k.tor([0, 0, 0.158], 0.011, 0.003, Q.chrome, { axis: 'z' });
    k.box([-0.005, -0.0175, 0.05], [0.005, -0.0155, 0.068], Q.steelD, { ink: false });
    k.cyl([0.045, 0, 0.034], 0.006, 0.06, Q.yellow, { axis: 'x', seg: 8 }); k.box([0.045, -0.004, 0.038], [0.055, 0.004, 0.056], Q.red);
    k.tube([0.07, 0, 0.034], [0.11, 0.01, 0.012], 0.008, Q.orange); k.tube([0.11, 0.01, 0.012], [0.146, 0.02, 0.009], 0.008, Q.orange);
    k.glow(k.cone([0, 0, 0.199], 0.013, 0.078, Q.blueL, { seg: 12 }), [0.25, 0.45, 0.78], 0.6);
  } },
  'lab/incubator': { id: 'cb-incubator', size: [0.8, 0.74, 1.8], make(k) {
    for (const x of [-0.35, 0.35]) for (const y of [-0.3, 0.3]) k.box([x - 0.03, y - 0.03, 0], [x + 0.03, y + 0.03, 0.05], Q.steelD);
    for (const z0 of [0.05, 0.92]) {
      k.box([-0.4, -0.35, z0], [0.4, 0.35, z0 + 0.85], Q.off);
      k.glass(k.box([-0.33, -0.37, z0 + 0.08], [0.25, -0.35, z0 + 0.72], Q.glass));
      k.cyl([0.31, -0.375, z0 + 0.4], 0.012, 0.3, Q.chrome, { seg: 6 });
      k.box([-0.33, -0.36, z0 + 0.74], [0.0, -0.35, z0 + 0.82], Q.steelD); k.glow(k.box([-0.3, -0.365, z0 + 0.76], [-0.1, -0.36, z0 + 0.8], Q.green), [0.25, 0.7, 0.35], 0.6);
    }
  } },
  'lab/bio-cabinet': { id: 'cb-biocabinet', size: [1.2, 0.8, 2.2], make(k) {
    k.box([-0.6, -0.4, 0], [0.6, 0.4, 0.8], Q.off); k.box([-0.58, -0.405, 0.05], [0.58, -0.4, 0.75], Q.plastic, { ink: false });
    k.box([-0.6, 0.35, 0.8], [0.6, 0.4, 2.0], Q.off);
    for (const x of [-0.58, 0.58]) k.box([x - 0.02, -0.35, 0.8], [x + 0.02, 0.4, 2.0], Q.off);
    k.box([-0.6, -0.35, 1.9], [0.6, 0.4, 2.0], Q.off); k.box([-0.6, -0.36, 0.8], [0.6, 0.35, 0.85], Q.steel);
    k.glass(k.tilt(k.box([-0.56, -0.33, 1.25], [0.56, -0.31, 1.88], Q.glass), 'x', -12));
    k.cyl([0, -0.37, 1.26], 0.015, 0.9, Q.chrome, { axis: 'x', seg: 8 });
    k.glow(k.box([-0.5, -0.2, 1.86], [0.5, 0.2, 1.88], Q.sheet), [0.62, 0.66, 0.6], 0.5);
    k.box([-0.45, -0.3, 2.0], [0.45, 0.35, 2.2], Q.plastic);
  } },
  'lab/lab-bench': { id: 'cb-labbench', size: [2.0, 0.8, 1.5], make(k) {
    k.box([-1, -0.4, 0.86], [1, 0.4, 0.9], Q.resin);
    for (const s of [-1, 1]) { k.box(s < 0 ? [-0.95, -0.36, 0] : [0.35, -0.36, 0], s < 0 ? [-0.35, 0.38, 0.86] : [0.95, 0.38, 0.86], Q.blueL);
      k.box([s * 0.65 - 0.004, -0.365, 0.05], [s * 0.65 + 0.004, -0.36, 0.84], Q.steelD, { ink: false }); for (const d of [-0.05, 0.05]) k.box([s * 0.65 + d - 0.01, -0.38, 0.6], [s * 0.65 + d + 0.01, -0.365, 0.72], Q.chrome); }
    for (const x of [-0.9, 0.9]) k.box([x - 0.02, 0.28, 0.9], [x + 0.02, 0.36, 1.5], Q.steel);
    for (const z of [1.2, 1.47]) k.box([-0.92, 0.26, z], [0.92, 0.38, z + 0.03], Q.steel);
    [Q.green, Q.pink, Q.blueL, Q.yellow, Q.orange].forEach((c, i) => { const x = -0.7 + i * 0.35; k.glass(k.cyl([x, 0.32, 1.29], 0.035, 0.12, Q.glass, { seg: 10 })); k.cyl([x, 0.32, 1.265], 0.032, 0.07, c, { seg: 10 }); });
    for (const [x, c] of [[-0.5, Q.green], [-0.3, Q.pink], [0.2, Q.blueL]]) { k.cyl([x, -0.1, 0.96], 0.06, 0.12, c, { r2: 0.025, seg: 12 }); k.glass(k.cyl([x, -0.1, 1.05], 0.02, 0.06, Q.glass, { seg: 8 })); }
    k.cyl([0.6, 0.05, 0.92], 0.06, 0.04, Q.steelD, { seg: 10 }); k.cyl([0.6, 0.05, 1.0], 0.02, 0.12, Q.steel, { seg: 8 });
  } },
  'lab/gantry': { id: 'cb-gantry', size: [6.0, 0.3, 0.4], make(k) {
    for (const y of [-0.125, 0.125]) k.box([-3, y - 0.025, 0], [3, y + 0.025, 0.06], Q.steel);
    for (const x of [-2.25, -0.75, 0.75, 2.25]) { k.cyl([x, 0, 0.23], 0.015, 0.34, Q.steelD, { seg: 6 }); k.box([x - 0.03, -0.15, 0.06], [x + 0.03, 0.15, 0.08], Q.steelD); }
    [-2.6, -1.4, -0.2, 1.1, 2.0].forEach((x, i) => { k.tor([x, 0, 0.135], 0.125, 0.01, [Q.orange, Q.blue, Q.red, Q.yellow, Q.green][i]); if (i % 2 === 0) k.sph([x, -0.125, 0.07], 0.02, Q.steelD, { seg: 8 }); });
  } },
};
for (const [name, b] of Object.entries(BUILT)) b.name = name;

// a code-built prop as a bare group (no scene): the catalog places it, the tests measure it
export function builtGroup(name) {
  const b = BUILT[name]; if (!b) throw new Error(`built: no prop ${name}`);
  const g = new THREE.Group(); b.make(kit(g)); g.name = name; return g;
}
