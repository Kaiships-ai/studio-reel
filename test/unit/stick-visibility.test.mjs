// A film report fails a shot only for what its camera sees (Kai, Hot Money ep01 SH245: the counter hid a hand 40 cm off
// its target in every frame of the locked camera, the report failed the shot, and the actor was moved to please it).
// The rows are SH245 as staged before the fix (test/fixtures/stick-sh245); the scene is its counter and glass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { faultList, hiddenOf, holdLines, joints } from '../../styles/stick-man/tools/faults.mjs';
import { pointVis, foldVis } from '../../styles/stick-man/engine/visible.js';

const FX = JSON.parse(fs.readFileSync(new URL('../fixtures/stick-sh245/rows.json', import.meta.url), 'utf8'));
const B = (x, y, z) => new THREE.Vector3(x, z, -y);

function scene(pieces) {
  const s = new THREE.Scene();
  for (const p of pieces) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.hi[0] - p.lo[0], p.hi[2] - p.lo[2], p.hi[1] - p.lo[1]),
      new THREE.MeshBasicMaterial(p.glass ? { transparent: true, opacity: 0.06 } : {}));
    m.position.copy(B(...p.lo.map((v, i) => (v + p.hi[i]) / 2))); s.add(m);
  }
  s.updateMatrixWorld(); return s;
}
function camera({ pos, target, fov }) {
  const c = new THREE.PerspectiveCamera(fov, FX.camera.w / FX.camera.h, 0.05, 200);
  c.position.copy(B(...pos)); c.lookAt(B(...target)); c.updateMatrixWorld(); c.updateProjectionMatrix(); return c;
}
const tag = (rows, cam, sc) => { const f = faultList(rows); return { f, vis: f.map(x => foldVis(x.pts.map(p => pointVis(cam, sc, B(...p))))) }; };
const hLine = L => L[L.findIndex(l => l.startsWith('(h)')) + 1];
const hangUp = FX.rows.filter(r => r.f >= 196);                     // the hand and the handset drop behind the counter to hang up

test('SH245 hang-up: the counter hides the hand 40 cm off its target, so it is listed as hidden and the shot passes (h)', () => {
  const { f, vis } = tag(hangUp, camera(FX.camera), scene(FX.counter)), L = holdLines(hangUp, hiddenOf(f, vis));
  const i196 = f.findIndex(x => x.f === 196 && x.kind === 'h');
  assert.equal(vis[i196], 'occluded', 'frame 196: hand and target behind the counter');
  assert.match(hLine(L), /PASS$/, hLine(L));
  assert.ok(L.some(l => /ẩn .*occluded [^;]*196.*worst 40\.02 cm \(frame 196 R\)/.test(l)), `the hidden fault keeps its number:\n${L.join('\n')}`);
});

test('control: the same hang-up seen from behind the counter fails (h) on the 40 cm hand', () => {
  const cam = camera({ pos: [163.6, 2.4, 2.1], target: [163.7, 0.6, 0.9], fov: 50 });
  const { f, vis } = tag(hangUp, cam, scene(FX.counter)), L = holdLines(hangUp, hiddenOf(f, vis));
  assert.equal(vis[f.findIndex(x => x.f === 196 && x.kind === 'h')], 'in');
  assert.match(hLine(L), /^ {4}t3: 40\.02 cm \(frame 196 R\).*FAIL$/, hLine(L));
});

test('glass hides nothing: with only the counter glass in the way the 40 cm hand fails', () => {
  const { f, vis } = tag(hangUp, camera(FX.camera), scene(FX.counter.filter(p => p.glass)));
  assert.equal(vis[f.findIndex(x => x.f === 196 && x.kind === 'h')], 'in');
  assert.match(hLine(holdLines(hangUp, hiddenOf(f, vis))), /40\.02 cm \(frame 196 R\).*FAIL$/);
});

test('SH245 phone at the cheek stays judged: the hand above the counter is seen, 2 cm limit unchanged', () => {
  const rows = FX.rows.filter(r => r.f >= 186 && r.f <= 192), { f, vis } = tag(rows, camera(FX.camera), scene(FX.counter));
  assert.ok(f.filter(x => x.kind === 'h').every(x => vis[f.indexOf(x)] === 'in'), 'every hand fault at the cheek is in view');
  assert.match(hLine(holdLines(rows, hiddenOf(f, vis))), /13\.81 cm \(frame 189 R\).*FAIL$/);
});

test('a hand hidden in what it holds is seen through it: the handset over the counter lip shows the hand (frames 194-195)', () => {
  // the drawn counter's lip stands about 6 cm over its 1.12 m collision box: the hand and its target go behind it,
  // the top of the handset does not (the render shows it)
  const rows = FX.rows.filter(r => r.f === 194 || r.f === 195), cam = camera(FX.camera);
  const sc = scene(FX.counter.map(p => (p.glass ? p : { ...p, hi: [p.hi[0], p.hi[1], 1.18] }))), { f, vis } = tag(rows, cam, sc);
  const h = f.filter(x => x.kind === 'h');
  assert.equal(h.length, 2);
  assert.deepEqual(h.map(x => foldVis(x.pts.slice(0, 2).map(p => pointVis(cam, sc, B(...p))))), ['occluded', 'occluded'], 'hand and target behind the lip');
  assert.deepEqual(h.map(x => vis[f.indexOf(x)]), ['in', 'in'], 'the handset over the lip shows where the hand is');
});

test('joint pops behind the counter leave the joint measure, listed as hidden; rows with no camera judge every fault', () => {
  const { f, vis } = tag(FX.rows, camera(FX.camera), scene(FX.counter)), hidden = hiddenOf(f, vis);
  const all = joints(FX.rows, 't3'), seen = joints(FX.rows, 't3', hidden);
  assert.equal(all.jump.toFixed(1), '63.3'); assert.equal(all.jumpAt, 'frame 7, elbowFlexR');
  assert.equal(`${seen.jump.toFixed(1)} ${seen.jumpAt}`, '57.4 frame 196, shoulder-elbowR', 'the upper arm over the counter is still judged');
  assert.match(seen.hidden, /occluded 3, 7, 196, 198, 200;.*worst 63\.3 deg \(frame 7, elbowFlexR\)/);
  assert.match(hLine(holdLines(hangUp)), /40\.02 cm \(frame 196 R\).*FAIL$/, 'no camera: judged in 3D');
});

test('a point out of the frame or behind the lens is off; in front of an opaque box it is in, behind it occluded', () => {
  const cam = camera(FX.camera), sc = scene(FX.counter);
  assert.equal(pointVis(cam, sc, B(163.6, 0.6, 1.4)), 'in');
  assert.equal(pointVis(cam, sc, B(163.6, 0.6, 0.6)), 'off');           // under the frame's bottom edge
  assert.equal(pointVis(cam, sc, B(163.6, -3, 1.5)), 'off');            // behind the lens
  assert.equal(pointVis(cam, sc, B(163.6, 0.6, 1.0)), 'occluded');      // behind the counter, inside the frame
  assert.equal(foldVis(['off', 'occluded']), 'occluded'); assert.equal(foldVis(['occluded', 'in']), 'in');
});
