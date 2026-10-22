// node render/sheet.mjs --page reel.html --times 0,1,2.5 [--from 0 --to 20 --n 24] --size 270x480 --cols 8 --sub 1 --out review/sheet.png
// --nolabel: no time stamp (covers). One page load, many seeks: __frame(t) then screenshot each, tiled with ffmpeg. Labels each tile with its time.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import { startServer, ROOT as HERE } from './serve.mjs';
const a = process.argv.slice(2), arg = (n, d) => { const i = a.indexOf('--' + n); return i < 0 ? d : (a[i + 1] ?? true); };
const page_ = arg('page', 'reel.html'), [w, h] = String(arg('size', '270x480')).split('x').map(Number), sub = Number(arg('sub', 1)), q = arg('q', '');
let times;
if (arg('times')) times = String(arg('times')).split(',').map(Number);
else { const f = Number(arg('from', 0)), t = Number(arg('to', 20)), n = Number(arg('n', 24)); times = Array.from({ length: n }, (_, i) => +(f + (t - f) * i / (n - 1)).toFixed(3)); }
const cols = Number(arg('cols', Math.min(8, times.length))), out = path.join(HERE, arg('out', 'review/sheet.png'));
const tmp = path.join(HERE, 'frames', 'sheet-' + process.pid); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const { server, url } = await startServer();
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const p = await browser.newPage({ viewport: { width: w, height: h } });
p.on('pageerror', e => { console.log('pageerror', e.stack); process.exit(1); }); p.on('console', m => (m.type() === 'error' || m.text().startsWith('LOG')) && console.log(m.text().slice(0, 600)));
await p.goto(`${url}/${page_}?norender=1&${q}`); await p.waitForFunction(() => typeof window.__frame === 'function', null, { timeout: 180000 });
const files = [];
for (const [i, t] of times.entries()) {
  await p.evaluate(([t, s, nl]) => { window.__frame(t, s, 0.5, 30); if (nl) return; const c = document.getElementById('fx'), g = c.getContext('2d');
    g.save(); g.font = `bold ${Math.round(c.height / 22)}px Arial`; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, c.height / 5, c.height / 18); g.fillStyle = '#fff'; g.textBaseline = 'top'; g.fillText(t.toFixed(2), 6, 6); g.restore(); }, [t, sub, !!arg('nolabel', false)]);
  const f = path.join(tmp, `s${String(i).padStart(3, '0')}.png`); await p.screenshot({ path: f }); files.push([f, t]);
}
await browser.close(); server.close();
const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
if (files.length === 1) fs.copyFileSync(files[0][0], out); else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap(([f]) => ['-i', f]), '-filter_complex', `xstack=inputs=${files.length}:layout=${layout}:fill=0x101018`, out], { stdio: ['ignore', 'ignore', 'inherit'] });
fs.rmSync(tmp, { recursive: true, force: true }); console.log(out);
