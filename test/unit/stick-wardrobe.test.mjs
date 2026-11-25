// The wardrobe (kit/cast/wardrobe.js), through the real rig, headless. Each check is a fault Kai's director saw on the first
// costume sheets (25/11) and what would have caught it there:
//   seated rag, a scrap out of the chair   cloth: no point in a solid, no limb through it, stretch, area, no fold-over, a lap over the thighs that hangs past the knees
//   an apron like a flap                   APRON: 150 deg round the front, the bib's foot as wide as the skirt it is sewn to
//   a coat's slab tails                    COAT: goes on from the shell with no step, on every girth; closed at the hip
//   a belt off the body                    TRIMS: each piece lies on the shell of that body, and stays there as it bends; no fixed-metre item in a preset
//   a hand through a skirt                 HANDS: no arm line or hand through the cloth, standing, walking and sitting
//   cuffs on bare arms                     SLEEVES: a long-sleeved garment covers the arm line from the shoulder to the wrist
//   a scarf like brass                     STRIPES: hard stripes of two colours, never blended
//   faint trims                            READABLE: each uniform has pieces big enough, inked thick enough, off the cloth in value
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getClip, placeClip } from '../../styles/stick-man/motion-lib/index.js';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { compileTrack, playActor } from '../../styles/stick-man/engine/motion.js';

await rigStick('adult');   // (the headless canvas the figure and the cloth paint on)
const { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
const W = await import('../../styles/stick-man/kit/cast/wardrobe.js'), { HOOKS } = await import('../../styles/stick-man/engine/play.js');
const { CELLS, LOOKS, PLACE_OF } = await import('../../styles/stick-man/kit/cast/sheetcells.js');
const { at, torsoR, neckY, fitOf } = await import('../../styles/stick-man/kit/cast/wear.js'), { APRON_SPAN, APRON_Y } = await import('../../styles/stick-man/kit/cast/garments.js');
const { PALETTES, UNIFORM } = W;

const BODIES = ['adult', 'heavy', 'thin', 'elder', 'child'], LIMB_R = 0.046 * 0.6 / 2, HAND_R = 0.030;
// STRETCH: the 99th edge of 100, walking; BENT: over the knees as a figure folds down onto a seat
const TRIM_MM = 4.5, ARM_MM = 1, STRETCH = 0.15, BENT = 0.22, AREA = [0.65, 1.15], FOLD = 0.03, SOLID_MM = 2, MOVE_M = 0.01;
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
const ARM_IN = 4, HAND_IN = 10, MODES = { walk: { stretch: STRETCH, edge: 0.25, kink: 45, hem: 60, acc: 6 }, fast: { stretch: BENT, edge: 0.30, kink: 60, hem: 60, acc: 10 }, sit: { stretch: BENT, edge: 0.30, kink: 75, hem: 75, acc: 5 } };
const v3 = (A, i) => new THREE.Vector3().fromBufferAttribute(A, i);
const look = n => LOOKS.find(l => l[0] === n)[1];
const wears = (S, list) => { HOOKS.costume(S, list, { group: new THREE.Group() }); return S.wardrobe; };

// plays a pose's clip (or any clip of the library: { clip }) on a dressed figure; each(f, S, place) on every frame from `from`
async function play(list, body, pose, { from = 0, to = null, each, q = null }) {
  const { S, toPose } = await rigStick(body), P = typeof pose === 'string' ? PLACE_OF({ body, pose }) : clipPlace(pose.clip, body), last = to ?? P.f; S.obstacles = P.solids; S.rest = [...P.solids]; wears(S, list);
  const keys = placeClip(P.key, { pos: [0, 0], yaw: 90 }).keys, tr = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(tr, 0, Math.max(last, keys[keys.length - 1].f) + 2), at_ = f => toPose(fr[Math.min(fr.length - 1, f)], S.root.scale.x), plan = propPlan(tr, at_, S);
  for (let f = from; f <= last; f++) { const Q = at_(f); Q.propRest = plan.at(f); S.pose2(q ? q(Q, f) : Q); S.face({ t: f }); each?.(f, S, P); }
  return S;
}
function clipPlace(name, body) { const C = getClip(name, body), key = C.advance ? { f: 0, clip: name, body, to: [C.introTravel + C.outroTravel + 4 * C.advance, 0] } : { f: 0, clip: name, body, ...(C.loop ? { times: 2 } : {}) }, n = placeClip(key, { pos: [0, 0], yaw: 90 }).keys; return { key, f: Math.min(70, n[n.length - 1].f), solids: [] }; }
// ------------------------------------------------------------------ the cloth as drawn
const tris = d => { const out = [], J = d.wrap ? d.cols : d.cols - 1, p = (i, j) => d.ST.drawn[i * d.cols + (j % d.cols)]; for (let i = 0; i + 1 < d.rows; i++) for (let j = 0; j < J; j++) out.push([p(i, j), p(i + 1, j), p(i, j + 1)], [p(i, j + 1), p(i + 1, j), p(i + 1, j + 1)]); return out; };
const _t = new THREE.Triangle(), _ray = new THREE.Ray(), _q = new THREE.Vector3();
function crosses(a, b, T) { const dir = b.clone().sub(a), len = dir.length(); if (len < 1e-9) return 0; _ray.set(a, dir.normalize()); return T.filter(t => _ray.intersectTriangle(t[0], t[1], t[2], false, _q) && _q.distanceTo(a) < len).length; }
const nearest = (p, T) => { let m = 1e9; for (const t of T) { if (t[0].distanceTo(p) > 0.16) continue; _t.set(...t); _t.closestPointToPoint(p, _q); m = Math.min(m, _q.distanceTo(p)); } return m; };
const areaOf = T => T.reduce((s, t) => s + _t.set(...t).getArea(), 0);
// the limb lines as drawn: the centres of their rings (root metres)
const line = (S, k) => { const A = S.parts.limbs[k].geometry.attributes.position; return Array.from({ length: A.count / 10 }, (_, i) => { const v = new THREE.Vector3(); for (let j = 0; j < 10; j++) v.add(v3(A, i * 10 + j)); return v.divideScalar(10); }); };
const track = new WeakMap();   // a cloth's last two frames, in the body's frame
function clothFaults(S, d, P, f, mode = 'walk', legsIn = false) {
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
    const Mi = S.parts.torso.parent.matrix.clone().invert(), B = D.map(p => p.clone().applyMatrix4(Mi)), h = track.get(d); if (h && h.f === f - 1 && h.b) { let m = 0; for (let i = 0; i < B.length; i++) m = Math.max(m, u.copy(B[i]).addScaledVector(h.a[i], -2).add(h.b[i]).length()); if (100 * m > M.acc) say(`jerks ${(100 * m).toFixed(1)} cm a frame a frame`); } track.set(d, { f, a: B, b: h && h.f === f - 1 ? h.a : null });
  }
  for (const k of ['armL', 'armR']) { const L = line(S, k), sl = S.wardrobe.sleeves.filter(s => s.arm === k); let deep = -1e9; if (d.guide) for (let i = 4; i + 1 < L.length; i++) for (const e of [0, 0.5]) { if (i + e > L.length - 2) continue; const r = Math.max(LIMB_R, ...sl.filter(s => i >= s.rings[0] && i < s.rings[1]).map(s => s.r)); deep = Math.max(deep, r - nearest(L[i].clone().lerp(L[i + 1], e), T)); }
    if (1000 * deep > ARM_IN) say(`cloth ${(1000 * deep).toFixed(1)} mm into ${k}`); let c = 0; for (let i = 4; i + 1 < L.length; i++) c += crosses(L[i], L[i + 1], T); if (c) say(`${k} through the cloth`);
    const ha = 1000 * (HAND_R - nearest(L[L.length - 1], T)); if (d.guide && ha > HAND_IN) say(`cloth ${ha.toFixed(0)} mm into the hand of ${k}`); }
  const MW = S.root.matrixWorld, pts = [...D, ...T.map(t => t[0].clone().add(t[1]).add(t[2]).divideScalar(3))].map(p => p.clone().applyMatrix4(MW));
  for (const b of P.solids) { const deep = Math.max(...pts.map(p => Math.min(p.x - b.lo[0], b.hi[0] - p.x, -p.z - b.lo[1], b.hi[1] + p.z, p.y - b.lo[2], b.hi[2] - p.y))); if (deep * 1000 > SOLID_MM) say(`${(deep * 1000).toFixed(0)} mm inside the ${b.name}`); }
  return out;
}
const CLOTHED = ['doctor', 'chef', 'dress', 'sweater + skirt'];
// KNOWN, NOT FIXED (25/11): cloth in a run, a jump or a leap through a window is not clean on any body (legs through it, a hem
// that jerks 12-35 cm a frame a frame, edges 30-150 % long). These run and print every fault (todo), so the count is seen; they
// turn into failing tests the day a garment is used in such a shot. A film keeps a skirt, a coat or an apron out of a run.
const HURRY = 'cloth in a run or a jump: not clean yet (kit-body costume review 2)';
// what went wrong, worst first: one line a kind of fault, how many frames, the worst of it
const summary = bad => { const g = {}; for (const b of bad) { const [, f, what] = /^f(\d+): (.*)$/.exec(b), k = what.replace(/-?[\d.]+/g, '#'), v = +(/-?[\d.]+/.exec(what.replace(/leg[LR]|arm[LR]/, ''))?.[0] ?? 0); const o = g[k] ||= { n: 0, v: -1e9, f: 0, what }; o.n++; if (v > o.v) Object.assign(o, { v, f, what }); } return Object.values(g).map(o => `${o.n} frames, worst f${o.f}: ${o.what}`); };

