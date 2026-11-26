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
import { gripGap, HAND_R } from '../../styles/stick-man/engine/grip.js';
import { handgrip, GAP_CM } from '../../styles/stick-man/tools/gates/handgrip.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const FROZEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'styles/stick-man/tools/gates/handgrip.limits.json'), 'utf8'));
const GATE = path.join(ROOT, 'styles/stick-man/tools/gates/handgrip.mjs');

test('the gate uses the frozen limit, and the frozen control (5 cm off) is beyond it', () => {
  assert.equal(GAP_CM, FROZEN.GAP_CM);
  assert.ok(FROZEN.control.move_cm - HAND_R * 100 > GAP_CM, 'a prop 5 cm off the hand centre must read over the limit');
});

// a tin 8 cm across, its grip socket on its side; the hand dot's centre on the socket
const tin = (grip = true) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08));
  if (grip) o.userData.grip = [0.04, 0, 0];
  o.position.set(1 - 0.04, 1, 0); o.updateMatrixWorld(true);
  return o;
};
const HAND = new THREE.Vector3(1, 1, 0);

test('engine/grip.js: a prop on its grip socket reads 0 cm, the control 5 cm off it fails', () => {
  const o = tin();
  assert.deepEqual(gripGap(HAND, o, 'R'), { cm: 0, anchor: 'grip' });
  o.position.x -= FROZEN.control.move_cm / 100; o.updateMatrixWorld(true);
  const g = gripGap(HAND, o, 'R');
  assert.equal(g.anchor, 'grip');
  assert.ok(Math.abs(g.cm - (5 - HAND_R * 100)) < 1e-6, `${g.cm}`);
  assert.equal(handgrip([{ f: 0, held: [{ actor: 'mum', prop: 'tin', side: 'R', onScreen: true, gapCm: g.cm, anchor: g.anchor }] }]).ok, false);
});

test('engine/grip.js: a socket per hand is read for that hand; a prop with no socket is measured to its box', () => {
  const o = tin(false);
  o.userData.grip = { L: [-0.04, 0, 0], R: [0.04, 0, 0] };
  assert.equal(gripGap(HAND, o, 'R').cm, 0);
  assert.ok(gripGap(HAND, o, 'L').cm > 5, 'the left socket is 8 cm from the right hand');
  const b = tin(false);
  assert.deepEqual(gripGap(HAND, b, 'R'), { cm: 0, anchor: 'bounds' });   // the hand on its side
  b.position.x -= 0.05; b.updateMatrixWorld(true);
  const g = gripGap(HAND, b, 'R');
  assert.equal(g.anchor, 'bounds');
  assert.ok(Math.abs(g.cm - (5 - HAND_R * 100)) < 1e-6, `${g.cm}`);
});

const held = (cm, o = {}) => ({ actor: 'mum', prop: 'baby', side: 'B', onScreen: true, gapCm: cm, anchor: 'bounds', ...o });
const clip = (cms, o) => cms.map((cm, f) => ({ f, held: [held(cm, o)] }));

test('handgrip: per frame, one frame over the limit fails; off screen is left out; a clean hold passes', () => {
  const clean = handgrip(clip([0, 0.4, 1.2, 0]));
  assert.equal(clean.ok, true); assert.equal(clean.checked, 4);
  const off = handgrip(clip([0, 0, 6.3, 0]));
  assert.equal(off.ok, false);
  assert.deepEqual(off.faults.map(x => [x.f, x.actor, x.prop, x.side, x.anchor]), [[2, 'mum', 'baby', 'B', 'bounds']]);
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
  const bad = run(clip([0, FROZEN.control.move_cm - HAND_R * 100]));
  assert.equal(bad.status, 1); assert.match(bad.stdout, /FAIL mum baby B f1 /);
  assert.equal(run([{ f: 0, held: [{ actor: 'a', prop: 'p', side: 'R', onScreen: true, gapPx: 1 }] }]).status, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});
