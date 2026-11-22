import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';
import { frameStat, leadBoxes, measure, judge, measureFile, PW, PH, MIN_FACE_PX } from '../../styles/stick-man/tools/readgate.mjs';

const verdict = m => Object.fromEntries(judge(m).map(r => [r.id, r.ok]));
const grey = (y, box = null, inner = y) => {
  const Y = new Uint8Array(PW * PH).fill(y);
  if (box) for (let r = box[1]; r < box[3]; r++) Y.fill(inner, r * PW + box[0], r * PW + box[2]);
  return Y;
};

test('glare is the share of the frame over Y 235; the hero is its head box against a ring around it', () => {
  const s = frameStat(grey(100, [0, 0, PW, 64], 250), 0, null);
  assert.equal(+s.glare.toFixed(2), 0.1);
  const lit = frameStat(grey(80, [150, 300, 210, 360], 160), 0, [150, 300, 210, 360]);
  assert.equal(lit.lead.px, 60);
  assert.ok(Math.abs(lit.lead.hero / lit.lead.ring - 2) < 0.01, `head 160 on 80: ${lit.lead.hero / lit.lead.ring}`);
});

test('the lead head box is scaled from the rows frame to the phone frame; a head mostly out of frame is no head', () => {
  const rows = [
    { f: 0, actors: { you: { lead: true, inFrame: true, head: [300, 600, 420, 720] } } },
    { f: 1, actors: { you: { lead: true, inFrame: true, head: [-100, 600, 20, 720] } } },
    { f: 2, actors: { cop: { inFrame: true, head: [300, 600, 420, 720] } } },
  ];
  const b = leadBoxes(rows, 720, 1280);
  assert.deepEqual(b.get(0), [150, 300, 210, 360]);
  assert.deepEqual([b.has(1), b.has(2)], [false, false]);
});

const frames = (n, o) => Array.from({ length: n }, (_, i) => ({ i, glare: 0, lead: null, ...o(i) }));

test('A v3 glare (17.7 % over 0.5 s) fails, A v9 (2.1 %) passes; one hot frame does not', () => {
  assert.equal(verdict(measure({ frames: frames(60, () => ({ glare: 0.177 })), cutFrames: [], hasRows: false })).R1, false);
  assert.equal(verdict(measure({ frames: frames(60, () => ({ glare: 0.021 })), cutFrames: [], hasRows: false })).R1, true);
  assert.equal(verdict(measure({ frames: frames(60, i => ({ glare: i === 30 ? 0.3 : 0 })), cutFrames: [], hasRows: false })).R1, true);
});

test('no rows: hero and face are not measured, so the gate is not a PASS', () => {
  const v = verdict(measure({ frames: frames(30, () => ({})), cutFrames: [], hasRows: false }));
  assert.deepEqual([v.R2, v.R3], [null, null]);
});

test('a take where the hero is darker than what is around him fails; a lit hero passes; a take the lead holds under 0.5 s is not judged', () => {
  const lead = (hero, ring, px = 60) => ({ lead: { px, hero, ring } });
  const dark = measure({ frames: frames(90, i => (i < 45 ? lead(150, 100) : lead(60, 100))), cutFrames: [45], hasRows: true });
  assert.equal(verdict(dark).R2, false); assert.equal(dark.heroTake.t0, 1.5);
  const short = measure({ frames: frames(90, i => (i < 80 ? lead(150, 100) : lead(60, 100))), cutFrames: [80], hasRows: true });
  assert.equal(verdict(short).R2, true, '10 frames of a dark hero is not a take to judge');
});

test(`a face under ${MIN_FACE_PX} px held over 3 s fails; a wide shot of 2 s passes`, () => {
  const lead = px => ({ lead: { px, hero: 120, ring: 100 } });
  assert.equal(verdict(measure({ frames: frames(150, i => lead(i < 100 ? 12 : 60)), cutFrames: [], hasRows: true })).R3, false);
  assert.equal(verdict(measure({ frames: frames(150, i => lead(i < 60 ? 12 : 60)), cutFrames: [], hasRows: true })).R3, true);
});

const E = env();
const skip = !fs.existsSync(E.tools?.ffmpeg ?? '') && 'needs the pixi ffmpeg';

test('on an mp4: a white second is glare; a bright head box over a grey ground reads as a lit hero', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readgate-')), f = path.join(dir, 'a.mp4');
  try {
    const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=0x606060:s=720x1280:r=30:d=1', '-f', 'lavfi', '-i', 'color=white:s=720x1280:r=30:d=1',
      '-filter_complex', '[0][1]concat=n=2:v=1,drawbox=x=300:y=600:w=120:h=120:color=0xB0B0B0:t=fill', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '12', f], { capture: true, cwd: ROOT });
    assert.equal(r.status, 0, r.stderr);
    const rows = Array.from({ length: 30 }, (_, k) => ({ f: k, actors: { you: { lead: true, inFrame: true, head: [300, 600, 420, 720] } } }));
    const m = await measureFile(f, rows, 720, 1280);
    assert.equal(m.frames, 60);
    assert.ok(m.glare > 0.9, `white second: ${m.glare}`);
    assert.ok(m.takes[0].heroBg > 1.5, `head 0xB0 on 0x60: ${m.takes[0].heroBg}`);
    assert.equal(m.takes[0].facePx, 60);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
