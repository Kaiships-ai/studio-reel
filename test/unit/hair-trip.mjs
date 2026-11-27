// The live tripwire of the hair-in-body check: one shipped style through the 10 head-moving clips (hair-measure.mjs CLIPS), measured
// now, must give the table's rows at girth 1 (the verdict exactly, the number within 0.05 mm). The full 50-clip table is written by fits.mjs --hair (stick-hair-body.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

export const TRIP_STYLES = ['side', 'ponytail', 'afro'];   // shipped, short to long
export async function trip(style) {
  await rigStick();
  const { sweepAll, CLIPS, HAIR_IN_MM } = await import('./hair-measure.mjs'), { hairRows } = await import('../../styles/stick-man/tools/gates/fits_kinds.mjs');
  const { default: T } = await import('../../styles/stick-man/kit/compat.json', { with: { type: 'json' } });
  const rows = hairRows(await sweepAll([style], CLIPS, { girth: 1 }), HAIR_IN_MM, 1);
  test(`tripwire: ${style} through the ${CLIPS.length} head-moving clips measures as the table says`, () => {
    assert.equal(rows.length, CLIPS.length);
    assert.deepEqual(rows.flatMap(r => { const t = T.rows.find(x => x.pair === r.pair);
      return t && t.verdict === r.verdict && Math.abs(t.exact - r.exact) <= 0.05 ? [] : [`${r.pair}: measures ${r.number} mm (${r.verdict}), the table says ${t ? `${t.number} (${t.verdict})` : 'nothing'}`]; }), []);
  });
}
