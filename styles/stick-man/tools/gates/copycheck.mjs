#!/usr/bin/env node
// A delivery copy against the film Kai approved (Post): a 1080 master, a re-encode, a platform export must be the same
// film, frame for frame. Three checks, each measured, none by eye:
//   K1 frames   the same number of frames at the same rate
//   K2 picture  (a) the copy, scaled to the approved size, matches the approved film as a whole (median SSIM at least
//               SSIM_MIN over every approved frame, each met by a real copy frame: not the wrong file, not shifted, not short); (b) no frame tears: the largest local difference
//               against the approved frame (luma, blurred sigma 3, 8-bit) never jumps more than SPIKE above the median
//               of the 4 frames each side (a whole whip or cut that differs evenly is not a jump)
//   K2c order   no frame repeated or skipped: each frame's change from the one before (mean luma difference) stays near the
//               approved film's (a repeat: under REPEAT of it while the approved moves; a skip: over SKIP of it)
//   K3 sound    the decoded audio is the same samples (a copied stream), or within LU_TOL of the approved loudness
// K2b sees short tears only (1-4 frames: a run of 5 is its own neighbourhood) and needs a quiet neighbourhood (a tear as
// large as V2.1's is missed on about 14 % of its frames). So the report always lists frames to look at beside the approved
// (lookAt): the ones that stand out from their neighbours and the ones most different from it, where a long tear lands.
//   node styles/stick-man/tools/gates/copycheck.mjs --copy <mp4> --approved <mp4> [--json 1] [--out <report.md>]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { run } from '../../../../kit/env.mjs';

export const SSIM_MIN = 0.95, SPIKE = 90, WIN = 4, LU_TOL = 0.5, LOOK = 8, REPEAT = 0.25, SKIP = 1.6;
export const SOURCES = {
  K2: 'Ep1 H2 V2.1 1080 copies against the approved 720 (24/11): median SSIM 0.983 / 0.984; the first try tore the two whips (its motion field was rebuilt at 1080), seen by eye after the copy had gone to the upload folder: jumps +108 (f1174) and +95 (f1141); the fixed copy jumps at most +83.5 (f440, in both). One film: the limit is thin, so K2 lists frames to look at',
  K2c: 'Ep1 H2 V2.1 1080 copies: the change ratio to the approved stays 0.76-1.21 on every moving frame of both copies; an adversary proved a dropped and a repeated frame passed K2a and K2b',
  K3: 'Ep1 H2 V2.1 1080 copy: the approved audio stream is copied, never re-mixed',
};

