// The measured shot gate (◇4 shot lock, ◇5 deliver): every frame of the film through shotfaults.mjs, so a prop that
// pops, jumps, floats or changes across a cut, a figure that pops in, slides, snaps or walks through the set stops the
// gate before a reviewer or Kai has to find it. A fault the camera does not see (behind a cover, out of frame) is listed
// as "ẩn" and never blocks. Each second with a blocking fault gets a 15-frame strip, every frame, the fault on tile 6.
//   node styles/stick-man/tools/shotgate.mjs films/<slug>                     -> review/shot-gate.md + review/shot-gate/*.jpg
//   ... [--in renders/x.mp4 [--from <film frame of the mp4's first frame>]]  strips cut from this render (default: the
//                                                                              newest renders/*.mp4, else the frames are rendered)
//   ... --rows <rows.jsonl> [--w 404 --h 720]                                  judge __dbg rows made elsewhere (a film assembled
//                                                                              shot by shot); no page, so no visibility tags
// Exit 1 when a fault the camera sees remains.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { shotFaults, bySecond } from './shotfaults.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), SHOT = path.join(ROOT, 'styles/stick-man/tools/shot.mjs');
const film = process.argv[2], A = {};
for (let i = 3; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!film || film.startsWith('-')) { console.error('usage: shotgate.mjs films/<slug> [--in <mp4> [--from <frame>]] [--rows <jsonl> --w <px> --h <px>]'); process.exit(2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p), FPS = 30, MAX_STRIPS = 40;
const W = Number(A.w || (A.rows ? 404 : 540)), H = Number(A.h || (A.rows ? 720 : 960));
const node = args => run('node', args, { capture: true, timeout: 30 * 60000 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shotgate-'));

let rowsFile = A.rows && path.resolve(ROOT, A.rows);
if (!rowsFile) {
  rowsFile = F('review/shot-rows.jsonl'); fs.mkdirSync(F('review'), { recursive: true });
  const r = node([SHOT, '--film', film, '--frames', 'all', '--dbg', rowsFile, '--w', String(W), '--h', String(H)]);
  if (r.status) { console.error(`shot.mjs --dbg failed:\n${(r.stderr || r.stdout || '').trim().split('\n').slice(-5).join('\n')}`); process.exit(2); }
}
const rows = fs.readFileSync(rowsFile, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const faults = shotFaults(rows, { W, H });

// what the film camera sees of each figure fault (shot.mjs --vis, engine/visible.js)
const probe = faults.filter(x => x.pts?.length && rows[0].actors[x.who]);
if (!A.rows && probe.length) {
  const vf = path.join(tmp, 'vis.json');
  fs.writeFileSync(vf, JSON.stringify(probe.map(x => ({ F: x.F, actor: x.who, pts: x.pts }))));
  const r = node([SHOT, '--film', film, '--vis', vf, '--w', String(W), '--h', String(H)]);
  if (r.status) { console.error(`shot.mjs --vis failed:\n${(r.stderr || '').trim().split('\n').slice(-5).join('\n')}`); process.exit(2); }
  JSON.parse(fs.readFileSync(vf, 'utf8')).forEach((v, i) => { probe[i].vis = v; });
}
const secs = bySecond(faults, FPS), blocking = secs.filter(s => s.block);

// strips: from the render when there is one, else the flagged frames rendered small
const mp4 = A.in ? path.resolve(ROOT, A.in) : (fs.existsSync(F('renders')) ? fs.readdirSync(F('renders')).filter(f => f.endsWith('.mp4')).map(f => F('renders/' + f))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] : null);
const from = Number(A.from || 0), SD = F('review/shot-gate');
fs.rmSync(SD, { recursive: true, force: true }); fs.mkdirSync(SD, { recursive: true });
const picks = blocking.slice(0, MAX_STRIPS).map(s => { const x = s.list.find(y => y.vis === 'in'); return { s, f0: Math.max(0, x.F - 5), file: `strip_${String(s.s).padStart(3, '0')}s_f${x.F}.jpg` }; });
if (picks.length && mp4) for (const k of picks)
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', ((k.f0 - from) / FPS).toFixed(4), '-i', mp4, '-frames:v', '15', '-vf', 'scale=180:-2,tile=15x1', '-frames:v', '1', path.join(SD, k.file)], { timeout: 60000 });
else if (picks.length && !A.rows) {
  const fr = picks.flatMap(k => Array.from({ length: 15 }, (_, i) => k.f0 + i));
  node([SHOT, '--film', film, '--frames', [...new Set(fr)].join(','), '--w', '270', '--h', '480', '--out', path.join(tmp, 'f_%d.jpg')]);
  for (const k of picks) run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-start_number', String(k.f0), '-i', path.join(tmp, 'f_%d.jpg'), '-frames:v', '15', '-vf', 'scale=180:-2,tile=15x1', '-frames:v', '1', path.join(SD, k.file)], { timeout: 60000 });
}
fs.rmSync(tmp, { recursive: true, force: true });

const strip = s => picks.find(k => k.s === s)?.file;
const cell = t => String(t).replace(/\|/g, '/');
const md = [`# Shot gate · ${path.basename(DIR)}`, '', `**${blocking.length ? 'FAIL' : 'PASS'}**: ${blocking.length} second(s) with a fault the camera sees, ${secs.length - blocking.length} with hidden faults only (ẩn); ${rows.length} frames${mp4 ? `, strips from ${path.basename(mp4)}` : ''}`, '',
  '| Second | Frame | Kind | What | Seen | Strip |', '| --- | --- | --- | --- | --- | --- |',
  ...secs.flatMap(s => s.list.map((x, j) => `| ${j ? '' : `${s.s}`} | ${x.F} | ${x.kind} | ${cell(x.what)} | ${x.vis === 'in' ? 'yes' : 'ẩn (' + x.vis + ')'} | ${j || !strip(s.s) ? '' : `[strip](shot-gate/${strip(s.s)})`} |`)), '',
  'A strip is 15 frames in a row, every frame, the flagged frame on tile 6. Thresholds: styles/stick-man/tools/shotfaults.mjs.'];
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(F('review/shot-gate.md'), md.join('\n') + '\n');
const kinds = {}; for (const s of blocking) for (const x of s.list) if (x.vis === 'in') kinds[x.kind] = (kinds[x.kind] || 0) + 1;
console.log(`review/shot-gate.md: ${blocking.length ? 'FAIL' : 'PASS'} · ${blocking.length} second(s) to fix${Object.keys(kinds).length ? ' (' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ') + ')' : ''}`);
process.exit(blocking.length ? 1 : 0);
