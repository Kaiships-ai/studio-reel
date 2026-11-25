// The solid boxes of a placed prop, in the array the set exports as COLLIDE. The gates (engine/play.js: body, arm and prop in
// the set; engine/cast.js: hands stop on a solid; engine/solids.js restBoxes) read that array and nothing else of a .glb:
// solidBoxes() only sees box meshes. An entry is { name, lo, hi } in Blender metres, square to the axes, so a prop has boxes
// only at a quarter turn (within QUARTER_TOL of 0, 90, 180, 270): they are measured in its own frame and turned exactly, so
// every quarter gives the same boxes. At any other turn it has none and propKit lists it as not collision-checked
// (catalog.js, COLLIDE.unchecked; the shot gate reports it). The boxes:
//   - the prop's solid parts, each its own box (parts.js: deck, posts, a top, legs), from its own foot (a wall clock at
//     1.5 m does not stop the figure under it) up to its real top;
//   - under a thin top a figure's legs go (a table, a counter) the body gate sees no figure standing through it: its points are
//     the ankles, the knees and the torso, none at a table's height. Such a top carries a sliver inside itself (`reach`) with a
//     negative grace, which the body gate alone reads: the top counts from the nearest of those points, over its own floor only;
//   - a seat or a bed (sizes.js SEAT) is a block up to the seat its own top faces show, plus boxes for what stands over it
//     (a back, arms, a headboard), up to SEAT_MAX in all. A figure sitting or lying on it is above the block and in front of the back; one standing
//     through it has its ankles in the block. The block carries grace SEAT_GRACE (a body sinks into a cushion);
//   - a thin prop (under THIN tall: a rug, a plate) and one wholly outside the band (over the heads) are none.
import * as THREE from 'three';
import { solidParts, KNEE } from './parts.js';
import { SEAT } from './sizes.js';

export const QUARTER_TOL = 0.5, MAX_BOXES = 6, SEAT_MAX = 8, OVER_MAX = 4, THIN = 0.06, SEAT_GRACE = 0.02, BAND = [0.05, 1.8];
const CELLS = 24;                // raster cells along the longer side
const LAP = 0.02;                // boxes that meet share this much (plus their grace): a point on the cut is in one of them
const ENOUGH = 0.015;             // a cut that saves less than this share of the prop is not made

// the quarter (0..3) a turn about the vertical is, any sign or number of turns; null when it is none
export function quarterOf(rad) {
  const deg = rad * 180 / Math.PI, q = Math.round(deg / 90);
  return Math.abs(deg - 90 * q) <= QUARTER_TOL + 1e-6 ? ((q % 4) + 4) % 4 : null;
}

// the prop's triangles in its own frame (Blender axes, scale 1): its meshes' matrices up to the group, never the group's
// own, so where and how it stands changes nothing
function ownTris(g) {
  const out = [], a = new THREE.Vector3();
  g.traverse(m => { if (!m.isMesh || m.userData.contact) return;
    const m4 = new THREE.Matrix4(); for (let o = m; o !== g; o = o.parent) { o.updateMatrix(); m4.premultiply(o.matrix); }
    const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count;
    for (let i = 0; i < n; i += 3) out.push([0, 1, 2].map(v => { a.fromBufferAttribute(p, ix ? ix.getX(i + v) : i + v).applyMatrix4(m4); return [a.x, -a.z, a.y]; })); });
  return out;
}

// the height of the seat: the 6 cm of height that the tops of most cells share, between z0 and z1
function seatTop(cells, z0, z1) {
  const bins = new Map(); for (const { top } of cells) if (top > z0 && top < z1) { const b = Math.round(top / 0.02); bins.set(b, [...(bins.get(b) || []), top]); }
  let best = null;
  for (const b of bins.keys()) { const t = [-1, 0, 1].flatMap(d => bins.get(b + d) || []); if (!best || t.length > best.length) best = t; }
  return best && Math.max(...best);
}

