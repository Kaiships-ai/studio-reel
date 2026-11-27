// Sculpted toon hair (kit/cast/hair.js): every style builds, sits on the head (its hairline reaches the forehead's front, so a
// low front camera sees it), and is rigid to the head through the clips that swing a head the most (no follow-through:
// the hair keeps its place in the head's own frame on every frame).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL } from '../../styles/stick-man/motion-lib/index.js';
import { rigClip, rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

await rigStick();
const { GUARD, W_M, HEAD_H } = await import('../../styles/stick-man/engine/cast.js');
const { toonHair, HAIR_STYLES, HAIR_DRAFTS } = await import('../../styles/stick-man/kit/cast/hair.js');
const HAIR_MM = 0.01;

test('every style builds one closed scalp (and its buns), on the head', () => {
  assert.deepEqual(HAIR_STYLES.slice(0, 6), ['side', 'crop', 'curly', 'elder', 'woman', 'girl']);
  // the shipped set, pinned (Studio 27/11): the short styles that pass every hair check; the long ones are drafts until the long-hair work
  assert.deepEqual(HAIR_STYLES, ['side', 'crop', 'curly', 'elder', 'woman', 'girl', 'pompadour', 'buzz', 'afro', 'pixie', 'ponytail']);
  assert.deepEqual(HAIR_DRAFTS, ['bob', 'long', 'braids', 'lob', 'mullet']);
  for (const s of HAIR_STYLES) {
    const g = toonHair(s, [0.3, 0.2, 0.1])(), meshes = g.children.filter(o => o.isMesh);
    if (HAIR_STYLES.indexOf(s) < 6) assert.equal(meshes.length, { woman: 2, girl: 3 }[s] ?? 1, s); else assert.ok(meshes.length >= 1, s);
    const P = meshes[0].geometry.attributes.position; let top = 0, front = -1, out = 0;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), e = Math.hypot(x / (0.5 * W_M), y / (0.5 * HEAD_H * W_M), z / (0.5 * W_M));
      top = Math.max(top, y); out = Math.max(out, e);
      if (e > (s === 'buzz' ? 1.005 : 1.02) && Math.abs(x) < 0.05 && z > 0) front = Math.max(front, z);   // hair standing off the head in front (vertices are in the head-centre frame: the group undoes HAT_LIFT)
    }
    // the buzz cut is a thin shell by design: it stands just off the head, never a cap's height; the afro is a ball wider than the head
    if (s === 'buzz') assert.ok(out > 1.01 && out < 1.06, `buzz: stands ${out.toFixed(3)} of the head out`); else assert.ok(out > 1.03 && out < (s === 'afro' ? 2.0 : 1.6), `${s}: hair stands ${out.toFixed(2)} of the head out`);
    assert.ok(front > (s === 'buzz' ? 0.095 : 0.10), `${s}: no hair over the forehead (front ${front.toFixed(3)} m)`);
    if (s !== 'elder') assert.ok(top > 0.5 * HEAD_H * W_M, `${s}: hair below the crown`);   // the elder's crown is bald
  }
  assert.throws(() => toonHair('no-such-style'), /no style/);
});
test('a bare toonHair of a draft throws; the opt-in builds it', () => {
  for (const s of HAIR_DRAFTS) { assert.throws(() => toonHair(s), /is a draft/, s); assert.equal(typeof toonHair(s, null, { draft: true }), 'function', s); }
});
test('a draft style is refused by person(): the film\'s way in', async () => {
  const { person } = await import('../../styles/stick-man/kit/film.js');
  for (const s of HAIR_DRAFTS) assert.throws(() => person({ name: 'Ann', hair: [toonHair(s, null, { draft: true })] }), /not offered yet/, s);
});
// only the makers toonHair returned for a shipped style with no patch reach a film: what the hair table measured
test('person() refuses a patched toon hair', async () => {
  const { person } = await import('../../styles/stick-man/kit/film.js');
  assert.throws(() => person({ name: 'Pat', hair: [toonHair('side', null, { falls: [] })] }), /as shipped/);
});
test('person() refuses a wrapped toon hair maker', async () => {
  const { person } = await import('../../styles/stick-man/kit/film.js');
  assert.throws(() => person({ name: 'Wes', hair: [() => toonHair('afro')()] }), /as shipped/);
});
test('person() refuses a draft with a forged shipped tag', async () => {
  const { person } = await import('../../styles/stick-man/kit/film.js');
  assert.throws(() => person({ name: 'Fay', hair: [Object.assign(toonHair('bob', null, { draft: true }), { hairStyle: 'side' })] }), /as shipped/);
});
test('person() takes a shipped toon hair as made, and the kit\'s other hair', async () => {
  const { person, hairCap } = await import('../../styles/stick-man/kit/film.js');
  assert.ok(person({ name: 'Sid', hair: [toonHair('side')] })); assert.ok(person({ name: 'Cal', hair: [hairCap([0.1, 0.1, 0.1])] }));
});

const corners = (a, b) => [0, 1, 2, 3, 4, 5, 6, 7].map(n => a.clone().set(n & 1 ? b.x : a.x, n & 2 ? b.y : a.y, n & 4 ? b.z : a.z));
for (const s of HAIR_STYLES) test(`${s}: rigid to the head through a look up and a jump`, async () => {
  const was = GUARD.hair.slice(); GUARD.hair.splice(0, was.length, toonHair(s));
  try {
    for (const name of ['Gest_LookUp_Once', 'Adult_Act_Jump_Once']) {
      const C = ALL.find(c => c.name === name), at = {}; let worst = 0, meshes = 0;
      await rigClip({ ...C, needs: { ...C.needs, cap: true } }, C.body || 'adult', { each: (f, S) => {
        const head = S.parts.head.parent; head.updateMatrixWorld(true); let i = 0;
        assert.equal(S.parts.hair.matrixAutoUpdate, false);
        S.parts.hair.traverse(o => {
          if (!o.isMesh) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const k = i++;
          corners(o.geometry.boundingBox.min, o.geometry.boundingBox.max).forEach((c, j) => {
            const w = o.localToWorld(c), key = `${k}.${j}`; at[key] ||= head.worldToLocal(w.clone());
            worst = Math.max(worst, 1000 * w.distanceTo(head.localToWorld(at[key].clone())));
          });
        });
        meshes = i;
      } });
      assert.ok(meshes > 0, `${s} ${name}: no hair on the figure`);
      assert.ok(worst < HAIR_MM, `${s} ${name}: hair moved ${worst.toFixed(3)} mm in the head's frame`);
    }
  } finally { GUARD.hair.splice(0, GUARD.hair.length, ...was); }
});
