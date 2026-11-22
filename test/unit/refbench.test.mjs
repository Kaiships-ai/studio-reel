import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';
import { measureVideo, bedStats, gapTable, tableMarkdown, payoffStats, lookStats, METRICS, shotBands } from '../../styles/stick-man/tools/refbench.mjs';

test('bed presence, level and the biggest drop come from the 5 s section levels', () => {
  assert.deepEqual(bedStats([-30, -30, -47, -30]), { bedPresence: 0.75, bedDb: -30, bedDrop: 17 });
  assert.deepEqual(bedStats([]), { bedPresence: null, bedDb: null, bedDrop: null });
});

test('a gap is real only when it beats the noise floor and leaves the Rick band', () => {
  const row = (id, luma) => ({ id, film: { luma } });
  const rick = [row('a', 110), row('b', 112), row('c', 130)];
  const t = gapTable({ rick, ours: [row('in', 111), row('near', 108.9), row('far', 97)], floor: { luma: 1.5 } }).find(r => r.key === 'luma');
  assert.deepEqual([t.rickMedian, t.rickLo, t.rickHi], [112, 110, 130]);
  assert.deepEqual(t.ours.map(o => [o.id, +o.gap.toFixed(2), o.real]), [['in', -1, false], ['near', -3.1, true], ['far', -15, true]]);
  const noFloor = gapTable({ rick, ours: [row('far', 97)] }).find(r => r.key === 'luma');
  assert.equal(noFloor.ours[0].real, false, 'no floor, no verdict');
});

test('agent counts fill the rows the pixels cannot measure', () => {
  const t = gapTable({ rick: [{ id: 'r', film: {} }], ours: [{ id: 'v1', film: {} }], counts: { r: { blinksPer10s: 3 }, v1: { blinksPer10s: 1 } } });
  assert.equal(t.find(r => r.key === 'blinksPer10s').ours[0].gap, -2);
  assert.equal(METRICS.length, new Set(METRICS.map(m => m.key)).size, 'metric keys are unique');
});

test('a listening count fills the effect rate and wins over a stem count, its spread is the floor', () => {
  const t = gapTable({ rick: [{ id: 'r', film: {} }], ours: [{ id: 'v1', film: { sfxPerMin: 36 } }], listening: { r: { sfxPerMin: 20 }, v1: { sfxPerMin: 30 } }, floor: { sfxPerMin: 4 } });
  const row = t.find(r => r.key === 'sfxPerMin');
  assert.deepEqual([row.rickMedian, row.ours[0].v, row.ours[0].gap, row.ours[0].real], [20, 30, 10, true]);
});

test('a silent film reads "silent" for its true peak in the table', () => {
  const t = gapTable({ rick: [{ id: 'r', film: { truePeak: -2 } }], ours: [{ id: 'mute', silent: true, film: { truePeak: null } }] });
  const line = tableMarkdown(t, ['mute']).split('\n').find(l => l.startsWith('| true peak'));
  assert.match(line, /\| silent \|/);
});

test('the payoff is the loudest moment; the dip before it is measured down from the film median', () => {
  const M = Array.from({ length: 200 }, (_, i) => { const t = (i + 1) / 10; return [t, t > 15 && t <= 16.5 ? -60 : t > 17 && t <= 17.5 ? -10 : -30]; });
  assert.deepEqual(payoffStats(M), { payoffT: 17.1, payoffDipDb: 30, payoffDipS: 1.5 });
});

test('a shot under the Rick shots\' set or sky band is flagged; in or over the band is not', () => {
  const rick = [{ shots: [{ setDetail: 0.56, skyDetail: 0.49 }, { setDetail: 0.75, skyDetail: 0.81 }] }];
  const b = shotBands(rick, { shots: [{ shot: 1, setDetail: 0.6, skyDetail: 0.9 }, { shot: 2, setDetail: 0.5, skyDetail: 0.6 }, { shot: 3, setDetail: 0.7, skyDetail: 0.36 }, { shot: 4 }] });
  assert.deepEqual(b.band, { setDetail: [0.56, 0.75], skyDetail: [0.49, 0.81] });
  assert.deepEqual(b.shots.map(x => [x.setDetail.under, x.skyDetail.under]), [[false, false], [true, false], [false, true], [false, false]]);
  assert.equal(b.under, 2);
});

