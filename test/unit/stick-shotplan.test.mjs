// The stick-man auto shot planner (styles/stick-man/engine/shotplan.js): roles pick shot kinds, no kind repeats line to
// line, small-figure shots hand over within 40 frames, a macro waits for its thing, the reel's own shots win.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planShots, inferRole, SMALL } from '../../styles/stick-man/engine/shotplan.js';

const act = { name: '0', start: 0, actors: ['wren', 'bram'], beatsBy: { bram: 3, wren: 1 } };
const line = (id, a, b, extra = {}) => ({ id, a, b, key: null, text: '', entry: {}, things: [], explicit: [], act, ...extra });
const kinds = out => out['0'].map(s => s.shot);

test('roles: first line is a hook, last a payoff, numbers and twists are seen', () => {
  assert.equal(inferRole({}, 0, 5, 'The hottest day'), 'hook');
  assert.equal(inferRole({}, 4, 5, 'Then Bram cooks'), 'payoff');
  assert.equal(inferRole({}, 2, 5, 'six degrees hotter'), 'number');
  assert.equal(inferRole({}, 2, 5, "But in nineteen eighty"), 'twist');
  assert.equal(inferRole({ role: 'reaction' }, 2, 5, 'anything'), 'reaction');
});

test('a hook opens on an aerial / est that hands over within 40 frames', () => {
  const out = planShots([line('l01', 0, 140)]), s = out['0'];
  assert.ok(['aerial', 'est'].includes(s[0].shot));
  assert.equal(s[0].f, 0);
  assert.ok(s[1].f - s[0].f <= 40 && !SMALL.has(s[1].shot));
});

test('no line repeats the kind the line before ended on, and no framing holds over maxSeg (84 f): irregular holds, not a 1 s grid (FORENSIC.md fix 3)', () => {
  const L = [line('l01', 0, 100), line('l02', 100, 200), line('l03', 200, 300), line('l04', 300, 400)];
  const out = planShots(L), s = out['0'];
  for (let i = 1; i < s.length; i++) assert.notEqual(s[i].shot, s[i - 1].shot, `shots ${i - 1}-${i}`);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].f - s[i - 1].f <= 84, `gap before shot ${i}`);
  assert.ok(new Set(kinds(out)).size >= 4);
});

test('a number line puts a macro on its stamp when the stamp pops, a lead shot before it', () => {
  const things = [{ name: 'plus6', kind: 'stamp', beats: [60], size: 0.8 }, { name: 'heat', kind: 'shimmer', beats: [10] }];
  const out = planShots([line('l00', 0, 10), line('l03', 10, 120, { entry: { role: 'number' }, things, key: 40 })]);
  const m = out['0'].find(s => s.shot === 'macro');
  assert.deepEqual(m.of, ['plus6']);
  assert.equal(m.f, 54);
  assert.equal(m.dof, 0);                                      // a stamp is drawn on top: no blur band
});

test('the reel data shoots a line itself: the planner leaves it alone', () => {
  const out = planShots([line('l01', 0, 100, { explicit: ['two'] }), line('l02', 100, 160)]);
  assert.ok(out['0'].every(s => s.f >= 97));
  assert.notEqual(out['0'][0].shot, 'two');
});
