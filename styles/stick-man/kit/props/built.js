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
  iron: [0.10, 0.105, 0.115], ironL: [0.17, 0.175, 0.185], card: [0.50, 0.34, 0.18], gold: [0.56, 0.36, 0.09], leaf: [0.16, 0.40, 0.12],
  glass: [0.40, 0.62, 0.74], screen: [0.08, 0.10, 0.14],
};
let GLASS = null;
const glassMat = () => GLASS || (GLASS = Object.assign(toon(Q.glass, { rough: 0.2, sheen: 0.3, rim: 0.2 }), { transparent: true, opacity: 0.38, depthWrite: false }));
const D = Math.PI / 180;

// the piece-local builder: dress.js P (box, cyl, sph, cone, tor, card) plus a tube (r2: its far end) between two points, a
// turned profile (lathe [[r, z], ..] bottom outside up, over the rim and down inside), an extruded side view, glass, glow, tilt
function kit(g) {
  const p = P(g);
  return {
    ...p, g,
    tube(a, b, r, c, seg = 8, r2 = r) {
      const A = B(...a), Bv = B(...b), d = Bv.clone().sub(A), x = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, d.length(), seg), tm(c));
      x.position.copy(A).add(Bv).multiplyScalar(0.5); x.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      x.castShadow = x.receiveShadow = true; g.add(x); return x;
    },
    lathe(at, pts, c, seg = 24) { const x = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg), tm(c)); x.position.copy(B(...at)); x.castShadow = x.receiveShadow = true; g.add(x); return x; },
    // a side view [[y, z], ..] drawn w wide about x = 0, its edges rounded by `round`
    side(pts, w, c, round = 0.004) { const s = new THREE.Shape(); s.moveTo(...pts[0]); s.splineThru(pts.slice(1).map(p => new THREE.Vector2(...p))); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: w - 2 * round, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 2, curveSegments: 3 }); geo.translate(0, 0, round - w / 2);
      const x = new THREE.Mesh(geo, tm(c)); x.rotation.y = Math.PI / 2; x.castShadow = x.receiveShadow = true; g.add(x); return x; },
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

const stripeTex = () => tex('stripe', 512, 96, (x, W, H) => { x.fillStyle = css([0.72, 0.72, 0.69]); x.fillRect(0, 0, W, H); x.fillStyle = css([0.78, 0.30, 0.05]);
  for (let i = -1; i < 8; i++) { const u = i * 80; x.beginPath(); x.moveTo(u, H); x.lineTo(u + 40, H); x.lineTo(u + 40 + H, 0); x.lineTo(u + H, 0); x.fill(); } });
