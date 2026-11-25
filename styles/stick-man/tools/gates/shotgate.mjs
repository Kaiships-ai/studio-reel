//   node styles/stick-man/tools/gates/shotgate.mjs films/<slug>                     -> review/shot-gate.md + review/shot-gate/*.jpg
//   ... [--in renders/x.mp4 [--from <film frame of the mp4's first frame>]]  strips cut from this render (default: the
//                                                                              newest renders/*.mp4, else the frames are rendered)
//   ... --rows <rows.jsonl> [--w 404 --h 720]                                  judge __dbg rows made elsewhere (a film assembled
//                                                                              shot by shot: no reel.js, so no visibility tags)
// Exit 1 when a fault blocks: seen by the camera, on screen 3 frames or more and large enough on a phone (shotfaults.mjs); the
// others are listed as watch.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';
import { shotFaults, bySecond, blocks, FPS, REF_H, UNCHECKED } from './shotfaults.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'), SHOT = path.join(ROOT, 'styles/stick-man/tools/render/shot.mjs');
const film = process.argv[2], A = {};
for (let i = 3; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!film || film.startsWith('-')) { console.error('usage: shotgate.mjs films/<slug> [--in <mp4> [--from <frame>]] [--rows <jsonl> --w <px> --h <px>]'); process.exit(2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
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

const page = fs.existsSync(F('reel.js'));
const figureFaults = faults.filter(x => x.pts?.length && rows[0].actors[x.who] && x.sev > 0);
if (page && figureFaults.length) {
  const vf = path.join(tmp, 'vis.json');
  fs.writeFileSync(vf, JSON.stringify(figureFaults.map(x => ({ F: x.F, actor: x.who, pts: x.pts }))));
  const r = node([SHOT, '--film', film, '--vis', vf, '--w', String(W), '--h', String(H)]);
  if (r.status) { console.error(`shot.mjs --vis failed:\n${(r.stderr || '').trim().split('\n').slice(-5).join('\n')}`); process.exit(2); }
  JSON.parse(fs.readFileSync(vf, 'utf8')).forEach((v, i) => { figureFaults[i].vis = v; });
}
const secs = bySecond(faults);
// a prop no gate checks (turned off a quarter turn) leaves its shots unmeasured: PARTIAL, never PASS
const seen = x => blocks(x) && x.kind !== UNCHECKED, toFix = secs.filter(s => s.list.some(seen)), unmeasured = [...new Set(faults.filter(x => x.kind === UNCHECKED && blocks(x)).map(x => x.who))];
const verdict = toFix.length ? 'FAIL' : unmeasured.length ? 'PARTIAL' : 'PASS';

const mp4 = A.in ? path.resolve(ROOT, A.in) : (fs.existsSync(F('renders')) ? fs.readdirSync(F('renders')).filter(f => f.endsWith('.mp4')).map(f => F('renders/' + f))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] : null);
const from = Number(A.from || 0), SD = F('review/shot-gate');
fs.rmSync(SD, { recursive: true, force: true }); fs.mkdirSync(SD, { recursive: true });
const picks = toFix.map(s => { const x = s.list.find(seen); return { s, f0: Math.max(0, x.F - 5), file: `strip_${String(s.s).padStart(3, '0')}s_f${x.F}.jpg` }; });
const tile = (input, file) => run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...input, '-frames:v', '15', '-vf', 'scale=180:-2,tile=15x1', '-frames:v', '1', path.join(SD, file)], { timeout: 60000 });
if (picks.length && mp4) for (const k of picks) tile(['-ss', ((k.f0 - from) / FPS).toFixed(4), '-i', mp4], k.file);
else if (picks.length && page) {
  const fr = picks.flatMap(k => Array.from({ length: 15 }, (_, i) => k.f0 + i));
  node([SHOT, '--film', film, '--frames', [...new Set(fr)].join(','), '--w', '270', '--h', '480', '--out', path.join(tmp, 'f_%d.jpg')]);
  for (const k of picks) tile(['-start_number', String(k.f0), '-i', path.join(tmp, 'f_%d.jpg')], k.file);
}
fs.rmSync(tmp, { recursive: true, force: true });

const strip = s => picks.find(k => k.s === s)?.file;
const cell = t => String(t).replace(/\|/g, '/');
const md = [`# Shot gate · ${path.basename(DIR)}`, '', `**${verdict}**: ${toFix.length} second(s) with a fault the camera sees,${unmeasured.length ? ` not collision-checked: ${unmeasured.join(', ')},` : ''} ${secs.length - toFix.length} with hidden or watch-only faults; ${rows.length} frames${mp4 ? `, strips from ${path.basename(mp4)}` : ''}`, '',
  '| Second | Frame | Kind | What | px x frames x seen = sev | Blocks | Strip |', '| --- | --- | --- | --- | --- | --- | --- |',
  ...secs.flatMap(s => s.list.filter(x => blocks(x) || x.sev >= 1 || x.watch).map((x, j) => `| ${j ? '' : `${s.s}`} | ${x.F} | ${x.kind} | ${cell(x.what)} | ${x.px.toFixed(1)} x ${x.frames} x ${x.seen.toFixed(2)} = ${x.sev} | ${x.kind === UNCHECKED ? (blocks(x) ? 'yes, not measured' : 'no, watch') : x.vis !== 'in' ? `no, ẩn (${x.vis})` : blocks(x) ? 'yes' : 'no, watch'} | ${j || !strip(s.s) ? '' : `[strip](shot-gate/${strip(s.s)})`} |`)), '',
  `px are counted on a phone frame ${REF_H} px tall, after the motion the neighbouring frames predict. A strip is 15 frames in a row, the flagged frame on tile 6. Thresholds: styles/stick-man/tools/gates/shotfaults.mjs.`];
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(F('review/shot-gate.md'), md.join('\n') + '\n');
const kinds = {}; for (const x of faults) if (blocks(x)) kinds[x.kind] = (kinds[x.kind] || 0) + 1;
console.log(`review/shot-gate.md: ${verdict} · ${toFix.length} second(s) to fix${unmeasured.length ? `, not collision-checked: ${unmeasured.join(', ')}` : ''}${Object.keys(kinds).length ? ' (' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ') + ')' : ''}`);
process.exit(verdict === 'PASS' ? 0 : 1);
