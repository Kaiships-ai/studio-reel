// Sculpted toon hair (Kai 26/11: "everything else is detailed, hair is not"). One closed mass per head, like curls() in
// engine/cast.js, but shaped as hair grows: locks radiate from a whorl, the hairline sits on the forehead's edge so a low
// front camera sees it, lock tips scallop that edge, a parting is a groove, and a painted map (the sweater's way: grooves
// dark, a fine strand line, a light band on the lock tops) carries the detail an ink hull cannot. Rigid: it is built once
// into the head's hair group (cast.js, matrixAutoUpdate off), nothing in it moves.
//   hair: [toonHair('side', [0.28, 0.17, 0.10])]     styles: HAIR_STYLES; the colour is optional (each style has one)
// hairCap / curls / bun are untouched: old films look the same.
import * as THREE from 'three';
import { toon } from '#engine/look.js';
import { W_M, HEAD_H, HAT_LIFT, solid } from '#engine/cast.js';

const W = W_M, HA = 0.5 * W, HB = 0.5 * HEAD_H * W, DEG = Math.PI / 180;
// where no hair grows the mass tucks this far inside the head: its ink hull (solid(), pushed out 0.036 W) must stay under the
// skin. At 0.94 (curls' value) the hull came out through the skin all along the hairline: the white torn-paper fringe
const TUCK = 0.82;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const headR = d => 1 / Math.hypot(d.x / HA, d.y / HB, d.z / HA);
// a hairline height (W above the head's centre) round the head: [|lon| deg, y] with smooth steps between
const table = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * sm(T[i - 1][0], T[i][0], x); return T[T.length - 1][1]; };
const edge = ({ front, temple = front - 0.03, side = -0.02, back = -0.40 }) => [[0, front], [30, temple], [62, 0.10], [84, side], [125, back], [180, back]];
const rand = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// in W. whorl: where the locks start; locks: how many round it; clump: a lock's height over its grooves; base: the mass's
// thickness; lift: extra volume over the forehead; tips: how far the lock tips reach past the hairline; part: x of a parting
// (W, + = the figure's left); lo: the hairline round the head; sweep: the swept side's extra height; sparse: only lock crests (scalp between); ink: the ink hull's share (thin strands want a thin line); bumps: curl clumps [n, r, h, lowest y]; buns
const STYLES = {
  // a clear parting on the figure's left, the rest swept over to the right in a raised wave
  side:  { col: [0.42, 0.25, 0.12], whorl: [0.22, 0.75, -0.62], locks: 14, twist: 0.35, clump: 0.034, base: 0.030, lift: 0.050, tips: 0.050, part: 0.17, sweep: 0.055, lo: edge({ front: 0.30 }) },
  // short and tight to the skull, a short fringe, the forehead shows; dark brown, not black, so the light finds the locks
  crop:  { col: [0.32, 0.21, 0.13], whorl: [0, 0.70, -0.70], locks: 22, twist: 0.15, clump: 0.022, base: 0.016, lift: 0.016, tips: 0.040, lo: edge({ front: 0.34, temple: 0.31, side: 0.02 }) },
  // a big round crown of curl clumps, wider than the head
  curly: { col: [0.55, 0.22, 0.10], whorl: [0, 0.80, -0.60], locks: 12, twist: 0, clump: 0.006, base: 0.040, lift: 0.020, tips: 0.050, bumps: [150, 0.26, 0.026, -0.45], lo: edge({ front: 0.29, side: 0.0 }) },
  // thin grey: sparse locks round the back and sides and over the crown (scalp between them), the temples receded. The whorl
  // sits inside the neck, so the locks never meet in a knot anyone sees
  elder: { col: [0.64, 0.64, 0.68], whorl: [0, -1, -0.05], locks: 30, twist: 0, clump: 0.014, base: 0.014, lift: 0, tips: 0.040, sparse: 0.72, ink: 0.3,
           lo: [[0, 0.36], [18, 0.38], [38, 0.46], [62, 0.10], [88, -0.06], [125, -0.36], [180, -0.36]] },
  woman: { col: [0.20, 0.11, 0.06], whorl: [0, 0.75, -0.65], locks: 20, twist: 0, clump: 0.016, base: 0.022, lift: 0.018, tips: 0.014, part: 0, lo: edge({ front: 0.30, side: -0.04 }),
           buns: [{ dir: [0, 0.80, -0.60], r: 0.20, out: 0.05 }] },   // high on the back of the crown: it shows over the head from the front
  girl:  { col: [0.30, 0.17, 0.08], whorl: [0, 1, -0.25], locks: 18, twist: 0.2, clump: 0.026, base: 0.026, lift: 0.030, tips: 0.060, part: 0, lo: edge({ front: 0.21, temple: 0.20, side: -0.02 }),
           buns: [{ dir: [0.78, 0.60, -0.15], r: 0.14, out: 0.04 }, { dir: [-0.78, 0.60, -0.15], r: 0.14, out: 0.04 }] },   // two buns, one each side: a girl, not the woman
};
export const HAIR_STYLES = Object.keys(STYLES);