const ff = (tool, args) => run(tool, args, { capture: true });
export function probe(file) {
  const r = ff('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', file]);
  const s = JSON.parse(r.stdout || '{}').streams?.[0]; if (!s) throw new Error(`no video stream in ${file}`);
  const [a, b] = s.r_frame_rate.split('/').map(Number);
  return { w: s.width, h: s.height, fps: +(a / (b || 1)).toFixed(3), frames: Number(s.nb_read_packets) };
}
// the values of one key in an ffmpeg `metadata=print` file, in frame order
export const metaValues = (text, key) => [...text.matchAll(new RegExp(`${key}=([-+\\d.eE]+)`, 'g'))].map(m => Number(m[1]));
// one pass over both films: the SSIM of each copy frame (scaled to the approved size, area filter) against the approved
// frame, and the largest local difference (luma, blurred) per frame. ffmpeg runs in a temp folder and writes its two
// stats files there by name, so no path goes into the filter graph.
export function frameStats(copy, approved, { w, h }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copycheck-'));
  try {
    const change = (i, o) => `[${i}]format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${o}.log[${o}]`;
    const g = `[0:v]scale=${w}:${h}:flags=area,format=yuv420p,split=3[c1][c2][c3];[1:v]format=yuv420p,split=3[a1][a2][a3];`
      + `[c1][a1]ssim=stats_file=ssim.log:shortest=1[s];[c2]format=gray[cg];[a2]format=gray[ag];[cg][ag]blend=all_mode=difference:shortest=1,gblur=sigma=3,signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=ymax.log[d];`
      + `${change('c3', 'tc')};${change('a3', 'ta')}`;
    const out = ['[s]', '[d]', '[tc]', '[ta]'].flatMap(m => ['-map', m, '-f', 'null', '-']);
    const r = run('ffmpeg', ['-v', 'error', '-i', path.resolve(copy), '-i', path.resolve(approved), '-filter_complex', g, ...out], { capture: true, cwd: dir });
    if (r.status) throw new Error(`ffmpeg: ${r.stderr}`);
    const ssim = fs.readFileSync(path.join(dir, 'ssim.log'), 'utf8').split('\n').filter(Boolean).map(l => Number(/All:([-+\d.eE]+)/.exec(l)?.[1]));
    const meta = (f, key) => metaValues(fs.readFileSync(path.join(dir, f), 'utf8'), key);
    return { ssim, ymax: meta('ymax.log', 'YMAX'), tc: meta('tc.log', 'YAVG'), ta: meta('ta.log', 'YAVG') };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
export const median = a => { const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return !s.length ? null : s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
// frames whose local difference jumps more than SPIKE above the median of the WIN frames each side
export function jumps(ymax, { spike = SPIKE, win = WIN } = {}) {
  return ymax.flatMap((v, f) => { const nb = [...ymax.slice(Math.max(0, f - win), f), ...ymax.slice(f + 1, f + 1 + win)]; const j = v - (median(nb) ?? v);
    return j > spike ? [{ f, jump: +j.toFixed(1), ymax: v }] : []; });
}
// frames repeated (no change where the approved moves) or skipped (far more change than the approved); tc[i] and ta[i]
// are the change from frame i to frame i + 1
export function orderFaults(tc, ta, { repeat = REPEAT, skip = SKIP } = {}) {
  return tc.flatMap((c, i) => { const a = ta[i]; if (a == null) return [];
    if (a > 0.4 && c < repeat * a) return [{ f: i + 1, kind: 'repeat' }];
    return c > skip * a + 0.3 ? [{ f: i + 1, kind: 'skip' }] : []; });
}
// the frames to look at beside the approved, as runs in film order: the LOOK that stand out most from their neighbours
// (a tear under the K2b limit) and the LOOK / 2 most different from the approved (a long tear, the inside of a run)
export function lookAt(ymax, n = LOOK) {
  const J = ymax.map((v, f) => { const nb = [...ymax.slice(Math.max(0, f - WIN), f), ...ymax.slice(f + 1, f + 1 + WIN)]; return [f, v - (median(nb) ?? v)]; });
  const pick = new Set([...J.filter(([, j]) => j > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([f]) => f),
    ...ymax.map((v, f) => [f, v]).sort((a, b) => b[1] - a[1]).slice(0, n >> 1).map(([f]) => f)]), runs = [];
  for (const f of [...pick].sort((a, b) => a - b)) { const r = runs.at(-1); if (r && f === r.to + 1) { r.to = f; r.ymax = Math.max(r.ymax, ymax[f]); } else runs.push({ from: f, to: f, ymax: ymax[f] }); }
  return runs;
}
const audioMd5 = f => { const r = ff('ffmpeg', ['-v', 'error', '-i', f, '-map', '0:a:0', '-f', 'md5', '-']); return r.status ? null : r.stdout.trim(); };
const loudness = f => { const r = ff('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-map', '0:a:0', '-af', 'ebur128', '-f', 'null', '-']); return Number([...(r.stderr || '').matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1]); };

export function copycheck(o) {
  const copy = path.resolve(o.copy), approved = path.resolve(o.approved), C = probe(copy), A = probe(approved), rows = [];
  rows.push({ id: 'K1', what: 'frames and rate', ok: C.frames === A.frames && C.fps === A.fps, got: `${C.frames} f at ${C.fps} (${C.w}x${C.h})`, want: `${A.frames} f at ${A.fps} (${A.w}x${A.h})` });
  const F = frameStats(copy, approved, A), m = median(F.ssim), J = jumps(F.ymax);
  const all = F.ssim.length === A.frames && F.ymax.length === A.frames;   // every approved frame met its copy frame
  rows.push({ id: 'K2a', what: 'the same film (median SSIM)', ok: all && m >= SSIM_MIN,
    got: `${Number.isFinite(m) ? m.toFixed(3) : '?'} over ${F.ssim.length} of ${A.frames} frames`, want: `at least ${SSIM_MIN}, every frame` });
  rows.push({ id: 'K2b', what: 'no torn frame (local jump)', ok: !J.length, got: J.length ? J.map(j => `f${j.f} +${j.jump}`).join(', ') : 'none', want: `no jump over ${SPIKE}` });
  const O = orderFaults(F.tc, F.ta);
  rows.push({ id: 'K2c', what: 'no frame repeated or skipped', ok: !O.length, got: O.length ? O.slice(0, 6).map(x => `f${x.f} ${x.kind}`).join(', ') + (O.length > 6 ? ` (+${O.length - 6})` : '') : 'none', want: 'none' });
  const ma = audioMd5(copy), mb = audioMd5(approved), same = ma && ma === mb;
  const lu = same ? 0 : Math.abs(loudness(copy) - loudness(approved));
  rows.push({ id: 'K3', what: 'the approved sound', ok: Boolean(same || lu <= LU_TOL), got: same ? 'identical samples' : `${Number.isFinite(lu) ? lu.toFixed(2) : '?'} LU from the approved`, want: `identical, or within ${LU_TOL} LU` });
  return { ok: rows.every(r => r.ok), rows, jumps: J, look: lookAt(F.ymax), fps: A.fps };
}

export function report(R, { copy, approved }) {
  const t = f => (f / R.fps).toFixed(2);
  return [`# Copy check: ${path.basename(copy)} against ${path.basename(approved)}`, '', `**${R.ok ? 'PASS' : 'FAIL'}**`, '',
    '| Check | What | Got | Limit | |', '| --- | --- | --- | --- | --- |', ...R.rows.map(r => `| ${r.id} | ${r.what} | ${r.got} | ${r.want} | ${r.ok ? 'PASS' : 'FAIL'} |`), '',
    ...(R.jumps.length ? ['Frames to look at (copy beside the approved):', '', '| Frame | Time | Jump |', '| --- | --- | --- |', ...R.jumps.map(j => `| ${j.f} | ${t(j.f)} s | +${j.jump} |`), ''] : []),
    'Frames to look at beside the approved (they stand out from their neighbours, or differ most from it):', '', '| Frames | Time | Local difference |', '| --- | --- | --- |',
    ...R.look.map(r => `| ${r.from}-${r.to} | ${t(r.from)}-${t(r.to + 1)} s | ${r.ymax} |`), '',
    ...Object.entries(SOURCES).map(([k, v]) => `- ${k} source: ${v}`)].join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  if (!A.copy || !A.approved || ![A.copy, A.approved].every(f => fs.existsSync(f))) { console.error('usage: copycheck.mjs --copy <mp4> --approved <mp4> [--json 1] [--out <md>]'); process.exit(2); }
  const R = copycheck(A), md = report(R, A);
  if (A.out) fs.writeFileSync(A.out, md);
  console.log(A.json ? JSON.stringify(R, null, 1) : md.trim());
  process.exit(R.ok ? 0 : 1);
}
