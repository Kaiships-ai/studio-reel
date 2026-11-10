// Style judge (GATES.md "Style judge"): how close our reel looks to the reference, scored by headless Sonnet reviewers
// who never see our code or notes, on sheets built the same way for both sides (tools/judge_sheets.py).
//   node styles/stick-man/tools/judge.mjs films/<slug> --in <mp4> --ref <ref-private dir> [--tag r1]
//        -> review/judge[-tag].json + judge[-tag].txt, review/judge-ours-1.jpg / -2.jpg (our sheets only)
//   --reviews 2 (default), --blind 1 (default; 0 skips the blind test), --seed 7, --keep 1 (keep the tmp dir, prints it)
// The reference sheets are read from --ref (ref_sheet30_pink.jpg, ref_sheet30_rail.jpg: 10 x 3 tiles of 270 x 480, JPEG q90)
// and never written into the repo or the film folder: the reference side of each sheet lives in a tmp dir, deleted after.
// Ours: 24 frames spread over the reel, each the middle of a spoken word, every line at least once; sheet 1 = the first
// 12, sheet 2 = the last 12. Reference: 12 tiles from each sheet, evenly spread. Tile 270 x 480, 6 x 2 per sheet, q90 4:2:0.
// Judge: 2 independent reviews, each sees both reference sheets and both of ours; gate value = mean of the 2.
// PASS = mean overall >= 8.5 and no category mean < 8.
// Blind test: 6 reference + 6 ours tiles, shuffled, one reviewer labels each original / imitation; separation = tiles
// labelled right, or wrong if the reviewer swapped the two names (max of the two: 12 = fully told apart, 6 = chance).
// Target <= 8 / 12.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const film = process.argv[2];
const A = {}; for (let i = 3; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const USAGE = 'usage: judge.mjs films/<slug> --in <mp4> --ref <dir with ref_sheet30_pink.jpg, ref_sheet30_rail.jpg> [--tag t] [--reviews 2] [--blind 1]';
if (!film || film.startsWith('--') || !A.in || !A.ref) { console.error(USAGE); process.exit(2); }
const F = p => path.join(ROOT, film, p);
const REF = ['ref_sheet30_pink.jpg', 'ref_sheet30_rail.jpg'].map(n => path.join(path.resolve(A.ref), n));
for (const p of [...REF, path.resolve(A.in), F('vo/words.json')]) if (!fs.existsSync(p)) { console.error(`missing ${p}`); process.exit(2); }
if (path.resolve(A.ref).startsWith(ROOT + path.sep)) { console.error('--ref must stay outside the repo (reference images are private)'); process.exit(2); }

export const CATS = ['character look', 'faces/expressions', 'poses/acting', 'sets/world richness', 'lighting/shading', 'ink/outline',
  'captions', 'effects/props', 'shot variety/framing', 'storytelling clarity'];
export const PASS = { overall: 8.5, cat: 8 };
const PROMPT = 'You are a strict judge of animation style match. REFERENCE sheet = target style. OURS sheet = imitation. Score how close OURS is to REFERENCE, 0-10 per category (10 = indistinguishable): character look, faces/expressions, poses/acting, sets/world richness, lighting/shading, ink/outline, captions, effects/props, shot variety/framing, storytelling clarity. Then overall /10 and one line per category on the biggest remaining difference. Do not be generous.';
const FORMAT = `Reply with JSON only: {"scores": {${CATS.map(c => `"${c}": n`).join(', ')}}, "overall": n, "diff": {${CATS.map(c => `"${c}": "one line"`).join(', ')}}}`;
const BLIND = 'These 12 tiles are frames from vertical animated shorts. Some are from the ORIGINAL series, some are from an IMITATION made to look like it. For each tile say which you think it is. Be decisive; there is no fixed count of each.';
const BLIND_FMT = 'Reply with JSON only: {"tiles": {"1": "original" | "imitation", ... "12": ...}, "tells": "one line: what gave the imitation away"}';

// ---------------------------------------------------------------- our frames: 24 word middles spread over the reel
const words = JSON.parse(fs.readFileSync(F('vo/words.json'), 'utf8')).filter(w => w.t1 > w.t0);
const probe = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.resolve(A.in)], { capture: true });
const dur = Number(String(probe.stdout).trim());
const N = 24, mids = words.map(w => ({ t: (w.t0 + w.t1) / 2, line: w.line, word: w.word })).filter(m => m.t < dur - 0.1);
const pick = [];
for (let i = 0; i < N; i++) {
  const t = (i + 0.5) * dur / N; let best = null;
  for (const m of mids) if (!pick.includes(m) && (!best || Math.abs(m.t - t) < Math.abs(best.t - t))) best = m;
  if (best) pick.push(best);
}
for (const l of [...new Set(words.map(w => w.line))]) if (!pick.some(m => m.line === l)) {   // every line once: swap in its middle word
  const ws = mids.filter(m => m.line === l); if (!ws.length) continue;
  const m = ws[ws.length >> 1], k = pick.reduce((b, x, i) => (Math.abs(x.t - m.t) < Math.abs(pick[b].t - m.t) ? i : b), 0); pick[k] = m;
}
pick.sort((a, b) => a.t - b.t);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-judge-'));
const frames = pick.map((m, i) => {
  const out = path.join(tmp, `ours_${String(i).padStart(2, '0')}.png`);
  const r = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', m.t.toFixed(3), '-i', path.resolve(A.in), '-frames:v', '1', out]);
  if (r.status) { console.error(`ffmpeg failed at ${m.t}`); process.exit(1); }
  return out;
});

