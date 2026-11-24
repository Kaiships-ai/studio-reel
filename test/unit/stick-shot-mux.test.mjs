// shot.mjs --mp4's mux (styles/stick-man/tools/render/mux.mjs): without --pad-audio the args are the ones it always used
// (the mp4 ends with the audio, and shot.mjs warns how many frames that drops); with it every frame is kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { run, env } from '../../kit/env.mjs';
import { muxArgs, framesLost } from '../../styles/stick-man/tools/render/mux.mjs';

const E = env(), skip = !(E.tools?.ffmpeg && E.tools?.ffprobe) && 'needs ffmpeg and ffprobe';

test('without pad the mux args are unchanged from before (no default change)', () => {
  assert.deepEqual(muxArgs({ fps: 30, f0: 12, n: 90, wav: 'a.wav', out: 'o.mp4' }), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-ss', '0.4000', '-t', '3.0000', '-i', 'a.wav', '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', 'o.mp4']);
  const shot = fs.readFileSync(new URL('../../styles/stick-man/tools/render/shot.mjs', import.meta.url), 'utf8');
  assert.match(shot, /start\('ffmpeg', muxArgs\(\{ fps, f0, n, wav, out: OUT, pad \}\)/);
  assert.match(shot, /\.\.\.\(A\['pad-audio'\] === '1' \? \{ pad: 1 \} : \{\}\)/, 'the cache key changes only for a padded render');
});

test('framesLost: the frames past the end of the audio, counted from the span start', () => {
  assert.equal(framesLost(4, { fps: 30, f0: 0, n: 150 }), 30);
  assert.equal(framesLost(10, { fps: 30, f0: 0, n: 150 }), 0);
  assert.equal(framesLost(4, { fps: 30, f0: 60, n: 150 }), 90);
  assert.equal(framesLost(1, { fps: 30, f0: 60, n: 30 }), 30, 'audio over before the span starts: every frame');
});

test('real ffmpeg: 2 s of picture over 1 s of audio keeps 30 frames as before, 60 with pad', { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-mux-')), f = n => path.join(dir, n);
  try {
    assert.equal(run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '1', f('a.wav')], { capture: true }).status, 0);
    const jpg = run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=30:duration=2', '-f', 'image2pipe', '-c:v', 'mjpeg', '-'], { capture: true, encoding: 'buffer' }).stdout;
    const frames = out => Number(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out], { capture: true }).stdout);
    for (const [pad, want] of [[false, 30], [true, 60]]) {
      const out = f(`o${pad ? 'p' : ''}.mp4`), r = run('ffmpeg', muxArgs({ fps: 30, f0: 0, n: 60, wav: f('a.wav'), out, pad }), { capture: true, input: jpg });
      assert.equal(r.status, 0, r.stderr); assert.equal(frames(out), want, `pad ${pad}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
