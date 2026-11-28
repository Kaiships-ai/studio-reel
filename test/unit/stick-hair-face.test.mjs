// tier: heavy
// A toon hair never curtains the face (Studio 27/11): tools/gates/facegate-hair.mjs, its limit written before any style was measured.
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
await rigStick();
const { faceShare, featureShare, passes, FACE_MIN, FACE, FEATURE_MIN, FEATURES } = await import('../../styles/stick-man/tools/gates/facegate-hair.mjs');
const { W_M } = await import('../../styles/stick-man/engine/cast.js');
const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');

test('the limit and the face are the ones written before anything was measured', () => { assert.equal(FACE_MIN, 0.85); assert.deepEqual(FACE, { lon: 40, lo: -0.42, hi: 0.30 }); });
test('each eye and the mouth: the limit written 27/11 before anything was measured', () => { assert.equal(FEATURE_MIN, 0.95); assert.deepEqual(Object.keys(FEATURES), ['eyeL', 'eyeR', 'mouth']); });
test('bald: every eye and the mouth in sight', () => { const r = featureShare(() => new THREE.Group()); assert.ok(passes(r), JSON.stringify(r)); for (const v of Object.values(r)) for (const x of Object.values(v)) assert.ok(x > 0.999, x); });
test('control: a small card over one eye fails that eye and passes the whole face', () => {
  const make = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.16 * W_M, 0.16 * W_M).translate(0.15 * W_M, 0, 0.6 * W_M))); return g; };
  const r = featureShare(make); assert.ok(!passes(r)); assert.ok(r.front.eyeR < FEATURE_MIN && r.front.eyeL >= FEATURE_MIN && r.front.face >= FACE_MIN, JSON.stringify(r.front)); });
// the chin bob as shipped 27/11 (its bell and locks frozen in the fixture), whose slab crossed the far eye on the sheet's close 3/4
test('control: the 27/11 chin bob fails at 3/4 (a slab across the far eye)', () => {
  const r = featureShare('bob', { ...JSON.parse(fs.readFileSync(new URL('../fixtures/hair-face/bob-27-11.json', import.meta.url), 'utf8')), draft: true });
  assert.ok(['q34', 'q34s'].some(k => Object.keys(FEATURES).some(f => r[k][f] < FEATURE_MIN)), JSON.stringify(r)); });
test('bald: the whole face in sight', () => { for (const x of Object.values(faceShare(() => new THREE.Group()))) assert.ok(x > 0.999, x); });
test('control: a card over half the face fails', () => {
  const make = () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * W_M, 1.2 * W_M).translate(0.25 * W_M, 0, 0.7 * W_M)); g.add(m); return g; };
  const r = faceShare(make); assert.ok(r.front < FACE_MIN, `front ${r.front}`);
});
// the full lengths of the long styles (behind the { neck: true, cut: null } flag) curtained the face on the 27/11 sheet
test('control: the 27/11 long (full length) fails', () => { const r = faceShare('long', { neck: true, cut: null, draft: true }); assert.ok(Object.values(r).some(x => x < FACE_MIN), JSON.stringify(r)); });



for (const s of HAIR_STYLES) test(`${s}: the face ${FACE_MIN * 100} %, each eye and the mouth ${FEATURE_MIN * 100} % in sight, front, 3/4 and low front`, () => {
  const r = featureShare(s), bad = []; for (const [k, v] of Object.entries(r)) for (const [f, x] of Object.entries(v)) if (x < (f === 'face' ? FACE_MIN : FEATURE_MIN)) bad.push(`${k} ${f} ${(100 * x).toFixed(1)}%`);
  assert.deepEqual(bad, []); });
