// The solid boxes of a placed prop, in the array the set exports as COLLIDE. The gates (engine/play.js: body, arm and prop in
// the set; engine/cast.js: hands stop on a solid; engine/solids.js restBoxes) read that array and nothing else of a .glb:
// solidBoxes() only sees box meshes. Axis-aligned { name, lo, hi } in Blender metres, so:
//   - the prop's solid parts, each its own box (parts.js: deck, posts, a top, legs), measured once per name and scale and
//     turned with the prop. Square to the axes (within TURN_MIN degrees of a quarter turn) a part is one box; off them it is
//     sliced until no slice stands out more than 12 cm from its side, or there are TURN_MAX in all (a prop with no room in it: 20 cm, TURN_SHUT);
//   - under a thin top a figure's legs go (a table, a counter) the body gate sees no figure standing through it: its points are
//     the ankles, the knees and the torso, none at a table's height. Such a top carries a sliver inside itself (`reach`) with a
//     negative grace, which the body gate alone reads: the top counts from the nearest of those points, over its own floor only;
//   - a seat or a bed (sizes.js SEAT) is a block up to the seat its own top faces show, plus boxes for what stands over it
//     (a back, arms, a headboard), up to SEAT_MAX in all. A figure sitting or lying on it is above the block and in front of the back; one standing
//     through it has its ankles in the block. The block carries grace SEAT_GRACE (a body sinks into a cushion);
//   - a thin prop (under THIN tall: a rug, a plate) and one wholly above the band are none.
// A box starts at the part's own foot (a wall clock at 1.5 m does not stop the figure under it) and reaches its real top.
import * as THREE from 'three';
import { solidParts, KNEE, PARTS_MAX } from './parts.js';
import { SEAT } from './sizes.js';

export const TURN_MIN = 5, TURN_MAX = 48, TURN_BIG = 72, TURN_SHUT = 16, MAX_BOXES = 6, SEAT_MAX = 8, OVER_MAX = 4, THIN = 0.06, SEAT_GRACE = 0.02;
const CELLS = 24;                // raster cells along the longer side
const TURNED_OVER = 0.70;       // on a seat turned off the axes only what stands this share of the way up to its top (the back) is a box: a 4 cm arm at 45 degrees cannot be boxed without filling the seat
const LAP = 0.02;                // boxes that meet share this much (plus their grace): a point on the cut is in one of them
const ENOUGH = 0.015;             // a cut that saves less than this share of the prop is not made

function triangles(g, hit) {
  const a = new THREE.Vector3(); g.updateMatrixWorld(true);
  g.traverse(m => { if (!m.isMesh || m.userData.contact) return; const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count;
    for (let i = 0; i < n; i += 3) hit([0, 1, 2].map(k => { a.fromBufferAttribute(p, ix ? ix.getX(i + k) : i + k).applyMatrix4(m.matrixWorld); return [a.x, -a.z, a.y]; })); });
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

// cells -> at most `cap` rectangles: cut the group where the cut (and the best cut after it) takes the most volume away.
// groups: [{ cells, vol(cells) -> the height a box over them adds }]
function cover(groups, cap, step) {
  const box = cs => { const b = { lo: [Infinity, Infinity], hi: [-Infinity, -Infinity], top: -Infinity }; for (const c of cs) { for (const k of [0, 1]) { b.lo[k] = Math.min(b.lo[k], c.lo[k]); b.hi[k] = Math.max(b.hi[k], c.hi[k]); } b.top = Math.max(b.top, c.top); } return b; };
  const vol = (cs, g) => { const b = box(cs); return (b.hi[0] - b.lo[0]) * (b.hi[1] - b.lo[1]) * g.height(b); };
  const cuts = (cs, g, deep) => {
    const v = vol(cs, g); let best = { gain: 0 };
    for (const ax of ['i', 'j']) { const at = [...new Set(cs.map(c => c[ax]))].sort((a, b) => a - b);
      for (const x of at.slice(1)) { const A = cs.filter(c => c[ax] < x), B = cs.filter(c => c[ax] >= x);
        let gain = v - vol(A, g) - vol(B, g); if (deep) gain += Math.max(cuts(A, g, false).gain, cuts(B, g, false).gain);
        if (gain > best.gain) best = { gain, A, B }; } }
    return best; };
  let leaves = groups.filter(g => g.cells.length).map(g => ({ g, cs: g.cells }));
  const total = leaves.reduce((s, l) => s + vol(l.cs, l.g), 0);
  while (leaves.length && leaves.length < cap) {
    for (const l of leaves) l.cut ??= cuts(l.cs, l.g, true);
    const l = leaves.reduce((m, x) => (x.cut.gain > m.cut.gain ? x : m)); if (!(l.cut.gain > ENOUGH * total)) break;
    leaves = leaves.flatMap(x => (x === l ? [{ g: l.g, cs: l.cut.A }, { g: l.g, cs: l.cut.B }] : [x]));
  }
  const out = leaves.map(l => ({ g: l.g, ...box(l.cs) })), b0 = out.map(b => ({ g: b.g, lo: [...b.lo], hi: [...b.hi] }));
  out.forEach((b, n) => b0.forEach((o, m) => { if (m === n || o.g !== b.g) return; const lap = LAP + (b.g.grace || 0);
    for (const k of [0, 1]) { const j = 1 - k; if (Math.min(b0[n].hi[j], o.hi[j]) - Math.max(b0[n].lo[j], o.lo[j]) < 0.01) continue;
      if (Math.abs(o.lo[k] - b0[n].hi[k]) < step) b.hi[k] = Math.max(b.hi[k], (b0[n].hi[k] + o.lo[k]) / 2 + lap / 2);
      if (Math.abs(b0[n].lo[k] - o.hi[k]) < step) b.lo[k] = Math.min(b.lo[k], (b0[n].lo[k] + o.hi[k]) / 2 - lap / 2); } }));
  return out;
}

// the cells less the crumbs: groups of touching cells under 5 % of them (a seat-high rim round a chair's back post)
function body(cells) {
  const left = new Map(cells.map(c => [c.i * 1000 + c.j, c])), keep = [];
  for (const c of cells) { const k = c.i * 1000 + c.j; if (!left.has(k)) continue; const todo = [c], part = []; left.delete(k);
    while (todo.length) { const q = todo.pop(); part.push(q); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (q.i + a) * 1000 + q.j + b; if (left.has(n)) { todo.push(left.get(n)); left.delete(n); } } }
    if (part.length >= 0.05 * cells.length) keep.push(...part); }
  return keep;
}

