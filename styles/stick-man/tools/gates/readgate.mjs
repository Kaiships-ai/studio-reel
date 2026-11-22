// Phone-size readability gate on a render: what a viewer can read on a 360 x 640 phone at 1x. Every frame of the mp4 is
// scaled to 360 x 640 grey (Y, 0-255) and measured; the lead's head box comes from the film's camera rows (__dbg).
//   node styles/stick-man/tools/gates/readgate.mjs films/<slug>               -> review/readgate.md, exit 1 unless PASS
//   node styles/stick-man/tools/gates/readgate.mjs --mp4 <file> [--dbg <jsonl> --w 720 --h 1280] [--json 1]
// R1 glare: the share of the frame at Y > 235, worst 0.5 s. R2 hero against the background: the mean Y of the lead's head
// box over the mean Y of a ring around it, the median of each take the lead holds 0.5 s or more. R3 face size: the lead's
// head box height in px at 640 tall, the longest run while the lead is in frame with a head under the limit.
// PARTIAL: no rows, so R2 and R3 are not measured; it blocks like a FAIL.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from '../../../../kit/env.mjs';
import { sceneScores, duration, hardCuts, segments, verdict } from './cutgate.mjs';
import { finalRender } from '#tools/render/renders.mjs';
import { median } from './stats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const PW = 360, PH = 640, FPS = 30;
export const GLARE_Y = 235, RUN_F = 15, RING = 1.0, MIN_FACE_PX = 18;

export const LIMITS = [
  { id: 'R1', what: 'glare: frame share at Y > 235, worst 0.5 s', key: 'glare', max: 0.03,
    source: 'Kai: "quá chói, cháy sáng" on A v3 19/11 in 7 of 9 segments; A v3 takes 4-33 % (OPEN 17.7 %, bank counter 11.0 %, ending 16.2 %); A v9, approved, worst 2.1 % (diner)' },
  { id: 'R2', what: 'hero over background, worst take (head Y / ring Y)', key: 'heroBg', min: 0.9,
    source: 'guess to recalibrate: no Kai-flagged take has camera rows; A v9 worst take 0.98 (diner) passes; "nhân vật được thấy rõ ràng" (Kai, A v3 s3)' },
  { id: 'R3', what: `face under ${MIN_FACE_PX} px tall at 640, longest run (s)`, key: 'tinyRun', max: 3,
    source: 'guess to recalibrate: a face reads on a phone from about 18 px (a face detector\'s floor); the v4 review "16.7-19 s hero tiny"; A v9 longest 0.9 s' },
];

// one row per frame: { i, glare, lead: { px, hero, ring } | null }; boxes in rows are [x0, y0, x1, y1] at the rows' W x H
export function frameStat(Y, i, box) {
  let hi = 0;
  for (let k = 0; k < Y.length; k++) if (Y[k] > GLARE_Y) hi++;
  const out = { i, glare: hi / Y.length, lead: null };
  if (!box) return out;
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
  if (w <= 1 || h <= 1) return out;
  const mean = (a0, b0, a1, b1, skip) => {
    let s = 0, n = 0;
    for (let y = Math.max(0, Math.floor(b0)); y < Math.min(PH, Math.ceil(b1)); y++)
      for (let x = Math.max(0, Math.floor(a0)); x < Math.min(PW, Math.ceil(a1)); x++) {
        if (skip && x >= x0 && x < x1 && y >= y0 && y < y1) continue;
        s += Y[y * PW + x]; n++;
      }
    return n ? s / n : null;
  };
  const ix = 0.15 * w, iy = 0.15 * h, hero = mean(x0 + ix, y0 + iy, x1 - ix, y1 - iy, false);
  const ring = mean(x0 - RING * w, y0 - RING * h, x1 + RING * w, y1 + RING * h, true);
  if (hero == null || ring == null) return out;
  return { ...out, lead: { px: h, hero, ring } };
}

