// The face sheet Kai approves before a film shows a new face (Hot Money ep01 r5, 19/11: a fix round swapped the hero's
// faces for a new set, Kai saw them first in the film, "xấu thậm tệ", and they were rolled back). A face design is an
// expression name and the numbers it draws with (engine/faces.js designKey, in the dbg rows as actors[n].exprDesign).
//   node styles/stick-man/tools/facesheet.mjs films/<slug> [--rows review/shot-rows.jsonl] [--h 1920]
//        -> review/face-sheet.json (each design held on a readable head, with the frame that shows it largest) and
//           review/face-sheet.jpg (those heads cut from stills, one tile per design): show it to Kai
//   node styles/stick-man/tools/facesheet.mjs films/<slug> --approve "<Kai's words, with the time he said them>"
//        -> review/faces-approved.json { by: 'kai', at, note, designs }: only after Kai said yes to that sheet
// facebeat.mjs fails while a design the film shows is not in review/faces-approved.json.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { HOLD, MIN_FACE } from './facebeat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const key = d => `${d.who} ${d.expr}${d.design ? ' #' + d.design : ''}`;

// every face design held HOLD frames or more on a readable head: [{ who, expr, design, frames, best: { f, h, head } }]
export function faceDesigns(rows, H = 1920) {
  const out = new Map(), run0 = {};
  for (const row of [...rows].sort((a, b) => a.f - b.f)) for (const [who, a] of Object.entries(row.actors || {})) {
    const h = a.head ? (a.head[3] - a.head[1]) / H : 0;
    if (!a.inFrame || !a.expr || h < MIN_FACE) { delete run0[who]; continue; }
    const d = { who, expr: a.expr, design: a.exprDesign || null }, k = key(d), r = run0[who];
    run0[who] = r && r.k === k && r.last === row.f - 1 ? { ...r, last: row.f, n: r.n + 1 } : { k, last: row.f, n: 1 };
    const o = out.get(k) || { ...d, frames: 0, held: 0, best: null };
    o.frames++; o.held = Math.max(o.held, run0[who].n);
    if (!o.best || h > o.best.h) o.best = { f: row.f, h: +h.toFixed(3), head: a.head };
    out.set(k, o);
  }
  return [...out.values()].filter(d => d.held >= HOLD);
}

// the shown designs Kai has not approved: an approved design matches by name and, when both rows carry one, by its key
export function unapproved(designs, approved) {
  const ok = approved?.by === 'kai' ? approved.designs || [] : [];
  return designs.filter(d => !ok.some(a => a.who === d.who && a.expr === d.expr && (!a.design || !d.design || a.design === d.design)));
}

export function approvalLine(designs, approved, film) {
  const miss = unapproved(designs, approved);
  if (!miss.length) return null;
  const why = !approved ? 'no face sheet approved by Kai (review/faces-approved.json)' : approved.by !== 'kai' ? 'review/faces-approved.json is not by kai' : `${miss.length} face design(s) not on the sheet Kai approved ${approved.at}`;
  return `${why}: ${miss.map(key).join(', ')}; fix: node styles/stick-man/tools/facesheet.mjs ${film}, show Kai review/face-sheet.jpg, then --approve "<his words>"`;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const [film, ...rest] = process.argv.slice(2), A = {}; for (let i = 0; i < rest.length; i += 2) A[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!film || film.startsWith('-')) { console.error('usage: facesheet.mjs films/<slug> [--rows review/shot-rows.jsonl] [--h 1920] [--approve "<Kai\'s words>"]'); process.exit(2); }
  const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p), rowsFile = path.resolve(DIR, A.rows || 'review/shot-rows.jsonl');
  if (A.approve != null) {
    if (!fs.existsSync(F('review/face-sheet.json'))) { console.error('facesheet: no review/face-sheet.json: make the sheet and show it to Kai first'); process.exit(2); }
    if (!A.approve.trim()) { console.error('facesheet: --approve needs Kai\'s own words'); process.exit(2); }
    const sheet = JSON.parse(fs.readFileSync(F('review/face-sheet.json'), 'utf8'));
    fs.writeFileSync(F('review/faces-approved.json'), JSON.stringify({ by: 'kai', at: new Date().toISOString(), note: A.approve, sheet: 'review/face-sheet.jpg', designs: sheet.designs.map(({ who, expr, design }) => ({ who, expr, design })) }, null, 1) + '\n');
    console.log(`${path.relative(ROOT, F('review/faces-approved.json'))}: ${sheet.designs.length} designs approved`);
    process.exit(0);
  }
  if (!fs.existsSync(rowsFile)) { console.error(`facesheet: no ${path.relative(ROOT, rowsFile)}: run shot.mjs --film ${film} --frames all --dbg ${path.relative(ROOT, rowsFile)} first`); process.exit(1); }
  const rows = fs.readFileSync(rowsFile, 'utf8').trim().split('\n').map(l => JSON.parse(l)), H = Number(A.h || 1920), W = Math.round(H * 9 / 16);
  const designs = faceDesigns(rows, H);
  fs.mkdirSync(F('review'), { recursive: true });
  fs.writeFileSync(F('review/face-sheet.json'), JSON.stringify({ rows: path.relative(DIR, rowsFile), designs }, null, 1) + '\n');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'facesheet-')), frames = [...new Set(designs.map(d => d.best.f))];
  const r = run('node', [path.join(ROOT, 'styles/stick-man/tools/shot.mjs'), '--film', film, '--frames', frames.join(','), '--out', path.join(tmp, 'f_%d.jpg'), '--w', String(W), '--h', String(H)], { capture: true, timeout: 20 * 60000 });
  if (r.status) { console.error(`facesheet: shot.mjs failed:\n${(r.stderr || r.stdout || '').trim().split('\n').slice(-4).join('\n')}`); process.exit(2); }
  const tiles = designs.map((d, i) => { const [x0, y0, x1, y1] = d.best.head, s = Math.max(x1 - x0, y1 - y0) * 1.3, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const o = path.join(tmp, `t_${i}.jpg`), c = [s, s, Math.max(0, cx - s / 2), Math.max(0, cy - s / 2)].map(Math.round);
    run('ffmpeg', ['-y', '-v', 'error', '-i', path.join(tmp, `f_${d.best.f}.jpg`), '-vf', `crop=${c.join(':')},scale=240:240,drawtext=text='${key(d).replace(/[':]/g, ' ')}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6`, o], { capture: true });
    return o; }).filter(f => fs.existsSync(f));
  const cols = Math.min(4, tiles.length), lay = tiles.map((_, i) => `${(i % cols) * 240}_${Math.floor(i / cols) * 240}`).join('|');
  if (tiles.length) run('ffmpeg', ['-y', '-v', 'error', ...tiles.flatMap(t => ['-i', t]), '-filter_complex', tiles.length > 1 ? `xstack=inputs=${tiles.length}:layout=${lay}:fill=black` : 'null', F('review/face-sheet.jpg')], { capture: true });
  console.log(`${path.relative(ROOT, F('review/face-sheet.jpg'))}: ${designs.length} face designs (${designs.map(key).join(', ')}): show it to Kai`);
}
