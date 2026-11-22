import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { REGISTRY, SKILL, problems, render, block, checkMap } from '../../styles/stick-man/tools/whochecks.mjs';

const TOOLS = path.join(ROOT, 'styles/stick-man/tools');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const REG = read(REGISTRY), GATES = read(path.join(TOOLS, 'GATES.json'));
const MAP = read(path.join(ROOT, 'test/fixtures/whochecks/hm-r2-1611.json'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'whochecks-'));
const put = (dir, rel, data) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data)); return p; };

test('every registry row names a real checker, a measured limit and its source, and each machine tool runs at its gate', () => {
  assert.deepEqual(problems(REG, GATES), []);
  const moved = structuredClone(REG); moved.rows.find(r => r.id === 'too-many-cuts').gates = ['4'];
  assert.match(problems(moved, GATES).join(), /gate 4 does not run tools\/cutgate\.mjs/);
  const bare = structuredClone(REG); delete bare.rows.find(r => r.id === 'motion-feel').source;
  assert.match(problems(bare, GATES).join(), /row motion-feel: fault, limit and source/);
});

test('the make-reel-stick-man skill shows the registry exactly as whochecks.mjs renders it', () => {
  assert.equal(block(fs.readFileSync(SKILL, 'utf8')), render(REG, GATES));
  const p = run('node', [path.join(TOOLS, 'whochecks.mjs')], { capture: true });
  assert.equal(p.status, 0, p.stdout); assert.match(p.stdout, /SKILL\.md matches/);
});

test('every 16/11 complaint sits in one cell its measured evidence supports', () => {
  const { problems: bad, cells } = checkMap(REG, MAP);
  assert.deepEqual(bad, []);
  assert.deepEqual(Object.fromEntries(Object.entries(cells).map(([c, ids]) => [c, ids.length])), { machine: 13, ai: 1, kai: 17 });
  assert.equal(MAP.complaints.length, 31);
});

test('the map fails on an unmapped complaint, a checker that missed it, a Kai row a checker caught, or no measured hit', () => {
  const remap = (id, row) => ({ ...MAP, complaints: MAP.complaints.map(c => c.id === id ? { ...c, row } : c) });
  assert.match(checkMap(REG, remap('S3-035', 'pose-snap')).problems.join(), /S3-035: on machine \(pose-snap\), but tools\/shotgate\.mjs missed it/);
  assert.match(checkMap(REG, remap('S3-047', 'grip')).problems.join(), /S3-047: unmapped/);
  assert.match(checkMap(REG, remap('S3-050', 'motion-feel')).problems.join(), /S3-050: on Kai, but tools\/shotgate\.mjs caught it/);
  assert.match(checkMap(REG, remap('S3-054', 'dark')).problems.join(), /S3-054: on ai \(dark\) with no measured hit from the AI trial/);
  const noWhy = { ...MAP, complaints: MAP.complaints.map(c => c.id === 'S3-063' ? { ...c, evidence: c.evidence.map(e => ({ ...e, why: undefined })) } : c) };
  assert.match(checkMap(REG, noWhy).problems.join(), /S3-063: on machine \(body-through-set\) with no measured hit/);
});

test('◇5: while no brief is calibrated, Kai\'s OK counts in place of the AI review, recorded and printed as kai-ok', () => {
  const d = tmp(), none = put(d, 'cal-none.json', { records: [{ brief: 'kai-taste@aaa', half: 'test', calibrated: false, hit: 0.4, falseAlarm: 0, why: ['hit 40% < 70%'] }] });
  put(d, 'film/storyboard.json', { shots: [] });
  const gate = cal => { const p = run('node', [path.join(TOOLS, 'stagegate.mjs'), path.join(d, 'film'), '5'], { capture: true, env: { STICK_CALIBRATION: cal } });
    return { out: p.stdout, md: fs.readFileSync(path.join(d, 'film/review/gate-5.md'), 'utf8') }; };
  assert.match(gate(none).md, /\| judged \| review\/final-qa\.md \| FAIL \| uncalibrated: no brief has passed .*"kai-ok"/);
  put(d, 'film/review/final-qa.md', 'by: agent:x\nbrief: kai-taste@aaa\n');
  assert.match(gate(none).md, /\| judged \| review\/final-qa\.md \| FAIL \| uncalibrated/, 'an uncalibrated review still does not count');
  put(d, 'film/review/approvals.json', { 'kai-ok': { 'review/final-qa.md': { at: '2026-01-02T10:00:00Z', note: 'watched at 1x' } } });
  const ok = gate(none);
  assert.match(ok.md, /\| judged \| review\/final-qa\.md \| PASS \| kai-ok 2026-01-02T10:00:00Z: Kai's OK in place of the AI review/);
  assert.match(ok.out, /· kai-ok review\/final-qa\.md 2026-01-02T10:00:00Z\n/, 'printed on every run');
  put(d, 'film/renders/x_v2.mp4', 'mp4');
  assert.match(gate(none).md, /\| judged \| review\/final-qa\.md \| FAIL \| kai-ok .* older than the newest render/);
});

test('◇5: once a brief is calibrated, the old rule applies and kai-ok no longer counts', () => {
  const d = tmp(), cal = put(d, 'cal.json', { records: [{ brief: 'kai-taste@bbb', half: 'test', calibrated: true, hit: 0.8, falseAlarm: 0, why: [] }] });
  put(d, 'film/storyboard.json', { shots: [] });
  put(d, 'film/review/approvals.json', { 'kai-ok': { 'review/final-qa.md': { at: '2099-01-01T00:00:00Z' } } });
  const gate = () => { run('node', [path.join(TOOLS, 'stagegate.mjs'), path.join(d, 'film'), '5'], { capture: true, env: { STICK_CALIBRATION: cal } });
    return fs.readFileSync(path.join(d, 'film/review/gate-5.md'), 'utf8'); };
  assert.match(gate(), /\| judged \| review\/final-qa\.md \| FAIL \| missing: .*kai-ok no longer counts: brief kai-taste@bbb is calibrated/);
  put(d, 'film/review/final-qa.md', 'by: agent:x\nbrief: kai-taste@bbb\nof: final v3\n');
  assert.match(gate(), /\| judged \| review\/final-qa\.md \| PASS \| of final v3/);
});
