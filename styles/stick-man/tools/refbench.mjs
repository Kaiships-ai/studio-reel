// The Rick clip benchmark: one code path measures any mp4 (a reference short, our render) and writes one row of numbers
// per video plus one per shot, so "polish" becomes a gap per metric. Methods and limits: styles/stick-man/bench/README.md.
//   node styles/stick-man/tools/refbench.mjs <mp4> [--id <name>] [--url <source>] [--stems <dir with sfx.wav>] [--out <row.json>]
//   node styles/stick-man/tools/refbench.mjs noise <mp4> --out <noise.json>     the same clip twice plus three re-encodes
//   node styles/stick-man/tools/refbench.mjs strips <mp4> <dir> [--n 10]       30-frame strips (6 x 5 tiles) for counting
//   node styles/stick-man/tools/refbench.mjs counts <key.json> <agent.json>... --out <bench dir>/counts.json
//        blind agents' strip counts (blinks, depth planes) back to videos: key.json maps S01.jpg -> <video>_NN.jpg
//   node styles/stick-man/tools/refbench.mjs table <bench dir>                  the gap table (TABLE.md) from the rows
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, start } from '../../../kit/env.mjs';
import { sceneScores, duration, measure as cutMeasure } from './cutgate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PY = path.join(HERE, 'refbench.py');
const FW = 720, FH = 1280, TO_1080 = 1080 / 360, FPS = 30;
// camera still / slow: median flow under 0.2 / 2 px a frame at 1080 wide
const STILL = 0.2 / TO_1080, SLOW = 2 / TO_1080, MIN_PAIRS = 15, BED_PRESENT_DB = -45, SFX_ON_CUT_S = 0.1;
const ABS_GATE = -70, PAYOFF_LOOKBACK = 3, DIP_DB = 10, MOMENTARY_S = 0.4;   // a momentary reading covers the 0.4 s before its time

