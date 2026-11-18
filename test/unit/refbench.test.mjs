import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';
import { measureVideo, bedStats, gapTable, METRICS } from '../../styles/stick-man/tools/refbench.mjs';

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

test('a frozen frame reads a still camera and zero motion; the moving test pattern reads above it', { skip }, async () => {
  const frozen = await measureVideo(clip('frozen', ['-f', 'lavfi', '-i', `${SRC}:d=3`, '-vf', 'trim=end_frame=1,loop=loop=89:size=1:start=0,setpts=N/30/TB']));
  const moving = await measureVideo(clip('moving', ['-f', 'lavfi', '-i', `${SRC}:d=3`]));
  assert.equal(frozen.film.stillShare, 1);
  assert.ok(frozen.film.idleEnergy < 0.05, `frozen motion ${frozen.film.idleEnergy}`);
  assert.ok(moving.film.idleEnergy > 10 * Math.max(frozen.film.idleEnergy, 0.01), `moving ${moving.film.idleEnergy} vs frozen ${frozen.film.idleEnergy}`);
});

test('the first 3 s loudness reads the opening alone, 10 dB under the rest of the film', { skip }, async () => {
  const tone = db => `sine=f=440:r=48000:d=3,volume=${db}dB`;
  const f = clip('tone', ['-f', 'lavfi', '-i', `${SRC}:d=6`, '-f', 'lavfi', '-i', tone(-30), '-f', 'lavfi', '-i', tone(-20),
    '-filter_complex', '[1][2]concat=n=2:v=0:a=1[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-t', '6']);
  const quiet = clip('quiet', ['-f', 'lavfi', '-i', `${SRC}:d=3`, '-f', 'lavfi', '-i', tone(-30), '-c:a', 'aac', '-b:a', '192k', '-t', '3']);
  const step = await measureVideo(f), q = await measureVideo(quiet);
  assert.ok(Math.abs(step.film.lufs3 - q.film.lufsI) <= 0.5, `opening ${step.film.lufs3} vs the quiet tone alone ${q.film.lufsI}`);
  assert.ok(step.film.lufsI > step.film.lufs3 + 5, `film ${step.film.lufsI} vs opening ${step.film.lufs3}`);
});