const E = env();
const ready = fs.existsSync(E.tools?.ffmpeg ?? '') && run('python', ['-I', '-c', 'import numpy, scipy, soundfile, faster_whisper'], { capture: true }).status === 0;
const skip = !ready && 'needs the pixi ffmpeg and python (numpy, scipy, soundfile, faster_whisper)';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refbench-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function clip(name, args) {
  const f = path.join(tmp, `${name}.mp4`);
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', ...args, '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '12', '-preset', 'veryfast', f], { capture: true, cwd: ROOT });
  assert.equal(r.status, 0, r.stderr);
  return f;
}
const SRC = 'testsrc2=s=720x1280:r=30';

test('a clip of four solid colours, one second each, has three hard cuts', { skip }, async () => {
  const f = clip('cuts', ['-f', 'lavfi', '-i', 'color=red:s=360x640:r=30:d=1', '-f', 'lavfi', '-i', 'color=blue:s=360x640:r=30:d=1',
    '-f', 'lavfi', '-i', 'color=yellow:s=360x640:r=30:d=1', '-f', 'lavfi', '-i', 'color=black:s=360x640:r=30:d=1',
    '-filter_complex', '[0][1][2][3]concat=n=4:v=1:a=0']);
  const row = await measureVideo(f);
  assert.equal(row.cuts.length, 3, `cuts at ${row.cuts}`);
  assert.equal(row.shots.length, 4);
});

test('blurring the background lowers its edge sharpness and raises the depth ratio; sharpness falls about as 1 / blur', { skip }, async () => {
  const flat = await measureVideo(clip('flat', ['-f', 'lavfi', '-i', `${SRC}:d=2`]));
  const half = await measureVideo(clip('half', ['-f', 'lavfi', '-i', `${SRC}:d=2`, '-filter_complex',
    '[0]split[a][b];[a]crop=720:640:0:0[top];[b]crop=720:640:0:640,gblur=sigma=6[bot];[top][bot]vstack']));
  assert.ok(half.film.sharpLo < flat.film.sharpLo * 0.8, `background ${half.film.sharpLo} vs ${flat.film.sharpLo}`);
  assert.ok(half.film.depthRatio > flat.film.depthRatio + 0.3, `depth ${half.film.depthRatio} vs ${flat.film.depthRatio}`);
  const s4 = await measureVideo(clip('s4', ['-f', 'lavfi', '-i', `${SRC}:d=1`, '-vf', 'gblur=sigma=4']));
  const s8 = await measureVideo(clip('s8', ['-f', 'lavfi', '-i', `${SRC}:d=1`, '-vf', 'gblur=sigma=8']));
  const ratio = s4.film.sharpHi / s8.film.sharpHi;
  assert.ok(ratio > 1.4 && ratio < 2.6, `sigma 4 vs 8 gives a sharpness ratio of ${ratio.toFixed(2)}, expected about 2`);
});

test('a flat colour has no set or sky detail; the test pattern has both', { skip }, async () => {
  const flat = await measureVideo(clip('bare', ['-f', 'lavfi', '-i', 'color=0x506070:s=720x1280:r=30:d=1']));
  const busy = await measureVideo(clip('busy', ['-f', 'lavfi', '-i', `${SRC}:d=1`]));
  assert.deepEqual([flat.film.setDetail, flat.film.skyDetail], [0, 0]);
  assert.ok(busy.film.setDetail > 0.1 && busy.film.skyDetail > 0.1, `test pattern ${busy.film.setDetail} / ${busy.film.skyDetail}`);
});

