// Held props off the hand (whatif1 v5, 26/11: a tin with the hands as dots on its label, a baby bundle floating beside
// the arms, a photo in front of the chest with no hand on it; every gate passed them). engine/grip.js measures, each
// frame, the air between the hand's drawn edge (its world radius with its ink outline: scale and gloves included) and
// the nearest point on the prop's visible drawn triangles (outlines included), never the grip socket the engine snaps
// onto the hand; play.js writes it to the rows as held[].gapCm and tools/gates/handgrip.mjs fails a frame over the limit
// frozen in handgrip.limits.json before anything was measured (pinned below: a changed value fails). The controls: a
// prop 5 cm off one hand, a catalog cooler box 3 cm off (its contact-shadow disc is not the prop), a bundle 6 cm off two hands, a toddler 2.5 cm off, a can 2.9 cm off at 45 deg round its side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import { gripGap, handRadius } from '../../styles/stick-man/engine/grip.js';
import { W_M, solid } from '../../styles/stick-man/engine/cast.js';
import { handgrip, GAP_CM } from '../../styles/stick-man/tools/gates/handgrip.mjs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// propKit in node (as test/unit/stick-props-kit.test.mjs): no canvas, the .glb read from disk with its textures left out
const ctx = new Proxy({}, { get: (_, k) => k === 'measureText' ? () => ({ width: 10 }) : /Gradient$/.test(k) ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
GLTFLoader.prototype.loadAsync = function (url) {
  const b = fs.readFileSync(path.resolve(import.meta.dirname, '../..') + '/' + url.replace(/^\//, '')), n = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + n)); delete j.textures; delete j.images;
  for (const m of j.materials || []) { for (const o of [m, m.pbrMetallicRoughness || {}]) for (const k of Object.keys(o)) if (/Texture$/.test(k)) delete o[k]; }
  let t = JSON.stringify(j); t += ' '.repeat((4 - Buffer.byteLength(t) % 4) % 4); const h = Buffer.from(b.subarray(0, 20)), out = Buffer.concat([h, Buffer.from(t), b.subarray(20 + n)]);
  out.writeUInt32LE(Buffer.byteLength(t), 12); out.writeUInt32LE(out.length, 8); return new Promise((ok, no) => this.parse(new Uint8Array(out).buffer, '', ok, no));
};
const { propKit } = await import('../../styles/stick-man/kit/props/catalog.js');
const { drawnSolid } = await import('../../styles/stick-man/kit/props/drawn.js');

const ROOT = path.resolve(import.meta.dirname, '../..');
const FROZEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'styles/stick-man/tools/gates/handgrip.limits.json'), 'utf8'));
const GATE = path.join(ROOT, 'styles/stick-man/tools/gates/handgrip.mjs');

test('the frozen limit and control are pinned: a changed value fails (the why text may change)', () => {
  assert.equal(FROZEN.GAP_CM, 1.5); assert.equal(GAP_CM, 1.5);
  assert.deepEqual(FROZEN.control, { move_cm: 5, must: 'fail' });
  assert.deepEqual(Object.keys(FROZEN).sort(), ['GAP_CM', 'about', 'control', 'why']);
});

// a figure's hand as cast.js builds it: a dot 0.050 W (gloves 1.15x) on root, root scaled by spec.scale
const figure = ({ scale = 1, gloves = false } = {}) => {
  const root = new THREE.Group(); root.scale.setScalar(scale);
  const g = new THREE.SphereGeometry(0.050 * W_M, 16, 10); if (gloves) g.scale(1.15, 1.15, 1.15);
  const hand = new THREE.Mesh(g); root.add(hand); root.updateMatrixWorld(true);
  return { root, hand, r: hand.getWorldScale(new THREE.Vector3()).x * 0.050 * W_M * (gloves ? 1.15 : 1) };
};
const hold = (f, x) => { f.hand.position.set(x / f.root.scale.x, 1 / f.root.scale.x, 0); f.root.updateMatrixWorld(true); };
// a tin 8 cm across, its left face at x = 0 (its socket, when it has one, on that face)
const tin = (grip) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08));
  if (grip) o.userData.grip = grip;
  o.position.set(0.04, 1, 0); o.updateMatrixWorld(true);
  return o;
};
// the hand's surface `air` m left of the tin's face
const at = (f, air) => hold(f, -(air + f.r));

