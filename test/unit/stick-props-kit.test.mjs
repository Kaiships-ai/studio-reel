// propKit (styles/stick-man/kit/props/catalog.js) as a film uses it: load, place, tint, shadow, and the solid boxes it
// writes into the set's exported COLLIDE (collide.js), read back through the real gate code: engine/solids.js inBoxes and
// armIn, tools/gates/shotfaults.mjs. Review of 25/11: propKit emptied the film's COLLIDE (glb.js glbKit does
// collide.length = 0), and one loose box round a prop turned 45 degrees covered twice its floor. Review 3: world slices of a
// turned prop made the armchair at 270 unsittable and flagged a figure 40 cm beside a taxi at 45: boxes now come only at a
// quarter turn, measured once in the prop's own frame and turned exactly; any other turn is 'not collision-checked'.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ctx = new Proxy({}, { get: (_, k) => k === 'measureText' ? () => ({ width: 10 }) : /Gradient$/.test(k) ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
// a node test has no server and no pictures: the file's bytes, its textures left out
GLTFLoader.prototype.loadAsync = function (url) {
  const b = fs.readFileSync(ROOT + url), n = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + n)); delete j.textures; delete j.images;
  for (const m of j.materials || []) { for (const o of [m, m.pbrMetallicRoughness || {}]) for (const k of Object.keys(o)) if (/Texture$/.test(k)) delete o[k]; }
  let t = JSON.stringify(j); t += ' '.repeat((4 - Buffer.byteLength(t) % 4) % 4); const h = Buffer.from(b.subarray(0, 20)), out = Buffer.concat([h, Buffer.from(t), b.subarray(20 + n)]);
  out.writeUInt32LE(Buffer.byteLength(t), 12); out.writeUInt32LE(out.length, 8); return new Promise((ok, no) => this.parse(new Uint8Array(out).buffer, '', ok, no));
};
const { propKit, propNames } = await import('../../styles/stick-man/kit/props/catalog.js');
const { quarterOf } = await import('../../styles/stick-man/kit/props/collide.js');
const { SEAT } = await import('../../styles/stick-man/kit/props/sizes.js');
const { PARTS_MAX, PARTS_BIG, TRIM_MAX } = await import('../../styles/stick-man/kit/props/parts.js');
const { builtGroup } = await import('../../styles/stick-man/kit/props/built.js');
const { glbKit } = await import('../../styles/stick-man/kit/sets/glb.js');
const { solidBoxes, armIn, restBoxes } = await import('../../styles/stick-man/engine/solids.js');
const { shotFaults, blocks, UNCHECKED } = await import('../../styles/stick-man/tools/gates/shotfaults.mjs');
const { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
const { HIP_V, SHOULDER_V, W_M } = await import('../../styles/stick-man/engine/cast.js');
const { SIT } = await import('../../styles/stick-man/engine/verbs.js');

const stage = () => ({ scene: new THREE.Scene(), prop() {}, glow() {} });
const T = p => new THREE.Vector3(p[0], p[2], -p[1]);
async function placed(name, at = [0, 0, 0], deg = 0, o = {}) { const S = stage(), C = [], p = propKit(S, C); await p.load([name]); const g = p.place(name, at, deg, o); S.scene.updateMatrixWorld(true); return { S, C, g, p }; }
// the points engine/play.js tests against COLLIDE: the torso grid from hip to shoulder, both knees and ankles (Blender metres)
function body({ at = [0, 0], yaw = 0, hip = HIP_V * W_M, sh = SHOULDER_V * W_M, knee, ankle }) {
  const R = [Math.cos(yaw), Math.sin(yaw)], F = [Math.sin(yaw), -Math.cos(yaw)], w = (x, f, z) => [at[0] + R[0] * x + F[0] * f, at[1] + R[1] * x + F[1] * f, z], pts = [];
  for (const u of [0, 0.5, 1]) for (const x of [-1, 0, 1]) for (const f of [-1, 0, 1]) pts.push(['torso', w(0.15 * x, 0.11 * f, hip + (sh - hip) * u + (u - 0.5) * 0.06)]);
  for (const s of [-1, 1]) pts.push(['knee', w(0.132 * s, knee[0], knee[1])], ['ankle', w(0.132 * s, ankle[0], ankle[1])]);
  return pts; }
const standing = (at, yaw = 0) => body({ at, yaw, knee: [0.02, 0.42], ankle: [0, 0.06] });
// SIT (engine/verbs.js): the hips SIT.bob down, the feet 0.43 m out in front, the knees over them
const sitting = (at, yaw, seat) => { const z = seat + 0.04; return body({ at, yaw, hip: z, sh: z + (SHOULDER_V - HIP_V) * W_M, knee: [0.40, z + 0.02], ankle: [SIT.footL[2] * W_M, 0.06] }); };
const inBox = (p, b, e = b.grace ?? 0.01) => [0, 1, 2].every(k => p[k] > b.lo[k] + e && p[k] < b.hi[k] - e);   // engine/play.js inBox
const bodyIn = (pts, C) => { const out = []; for (const b of C) { const h = pts.find(([, p]) => inBox(p, b)); if (h) out.push(`you.${h[0]} in ${b.name}`); } return out; };

test('propKit: the COLLIDE of the film keeps what others put into it, whatever is created or rebuilt after', async () => {
  const wall = { name: 'wall', lo: [0, 0, 0], hi: [1, 0.1, 3] }, C = [wall], S = stage(), p = propKit(S, C);
  assert.deepEqual(C, [wall], 'propKit emptied COLLIDE');
  await p.load(['street/bench', 'hospital/iv-stand']); p.place('street/bench', [2, 1, 0]); p.place('hospital/iv-stand', [4, 1, 0]); const n = C.length;
  assert.ok(n >= 3 && C[0] === wall);
  const q = propKit(S, C); await q.load(['street/bench']); assert.equal(C.length, n, 'a second propKit drops nothing');
  q.place('street/bench', [-3, 0, 0]); const m = C.length; assert.ok(m > n, 'a second kit adds its own');
  const r = propKit(stage(), C); await r.load(['street/bench', 'hospital/iv-stand']); r.place('street/bench', [2, 1, 0]); r.place('hospital/iv-stand', [4, 1, 0]);
  assert.equal(C.length, m, 'a rebuild that places the same props adds none twice');
  const D = [wall]; glbKit(S, 'props', D); assert.equal(D.length, 0, 'glbKit itself is unchanged (a film that shares COLLIDE creates it before it places props)');
});

test('propKit: load and place a glb and a built prop; unknown name, place before load', async () => {
  const S = stage(), p = propKit(S, []);
  await assert.rejects(() => p.load(['street/benchh']), /street\/bench/); assert.throws(() => p.place('street/benchh', [0, 0, 0]), /closest: street\/bench/);
  assert.throws(() => p.place('street/bench', [0, 0, 0]), /not loaded/); assert.throws(() => p.place('hospital/iv-stand', [0, 0, 0]), /not loaded/);
  await p.load(['street/bench', 'hospital/iv-stand']);
  for (const n of ['street/bench', 'hospital/iv-stand']) { const g = p.place(n, [1, 2, 0.5], 90, { scale: 2 });
    assert.equal(g.name, `${n}@1`); assert.ok(g.parent === S.scene && g.position.distanceTo(T([1, 2, 0.5])) < 1e-9 && Math.abs(g.rotation.y - Math.PI / 2) < 1e-9 && g.scale.x === 2, n);
    let k = 0; g.traverse(m => { if (m.isMesh && !m.userData.contact) { k++; assert.ok(m.material.userData.toon || m.material.map || m.material.transparent, `${n}: kit material`); } }); assert.ok(k > 0); }
  const two = p.place('street/bench', [0, 0, 0]).name; assert.equal(two, 'street/bench@2'); assert.ok(!propNames().includes(two) && !/^[a-z-]+\/[a-z0-9-]+$/.test(two), `${two} is a name of the catalog (the second bench read as street/bench-2, another prop)`);
});

test('propKit: a tint colours that prop only', async () => {
  for (const n of ['street/bench', 'hospital/gurney']) { const { p, g } = await placed(n), hex = o => { const a = []; o.traverse(m => { if (m.isMesh && !m.userData.contact && m.material.color) a.push(m.material.color.getHexString()); }); return a.join(); };
    const plain = hex(g), t = p.place(n, [3, 0, 0], 0, { tint: [1, 0.4, 0.4] }); assert.notEqual(hex(t), plain); assert.equal(hex(g), plain, `${n}: the tint leaked into the first`); assert.equal(hex(p.place(n, [6, 0, 0])), plain, `${n}: and into the next`); }
});

test('propKit: a contact shadow the size of the footprint, none for a wall piece, shadow: false or a prop off', async () => {
  const sh = g => { let s = null; g.traverse(m => { if (m.userData.contact) s = m; }); return s; };
  const { p, g } = await placed('street/bench'); const s = sh(g); assert.ok(s && Math.abs(s.scale.x - (1.6 * 0.62 + 0.04)) < 0.2, `${s?.scale.x}`);
  assert.ok(!sh(p.place('street/bench', [3, 0, 0], 0, { shadow: false }))); assert.ok(!sh((await placed('hospital/blind')).g)); assert.ok(sh((await placed('hospital/blind', [0, 0, 0], 0, { shadow: true })).g));
  assert.equal((await placed('street/bench', [0, 0, 0], 90)).C.some(b => b.lo[2] > 0.01), false, 'the shadow is no solid');
});

test('COLLIDE: a wall piece is a box where it hangs, not down to the floor; a rug, a plate and solid: false are none', async () => {
  const { C } = await placed('care-home/wall-clock', [0, 0, 1.5]); assert.equal(C.length, 1); assert.ok(Math.abs(C[0].lo[2] - 1.5) < 0.01 && C[0].hi[2] > 1.8, JSON.stringify(C));
  assert.deepEqual((await placed('care-home/wall-clock', [0, 0, 2.4])).C, [], 'over the heads'); assert.deepEqual((await placed('care-home/rug-round')).C, []);
  assert.deepEqual((await placed('misc/plate-square', [0, 0, 0.75])).C, []); const off = (await placed('street/dumpster', [0, 0, 0], 90, { solid: false })).C; assert.deepEqual(off, []); assert.deepEqual(off.unchecked, [{ name: 'street/dumpster@1', why: 'solid: false' }]);
  assert.equal((await placed('street/dumpster', [0, 0, 0], 0, { grace: 0.2 })).C[0].grace, 0.2);
});

const ROWS = zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/hm-ep01/counter-v-old.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const base = ROWS.find(r => r.f === 1910), you0 = base.actors.you, OFF = [159.6, -0.7];      // the camera of that take looks at this spot
const arm = (x, y) => ({ shoulder: [x, y, 1.35], elbow: [x, y, 0.95], hand: [x, y, 0.62], grip: false });
// the rows engine/play.js writes for a figure whose right arm hangs at (x, y), read by the shot gate
function gate(x, y, C, solids = []) {
  const far = { shoulder: [x, y - 30, 1.35], elbow: [x, y - 30, 1.0], hand: [x, y - 30, 0.8], grip: false };
  const rows = Array.from({ length: 6 }, (_, i) => { const limbs = { ...you0.limbs, L: { ...you0.limbs.L, ...far }, R: { ...you0.limbs.R, ...arm(x, y) } };
    return { ...base, f: 1900 + i, collide: bodyIn(standing([x, y]), C), actors: { you: { ...you0, inFrame: true, limbs } }, armIn: armIn(limbs, [...solids, ...C]).map(a => ({ who: 'you', ...a })),
      ...(C.unchecked?.length ? { unchecked: C.unchecked.map(u => ({ ...u })) } : {}) }; });       // engine/play.js dbg
  const f = shotFaults(rows, { W: 720, H: 1280 }); return { arm: f.filter(a => a.kind === 'arm in the set'), body: f.filter(a => a.kind === 'body in the set'), unchecked: f.filter(a => a.kind === UNCHECKED) };
}

test('gates: a figure inside a placed glb is a fault in the shot gate, one just beside it is not', async () => {
  const { C, S } = await placed('street/dumpster', [...OFF, 0]), w = 1.0, d = 0.625;                                     // 2.00 x 1.25 x 1.12 m
  propKit(S, C);                                                                       // the set's next room makes its own kit on the exported COLLIDE: on b10b5af5 the dumpster was no solid from here on
  const hit = gate(...OFF, C); assert.ok(hit.arm.length >= 1, JSON.stringify(hit)); for (const a of hit.arm) assert.match(a.what, /into street\/dumpster@1/); assert.match(hit.body[0]?.what || '', /you\.\w+ in street\/dumpster@1/);
  for (const [x, y] of [[w + 0.2, 0], [-w - 0.2, 0], [0, d + 0.16], [0, -d - 0.16]]) { const g = gate(OFF[0] + x, OFF[1] + y, C); assert.deepEqual([...g.arm, ...g.body].map(f => f.what), [], `${x}, ${y}`); }
});

test('gates: a prop off a quarter turn has no boxes and the shot gate reports it not collision-checked, never as passed', async () => {
  const u = Math.SQRT1_2, side = (a, b) => [OFF[0] + a * u - b * u, OFF[1] + a * u + b * u];
  const { C, S } = await placed('street/taxi', [...OFF, 0], 45);
  assert.deepEqual(C.map(b => b.name), [], 'no world slices of a turned prop');
  assert.deepEqual(C.unchecked, [{ name: 'street/taxi@1', why: 'turned 45 deg, off a quarter turn' }]);
  const g = gate(...side(0, 0.75 + 0.3), C);                                             // 30 cm off its side (review 3: flagged 'body in the set')
  assert.deepEqual([...g.arm, ...g.body].map(f => f.what), [], 'nothing flagged beside it');
  assert.ok(g.unchecked.length === 1 && blocks(g.unchecked[0]) && /street\/taxi@1/.test(g.unchecked[0].what), `the shot is not clean: ${JSON.stringify(g.unchecked)}`);
  assert.equal(gate(...OFF, C).unchecked.filter(blocks).length, 1, 'a figure inside it is not measured either: the shot cannot pass');
  C.length = 0; propKit(S, C); const p = propKit(S, C); await p.load(['street/taxi']); p.place('street/taxi', [...OFF, 0], 45);
  assert.equal(C.unchecked.length, 1, 'an emptied array, a new kit and the same placement again keep it, once');
  const F = (await placed('street/taxi', [...OFF, 0], 90, { solid: false })).C, w = gate(...side(0, 0.75 + 0.3), F).unchecked;
  assert.ok(w.length === 1 && !blocks(w[0]), 'solid: false is the film\'s own choice: listed, watch only');
  for (const [deg, q] of [[90.4, 1], [-89.6, 3], [449.5, 1], [-360, 0], [90.6, null], [44, null], [-0.6, null]]) assert.equal(quarterOf(deg * Math.PI / 180), q, `${deg}`);
  assert.ok((await placed('street/taxi', [0, 0, 0], 90.4)).C.length > 0 && !(await placed('street/taxi', [0, 0, 0], 90.4)).C.unchecked?.length, 'within half a degree of a quarter: boxed');
  assert.deepEqual(shotFaults(ROWS, { W: 720, H: 1280 }).filter(x => x.kind === UNCHECKED), [], 'rows of a film without propKit: no such row');
});

// a box of the prop placed at 0, turned by q quarters about the origin
const quarter = (b, q) => { const P = [[b.lo[0], b.lo[1]], [b.hi[0], b.hi[1]]].map(([x, y]) => [[x, y], [-y, x], [-x, -y], [y, -x]][q]);
  return { lo: [Math.min(P[0][0], P[1][0]), Math.min(P[0][1], P[1][1]), b.lo[2]], hi: [Math.max(P[0][0], P[1][0]), Math.max(P[0][1], P[1][1]), b.hi[2]] }; };
test('COLLIDE: at every quarter turn (any sign, past 360) and scale a prop has the same boxes, turned exactly', async () => {
  const bad = [];
  for (const n of ['care-home/armchair', 'care-home/lounge-chair', 'hospital/wheelchair', 'kitchen-home/sofa', 'arena/stage', 'street/scaffolding', 'street/police-tower', 'kitchen-home/table', 'lab/lab-bench', 'street/taxi', 'street/food-truck', 'hospital/bed-single'])
    for (const k of [1, 1.15, 1.3, 1.5]) { const C0 = (await placed(n, [0, 0, 0], 0, { scale: k })).C;
      for (const [deg, q] of [[90, 1], [180, 2], [270, 3], [-90, 3], [450, 1], [-180, 2], [720, 0]]) { const C = (await placed(n, [0, 0, 0], deg, { scale: k })).C;
        const want = C0.map(b => ({ ...b, ...quarter(b, q) })), d = Math.max(0, ...C.flatMap((b, i) => [0, 1, 2].flatMap(x => [Math.abs(b.lo[x] - want[i]?.lo[x]), Math.abs(b.hi[x] - want[i]?.hi[x])])));
        if (C.length !== C0.length || !(d < 1e-9) || C.some((b, i) => b.grace !== C0[i].grace)) bad.push(`${n} x${k} at ${deg}: ${C.length} boxes vs ${C0.length}, off by ${d}`); } }
  assert.deepEqual(bad, []);
});

test('gates: a code-built prop is reported once (its box meshes are not solids a second time), turned or not', async () => {
  const { S, C } = await placed('lab/lab-bench', [...OFF, 0]), solids = solidBoxes(S.scene); assert.deepEqual(solids.map(b => b.name), []);
  const g = gate(OFF[0] + 0.65, OFF[1], C, solids); assert.ok(g.arm.length >= 1); for (const f of g.arm) assert.match(f.what, /into lab\/lab-bench@1#/, 'only its COLLIDE parts, no mesh of its own');
  const raw = new THREE.Group(); raw.add(builtGroup('lab/lab-bench')); raw.updateMatrixWorld(true); assert.ok(solidBoxes(raw).length > 10, 'the group itself does hold box meshes');
});

// the spots along the seat's own depth (y, cm, the sitter facing its front -y) where a sitter is over the seat block and no fault
function sitWindow(C, deg, k, sx = 0) {
  const a = deg * Math.PI / 180, seat = Math.max(...C.filter(b => b.grace > 0).map(b => b.hi[2])), ok = [], P = y => at(deg, sx, y / 100, 1);
  for (let y = -80 * k; y <= 70 * k; y++) { const p = P(y); if (C.some(b => b.grace > 0 && [0, 1].every(i => p[i] > b.lo[i] && p[i] < b.hi[i])) && !bodyIn(sitting(p, a, seat), C).length) ok.push(y); }
  return { ok, seat, at: y => sitting(P(y), a, seat), stand: y => standing(P(y), a) };
}
const BACK = /armchair|lounge-chair|rockingchair|wheelchair|kitchen-home\/(chair|sofa|high-chair)|desk-chair|office-chair/;
test('gates: every seat at every quarter and scale 1 to 1.5 has a free place to sit; its back and standing through it are faults; lying on a bed is no fault', async () => {
  const bad = [];
  for (const n of propNames().filter(x => SEAT.sit.test(x))) for (const k of [1, 1.15, 1.3, 1.5]) for (const deg of [0, 90, 180, 270]) {
    const { C } = await placed(n, [0, 0, 0], deg, { scale: k }), W = sitWindow(C, deg, k, n === 'kitchen-home/sofa' ? -0.22 * k : 0), tag = `${n} x${k} at ${deg}`;
    if (C.length < 1 || C.length > 8) bad.push(`${tag}: ${C.length} boxes`);
    if (W.ok.length < 10) { bad.push(`${tag}: ${W.ok.length} cm to sit on`); continue; }
    const mid = W.ok[Math.floor(W.ok.length / 2)], rear = W.ok.at(-1);
    if (!bodyIn(W.stand(mid), C).length) bad.push(`${tag}: standing through the seat passes`);
    if (BACK.test(n) && ![5, 10, 15, 20, 25].some(d => bodyIn(W.at(rear + d * k), C).length)) bad.push(`${tag}: sitting into its back passes`);
  }
  for (const n of ['hospital/bed-single', 'hospital/bed-twin', 'hospital/gurney']) for (const k of [1, 1.3]) for (const deg of [0, 90, 180, 270]) {
    const { C } = await placed(n, [0, 0, 0], deg, { scale: k }), a = deg * Math.PI / 180, top = Math.max(...C.filter(b => b.grace).map(b => b.hi[2])), F = [Math.sin(a), -Math.cos(a)], R = [Math.cos(a), Math.sin(a)], w = (x, f, z) => [R[0] * x + F[0] * f, R[1] * x + F[1] * f, z], pts = [];
    for (const u of [0, 0.5, 1]) for (const x of [-0.15, 0, 0.15]) for (const f of [-0.11, 0, 0.11]) pts.push(['torso', w(x, -0.05 - 0.4 * u + f, top + 0.10)]);      // on its back, head to +y
    for (const s of [-0.12, 0.12]) pts.push(['knee', w(s, 0.35, top + 0.06)], ['ankle', w(s, 0.72, top + 0.05)]);
    if (bodyIn(pts, C).length) bad.push(`lying on ${n} x${k} at ${deg}: ${bodyIn(pts, C)}`);
    if (!bodyIn(standing([0, 0], a), C).length) bad.push(`standing through ${n} x${k} at ${deg} passes`);
  }
  assert.deepEqual(bad, []);
});

// review 2 of 25/11: arena/concert-stage was ONE box 17 x 10 x 4.5 m (a figure on its deck was 'torso in' it), arena/stage, the
// scaffold, the watch tower and every table the same. Spots are the prop's own (x, y, floor z), turned with it.
const at = (deg, x, y, k = 1) => { const a = deg * Math.PI / 180; return [k * (x * Math.cos(a) - y * Math.sin(a)), k * (x * Math.sin(a) + y * Math.cos(a))]; };
const stand = (deg, [x, y, z = 0], k = 1) => standing(at(deg, x, y, k), deg * Math.PI / 180).map(([n, p]) => [n, [p[0], p[1], p[2] + z * k]]);
const FREE = {
  'arena/concert-stage': [[0, 0, 0.53], [2, 2, 0.53], [-6, 3, 0], [7, -4, 0]], 'arena/stage': [[0, 0, 0.33], [3, 2, 0.33], [-2, -1, 0.33]],
  'street/scaffolding': [[0, 0, 0], [0.4, 0, 0]], 'street/police-tower': [[0, 0, 0], [0, -1.05, 0], [-1.1, 0, 0]], 'street/market-stand': [[0, -1.35, 0]], 'hospital/bassinet': [[0, -0.5, 0]], 'supermarket/glass-cabinet': [[0.3, -0.75, 0]],
};
const HIT = {
  'arena/concert-stage': [[0, 0, 0], [-8.2, -0.75, 0.98], [4.6, 4.7, 0.98], [-4.5, 4.75, 0.98]], 'arena/stage': [[0, 0, 0], [3.5, 3.8, 0.39], [-3.5, 3.8, 0.39], [0, 3.74, 0.39]],
  'street/scaffolding': [[0.975, -0.375, 0], [-0.975, 0.375, 0]], 'street/police-tower': [[0.68, 0.68, 0], [-0.68, -0.68, 0], [0, -0.72, 0]], 'street/market-stand': [[0, 0, 0], [1.18, 0, 0]], 'street/cart': [[-0.3, 0, 0]],
  'kitchen-home/table': [[0, 0.3, 0], [0.4, -0.3, 0]], 'office/desk': [[0, -0.05, 0], [-0.5, 0, 0]], 'office/metal-office-desk': [[0, 0, 0], [0.7, 0, 0]], 'lab/lab-bench': [[0, 0, 0], [0.6, 0, 0]],
  'hospital/bassinet': [[0, 0, 0]], 'supermarket/counter-straight': [[0, 0, 0]], 'supermarket/glass-cabinet': [[0, 0.2, 0]],
};
test('COLLIDE: a figure on the deck, under the scaffold, beside a leg is no fault; through a truss, a post, a top or inside the deck it is', async () => {
  const bad = [];
  for (const deg of [0, 90, 180, 270]) for (const k of [1, 1.5]) for (const n of new Set([...Object.keys(FREE), ...Object.keys(HIT)])) {
    if (k !== 1 && /table|desk|bench|market|cart|bassinet|counter|cabinet/.test(n)) continue;               // a 1.1 m table is no table: only what is walked on or under
    const { C } = await placed(n, [0, 0, 0], deg, { scale: k });
    for (const f of FREE[n] || []) { const h = bodyIn(stand(deg, f, k), C); if (h.length) bad.push(`${n} x${k} at ${deg}: free at ${f}, but ${h}`); }
    for (const f of HIT[n] || []) if (!(k > 1 && n === 'arena/stage' && !f[0] && f[1]) && !bodyIn(stand(deg, f, k), C).length) bad.push(`${n} x${k} at ${deg}: standing through it at ${f} passes`);
  }
  assert.deepEqual(bad, []);
});

test('COLLIDE: sitting with the legs under a table, a desk or a bench is no fault', async () => {
  const bad = [];
  for (const deg of [0, 90, 180, 270]) for (const [n, spots] of Object.entries({ 'kitchen-home/table': [[0.3, -0.66, 180], [-0.4, 0.66, 0], [0, -0.75, 180]], 'office/desk': [[-0.025, -0.48, 180], [-0.025, -0.57, 180]], 'office/metal-office-desk': [[0, -0.6, 180], [0, -0.72, 180]], 'lab/lab-bench': [[0, -0.55, 180], [0, -0.65, 180]] })) {
    const { C } = await placed(n, [0, 0, 0], deg);
    const G = (await placed(n, [0, 0, 0], deg, { grace: 0.01 })).C; assert.ok(G.every(b => b.grace === 0.01), 'the caller\'s grace: no reach');
    for (const [x, y, turn] of spots) { const h = bodyIn(sitting(at(deg, x, y), (deg + turn) * Math.PI / 180, 0.45), C); if (h.length) bad.push(`${n} at ${deg}: sitting at ${x}, ${y}: ${h}`); }
  }
  assert.deepEqual(bad, []);
});

// the plan outline of a placed prop (convex hull of its surface up to 1.8 m) and how far a point stands out of it
const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function outline(g) {
  const P = [], v = new THREE.Vector3();
  g.traverse(m => { if (!m.isMesh || m.userData.contact) return; const p = m.geometry.attributes.position, ix = m.geometry.index, N = ix ? ix.count : p.count;
    for (let i = 0; i < N; i += 3) { const t = [0, 1, 2].map(q => { v.fromBufferAttribute(p, ix ? ix.getX(i + q) : i + q).applyMatrix4(m.matrixWorld); return [v.x, -v.z, v.y]; });
      for (let q = 0; q < 3; q++) { const a = t[q], b = t[(q + 1) % 3]; if (a[2] <= 1.8) P.push(a); if ((a[2] <= 1.8) !== (b[2] <= 1.8)) { const u = (1.8 - a[2]) / (b[2] - a[2]); P.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); } } } });
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const h = [];
  for (const Q of [P, [...P].reverse()]) { const s0 = h.length; for (const p of Q) { while (h.length >= s0 + 2 && cross2(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } h.pop(); }
  return p => { let inside = true, d = Infinity; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], u = b[0] - a[0], w = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * u + (p[1] - a[1]) * w) / (u * u + w * w || 1)));
    if (cross2(a, b, p) < 0) inside = false; d = Math.min(d, Math.hypot(p[0] - a[0] - t * u, p[1] - a[1] - t * w)); } return inside ? 0 : d; };
}
// review 3: a figure at arm's reach (30 to 45 cm) from a turned car or truck was 'body in the set'. Now: no box corner the
// body gate reads (up to the torso's top) stands more than 5 cm out of the real outline, at any quarter; one inside is caught
const CLOSED = ['street/taxi', 'street/car-hatchback', 'street/food-truck', 'street/screen-truck', 'street/sushi-truck', 'street/dumpster', 'street/trashcan-large', 'kitchen-home/kitchen-fridge',
  'kitchen-home/washing-machine', 'kitchen-home/kitchen-stove', 'supermarket/can-fridge', 'supermarket/shelf-tall', 'supermarket/glass-cabinet', 'supermarket/steel-frame-shelves', 'misc/safe', 'lab/bio-cabinet', 'office/bookcase-open'];
