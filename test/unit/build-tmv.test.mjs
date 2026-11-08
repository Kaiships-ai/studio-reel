// The tmv zip is Starter minus [tmv_exclude]; a `!glob` line keeps files an earlier glob left out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, tmvFiles } from '../../release/build.mjs';

test('a !glob line in [tmv_exclude] keeps those files of an excluded folder, and only those', () => {
  const m = parseManifest('[tmv_exclude]\nstyles/house/\n!styles/house/engine/keep.js\n');
  const starter = ['core/a.mjs', 'styles/house/engine/keep.js', 'styles/house/engine/other.js', 'styles/house/STYLE.md'];
  const blobs = new Map(starter.map(f => [f, Buffer.from(f)]));
  assert.deepEqual(tmvFiles({ starter }, [], m, blobs).list, ['core/a.mjs', 'styles/house/engine/keep.js']);
});
