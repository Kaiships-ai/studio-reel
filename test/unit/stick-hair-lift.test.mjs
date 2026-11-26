// The hair-in-body measure reads the toon style's own lift (toonHairLift), never a neck-bound lengths group inside it: read last,
// that group (at 0) put every point HAT_LIFT too low (28/11: the side part 9 mm into the collar with an empty lengths group).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const { toonHair } = await import('../../styles/stick-man/kit/cast/hair.js');
const { HAT_LIFT } = await import('../../styles/stick-man/engine/cast.js');
const { toonHairLift } = await import('./hair-measure.mjs');

test('the lift is the style group\'s, with or without a lengths group', () => {
  for (const patch of [undefined, { neck: true }, { neck: true, cut: null }]) {
    const H = new THREE.Group(); H.add(toonHair('side', null, patch)());
    assert.equal(toonHairLift(H), -HAT_LIFT, JSON.stringify(patch)); }
  const H = new THREE.Group(); H.add(toonHair('mullet', null, { neck: true, cut: null })());   // a style with bound falls
  assert.ok(H.children[0].children.some(o => o.name === 'toonHair:lengths')); assert.equal(toonHairLift(H), -HAT_LIFT);
});
