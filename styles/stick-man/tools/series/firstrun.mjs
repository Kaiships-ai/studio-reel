// The "80 % on the first run" bench: one row per episode in styles/stick-man/bench/first-run.tsv, counted from Kai's K2
// notes on v1 (the first round of review/retakes.json). v1 passes with at most 5 notes. Agent scores never count.
//   node styles/stick-man/tools/series/firstrun.mjs add films/<film> --rounds <to Post> --minutes <worked>   -> appends the row
//   node styles/stick-man/tools/series/firstrun.mjs check films/<film>    -> ◇1: every note kind of the previous episode has a check
// Every v1 note names its WHOCHECKS.json `kind` and kai-taste `root` (R1-R5); `add` refuses a note without them. A kind
// whose checker is still Kai fails `check` on the next episode: each note becomes a machine or AI check before it starts.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOTS } from '#tools/review/retakes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TSV = path.resolve(HERE, '../../bench/first-run.tsv');
export const HEADER = ['ep', 'v1 notes', 'pass/fail', 'notes by root R1-R5', 'by checker machine/AI/Kai-only', 'rounds to Post', 'minutes', 'kinds'];
export const LIMIT = 5;
const CHECKER = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(HERE, '../gates/WHOCHECKS.json'), 'utf8')).rows.map(r => [r.id, r.checker]));

export function row(ep, log, { rounds, minutes }, checker = CHECKER) {
  const v1 = log.rounds[0]?.id, notes = log.notes.filter(n => n.round === v1);
  if (!v1) throw new Error('retakes.json has no round: log Kai\'s K2 notes on v1 first');
  const bad = notes.filter(n => !checker[n.kind] || !ROOTS.includes(n.root)).map(n => n.id);
  if (bad.length) throw new Error(`notes without a WHOCHECKS kind or a root R1-R5: ${bad.join(' ')}`);
  const count = (key, vals) => vals.map(v => `${v} ${notes.filter(n => key(n) === v).length}`).join(' · ');
  return [ep, notes.length, notes.length <= LIMIT ? 'pass' : 'fail', count(n => n.root, ROOTS),
    count(n => checker[n.kind], ['machine', 'ai', 'kai']).replace(/\bai\b/, 'AI').replace(/\bkai\b/, 'Kai-only'),
    rounds, minutes, [...new Set(notes.map(n => n.kind))].join(' ')];
}

export function read(file = TSV) {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  if (lines.length && lines[0] !== HEADER.join('\t')) throw new Error(`${file}: header is not ${HEADER.join(' · ')}`);
  return lines.slice(1).map(l => Object.fromEntries(l.split('\t').map((v, i) => [HEADER[i], v])));
}

export function open(ep, rows, checker = CHECKER) {
  const prev = rows.filter(r => r.ep !== ep).at(-1);
  return prev ? { prev: prev.ep, kinds: (prev.kinds || '').split(' ').filter(k => k && checker[k] !== 'machine' && checker[k] !== 'ai') } : { prev: null, kinds: [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [verb, film] = process.argv.slice(2), arg = k => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const file = arg('tsv') ? path.resolve(arg('tsv')) : TSV;
  if (!['add', 'check'].includes(verb) || !film) { console.error('usage: firstrun.mjs add|check films/<film> [--rounds N --minutes M] [--tsv file]'); process.exit(2); }
  const ep = path.basename(path.resolve(film)), rows = read(file);
  if (verb === 'check') {
    const o = open(ep, rows);
    if (o.kinds.length) { console.log(`FAIL: ${o.prev} notes of kind ${o.kinds.join(', ')} still have no machine or AI check in WHOCHECKS.json; add one before ${ep}`); process.exit(1); }
    console.log(`PASS: ${o.prev ? `every note kind of ${o.prev} has a check` : 'no earlier episode on the bench'}`); process.exit(0);
  }
  const rounds = Number(arg('rounds')), minutes = Number(arg('minutes'));
  if (!Number.isInteger(rounds) || rounds < 1 || !Number.isFinite(minutes) || minutes <= 0) { console.error('add needs --rounds <int ≥ 1> and --minutes <worked minutes>'); process.exit(2); }
  if (rows.some(r => r.ep === ep)) { console.error(`${ep} already has a row: the bench is append-only`); process.exit(1); }
  const log = JSON.parse(fs.readFileSync(path.join(film, 'review/retakes.json'), 'utf8'));
  let r; try { r = row(ep, log, { rounds, minutes }); } catch (e) { console.error(e.message); process.exit(1); }
  if (!fs.existsSync(file)) fs.writeFileSync(file, HEADER.join('\t') + '\n');
  fs.appendFileSync(file, r.join('\t') + '\n');
  console.log(`${ep}: v1 ${r[1]} notes, ${r[2]} (limit ${LIMIT}) · ${r[4]}`);
  process.exit(r[2] === 'pass' ? 0 : 1);
}
