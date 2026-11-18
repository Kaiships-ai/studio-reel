import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';

const TOOLS = path.join(ROOT, 'styles/stick-man/tools');
const E = env();
const ready = Boolean(E.tools?.python) && Boolean(E.tools?.ffmpeg) && run('python', ['-I', '-c', 'import numpy, scipy, soundfile'], { capture: true }).status === 0;
const skip = !ready && 'needs the pixi python (numpy, scipy, soundfile) and ffmpeg';

const BPM = 100, BAR = 4 * 60 / BPM, FIRST = 0.37, FRAME = 1 / 30;
const ARC = [
  { t: [0, 5], state: 'pulse', lu: -3 },
  { t: [5, 11.3], state: 'cold', lu: -10 },
  { t: [11.3, 13], state: 'silence' },
  { t: [13, 21.7], state: 'chase', lu: 0 },
  { t: [21.7, 23], state: 'none' },
  { t: [23, 27.4], state: 'calm', lu: -8 },
  { t: [27.4, 30], state: 'question', lu: -6 },
];
const SILENCE = [[11.3, 13], [21.7, 23]];

// a 100 BPM click track: an accented low thump on each downbeat, soft high ticks between, quiet for 60 s then loud
const CLICKS = `import numpy as np, soundfile as sf, sys
sr = 48000; y = np.zeros(120 * sr); t = np.arange(int(0.08 * sr)) / sr
for k in range(int((120 - ${FIRST}) * ${BPM} / 60)):
    i = int((${FIRST} + k * 60 / ${BPM}) * sr); down = k % 4 == 0
    c = (np.sin(2 * np.pi * (70 if down else 1500) * t) * np.exp(-t * (30 if down else 90))) * (1.0 if down else 0.3)
    y[i:i + len(c)] += c * (0.12 if i < 60 * sr else 0.6)
sf.write(sys.argv[1], np.stack([y, y], 1), sr)`;

const PLACE = `import json, sys, numpy as np
sys.path.insert(0, ${JSON.stringify(TOOLS)}); import mix
film, plan = sys.argv[1], json.load(open(sys.argv[2])); T = plan['track']
y = mix.segments({T['file']: mix.decode(film + '/' + T['file'])}, T, int(30 * 48000)).mean(1)
print(json.dumps(np.abs(y).tolist()[::48]))`;

test('a click track fit to a film cuts on its bar lines at every story beat and stays out of the silences', { skip }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-fit-test-'));
  try {
    const film = path.join(tmp, 'film'); fs.mkdirSync(path.join(film, 'audio'), { recursive: true });
    assert.equal(run('python', ['-I', '-c', CLICKS, path.join(film, 'audio/clicks.wav')], { capture: true }).status, 0);
    fs.writeFileSync(path.join(film, 'audio/music.json'), JSON.stringify({ arc: ARC, length: 30, mus_lu: -10 }));
    fs.writeFileSync(path.join(film, 'audio/sound-plan.json'), JSON.stringify({ silences: SILENCE.map(t => ({ t })) }));
    const out = path.join(film, 'audio/music-fit.json');
    const r = run('python', ['-I', path.join(TOOLS, 'sound_fit.py'), film, path.join(film, 'audio/clicks.wav'), '--mus-lu', '-10', '--out', out], { capture: true });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /100\.0\d BPM, 4 beats a bar/);
    const plan = JSON.parse(fs.readFileSync(out, 'utf8'));
    const segs = plan.track.segments;
    const music = ARC.filter(s => !['silence', 'none'].includes(s.state));
    assert.deepEqual(segs.map(s => s.beat), music.map(s => s.t[0]), 'one segment per music section, in order');
    for (const s of segs) {
      const bars = (s.downbeat - FIRST) / BAR;
      assert.ok(Math.abs(bars - Math.round(bars)) * BAR < FRAME, `${s.section}: source downbeat ${s.downbeat} is off the bar grid`);
      const cut = s.at + (s.downbeat - s.src[0]);
      assert.ok(Math.abs(cut - s.beat) < FRAME, `${s.section}: the downbeat lands at ${cut}, the beat is ${s.beat}`);
    }
    assert.ok(segs.find(s => s.section === 'chase').level > segs.find(s => s.section === 'cold').level + 6, 'the loud part of the track goes under chase');

    const p = run('python', ['-I', '-c', PLACE, film, out], { capture: true });
    assert.equal(p.status, 0, p.stderr);
    const env1ms = JSON.parse(p.stdout);
    const peak = (a, b) => Math.max(...env1ms.slice(Math.round(a * 1000), Math.round(b * 1000)));
    for (const [a, b] of SILENCE) assert.equal(peak(a, b), 0, `music in the planned silence ${a}-${b}`);
    for (const s of music.slice(1)) {
      const at = s.t[0]; const hit = peak(at - FRAME, at + FRAME), after = peak(at + 0.1, at + 0.5);
      assert.ok(hit > 0.05 && hit > 3 * after, `${s.state}: no downbeat thump within a frame of ${at} (${hit}; ${after} after it)`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