// ---------------------------------------------------------------- reference tiles + blind order (seeded)
let seed = Number(A.seed || 7); const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const refPick = [0, 1].flatMap(s => Array.from({ length: 12 }, (_, i) => [s, Math.min(29, Math.round(i * 30 / 12 + 1))]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const blindRef = shuffle([...Array(24).keys()]).slice(0, 6), blindOurs = shuffle([...Array(24).keys()]).slice(0, 6);
const order = shuffle([...blindRef.map(k => ['ref', k]), ...blindOurs.map(k => ['ours', k])]);
const tag = A.tag ? `-${A.tag}` : '';
const oursOut = [F(`review/judge-ours${tag}-1.jpg`), F(`review/judge-ours${tag}-2.jpg`)], refOut = [path.join(tmp, 'ref-1.jpg'), path.join(tmp, 'ref-2.jpg')];
const doBlind = A.blind !== '0';
const job = { ref: REF, ref_grid: [10, 3], ref_pick: refPick, ours: frames, tile: [270, 480], quality: 90, cols: 6,
  out: { ref: refOut, ours: oursOut }, blind: doBlind ? { dir: tmp, order } : null };
fs.writeFileSync(path.join(tmp, 'job.json'), JSON.stringify(job));
const py = run('python', [path.join(HERE, 'judge_sheets.py'), path.join(tmp, 'job.json')], { capture: true });
if (py.status) { console.error('judge_sheets.py failed', py.stderr); process.exit(1); }

// ---------------------------------------------------------------- headless reviews (as board.mjs: fresh claude -p, no tools)
const img = p => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(p).toString('base64') } });
function claude(content, system) {
  return new Promise((res, rej) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-judge-r-'));
    const c = spawn(process.env.CLAUDE_BIN || 'claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', 'sonnet', '--effort', 'medium',
      '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--disable-slash-commands', '--system-prompt', system], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let so = '', se = ''; c.stdout.on('data', d => (so += d)); c.stderr.on('data', d => (se += d)); c.on('error', rej);
    c.on('close', code => {
      fs.rmSync(cwd, { recursive: true, force: true });
      const r = so.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).find(o => o?.type === 'result');
      if (code || !r || r.is_error) return rej(new Error(`claude exit ${code} ${se.slice(0, 300)} ${r?.result || ''}`));
      const u = r.usage, tokens = u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens;
      try { const t = r.result; res({ ...JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)), tokens, cost_usd: r.total_cost_usd }); }
      catch (e) { rej(new Error('reply is not JSON: ' + String(r.result).slice(0, 300))); }
    });
    c.stdin.end(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
  });
}
const judgeContent = [
  { type: 'text', text: 'REFERENCE sheet 1 of 2:' }, img(refOut[0]), { type: 'text', text: 'REFERENCE sheet 2 of 2:' }, img(refOut[1]),
  { type: 'text', text: 'OURS sheet 1 of 2:' }, img(oursOut[0]), { type: 'text', text: 'OURS sheet 2 of 2:' }, img(oursOut[1]),
  { type: 'text', text: `${PROMPT}\n\n${FORMAT}` }];