// The registry every table, test and page reads. methodErr: the error of an estimate checked against ground truth (the
// bed rows against our v1 music and ambience stems: sd 2.9 dB a section, about 4.1 dB for a difference of two sections);
// the floor a gap must beat is the larger of it and the re-encode spread. dir: which way is "more like the bar" is unknown, so no arrow is drawn;
// a gap is reported as a difference from the Rick median and read against the noise floor.
export const METRICS = [
  { key: 'cutsPerMin', label: 'hard cuts / min', group: 'cut', digits: 1 },
  { key: 'longestTake', label: 'longest take (s)', group: 'cut', digits: 1 },
  { key: 'medianTake', label: 'median take (s)', group: 'cut', digits: 1 },
  { key: 'luma', label: 'mean luma (Y, 0-255)', group: 'look', digits: 1 },
  { key: 'sat', label: 'mean saturation', group: 'look', digits: 1 },
  { key: 'sharpHi', label: 'sharpest edges (1/px)', group: 'depth', digits: 3 },
  { key: 'sharpLo', label: 'softest edges, background (1/px)', group: 'depth', digits: 3 },
  { key: 'depthRatio', label: 'depth ratio (sharp / soft)', group: 'depth', digits: 2 },
  { key: 'cameraMotion', label: 'camera motion (px/frame @1080)', group: 'motion', digits: 2 },
  { key: 'stillShare', label: 'camera still (share of frames)', group: 'motion', digits: 2 },
  { key: 'idleEnergy', label: 'motion inside slow shots, pan removed (px/frame @1080)', group: 'motion', digits: 2 },
  { key: 'idleStill', label: 'motion while the camera is still (px/frame @1080)', group: 'motion', digits: 2 },
  { key: 'lufsI', label: 'loudness, whole film (LUFS)', group: 'sound', digits: 1 },
  { key: 'lufs3', label: 'loudness, first 3 s (LUFS)', group: 'sound', digits: 1 },
  { key: 'lufsEnd5', label: 'loudness, last 5 s (LUFS)', group: 'sound', digits: 1 },
  { key: 'loudSpread', label: 'loudness spread, 3 s short-term every 1 s (p90 - p10, LU)', group: 'sound', digits: 1 },
  { key: 'lra', label: 'loudness range (LU)', group: 'sound', digits: 1 },
  { key: 'truePeak', label: 'true peak (dBFS)', group: 'sound', digits: 1 },
  { key: 'payoffT', label: 'loudest moment, the payoff (s from the start)', group: 'sound', digits: 1 },
  { key: 'payoffDipDb', label: 'dip before the payoff, depth under the film median (dB)', group: 'sound', digits: 1 },
  { key: 'payoffDipS', label: 'dip before the payoff, length > 10 dB under (s)', group: 'sound', digits: 1 },
  { key: 'speechShare', label: 'speech (share of time)', group: 'sound', digits: 2 },
  { key: 'bedPresence', label: 'music/ambience bed present (share of 5 s sections)', group: 'sound', digits: 2 },
  { key: 'bedDb', label: 'bed level (dBFS, median of 5 s sections)', group: 'sound', digits: 1, methodErr: 2.9 },
  { key: 'bedBelowLoud', label: 'bed under the loud parts (dB)', group: 'sound', digits: 1, methodErr: 2.9 },
  { key: 'bedDrop', label: 'biggest bed drop between sections (dB)', group: 'sound', digits: 1, methodErr: 4.1 },
  { key: 'bedAtPayoff', label: 'bed in the 2 s before the payoff minus the median bed (dB)', group: 'sound', digits: 1, methodErr: 4.1 },
  { key: 'sfxPerMin', label: 'effects / min (sfx stem, or a listening count)', group: 'sound', digits: 1 },
  { key: 'sfxOnCuts', label: 'cuts with an effect within 0.1 s (needs a stem)', group: 'sound', digits: 2 },
  { key: 'blinksPer10s', label: 'blinks / 10 s (blind agent count)', group: 'count', digits: 1 },
  { key: 'depthPlanes', label: 'depth planes (blind agent count)', group: 'count', digits: 1 },
];

const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => { const s = a.filter(x => x != null); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : null; };
const round = (v, d = 4) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d;

function probe(mp4) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', mp4], { capture: true });
  if (r.status) throw new Error(`ffprobe could not read ${mp4}`);
  const s = JSON.parse(r.stdout).streams[0]; const [a, b] = s.r_frame_rate.split('/').map(Number);
  const hasAudio = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', mp4], { capture: true }).stdout.trim() !== '';
  return { w: s.width, h: s.height, fps: a / b, hasAudio };
}

// Every frame pass runs at a constant FPS: a variable-frame-rate file is resampled first, so frame i sits at i / FPS
// seconds in both passes and a shot's frames are found from its times.
export function lookStats(mp4) {
  // the chain of the round 4 film log (scale 180 wide, signalstats on every frame), printed once per frame: two print
  // filters on one stdout interleave their buffers and garble lines
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-i', mp4, '-an', '-vf',
    `fps=${FPS},scale=180:-2,signalstats,metadata=print:file=-`, '-f', 'null', '-'], { capture: true });
  if (r.status) throw new Error(`signalstats failed on ${mp4}: ${r.stderr}`);
  const Y = [], S = [];
  for (const block of r.stdout.split(/^frame:/m).slice(1)) {
    const y = block.match(/\.YAVG=([\d.]+)/), s = block.match(/\.SATAVG=([\d.]+)/);
    if (!y || !s) throw new Error(`signalstats printed a frame without YAVG and SATAVG on ${mp4}`);
    Y.push(Number(y[1])); S.push(Number(s[1]));
  }
  return { Y, S };
}