// the footprint as cells { i, j, top, lo, hi }: the samples of every triangle inside the band, and the cells they enclose
function raster(tris, band) {
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity]; let top = -Infinity;
  const near = tris.filter(t => { const z = t.map(p => p[2]); return Math.max(...z) >= band[0] && Math.min(...z) <= band[1]; });
  for (const t of near) for (const p of t) { for (const k of [0, 1]) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } top = Math.max(top, p[2]); }
  if (!near.length) return null;
  const s = Math.max(hi[0] - lo[0], hi[1] - lo[1]) / CELLS, cells = new Map(), key = (i, j) => i * 1000 + j;
  for (const t of near) {
    const len = Math.max(...[0, 1, 2].map(k => Math.hypot(t[k][0] - t[(k + 1) % 3][0], t[k][1] - t[(k + 1) % 3][1], (t[k][2] - t[(k + 1) % 3][2])))), n = Math.max(1, Math.min(90, Math.ceil(len / (0.5 * s))));
    for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) {
      const p = [0, 1, 2].map(k => (t[0][k] * u + t[1][k] * v + t[2][k] * (n - u - v)) / n); if (p[2] < band[0] || p[2] > band[1]) continue;
      const i = Math.min(CELLS - 1, Math.floor((p[0] - lo[0]) / s)), j = Math.min(CELLS - 1, Math.floor((p[1] - lo[1]) / s)), c = cells.get(key(i, j));
      if (!c) cells.set(key(i, j), { i, j, top: p[2], lo: [p[0], p[1]], hi: [p[0], p[1]] });
      else { c.top = Math.max(c.top, p[2]); for (const k of [0, 1]) { c.lo[k] = Math.min(c.lo[k], p[k]); c.hi[k] = Math.max(c.hi[k], p[k]); } }
    }
  }
  const row = new Map(), col = new Map(), span = (m, k, x) => { const o = m.get(k); if (o) { o[0] = Math.min(o[0], x); o[1] = Math.max(o[1], x); } else m.set(k, [x, x]); };
  for (const c of cells.values()) { span(row, c.j, c.i); span(col, c.i, c.j); }
  for (const [i, [j0, j1]] of col) for (let j = j0; j <= j1; j++) { const r = row.get(j);
    if (!cells.has(key(i, j)) && r && i > r[0] && i < r[1]) cells.set(key(i, j), { i, j, top: -Infinity, lo: [lo[0] + i * s, lo[1] + j * s], hi: [lo[0] + (i + 1) * s, lo[1] + (j + 1) * s] }); }
  return { cells: [...cells.values()], top, step: s };
}

// cells -> at most `cap` rectangles: cut the group where the cut (and the best cut after it) takes the most volume away;
// height(box): the height a box over them adds
function cover(cells, height, cap) {
  const box = cs => { const b = { lo: [Infinity, Infinity], hi: [-Infinity, -Infinity], top: -Infinity }; for (const c of cs) { for (const k of [0, 1]) { b.lo[k] = Math.min(b.lo[k], c.lo[k]); b.hi[k] = Math.max(b.hi[k], c.hi[k]); } b.top = Math.max(b.top, c.top); } return b; };
  const vol = cs => { const b = box(cs); return (b.hi[0] - b.lo[0]) * (b.hi[1] - b.lo[1]) * height(b); };
  const cuts = (cs, deep) => {
    const v = vol(cs); let best = { gain: 0 };
    for (const ax of ['i', 'j']) { const at = [...new Set(cs.map(c => c[ax]))].sort((a, b) => a - b);
      for (const x of at.slice(1)) { const A = cs.filter(c => c[ax] < x), B = cs.filter(c => c[ax] >= x);
        let gain = v - vol(A) - vol(B); if (deep) gain += Math.max(cuts(A, false).gain, cuts(B, false).gain);
        if (gain > best.gain) best = { gain, A, B }; } }
    return best; };
  let leaves = cells.length ? [{ cs: cells }] : [];
  const total = leaves.reduce((s, l) => s + vol(l.cs), 0);
  while (leaves.length && leaves.length < cap) {
    for (const l of leaves) l.cut ??= cuts(l.cs, true);
    const l = leaves.reduce((m, x) => (x.cut.gain > m.cut.gain ? x : m)); if (!(l.cut.gain > ENOUGH * total)) break;
    leaves = leaves.flatMap(x => (x === l ? [{ cs: l.cut.A }, { cs: l.cut.B }] : [x]));
  }
  return leaves.map(l => box(l.cs));
}