// a gloved hand exactly as cast.js builds it: solid(dot x 1.15, mat, INK_T * 0.7), its ink hull a child
const INK_T = 0.046 * W_M;
const gloved = ({ scale = 1 } = {}) => {
  const root = new THREE.Group(); root.scale.setScalar(scale);
  const hand = solid(new THREE.SphereGeometry(0.050 * W_M, 16, 10).scale(1.15, 1.15, 1.15), new THREE.MeshBasicMaterial(), INK_T * 0.7);
  root.add(hand); root.updateMatrixWorld(true);
  return { root, hand, r: (0.050 * W_M * 1.15 + INK_T * 0.7) * scale };
};

test('engine/grip.js: a gloved hand (cast.js solid) is measured to its drawn edge, ink outline included', () => {
  assert.ok(Math.abs(handRadius(gloved().hand) - (0.0345 + INK_T * 0.7)) < 1e-3, `${handRadius(gloved().hand)}`);
  const f = gloved(); at(f, 0);
  const g = gripGap(f.hand, tin());
  assert.ok(g.cm < 0.1, `drawn edge on the tin reads ${g.cm}`); assert.equal(g.anchor, 'edge');
  assert.equal(handgrip([{ f: 0, held: [{ actor: 'a', prop: 'tin', side: 'R', onScreen: true, gapCm: g.cm, anchor: g.anchor }] }]).ok, true);
  at(f, 0.05); const o = gripGap(f.hand, tin()); assert.ok(Math.abs(o.cm - 5) < 0.1, `${o.cm}`);
  assert.equal(handgrip([{ f: 0, held: [{ actor: 'a', prop: 'tin', side: 'R', onScreen: true, gapCm: o.cm, anchor: o.anchor }] }]).ok, false);
  const t = gloved({ scale: 0.447 }); at(t, 0); assert.ok(gripGap(t.hand, tin()).cm < 0.1, 'a scaled gloved hand touching');
});

test('a prop with an ink hull is measured to its drawn edge too', () => {
  const o = solid(new THREE.SphereGeometry(0.05, 32, 16), new THREE.MeshBasicMaterial(), 0.01);
  o.position.set(0.05 + 0.01, 1, 0); o.updateMatrixWorld(true);   // a ball, its drawn left edge at x = 0
  const f = figure(); at(f, 0); assert.ok(gripGap(f.hand, o).cm < 0.1, `${gripGap(f.hand, o).cm}`);
});

// a can 7 cm in radius, 12 cm tall, at the origin; a bare hand at 45 deg round its side
const can = () => { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 48)); o.updateMatrixWorld(true); return o; };
const round = (f, air) => { const d = 0.07 + air + f.r; f.hand.position.set(d * Math.SQRT1_2, 0, d * Math.SQRT1_2); f.root.updateMatrixWorld(true); };

test('engine/grip.js: a hand 2.9 cm off a round can at 45 deg fails (its box corner read 0); touching its side passes', () => {
  const f = figure(); round(f, 0.029);
  const g = gripGap(f.hand, can()); assert.ok(Math.abs(g.cm - 2.9) < 0.1, `${g.cm}`); assert.ok(g.cm > GAP_CM);
  round(f, 0); assert.ok(gripGap(f.hand, can()).cm < 0.1, `${gripGap(f.hand, can()).cm}`);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 48, 24)); b.updateMatrixWorld(true);   // a balloon, 45 deg up and round
  const d = 0.05 + 0.03 + f.r, k = d / Math.sqrt(3); f.hand.position.set(k, k, k); f.root.updateMatrixWorld(true);
  assert.ok(Math.abs(gripGap(f.hand, b).cm - 3) < 0.1, `${gripGap(f.hand, b).cm}`);
});

