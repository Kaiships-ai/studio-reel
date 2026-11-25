// A prop's solid parts, measured from its triangles in its own frame (z up, front to -y, metres): the deck, the posts, a
// table's top and its legs, each its own box, so a figure can stand on a stage, under a scaffold, or sit at a table. One
// mechanism for every prop (collide.js places the boxes; a seat or a bed keeps its own block there). What counts as solid:
//   - every voxel a triangle goes through;
//   - in each layer, what a thing 2 x BODY_R wide cannot get to from outside, where the prop has surface in that column:
//     between a railing's bars, inside a bin, under a stage's skirt. It must touch that surface: a ring of rails in the
//     air, a pen, is not a wall round solid air;
//   - a gap under KNEE tall between a surface and what is over it, or the floor and the lowest surface: no legs fit there
//     (under a bed, between two shelves). A taller gap is open (under a table, a counter, a scaffold's deck);
//   - not what is wholly over the heads (`top`, a truss, an awning), unless it stands within reach of a figure on the deck.
// The solid is cut, box by box, where the cut gives back the most air (both the cut and the best one after it count), until
// no cut gives back MIN_AIR cubic metres or there are PARTS_MAX boxes (PARTS_BIG for a prop over BIG square metres: a stage). Every box is the bounds of what it holds, so its top is
// the part's real top; nothing solid is ever left out. Last, a box corner that stands out of the prop's outline is cut off (trimmed).
export const PARTS_MAX = 16, PARTS_BIG = 24, BIG = 20, KNEE = 0.50, BODY_R = 0.12, MIN_AIR = 0.03, CORNER = 0.03, TRIM_MAX = 24, TRIM_STEPS = 24, BODY_TOP = 1.3, TRIM_ENDS = [0.03, 0.06, 0.1, 0.15, 0.2, 0.3], TRIM_GAIN = 0.9;
const SHARE = 0.12, WIDE = [4], DEEP = [3, 2], RING = 0.2, EVEN = 0.1;   // a cut gives back this share of its box or more; the cuts tried; a box over RING m3 is tried deeper
const BUDGET = 30000, STEP = [0.02, 0.2];         // voxels in a prop's grid, and the size of one
const DECK = { area: 1.0, top: 1.6, clear: 1.6 };    // a top a figure can stand on: flat area (m2), how high, how much air over it

