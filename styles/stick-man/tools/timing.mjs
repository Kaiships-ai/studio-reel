// Shot-stage checks (◇4): timing that follows the beat instead of one default, and an acting brief for every acting shot.
//   node styles/stick-man/tools/timing.mjs films/<slug> [--reel reel.js]     -> review/timing.md, exit 1 on a FAIL
// Reads reel.js (motion v2 `anim`, after polish) and, when they exist, storyboard.json `shots` and review/acting.json
// (acting briefs).
// T1: share of moves with the same length per actor (polish's default T = 7 everywhere reads as a metronome)
// A5: shots of kind action / reaction need `acting: { think, do, change }` (non-empty text) before blocking (STAGE 3
//     [3.3a]), on the shot or in review/acting.json
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReel } from './reel_load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const argv = process.argv.slice(2), A = {}; const film = argv[0];
for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!film) { console.error('usage: timing.mjs films/<slug> [--reel reel.js]'); process.exit(2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
const out = [], add = (lvl, id, where, msg) => out.push({ lvl, id, where, msg });
const rows = [];
if (fs.existsSync(F(A.reel || 'reel.js'))) {
  const reel = await loadReel(DIR, A.reel || 'reel.js');
  const mod = await import(new URL(`file://${F(A.reel || 'reel.js')}?c=${Date.now()}`).href).catch(() => ({}));
  const CUTS = mod.CUTS || reel.CUTS || [];
  for (const [who, keys] of Object.entries(reel.anim || {})) {
    const moves = [];
    keys.forEach((k, i) => { const nx = keys[i + 1]; if (!nx || CUTS.includes(nx.f)) return;
      const len = nx.f - (k.f + (k.hold || 0)); if (len > 0) moves.push({ f: k.f, len }); });
    if (!moves.length) continue;
    const hist = {}; for (const m of moves) hist[m.len] = (hist[m.len] || 0) + 1;
    const [top, cnt] = Object.entries(hist).sort((a, b) => b[1] - a[1])[0], share = cnt / moves.length;
    rows.push({ who, n: moves.length, top: Number(top), share, hist });
    if (moves.length >= 6 && share > 0.5) add('WARN', 'T1', who, `${Math.round(share * 100)} % of ${moves.length} moves last exactly ${top} f: give each move the time its beat needs (t on the next key)`);
  }
} else add('WARN', 'T0', 'reel.js', 'no reel.js yet: timing is checked once blocking exists');
const SB = fs.existsSync(F('storyboard.json')) ? JSON.parse(fs.readFileSync(F('storyboard.json'), 'utf8')) : {};
// [3.3a] writes the briefs to review/acting.json (shot id -> { think, do, change }) so storyboard.json, which earlier
// gates hash, stays as locked; a brief on the shot itself still counts.
let BRIEFS = {};
if (fs.existsSync(F('review/acting.json'))) {
  try { BRIEFS = JSON.parse(fs.readFileSync(F('review/acting.json'), 'utf8')); } catch { BRIEFS = null; }
  if (!BRIEFS || typeof BRIEFS !== 'object' || Array.isArray(BRIEFS)) { add('FAIL', 'A5', 'review/acting.json', 'unreadable: it must be a JSON object, shot id -> { think, do, change }'); BRIEFS = {}; }
}
for (const s of SB.shots || []) if (['action', 'reaction'].includes(s.kind)) {
  const a = { ...BRIEFS[s.id], ...s.acting };   // a field on the shot wins over the same field in review/acting.json
  const miss = ['think', 'do', 'change'].filter(k => typeof a[k] !== 'string' || !a[k].trim());
  if (miss.length) add('FAIL', 'A5', s.id, `${s.kind} shot without an acting brief (${miss.join(', ')}): what the character thinks, does, and how it changes`);
}
const nF = out.filter(o => o.lvl === 'FAIL').length;
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(F('review/timing.md'), [`# Timing + acting check · ${path.basename(DIR)}`, '', `**${nF ? 'FAIL' : 'PASS'}**: ${nF} FAIL, ${out.length - nF} WARN`, '',
  '| Level | Check | Where | What |', '| --- | --- | --- | --- |', ...out.map(o => `| ${o.lvl} | ${o.id} | ${o.where} | ${o.msg} |`), '',
  '## Move lengths per actor', '', '| Actor | Moves | Most common | Share | All lengths (frames: count) |', '| --- | --- | --- | --- | --- |',
  ...rows.map(r => `| ${r.who} | ${r.n} | ${r.top} f | ${Math.round(r.share * 100)} % | ${Object.entries(r.hist).map(([k, v]) => `${k}:${v}`).join(' ')} |`)].join('\n') + '\n');
console.log(`review/timing.md: ${nF ? 'FAIL' : 'PASS'} · ${nF} FAIL, ${out.length - nF} WARN · ${rows.map(r => `${r.who} ${r.n} moves, ${Math.round(r.share * 100)} % at ${r.top} f`).join('; ')}`);
process.exit(nF ? 1 : 0);
