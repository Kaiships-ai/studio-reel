// Script checker (SCRIPT.md, gate ◇S): what a tool can see in a script before anyone draws it.
//   node styles/stick-man/tools/scriptlint.mjs films/<slug> [--script vo/script.json] [--beats vo/beats.json]
//        [--facts vo/facts.json] [--wps 3.1] [--ref <reference transcript.txt> ...] [--out review/scriptlint.md]
// Reads the script, the beat outline (vo/beats.json), the fact sheet (vo/facts.json), DECISIONS.json (maxSec) and,
// when a line has no `class`, storyboard.json `lines`. Writes a report; exit 1 on a FAIL. Fixes: SCRIPT.md section 6.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const argv = process.argv.slice(2), film = argv[0];
if (!film) { console.error('usage: scriptlint.mjs films/<slug> [--script p] [--beats p] [--facts p] [--wps n] [--ref p ...] [--out p]'); process.exit(2); }
const opt = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const refs = argv.flatMap((a, i) => a === '--ref' ? [argv[i + 1]] : []);
const DIR = path.resolve(ROOT, film), F = p => path.resolve(DIR, p);
const J = p => fs.existsSync(F(p)) ? JSON.parse(fs.readFileSync(F(p), 'utf8')) : null;
const scriptPath = opt('--script', 'vo/script.json'), S = J(scriptPath);
if (!S) { console.error(`no ${scriptPath}`); process.exit(2); }
const B = J(opt('--beats', 'vo/beats.json')), FA = J(opt('--facts', 'vo/facts.json'));
const D = J('DECISIONS.json'), SB = J('storyboard.json');
const WPS = +opt('--wps', S.wps || 3.1), PAUSE = 0.35;
const out = [], add = (lvl, id, where, msg) => out.push({ lvl, id, where, msg });

