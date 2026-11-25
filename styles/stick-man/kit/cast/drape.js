// The parts of a costume that move (Kai 25/11: cloth only where it moves): a coat's skirts, a skirt, an apron, a scarf's
// ends. Each is a grid of particles on kit/cast/cloth.js whose top row is sewn to the torso.
// What hangs below the waist is built round the legs first and simulated second. Every pose, the garment's shape is laid out
// as a surface (the guide): each column of the garment hinged at its own point of the waist and turned with the thigh on its
// side (the front and the back between the two), a little slack first (a small swing stays inside the garment); past a raised
// knee it hangs; then the whole is drawn taut over the legs AS DRAWN (no edge longer than it is, no point in a leg or a seat),
// and a shin kicked back lifts the hem over it. A lap lies on the thighs, face up. (Rings round one line midway between the
// legs, the second build, put one leg through the cloth in a stride and tore it in a run.)
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

const W = W_M, SUB = 5, ARM_FROM = 5, PRE = 10, LIMB_R = 0.046 * W / 2, HAND_R = 0.030;
export const UNDER = 0.012, ARM_PUSH = 0.03, LAP_HAND = LIMB_R + 0.061, LAP_ARM = LIMB_R + 0.052, LEG_CLEAR = LIMB_R + 0.024, ARM_CLEAR = 0.027, HAND_CLEAR = HAND_R + 0.008, SOLID_CLEAR = 0.008, LEG_KEEP = LIMB_R + 0.011, SHIN_R = LIMB_R + 0.042;   // (the guide stands LEG_CLEAR off a leg; the simulation may come as near as LEG_KEEP)
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);

