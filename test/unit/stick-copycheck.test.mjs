// The delivery copy check (styles/stick-man/tools/gates/copycheck.mjs): a clean 2x copy with the same sound passes; a copy
// with one torn frame names that frame; a shifted copy, a short copy and a re-mixed sound fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { run, env } from '../../kit/env.mjs';
import { copycheck, jumps, SPIKE } from '../../styles/stick-man/tools/gates/copycheck.mjs';

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
    assert.equal(row(R('short.mp4'), 'K1'), false);
    assert.equal(row(R('remix.mp4'), 'K3'), false, 'a sound 6 dB down is not the approved sound');
    const sh = R('shifted.mp4'); assert.equal(sh.ok, false, JSON.stringify(sh.rows));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