// measured over 5 cm (docs/PROPS.md, limits): a truck's tapered nose under its wider awning, the cabinet's curved glass; this table only shrinks
const OVER = { 'street/food-truck': { 1: 0.0505, 1.3: 0.056 }, 'street/screen-truck': { 1: 0.0505, 1.3: 0.057 }, 'supermarket/glass-cabinet': { 1.3: 0.055 } };
test('COLLIDE: a closed prop (vehicles, trucks, fridges, shelves) flags nobody more than 5 cm outside its outline, at every quarter; someone inside is caught', async () => {
  const bad = [];
  for (const n of CLOSED) for (const k of [1, 1.3]) for (const deg of [0, 90, 180, 270]) {
    const { C, g } = await placed(n, [0, 0, 0], deg, { scale: k, shadow: false }), out = outline(g), tag = `${n} x${k} at ${deg}`;
    let worst = 0; for (const b of C) { const e = b.grace ?? 0.01; if (b.lo[2] + e > 1.26 || b.hi[2] - e < 0.06) continue; for (const x of [b.lo[0] + e, b.hi[0] - e]) for (const y of [b.lo[1] + e, b.hi[1] - e]) worst = Math.max(worst, out([x, y])); }
    if (worst > (OVER[n]?.[k] ?? 0.05)) bad.push(`${tag}: a box corner ${(100 * worst).toFixed(1)} cm out of its outline`);
    const box = new THREE.Box3().setFromObject(g), c = [(box.min.x + box.max.x) / 2, -(box.min.z + box.max.z) / 2];
    if (Math.min(box.max.x - box.min.x, box.max.z - box.min.z) > 0.5 && !bodyIn(standing(c), C).length) bad.push(`${tag}: standing inside it passes`);
  }
  assert.deepEqual(bad, []);
});