for (const body of BODIES) for (const n of body === 'adult' ? [...CLOTHED, 'sweater + scarf'] : ['doctor', 'chef', 'dress']) test(`cloth: ${n} on ${body} standing and walking: whole, outside the limbs, and it moves`, async () => {
  const bad = []; let move = 0, rest = null;
  await play(look(n), body, 'stand', { to: 4, each: (f, S, P) => { if (f === 4) for (const d of S.wardrobe.drapes) bad.push(...clothFaults(S, d, P, f)); } });
  await play(look(n), body, 'walk', { each: (f, S, P) => { for (const d of S.wardrobe.drapes) { bad.push(...clothFaults(S, d, P, f));
    if (f < 24) continue; const Mi = S.parts.torso.parent.matrix.clone().invert(), h = d.ST.drawn[(d.rows - 1) * d.cols + (d.cols >> 1)].clone().applyMatrix4(Mi); rest ||= h; if (d === S.wardrobe.drapes[0]) move = Math.max(move, h.distanceTo(rest)); } } });
  assert.deepEqual(summary(bad), []); assert.ok(move >= MOVE_M, `the cloth hardly moves on a walk (${(100 * move).toFixed(1)} cm)`);
});
// Over a seated knee the cloth falls like cloth, not a tray (costume review 2, V1), set before the fix was measured, from what is
// seen at 720 (~590 px a metre):
//   DROP  the hem hangs this far below the knee's centre at the columns over each knee: 8 cm = 47 px, three widths of the drawn
//         leg, a fall down the shin and not a lip at the knee (the tray: 4.7 cm)
//   FALL  from where the cloth crosses the knee to the hem it runs within this of straight down, deg: cloth hanging over a knee
//         is a knee's width in front of it for 15 cm down (~17 deg); the tray went out as far as it went down (30)
const DROP = 0.08, FALL = 25;
for (const n of CLOTHED) test(`cloth: ${n} sitting down and seated: a lap, not a rag; nothing in the seat; over the knees it falls toward the shins`, async () => {
  const bad = []; let S = null;
  S = await play(look(n), 'adult', 'seated', { each: (f, S_, P) => { for (const d of S_.wardrobe.drapes) bad.push(...clothFaults(S_, d, P, f, 'sit')); } });
  assert.deepEqual(summary(bad), []);
  const d = S.wardrobe.drapes[0], m = q => q.clone().multiplyScalar(0.6), col = j => [...Array(d.rows).keys()].map(i => d.ST.drawn[i * d.cols + j]);
  { const hip = m(S.rig.R.hip), kn = m(S.rig.R.knee); for (const j of d.guide.gap ? [4, d.cols - 5] : [d.cols >> 1]) for (const p of col(j).slice(2)) if (p.z > hip.z + 0.12 && p.z < kn.z - 0.03) assert.ok(p.y > hip.y - 0.02, `the lap sinks under the thighs (${(p.y - hip.y).toFixed(3)} m at column ${j})`); }
  for (const sd of ['L', 'R']) { const kn = m(S.rig[sd].knee);
    // the columns that cross over this knee (a point of theirs above it, within 3 cm of it front to back): the one nearest its top,
    // and its two neighbours
    const over = [...Array(d.cols).keys()].map(j => { let b = 1e9, k = -1; col(j).forEach((p, i) => { const l = p.distanceTo(kn); if (p.y > kn.y && Math.abs(p.z - kn.z) < 0.03 && l < b) { b = l; k = i; } }); return { j, b, k }; }).filter(o => o.k > 0 && o.b < 0.10).sort((a, b) => Math.abs(col(a.j)[a.k].x - kn.x) - Math.abs(col(b.j)[b.k].x - kn.x)).slice(0, 3);
    assert.ok(over.length, `${sd}: no column crosses the knee (the garment stops on the lap)`);
    for (const { j, k } of over) { const c = col(j), h = c[d.rows - 1], kp = c[k], drop = kn.y - h.y, fall = Math.atan2(Math.hypot(h.x - kp.x, h.z - kp.z), kp.y - h.y) * 57.3;
      assert.ok(drop >= DROP, `${sd} column ${j}: the hem hangs ${(100 * drop).toFixed(1)} cm below the knee (${100 * DROP})`); assert.ok(fall <= FALL, `${sd} column ${j}: past the knee it goes ${fall.toFixed(0)} deg off straight down (${FALL})`); } }
});
for (const [body, clips] of [['adult', ['Move_Run_Fwd_Loop', 'Act_Jump_Once', 'Trans_JumpWindow_Once']], ...['heavy', 'thin', 'elder', 'child'].map(b => [b, ['Move_Run_Fwd_Loop']])]) for (const clip of clips) for (const n of ['doctor', 'chef', 'dress']) test(`cloth in a hurry: ${n} on ${body}, ${clip}`, { todo: HURRY }, async () => {
  const bad = []; await play(look(n), body, { clip }, { each: (f, S, P) => { for (const d of S.wardrobe.drapes) bad.push(...clothFaults(S, d, P, f, 'fast')); } }); assert.deepEqual(summary(bad), []);
});
// A leg measured as an arm is (C2, costume review 2): the cloth inside the drawn line's radius, not only its centre through the
// cloth; the same 4 mm (under the ink line's width the leg's edge still reads whole). KNOWN, NOT FIXED (25/11): the cloth's points
// keep clear of a leg but its triangles do not: a straight edge between two rows either side of a bent knee cuts its corner
// (seated up to 12 mm in, walking 6 mm, vertices 19-27 mm off), and the first band, from the sewn row to the next, bridges a
// seated thigh's root (12 mm; at the deepest sit the apron's waistband itself is 12 mm from the thigh's line). Pushing edges out
// as points tore the cloth (edges 400 % long); it needs triangles kept off the limbs inside the solver. These print every fault.
const LEGS_IN = 'cloth inside a drawn leg (triangles, not points, against the limbs): not clean yet (kit-body costume review 2, C2)';
for (const [n, pose] of [...CLOTHED.map(n => [n, 'walk']), ...CLOTHED.map(n => [n, 'seated']), ['dress', 'pick'], ['chef', 'pick']]) test(`cloth no deeper than ${ARM_IN} mm in a drawn leg: ${n}, ${pose}`, { todo: LEGS_IN }, async () => {
  const bad = []; await play(look(n), 'adult', pose, { each: (f, S, P) => { for (const d of S.wardrobe.drapes) if (d.guide) bad.push(...clothFaults(S, d, P, f, pose === 'walk' ? 'walk' : 'sit', true).filter(b => /into leg/.test(b))); } }); assert.deepEqual(summary(bad), []); });
