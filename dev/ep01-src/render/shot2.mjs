// node render/shot2.mjs --page tmv2.html --fps 30 --sub 2 --workers 4 --size 1080x1920 --chunk 8 --out renders/x.mp4 --audio audio/x.wav
// shot.mjs, made resumable and disk-light (v2): renders in chunks of --chunk seconds with a fresh browser per chunk, encodes each chunk
// (x264 crf 14) and deletes its PNGs; a chunk whose part file exists is skipped. Then concat (stream copy) + mux the audio (AAC 256k).
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import { startServer, ROOT as HERE } from './serve.mjs';
const a = process.argv.slice(2), arg = (n, d) => { const i = a.indexOf('--' + n); return i < 0 ? d : (a[i + 1] ?? true); };
const page_ = arg('page', 'tmv2.html'), fps = Number(arg('fps', 30)), sub = Number(arg('sub', 2)), shutter = Number(arg('shutter', 0.5));
const NW = Number(arg('workers', 4)), [w, h] = String(arg('size', '1080x1920')).split('x').map(Number), audio = arg('audio', ''), chunkS = Number(arg('chunk', 8));
const out = path.join(HERE, arg('out', 'renders/out.mp4')), name = path.basename(out, '.mp4');
const parts = path.join(HERE, 'renders', name + '_parts'); fs.mkdirSync(parts, { recursive: true });
const { server, url } = await startServer();
const T0 = Date.now();
async function renderChunk(ci, f0, f1) {
  const dir = path.join(HERE, 'frames', name, String(ci).padStart(2, '0')); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const pages = await Promise.all(Array.from({ length: NW }, async () => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    p.on('pageerror', e => { console.log('pageerror', e.stack); process.exit(1); });
    await p.goto(`${url}/${page_}?norender=1`); await p.waitForFunction(() => typeof window.__frame === 'function', null, { timeout: 180000 }); return { ctx, p };
  }));
  let done = 0; const t1 = Date.now();
  await Promise.all(pages.map(async ({ ctx, p }, wi) => {
    for (let f = f0 + wi; f < f1; f += NW) {
      await p.evaluate(([t, s, sh, fp]) => window.__frame(t, s, sh, fp), [f / fps, sub, shutter, fps]);
      await p.screenshot({ path: path.join(dir, String(f - f0).padStart(5, '0') + '.png') });
      if (++done % 30 === 0) process.stdout.write(`\rchunk ${ci}: ${done}/${f1 - f0}  ${((Date.now() - t1) / done).toFixed(0)} ms/frame`);
    }
    await ctx.close();
  }));
  await browser.close();
  const part = path.join(parts, String(ci).padStart(2, '0') + '.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, '%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', String(arg('crf', 14)), '-pix_fmt', 'yuv420p', '-r', String(fps), part + '.tmp.mp4']);
  fs.renameSync(part + '.tmp.mp4', part); fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nchunk ${ci} done (${f1 - f0} frames), total ${((Date.now() - T0) / 1000).toFixed(0)} s`);
}
const probe = await chromium.launch(); const pp = await probe.newPage({ viewport: { width: 270, height: 480 } });
await pp.goto(`${url}/${page_}?norender=1`); await pp.waitForFunction(() => typeof window.__frame === 'function', null, { timeout: 180000 });
const tEnd = Number(arg('end', await pp.evaluate(() => window.__T_END))); await probe.close();
const F = Math.round(tEnd * fps), CF = Math.round(chunkS * fps), list = [];
for (let ci = 0, f0 = 0; f0 < F; ci++, f0 += CF) {
  const part = path.join(parts, String(ci).padStart(2, '0') + '.mp4'); list.push(part);
  if (fs.existsSync(part)) { console.log(`chunk ${ci} exists, skip`); continue; }
  await renderChunk(ci, f0, Math.min(F, f0 + CF));
}
server.close();
fs.writeFileSync(path.join(parts, 'list.txt'), list.map(p => `file '${p}'`).join('\n'));
const ain = audio ? ['-i', path.join(HERE, audio)] : [];
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(parts, 'list.txt'), ...ain, '-map', '0:v', ...(audio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000'] : []), '-c:v', 'copy', '-movflags', '+faststart', '-t', String(tEnd), out]);
console.log('wrote', out, `${((Date.now() - T0) / 1000).toFixed(0)} s`);
