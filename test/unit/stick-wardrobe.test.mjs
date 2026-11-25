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
import { placeClip } from '../../styles/stick-man/motion-lib/index.js';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { compileTrack, playActor } from '../../styles/stick-man/engine/motion.js';

await rigStick('adult');   // (the headless canvas the figure and the cloth paint on)
const { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
const W = await import('../../styles/stick-man/kit/cast/wardrobe.js'), { HOOKS } = await import('../../styles/stick-man/engine/play.js');
const { CELLS, LOOKS, PLACE_OF } = await import('../../styles/stick-man/kit/cast/sheetcells.js');
const { at, torsoR } = await import('../../styles/stick-man/kit/cast/wear.js'), { APRON_SPAN, APRON_Y } = await import('../../styles/stick-man/kit/cast/garments.js');
const { PALETTES, UNIFORM } = W;

const BODIES = ['adult', 'heavy', 'thin', 'elder', 'child'], LIMB_R = 0.046 * 0.6 / 2, HAND_R = 0.030;
// STRETCH: the 99th edge of 100, walking; BENT: over the knees as a figure folds down onto a seat
const TRIM_MM = 4.5, ARM_MM = 1, STRETCH = 0.15, BENT = 0.22, AREA = [0.65, 1.15], FOLD = 0.03, SOLID_MM = 2, MOVE_M = 0.01;
const v3 = (A, i) => new THREE.Vector3().fromBufferAttribute(A, i);
const look = n => LOOKS.find(l => l[0] === n)[1];
const wears = (S, list) => { HOOKS.costume(S, list, { group: new THREE.Group() }); return S.wardrobe; };

// plays a pose's clip on a dressed figure; each(f, S, place) on every frame from `from`
async function play(list, body, pose, { from = 0, to = null, each }) {
  const { S, toPose } = await rigStick(body), P = PLACE_OF({ body, pose }), last = to ?? P.f; S.obstacles = P.solids; S.rest = [...P.solids]; wears(S, list);
  const keys = placeClip(P.key, { pos: [0, 0], yaw: 90 }).keys, tr = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(tr, 0, Math.max(last, keys[keys.length - 1].f) + 2), at_ = f => toPose(fr[Math.min(fr.length - 1, f)], S.root.scale.x), plan = propPlan(tr, at_, S);
  for (let f = from; f <= last; f++) { const Q = at_(f); Q.propRest = plan.at(f); S.pose2(Q); S.face({ t: f }); each?.(f, S, P); }
  return S;
}
// ------------------------------------------------------------------ the cloth as drawn
const tris = d => { const out = [], J = d.wrap ? d.cols : d.cols - 1, p = (i, j) => d.ST.drawn[i * d.cols + (j % d.cols)]; for (let i = 0; i + 1 < d.rows; i++) for (let j = 0; j < J; j++) out.push([p(i, j), p(i + 1, j), p(i, j + 1)], [p(i, j + 1), p(i + 1, j), p(i + 1, j + 1)]); return out; };
const _t = new THREE.Triangle(), _ray = new THREE.Ray(), _q = new THREE.Vector3();
function crosses(a, b, T, skip = null) { const dir = b.clone().sub(a), len = dir.length(); _ray.set(a, dir.normalize()); return T.filter(t => _ray.intersectTriangle(t[0], t[1], t[2], false, _q) && _q.distanceTo(a) < len && !(skip && skip(_q))).length; }
// a hand pressed on a leg (a clip's hands grip the knees as it sits down) has the cloth between them: crossing within a hand of the leg line is contact
const onLeg = S => p => ['L', 'R'].some(sd => { const r = S.rig[sd], m = q => q.clone().multiplyScalar(0.6), l = new THREE.Line3(m(r.hip), m(r.knee)), k = new THREE.Line3(m(r.knee), m(r.ankle)), c = new THREE.Vector3(); return [l, k].some(x => x.closestPointToPoint(p, true, c).distanceTo(p) < HAND_R + 0.030); });
const nearest = (p, T) => Math.min(...T.map(t => { _t.set(...t); _t.closestPointToPoint(p, _q); return _q.distanceTo(p); }));
const areaOf = T => T.reduce((s, t) => s + _t.set(...t).getArea(), 0);
function clothFaults(S, d, P, f, { stretch = STRETCH } = {}) {
  const out = [], T = tris(d), SC = S.root.scale.x, m = q => q.clone().multiplyScalar(0.6), say = s => out.push(`f${f}: ${s}`);
  if (d.guide) {
    const st = d.edges.map(([i, j, r]) => d.ST.drawn[i].distanceTo(d.ST.drawn[j]) * SC / r - 1).sort((a, b) => a - b), p99 = st[Math.floor(0.99 * (st.length - 1))]; if (p99 > stretch) say(`stretched ${(100 * p99).toFixed(0)} % (p99)`);
    const a = areaOf(T) / (d.area0 ||= areaOf(tris({ ...d, ST: { drawn: d.rest } }))); if (a < AREA[0] || a > AREA[1]) say(`area ${(100 * a).toFixed(0)} % of its own`);
    // a fold-over: two quads side by side facing opposite ways
    const n = T.map(t => _t.set(...t).getNormal(new THREE.Vector3())), J = 2 * (d.wrap ? d.cols : d.cols - 1); let bad = 0, all = 0; for (let k = 0; k < n.length; k++) { for (const q of [k % 2 ? k + 1 : k, k + J]) if (q < n.length && (q === k + J || (q % J))) { all++; if (n[k].dot(n[q]) < -0.2) bad++; } } if (bad / all > FOLD) say(`crumpled: ${(100 * bad / all).toFixed(0)} % of it folds over`);
    for (const sd of ['L', 'R']) { const r = S.rig[sd], hip = m(r.hip), kn = m(r.knee), an = m(r.ankle); const c = crosses(hip.clone().lerp(kn, 0.2), kn, T) + crosses(kn, an, T); if (c) say(`leg ${sd} through the cloth`); }
    // the leg stands inside the garment, so its drawn line never shows on the outside face: every shin or thigh point above the hem is on the body side
  }
  for (const sd of ['L', 'R']) { const r = S.rig[sd], sh = m(r.shoulder), el = m(r.elbow), ha = m(r.hand); const leg = onLeg(S), c = crosses(sh.lerp(el, 0.45), el, T, leg) + crosses(el, ha, T, leg); if (c) say(`arm ${sd} through the cloth`); else if (d.guide && !leg(ha) && nearest(ha, T) < 0.4 * HAND_R) say(`hand ${sd} in the cloth (${(1000 * nearest(ha, T)).toFixed(0)} mm off)`); }
  const M = S.root.matrixWorld, pts = [...d.ST.drawn, ...T.map(t => t[0].clone().add(t[1]).add(t[2]).divideScalar(3))].map(p => p.clone().applyMatrix4(M));
  for (const b of P.solids) { const deep = Math.max(...pts.map(p => Math.min(p.x - b.lo[0], b.hi[0] - p.x, -p.z - b.lo[1], b.hi[1] + p.z, p.y - b.lo[2], b.hi[2] - p.y))); if (deep * 1000 > SOLID_MM) say(`${(deep * 1000).toFixed(0)} mm inside the ${b.name}`); }
  return out;
}
const CLOTHED = ['doctor', 'chef', 'dress', 'sweater + skirt'];

for (const body of BODIES) for (const n of body === 'adult' ? [...CLOTHED, 'sweater + scarf'] : ['doctor', 'chef', 'dress']) test(`cloth: ${n} on ${body} standing and walking: whole, outside the limbs, and it moves`, async () => {
  const bad = []; let move = 0, rest = null;
  await play(look(n), body, 'stand', { to: 4, each: (f, S, P) => { if (f === 4) for (const d of S.wardrobe.drapes) bad.push(...clothFaults(S, d, P, f).map(x => 'stand ' + x)); } });
  await play(look(n), body, 'walk', { from: 24, to: 46, each: (f, S, P) => { for (const d of S.wardrobe.drapes) { if (f % 2 === 0) bad.push(...clothFaults(S, d, P, f).map(x => 'walk ' + x));
    const Mi = S.parts.torso.parent.matrix.clone().invert(), h = d.ST.drawn[(d.rows - 1) * d.cols + (d.cols >> 1)].clone().applyMatrix4(Mi); rest ||= h; if (d === S.wardrobe.drapes[0]) move = Math.max(move, h.distanceTo(rest)); } } });
  assert.deepEqual(bad.slice(0, 4), []); assert.ok(move >= MOVE_M, `the cloth hardly moves on a walk (${(100 * move).toFixed(1)} cm)`);
});
for (const n of CLOTHED) test(`cloth: ${n} sitting down and seated: a lap, not a rag; nothing in the seat`, async () => {
  const bad = []; let S = null;
  S = await play(look(n), 'adult', 'seated', { from: 20, each: (f, S_, P) => { if (f % 5 === 0 || f > 104) for (const d of S_.wardrobe.drapes) bad.push(...clothFaults(S_, d, P, f, { stretch: BENT })); } });
  assert.deepEqual(bad.slice(0, 5), []);
  const d = S.wardrobe.drapes[0], m = q => q.clone().multiplyScalar(0.6), hip = m(S.rig.R.hip), kn = m(S.rig.R.knee), J = d.guide.gap ? [4, d.cols - 5] : [d.cols >> 1];
  for (const j of J) { const col = [...Array(d.rows).keys()].map(i => d.ST.drawn[i * d.cols + j]);
    for (const p of col.slice(2)) if (p.z > hip.z + 0.12 && p.z < kn.z - 0.03) assert.ok(p.y > hip.y - 0.02, `the lap sinks under the thighs (${(p.y - hip.y).toFixed(3)} m at column ${j})`);
    assert.ok(col[d.rows - 1].z > kn.z - 0.03, `column ${j}: the garment stops on the lap (hem ${(kn.z - col[d.rows - 1].z).toFixed(2)} m short of the knee)`); if (!d.guide.gap) assert.ok(col[d.rows - 1].y < kn.y - 0.03, `the hem does not hang past the knee`); }
});
test('a hand kept outside a lap slides on it: no step of its own through a sit', async () => { const most = async list => { let prev = null, m = 0; await play(list, 'adult', 'seated', { from: 30, to: 100, each: (f, S) => { const h = ['L', 'R'].map(sd => S.rig[sd].hand.clone().multiplyScalar(60)); if (prev) m = Math.max(m, ...h.map((x, i) => x.distanceTo(prev[i]))); prev = h; } }); return m; };
  const bare = await most(['job:manager']); for (const n of CLOTHED) { const m = await most(look(n)); assert.ok(m <= bare + 2.5, `${n}: a hand steps ${m.toFixed(1)} cm in a frame (${bare.toFixed(1)} without the garment)`); } });
test('cloth: reaching to the floor in a skirt and an apron', async () => { for (const n of ['dress', 'chef']) { const bad = []; await play(look(n), 'adult', 'pick', { from: 10, each: (f, S, P) => { if (f % 6 === 0) for (const d of S.wardrobe.drapes) bad.push(...clothFaults(S, d, P, f, { stretch: BENT })); } }); assert.deepEqual(bad.slice(0, 4), []); } });

// ------------------------------------------------------------------ rigid pieces on the shell
function shell(S) { const g = S.parts.torso.geometry, P = g.attributes.position, I = g.index.array, T = []; for (let t = 0; t < I.length; t += 3) { const a = v3(P, I[t]), b = v3(P, I[t + 1]), c = v3(P, I[t + 2]); if (_t.set(a, b, c).getArea() < 1e-8) continue; const m = a.clone().add(b).add(c).divideScalar(3); T.push({ a, b, c, m, r: Math.max(m.distanceTo(a), m.distanceTo(b), m.distanceTo(c)) }); } return T; }
function off(T, p) { let best = Infinity; for (const t of T) { if (t.m.distanceTo(p) > t.r + 0.14) continue; _t.set(t.a, t.b, t.c); _t.closestPointToPoint(p, _q); best = Math.min(best, _q.distanceTo(p)); } return best; }
const pieces = S => S.wardrobe.group.children.map((m, k) => { const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 14)); return { k, A, idx: Array.from({ length: Math.ceil(A.count / st) }, (_, i) => i * st) }; });
const ARMS = S => ['armL', 'armR'].flatMap(a => { const A = S.parts.limbs[a].geometry.attributes.position, c = i => { const v = new THREE.Vector3(); for (let j = 0; j < 10; j++) v.add(v3(A, i * 10 + j)); return v.divideScalar(10); }; return Array.from({ length: 12 }, (_, i) => [c(i + 3), c(i + 4)]); });
const segD = (p, [a, b]) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
for (const body of BODIES) test(`trims on ${body}: every piece of every look lies on this body's shell and stays there as it bends; none in an arm`, async () => {
  for (const [n, list] of LOOKS) {
    const { S } = await rigStick(body); wears(S, list); S.pose2({}); const T0 = shell(S), rest = pieces(S).map(q => ({ ...q, d: q.idx.map(i => off(T0, v3(q.A, i))) }));
    for (const q of rest) { const lo = Math.min(...q.d); assert.ok(lo <= 0.042 || lo <= 0.125 && list.join().match(/student/), `${n}: piece ${q.k} floats ${(1000 * lo).toFixed(0)} mm off the shell`);
      // a ring round the body (a belt, a sash, a hem band) lies on it all the way round
      const G = new THREE.Box3().setFromBufferAttribute(q.A); if (G.max.z - G.min.z > 1.2 * torsoR(0.05) * S.wardrobe.fit.gz && G.max.x - G.min.x > 1.6 * torsoR(0.05) * S.wardrobe.fit.gx) for (let s = 0; s < 16; s++) { const a = -Math.PI + s * Math.PI / 8; const near = Math.min(...Array.from({ length: q.A.count }, (_, i) => v3(q.A, i)).filter(p => Math.abs(Math.atan2(Math.sin(Math.atan2(p.x, p.z) - a), Math.cos(Math.atan2(p.x, p.z) - a))) < 0.25).map(p => off(T0, p))); if (isFinite(near)) assert.ok(near < 0.014, `${n}: ring ${q.k} stands ${(1000 * near).toFixed(0)} mm off at ${(a * 57).toFixed(0)} deg`); } }
    const want = rest.filter(q => Math.min(...q.d) < 0.03);
    for (const Q of [{ spine: { bend: 60, twist: -5 }, sq: 0.04 }, { spine: { bend: -12, side: 14, twist: 12 } }, { spine: { bend: 24 } }]) { S.pose2(Q); const T = shell(S); for (const q of want) q.idx.forEach((i, j) => { if (q.d[j] > 0.04) return; const e = Math.abs(off(T, v3(q.A, i)) - q.d[j]) * 1000; assert.ok(e <= TRIM_MM, `${n}: piece ${q.k} moved ${e.toFixed(1)} mm on the shell (bend ${Q.spine.bend})`); }); }
  }
});
test('trims on every body clear the arm lines, standing and mid-walk', async () => { for (const body of BODIES) for (const [n, list] of LOOKS) await play(list, body, 'walk', { from: 30, to: 30, each: (f, S) => { const M = S.parts.torso.parent.matrix, A = ARMS(S); for (const q of pieces(S)) for (const i of q.idx) { const p = v3(q.A, i).applyMatrix4(M), pen = 1000 * (LIMB_R - Math.min(...A.map(s => segD(p, s)))); assert.ok(pen <= ARM_MM, `${body} ${n}: piece ${q.k} is ${pen.toFixed(1)} mm inside an arm`); } } }); });
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
    const A = S.parts.limbs[arm].geometry.attributes.position; for (const s of sl) { assert.ok(s.r > LIMB_R && s.r < 2 * LIMB_R, `${n}: sleeve ${s.r}`); const P = s.m.geometry.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3(); for (let j = 0; j < 10; j++) { c.add(v3(P, j)); q.add(v3(A, s.rings[0] * 10 + j)); } assert.ok(c.divideScalar(10).distanceTo(q.divideScalar(10)) < 0.001); } } } });
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