// the lead's head box per render frame, scaled to the phone frame; a head mostly out of frame counts as no head
export function leadBoxes(rows, W, H) {
  const sx = PW / W, sy = PH / H, out = new Map();
  for (const r of rows) {
    const a = Object.values(r.actors || {}).find(x => x.lead && x.inFrame && x.head);
    if (!a) continue;
    const [x0, y0, x1, y1] = a.head, cx = Math.max(0, Math.min(x1, W) - Math.max(x0, 0)), cy = Math.max(0, Math.min(y1, H) - Math.max(y0, 0));
    if (cx * cy < 0.5 * (x1 - x0) * (y1 - y0)) continue;
    out.set(r.f, [x0 * sx, y0 * sy, x1 * sx, y1 * sy]);
  }
  return out;
}

export function pixelPass(mp4, boxes) {
  return new Promise((resolve, reject) => {
    const ff = start('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-i', mp4, '-an', '-vf', `fps=${FPS},scale=${PW}:${PH}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const N = PW * PH, out = []; let buf = Buffer.alloc(0), err = '';
    ff.stdout.on('data', d => {
      buf = buf.length ? Buffer.concat([buf, d]) : d;
      while (buf.length >= N) { const i = out.length; out.push(frameStat(buf.subarray(0, N), i, boxes?.get(i) || null)); buf = buf.subarray(N); }
    });
    ff.stderr.on('data', d => { err += d; });
    ff.on('error', reject);
    ff.on('close', code => code ? reject(new Error(`ffmpeg could not read ${mp4}: ${err.trim()}`)) : resolve(out));
  });
}

const runs = flags => { const out = []; let a = null; flags.forEach((v, i) => { if (v && a == null) a = i; if (!v && a != null) { out.push([a, i - 1]); a = null; } }); if (a != null) out.push([a, flags.length - 1]); return out; };

// frames: frameStat rows in render order; cutFrames: render frames where a take starts; hasRows: camera rows were given
export function measure({ frames, cutFrames, hasRows }) {
  let glare = 0, glareAt = 0;
  for (let i = 0; i + RUN_F <= frames.length; i++) {
    let s = 0; for (let k = i; k < i + RUN_F; k++) s += frames[k].glare;
    if (s / RUN_F > glare) { glare = s / RUN_F; glareAt = i; }
  }
  const m = { frames: frames.length, glare, glareAt: glareAt / FPS };
  if (!hasRows) return m;
  const edges = [0, ...cutFrames.filter(f => f > 0 && f < frames.length), frames.length];
  const takes = edges.slice(1).map((b, k) => {
    const a = edges[k], led = frames.slice(a, b).filter(f => f.lead);
    return { t0: a / FPS, t1: b / FPS, leadS: led.length / FPS, heroBg: led.length >= RUN_F ? median(led.map(f => f.lead.hero / Math.max(f.lead.ring, 1))) : null,
      facePx: led.length ? median(led.map(f => f.lead.px)) : null };
  });
  const judged = takes.filter(t => t.heroBg != null), worst = judged.reduce((x, t) => (!x || t.heroBg < x.heroBg ? t : x), null);
  const tiny = runs(frames.map(f => !!f.lead && f.lead.px < MIN_FACE_PX)).reduce((x, r) => (!x || r[1] - r[0] > x[1] - x[0] ? r : x), null);
  return { ...m, takes, heroBg: worst?.heroBg ?? null, heroTake: worst, tinyRun: tiny ? (tiny[1] - tiny[0] + 1) / FPS : 0, tinyAt: tiny ? tiny[0] / FPS : null,
    leadShare: frames.filter(f => f.lead).length / frames.length };
}

export function judge(m) {
  return LIMITS.map(l => {
    const got = m[l.key];
    if (got == null) return { ...l, got: null, ok: null };
    return { ...l, got, ok: l.max != null ? got <= l.max : got >= l.min };
  });
}

const fmt = (key, v) => v == null ? 'n/a' : key === 'glare' ? `${(v * 100).toFixed(2)}%` : v.toFixed(2);
const want = l => l.max != null ? `≤ ${fmt(l.key, l.max)}` : `≥ ${fmt(l.key, l.min)}`;

export function table(m, res) {
  return ['| Check | Got | Limit | Result | Limit from |', '| --- | --- | --- | --- | --- |',
    ...res.map(r => `| ${r.id} ${r.what} | ${fmt(r.key, r.got)} | ${want(r)} | ${r.ok == null ? 'not measured' : r.ok ? 'PASS' : 'FAIL'} | ${r.source} |`), '',
    `Worst glare at ${m.glareAt.toFixed(1)} s.` + (m.heroTake ? ` Lowest hero take ${m.heroTake.t0.toFixed(1)}-${m.heroTake.t1.toFixed(1)} s.` : '') +
    (m.tinyAt != null ? ` Longest tiny face from ${m.tinyAt.toFixed(1)} s.` : '')];
}

const readRows = f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)).sort((a, b) => a.f - b.f);

export async function measureFile(mp4, rows, W, H) {
  const cutFrames = hardCuts(sceneScores(mp4)).map(c => Math.round(c.t * FPS));
  const frames = await pixelPass(mp4, rows ? leadBoxes(rows, W, H) : null);
  return measure({ frames, cutFrames, hasRows: !!rows });
}

async function filmMode(film) {
  const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p), final = finalRender(F('renders'));
  if (!final) { console.error(`${film}: no final render in renders/`); process.exit(1); }
  const { reelSpan, cachedReelDbg, DBG_W, DBG_H } = await import('#tools/render/reel_load.mjs');
  const mp4 = F(`renders/${final}`);
  let rows = null, unread = '';
  try {
    rows = (await segments(DIR, duration(mp4), reelSpan)).flatMap(s => cachedReelDbg(s.dir, s.f0, s.f1)
      .filter(r => r.f >= s.f0 && r.f <= s.f1).map(r => ({ ...r, f: s.at + r.f - s.f0 })));
  } catch (e) { unread = e.message.split('\n')[0]; }
  const m = await measureFile(mp4, rows, DBG_W, DBG_H), res = judge(m), v = verdict(res);
  fs.mkdirSync(F('review'), { recursive: true });
  fs.writeFileSync(F('review/readgate.md'), [`# Phone readability gate · ${final}`, '', `**${v}**`, '', ...table(m, res), unread ? `Camera not read: ${unread}.` : ''].join('\n') + '\n');
  console.log(`review/readgate.md: ${v} · ${res.map(r => `${r.id} ${fmt(r.key, r.got)}`).join(', ')}`);
  process.exit(v === 'PASS' ? 0 : 1);
}

async function fileMode(A) {
  const mp4 = path.resolve(A.mp4), rows = A.dbg ? readRows(path.resolve(A.dbg)) : null;
  const m = await measureFile(mp4, rows, Number(A.w || 720), Number(A.h || 1280)), res = judge(m), v = verdict(res);
  if (A.json) console.log(JSON.stringify({ file: mp4, ...m, verdict: v, results: res }));
  else console.log([`${path.basename(mp4)}: ${v}${v === 'PARTIAL' ? ' (R2, R3 not measured: give --dbg)' : ''}`, ...table(m, res)].join('\n'));
  process.exit(v === 'PASS' ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), USAGE = 'usage: readgate.mjs films/<slug> | readgate.mjs --mp4 <file> [--dbg <jsonl> --w <px> --h <px>] [--json 1]';
  if (!args[0] || args[0] === '--help' || args[0] === '-h') { console[args[0] ? 'log' : 'error'](USAGE); process.exit(args[0] ? 0 : 2); }
  if (args[0].startsWith('--')) {
    const A = {}; for (let i = 0; i < args.length; i += 2) A[args[i].replace(/^--/, '')] = args[i + 1];
    if (!A.mp4) { console.error(USAGE); process.exit(2); }
    await fileMode(A);
  } else await filmMode(args[0]);
}
