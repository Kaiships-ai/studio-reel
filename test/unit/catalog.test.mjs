// /studio matches a buyer's idea to styles by reading styles/catalog.md, so a style missing from it is never offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';

test('styles/catalog.md lists exactly the styles that have a showcase.jpg (rerun tools/readme_gallery.py)', () => {
  const showcased = readdirSync(join(ROOT, 'styles')).filter(s => existsSync(join(ROOT, 'styles', s, 'showcase.jpg'))).sort();
  const listed = [...readFileSync(join(ROOT, 'styles/catalog.md'), 'utf8').matchAll(/^\| `([^`]+)` \|/gm)].map(m => m[1]).sort();
  assert.deepEqual(listed, showcased);
});

test('every content type /studio can propose has its file', () => {
  const index = readFileSync(join(ROOT, 'content-types/README.md'), 'utf8');
  const named = [...index.matchAll(/\]\(([a-z-]+)\.md\)/g)].map(m => m[1]);
  assert.ok(named.length >= 4, 'content-types/README.md links its types');
  for (const t of named) assert.ok(existsSync(join(ROOT, 'content-types', `${t}.md`)), `content-types/${t}.md exists`);
});
