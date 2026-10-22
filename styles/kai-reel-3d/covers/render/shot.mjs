// node render/shot.mjs --page reel.html --fps 60 --sub 4 --shutter 0.5 --workers 6 --size 1080x1920 --out renders/reel.mp4 [--start 0 --end 20] [--audio audio/mix.wav]
// One screenshot per frame; motion blur accumulated in-page (sub-frames); WebGL on the Metal GPU (ANGLE). End defaults to the page's __T_END.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import { startServer, ROOT as HERE } from './serve.mjs';
const a = process.argv.slice(2), arg = (n, d) => { const i = a.indexOf('--' + n); return i < 0 ? d : (a[i + 1] ?? true); };
const page_ = arg('page', 'reel.html'), fps = Number(arg('fps', 60)), sub = Number(arg('sub', 4)), shutter = Number(arg('shutter', 0.5));
const NW = Number(arg('workers', 6)), [w, h] = String(arg('size', '1080x1920')).split('x').map(Number), q = arg('q', ''), audio = arg('audio', '');
const out = path.join(HERE, arg('out', 'renders/reel.mp4'));
const dir = path.join(HERE, 'frames', path.basename(out, '.mp4')); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const { server, url } = await startServer();
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const T0 = Date.now(); let done = 0, N = 0, f0 = 0, f1 = 0;
async function open() {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('pageerror', e.stack); process.exit(1); });
  await p.goto(`${url}/${page_}?norender=1&${q}`); await p.waitForFunction(() => typeof window.__frame === 'function', null, { timeout: 180000 });
  return { ctx, p };
}
const pages = await Promise.all(Array.from({ length: NW }, open));
const tEnd = Number(arg('end', await pages[0].p.evaluate(() => window.__T_END)));
f0 = Math.round(Number(arg('start', 0)) * fps); f1 = Math.round(tEnd * fps); N = f1 - f0;
async function worker(wi) {
  const { ctx, p } = pages[wi];
  for (let f = f0 + wi; f < f1; f += NW) {
    await p.evaluate(([t, s, sh, fp]) => window.__frame(t, s, sh, fp), [f / fps, sub, shutter, fps]);
    await p.screenshot({ path: path.join(dir, String(f - f0).padStart(5, '0') + '.png') });
    if (++done % 30 === 0) process.stdout.write(`\r${done}/${N}  ${((Date.now() - T0) / done).toFixed(0)} ms/frame`);
  }
  await ctx.close();
}
await Promise.all(pages.map((_, i) => worker(i)));
await browser.close(); server.close();
console.log(`\nframes: ${((Date.now() - T0) / 1000).toFixed(1)} s`);
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(arg('crf', 16)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const ain = audio ? ['-ss', String(f0 / fps), '-i', path.join(HERE, audio)] : [];
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, '%05d.png'), ...ain, ...enc, ...(audio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), out], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log('wrote', out);
