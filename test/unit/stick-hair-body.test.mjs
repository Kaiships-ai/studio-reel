// A rigid hair never goes into the body it sits on (Studio 26/11: hair is rigid to the head, so a long style cuts into the shoulders
// and the chest as the head turns or bends). Every toon style is played through every adult clip of the motion library (test/unit/hair-measure.mjs
// ADULT_CLIPS, 50) in the coral sweater, and its drawn surface measured against the torso shell and the limbs as drawn on every frame.
// A hair x clip pair over the limit is a `blocked` hair row of kit/compat.json (a film cannot use it), and the table must say exactly
// what is measured (hair-body-group.mjs): an unblocked pair over the limit fails, and so does a blocked pair that now passes.
//   HAIR_IN_MM  written 26/11 before any style was measured, and never raised: the depth of the hair's surface inside the body's,
//               mm. As ARM_IN in wardrobe-measure.mjs: under the ink line's own width (2.4 px at 720 wide, ~590 px a metre) the
//               body's edge still reads whole where the hair lies on it; deeper, the hair is seen to cut in. A style that fails is
//               shortened (kit/cast/hair.js) or the pair blocked, never this.
// Every style, not only those past the chin: a chin bob meets the shoulder too, as the head bows to the floor (17.4 mm, 26/11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

await rigStick();
const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');
const { sweep, CLIPS, ADULT_CLIPS, HAIR_IN_MM, NEAR_W } = await import('./hair-measure.mjs');   // the limits as the measure itself uses them

test('the limit is the one written before anything was measured', () => { assert.equal(HAIR_IN_MM, 4); assert.equal(NEAR_W, 0.10); assert.equal(CLIPS.length, 10); });

// the control: a lock hung from the nape straight down the back through the shoulders must fail, or the measure sees nothing
test('control: a lock hung through the back fails', async () => {
  const THREE = await import('three'), { solid, W_M, HAT_LIFT } = await import('../../styles/stick-man/engine/cast.js');
  const make = () => { const g = new THREE.Group(); g.position.y = -HAT_LIFT; g.userData.hairControl = true; const m = solid(new THREE.CylinderGeometry(0.12 * W_M, 0.12 * W_M, 1.0 * W_M, 8, 3).translate(0, -0.9 * W_M, -0.25 * W_M), new THREE.MeshBasicMaterial()); g.add(m); return g; };
  const r = await sweep(make, ['Adult_Gest_NodYes_Once'], undefined, { from: 8, to: 12 });   // the nod's few frames: the lock is in the back on each
  assert.ok(r.Adult_Gest_NodYes_Once.mm > 20, `the control lock measured ${r.Adult_Gest_NodYes_Once.mm.toFixed(1)} mm in`);
});

const { SHARDS, shards, bodyShard } = await import('./hair-body-group.mjs');   // shard 1 is here, 2-10 in stick-hair-body-N.test.mjs (run side by side)
test('every adult clip is measured: the shards are all 50, each once, and a file runs each shard', async () => {
  const fs = await import('node:fs'), { ALL } = await import('../../styles/stick-man/motion-lib/index.js');
  assert.deepEqual([...ADULT_CLIPS].sort(), ALL.filter(C => (C.body || 'adult') === 'adult').map(C => C.clip).sort()); assert.equal(ADULT_CLIPS.length, 50);
  assert.deepEqual((await shards()).flat().sort(), [...ADULT_CLIPS].sort());
  for (let i = 2; i <= SHARDS; i++) assert.match(fs.readFileSync(new URL(`./stick-hair-body-${i}.test.mjs`, import.meta.url), 'utf8'), new RegExp(`bodyShard\\(${i - 1}\\)`));
});
test('the table holds a hair row for every shipped style and adult clip, and no other', async () => {
  const { default: T } = await import('../../styles/stick-man/kit/compat.json', { with: { type: 'json' } }), { pair } = await import('../../styles/stick-man/kit/cast/compat.js');
  const want = HAIR_STYLES.flatMap(s => ADULT_CLIPS.map(c => pair('hair', s, c))).sort(), have = T.rows.filter(r => r.kind === 'hair').map(r => r.pair).sort();
  assert.deepEqual(have, want);
});
test('a hair row over the limit cannot be pass (fits.mjs tableFaults)', async () => {
  const { tableFaults, limitsSha, HAIR_IN_MM: L } = await import('../../styles/stick-man/tools/gates/fits.mjs'); assert.equal(L, HAIR_IN_MM);
  const f = tableFaults({ limits: limitsSha(), rows: [{ pair: 'hair|buzz|Act_PistolShoot_Once', kind: 'hair', verdict: 'pass', number: 16.8, unit: 'mm', bad: 0 }] });
  assert.equal(f.length, 1);
});
await bodyShard(0);
