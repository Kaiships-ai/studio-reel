// The parts of a costume that move (Kai 25/11: cloth only where it moves): a coat's skirts, a skirt, an apron, a scarf's
// ends. Each is a grid of particles on kit/cast/cloth.js whose top row is sewn to the torso.
// What hangs below the waist is built round the legs first and simulated second. Every pose, the garment's shape is laid out
// as a surface (the guide): rings round both legs, from the waist down the line midway between the thighs and the shins.
//   standing   each ring is the garment's own ellipse, opened where a leg swings past it
//   a thigh up the rings turn with it and go flat, wide over the lap and close over and under the thighs; past the knee the
//              cloth hangs from the knee. What was flattened stays flattened further down
//   every column keeps its own length down the surface (the back goes the long way round the seat, so its hem rises), and no
//   point is inside a solid of the set (a chair's seat), a leg or an arm
// The simulation adds only lag and swing: a particle is drawn to its place on the guide, never strays far from it, the
// cloth resists stretch (not the folds a smaller ring would make), and leaves a limb or a solid the one way its place on the
// guide says: out from the garment's middle for a leg, in towards it for an arm or a hand, up off a seat.
// (The first build let thin leg lines shove a free-hanging tube of particles: points either side of a thigh went opposite
// ways, a seated skirt crumpled into a rag and its corners came out of the chair.)
// Drawn as a thin closed shell (outer face, darker inside, edges) with the cast's ink hull, which also runs round the hem and
// the open edges. PHYS.on: stepped from S.face (it carries the frame number, as the hoodie's cords are); a frame that does not
// follow the last one, or a body that jumps (cloth.js bodyJump), starts at rest on the guide and settles, so the same frame always gives the same
// picture. PHYS off, or before any step: the guide itself.
import * as THREE from 'three';
import { W_M } from '#engine/cast.js';
import { css } from '#engine/look.js';
import { PHYS } from '#engine/body.js';
import { Cloth, bodyJump } from './cloth.js';
import { at, wearMat, bendTorso, HULL_MAT } from './wear.js';

