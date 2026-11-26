// One shard of the hair-in-body check: every shipped toon style played through the shard's adult clips (sweepAll: each clip once,
// every style measured on its frames), and each hair x clip pair held to its row in kit/compat.json: over HAIR_IN_MM it must be
// `blocked` there (a film cannot use it: kit/film.js must(), fits.mjs checkFilm), at or under it `pass`; a pair the table holds
// otherwise fails either way, so the block list stays true. New rows: node styles/stick-man/tools/gates/fits.mjs --hair.
// The clips are split into SHARDS files (stick-hair-body*.test.mjs: node --test runs files side by side; all 50 in one file is ~28 min);
// stick-hair-body.test.mjs holds the limit, the control and the check that the shards are every adult clip, once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

export const SHARDS = 10;
// the adult clips dealt to SHARDS by frame count (the longest first, each to the lightest shard): about 700 frames a shard
export async function shards() {
  await rigStick();
  const { ADULT_CLIPS } = await import('./hair-measure.mjs'), { getClip } = await import('../../styles/stick-man/motion-lib/index.js');
  const out = Array.from({ length: SHARDS }, () => ({ clips: [], frames: 0 }));
  for (const [c, n] of ADULT_CLIPS.map(c => [c, getClip(c, 'adult').frames]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) { const s = out.reduce((a, b) => (b.frames < a.frames ? b : a)); s.clips.push(c); s.frames += n; }
  return out.map(s => s.clips);
}
export async function bodyShard(n) {
  await rigStick();
  const { sweepAll, HAIR_IN_MM } = await import('./hair-measure.mjs'), { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');
  const { hairRows } = await import('../../styles/stick-man/tools/gates/fits_kinds.mjs'), { lookup } = await import('../../styles/stick-man/kit/cast/compat.js');
  const clips = (await shards())[n], rows = hairRows(await sweepAll([...HAIR_STYLES], clips), HAIR_IN_MM);
  for (const s of HAIR_STYLES) test(`${s} through ${clips.length} adult clips (shard ${n + 1}/${SHARDS}): over ${HAIR_IN_MM} mm into the body is blocked in kit/compat.json, the rest pass`, () => {
    const wrong = rows.filter(r => r.pair.split('|')[1] === s).flatMap(r => { const t = lookup(r.pair);
      return t.verdict === r.verdict ? [] : [`${r.pair}: measures ${r.number} mm (${r.verdict}${r.why ? `, ${r.why}` : ''}), the table says ${t.verdict}`]; });
    assert.deepEqual(wrong, []);
  });
}