test('a frozen frame reads a still camera and zero motion; the moving test pattern reads above it', { skip }, async () => {
  const frozen = await measureVideo(clip('frozen', ['-f', 'lavfi', '-i', `${SRC}:d=3`, '-vf', 'trim=end_frame=1,loop=loop=89:size=1:start=0,setpts=N/30/TB']));
  const moving = await measureVideo(clip('moving', ['-f', 'lavfi', '-i', `${SRC}:d=3`]));
  assert.equal(frozen.film.stillShare, 1);
  assert.ok(frozen.film.idleEnergy < 0.05, `frozen motion ${frozen.film.idleEnergy}`);
  assert.ok(moving.film.idleEnergy > 10 * Math.max(frozen.film.idleEnergy, 0.01), `moving ${moving.film.idleEnergy} vs frozen ${frozen.film.idleEnergy}`);
});

test('the first 3 s loudness reads the opening alone, 10 dB under the rest of the film', { skip }, async () => {
  const f = clip('tone', ['-f', 'lavfi', '-i', `${SRC}:d=6`, '-f', 'lavfi', '-i', tone(-30), '-f', 'lavfi', '-i', tone(-20),
    '-filter_complex', '[1][2]concat=n=2:v=0:a=1[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-t', '6']);
  const quiet = clip('quiet', ['-f', 'lavfi', '-i', `${SRC}:d=3`, '-f', 'lavfi', '-i', tone(-30), '-c:a', 'aac', '-b:a', '192k', '-t', '3']);
  const step = await measureVideo(f), q = await measureVideo(quiet);
  assert.ok(Math.abs(step.film.lufs3 - q.film.lufsI) <= 0.5, `opening ${step.film.lufs3} vs the quiet tone alone ${q.film.lufsI}`);
  assert.ok(step.film.lufsI > step.film.lufs3 + 5, `film ${step.film.lufsI} vs opening ${step.film.lufs3}`);
});

const tone = db => `sine=f=440:r=48000:d=3,volume=${db}dB`;

test('the last 5 s and the 1 s loudness spread read a 10 dB step', { skip }, async () => {
  const t5 = db => `sine=f=440:r=48000:d=5,volume=${db}dB`;
  const step = await measureVideo(clip('step', ['-f', 'lavfi', '-i', `${SRC}:d=10`, '-f', 'lavfi', '-i', t5(-30), '-f', 'lavfi', '-i', t5(-20),
    '-filter_complex', '[1][2]concat=n=2:v=0:a=1[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-t', '10']));
  const loud = await measureVideo(clip('loud', ['-f', 'lavfi', '-i', `${SRC}:d=5`, '-f', 'lavfi', '-i', t5(-20), '-c:a', 'aac', '-b:a', '192k', '-t', '5']));
  assert.ok(Math.abs(step.film.lufsEnd5 - loud.film.lufsI) <= 0.5, `last 5 s ${step.film.lufsEnd5} vs the loud tone alone ${loud.film.lufsI}`);
  assert.ok(Math.abs(step.film.loudSpread - 10) <= 1, `spread ${step.film.loudSpread}, expected 10`);
});

test('a bed that drops 20 dB for 2 s before a hit: the payoff, the dip and the bed drop at the climax', { skip }, async () => {
  const f = clip('payoff', ['-f', 'lavfi', '-i', `${SRC}:d=20`, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.1:r=48000:d=20:seed=7',
    '-f', 'lavfi', '-i', 'sine=f=1000:r=48000:d=0.5', '-filter_complex',
    "[1]volume='if(between(t,15.5,17.5),0.1,1)':eval=frame[bed];[2]adelay=17500,volume=-3dB[hit];[bed][hit]amix=inputs=2:normalize=0:duration=first[a]",
    '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-t', '20']);
  const { film } = await measureVideo(f);
  assert.ok(film.payoffT >= 17.5 && film.payoffT <= 18.1, `payoff at ${film.payoffT} s`);
  assert.ok(Math.abs(film.payoffDipDb - 20) <= 3, `dip ${film.payoffDipDb} dB, expected 20`);
  assert.ok(Math.abs(film.payoffDipS - 2) <= 0.5, `dip ${film.payoffDipS} s, expected 2`);
  assert.ok(Math.abs(film.bedAtPayoff + 20) <= 3, `bed at the payoff ${film.bedAtPayoff} dB, expected -20`);
});

