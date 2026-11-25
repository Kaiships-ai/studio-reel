// The solid boxes of a placed prop, in the array the set exports as COLLIDE. The gates (engine/play.js: body, arm and prop in
// the set; engine/cast.js: hands stop on a solid; engine/solids.js restBoxes) read that array and nothing else of a .glb:
// solidBoxes() only sees box meshes. Axis-aligned { name, lo, hi } in Blender metres, so:
//   - a prop square to the axes (within TURN_MIN degrees of a quarter turn) is one box, measured from its triangles;
//   - a prop turned off the axes is up to MAX_BOXES boxes `<prop>#1..`: its footprint, rastered from the real triangles as
//     placed, cut where the cut saves the most (one box round a 45 degree bench is twice the bench);
//   - a seat or a bed (sizes.js SEAT) is a block up to the seat its own top faces show, plus boxes for what stands over it
//     (a back, arms, a headboard), up to SEAT_MAX in all. A figure sitting or lying on it is above the block and in front of the back; one standing
//     through it has its ankles in the block. The block carries grace SEAT_GRACE (a body sinks into a cushion);
//   - a thin prop (under THIN tall: a rug, a plate) and one wholly above the band are none.
// A box starts at the prop's own foot (a wall clock at 1.5 m does not stop the figure under it) and reaches the top of the
// triangles that cross the band, as glb.js bodyBox.
import * as THREE from 'three';
import { bodyBox } from '#kit/sets/glb.js';
import { SEAT } from './sizes.js';

export const TURN_MIN = 5, MAX_BOXES = 6, SEAT_MAX = 8, OVER_MAX = 4, THIN = 0.06, SEAT_GRACE = 0.02;
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

// the COLLIDE entries of prop `name` placed as group g (its own name is g.name); grace: the caller's, on every box
export function propBoxes(g, name, { band = [0.05, 1.8], grace } = {}) {
  const tris = []; triangles(g, t => tris.push(t)); let z0 = Infinity, z1 = -Infinity; for (const t of tris) for (const p of t) { z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  if (!(z1 - z0 >= THIN)) return [];
  const foot = Math.max(z0, -1), r3 = a => a.map(v => +v.toFixed(3)), out = (b, o = {}) => ({ lo: r3([b.lo[0], b.lo[1], foot - (o.grace ?? 0)]), hi: r3([b.hi[0], b.hi[1], b.top]), ...(grace ?? o.grace ? { grace: grace ?? o.grace } : {}) });
  const kind = SEAT.lie.test(name) ? 'lie' : SEAT.sit.test(name) ? 'sit' : null;
  const deg = ((g.rotation.y * 180 / Math.PI) % 90 + 90) % 90, square = Math.min(deg, 90 - deg) <= TURN_MIN, k = g.scale.x;
  let boxes;
  if (!kind && square) { const b = bodyBox(g, band); boxes = b ? [out({ lo: b.lo, hi: b.hi, top: b.hi[2] })] : []; }
  else {
    const R = raster(tris, band); if (!R) return [];
    const seat = kind && seatTop(R.cells, z0 + 0.2 * k, z0 + 0.8 * k);
    if (seat == null) boxes = cover([{ cells: R.cells, height: () => 1 }], MAX_BOXES, R.step).map(b => out({ ...b, top: R.top }));
    else {
      const over = seat + (square ? SEAT.over[kind] * k : Math.max(SEAT.over[kind] * k, TURNED_OVER * (R.top - seat)));
      const high = cover([{ cells: R.cells.filter(c => c.top > over), height: b => b.top - seat }], OVER_MAX, R.step);
      // the block: the cells about as high as the seat (a foot plate, a star base, a rocker lies lower: the feet go there)
      const low = cover([{ cells: body(R.cells.filter(c => c.top <= over && c.top > seat - SEAT.under * k)), grace: 2 * SEAT_GRACE, height: () => seat - z0 }], Math.min(MAX_BOXES, SEAT_MAX - high.length), R.step);
      boxes = [...low.map(b => out({ ...b, top: seat }, { grace: SEAT_GRACE })), ...high.map(b => out(b))];
    }
  }
  return boxes.map((b, i) => ({ name: boxes.length > 1 ? `${g.name}#${i + 1}` : g.name, ...b }));
}