// engine/propobj.js: a 10 cm can held at z over (x, y) for 10 frames and let go
function landing(C, x, y, z) {
  const o = new THREE.Object3D(); o.userData.box = new THREE.Box3(new THREE.Vector3(-0.05, -0.05, -0.05), new THREE.Vector3(0.05, 0.05, 0.05));
  const S = { obstacles: [], rest: restBoxes([], C), props: { Lcan: o }, pose2() { o.position.copy(T([x, y, z])); o.updateMatrixWorld(true); } };
  const p = propPlan({ props: [{ id: 'Lcan', key: 'x_hpL_can', f0: 0, f1: 90 }] }, f => ({ x_hpL_can: f < 10 ? 1 : 0 }), S).at(90).Lcan.p; return [p[0], -p[2], p[1] - 0.05];
}
test('rest: a prop let go over a bench, a table, a counter or a deck rests on its real top, straight down', async () => {
  const bad = [];
  for (const deg of [0, 90, 180, 270]) for (const [n, x, y, top] of [['lab/lab-bench', -0.75, -0.2, 0.9], ['kitchen-home/table', 0.3, 0, 0.75], ['office/desk', 0, 0, 0.71], ['supermarket/counter-straight', 0.3, 0, 0.9], ['arena/stage', 1, 0, 0.32], ['arena/concert-stage', 0, 1, 0.52], ['kitchen-home/kitchen-sink', -0.35, -0.1, 0.9]]) {
    const { C } = await placed(n, [0, 0, 0], deg), [a, b] = at(deg, x, y), [px, py, z] = landing(C, a, b, top + 0.4);
    if (Math.abs(z - top) > 0.03 || Math.hypot(px - a, py - b) > 0.005) bad.push(`${n} at ${deg}: rests at ${z.toFixed(3)} (its top ${top}), ${(100 * Math.hypot(px - a, py - b)).toFixed(0)} cm off`);
  }
  assert.deepEqual(bad, []);
});