// ------------------------------------------------------------------ the guide
// o: { y (where it is sewn, body m), len, span (half angle, rad; pi = all round), gap(u) (rad, the front opening's half
// angle), cols, rows, d (off the shell at the top), flare }
// columns: the angle of column j (0 = the front) at u (0 top .. 1 hem)
// Each column is hinged at its own point of the waist and turned with the legs (laid), then the whole is drawn taut over the
// legs as they are drawn (taut): no edge longer than it is, no point in a leg or a solid.
//   SLACK   a thigh swinging this far (rad) only swings inside the garment: its hem does not follow
//   HIKE    legs far apart (a run, rad between them) lift the hem to this share of its length: a skirt's width stays its width
//   GATHER  an edge round the garment folds no shorter than this share of itself
//   LIFT    a lap stands this far (m) clear of raised thighs before it is drawn down onto them
const TENT = 0.8, DENT = 0.3, ITER = 22, HEM = [0.154, 0.242], SLACK = { a: 0.28, w: 0.14, all: [0.85, 1.2] }, HIKE = { to: 0.75, from: [0.72, 1.35] }, LIFT = 0.142, SAG = 0.0008, EASE = 0.35, GATHER = 0.4;   // HEM: wide enough for a stride whatever the girth (a thin body's tube was torn by its own knees)
export class Guide {
  constructor(F, o) {
    Object.assign(this, { F, flare: 0.1, gap: null, span: Math.PI, d: 0.006, hem: HEM, lift: 0, ...o });
    this.wrap = this.span >= Math.PI - 1e-6 && !this.gap; this.nc = this.wrap ? this.cols : this.cols + 1;
    this.top = Array.from({ length: this.nc }, (_, j) => at(F, this.phi(j, 0), this.y, this.d, V()).clone());
    this.A0 = at(F, Math.PI / 2, this.y, this.d, V()).x; this.B0 = at(F, 0, this.y, this.d, V()).z; this.hx = 0.084 * F.girth;
    // the rest shape: each column straight down and out to the hem, `len` long
    const { A0, B0, nc, rows, len } = this, P = this.rest = new Array(rows * nc), n = 48, wide = (a, hem, u) => Math.max(a * (1 + this.flare * u), a + (hem - a) * u);
    for (let j = 0; j < nc; j++) { const pts = Array.from({ length: n + 1 }, (_, k) => { const u = k / n, ph = this.phi(j, u); return V(wide(A0, this.hem[0], u) * Math.sin(ph), this.y - len * u, wide(B0, this.hem[1], u) * Math.cos(ph)); }), cum = [0]; pts[0].copy(this.top[j]); for (let k = 1; k <= n; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
      for (let i = 0, k = 0; i < rows; i++) { const s = len * i / (rows - 1); while (k < n - 1 && cum[k + 1] < s) k++; P[i * nc + j] = pts[k].clone().lerp(pts[k + 1], (s - cum[k]) / (cum[k + 1] - cum[k])); } }
    this.E = []; for (let i = 0; i < rows; i++) for (let j = 0; j < nc; j++) for (const [a, b, k] of [[i, j + 1, 1], [i + 1, j, 1], [i + 1, j + 1, 1.06], [i + 1, j - 1, 1.06]]) { if (a >= rows || (!this.wrap && (b < 0 || b >= nc))) continue; const x = i * nc + j, y = a * nc + (b + nc) % nc; this.E.push([x, y, k * P[x].distanceTo(P[y]), a === i || b !== j ? GATHER : 0]); }
  }
  phi(j, u) {
    const f = j / this.cols;
    if (this.wrap) return -Math.PI + 2 * Math.PI * f;
    if (this.gap) { const g = this.gap(u); return g + (2 * Math.PI - 2 * g) * f; }
    return -this.span + 2 * this.span * f;
  }
  // { L, R (root m: hip, knee, ankle), side (the pelvis's sideways axis), drawn (the two legs' drawn lines), top (the sewn row as
  // posed), push(p) (off a solid) } -> { P (rows x cols points), O (each point's way out of the garment), shin (how far each
  // shin is folded back, 0..1) }
  solve(o) {
    const F = V().crossVectors(o.side, UP).normalize(), swing = (a, b) => { const t = V().subVectors(b, a); return Math.atan2(t.dot(F), -t.y); };
    const legs = [o.L, o.R].map(([h, k, a]) => ({ hip: h, knee: k, ankle: a, thigh: swing(h, k), shin: swing(k, a), axis: V().subVectors(k, h).normalize(), long: h.distanceTo(k), F }));
    const g = this.laid(legs, o); this.taut(g, legs, o); this.eased(g); this.cleared(g, legs); g.shin = legs.map(back); return g;
  }
  laid([L, R], { side, top }) {
    const { nc, rows, rest } = this, P = [], O = [], qB = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), side), q = new THREE.Quaternion(), qq = new THREE.Quaternion(), hang = new THREE.Quaternion(), d = V(), e = V(), soft = x => SLACK.w * Math.log1p(Math.exp((x - SLACK.a) / SLACK.w));
    const turn = l => { const t = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), l.axis), a = 2 * Math.acos(Math.min(1, Math.abs(t.w))); return new THREE.Quaternion().slerp(t, a < 1e-4 ? 0 : 1 + ((soft(a) - soft(0)) / a - 1) * (1 - sstep(...SLACK.all, a))).multiply(qB); };
    const qL = turn(L), qR = turn(R), hike = 1 - (1 - HIKE.to) * sstep(...HIKE.from, Math.abs(L.thigh - R.thigh)), at_ = (k, j, v) => { const i0 = Math.min(rows - 2, Math.floor(k)); return v.copy(rest[i0 * nc + j]).lerp(rest[(i0 + 1) * nc + j], k - i0); };
    // past a raised knee the cloth hangs: straight down, or along a shin that goes forward of that
    const drop = [L, R].map(l => ({ w: sstep(0.5, 1.0, l.thigh), q: new THREE.Quaternion().setFromAxisAngle(side, -Math.max(0, Math.min(1.2, l.shin))).multiply(qB) }));
    for (let i = 0; i < rows; i++) { const u = i / (rows - 1), t = sstep(0, 0.35, u); for (let j = 0; j < nc; j++) {
      const ph = this.phi(j, u), c = Math.cos(ph), wR = sstep(-1, 1, 1.25 * Math.sin(ph)), id = i * nc + j; q.copy(qL).slerp(qR, wR); O.push(V(Math.sin(ph), 0, c).applyQuaternion(i ? q : qB));   // (off a leg it goes square to that leg, not to the cloth's own bend at the waist)
      if (!i) { P.push(top[j].clone()); continue; }
      const p = P[id - nc], past = l => sstep(-0.075, 0.02, e.subVectors(p, l.hip).dot(l.axis) - l.long), k = drop[0].w * past(L) * (1 - wR) + drop[1].w * past(R) * wR;
      qq.copy(qB).slerp(q, t); if (k > 0) { hang.copy(drop[0].q).slerp(drop[1].q, wR); qq.slerp(hang, k); O[id].lerp(e.set(Math.sin(ph), 0, c).applyQuaternion(hang), k).normalize(); }
      P.push(at_(i * hike, j, V()).sub(at_((i - 1) * hike, j, d)).applyQuaternion(qq).add(p)); } }
    // a lap lies on the thighs: the front stands clear of them from the start (below a thigh's line it would be turned out on its far side)
    for (let i = 1; i < rows; i++) for (let j = 0; j < nc; j++) { const u = i / (rows - 1), ph = this.phi(j, u), c = Math.cos(ph); if (c > 0) P[i * nc + j].addScaledVector(O[i * nc + j], Math.max(0, LIFT + this.lift - (this.y - 0.024)) * sstep(0.95, 1.4, L.thigh + (R.thigh - L.thigh) * sstep(-1, 1, 1.25 * Math.sin(ph))) * sstep(0, 0.10, u) * Math.min(1, 1.6 * c)); }
    return { P, O };
  }
  // drawn taut: out of the legs and the solids, then no row further from the one above it and no edge longer than at rest, a
  // few times over, the cloth coming down closer on the leg each time
  taut({ P, O }, legs, { push, drawn }) {
    const { rows, nc, wrap, rest, E } = this, N = P.length, d = V(), up = new Float64Array(N), near_ = new Array(N);
    const segs = drawn.flatMap((q, i) => q.slice(1).map((b, j) => ({ a: q[j], b, r: LEG_CLEAR * (j < q.length >> 1 ? 1 : 1 - back(legs[i])) }))).filter(s => s.r > 0.004);
    const out = (i, k) => { const p = P[i]; for (const s of near_[i]) clearOf(p, s.a, s.b, s.r * k, O[i]); if (push) push(p); };
    for (let it = 0; it < ITER; it++) {
      for (let i = nc; i < N; i++) if (O[i].y > 0) P[i].y -= SAG * O[i].y;        // what lies face up (a lap) comes down on what is under it
      const k = 1 - 0.28 * it / (ITER - 1), share = it % 5 === 0;
      if (share) {
        // what one point is pushed out, the points round it follow on a slope (a push of its own let the next column drop beside
        // the leg, and the edge between them went through it)
        const p0 = P.map(p => p.clone()); for (let i = nc; i < N; i++) { near_[i] = segs.filter(s => { near(P[i], s.a, s.b, _c); return _c.distanceToSquared(P[i]) < (s.r + 0.07) ** 2; }); out(i, k); up[i] = Math.max(0, d.subVectors(P[i], p0[i]).dot(O[i])); }
        const own = up.slice();
        for (let sweep = 0; sweep < 2; sweep++) for (const dir of [1, -1]) for (let a = nc; a < N; a++) { const i = dir > 0 ? a : N - 1 - a + nc, r = Math.floor(i / nc), j = i % nc; for (const [y, x] of [[r, j - dir], [r - dir, j]]) { if (y < 1 || y >= rows || (!wrap && (x < 0 || x >= nc))) continue; const o = y * nc + (x + nc) % nc; if (up[o] > up[i]) up[i] = Math.max(up[i], up[o] - TENT * p0[o].distanceTo(p0[i])); } }
        for (let i = nc; i < N; i++) if (up[i] > own[i]) P[i].addScaledVector(O[i], up[i] - own[i]);
      } else for (let i = nc; i < N; i++) out(i, k);
      for (let i = nc; i < N; i++) { const q = P[i - nc], r = rest[i].distanceTo(rest[i - nc]); d.subVectors(P[i], q); const l = d.length(); if (l > r) P[i].copy(q).addScaledVector(d, r / l); }
      for (const [a, b, r0, gather] of E) { d.subVectors(P[b], P[a]); const l = d.length(), r = l < r0 * gather ? r0 * gather : r0; if (l <= r0 && r === r0) continue; const pa = a < nc ? 0 : 1, pb = b < nc ? 0 : 1, s = (l - r) / (l * (pa + pb || 1)); if (pa) P[a].addScaledVector(d, s); if (pb) P[b].addScaledVector(d, -s); }
    }
  }
  // and eased: a crease at the waist or a corner of the hem is shared with the points round it
  eased({ P }) {
    const { rows, nc, wrap } = this, Q = P.map(p => p.clone()), d = V();
    for (let i = 1; i < rows; i++) for (let j = 0; j < nc; j++) { const edge = !wrap && (j === 0 || j === nc - 1), up = i + 1 < rows; if (edge && !up) continue; d.set(0, 0, 0); let k = 0; const add = q => { d.add(q); k++; };
      if (!edge) { add(Q[i * nc + (j + 1) % nc]); add(Q[i * nc + (j - 1 + nc) % nc]); } if (up) { add(Q[(i + 1) * nc + j]); add(Q[(i - 1) * nc + j]); } P[i * nc + j].lerp(d.divideScalar(k), EASE); }
  }
  // a hem short of a shin kicked back through it: that column is gathered up to it, its neighbours on a slope
  cleared({ P }, legs) {
    const { rows, nc, wrap } = this, long = new Float64Array(nc).fill(1), c = V(), kx = V();
    for (const l of legs) { const w = back(l); if (w <= 0) continue; const a = l.knee.clone().lerp(l.ankle, 0.25);
      for (let j = 0; j < nc; j++) { let first = -1, close = 1e9; for (let i = 1; i < rows; i++) for (let f = 0.25; f <= 1; f += 0.25) { c.copy(P[(i - 1) * nc + j]).lerp(P[i * nc + j], f); near(c, a, l.ankle, kx); const gap = kx.distanceTo(c); if (gap < SHIN_R) { if (first < 0) first = i - 1 + f; close = Math.min(close, gap); } }
        if (first > 0) long[j] = Math.min(long[j], 1 - w * sstep(0, 0.02, SHIN_R - close) * (1 - Math.max(0.52, (first - 1.2) / (rows - 1)))); } }   // (eased in as it comes near)
    if (!long.some(x => x < 1)) return;
    const L = j => long[wrap ? (j + nc) % nc : Math.max(0, Math.min(nc - 1, j))];
    for (const dir of [1, -1]) for (let a = 0; a < 2 * nc; a++) { const j = dir > 0 ? a % nc : nc - 1 - (a % nc); long[j] = Math.min(long[j], L(j - dir) + 0.045); }
    for (let pass = 0; pass < 3; pass++) { const q = long.map((x, j) => Math.min(x, (L(j - 1) + 2 * x + L(j + 1)) / 4)); long.set(q); }
    for (let j = 0; j < nc; j++) if (long[j] < 1) { const q = Array.from({ length: rows }, (_, i) => P[i * nc + j].clone()); for (let i = 1; i < rows; i++) { const s = i * long[j], k = Math.min(rows - 2, Math.floor(s)); P[i * nc + j].copy(q[k]).lerp(q[k + 1], s - k); } }
  }
}
// how far (0..1) a shin is folded back (a kick, a run): it is let out under the hem, it carries no cloth
const back = l => sstep(0.25, 1.0, -l.shin);
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

