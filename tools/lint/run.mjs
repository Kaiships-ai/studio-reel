#!/usr/bin/env node
// Dev-only lint of core/, kit/, release/, test/ and tmv/episode/ (oxlint, correctness rules, config in this folder).
// oxlint lives in this folder's own package.json, never the root one: buyers' `npm ci` must not download it.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const want = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).devDependencies.oxlint;
const have = join(here, 'node_modules/oxlint/package.json');
if (!existsSync(have) || JSON.parse(readFileSync(have, 'utf8')).version !== want) {
  const r = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: here, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
// kit/check-reel/src are classic scripts that share globals across files, so a name "unused" in one file is used in another.
const args = ['-c', join(here, '.oxlintrc.json'), '--ignore-pattern', 'kit/check-reel/src/**', '--deny-warnings',
  'core', 'kit', 'release', 'test', 'tmv/episode'];
const r = spawnSync(join(here, 'node_modules/.bin/oxlint'), args, { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);