test('COLLIDE: every prop: few boxes (the caps), its surface inside them, two kits on one array keep each other\'s', async () => {
  const bad = []; let sum = 0;
  for (const n of propNames()) {
    const { C, g } = await placed(n, [0, 0, 0], 0, { shadow: false }); sum += C.length;
    if (C.length > (n === 'arena/concert-stage' || n === 'arena/stage' ? PARTS_BIG : PARTS_MAX) + TRIM_MAX + 2) bad.push(`${n}: ${C.length} boxes`);
    const seat = C.some(b => b.grace > 0); if (seat) continue;
    let all = 0, in_ = 0; const v = new THREE.Vector3();
    g.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const q = [v.x, -v.z, v.y]; if (q[2] < 0.06 || q[2] > 1.7) continue; all++; if (C.some(b => [0, 1, 2].every(k => q[k] > b.lo[k] - 0.002 && q[k] < b.hi[k] + 0.002))) in_++; } });
    if (all && C.length && in_ < 0.97 * all) bad.push(`${n}: ${(100 * in_ / all).toFixed(0)} % of its vertices are in its boxes`);
  }
  assert.deepEqual(bad, []); assert.ok(sum <= 6 * propNames().length, `${sum} boxes for ${propNames().length} props (about 0.016 ms per box per figure per frame)`);
  const C = [], a = propKit(stage(), C), b = propKit(stage(), C); for (const k of [a, b]) await k.load(['street/scaffolding', 'kitchen-home/table']);
  a.place('street/scaffolding', [0, 0, 0], 90); const n = C.length; b.place('kitchen-home/table', [4, 0, 0], 180, { scale: 1.5 }); assert.ok(C.length > n && n > 4); const m = C.length; b.place('street/scaffolding', [0, 0, 0], 90); assert.equal(C.length, m, 'the same placement adds none twice');
});

