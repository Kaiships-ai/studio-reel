// Hair and hats are rigid to the head (Kai 20/11, Hot Money ep01 r5: "Em dừng ngay kiểu đó đi", a teller's cap that
// swung after her nods). Every hair and hat mesh keeps its place in the head's own frame on every frame of the clips
// that swung it furthest (a look up, a jump), through the real rig.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL } from '../../styles/stick-man/motion-lib/index.js';
import { rigClip } from '../../styles/stick-man/tools/motionlib.mjs';

const HAIR_MM = 0.01;
const corners = (a, b) => [0, 1, 2, 3, 4, 5, 6, 7].map(n => a.clone().set(n & 1 ? b.x : a.x, n & 2 ? b.y : a.y, n & 4 ? b.z : a.z));

async function hairDrift(name) {
  const C = ALL.find(c => c.name === name), at = {};
  let worst = 0, meshes = 0;
  await rigClip({ ...C, needs: { ...C.needs, cap: true } }, C.body || 'adult', { each: (f, S) => {
    const head = S.parts.head.parent; head.updateMatrixWorld(true);
    let i = 0;
    S.parts.hair.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const { min, max } = o.geometry.boundingBox, k = i++;
      corners(min, max).forEach((c, j) => {
        const w = o.localToWorld(c), key = `${k}.${j}`;
        at[key] ||= head.worldToLocal(w.clone());
        worst = Math.max(worst, 1000 * w.distanceTo(head.localToWorld(at[key].clone())));
      });
    });
    meshes = i;
  } });
  return { worst, meshes };
}

for (const name of ['Gest_LookUp_Once', 'Adult_Act_Jump_Once', 'Act_PushBagOutWindow_Once']) {
  test(`${name}: the cap stays where it sits on the head on every frame`, async () => {
    const { worst, meshes } = await hairDrift(name);
    assert.ok(meshes > 0, 'the figure wears a cap');
    assert.ok(worst < HAIR_MM, `cap moved ${worst.toFixed(2)} mm in the head's frame (max ${HAIR_MM})`);
  });
}