// the parts of prop `name` at g's scale, in its own frame (Blender axes), lapped where they meet; measured once (at its real size)
const PARTS = new Map();
function partsOf(g, name, top) {
  const k = g.scale.x, key = `${name}|${k}|${top}`; if (PARTS.has(key)) return PARTS.get(key);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), m4 = new THREE.Matrix4(), a = new THREE.Vector3(), tris = [];
  g.traverse(m => { if (!m.isMesh || m.userData.contact) return; m4.multiplyMatrices(inv, m.matrixWorld); const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count;
    for (let i = 0; i < n; i += 3) tris.push([0, 1, 2].map(v => { a.fromBufferAttribute(p, ix ? ix.getX(i + v) : i + v).applyMatrix4(m4); return [a.x, -a.z, a.y]; })); });
  const P = solidParts(tris, top / k).map(b => ({ lo: b.lo.map(v => v * k), hi: b.hi.map(v => v * k) })), raw = P.map(b => ({ lo: [...b.lo], hi: [...b.hi] })), over = (p, q, x) => Math.min(p.hi[x], q.hi[x]) - Math.max(p.lo[x], q.lo[x]);
  raw.forEach((p, n) => raw.forEach((q, m) => { if (n === m) return;
    for (const x of [0, 1, 2]) { const [u, v] = [0, 1, 2].filter(y => y !== x); if (!(over(p, q, u) > 0.01 && over(p, q, v) > 0.01) || Math.abs(q.lo[x] - p.hi[x]) > 0.03) continue;
      const mid = (q.lo[x] + p.hi[x]) / 2; if (x < 2) P[n].hi[x] = Math.max(P[n].hi[x], mid + LAP); P[m].lo[x] = Math.min(P[m].lo[x], (x < 2 ? mid : p.hi[x]) - LAP); } }));
  P.push(...raw.flatMap(b => reach(b, raw)));
  PARTS.set(key, P); return P;
}