// rectangles that meet (within a cell) share `lap`
function lapped(L, step, lap) {
  return L.map((b, n) => { const r = { ...b, lo: [...b.lo], hi: [...b.hi] };
    L.forEach((o, m) => { if (m === n) return;
      for (const k of [0, 1]) { const j = 1 - k; if (Math.min(b.hi[j], o.hi[j]) - Math.max(b.lo[j], o.lo[j]) < 0.01) continue;
        if (Math.abs(o.lo[k] - b.hi[k]) < step) r.hi[k] = Math.max(r.hi[k], (b.hi[k] + o.lo[k]) / 2 + lap / 2);
        if (Math.abs(b.lo[k] - o.hi[k]) < step) r.lo[k] = Math.min(r.lo[k], (b.lo[k] + o.hi[k]) / 2 - lap / 2); } });
    return r; });
}

// the cells less the crumbs: groups of touching cells under 5 % of them (a seat-high rim round a chair's back post)
function body(cells) {
  const left = new Map(cells.map(c => [c.i * 1000 + c.j, c])), keep = [];
  for (const c of cells) { const k = c.i * 1000 + c.j; if (!left.has(k)) continue; const todo = [c], part = []; left.delete(k);
    while (todo.length) { const q = todo.pop(); part.push(q); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (q.i + a) * 1000 + q.j + b; if (left.has(n)) { todo.push(left.get(n)); left.delete(n); } } }
    if (part.length >= 0.05 * cells.length) keep.push(...part); }
  return keep;
}

// the parts of prop `name` at scale k, in its own frame; top: what starts over this height (the prop's own, at scale k) is overhead
const PARTS = new Map();
const once = (key, f) => { if (!PARTS.has(key)) PARTS.set(key, f()); return PARTS.get(key); };
function partsOf(g, name, k, top) {
  const P = solidParts(ownTris(g), top / k, k).map(b => ({ lo: b.lo.map(v => v * k), hi: b.hi.map(v => v * k) })), raw = P.map(b => ({ lo: [...b.lo], hi: [...b.hi] })), over = (p, q, x) => Math.min(p.hi[x], q.hi[x]) - Math.max(p.lo[x], q.lo[x]);
  raw.forEach((p, n) => raw.forEach((q, m) => { if (n === m) return;
    for (const x of [0, 1, 2]) { const [u, v] = [0, 1, 2].filter(y => y !== x); if (!(over(p, q, u) > 0.01 && over(p, q, v) > 0.01) || Math.abs(q.lo[x] - p.hi[x]) > 0.03) continue;
      const mid = (q.lo[x] + p.hi[x]) / 2; if (x < 2) P[n].hi[x] = Math.max(P[n].hi[x], mid + LAP); P[m].lo[x] = Math.min(P[m].lo[x], (x < 2 ? mid : p.hi[x]) - LAP); } }));
  return [...P, ...raw.flatMap(b => reach(b, raw))];
}

