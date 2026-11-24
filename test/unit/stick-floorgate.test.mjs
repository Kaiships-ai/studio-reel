// The sound floor: the gate (styles/stick-man/tools/gates/floorgate.mjs) on made-up sound, and the mixer's opt-in floor
// (tools/run/mix.py, music.json "floor") filling a hole between two lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';
import { holes, gaps, thinRuns, closing, judge, measure } from '../../styles/stick-man/tools/gates/floorgate.mjs';

const SR = 48000, TOOLS = path.join(ROOT, 'styles/stick-man/tools'), GATE = path.join(TOOLS, 'gates/floorgate.mjs');
const E = env(), ready = Boolean(E.tools?.python) && run('python', ['-I', '-c', 'import numpy, scipy, soundfile'], { capture: true }).status === 0;
const skip = !ready && 'needs the pixi python (numpy, scipy, soundfile)';
// a tone at amp (linear) from a to b seconds inside a buffer of n seconds
const tone = (n, parts) => { const x = new Float32Array(n * SR); for (const [a, b, amp, hz = 220] of parts) for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) x[i] = amp * Math.sin(2 * Math.PI * hz * i / SR); return x; };
const DB = d => 10 ** (d / 20) * Math.SQRT2;          // the amplitude of a sine at d dBFS RMS

test('holes: a run under -30 dBFS of 0.3 s or more counts, a shorter one and a planned silence do not', () => {
  const x = tone(10, [[0, 4, DB(-18)], [4.5, 7, DB(-18)], [7.2, 10, DB(-18)]]);
  const H = holes(x); assert.equal(H.length, 1); assert.ok(Math.abs(H[0].from - 4) < 0.11 && Math.abs(H[0].to - 4.5) < 0.11, JSON.stringify(H));
  assert.equal(holes(x, [[3.9, 4.6]]).length, 0, 'a planned silence is left alone');
});

test('the bed under the voice: 18 dB or more under it for 4 s is a thin run; 8 dB is not', () => {
  const vo = tone(12, [[0, 12, DB(-16), 300]]), thin = tone(12, [[0, 12, DB(-38), 80]]), full = tone(12, [[0, 12, DB(-24), 80]]);
  const r = thinRuns(gaps(vo, thin)); assert.equal(r.length, 1); assert.ok(r[0].worst > 20 && r[0].worst < 24, `${r[0].worst}`);
  assert.equal(thinRuns(gaps(vo, full)).length, 0);
});

test('the close: a bed that drops away in the last 6 s fails, one that lifts passes', () => {
  const drops = tone(20, [[0, 14, DB(-24), 80], [14, 20, DB(-34), 80]]), lifts = tone(20, [[0, 14, DB(-24), 80], [14, 20, DB(-20), 80]]);
  assert.ok(closing(drops).close < -8); assert.ok(closing(lifts).close > 3);
  assert.equal(judge({ holes: 0, thin: 0, close: closing(drops).close }).find(r => r.id === 'F3').ok, false);
});

test('the CLI: with no stems only F1 is measured and the verdict is PARTIAL; with stems it is PASS', { skip: skip || (!E.tools?.ffmpeg && 'needs ffmpeg') }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'floorgate-')), f = n => path.join(dir, n);
  const w = `import numpy as np, soundfile as sf; t = np.arange(12 * 48000) / 48000
v = 0.22 * np.sin(2 * np.pi * 300 * t); b = 0.06 * np.sin(2 * np.pi * 80 * t)
sf.write(r'${f('vo.wav')}', v, 48000); sf.write(r'${f('bed.wav')}', b, 48000); sf.write(r'${f('mix.wav')}', v + b, 48000)`;
  assert.equal(run('python', ['-I', '-c', w], { capture: true }).status, 0);
  let p = run('node', [GATE, '--mp4', f('mix.wav')], { capture: true }); assert.equal(p.status, 1); assert.match(p.stdout, /PARTIAL/);
  p = run('node', [GATE, '--mp4', f('mix.wav'), '--vo', f('vo.wav'), '--bed', f('bed.wav')], { capture: true }); assert.equal(p.status, 0, p.stdout); assert.match(p.stdout, /PASS/);
  assert.equal(measure({ mix: f('mix.wav') }).thin, null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('mix.py floor: opt-in, the beds come up in a hole between two lines and nowhere near the end', { skip: skip || (!E.tools?.ffmpeg && 'needs ffmpeg') }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mix-floor-'));
  try {
    const level = (film, a, b) => { const p = run('python', ['-I', '-c', `import numpy as np, soundfile as sf; x, sr = sf.read(r'${path.join(film, 'audio/mix.wav')}'); x = x.mean(1)[int(${a} * sr):int(${b} * sr)]; print(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9))`], { capture: true }); return Number(p.stdout); };
    const make = (name, music) => {
      const film = path.join(tmp, name); fs.mkdirSync(path.join(film, 'vo'), { recursive: true }); fs.mkdirSync(path.join(film, 'audio'));
      const voice = `import numpy as np, soundfile as sf; t = np.arange(10 * 48000) / 48000
sf.write(r'${path.join(film, 'vo/vo.wav')}', 0.3 * np.sin(2 * np.pi * 220 * t) * ((t < 3) | (t > 6.5)) * ((t % 0.5) < 0.35), 48000)`;
      assert.equal(run('python', ['-I', '-c', voice], { capture: true }).status, 0);
      const words = [0, 1, 2, 7, 8, 9].map(i => ({ t0: i, t1: i + 0.35, word: `w${i}`, line: 'L01' }));
      fs.writeFileSync(path.join(film, 'vo/words.json'), JSON.stringify(words));
      fs.writeFileSync(path.join(film, 'audio/cues.json'), '[]');
      fs.writeFileSync(path.join(film, 'audio/ambience.json'), JSON.stringify({ amb: [[[0, 10], 'office', -30, 'room']] }));
      if (music) fs.writeFileSync(path.join(film, 'audio/music.json'), JSON.stringify(music));
      const r = run('python', ['-I', `${TOOLS}/run/mix.py`, film], { capture: true }); assert.equal(r.status, 0, r.stderr);
      return film;
    };
    const plain = make('plain', { amb_lu: -36 }), floored = make('floored', { amb_lu: -36, floor: -27 });
    const before = level(plain, 3.6, 6.0), after = level(floored, 3.6, 6.0);
    assert.ok(before < -30, `the hole is a hole without the floor (${before.toFixed(1)} dBFS)`);
    assert.ok(after > before + 4, `the floor lifts it (${before.toFixed(1)} -> ${after.toFixed(1)} dBFS)`);
    assert.ok(Math.abs(level(floored, 9.5, 10) - level(plain, 9.5, 10)) < 1.5, 'the last 0.6 s is left alone');
    assert.match(fs.readFileSync(path.join(floored, 'audio/levels.txt'), 'utf8'), /floor -27 dBFS: beds lifted on \d+\.\d s/);
    assert.doesNotMatch(fs.readFileSync(path.join(plain, 'audio/levels.txt'), 'utf8'), /beds lifted/, 'no floor unless music.json asks for one');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
