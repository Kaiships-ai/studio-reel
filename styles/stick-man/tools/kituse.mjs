// Kit use (◇4, ◇5): a film uses the kit features every stick-man film needs, or waives one on record. One row per
// feature in KIT; a waiver is an approved DECISIONS.json entry { "waives": "<id>", "by": "kai", "at": "<date>",
// "status": "approved", "decision": "<why>" }, so an old film opts out on record and never by silence.
//   node styles/stick-man/tools/kituse.mjs films/<slug> [--gate 4|5]     -> review/kituse.md, exit 1 when a feature is missing
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReel } from './reel_load.mjs';
import { finalRender } from './renders.mjs';
import { STYLE_PRESETS } from '../engine/motion.js';
import { loadBench, gapTable, tableMarkdown } from './refbench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const BENCH = path.join(HERE, '../bench');

const lifeOf = st => typeof st === 'string' ? STYLE_PRESETS[st]?.life : st?.life;
const setCallsBackdrop = mod => { const f = mod && path.join(ROOT, mod); return !!f && fs.existsSync(f) && /\bbackdrop\s*\(/.test(fs.readFileSync(f, 'utf8')); };
const list = names => names.length > 4 ? `${names.slice(0, 4).join(', ')} and ${names.length - 4} more` : names.join(', ');

export const KIT = [
  { id: 'life', gates: ['4', '5'], step: '[2.1] [3.4]', what: 'moving hold: every act sets the style dial `life` above 0',
    check: f => { const off = f.acts.filter(a => !(lifeOf(a.style) > 0)).map(a => a.name || '?');
      return off.length ? `${off.length} of ${f.acts.length} acts set no \`life\` (${list(off)}): give each act style { ...STYLE_PRESETS.kaiships, life: 0.75 }` : null; } },
  { id: 'depth', gates: ['4', '5'], step: '[1.2] [2.2] [3.4b]', what: 'far backdrop rows behind the set: an act `backdrop: { rows, tint }` or a set that calls backdrop()',
    check: f => f.acts.some(a => a.backdrop?.rows?.length || setCallsBackdrop(a.setModule)) ? null
      : `no act has \`backdrop: { rows, tint }\` and no set calls backdrop() (${f.acts.length} acts): place the far town rows per set (stick-man-depth.md)` },
  { id: 'sound-plan', gates: ['5'], step: '[4.0]', what: '`audio/sound-plan.json`: bed, foley and music state per scene',
    check: f => f.has('audio/sound-plan.json') ? null : 'audio/sound-plan.json is missing (SKILL.md [4.0])' },
  { id: 'music', gates: ['5'], step: '[1.6p] [4.1]', what: 'mixed by the kit mixer, music from a fitted kit track named in CREDITS',
    check: f => {
      const lv = f.read('audio/levels.txt');
      if (!lv) return 'audio/levels.txt is missing: mix with styles/stick-man/tools/mix.py';
      if (!lv.includes('kit mixer styles/stick-man/tools/mix.py')) return 'audio/levels.txt was not written by the kit mixer (styles/stick-man/tools/mix.py)';
      const src = lv.match(/^voice: .*?;\s+music: (.*?);\s+ambience:/m)?.[1] || 'none';
      const files = src.match(/^track (.+?)(?:, \d+ segments| \(--music\))/)?.[1].split(' + ').map(x => path.basename(x));
      if (!files) return `music source is "${src}": fit a track from sound/RESEARCH.md with sound_fit.py (a placed stem or none hides where the music came from)`;
      const credits = f.read('CREDITS') || '', unnamed = files.filter(x => !credits.includes(x.replace(/\.[^.]+$/, '')));
      return unnamed.length ? `music ${unnamed.join(', ')} is not named in CREDITS` : null;
    } },
  { id: 'refbench', gates: ['5'], step: '[4.4] ◇5', what: '`review/refbench.json`: the Rick bench row of the final mp4',
    check: f => {
      if (!f.final) return 'no final render in renders/ to bench';
      const row = f.json('review/refbench.json'), cmd = `node styles/stick-man/tools/refbench.mjs films/${f.slug}/renders/${f.final} --stems films/${f.slug}/audio/stems --out films/${f.slug}/review/refbench.json`;
      if (!row) return `review/refbench.json is missing: ${cmd}`;
      if (row.source !== f.final) return `review/refbench.json measures ${row.source}, not the final ${f.final}: ${cmd}`;
      return f.mtime('review/refbench.json') < f.mtime(`renders/${f.final}`) ? `review/refbench.json is older than ${f.final}: ${cmd}` : null;
    } },
];

export function waiverFor(decisions, id) {
  return (decisions?.decisions || []).find(d => d.waives === id && d.status === 'approved' && d.by && Number.isFinite(Date.parse(d.at)));
}

export async function kitUse(dir, gate) {
  const F = p => path.join(dir, p), has = p => fs.existsSync(F(p)), read = p => has(p) ? fs.readFileSync(F(p), 'utf8') : null;
  const json = p => has(p) ? JSON.parse(read(p)) : null, acts = [];
  for (const r of ['reel.js', 'reel2.js']) if (has(r)) { const R = await loadReel(dir, r); acts.push(...(R.acts || [R])); }
  const film = { slug: path.basename(dir), acts, has, read, json, final: finalRender(F('renders')), mtime: p => has(p) ? fs.statSync(F(p)).mtimeMs : 0 };
  const decisions = json('DECISIONS.json');
  return KIT.filter(k => k.gates.includes(gate)).map(k => {
    const miss = k.check(film), w = miss && waiverFor(decisions, k.id);
    return { id: k.id, step: k.step, what: k.what, ok: !miss || !!w, why: !miss ? 'in use' : w ? `waived: ${w.id || '?'} by ${w.by}, ${w.at} · ${w.decision || ''}` : miss };
  });
}

export function benchTable(dir) {
  const row = JSON.parse(fs.readFileSync(path.join(dir, 'review/refbench.json'), 'utf8'));
  return tableMarkdown(gapTable({ ...loadBench(BENCH), ours: [row] }), [row.id]);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), film = args[0], gi = args.indexOf('--gate'), gate = gi >= 0 ? args[gi + 1] : '5';
  if (!film || film.startsWith('-') || !['4', '5'].includes(gate)) { console.error('usage: kituse.mjs films/<slug> [--gate 4|5]'); process.exit(2); }
  const dir = path.resolve(ROOT, film);
  if (!fs.existsSync(path.join(dir, 'reel.js'))) { console.error(`${film}: no reel.js`); process.exit(2); }
  const rows = await kitUse(dir, gate), bad = rows.filter(r => !r.ok);
  const bench = gate === '5' && rows.find(r => r.id === 'refbench')?.why === 'in use' ? ['', '## Rick bench, final vs Rick', '', benchTable(dir)] : [];
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'review/kituse.md'), [`# Kit use · ${path.basename(dir)} · ◇${gate}`, '', `**${bad.length ? 'FAIL' : 'PASS'}**`, '',
    '| Feature | Step | OK | Why |', '| --- | --- | --- | --- |', ...rows.map(r => `| ${r.id} | ${r.step} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.why.replace(/\|/g, '/')} |`),
    '', 'A feature a film does not use needs an approved DECISIONS.json entry with `waives: <feature>`, `by` and `at`.', ...bench].join('\n') + '\n');
  for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id.padEnd(10)} ${r.why}`);
  console.log(`review/kituse.md: ${bad.length ? `FAIL · missing ${bad.map(r => r.id).join(', ')}` : 'PASS'}`);
  process.exit(bad.length ? 1 : 0);
}
