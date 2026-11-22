// Stage gates with evidence: a gate is LOCK only when (1) its measured checks pass, (2) the judged evidence exists, is
// fresh and was written by someone other than the maker, and (3) its approver signed it in review/approvals.json after
// the latest evidence. The approver is Kai only at a Kai touchpoint (GATES.json `touchpoints`: K1 at ◇2b, K2 at ◇5); every
// other gate is approved by an independent reviewer whose verdict is READY. An AI verdict never locks a Kai gate.
// Nothing here can be skipped quietly: a missing file, a stale file or a self-review is a FAIL with its reason.
//   node styles/stick-man/tools/gates/stagegate.mjs films/<slug> 2a          -> review/gate-2a.md, exit 1 unless LOCK
//   node styles/stick-man/tools/gates/stagegate.mjs films/<slug> all         -> every gate's state, one line each
// Evidence front matter (first lines of a markdown file):  by: agent:<id> | kai | self   ·   of: <what was reviewed + version>
// Freshness (`newerThan`): a review goes stale when what it judged changed, by a content hash of the JSON fields a viewer
// sees or hears (fresh.mjs; record in review/.fresh.json). Non-JSON targets fall back to mtime.
// A run with `advisory: true` is shown as an advisory row and never blocks (a new gate until it is trusted).
// Calibration (`calibrated`): advisory. The row says whether the review's `brief:` agreed with Kai (calibrate.mjs); it
// never blocks, because no brief has yet passed on enough of Kai's notes to stand in for him.
// approvals.json: { "<gate>": { by: "kai", at, ...touch fields } } at a Kai gate, { by: "agent:<id>", at, verdict: "READY" } elsewhere.
import { isFresh } from './fresh.mjs';
import { calibration } from '#tools/review/calibrate.mjs';
import { checkLogs } from '#tools/run/logline.mjs';
import fs from 'node:fs'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../../..');
const [film, which = 'all'] = process.argv.slice(2);
const USAGE = 'usage: stagegate.mjs films/<slug> <1|S|2a|2b|2c|3|4|5|6|all>';
if (!film || film.startsWith('-')) { console[film ? 'log' : 'error'](USAGE); process.exit(film === '--help' || film === '-h' ? 0 : 2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
// (a film folder that does not exist is a typo, never a new film: writing gate files there would litter the repo root)
if (!fs.existsSync(path.join(DIR, 'storyboard.json')) && !fs.existsSync(path.join(DIR, 'review'))) { console.error(`${film}: not a film folder (no storyboard.json or review/)\n${USAGE}`); process.exit(2); }
const SPEC = JSON.parse(fs.readFileSync(path.join(HERE, 'GATES.json'), 'utf8'));
const local = fs.existsSync(F('review/gates.local.json')) ? JSON.parse(fs.readFileSync(F('review/gates.local.json'), 'utf8')) : {};
const approvals = fs.existsSync(F('review/approvals.json')) ? JSON.parse(fs.readFileSync(F('review/approvals.json'), 'utf8')) : {};
const mtime = p => fs.existsSync(F(p)) ? fs.statSync(F(p)).mtimeMs : 0;
const TOUCH = Object.fromEntries((SPEC.touchpoints || []).map(t => [t.id, t]));
const INDEPENDENT = /^(agent|person):/i;

function approvalRow(g, ap, newest) {
  const touch = g.approver === 'kai' ? TOUCH[g.touch] : null, who = touch ? `Kai (${touch.id} ${touch.title})` : 'an independent reviewer';
  const row = ok => why => ({ kind: 'approved', what: 'review/approvals.json', ok, why });
  if (!ap) return row(false)(`not approved yet: ${who} approves this gate`);
  if (!Number.isFinite(Date.parse(ap.at))) return row(false)(`approval has no date: "${ap.at}"`);
  if (Date.parse(ap.at) < newest - 1000) return row(false)('approved before the latest evidence changed: ask again');
  if (touch) {
    if (ap.by !== 'kai') return row(false)(`${touch.id} is Kai's touchpoint: "${ap.by}" cannot lock it, an AI or agent verdict is advisory here`);
    const miss = (touch.needs || []).filter(k => ap[k] == null || ap[k] === '');
    if (miss.length) return row(false)(`${touch.id} approval lacks ${miss.join(', ')}`);
    return row(true)(`Kai ${touch.id}, ${ap.at}${(touch.needs || []).map(k => ` · ${k} ${ap[k]}`).join('')}${ap.note ? ' · ' + ap.note : ''}`);
  }
  if (!INDEPENDENT.test(ap.by || '')) return row(false)(`a process gate is approved by an independent reviewer (agent:<id> or person:<name>), not "${ap.by || 'nobody'}"`);
  if (ap.verdict !== 'READY') return row(false)(`reviewer ${ap.by} says ${ap.verdict || 'nothing'}, not READY`);
  return row(true)(`${ap.by} READY, ${ap.at}${ap.note ? ' · ' + ap.note : ''}`);
}

const BOOK = F('review/.fresh.json'), bookText = fs.existsSync(BOOK) ? fs.readFileSync(BOOK, 'utf8') : '';
let book = {};
try { book = bookText ? JSON.parse(bookText) : {}; if (!book || typeof book !== 'object' || Array.isArray(book)) throw new Error('not an object'); }
catch (e) { console.warn(`! review/.fresh.json is unreadable (${e.message}): treated as no record, rewritten on this run`); book = {}; }
const front = txt => Object.fromEntries((txt.match(/^(?:[a-z]+: .*\n)+/i)?.[0] || '').trim().split('\n').filter(Boolean).map(l => [l.split(':')[0].trim(), l.slice(l.indexOf(':') + 1).trim()]));

function checkGate(id) {
  const g = SPEC.gates[id]; if (!g) throw new Error(`no gate ${id} in GATES.json`);
  const ev = [...(g.evidence || []), ...(local[id]?.evidence || [])], runs = [...(g.run || []), ...(local[id]?.run || [])];
  const rows = [];
  for (const r of runs) {
    const args = r.args.map(a => a.replace('{film}', DIR));
    const p = spawnSync(process.execPath, [path.join(ROOT, 'styles/stick-man', r.tool), ...args], { encoding: 'utf8' });
    const last = (p.stdout || p.stderr || '').trim().split('\n').at(-1) || '';
    const what = `${path.basename(r.tool)} ${r.args.slice(1).join(' ')}`.trim(), why = p.status === 0 ? last : `exit ${p.status}: ${last}`;
    rows.push(r.advisory ? { kind: 'advisory', what, ok: true, why: `${p.status === 0 ? 'PASS' : 'advisory only'}: ${why}` } : { kind: 'measured', what, ok: p.status === 0, why });
  }
  // the film's run logs only grow (logline.mjs): one written over fails every gate until its lines are back
  const logs = checkLogs(DIR);
  rows.push({ kind: 'measured', what: 'run logs (logline.mjs --check)', ok: !logs.length, why: logs.length ? logs.map(x => x.why).join('; ') + '; fix: restore the lost lines, then append with logline.mjs' : 'append-only' });
  for (const e of ev) {
    const has = fs.existsSync(F(e.file));
    if (!has) { rows.push({ kind: e.by === 'independent' ? 'judged' : 'made', what: e.file, ok: false, why: `missing: ${e.why}` }); continue; }
    const txt = fs.readFileSync(F(e.file), 'utf8'), fm = front(txt), miss = [];
    for (const s of e.sections || []) if (!new RegExp(s, 'im').test(txt)) miss.push(`section /${s}/`);
    if ((e.minWords || 0) > txt.split(/\s+/).length) miss.push(`under ${e.minWords} words`);
    if (e.by === 'independent' && !/^agent:|^person:/i.test(fm.by || '')) miss.push(`"by:" must name an independent reviewer (agent:<id> or person:<name>), not "${fm.by || 'nobody'}"`);
    for (const n of e.newerThan || []) { const r = isFresh(DIR, e.file, n, book); if (!r.fresh) miss.push(r.why); }
    rows.push({ kind: e.by === 'independent' ? 'judged' : 'made', what: e.file, ok: !miss.length, why: miss.length ? miss.join('; ') : (fm.of ? `of ${fm.of}` : 'ok') });
    if (e.calibrated) { const c = calibration(fm.brief); rows.push({ kind: 'advisory', what: `${e.file} brief`, ok: true, why: c.ok ? `calibrated brief ${fm.brief}` : `advisory only: ${c.why}` }); }
  }
  rows.push(approvalRow(g, approvals[id], Math.max(0, ...ev.map(e => mtime(e.file)))));
  const part = k => rows.filter(r => r.kind === k).every(r => r.ok), ready = part('measured') && part('made') && part('judged');
  const state = ready && part('approved') ? 'LOCK' : ready ? (g.approver === 'kai' ? `READY FOR KAI ${g.touch}` : 'READY FOR REVIEW') : 'OPEN';
  return { id, title: g.title, state, rows, approver: g.approver === 'kai' ? `Kai at ${g.touch}` : 'an independent reviewer (verdict READY)' };
}

const ids = which === 'all' ? (SPEC.order || Object.keys(SPEC.gates)) : [which];
const res = ids.map(checkGate);
fs.mkdirSync(F('review'), { recursive: true });
const bookOut = JSON.stringify(book, null, 1) + '\n';
if (bookOut !== bookText && (bookText || Object.keys(book).length)) fs.writeFileSync(BOOK, bookOut);
const verdictOf = x => String(x.why).match(/^exit \d+: .*?\b(FAIL|PARTIAL)\b/)?.[1];
for (const r of res) {
  const md = [`# Gate ${r.id} · ${r.title}`, '', `**${r.state}**`, '', '| Kind | Evidence | OK | Why |', '| --- | --- | --- | --- |',
    ...r.rows.map(x => `| ${x.kind} | ${x.what} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.why).replace(/\|/g, '/')} |`), '',
    `measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = ${r.approver}. LOCK needs all four.`];
  fs.writeFileSync(F(`review/gate-${r.id}.md`), md.join('\n') + '\n');
  console.log(`◇${r.id} ${r.state.padEnd(16)} ${r.rows.filter(x => !x.ok).map(x => `${x.kind}:${x.what}${verdictOf(x) ? ` (${verdictOf(x)})` : ''}`).join(', ') || 'all evidence in'}`);
}
process.exit(res.every(r => r.state === 'LOCK') ? 0 : 1);
