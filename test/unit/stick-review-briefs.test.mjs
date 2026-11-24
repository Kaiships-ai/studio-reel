// The review briefs (round 2 of the H2 V2.1 leftovers): a blind round that will not close until every film has its own
// written notes and a ranking (blind reviewers who wrote at the end had lost the first films), and the on-screen claims
// list a story skeptic must mark before a cut goes out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { FIELDS, filmNames, shuffle, noteTemplate, brief, missing } from '../../styles/stick-man/tools/review/blindround.mjs';
import { collect, table, problems, hasText } from '../../styles/stick-man/tools/review/claims.mjs';

function round(n) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blind-')), names = filmNames(n);
  fs.mkdirSync(path.join(dir, 'films')); fs.mkdirSync(path.join(dir, 'notes'));
  for (const f of names) { fs.writeFileSync(path.join(dir, 'films', `${f}.mp4`), ''); fs.writeFileSync(path.join(dir, 'notes', `${f}.md`), noteTemplate(f)); }
  return { dir, names };
}
const filled = name => [`# ${name}`, '', ...FIELDS.map(f => `- ${f}: seen at 0:03, it holds`), ''].join('\n');

test('blind round: the cuts get neutral names in a seeded order, and the brief makes each film written up before the next', () => {
  assert.deepEqual(filmNames(3), ['Film A', 'Film B', 'Film C']);
  assert.deepEqual(shuffle(['a', 'b', 'c', 'd'], 7), shuffle(['a', 'b', 'c', 'd'], 7));
  assert.deepEqual([...shuffle(['a', 'b', 'c', 'd'], 7)].sort(), ['a', 'b', 'c', 'd']);
  const b = brief(filmNames(2));
  assert.match(b, /notes\/Film A\.md, every line, before you open the next film/);
  assert.match(b, /notes\/ranking\.md/);
  assert.doesNotMatch(b, /key\.json|newer|older|version/i, 'the brief names no version');
});

test('blind round: check fails until every film has every field written and the ranking lists them all', () => {
  const { dir, names } = round(3);
  assert.equal(missing(dir).length, 4, 'three blank notes and no ranking');
  fs.writeFileSync(path.join(dir, 'notes', 'Film A.md'), filled('Film A'));
  fs.writeFileSync(path.join(dir, 'notes', 'Film B.md'), filled('Film B').replace(/- faces: .*/, '- faces: _'));
  const m = missing(dir);
  assert.ok(m.some(x => x.startsWith('Film B: faces')), m.join('; '));
  assert.ok(!m.some(x => x.startsWith('Film A')), 'Film A is complete');
  for (const n of names) fs.writeFileSync(path.join(dir, 'notes', `${n}.md`), filled(n));
  fs.writeFileSync(path.join(dir, 'notes', 'ranking.md'), '1. Film C: the hook\n2. Film A: clear\n');
  assert.deepEqual(missing(dir), ['ranking: Film B not ranked']);
  fs.appendFileSync(path.join(dir, 'notes', 'ranking.md'), '3. Film B: lost me at 0:20\n');
  assert.deepEqual(missing(dir), []);
  fs.rmSync(dir, { recursive: true });
});

test('claims: every overlay line once, with its times; captions left out; a counter is one row', () => {
  const rows = [0, 1, 2, 3, 10, 11].map(f => ({ f, text: [
    { kind: 'caption', text: 'he walks in' },
    ...(f < 4 || f > 9 ? [{ kind: 'text', i: 0, text: 'OVER $10,000  = REPORTED' }] : []),
    { kind: 'clock', i: 1, text: `0:${String(59 - f).padStart(2, '0')}` }] }));
  const C = collect(rows);
  assert.deepEqual(C.map(c => c.claim), ['OVER $10,000 = REPORTED', 'numbers in clock1']);
  assert.deepEqual(C[0].spans, [[0, 3], [10, 11]]);
  const md = table(C, 30);
  assert.equal(hasText(rows), true); assert.equal(hasText([{ f: 0 }, { f: 1 }]), false, 'rows with no readable boxes are not a clean list');
  assert.match(md, /\| 1 \| OVER \$10,000 = REPORTED \| 0\.0-0\.1 s, 0\.3-0\.4 s \| _ \| \|/);
});

test('claims check: a blank verdict or a false claim stops the cut; false and unclear need a why', () => {
  const md = ['| # | claim | on screen | verdict | why |', '|---|---|---|---|---|',
    '| 1 | OVER $10,000 = REPORTED | 0.0-2.0 s | true | the bank clerk says it at 0:04 |',
    '| 2 | 3 DAYS LEFT | 5.0-6.0 s | _ | |'].join('\n');
  assert.deepEqual(problems(md), ['#2 3 DAYS LEFT: no verdict (true / false / unclear)']);
  assert.deepEqual(problems(md.replace('| _ | |', '| unclear | |')), ['#2 3 DAYS LEFT: unclear with no why']);
  assert.deepEqual(problems(md.replace('| _ | |', '| false | the story says two days |')), ['#2 3 DAYS LEFT: false (the story says two days)']);
  assert.deepEqual(problems(md.replace('| _ | |', '| unclear | never set up |')), []);
});
