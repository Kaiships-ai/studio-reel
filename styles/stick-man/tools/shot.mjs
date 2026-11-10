// Frame capture for the stick-man pages: headless Chromium (Metal ANGLE), one worker, JPEG q92 or PNG by extension.
//   node styles/stick-man/tools/shot.mjs --view a --frames 0 --out films/stick-p0/out/a.png
//   node styles/stick-man/tools/shot.mjs --view turn --frames 0-3 --out films/stick-p0/out/turn_%d.jpg
//   node styles/stick-man/tools/shot.mjs --view front --probe 1
//   node styles/stick-man/tools/shot.mjs --view a --speed 60 --stats films/stick-p0/out/speed.txt
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');                     // repo root: serves the page and node_modules/three
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const W = Number(A.w || 1080), H = Number(A.h || 1920), page = A.page || 'styles/stick-man/p0.html';
const frames = (A.frames || '0').split(',').flatMap(s => { const [a, b] = s.split('-').map(Number); return b == null ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${page}?view=${A.view || 'a'}${A.query ? '&' + A.query : ''}`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => { console.error('pageerror', e.stack); process.exit(1); });
p.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const shot = file => p.screenshot(/\.png$/i.test(file) ? { path: file } : { path: file, type: 'jpeg', quality: 92 });

if (A.speed) {
  const n = Number(A.speed), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-shot-'));
  for (let f = 0; f < 5; f++) await p.evaluate(f => window.__frame(f), f);              // warm-up
  const pageMs = [];
  for (let f = 0; f < n; f++) pageMs.push(await p.evaluate(f => window.__frame(f), f));
  const t0 = Date.now();
  for (let f = 0; f < n; f++) { await p.evaluate(f => window.__frame(f), f); await shot(path.join(tmp, `${f}.jpg`)); }
  const withJpeg = (Date.now() - t0) / n, mean = pageMs.reduce((a, b) => a + b, 0) / n;
  fs.rmSync(tmp, { recursive: true, force: true });
  const txt = `view ${A.view || 'a'}, ${W}x${H}, ${n} frames, 1 worker: page-side render ${mean.toFixed(1)} ms/frame (mean), render + JPEG q92 capture ${withJpeg.toFixed(1)} ms/frame\n`;
  if (A.stats) fs.appendFileSync(A.stats, txt);
  process.stdout.write(txt);
} else if (A.probe) {                                           // --probe 1: print the page's measurements, no file
  await p.evaluate(f => window.__frame(f), frames[0]);
  console.log(JSON.stringify(await p.evaluate(() => window.__probe())));
} else {
  const out = A.out || 'shot.jpg'; fs.mkdirSync(path.dirname(out), { recursive: true });
  for (const f of frames) {
    const ms = await p.evaluate(f => window.__frame(f), f);
    const file = out.replace('%d', String(f)); await shot(file);
    console.log(`${file}  frame ${f}  ${ms.toFixed(1)} ms`);
  }
}
await browser.close(); server.close();
