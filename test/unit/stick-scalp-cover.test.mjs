// No toon hair style leaves the scalp bare (Studio 26/11, the third round of white showing where hair should be): every
// style is drawn (tools/gates/scalpgate.mjs: a depth-buffered render of the head and the hair as built, fill and ink hull)
// from the front, 3/4, low front, the back, in profile (the head turned) and from under the chin (the head looking up),
// and the head pixels that are scalp (kit/cast/scalpline.js) with nothing in front of them are counted.
//   SCALP_BARE  written 26/11 before any style was measured, never raised: the share of a view's head pixels that may be
//               bare scalp. 0.1 %: at the close-up sheet's 350 px head, a speck under 12 px across; at beat-0, under a pixel.
import test from 'node:test';
import assert from 'node:assert/strict';

export const SCALP_BARE = 0.001;
const pinned = SCALP_BARE;
const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');
const { scalpBare, VIEWS } = await import('../../styles/stick-man/tools/gates/scalpgate.mjs');

test('the limit is the one written before anything was measured', () => { assert.equal(pinned, 0.001); assert.deepEqual(Object.keys(VIEWS), ['front', 'q34', 'low', 'back', 'turn', 'lookup']); });

// the control: a style with a bare band round the back of the head fails, or the gate sees nothing
test('control: a buzz with its nape left bare fails', () => {
  const r = scalpBare('buzz', { noFloor: true, lo: [[0, 0.33], [62, 0.10], [84, 0.03], [125, -0.20], [180, -0.20]] });
  assert.ok(r.back.share > 5 * SCALP_BARE, `the control measured ${(100 * r.back.share).toFixed(2)} % bare from the back`);
});

for (const s of HAIR_STYLES) test(`${s}: no view shows more than ${100 * SCALP_BARE} % of the head as bare scalp`, () => {
  const r = scalpBare(s), bad = Object.entries(r).filter(([, x]) => x.share > SCALP_BARE);
  assert.deepEqual(bad.map(([v, x]) => `${v}: ${(100 * x.share).toFixed(2)} % (${x.px} px)`), []);
});
