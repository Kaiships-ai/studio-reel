// The pre-push hook must run what checks.yml runs, or a green push can still be a red PR.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { classify, parseManifest } from '../../release/build.mjs';

const HOOK = '.githooks/pre-push';
const hook = readFileSync(join(ROOT, HOOK), 'utf8');
const ci = readFileSync(join(ROOT, '.github/workflows/checks.yml'), 'utf8');
const ciRuns = [...ci.matchAll(/^\s+run: (.+)$/gm)].map(m => m[1]);
const hookCommands = [...hook.matchAll(/^  \w+: '(node [^']+)',$/gm)].map(m => m[1]);

test('the pre-push hook exists and is executable', () => {
  assert.ok(statSync(join(ROOT, HOOK)).mode & 0o111, `${HOOK} must be executable`);
  assert.match(hook, /^#!\/usr\/bin\/env node\n/);
});

test('the hook files are dev-only, never in a zip', () => {
  const { by } = classify([HOOK], parseManifest(readFileSync(join(ROOT, 'kit.manifest'), 'utf8')));
  assert.deepEqual(by.dev ?? [], [HOOK]);
});

test('the hook runs the same commands as checks.yml', () => {
  assert.equal(hookCommands.length, 3, 'unit, release and coverage');
  for (const cmd of hookCommands)
    assert.ok(ciRuns.some(r => r.includes(cmd)), `checks.yml has no step running "${cmd}"`);
});