// the heights of the points the body gate reads on a standing figure (engine/play.js: ankle, knee, the torso's three rows)
export const BODY_Z = [0.06, 0.42, 0.774, 1.002, 1.23];
const REACH = { slim: 0.01, up: 0.015, down: 0.002, cover: 0.8 };      // the sliver's thickness; how far past the point it counts
function reach(b, all) {
  if (b.lo[2] < KNEE - 0.01 || b.lo[2] > BODY_Z.at(-1)) return [];
  const area = (b.hi[0] - b.lo[0]) * (b.hi[1] - b.lo[1]), under = all.filter(o => o !== b && Math.abs(o.hi[2] - b.lo[2]) < 0.06 && o.lo[2] < b.lo[2]).reduce((s, o) => s + [0, 1].reduce((a, k) => a * Math.max(0, Math.min(o.hi[k], b.hi[k]) - Math.max(o.lo[k], b.lo[k])), 1), 0);
  if (under > REACH.cover * area) return [];                              // stands on a block: the block is seen
  const up = Math.min(...BODY_Z.map(z => (z >= b.hi[2] - 0.01 ? z - b.hi[2] + REACH.up : Infinity))), down = Math.min(...BODY_Z.slice(2).map(z => (z <= b.lo[2] + 0.01 ? b.lo[2] - z + REACH.down : Infinity)));
  const seen = BODY_Z.find(z => z > b.lo[2] + 0.01 && z < b.hi[2] - 0.01);         // it holds one of those points itself: the sliver is for its turned slices, whose grace may leave nothing of a thin top
  const r = seen ? 0.01 : Math.max(0.005, Math.min(up, down)), lo = [...b.lo], hi = [...b.hi]; if (seen) [lo[2], hi[2]] = [seen - 0.005, seen + 0.005]; else if (up <= down) lo[2] = hi[2] - REACH.slim; else hi[2] = lo[2] + REACH.slim;
  if (Math.min(hi[0] - lo[0], hi[1] - lo[1]) < 2 * r + 0.15) return [];      // too narrow to be stood through
  return [{ lo, hi, grace: -r, reach: true, seen: !!seen }];
}