test('the bed at the payoff is read before the loud window, so the gaps inside a stuttering hit do not count', { skip }, async () => {
  // a steady bed that stops for a burst of 20 ms shots every 150 ms (17.5-17.85 s): the loudest 400 ms holds the shots and
  // the silence between them; the 2 s before it hold only the bed
  const f = clip('stutter', ['-f', 'lavfi', '-i', `${SRC}:d=20`, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.1:r=48000:d=20:seed=7',
    '-f', 'lavfi', '-i', "aevalsrc='if(between(t,17.5,17.85)*lt(mod(t-17.5,0.15),0.02),0.9*sin(2*PI*1000*t),0)':s=48000:d=20", '-filter_complex',
    "[1]volume='if(between(t,17.5,18.5),0,1)':eval=frame[bed];[bed][2]amix=inputs=2:normalize=0:duration=first[a]",
    '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-t', '20']);
  const { film } = await measureVideo(f);
  assert.ok(film.payoffT >= 17.8 && film.payoffT <= 18.1, `payoff at ${film.payoffT} s`);
  assert.ok(Math.abs(film.bedAtPayoff) <= 3, `bed at the payoff ${film.bedAtPayoff} dB, expected about 0: the bed before the shots is the film's bed`);
});

test('a silent sound track reports silence: the row says so and the tool prints -inf', { skip }, async () => {
  const f = clip('silent', ['-f', 'lavfi', '-i', `${SRC}:d=3`, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-c:a', 'aac', '-t', '3']);
  const row = await measureVideo(f);
  assert.equal(row.silent, true);
  assert.equal(row.film.truePeak, null);
  const r = run('node', ['styles/stick-man/tools/refbench.mjs', f], { capture: true, cwd: ROOT });
  assert.match(r.stdout, /true peak \(dBFS\)\s+-inf \(silent\)/);
});

test('saturation and luma come from one print per frame: a long clip gives one value a frame, as one-key passes do', { skip }, () => {
  // 100 s at 720 x 1280: two chained print filters interleave their buffers here and lose a value (2999 of 3000 frames)
  const f = clip('long', ['-f', 'lavfi', '-i', 'testsrc2=s=720x1280:r=30:d=100']);
  const one = key => run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-i', f, '-an', '-vf', `scale=180:-2,signalstats,metadata=print:key=lavfi.signalstats.${key}:file=-`, '-f', 'null', '-'], { capture: true })
    .stdout.split('\n').map(l => l.match(new RegExp(`${key}=([\\d.]+)`))).filter(Boolean).map(m => Number(m[1]));
  const { Y, S } = lookStats(f);
  assert.deepEqual([Y.length, S.length], [3000, 3000], 'one YAVG and one SATAVG for each of the 3000 frames');
  assert.deepEqual(Y, one('YAVG'));
  assert.deepEqual(S, one('SATAVG'));
});

test('a variable-frame-rate clip reads the same per-shot luma as its constant-rate twin', { skip }, async () => {
  const grey = (c, r) => ['-f', 'lavfi', '-i', `color=c=${c}:s=360x640:r=${r}:d=2`];
  const shots = ['0x202020', '0xa0a0a0', '0x606060'];
  const vfr = clip('vfr', [...grey(shots[0], 10), ...grey(shots[1], 30), ...grey(shots[2], 30), '-filter_complex', '[0][1][2]concat=n=3:v=1:a=0', '-fps_mode', 'vfr']);
  const cfr = clip('cfr', [...grey(shots[0], 30), ...grey(shots[1], 30), ...grey(shots[2], 30), '-filter_complex', '[0][1][2]concat=n=3:v=1:a=0']);
  const a = await measureVideo(vfr), b = await measureVideo(cfr);
  assert.equal(a.shots.length, 3, `cuts at ${a.cuts}`);
  assert.deepEqual(a.shots.map(s => s.luma), b.shots.map(s => s.luma));
});
