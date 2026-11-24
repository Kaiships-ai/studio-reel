// The face sheet Kai approves at S2 before a film shows a new face (Hot Money ep01 r5, 19/11: a fix round swapped the hero's
// faces for a new set, Kai saw them first in the film, "xấu thậm tệ", and they were rolled back). A face design is an
// expression name and the numbers it draws with (engine/faces.js designKey, in the dbg rows as actors[n].exprDesign).
//   node styles/stick-man/tools/series/facesheet.mjs films/<slug> [--rows review/shot-rows.jsonl] [--h 1920] [--query k=v] [--no-bible-check '<reason>']
//        -> review/face-sheet.json (each design held on a readable head, with the frame that shows it largest, and the
//           sheet's hash) and review/face-sheet.jpg (those heads cut from stills, one tile per design, the hash stamped
//           on it): show it to Kai. --query and --no-bible-check go to shot.mjs as they went to the render the rows came
//           from (the stills must show the faces the rows saw); the sheet is written only once its stills are made
//   node styles/stick-man/tools/series/facesheet.mjs films/<slug> --approve "<Kai's words, with the time he said them>" --sheet <hash>
//        -> review/faces-approved.json { by: 'kai', at, note, sheet, designs }: only after Kai said yes to the sheet with that
//           hash. A sheet made again after he looked has a new hash, so his yes cannot approve faces he has not seen.
// facebeat.mjs fails while a design the film shows is not in review/faces-approved.json, or on the kit face sheet: the kit
// faces film (tools/series/kitfaces, every face a new character can draw) made and approved the same way, once, for every
// film; its designs match by face name and numbers, for any character.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';
import { HOLD, MIN_FACE } from '#tools/gates/facebeat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const key = d => `${d.who} ${d.expr}${d.design ? ' #' + d.design : ''}`;
export const KIT_FACES = path.join(ROOT, 'styles/stick-man/tools/series/kitfaces');
export const kitApproval = (file = path.join(KIT_FACES, 'review/faces-approved.json')) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);

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

// what Kai judges on a sheet: its designs, as one short hash
export const sheetHash = designs => crypto.createHash('sha256')
  .update(JSON.stringify(designs.map(({ who, expr, design }) => [who, expr, design ?? null]))).digest('hex').slice(0, 8);

// the shown designs Kai has not approved: an approved design matches by name and, when both rows carry one, by its key;
// on the film's sheet for that character, or on the kit sheet for anyone
export function unapproved(designs, approved, kit = null) {
  const ok = approved?.by === 'kai' ? approved.designs || [] : [], kitOk = kit?.by === 'kai' ? kit.designs || [] : [];
  const same = (a, d) => a.expr === d.expr && (!a.design || !d.design || a.design === d.design);
  return designs.filter(d => !ok.some(a => a.who === d.who && same(a, d)) && !kitOk.some(a => same(a, d)));
}

// the shot.mjs call for the sheet's stills: the page flags and the logged bible bypass of the render the rows came from
export function shotArgs(film, frames, out, W, H, A = {}) {
  return [path.join(ROOT, 'styles/stick-man/tools/render/shot.mjs'), '--film', film, '--frames', frames.join(','), '--out', out, '--w', String(W), '--h', String(H),
    ...(A.query ? ['--query', A.query] : []), ...('no-bible-check' in A ? ['--no-bible-check', A['no-bible-check'] || 'no reason given'] : [])];
}