// tris: [[p, q, r], ..]; top: what starts over this height is overhead; k: the scale it will stand at -> [{ lo, hi }]
export function solidParts(tris, top, k1 = 1) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const D = [0, 1, 2].map(k => Math.max(1e-6, hi[k] - lo[k])), s = Math.min(STEP[1], Math.max(STEP[0], Math.cbrt(D[0] * D[1] * D[2] / BUDGET)));
  const n = D.map(d => Math.max(1, Math.ceil(d / s - 1e-6))), [nx, ny, nz] = n, N = nx * ny * nz, st = D.map((d, k) => d / n[k]);
  const at = (i, j, k) => (k * ny + j) * nx + i, vox = new Uint8Array(N), ext = new Float32Array(6 * N).fill(Infinity);   // vox: 1 surface, 2 filled; ext: -lo, hi of the surface in it
  for (const t of tris) {
    const e = [0, 1, 2].map(a => Math.hypot(...[0, 1, 2].map(k => (t[(a + 1) % 3][k] - t[a][k]) / st[k]))), a = e.indexOf(Math.min(...e));   // rows from the corner over the shortest side
    const P = t[(a + 2) % 3], Q = t[a], R = t[(a + 1) % 3], rows = Math.max(1, Math.ceil(2 * Math.max(e[(a + 1) % 3], e[(a + 2) % 3])));
    for (let u = 0; u <= rows; u++) { const f = u / rows, cols = Math.max(1, Math.ceil(2 * e[a] * f));
      for (let v = 0; v <= cols; v++) { const g = v / cols, p = [0, 1, 2].map(k => P[k] + f * (Q[k] - P[k] + g * (R[k] - Q[k])));
        const q = p.map((x, k) => Math.min(n[k] - 1, Math.max(0, Math.floor((x - lo[k]) / st[k])))), o = at(...q); vox[o] = 1;
        for (let k = 0; k < 3; k++) { ext[6 * o + k] = Math.min(ext[6 * o + k], p[k]); ext[6 * o + 3 + k] = Math.min(ext[6 * o + 3 + k], -p[k]); } } }
  }
  // layer by layer: where a square 2 x BODY_R wide gets to from outside the prop
  const r = [0, 1].map(k => Math.round(BODY_R / st[k])), W = nx + 4 * r[0] + 2, H = ny + 4 * r[1] + 2, open = new Uint8Array(N);
  for (let k = 0; k < nz; k++) {
    let m = new Uint8Array(W * H); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (vox[at(i, j, k)]) m[(j + 2 * r[1] + 1) * W + i + 2 * r[0] + 1] = 1;
    const wall = grow(m, W, H, r), free = new Uint8Array(W * H), todo = [0]; free[0] = 1;
    while (todo.length) { const o = todo.pop(), x = o % W; for (const q of [x > 0 ? o - 1 : -1, x < W - 1 ? o + 1 : -1, o - W, o + W]) if (q >= 0 && q < W * H && !free[q] && !wall[q]) { free[q] = 1; todo.push(q); } }
    m = grow(free, W, H, r); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (m[(j + 2 * r[1] + 1) * W + i + 2 * r[0] + 1]) open[at(i, j, k)] = 1;
  }
  const tops = [];                                         // of every column: [height of a top, air over it]
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = k => vox[at(i, j, k)]; let any = false; for (let k = 0; k < nz; k++) any ||= c(k) === 1; if (!any) continue;
    for (let k = 0; k < nz;) { if (c(k) || open[at(i, j, k)]) { k++; continue; }
      let e = k; while (e < nz && !c(e) && !open[at(i, j, e)]) e++;
      if ((k > 0 && c(k - 1)) || (e < nz && c(e))) for (let q = k; q < e; q++) vox[at(i, j, q)] = 2; k = e; }
    for (let k = 0, from = 0; k < nz; k++) { if (!c(k)) continue; if (k > from && (k - from) * st[2] < KNEE) for (let q = from; q < k; q++) vox[at(i, j, q)] = 2; from = k + 1; }
    for (let k = 0; k < nz; k++) if (c(k) && !(k + 1 < nz && c(k + 1))) { let e = k + 1; while (e < nz && !c(e)) e++; tops.push([lo[2] + (k + 1) * st[2], e < nz ? (e - k - 1) * st[2] : Infinity]); }
  }
  let deck = 0; for (let h = lo[2]; h <= lo[2] + DECK.top; h += st[2]) { const a = tops.filter(([z, air]) => Math.abs(z - h) < 0.6 * st[2] && air > DECK.clear).length * st[0] * st[1]; if (a >= DECK.area) deck = Math.max(deck, h - lo[2]); }
  const ceil = top + deck, list = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) for (let k = 0; k < nz;) { if (!vox[at(i, j, k)]) { k++; continue; } let e = k; while (e < nz && vox[at(i, j, e)]) e++; if (lo[2] + k * st[2] < ceil) for (let q = k; q < e; q++) list.push(at(i, j, q)); k = e; }
  // the bounds of one voxel: its surface, or the whole of a filled one (on the prop's side, up to the surface in its column)
  const side = new Float32Array(4 * nx * ny).fill(Infinity); for (let o = 0; o < N; o++) { const c = 4 * (o % (nx * ny)); if (vox[o] === 1) for (const k of [0, 1]) { side[c + k] = Math.min(side[c + k], ext[6 * o + k]); side[c + 2 + k] = Math.min(side[c + 2 + k], ext[6 * o + 3 + k]); } }
  const ijk = o => [o % nx, Math.floor(o / nx) % ny, Math.floor(o / nx / ny)];
  const C = Uint16Array.from({ length: 3 * list.length }, (_, q) => ijk(list[Math.floor(q / 3)])[q % 3]), E = new Float32Array(6 * list.length);
  list.forEach((o, q) => { for (let k = 0; k < 3; k++) { const a = lo[k] + C[3 * q + k] * st[k], f = vox[o] === 2; E[6 * q + k] = f ? a : ext[6 * o + k]; E[6 * q + 3 + k] = f ? a + st[k] : -ext[6 * o + 3 + k];
    if (f && k < 2) { const c = 4 * (o % (nx * ny)), w = k ? nx : 1, i = C[3 * q + k]; if (!(i > 0 && vox[o - w])) E[6 * q + k] = Math.max(a, side[c + k]); if (!(i < n[k] - 1 && vox[o + w])) E[6 * q + 3 + k] = Math.min(a + st[k], -side[c + 2 + k]); } } });
  // what a cut is worth is judged on sides rounded out to EVEN (a 2 cm rim or a rounded corner is no air worth a box); tops are not rounded
  const R = Float64Array.from(E); for (let q = 0; q < list.length; q++) for (const k of [0, 1]) { R[6 * q + k] = lo[k] + Math.floor((E[6 * q + k] - lo[k]) / EVEN + 1e-4) * EVEN; R[6 * q + 3 + k] = hi[k] - Math.floor((hi[k] - E[6 * q + 3 + k]) / EVEN + 1e-4) * EVEN; }
  const G = { C, E: R, real: E, n };
  return trimmed(pieces(G, Array.from(list.keys()), D[0] * D[1] > BIG ? PARTS_BIG : PARTS_MAX), outline(tris, ceil), CORNER / k1, BODY_TOP / k1, k1);
}

