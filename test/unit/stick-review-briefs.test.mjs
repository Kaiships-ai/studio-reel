// The review briefs: a blind round closes only when every film has its own written notes and one ranking (reviewers who
// wrote at the end had lost the first films), and a cut's on-screen claims are all marked, none false, before it ships.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { FIELDS, filmNames, shuffle, noteTemplate, brief, missing, keyFile, prepare } from '../../styles/stick-man/tools/review/blindround.mjs';
import { collect, table, problems, hasText } from '../../styles/stick-man/tools/review/claims.mjs';

function round(n) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blind-')), names = filmNames(n);
  fs.mkdirSync(path.join(dir, 'films')); fs.mkdirSync(path.join(dir, 'notes'));
  for (const f of names) { fs.writeFileSync(path.join(dir, 'films', `${f}.mp4`), ''); fs.writeFileSync(path.join(dir, 'notes', `${f}.md`), noteTemplate(f)); }
  return { dir, names };
}
const filled = name => [`# ${name}`, '', ...FIELDS.map(f => `- ${f}: seen at 0:03, it holds`), ''].join('\n');

test('blind round: neutral names in a seeded order, a brief that names no cut, the key outside the reviewer\'s folder', () => {
  assert.deepEqual(filmNames(3), ['Film A', 'Film B', 'Film C']);
  assert.deepEqual(shuffle(['a', 'b', 'c', 'd'], 7), shuffle(['a', 'b', 'c', 'd'], 7));
  assert.deepEqual([...shuffle(['a', 'b', 'c', 'd'], 7)].sort(), ['a', 'b', 'c', 'd']);
  const b = brief(filmNames(2));
  assert.match(b, /notes\/Film A\.md, every line, before you open the next film/);
  assert.match(b, /notes\/ranking\.md/);
  assert.doesNotMatch(b, /key|newer|older|version/i, 'the brief names no version');
  assert.ok(!keyFile('/tmp/round').startsWith('/tmp/round/'), 'the key sits beside the folder, not in it');
});

test('blind round: check fails until every film has every field written and the ranking lists each film once', () => {
  const { dir, names } = round(3);
  assert.equal(missing(dir).length, 4, 'three blank notes and no ranking');
  fs.writeFileSync(path.join(dir, 'notes', 'Film A.md'), filled('Film A'));
  fs.writeFileSync(path.join(dir, 'notes', 'Film B.md'), filled('Film B').replace(/- faces: .*/, '- faces: _'));
  const m = missing(dir);
  assert.ok(m.some(x => x.startsWith('Film B: faces')), m.join('; '));
  assert.ok(!m.some(x => x.startsWith('Film A')), 'Film A is complete');
  // a reviewer who deleted the placeholders and wrote nothing has written nothing (the field's value is its own line only)
  fs.writeFileSync(path.join(dir, 'notes', 'Film C.md'), noteTemplate('Film C').replace(/: _/g, ':'));
  assert.ok(missing(dir).some(x => x === `Film C: ${FIELDS.join(', ')}`), missing(dir).join('; '));
  for (const n of names) fs.writeFileSync(path.join(dir, 'notes', `${n}.md`), filled(n));
  fs.writeFileSync(path.join(dir, 'notes', 'ranking.md'), '1. Film C: the hook\n2. Film A: clear\n');
  assert.deepEqual(missing(dir), ['ranking: Film B not ranked']);
  fs.appendFileSync(path.join(dir, 'notes', 'ranking.md'), '3. Film A: again\n');
  assert.deepEqual(missing(dir), ['ranking: Film B not ranked', 'ranking: Film A ranked twice']);
  fs.writeFileSync(path.join(dir, 'notes', 'ranking.md'), '1. Film C: the hook\n2. Film A: clear\n3. Film B: lost me at 0:20\n');
  assert.deepEqual(missing(dir), []);
  // a second round into the same folder would read these notes against reshuffled cuts
  const cut = path.join(dir, 'a.mp4'); fs.writeFileSync(cut, '');
  assert.throws(() => prepare([cut, cut], dir, 1), /already holds a round/);
  fs.rmSync(dir, { recursive: true });
});