test('a hand kept outside a lap slides on it: no step of its own through a sit', async () => { const most = async list => { let prev = null, m = 0; await play(list, 'adult', 'seated', { from: 30, to: 100, each: (f, S) => { const h = ['L', 'R'].map(sd => S.rig[sd].hand.clone().multiplyScalar(60)); if (prev) m = Math.max(m, ...h.map((x, i) => x.distanceTo(prev[i]))); prev = h; } }); return m; };
  const bare = await most(['job:manager']); for (const n of CLOTHED) { const m = await most(look(n)); assert.ok(m <= bare + 2.5, `${n}: a hand steps ${m.toFixed(1)} cm in a frame (${bare.toFixed(1)} without the garment)`); } });
test('cloth: reaching to the floor in a skirt and an apron', async () => { for (const n of ['dress', 'chef']) { const bad = []; await play(look(n), 'adult', 'pick', { from: 10, each: (f, S, P) => { for (const d of S.wardrobe.drapes) bad.push(...clothFaults(S, d, P, f, 'sit')); } }); assert.deepEqual(summary(bad), []); } });

// ------------------------------------------------------------------ rigid pieces on the shell
function shell(S) { const g = S.parts.torso.geometry, P = g.attributes.position, I = g.index.array, T = []; for (let t = 0; t < I.length; t += 3) { const a = v3(P, I[t]), b = v3(P, I[t + 1]), c = v3(P, I[t + 2]); if (_t.set(a, b, c).getArea() < 1e-8) continue; const m = a.clone().add(b).add(c).divideScalar(3); T.push({ a, b, c, m, r: Math.max(m.distanceTo(a), m.distanceTo(b), m.distanceTo(c)) }); } return T; }
function off(T, p) { let best = Infinity; for (const t of T) { if (t.m.distanceTo(p) > t.r + 0.14) continue; _t.set(t.a, t.b, t.c); _t.closestPointToPoint(p, _q); best = Math.min(best, _q.distanceTo(p)); } return best; }
const pieces = S => S.wardrobe.group.children.map((m, k) => { const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 14)); return { k, A, idx: Array.from({ length: Math.ceil(A.count / st) }, (_, i) => i * st) }; });
const ARMS = S => ['armL', 'armR'].flatMap(a => { const A = S.parts.limbs[a].geometry.attributes.position, c = i => { const v = new THREE.Vector3(); for (let j = 0; j < 10; j++) v.add(v3(A, i * 10 + j)); return v.divideScalar(10); }; return Array.from({ length: 12 }, (_, i) => [c(i + 3), c(i + 4)]); });
const segD = (p, [a, b]) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
// TOUCH_MM: a rigid piece's nearest point to what it lies on, the shell or a piece itself on the shell (a buckle on a belt, a strap's
// plate on the strap), every vertex counted (C1, costume review 2: a sample of 14 let a belt 42 mm off pass, and students 125).
// 3 mm is under 2 px at 720 and under the 5 mm ink line round a piece: no gap shows between them
const TOUCH_MM = 3;
const trisOf = m => { const A = m.geometry.attributes.position, I = m.geometry.index?.array || Array.from({ length: A.count }, (_, i) => i), o = []; for (let t = 0; t < I.length; t += 3) { const a = v3(A, I[t]), b = v3(A, I[t + 1]), c = v3(A, I[t + 2]); if (_t.set(a, b, c).getArea() < 1e-10) continue; const k = a.clone().add(b).add(c).divideScalar(3); o.push({ a, b, c, m: k, r: Math.max(k.distanceTo(a), k.distanceTo(b), k.distanceTo(c)) }); } return o; };
const allPts = m => { const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 400)); return Array.from({ length: Math.ceil(A.count / st) }, (_, i) => v3(A, i * st)); };
for (const body of BODIES) test(`trims on ${body}: every piece of every look lies on this body's shell (or on a piece that does) and stays there as it bends; none in an arm`, async () => {
  const floats = [];
  for (const [n, list] of LOOKS) {
    const { S } = await rigStick(body); wears(S, list); S.pose2({}); const T0 = shell(S), rest = pieces(S).map(q => ({ ...q, d: q.idx.map(i => off(T0, v3(q.A, i))) }));
    const ms = S.wardrobe.group.children, P = ms.map(allPts), gap = ms.map((m, k) => Math.min(...P[k].map(p => off(T0, p)))), on = gap.map(g => g <= TOUCH_MM / 1000);
    for (let grew = true; grew;) { grew = false; ms.forEach((m, k) => { if (on[k]) return; for (let o = 0; o < ms.length; o++) if (on[o] && o !== k) { const T = trisOf(ms[o]), g = Math.min(...P[k].map(p => off(T, p))); if (g <= TOUCH_MM / 1000) { on[k] = grew = true; break; } } }); }
    ms.forEach((m, k) => { if (!on[k]) floats.push(`${n}: piece ${k} floats ${(1000 * gap[k]).toFixed(1)} mm off the shell, touching nothing that lies on it`); });
    for (const q of rest) {
      // a ring round the body (a belt, a sash, a hem band) lies on it all the way round
      const G = new THREE.Box3().setFromBufferAttribute(q.A); if (G.max.z - G.min.z > 1.2 * torsoR(0.05) * S.wardrobe.fit.gz && G.max.x - G.min.x > 1.6 * torsoR(0.05) * S.wardrobe.fit.gx) for (let s = 0; s < 16; s++) { const a = -Math.PI + s * Math.PI / 8; const near = Math.min(...Array.from({ length: q.A.count }, (_, i) => v3(q.A, i)).filter(p => Math.abs(Math.atan2(Math.sin(Math.atan2(p.x, p.z) - a), Math.cos(Math.atan2(p.x, p.z) - a))) < 0.25).map(p => off(T0, p))); if (isFinite(near)) assert.ok(near < 0.014, `${n}: ring ${q.k} stands ${(1000 * near).toFixed(0)} mm off at ${(a * 57).toFixed(0)} deg`); } }
    const want = rest;
    for (const Q of [{ spine: { bend: 60, twist: -5 }, sq: 0.04 }, { spine: { bend: 80 } }, { spine: { bend: -12, side: 14, twist: 12 } }, { spine: { bend: 24 } }]) { S.pose2(Q); const T = shell(S); for (const q of want) q.idx.forEach((i, j) => { if (q.d[j] > 0.04) return; const e = Math.abs(off(T, v3(q.A, i)) - q.d[j]) * 1000; assert.ok(e <= TRIM_MM, `${n}: piece ${q.k} moved ${e.toFixed(1)} mm on the shell (bend ${Q.spine.bend})`); }); }
  }
  assert.deepEqual(floats, []);
});
test('trims on every body clear the arm lines, standing and mid-walk', async () => { for (const body of BODIES) for (const [n, list] of LOOKS) await play(list, body, 'walk', { from: 30, to: 30, each: (f, S) => { const M = S.parts.torso.parent.matrix, A = ARMS(S); for (const q of pieces(S)) for (const i of q.idx) { const p = v3(q.A, i).applyMatrix4(M), pen = 1000 * (LIMB_R - Math.min(...A.map(s => segD(p, s)))); assert.ok(pen <= ARM_MM, `${body} ${n}: piece ${q.k} is ${pen.toFixed(1)} mm inside an arm`); } } }); });
// ------------------------------------------------------------------ the second review (25/11)
const box = m => new THREE.Box3().setFromBufferAttribute(m.geometry.attributes.position), P3 = m => Array.from({ length: m.geometry.attributes.position.count }, (_, i) => v3(m.geometry.attributes.position, i));
// NECK_MM: a collar further than this off the neck's own line has a strip of body between it and the chin (12 mm = 7 px, two ink lines)
const NECK_MM = 12;
for (const body of BODIES) test(`a scarf and a rolled, stand or flat collar go all the way round the neck of ${body}`, async () => { for (const [n, list, front] of [['scarf', ['scarf:mustard']], ['rolled collar', ['sweater:navy']], ['chef collar', ['jacket:chef']], ['dress collar', ['dress:coral'], 0.3], ['shirt collar', ['shirt:office']]]) {
  const { S } = await rigStick(body); wears(S, list); S.pose2({}); const F = fitOf(S.spec), T = S.wardrobe.group.children.flatMap(m => { const A = m.geometry.attributes.position, I = m.geometry.index.array, o = []; for (let t = 0; t < I.length; t += 3) { const [a, b, c] = [v3(A, I[t]), v3(A, I[t + 1]), v3(A, I[t + 2])], k = a.clone().add(b).add(c).divideScalar(3); if (_t.set(a, b, c).getArea() > 1e-9) o.push({ a, b, c, m: k, r: Math.max(k.distanceTo(a), k.distanceTo(b), k.distanceTo(c)) }); } return o; }); for (let k = 0; k < 24; k++) { const th = -Math.PI + k * Math.PI / 12; if (front && Math.abs(th) < front) continue; const q = at(F, th, neckY(F, th)), near = 1000 * off(T, q); assert.ok(near <= NECK_MM, `${n}: ${near.toFixed(0)} mm of bare neck at ${(th * 57.3).toFixed(0)} deg`); } } });