// the parts where the prop stands: square to the axes one box each, else its turned rectangle in slices
function placed(parts, g, square) {
  const at = [g.position.x, -g.position.z, g.position.y], a = square ? Math.round(g.rotation.y / (Math.PI / 2)) * Math.PI / 2 : g.rotation.y, c = Math.cos(a), s = Math.sin(a);
  const turn = p => [at[0] + p[0] * c - p[1] * s, at[1] + p[0] * s + p[1] * c];
  const L = parts.filter(b => !(square && b.seen)).map(b => ({ b, n: 1, q: [[b.lo[0], b.lo[1]], [b.hi[0], b.lo[1]], [b.hi[0], b.hi[1]], [b.lo[0], b.hi[1]]].map(turn) }));
  for (const l of L) l.s = slices(l.q, l.n = !square && l.b.reach ? 5 : 1);
  if (!square) {
    // how far a slice's corner stands out from the turned side: the part that stands out most is cut again
    const size = b => (b.hi[0] - b.lo[0]) * (b.hi[1] - b.lo[1]) * (b.hi[2] - b.lo[2]), real = parts.filter(b => !b.reach), box = { lo: [0, 1, 2].map(x => Math.min(...real.map(b => b.lo[x]))), hi: [0, 1, 2].map(x => Math.max(...real.map(b => b.hi[x]))) };
    const open = parts.some(b => b.reach) || real.reduce((v, b) => v + size(b), 0) < OPEN * size(box), [cap, fine] = open ? [real.length > PARTS_MAX ? TURN_BIG : TURN_MAX, 0.12] : [TURN_SHUT, 0.2], out = l => l.s.w * Math.min(Math.abs(c), Math.abs(s)) * (l.b.reach ? 0.5 : 1);
    for (let total = L.reduce((v, l) => v + l.n, 0); total < cap; total++) { const l = L.reduce((m, x) => (out(x) > out(m) ? x : m)); if (!(out(l) > fine)) break; l.s = slices(l.q, ++l.n); }
  }
  return L.flatMap(({ b, s: sl, n }) => {
    if (b.reach) return sl.inner.map(r => ({ ...b, lo: [r[0] - b.grace, r[1] - b.grace, at[2] + b.lo[2]], hi: [r[2] + b.grace, r[3] + b.grace, at[2] + b.hi[2]] }));
    // a wide part's corners stand out of its turned side: a body may sink in as far (the slices meet that much deeper, the foot lies that much lower)
    const e = square || Math.min(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1]) < WIDE ? 0 : Math.min(SINK, sl.w * Math.min(Math.abs(c), Math.abs(s))), a = sl.axis;
    return sl.rects.map((r, i) => { const q = [...r]; if (i) q[a] -= e; if (i < n - 1) q[2 + a] += e;
      return { lo: [q[0], q[1], at[2] + b.lo[2] - (b.lo[2] < 0.02 ? e : 0)], hi: [q[2], q[3], at[2] + b.hi[2]], ...(e > 0.01 ? { grace: +e.toFixed(3) } : {}) }; });
  }).filter(b => b.lo[0] < b.hi[0] && b.lo[1] < b.hi[1]);
}
const WIDE = 0.35, SINK = 0.12;
const OPEN = 0.55;                                 // a prop that fills less of its own box than this has room in it (a stage, a scaffold), as one with a thin top has
// a convex polygon as n slices of equal width w along x or y (the better), lapped: rects: [[x0, y0, x1, y1]] round it, inner:
// inside it (a reach must not count beside its top)
function slices(q, n) {
  let best = null;
  for (const a of [0, 1]) {
    const o = 1 - a, u0 = Math.min(...q.map(p => p[a])), u1 = Math.max(...q.map(p => p[a])), w = (u1 - u0) / n, rects = [], inner = []; let area = 0;
    const span = x => { const v = q.flatMap((p, k) => { const t = q[(k + 1) % q.length]; return (p[a] - x) * (t[a] - x) <= 0 && p[a] !== t[a] ? [p[o] + (t[o] - p[o]) * (x - p[a]) / (t[a] - p[a])] : []; }); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
    const rect = (x0, x1, v) => (a ? [v[0], x0, v[1], x1] : [x0, v[0], x1, v[1]]);
    for (let i = 0; i < n; i++) {
      const x0 = u0 + i * w - (i ? LAP / 2 : 0), x1 = u0 + (i + 1) * w + (i < n - 1 ? LAP / 2 : 0), A = span(x0 + 1e-6), B = span(x1 - 1e-6), vs = [...(A || []), ...(B || []), ...q.filter(p => p[a] >= x0 && p[a] <= x1).map(p => p[o])];
      if (!vs.length) continue; const v = [Math.min(...vs), Math.max(...vs)]; area += w * (v[1] - v[0]); rects.push(rect(x0, x1, v));
      if (A && B) inner.push(rect(x0, x1, [Math.max(A[0], B[0]), Math.min(A[1], B[1])]));
    }
    if (!best || area < best.area - 1e-9) best = { rects, inner, area, w, axis: a };
  }
  return best;
}

// the COLLIDE entries of prop `name` placed as group g (its own name is g.name); grace: the caller's, on every box
export function propBoxes(g, name, { band = [0.05, 1.8], grace } = {}) {
  const tris = []; triangles(g, t => tris.push(t)); let z0 = Infinity, z1 = -Infinity; for (const t of tris) for (const p of t) { z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  if (!(z1 - z0 >= THIN)) return [];
  const foot = Math.max(z0, -1), r3 = a => a.map(v => +v.toFixed(3)), out = (b, o = {}) => ({ lo: r3([b.lo[0], b.lo[1], foot - (o.grace ?? 0)]), hi: r3([b.hi[0], b.hi[1], b.top]), ...(grace ?? o.grace ? { grace: grace ?? o.grace } : {}) });
  const kind = SEAT.lie.test(name) ? 'lie' : SEAT.sit.test(name) ? 'sit' : null;
  const deg = ((g.rotation.y * 180 / Math.PI) % 90 + 90) % 90, square = Math.min(deg, 90 - deg) <= TURN_MIN, k = g.scale.x;
  const R = kind && raster(tris, band), seat = R && seatTop(R.cells, z0 + 0.2 * k, z0 + 0.8 * k);
  let boxes;
  if (kind && !R) return [];
  if (seat == null) boxes = placed(partsOf(g, name, band[1] - g.position.y), g, square).filter(b => b.hi[2] > band[0]).map(b => ({ lo: r3(b.lo), hi: r3(b.hi), ...(grace ?? b.grace ? { grace: grace ?? b.grace } : {}), reach: b.reach }));
  else {
    const over = seat + (square ? SEAT.over[kind] * k : Math.max(SEAT.over[kind] * k, TURNED_OVER * (R.top - seat)));
    const high = cover([{ cells: R.cells.filter(c => c.top > over), height: b => b.top - seat }], OVER_MAX, R.step);
    // the block: the cells about as high as the seat (a foot plate, a star base, a rocker lies lower: the feet go there)
    const low = cover([{ cells: body(R.cells.filter(c => c.top <= over && c.top > seat - SEAT.under * k)), grace: 2 * SEAT_GRACE, height: () => seat - z0 }], Math.min(MAX_BOXES, SEAT_MAX - high.length), R.step);
    boxes = [...low.map(b => out({ ...b, top: seat }, { grace: SEAT_GRACE })), ...high.map(b => out(b))];
  }
  if (grace != null) boxes = boxes.filter(b => !b.reach);          // the caller says how far a body may sink in: no reach
  return boxes.map(({ reach: _, ...b }, i) => ({ name: boxes.length > 1 ? `${g.name}#${i + 1}` : g.name, ...b }));
}