// locks radiate from the axis w: c = 1 on a lock's crest, 0 in the groove between two; q = the angle from w
function locksOf(w, n, twist) {
  const a = new THREE.Vector3(...w).normalize(), e1 = new THREE.Vector3(1, 0, 0).addScaledVector(a, -a.x).normalize(), e2 = a.clone().cross(e1);
  return d => { const q = Math.acos(Math.max(-1, Math.min(1, d.dot(a)))), ph = (Math.atan2(d.dot(e2), d.dot(e1)) / (2 * Math.PI) + twist * q / Math.PI) * n;
    return { c: Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ph), 0.6), ph, q }; };
}

function scalp(st) {
  const L = locksOf(st.whorl, st.locks, st.twist), r = rand(7), bumps = [];
  if (st.bumps) for (let i = 0; i < st.bumps[0]; i++) { const y = (st.bumps[3] ?? 0.25) + (1 - (st.bumps[3] ?? 0.25)) * r(), a = r() * 2 * Math.PI, s = Math.sqrt(1 - y * y); const v = new THREE.Vector3(s * Math.sin(a), y, s * Math.cos(a)); v.w = r() * 2 * Math.PI; bumps.push(v); }
  return d => {
    const rh = headR(d), y = d.y * rh / W, lon = Math.abs(Math.atan2(d.x, d.z)) / DEG, { c, ph, q } = L(d), amp = sm(0.10, 0.45, q);
    const tips = st.tips * (0.15 + 0.85 * sm(150, 70, lon));                // the nape's edge is clean, following the head
    let cover = sm(-0.02, 0.02, y - table(st.lo, lon) + tips * (c - 0.55) * amp);
    if (st.sparse) cover *= 1 - (0.85 + 0.15 * sm(0.15, 0.30, y)) * (1 - sm(st.sparse, st.sparse + 0.2, c)) * sm(0.0, 0.25, q);   // only the lock crests, scalp between them: no flat shell
    const front = sm(60, 20, lon) * Math.exp(-(((y - table(st.lo, lon)) / 0.10) ** 2));
    let t = st.base + st.lift * front + st.clump * amp * c, shade = -Math.pow(1 - c, 3) * amp + 0.12 * Math.cos(2 * Math.PI * ph * 3) * amp * c;
    if (bumps.length) {   // curl clumps packed edge to edge (cells round the nearest clump centre): each a round top, the
      // lines where two meet are valleys (concave, so the ink hull draws no ring there), painted dark, a spiral painted in each
      let f1 = 9, f2 = 9, nb = null; for (const b of bumps) { const g = Math.acos(Math.min(1, d.dot(b))); if (g < f1) { f2 = f1; f1 = g; nb = b; } else if (g < f2) f2 = g; }
      const R = st.bumps[1], h = sm(0, 0.7 * R, f2 - f1) * Math.max(0, 1 - (f1 / R) ** 2);
      const o = d.clone().addScaledVector(nb, -d.dot(nb)), e1 = new THREE.Vector3(0, 1, 0).addScaledVector(nb, -nb.y).normalize(), a = Math.atan2(o.dot(nb.clone().cross(e1)), o.dot(e1)) - nb.w;
      const arc = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * (2.2 * f1 / R + a / (2 * Math.PI))), 5) * sm(0.05, 0.25, f1 / R) * h;   // a spiral: the curl's strand
      t += st.bumps[2] * h; shade = 0.25 * shade - 0.7 * (1 - h) ** 2 - 0.8 * arc + 0.35 * h * h * (1 - arc);
    }
    if (st.sweep) t += st.sweep * sm(st.part, st.part - 0.35, d.x * rh / W) * sm(0.05, 0.35, y) * sm(-0.6, 0.2, d.z);   // the swept side stands higher
    if (st.part != null && d.y > 0.25 && d.z > -0.55) { const p = sm(0.012, 0.040, Math.abs(d.x * rh / W - st.part)); t *= 0.25 + 0.75 * p; shade = Math.min(shade, -(1 - p)); if (st.sweep) cover *= sm(0.004, 0.016, Math.abs(d.x * rh / W - st.part)); }
    shade += 0.45 * Math.exp(-(((Math.asin(d.y) / DEG - 52) / 9) ** 2)) * c * c * sm(130, 60, lon);   // the light band round the crown
    const k = cover;                                             // a soft wall: a sharp one stair-steps on the sphere grid
    return { r: rh * TUCK + (rh + t * W - rh * TUCK) * k, k, shade, ink: st.ink ?? 1 };
  };
}
// a bun: a ball wound round its own axis (the ridges coil), at `out` W past the scalp along dir
function bunField(b) {
  const L = locksOf([0, 1, 0], 5, 0.9);
  return d => { const { c } = L(d); return { r: b.r * W * (0.93 + 0.07 * c) * (1 - 0.12 * Math.abs(d.y)), shade: -Math.pow(1 - c, 3) + 0.3 * Math.exp(-(((d.y - 0.45) / 0.2) ** 2)) * c }; };
}

