// propKit (styles/stick-man/kit/props/catalog.js) as a film uses it: load, place, tint, shadow, and the solid boxes it
// writes into the set's exported COLLIDE (collide.js), read back through the real gate code: engine/solids.js inBoxes and
// armIn, tools/gates/shotfaults.mjs. Review of 25/11: propKit emptied the film's COLLIDE (glb.js glbKit does
// collide.length = 0), and one loose box round a prop turned 45 degrees covered twice its floor.
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
const { TURN_MAX } = await import('../../styles/stick-man/kit/props/collide.js');
const { PARTS_MAX, PARTS_BIG } = await import('../../styles/stick-man/kit/props/parts.js');
const { builtGroup } = await import('../../styles/stick-man/kit/props/built.js');
const { glbKit } = await import('../../styles/stick-man/kit/sets/glb.js');
const { solidBoxes, inBoxes, armIn, restBoxes } = await import('../../styles/stick-man/engine/solids.js');
const { shotFaults } = await import('../../styles/stick-man/tools/gates/shotfaults.mjs');
const { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
const { HIP_V, SHOULDER_V, W_M } = await import('../../styles/stick-man/engine/cast.js');
const { SIT } = await import('../../styles/stick-man/engine/verbs.js');

const stage = () => ({ scene: new THREE.Scene(), prop() {}, glow() {} });
const T = p => new THREE.Vector3(p[0], p[2], -p[1]);
const inside = (p, boxes) => inBoxes([T(p)], boxes).map(h => h.name);
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
  assert.equal((await placed('street/bench', [0, 0, 0], 45)).C.some(b => b.lo[2] > 0.01), false, 'the shadow is no solid');
});

test('COLLIDE: a wall piece is a box where it hangs, not down to the floor; a rug, a plate and solid: false are none', async () => {
  const { C } = await placed('care-home/wall-clock', [0, 0, 1.5]); assert.equal(C.length, 1); assert.ok(Math.abs(C[0].lo[2] - 1.5) < 0.01 && C[0].hi[2] > 1.8, JSON.stringify(C));
  assert.deepEqual((await placed('care-home/wall-clock', [0, 0, 2.4])).C, [], 'over the heads'); assert.deepEqual((await placed('care-home/rug-round')).C, []);
  assert.deepEqual((await placed('misc/plate-square', [0, 0, 0.75])).C, []); assert.deepEqual((await placed('street/dumpster', [0, 0, 0], 45, { solid: false })).C, []);
  assert.equal((await placed('street/dumpster', [0, 0, 0], 0, { grace: 0.2 })).C[0].grace, 0.2);
});

const ROWS = zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/hm-ep01/counter-v-old.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const base = ROWS.find(r => r.f === 1910), you0 = base.actors.you, OFF = [159.6, -0.7];      // the camera of that take looks at this spot
const arm = (x, y) => ({ shoulder: [x, y, 1.35], elbow: [x, y, 0.95], hand: [x, y, 0.62], grip: false });
// the rows engine/play.js writes for a figure whose right arm hangs at (x, y), read by the shot gate
function gate(x, y, C, solids = []) {
  const far = { shoulder: [x, y - 30, 1.35], elbow: [x, y - 30, 1.0], hand: [x, y - 30, 0.8], grip: false };
  const rows = Array.from({ length: 6 }, (_, i) => { const limbs = { ...you0.limbs, L: { ...you0.limbs.L, ...far }, R: { ...you0.limbs.R, ...arm(x, y) } };
    return { ...base, f: 1900 + i, collide: bodyIn(standing([x, y]), C), actors: { you: { ...you0, inFrame: true, limbs } }, armIn: armIn(limbs, [...solids, ...C]).map(a => ({ who: 'you', ...a })) }; });
  const f = shotFaults(rows, { W: 720, H: 1280 }); return { arm: f.filter(a => a.kind === 'arm in the set'), body: f.filter(a => a.kind === 'body in the set') };
}

