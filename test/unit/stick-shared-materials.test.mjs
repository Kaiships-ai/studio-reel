// tier: heavy
// One figure swaps its hair in place through all 110 ordered pairs of toon styles (S.bakeHair) while a second stands
// beside it. Each swap, posed, equals a fresh build of that style (fingerprint and worn shell) and frees every geometry,
// material and texture the old hair owned; nothing frees the materials every figure shares (engine/cast.js SHARED: the
// ink and the outline), SHARED keeps its values and the figure beside keeps its fingerprint. The control writes the shared
// outline colour, as the live prototype's (P3) slider did: it turns the other figure's hull from #241f23 to #aa503f, and
// this test must see it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { swapAll } from './hair-swap.mjs';

const [head, control] = await Promise.all([swapAll(), swapAll({ control: true, parts: 1 })]);

test('all 110 in-place hair swaps, posed, equal a fresh build of their style', () => {
  assert.equal(head.pairs.length, 110);
  assert.equal(new Set(head.pairs.map(p => `${p.from}>${p.to}`)).size, 110, 'every ordered pair once');
  assert.deepEqual(head.pairs.filter(p => !p.ok).map(p => `${p.from}>${p.to}${p.shell ? '' : ' (worn shell)'}`), []);
});

test('each swap frees everything the old hair owned, and never a shared material', () => {
  assert.ok(head.pairs.every(p => p.owned > 0), 'each old hair owned something to free');
  assert.deepEqual(head.pairs.filter(p => p.kept.length).map(p => `${p.from}>${p.to}: ${p.kept.join(',')}`), [], 'left undisposed');
  assert.deepEqual(head.runs.flatMap(r => r.sharedFreed), [], 'shared materials disposed');
});

test('the shared materials and uniforms keep their values, and the figure beside keeps its fingerprint', () => {
  for (const r of head.runs) {
    assert.equal(new Set(r.shared).size, 1, `part ${r.part}: SHARED before and after the swaps`);
    assert.equal(r.bystander[0], r.bystander[1], `part ${r.part}: the other figure`);
    assert.deepEqual(r.hull, ['241f23', '241f23']);
  }
});

test('control: a write to the shared outline is caught', () => {
  const [r] = control.runs;
  assert.equal(r.shared[1], r.shared[0]);
  assert.notEqual(r.shared[2], r.shared[0]);
  assert.notEqual(r.bystander[1], r.bystander[0]);
  assert.deepEqual(r.hull, ['241f23', 'aa503f']);
});
