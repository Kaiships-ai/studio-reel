// Held props off the hand (whatif1 v5, 26/11: a tin with the hands as dots on its label, a baby bundle floating beside
// the arms, a photo in front of the chest with no hand on it; every gate passed them). engine/grip.js measures, each
// frame, the air between the hand dot and the prop's grip socket (userData.grip) or, for a prop with none, the nearest
// point of its box; play.js writes it to the rows as held[].gapCm and tools/gates/handgrip.mjs fails a frame over the
// limit frozen in handgrip.limits.json before anything was measured. The control: the same prop moved 5 cm off the hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import { gripGap, handRadius } from '../../styles/stick-man/engine/grip.js';
import { W_M, solid } from '../../styles/stick-man/engine/cast.js';
import { handgrip, GAP_CM } from '../../styles/stick-man/tools/gates/handgrip.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const FROZEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'styles/stick-man/tools/gates/handgrip.limits.json'), 'utf8'));
const GATE = path.join(ROOT, 'styles/stick-man/tools/gates/handgrip.mjs');

test('the gate uses the frozen limit, and the frozen control (5 cm of air) is beyond it', () => {
  assert.equal(GAP_CM, FROZEN.GAP_CM);
  assert.ok(FROZEN.control.move_cm > GAP_CM);
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