// a 0/1 picture grown by r cells each way (a square)
function grow(m, W, H, [rx, ry]) {
  const a = new Uint8Array(W * H), b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) { let far = -1; for (let x = 0; x < Math.min(rx, W); x++) if (m[y * W + x]) far = x + rx; for (let x = 0; x < W; x++) { if (x + rx < W && m[y * W + x + rx]) far = x + 2 * rx; if (far >= x) a[y * W + x] = 1; } }
  for (let x = 0; x < W; x++) { let far = -1; for (let y = 0; y < Math.min(ry, H); y++) if (a[y * W + x]) far = y + ry; for (let y = 0; y < H; y++) { if (y + ry < H && a[(y + ry) * W + x]) far = y + 2 * ry; if (far >= y) b[y * W + x] = 1; } }
  return b;
}

const vol = (b, o = 0) => (b[o + 3] - b[o]) * (b[o + 4] - b[o + 1]) * (b[o + 5] - b[o + 2]);
const clear = (b, o = 0) => { b[o] = b[o + 1] = b[o + 2] = Infinity; b[o + 3] = b[o + 4] = b[o + 5] = -Infinity; };
function add(b, bo, E, o) {
  if (E[o] < b[bo]) b[bo] = E[o]; if (E[o + 1] < b[bo + 1]) b[bo + 1] = E[o + 1]; if (E[o + 2] < b[bo + 2]) b[bo + 2] = E[o + 2];
  if (E[o + 3] > b[bo + 3]) b[bo + 3] = E[o + 3]; if (E[o + 4] > b[bo + 4]) b[bo + 4] = E[o + 4]; if (E[o + 5] > b[bo + 5]) b[bo + 5] = E[o + 5];
}
const bounds = (E, v) => { const b = new Float64Array(6); clear(b); for (let i = 0; i < v.length; i++) add(b, 0, E, 6 * v[i]); return b; };