const W = W_M, SUB = 5, PRE = 10, LIMB_R = 0.046 * W / 2, HAND_R = 0.030;
export const LEG_CLEAR = LIMB_R + 0.024, ARM_CLEAR = 0.027, HAND_CLEAR = HAND_R + 0.008, SOLID_CLEAR = 0.008, ARM_PUSH = 0.035, LEG_KEEP = LIMB_R + 0.015;   // (the guide stands LEG_CLEAR off a leg; the simulation may come as near as LEG_KEEP)
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ the guide
// o: { y (where it is sewn, body m), len, span (half angle, rad; pi = all round), gap(u) (rad, the front opening's half
// angle), cols, rows, d (off the shell at the top), flare, lap }
// columns: the angle of column j (0 = the front) at u (0 top .. 1 hem)
const DS = 0.012, TENT = 0.8, HEM = [0.150, 0.200];   // a hem is wide enough for a stride whatever the girth (a thin body's tube was torn by its own knees)
export class Guide {
  constructor(F, o) {
    Object.assign(this, { F, flare: 0.1, gap: null, span: Math.PI, lap: 0.040, d: 0.006, ...o });
    this.wrap = this.span >= Math.PI - 1e-6 && !this.gap; this.nc = this.wrap ? this.cols : this.cols + 1;
    this.top = []; for (let j = 0; j < this.nc; j++) this.top.push(at(F, this.phi(j, 0), this.y, this.d, V()).clone());
    this.A0 = Math.max(...this.top.map(q => Math.abs(q.x))); this.B0 = Math.max(...this.top.map(q => Math.abs(q.z)));
    if (this.span < Math.PI) { this.A0 = at(F, Math.PI / 2, this.y, this.d, V()).x; this.B0 = at(F, 0, this.y, this.d, V()).z; }
    this.hx = 0.084 * F.girth; this.K = Math.ceil((this.len + this.B0 + 0.14) / DS);
    // the rest shape: legs straight down
    const down = x => [V(x, this.y, 0), V(x, 0.024, 0), V(x * 1.25, 0.024 - 1.2, 0)];
    this.rowLen = null; const rest = this.solve({ L: down(-this.hx), R: down(this.hx), side: V(1, 0, 0), up: V(0, 1, 0), top: this.top, bound: null }, true);
    this.rest = rest.P;
  }
  phi(j, u) {
    const f = j / this.cols;
    if (this.wrap) return -Math.PI + 2 * Math.PI * f;
    if (this.gap) { const g = this.gap(u); return g + (2 * Math.PI - 2 * g) * f; }
    return -this.span + 2 * this.span * f;
  }
  // a leg's line from the waist down, sampled every DS m and rounded at its corners
  line(pts, round = true) {
    const out = []; let seg = 0, left = 0; const p = pts.map(q => q.clone());
    p.push(p[p.length - 1].clone().addScaledVector(p[p.length - 1].clone().sub(p[p.length - 2]).normalize(), 1));
    for (let k = 0; k <= this.K; k++) { let s = k * DS - left; while (seg + 2 < p.length && s > p[seg].distanceTo(p[seg + 1])) { left += p[seg].distanceTo(p[seg + 1]); seg++; s = k * DS - left; }
      const L = p[seg].distanceTo(p[seg + 1]) || 1e-6; out.push(p[seg].clone().lerp(p[seg + 1], s / L)); }
    for (let pass = 0; round && pass < 2; pass++) { const q = out.map(v => v.clone()), n = out.length, w = 3;
      for (let i = 1; i < n; i++) { const a = V(); let c = 0; for (let j = -w; j <= w; j++) { const k = i + j; a.add(k < 0 ? V().copy(q[0]).addScaledVector(V().subVectors(q[1], q[0]), k) : q[Math.min(n - 1, k)]); c++; } out[i].copy(a).divideScalar(c); } }
    return out;
  }
  // { L, R (root m: waist, hip, knee, ankle), side (the pelvis's sideways axis), top (the sewn row as posed), push(p) (off a solid) } ->
  // { P (rows x cols points), O (each point's way out of the garment) }
  solve({ L, R, side, top, push = null }, first = false) {
    const l = this.line(L), r = this.line(R), l0 = this.line(L, false), r0 = this.line(R, false), n = l.length, m = l.map((q, i) => q.clone().lerp(r[i], 0.5)), rings = [];
    let mu = 0;
    for (let k = 0; k < n; k++) {
      const t = m[Math.min(n - 1, k + 1)].clone().sub(m[Math.max(0, k - 1)]).normalize(), X = side.clone().addScaledVector(t, -side.dot(t)).normalize(), N = t.clone().cross(X);
      const s = k * DS, u = Math.min(1, s / this.len); mu = Math.max(mu, sstep(0.22, 0.8, 1 + t.y));
      const a0 = Math.max(this.A0 * (1 + this.flare * u), this.A0 + (HEM[0] - this.A0) * u), b0 = Math.max(this.B0 * (1 + this.flare * u), this.B0 + (HEM[1] - this.B0) * u), half = 0.5 * Math.abs(r[k].clone().sub(l[k]).dot(X));
      const per = 2 * Math.PI * Math.sqrt((a0 * a0 + b0 * b0) / 2), flatA = this.span < Math.PI ? 0.80 * (this.span / Math.PI) * per / 2 / Math.sin(Math.min(Math.PI / 2, this.span)) : Math.max(half + LEG_CLEAR + 0.012, 0.86 * per / 4 - this.lap * 0.6);
      const ease = sstep(0, 0.05, s), q = mu * ease;
      rings.push({ m: m[k], t, X, N, A: a0 + (flatA - a0) * q, Bf: b0 + (this.lap - b0) * q, Bb: b0 + (this.lap * 0.9 - b0) * q, u, ease, q });
    }
    const P = new Array(this.rows * this.nc), O = new Array(this.rows * this.nc), nc = this.nc, v = V(), d = V(), e = V(), rows = this.rows;
    // every ring's points, the way out of the garment at each (square to the ring: a flat lap's is up or down, its edges'
    // sideways) and how far out a leg standing in the ring pushes it
    const Q = [], WAY = [], need = new Float64Array(n * nc);
    for (let k = 0; k < n; k++) { const g = rings[k]; for (let j = 0; j < nc; j++) {
      const ph = this.phi(j, g.u), c = Math.cos(ph), B = c > 0 ? g.Bf : g.Bb, q = V().copy(g.m).addScaledVector(g.X, g.A * Math.sin(ph)).addScaledVector(g.N, B * c), w = V().addScaledVector(g.X, Math.sin(ph) / g.A).addScaledVector(g.N, c / B).normalize(); let h = 0;
      for (const leg of [l0, r0]) for (let i = Math.max(0, k - 6); i <= Math.min(n - 1, k + 6); i++) { e.subVectors(q, leg[i]); const a = e.dot(w), s2 = e.lengthSq() - a * a; if (s2 < LEG_CLEAR ** 2) h = Math.max(h, -a + Math.sqrt(LEG_CLEAR ** 2 - s2)); }
      Q.push(q); WAY.push(w); need[k * nc + j] = h * g.ease; } }
    // cloth tents over a knee: what one point is pushed out, the points round it follow on a slope (a push on its own stood up
    // like a post between two columns)
    for (let sweep = 0; sweep < 2; sweep++) for (const dir of [1, -1]) for (let a = 0; a < n * nc; a++) { const i = dir > 0 ? a : n * nc - 1 - a, k = Math.floor(i / nc), j = i % nc;
      for (const [kk, jj] of [[k, j - dir], [k - dir, j]]) { if (kk < 0 || kk >= n) continue; let x = jj; if (x < 0 || x >= nc) { if (!this.wrap) continue; x = (x + nc) % nc; } const o = kk * nc + x, t = need[o] - TENT * Q[o].distanceTo(Q[i]); if (t > need[i]) need[i] = t; } }
    if (first) this.rowLen = [];
    for (let j = 0; j < nc; j++) {
      const path = [top[j].clone()], way = [V().subVectors(top[j], rings[0].m).normalize()];
      for (let k = 2; k < n; k++) {
        const g = rings[k], i = k * nc + j, w = WAY[i]; v.copy(Q[i]).addScaledVector(w, need[i]); v.y -= 0.05 * g.q * Math.sin(this.phi(j, g.u)) ** 2;   // its sides fall off the thighs (onto the seat, if there is one)
        if (push) push(v); if (d.subVectors(v, path[path.length - 1]).dot(g.t) <= DS * 0.2) continue;       // never back up the garment: a fold at the crease is stepped over
        path.push(v.clone()); way.push(w);
      }
      // the column's own length down the surface
      const cum = [0]; for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + path[k].distanceTo(path[k - 1]));
      if (first) this.rowLen.push(Array.from({ length: rows }, (_, i) => this.len * i / (rows - 1)));
      for (let i = 0; i < rows; i++) { const s = this.rowLen[j][i]; let k = 0; while (k + 2 < path.length && cum[k + 1] < s) k++; const f = Math.min(1.5, (s - cum[k]) / Math.max(1e-6, cum[k + 1] - cum[k]));
        const id = i * nc + j; P[id] = path[k].clone().lerp(path[k + 1], f); O[id] = way[k].clone().lerp(way[k + 1], Math.min(1, f)).normalize(); }
    }
    // a ring is smooth round itself: a point stepped over a crease is drawn to its neighbours
    for (let pass = 0; pass < 1; pass++) for (let i = 1; i < rows; i++) { const row = Array.from({ length: nc }, (_, j) => P[i * nc + j].clone());
      for (let j = 0; j < nc; j++) { if (!this.wrap && (j === 0 || j === nc - 1)) continue; P[i * nc + j].lerp(row[(j + 1) % nc].clone().add(row[(j - 1 + nc) % nc]).multiplyScalar(0.5), 0.25); } }
    return { P, O };
  }
}
// a narrow strip lying down the chest (a scarf's end)
export function stripRest(F, { th, y, len, width, rows = 8, d = 0.014, lean = 0 }) {
  const P = [], v = V(); for (let i = 0; i < rows; i++) { const yy = y - len * i / (rows - 1); for (const s of [-0.5, 0, 0.5]) { at(F, th + lean * i / rows + s * width / (0.17 * F.gx), yy, d, v); P.push(v.clone()); } }
  return { P, rows, cols: 3 };
}