const landscapeTex = () => tex('landscape', 320, 224, (x, W, H) => { x.fillStyle = css([0.40, 0.56, 0.72]); x.fillRect(0, 0, W, H); x.fillStyle = css([0.78, 0.66, 0.34]); x.beginPath(); x.arc(W * 0.72, H * 0.3, H * 0.13, 0, 7); x.fill();
  for (const [c, y, pts] of [[[0.22, 0.36, 0.42], 0.6, [0.42, 0.62, 0.36, 0.58]], [[0.20, 0.42, 0.16], 0.78, [0.66, 0.58, 0.72, 0.62]], [[0.40, 0.50, 0.16], 0.9, [0.86, 0.80, 0.76, 0.84]]]) { x.fillStyle = css(c); x.beginPath(); x.moveTo(0, H); x.lineTo(0, H * y); pts.forEach((p, i) => x.lineTo(W * (i + 0.6) / 4, H * p)); x.lineTo(W, H * y); x.lineTo(W, H); x.fill(); } });

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
  'hospital/clipboard': { size: [0.24, 0.34, 0.035], make(k) {
    k.box([-0.12, -0.17, 0], [0.12, 0.17, 0.006], Q.wood); k.box([-0.105, -0.16, 0.006], [0.105, 0.125, 0.009], Q.off);
    k.box([-0.085, 0.085, 0.009], [0.02, 0.1, 0.0105], Q.blue, { ink: false }); for (let i = 0; i < 8; i++) k.box([-0.085, -0.14 + i * 0.026, 0.009], [i % 3 === 1 ? 0.04 : 0.085, -0.134 + i * 0.026, 0.0105], Q.steelD, { ink: false });
    k.box([-0.055, 0.115, 0.008], [0.055, 0.155, 0.018], Q.chrome); k.cyl([0, 0.135, 0.022], 0.012, 0.09, Q.steel, { axis: 'x', seg: 10 });
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
  // a gilt frame with a small landscape in it
  'care-home/fancy-picture-frame': { size: [0.6, 0.04, 0.46], wall: true, make(k) {
    const ring = (w, h, t, y0, y1, c) => { for (const s of [-1, 1]) { k.box([s * w / 2 - (s > 0 ? t : 0), y0, 0.23 - h / 2], [s * w / 2 + (s > 0 ? 0 : t), y1, 0.23 + h / 2], c); k.box([-w / 2, y0, 0.23 + s * h / 2 - (s > 0 ? t : 0)], [w / 2, y1, 0.23 + s * h / 2 + (s > 0 ? 0 : t)], c); } };
    ring(0.6, 0.46, 0.035, -0.02, 0.02, Q.gold); ring(0.53, 0.39, 0.025, -0.012, 0.015, Q.woodD); ring(0.48, 0.34, 0.015, -0.015, 0.015, Q.gold);
    k.box([-0.24, 0, 0.06], [0.24, 0.012, 0.4], Q.cream); k.card([0, -0.001, 0.23], 0.45, 0.31, landscapeTex());
  } },
  // ------------------------------------------------------------------ street
  // a child's velcro shoe, seen from the side as a shoe: low toe, tongue up to the ankle, heel; a white sole and toe cap, two straps
  'street/child-shoe': { id: 'cb-childshoe', size: [0.066, 0.18, 0.1], make(k) {
    k.side([[-0.078, 0.004], [-0.083, 0.010], [-0.080, 0.020], [0, 0.018], [0.074, 0.020], [0.079, 0.012], [0.076, 0.004]], 0.066, Q.off, 0.004);
    k.side([[-0.070, 0.018], [-0.078, 0.032], [-0.068, 0.047], [-0.042, 0.052], [-0.016, 0.058], [0.004, 0.070], [0.016, 0.082], [0.030, 0.080], [0.050, 0.077], [0.066, 0.084], [0.073, 0.074], [0.072, 0.045], [0.070, 0.018]], 0.058, Q.red, 0.010);
    k.side([[-0.050, 0.016], [-0.086, 0.016], [-0.0905, 0.028], [-0.084, 0.040], [-0.056, 0.038]], 0.064, Q.off, 0.004);
    const hole = k.cyl([0, 0.042, 0.089], 0.021, 0.010, Q.resin, { seg: 18 }); hole.scale.set(0.9, 1, 1.25); const ring = k.tor([0, 0.042, 0.092], 0.022, 0.005, Q.cream, { axis: 'z' }); ring.scale.set(0.95, 1.25, 1);
    for (const [y, z, d] of [[-0.036, 0.064, 13], [-0.006, 0.076, 32]]) { k.tilt(k.box([-0.0325, y - 0.009, z - 0.005], [0.0325, y + 0.009, z + 0.003], Q.cream), 'x', d); for (const x of [-0.031, 0.031]) k.tilt(k.box([x - 0.002, y - 0.009, z - 0.036], [x + 0.002, y + 0.009, z], Q.cream), 'x', d); }
    k.box([-0.009, 0.078, 0.052], [0.009, 0.086, 0.096], Q.cream);
  } },
  // a road works barricade: two striped boards on two A legs
  'street/construction-barrier': { size: [1.5, 0.56, 1.0], make(k) {
    for (const x of [-0.6, 0.6]) { for (const y of [-1, 1]) k.tube([x, y * 0.26, 0.01], [x, y * 0.035, 0.98], 0.02, Q.steelD); k.box([x - 0.02, -0.15, 0.36], [x + 0.02, 0.15, 0.4], Q.steelD); for (const y of [-0.26, 0.26]) k.box([x - 0.05, y - 0.02, 0], [x + 0.05, y + 0.02, 0.02], Q.rubber); }
    for (const [z, y] of [[0.84, 0.10], [0.54, 0.17]]) for (const s of [-1, 1]) { k.box([-0.75, s * y - 0.012, z - 0.1], [0.75, s * y + 0.012, z + 0.1], Q.off); k.card([0, s * (y + 0.0135), z], 1.48, 0.18, stripeTex(), s > 0 ? { face: '-y' } : {}); }
    for (const x of [-0.6, 0.6]) k.glow(k.cyl([x, 0, 0.98], 0.045, 0.05, Q.orange, { axis: 'y', seg: 14 }), [0.78, 0.36, 0.08], 0.5);
  } },
  // a wrapped bunch of flowers lying on its side, blooms to the front: paper cone, ribbon, stems out of the back
  'street/bouquet': { size: [0.29, 0.45, 0.26], make(k) {
    const r = rng(7), PET = [Q.pink, Q.cream, Q.red, Q.yellow, Q.pink, Q.blueL, Q.cream, Q.red, Q.pink];
    k.tube([0, 0.04, 0.045], [0, -0.13, 0.118], 0.03, Q.sheet, 10, 0.105); k.tube([0, 0.04, 0.045], [0, 0.13, 0.035], 0.03, Q.sheet, 10, 0.042);
    const bow = k.tube([0, 0.052, 0.047], [0, 0.030, 0.051], 0.036, Q.red, 10); bow.name = 'ribbon';
    for (const x of [-1, 1]) { const b = k.sph([x * 0.035, 0.035, 0.088], 0.024, Q.red, { seg: 8 }); b.scale.set(1.3, 0.6, 0.8); k.tube([x * 0.008, 0.034, 0.084], [x * 0.05, 0.09, 0.05], 0.006, Q.red, 5); }
    for (let i = 0; i < 6; i++) { const a = i * 60 * D; k.tube([0.016 * Math.cos(a), 0.12, 0.034 + 0.016 * Math.sin(a)], [0.03 * Math.cos(a), 0.215 + 0.012 * (i % 2), 0.030 + 0.016 * Math.sin(a)], 0.006, Q.leaf, 5); }
    for (let i = 0; i < 7; i++) { const a = (i * 51 + 20) * D; k.tube([0.07 * Math.cos(a), -0.11, 0.118 + 0.05 * Math.sin(a)], [0.125 * Math.cos(a), -0.185, 0.124 + 0.085 * Math.sin(a)], 0.024, Q.leaf, 5, 0.002); }
    PET.forEach((c, i) => { const a = i * 45 * D, R = i === 8 ? 0 : 0.072, x = R * Math.cos(a), z = 0.130 + R * 0.82 * Math.sin(a), y = -0.165 - (i === 8 ? 0.02 : 0) - 0.012 * r();
      for (let p = 0; p < 5; p++) { const b = (p * 72 + 40 * i) * D, s = k.sph([x + 0.02 * Math.cos(b), y, z + 0.02 * Math.sin(b)], 0.0185, c, { seg: 8, ink: false }); s.scale.set(1, 1, 0.6); }
      k.sph([x, y - 0.012, z], 0.012, i % 2 ? Q.orange : Q.yellow, { seg: 8 }); });
  } },
  // a memorial candle in a clear glass jar: wax half way up, the flame over it
  'street/candle-jar': { size: [0.085, 0.085, 0.12], make(k) {
    k.cyl([0, 0, 0.032], 0.036, 0.056, Q.cream, { seg: 20 }); k.cyl([0, 0, 0.066], 0.0025, 0.012, Q.resin, { seg: 6 });
    k.glow(k.cone([0, 0, 0.084], 0.008, 0.028, Q.yellow, { seg: 10 }), [0.78, 0.50, 0.10], 0.9);
    k.glass(k.lathe([0, 0, 0], [[0, 0], [0.038, 0], [0.041, 0.006], [0.041, 0.095], [0.036, 0.106], [0.038, 0.118]], Q.glass, 20)).name = 'glass';
    k.tor([0, 0, 0.117], 0.038, 0.003, Q.plastic, { axis: 'z' }); k.tor([0, 0, 0.005], 0.038, 0.003, Q.plastic, { axis: 'z' });
  } },
  // a food truck: the hatch, the counter and the awning on its -y side, a painted menu and a plain sign; points +x
  'street/food-truck': { size: [5.0, 2.2, 2.9], make(k) {
    for (const x of [-1.6, 1.7]) for (const y of [-0.62, 0.97]) { k.cyl([x, y, 0.38], 0.38, 0.24, Q.rubber, { axis: 'y', seg: 18 }); k.cyl([x, y + (y < 0 ? -0.125 : 0.125), 0.38], 0.19, 0.02, Q.steel, { axis: 'y', seg: 12 }); }
    k.box([-2.4, -0.68, 0.38], [2.4, 1.02, 0.55], Q.steelD);
    k.box([-2.45, -0.74, 0.55], [1.15, 1.1, 2.6], Q.teal); k.box([-2.46, -0.75, 0.55], [1.16, 1.105, 0.85], Q.cream);
    k.box([1.15, -0.7, 0.55], [1.75, 1.06, 2.2], Q.teal); k.box([1.75, -0.66, 0.55], [2.42, 1.02, 1.3], Q.teal); k.box([2.4, -0.7, 0.4], [2.5, 1.06, 0.62], Q.steelD);
    k.glass(k.tilt(k.box([1.74, -0.58, 1.34], [1.78, 0.94, 2.1], Q.glass), 'y', 0)); for (const y of [-0.705, 1.065]) k.glass(k.box([1.22, y - 0.005, 1.4], [1.68, y + 0.005, 2.05], Q.glass));
    for (const y of [-0.5, 0.86]) k.glow(k.cyl([2.42, y, 0.95], 0.1, 0.03, Q.cream, { axis: 'x', seg: 14 }), [0.74, 0.66, 0.48], 0.3);
    k.box([2.41, -0.2, 0.72], [2.43, 0.56, 1.1], Q.steel); for (const x of [-2.45, 1.0]) k.box([x - 0.02, -0.755, 0.9], [x + 0.02, -0.73, 2.55], Q.cream);
    // the hatch: a lit inside with a shelf of pots, the counter, the awning over it
    k.glow(k.box([-1.9, -0.76, 1.22], [0.5, -0.735, 2.0], Q.cream), [0.74, 0.60, 0.36], 0.25);
    k.box([-1.9, -0.775, 1.62], [0.5, -0.755, 1.66], Q.woodD); for (let i = 0; i < 6; i++) k.cyl([-1.65 + i * 0.36, -0.765, 1.73], 0.07, 0.14, [Q.red, Q.steel, Q.yellow, Q.green, Q.steel, Q.orange][i], { seg: 10 });
    for (const x of [-1.93, 0.53]) k.box([x - 0.03, -0.79, 1.18], [x + 0.03, -0.73, 2.04], Q.off); k.box([-1.96, -0.79, 2.0], [0.56, -0.73, 2.06], Q.off);
    k.box([-2.0, -1.04, 1.13], [0.6, -0.74, 1.2], Q.woodL);
    for (let i = 0; i < 9; i++) { const x = -2.05 + i * 0.3; k.tilt(k.box([x, -1.1, 2.12], [x + 0.3, -0.72, 2.15], i % 2 ? Q.off : Q.red), 'x', 26); k.box([x, -1.1, 1.94], [x + 0.3, -1.075, 2.06], i % 2 ? Q.off : Q.red); }
    k.card([-0.72, -0.752, 2.42], 2.2, 0.3, signTex('STREET FOOD', { bg: [0.74, 0.60, 0.16], fg: [0.30, 0.06, 0.04], w: 640, h: 96 }));
    k.card([0.8, -0.752, 1.5], 0.4, 0.62, signTex('MENU', { bg: [0.16, 0.18, 0.20], fg: [0.72, 0.72, 0.68], border: [0.5, 0.3, 0.12], w: 192, h: 288 }));
    k.box([-1.6, -0.2, 2.6], [-0.7, 0.5, 2.72], Q.steel); k.cyl([0.3, 0.2, 2.74], 0.16, 0.28, Q.steel, { seg: 14 }); k.cyl([0.3, 0.2, 2.88], 0.2, 0.04, Q.steelD, { seg: 14 });
    k.box([-2.47, 0.0, 0.9], [-2.45, 0.8, 2.3], Q.cream); k.box([-2.49, 0.1, 1.5], [-2.47, 0.16, 1.66], Q.steelD);
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
  'office/computer-keyboard': { size: [0.45, 0.16, 0.03], make(k) {
    k.box([-0.225, -0.08, 0], [0.225, 0.08, 0.014], Q.steelD); k.box([-0.225, 0.06, 0.014], [0.225, 0.08, 0.02], Q.steelD);
    const key = (x, y, w, c = Q.off) => k.box([x, y, 0.014], [x + w, y + 0.02, 0.026], c, { ink: false });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) key(-0.212 + i * 0.0245 + (r % 2 ? 0.004 : 0), 0.034 - r * 0.025, 0.02);
    for (let i = 0; i < 3; i++) key(-0.212 + i * 0.032, -0.072, 0.026); key(-0.113, -0.072, 0.12); for (let i = 0; i < 2; i++) key(0.015 + i * 0.032, -0.072, 0.026);
    key(0.088, 0.009, 0.034, Q.orange); for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) key(0.135 + i * 0.0265, 0.034 - r * 0.025, 0.021, Q.sheet); key(0.135, -0.072, 0.047, Q.sheet); key(0.188, -0.072, 0.021, Q.sheet);
    for (let i = 0; i < 3; i++) k.box([0.15 + i * 0.02, 0.066, 0.02], [0.16 + i * 0.02, 0.07, 0.023], Q.green, { ink: false });
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
  // a picnic cooler: blue tub, white lid with a lip, a carry handle over it, a latch in front
  'supermarket/cooler-box': { size: [0.5, 0.33, 0.39], make(k) {
    k.box([-0.215, -0.14, 0], [0.215, 0.14, 0.04], Q.blue); k.box([-0.23, -0.155, 0.04], [0.23, 0.155, 0.27], Q.blue); k.box([-0.232, -0.157, 0.2], [0.232, 0.157, 0.215], Q.off, { ink: false });
    k.box([-0.245, -0.165, 0.27], [0.245, 0.165, 0.31], Q.off); k.box([-0.21, -0.13, 0.31], [0.21, 0.13, 0.33], Q.off);
    for (const x of [-0.24, 0.24]) { k.box([x - 0.012, -0.02, 0.2], [x + 0.012, 0.02, 0.24], Q.steelD); k.tube([x, 0, 0.22], [x * 0.95, 0, 0.375], 0.01, Q.red); }
    k.cyl([0, 0, 0.375], 0.014, 0.47, Q.red, { axis: 'x', seg: 10 }); k.box([-0.03, -0.172, 0.235], [0.03, -0.155, 0.29], Q.red); k.cyl([0.17, -0.16, 0.075], 0.018, 0.02, Q.red, { axis: 'y', seg: 10 });
  } },
  // a bullet camera on a wall arm: the lens ring, its glass and the red light to the front, a short hood over them
  'supermarket/security-camera': { size: [0.16, 0.46, 0.27], wall: true, make(k) {
    k.box([-0.06, 0.205, 0], [0.06, 0.225, 0.16], Q.steel); k.tube([0, 0.205, 0.08], [0, 0.10, 0.12], 0.018, Q.steel); k.sph([0, 0.10, 0.125], 0.03, Q.steelD, { seg: 12 });
    k.box([-0.07, -0.18, 0.13], [0.07, 0.14, 0.25], Q.off); k.box([-0.08, -0.195, 0.25], [0.08, 0.13, 0.265], Q.steel);
    k.box([-0.06, -0.188, 0.14], [0.06, -0.18, 0.24], Q.resin); k.cyl([0, -0.2, 0.19], 0.046, 0.05, Q.steelD, { axis: 'y', seg: 20 }); k.cyl([0, -0.226, 0.19], 0.034, 0.006, Q.blue, { axis: 'y', seg: 20 }); k.sph([-0.01, -0.228, 0.2], 0.008, Q.sheet, { seg: 8 });
    k.glow(k.sph([0.047, -0.19, 0.152], 0.008, Q.red, { seg: 8 }), [0.72, 0.1, 0.06], 0.8);
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
  // a cast iron pan: the wall, a paler inside and a rim, a long handle to the back with its hanging hole
  'kitchen-home/pan': { size: [0.3, 0.5, 0.07], make(k0) {
    const k = k0.sub([0, -0.1, 0]);
    k.lathe([0, 0, 0], [[0, 0], [0.115, 0], [0.128, 0.008], [0.146, 0.05]], Q.iron, 28); k.lathe([0, 0, 0], [[0.142, 0.05], [0.122, 0.012], [0.112, 0.008], [0, 0.008]], Q.ironL, 28); k.tor([0, 0, 0.05], 0.144, 0.006, Q.steel, { axis: 'z' }).geometry = new THREE.TorusGeometry(0.144, 0.006, 6, 28);
    k.tube([0, 0.14, 0.044], [0, 0.325, 0.058], 0.014, Q.iron, 8, 0.011); k.tor([0, 0.328, 0.059], 0.014, 0.005, Q.ironL, { axis: 'z' }); k.box([-0.02, -0.162, 0.043], [0.02, -0.143, 0.051], Q.iron);
  } },
  // a two-slice toaster: rounded chrome shell, two slots with the toast up, the lever on its end, a dial in front
  'kitchen-home/toaster': { size: [0.32, 0.17, 0.23], make(k) {
    k.box([-0.135, -0.075, 0], [0.135, 0.075, 0.025], Q.resin); k.box([-0.14, -0.06, 0.025], [0.14, 0.06, 0.185], Q.chrome); for (const y of [-0.06, 0.06]) k.cyl([0, y, 0.165], 0.02, 0.28, Q.chrome, { axis: 'x', seg: 12 }); k.box([-0.14, -0.08, 0.025], [0.14, 0.08, 0.165], Q.chrome);
    for (const y of [-0.032, 0.032]) { k.box([-0.105, y - 0.016, 0.18], [0.105, y + 0.016, 0.1875], Q.resin, { ink: false }); k.box([-0.085, y - 0.008, 0.14], [0.085, y + 0.008, 0.225], Q.woodL); k.box([-0.075, y - 0.0085, 0.145], [0.075, y + 0.0085, 0.215], Q.cream, { ink: false }); }
    k.box([0.14, -0.008, 0.06], [0.143, 0.008, 0.16], Q.resin, { ink: false }); k.box([0.14, -0.03, 0.135], [0.165, 0.03, 0.15], Q.red);
    k.cyl([0.09, -0.083, 0.06], 0.018, 0.012, Q.resin, { axis: 'y', seg: 14 }); k.box([0.088, -0.091, 0.062], [0.092, -0.0885, 0.076], Q.red, { ink: false }); for (const z of [0.1, 0.12]) k.box([-0.11, -0.082, z], [0.03, -0.08, z + 0.006], Q.steel, { ink: false });
  } },
  // a stock pot: straight sides, a lip, a domed lid with its knob, a loop handle on each side
  'kitchen-home/stock-pot': { size: [0.36, 0.27, 0.27], make(k) {
    k.lathe([0, 0, 0], [[0, 0], [0.118, 0], [0.125, 0.008], [0.125, 0.2]], Q.steel, 28); k.lathe([0, 0, 0], [[0.133, 0.198], [0.134, 0.207], [0.12, 0.214], [0.07, 0.23], [0, 0.236]], Q.chrome, 28);
    k.cyl([0, 0, 0.242], 0.01, 0.02, Q.steelD, { seg: 10 }); k.cyl([0, 0, 0.259], 0.022, 0.016, Q.resin, { r2: 0.018, seg: 14 });
    for (const s of [-1, 1]) { for (const y of [-0.045, 0.045]) k.tube([s * 0.122, y, 0.165], [s * 0.172, y, 0.17], 0.007, Q.steelD); k.cyl([s * 0.172, 0, 0.17], 0.009, 0.1, Q.resin, { axis: 'y', seg: 8 }); }
    k.lathe([0, 0, 0], [[0.1255, 0.02], [0.1265, 0.025], [0.1255, 0.03]], Q.steelD, 28);
  } },
  // a base unit with a double door under a steel top, its bowl sunk in, a swan neck tap behind it
  'kitchen-home/kitchen-sink': { size: [0.9, 0.6, 1.15], make(k) {
    k.box([-0.43, -0.25, 0], [0.43, 0.28, 0.1], Q.steelD); k.box([-0.45, -0.28, 0.1], [0.45, 0.3, 0.7], Q.mint); k.box([-0.45, -0.28, 0.7], [0.45, -0.25, 0.84], Q.mint); k.box([-0.45, 0.2, 0.7], [0.45, 0.3, 0.84], Q.mint); for (const x of [-0.44, 0.44]) k.box([x - 0.01, -0.28, 0.7], [x + 0.01, 0.3, 0.84], Q.mint);
    for (const s of [-1, 1]) { k.box(s < 0 ? [-0.43, -0.295, 0.13] : [0.01, -0.295, 0.13], s < 0 ? [-0.01, -0.28, 0.8] : [0.43, -0.28, 0.8], Q.sheet); k.box([s * 0.06 - 0.008, -0.315, 0.58], [s * 0.06 + 0.008, -0.295, 0.72], Q.chrome); }
    for (const [lo, hi] of [[[-0.45, -0.3, 0.84], [0.45, -0.19, 0.88]], [[-0.45, 0.17, 0.84], [0.45, 0.3, 0.88]], [[-0.45, -0.19, 0.84], [-0.34, 0.17, 0.88]], [[0.12, -0.19, 0.84], [0.45, 0.17, 0.88]]]) k.box(lo, hi, Q.chrome);
    k.box([-0.34, -0.19, 0.7], [0.12, 0.17, 0.712], Q.steel); for (const [lo, hi] of [[[-0.34, 0.165, 0.712], [0.12, 0.17, 0.88]], [[-0.34, -0.19, 0.712], [-0.335, 0.17, 0.88]], [[0.115, -0.19, 0.712], [0.12, 0.17, 0.88]]]) k.box(lo, hi, Q.steelD); k.cyl([-0.11, 0, 0.714], 0.03, 0.006, Q.resin, { seg: 14 });
    for (let i = 0; i < 5; i++) k.box([0.18 + i * 0.05, -0.15, 0.88], [0.195 + i * 0.05, 0.14, 0.886], Q.steel, { ink: false });
    k.cyl([-0.11, 0.23, 0.9], 0.03, 0.05, Q.steelD, { seg: 14 }); k.cyl([-0.11, 0.23, 1.0], 0.014, 0.2, Q.steel, { seg: 10 });
    const arc = Array.from({ length: 7 }, (_, i) => [-0.11, 0.16 + 0.07 * Math.cos(i * 30 * D), 1.08 + 0.07 * Math.sin(i * 30 * D)]); for (let i = 0; i < 6; i++) k.tube(arc[i], arc[i + 1], 0.014, Q.steel, 10); k.cyl([-0.11, 0.09, 1.055], 0.015, 0.05, Q.steel, { seg: 10 });
    k.box([-0.06, 0.215, 0.92], [0.0, 0.235, 0.935], Q.red); k.box([-0.22, 0.215, 0.92], [-0.16, 0.235, 0.935], Q.blue);
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
    k.cyl([0.02, -0.155, 0.06], 0.022, 0.03, Q.steelD, { axis: 'y', seg: 12 }); k.glow(k.sph([-0.06, -0.152, 0.06], 0.01, Q.red, { seg: 8 }), [0.72, 0.1, 0.06], 0.6);
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
  // ------------------------------------------------------------------ misc
  // a closed carton: taped seam, two flaps that lift a little, a label and arrows on the front
  'misc/cardboard-box': { size: [0.5, 0.4, 0.36], make(k) {
    k.box([-0.25, -0.2, 0], [0.25, 0.2, 0.34], Q.card); for (const s of [-1, 1]) k.tilt(k.box([-0.25, s * 0.1 - 0.097, 0.345], [0.25, s * 0.1 + 0.097, 0.353], Q.woodL), 'x', -s * 3);
    k.box([-0.252, -0.03, 0.355], [0.252, 0.03, 0.362], Q.cream); for (const x of [-0.2515, 0.2515]) k.box([x - 0.0015, -0.03, 0.22], [x + 0.0015, 0.03, 0.36], Q.cream);
    k.box([0.05, -0.2025, 0.06], [0.2, -0.2, 0.16], Q.off); for (const z of [0.085, 0.11, 0.135]) k.box([0.065, -0.204, z], [z > 0.12 ? 0.13 : 0.185, -0.2025, z + 0.01], Q.steelD, { ink: false });
    for (const x of [-0.16, -0.09]) { k.box([x - 0.008, -0.203, 0.2], [x + 0.008, -0.2, 0.26], Q.woodD, { ink: false }); k.tilt(k.box([x - 0.028, -0.2035, 0.235], [x + 0.004, -0.2005, 0.248], Q.woodD, { ink: false }), 'y', -45); k.tilt(k.box([x - 0.004, -0.2035, 0.235], [x + 0.028, -0.2005, 0.248], Q.woodD, { ink: false }), 'y', 45); }
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
