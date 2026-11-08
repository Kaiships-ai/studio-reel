// Actions minutes are a monthly budget on a private repo (macOS x10, Windows x2). Kai: "not every PR runs the
// install tests". These checks fail when a workflow change would spend minutes on every PR again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { installNeeded } from '../../release/install-needed.mjs';
import { parseManifest } from '../../release/build.mjs';

const WF = join(ROOT, '.github', 'workflows');
const read = f => readFileSync(join(WF, f), 'utf8');
const section = (y, key) => (y.match(new RegExp(`^  ${key}:\\n((?:    .*\\n|\\s*\\n)*)`, 'm')) || [])[1] || '';

test('install.yml: PRs are path-filtered, no branch pushes, five machines only when FULL', () => {
  const y = read('install.yml');
  assert.match(section(y, 'pull_request'), /paths:/, 'install.yml pull_request needs a paths: filter');
  assert.doesNotMatch(section(y, 'push'), /branches:/, 'install.yml must not run on branch pushes (tags only)');
  assert.match(y, /cancel-in-progress: true/);
  for (const line of y.split('\n').filter(l => /windows-|macos-/.test(l) && /m=/.test(l)))
    assert.match(line, /\$FULL" = true/, `windows/macOS added to the matrix outside the FULL branch: ${line.trim()}`);
});

test('only checks.yml runs on every PR, and only on Linux', () => {
  for (const f of readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) {
    const y = read(f), pr = section(y.replace(/^on:\n/m, ''), 'pull_request');
    if (!/^\s*pull_request:/m.test(y) || /paths:/.test(pr)) continue;
    assert.equal(f, 'checks.yml', `${f} runs on every PR: add a paths: filter or move the job into checks.yml`);
    assert.doesNotMatch(y, /runs-on:.*(windows|macos)/, 'checks.yml must stay on Linux');
  }
});

test('install test: a new [dev] manifest entry skips it, moving a shipped file in or out of a zip runs it', () => {
  const files = ['core/x.js', 'styles/a/STYLE.md', 'styles/a/b.js'];
  const m = t => parseManifest(t);
  const base = m('[dev]\n[starter]\ncore/\nstyles/\n');
  assert.equal(installNeeded(['kit.manifest', 'styles/new3d/x.js'], files, base, m('[dev]\nstyles/new3d/\n[starter]\ncore/\nstyles/\n')), false);
  assert.equal(installNeeded(['kit.manifest'], files, base, m('[dev]\nstyles/a/b.js\n[starter]\ncore/\nstyles/\n')), true);
  assert.equal(installNeeded(['styles/a/STYLE.md'], files, base, base), false);
  assert.equal(installNeeded(['kit/env.mjs'], files, base, base), true);
  assert.equal(installNeeded(['tmv/episode/make.mjs'], files, base, base), true, 'the tmv zip is on the install path');
  assert.equal(installNeeded(['tmv/README.md'], files, base, base), false, 'tmv docs do not run the install test');
});