test('gates: a figure inside a placed glb is a fault in the shot gate, one just beside it is not', async () => {
  const { C, S } = await placed('street/dumpster', [...OFF, 0]), w = 1.0, d = 0.625;                                     // 2.00 x 1.25 x 1.12 m
  propKit(S, C);                                                                       // the set's next room makes its own kit on the exported COLLIDE: on b10b5af5 the dumpster was no solid from here on
  const hit = gate(...OFF, C); assert.ok(hit.arm.length >= 1, JSON.stringify(hit)); for (const a of hit.arm) assert.match(a.what, /into street\/dumpster@1/); assert.match(hit.body[0]?.what || '', /you\.\w+ in street\/dumpster@1/);
  for (const [x, y] of [[w + 0.2, 0], [-w - 0.2, 0], [0, d + 0.16], [0, -d - 0.16]]) { const g = gate(OFF[0] + x, OFF[1] + y, C); assert.deepEqual([...g.arm, ...g.body].map(f => f.what), [], `${x}, ${y}`); }
});

test('gates: a prop turned 45 degrees is tight slices: inside is a fault, just beside is not', async () => {
  for (const [n, w, d] of [['street/dumpster', 2.0, 1.25], ['street/market-stand', 2.5, 2.0], ['office/cubicle', 1.6, 0.5], ['lab/lab-bench', 2.0, 0.8]]) {
    const { C, g } = await placed(n, [0, 0, 0], 45); assert.ok(C.length >= 2 && C.length <= TURN_MAX, `${n}: ${C.length} boxes`);
    C.forEach((b, i) => assert.equal(b.name, `${n}@1#${i + 1}`));
    const u = Math.SQRT1_2, at = (a, b) => [a * u - b * u, a * u + b * u, 0.1];                                      // prop-local (a, b) turned 45
    let cov = 0, want = 0, seen = 0, all = 0; const boxes = C.map(b => ({ ...b })), N = 60, E = 2.4, one = new THREE.Box3().setFromObject(g);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = -E + 2 * E * i / N, y = -E + 2 * E * j / N, a = (x + y) * u, b = (y - x) * u, in_ = Math.abs(a) < w / 2 && Math.abs(b) < d / 2, has = e => boxes.some(q => x > q.lo[0] + e * (q.grace || 0) && x < q.hi[0] - e * (q.grace || 0) && y > q.lo[1] + e * (q.grace || 0) && y < q.hi[1] - e * (q.grace || 0)), box = has(0);
      if (has(1)) cov++; if (in_) want++; if (in_ && box) seen++; if (x > one.min.x && x < one.max.x && -y > one.min.z && -y < one.max.z) all++; }
    if (n !== 'office/cubicle') assert.ok(cov <= 1.5 * want, `${n}: to a body the boxes cover ${(cov / want).toFixed(2)} x its floor (one loose box: ${(all / want).toFixed(2)})`);
    assert.ok(cov < 0.75 * all, `${n}: ${cov} cells, one loose box ${all}`);
    if (n !== 'office/cubicle') assert.ok(seen >= 0.9 * want, `${n}: ${(seen / want).toFixed(2)} of the prop is in its boxes`);
    const o = at(0, d / 2 + 0.45); assert.deepEqual(inside(o, C), [], `${n}: 45 cm in front of its face`);
  }
  const { C } = await placed('street/dumpster', [...OFF, 0], 45), u = Math.SQRT1_2; assert.equal(gate(...OFF, C).arm.length > 0, true); assert.ok(gate(...OFF, C).body.length > 0);
  for (const [a, b] of [[0, 0.625 + 0.4], [0, -0.625 - 0.4]]) { const g = gate(OFF[0] + a * u - b * u, OFF[1] + a * u + b * u, C); assert.deepEqual([...g.arm, ...g.body].map(f => f.what), [], 'beside it'); }
});

