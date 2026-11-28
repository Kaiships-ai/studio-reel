// tier: heavy
// What every stick-man figure shares (engine/cast.js SHARED: the ink and outline materials, the scene's light uniforms) keeps
// its values while one figure swaps its hair in place through all 110 ordered pairs of toon styles and has a colour slider
// dragged over its own materials, and a second figure beside it does not change. Each swap, posed, equals a fresh build of
// that style (fingerprint and worn shell). The control is the slider loop of the live prototype (P3) that also wrote the
// shared outline: it turned the other figure's hull from #241f23 to #aa503f, and this test must see it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { swapAll } from './hair-swap.mjs';

const [head, control] = await Promise.all([swapAll(), swapAll({ control: true, parts: 1 })]);

test('all 110 in-place hair swaps, posed, equal a fresh build of their style', () => {
  assert.equal(head.pairs.length, 110);
  assert.equal(new Set(head.pairs.map(p => `${p.from}>${p.to}`)).size, 110, 'every ordered pair once');
  assert.deepEqual(head.pairs.filter(p => !p.ok).map(p => `${p.from}>${p.to}${p.shell ? '' : ' (worn shell)'}`), []);
});

test('the shared materials and uniforms keep their values, and the figure beside keeps its fingerprint', () => {
  for (const r of head.runs) {
    assert.equal(new Set(r.shared).size, 1, `part ${r.part}: SHARED before, after the swaps, after the colour loop`);
    assert.equal(r.bystander[0], r.bystander[1], `part ${r.part}: the other figure`);
    assert.deepEqual(r.hull, ['241f23', '241f23']);
  }
});

test('control: the slider loop that writes the shared outline is caught', () => {
  const [r] = control.runs;
  assert.notEqual(r.shared[2], r.shared[0]);
  assert.notEqual(r.bystander[1], r.bystander[0]);
  assert.deepEqual(r.hull, ['241f23', 'aa503f']);
});
