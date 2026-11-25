// How the costumes are measured, headless, through the real rig: a clip played on a dressed figure and what is wrong with its cloth
// on each frame. Used by stick-wardrobe.test.mjs and by any sweep of it (a girth, a clip), so a number in a table is the test's own.
import * as THREE from 'three';
import { ALL, getClip, placeClip } from '../../styles/stick-man/motion-lib/index.js';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { BODIES as motionBodies } from '../../styles/stick-man/motion-lib/bodies.js';
import { compileTrack, playActor } from '../../styles/stick-man/engine/motion.js';

await rigStick('adult');   // (the headless canvas the figure and the cloth paint on)
const { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
await import('../../styles/stick-man/kit/cast/wardrobe.js'); const { HOOKS } = await import('../../styles/stick-man/engine/play.js');
const { LOOKS, PLACE_OF } = await import('../../styles/stick-man/kit/cast/sheetcells.js');
const { H_T, Y0, torsoR } = await import('../../styles/stick-man/kit/cast/wear.js'), { makeStick } = await import('../../styles/stick-man/engine/cast.js');

export const BODIES = ['adult', 'heavy', 'thin', 'elder', 'child'], LIMB_R = 0.046 * 0.6 / 2, HAND_R = 0.030;
// STRETCH: the 99th edge of 100, walking; BENT: over the knees as a figure folds down onto a seat
export const TRIM_MM = 4.5, ARM_MM = 1, STRETCH = 0.15, BENT = 0.22, AREA = [0.65, 1.15], FOLD = 0.03, SOLID_MM = 2, MOVE_M = 0.01;
// The second round's limits (costume review 25/11), set before the fix was measured, from what is seen at 720 wide: a standing
// figure is ~590 px a metre, so 1 px = 1.7 mm and the ink line is 3-4 px (5-7 mm).
//   ARM_IN   the cloth's surface inside the arm AS DRAWN (the curved line, or its sleeve), mm: under the ink line's own width
//            (2.4 px) the arm's edge still reads whole. No part of a limb, no lap and no frame is left out
//   HAND_IN  the same for the mitt (30 mm in radius): a third of it, a hand resting on cloth, is contact; more is swallowed
//   EDGE     the worst single edge (36 mm): 25 % = 9 mm = 5 px, one ink line more than it was; 30 % folding onto a seat or in a
//            leap or a run, where the edge is on screen for a frame or two
//   KINK     the bend of a column from one 4 cm row to the next, deg: 45 walking (the hem's last row hooks under 17 px), 60 in a
//            run or a jump, 75 over a seated knee (the knee itself is 90)
//   HEM      the corner between two edges of the hem, deg: 60 (an even hem's is 11), 75 seated
//   ACC      a point of the cloth against the body, cm a frame a frame: 6 walking (35 px: a hem that jerks back and forth), 10 in a
//            run or a jump (a landing is a hit), 5 sitting down
//   TORSO_MM the torso showing past a garment sewn above it (costume review 3, M1: a strip of sweater under a seated skirt), set before
//            it was measured: as ARM_IN, under the ink line's own width
export const TORSO_MM = 4, ARM_IN = 4, HAND_IN = 10, MODES = { walk: { stretch: STRETCH, edge: 0.25, kink: 45, hem: 60, acc: 6 }, fast: { stretch: BENT, edge: 0.30, kink: 60, hem: 60, acc: 10 }, sit: { stretch: BENT, edge: 0.30, kink: 75, hem: 75, acc: 5 } };
export const v3 = (A, i) => new THREE.Vector3().fromBufferAttribute(A, i);
export const look = n => LOOKS.find(l => l[0] === n)[1];
export const wears = (S, list) => { HOOKS.costume(S, list, { group: new THREE.Group() }); return S.wardrobe; };

// plays a pose's clip (or any clip of the library: { clip, whole, motion }) on a dressed figure; each(f, S, place) on every frame
// from `from`. spec: fields over the body's own (a girth); motion: the body whose clip it plays (the body's own by default)
export async function play(list, body, pose, { from = 0, to = null, each, q = null, spec = null } = {}) {
  const { S, toPose } = await rigFigure(body, spec), P = typeof pose === 'string' ? PLACE_OF({ body, pose }) : clipPlace(pose.clip, pose.motion || body, pose.whole), last = to ?? P.f; S.obstacles = P.solids; S.rest = [...P.solids]; wears(S, list);
  const keys = placeClip(P.key, { pos: [0, 0], yaw: 90 }).keys, tr = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(tr, 0, Math.max(last, keys[keys.length - 1].f) + 2), at_ = f => toPose(fr[Math.min(fr.length - 1, f)], S.root.scale.x), plan = propPlan(tr, at_, S);
  for (let f = from; f <= last; f++) { const Q = at_(f); Q.propRest = plan.at(f); S.pose2(q ? q(Q, f) : Q); S.face({ t: f }); each?.(f, S, P); }
  return S;
}
export async function rigFigure(body, spec) { const R = await rigStick(body); return spec ? { ...R, S: makeStick({ ...R.S.spec, ...spec }) } : R; }
// a clip of the library and, for one that sits, its seat; its first 70 frames, or the whole of it
export function clipPlace(name, body, whole = false) { const C = getClip(name, body), key = C.advance ? { f: 0, clip: name, body, to: [C.introTravel + C.outroTravel + 4 * C.advance, 0] } : { f: 0, clip: name, body, ...(C.loop && !whole ? { times: 2 } : {}) }, n = placeClip(key, { pos: [0, 0], yaw: 90 }).keys, end = n[n.length - 1].f, m = (C.needs?.marks || []).find(x => x.kind === 'seat'), sc = C.body ? 1 : (motionBodies[body].spec.scale ?? 1);
  return { key, f: whole ? end : Math.min(70, end), solids: m ? [{ name: 'seat', lo: [m.at[0] * sc, m.at[1] * sc - 0.36, 0], hi: [m.to[0] * sc, m.at[1] * sc + 0.36, m.to[2] * sc] }] : [] }; }
// the clips a figure is seated in (they open or end on SIT), every one the library has
export const SIT_CLIPS = ALL.filter(C => C.base === 'SIT' || C.end === 'SIT').map(C => C.clip);
// ------------------------------------------------------------------ the cloth as drawn
export const tris = d => { const out = [], J = d.wrap ? d.cols : d.cols - 1, p = (i, j) => d.ST.drawn[i * d.cols + (j % d.cols)]; for (let i = 0; i + 1 < d.rows; i++) for (let j = 0; j < J; j++) out.push([p(i, j), p(i + 1, j), p(i, j + 1)], [p(i, j + 1), p(i + 1, j), p(i + 1, j + 1)]); return out; };
export const _t = new THREE.Triangle(), _ray = new THREE.Ray(), _q = new THREE.Vector3();
export function crosses(a, b, T) { const dir = b.clone().sub(a), len = dir.length(); if (len < 1e-9) return 0; _ray.set(a, dir.normalize()); return T.filter(t => _ray.intersectTriangle(t[0], t[1], t[2], false, _q) && _q.distanceTo(a) < len).length; }
export const nearest = (p, T) => { let m = 1e9; for (const t of T) { if (t[0].distanceTo(p) > 0.16) continue; _t.set(...t); _t.closestPointToPoint(p, _q); m = Math.min(m, _q.distanceTo(p)); } return m; };
export const areaOf = T => T.reduce((s, t) => s + _t.set(...t).getArea(), 0);
// the limb lines as drawn: the centres of their rings (root metres)
export const line = (S, k) => { const A = S.parts.limbs[k].geometry.attributes.position; return Array.from({ length: A.count / 10 }, (_, i) => { const v = new THREE.Vector3(); for (let j = 0; j < 10; j++) v.add(v3(A, i * 10 + j)); return v.divideScalar(10); }); };
const track = new WeakMap();   // a cloth's last two frames, in the body's frame
// how far (mm) the torso below a garment's sewn row stands out of the garment: its drawn points against the nearest of the cloth, and
// the way that faces. A garment sewn all round only (a skirt, a dress): in a coat's or an apron's opening the body shows by design
function torsoPast(S, d, T, solids) {
  const A = S.parts.torso.geometry.attributes, M = S.parts.torso.parent.matrix, p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Vector3(); let worst = -1e9;
  for (let i = 0; i < A.position.count; i += 3) { const y = A.uv.getY(i) * H_T + Y0; if (y > d.guide.y - 0.012) continue; p.fromBufferAttribute(A.position, i).applyMatrix4(M); if (solids.length) { q.copy(p).applyMatrix4(S.root.matrixWorld); if (solids.some(b => q.x > b.lo[0] && q.x < b.hi[0] && -q.z > b.lo[1] && -q.z < b.hi[1] && q.y > b.lo[2] && q.y < b.hi[2])) continue; }   // (a point sunk in the seat is not seen)
    let m = 1e9, k = -1; for (let t = 0; t < T.length; t++) { if (T[t][0].distanceToSquared(p) > 0.0256) continue; _t.set(...T[t]); _t.closestPointToPoint(p, _q); const l = _q.distanceToSquared(p); if (l < m) { m = l; k = t; q.copy(_q); } }
    if (k < 0) continue; _t.set(...T[k]); _t.getNormal(n).multiplyScalar(-d.sheet.sign); worst = Math.max(worst, 1000 * p.sub(q).dot(n)); }
  return worst;
}
export function clothFaults(S, d, P, f, mode = 'walk', legsIn = false) {
  const M = MODES[mode], out = [], T = tris(d), SC = S.root.scale.x, say = s => out.push(`f${f}: ${s}`), D = d.ST.drawn, at_ = (i, j) => D[i * d.cols + j];
  if (d.guide) {
    const st = d.edges.map(([i, j, r]) => D[i].distanceTo(D[j]) * SC / r - 1).sort((a, b) => a - b), p99 = st[Math.floor(0.99 * (st.length - 1))], max = st[st.length - 1]; if (p99 > M.stretch) say(`stretched ${(100 * p99).toFixed(0)} % (p99)`); if (max > M.edge) say(`an edge ${(100 * max).toFixed(0)} % longer`);
    const a = areaOf(T) / (d.area0 ||= areaOf(tris({ ...d, ST: { drawn: d.rest } }))); if (a < AREA[0] || a > AREA[1]) say(`area ${(100 * a).toFixed(0)} % of its own`);
    // a fold-over: two quads side by side facing opposite ways
    const n = T.map(t => _t.set(...t).getNormal(new THREE.Vector3())), J = 2 * (d.wrap ? d.cols : d.cols - 1); let bad = 0, all = 0; for (let k = 0; k < n.length; k++) { for (const q of [k % 2 ? k + 1 : k, k + J]) if (q < n.length && (q === k + J || (q % J))) { all++; if (n[k].dot(n[q]) < -0.2) bad++; } } if (bad / all > FOLD) say(`crumpled: ${(100 * bad / all).toFixed(0)} % of it folds over`);
    let kink = 0, hem = 0; const u = new THREE.Vector3(), w = new THREE.Vector3(), turn = (p, q, r) => (u.subVectors(q, p).length() < 0.004 || w.subVectors(r, q).length() < 0.004 ? 0 : u.angleTo(w) * 57.3);
    for (let j = 0; j < d.cols; j++) { for (let i = 0; i + 2 < d.rows; i++) kink = Math.max(kink, turn(at_(i, j), at_(i + 1, j), at_(i + 2, j))); if (d.wrap || j + 2 < d.cols) hem = Math.max(hem, turn(at_(d.rows - 1, j), at_(d.rows - 1, (j + 1) % d.cols), at_(d.rows - 1, (j + 2) % d.cols))); }
    if (kink > M.kink) say(`a column bends ${kink.toFixed(0)} deg`); if (hem > M.hem) say(`the hem turns ${hem.toFixed(0)} deg`);
    for (const k of ['legL', 'legR']) { const L = line(S, k); let c = 0, deep = -1e9; for (let i = 2; i + 1 < L.length; i++) { c += crosses(L[i], L[i + 1], T); if (legsIn) for (const e of [0, 0.5]) deep = Math.max(deep, LIMB_R - nearest(L[i].clone().lerp(L[i + 1], e), T)); }
      if (c) say(`${k} through the cloth`); if (1000 * deep > ARM_IN) say(`cloth ${(1000 * deep).toFixed(1)} mm into ${k}`); }
    const past = d.wrap ? torsoPast(S, d, T, P.solids) : 0; if (past > TORSO_MM) say(`the torso ${past.toFixed(1)} mm past the cloth`);
    const Mi = S.parts.torso.parent.matrix.clone().invert(), B = D.map(p => p.clone().applyMatrix4(Mi)), h = track.get(d); if (h && h.f === f - 1 && h.b) { let m = 0; for (let i = 0; i < B.length; i++) m = Math.max(m, u.copy(B[i]).addScaledVector(h.a[i], -2).add(h.b[i]).length()); if (100 * m > M.acc) say(`jerks ${(100 * m).toFixed(1)} cm a frame a frame`); } track.set(d, { f, a: B, b: h && h.f === f - 1 ? h.a : null });
  }
  for (const k of ['armL', 'armR']) { const L = line(S, k), sl = S.wardrobe.sleeves.filter(s => s.arm === k); let deep = -1e9; if (d.guide) for (let i = 4; i + 1 < L.length; i++) for (const e of [0, 0.5]) { if (i + e > L.length - 2) continue; const r = Math.max(LIMB_R, ...sl.filter(s => i >= s.rings[0] && i < s.rings[1]).map(s => s.r)); deep = Math.max(deep, r - nearest(L[i].clone().lerp(L[i + 1], e), T)); }
    if (1000 * deep > ARM_IN) say(`cloth ${(1000 * deep).toFixed(1)} mm into ${k}`); let c = 0; for (let i = 4; i + 1 < L.length; i++) c += crosses(L[i], L[i + 1], T); if (c) say(`${k} through the cloth`);
    const ha = 1000 * (HAND_R - nearest(L[L.length - 1], T)); if (d.guide && ha > HAND_IN) say(`cloth ${ha.toFixed(0)} mm into the hand of ${k}`); }
  const MW = S.root.matrixWorld, pts = [...D, ...T.map(t => t[0].clone().add(t[1]).add(t[2]).divideScalar(3))].map(p => p.clone().applyMatrix4(MW));
  for (const b of P.solids) { const deep = Math.max(...pts.map(p => Math.min(p.x - b.lo[0], b.hi[0] - p.x, -p.z - b.lo[1], b.hi[1] + p.z, p.y - b.lo[2], b.hi[2] - p.y))); if (deep * 1000 > SOLID_MM) say(`${(deep * 1000).toFixed(0)} mm inside the ${b.name}`); }
  return out;
}
export const CLOTHED = ['doctor', 'chef', 'dress', 'sweater + skirt'];
// what went wrong, worst first: one line a kind of fault, how many frames, the worst of it
export const summary = bad => { const g = {}; for (const b of bad) { const [, f, what] = /^f(\d+): (.*)$/.exec(b), k = what.replace(/-?[\d.]+/g, '#'), v = +(/-?[\d.]+/.exec(what.replace(/leg[LR]|arm[LR]/, ''))?.[0] ?? 0); const o = g[k] ||= { n: 0, v: -1e9, f: 0, what }; o.n++; if (v > o.v) Object.assign(o, { v, f, what }); } return Object.values(g).map(o => `${o.n} frames, worst f${o.f}: ${o.what}`); };

// ------------------------------------------------------------------ rigid pieces on the shell
export function shell(S) { const g = S.parts.torso.geometry, P = g.attributes.position, I = g.index.array, T = []; for (let t = 0; t < I.length; t += 3) { const a = v3(P, I[t]), b = v3(P, I[t + 1]), c = v3(P, I[t + 2]); if (_t.set(a, b, c).getArea() < 1e-8) continue; const m = a.clone().add(b).add(c).divideScalar(3); T.push({ a, b, c, m, r: Math.max(m.distanceTo(a), m.distanceTo(b), m.distanceTo(c)) }); } return T; }
export function off(T, p) { let best = Infinity; for (const t of T) { if (t.m.distanceTo(p) > t.r + 0.14) continue; _t.set(t.a, t.b, t.c); _t.closestPointToPoint(p, _q); best = Math.min(best, _q.distanceTo(p)); } return best; }
export const pieces = S => S.wardrobe.group.children.map((m, k) => { const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 14)); return { k, A, idx: Array.from({ length: Math.ceil(A.count / st) }, (_, i) => i * st) }; });
export const ARMS = S => ['armL', 'armR'].flatMap(a => { const A = S.parts.limbs[a].geometry.attributes.position, c = i => { const v = new THREE.Vector3(); for (let j = 0; j < 10; j++) v.add(v3(A, i * 10 + j)); return v.divideScalar(10); }; return Array.from({ length: 12 }, (_, i) => [c(i + 3), c(i + 4)]); });
export const segD = (p, [a, b]) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
// TOUCH_MM: a rigid piece's nearest point to what it lies on, the shell or a piece itself on the shell (a buckle on a belt, a strap's
// plate on the strap), every vertex counted (C1, costume review 2: a sample of 14 let a belt 42 mm off pass, and students 125).
// 3 mm is under 2 px at 720 and under the 5 mm ink line round a piece: no gap shows between them
export const TOUCH_MM = 3;
export const trisOf = m => { const A = m.geometry.attributes.position, I = m.geometry.index?.array || Array.from({ length: A.count }, (_, i) => i), o = []; for (let t = 0; t < I.length; t += 3) { const a = v3(A, I[t]), b = v3(A, I[t + 1]), c = v3(A, I[t + 2]); if (_t.set(a, b, c).getArea() < 1e-10) continue; const k = a.clone().add(b).add(c).divideScalar(3); o.push({ a, b, c, m: k, r: Math.max(k.distanceTo(a), k.distanceTo(b), k.distanceTo(c)) }); } return o; };
export const allPts = m => { const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 400)); return Array.from({ length: Math.ceil(A.count / st) }, (_, i) => v3(A, i * st)); };
// the rigid pieces of a dressed figure (S, built and not yet bent): those that float (nothing they touch lies on the shell), how far the
// worst stands off (mm), the worst ring's gap (mm) and the most any of them moves on the shell as it bends (mm)
export function trims(S, n) {
  const floats = []; let gapMax = 0, ring = { mm: 0, what: '' }, shift = { mm: 0, what: '' }; S.pose2({}); const T0 = shell(S), rest = pieces(S).map(q => ({ ...q, d: q.idx.map(i => off(T0, v3(q.A, i))) }));
  const ms = S.wardrobe.group.children, P = ms.map(allPts), gap = ms.map((m, k) => Math.min(...P[k].map(p => off(T0, p)))), on = gap.map(g => g <= TOUCH_MM / 1000);
  for (let grew = true; grew;) { grew = false; ms.forEach((m, k) => { if (on[k]) return; for (let o = 0; o < ms.length; o++) if (on[o] && o !== k) { const T = trisOf(ms[o]), g = Math.min(...P[k].map(p => off(T, p))); if (g <= TOUCH_MM / 1000) { on[k] = grew = true; break; } } }); }
  ms.forEach((m, k) => { if (!on[k]) { gapMax = Math.max(gapMax, 1000 * gap[k]); floats.push(`${n}: piece ${k} floats ${(1000 * gap[k]).toFixed(1)} mm off the shell, touching nothing that lies on it`); } });
  for (const q of rest) {
    // a ring round the body (a belt, a sash, a hem band) lies on it all the way round
    const G = new THREE.Box3().setFromBufferAttribute(q.A); if (G.max.z - G.min.z > 1.2 * torsoR(0.05) * S.wardrobe.fit.gz && G.max.x - G.min.x > 1.6 * torsoR(0.05) * S.wardrobe.fit.gx) for (let s = 0; s < 16; s++) { const a = -Math.PI + s * Math.PI / 8; const near = Math.min(...Array.from({ length: q.A.count }, (_, i) => v3(q.A, i)).filter(p => Math.abs(Math.atan2(Math.sin(Math.atan2(p.x, p.z) - a), Math.cos(Math.atan2(p.x, p.z) - a))) < 0.25).map(p => off(T0, p))); if (isFinite(near) && 1000 * near > ring.mm) ring = { mm: 1000 * near, what: `${n}: ring ${q.k} stands ${(1000 * near).toFixed(0)} mm off at ${(a * 57).toFixed(0)} deg` }; } }
  for (const Q of [{ spine: { bend: 60, twist: -5 }, sq: 0.04 }, { spine: { bend: 80 } }, { spine: { bend: -12, side: 14, twist: 12 } }, { spine: { bend: 24 } }]) { S.pose2(Q); const T = shell(S); for (const q of rest) q.idx.forEach((i, j) => { if (q.d[j] > 0.04) return; const e = Math.abs(off(T, v3(q.A, i)) - q.d[j]) * 1000; if (e > shift.mm) shift = { mm: e, what: `${n}: piece ${q.k} moved ${e.toFixed(1)} mm on the shell (bend ${Q.spine.bend})` }; }); }
  return { floats, gapMax, ring, shift };
}
// the deepest any piece's point is in an arm line (mm) as the figure stands now
export const trimInArm = S => { const M = S.parts.torso.parent.matrix, A = ARMS(S); let worst = { mm: -1e9 }; for (const q of pieces(S)) for (const i of q.idx) { const p = v3(q.A, i).applyMatrix4(M), mm = 1000 * (LIMB_R - Math.min(...A.map(s => segD(p, s)))); if (mm > worst.mm) worst = { mm, k: q.k }; } return worst; };
// a short sleeve (armL, armR): how far it goes down past where its arm comes out of the torso (cm)
export function sleeveDown(S, arm) { const F = S.wardrobe.fit, Mi = S.parts.torso.parent.matrix.clone().invert(), L = line(S, arm).map(p => p.applyMatrix4(Mi)), outAt = L.findIndex(p => Math.hypot(p.x / F.gx, p.z / F.gz) > torsoR(p.y)), end = Math.max(...S.wardrobe.sleeves.filter(s => s.arm === arm).map(s => s.rings[1])); return { cm: 100 * (end - outAt) * L[0].distanceTo(L[15]) / 15, outAt, end }; }