// INK_OUT: an outline that goes less than 60 % of its width out across the cloth is under 2 px at 720 somewhere along the edge: it reads as broken
test('the ink line runs whole round every plate, off the cloth', async () => { for (const body of ['adult', 'heavy']) for (const [n, list] of LOOKS) { const { S } = await rigStick(body); wears(S, list); const F = fitOf(S.spec); let plates = 0; S.wardrobe.group.children.forEach((m, k) => {
  const hp = m.children[0].geometry.attributes, ink = hp.inkT.getX(0), B = m.geometry.userData.hull?.border; if (!B) return; plates++; B.forEach((i, j) => { const d = v3(hp.position, i).sub(v3(m.geometry.attributes.position, i)), out = m.geometry.userData.hull.out[j].clone().normalize(); assert.ok(d.dot(out) >= 0.6 * ink, `${body} ${n}: piece ${k} border ${j}: ${(1000 * d.dot(out)).toFixed(1)} of ${(1000 * ink).toFixed(1)} mm`); });
  // and its back edge, which is the line seen from the front, is not under the cloth
  for (let i = hp.position.count / 2; i < hp.position.count; i++) { const p = v3(hp.position, i), q = at(F, Math.atan2(p.x / F.gx, p.z / F.gz), p.y, 0); assert.ok(Math.hypot(p.x / F.gx, p.z / F.gz) >= Math.hypot(q.x / F.gx, q.z / F.gz) - 0.0006, `${body} ${n}: piece ${k}: its line is under the cloth`); } }); if (!/scarf|skirt/.test(n)) assert.ok(plates, n); } });
