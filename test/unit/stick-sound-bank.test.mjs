// The reel page keeps its own list of sound names (engine/play.js BANK) and drops any cue it does not know; the sounds
// themselves live in tools/sound_bank.py. A sound added to one and not the other is silently lost (rail-gaps, 11/11:
// eight new railroad sounds were cut from the cue list), so the two lists must match.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';

test('engine/play.js BANK names = tools/sound_bank.py BANK names', () => {
  const js = readFileSync(join(ROOT, 'styles/stick-man/engine/play.js'), 'utf8');
  const page = new Set([...js.match(/const BANK = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]));
  const py = readFileSync(join(ROOT, 'styles/stick-man/tools/sound_bank.py'), 'utf8');
  const tuple = py.match(/BANK = \{f\.__name__: f for f in \(([\s\S]*?)\)\}/)[1];
  const bank = new Set(tuple.split(/[,\s]+/).filter(Boolean));
  // aliases (BANK['step'] = step_l) are renamed by the page before its check, so they are not page names
  assert.deepEqual([...page].filter(n => !bank.has(n)).sort(), [], 'page names with no sound');
  assert.deepEqual([...bank].filter(n => !page.has(n)).sort(), [], 'sounds the page drops');
});
