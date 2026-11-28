// tier: heavy
// A rigid hair never goes into the body it sits on (Studio 26/11: hair is rigid to the head, so a long style cuts into the shoulders
// and the chest as the head turns or bends). Every toon style is played through every adult clip of the motion library (test/unit/hair-measure.mjs
// ADULT_CLIPS, 50) in the coral sweater, and its drawn surface measured against the torso shell and the limbs as drawn on every frame.
// A hair x clip pair over the limit is a `blocked` hair row of kit/compat.json (a film cannot use it).
// The full measure (11 styles x 50 clips, ~30 min) is a writer, not a per-run test: node styles/stick-man/tools/gates/fits.mjs --hair
// writes the 550 rows, each stamped `inputs` with a hash of every file the measure reads (test/unit/hair-stamp.mjs). This file
//   - fails while any hair row's stamp is not today's (the rows are stale: rerun the writer),
//   - holds the table to the limit (over it blocked, at or under it pass),
//   - replays a live tripwire (hair-trip.mjs: the 10 head-moving clips on 3 shipped styles, one per file) against the table, and the control (a lock through
//     the back must fail), so the measure itself is proven on every run.
//   HAIR_IN_MM  written 26/11 before any style was measured, and never raised: the depth of the hair's surface inside the body's,
//               mm. As ARM_IN in wardrobe-measure.mjs: under the ink line's own width (2.4 px at 720 wide, ~590 px a metre) the
//               body's edge still reads whole where the hair lies on it; deeper, the hair is seen to cut in. A style that fails is
//               shortened (kit/cast/hair.js) or the pair blocked, never this.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { hairStamp, hairInputs, staleRows, STALE, ROOT_OF_REPO } from './hair-stamp.mjs';
import { trip, TRIP_STYLES } from './hair-trip.mjs';

await rigStick();
const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');
const { sweep, CLIPS, ADULT_CLIPS, HAIR_IN_MM, NEAR_W } = await import('./hair-measure.mjs');   // the limits as the measure itself uses them
const { default: T } = await import('../../styles/stick-man/kit/compat.json', { with: { type: 'json' } });
const { pair } = await import('../../styles/stick-man/kit/cast/compat.js');
const HAIR = T.rows.filter(r => r.kind === 'hair');

test('the limit is the one written before anything was measured', () => { assert.equal(HAIR_IN_MM, 4); assert.equal(NEAR_W, 0.10); assert.equal(CLIPS.length, 10); });

test('the hair rows are what the measure writes from today\'s inputs (their stamp)', () => {
  const stale = staleRows(T); assert.deepEqual(stale, [], `${STALE} (${stale.length} rows: ${stale.slice(0, 3).join(', ')}…)`);
});
test('the stale check sees an edited input: hair.js changed in a copy, and a row stamped otherwise', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hair-stamp-'));
  try {
    for (const f of hairInputs()) { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT_OF_REPO, f), path.join(tmp, f)); }
    fs.mkdirSync(path.join(tmp, 'node_modules/three'), { recursive: true }); fs.copyFileSync(path.join(ROOT_OF_REPO, 'node_modules/three/package.json'), path.join(tmp, 'node_modules/three/package.json'));
    const now = hairStamp(); assert.equal(hairStamp(tmp), now, 'a copy of the same inputs stamps the same');
    for (const f of ['styles/stick-man/kit/cast/hair.js', 'styles/stick-man/motion-lib/body/adult/Adult_Move_Run_Fwd_Loop_v01.js', 'styles/stick-man/engine/cast.js', 'test/unit/hair-measure.mjs']) {
      const p = path.join(tmp, f), was = fs.readFileSync(p); fs.appendFileSync(p, '\n// edited\n');
      const then = hairStamp(tmp); assert.notEqual(then, now, `${f} edited, the stamp kept`);
      assert.equal(staleRows({ rows: HAIR.map(r => ({ ...r, inputs: now })) }, then).length, HAIR.length); fs.writeFileSync(p, was);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.deepEqual(staleRows({ rows: [{ pair: 'hair|side|X', kind: 'hair' }] }), ['hair|side|X'], 'a row with no stamp is stale');
});

test('every adult clip is measured: a hair row for every shipped style and adult clip, and no other', () => {
  return import('../../styles/stick-man/motion-lib/index.js').then(({ ALL }) => {
    assert.deepEqual([...ADULT_CLIPS].sort(), ALL.filter(C => (C.body || 'adult') === 'adult').map(C => C.clip).sort()); assert.equal(ADULT_CLIPS.length, 50);
    assert.deepEqual(HAIR.map(r => r.pair).sort(), HAIR_STYLES.flatMap(s => ADULT_CLIPS.map(c => pair('hair', s, c))).sort());
  });
});
test('the table holds the limit: over it blocked, at or under it pass', () => {
  const wrong = HAIR.filter(r => (r.number > HAIR_IN_MM ? r.verdict !== 'blocked' : r.verdict !== 'pass')).map(r => `${r.pair} ${r.number} ${r.verdict}`);
  assert.deepEqual(wrong, []);
});
test('a hair row over the limit cannot be pass (fits.mjs tableFaults)', async () => {
  const { tableFaults, limitsSha, HAIR_IN_MM: L } = await import('../../styles/stick-man/tools/gates/fits.mjs'); assert.equal(L, HAIR_IN_MM);
  const f = tableFaults({ limits: limitsSha(), rows: [{ pair: 'hair|buzz|Act_PistolShoot_Once', kind: 'hair', verdict: 'pass', number: 16.8, unit: 'mm', bad: 0 }] });
  assert.equal(f.length, 1);
});

// the control: a lock hung from the nape straight down the back through the shoulders must fail, or the measure sees nothing
test('control: a lock hung through the back fails', async () => {
  const THREE = await import('three'), { solid, W_M, HAT_LIFT } = await import('../../styles/stick-man/engine/cast.js');
  const make = () => { const g = new THREE.Group(); g.position.y = -HAT_LIFT; g.userData.hairControl = true; const m = solid(new THREE.CylinderGeometry(0.12 * W_M, 0.12 * W_M, 1.0 * W_M, 8, 3).translate(0, -0.9 * W_M, -0.25 * W_M), new THREE.MeshBasicMaterial()); g.add(m); return g; };
  const r = await sweep(make, ['Adult_Gest_NodYes_Once'], undefined, { from: 8, to: 12 });   // the nod's few frames: the lock is in the back on each
  assert.ok(r.Adult_Gest_NodYes_Once.mm > 20, `the control lock measured ${r.Adult_Gest_NodYes_Once.mm.toFixed(1)} mm in`);
});
// the tripwire (hair-trip.mjs): one style per file, side by side (~1 min each); side here, the others in stick-hair-trip-<style>.test.mjs
test('every tripwire style is shipped and has its file', () => {
  for (const s of TRIP_STYLES) assert.ok(HAIR_STYLES.includes(s), `${s} is not a shipped style`);
  for (const s of TRIP_STYLES.slice(1)) assert.match(fs.readFileSync(new URL(`./stick-hair-trip-${s}.test.mjs`, import.meta.url), 'utf8'), new RegExp(`trip\\('${s}'\\)`));
});
await trip(TRIP_STYLES[0]);
