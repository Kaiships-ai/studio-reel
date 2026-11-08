#!/usr/bin/env node
// Dev-only typecheck of core/, kit/ and release/ (plain JS + JSDoc, tsconfig.json here). TypeScript lives in this
// folder's own package.json, never the root one: buyers' `npm ci` must not download it.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const want = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).devDependencies.typescript;
const have = join(here, 'node_modules/typescript/package.json');
if (!existsSync(have) || JSON.parse(readFileSync(have, 'utf8')).version !== want) {
  const r = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: here, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const r = spawnSync(process.execPath, [join(here, 'node_modules/typescript/bin/tsc'), '-p', join(here, 'tsconfig.json')], { stdio: 'inherit' });
process.exit(r.status ?? 1);
