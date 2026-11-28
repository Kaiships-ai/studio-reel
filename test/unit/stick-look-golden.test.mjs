// Every stick-man look this checkout builds matches its golden fingerprint (test/golden/looks.json, locked at C1 before any
// edit of the appearance path), unless Kai approved the change: a row { case, from, to, page, by: 'Kai' } in
// test/golden/approvals.json, `page` being the before|after he looked at. The control (one palette step on coral) must move
// exactly the one look that wears coral, and an approval not signed by Kai must not let it through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPROVALS, GOLDEN, fingerprintAll, judge, readJSON } from './look-fingerprint.mjs';

const golden = readJSON(GOLDEN), approvals = readJSON(APPROVALS);
const [head, coral] = await Promise.all([fingerprintAll(), fingerprintAll({ mutate: 'coral' })]);

test('every look matches the golden baseline or carries an approval by Kai', () => {
  assert.ok(Object.keys(golden.cases).length >= 60, 'the golden baseline holds every case');
  assert.equal(head.face, 's2', 'the s2 face is the default face style');
  assert.deepEqual(judge(golden, approvals, head.cases), []);
});

test('the cases cover 5 bodies, the s2 face on each, 11 hair styles, 15 looks, 3 walks, every spec, the hoodie in 3 import orders', () => {
  const n = re => Object.keys(golden.cases).filter(k => re.test(k)).length;
  assert.deepEqual([n(/^body:/), n(/^face:/), n(/^hair:/), n(/^look:[^@]+$/), n(/@walk$/), n(/^spec:/), n(/^hoodie/)], [5, 5, 11, 15, 3, 17, 9]);
});

test('control: one colour step on coral moves look:dress and nothing else, and the golden fails on it', () => {
  const moved = Object.keys(head.cases).filter(k => head.cases[k].hash !== coral.cases[k].hash);
  assert.deepEqual(moved, ['look:dress']);
  assert.deepEqual(judge(golden, approvals, coral.cases).map(f => f.case), ['look:dress']);
});

test('an approval passes a changed look only when Kai signed it and it names the before|after page', () => {
  const row = { case: 'look:dress', from: golden.cases['look:dress'], to: coral.cases['look:dress'].hash, page: 'https://claude.ai/artifact/example' };
  assert.equal(judge(golden, [{ ...row, by: 'Kai' }], coral.cases).length, 0, 'a signed row with its page lets the change through');
  for (const bad of [row, { ...row, by: 'agent' }, { ...row, by: 'Kai', page: '' }, { ...row, by: 'Kai', from: 'other' }])
    assert.deepEqual(judge(golden, [bad], coral.cases).map(f => f.case), ['look:dress'], JSON.stringify(bad));
});

test('a case dropped from or added to the build fails', () => {
  const { 'look:dress': _gone, ...fewer } = head.cases;
  assert.deepEqual(judge(golden, [], fewer).map(f => f.why), ['no longer built']);
  assert.match(judge(golden, [], { ...head.cases, 'look:new': { hash: 'x' } })[0].why, /not in test\/golden/);
});
