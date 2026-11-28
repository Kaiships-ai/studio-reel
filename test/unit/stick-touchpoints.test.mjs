// tier: heavy
// Kai's touchpoints in a stick-man episode are exactly S1 S2 K1 K2 K3 Post (Kai 22/11). Every other gate locks on
// machine checks plus an independent reviewer's READY; an AI verdict never locks K1 or K2. A new Kai approval point in
// the gates or the skill text fails here until it is listed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { premises } from '../../styles/stick-man/tools/review/retakes.mjs';
import { row, read, open, HEADER, TSV } from '../../styles/stick-man/tools/series/firstrun.mjs';

const TOOLS = path.join(ROOT, 'styles/stick-man/tools'), TOOL_DIRS = fs.readdirSync(TOOLS).map(d => path.join(TOOLS, d)).filter(d => fs.statSync(d).isDirectory()), SKILL_DIR = path.join(ROOT, '.claude/skills/make-reel-stick-man');
const GATES = JSON.parse(fs.readFileSync(path.join(TOOLS, 'gates/GATES.json'), 'utf8'));
const TOUCHPOINTS = ['S1', 'S2', 'K1', 'K2', 'K3', 'Post'];
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'touch-'));
const put = (dir, rel, data, t) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 1)); if (t) fs.utimesSync(p, t, t); };

test('GATES.json lists exactly the six Kai touchpoints, and only K1 (◇2b) and K2 (◇5) gates wait on Kai', () => {
  assert.deepEqual(GATES.touchpoints.map(t => t.id), TOUCHPOINTS);
  const kai = Object.entries(GATES.gates).filter(([, g]) => g.approver === 'kai').map(([id, g]) => `${id}:${g.touch}`);
  assert.deepEqual(kai.sort(), ['2b:K1', '5:K2']);
  for (const [id, g] of Object.entries(GATES.gates)) assert.ok(['kai', 'reviewer'].includes(g.approver), `◇${id} names its approver`);
  for (const t of GATES.touchpoints.filter(t => t.gate)) assert.equal(GATES.gates[t.gate].touch, t.id);
});

// Present-tense approval words; a line that names one must say which touchpoint it is. History ("Kai picked … 17/11")
// lives in WHOCHECKS sources and is not an approval point.
const ASK = /\bKai (approves|signs|confirms|merges|picks|chooses|decides|accepts|reviews|OKs)\b|\bKai's call\b|\b(wait|waits|waiting) (on|for) Kai\b|\buntil Kai\b|\bneeds Kai\b|\bshow Kai\b|READY FOR KAI(?! (K1|K2|\$\{))|kai-ok|--lock-story kai/i;
test('every approval point in the skill, its playbook and the tools\' messages names one of the six touchpoints', () => {
  const files = [...fs.readdirSync(SKILL_DIR).filter(f => f.endsWith('.md')).map(f => path.join(SKILL_DIR, f)), path.join(ROOT, '.agents/playbooks/stick-man-film.md'),
    ...TOOL_DIRS.flatMap(d => fs.readdirSync(d).filter(f => /\.(mjs|js|py)$/.test(f)).map(f => path.join(d, f)))];
  const bad = [];
  for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (ASK.test(l) && !new RegExp(`\\b(${TOUCHPOINTS.join('|')})\\b`).test(l)) bad.push(`${path.relative(ROOT, f)}:${i + 1}: ${l.trim().slice(0, 120)}`);
  });
  assert.deepEqual(bad, [], 'an approval point outside S1 S2 K1 K2 K3 Post: make it machine checks + an independent reviewer, or list it');
});