// the best cut of the voxels `v`: { gain (m3 of air given back), a (axis), x }, with the best cuts of its halves after it:
// `wide` = how many cuts are tried at each step down (a table's top alone gives back nothing, its legs apart do; a ring of
// four rails only at the third cut)
function bestCut(G, v, wide) {
  const { C, E, n } = G, V = vol(bounds(E, v)), cuts = [];
  for (let a = 0; a < 3; a++) {
    const m = n[a], row = new Float64Array(6 * m), suf = new Float64Array(6 * (m + 1)), pre = new Float64Array(6), count = new Uint32Array(m);
    for (let x = 0; x < m; x++) clear(row, 6 * x); clear(suf, 6 * m); clear(pre);
    for (let i = 0; i < v.length; i++) { const q = v[i], x = C[3 * q + a]; add(row, 6 * x, E, 6 * q); count[x]++; }
    for (let x = m - 1; x >= 0; x--) { suf.copyWithin(6 * x, 6 * x + 6, 6 * x + 12); add(suf, 6 * x, row, 6 * x); }
    for (let x = 1; x < m; x++) { add(pre, 0, row, 6 * (x - 1)); if (!(pre[0] <= pre[3] && suf[6 * x] <= suf[6 * x + 3])) continue;
      const d = Math.abs(count[x] - count[x - 1]); cuts.push({ a, x, gain: V - vol(pre) - vol(suf, 6 * x), step: d * d / Math.max(count[x], count[x - 1], 1) }); }
  }
  if (!cuts.length) return { gain: 0 };
  const best = cuts.reduce((m, c) => (c.gain > m.gain ? c : m)); if (!wide.length) return best;
  const tried = new Set([...cuts].sort((p, q) => q.gain - p.gain).slice(0, 2)); for (const a of [0, 1, 2]) for (const c of cuts.filter(c => c.a === a).sort((p, q) => q.step - p.step).slice(0, wide[0])) tried.add(c);
  let out = { gain: 0 };
  for (const c of tried) { const [A, B] = halves(C, v, c), next = wide.slice(1), gain = c.gain + Math.max(0, bestCut(G, A, next).gain) + Math.max(0, bestCut(G, B, next).gain); if (gain > out.gain) out = { ...c, gain }; }
  return out;
}
const halves = (C, v, c) => { const A = [], B = []; for (let i = 0; i < v.length; i++) (C[3 * v[i] + c.a] < c.x ? A : B).push(v[i]); return [A, B]; };

function pieces(G, v, max) {
  let L = v.length ? [{ v }] : [];
  const cut = l => { const V = vol(bounds(G.E, l.v)), least = Math.max(MIN_AIR, SHARE * V); if (V <= least) return { gain: 0 }; const c = bestCut(G, l.v, WIDE); return c.gain > least ? c : V > RING ? (d => (d.gain > least ? d : { gain: 0 }))(bestCut(G, l.v, DEEP)) : { gain: 0 }; };
  for (let round = 0; round < 3; round++) {
    const had = L.length;
    while (L.length && L.length < max) {
      if (L.length === max - 1) for (const l of L) { const V = vol(bounds(G.E, l.v)), c = V > MIN_AIR ? bestCut(G, l.v, []) : { gain: 0 }; l.cut = c.gain > Math.max(MIN_AIR, SHARE * V) ? c : { gain: 0 }; }   // the last one: no cut after it
      else for (const l of L) l.cut ??= cut(l);
      const l = L.reduce((m, x) => (x.cut.gain > m.cut.gain ? x : m)); if (!l.cut.gain) break;
      L = L.flatMap(x => (x === l ? halves(G.C, l.v, l.cut).map(v => ({ v })) : [x]));
    }
    if (round && L.length === had) break; for (const l of L) l.cut = null;
    // two boxes that are as good as one become one (a cut made on the way to another), which leaves room for another cut
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const v = [...L[i].v, ...L[j].v], U = vol(bounds(G.E, v));
      if (U - vol(bounds(G.E, L[i].v)) - vol(bounds(G.E, L[j].v)) < Math.min(MIN_AIR, SHARE * U)) { L[i] = { v }; L.splice(j, 1); i = -1; break; } }
  }
  return L.map(l => { const b = bounds(G.real, l.v); return { lo: [...b.slice(0, 3)], hi: [...b.slice(3)] }; });
}