const lines = (S.lines || []).filter(l => (l.text || '').trim());
const byId = Object.fromEntries(lines.map((l, i) => [l.id, { ...l, i }]));
const words = t => (t.match(/[A-Za-z0-9$][A-Za-z0-9'’,.$%-]*/g) || []).map(w => w.replace(/[.,]+$/, ''));
const sbClass = Object.fromEntries((SB?.lines || []).map(l => [l.id, l.class]));
const ACTION = new Set(['action', 'reaction', 'twist']);

// time per line (estimate at the plan pace)
let t = 0;
lines.forEach((l, i) => (l.i = i));
for (const l of lines) { l.w = words(l.text).length; l.t0 = t; l.dur = l.w / WPS + PAUSE; t += l.dur; l.cls = l.class || sbClass[l.id] || null; }
const total = t;
// the measured pace of a recorded take, when review/script_timed.txt ("  12.3s L05 text") covers these lines
let measured = null;
if (fs.existsSync(F('review/script_timed.txt'))) {
  const rows = fs.readFileSync(F('review/script_timed.txt'), 'utf8').split('\n').map(r => r.match(/^\s*([\d.]+)s\s+(L\d+)\s+(.*)$/)).filter(Boolean);
  const same = rows.length === lines.length && rows.every((r, i) => r[2] === lines[i].id && r[3].trim() === lines[i].text.trim());
  if (same) { const last = +rows[rows.length - 1][1] + lines[lines.length - 1].w / 3.4; measured = { sec: last, wps: lines.reduce((a, l) => a + l.w, 0) / last }; }
}

// numbers: groups of number words or digits; labels (Problem one, Rule one, Day two, episode two) are not numbers
const NUM = /^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half|dozen|[$]?\d[\d,.]*%?|(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine))$/i;
const LABEL = /^(problem|rule|day|episode|part|step|bag|unit|room|door|level)$/i;
function numbers(text) {
  const w = text.replace(/[^A-Za-z0-9$%,.' -]/g, ' ').split(/\s+/).filter(Boolean).map(x => x.replace(/[.,]+$/, ''));
  const groups = []; let cur = null;
  for (let i = 0; i < w.length; i++) {
    const x = w[i], isNum = NUM.test(x), glue = cur && /^(and|a)$/i.test(x) && NUM.test(w[i + 1] || '');
    const aBig = /^a$/i.test(x) && /^(hundred|thousand|million|billion|dozen)$/i.test(w[i + 1] || '');
    if (isNum || glue || aBig) { (cur ||= []).push(x); continue; }
    if (cur) groups.push(cur), cur = null;
  }
  if (cur) groups.push(cur);
  return groups.filter(g => {
    const i0 = w.indexOf(g[0]), prev = w[i0 - 1] || '';
    if (LABEL.test(prev) && g.length === 1) return false;                 // Problem one, Day two
    if (g.length === 1 && /^one$/i.test(g[0])) return false;             // "one at a time", "spend one"
    return true;
  }).map(g => g.join(' ').toLowerCase());
}

// ---- S1 sentences and words
for (const l of lines) for (const s of l.text.split(/(?<=[.?!])\s+/)) {
  const n = words(s).length;
  if (n > 15) add('FAIL', 'S1', l.id, `a sentence of ${n} words (≤ 15, one idea): "${s.slice(0, 60)}…"`);
}
// ---- S2 numbers for the ear
const said = new Set();
for (const l of lines) {
  const fresh = numbers(l.text).filter(n => !said.has(n));
  numbers(l.text).forEach(n => said.add(n));
  l.nums = fresh;
  if (l.math) continue;
  if (fresh.length >= 3) add('FAIL', 'S2', l.id, `${fresh.length} new numbers in one line (${fresh.join(' · ')}): the ear keeps one; show the sum, say the result`);
  else if (fresh.length === 2 && l.i > 0) add('WARN', 'S2', l.id, `2 new numbers (${fresh.join(' · ')}): keep one, or mark the line \`math: true\` if it is the one sum the picture carries`);
}
// ---- S3 the clock keeps running: no long run without an action by "you"
const noCls = lines.filter(l => !l.cls);
if (noCls.length) add('WARN', 'S3', noCls.map(l => l.id).slice(0, 8).join(' '), 'lines without a `class` (action, reaction, twist, fact, number, compare, rule, recap, CTA): the run check guesses');
let run = [];
const flush = () => {
  if (!run.length) return;
  const sec = run.reduce((a, l) => a + l.dur, 0), last = run[run.length - 1];
  if ((run.length > 2 || sec > 8) && last.cls !== 'CTA' && !run.every(l => /recap|CTA|compare/.test(l.cls || '')))
    add('FAIL', 'S3', `${run[0].id}–${last.id}`, `${run.length} lines, ${sec.toFixed(1)} s with no action by "you" (≤ 2 lines, ≤ 8 s): the clock stops; let a fact land while you act`);
  run = [];
};
for (const l of lines) { const act = l.cls ? ACTION.has(l.cls) : /\byou(?:'re)?\b.*\b(run|grab|drag|lift|carry|drive|squeeze|load|wear|split|open|push|press)/i.test(l.text); act ? flush() : run.push(l); }
flush();
// ---- S4 length against the approved maximum
const maxSec = (D?.decisions || []).filter(d => d.status === 'approved').flatMap(d => d.check || []).find(c => c.type === 'maxSec')?.sec;
const nWords = lines.reduce((a, l) => a + l.w, 0);
const at = w => nWords / w + PAUSE * lines.length;
if (maxSec && total > maxSec) add('FAIL', 'S4', 'whole script', `${nWords} words ≈ ${total.toFixed(1)} s at ${WPS} words/s (max ${maxSec} s): cut ${Math.ceil((total - maxSec) * WPS)} words${measured ? `; the recorded take fits only by reading at ${measured.wps.toFixed(2)} words/s with pauses (≈ ${measured.sec.toFixed(1)} s)` : ''}`);
else if (maxSec && at(2.9) > maxSec) add('WARN', 'S4', 'whole script', `${nWords} words fit ${maxSec} s at ${WPS} w/s but not at a calm 2.9 (${at(2.9).toFixed(1)} s)`);
// ---- S5 hook
const L1 = lines[0];
if (L1) {
  if (L1.w < 6 || L1.w > 15) add('FAIL', 'S5', L1.id, `the hook line is ${L1.w} words (6-15, said in ≤ 4 s)`);
  if (/\b(someone|somebody|they|them|it|he|she)\b/i.test(L1.text)) add('FAIL', 'S5', L1.id, 'a vague pronoun in the hook (someone / they / it before the viewer has seen who)');
  if (/\bwake(s)? up\b/i.test(L1.text)) add('FAIL', 'S5', L1.id, 'opens with waking up');
}
// ---- S6 natural voice
const FORMULA = /\b(your move\??|here'?s the thing|let that sink in|but wait|you won'?t believe|in the nick of time|getaway car|at a snail'?s pace)\b/i;
for (const l of lines) {
  if (/[—–]/.test(l.text)) add('FAIL', 'S6', l.id, 'a dash in the voiceover: say it as two sentences');
  if (FORMULA.test(l.text)) add('FAIL', 'S6', l.id, `formula line or idiom: "${l.text.match(FORMULA)[0]}"`);
  const caps = (l.text.match(/\b[A-Z]{2,}\b/g) || []).filter(w => !/^(I|OK|TV|ID|ATM|FBI|CIA|USA|US|AM|PM)$/.test(w));
  if (caps.length) add('WARN', 'S6', l.id, `ALL CAPS in the voiceover (${caps.join(' ')}): put it on screen, not in the voice`);
  if (/\bNo \w+\. No \w+\./.test(l.text)) add('FAIL', 'S6', l.id, 'a fragment list ("No X. No Y.")');
}
// ---- S7 beats: cause and effect between beats
const LINK = /^(but|so|therefore|except)$/i;
if (!B) add('FAIL', 'S7', 'vo/beats.json', 'no beat outline: write the beats with want / obstacle / outcome and the link to the beat before (SCRIPT.md [1.1a])');
else {
  const seen = new Map();
  (B.beats || []).forEach((b, k) => {
    for (const id of b.lines || []) { if (!byId[id]) add('FAIL', 'S7', b.id, `line ${id} is not in the script`); seen.set(id, (seen.get(id) || 0) + 1); }
    if (k === 0) return;
    if (!LINK.test(b.link || '')) add('FAIL', 'S7', b.id, `joined to the beat before by "${b.link || 'nothing'}": a beat follows by "but" or "so", never "and then" (${b.name || ''})`);
    else if (!(b.because || '').trim() || /^\?/.test(b.because)) add('FAIL', 'S7', b.id, `"${b.link}" with no cause: what in the beat before makes this happen? (${b.name || ''})`);
    for (const k2 of ['want', 'obstacle', 'outcome']) if (!(b[k2] || '').trim() && !/vote|cta/i.test(b.kind || '')) add('WARN', 'S7', b.id, `no ${k2}`);
  });
  for (const l of lines) { const n = seen.get(l.id) || 0; if (n !== 1) add('FAIL', 'S7', l.id, n ? `in ${n} beats` : 'in no beat'); }
  // ---- S8 plants and payoffs
  for (const p of B.plants || []) {
    if (!byId[p.set]) add('FAIL', 'S8', p.id, `set in ${p.set}, which is not a script line`);
    if (!p.paid) add('FAIL', 'S8', p.id, `"${p.what}" is set up (${p.set}) and never paid off: use it or cut it`);
    else if (/^ep/i.test(p.paid)) add('INFO', 'S8', p.id, `"${p.what}" pays off in ${p.paid} (series plant)`);
    else if (!byId[p.paid]) add('FAIL', 'S8', p.id, `paid in ${p.paid}, which is not a script line`);
    else if (byId[p.paid].i <= byId[p.set]?.i) add('FAIL', 'S8', p.id, `paid (${p.paid}) before it is set (${p.set})`);
  }
  const V = B.vote;
  if (V) {
    const vl = (V.lines || []).map(id => byId[id]?.text || '').join(' ').toLowerCase();
    for (const o of V.options || []) {
      if (!vl.includes(o.word.toLowerCase())) add('FAIL', 'S8', 'vote', `the option "${o.word}" is not said in the vote lines`);
      const c = (B.plants || []).find(p => p.id === o.cost);
      if (!c) add('FAIL', 'S8', 'vote', `"${o.word}" has no planted cost (R8: both choices cost something, both set up)`);
    }
  }
  // ---- S9 recap: one human detail
  const rc = (B.beats || []).find(b => /recap/i.test(b.kind || b.name || ''));
  if (rc) {
    if (!(rc.human || '').trim()) add('WARN', 'S9', rc.id, 'the recap has numbers but no human detail (K2)');
    else { const txt = (rc.lines || []).map(id => byId[id]?.text || '').join(' ').toLowerCase(); const key = rc.human.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (!key.some(w => txt.includes(w))) add('FAIL', 'S9', rc.id, `the human detail "${rc.human}" is not in the recap lines`); }
  }
}
// ---- S10 facts
if (!FA) add('FAIL', 'S10', 'vo/facts.json', 'no fact sheet (SCRIPT.md [1.1b])');
else {
  const fs_ = FA.facts || [];
  if (fs_.length < 4 || fs_.length > 6) add('WARN', 'S10', 'facts', `${fs_.length} real facts (K1: 4-6 per episode)`);
  for (const f of fs_) {
    if (!(f.lines || []).length || f.lines.some(id => !byId[id])) add('FAIL', 'S10', f.id, `lines ${JSON.stringify(f.lines)} are not all script lines`);
    if (!/^https?:/.test(f.source?.url || '')) add('FAIL', 'S10', f.id, 'no source URL');
    if (!(f.check || '').trim()) add('WARN', 'S10', f.id, 'no recomputation / check note');
    if (!(f.move || '').trim()) add('WARN', 'S10', f.id, 'not tied to a move by "you" (K1: a fact on its own is a lecture)');
  }
  const starts = fs_.map(f => byId[f.lines?.[0]]).filter(Boolean).sort((a, b) => a.i - b.i);
  for (let k = 1; k < starts.length; k++) { const gap = starts[k].t0 - starts[k - 1].t0;
    if (gap > 25) add('WARN', 'S10', `${starts[k - 1].id}→${starts[k].id}`, `${gap.toFixed(0)} s between facts (K1: one every 10-15 s)`); }
}
// ---- S11 no copied sentences (n-gram against the reference transcripts)
if (!refs.length && !(S.refs || []).length) add('WARN', 'S11', 'refs', 'no reference transcript given (--ref): the copy check did not run');
for (const r of [...refs, ...(S.refs || [])]) {
  const rp = path.resolve(ROOT, r); if (!fs.existsSync(rp)) { add('WARN', 'S11', r, 'reference transcript not found'); continue; }
  const rw = fs.readFileSync(rp, 'utf8').toLowerCase().match(/[a-z0-9']+/g) || [], grams = new Set();
  for (let i = 0; i + 6 <= rw.length; i++) grams.add(rw.slice(i, i + 6).join(' '));
  for (const l of lines) { const w = l.text.toLowerCase().match(/[a-z0-9']+/g) || [];
    for (let i = 0; i + 6 <= w.length; i++) if (grams.has(w.slice(i, i + 6).join(' '))) { add('FAIL', 'S11', l.id, `6 words in a row match ${path.basename(r)}: "${w.slice(i, i + 6).join(' ')}"`); break; } }
}

const nF = out.filter(o => o.lvl === 'FAIL').length, nW = out.filter(o => o.lvl === 'WARN').length;
const rep = [`# Script check · ${path.basename(DIR)} · ${scriptPath}`, '',
  `**${nF ? 'FAIL' : 'PASS'}**: ${nF} FAIL, ${nW} WARN · ${lines.length} lines, ${nWords} words, ≈ ${total.toFixed(1)} s at ${WPS} words/s${maxSec ? ` (max ${maxSec} s)` : ''}`, '',
  '| Level | Check | Where | What |', '| --- | --- | --- | --- |', ...out.map(o => `| ${o.lvl} | ${o.id} | ${o.where} | ${o.msg.replace(/\|/g, '/')} |`), '',
  '## Lines', '', '| Line | t (s) | Words | Class | New numbers | Text |', '| --- | --- | --- | --- | --- | --- |',
  ...lines.map(l => `| ${l.id} | ${l.t0.toFixed(1)} | ${l.w} | ${l.cls || '?'} | ${l.nums.join(' · ')} | ${l.text.replace(/\|/g, '/')} |`), '',
  'Fixes: SCRIPT.md section 6.'].join('\n') + '\n';
const outP = F(opt('--out', 'review/scriptlint.md'));
fs.mkdirSync(path.dirname(outP), { recursive: true }); fs.writeFileSync(outP, rep);
console.log(`${nF ? 'FAIL' : 'PASS'} ${nF} FAIL ${nW} WARN · ${nWords} words ≈ ${total.toFixed(1)} s → ${path.relative(ROOT, outP)}`);
process.exit(nF ? 1 : 0);
