// The shot report's camera numbers (styles/stick-man/tools/faults.mjs camStats, shot.mjs --report (b)). Hot Money ep01 r2
// (Kai 17/11): a film directed one shot per frame (every frame a cut) crashed the report at shot.mjs:136 (rows[-1]: no
// frame had a camera number), so s4, s5 and s6 could not get the kit's own report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { camStats } from '../../styles/stick-man/tools/faults.mjs';

const row = (f, cam, cut = false) => ({ f, motion: { cam, cut } });

test('camStats: the peak, the median, the longest still run, the fast frames and the cuts', () => {
  const rows = [row(10, 0), row(11, 0.005), row(12, 0.004), row(13, 30), row(14, 2), row(15, 900, true), row(16, 1)];
  const c = camStats(rows);
  assert.deepEqual(c, { best: 2, bestAt: 12, peak: 30, peakAt: 13, median: 1, fast: [13], cuts: [15] });
});
test('camStats: a film where every frame is a cut (one direct shot per frame) has no camera numbers and does not throw', () => {
  const c = camStats([row(1633, 834, true), row(1634, 1, true), row(1635, 2, true)]);
  assert.equal(c.peak, null); assert.equal(c.median, null); assert.deepEqual(c.cuts, [1633, 1634, 1635]);
});
test('camStats: a frame without a camera number is left out, not read as the peak', () => {
  const c = camStats([row(0, 0), row(1, 3), row(2, undefined), row(3, 5)]);
  assert.equal(c.peak, 5); assert.equal(c.peakAt, 3);
});
