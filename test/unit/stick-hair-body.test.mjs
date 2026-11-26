// A rigid hair never goes into the body it sits on (Studio 26/11: hair is rigid to the head, so a long style cuts into the shoulders
// and the chest as the head turns or bends). Every toon style is played through the clips the kit uses that move a head the most against the body (test/unit/hair-measure.mjs CLIPS) in the
// coral sweater, and its drawn surface measured against the torso shell and the limbs as drawn on every frame.
//   HAIR_IN_MM  written 26/11 before any style was measured, and never raised: the depth of the hair's surface inside the body's,
//               mm. As ARM_IN in wardrobe-measure.mjs: under the ink line's own width (2.4 px at 720 wide, ~590 px a metre) the
//               body's edge still reads whole where the hair lies on it; deeper, the hair is seen to cut in. A style that fails is
//               shortened (kit/cast/hair.js) until it passes, never this.
// Every style, not only those past the chin: a chin bob meets the shoulder too, as the head bows to the floor (17.4 mm, 26/11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

await rigStick();
const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js');
const { sweep, CLIPS, HAIR_IN_MM, NEAR_W } = await import('./hair-measure.mjs');   // the limits as the measure itself uses them

test('the limit is the one written before anything was measured', () => { assert.equal(HAIR_IN_MM, 4); assert.equal(NEAR_W, 0.10); assert.equal(CLIPS.length, 10); });

// the control: a lock hung from the nape straight down the back through the shoulders must fail, or the measure sees nothing
test('control: a lock hung through the back fails', async () => {
  const THREE = await import('three'), { solid, W_M, HAT_LIFT } = await import('../../styles/stick-man/engine/cast.js');
  const make = () => { const g = new THREE.Group(); g.position.y = -HAT_LIFT; g.userData.hairControl = true; const m = solid(new THREE.CylinderGeometry(0.12 * W_M, 0.12 * W_M, 1.0 * W_M, 8, 3).translate(0, -0.9 * W_M, -0.25 * W_M), new THREE.MeshBasicMaterial()); g.add(m); return g; };
  const r = await sweep(make, ['Adult_Gest_NodYes_Once'], undefined, { from: 8, to: 12 });   // the nod's few frames: the lock is in the back on each
  assert.ok(r.Adult_Gest_NodYes_Once.mm > 20, `the control lock measured ${r.Adult_Gest_NodYes_Once.mm.toFixed(1)} mm in`);
});

const { GROUPS, bodyGroup } = await import('./hair-body-group.mjs');   // group 1 is here, 2-4 in stick-hair-body-N.test.mjs (run side by side)
test('the four groups are every shipped style, once', () => assert.deepEqual(GROUPS.flat().sort(), [...HAIR_STYLES].sort()));
await bodyGroup(0);