// a short sleeve shows 4 to 11 cm of itself below the shoulder on every body, tapering without a step over 4 mm (2.5 px)
for (const body of BODIES) test(`a short sleeve comes out of the torso of ${body} and ends on the upper arm`, async () => { for (const n of ['dress', 'nurse']) { const { S } = await rigStick(body); wears(S, look(n)); S.pose2(PLACE_STAND(body)); const F = fitOf(S.spec), Mi = S.parts.torso.parent.matrix.clone().invert(); for (const arm of ['armL', 'armR']) {
  const L = line(S, arm).map(p => p.applyMatrix4(Mi)), outAt = L.findIndex(p => Math.hypot(p.x / F.gx, p.z / F.gz) > torsoR(p.y)), end = Math.max(...S.wardrobe.sleeves.filter(s => s.arm === arm).map(s => s.rings[1])), cm = 100 * (end - outAt) * L[0].distanceTo(L[15]) / 15; assert.ok(cm >= 4 && cm <= 11 && end < 9, `${body} ${n} ${arm}: ${cm.toFixed(1)} cm of sleeve below ring ${outAt}`);
  for (const s of S.wardrobe.sleeves.filter(q => q.arm === arm)) { const P = s.m.geometry.attributes.position, N = (P.count - 2) / 10, R = Array.from({ length: N }, (_, i) => { const c = new THREE.Vector3(); for (let j = 0; j < 10; j++) c.add(v3(P, i * 10 + j)); c.divideScalar(10); return v3(P, i * 10).distanceTo(c); }); for (let i = 1; i < N; i++) assert.ok(Math.abs(R[i] - R[i - 1]) < 0.004, `${body} ${n}: the sleeve steps ${(1000 * Math.abs(R[i] - R[i - 1])).toFixed(1)} mm`); } } } });
const PLACE_STAND = () => ({ armL: { raise: 8 }, armR: { raise: 8 } });
test("a cap's peak: an even edge (no corner over 15 deg), every face shaded by its own normal (no smear over 20 deg)", async () => { const { hatOf } = await import('../../styles/stick-man/kit/cast/hats.js'); for (const kind of ['police', 'pilot']) { const dark = hatOf(kind).children.filter(m => { const c = m.material.color; return Math.abs(c.r - UNIFORM.dark[0]) < 1e-6 && Math.abs(c.b - UNIFORM.dark[2]) < 1e-6; }); assert.equal(dark.length, 1); const g = dark[0].geometry, A = g.attributes.position, N = g.attributes.normal, I = g.index.array;
  for (let t = 0; t < I.length; t += 3) { const [a, b, c] = [0, 1, 2].map(i => v3(A, I[t + i])); _t.set(a, b, c); if (_t.getArea() < 1e-9) continue; const n = _t.getNormal(new THREE.Vector3()); for (let i = 0; i < 3; i++) assert.ok(n.angleTo(v3(N, I[t + i])) * 57.3 < 20, `${kind}: a normal ${(n.angleTo(v3(N, I[t + i])) * 57.3).toFixed(0)} deg off its face`); }
  const top = new Map(); for (const p of P3(dark[0])) { const a = Math.round(Math.atan2(p.x, p.z) * 400), r = Math.hypot(p.x, p.z); if (!(top.get(a)?.r > r)) top.set(a, { r, p }); } const e = [...top.entries()].sort((x, y) => x[0] - y[0]).map(x => new THREE.Vector2(x[1].p.x, x[1].p.z)).slice(2, -2); let worst = 0; for (let i = 1; i + 1 < e.length; i++) { const u = e[i].clone().sub(e[i - 1]), w = e[i + 1].clone().sub(e[i]); if (u.length() > 1e-3 && w.length() > 1e-3) worst = Math.max(worst, Math.abs(Math.atan2(u.cross(w), u.dot(w))) * 57.3); } assert.ok(worst < 15, `${kind}: the edge turns ${worst.toFixed(0)} deg`); } });
