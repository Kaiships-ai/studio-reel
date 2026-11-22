import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { exposureWarnings, EXP_MAX } from '../../styles/stick-man/kit/look/exposure.js';

test('an act graded over the exposure limit warns; one lit by its lights does not', () => {
  assert.equal(EXP_MAX, 1.5);
  assert.deepEqual(exposureWarnings({ name: 'lit', grade: { exp: 1.4 } }), []);
  assert.deepEqual(exposureWarnings({ name: 'none' }), []);
  assert.match(exposureWarnings({ set: 'r5chase', grade: { exp: 2 } })[0], /^\[kit\] r5chase: /, 'an act without a name is labelled by its set');
  const [w] = exposureWarnings({ name: 'r5chase', grade: { exp: 2.2 } });
  assert.match(w, /^\[kit\] r5chase: grade\.exp 2\.2 > 1\.5/);
  assert.match(w, /lights/);
});

test('the engine runs the warning on every act it builds', () => {
  const play = fs.readFileSync(new URL('../../styles/stick-man/engine/play.js', import.meta.url), 'utf8');
  assert.match(play, /import \{ exposureWarnings \} from '#kit\/look\/exposure\.js'/);
  assert.match(play, /exposureWarnings\(R\)/);
  const shot = fs.readFileSync(new URL('../../styles/stick-man/tools/render/shot.mjs', import.meta.url), 'utf8');
  assert.match(shot, /m\.type\(\) === 'warning' && m\.text\(\)\.startsWith\('\[kit\]'\)/, 'shot.mjs prints the [kit] warnings');
});