// ------------------------------------------------------------------ the drawn shell
// o: { rgb, inner, thick, ink, topInk (the ink at the sewn edge, 0..1), shade(u, v) -> a tone, paint(g, w, h) -> draws on the cloth
// spread flat (u across / round from the left of the front opening or the back, v down), map (a ready texture) }
const CW = 1024, CH = 256;
class Sheet {
  constructor({ rows, cols, wrap, sign, rgb, inner, thick = 0.006, ink = 0.02, topInk = 1, shade = null, paint = null, map = null }) {
    const J = wrap ? cols + 1 : cols; Object.assign(this, { rows, cols, J, wrap, sign, thick, ink });
    const N = rows * J, id = (i, j, f) => f * N + i * J + j, F = [[], []], E = [];
    for (let i = 0; i + 1 < rows; i++) for (let j = 0; j + 1 < J; j++) {
      const a = f => [id(i, j, f), id(i + 1, j, f), id(i, j + 1, f), id(i, j + 1, f), id(i + 1, j, f), id(i + 1, j + 1, f)], b = f => { const q = a(f); return [q[0], q[2], q[1], q[3], q[5], q[4]]; };
      F[0].push(...(sign > 0 ? b(0) : a(0))); F[1].push(...(sign > 0 ? a(1) : b(1)));
    }
    const edge = (a, b) => { const q = [id(...a, 0), id(...b, 0), id(...b, 1), id(...a, 1)]; E.push(q[0], q[1], q[2], q[0], q[2], q[3], q[0], q[2], q[1], q[0], q[3], q[2]); };   // seen from either side
    for (let j = 0; j + 1 < J; j++) edge([rows - 1, j], [rows - 1, j + 1]);   // (no edge at the sewn top: a line there would cut the garment in two)
    if (!wrap) for (let i = 0; i + 1 < rows; i++) { edge([i, 0], [i + 1, 0]); edge([i + 1, J - 1], [i, J - 1]); }
    const make = () => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal']) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(2 * N * 3), 3)); return g; };
    const g = make(), col = new Float32Array(2 * N * 3).fill(1), uv = new Float32Array(2 * N * 2);
    for (let f = 0; f < 2; f++) for (let i = 0; i < rows; i++) for (let j = 0; j < J; j++) { const a = j / (J - 1), b = i / (rows - 1); if (shade) col.fill(shade(a, b), 3 * id(i, j, f), 3 * id(i, j, f) + 3); uv.set([a, 1 - b], 2 * id(i, j, f)); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex([...F[0], ...E, ...F[1]]); g.addGroup(0, F[0].length + E.length, 0); g.addGroup(F[0].length + E.length, F[1].length, 1);
    if (paint) { const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const c = cv.getContext('2d'); c.fillStyle = css(rgb); c.fillRect(0, 0, CW, CH); paint(c, CW, CH); map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; }
    // (a garment is one tone with the torso it continues: it takes no cast shadow from the body above it)
    this.mesh = new THREE.Mesh(g, [wearMat(map ? [1, 1, 1] : rgb, { vc: true, map }), wearMat(inner || rgb.map(x => x * 0.5), { vc: true })]);
    this.mesh.castShadow = true; this.mesh.receiveShadow = false; this.mesh.frustumCulled = false; this.mesh.userData.noInk = true;
    const h = make(); this.T = new Float32Array(2 * N); for (let i = 0; i < rows; i++) for (let j = 0; j < J; j++) this.T[id(i, j, 0)] = ink * (topInk + (1 - topInk) * sstep(0, 1.5, i));
    h.setAttribute('inkT', new THREE.BufferAttribute(this.T, 1)); h.setIndex([...F[0], ...E, ...F[1]]); this.hull = new THREE.Mesh(h, HULL_MAT);
    this.hull.userData.noPrepass = true; this.hull.frustumCulled = false; this.hull.castShadow = false; this.mesh.add(this.hull); this.N = N;
  }
  // P: the grid's points (root metres)
  draw(P) {
    const { rows, cols, J, wrap, N, thick, sign, T, ink } = this, A = this.mesh.geometry.attributes, H = this.hull.geometry.attributes, n = V(), a = V(), b = V(), q = V(), x = V();
    const p = (i, j) => P[Math.max(0, Math.min(rows - 1, i)) * cols + (wrap ? (j + cols) % cols : Math.max(0, Math.min(cols - 1, j)))];
    for (let i = 0; i < rows; i++) for (let j = 0; j < J; j++) {
      a.subVectors(p(i, j + 1), p(i, j - 1)); b.subVectors(p(i + 1, j), p(i - 1, j)); n.crossVectors(a, b).normalize().multiplyScalar(sign);
      const k = i * J + j; q.copy(p(i, j));
      A.position.setXYZ(k, q.x + n.x * thick / 2, q.y + n.y * thick / 2, q.z + n.z * thick / 2); A.normal.setXYZ(k, n.x, n.y, n.z);
      A.position.setXYZ(N + k, q.x - n.x * thick / 2, q.y - n.y * thick / 2, q.z - n.z * thick / 2); A.normal.setXYZ(N + k, -n.x, -n.y, -n.z);
      // the hull: out by the ink, and past the hem and the open edges by 0.7 of it, so they carry a line too
      const t = T[k]; x.set(0, 0, 0); if (i === rows - 1) x.addScaledVector(b.normalize(), 0.7 * ink); if (!wrap && (j === 0 || j === J - 1)) x.addScaledVector(a.normalize(), (j ? 0.35 : -0.35) * t);
      H.position.setXYZ(k, q.x + n.x * (thick / 2 + t) + x.x, q.y + n.y * (thick / 2 + t) + x.y, q.z + n.z * (thick / 2 + t) + x.z); H.normal.setXYZ(k, n.x, n.y, n.z);
      H.position.setXYZ(N + k, q.x - n.x * thick / 2 + x.x, q.y - n.y * thick / 2 + x.y, q.z - n.z * thick / 2 + x.z); H.normal.setXYZ(N + k, -n.x, -n.y, -n.z);
    }
    for (const g of [A, H]) g.position.needsUpdate = g.normal.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the simulation
// the point of segment ab nearest p (t clamped)
const _ab = V();
function near(p, a, b, out) { _ab.subVectors(b, a); const t = Math.max(0, Math.min(1, out.subVectors(p, a).dot(_ab) / Math.max(1e-12, _ab.lengthSq()))); out.copy(a).addScaledVector(_ab, t); return t; }
// p moved along the unit way h until it stands R off the segment ab (or off the point, past an end); false if it already does
const _c = V(), _w = V(), _hh = V();
function clearOf(p, a, b, R, h) {
  const t = near(p, a, b, _c); _w.subVectors(p, _c); if (_w.lengthSq() >= R * R) return false;
  _hh.copy(h); if (t > 0 && t < 1) { _ab.subVectors(b, a).normalize(); _hh.addScaledVector(_ab, -_hh.dot(_ab)); _w.addScaledVector(_ab, -_w.dot(_ab)); }
  if (_hh.lengthSq() < 0.04) _hh.copy(_w.lengthSq() > 1e-10 ? _w : h); _hh.normalize();
  const wd = _w.dot(_hh); p.addScaledVector(_hh, -wd + Math.sqrt(Math.max(0, wd * wd - _w.lengthSq() + R * R)) + 1e-5); return true;
}
// out of a box { lo, hi } (three.js world): up when it is near its top (a seat, a floor), else by the nearest face
function outOfBox(p, b, m) {
  if (p.x <= b.lo.x - m || p.x >= b.hi.x + m || p.y <= b.lo.y - m || p.y >= b.hi.y + m || p.z <= b.lo.z - m || p.z >= b.hi.z + m) return false;
  const up = b.hi.y + m - p.y, d = [p.x - b.lo.x + m, b.hi.x + m - p.x, p.z - b.lo.z + m, b.hi.z + m - p.z], k = d.indexOf(Math.min(...d));
  if (up < 0.10 || up <= d[k]) p.y = b.hi.y + m; else if (k < 2) p.x = k ? b.hi.x + m : b.lo.x - m; else p.z = k === 3 ? b.hi.z + m : b.lo.z - m;
  return true;
}
class Drape extends Cloth {
  // cloth resists stretch; a smaller ring's slack is the folds it would make, not a push
  solve(list, s) { const x = this.x, pin = this.pin;
    for (const [i, j, r0, hi = 1.0] of list) { const dx = x[3 * j] - x[3 * i], dy = x[3 * j + 1] - x[3 * i + 1], dz = x[3 * j + 2] - x[3 * i + 2], l = Math.hypot(dx, dy, dz), r = r0 * hi; if (l <= r || l < 1e-9) continue;
      const wi = pin[i] ? 0 : 1, wj = pin[j] ? 0 : 1, ws = wi + wj; if (!ws) continue; const c = s * (l - r) / (l * ws);
      x[3 * i] += wi * c * dx; x[3 * i + 1] += wi * c * dy; x[3 * i + 2] += wi * c * dz; x[3 * j] -= wj * c * dx; x[3 * j + 1] -= wj * c * dy; x[3 * j + 2] -= wj * c * dz; } }
  collide() { const x = this.x, p = V(); for (let i = 0; i < this.n; i++) { if (this.pin[i]) continue; p.set(x[3 * i], x[3 * i + 1], x[3 * i + 2]); if (this.keepOut(p, i)) { x[3 * i] = p.x; x[3 * i + 1] = p.y; x[3 * i + 2] = p.z; } } }
}

// One moving part on the figure S. guide: a Guide (below the waist) or { strip: stripRest(...) }; o: the Sheet's plus { tether, reach, bend }
export function drape(S, part, o = {}) {
  const root = S.root, body = S.parts.torso.parent, SC = root.scale.x, G = part instanceof Guide ? part : null;
  const R0 = G ? G.rest : part.strip.P, rows = G ? G.rows : part.strip.rows, cols = G ? G.nc : part.strip.cols, wrap = !!G?.wrap, n = rows * cols, id = (i, j) => i * cols + j;
  const mid = Math.floor(cols / 2), im = Math.floor(rows / 2), q0 = R0[id(im, mid)], nn = R0[id(im, Math.min(cols - 1, mid + 1))].clone().sub(R0[id(im, mid - 1)]).cross(R0[id(Math.min(rows - 1, im + 1), mid)].clone().sub(R0[id(im - 1, mid)]));
  const sheet = new Sheet({ ...o, rows, cols, wrap, sign: nn.dot(V(q0.x, 0, q0.z)) >= 0 ? 1 : -1 }); root.add(sheet.mesh);
  const edges = [], bends = [], jw = j => (wrap ? (j + cols) % cols : j), ok = (a, b) => a < rows && a >= 0 && (wrap || (b >= 0 && b < cols));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    for (const [a, b] of [[i, j + 1], [i + 1, j]]) if (ok(a, b)) { const k = id(a, jw(b)); edges.push([id(i, j), k, SC * R0[id(i, j)].distanceTo(R0[k]), 1.02]); }
    for (const [a, b] of [[i + 1, j + 1], [i + 1, j - 1]]) if (ok(a, b)) { const k = id(a, jw(b)); edges.push([id(i, j), k, SC * R0[id(i, j)].distanceTo(R0[k]), 1.08]); }
  }
  const pin = new Uint8Array(n); for (let j = 0; j < cols; j++) pin[j] = 1;
  const C = new Drape(n, edges, bends, pin, { bend: 0, damp: o.damp ?? 0.06, iters: 6, margin: 0, tether: o.tether ?? 0.035, reach: o.reach ?? 0.035 });
  C.tw = new Float64Array(n); for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) C.tw[id(i, j)] = 1 - 0.7 * i / Math.max(1, rows - 1);
  const ST = { t: null, was: null, stepped: false }, v = V(), M = new THREE.Matrix4();
  // a point bent with the torso (body space -> root metres)
  const onBody = (p, out) => { out.copy(p).divideScalar(W); if (S.spineB) bendTorso(S.spineB, out); return out.multiplyScalar(W).applyMatrix4(M); };
  // the set's solids near the figure, in three.js world
  function boxes(RW) {
    const c = V().setFromMatrixPosition(RW), seen = new Set(), out = [];
    for (const b of [...(S.obstacles || []), ...(S.rest || [])]) { if (!b?.lo || !b.hi) continue; const lo = V(Math.min(b.lo[0], b.hi[0]), Math.min(b.lo[2], b.hi[2]), Math.min(-b.lo[1], -b.hi[1])), hi = V(Math.max(b.lo[0], b.hi[0]), Math.max(b.lo[2], b.hi[2]), Math.max(-b.lo[1], -b.hi[1]));
      const key = [...lo.toArray(), ...hi.toArray()].map(x => x.toFixed(3)).join(); if (seen.has(key) || c.x < lo.x - 1.2 || c.x > hi.x + 1.2 || c.z < lo.z - 1.2 || c.z > hi.z + 1.2 || lo.y > c.y + 1.6) continue; seen.add(key); out.push({ lo, hi }); }
    return out;
  }
  function update() {
    body.updateMatrix(); M.copy(body.matrix); root.updateMatrixWorld(true);
    const RW = root.matrixWorld.clone(), RWi = RW.clone().invert(), r = S.rig, m = q => q.clone().multiplyScalar(W), solids = boxes(RW); let P, ways = null;
    if (G) {
      const leg = (sd, sg) => [onBody(v.set(sg * G.hx, G.y, 0), V()), m(r[sd].hip), m(r[sd].knee), m(r[sd].ankle)];
      const side = V(1, 0, 0).applyQuaternion(body.quaternion), w = V(), w0 = V();
      const g = G.solve({ L: leg('L', -1), R: leg('R', 1), side, top: G.top.map(q => onBody(q, V())),
        push: solids.length ? p => { w.copy(p).applyMatrix4(RW); w0.copy(w); let hit = false; for (const b of solids) hit = outOfBox(w, b, SOLID_CLEAR) || hit; if (hit) p.copy(w).applyMatrix4(RWi); } : null });
      P = g.P; ways = g.O; ST.raw = { P: g.P.map(q => q.clone()), O: g.O };
    } else P = R0.map(q => onBody(q, V()));
    const legs = [], arms = [];
    if (r?.L?.hip) for (const sd of ['L', 'R']) { const g = r[sd], X = q => m(q).applyMatrix4(RW); legs.push([X(g.hip), X(g.knee), LEG_KEEP * SC], [X(g.knee), X(g.ankle), LEG_KEEP * SC]);
      if (g.shoulder) { const sh = X(g.shoulder), el = X(g.elbow), ha = X(g.hand), up = sh.lerp(el, 0.4), mid = el.clone().lerp(ha, 0.6); arms.push([up, el, ARM_CLEAR * SC], [el, mid, ARM_CLEAR * SC], [mid, ha, ARM_CLEAR * SC], [ha, ha, HAND_CLEAR * SC]); } }
    // a hand on a knee: there is no room between it and the leg for the cloth to stand clear of both, so it gives way to the
    // hand and lies pressed on the leg (a clip's hands grip the knees as it sits down)
    for (const a of arms) { let room = 1e9; for (const l of legs) for (let t = 0; t <= 1; t += 0.25) { const e = a[0].clone().lerp(a[1], t); near(e, l[0], l[1], _c); room = Math.min(room, e.distanceTo(_c) - l[2]); } a[2] = Math.max(0, Math.min(a[2], room)); }
    const world = P.map(q => q.clone().applyMatrix4(RW)), out = (ways || P).map(q => q.clone().transformDirection(RW));
    ST.now = { RW, RWi, P, world, out, legs, arms, solids, vols: S.vols || [] };
    // the guide itself is clear of the limbs: what the first frame, a still, or PHYS off shows
    // (a push is shared with the points round it, so a hand presses a dimple into a lap, not a spike)
    const W0 = world.map(p => p.clone()), D = world.map(() => V());
    for (let pass = 0; pass < 3; pass++) {
      world.forEach((p, i) => { if (!pin[i]) { keepOut(p, i, ST.now, 1, ST.now); D[i].subVectors(p, W0[i]); } });
      if (!D.some(q => q.lengthSq() > 4e-6) || !G) break;
      for (let sweep = 0; sweep < 2; sweep++) for (const dir of [1, -1]) for (let a = 0; a < n; a++) { const i = dir > 0 ? a : n - 1 - a, r = Math.floor(i / cols), j = i % cols; if (pin[i]) continue;
        for (const [x, y] of [[r, j - dir], [r - dir, j]]) if (ok(x, y)) { const o = id(x, jw(y)), L = D[o].length(), t = L - TENT * W0[o].distanceTo(W0[i]); if (t > 1e-4 && t > D[i].length()) D[i].copy(D[o]).multiplyScalar(t / L); } }
      world.forEach((p, i) => p.copy(W0[i]).add(D[i]));
    }
    world.forEach((p, i) => { if (!pin[i]) keepOut(p, i, ST.now, 1, ST.now); });
    ST.now.P = ST.now.world.map(p => p.clone().applyMatrix4(RWi));
    if (!PHYS.on || !ST.stepped) draw(ST.now.P);
  }
  // how far (root metres) a hand at q must move to rest on the outside of this garment instead of in it: null when it is
  // outside already. The nearest way out that is not under the garment
  function handOut(q) {
    const g = ST.raw; if (!g) return null; let best = 1e9, near_ = -1; const R = HAND_R + 0.010, d = V();
    for (let i = 0; i < n; i++) { const l = d.subVectors(q, g.P[i]).lengthSq(); if (l < best) { best = l; near_ = i; } }
    const sd = i => d.subVectors(q, g.P[i]).dot(g.O[i]), lat = i => Math.sqrt(Math.max(0, d.subVectors(q, g.P[i]).lengthSq() - sd(i) ** 2));
    if (best > 0.03 || sd(near_) >= R || lat(near_) > 0.07) return null;
    // (the ways out weighed against each other, so the hand slides from one to the next instead of jumping: 14 cm in a frame)
    const c = []; for (let i = cols; i < n; i++) { const s = sd(i), k = sstep(-0.55, 0.15, g.O[i].y) * sstep(0.065, 0.02, lat(i)); if (k > 0 && s > -0.18 && s < R) c.push([i, R - s, k]); }
    if (!c.length) return null; const b = Math.min(...c.map(x => x[1])), v = V(); let sum = 0; for (const [i, by, k] of c) { const w = k * Math.exp(-(by - b) / 0.014); v.addScaledVector(g.O[i], by * w); sum += w; }
    return sum > 1e-6 ? { v: v.divideScalar(sum), by: b } : null;
  }
  const draw = P => { ST.drawn = P; sheet.draw(P); fringe?.(P); };
  const _h = V(), _a = V(), _b = V(), _l = V();
  // a point kept off the limbs, the body (a strip on the chest) and the solids; was / now eased at u
  function keepOut(p, i, now, u, was) {
    let hit = false; const ease = (L, K, k, e, out) => out.lerpVectors(K[k] ? K[k][e] : L[k][e], L[k][e], u);
    _h.copy(now.out[i]);
    if (G) {
      // an arm or a hand stays outside the garment, a leg inside it (the leg has the last word: the cloth is between them)
      const inw = _h.clone().negate(), p0 = p.clone(); for (let k = 0; k < now.arms.length; k++) if (now.arms[k][2] > 0.004) hit = clearOf(p, ease(now.arms, was.arms, k, 0, _a), ease(now.arms, was.arms, k, 1, _b), now.arms[k][2], inw) || hit;
      const far = p.distanceTo(p0); if (far > ARM_PUSH) p.lerp(p0, 1 - ARM_PUSH / far);                    // (an arm laid along a lap presses it, it does not carve it)
      for (let k = 0; k < now.legs.length; k++) hit = clearOf(p, ease(now.legs, was.legs, k, 0, _a), ease(now.legs, was.legs, k, 1, _b), now.legs[k][2], _h) || hit;
    } else {
      for (const Vv of now.vols) { _l.copy(p).applyMatrix4(now.RWi).divideScalar(W); const h = Vv.test(_l, 0.012 / W); if (h) { p.copy(_l.addScaledVector(h.n, Math.min(h.depth, 0.08 / W)).multiplyScalar(W).applyMatrix4(now.RW)); hit = true; } }
    }
    for (const b of now.solids) hit = outOfBox(p, b, SOLID_CLEAR * SC) || hit;
    return hit;
  }
  function step(t) {
    const now = ST.now; if (!now || t === ST.t) return;
    const c0 = now.world.slice(0, cols).reduce((a, q) => a.add(q), V()).divideScalar(cols); let fresh = ST.t == null || t !== ST.t + 1 || !ST.was;
    if (!fresh) { const d = c0.clone().sub(ST.was.c0); if (bodyJump(d, ST.dPrev, 0)) fresh = true; ST.dPrev = fresh ? null : d; } else ST.dPrev = null;
    const was = fresh ? now : ST.was, tg = now.world.map(() => V()), out = [0, 0, 0];
    if (fresh) for (let k = 0; k < n; k++) C.set(k, now.world[k].toArray());
    for (let f = 0; f < (fresh ? PRE : 1); f++) for (let s = 0; s < SUB; s++) {
      const u = fresh ? 1 : (s + 1) / SUB; for (let k = 0; k < n; k++) tg[k].lerpVectors(was.world[k], now.world[k], u);
      C.keepOut = (p, i) => keepOut(p, i, now, u, was);
      C.sub(1 / (30 * SUB), k => tg[k].toArray(out), [], []);
    }
    ST.was = { world: now.world, legs: now.legs, arms: now.arms, c0 }; ST.t = t; ST.stepped = true; ST.fresh = fresh;
    draw(Array.from({ length: n }, (_, k) => V(C.x[3 * k], C.x[3 * k + 1], C.x[3 * k + 2]).applyMatrix4(now.RWi)));
  }
  const fringe = o.fringe ? makeFringe(root, rows, cols, o.fringe) : null;
  return { update, step, handOut, sheet, ST, cloth: C, rows, cols, wrap, guide: G, rest: R0, edges: edges.filter(e => e[3] < 1.05), n };
}
// a fringe: short strands of the strip's own colours hanging on from its last row
function makeFringe(root, rows, cols, { rgb, len = 0.03, n = 4 }) {
  const mat = wearMat(rgb), S = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.009, len, 0.008).translate(0, -len / 2, 0), mat), h = new THREE.Mesh(new THREE.BoxGeometry(0.018, len + 0.006, 0.016).translate(0, -len / 2 - 0.001, 0), HULL_MAT);
    h.geometry.setAttribute('inkT', new THREE.Float32BufferAttribute(new Float32Array(h.geometry.attributes.position.count).fill(0.001), 1)); h.userData.noPrepass = true; m.userData.noInk = true; m.frustumCulled = h.frustumCulled = false; m.add(h); root.add(m); return m; }), d = V(), Yd = V(0, -1, 0);
  return P => S.forEach((m, k) => { const f = (k + 0.5) / n * (cols - 1), j = Math.min(cols - 2, Math.floor(f)), a = P[(rows - 1) * cols + j].clone().lerp(P[(rows - 1) * cols + j + 1], f - j), b = P[(rows - 2) * cols + j].clone().lerp(P[(rows - 2) * cols + j + 1], f - j);
    m.position.copy(a); m.quaternion.setFromUnitVectors(Yd, d.subVectors(a, b).normalize()); });
}
