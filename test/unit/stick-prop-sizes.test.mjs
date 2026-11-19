// The kit's own hand props are the sizes of the real things they name (lib/props/sizes.js REAL_SIZE), measured as the
// shot gate measures a tracked prop (engine/solids.js drawnBox: the drawn mesh, ink hull left out). A kit prop a film
// carries by its kind name would otherwise block that film as "prop out of scale" (shotfaults.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BUILD } from '../../styles/stick-man/lib/cast/handprops.js';
import '../../styles/stick-man/motion-lib/props.js';
import { kindOf, scaleFault } from '../../styles/stick-man/lib/props/sizes.js';
import { drawnBox } from '../../styles/stick-man/engine/solids.js';

test('prop sizes: every kit hand prop whose name is a kind is inside that kind\'s real size', () => {
  const kinded = Object.keys(BUILD).filter(kindOf);
  assert.ok(['cup', 'phone', 'torch', 'hotdog', 'pistol'].every(k => kinded.includes(k)), kinded.join(', '));
  const out = kinded.map(k => { const g = BUILD[k](); g.updateMatrixWorld(true); const v = drawnBox(g).getSize(new THREE.Vector3());
    return { k, size: +Math.max(v.x, v.y, v.z).toFixed(3), fault: scaleFault(k, Math.max(v.x, v.y, v.z)) }; });
  assert.deepEqual(out.filter(x => x.fault), [], JSON.stringify(out));
});
