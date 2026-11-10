// Storyboard board: one still per spoken line, tiled with the line's words under each, for the eyes and the judged
// "shown / not shown" gate (GATES.md). Reads films/<slug>/storyboard.json, vo/script.json, vo/words.json; renders each
// line at its middle word (or the entry's `on` word) through tools/shot.mjs; writes review/board.jpg + review/board.json.
//   node styles/stick-man/tools/board.mjs films/<slug> [--out films/<slug>/review/board.jpg] [--w 540] [--cols 4] [--plan 1]
// --plan 1 adds each entry's "see" sentence under the words (for Kai and the author; the reviewer gets the board without it).
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const film = process.argv[2];
const A = {}; for (let i = 3; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!film || film.startsWith('--')) { console.error('usage: board.mjs films/<slug> [--out <jpg>] [--w 540] [--cols 4] [--plan 1]'); process.exit(2); }
const F = p => path.join(ROOT, film, p), read = p => JSON.parse(fs.readFileSync(F(p), 'utf8'));
for (const p of ['storyboard.json', 'vo/script.json', 'vo/words.json']) if (!fs.existsSync(F(p))) { console.error(`missing ${film}/${p}`); process.exit(2); }
const SB = read('storyboard.json'), script = read('vo/script.json'), words = read('vo/words.json');
const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const fps = 30, w = Number(A.w || 540), h = Math.round(w * 16 / 9);
const byId = Object.fromEntries(SB.lines.map(e => [e.id, e]));
const missing = script.lines.filter(l => !byId[l.id]).map(l => l.id);
if (missing.length) { console.error(`storyboard.json has no entry for ${missing.join(', ')}`); process.exit(1); }

// the frame of each line: its `on` word (nth 1) or the middle word, at the middle of that word
const tiles = script.lines.map(l => {
  const ws = words.filter(x => x.line === l.id), e = byId[l.id];
  if (!ws.length) throw new Error(`no words for ${l.id} in vo/words.json`);
  const wd = e.on ? ws.find(x => norm(x.word) === norm(e.on)) : ws[(ws.length - 1) >> 1];
  if (!wd) throw new Error(`storyboard ${l.id}: on "${e.on}" is not a word of the line`);
  return { id: l.id, frame: Math.round((wd.t0 + wd.t1) / 2 * fps), word: wd.word, text: l.text, see: e.see, shot: e.shot, set: e.set };
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-board-'));
const r = run('node', [path.join(HERE, 'shot.mjs'), '--film', film, '--frames', tiles.map(t => t.frame).join(','), '--out', path.join(tmp, 'f_%d.jpg'),
  '--w', String(w), '--h', String(h)], { cwd: ROOT });
if (r.status) process.exit(r.status);

const cols = Number(A.cols || Math.min(5, Math.ceil(Math.sqrt(tiles.length * 1.3)))), tw = Math.round(1500 / cols), th = Math.round(tw * 16 / 9);
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; background: #fff; font: 15px/1.3 Helvetica, Arial, sans-serif; color: #111; width: ${cols * (tw + 12) + 12}px; }
.g { display: grid; grid-template-columns: repeat(${cols}, ${tw}px); gap: 12px; padding: 12px; }
.t img { width: ${tw}px; height: ${th}px; display: block; border: 1px solid #999; }
.id { font-weight: 700; margin-top: 5px; } .id span { font-weight: 400; color: #555; } .x { margin-top: 2px; } .s { margin-top: 3px; color: #1b5e20; font-style: italic; }
</style></head><body><div class="g">${tiles.map(t => `<div class="t"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(tmp, `f_${t.frame}.jpg`)).toString('base64')}">
<div class="id">${esc(t.id)} <span>· frame ${t.frame} on "${esc(t.word)}"</span></div><div class="x">${esc(t.text)}</div>${A.plan ? `<div class="s">see: ${esc(t.see)}</div>` : ''}</div>`).join('')}</div></body></html>`;
const out = path.resolve(A.out || F('review/board.jpg'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: cols * (tw + 12) + 12, height: 400 } });
await p.setContent(html); await p.screenshot({ path: out, type: 'jpeg', quality: 88, fullPage: true }); await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
const meta = out.replace(/\.jpg$/i, '.json');
fs.writeFileSync(meta, JSON.stringify({ film, board: path.relative(ROOT, out), tiles: tiles.map(({ id, frame, word, text }) => ({ id, frame, word, text })) }, null, 1) + '\n');
console.log(`${path.relative(ROOT, out)}  ${tiles.length} lines, ${cols} columns; ${path.relative(ROOT, meta)}`);
