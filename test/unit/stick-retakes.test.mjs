import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { problems, rounds } from '../../styles/stick-man/tools/retakes.mjs';
import { score, scoreComplaint, falseAlarms, calibration, briefTag, loadAnswers } from '../../styles/stick-man/tools/calibrate.mjs';

const TOOLS = path.join(ROOT, 'styles/stick-man/tools');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'retake-'));
const put = (dir, rel, data) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 1)); return p; };
const R = ['r1', 'r2', 'r3'].map(id => ({ id, of: id }));
const note = (id, round, more = {}) => ({ id, round, where: 'SH010', type: 'careless', says: 'x', ...more });

test('a round with more notes than the round before is a version regression', () => {
  const rs = rounds({ rounds: R, notes: [note('a', 'r1'), note('b', 'r2'), note('c', 'r2'), note('d', 'r3')] });
  assert.deepEqual(rs.map(r => r.ok), [true, false, true]);
  assert.match(rs[1].why[0], /2 notes after 1 on r1: version regression/);
});

test('a note that repeats a closed note re-opens it and fails its round; an open repeat only counts', () => {
  const log = { rounds: R, notes: [note('a', 'r1', { closed: 'r2' }), note('b', 'r1'), note('c', 'r2'),
    note('d', 'r3', { type: 'not-addressed', repeats: 'a' })] };
  assert.deepEqual(problems(log), []);
  const rs = rounds(log);
  assert.equal(rs[2].ok, false); assert.match(rs[2].why.join(), /d re-opens a \(closed on r2\)/);
  assert.deepEqual(rs[2].repeats, ['d']);
  const open = rounds({ rounds: R, notes: [note('a', 'r1'), note('b', 'r1'), note('d', 'r2', { type: 'not-addressed', repeats: 'a' })] });
  assert.deepEqual(open.map(r => r.ok), [true, true, true]); assert.deepEqual(open[1].repeats, ['d']);
});

test('the log is checked before it is counted: types, classes, repeats and closing rounds', () => {
  const bad = problems({ rounds: R, notes: [note('a', 'r2', { type: 'sloppy' }), note('b', 'r9'), note('c', 'r1', { type: 'not-addressed' }),
    note('d', 'r1', { repeats: 'a' }), note('e', 'r2', { closed: 'r1' }), note('f', 'r1', { class: 'bag teleports' })] });
  for (const m of [/a: type "sloppy"/, /b: round "r9"/, /c: a not-addressed note names/, /d: repeats a from round r2, which is not earlier/,
    /e: closed on "r1"/, /f: class "bag teleports"/]) assert.ok(bad.some(b => m.test(b)), String(m));
});

test('retakes.mjs exits on the latest round and refuses a broken log', () => {
  const d = tmp(), tool = path.join(TOOLS, 'retakes.mjs');
  put(d, 'review/retakes.json', { rounds: R.slice(0, 2), notes: [note('a', 'r1'), note('b', 'r2'), note('c', 'r2')] });
  const fail = run('node', [tool, d], { capture: true });
  assert.equal(fail.status, 1); assert.match(fail.stdout, /r2\t2\t0\t.*FAIL: 2 notes after 1/);
  put(d, 'review/retakes.json', { rounds: R.slice(0, 2), notes: [note('a', 'r1'), note('b', 'r1'), note('c', 'r2')] });
  assert.equal(run('node', [tool, d], { capture: true }).status, 0);
  put(d, 'review/retakes.json', { rounds: R, notes: [note('a', 'r7')] });
  assert.equal(run('node', [tool, d], { capture: true }).status, 2);
});

const KEY = { set: 't', clips: [{ id: 'v', video: '' }, { id: 'a', video: '' }, { id: 'b', video: '' }],
  complaints: [{ id: 'K1', clip: 'v', t0: 10, t1: 11, kind: 'pop', half: 'test' }, { id: 'K2', clip: 'v', t0: 20, t1: 21, kind: 'clip', half: 'test' },
    { id: 'K3', clip: 'v', kind: 'repeat', half: 'test' }, { id: 'K4', clip: 'v', t0: 30, t1: 31, kind: 'jerk', half: 'tune' }],
  praise: [{ id: 'P1', clip: 'v', t0: 0, t1: 5, kinds: ['cutting'], half: 'test' }],
  ab: [{ id: 'ab', a: 'a', b: 'b', pick: 'A', half: 'test' }] };
const f = (t0, t1, kind, more = {}) => ({ t0, t1, kind, scope: 'moment', severity: 'High', ...more });

test('a complaint is a hit for its kind at its time, half for another kind there, and film-wide only for a film-wide finding', () => {
  const [k1, , k3] = KEY.complaints;
  assert.equal(scoreComplaint(k1, [f(11.4, 12, 'pop')]), 1, 'within half a second');
  assert.equal(scoreComplaint(k1, [f(10, 11, 'dark')]), 0.5);
  assert.equal(scoreComplaint(k1, [f(12, 13, 'pop')]), 0);
  assert.equal(scoreComplaint(k3, [f(0, 79, 'repeat', { scope: 'film' })]), 1);
  assert.equal(scoreComplaint(k3, [f(40, 41, 'repeat')]), 0, 'one moment is not the film-wide pattern');
});