// a film's own material (wwr 25/11: the kit toon took none of the set's light, a trolley at 67 against 125, the wheelchair teal)
const { loadGlb, ASSETS, toonFrom } = await import('../../styles/stick-man/kit/sets/glb.js');
const mats = g => { const a = []; g.traverse(m => { if (m.isMesh && !m.userData.contact) a.push(m.material); }); return a; };
const filmMat = () => { const calls = [], fn = (src, mesh, name) => { calls.push({ src, mesh, name }); return new THREE.MeshStandardMaterial({ color: src.color ? src.color.clone() : new THREE.Color(0.5, 0.5, 0.5) }); }; return { calls, fn }; };

test('material: the film\'s function, called once per source material, its result shared and never mutated, for a glb and a built prop', async () => {
  for (const n of ['street/bench', 'hospital/iv-stand']) {
    const { calls, fn } = filmMat(), S = stage(), p = propKit(S, []); await p.load([n]);
    const a = p.place(n, [0, 0, 0], 0, { material: fn }), k = calls.length; assert.ok(k > 0, `${n}: never called`);
    assert.equal(new Set(calls.map(c => c.src)).size, k, `${n}: called twice for one source material`);
    assert.ok(calls.every(c => c.name === n && c.mesh.isMesh), n);
    if (n === 'street/bench') assert.ok(calls.every(c => !c.src.userData.toon), 'a glb: its glTF material, not the kit toon');
    const b = p.place(n, [3, 0, 0], 90, { material: fn }); assert.equal(calls.length, k, `${n}: a second placing calls it again`);
    assert.deepEqual(mats(b), mats(a), `${n}: not shared`); assert.ok(mats(a).every(m => !m.userData.toon && m.isMeshStandardMaterial), `${n}: the kit toon is left`);
    const other = filmMat(); p.place(n, [6, 0, 0], 0, { material: other.fn }); assert.equal(other.calls.length, k, `${n}: another function has its own cache`);
  }
});

