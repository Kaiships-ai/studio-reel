import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { familyOf, story, faceRuns, judge, coverage, verdict, HOLD, REPEAT_MAX } from '../../styles/stick-man/tools/facebeat.mjs';
import { run } from '../../kit/env.mjs';
import { measure, measureAll, knownFails, headShape, HEAD_PCT, HEAD_SQUASH_PCT } from '../../styles/stick-man/tools/rigtest.mjs';
import { ALL } from '../../styles/stick-man/motion-lib/index.js';

function threeBeatFilm() {
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
const READABLE_HEAD = [400, 400, 640, 630];
const rows = (f0, f1, cast) => Array.from({ length: f1 - f0 + 1 }, (_, i) => ({ f: f0 + i,
  actors: Object.fromEntries(Object.entries(cast).map(([who, expr]) => [who, { expr, inFrame: true, head: READABLE_HEAD }])) }));

test('a face is judged by its family: kit faces and film twins (y_fear) alike', () => {
  assert.equal(familyOf('smug'), 'smug');
  assert.equal(familyOf('y_fear'), 'fear');
  assert.equal(familyOf('y_deadpan'), 'neutral');
  assert.equal(familyOf('whatever'), null);
});

test('Kai 16/11 S3-041..043: a smug, surprised or angry cop in a door-search beat is off the beat; a neutral one is not', () => {
  const S = story(threeBeatFilm());
  for (const [expr, off] of [['smug', true], ['shock', true], ['angry', true], ['suspicious', false], ['y_deadpan', false]]) {
    const J = judge(faceRuns(rows(0, 39, { cop: expr }), S, 1920), S);
    assert.equal(J.mismatch.length, off ? 1 : 0, expr);
    if (off) assert.deepEqual([J.mismatch[0].shot, J.mismatch[0].t0, J.mismatch[0].beat], ['SH140', 0, 'B1']);
  }
});

test('a face the beat names passes: strain on the weight, fear on the dread', () => {
  const S = story(threeBeatFilm());
  const J = judge(faceRuns([...rows(40, 79, { you: 'y_strain' }), ...rows(80, 119, { you: 'y_fear' })], S, 1920), S);
  assert.deepEqual(J.mismatch, []);
});

test('a face held under HOLD frames, or on a head too small to read, is not judged', () => {
  const S = story(threeBeatFilm());
  assert.equal(judge(faceRuns(rows(0, HOLD - 2, { cop: 'smug' }), S, 1920), S).mismatch.length, 0);
  const tiny = rows(0, 39, { cop: 'smug' }).map(r => ({ ...r, actors: { cop: { ...r.actors.cop, head: [400, 400, 420, 430] } } }));
  assert.equal(judge(faceRuns(tiny, S, 1920), S).mismatch.length, 0);
});

test(`Kai 16/11 S3-053: one face taken up more than ${REPEAT_MAX} times is over the repeat limit; neutral faces never count`, () => {
  const S = story(threeBeatFilm());
  const J = judge(faceRuns([...rows(0, 19, { you: 'y_strain', cop: 'deadpan' }), ...rows(20, 39, { you: 'y_focus', cop: 'deadpan' }),
    ...rows(40, 59, { you: 'y_strain', cop: 'deadpan' }), ...rows(60, 79, { you: 'y_focus', cop: 'deadpan' }), ...rows(80, 99, { you: 'y_strain', cop: 'deadpan' })], S, 1920), S);
  assert.deepEqual(J.over.map(r => [r.who, r.expr, r.n]), [['you', 'y_strain', 3]]);
});

test('a face held on across cuts is one take, not one per shot', () => {
  const S = story(threeBeatFilm());
  const J = judge(faceRuns(rows(0, 119, { you: 'y_strain' }), S, 1920), S);
  assert.deepEqual(J.reuse.map(r => [r.expr, r.n, r.shots]), [['y_strain', 1, ['SH140+SH150+SH160']]]);
});

test('a re-timed picture maps onto the storyboard through sb, and reports its own second through t', () => {
  const S = story(threeBeatFilm());
  const R = rows(500, 539, { cop: 'smug' }).map((r, i) => ({ ...r, sb: i, t: 20 + i / 30 }));
  const J = judge(faceRuns(R, S, 1920), S);
  assert.deepEqual([J.mismatch[0].shot, J.mismatch[0].t0], ['SH140', 20]);
});

const FACEBEAT = path.resolve('styles/stick-man/tools/facebeat.mjs');
const facebeat = (dir, rowsOf) => {
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'review/shot-rows.jsonl'), rowsOf.map(r => JSON.stringify(r)).join('\n') + '\n');
  return run('node', [FACEBEAT, dir], { capture: true });
};