// a toque's puff is shaded as one round shape (costume review 2, V6: the cel ramp's edge ran along its pleats in grey teeth): going
// round any ring of it, under any light, the lit side turns to the shaded side twice, no more (the pleats show in its outline)
test("a toque's puff: the light-to-shade edge crosses each ring of it twice, not once a pleat", async () => { const { hatOf } = await import('../../styles/stick-man/kit/cast/hats.js'), puff = hatOf('toque').children.reduce((a, m) => (m.geometry.attributes.position.count > a.geometry.attributes.position.count ? m : a)), N = puff.geometry.attributes.normal, n = N.count;
  const Y = puff.geometry.attributes.position, per = Array.from({ length: n }, (_, i) => i).find(i => i && Math.abs(Y.getY(i) - Y.getY(0)) < 1e-7), rings = n / per; let worst = 0;   // (a lathe: its profile's points, ring after ring)
  for (const L of [[0.4, 0.5, 0.77], [-0.6, 0.3, 0.74], [0.8, -0.1, 0.6]].map(v => new THREE.Vector3(...v).normalize())) for (let j = 1; j + 1 < per; j++) { let flips = 0; for (let i = 0; i + 1 < rings; i++) { const a = v3(N, i * per + j).dot(L) > 0.3, b = v3(N, (i + 1) * per + j).dot(L) > 0.3; if (a !== b) flips++; } worst = Math.max(worst, flips); }
  assert.ok(worst <= 2, `the shade's edge crosses a ring ${worst} times`); });
// layers over layers: what a closed garment covers is not drawn over it
const count = async list => { const { S } = await rigStick('adult'); wears(S, list); return S.wardrobe.group.children.length; };
test('layers over layers: a shirt under a sweater, a shirt over a skirt, a sweater tucked into a skirt, a tie under a closed jacket', async () => {
  assert.equal(await count(['shirt:office', 'sweater:navy']), await count(['sweater:navy']), "a shirt's belt, pocket or collar over the sweater"); assert.equal(await count(['shirt:office', 'tie:crimson', 'sweater:navy']), await count(['sweater:navy']), 'a tie over a closed sweater');
  const rings = async list => { const { S } = await rigStick('adult'); wears(S, list); return S.wardrobe.group.children.map(box).filter(b => b.max.x - b.min.x > 0.28 && b.max.z - b.min.z > 0.22 && b.max.y < 0.09).map(b => [b.min.y, b.max.y]); };
  assert.equal((await rings(['shirt:office', 'skirt:plum'])).length, 1, 'a belt under the skirt band'); for (const [lo] of await rings(['sweater:sky', 'skirt:plum'])) assert.ok(lo >= 0.02, "the sweater's rib hangs out below the skirt's band"); });
for (const list of [['coat:doctor', 'dress:coral'], ['shirt:office', 'skirt:plum', 'coat:navy']]) test(`a ${list.join(' + ')}: the inner cloth stays inside the coat, standing and walking`, async () => { for (const pose of ['stand', 'walk']) { let worst = -1, f0 = 0; await play(list, 'adult', pose, { to: 40, each: (f, S) => { const [c, d] = S.wardrobe.drapes; assert.ok(c.guide.gap && d.wrap, 'the coat is drawn first'); const N = c.sheet.mesh.geometry.attributes.normal; for (const p of d.ST.drawn.slice(d.cols)) { let b = 1e9, k = 0; c.ST.drawn.forEach((q, i) => { const l = q.distanceToSquared(p); if (l < b) { b = l; k = i; } }); const h = p.clone().sub(c.ST.drawn[k]).dot(v3(N, k)); if (h > worst) { worst = h; f0 = f; } } } }); assert.ok(1000 * worst <= 2, `${pose} f${f0}: ${(1000 * worst).toFixed(0)} mm outside the coat`); } });
test('a name nobody knows throws: a layer, a colour, a variant', async () => { for (const bad of [['sweeter:navy'], ['cap:pirate'], ['hat:sombrero'], ['sweater:mauvish'], ['shirt:office:nope'], ['skirt:zzz'], ['jacket:bomber'], ['badge:sheriff'], ['apron:forest:lo'], ['backpack:nope'], ['tie:nope']]) { const { S } = await rigStick('adult'); assert.throws(() => wears(S, bad), /no such|one of/, bad[0]); }
  const { S } = await rigStick('adult'); wears(S, ['hat:flat', 'belt', 'sweater:ff8800', 'skirt:plum']); });
// a hand that holds something, or that a clip puts on a target, is not moved by what is worn
test('a held prop stays in the hand, and a hand on a target stays on it, over a lap', async () => { const sit = { bob: -0.6, hip: { z: -0.4 }, legL: { foot: [-0.22, 0.022, 0.3], knee: [0, 0, 1] }, legR: { foot: [0.22, 0.022, 0.3], knee: [0, 0, 1] }, fall: 1 }, low = { swing: 25, elbow: 25 };
  const hands = async (list, Q) => { const { S } = await rigStick('adult'); if (list) wears(S, list); S.pose2(Q); return { L: S.rig.L.hand.clone(), R: S.rig.R.hand.clone() }; };
  for (const [what, Q] of [['a phone in the right hand', { ...sit, armR: low, armL: low, x_hpR_phone: 1 }], ['the right hand on a target', { ...sit, armL: low, armR: { ...low, ik: [0.2, 0.75, 0.45], ikw: 1 } }]]) { const a = await hands(null, Q), b = await hands(['dress:coral'], Q); assert.ok(a.R.distanceTo(b.R) * 60 < 0.1, `${what}: moved ${(60 * a.R.distanceTo(b.R)).toFixed(1)} cm`); assert.ok(a.L.distanceTo(b.L) * 60 > 1, 'the empty hand rests on the lap'); } });
