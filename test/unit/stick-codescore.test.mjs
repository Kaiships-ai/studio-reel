// tier: heavy
// The stick-man appearance path's codebase scorecard (styles/stick-man/tools/run/codescore.mjs) is no worse at this head than
// the card recorded in test/golden/codescore.json. The control adds a fifth hand-kept garment list in a copy of the kit and
// must read as worse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CARD, ROOT, SCORES, garmentLists, measure, worse } from '../../styles/stick-man/tools/run/codescore.mjs';

const recorded = JSON.parse(readFileSync(CARD, 'utf8'));

test('no score is worse than the recorded card', async () => {
  const { card } = await measure(ROOT);
  for (const k of Object.keys(SCORES)) assert.equal(typeof card[k], 'number', `${k} is measured`);
  assert.deepEqual(worse(recorded.card, card), []);
});

test('control: a fifth hand-kept garment list reads as worse', t => {
  const tmp = mkdtempSync(join(tmpdir(), 'codescore-')); t.after(() => rmSync(tmp, { recursive: true, force: true }));
  cpSync(join(ROOT, 'styles/stick-man/kit'), join(tmp, 'styles/stick-man/kit'), { recursive: true });
  writeFileSync(join(tmp, 'styles/stick-man/kit/cast/pockets.js'), "export const POCKETS = ['coat', 'jacket', 'apron'];\n");
  const n = garmentLists(tmp).length;
  assert.equal(n, recorded.card.garmentLists + 1);
  assert.deepEqual(worse(recorded.card, { garmentLists: n }).length, 1);
});

test('a better score passes and a worse one in either direction fails', () => {
  assert.deepEqual(worse({ specsJsonSafe: 0, longestCastFn: 573 }, { specsJsonSafe: 17, longestCastFn: 120 }), []);
  assert.equal(worse({ specsJsonSafe: 3 }, { specsJsonSafe: 2 }).length, 1);
});