test('gates: a code-built prop is reported once (its box meshes are not solids a second time), turned or not', async () => {
  const { S, C } = await placed('lab/lab-bench', [...OFF, 0]), solids = solidBoxes(S.scene); assert.deepEqual(solids.map(b => b.name), []);
  const g = gate(OFF[0] + 0.65, OFF[1], C, solids); assert.ok(g.arm.length >= 1); for (const f of g.arm) assert.match(f.what, /into lab\/lab-bench@1#/, 'only its COLLIDE parts, no mesh of its own');
  const raw = new THREE.Group(); raw.add(builtGroup('lab/lab-bench')); raw.updateMatrixWorld(true); assert.ok(solidBoxes(raw).length > 10, 'the group itself does hold box meshes');
});

test('gates: sitting on a seat and lying on a bed are no fault; standing through either is', async () => {
  const D = Math.PI / 180;
  for (const [n, y, sideX = 0] of [['kitchen-home/chair', -0.04], ['care-home/armchair', -0.12], ['care-home/lounge-chair', -0.16], ['office/desk-chair', -0.08], ['office/office-chair', -0.06], ['kitchen-home/sofa', 0.1, -0.22], ['street/bench', -0.1], ['street/bench-2', -0.05], ['lab/stool', 0], ['care-home/rockingchair', -0.1], ['hospital/wheelchair', -0.1]])
    for (const deg of [0, 90, 45, 30, 200]) {
      if (n === 'kitchen-home/sofa' && deg % 90) continue;                            // an L sofa off the axes: 8 boxes fill part of its inner corner (docs/PROPS.md)
      const { C } = await placed(n, [0, 0, 0], deg), a = deg * D, at = [sideX * Math.cos(a) - y * Math.sin(a), sideX * Math.sin(a) + y * Math.cos(a)], seat = Math.max(...C.filter(b => b.grace).map(b => b.hi[2])), tag = `${n} at ${deg}: ${JSON.stringify(C)}`;
      assert.ok(C.length >= 1 && C.length <= 8, `${n}: ${C.length} boxes`); assert.ok(seat > 0.2 && seat < 0.75, `${n}: seat top ${seat}`);
      assert.deepEqual(bodyIn(sitting(at, a, seat), C), [], `sitting on ${tag}`);
      assert.ok(bodyIn(standing(at, a), C).length > 0, `standing through ${tag}`);
    }
  for (const n of ['hospital/bed-single', 'hospital/bed-twin', 'hospital/gurney']) for (const deg of [0, 90, 45]) {
    const { C } = await placed(n, [0, 0, 0], deg), a = deg * D, top = Math.max(...C.filter(b => b.grace).map(b => b.hi[2])), F = [Math.sin(a), -Math.cos(a)], R = [Math.cos(a), Math.sin(a)], w = (x, f, z) => [R[0] * x + F[0] * f, R[1] * x + F[1] * f, z], pts = [];
    for (const u of [0, 0.5, 1]) for (const x of [-0.15, 0, 0.15]) for (const f of [-0.11, 0, 0.11]) pts.push(['torso', w(x, -0.05 - 0.4 * u + f, top + 0.10)]);      // on its back, head to +y
    for (const s of [-0.12, 0.12]) pts.push(['knee', w(s, 0.35, top + 0.06)], ['ankle', w(s, 0.72, top + 0.05)]);
    assert.ok(C.length >= 1 && C.length <= 8, `${n}: ${C.length}`); assert.deepEqual(bodyIn(pts, C), [], `lying on ${n} at ${deg}: ${JSON.stringify(C)}`);
    assert.ok(bodyIn(standing([0, 0], a), C).length > 0, `standing through ${n} at ${deg}`);
  }
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
  for (const deg of [0, 30, 45, 90, 200]) for (const k of [1, 1.5]) for (const n of new Set([...Object.keys(FREE), ...Object.keys(HIT)])) {
    if (k !== 1 && /table|desk|bench|market|cart|bassinet|counter|cabinet/.test(n)) continue;               // a 1.1 m table is no table: only what is walked on or under
    const { C } = await placed(n, [0, 0, 0], deg, { scale: k });
    for (const f of FREE[n] || []) { const h = bodyIn(stand(deg, f, k), C); if (h.length) bad.push(`${n} x${k} at ${deg}: free at ${f}, but ${h}`); }
    for (const f of HIT[n] || []) if (!(k > 1 && n === 'arena/stage' && !f[0] && f[1]) && !bodyIn(stand(deg, f, k), C).length) bad.push(`${n} x${k} at ${deg}: standing through it at ${f} passes`);
  }
  assert.deepEqual(bad, []);
});

test('COLLIDE: sitting with the legs under a table, a desk or a bench is no fault', async () => {
  const bad = [];
  for (const deg of [0, 30, 45, 90, 200]) for (const [n, spots] of Object.entries({ 'kitchen-home/table': [[0.3, -0.66, 180], [-0.4, 0.66, 0], [0, -0.75, 180]], 'office/desk': [[-0.025, -0.48, 180], [-0.025, -0.57, 180]], 'office/metal-office-desk': [[0, -0.6, 180], [0, -0.72, 180]], 'lab/lab-bench': [[0, -0.55, 180], [0, -0.65, 180]] })) {
    const { C } = await placed(n, [0, 0, 0], deg);
    const G = (await placed(n, [0, 0, 0], deg, { grace: 0.01 })).C; assert.ok(G.every(b => b.grace === 0.01), 'the caller\'s grace: no reach');
    for (const [x, y, turn] of spots) { const h = bodyIn(sitting(at(deg, x, y), (deg + turn) * Math.PI / 180, 0.45), C); if (h.length) bad.push(`${n} at ${deg}: sitting at ${x}, ${y}: ${h}`); }
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
  for (const deg of [0, 30, 45, 90]) for (const [n, x, y, top] of [['lab/lab-bench', -0.75, -0.2, 0.9], ['kitchen-home/table', 0.3, 0, 0.75], ['office/desk', 0, 0, 0.71], ['supermarket/counter-straight', 0.3, 0, 0.9], ['arena/stage', 1, 0, 0.32], ['arena/concert-stage', 0, 1, 0.52], ['kitchen-home/kitchen-sink', -0.35, -0.1, 0.9]]) {
    const { C } = await placed(n, [0, 0, 0], deg), [a, b] = at(deg, x, y), [px, py, z] = landing(C, a, b, top + 0.4);
    if (Math.abs(z - top) > 0.03 || Math.hypot(px - a, py - b) > 0.005) bad.push(`${n} at ${deg}: rests at ${z.toFixed(3)} (its top ${top}), ${(100 * Math.hypot(px - a, py - b)).toFixed(0)} cm off`);
  }
  assert.deepEqual(bad, []);
});

test('COLLIDE: every prop: few boxes (the caps), its surface inside them, two kits on one array keep each other\'s', async () => {
  const bad = []; let sum = 0;
  for (const n of propNames()) {
    const { C, g } = await placed(n, [0, 0, 0], 0, { shadow: false }); sum += C.length;
    if (C.length > (n === 'arena/concert-stage' || n === 'arena/stage' ? PARTS_BIG : PARTS_MAX) + 2) bad.push(`${n}: ${C.length} boxes`);
    const seat = C.some(b => b.grace > 0); if (seat) continue;
    let all = 0, in_ = 0; const v = new THREE.Vector3();
    g.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const q = [v.x, -v.z, v.y]; if (q[2] < 0.06 || q[2] > 1.7) continue; all++; if (C.some(b => [0, 1, 2].every(k => q[k] > b.lo[k] - 0.002 && q[k] < b.hi[k] + 0.002))) in_++; } });
    if (all && C.length && in_ < 0.97 * all) bad.push(`${n}: ${(100 * in_ / all).toFixed(0)} % of its vertices are in its boxes`);
  }
  assert.deepEqual(bad, []); assert.ok(sum <= 3 * propNames().length, `${sum} boxes for ${propNames().length} props`);
  const C = [], a = propKit(stage(), C), b = propKit(stage(), C); for (const k of [a, b]) await k.load(['street/scaffolding', 'kitchen-home/table']);
  a.place('street/scaffolding', [0, 0, 0], 30); const n = C.length; b.place('kitchen-home/table', [4, 0, 0], 45, { scale: 1.5 }); assert.ok(C.length > n && n > 4); const m = C.length; b.place('street/scaffolding', [0, 0, 0], 30); assert.equal(C.length, m, 'the same placement adds none twice');
});