test('engine/grip.js: a hidden mesh is not measured, on the prop or the hand', () => {
  const o = can(), ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)); ghost.visible = false; o.add(ghost); o.updateMatrixWorld(true);
  const f = figure(); round(f, 0.029); assert.ok(gripGap(f.hand, o).cm > GAP_CM, 'the hidden box must not read 0');
  const g = gloved(), hid = new THREE.Mesh(new THREE.SphereGeometry(0.5)); hid.visible = false; g.hand.add(hid);
  assert.ok(handRadius(g.hand) < 0.06, `${handRadius(g.hand)}`);
});

test('engine/grip.js: a catalog cooler box 3 cm off its side fails (its contact-shadow disc read 0); touching passes', async () => {
  const S = { scene: new THREE.Scene(), prop() {}, glow() {} }, k = propKit(S, []); await k.load(['supermarket/cooler-box']);
  const g = k.place('supermarket/cooler-box', [0, 0, 0], 0); S.scene.updateMatrixWorld(true);
  let disc = false; g.traverse(o => { if (o.userData.contact) disc = true; }); assert.ok(disc, 'the placed prop carries its contact disc');
  const bb = new THREE.Box3(); g.traverse(o => { if (drawnSolid(o)) bb.expandByObject(o, true); });
  const f = figure(), z = (bb.min.z + bb.max.z) / 2;
  f.hand.position.set(bb.max.x + 0.03 + f.r, bb.min.y + 0.01, z); f.root.updateMatrixWorld(true);
  const off = gripGap(f.hand, g); assert.ok(off.cm > GAP_CM, `3 cm off the side read ${off.cm}`);
  f.hand.position.set(bb.max.x + f.r, (bb.min.y + bb.max.y) / 2, z); f.root.updateMatrixWorld(true);
  assert.ok(gripGap(f.hand, g).cm <= GAP_CM, `touching read ${gripGap(f.hand, g).cm}`);
});

test('engine/grip.js: a mesh under a hidden parent is not measured', () => {
  const o = can(), grp = new THREE.Group(); grp.visible = false; o.add(grp); grp.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  const outer = new THREE.Group(); outer.visible = false; outer.add(o); outer.updateMatrixWorld(true);
  const f = figure(); round(f, 0.029);
  assert.equal(gripGap(f.hand, grp).cm, null, 'a hidden group has nothing drawn');
  assert.ok(gripGap(f.hand, o).cm == null, 'a prop whose parent is hidden is not measured');
});

test('one filter for a prop\'s drawn solid part: grip.js, cast.js propBox and collide.js all use kit/props/drawn.js', () => {
  for (const f of ['styles/stick-man/engine/grip.js', 'styles/stick-man/engine/cast.js', 'styles/stick-man/kit/props/collide.js'])
    assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /drawnSolid/, f);
});

test('handgrip: a held entry whose anchor is not the drawn-edge measure is unmeasured, never a pass', () => {
  for (const anchor of ['grip', 'bounds', 'mesh', undefined]) {
    const R = handgrip([{ f: 0, held: [{ actor: 'a', prop: 'p', side: 'R', onScreen: true, gapCm: 0, anchor }] }]);
    assert.equal(R.ok, false, String(anchor)); assert.equal(R.unmeasured, 1); }
});

