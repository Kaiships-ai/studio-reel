// Development checks (◇1, DEVELOP.md): the treatment has what a treatment must have, and every decision it sets is in
// DECISIONS.json with who approved it, so later stages can be checked against it (prepro.mjs D1).
//   node styles/stick-man/tools/develop.mjs films/<slug>        -> review/develop.md, exit 1 on a FAIL
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const film = process.argv[2];
if (!film) { console.error('usage: develop.mjs films/<slug>'); process.exit(2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
const out = [], add = (lvl, id, msg) => out.push({ lvl, id, msg });
const T = fs.existsSync(F('TREATMENT.md')) ? fs.readFileSync(F('TREATMENT.md'), 'utf8') : null;
// a section = a heading that matches, and the text up to the next heading of the same or higher level
function section(re) {
  if (!T) return null;
  const lines = T.split('\n'), i = lines.findIndex(l => /^#+ /.test(l) && re.test(l));
  if (i < 0) {                                   // also a bold lead-in paragraph: **Logline.** text …
    const b = lines.findIndex(l => /^\*\*/.test(l) && re.test(l.split('**')[1] || ''));
    if (b < 0) return null;
    const e = lines.findIndex((l, k) => k > b && !l.trim());
    return lines.slice(b, e < 0 ? undefined : e).join('\n').replace(/^\*\*[^*]*\*\*\s*/, '').trim();
  }
  const lvl = lines[i].match(/^#+/)[0].length, j = lines.findIndex((l, k) => k > i && /^#+ /.test(l) && l.match(/^#+/)[0].length <= lvl);
  return lines.slice(i + 1, j < 0 ? undefined : j).join('\n').trim();
}
if (!T) add('FAIL', 'T0', 'TREATMENT.md is missing');
else {
  const log = section(/logline/i);
  if (log == null) add('FAIL', 'T1', 'no "Logline" section');
  else {
    const first = log.split(/\n\n/)[0].replace(/[*_]/g, ''), n = first.split(/\s+/).length;
    if (n > 40) add('FAIL', 'T1', `the logline is ${n} words: one sentence, ≤ 40 words`);
    if (!/(must|has to|to |before|or )/i.test(first)) add('WARN', 'T1', 'the logline should name the goal and what is at stake (who must do what, before what, or else)');
  }
  const st = section(/(three|3) structures/i);
  if (st == null) add('FAIL', 'T2', 'no "Three structures" section');
  else {
    const rows = st.split('\n').filter(l => /^\|\s*S?\d|^\s*\d+\.|^- /.test(l));
    if (rows.length < 3) add('FAIL', 'T2', `${rows.length} structures compared (need 3)`);
    if (!/choice|chosen|em đề xuất|picked/i.test(T)) add('FAIL', 'T2', 'no structure is marked as the choice');
  }
  const bm = section(/benchmark/i);
  if (bm == null) add('FAIL', 'T3', 'no "Benchmark" section: 1-2 reference works, what to learn, what not to take (DIRECTOR.md §2)');
  else if (!/learn|học/i.test(bm) || !/(not|don't|không)/i.test(bm)) add('FAIL', 'T3', 'the benchmark must say what to learn and what not to take');
  const hk = section(/hook/i);
  if (hk == null) add('FAIL', 'T4', 'no "Hook" section with options');
  else if ((hk.match(/^\|\s*H\d|^\s*H\d|^- H\d/gm) || []).length < 2) add('WARN', 'T4', 'fewer than 2 hook options (H1, H2 …)');
  if (section(/(intensity|curve)/i) == null) add('FAIL', 'T5', 'no intended intensity curve (beats with a 1-10 story intensity and the climax)');
}
const D = fs.existsSync(F('DECISIONS.json')) ? JSON.parse(fs.readFileSync(F('DECISIONS.json'), 'utf8')) : null;
if (!D) add('FAIL', 'D0', 'DECISIONS.json is missing: list the decisions the treatment sets (DEVELOP.md section 5)');
else for (const d of D.decisions || []) {
  if (!d.id || !d.decision) add('FAIL', 'D0', `a decision without id or text: ${JSON.stringify(d).slice(0, 80)}`);
  if (!['approved', 'proposed', 'dropped'].includes(d.status)) add('FAIL', 'D0', `${d.id}: status must be approved, proposed or dropped`);
  if (d.status === 'approved' && d.by !== 'kai') add('FAIL', 'D0', `${d.id}: approved by "${d.by || '?'}", only Kai approves`);
}
const nF = out.filter(o => o.lvl === 'FAIL').length;
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(F('review/develop.md'), [`# Development check · ${path.basename(DIR)}`, '', `**${nF ? 'FAIL' : 'PASS'}**: ${nF} FAIL, ${out.length - nF} WARN`, '',
  '| Level | Check | What |', '| --- | --- | --- |', ...out.map(o => `| ${o.lvl} | ${o.id} | ${o.msg} |`), '', 'Fixes: DEVELOP.md section 6.'].join('\n') + '\n');
console.log(`review/develop.md: ${nF ? 'FAIL' : 'PASS'} · ${nF} FAIL, ${out.length - nF} WARN`);
process.exit(nF ? 1 : 0);
