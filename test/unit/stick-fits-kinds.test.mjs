// fits_kinds.mjs: the face and outfit rows film.js asks for, and what each rests on.
import test from 'node:test';
import assert from 'node:assert/strict';

const K = await import('../../styles/stick-man/tools/gates/fits_kinds.mjs');
const row = (key, clip, verdict) => ({ pair: `clip|${key}|${clip}`, kind: 'clip', verdict });

test('a garment on a body passes with one clean clip and is blocked with none; colours are not in the key', () => {
  const R = K.outfits([row('adult/g1/coat+shirt:office', 'Idle_Stand_Loop', 'pass'), row('adult/g1/coat+shirt:office', 'Move_Run_Fwd_Loop', 'blocked'),
    row('elder/g1/coat', 'Move_Run_Fwd_Loop', 'blocked'), row('child/g1/plain', 'Idle_Stand_Loop', 'pass'), { pair: 'face|adult|adult', kind: 'face', verdict: 'pass' }]);
  const by = Object.fromEntries(R.map(r => [r.pair, r]));
  assert.deepEqual([by['outfit|coat|adult'].verdict, by['outfit|coat|adult'].number, by['outfit|coat|adult'].bad], ['pass', 1, 1]);
  assert.equal(by['outfit|shirt:office|adult'].verdict, 'pass'); assert.equal(by['outfit|coat|elder'].verdict, 'blocked');
  assert.equal(R.length, 3, 'plain adds no garment, a face row is not a clip');
});

test('faces: the approved ages pass on their own bodies only, teen and toddler wait for Kai, no other body gets a row', async () => {
  const R = await K.faces(), v = Object.fromEntries(R.map(r => [r.pair, r.verdict]));
  for (const p of ['face|adult|adult', 'face|adult|heavy', 'face|elder|elder', 'face|child|child']) assert.equal(v[p], 'pass', p);
  for (const p of ['face|teen|teen', 'face|toddler|toddler']) { assert.equal(v[p], 'blocked', p); assert.match(R.find(r => r.pair === p).why, /Kai/); }
  assert.equal(v['face|child|adult'], undefined); assert.equal(v['face|elder|adult'], undefined);
});