const nRev = Number(A.reviews || 2);
const jobs = Array.from({ length: nRev }, () => claude(judgeContent, 'You judge animation style. Reply with JSON only.'));
if (doBlind) jobs.push(claude([...order.flatMap((_, j) => [{ type: 'text', text: `Tile ${j + 1}:` }, img(path.join(tmp, `tile_${String(j + 1).padStart(2, '0')}.jpg`))]),
  { type: 'text', text: `${BLIND}\n\n${BLIND_FMT}` }], 'You judge animation frames. Reply with JSON only.'));
const R = await Promise.all(jobs);
const reviews = R.slice(0, nRev), blind = doBlind ? R[nRev] : null;

// ---------------------------------------------------------------- score
const num = v => Number(v);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const cats = Object.fromEntries(CATS.map(c => [c, +mean(reviews.map(r => num(r.scores?.[c]))).toFixed(2)]));
const overall = +mean(reviews.map(r => num(r.overall))).toFixed(2);
const low = CATS.filter(c => !(cats[c] >= PASS.cat));
const pass = overall >= PASS.overall && !low.length;
let sep = null;
if (blind) {
  // separation = how well the two groups are told apart, whichever way round the reviewer named them (labelling all 12
  // backwards still separates them: 1 right = 11 told apart); 6 = chance
  const right = order.reduce((n, [side], j) => n + ((String(blind.tiles?.[String(j + 1)] || '').toLowerCase().startsWith('orig') ? 'ref' : 'ours') === side ? 1 : 0), 0);
  sep = Math.max(right, 12 - right); blind.right = right;
}
const out = { film, mp4: path.relative(ROOT, path.resolve(A.in)), when: new Date().toISOString().slice(0, 16),
  reviewer: `${nRev} x headless sonnet (effort medium), judge.mjs`, rule: `PASS = mean overall >= ${PASS.overall} and no category mean < ${PASS.cat}`,
  frames: pick.map(m => ({ t: +m.t.toFixed(2), line: m.line, word: m.word })), ref_tiles: refPick,
  categories: cats, overall, pass, low, reviews,
  blind: blind ? { separation: sep, right: blind.right, of: 12, target: '<= 8', order: order.map(([s, k]) => `${s}:${k}`), answer: blind.tiles, tells: blind.tells, tokens: blind.tokens, cost_usd: blind.cost_usd } : null,
  tokens: { reviews: reviews.map(r => r.tokens), blind: blind?.tokens ?? 0, total: R.reduce((n, r) => n + r.tokens, 0) },
  cost_usd: +R.reduce((n, r) => n + (r.cost_usd || 0), 0).toFixed(4) };
fs.writeFileSync(F(`review/judge${tag}.json`), JSON.stringify(out, null, 1) + '\n');
const txt = [`style judge ${film} (${out.mp4}) ${out.when}: ${pass ? 'PASS' : 'FAIL'}  overall ${overall} (${reviews.map(r => r.overall).join(', ')})`,
  ...CATS.map(c => `${cats[c] >= PASS.cat ? '  ' : '! '}${c.padEnd(22)} ${String(cats[c]).padEnd(5)} (${reviews.map(r => r.scores?.[c]).join(', ')})  ${reviews.map(r => r.diff?.[c] || '').join(' | ')}`),
  blind ? `blind test: ${sep}/12 told apart (target <= 8); tells: ${blind.tells || '-'}` : 'blind test: skipped',
  `tokens ${out.tokens.total} (${out.tokens.reviews.join(' + ')}${blind ? ' + blind ' + blind.tokens : ''}), $${out.cost_usd}`];
fs.writeFileSync(F(`review/judge${tag}.txt`), txt.join('\n') + '\n');
console.log(txt.join('\n'));
if (A.keep === '1') console.log('tmp', tmp); else fs.rmSync(tmp, { recursive: true, force: true });
process.exit(pass ? 0 : 1);
