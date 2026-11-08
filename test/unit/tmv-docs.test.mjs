// The tmv quickstart (tmv/README.md, tmv/START.md) keeps the Product division's guide rules (kit truth/to-chuc.html, G4):
// a "you did it" step, fixes for the three common problems, and where to ask (Discord + email).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';

const readme = readFileSync(join(ROOT, 'tmv', 'README.md'), 'utf8'), start = readFileSync(join(ROOT, 'tmv', 'START.md'), 'utf8');

test('tmv quickstart ends in a "you did it" step that names the files the buyer can open', () => {
  assert.match(readme, /\*\*You did it\*\*[^\n]*`episodes\/sample\/sample\.mp4`/);
  assert.match(start, /\*\*you did it\*\*/i);
  assert.match(start, /episodes\/ep1\/ep1\.mp4/);
});

test('tmv quickstart has fixes for at least three common problems, and says where to ask', () => {
  // only the table right under the heading: it ends at the first line that is not a table row
  const after = (readme.split('**If something goes wrong**')[1] ?? '').split('\n').slice(1).join('\n').trimStart().split('\n');
  const end = after.findIndex(l => !l.startsWith('|'));
  const rows = after.slice(0, end < 0 ? after.length : end).filter(l => /^\| [^-|]/.test(l) && !/^\| You see/.test(l));
  assert.ok(rows.length >= 3, `only ${rows.length} problem rows`);
  for (const doc of [readme, start]) { assert.match(doc, /Discord/); assert.match(doc, /kaiships\.ai@gmail\.com/); }
});
