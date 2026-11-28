// The stick-man pixel baseline: the four look sheets rendered at review tier (720x1280) on ONE machine (the Mac Pro: another
// GPU or driver antialiases differently), and a pixel-by-pixel compare of two such captures with a before|after page for
// every cell that differs. The golden fingerprint (test/unit/look-fingerprint.mjs) is the CI half of the same lock.
//   node styles/stick-man/tools/run/sheetbase.mjs capture --out <dir> [--only wardrobe,hair,faces,rig]
//   node styles/stick-man/tools/run/sheetbase.mjs compare --base <dir> --head <dir> --out <page dir>
// capture writes <dir>/{wardrobe/c_<i>.png (90 cells), hair/h_<i>.png (110 frames: type=mw, 11 styles x 10 views), faces/faces.png, rig/rig-sheet.jpg},
// <dir>/SHA (the commit, its merge base with origin/main, the machine) and <dir>/manifest.json (a sha256 per file).
// compare exits 1 when any pixel differs and writes <page dir>/index.html + report.json.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SHOT = 'styles/stick-man/tools/render/shot.mjs';
export const SHEETS = {
  wardrobe: { cells: 90, args: dir => [SHOT, '--page', 'styles/stick-man/wardrobe.html', '--frames', '0-89', '--tier', 'review', '--out', path.join(dir, 'c_%d.png')] },
  hair: { cells: 110, args: dir => [SHOT, '--page', 'styles/stick-man/tools/run/hairsheet.html', '--query', 'type=mw', '--frames', '0-109', '--tier', 'review', '--out', path.join(dir, 'h_%d.png')] },
  faces: { cells: 1, args: dir => [SHOT, '--page', 'styles/stick-man/faces.html', '--view', 'a', '--frames', '12', '--tier', 'review', '--out', path.join(dir, 'faces.png')] },
  rig: { cells: 1, args: dir => ['styles/stick-man/tools/gates/rigtest.mjs', '--sheet', dir] },
};
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const sha256 = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const images = dir => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter(f => /\.(png|jpe?g)$/i.test(f)).sort() : []);