// a seat's or a bed's block and what stands over it, at scale k, in its own frame; null: no seat to be found
function seatOf(g, name, kind, k) {
  const U = once(name, () => {
    const tris = ownTris(g); let z0 = Infinity, z1 = -Infinity; for (const t of tris) for (const p of t) { z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
    const R = raster(tris, BAND), seat = R && seatTop(R.cells, z0 + 0.2, z0 + 0.8); if (seat == null) return null;
    const over = seat + SEAT.over[kind], high = cover(R.cells.filter(c => c.top > over), b => b.top - seat, OVER_MAX);
    // the block: the cells about as high as the seat (a foot plate, a star base, a rocker lies lower: the feet go there)
    const low = cover(body(R.cells.filter(c => c.top <= over && c.top > seat - SEAT.under)), () => seat - z0, Math.min(MAX_BOXES, SEAT_MAX - high.length));
    return { z0, seat, high, low, step: R.step };
  });
  if (!U) return null;
  const sized = (L, grace) => lapped(L.map(b => ({ lo: b.lo.map(v => v * k), hi: b.hi.map(v => v * k), top: b.top * k })), U.step * k, LAP + 2 * grace)
    .map(b => ({ lo: [...b.lo, U.z0 * k - grace], hi: [...b.hi, grace ? U.seat * k : b.top], ...(grace ? { grace } : {}) }));
  return [...sized(U.low, SEAT_GRACE), ...sized(U.high, 0)];
}

// the heights of the points the body gate reads on a standing figure (engine/play.js: ankle, knee, the torso's three rows)
export const BODY_Z = [0.06, 0.42, 0.774, 1.002, 1.23];
const REACH = { slim: 0.01, up: 0.015, down: 0.002, cover: 0.8 };      // the sliver's thickness; how far past the point it counts
function reach(b, all) {
  if (b.lo[2] < KNEE - 0.01 || b.lo[2] > BODY_Z.at(-1) || BODY_Z.some(z => z > b.lo[2] + 0.01 && z < b.hi[2] - 0.01)) return [];      // none needed where it holds one of those points itself
  const area = (b.hi[0] - b.lo[0]) * (b.hi[1] - b.lo[1]), under = all.filter(o => o !== b && Math.abs(o.hi[2] - b.lo[2]) < 0.06 && o.lo[2] < b.lo[2]).reduce((s, o) => s + [0, 1].reduce((a, k) => a * Math.max(0, Math.min(o.hi[k], b.hi[k]) - Math.max(o.lo[k], b.lo[k])), 1), 0);
  if (under > REACH.cover * area) return [];                              // stands on a block: the block is seen
  const up = Math.min(...BODY_Z.map(z => (z >= b.hi[2] - 0.01 ? z - b.hi[2] + REACH.up : Infinity))), down = Math.min(...BODY_Z.slice(2).map(z => (z <= b.lo[2] + 0.01 ? b.lo[2] - z + REACH.down : Infinity)));
  const r = Math.max(0.005, Math.min(up, down)), lo = [...b.lo], hi = [...b.hi]; if (up <= down) lo[2] = hi[2] - REACH.slim; else hi[2] = lo[2] + REACH.slim;
  if (Math.min(hi[0] - lo[0], hi[1] - lo[1]) < 2 * r + 0.15) return [];      // too narrow to be stood through
  for (const x of [0, 1]) { lo[x] += r; hi[x] -= r; }
  return [{ lo, hi, grace: -r, reach: true }];
}

// a box in the prop's own frame, turned by q quarters (exactly: sides swap and change sign) and put at `at`
const r3 = v => +v.toFixed(3), r6 = v => +v.toFixed(6) + 0;
function stood(b, q, at) {
  const [x0, y0, z0] = b.lo.map(r3), [x1, y1, z1] = b.hi.map(r3), [u0, v0, u1, v1] = [[x0, y0, x1, y1], [-y1, x0, -y0, x1], [-x1, -y1, -x0, -y0], [y0, -x1, y1, -x0]][q];
  return { lo: [r6(at[0] + u0), r6(at[1] + v0), r6(at[2] + z0)], hi: [r6(at[0] + u1), r6(at[1] + v1), r6(at[2] + z1)] };
}

// does the prop placed as group g reach into the band at all, and is it tall enough to be a solid
export function solidAt(g, band = BAND) {
  let z0 = Infinity, z1 = -Infinity; for (const t of ownTris(g)) for (const p of t) { z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  const k = g.scale.x, z = g.position.y; return (z1 - z0) * k >= THIN && z1 * k + z > band[0] && z0 * k + z < band[1];
}

// the COLLIDE entries of prop `name` placed as group g (its own name is g.name), none off the quarter turns; grace: the caller's, on every box
export function propBoxes(g, name, { band = BAND, grace } = {}) {
  const q = quarterOf(g.rotation.y); if (q == null || !solidAt(g, band)) return [];
  const k = g.scale.x, at = [g.position.x, -g.position.z, g.position.y], top = band[1] - at[2], kind = SEAT.lie.test(name) ? 'lie' : SEAT.sit.test(name) ? 'sit' : null;
  let boxes = (kind && seatOf(g, name, kind, k)) || once(`${name}|${k}|${top}`, () => partsOf(g, name, k, top));
  if (grace != null) boxes = boxes.filter(b => !b.reach);          // the caller says how far a body may sink in: no reach
  boxes = boxes.map(b => ({ ...stood(b, q, at), ...(grace ?? b.grace ? { grace: grace ?? b.grace } : {}) })).filter(b => b.hi[2] > band[0]);
  return boxes.map((b, i) => ({ name: boxes.length > 1 ? `${g.name}#${i + 1}` : g.name, ...b }));
}