test('play.js wiring: every held row is measured hand mesh to prop by gripGap, never from a point or the socket', () => {
  const src = fs.readFileSync(path.join(ROOT, 'styles/stick-man/engine/play.js'), 'utf8');
  const calls = [...src.matchAll(/gripGap\(([^,]+),/g)].map(m => m[1].trim());
  assert.equal(calls.length, 2, calls.join(' | '));
  for (const c of calls) assert.match(c, /^a\.S\.parts\.hands\[s(\.side)?\]$/, c);
  const held = src.slice(src.indexOf('out.held = []'), src.indexOf('// bodies inside set geometry'));
  assert.doesNotMatch(held, /userData\.grip/);
});

test('shot.mjs: a held row with no gapPx is unmeasured, never 0 px', () => {
  const src = fs.readFileSync(path.join(ROOT, 'styles/stick-man/tools/render/shot.mjs'), 'utf8');
  assert.doesNotMatch(src, /grip socket/);
  assert.match(src, /gapPx == null/);
});

test('engine/grip.js: the hand radius is measured on the mesh, scale and gloves included', () => {
  assert.ok(Math.abs(handRadius(figure().hand) - 0.030) < 1e-6);
  assert.ok(Math.abs(handRadius(figure({ gloves: true }).hand) - 0.0345) < 1e-6);
  assert.ok(Math.abs(handRadius(figure({ scale: 0.447 }).hand) - 0.030 * 0.447) < 1e-6);
});

test('engine/grip.js: a toddler (scale 0.447) 2.5 cm off a no-socket prop fails; an adult 1.0 cm off passes', () => {
  const t = figure({ scale: 0.447 }); at(t, 0.025);
  const gt = gripGap(t.hand, tin());
  assert.ok(Math.abs(gt.cm - 2.5) < 0.01, `${gt.cm}`); assert.ok(gt.cm > GAP_CM);
  const a = figure(); at(a, 0.010);
  const ga = gripGap(a.hand, tin());
  assert.ok(Math.abs(ga.cm - 1.0) < 0.01, `${ga.cm}`); assert.ok(ga.cm <= GAP_CM);
  const gl = figure({ gloves: true }); at(gl, 0.010);
  assert.ok(Math.abs(gripGap(gl.hand, tin()).cm - 1.0) < 0.01);
});

test('engine/grip.js: a one-hand prop whose socket sits on the hand but 5 cm off its mesh fails (the control)', () => {
  // the engine snaps the socket onto the hand dot's centre, so the socket always reads 0: the mesh is what is measured
  const f = figure(); at(f, FROZEN.control.move_cm / 100);
  const sock = new THREE.Vector3(...f.hand.getWorldPosition(new THREE.Vector3()).toArray()).sub(new THREE.Vector3(0.04, 1, 0));
  const g = gripGap(f.hand, tin(sock.toArray()));
  assert.ok(Math.abs(g.cm - 5) < 0.01, `${g.cm}`);
  assert.equal(handgrip([{ f: 0, held: [{ actor: 'mum', prop: 'tin', side: 'R', onScreen: true, gapCm: g.cm, anchor: g.anchor }] }]).ok, false);
  at(f, 0); assert.equal(gripGap(f.hand, tin([-0.04, 0, 0])).cm, 0, 'the hand on the tin: 0');
});

test('engine/grip.js: a two-hand prop is measured from each hand to its mesh, never its socket at the hands\' midpoint', () => {
  // a bundle 30 cm wide 6 cm of air below two hands 30 cm apart, its socket between them: fails on both hands
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2)); o.userData.grip = [0, 0.16, 0];
  const f = figure(); o.position.set(0, -(0.1 + 0.06 + f.r), 1); o.updateMatrixWorld(true);
  for (const x of [-0.15, 0.15]) { f.hand.position.set(x, 0, 1); f.root.updateMatrixWorld(true);
    const g = gripGap(f.hand, o); assert.ok(Math.abs(g.cm - 6) < 0.01, `${g.cm}`); assert.ok(g.cm > GAP_CM); }
});

test('engine/grip.js: a tilted prop is measured to its own mesh, not its world box', () => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02)); o.rotation.z = Math.PI / 4; o.updateMatrixWorld(true);
  const f = figure(); f.hand.position.set(0.12, -0.12, 0); f.root.updateMatrixWorld(true);   // inside the world box, 17 cm off the stick
  assert.ok(gripGap(f.hand, o).cm > 10);
});

const held = (cm, o = {}) => ({ actor: 'mum', prop: 'baby', side: 'B', onScreen: true, gapCm: cm, anchor: 'edge', ...o });
const clip = (cms, o) => cms.map((cm, f) => ({ f, held: [held(cm, o)] }));

