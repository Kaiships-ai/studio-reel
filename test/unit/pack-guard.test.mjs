// The stick-man pack never edits styles/stick-man (release/pack-guard.mjs): unit cases, and this branch's own diff
// against main when a main ref is there, so `node --test test/unit/*.test.mjs` enforces it without Actions too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { packGuard } from '../../release/pack-guard.mjs';

test('a pack change with a styles/stick-man file fails and names it', () => {
  assert.deepEqual(packGuard(['packs/stick-man/START-stick-man.md', 'styles/stick-man/engine/play.js', 'kit.manifest']), ['styles/stick-man/engine/play.js']);
  assert.deepEqual(packGuard(['release/stickpack.mjs', 'styles/stick-man/motion-lib/body/adult/Adult_Move_Walk_Fwd_Loop_v01.js']), ['styles/stick-man/motion-lib/body/adult/Adult_Move_Walk_Fwd_Loop_v01.js']);
});
test('a pack change alone, or a kit change alone, passes', () => {
  assert.deepEqual(packGuard(['packs/stick-man/x.js', 'release/build.mjs', 'kit.manifest']), []);
  assert.deepEqual(packGuard(['styles/stick-man/engine/play.js', 'test/unit/stick-motion.test.mjs']), []);
});
test("this branch's diff against main keeps the rule", () => {
  const git = a => spawnSync('git', a, { encoding: 'utf8' });
  const base = ['origin/main', 'main'].find(r => git(['rev-parse', '--verify', '-q', r]).status === 0);
  if (!base) return;
  const diff = git(['diff', '--name-only', `${base}...HEAD`]);
  if (diff.status !== 0) return;
  assert.deepEqual(packGuard(diff.stdout.split('\n')), []);
});
