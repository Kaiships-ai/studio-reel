#!/usr/bin/env node
// A delivery copy against the film Kai approved (Post): a 1080 master, a re-encode, a platform export must be the same
// film, frame for frame. Three checks, each measured, none by eye:
//   K1 frames   the same number of frames at the same rate
//   K2 picture  (a) the copy, scaled to the approved size, matches the approved film as a whole (median SSIM at least
//               SSIM_MIN: not the wrong file, not shifted by a frame); (b) no frame tears: the largest local difference
//               against the approved frame (luma, blurred sigma 3, 8-bit) never jumps more than SPIKE above the median
//               of the 4 frames each side (a whole whip or cut that differs evenly is not a jump)
//   K3 sound    the decoded audio is the same samples (a copied stream), or within LU_TOL of the approved loudness
//   node styles/stick-man/tools/gates/copycheck.mjs --copy <mp4> --approved <mp4> [--json 1] [--out <report.md>]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { run } from '../../../../kit/env.mjs';

export const SSIM_MIN = 0.95, SPIKE = 90, WIN = 4, LU_TOL = 0.5;
export const SOURCES = {
  K2: 'Ep1 H2 V2.1 1080 copies against the approved 720 (24/11): median SSIM 0.983 / 0.984; the first try tore the two whips (its motion field was rebuilt at 1080), seen by eye after the copy had gone to the upload folder: jumps +108 (f1174) and +95 (f1141); the fixed copy jumps at most +83.5 (f440, in both). One film: the limit is thin, so K2 lists frames to look at',
  K3: 'Ep1 H2 V2.1 1080 copy: the approved audio stream is copied, never re-mixed',
};

const ff = (tool, args) => run(tool, args, { capture: true });
export function probe(file) {
  const r = ff('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', file]);
  const s = JSON.parse(r.stdout || '{}').streams?.[0]; if (!s) throw new Error(`no video stream in ${file}`);
  const [a, b] = s.r_frame_rate.split('/').map(Number);
  return { w: s.width, h: s.height, fps: +(a / (b || 1)).toFixed(3), frames: Number(s.nb_read_packets) };
}
// one pass over both films: the SSIM of each copy frame (scaled to the approved size, area filter) against the approved
// frame, and the largest local difference (luma, blurred) per frame
export function frameStats(copy, approved, { w, h }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copycheck-')), ss = path.join(dir, 'ssim.log'), dy = path.join(dir, 'ymax.log');
  const esc = f => f.replace(/\\/g, '/').replace(/:/g, '\\:');
  const g = `[0:v]scale=${w}:${h}:flags=area,format=yuv420p,split[c1][c2];[1:v]format=yuv420p,split[a1][a2];`
    + `[c1][a1]ssim=stats_file='${esc(ss)}'[s];[c2]format=gray[cg];[a2]format=gray[ag];[cg][ag]blend=all_mode=difference,gblur=sigma=3,signalstats,metadata=print:key=lavfi.signalstats.YMAX:file='${esc(dy)}'[d]`;
  const r = ff('ffmpeg', ['-v', 'error', '-i', copy, '-i', approved, '-filter_complex', g, '-map', '[s]', '-f', 'null', '-', '-map', '[d]', '-f', 'null', '-']);
  if (r.status) throw new Error(`ffmpeg: ${r.stderr}`);
  const ssim = fs.readFileSync(ss, 'utf8').split('\n').filter(Boolean).map(l => Number(/All:([\d.]+)/.exec(l)?.[1]));
  const ymax = [...fs.readFileSync(dy, 'utf8').matchAll(/YMAX=([\d.]+)/g)].map(m => Number(m[1]));
  fs.rmSync(dir, { recursive: true, force: true });
  return { ssim, ymax };
}
export const median = a => { const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return !s.length ? null : s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
// frames whose local difference jumps more than SPIKE above the median of the WIN frames each side
export function jumps(ymax, { spike = SPIKE, win = WIN } = {}) {
  return ymax.flatMap((v, f) => { const nb = [...ymax.slice(Math.max(0, f - win), f), ...ymax.slice(f + 1, f + 1 + win)]; const j = v - (median(nb) ?? v);
    return j > spike ? [{ f, jump: +j.toFixed(1), ymax: v }] : []; });
}
const audioMd5 = f => { const r = ff('ffmpeg', ['-v', 'error', '-i', f, '-map', '0:a:0', '-f', 'md5', '-']); return r.status ? null : r.stdout.trim(); };
const loudness = f => { const r = ff('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-map', '0:a:0', '-af', 'ebur128', '-f', 'null', '-']); return Number([...(r.stderr || '').matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1]); };

export function copycheck({ copy, approved }) {
  const C = probe(copy), A = probe(approved), rows = [];
  rows.push({ id: 'K1', what: 'frames and rate', ok: C.frames === A.frames && C.fps === A.fps, got: `${C.frames} f at ${C.fps} (${C.w}x${C.h})`, want: `${A.frames} f at ${A.fps} (${A.w}x${A.h})` });
  const F = frameStats(copy, approved, A), m = median(F.ssim), J = jumps(F.ymax);
  rows.push({ id: 'K2a', what: 'the same film (median SSIM)', ok: m >= SSIM_MIN, got: m.toFixed(3), want: `at least ${SSIM_MIN}` });
  rows.push({ id: 'K2b', what: 'no torn frame (local jump)', ok: !J.length, got: J.length ? J.map(j => `f${j.f} +${j.jump}`).join(', ') : 'none', want: `no jump over ${SPIKE}` });
  const ma = audioMd5(copy), mb = audioMd5(approved), same = ma && ma === mb;
  const lu = same ? 0 : Math.abs(loudness(copy) - loudness(approved));
  rows.push({ id: 'K3', what: 'the approved sound', ok: Boolean(same || lu <= LU_TOL), got: same ? 'identical samples' : `${Number.isFinite(lu) ? lu.toFixed(2) : '?'} LU from the approved`, want: `identical, or within ${LU_TOL} LU` });
  return { ok: rows.every(r => r.ok), rows, jumps: J, fps: A.fps };
}

export function report(R, { copy, approved }) {
  const t = f => (f / R.fps).toFixed(2);
  return [`# Copy check: ${path.basename(copy)} against ${path.basename(approved)}`, '', `**${R.ok ? 'PASS' : 'FAIL'}**`, '',
    '| Check | What | Got | Limit | |', '| --- | --- | --- | --- | --- |', ...R.rows.map(r => `| ${r.id} | ${r.what} | ${r.got} | ${r.want} | ${r.ok ? 'PASS' : 'FAIL'} |`), '',
    ...(R.jumps.length ? ['Frames to look at (copy beside the approved):', '', '| Frame | Time | Jump |', '| --- | --- | --- |', ...R.jumps.map(j => `| ${j.f} | ${t(j.f)} s | +${j.jump} |`), ''] : []),
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