// a limb as it is drawn (the curved line, not its straight bones): its rings' centres (root metres), every `step`th
export function limbLine(mesh, from = 0, step = 2) {
  const A = mesh.geometry.attributes.position.array, n = A.length / 30, out = []; for (let i = from; i < n; i += i + step < n || i === n - 1 ? step : n - 1 - i) { const v = V(); for (let j = 0; j < 10; j++) { const k = 3 * (i * 10 + j); v.x += A[k]; v.y += A[k + 1]; v.z += A[k + 2]; } out.push(v.divideScalar(10)); if (i === n - 1) break; }
  return out;
}
const legLine = m => limbLine(m, 2, 2);
// Raised thighs with a garment over them are a solid to the arms: a lap, as wide as the cloth lies, that a hand or a forearm rests
// on. It knows nothing of the cloth's own points, so a hand slides over it and never steps. q (root m) must stand R over the
// thighs' plane: -> the move that takes it there, or null. Eased in as the thighs rise (standing, the cloth gives way to an arm
// instead), at the lap's edges, and for a hand hanging well below it.
const LAP_EDGE = 0.05, LAP_PAST = 0.07, LAP_EASE = 0.07;
export function lapOut(rig, q, R) {
  const m = v => v.clone().multiplyScalar(W), A = m(rig.L.hip), B = m(rig.R.hip), C = m(rig.R.knee), D = m(rig.L.knee), X = V().subVectors(B, A), F = V().crossVectors(X, UP).normalize(), up = (h, k) => { const t = V().subVectors(k, h); return Math.atan2(t.dot(F), -t.y); };
  const w = sstep(0.12, 0.6, Math.min(up(A, D), up(B, C))); if (w <= 0) return null;
  const H = A.clone().lerp(B, 0.5), T = C.clone().lerp(D, 0.5).sub(H), L = T.length(); T.divideScalar(L); X.addScaledVector(T, -X.dot(T)).normalize(); const N = V().crossVectors(T, X), r = V().subVectors(q, H), a = r.dot(T), x = r.dot(X), u = Math.max(0, Math.min(1, a / L));
  const x0 = V().subVectors(A, H).dot(X) * (1 - u) + V().subVectors(D, H).dot(X) * u, x1 = V().subVectors(B, H).dot(X) * (1 - u) + V().subVectors(C, H).dot(X) * u, f = Math.max(0, Math.min(1, (x - x0) / Math.max(1e-6, x1 - x0)));
  const h = r.dot(N) - u * (V().subVectors(D, H).dot(N) * (1 - f) + V().subVectors(C, H).dot(N) * f), e = Math.max(x0 - x, x - x1) - LAP_EDGE, end = Math.max(a - L - LAP_PAST, -a); if (h >= R) return null;
  const k = w * (1 - sstep(0, LAP_EASE, Math.max(e, end))) * sstep(-0.22, -0.12, h); return k > 1e-3 ? N.multiplyScalar((R - h) * k) : null;
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
  const C = new Drape(n, edges, bends, pin, { bend: 0, damp: o.damp ?? 0.06, iters: 6, margin: 0, tether: o.tether ?? 0.12, reach: o.reach ?? 0.035 });
  C.tw = new Float64Array(n); for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) C.tw[id(i, j)] = 1 - 0.7 * i / Math.max(1, rows - 1);
  const ST = { t: null, was: null, stepped: false }, M = new THREE.Matrix4();
  // a point bent with the torso (body space -> root metres)
  const onBody = (p, out) => { out.copy(p).divideScalar(W); if (S.spineB) bendTorso(S.spineB, out); return out.multiplyScalar(W).applyMatrix4(M); };
  // the set's solids near the figure, in three.js world
  function boxes(RW) {
    const c = V().setFromMatrixPosition(RW), out = [];
    for (const list of [S.obstacles, S.rest]) for (const b of list || []) { if (!b?.lo || !b.hi) continue; const x0 = Math.min(b.lo[0], b.hi[0]), x1 = Math.max(b.lo[0], b.hi[0]), z0 = Math.min(-b.lo[1], -b.hi[1]), z1 = Math.max(-b.lo[1], -b.hi[1]), y0 = Math.min(b.lo[2], b.hi[2]), y1 = Math.max(b.lo[2], b.hi[2]);
      if (c.x < x0 - 1.2 || c.x > x1 + 1.2 || c.z < z0 - 1.2 || c.z > z1 + 1.2 || y0 > c.y + 1.6 || out.some(q => Math.abs(q.lo.x - x0) + Math.abs(q.lo.y - y0) + Math.abs(q.lo.z - z0) + Math.abs(q.hi.x - x1) + Math.abs(q.hi.y - y1) + Math.abs(q.hi.z - z1) < 3e-3)) continue; out.push({ lo: V(x0, y0, z0), hi: V(x1, y1, z1) }); }
    return out;
  }
  function update() {
    body.updateMatrix(); M.copy(body.matrix); root.updateMatrixWorld(true);
    const RW = root.matrixWorld.clone(), RWi = RW.clone().invert(), r = S.rig, m = q => q.clone().multiplyScalar(W), solids = boxes(RW); let P, ways = null;
    if (G) {
      const leg = sd => [m(r[sd].hip), m(r[sd].knee), m(r[sd].ankle)];
      const side = V(1, 0, 0).applyQuaternion(body.quaternion), w = V(), w0 = V();
      const g = G.solve({ L: leg('L'), R: leg('R'), side, drawn: ['legL', 'legR'].map(k => legLine(S.parts.limbs[k])), top: G.top.map(q => onBody(q, V())),
        push: solids.length ? p => { w.copy(p).applyMatrix4(RW); w0.copy(w); let hit = false; for (const b of solids) hit = outOfBox(w, b, SOLID_CLEAR) || hit; if (hit) p.copy(w).applyMatrix4(RWi); } : null });
      P = g.P; ways = g.O; ST.raw = { P: g.P.map(q => q.clone()), O: g.O, shin: g.shin };
    } else P = R0.map(q => onBody(q, V()));
    const legs = [], arms = [];
    if (r?.L?.hip) for (const sd of ['L', 'R']) { const g = r[sd], ln = legLine(S.parts.limbs['leg' + sd]).map(q => q.applyMatrix4(RW)); ln.slice(1).forEach((b, j) => legs.push([ln[j], b, LEG_KEEP * SC * (j < ln.length >> 1 ? 1 : 1 - (ST.raw?.shin?.[sd === 'L' ? 0 : 1] ?? 0))]));
      if (g.shoulder) { const al = limbLine(S.parts.limbs['arm' + sd], ARM_FROM, 2).map(q => q.applyMatrix4(RW)), ha = al[al.length - 1]; al.slice(1).forEach((b, j) => arms.push([al[j], b, ARM_CLEAR * SC])); arms.push([ha, ha, HAND_CLEAR * SC]); } }
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
        for (const [x, y] of [[r, j - dir], [r - dir, j]]) if (ok(x, y)) { const o = id(x, jw(y)), L = D[o].length(), t = L - DENT * W0[o].distanceTo(W0[i]); if (t > 1e-4 && t > D[i].length()) D[i].copy(D[o]).multiplyScalar(t / L); } }
      world.forEach((p, i) => p.copy(W0[i]).add(D[i]));
    }
    world.forEach((p, i) => { if (!pin[i]) keepOut(p, i, ST.now, 1, ST.now); });
    ST.now.P = ST.now.world.map(p => p.clone().applyMatrix4(RWi));
    if (!PHYS.on || !ST.stepped) draw(ST.now.P);
  }
  // a garment under another one (a skirt under a coat) is drawn inside it: no point of it outside the outer one's cloth
  let outer = null; const _n = V(), _o = V();
  function within(P) {
    const Q = outer.ST.drawn, N = outer.sheet.mesh.geometry.attributes.normal, jn = outer.cols; if (!Q) return;
    for (let i = cols; i < n; i++) { let best = 1e9, k = -1; for (let q = 0; q < Q.length; q++) { const l = Q[q].distanceToSquared(P[i]); if (l < best) { best = l; k = q; } } const J = outer.wrap ? jn + 1 : jn, r = Math.floor(k / jn), j = k % jn; _n.fromBufferAttribute(N, r * J + j); const h = _o.subVectors(P[i], Q[k]).dot(_n) + UNDER; if (h > 0) P[i].addScaledVector(_n, -h); }
  }
  const draw = P => { if (outer) within(P); ST.drawn = P; sheet.draw(P); fringe?.(P); };
  const _h = V(), _a = V(), _b = V(), _l = V();
  // a point kept off the limbs, the body (a strip on the chest) and the solids; was / now eased at u
  function keepOut(p, i, now, u, was) {
    let hit = false; const ease = (L, K, k, e, out) => out.lerpVectors(K[k] ? K[k][e] : L[k][e], L[k][e], u);
    _h.copy(now.out[i]);
    if (G) {
      // an arm or a hand stays outside the garment, a leg inside it (the leg has the last word: the cloth is between them)
      const inw = _h.clone().negate(), p0 = p.clone(); for (let k = 0; k < now.arms.length; k++) if (now.arms[k][2] > 0.004) hit = clearOf(p, ease(now.arms, was.arms, k, 0, _a), ease(now.arms, was.arms, k, 1, _b), now.arms[k][2], inw) || hit;
      const far = p.distanceTo(p0); if (far > ARM_PUSH) p.lerp(p0, 1 - ARM_PUSH / far);                    // (an arm presses the cloth, it does not carve it)
      for (let k = 0; k < now.legs.length; k++) if (now.legs[k][2] > 0.004) hit = clearOf(p, ease(now.legs, was.legs, k, 0, _a), ease(now.legs, was.legs, k, 1, _b), now.legs[k][2], _h) || hit;
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
    const Pd = Array.from({ length: n }, (_, k) => V(C.x[3 * k], C.x[3 * k + 1], C.x[3 * k + 2]).applyMatrix4(now.RWi)); if (G) G.eased({ P: Pd });   // (drawn eased as the guide is: a crease the sim leaves in one row is shared out)
    draw(Pd);
  }
  const fringe = o.fringe ? makeFringe(root, rows, cols, o.fringe) : null;
  return { update, step, under: !!o.under, inside: d => { outer = d; }, sheet, ST, cloth: C, rows, cols, wrap, guide: G, rest: R0, edges: edges.filter(e => e[3] < 1.05), n };
}
// a fringe: short strands of the strip's own colours hanging on from its last row
function makeFringe(root, rows, cols, { rgb, len = 0.03, n = 4 }) {
  const mat = wearMat(rgb), S = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.009, len, 0.008).translate(0, -len / 2, 0), mat), h = new THREE.Mesh(new THREE.BoxGeometry(0.018, len + 0.006, 0.016).translate(0, -len / 2 - 0.001, 0), HULL_MAT);
    h.geometry.setAttribute('inkT', new THREE.Float32BufferAttribute(new Float32Array(h.geometry.attributes.position.count).fill(0.001), 1)); h.userData.noPrepass = true; m.userData.noInk = true; m.frustumCulled = h.frustumCulled = false; m.add(h); root.add(m); return m; }), d = V(), Yd = V(0, -1, 0);
  return P => S.forEach((m, k) => { const f = (k + 0.5) / n * (cols - 1), j = Math.min(cols - 2, Math.floor(f)), a = P[(rows - 1) * cols + j].clone().lerp(P[(rows - 1) * cols + j + 1], f - j), b = P[(rows - 2) * cols + j].clone().lerp(P[(rows - 2) * cols + j + 1], f - j);
    m.position.copy(a); m.quaternion.setFromUnitVectors(Yd, d.subVectors(a, b).normalize()); });
}
