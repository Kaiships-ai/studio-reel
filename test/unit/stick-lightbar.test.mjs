// A rotating light bar (styles/stick-man/kit/fx/lightbar.js): two heads half a turn apart that sweep smoothly, never blink.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { lightBarAt, lightBar } from '../../styles/stick-man/kit/fx/lightbar.js';
import { MAKE } from '../../styles/stick-man/engine/verbs_fx.js';

test('dark before `from`; the heads take turns, half a turn apart, one turn every `spin` frames', () => {
  assert.deepEqual(lightBarAt(5, { from: 10 }), [0, 0]);
  const o = { from: 0, spin: 10 }, [a0, b0] = lightBarAt(0, o), [a5, b5] = lightBarAt(5, o);
  assert.ok(a0 > 0.99 && b0 < 0.01 && a5 < 0.01 && b5 > 0.99, `${a0} ${b0} ${a5} ${b5}`);
  assert.deepEqual(lightBarAt(3, o), lightBarAt(13, o));
});

test('a sweep, not a blink: each head comes up over several frames and never jumps from dark to full', () => {
  const o = { from: 0, spin: 10 }; let lit = 0, jump = 0;
  for (let f = 0; f < 40; f++) { const [a] = lightBarAt(f, o), [a1] = lightBarAt(f + 1, o); if (a > 0.05) lit++; jump = Math.max(jump, Math.abs(a1 - a)); }
  assert.ok(lit >= 12, `head A is lit on ${lit} of 40 frames`); assert.ok(jump < 0.75, `largest frame step ${jump.toFixed(2)}`);
});

test('rise brings the first head up low before it spins; fade takes the whole bar down', () => {
  const o = { from: 0, rise: 20, fade: [60, 80] };
  const [r10, b10] = lightBarAt(10, o); assert.ok(r10 > 0.05 && r10 < 0.5 && b10 < r10);
  assert.ok(lightBarAt(5, o)[0] < lightBarAt(15, o)[0]);
  assert.deepEqual(lightBarAt(85, o).map(x => +x.toFixed(6)), [0, 0]);
});

test('lightBar: two point lights that stand still and follow the timing on each frame', () => {
  const stage = { scene: new THREE.Scene() }, g = lightBar(stage, { at: [1, 2, 3], power: 10, from: 0, spin: 10 });
  const L = g.children.filter(c => c.isPointLight); assert.equal(L.length, 2);
  assert.deepEqual(g.position.toArray(), [1, 3, -2]);
  g.userData.anim(0); assert.ok(Math.abs(L[0].intensity - 10) < 1e-6 && L[1].intensity < 1e-6);
  g.userData.anim(5); assert.ok(L[0].intensity < 1e-6 && Math.abs(L[1].intensity - 10) < 1e-6);
  assert.ok(stage.scene.children.includes(g));
  assert.equal(typeof MAKE.ao_anim, 'function', 'importing the bar registers the kind the act keys it with');
});