test('a storyboard with no shots never passes: 60 frames of one held face is PARTIAL and blocks (pilot-a has film + lines only)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facebeat-'));
  fs.writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({ film: 'pilot-a', lines: [{ id: 'L1', text: 'a line' }] }));
  const R = rows(0, 59, { you: 'smug' }), S = story(dir);
  assert.deepEqual(verdict(judge(faceRuns(R, S, 1920), S), coverage(R, S, 1920)).status, 'PARTIAL');
  const p = facebeat(dir, R);
  assert.equal(p.status, 1);
  assert.match(p.stdout, /PARTIAL: the storyboard has no shots/);
});

test('faces outside every shot of the story are PARTIAL, not PASS; faces inside a shot are judged as before', () => {
  const S = story(threeBeatFilm()), late = rows(500, 559, { you: 'smug' }).map(r => ({ ...r, sb: r.f + 1000 }));
  assert.deepEqual(coverage(late, S, 1920), { shots: 3, faced: 60, judged: 0 });
  assert.equal(verdict(judge(faceRuns(late, S, 1920), S), coverage(late, S, 1920)).status, 'PARTIAL');
  const inside = rows(40, 79, { you: 'y_strain' });
  assert.equal(verdict(judge(faceRuns(inside, S, 1920), S), coverage(inside, S, 1920)).status, 'PASS');
});

test('a film with no storyboard.json says so and names --story, with no stack trace', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facebeat-'));
  const p = facebeat(dir, rows(0, 29, { you: 'smug' }));
  assert.equal(p.status, 2);
  assert.match(p.stderr, /has no storyboard\.json: pass --story films\/<slug>/);
  assert.doesNotMatch(p.stderr, /at story \(/);
});

test('the rig test: a standing idle keeps a round head and its bones; a jump squashes the head with its volume kept, under the squash limit', async () => {
  const idle = await measure(ALL.find(c => c.name === 'Adult_Idle_Stand_Loop'));
  assert.ok(idle.head < 1 && idle.bone < 1, `idle head ${idle.head} %, bone ${idle.bone} %`);
  assert.deepEqual(idle.faults, []);
  const jump = await measure(ALL.find(c => c.name === 'Adult_Act_Jump_Once'));
  assert.ok(jump.head > HEAD_PCT && jump.head < HEAD_SQUASH_PCT, `jump head ${jump.head} %`);
  assert.equal(jump.worst.head.kept, true);
  assert.deepEqual(jump.faults, []);
});

test('a 13 % head passes when it keeps its volume and fails when it does not', () => {
  const s = 1 / Math.cbrt(1.13), kept = headShape({ x: s, y: 1.13 * s, z: s });
  assert.equal(kept.kept, true); assert.equal(kept.limit, HEAD_SQUASH_PCT); assert.ok(kept.over < 0, `over ${kept.over}`);
  const tall = headShape({ x: 1, y: 1.13, z: 1 });
  assert.equal(tall.kept, false); assert.equal(tall.limit, HEAD_PCT); assert.ok(tall.over > 0, `over ${tall.over}`);
  assert.equal(headShape({ x: 1.3 * s, y: 1.3 * 1.13 * s, z: 1.3 * s }, 1.3 ** 3).kept, true);
});

test('RIG_KNOWN only shrinks: a fault it does not list fails, a listed clip that grows fails, a fixed one must be deleted', () => {
  const known = { Listed_Clip: { bone: 8.4 } };
  const r = (over, faults = ['x']) => ({ name: 'Listed_Clip', over: { head: 0, bone: 0, flex: 0, ...over }, faults });
  assert.deepEqual(knownFails(r({ bone: 8.4 }), known), []);
  assert.equal(knownFails(r({ bone: 8.5 }), known).length, 1);
  assert.equal(knownFails(r({ head: 0.5 }), known).length, 1);
  assert.equal(knownFails(r({}, []), known).length, 1);
  assert.equal(knownFails({ name: 'New_Clip', over: { head: 1, bone: 0, flex: 0 }, faults: ['head'] }, known).length, 1);
});

test('every library clip passes the rig test or is listed in RIG_KNOWN at its measured size', async () => {
  const rows = await measureAll();
  assert.equal(rows.length, ALL.length);
  assert.deepEqual(rows.flatMap(r => knownFails(r)), []);
});