export function pixelRows(mp4) {
  return new Promise((resolve, reject) => {
    const ff = start('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-i', mp4, '-an', '-vf', `fps=${FPS},scale=${FW}:${FH}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const py = start('python', ['-I', PY, 'frames', String(FW), String(FH)], { stdio: ['pipe', 'pipe', 'pipe'] });
    ff.stdout.pipe(py.stdin);
    let out = '', err = '';
    py.stdout.on('data', d => { out += d; });
    py.stderr.on('data', d => { err += d; });
    ff.stderr.on('data', d => { err += d; });
    py.on('error', reject); ff.on('error', reject);
    py.on('close', code => code ? reject(new Error(`refbench.py frames exited ${code}: ${err.trim()}`)) : resolve(out.trim().split('\n').filter(Boolean).map(l => JSON.parse(l))));
  });
}

// first / last: measure only the first or the last that many seconds. M is the momentary loudness (400 ms) every
// 0.1 s, S the short-term loudness (3 s) every 1 s from 3 s on, both floored at the -70 LUFS absolute gate. A file
// that is all digital silence has a true peak of -Infinity.
export function ebur128(mp4, { first = null, last = null } = {}) {
  const cut = first ? ['-t', String(first)] : last ? ['-sseof', `-${last}`] : [];
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-nostats', '-v', 'verbose', ...cut, '-i', mp4, '-vn',
    '-af', 'ebur128=peak=true:framelog=verbose', '-f', 'null', '-'], { capture: true });
  if (r.status) throw new Error(`ebur128 failed on ${mp4}`);
  const sum = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const num = re => { const m = sum.match(re); return m ? Number(m[1]) : null; };
  const lu = v => v === '-inf' ? ABS_GATE : Math.max(Number(v), ABS_GATE);
  const M = [], S = [];
  for (const l of r.stderr.split('\n')) {
    const m = l.match(/\bt:\s*([\d.]+).*?\bM:\s*(-?[\d.]+|-inf)\s+S:\s*(-?[\d.]+|-inf)/);
    if (!m) continue;
    const t = Math.round(Number(m[1]) * 10) / 10;
    M.push([t, lu(m[2])]);
    if (t >= 3 && Number.isInteger(t)) S.push(lu(m[3]));
  }
  const pk = sum.match(/Peak:\s*(-?[\d.]+|-inf) dBFS/);
  return { I: num(/I:\s*(-?[\d.]+) LUFS/), lra: num(/LRA:\s*([\d.]+) LU\n/), peak: !pk ? null : pk[1] === '-inf' ? -Infinity : Number(pk[1]), M, S };
}

// The payoff is the loudest momentary reading of the film. The dip before it is the lowest momentary reading in the
// PAYOFF_LOOKBACK s before it, measured down from the film's median; its length is the longest run in that window
// more than DIP_DB under the median.
export function payoffStats(M) {
  const film = M.filter(([t]) => t >= MOMENTARY_S);
  if (!film.length) return { payoffT: null, payoffDipDb: null, payoffDipS: null };
  const [tp] = film.reduce((best, x) => x[1] > best[1] ? x : best);
  const level = median(film.map(x => x[1])), win = film.filter(([t]) => t >= tp - PAYOFF_LOOKBACK && t < tp).map(x => x[1]);
  let cur = 0, longest = 0;
  for (const v of win) { cur = v < level - DIP_DB ? cur + 1 : 0; longest = Math.max(longest, cur); }
  return { payoffT: tp, payoffDipDb: win.length ? level - Math.min(...win) : null, payoffDipS: longest / 10 };
}

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y), k = (s.length - 1) * p / 100, i = Math.floor(k); return s.length ? s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (k - i) : null; };

function wav16k(src, dst) {
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', dst], { capture: true });
  if (r.status) throw new Error(`could not decode the audio of ${src}: ${r.stderr}`);
}

export function audioRows(mp4, payoffT, sfxStem) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refbench-'));
  try {
    const a = path.join(tmp, 'a.wav'); wav16k(mp4, a);
    const args = ['-I', PY, 'audio', a, String(payoffT == null ? -1 : payoffT - MOMENTARY_S)];
    if (sfxStem) { const s = path.join(tmp, 's.wav'); wav16k(sfxStem, s); args.push(s); }
    const r = run('python', args, { capture: true });
    if (r.status) throw new Error(`refbench.py audio failed: ${r.stderr}`);
    return JSON.parse(r.stdout);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// Pixel rows -> metrics over frames [f0, f1). Pairs that span a hard cut are not flow.
export function motionStats(rows, f0, f1, cutFrames) {
  const near = i => cutFrames.some(c => Math.abs(i - c) <= 1);
  const span = rows.filter(r => r.i >= f0 && r.i < f1);
  const pairs = span.filter(r => r.cam != null && !near(r.i));
  const still = pairs.filter(r => r.cam < STILL), slow = pairs.filter(r => r.cam < SLOW);
  return {
    sharpHi: median(span.map(r => r.sharpHi)), sharpLo: median(span.map(r => r.sharpLo)), depthRatio: median(span.map(r => r.depthRatio)),
    cameraMotion: pairs.length ? median(pairs.map(r => r.cam)) * TO_1080 : null,
    stillShare: pairs.length ? still.length / pairs.length : null,
    idleEnergy: slow.length >= MIN_PAIRS ? mean(slow.map(r => r.top)) * TO_1080 : null,
    idleStill: still.length >= MIN_PAIRS ? mean(still.map(r => r.top)) * TO_1080 : null,
    slowPairs: slow.length,
  };
}

export function bedStats(beds) {
  if (!beds?.length) return { bedPresence: null, bedDb: null, bedDrop: null };
  let drop = 0;
  for (let i = 1; i < beds.length; i++) drop = Math.max(drop, beds[i - 1] - beds[i]);
  return { bedPresence: beds.filter(b => b > BED_PRESENT_DB).length / beds.length, bedDb: median(beds), bedDrop: drop };
}

export async function measureVideo(mp4, { id = path.basename(mp4, '.mp4'), url = null, stems = null } = {}) {
  const t0 = Date.now();
  const info = probe(mp4), dur = duration(mp4);
  if (Math.abs(info.w / info.h - 9 / 16) > 0.02) throw new Error(`${mp4} is ${info.w}x${info.h}; refbench compares 9:16 shorts only`);
  const cut = cutMeasure({ dur, scores: sceneScores(mp4) });
  const cutT = cut.cuts.map(c => c.t), cutFrames = cutT.map(t => Math.round(t * FPS));
  const edges = [0, ...cutT, dur], takes = edges.slice(1).map((t, i) => t - edges[i]);
  const { Y, S } = lookStats(mp4);
  const px = await pixelRows(mp4);
  const shots = takes.map((_, k) => {
    const a = edges[k], b = edges[k + 1], f0 = Math.round(a * FPS), f1 = Math.round(b * FPS);
    return { shot: k + 1, t0: round(a, 2), t1: round(b, 2), luma: round(mean(Y.slice(f0, f1)), 1), sat: round(mean(S.slice(f0, f1)), 1),
      ...Object.fromEntries(Object.entries(motionStats(px, f0, f1, cutFrames)).map(([k2, v]) => [k2, round(v)])) };
  });
  const film = { cutsPerMin: cut.cutsPerMin, longestTake: cut.longestTake, medianTake: median(takes), luma: mean(Y), sat: mean(S),
    ...motionStats(px, 0, Infinity, cutFrames) };
  let audio = { curve: [], beds: [] }, silent = null;
  if (info.hasAudio) {
    const sfx = stems && fs.existsSync(path.join(stems, 'sfx.wav')) ? path.join(stems, 'sfx.wav') : null;
    const e = ebur128(mp4), e3 = ebur128(mp4, { first: 3 }), e5 = ebur128(mp4, { last: 5 }), pay = payoffStats(e.M), a = audioRows(mp4, pay.payoffT, sfx);
    silent = e.peak === -Infinity;
    Object.assign(film, { lufsI: e.I, lufs3: e3.I, lufsEnd5: e5.I, loudSpread: e.S.length ? pct(e.S, 90) - pct(e.S, 10) : null, lra: e.lra,
      truePeak: silent ? null : e.peak, ...pay, speechShare: a.speechShare, bedBelowLoud: a.bedBelowLoud, ...bedStats(a.beds), bedAtPayoff: a.bedAtPayoff });
    if (a.sfxOnsets) {
      film.sfxPerMin = a.sfxOnsets.length * 60 / dur;
      film.sfxOnCuts = cutT.length ? cutT.filter(t => a.sfxOnsets.some(o => Math.abs(o - t) <= SFX_ON_CUT_S)).length / cutT.length : null;
    }
    audio = { curve: e.S, beds: a.beds, sfxOnsets: a.sfxOnsets ?? null };
  }
  return { id, source: url ?? path.basename(mp4), ...(silent == null ? {} : { silent }), video: { ...info, dur: round(dur, 2), frames: Y.length }, cuts: cutT.map(t => round(t, 2)),
    film: Object.fromEntries(Object.entries(film).map(([k, v]) => [k, round(v)])), shots, audio, secs: round((Date.now() - t0) / 1000, 1) };
}

// Noise floor: the same clip measured twice (must agree exactly) and three re-encodes a viewer could not tell apart
// (CRF 28, 720x1280, and a one-frame shift). The spread over the re-encodes is what a gap must exceed.
export const PERTURB = [
  { name: 'crf28', args: ['-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast'] },
  { name: '720p', args: ['-vf', 'scale=720:1280:flags=bicubic', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast'] },
  { name: 'shift1', args: ['-vf', 'trim=start_frame=1,setpts=PTS-STARTPTS', '-af', 'atrim=start=0.0333333,asetpts=PTS-STARTPTS', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast'] },
];

export function spread(rows) {
  return Object.fromEntries(METRICS.map(({ key }) => {
    const v = rows.map(r => r.film[key]).filter(x => x != null);
    return [key, v.length === rows.length && v.length ? round(Math.max(...v) - Math.min(...v)) : null];
  }));
}

async function noise(mp4, out) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refbench-noise-'));
  try {
    const a = await measureVideo(mp4), b = await measureVideo(mp4);
    const variants = [];
    for (const p of PERTURB) {
      const f = path.join(tmp, `${p.name}.mp4`);
      const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-i', mp4, ...p.args, '-c:a', 'aac', '-b:a', '192k', f], { capture: true });
      if (r.status) throw new Error(`could not make the ${p.name} copy: ${r.stderr}`);
      variants.push({ name: p.name, row: await measureVideo(f) });
    }
    const res = { clip: path.basename(mp4), repeat: spread([a, b]), floor: spread([a, ...variants.map(v => v.row)]),
      values: { original: a.film, ...Object.fromEntries(variants.map(v => [v.name, v.row.film])) } };
    fs.writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
    return res;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

export function strips(mp4, dir, n = 10) {
  fs.mkdirSync(dir, { recursive: true });
  const dur = duration(mp4), files = [];
  for (let k = 0; k < n; k++) {
    const t = Math.max(0, (k + 0.5) * dur / n - 0.5), f = path.join(dir, `${path.basename(mp4, '.mp4')}_${String(k + 1).padStart(2, '0')}.jpg`);
    const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-ss', t.toFixed(3), '-i', mp4, '-vf', 'trim=end_frame=30,scale=216:384,tile=6x5', '-frames:v', '1', '-q:v', '3', f], { capture: true });
    if (r.status) throw new Error(`strip ${k + 1} of ${mp4} failed: ${r.stderr}`);
    files.push({ file: f, t: round(t, 2) });
  }
  return files;
}

// Gap table: Rick median and band (min-max of the reference rows), each of our rows, our gap from the Rick median, and
// the noise floor. A gap counts only when it is larger than the floor and our value sits outside the Rick band.
// A listening count (listening.json) wins over a measured value of the same metric, so every row of that metric is
// read the same way: the effect rate of a mix has no stem behind it.
export function gapTable({ rick, ours, floor = {}, counts = {}, listening = {} }) {
  const val = (row, key) => listening[row.id]?.[key] ?? row.film[key] ?? counts[row.id]?.[key] ?? null;
  return METRICS.map(m => {
    const r = rick.map(x => val(x, m.key)).filter(v => v != null);
    const med = r.length === rick.length ? median(r) : null, lo = r.length ? Math.min(...r) : null, hi = r.length ? Math.max(...r) : null;
    const nf = floor[m.key] == null ? null : Math.max(floor[m.key], m.methodErr ?? 0);
    const us = ours.map(o => {
      const v = val(o, m.key), gap = v != null && med != null ? v - med : null;
      const real = gap != null && nf != null && Math.abs(gap) > nf && (v < lo || v > hi);
      return { id: o.id, v, gap, real, silent: m.key === 'truePeak' && o.silent === true };
    });
    return { ...m, rickMedian: med, rickLo: lo, rickHi: hi, floor: nf, ours: us };
  });
}

export function tableMarkdown(rows, ourIds) {
  const f = (v, d) => v == null ? 'n/a' : v.toFixed(d);
  const head = `| Metric | Rick median | Rick band | ${ourIds.join(' | ')} | ${ourIds.map(i => `gap ${i}`).join(' | ')} | noise floor | real gap? |`;
  const sep = `|${' --- |'.repeat(5 + ourIds.length * 2)}`;
  return [head, sep, ...rows.map(r => {
    const band = r.rickLo == null ? 'n/a' : `${f(r.rickLo, r.digits)} to ${f(r.rickHi, r.digits)}`;
    const gaps = r.ours.map(o => o.gap == null ? 'n/a' : `${o.gap > 0 ? '+' : ''}${o.gap.toFixed(r.digits)}`);
    const real = r.floor == null ? 'no floor' : r.ours.map(o => o.real ? `yes (${o.id})` : null).filter(Boolean).join(', ') || 'no';
    return `| ${r.label} | ${f(r.rickMedian, r.digits)} | ${band} | ${r.ours.map(o => o.silent ? 'silent' : f(o.v, r.digits)).join(' | ')} | ${gaps.join(' | ')} | ${f(r.floor, r.digits)} | ${real} |`;
  })].join('\n');
}

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export function loadBench(dir) {
  const rows = sub => fs.existsSync(path.join(dir, sub)) ? fs.readdirSync(path.join(dir, sub)).filter(f => f.endsWith('.json')).sort().map(f => readJson(path.join(dir, sub, f))) : [];
  const floors = fs.readdirSync(dir).filter(f => /^noise.*\.json$/.test(f)).map(f => readJson(path.join(dir, f)).floor);
  const floor = Object.fromEntries(METRICS.map(({ key }) => { const v = floors.map(x => x[key]).filter(x => x != null); return [key, v.length ? Math.max(...v) : null]; }));
  const byVideo = f => fs.existsSync(path.join(dir, f)) ? readJson(path.join(dir, f)).byVideo : {};
  const counts = byVideo('counts.json'), listening = byVideo('listening.json');
  for (const c of [counts, listening]) {
    for (const key of new Set(Object.values(c).flatMap(v => Object.keys(v.spread ?? {})))) {
      const sp = Object.values(c).map(v => v.spread?.[key]).filter(x => x != null);
      if (sp.length) floor[key] = Math.max(...sp);
    }
  }
  return { rick: rows('rick'), ours: rows('ours'), floor, counts, listening };
}

// Per agent: blinks per 10 s over the strips where it saw a face, depth planes averaged over all strips. The video's
// value is the mean of the agents; the spread between agents is kept as that count's noise.
export function mergeCounts(key, agents) {
  const byVideo = {};
  for (const [strip, file] of Object.entries(key)) {
    const video = file.replace(/_\d+\.jpg$/, '');
    byVideo[video] ??= agents.map(() => []);
    const c = strip.replace(/\.jpg$/, '');
    agents.forEach((a, i) => { const r = a[strip] ?? a[c]; if (r) byVideo[video][i].push(r); });
  }
  const per = rows => ({ blinksPer10s: rows.some(r => r.faceVisible) ? 10 * rows.filter(r => r.faceVisible).reduce((x, r) => x + r.blinks, 0) / rows.filter(r => r.faceVisible).length : null,
    depthPlanes: mean(rows.map(r => r.depthPlanes)), faceStrips: rows.filter(r => r.faceVisible).length });
  return Object.fromEntries(Object.entries(byVideo).map(([v, lists]) => {
    const each = lists.map(per), m = k => mean(each.map(e => e[k]));
    const sp = k => { const v2 = each.map(e => e[k]).filter(x => x != null); return v2.length ? Math.max(...v2) - Math.min(...v2) : null; };
    return [v, { blinksPer10s: round(m('blinksPer10s'), 2), depthPlanes: round(m('depthPlanes'), 2), agents: each, spread: { blinksPer10s: round(sp('blinksPer10s'), 2), depthPlanes: round(sp('depthPlanes'), 2) } }];
  }));
}

const flag = (args, name, dflt = null) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), cmd = args[0];
  try {
    if (!cmd || cmd === '--help') {
      const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
      console.log(head.slice(0, head.findIndex(l => !l.startsWith('//'))).join('\n'));
    } else if (cmd === 'noise') {
      const res = await noise(path.resolve(args[1]), path.resolve(flag(args, 'out', 'noise.json')));
      console.log(JSON.stringify({ repeat: res.repeat, floor: res.floor }, null, 1));
    } else if (cmd === 'strips') {
      for (const s of strips(path.resolve(args[1]), path.resolve(args[2]), Number(flag(args, 'n', 10)))) console.log(s.t, s.file);
    } else if (cmd === 'counts') {
      const files = args.slice(1).filter((a, i, all) => a !== '--out' && all[i - 1] !== '--out');
      const [key, ...agents] = files.map(f => readJson(path.resolve(f)));
      const byVideo = mergeCounts(key, agents);
      fs.writeFileSync(path.resolve(flag(args, 'out', 'counts.json')), JSON.stringify({ method: 'blind agents, 30-frame strips (refbench.mjs strips), names shuffled', byVideo }, null, 1) + '\n');
      console.log(JSON.stringify(byVideo, null, 1));
    } else if (cmd === 'table') {
      const dir = path.resolve(args[1]), b = loadBench(dir), md = tableMarkdown(gapTable(b), b.ours.map(o => o.id));
      fs.writeFileSync(path.join(dir, 'TABLE.md'), `# Rick clip benchmark table\n\nWritten by \`refbench.mjs table\` from the rows in this folder. Method and limits: README.md.\n\n${md}\n`);
      console.log(md);
    } else {
      const mp4 = path.resolve(cmd), row = await measureVideo(mp4, { id: flag(args, 'id') ?? undefined, url: flag(args, 'url'), stems: flag(args, 'stems') && path.resolve(flag(args, 'stems')) });
      const out = flag(args, 'out');
      if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(path.resolve(out), JSON.stringify(row, null, 1) + '\n'); }
      const shown = m => m.key === 'truePeak' && row.silent ? '-inf (silent)' : row.film[m.key] == null ? 'n/a' : row.film[m.key].toFixed(m.digits);
      console.log(METRICS.map(m => `${m.label.padEnd(52)} ${shown(m)}`).join('\n'));
      console.log(`${row.shots.length} shots, ${row.video.dur} s, measured in ${row.secs} s`);
    }
  } catch (e) { console.error(`refbench: ${e.message}`); process.exit(1); }
}
