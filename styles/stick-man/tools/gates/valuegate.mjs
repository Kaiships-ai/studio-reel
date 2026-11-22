// Value gate (Kai 22/11, Hot Money ep01 A v9: "the burnt patch around the door" in segment 3, subjects that must read):
// two faults of the picture's values that a grade or a light can make, measured on the final mp4.
//   glare   a blown area: the picture blurred over ~1/20 of its width is bright (luma >= 200) AND a hot pool against its own
//           frame (>= GLARE.over above the frame's median luma: a lit white lobby by day is bright but even) on more than
//           GLARE.share of the frame, or pixels at the clip (luma >= 250) cover more than CLIP.share; held >= HOLD s (a muzzle flash
//           or a lamp's spark is shorter, a lamp's hot core smaller)
//   crushed shadows on a subject: inside the subject's box (from the render's rows: each actor's head box, widened 1.6x and
//           run down 3 head heights for the body) more than CRUSH.share of the pixels are near black (luma <= 10)
// Pictures are sampled at FPS a second at W x H with the HUD bands cropped (top 10 %, bottom 12 %).
//   node styles/stick-man/tools/gates/valuegate.mjs films/<slug>       the final render in renders/, rows from review/shot-rows.jsonl
//   node styles/stick-man/tools/gates/valuegate.mjs --mp4 <file> [--rows <rows.jsonl>] [--json 1]   -> exit 1 on a fault
// Run at ◇5 (GATES.json, beside colourgate). Without rows the subjects are not checked (the report says so).
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';
import { finalRender } from '#tools/render/renders.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

export const W = 180, H = 320, FPS = 4, CROP = { top: 0.10, bottom: 0.12 };
export const GLARE = { luma: 200, over: 90, share: 0.03, radius: 9 }, CLIP = { luma: 250, share: 0.01 }, CRUSH = { luma: 10, share: 0.08 }, HOLD = 0.5;

const lum = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
// a box blur of the luma plane (two passes of a running mean), so one bright edge does not count as an area
function blur(Y, w, h, r) {
  const t = new Float32Array(Y.length), o = new Float32Array(Y.length);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += Y[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { t[y * w + x] = s / (2 * r + 1); s += Y[y * w + Math.min(w - 1, x + r + 1)] - Y[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / (2 * r + 1); s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
// one rgb24 frame -> { glare, clip, crush: [per subject share] }; boxes in this frame's pixels [x0, y0, x1, y1]
export function frameValues(px, w, h, boxes = [], crop = CROP) {
  const Y = new Float32Array(w * h); for (let i = 0; i < w * h; i++) Y[i] = lum(px, 3 * i);
  const B = blur(Y, w, h, GLARE.radius), y0 = Math.floor(crop.top * h), y1 = Math.ceil((1 - crop.bottom) * h);
  const hist = new Uint32Array(256); let n = 0, g = 0, c = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { hist[Math.min(255, Y[y * w + x] | 0)]++; n++; }
  let med = 0, acc = hist[0]; while (med < 255 && acc < n / 2) acc += hist[++med];
  const hot = Math.max(GLARE.luma, med + GLARE.over);
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (B[i] >= hot) g++; if (Y[i] >= CLIP.luma) c++; }
  const crush = boxes.map(([a, b, e, d]) => { let m = 0, k = 0;
    for (let y = Math.max(y0, Math.floor(b)); y < Math.min(y1, Math.ceil(d)); y++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(w, Math.ceil(e)); x++) { m++; if (Y[y * w + x] <= CRUSH.luma) k++; }
    return m > 40 ? k / m : 0; });
  return { glare: g / n, clip: c / n, crush };
}
// the subject boxes of a rows line (head boxes in the render's 1080 x 1920 pixels) in a w x h frame
export function subjectBoxes(row, w = W, h = H, RW = 1080, RH = 1920) {
  return Object.values(row?.actors || {}).filter(a => a.inFrame !== false && a.head).map(a => {
    const [x0, y0, x1, y1] = a.head, cx = (x0 + x1) / 2, hw = (x1 - x0) * 0.8, hh = y1 - y0;
    return [(cx - hw) * w / RW, y0 * h / RH, (cx + hw) * w / RW, (y1 + 3 * hh) * h / RH];
  });
}
// samples [{ t, glare, clip, crush }] -> faults held >= HOLD s: [{ kind, from, to, peak }]
export function faults(S) {
  const out = [], need = Math.max(1, Math.round(HOLD * FPS));
  const runs = (kind, bad, val) => { let a = -1;
    for (let i = 0; i <= S.length; i++) { const b = i < S.length && bad(S[i]);
      if (b && a < 0) a = i;
      if (!b && a >= 0) { if (i - a >= need) out.push({ kind, from: +S[a].t.toFixed(2), to: +S[i - 1].t.toFixed(2), peak: +Math.max(...S.slice(a, i).map(val)).toFixed(3) }); a = -1; } } };
  runs('glare', s => s.glare > GLARE.share || s.clip > CLIP.share, s => Math.max(s.glare, s.clip));
  runs('crushed subject', s => s.crush.some(x => x > CRUSH.share), s => Math.max(0, ...s.crush));
  return out;
}
export function valuegate(mp4, rows = []) {
  const r = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', mp4, '-an', '-vf', `fps=${FPS},scale=${W}:${H},format=rgb24`, '-f', 'rawvideo', '-'],
    { capture: true, encoding: 'buffer', maxBuffer: 2 ** 31 });
  if (r.status) throw new Error(`ffmpeg could not read ${mp4}`);
  const F = W * H * 3, byF = new Map(rows.map(x => [x.f, x])), S = [];
  for (let i = 0; (i + 1) * F <= r.stdout.length; i++) { const t = (i + 0.5) / FPS, row = byF.get(Math.round(t * 30));
    S.push({ t, ...frameValues(r.stdout.subarray(i * F, (i + 1) * F), W, H, subjectBoxes(row)) }); }
  const found = faults(S);
  return { ok: !found.length, faults: found, samples: S.length };
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), A = {};
  let mp4, rowsFile;
  if (argv[0] && !argv[0].startsWith('--')) {
    const DIR = path.resolve(ROOT, argv[0]), final = finalRender(path.join(DIR, 'renders'));
    if (!final) { console.error(`${argv[0]}: no final render in renders/`); process.exit(1); }
    mp4 = path.join(DIR, 'renders', final); const r = path.join(DIR, 'review', 'shot-rows.jsonl'); rowsFile = fs.existsSync(r) ? r : null;
    for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  } else {
    for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
    mp4 = A.mp4; rowsFile = A.rows;
  }
  if (!mp4) { console.error('usage: valuegate.mjs films/<slug> | --mp4 <file> [--rows <rows.jsonl>] [--json 1]'); process.exit(2); }
  const rows = rowsFile ? fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const R = valuegate(mp4, rows);
  if (A.json) console.log(JSON.stringify(R, null, 1));
  else { for (const f of R.faults) console.log(`FAIL ${f.kind} ${f.from}-${f.to} s (peak ${(f.peak * 100).toFixed(1)} %)`); console.log(`valuegate ${R.ok ? 'PASS' : 'FAIL'} (${R.samples} samples${rows.length ? '' : ', no rows: subjects not checked'})`); }
  process.exit(R.ok ? 0 : 1);
}