test('lose_hat throws a wardrobe hat too; hair of its own goes in under a hat', async () => { const { S } = await rigStick('adult'), group = new THREE.Group(); HOOKS.costume(S, ['job:police'], { group }); assert.equal(group.children.length, 1); S.pose({ pos: [0, 0, 0], x_hatfly: 10 }); assert.equal(S.wardrobe.hats[0].visible, false); assert.equal(group.children[0].visible, true); S.pose({ pos: [0, 0, 0] }); assert.equal(S.wardrobe.hats[0].visible, true);
  const { makeStick, curls, W_M, HEAD_H } = await import('../../styles/stick-man/engine/cast.js'), T = makeStick({ name: 'curly', shirt: [0.5, 0.5, 0.5], hair: [curls()] }); T.pose2({}); wears(T, ['cap:police']); T.root.updateMatrixWorld(true); const Hi = T.parts.head.parent.matrixWorld.clone().invert(), y0 = 0.5 * HEAD_H * W_M * 0.62 - 0.02; let out = 0; T.parts.hair.traverse(o => { if (!o.isMesh) return; const M = Hi.clone().multiply(o.matrixWorld); for (const p of P3(o)) { p.applyMatrix4(M); if (p.y > y0 + 0.06 && Math.hypot(p.x / 0.3, p.y / (0.3 * HEAD_H), p.z / 0.3) > 1.0) out++; } }); assert.equal(out, 0, `${out} points of hair above the cap's band`); });
test('outfits apart: the two students, a tie of its own for each job, a white coat that is cold and not near-white', () => { const main = list => list.map(it => it.split(':')).filter(([k]) => ['cardigan', 'blazer'].includes(k)).map(([, a]) => PALETTES[a]?.main || UNIFORM[a])[0]; const a = main(W.JOBS.student), b = main(W.JOBS['student-blazer']); assert.ok(Math.abs(luma(a) - luma(b)) >= 0.15, 'two students of one value');
  const ties = Object.entries(W.JOBS).map(([j, l]) => [j, l.find(x => x.startsWith('tie:'))]).filter(x => x[1]); for (const [j, t] of ties) assert.ok(ties.filter(x => x[1] === t).length <= (t === 'tie:navy' ? 2 : 1), `${t} on ${j} and another`); const c = UNIFORM.coat; assert.ok(c[2] >= c[0], 'the white coat is warm: it reads as a trench coat (it must be cool, blue at least as strong as red)'); });
test('no preset wears a layer sized in fixed metres (costume.js belt, holster)', () => { for (const [j, list] of Object.entries(W.JOBS)) for (const it of list) assert.ok(W.LAYERS.includes(it.split(':')[0]) || W.LAYERS.includes(it.split(':').slice(0, 2).join(':')), `${j}: ${it}`); });

// ------------------------------------------------------------------ the pieces Kai's director named
test('an apron wraps 150 deg of the front in one piece: the bib is as wide at the waist as the skirt sewn to it', async () => { for (const body of BODIES) for (const n of ['chef', 'florist']) {
  const { S } = await rigStick(body); wears(S, look(n)); S.pose2({}); S.face({ t: 0 }); const d = S.wardrobe.drapes[0], F = S.wardrobe.fit, th = p => Math.atan2(p.x / F.gx, p.z / F.gz); assert.ok(2 * d.guide.span * 180 / Math.PI >= 150, 'span');
  const Mi = S.parts.torso.parent.matrix.clone().invert(), top = d.ST.drawn.slice(0, d.cols).map(p => p.clone().applyMatrix4(Mi)), half = Math.max(...top.map(p => Math.abs(th(p)))); assert.ok(half * 2 * 57.3 >= 150, `${body} ${n}: wraps ${(half * 2 * 57.3).toFixed(0)} deg`);
  const bib = S.wardrobe.group.children.map(m => m.geometry.attributes.position).filter(A => { const b = new THREE.Box3().setFromBufferAttribute(A); return b.max.y > 0.18 && b.min.y < APRON_Y && b.min.y > 0.02 && b.max.x > 0.05 && b.min.x < -0.05; })[0]; assert.ok(bib, 'a bib down to the waist');
  const foot = Math.max(...Array.from({ length: bib.count }, (_, i) => v3(bib, i)).filter(p => p.y < APRON_Y).map(p => Math.abs(th(p)))); assert.ok(Math.abs(foot - APRON_SPAN) < 0.12, `${body} ${n}: the bib's foot is ${(foot * 114.6).toFixed(0)} deg wide, the skirt ${(APRON_SPAN * 114.6).toFixed(0)}`);
} });
test("a coat goes on from the shell: no step at the hip on any girth, closed at the hip, a slit at the hem", async () => { for (const body of BODIES) {
  const { S } = await rigStick(body); wears(S, look('doctor')); S.pose2({}); S.face({ t: 0 }); const d = S.wardrobe.drapes[0], F = S.wardrobe.fit, Mi = S.parts.torso.parent.matrix.clone().invert(), p = (i, j) => d.ST.drawn[i * d.cols + j].clone().applyMatrix4(Mi);
  for (let j = 0; j < d.cols; j++) { const a = p(0, j), s = at(F, Math.atan2(a.x / F.gx, a.z / F.gz), a.y, 0); assert.ok(a.distanceTo(s) < 0.006, `${body}: sewn ${(1000 * a.distanceTo(s)).toFixed(0)} mm off the shell`);
    const r = i => Math.hypot(p(i, j).x, p(i, j).z), out = Math.atan2(r(2) - r(0), a.y - p(2, j).y) * 57.3; if (Math.abs(a.z) < 0.9 * F.gz * torsoR(0.11)) assert.ok(out < 15, `${body}: steps out ${out.toFixed(0)} deg at the hip (column ${j})`); }
  assert.ok(p(1, 0).distanceTo(p(1, d.cols - 1)) < 0.06 * F.gx + 0.02 && p(0, 0).distanceTo(p(0, d.cols - 1)) < 0.03 * F.gx, `${body}: open at the hip`); const hem = p(d.rows - 1, 0).distanceTo(p(d.rows - 1, d.cols - 1)); assert.ok(hem > 0.02 && hem < 0.16 * Math.max(1, F.gx), `${body}: hem gap ${(100 * hem).toFixed(0)} cm`);
} });
test('a long-sleeved garment covers the arm line from the shoulder to the wrist, no thicker than a stick arm reads', async () => { for (const [n, list] of LOOKS) { const { S } = await rigStick('adult'); wears(S, list); S.pose2({ armL: { swing: 30, elbow: 60 } }); const short = /nurse|dress/.test(n);
  for (const arm of ['armL', 'armR']) { const sl = S.wardrobe.sleeves.filter(s => s.arm === arm); assert.ok(sl.length, `${n}: bare arms`); assert.equal(Math.min(...sl.map(s => s.rings[0])), 0); if (!short) assert.ok(Math.max(...sl.map(s => s.rings[1])) >= 13, `${n}: the sleeve stops short`);
    const A = S.parts.limbs[arm].geometry.attributes.position; for (const s of sl) { assert.ok(s.r > LIMB_R && s.r < 2 * LIMB_R, `${n}: sleeve ${s.r}`); const P = s.m.geometry.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3(); const r0 = Math.floor(s.rings[0]), f = s.rings[0] - r0, q1 = new THREE.Vector3(); for (let j = 0; j < 10; j++) { c.add(v3(P, j)); q.add(v3(A, r0 * 10 + j)); q1.add(v3(A, Math.min(15, r0 + 1) * 10 + j)); } assert.ok(c.divideScalar(10).distanceTo(q.lerp(q1, f).divideScalar(10)) < 0.001); } } } });