test('material: a tint multiplies the colour of a copy, cached per tint; the film\'s material keeps its colour', async () => {
  for (const n of ['street/bench', 'hospital/gurney']) {
    const { calls, fn } = filmMat(), p = propKit(stage(), []); await p.load([n]);
    const plain = mats(p.place(n, [0, 0, 0], 0, { material: fn })), hex = plain.map(m => m.color.getHexString());
    const t = mats(p.place(n, [3, 0, 0], 0, { material: fn, tint: [1, 0.4, 0.4] })), k = calls.length;
    assert.ok(k > 0 && plain.every(m => !m.userData.toon), `${n}: the film's function was not used`);
    t.forEach((m, i) => { assert.notEqual(m, plain[i]); const want = plain[i].color.clone().multiply(new THREE.Color(1, 0.4, 0.4)); assert.ok(m.color.equals(want), `${n}: ${m.color.getHexString()} vs ${want.getHexString()}`); });
    assert.deepEqual(plain.map(m => m.color.getHexString()), hex, `${n}: the tint changed the film's material`);
    assert.deepEqual(mats(p.place(n, [6, 0, 0], 0, { material: fn, tint: [1, 0.4, 0.4] })), t, `${n}: a second tinted placing makes new copies`); assert.equal(calls.length, k);
  }
  const toonish = src => toonFrom(src), p = propKit(stage(), []); await p.load(['street/bench']);
  const base = mats(p.place('street/bench', [0, 0, 0], 0, { material: toonish }))[0], m = mats(p.place('street/bench', [0, 0, 0], 0, { material: toonish, tint: [0.5, 0.5, 0.5] }))[0];
  assert.ok(m !== base && m.onBeforeCompile === base.onBeforeCompile && m.userData.toon === base.userData.toon && m.color.equals(base.color.clone().multiplyScalar(0.5)), 'a tinted copy of a toon keeps its ramp');
});

