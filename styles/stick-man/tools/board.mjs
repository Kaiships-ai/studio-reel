// Storyboard board + the judged "board shown" gate (GATES.md). Two stills per spoken line: A on the entry's `still` word
// (else `on`, else the middle word) and B at the line's fx peak (the frame in the line's window where most of its listed
// props / fx are seen in __dbg). One small image (fits 1560 px), line words burned under each pair.
//   node styles/stick-man/tools/board.mjs films/<slug>                      -> review/board.jpg, review/board.json
//   node styles/stick-man/tools/board.mjs films/<slug> --judge 3            board, then 3 independent headless Sonnet reviews
//                                                                            -> review/board-verdict.json (shown = majority)
//   node styles/stick-man/tools/board.mjs films/<slug> --prompt 1           print the ready reviewer prompt (absolute path)
//   options: --dbg <jsonl> (reuse __dbg; default review/board-dbg.jsonl when newer than the reel data), --plan 1 (adds the
//   storyboard "see" line, for Kai only), --render 0 (judge the existing board.jpg), --tag r1 (verdict file suffix)
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { run } from '../../../kit/env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const film = process.argv[2];
const A = {}; for (let i = 3; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const USAGE = 'usage: board.mjs films/<slug> [--judge 3] [--prompt 1] [--render 0] [--dbg <jsonl>] [--plan 1] [--tag <t>]';
if (!film || film.startsWith('--')) { console.error(USAGE); process.exit(2); }
const F = p => path.join(ROOT, film, p), read = p => JSON.parse(fs.readFileSync(F(p), 'utf8'));
for (const p of ['storyboard.json', 'vo/script.json', 'vo/words.json']) if (!fs.existsSync(F(p))) { console.error(`missing ${film}/${p}`); process.exit(2); }
const SB = read('storyboard.json'), script = read('vo/script.json'), words = read('vo/words.json');
const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const fps = 30, out = path.resolve(A.out || F('review/board.jpg'));
const byId = Object.fromEntries(SB.lines.map(e => [e.id, e]));
const missing = script.lines.filter(l => !byId[l.id]).map(l => l.id);
if (missing.length) { console.error(`storyboard.json has no entry for ${missing.join(', ')}`); process.exit(1); }
const ids = script.lines.map(l => l.id);

// ---------------------------------------------------------------- the reviewer prompt (one place, GATES.md quotes it)
function prompt(board, inline) {
  return `You are an independent storyboard reviewer for a 30-second vertical explainer reel. You did not make it and you have no other context.
${inline ? 'The attached board image' : `Open the image ${board} with the Read tool (the only file you need). It`} holds one cell per spoken line: two stills side by side (A = on the line's key word, B = at its effect peak), then the line id and the words spoken on that line. The big white words burned into the stills are captions: ignore them as evidence.
For each line decide whether still A or still B SHOWS what the words say, so a viewer with the sound off would get that line:
- shown = the key thing the words name is visible: the object, the action, the process (light bouncing, air rising, heat flowing), the number, the place, or the comparison.
- not shown = people standing or talking while the words describe something else; a thing named but not on screen; a process described but not drawn. A face reacting counts only when the words are about that reaction.
- a quoted line (words in quotes) is speech: shown when its speaker is on screen saying it to the listener, with a matching gesture or a speech bubble.
Be strict: if you have to guess or be generous, it is not shown.
Reply with JSON only, no prose, one entry per line in board order (${ids.length} lines: ${ids.join(' ')}):
{"lines":[{"id":"${ids[0]}","shown":true,"why":"what you see, 8 words or fewer"}]}`;
}
if (A.prompt) { console.log(prompt(out, false)); process.exit(0); }

// ---------------------------------------------------------------- board
if (A.render !== '0') await renderBoard();
if (A.judge) await judge(Number(A.judge) || 3);

async function renderBoard() {
  const last = await lastFrame();
  const rows = dbgRows(last);
  const t0 = id => words.find(w => w.line === id)?.t0;
  const tiles = script.lines.map((l, i) => {
    const ws = words.filter(x => x.line === l.id), e = byId[l.id], key = e.still || e.on;
    if (!ws.length) throw new Error(`no words for ${l.id} in vo/words.json`);
    const wd = key ? ws.find(x => norm(x.word) === norm(key)) : ws[(ws.length - 1) >> 1];
    if (!wd) throw new Error(`storyboard ${l.id}: still "${key}" is not a word of the line`);
    const a = Math.round(t0(l.id) * fps), b = i + 1 < ids.length ? Math.round(t0(ids[i + 1]) * fps) : last + 1;
    const fa = Math.round((wd.t0 + wd.t1) / 2 * fps);
    return { id: l.id, frame: fa, peak: peak(rows, a, b, [...(e.props || []), ...(e.fx || [])], fa), word: wd.word, text: l.text, see: e.see };
  });
  // layout: the column count that gives the biggest still while the board fits 1560 x 1560 (one image, ~2-3k tokens)
  const textH = 64, gap = 10, pairGap = 4;
  let best = null;
  for (let cols = 2; cols <= 6; cols++) {
    const rowsN = Math.ceil(tiles.length / cols);
    const sw = Math.floor(Math.min((1560 - gap - cols * gap) / cols - pairGap, ((1560 - gap) / rowsN - gap - textH) * 2 * 9 / 16) / 2);
    if (!best || sw > best.sw) best = { cols, sw };
  }
  const { cols, sw } = best, sh = Math.round(sw * 16 / 9);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-board-'));
  const fr = [...new Set(tiles.flatMap(t => [t.frame, t.peak]))].sort((x, y) => x - y);
  const r = run('node', [path.join(HERE, 'shot.mjs'), '--film', film, '--frames', fr.join(','), '--out', path.join(tmp, 'f_%d.jpg'),
    '--w', String(sw * 2), '--h', String(sh * 2)], { cwd: ROOT });
  if (r.status) process.exit(r.status);
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const img = f => `<img src="data:image/jpeg;base64,${fs.readFileSync(path.join(tmp, `f_${f}.jpg`)).toString('base64')}">`;
  const W = cols * (2 * sw + pairGap + gap) + gap;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; background: #fff; font: 13px/1.25 Helvetica, Arial, sans-serif; color: #111; width: ${W}px; }
.g { display: grid; grid-template-columns: repeat(${cols}, ${2 * sw + pairGap}px); gap: ${gap}px; padding: ${gap}px; }
.p { display: flex; gap: ${pairGap}px; } .p img { width: ${sw}px; height: ${sh}px; display: block; border: 1px solid #999; }
.id { font-weight: 700; margin-top: 3px; } .id span { font-weight: 400; color: #555; } .s { color: #1b5e20; font-style: italic; }
</style></head><body><div class="g">${tiles.map(t => `<div class="t"><div class="p">${img(t.frame)}${img(t.peak)}</div>
<div class="id">${esc(t.id)} <span>A "${esc(t.word)}" f${t.frame} · B peak f${t.peak}</span></div><div>${esc(t.text)}</div>${A.plan ? `<div class="s">see: ${esc(t.see)}</div>` : ''}</div>`).join('')}</div></body></html>`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: W, height: 400 } });
  await p.setContent(html); await p.screenshot({ path: out, type: 'jpeg', quality: 85, fullPage: true }); await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(out.replace(/\.jpg$/i, '.json'), JSON.stringify({ film, board: path.relative(ROOT, out), tiles: tiles.map(({ id, frame, peak, word, text }) => ({ id, frame, peak, word, text })) }, null, 1) + '\n');
  console.log(`${path.relative(ROOT, out)}  ${tiles.length} lines x 2 stills, ${cols} columns, still ${sw}x${sh}`);
}

async function lastFrame() {
  const imp = async f => (await import(pathToFileURL(F(f)).href + `?t=${Date.now()}`)).default;
  const R1 = await imp('reel.js'), R2 = fs.existsSync(F('reel2.js')) ? await imp('reel2.js') : null;
  return (R2 || R1).frames[1];
}
// __dbg rows over the whole reel (seen lists per frame), cached in review/board-dbg.jsonl while the reel data is unchanged
function dbgRows(last) {
  const f = A.dbg ? path.resolve(A.dbg) : F('review/board-dbg.jsonl');
  const newest = Math.max(...['reel.js', 'reel2.js', 'storyboard.json', 'vo/words.json'].filter(p => fs.existsSync(F(p))).map(p => fs.statSync(F(p)).mtimeMs));
  if (!A.dbg && (!fs.existsSync(f) || fs.statSync(f).mtimeMs < newest)) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const r = run('node', [path.join(HERE, 'shot.mjs'), '--film', film, '--frames', `0-${last}`, '--dbg', f, '--w', '540', '--h', '960'], { cwd: ROOT });
    if (r.status) process.exit(r.status);
  }
  return fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
}
// peak = middle of the longest run of frames with the most listed props / fx seen (the later run on a tie);
// nothing listed or nothing seen: 3/4 through the window. At least 8 frames from still A when the window allows.
function peak(rows, a, b, want, fa) {
  const fr = rows.filter(r => r.f >= a && r.f < b), n = r => want.filter(w => (r.seen || []).includes(w)).length;
  const top = Math.max(0, ...fr.map(n));
  let pick = Math.round(a + (b - a) * 0.75);
  if (top > 0) {
    let best = null;
    for (let i = 0; i < fr.length; i++) {
      if (n(fr[i]) !== top) continue; let j = i; while (j + 1 < fr.length && n(fr[j + 1]) === top && fr[j + 1].f === fr[j].f + 1) j++;
      if (!best || j - i >= best[1] - best[0]) best = [i, j]; i = j;
    }
    pick = fr[Math.round((best[0] + best[1]) / 2)].f;
  }
  if (Math.abs(pick - fa) < 8 && b - a > 24) pick = fa + 8 < b ? Math.min(b - 1, fa + Math.max(8, Math.round((b - fa) / 2))) : Math.max(a, fa - 8);
  return pick;
}

// ---------------------------------------------------------------- judge: N independent headless Sonnet reviews
// Each review is a fresh `claude -p` (sonnet, effort medium, no tools, no settings, no MCP, empty cwd) with the board
// inline. A line is shown when more than half the reviews say shown (3 reviews: 2 of 3; 2 reviews: both). Measured 10/11 on
// reel 1 (15 reviews): both-of-2 scored 80-100 %, 2-of-3 scored 100 % three times. Tokens per review go in the verdict.
async function judge(n) {
  if (!fs.existsSync(out)) { console.error(`no ${path.relative(ROOT, out)}: run board.mjs first`); process.exit(2); }
  const msg = JSON.stringify({ type: 'user', message: { role: 'user', content: [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(out).toString('base64') } },
    { type: 'text', text: prompt(out, true) }] } }) + '\n';
  const bin = process.env.CLAUDE_BIN || 'claude';
  const one = i => new Promise((res, rej) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-judge-'));
    const c = spawn(bin, ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', 'sonnet', '--effort', 'medium',
      '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--disable-slash-commands',
      '--system-prompt', 'You review storyboards. Reply with JSON only.'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let so = '', se = ''; c.stdout.on('data', d => (so += d)); c.stderr.on('data', d => (se += d));
    c.on('error', rej);
    c.on('close', code => {
      fs.rmSync(cwd, { recursive: true, force: true });
      const resLine = so.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).find(o => o?.type === 'result');
      if (code || !resLine || resLine.is_error) return rej(new Error(`review ${i + 1}: claude exit ${code} ${se.slice(0, 300)} ${resLine?.result || ''}`));
      const u = resLine.usage, tokens = u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens;
      const t = resLine.result, js = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
      res({ ...js, tokens, cost_usd: resLine.total_cost_usd });
    });
    c.stdin.end(msg);
  });
  const R = await Promise.all(Array.from({ length: n }, (_, i) => one(i)));
  const tag = A.tag ? `-${A.tag}` : '';
  R.forEach((r, i) => fs.writeFileSync(F(`review/board-verdict${tag}-j${i + 1}.json`), JSON.stringify(r) + '\n'));
  const get = (r, id) => (r.lines || []).find(x => x.id === id);
  const lines = ids.map(id => { const v = R.map(r => get(r, id)); return { id, shown: v.filter(x => x?.shown === true).length > n / 2, votes: v.map(x => (x?.shown === true ? 1 : 0)), why: v.map(x => x?.why || '-') }; });
  const V = { reviewer: `${n} x headless sonnet (effort medium), board.mjs --judge, ${new Date().toISOString().slice(0, 16)}`, rule: `shown when more than half of ${n} reviews say shown`,
    board: path.relative(ROOT, out), tokens: R.map(r => r.tokens), lines };
  fs.writeFileSync(F(`review/board-verdict${tag}.json`), JSON.stringify(V, null, 1) + '\n');
  const ok = lines.filter(l => l.shown).length;
  console.log(`board shown ${Math.round(100 * ok / ids.length)} % (${ok}/${ids.length}); not shown: ${lines.filter(l => !l.shown).map(l => `${l.id} [${l.votes.join('')}]`).join(', ') || '-'}; tokens per review ${R.map(r => r.tokens).join(', ')}`);
  console.log(`-> ${path.relative(ROOT, F(`review/board-verdict${tag}.json`))}`);
}