function capture(out, only) {
  fs.mkdirSync(out, { recursive: true });
  for (const [name, s] of Object.entries(SHEETS)) {
    if (only && !only.includes(name)) continue;
    const dir = path.join(out, name), t0 = Date.now(); fs.mkdirSync(dir, { recursive: true });
    const r = run('node', s.args(dir));
    if (r.status) { console.error(`sheetbase: ${name} failed (exit ${r.status})`); process.exit(1); }
    const n = images(dir).length;
    console.log(`${name}: ${n} images in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (n !== s.cells) { console.error(`sheetbase: ${name} made ${n} images, expected ${s.cells}`); process.exit(1); }
  }
  const files = images(out);
  fs.writeFileSync(path.join(out, 'SHA'), [`head ${git('rev-parse', 'HEAD')}`, `main ${git('merge-base', 'HEAD', 'origin/main')}`,
    `machine ${os.hostname()}`, `captured ${new Date().toISOString()}`, ''].join('\n'));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(Object.fromEntries(files.map(f => [f, sha256(path.join(out, f))])), null, 1) + '\n');
  console.log(`${files.length} images, ${out}/SHA`);
}

// an image as RGBA bytes (ffmpeg decodes PNG and JPEG alike)
function pixels(f) {
  const probe = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { capture: true });
  const [w, h] = probe.stdout.trim().split(',').map(Number);
  const r = run('ffmpeg', ['-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status) throw new Error(`ffmpeg could not decode ${f}: ${r.stderr}`);
  return { w, h, data: r.stdout };
}
function writePng(f, w, h, data) {
  const r = run('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', f], { input: data, stdio: ['pipe', 'ignore', 'pipe'] });
  if (r.status) throw new Error(`ffmpeg could not write ${f}: ${r.stderr}`);
}
// pixels that differ, and a picture of where: the after image dimmed, every differing pixel red
function diffImages(a, b) {
  if (a.w !== b.w || a.h !== b.h) return { px: Math.max(a.w * a.h, b.w * b.h), size: `${a.w}x${a.h} -> ${b.w}x${b.h}` };
  let px = 0; const out = Buffer.alloc(a.data.length);
  for (let i = 0; i < a.data.length; i += 4) {
    const d = a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3];
    if (d) { px++; out[i] = 255; out[i + 1] = 0; out[i + 2] = 0; } else for (let k = 0; k < 3; k++) out[i + k] = b.data[i + k] >> 2;
    out[i + 3] = 255;
  }
  return { px, out };
}
function compare(base, head, out) {
  const A = images(base), B = new Set(images(head)), rows = [];
  for (const f of new Set([...A, ...B])) {
    if (!A.includes(f) || !B.has(f)) { rows.push({ file: f, px: null, why: A.includes(f) ? 'missing at head' : 'new at head' }); continue; }
    const fa = path.join(base, f), fb = path.join(head, f);
    if (sha256(fa) === sha256(fb)) continue;
    const pa = pixels(fa), pb = pixels(fb), d = diffImages(pa, pb);
    if (!d.px) continue;
    const slug = f.replace(/[\\/]/g, '_').replace(/\.\w+$/, ''); fs.mkdirSync(path.join(out, 'cells'), { recursive: true });
    fs.copyFileSync(fa, path.join(out, 'cells', `${slug}.before${path.extname(f)}`)); fs.copyFileSync(fb, path.join(out, 'cells', `${slug}.after${path.extname(f)}`));
    if (d.out) writePng(path.join(out, 'cells', `${slug}.diff.png`), pb.w, pb.h, d.out);
    rows.push({ file: f, slug, ext: path.extname(f), px: d.px, share: +(d.px / (pb.w * pb.h)).toFixed(6), size: d.size });
  }
  fs.mkdirSync(out, { recursive: true });
  const shaOf = d => (fs.existsSync(path.join(d, 'SHA')) ? fs.readFileSync(path.join(d, 'SHA'), 'utf8').trim() : '(no SHA file)');
  const report = { base, head, baseSha: shaOf(base), headSha: shaOf(head), images: A.length, differ: rows.length, rows };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1) + '\n');
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cell = r => (r.px == null ? `<section><h2>${esc(r.file)}</h2><p>${esc(r.why)}</p></section>`
    : `<section><h2>${esc(r.file)} · ${r.px} px (${(100 * r.share).toFixed(3)} %)${r.size ? ' · ' + esc(r.size) : ''}</h2><div class="row">`
      + ['before', 'after'].map(k => `<figure><img src="cells/${r.slug}.${k}${r.ext}"><figcaption>${k}</figcaption></figure>`).join('')
      + (r.size ? '' : `<figure><img src="cells/${r.slug}.diff.png"><figcaption>diff</figcaption></figure>`) + '</div></section>');
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Sheet compare</title>
<style>body{font:14px system-ui;margin:16px;background:#f6f6f4;color:#222}pre{background:#fff;padding:8px}.row{display:flex;gap:8px;flex-wrap:wrap}
figure{margin:0}img{width:240px;display:block;background:#ccc}h2{font-size:14px;margin:20px 0 6px}</style>
<h1>${rows.length ? `${rows.length} of ${A.length} images differ` : `All ${A.length} images match`}</h1>
<pre>base ${esc(report.baseSha)}\nhead ${esc(report.headSha)}</pre>${rows.map(cell).join('\n')}`);
  console.log(`${rows.length} of ${A.length} images differ: ${path.join(out, 'index.html')}`);
  process.exitCode = rows.length ? 1 : 0;
}

const [cmd, ...rest] = process.argv.slice(2), A = {};
for (let i = 0; i < rest.length; i += 2) A[rest[i].replace(/^--/, '')] = rest[i + 1];
if (cmd === 'capture' && A.out) capture(path.resolve(A.out), A.only?.split(','));
else if (cmd === 'compare' && A.base && A.head && A.out) compare(path.resolve(A.base), path.resolve(A.head), path.resolve(A.out));
else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); process.exitCode = cmd ? 2 : 0; }
