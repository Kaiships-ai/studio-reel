// A neck-bound length never opens a seam from the crown (Studio 27/11: the long styles' lengths are bound to the neck and the upper back,
// the crown to the head; where the two meet the lengths' tops must stay on the crown's drawn surface as the head moves).
//   SEAM_MM  written before the first measure and never raised: the furthest, mm, a bound lock's top the crown covered at rest
//            may stand from the crown's drawn surface, against its distance at rest (test/unit/hair-seam.mjs).
// The branch is covered through a draft style with neck: true ('long': no shipped style is neck-bound, the draft is the long-hair work).
import test from 'node:test';
import assert from 'node:assert/strict';
const { seam, SEAM_MM } = await import('./hair-seam.mjs');
const CLIP = ['Adult_Gest_NodYes_Once', 'Gest_LookUp_Once'];
const worst = r => Math.max(...Object.values(r).map(x => x.mm));

test('the limit is the one written before anything was measured', () => { assert.equal(SEAM_MM, 5); });

test('long, bound to the neck: no seam wider than the limit', async () => {
  const r = await seam('long', CLIP);
  assert.ok(worst(r) <= SEAM_MM, `seam ${worst(r).toFixed(1)} mm`);
});

// the control: the same lengths bound to the neck all the way up (the blend's top pushed far above the crown: no crown stays on the head) open the seam at once
test('control: a lock bound off the head opens past the limit', async () => {
  const { toonHair } = await import('../../styles/stick-man/kit/cast/hair.js'), { W_M } = await import('../../styles/stick-man/engine/cast.js');
  const build = () => { const g = toonHair('long', null, { neck: true, cut: null, draft: true })(); g.traverse(o => { if (o.userData.neckBound) Object.assign(o.userData, { neckTop: 3 * W_M, neckRamp: 0.01 * W_M }); }); return g; };
  const r = await seam('long', CLIP, undefined, build);
  assert.ok(worst(r) > SEAM_MM, `the control seam measured ${worst(r).toFixed(1)} mm`);
});