test('SKILL.md stays short and every Rules row names the check that enforces it', () => {
  const text = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  assert.ok(text.split('\n').length <= 200, `SKILL.md is ${text.split('\n').length} lines; move detail to the reference files`);
  const rules = text.split(/^## Rules.*$/m)[1].split(/^## /m)[0].split('\n').filter(l => /^\| (?!Rule \||---)/.test(l));
  assert.ok(rules.length >= 10, 'the Rules table is found');
  const judged = new Set(Object.values(GATES.gates).flatMap(g => (g.evidence || []).filter(e => e.by === 'independent').map(e => e.file)));
  const enforces = p => /\.(mjs|js|py)$/.test(p) ? [TOOLS, ...TOOL_DIRS].map(d => path.join(d, p)).concat(path.join(ROOT, p)).some(x => fs.existsSync(x)) : judged.has(p);
  const bad = rules.filter(l => { const cell = l.split('|').at(-2); return ![...cell.matchAll(/`([^`]+)`/g)].some(m => enforces(m[1].split(' ')[0])); });
  assert.deepEqual(bad.map(l => l.slice(0, 100)), [], 'a rule enforced by nothing repeats: name the tool, the test or the independent review (GATES.json) that checks it');
});

const gateRow = (d, id) => { run('node', [path.join(TOOLS, 'gates/stagegate.mjs'), d, id], { capture: true });
  const md = fs.readFileSync(path.join(d, `review/gate-${id}.md`), 'utf8');
  return { state: md.match(/^\*\*(.*)\*\*$/m)[1], approved: md.match(/^\| approved \| review\/approvals\.json \| (PASS|FAIL) \| (.*) \|$/m).slice(1), md }; };

test('DECISIONS.json: the maker never approves its own decision; a reviewer or Kai at a touchpoint does', () => {
  const d = tmp(), dec = by => { put(d, 'DECISIONS.json', { decisions: [{ id: 'D1', decision: 'x', status: 'approved', by }] });
    run('node', [path.join(TOOLS, 'gates/develop.mjs'), d], { capture: true }); return fs.readFileSync(path.join(d, 'review/develop.md'), 'utf8'); };
  assert.match(dec('self'), /\| FAIL \| D0 \| D1: approved by "self"/);
  for (const by of ['agent:rev-1', 'kai']) assert.doesNotMatch(dec(by), /D1: approved by/);
});

test('a process gate locks on an independent reviewer\'s READY, never on a self-approval or a NOT READY', () => {
  const d = tmp();
  put(d, 'storyboard.json', {}, 1000); put(d, 'review/retention.md', 'by: self\n', 1000); put(d, 'review/retro.md', 'by: self\n\n# Rules proposed\n', 1000);
  assert.equal(gateRow(d, '6').state, 'READY FOR REVIEW');
  put(d, 'review/approvals.json', { 6: { by: 'self', at: '2026-11-22T10:00:00Z', verdict: 'READY' } });
  assert.match(gateRow(d, '6').approved[1], /independent reviewer/);
  put(d, 'review/approvals.json', { 6: { by: 'agent:rev-1', at: '2026-11-22T10:00:00Z', verdict: 'NOT READY' } });
  assert.match(gateRow(d, '6').approved[1], /says NOT READY/);
  put(d, 'review/approvals.json', { 6: { by: 'agent:rev-1', at: '2020-01-01T10:00:00Z', verdict: 'READY' } });
  assert.equal(gateRow(d, '6').state, 'LOCK');
  put(d, 'review/retro.md', 'by: self\n\n# Rules proposed\nmore\n');
  assert.match(gateRow(d, '6').approved[1], /before the latest evidence changed/);
});

test('◇5 runs readgate as a blocking check and soundgate as advisory: a soundgate FAIL is shown, never blocks', () => {
  const run5 = Object.fromEntries(GATES.gates['5'].run.map(r => [r.tool, !!r.advisory]));
  assert.equal(run5['tools/gates/readgate.mjs'], false); assert.equal(run5['tools/gates/soundgate.mjs'], true);
  const d = tmp(); put(d, 'storyboard.json', {}, 1000);
  const md = gateRow(d, '5').md;
  assert.match(md, /^\| measured \| readgate\.mjs \| FAIL \|/m);
  assert.match(md, /^\| advisory \| soundgate\.mjs \| PASS \| advisory only: exit 1: /m);
});

test('K1 and K2 lock only on Kai: an agent READY is advisory there, and K1 names the hook, K2 the note count', () => {
  const d = tmp();
  put(d, 'storyboard.json', {}, 1000);
  put(d, 'review/approvals.json', { '2b': { by: 'agent:rev-1', at: '2026-11-22T10:00:00Z', verdict: 'READY' }, 5: { by: 'kai', at: '2026-11-22T10:00:00Z' } });
  assert.match(gateRow(d, '2b').approved[1], /K1 is Kai's touchpoint: "agent:rev-1" cannot lock it/);
  assert.match(gateRow(d, '5').approved[1], /K2 approval lacks notes/);
  put(d, 'review/approvals.json', { '2b': { by: 'kai', at: '2026-11-22T10:00:00Z', hook: 'opt3' }, 5: { by: 'kai', at: '2026-11-22T10:00:00Z', notes: 3 } });
  assert.deepEqual(gateRow(d, '2b').approved, ['PASS', 'Kai K1, 2026-11-22T10:00:00Z · hook opt3']);
  assert.equal(gateRow(d, '5').approved[0], 'PASS');
});

const R = ['v1', 'v2', 'v3'].map(id => ({ id, of: id }));
const n = (id, round, more = {}) => ({ id, round, where: 'SH040', type: 'careless', kind: 'prop-across-cut', root: 'R1', says: 'x', ...more });
test('PREMISE: the same shot and fault kind open after 2 rounds forces K3; a closed fix or a K3 pick clears it', () => {
  assert.deepEqual(premises({ rounds: R, notes: [n('a', 'v1')] }), []);
  const two = { rounds: R, notes: [n('a', 'v1'), n('b', 'v2', { type: 'not-addressed', repeats: 'a' })] };
  assert.deepEqual(premises(two).map(p => [p.shot, p.kind, p.rounds.join()]), [['SH040', 'prop-across-cut', 'v1,v2']]);
  assert.deepEqual(premises({ rounds: R, notes: [n('a', 'v1'), n('b', 'v2', { where: 'SH050' })] }), [], 'another shot');
  assert.deepEqual(premises({ rounds: R, notes: [n('a', 'v1'), n('b', 'v2', { closed: 'v3' })] }), [], 'fixed on v3');
  const k3 = { ...structuredClone(two), k3: [{ shot: 'SH040', kind: 'prop-across-cut', round: 'v2', pick: 'insert a close-up', at: '2026-11-22' }] };
  assert.deepEqual(premises(k3), []);
  k3.notes.push(n('c', 'v3')); assert.deepEqual(premises(k3), [], 'the new approach gets its own 2 rounds');
  const d = tmp(), tool = path.join(TOOLS, 'review/retakes.mjs');
  assert.equal(run('node', [tool, d, '--premise'], { capture: true }).status, 0, 'no log yet');
  put(d, 'review/retakes.json', two);
  const p = run('node', [tool, d, '--premise'], { capture: true });
  assert.equal(p.status, 1); assert.match(p.stdout, /PREMISE SH040 prop-across-cut: notes a b on rounds v1, v2; .*K3/);
});

test('first-run bench: v1 with at most 5 Kai notes passes; every note names its kind and root; the next episode needs a check per kind', () => {
  assert.equal(read(TSV).length >= 0 && fs.readFileSync(TSV, 'utf8').split('\n')[0], HEADER.join('\t'));
  const notes = k => Array.from({ length: k }, (_, i) => n(`c${i}`, 'v1', { kind: i ? 'too-many-cuts' : 'story-feel', root: i % 2 ? 'R4' : 'R3' }));
  const r = row('hm-ep02', { rounds: R, notes: notes(5) }, { rounds: 2, minutes: 190 });
  assert.deepEqual(r, ['hm-ep02', 5, 'pass', 'R1 0 · R2 0 · R3 3 · R4 2 · R5 0', 'machine 4 · AI 0 · Kai-only 1', 2, 190, 'story-feel too-many-cuts']);
  assert.equal(row('x', { rounds: R, notes: notes(6) }, { rounds: 1, minutes: 1 })[2], 'fail');
  assert.throws(() => row('x', { rounds: R, notes: [n('a', 'v1', { kind: undefined })] }, { rounds: 1, minutes: 1 }), /without a WHOCHECKS kind/);
  const rows = [Object.fromEntries(HEADER.map((h, i) => [h, String(r[i])]))];
  assert.deepEqual(open('hm-ep03', rows).kinds, ['story-feel']);
  assert.deepEqual(open('hm-ep03', rows, { 'story-feel': 'ai', 'too-many-cuts': 'machine' }).kinds, []);
  const d = tmp(), tsv = path.join(d, 'b.tsv'), film = path.join(d, 'hm-ep02');
  put(film, 'review/retakes.json', { rounds: R, notes: notes(2) });
  const add = () => run('node', [path.join(TOOLS, 'series/firstrun.mjs'), 'add', film, '--rounds', '1', '--minutes', '170', '--tsv', tsv], { capture: true });
  assert.equal(add().status, 0); assert.equal(add().status, 1, 'append-only: one row per episode');
  const chk = run('node', [path.join(TOOLS, 'series/firstrun.mjs'), 'check', path.join(d, 'hm-ep03'), '--tsv', tsv], { capture: true });
  assert.equal(chk.status, 1); assert.match(chk.stdout, /hm-ep02 notes of kind story-feel still have no machine or AI check/);
});
