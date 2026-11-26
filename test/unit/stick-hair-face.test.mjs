// A toon hair never curtains the face (Studio 27/11): tools/gates/facegate-hair.mjs, its limit written before any style was measured.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
await rigStick();
const { faceShare, FACE_MIN, FACE } = await import('../../styles/stick-man/tools/gates/facegate-hair.mjs');
const { W_M } = await import('../../styles/stick-man/engine/cast.js');
const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');

test('the limit and the face are the ones written before anything was measured', () => { assert.equal(FACE_MIN, 0.85); assert.deepEqual(FACE, { lon: 40, lo: -0.42, hi: 0.30 }); });
test('bald: the whole face in sight', () => { for (const x of Object.values(faceShare(() => new THREE.Group()))) assert.ok(x > 0.999, x); });
test('control: a card over half the face fails', () => {
  const make = () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * W_M, 1.2 * W_M).translate(0.25 * W_M, 0, 0.7 * W_M)); g.add(m); return g; };
  const r = faceShare(make); assert.ok(r.front < FACE_MIN, `front ${r.front}`);
});
// the full lengths of the long styles (behind the { neck: true, cut: null } flag) curtained the face on the 27/11 sheet
test('control: the 27/11 long (full length) fails', () => { const r = faceShare('long', { neck: true, cut: null }); assert.ok(Object.values(r).some(x => x < FACE_MIN), JSON.stringify(r)); });
// failing on 27/11 as shipped (front/q34/low %): pixie 75/73/97 (its fringe).
// Listed as todo until they are fixed; this list only shrinks.
const TODO = new Set(['pixie']);
for (const s of HAIR_STYLES) test(`${s}: the face at least ${FACE_MIN * 100} % in sight, front, 3/4 and low front`, { todo: TODO.has(s) }, () => {
  const r = faceShare(s), bad = Object.entries(r).filter(([, x]) => x < FACE_MIN); assert.deepEqual(bad.map(([k, x]) => `${k} ${(100 * x).toFixed(1)}%`), []); });
