// fits_kinds.mjs: the face, mark and outfit rows film.js asks for, measured with the frozen limits of kit/compat-limits.json.
import test from 'node:test';
import assert from 'node:assert/strict';

const K = await import('../../styles/stick-man/tools/gates/fits_kinds.mjs');
const { LIMITS } = await import('../../styles/stick-man/tools/gates/fits.mjs');

test('faces: the approved ages pass on their own bodies only, the ages that wait for Kai are blocked, no other body gets a row', async () => {
  const R = await K.faces(), v = Object.fromEntries(R.map(r => [r.pair, r.verdict]));
  for (const p of ['face|adult|adult', 'face|adult|heavy', 'face|elder|elder', 'face|child|child']) assert.equal(v[p], 'pass', p);
  for (const a of LIMITS.face.waits) { const r = R.find(x => x.pair === `face|${a}|${a}`); assert.equal(r.verdict, 'blocked'); assert.match(r.why, /waits for Kai/); }
  assert.equal(v['face|child|adult'], undefined); assert.equal(v['face|elder|adult'], undefined);
});

test('marks: a bold mark a hat hides any of is blocked with its share, one it never covers passes', async () => {
  const R = await K.marks(['cap:police']), by = Object.fromEntries(R.map(r => [r.pair, r]));
  assert.equal(by['mark|bold:anger|cap:police'].verdict, 'blocked'); assert.ok(by['mark|bold:anger|cap:police'].number > 10, 'the brim hides the anger mark');
  assert.equal(by['mark|bold:sweat|cap:police'].verdict, 'pass');
  for (const r of R) assert.equal(r.verdict === 'pass', r.number === 0, r.pair);
});

test('outfits: a garment alone on a body is measured by trims(); every kit garment gets a row, none from a colour', async () => {
  const R = await K.outfits(['adult'], ['coat', 'shirt:office', 'cap:police']);
  assert.deepEqual(R.map(r => r.verdict), ['pass', 'pass', 'pass']); for (const r of R) assert.ok(r.number <= LIMITS.outfit.TRIM_MM, r.pair);
  const G = K.garments(); assert.ok(G.includes('apron:low') && G.includes('cap:police')); assert.ok(!G.some(g => /hoodie|cowboy|:red/.test(g)));
});
