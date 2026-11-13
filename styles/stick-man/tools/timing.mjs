// Shot-stage checks (◇4): timing that follows the beat instead of one default, and an acting brief for every acting shot.
//   node styles/stick-man/tools/timing.mjs films/<slug> [--reel reel.js]     -> review/timing.md, exit 1 on a FAIL
// Reads reel.js (motion v2 `anim`, after polish) and, when it exists, storyboard.json `shots` (acting briefs).
// T1: share of moves with the same length per actor (polish's default T = 7 everywhere reads as a metronome)
// A5: shots of kind action / reaction need `acting: { think, do, change }` before blocking (STAGE 3 [3.3a])
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
for (const s of SB.shots || []) if (['action', 'reaction'].includes(s.kind)) {
  const a = s.acting || {};
  const miss = ['think', 'do', 'change'].filter(k => !a[k]);
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