test('claims: every overlay line once with its times, captions left out, a counter one row with its readings', () => {
  const rows = [0, 1, 2, 3, 10, 11].map(f => ({ f, text: [
    { kind: 'caption', text: 'he walks in' },
    ...(f < 4 || f > 9 ? [{ kind: 'text', i: 0, text: 'OVER $10,000  = REPORTED' }] : []),
    { kind: 'text', i: 2, text: f < 5 ? '$10,000' : '$5,000' },
    { kind: 'clock', i: 1, text: `0:${String(59 - f).padStart(2, '0')}` }] }));
  const C = collect(rows);
  assert.deepEqual(C.map(c => c.claim), ['OVER $10,000 = REPORTED', 'text2 numbers', 'clock1 numbers']);
  assert.deepEqual(C[0].spans, [[0, 3], [10, 11]]);
  const md = table(C, 30);
  assert.match(md, /\| 1 \| OVER \$10,000 = REPORTED \| 0\.0-0\.1 s, 0\.3-0\.4 s \| _ \| \|/);
  assert.match(md, /\| 2 \| text2 numbers: \$10,000, \$5,000 \|/, 'a number the viewer reads is shown to the skeptic');
  assert.equal(hasText(rows), true); assert.equal(hasText([{ f: 0 }, { f: 1 }]), false, 'rows with no readable boxes are not a clean list');
  const counter = collect(Array.from({ length: 12 }, (_, f) => ({ f, text: [{ kind: 'text', i: 0, text: `$${f}` }] })));
  assert.equal(counter[0].values.length, 12); assert.match(table(counter), /\$11 \|/, 'every reading is shown, the last one too');
  const sparse = [0, 5, 10, 15].map(f => ({ f, text: [{ kind: 'text', i: 0, text: 'GO' }] }));
  assert.deepEqual(collect(sparse)[0].spans, [[0, 15]], 'rows sampled every 5 frames: one span');
});

test('claims check: a blank, false, malformed or deleted row stops the cut; false and unclear need a why', () => {
  const md = ['<!-- claims: 2 -->', '| # | claim | on screen | verdict | why |', '|---|---|---|---|---|',
    '| 1 | OVER $10,000 = REPORTED | 0.0-2.0 s | true | the bank clerk says it at 0:04 |',
    '| 2 | 3 DAYS LEFT | 5.0-6.0 s | _ | |'].join('\n');
  assert.deepEqual(problems(md), ['#2 3 DAYS LEFT: no verdict (true / false / unclear)']);
  assert.deepEqual(problems(md.replace('| _ | |', '| unclear | |')), ['#2 3 DAYS LEFT: unclear with no why']);
  assert.deepEqual(problems(md.replace('| _ | |', '| false | the story says two days |')), ['#2 3 DAYS LEFT: false (the story says two days)']);
  assert.deepEqual(problems(md.replace('| _ | |', '| unclear | never set up |')), []);
  assert.deepEqual(problems(md.replace('| _ | |', '| true | ok')), ['malformed row: | 2 | 3 DAYS LEFT | 5.0-6.0 s | true | ok', '1 of 2 claims missing from the list']);
  assert.deepEqual(problems(md.split('\n').slice(0, 4).join('\n')), ['1 of 2 claims missing from the list'], 'a deleted row is not a cleared one');
  assert.deepEqual(problems(md.replace('<!-- claims: 2 -->\n', '').replace('| _ | |', '| true | x |')), ['no claim count: write the list with claims.mjs']);
  assert.deepEqual(problems(md.replace('| _ | |', '| true | a \\| b |')), [], 'an escaped pipe in a why');
});
