// Blame (Kai 23/11, Hot Money A v11): which light source makes a region valuegate flags. It renders the frame once as is
// and once per source with only that source dimmed (kit/look/ablate.js: sun, hemi, fill, every lamp, each lamp alone, fog,
// air, shafts, the highlight bloom), measures the region's mean luma in each, and ranks the sources by how much they lift
// it. A source that drops the region below valuegate's bar is the cause; when none does on its own, the surface itself
// (its albedo, its sheen) or the act's exposure is.
//   node styles/stick-man/tools/gates/blame.mjs --film films/<slug>[/parts/<part>] --frame <f> --box x0,y0,x1,y1
//        [--query k=v&...] [--w 360 --h 640] [--j 2] [--lights 1] [-- <more shot.mjs args>]
//   --box is in valuegate's sample (180 x 320, as its FAIL line prints it); --lights 1 also dims each point / spot light alone
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { run, start } from '../../../../kit/env.mjs';
import { W, H } from './valuegate.mjs';
import { SOURCES, DIM } from '#kit/look/ablate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SHOT = path.join(ROOT, 'styles/stick-man/tools/render/shot.mjs');

// the region's mean luma (Rec. 601, as valuegate) in a png scaled to the W x H sample
export function regionLuma(png, [x0, y0, x1, y1]) {
  const r = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', png, '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { capture: true, encoding: 'buffer' });
  const px = Buffer.from(r.stdout); let s = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = 3 * (y * W + x); s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; n++; }
  return n ? s / n : 0;
}
// [{ source, luma }] with the base first -> ranked rows { source, luma, lift } (lift: how much the region drops without it)
export function rank(rows) {
  const base = rows.find(r => r.source === 'none')?.luma ?? 0;
  return rows.filter(r => r.source !== 'none').map(r => ({ ...r, lift: base - r.luma })).sort((a, b) => b.lift - a.lift);
}

function shot(film, frame, query, w, h, out, extra) {
  return new Promise(res => {
    const p = start('node', [SHOT, '--film', film, '--frames', `${frame}-${frame}`, '--out', out, '--w', String(w), '--h', String(h), '--query', query, ...extra],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
    p.on('close', code => res({ code, log }));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), dd = argv.indexOf('--'), extra = dd >= 0 ? argv.slice(dd + 1) : [], A = {};
  for (let i = 0; i < (dd >= 0 ? dd : argv.length); i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  const box = (A.box || '').split(',').map(Number);
  if (!A.film || !A.frame || box.length !== 4 || box.some(Number.isNaN) || box[0] < 0 || box[1] < 0 || box[2] >= W || box[3] >= H || box[2] < box[0] || box[3] < box[1]) {
    console.error(`usage: blame.mjs --film <film or part> --frame <f> --box x0,y0,x1,y1 (inside ${W}x${H}, x0 <= x1, y0 <= y1) [--query ..] [--w 360 --h 640] [--j 2] [--lights 1] [-- <shot.mjs args>]`); process.exit(2); }
  const w = Number(A.w || 360), h = Number(A.h || 640), J = Number(A.j || 2), q0 = A.query || '', f = Number(A.frame);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blame-'));
  try { job: {
  const one = async src => { const out = path.join(tmp, `${src}_%d.png`), q = [q0, `ablate=${src === 'none' ? 'list' : src}`].filter(Boolean).join('&');
    const r = await shot(A.film, f, q, w, h, out, extra), png = out.replace('%d', String(f));
    return { source: src, ok: r.code === 0 && fs.existsSync(png), png, log: r.log }; };
  const base = await one('none');
  if (!base.ok) { console.error(`blame: the base render failed\n${base.log.slice(-2000)}`); process.exitCode = 1; break job; }
  const lights = [...base.log.matchAll(/\[kit\] ablate (light\d+ .*)/g)].map(m => m[1]);
  const todo = [...SOURCES, ...(A.lights ? lights.map(l => l.split(' ')[0]) : [])], done = [];
  for (let i = 0; i < todo.length; i += J) done.push(...await Promise.all(todo.slice(i, i + J).map(one)));
  const rows = [{ source: 'none', luma: regionLuma(base.png, box) }, ...done.filter(d => d.ok).map(d => ({ source: d.source, luma: regionLuma(d.png, box) }))];
  console.log(`region ${box.join(',')} (${W}x${H}) at frame ${f}: ${rows[0].luma.toFixed(0)} as rendered; each source x${DIM} (a lamp alone: off)`);
  for (const r of rank(rows)) console.log(`  ${r.source.padEnd(8)} ${r.luma.toFixed(0).padStart(4)}  ${r.lift >= 0 ? '-' : '+'}${Math.abs(r.lift).toFixed(0)}${lights.find(l => l.startsWith(r.source + ' ')) ? `  ${lights.find(l => l.startsWith(r.source + ' ')).slice(r.source.length + 1)}` : ''}`);
  for (const d of done.filter(x => !x.ok)) console.log(`  ${d.source}: render failed`);
  if (!A.lights && lights.length) console.log(`(${lights.length} lamps in view: --lights 1 dims each alone)`);
  } } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