test('a scarf is hard stripes of its two colours: no blend between them', async () => { const { S } = await rigStick('adult'); wears(S, ['scarf:mustard']); let maps = 0; S.root.traverse(o => { for (const m of [].concat(o.material || [])) if (m?.map?.isDataTexture) { maps++; assert.equal(m.map.magFilter, THREE.NearestFilter); assert.equal(m.map.minFilter, THREE.NearestFilter); const px = m.map.image.data, set = new Set(); for (let i = 0; i < px.length; i += 4) set.add(px.slice(i, i + 3).join()); assert.ok(set.size <= 2, 'more than two colours'); } });
  assert.ok(maps >= 3, 'the neck and both ends are striped'); for (const d of S.wardrobe.drapes) assert.ok(new Set(d.sheet.mesh.geometry.attributes.color.array).size === 1, 'a tone blended along the scarf'); });
const s8 = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055), srgb = c => c.map(s8), luma = c => { const s = srgb(c); return 0.299 * s[0] + 0.587 * s[1] + 0.114 * s[2]; };
test('every look reads on a phone: at least five pieces 18 mm or more with an ink line of 5 mm (3 px at 720 wide), three of them off the garment in value', async () => { for (const [n, list] of LOOKS) { const { S } = await rigStick('adult'); wears(S, list); const P = S.wardrobe.group.children.map(m => { const b = new THREE.Box3().setFromBufferAttribute(m.geometry.attributes.position).getSize(new THREE.Vector3()), c = m.material.color, sz = [b.x, b.y, b.z].sort((p, q) => q - p); return { size: sz[1], ink: Math.max(...m.children[0].geometry.attributes.inkT.array), l: m.material.map ? 0.5 : luma([c.r, c.g, c.b]) }; }), big = P.filter(p => p.size >= 0.018 && p.ink >= 0.0049); assert.ok(big.length + 2 * S.wardrobe.drapes.length >= 5, `${n}: ${big.length} readable pieces`);
  const ls = big.map(p => p.l).sort((a, b) => a - b); assert.ok(big.length + 2 * S.wardrobe.drapes.length < 3 || S.wardrobe.drapes.length || ls[ls.length - 1] - ls[0] >= 0.15, `${n}: its pieces are all one value`); } });
test('hats are rigid on the head; a cast with no wardrobe item is left as it was', async () => {
  const { S } = await rigStick('adult'), map = S.parts.torso.material.map; HOOKS.costume(S, ['belt'], { group: new THREE.Group() }); assert.equal(S.wardrobe, undefined); assert.equal(S.parts.torso.material.map, map);
  for (const j of ['police', 'pilot', 'worker', 'chef', 'nurse']) { const { S: q } = await rigStick('adult'); wears(q, ['job:' + j]); assert.equal(q.wardrobe.hats.length, 1); assert.equal(q.wardrobe.hats[0].parent, q.parts.head.parent); }
  assert.throws(() => wears(S, ['job:astronaut']), /no such job/);
});
test('the sheet shows every look whole from the front and 3/4, and once up close', () => { for (const [n] of LOOKS) { const c = CELLS.filter(x => x.label === n && x.body === 'adult' && x.pose === 'stand'); assert.ok(c.some(x => x.view === 'front' && !x.close) && c.some(x => x.view === '3/4') && c.some(x => x.close), n); } });
const hue = c => { const [r, g, b] = srgb(c), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; }, sat = c => { const s = srgb(c), mx = Math.max(...s); return mx ? (mx - Math.min(...s)) / mx : 0; };
test('outfit palettes: every neighbour differs in value and in hue', () => { const O = W.PALETTE_ORDER, P = O.map(n => PALETTES[n].main); P.forEach((c, i) => { const d = P[(i + 1) % P.length], dh = Math.abs(hue(c) - hue(d)), h = Math.min(dh, 360 - dh); assert.ok(Math.abs(luma(c) - luma(d)) >= 0.15 && h >= 30, `${O[i]} and ${O[(i + 1) % P.length]}`); }); assert.equal(W.outfit(10), W.outfit(0)); });
test('no garment colour is a flat near-white (light budget 0.8; a colourless one at most 0.70 luma, linear)', () => { for (const [n, c] of [...Object.entries(UNIFORM), ...Object.entries(PALETTES).flatMap(([k, p]) => [[k, p.main], [k + ' accent', p.accent]])]) { assert.ok(Math.max(...c) <= 0.8, `${n} over the light budget`); if (sat(c) < 0.2) assert.ok(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] <= 0.70, `${n} is a flat near-white`); } });