// one closed mesh from a field d -> { r, shade }: the sphere's uv kept for the painted map, the normals taken from the
// welded surface so the uv seam never shows in the shading
function fieldMesh(f, rgb) {
  const g = new THREE.SphereGeometry(1, 288, 192), P = g.attributes.position, d = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { d.fromBufferAttribute(P, i).normalize(); const q = f(d); P.setXYZ(i, d.x * q.r, d.y * q.r, d.z * q.r); }
  const key = i => `${P.getX(i).toFixed(5)},${P.getY(i).toFixed(5)},${P.getZ(i).toFixed(5)}`, K = Array.from({ length: P.count }, (_, i) => key(i)), N = new Map(), I = g.index;
  const v = [0, 1, 2].map(() => new THREE.Vector3()), e = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < I.count; t += 3) {
    const ix = [0, 1, 2].map(k => I.getX(t + k)); ix.forEach((j, k) => v[k].fromBufferAttribute(P, j));
    n.subVectors(v[1], v[0]).cross(e.subVectors(v[2], v[0]));           // area weighted
    for (const j of ix) { const s0 = N.get(K[j]); if (s0) s0.add(n); else N.set(K[j], n.clone()); }
  }
  const GN = g.attributes.normal; for (let i = 0; i < P.count; i++) { const s0 = N.get(K[i]).clone().normalize(); GN.setXYZ(i, s0.x, s0.y, s0.z); }
  let map = null;
  const cw = 1024, ch = 512, cv = typeof document !== 'undefined' ? document.createElement('canvas') : null, x = cv?.getContext?.('2d');
  if (cv) { cv.width = cw; cv.height = ch; }
  const im = x?.createImageData?.(cw, ch);
  if (im?.data) {                                                 // (headless tests stub the canvas: no map there)
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const th = (j + 0.5) / ch * Math.PI, phi = (i + 0.5) / cw * 2 * Math.PI, s = Math.max(-1, Math.min(1, f(d.set(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th))).shade));
      const k = s < 0 ? 1 + 0.45 * s : 1 + 0.30 * s, o = 4 * (j * cw + i);
      for (let n = 0; n < 3; n++) im.data[o + n] = Math.min(255, 255 * (rgb[n] * k + (s > 0 ? 0.06 * s : 0)));
      im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  }
  const m = solid(g, toon(map ? [1, 1, 1] : rgb, { shade: [0.82, 0.79, 0.93], sheen: 0, rough: 1, rim: 0.12, map }));
  // the ink hull goes out only where hair grows: on the hairline wall (k < 1) it stays on the wall, inside the head
  const h = m.children[0], A = h.geometry.attributes.position, HN = h.geometry.attributes.normal, T = h.geometry.attributes.inkT;
  for (let i = 0; i < A.count; i++) { d.fromBufferAttribute(A, i).normalize(); const q = f(d), k = (q.k ?? 1) * (q.ink ?? 1), back = T.getX(i) * (1 - k);
    A.setXYZ(i, A.getX(i) - HN.getX(i) * back, A.getY(i) - HN.getY(i) * back, A.getZ(i) - HN.getZ(i) * back); T.setX(i, T.getX(i) * k); }
  m.receiveShadow = false; m.userData.hairStyle = true;
  return m;
}

export function toonHair(style = 'side', col) {
  const st = STYLES[style]; if (!st) throw new Error(`toonHair: no style '${style}' (${HAIR_STYLES.join(', ')})`);
  const rgb = col || st.col;
  return () => {
    const g = new THREE.Group(); g.name = 'toonHair:' + style; g.position.y = -HAT_LIFT;   // built on the head's own centre
    g.add(fieldMesh(scalp(st), rgb));
    for (const b of st.buns || []) {
      const d = new THREE.Vector3(...b.dir).normalize(), m = fieldMesh(bunField(b), rgb);
      m.position.copy(d).multiplyScalar(headR(d) + b.out * W); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(m);
    }
    return g;
  };
}
