// The fits table (styles/stick-man/kit/compat.json, its reader kit/cast/compat.js, its tool tools/gates/fits.mjs): which person, clip,
// face, hat and prop go together, measured, and a gate nobody can talk round.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../../kit/env.mjs';

const KIT = path.join(ROOT, 'styles/stick-man/kit'), LIMITS = JSON.parse(fs.readFileSync(path.join(KIT, 'compat-limits.json'), 'utf8'));

test("the frozen limits are the kit's own numbers", async () => {
  const M = await import('./wardrobe-measure.mjs'), { SHAPE_C, SHAPE_CM } = await import('../../styles/stick-man/tools/gates/bodylife.mjs');
  const { from, frames, ...clip } = LIMITS.clip; for (const [k, v] of Object.entries(clip)) assert.deepEqual(v, M[k], k);
  assert.deepEqual([LIMITS.copy.SHAPE_C, LIMITS.copy.SHAPE_CM], [SHAPE_C, SHAPE_CM]); assert.deepEqual([LIMITS.outfit.TOUCH_MM, LIMITS.outfit.TRIM_MM], [M.TOUCH_MM, M.TRIM_MM]);
  assert.match(fs.readFileSync(path.join(ROOT, 'test/unit/stick-wardrobe.test.mjs'), 'utf8'), /t\.ring\.mm < 14/); assert.equal(LIMITS.outfit.ring_mm, 14); assert.equal(LIMITS.mark.cover, 0);
});