export function approvalLine(designs, approved, film, kit = null) {
  const miss = unapproved(designs, approved, kit);
  if (!miss.length) return null;
  const why = !approved ? 'no face sheet approved by Kai (review/faces-approved.json)' : approved.by !== 'kai' ? 'review/faces-approved.json is not by kai' : `${miss.length} face design(s) not on the sheet Kai approved ${approved.at}`;
  return `${why}: ${miss.map(key).join(', ')}; fix: node styles/stick-man/tools/series/facesheet.mjs ${film}, show Kai review/face-sheet.jpg (S2), then --approve "<his words>" --sheet <its hash>`;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const [film, ...rest] = process.argv.slice(2), A = {}; for (let i = 0; i < rest.length; i += 2) A[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!film || film.startsWith('-')) { console.error('usage: facesheet.mjs films/<slug> [--rows review/shot-rows.jsonl] [--h 1920] [--query k=v] [--no-bible-check "<reason>"] [--approve "<Kai\'s words>" --sheet <hash>]'); process.exit(2); }
  const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p), rowsFile = path.resolve(DIR, A.rows || 'review/shot-rows.jsonl');
  if (A.approve != null) {
    if (!fs.existsSync(F('review/face-sheet.json'))) { console.error('facesheet: no review/face-sheet.json: make the sheet and show it to Kai first'); process.exit(2); }
    if (!A.approve.trim()) { console.error('facesheet: --approve needs Kai\'s own words from S2'); process.exit(2); }
    const sheet = JSON.parse(fs.readFileSync(F('review/face-sheet.json'), 'utf8')), hash = sheetHash(sheet.designs);
    if (!A.sheet) { console.error(`facesheet: --approve needs --sheet <the hash on the face-sheet.jpg Kai saw>`); process.exit(2); }
    if (A.sheet !== hash) { console.error(`facesheet: Kai saw sheet ${A.sheet}, review/face-sheet.json is now sheet ${hash}: show him the new review/face-sheet.jpg`); process.exit(2); }
    fs.writeFileSync(F('review/faces-approved.json'), JSON.stringify({ by: 'kai', at: new Date().toISOString(), note: A.approve, sheet: hash, designs: sheet.designs.map(({ who, expr, design }) => ({ who, expr, design })) }, null, 1) + '\n');
    console.log(`${path.relative(ROOT, F('review/faces-approved.json'))}: ${sheet.designs.length} designs approved`);
    process.exit(0);
  }
  if (!fs.existsSync(rowsFile)) { console.error(`facesheet: no ${path.relative(ROOT, rowsFile)}: run shot.mjs --film ${film} --frames all --dbg ${path.relative(ROOT, rowsFile)} first`); process.exit(1); }
  const rows = fs.readFileSync(rowsFile, 'utf8').trim().split('\n').map(l => JSON.parse(l)), H = Number(A.h || 1920), W = Math.round(H * 9 / 16);
  const designs = faceDesigns(rows, H), hash = sheetHash(designs);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'facesheet-')), frames = [...new Set(designs.map(d => d.best.f))];
  const r = run('node', shotArgs(film, frames, path.join(tmp, 'f_%d.jpg'), W, H, A), { capture: true, timeout: 20 * 60000 });
  if (r.status) { console.error(`facesheet: shot.mjs failed:\n${(r.stderr || r.stdout || '').trim().split('\n').slice(-4).join('\n')}`); process.exit(2); }
  const tiles = designs.map((d, i) => { const [x0, y0, x1, y1] = d.best.head, s = Math.max(x1 - x0, y1 - y0) * 1.3, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const o = path.join(tmp, `t_${i}.jpg`), c = [s, s, Math.max(0, cx - s / 2), Math.max(0, cy - s / 2)].map(Math.round);
    run('ffmpeg', ['-y', '-v', 'error', '-i', path.join(tmp, `f_${d.best.f}.jpg`), '-vf', `crop=${c.join(':')},scale=240:240,drawtext=text='${key(d).replace(/[':]/g, ' ')}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6`, o], { capture: true });
    return o; }).filter(f => fs.existsSync(f));
  const cols = Math.min(4, tiles.length), lay = tiles.map((_, i) => `${(i % cols) * 240}_${Math.floor(i / cols) * 240}`).join('|');
  fs.mkdirSync(F('review'), { recursive: true }); fs.rmSync(F('review/face-sheet.jpg'), { force: true });
  if (tiles.length) run('ffmpeg', ['-y', '-v', 'error', ...tiles.flatMap(t => ['-i', t]), '-filter_complex', `${tiles.length > 1 ? `xstack=inputs=${tiles.length}:layout=${lay}:fill=black,` : ''}drawtext=text='sheet ${hash}':x=w-tw-8:y=h-th-8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.7`, F('review/face-sheet.jpg')], { capture: true });
  if (!fs.existsSync(F('review/face-sheet.jpg'))) { console.error('facesheet: the sheet image was not made (no tile cut from the stills): review/face-sheet.json left as it was'); process.exit(2); }
  fs.writeFileSync(F('review/face-sheet.json'), JSON.stringify({ rows: path.relative(DIR, rowsFile), query: A.query || null, hash, designs }, null, 1) + '\n');
  console.log(`${path.relative(ROOT, F('review/face-sheet.jpg'))}: ${designs.length} face designs (${designs.map(key).join(', ')}), sheet ${hash}: show it to Kai, then --approve "<his words>" --sheet ${hash}`);
}
