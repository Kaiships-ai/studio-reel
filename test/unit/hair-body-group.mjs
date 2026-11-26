// One group of the hair-in-body check: each shipped style of the group played through every clip of CLIPS (sweepAll), its worst frame held to HAIR_IN_MM.
// The styles are split into four files (stick-hair-body*.test.mjs: node --test runs files side by side) because one file took 500 s;
// stick-hair-body.test.mjs holds the limit, the control and the check that the four groups are every shipped style.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

export const GROUPS = [['girl', 'side'], ['woman', 'crop', 'curly'], ['ponytail', 'pompadour', 'buzz'], ['elder', 'afro', 'pixie']];   // about 120 k hair points a group
export async function bodyGroup(n) {
  await rigStick();
  const { hairPoints, sweepAll, HAIR_IN_MM } = await import('./hair-measure.mjs'), styles = GROUPS[n];
  const all = await sweepAll(styles);   // each clip played once, every style of the group measured on its frames
  for (const s of styles) {
    // measured as it ships (shortened or not), named with the length it was designed to
    const { low: designed } = hairPoints(s, { cut: null }), { low } = hairPoints(s);
    test(`${s} (down to ${(-low).toFixed(2)} W, designed to ${(-designed).toFixed(2)}): never more than ${HAIR_IN_MM} mm into the body`, async () => {
      const r = all[s], bad = Object.entries(r).filter(([, x]) => x.mm > HAIR_IN_MM);
      assert.deepEqual(bad.map(([c, x]) => `${c} f${x.f}: ${x.mm.toFixed(1)} mm into the ${x.what}`), []);
    });
  }
}