// the plan outline of the prop under `top`: the convex hull of its triangles as clipped there
function outline(tris, top) {
  const P = [];
  for (const t of tris) for (let i = 0; i < 3; i++) { const a = t[i], b = t[(i + 1) % 3]; if (a[2] <= top) P.push([a[0], a[1]]);
    if ((a[2] <= top) !== (b[2] <= top)) { const u = (top - a[2]) / (b[2] - a[2]); P.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); } }
  return hull(P);
}
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function hull(P) {
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const h = [];
  for (const Q of [P, [...P].reverse()]) { const s = h.length; for (const p of Q) { while (h.length >= s + 2 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } h.pop(); }
  return h;
}
function outOf(H, p) {
  let inside = H.length > 2, d = Infinity;
  for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length], u = b[0] - a[0], v = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * u + (p[1] - a[1]) * v) / (u * u + v * v || 1)));
    if (cross(a, b, p) < 0) inside = false; d = Math.min(d, Math.hypot(p[0] - a[0] - t * u, p[1] - a[1] - t * v)); }
  return inside ? 0 : d;
}
// what of the outline H lies in lo..hi (plan): its own bounds there, null when none
function within(H, lo, hi) {
  let P = H;
  for (const [k, x, sg] of [[0, lo[0], 1], [0, hi[0], -1], [1, lo[1], 1], [1, hi[1], -1]]) P = P.flatMap((a, i) => { const b = P[(i + 1) % P.length], u = sg * (a[k] - x), v = sg * (b[k] - x), out = u >= 0 ? [a] : [];
    if ((u >= 0) !== (v >= 0)) out.push([0, 1].map(q => (q === k ? x : a[q] + (b[q] - a[q]) * u / (u - v)))); return out; });
  return P.length ? { lo: [0, 1].map(k => Math.min(...P.map(p => p[k]))), hi: [0, 1].map(k => Math.max(...P.map(p => p[k]))) } : null;
}
// the boxes less the corners that stand out of the outline by more than `tol` (a round bin, a truck's nose): the box whose
// corner stands out most (half as much over BODY_TOP, where only arms reach) is cut where the corners shrink most, at most TRIM_MAX cuts; each half is as wide as the outline there
function trimmed(L, H, tol, body, k1) {
  if (H.length < 3) return L;
  const corners = b => [b.lo[0], b.hi[0]].flatMap(x => [b.lo[1], b.hi[1]].map(y => outOf(H, [x, y]))), cost = b => corners(b).reduce((s, d) => s + d * d, 0);
  const part = b => { const w = within(H, b.lo, b.hi); return w && { lo: [...w.lo, b.lo[2]], hi: [...w.hi, b.hi[2]] }; };
  const worst = b => Math.max(...corners(b)) * (b.lo[2] < body ? 1 : 0.5), out = L.map(b => ({ b, worst: worst(b) }));
  for (let cut = 0; cut < TRIM_MAX; cut++) {
    const w = out.reduce((m, x) => (x.worst > m.worst ? x : m)); if (!(w.worst > tol)) break;
    const c0 = cost(w.b); let best = { cost: TRIM_GAIN * c0 };
    for (const a of [0, 1]) for (const x of [...Array.from({ length: TRIM_STEPS - 1 }, (_, i) => w.b.lo[a] + (w.b.hi[a] - w.b.lo[a]) * (i + 1) / TRIM_STEPS), ...H.flatMap((p, i) => [0, 0.25, 0.5, 0.75].map(t => p[a] + t * (H[(i + 1) % H.length][a] - p[a]))), ...TRIM_ENDS.flatMap(d => [w.b.lo[a] + d / k1, w.b.hi[a] - d / k1])].filter(x => x > w.b.lo[a] + 0.01 && x < w.b.hi[a] - 0.01)) { const set = (v, y) => v.map((z, k) => (k === a ? y : z)), A = part({ lo: w.b.lo, hi: set(w.b.hi, x) }), B = part({ lo: set(w.b.lo, x), hi: w.b.hi });
      if (A && B && cost(A) + cost(B) < best.cost) best = { cost: cost(A) + cost(B), A, B }; }
    if (!best.A) { w.worst = 0; continue; }
    out.splice(out.indexOf(w), 1, ...[best.A, best.B].map(b => ({ b, worst: worst(b) })));
  }
  return out.map(x => x.b);
}
