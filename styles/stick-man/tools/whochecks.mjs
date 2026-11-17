// Who checks each fault kind of a stick-man film (WHOCHECKS.json): a machine gate, the AI review at ◇5, or Kai.
//   node styles/stick-man/tools/whochecks.mjs                -> the registry is sound and SKILL.md shows it as generated; exit 1 otherwise
//   node styles/stick-man/tools/whochecks.mjs --write        -> rewrites the block in SKILL.md from the registry
//   node styles/stick-man/tools/whochecks.mjs map <map.json> -> every complaint in one cell, backed by its measured evidence
// map.json: { set, complaints: [{ id, row, evidence: [{ by: <registry tool> | "ai", result: "hit" | "miss" | "untested", on?, ref?, why?, seen? }] }] }
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), STYLE = path.resolve(HERE, '..');
export const REGISTRY = path.join(HERE, 'WHOCHECKS.json');
export const SKILL = path.resolve(HERE, '../../../.claude/skills/make-reel-stick-man/SKILL.md');
const BEGIN = '<!-- whochecks:begin (generated from styles/stick-man/tools/WHOCHECKS.json: node styles/stick-man/tools/whochecks.mjs --write) -->';
const END = '<!-- whochecks:end -->';
const CELLS = ['machine', 'ai', 'kai'], WHO = { machine: 'machine', ai: 'AI review', kai: 'Kai' };
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export function problems(reg, gates) {
  const out = [], seen = new Set();
  for (const r of reg.rows) {
    const row = `row ${r.id}`;
    if (seen.has(r.id)) out.push(`${row}: id used twice`); seen.add(r.id);
    if (!CELLS.includes(r.checker)) out.push(`${row}: checker "${r.checker}" is not one of ${CELLS.join(', ')}`);
    if (!r.fault || !r.limit || !r.source) out.push(`${row}: fault, limit and source are all needed`);
    for (const g of r.gates || []) if (!gates.gates[g]) out.push(`${row}: no gate ${g} in GATES.json`);
    if (r.checker === 'machine') {
      if (!fs.existsSync(path.join(STYLE, r.tool || ''))) out.push(`${row}: tool ${r.tool} is not in styles/stick-man/`);
      if (r.render ? r.gates.length : !r.gates.length) out.push(`${row}: a machine row runs at gates, or at every render with no gates`);
      for (const g of r.gates) if (!(gates.gates[g]?.run || []).some(x => `tools/${x.tool}` === r.tool)) out.push(`${row}: GATES.json gate ${g} does not run ${r.tool}`);
    }
    if (r.checker === 'ai') for (const g of r.gates) if (!(gates.gates[g]?.evidence || []).some(e => e.calibrated && e.file === r.tool)) out.push(`${row}: gate ${g} has no calibrated review ${r.tool}`);
    if (r.checker === 'kai' && r.tool) out.push(`${row}: a Kai row names no tool`);
  }
  return out;
}

const where = r => r.checker === 'kai' ? '' : `\`${path.basename(r.tool)}\``;
const at = r => r.render ? 'every render' : r.gates.map(g => `◇${g}`).join(' ');

export function render(reg, gates) {
  const cell = s => s.replace(/\|/g, '/');
  const table = ['| Kind | Fault | Who | Tool | Gate | Measured limit | Source |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...reg.rows.map(r => `| \`${r.id}\` | ${cell(r.fault)} | ${WHO[r.checker]} | ${where(r)} | ${at(r)} | ${cell(r.limit)} | ${cell(r.source)} |`)];
  const stops = [...(reg.rows.some(r => r.render) ? ['render'] : []), ...gates.order.filter(g => reg.rows.some(r => r.gates.includes(g)))];
  const ids = (s, c) => reg.rows.filter(r => r.checker === c && (s === 'render' ? r.render : r.gates.includes(s))).map(r => `\`${r.id}\``).join(', ');
  const byGate = stops.map(s => `- **${s === 'render' ? 'Every render' : `◇${s}`}**: ${CELLS.filter(c => ids(s, c)).map(c => `${c === 'kai' ? 'Kai watches' : WHO[c]} ${ids(s, c)}`).join(' · ')}.`);
  return [BEGIN, ...table, '', ...byGate, END].join('\n');
}

export function block(text) {
  const a = text.indexOf(BEGIN), b = text.indexOf(END);
  return a < 0 || b < a ? null : text.slice(a, b + END.length);
}

export function checkMap(reg, map) {
  const rows = new Map(reg.rows.map(r => [r.id, r])), out = [], cells = { machine: [], ai: [], kai: [] }, ids = new Set();
  for (const c of map.complaints) {
    if (ids.has(c.id)) out.push(`${c.id}: listed twice`); ids.add(c.id);
    const r = rows.get(c.row);
    if (!r) { out.push(`${c.id}: unmapped (row "${c.row}" is not in WHOCHECKS.json)`); continue; }
    const ev = c.evidence || [], mine = ev.filter(e => r.checker === 'ai' ? e.by === 'ai' : e.by === r.tool);
    if (r.checker === 'kai') for (const e of ev.filter(e => e.result === 'hit')) out.push(`${c.id}: on Kai, but ${e.by} caught it (${e.ref || e.on || 'no ref'})`);
    else {
      for (const e of mine.filter(e => e.result === 'miss')) out.push(`${c.id}: on ${r.checker} (${r.id}), but ${e.by} missed it (${e.ref || e.on || 'no ref'})`);
      if (!mine.some(e => e.result === 'hit' || (e.result === 'untested' && e.why))) out.push(`${c.id}: on ${r.checker} (${r.id}) with no measured hit from ${r.checker === 'ai' ? 'the AI trial' : r.tool}`);
    }
    for (const e of ev) if (!['hit', 'miss', 'untested'].includes(e.result)) out.push(`${c.id}: result "${e.result}" is not hit, miss or untested`);
    cells[r.checker].push(c.id);
  }
  return { problems: out, cells };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), reg = readJson(REGISTRY), gates = readJson(path.join(HERE, 'GATES.json'));
  if (args[0] === 'map' && args[1]) {
    const { problems: bad, cells } = checkMap(reg, readJson(args[1]));
    for (const c of CELLS) console.log(`${WHO[c]}\t${cells[c].length}\t${cells[c].join(' ')}`);
    for (const b of bad) console.log(`FAIL ${b}`);
    console.log(bad.length ? `FAIL: ${bad.length} problem(s)` : 'PASS: every complaint sits in one cell its evidence supports');
    process.exit(bad.length ? 1 : 0);
  }
  const bad = problems(reg, gates), want = render(reg, gates), text = fs.readFileSync(SKILL, 'utf8'), have = block(text);
  if (args.includes('--write') && !bad.length) {
    fs.writeFileSync(SKILL, have ? text.replace(have, want) : text);
    if (!have) bad.push(`SKILL.md has no block between ${BEGIN} and ${END}`);
  } else if (have !== want) bad.push('SKILL.md does not show WHOCHECKS.json as generated: run whochecks.mjs --write');
  for (const b of bad) console.log(`FAIL ${b}`);
  if (!bad.length) console.log(`PASS: ${reg.rows.length} rows, SKILL.md matches`);
  process.exit(bad.length ? 1 : 0);
}