test('material: without it nothing changes: the kit toon objects, COLLIDE and unchecked the same with or without it', async () => {
  const src = await loadGlb(`${ASSETS}/props/street/bench.glb`), want = []; src.traverse(m => { if (m.isMesh) want.push(toonFrom(m.material)); });
  assert.deepEqual(mats((await placed('street/bench')).g), want, 'a glb: the same toon objects as glbKit gives');
  const bw = mats(builtGroup('hospital/iv-stand')); assert.deepEqual(mats((await placed('hospital/iv-stand')).g), bw, 'a built prop: its own shared materials');
  for (const [n, deg] of [['street/bench', 0], ['hospital/iv-stand', 90], ['street/taxi', 45], ['lab/lab-bench', 180]]) {
    const a = (await placed(n, [1, 2, 0], deg)).C, b = (await placed(n, [1, 2, 0], deg, { material: filmMat().fn })).C;
    assert.deepEqual(b, a, `${n} at ${deg}: COLLIDE`); assert.deepEqual(b.unchecked, a.unchecked, `${n} at ${deg}: unchecked`);
  }
});

test('parent: the prop goes into the film\'s group (the set\'s envScale reaches it), its boxes the same', async () => {
  for (const n of ['street/bench', 'hospital/iv-stand']) {
    const S = stage(), grp = new THREE.Group(), C = [], p = propKit(S, C); S.scene.add(grp); await p.load([n]);
    const g = p.place(n, [1, 2, 0], 90, { parent: grp }); assert.equal(g.parent, grp, n); assert.ok(!S.scene.children.includes(g));
    assert.deepEqual(C, (await placed(n, [1, 2, 0], 90)).C, `${n}: COLLIDE`);
  }
});
