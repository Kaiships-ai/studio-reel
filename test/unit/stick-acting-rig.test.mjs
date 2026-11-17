// Faces against the story (tools/facebeat.mjs) and the rig test (tools/rigtest.mjs): QA areas M7 and A2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { familyOf, story, faceRuns, judge, HOLD, REPEAT_MAX } from '../../styles/stick-man/tools/facebeat.mjs';
import { measure, measureAll, knownFails, RIG_KNOWN, HEAD_PCT } from '../../styles/stick-man/tools/rigtest.mjs';
import { ALL } from '../../styles/stick-man/motion-lib/index.js';

// a film with three shots: a cop searching doors (beat: the hunt), you lifting bags (effort), you seeing the light (fear)
function film() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facebeat-'));
  fs.mkdirSync(path.join(dir, 'review'));
  fs.writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({
    shots: [{ id: 'SH140', f0: 0 }, { id: 'SH150' }, { id: 'SH160' }],
    lines: [{ id: 'L1', shots: ['SH140'], act: 'search@doors' }, { id: 'L2', shots: ['SH150'] }, { id: 'L3', shots: ['SH160'] }],
    scenes: [{ beats: [{ id: 'B1', lines: ['L1'], feel: 'the search walks door to door' }, { id: 'B2', lines: ['L2'], feel: 'the weight of 25 kg' },
      { id: 'B3', lines: ['L3'], feel: 'dread: the light finds you' }] }] }));
  fs.writeFileSync(path.join(dir, 'review/acting.json'), JSON.stringify({ SH140: { who: 'thin cop', change: 'searching doors → the hunt has a place' } }));
  fs.writeFileSync(path.join(dir, 'reel.js'), 'export const CUTS = [0, 40, 80, 120];\n');
  return dir;
}
// rows f0..f1 with each actor's face on a readable head (12 % of a 1920 frame)
const rows = (f0, f1, cast) => Array.from({ length: f1 - f0 + 1 }, (_, i) => ({ f: f0 + i,
  actors: Object.fromEntries(Object.entries(cast).map(([who, expr]) => [who, { expr, inFrame: true, head: [400, 400, 640, 630] }])) }));

test('a face is judged by its family: kit faces and film twins (y_fear) alike', () => {
  assert.equal(familyOf('smug'), 'smug');
  assert.equal(familyOf('y_fear'), 'fear');
  assert.equal(familyOf('y_deadpan'), 'neutral');
  assert.equal(familyOf('whatever'), null);
});

test('Kai 16/11 S3-041..043: a smug, surprised or angry cop in a door-search beat is off the beat; a neutral one is not', () => {
  const S = story(film());
  for (const [expr, off] of [['smug', true], ['shock', true], ['angry', true], ['suspicious', false], ['y_deadpan', false]]) {
    const J = judge(faceRuns(rows(0, 39, { cop: expr }), S, 1920), S);
    assert.equal(J.mismatch.length, off ? 1 : 0, expr);
    if (off) assert.deepEqual([J.mismatch[0].shot, J.mismatch[0].t0, J.mismatch[0].beat], ['SH140', 0, 'B1']);
  }
});

test('a face the beat names passes: strain on the weight, fear on the dread', () => {
  const S = story(film());
  const J = judge(faceRuns([...rows(40, 79, { you: 'y_strain' }), ...rows(80, 119, { you: 'y_fear' })], S, 1920), S);
  assert.deepEqual(J.mismatch, []);
});

test('a face held under HOLD frames, or on a head too small to read, is not judged', () => {
  const S = story(film());
  assert.equal(judge(faceRuns(rows(0, HOLD - 2, { cop: 'smug' }), S, 1920), S).mismatch.length, 0);
  const tiny = rows(0, 39, { cop: 'smug' }).map(r => ({ ...r, actors: { cop: { ...r.actors.cop, head: [400, 400, 420, 430] } } }));
  assert.equal(judge(faceRuns(tiny, S, 1920), S).mismatch.length, 0);
});

test(`Kai 16/11 S3-053: one face in more than ${REPEAT_MAX} shots is over the repeat limit; neutral faces never count`, () => {
  const S = story(film());
  const J = judge(faceRuns([...rows(0, 39, { you: 'y_strain', cop: 'deadpan' }), ...rows(40, 79, { you: 'y_strain', cop: 'deadpan' }),
    ...rows(80, 119, { you: 'y_strain', cop: 'deadpan' })], S, 1920), S);
  assert.deepEqual(J.over.map(r => [r.who, r.expr, r.n]), [['you', 'y_strain', 3]]);
});

test('a re-timed picture maps onto the storyboard through sb, and reports its own second through t', () => {
  const S = story(film());
  const R = rows(500, 539, { cop: 'smug' }).map((r, i) => ({ ...r, sb: i, t: 20 + i / 30 }));
  const J = judge(faceRuns(R, S, 1920), S);
  assert.deepEqual([J.mismatch[0].shot, J.mismatch[0].t0], ['SH140', 20]);
});

test('the rig test: a standing idle keeps a round head and its bones; a jump squashes the head past the limit', async () => {
  const idle = await measure(ALL.find(c => c.name === 'Adult_Idle_Stand_Loop'));
  assert.ok(idle.head < 1 && idle.bone < 1, `idle head ${idle.head} %, bone ${idle.bone} %`);
  assert.deepEqual(idle.faults, []);
  const jump = await measure(ALL.find(c => c.name === 'Adult_Act_Jump_Once'));
  assert.ok(jump.head > HEAD_PCT, `jump head ${jump.head} %`);
});

test('RIG_KNOWN only shrinks: a fault it does not list fails, a listed clip that grows fails, a fixed one must be deleted', () => {
  const r = (over, faults = ['x']) => ({ name: 'Adult_Act_Jump_Once', over: { head: 0, bone: 0, flex: 0, ...over }, faults });
  assert.deepEqual(knownFails(r({ head: 8.3 }), RIG_KNOWN), []);
  assert.equal(knownFails(r({ head: 8.4 }), RIG_KNOWN).length, 1);
  assert.equal(knownFails(r({ bone: 0.5 }), RIG_KNOWN).length, 1);
  assert.equal(knownFails(r({}, []), RIG_KNOWN).length, 1);
  assert.equal(knownFails({ name: 'New_Clip', over: { head: 1, bone: 0, flex: 0 }, faults: ['head'] }, RIG_KNOWN).length, 1);
});

test('every library clip passes the rig test or is listed in RIG_KNOWN at its measured size', async () => {
  const rows = await measureAll();
  assert.equal(rows.length, ALL.length);
  assert.deepEqual(rows.flatMap(r => knownFails(r)), []);
});