test('handgrip: per frame, one frame over the limit fails; off screen is left out; a clean hold passes', () => {
  const clean = handgrip(clip([0, 0.4, 1.2, 0]));
  assert.equal(clean.ok, true); assert.equal(clean.checked, 4);
  const off = handgrip(clip([0, 0, 6.3, 0]));
  assert.equal(off.ok, false);
  assert.deepEqual(off.faults.map(x => [x.f, x.actor, x.prop, x.side, x.anchor]), [[2, 'mum', 'baby', 'B', 'edge']]);
  assert.equal(off.faults[0].cm, 6.3);
  assert.equal(handgrip(clip([0, 9, 9], { onScreen: false })).ok, true);
  assert.equal(handgrip(clip([0, 9, 9]), { frames: [0, 0] }).ok, true, '--frames keeps only the frames asked for');
});

test('handgrip: rows made before the gate (gapPx only) are unmeasured, never a pass', () => {
  const R = handgrip([{ f: 0, held: [{ actor: 'mum', prop: 'tin', side: 'R', onScreen: true, gapPx: 0 }] }]);
  assert.equal(R.ok, false); assert.equal(R.unmeasured, 1); assert.equal(R.faults.length, 0);
});

test('handgrip.mjs CLI: exit 0 clean, 1 on the 5 cm control, 2 on old rows', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handgrip-'));
  const run = rows => { const p = path.join(dir, 'rows.jsonl'); fs.writeFileSync(p, rows.map(r => JSON.stringify(r)).join('\n'));
    return spawnSync(process.execPath, [GATE, '--rows', p], { encoding: 'utf8', timeout: 20000 }); };
  const ok = run(clip([0, 0]));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr); assert.match(ok.stdout, /handgrip PASS/);
  const bad = run(clip([0, FROZEN.control.move_cm]));
  assert.equal(bad.status, 1); assert.match(bad.stdout, /FAIL mum baby B f1 /);
  assert.equal(run([{ f: 0, held: [{ actor: 'a', prop: 'p', side: 'R', onScreen: true, gapPx: 1 }] }]).status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

// review of #208 at 70a4b749: no data is never a pass; a prop with no drawn bounds fails; a bad --frames errors
test('handgrip: an empty rows file, no rows in --frames, or a row with no held array is unmeasured, never a pass', () => {
  for (const R of [handgrip([]), handgrip(clip([0, 0]), { frames: [50, 60] }), handgrip([{ f: 0 }, { f: 1, held: [] }])]) {
    assert.equal(R.ok, false); assert.ok(R.unmeasured >= 1, JSON.stringify(R)); }
  assert.equal(handgrip([{ f: 0, held: [] }]).ok, true, 'rows that carry held: [] measured no held prop: a pass');
});

test('engine/grip.js: a prop with empty bounds and no socket fails, never reads as old rows', () => {
  const o = new THREE.Group(); o.updateMatrixWorld(true);
  const g = gripGap(figure().hand, o);
  assert.equal(g.anchor, 'empty');
  const R = handgrip([{ f: 0, held: [{ actor: 'mum', prop: 'ghost', side: 'R', onScreen: true, gapPx: null, gapCm: g.cm, anchor: g.anchor }] }]);
  assert.equal(R.ok, false); assert.equal(R.unmeasured, 0); assert.deepEqual(R.faults.map(x => x.anchor), ['empty']);
});

test('handgrip.mjs CLI: a malformed --frames value errors (exit 2), an empty rows file exits 2', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handgrip-'));
  const p = path.join(dir, 'rows.jsonl'); fs.writeFileSync(p, clip([0, 0]).map(r => JSON.stringify(r)).join('\n'));
  for (const fr of ['abc', '5-', '9-3', '1-2-3']) {
    const r = spawnSync(process.execPath, [GATE, '--rows', p, '--frames', fr], { encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, 2, `--frames ${fr}: ${r.stdout}`); assert.match(r.stderr, /--frames/); }
  fs.writeFileSync(p, '');
  assert.equal(spawnSync(process.execPath, [GATE, '--rows', p], { encoding: 'utf8', timeout: 20000 }).status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

// review 5 (acceptance on real rows): only engine-held props were measured, so a tin in the air (V4 f), a lantern with no
// hand (V4 d), a tin held by a 4 mm stand-in (V5 f) and a photo with held [] (V5 j) passed. Every gripping hand
// (limbs.<side>.grip) is now measured to the nearest shown prop (rows' grips[], engine/grip.js nearestGap); a held prop
// under STANDIN_CM in every dimension is a stand-in fault; a gripping hand nothing measures is a fault. Fixtures cut
// from the real rows (test/fixtures/handgrip: f, held, track sizes, actors' grip flags).
const FIX = n => fs.readFileSync(path.join(ROOT, 'test/fixtures/handgrip', n + '.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
const { nearestGap, STANDIN_CM } = await import('../../styles/stick-man/engine/grip.js');

test('handgrip on real rows: V4 tin in the air, V4 lantern with no hand, V5 f stand-in tin, V5 g, V5 j photo all FAIL', () => {
  const kinds = {};
  for (const n of ['v4-f', 'v4-d', 'v5-f', 'v5-g', 'v5-j']) {
    const R = handgrip(FIX(n)); assert.equal(R.ok, false, `${n}: ${JSON.stringify(R).slice(0, 300)}`);
    kinds[n] = [...new Set(R.faults.map(x => x.anchor))].sort(); }
  assert.ok(kinds['v5-f'].includes('stand-in'), JSON.stringify(kinds));
  assert.ok(kinds['v5-g'].includes('stand-in'), JSON.stringify(kinds));
  for (const n of ['v4-f', 'v4-d', 'v5-j']) assert.ok(kinds[n].includes('unmeasured grip'), `${n} ${kinds[n]}`);
});

test('handgrip: grips[] rows: a gripping hand over the limit fails, on it passes, on no prop fails; nothing held says so', () => {
  const row = (g, o = {}) => ({ f: 0, held: [], grips: [{ actor: 'm', side: 'L', onScreen: true, prop: 'photo', gapCm: g, anchor: 'edge', ...o }],
    actors: { m: { inFrame: true, limbs: { L: { grip: true }, R: { grip: false } } } } });
  assert.equal(handgrip([row(0.4)]).ok, true);
  assert.equal(handgrip([row(3.2)]).ok, false);
  assert.deepEqual(handgrip([row(null, { prop: null, anchor: 'none' })]).faults.map(x => x.anchor), ['none']);
  assert.equal(handgrip([row(3.2, { onScreen: false })]).ok, true, 'off screen is left out');
  const N = handgrip([{ f: 0, held: [], grips: [], actors: { m: { inFrame: true, limbs: { L: { grip: false }, R: { grip: false } } } } }]);
  assert.equal(N.ok, true); assert.equal(N.nothing, true);
  assert.equal(STANDIN_CM, 2);
});

test('engine/grip.js nearestGap: a gripping hand to the nearest shown prop, stand-ins and hidden props left out', () => {
  const f = figure(); at(f, 0.03);
  const loose = tin(), stub = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.004)), far = tin(); far.position.x = 2; far.updateMatrixWorld(true);
  stub.position.copy(f.hand.getWorldPosition(new THREE.Vector3())); stub.updateMatrixWorld(true);
  const hid = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)); hid.visible = false; hid.updateMatrixWorld(true);
  const g = nearestGap(f.hand, [['tin', loose], ['stub', stub], ['far', far], ['hid', hid]]);
  assert.equal(g.prop, 'tin'); assert.ok(Math.abs(g.cm - 3) < 0.01, `${g.cm}`); assert.ok(g.cm > GAP_CM);
  assert.deepEqual(nearestGap(f.hand, [['stub', stub]]), { prop: null, cm: null, anchor: 'none' });
});

test('play.js writes grips[] for every gripping hand from nearestGap over the shown tracked props', () => {
  const src = fs.readFileSync(path.join(ROOT, 'styles/stick-man/engine/play.js'), 'utf8');
  assert.match(src, /out\.grips = \[\]/); assert.match(src, /nearestGap\(a\.S\.parts\.hands\[s\]/);
});
