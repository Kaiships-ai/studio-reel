// The delivery copy check (styles/stick-man/tools/gates/copycheck.mjs): a clean 2x copy with the same sound passes; a copy
// with one torn frame names that frame; a shifted copy, a short copy and a re-mixed sound fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { run, env } from '../../kit/env.mjs';
import { copycheck, jumps, frameStats, lookAt, orderFaults, SPIKE } from '../../styles/stick-man/tools/gates/copycheck.mjs';
import { fileURLToPath } from 'node:url';
const GATE = fileURLToPath(new URL('../../styles/stick-man/tools/gates/copycheck.mjs', import.meta.url));

const E = env(), skip = !(E.tools?.ffmpeg && E.tools?.ffprobe) && 'needs ffmpeg and ffprobe';
const ok = r => assert.equal(r.status, 0, r.stderr);

test('jumps: one frame far above its neighbours is named; an even run (a whip that differs throughout) is not', () => {
  const y = Array(30).fill(60); y[12] = 60 + SPIKE + 20;
  assert.deepEqual(jumps(y).map(j => j.f), [12]);
  const run9 = Array(30).fill(60).map((v, i) => (i >= 10 && i < 19 ? 170 : v));
  assert.deepEqual(jumps(run9), []);
});

test('real ffmpeg: a clean 1080-style copy passes; a torn frame, a shift, a short copy and a new sound are caught', { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copycheck-')), f = n => path.join(dir, n);
  try {
    const src = ['-f', 'lavfi', '-i', 'testsrc2=size=180x320:rate=30:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=3'];
    const enc = ['-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest'];
    ok(run('ffmpeg', ['-v', 'error', '-y', ...src, ...enc, f('approved.mp4')], { capture: true }));
    const copy = (name, vf, extra = []) => ok(run('ffmpeg', ['-v', 'error', '-y', '-i', f('approved.mp4'), '-vf', vf, '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', ...extra, f(name)], { capture: true }));
    copy('clean.mp4', 'scale=360:640:flags=lanczos', ['-c:a', 'copy']);
    copy('torn.mp4', "scale=360:640:flags=lanczos,drawbox=x=40:y=200:w=160:h=120:color=red@1:t=fill:enable='eq(n,45)'", ['-c:a', 'copy']);
    copy('shifted.mp4', 'scale=360:640:flags=lanczos,setpts=PTS+1/30/TB', ['-c:a', 'copy']);
    copy('short.mp4', 'scale=360:640:flags=lanczos,trim=end_frame=80', ['-c:a', 'copy']);
    copy('remix.mp4', 'scale=360:640:flags=lanczos', ['-af', 'volume=-6dB', '-c:a', 'aac']);
    const R = n => copycheck({ copy: f(n), approved: f('approved.mp4') }), row = (r, id) => r.rows.find(x => x.id === id).ok;
    const clean = R('clean.mp4'); assert.equal(clean.ok, true, JSON.stringify(clean.rows));
    const torn = R('torn.mp4'); assert.equal(row(torn, 'K2b'), false); assert.deepEqual(torn.jumps.map(j => j.f), [45]);
    const short = R('short.mp4'); assert.equal(row(short, 'K1'), false); assert.equal(row(short, 'K2a'), false, 'a short copy is not the same film either');
    assert.equal(row(R('remix.mp4'), 'K3'), false, 'a sound 6 dB down is not the approved sound');
    const sh = R('shifted.mp4'); assert.equal(row(sh, 'K2a'), false, JSON.stringify(sh.rows));
    copy('dropdup.mp4', "scale=360:640:flags=lanczos,select='not(eq(n\\,40))',setpts=N/30/TB,loop=loop=1:size=1:start=68,setpts=N/30/TB", ['-c:a', 'copy']);
    const dd = R('dropdup.mp4'); assert.equal(row(dd, 'K1'), true, 'still 90 frames'); assert.equal(row(dd, 'K2c'), false, JSON.stringify(dd.rows));
    assert.equal(row(clean, 'K2c'), true);
    copy('mute.mp4', 'scale=360:640:flags=lanczos', ['-an']);
    assert.equal(row(R('mute.mp4'), 'K3'), false, 'no sound is not the approved sound');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('frameStats: a temp folder with a quote in its path works, and a failed run leaves no temp folder', { skip }, () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "copy'check ")), was = process.env.TMPDIR, f = n => path.join(base, n);
  try {
    process.env.TMPDIR = base;
    assert.equal(run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=64x64:rate=30:duration=1', '-pix_fmt', 'yuv420p', f('a.mp4')], { capture: true }).status, 0);
    const S = frameStats(f('a.mp4'), f('a.mp4'), { w: 64, h: 64 });
    assert.equal(S.ssim.length, 30); assert.equal(S.ymax.length, 30);
    assert.throws(() => frameStats(f('missing.mp4'), f('a.mp4'), { w: 64, h: 64 }));
    assert.deepEqual(fs.readdirSync(base).filter(n => n.startsWith('copycheck-')), [], 'no temp folder left behind');
  } finally { process.env.TMPDIR = was; fs.rmSync(base, { recursive: true, force: true }); }
});

test('lookAt: a long tear and a single-frame spike under the K2b limit are both in the look list', () => {
  const y = Array(120).fill(13); for (let f = 59; f <= 66; f++) y[f] = 183; y[100] = 13 + 70;
  assert.deepEqual(jumps(y), [], 'neither is a K2b jump');
  const L = lookAt(y), has = f => L.some(r => f >= r.from && f <= r.to);
  assert.ok(has(59) && has(66) && has(62) && has(100), JSON.stringify(L));
});

test('the CLI takes paths relative to where it runs', { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copycheck-rel-'));
  try {
    assert.equal(run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=64x64:rate=30:duration=1', '-f', 'lavfi', '-i', 'sine=duration=1', '-pix_fmt', 'yuv420p', '-shortest', path.join(dir, 'a.mp4')], { capture: true }).status, 0);
    const r = run('node', [GATE, '--copy', 'a.mp4', '--approved', 'a.mp4'], { capture: true, cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /PASS/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('orderFaults: a repeated frame (no change where the approved moves) and a skipped one (twice the change) are named', () => {
  const ta = Array(20).fill(4), tc = [...ta]; tc[6] = 0; tc[12] = 8.5;
  assert.deepEqual(orderFaults(tc, ta).map(x => [x.f, x.kind]), [[7, 'repeat'], [13, 'skip']]);
  assert.deepEqual(orderFaults(ta, ta), []);
  const still = Array(20).fill(0.05); assert.deepEqual(orderFaults(still, still), [], 'a held frame in the approved film is not a fault');
});
