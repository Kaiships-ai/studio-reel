// The kit face catalogue (styles/stick-man/tools/series/kitfaces): its document is generated from the code, and every
// face in it has an emotion family facebeat can judge it by.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { catalogue } from '../../styles/stick-man/tools/series/kitfaces/catalogue.mjs';

test('CATALOGUE.md is the catalogue the code holds (run catalogue.mjs after changing a face)', async () => {
  const doc = fs.readFileSync(new URL('../../styles/stick-man/tools/series/kitfaces/CATALOGUE.md', import.meta.url), 'utf8');
  assert.equal(doc, await catalogue());
});

test('every catalogue face has a family, so facebeat judges it against the story', async () => {
  const rows = (await catalogue()).split('\n').filter(l => l.startsWith('| `'));
  assert.ok(rows.length >= 59);
  const bare = rows.filter(l => l.trim().endsWith('|  |')).map(l => l.split('|')[1].trim());
  assert.deepEqual(bare, [], 'faces with no family');
});
