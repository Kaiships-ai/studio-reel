// A change to what a reel does has to update the verify feature map, or the map rots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { uncovered } from '../../.claude/skills/verify/check-coverage.mjs';

test('core, engine, tools, kit or the designer changed with no feature file: named', () => {
  const paths = ['core/render/reelcheck.mjs', 'core/job.mjs', 'kit/env.mjs', 'styles/kai-hand-draw/engine/reel.js', 'character-designer.html', '.claude/skills/verify/features/README.md'];
  assert.deepEqual(uncovered(paths), paths.slice(0, 5));
});

test('a feature file changed, or nothing covered changed: passes', () => {
  assert.deepEqual(uncovered(['core/job.mjs', '.claude/skills/verify/features/job-json.md']), []);
  assert.deepEqual(uncovered(['README.md', 'styles/ukiyoe/STYLE.md', 'core/README.md']), []);
});
