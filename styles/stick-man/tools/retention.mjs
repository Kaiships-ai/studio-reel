// Publish + learn (stage 5): the platform's audience-retention curve mapped onto the shots, so a drop-off becomes a shot id
// and a cause (DIAGNOSE.md), not a feeling.
//   node styles/stick-man/tools/retention.mjs films/<slug> --csv review/retention-24h.csv [--label 24h]
// CSV: one row per point, "t,pct" (seconds from start, % of viewers still watching), read off the platform's analytics
// (Kai's screenshot transcribed, or an export). Writes review/retention.md (appends a section per label).
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFilm } from './shotlist.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const argv = process.argv.slice(2), A = {}; const film = argv[0];
for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!film || !A.csv) { console.error('usage: retention.mjs films/<slug> --csv <file> [--label 24h]'); process.exit(2); }
const DIR = path.resolve(ROOT, film);
const { shots, fps, F } = loadFilm(DIR);
const pts = fs.readFileSync(path.resolve(DIR, A.csv), 'utf8').trim().split('\n').filter(l => /^\s*[\d.]/.test(l)).map(l => l.split(',').map(Number)).sort((a, b) => a[0] - b[0]);
const at = t => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, p0] = pts[i - 1], [t1, p1] = pts[i]; return p0 + (p1 - p0) * (t - t0) / (t1 - t0); } return pts.at(-1)[1]; };
const rows = shots.map(s => { const a = s.a / fps, b = s.b / fps, d = at(a) - at(b); return { id: s.id, a, b, lost: d, rate: d / Math.max(0.1, b - a), purpose: s.purpose || '' }; });
const end = shots.at(-1).b / fps, half = pts.find(p => p[1] <= 50)?.[0];
const avg = (() => { let s = 0; const n = 200; for (let i = 0; i < n; i++) s += at(end * (i + 0.5) / n); return s / n; })();
const worst = [...rows].sort((x, y) => y.rate - x.rate).slice(0, 5);
const label = A.label || path.basename(A.csv, '.csv');
const md = [`## Retention · ${label}`, '', `Average watched ≈ ${avg.toFixed(0)} % · still watching at the end ${at(end).toFixed(0)} %${half != null ? ` · half gone by ${half.toFixed(1)} s` : ''}`, '',
  'Steepest drops (viewers lost per second of shot): run DIAGNOSE.md on each, starting from the top.', '',
  '| Shot | Time | Lost | Per second | Purpose |', '| --- | --- | --- | --- | --- |',
  ...worst.map(r => `| ${r.id} | ${r.a.toFixed(1)}–${r.b.toFixed(1)} s | ${r.lost.toFixed(1)} pts | ${r.rate.toFixed(2)} | ${r.purpose.replace(/\|/g, '/')} |`), ''];
const file = F('review/retention.md');
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(file, (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# Retention by shot\n\n') + md.join('\n') + '\n');
console.log(`review/retention.md: ${label} · avg ${avg.toFixed(0)} % · worst ${worst.slice(0, 3).map(r => `${r.id} (${r.rate.toFixed(2)}/s)`).join(', ')}`);
