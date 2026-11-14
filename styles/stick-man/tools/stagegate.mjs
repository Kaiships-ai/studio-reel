// Stage gates with evidence: a gate is LOCK only when (1) its measured checks pass, (2) the judged evidence exists, is
// fresh and was written by someone other than the maker, and (3) Kai approved it. Nothing here can be skipped quietly: a
// missing file, a stale file or a self-review is a FAIL with its reason. The gate list lives in GATES.json next to this
// tool (one entry per gate ◇1 … ◇6); a film may add its own `review/gates.local.json` (extra evidence, never fewer).
//   node styles/stick-man/tools/stagegate.mjs films/<slug> 2a          -> review/gate-2a.md, exit 1 unless LOCK
//   node styles/stick-man/tools/stagegate.mjs films/<slug> all         -> every gate's state, one line each
// Evidence front matter (first lines of a markdown file):  by: agent:<id> | kai | self   ·   of: <what was reviewed + version>
// Freshness (`newerThan`): a review goes stale when what it judged changed, by a content hash of the JSON fields a viewer
// sees or hears (fresh.mjs; record in review/.fresh.json). Non-JSON targets fall back to mtime.
import { isFresh } from './fresh.mjs';
import fs from 'node:fs'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const [film, which = 'all'] = process.argv.slice(2);
if (!film) { console.error('usage: stagegate.mjs films/<slug> <1|2a|2b|2c|3|4|5|6|all>'); process.exit(2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
const SPEC = JSON.parse(fs.readFileSync(path.join(HERE, 'GATES.json'), 'utf8'));
const local = fs.existsSync(F('review/gates.local.json')) ? JSON.parse(fs.readFileSync(F('review/gates.local.json'), 'utf8')) : {};
const approvals = fs.existsSync(F('review/approvals.json')) ? JSON.parse(fs.readFileSync(F('review/approvals.json'), 'utf8')) : {};
const mtime = p => fs.existsSync(F(p)) ? fs.statSync(F(p)).mtimeMs : 0;
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
    const p = spawnSync(process.execPath, [path.join(HERE, r.tool), ...args], { encoding: 'utf8' });
    const last = (p.stdout || p.stderr || '').trim().split('\n').at(-1) || '';
    rows.push({ kind: 'measured', what: `${r.tool} ${r.args.slice(1).join(' ')}`.trim(), ok: p.status === 0, why: p.status === 0 ? last : `exit ${p.status}: ${last}` });
  }
  for (const e of ev) {
    const has = fs.existsSync(F(e.file));
    if (!has) { rows.push({ kind: e.by === 'independent' ? 'judged' : 'made', what: e.file, ok: false, why: `missing: ${e.why}` }); continue; }
    const txt = fs.readFileSync(F(e.file), 'utf8'), fm = front(txt), miss = [];
    for (const s of e.sections || []) if (!new RegExp(s, 'im').test(txt)) miss.push(`section /${s}/`);
    if ((e.minWords || 0) > txt.split(/\s+/).length) miss.push(`under ${e.minWords} words`);
    if (e.by === 'independent' && !/^agent:|^person:/i.test(fm.by || '')) miss.push(`"by:" must name an independent reviewer (agent:<id> or person:<name>), not "${fm.by || 'nobody'}"`);
    for (const n of e.newerThan || []) { const r = isFresh(DIR, e.file, n, book); if (!r.fresh) miss.push(r.why); }
    rows.push({ kind: e.by === 'independent' ? 'judged' : 'made', what: e.file, ok: !miss.length, why: miss.length ? miss.join('; ') : (fm.of ? `of ${fm.of}` : 'ok') });
  }
  const ap = approvals[id];
  const newest = Math.max(0, ...ev.map(e => mtime(e.file)));
  const apOk = ap && ap.by === 'kai' && Date.parse(ap.at) >= newest - 1000;
  rows.push({ kind: 'approved', what: 'review/approvals.json', ok: !!apOk, why: !ap ? 'Kai has not approved this gate' : !apOk ? 'approved before the latest evidence changed: ask again' : `Kai, ${ap.at}${ap.note ? ' · ' + ap.note : ''}` });
  const part = k => rows.filter(r => r.kind === k).every(r => r.ok);
  const state = part('measured') && part('made') && part('judged') && part('approved') ? 'LOCK' : part('measured') && part('made') && part('judged') ? 'READY FOR KAI' : 'OPEN';
  return { id, title: g.title, state, rows };
}

const ids = which === 'all' ? (SPEC.order || Object.keys(SPEC.gates)) : [which];
const res = ids.map(checkGate);
fs.mkdirSync(F('review'), { recursive: true });
const bookOut = JSON.stringify(book, null, 1) + '\n';
if (bookOut !== bookText && (bookText || Object.keys(book).length)) fs.writeFileSync(BOOK, bookOut);
for (const r of res) {
  const md = [`# Gate ${r.id} · ${r.title}`, '', `**${r.state}**`, '', '| Kind | Evidence | OK | Why |', '| --- | --- | --- | --- |',
    ...r.rows.map(x => `| ${x.kind} | ${x.what} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.why).replace(/\|/g, '/')} |`), '',
    'measured = tools · made = the maker\'s files · judged = an independent reviewer · approved = Kai. LOCK needs all four.'];
  fs.writeFileSync(F(`review/gate-${r.id}.md`), md.join('\n') + '\n');
  console.log(`◇${r.id} ${r.state.padEnd(13)} ${r.rows.filter(x => !x.ok).map(x => `${x.kind}:${x.what}`).join(', ') || 'all evidence in'}`);
}
process.exit(res.every(r => r.state === 'LOCK') ? 0 : 1);