test('a false alarm is a High or Medium finding of the praised kind inside the praised window', () => {
  const p = KEY.praise[0];
  assert.equal(falseAlarms(p, [f(2, 3, 'cutting'), f(2, 3, 'cutting', { severity: 'Medium' })]).length, 2);
  assert.equal(falseAlarms(p, [f(2, 3, 'cutting', { severity: 'Low' }), f(2, 3, 'pop'), f(8, 9, 'cutting')]).length, 0);
});

test('a brief is calibrated only on the test half, at the threshold, with every A/B on Kai\'s side', () => {
  const good = { clips: { v: { findings: [f(10, 11, 'pop'), f(20, 21, 'clip'), f(0, 80, 'repeat', { scope: 'film' })] } }, ab: { ab: 'A' } };
  const s = score(KEY, good);
  assert.equal(s.hit, 1); assert.equal(s.calibrated, true); assert.equal(s.complaints.length, 3, 'tune-half complaints are not scored');
  const ab = score(KEY, { ...good, ab: { ab: 'B' } });
  assert.equal(ab.calibrated, false); assert.match(ab.why.join(), /A\/B ab: picked B/);
  const fa = score(KEY, { ...good, clips: { v: { findings: [...good.clips.v.findings, f(1, 2, 'cutting')] } } });
  assert.equal(fa.falseAlarm, 1); assert.equal(fa.calibrated, false);
  const low = score(KEY, { clips: { v: { findings: [f(10, 11, 'pop')] } }, ab: { ab: 'A' } });
  assert.equal(low.calibrated, false); assert.match(low.why.join(), /hit 33% < 70%/);
});

test('the blind prompt carries the videos and the brief, never Kai\'s answers', () => {
  const d = tmp(), brief = path.join(d, 'brief'), vid = put(d, 'src/x.mp4', 'v');
  put(d, 'brief/SKILL.md', '# taste');
  const key = put(d, 'key.json', { ...KEY, clips: KEY.clips.map(c => ({ ...c, video: vid })) });
  const r = run('node', [path.join(TOOLS, 'calibrate.mjs'), 'blind', key, path.join(d, 'out'), brief], { capture: true });
  assert.equal(r.status, 0, r.stderr);
  const prompts = fs.readdirSync(path.join(d, 'out')).map(j => fs.readFileSync(path.join(d, 'out', j, 'PROMPT.md'), 'utf8'));
  assert.equal(prompts.length, 2, 'one clip job and one A/B job');
  for (const p of prompts) {
    for (const id of ['K1', 'K2', 'K3', 'K4', 'P1', '"A"\n', 'src/x.mp4']) assert.ok(!p.includes(id), `prompt leaks ${JSON.stringify(id)}`);
    assert.match(p, new RegExp(briefTag(brief)));
  }
  assert.ok(fs.existsSync(path.join(d, 'out/job2/A.mp4')) && fs.existsSync(path.join(d, 'out/job2/B.mp4')));
});

test('answers with a kind outside the closed list are refused', () => {
  const d = tmp(); put(d, 'a.json', { brief: 'k@1', clips: { v: { findings: [f(1, 2, 'sloppy')] } } });
  assert.throws(() => loadAnswers(d), /kind "sloppy"/);
});

test('a review whose brief is not calibrated does not count at a gate', () => {
  const d = tmp(), rec = put(d, 'calibration.json', { records: [
    { brief: 'kai-taste@aaa', calibrated: false, hit: 0.4, falseAlarm: 0, why: ['hit 40% < 70%'] },
    { brief: 'kai-taste@bbb', calibrated: true, hit: 0.8, falseAlarm: 0, why: [] }] });
  assert.match(calibration('kai-taste@aaa', rec).why, /uncalibrated: brief kai-taste@aaa scored hit 40%/);
  assert.match(calibration('kai-taste@ccc', rec).why, /never scored/);
  assert.match(calibration(undefined, rec).why, /no "brief:" line/);
  assert.equal(calibration('kai-taste@bbb', rec).ok, true);
  const gates = JSON.parse(fs.readFileSync(path.join(TOOLS, 'GATES.json'), 'utf8'));
  assert.equal(gates.gates['5'].evidence.find(e => e.file === 'review/final-qa.md').calibrated, true);
  const film = tmp(); put(film, 'storyboard.json', { fps: 30, shots: [] });
  put(film, 'review/final-qa.md', 'by: agent:x\nbrief: kai-taste@aaa\n\n# QA\n');
  const g = run('node', [path.join(TOOLS, 'stagegate.mjs'), film, '5'], { capture: true, env: { STICK_CALIBRATION: rec } });
  assert.match(fs.readFileSync(path.join(film, 'review/gate-5.md'), 'utf8'), /judged \| review\/final-qa\.md \| FAIL \| uncalibrated: brief kai-taste@aaa/, g.stdout);
  put(film, 'review/final-qa.md', 'by: agent:x\nbrief: kai-taste@bbb\n\n# QA\n');
  run('node', [path.join(TOOLS, 'stagegate.mjs'), film, '5'], { capture: true, env: { STICK_CALIBRATION: rec } });
  assert.match(fs.readFileSync(path.join(film, 'review/gate-5.md'), 'utf8'), /judged \| review\/final-qa\.md \| PASS/);
});
