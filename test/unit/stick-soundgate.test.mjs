import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';
import { onset, orderCheck, hits, classOf, measure, judge, ORDER, SR } from '../../styles/stick-man/tools/gates/soundgate.mjs';

const verdict = m => Object.fromEntries(judge(m).map(r => [r.id, r.ok]));
const burst = (len, at) => { const x = new Float32Array(len * SR); for (const [t, a, d = 0.1] of at) for (let i = Math.round(t * SR); i < Math.round((t + d) * SR); i++) x[i] += a * Math.sin(i / 7); return x; };

test('a cue belongs to the first class whose word is in its name; hits are the locked cues, else every classed cue', () => {
  assert.deepEqual(['gunshot_close', 'crash_metal', 'glass_smash', 'trunk_slam', 'step'].map(n => classOf(n, ORDER)), ['gun', 'crash', 'break', 'slam', null]);
  const cues = [{ at: 1, name: 'trunk_slam' }, { at: 2, name: 'step' }];
  assert.deepEqual(hits(cues, ORDER).map(c => c.name), ['trunk_slam']);
  assert.deepEqual(hits([...cues, { at: 3, name: 'step', lock: true }], ORDER).map(c => c.name), ['step']);
});

test('the order holds when each class is louder than the next and the voice is last; a missing class is skipped', () => {
  assert.equal(orderCheck({ gun: -1, crash: -5, slam: -6 }, ['voice', -6.5], ORDER).ok, true);
  const bad = orderCheck({ gun: -1, slam: -6 }, ['voice', -5.8], ORDER);
  assert.equal(bad.ok, false); assert.match(bad.wrong[0], /voice -5.8 ≥ slam -6.0/);
  assert.equal(orderCheck({ gun: -1 }, null, ORDER).ok, null, 'one level is no order');
});

test('the onset is the attack of the hit, not the tail of the sound before it nor the late body of a crash', () => {
  const x = burst(3, [[0.9, 0.4, 0.35], [1.0, 0.5], [2.0, 0.55, 0.4], [2.4, 0.9, 0.2]]);
  const o = onset(x, 1.0, 0.9, 2.0);
  assert.ok(Math.abs(o.at - 1.0) < 0.011, `slap after a whoosh tail: ${o.at}`);
  const crash = onset(x, 2.0, 1.0, Infinity);
  assert.ok(Math.abs(crash.at - 2.0) < 0.011, `crash attack, body 0.4 s later: ${crash.at}`);
});

const E = env();
const skip = !fs.existsSync(E.tools?.ffmpeg ?? '') && 'needs the pixi ffmpeg';
const wav = (dir, name, expr) => {
  const f = path.join(dir, name);
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc=${expr}:s=${SR}:d=5`, '-ac', '2', f], { capture: true, cwd: ROOT });
  assert.equal(r.status, 0, r.stderr);
  return f;
};
const tone = (t, a, d = 0.1) => `if(between(t\\,${t}\\,${t + d})\\,${a}*sin(2*PI*300*t)\\,0)`;

test('on a mix: the gun over the crash over the slam over the voice passes; a slam 150 ms early and a hit missing from the stem fail', { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soundgate-'));
  try {
    const voice = `${tone(3.7, 0.15, 0.8)}`;
    const mix = wav(dir, 'mix.wav', [tone(1, 0.9), tone(2, 0.5), tone(3, 0.3), voice].join('+'));
    const vo = wav(dir, 'vo.wav', voice);
    const cues = [{ at: 1, name: 'gunshot' }, { at: 2, name: 'crash_metal' }, { at: 3, name: 'trunk_slam' }];
    const good = measure({ mix, cues, sfx: wav(dir, 'sfx.wav', [tone(1, 0.9), tone(2, 0.5), tone(3, 0.3)].join('+')), vo });
    assert.deepEqual(verdict(good), { S1: true, S2: true, S3: true });
    assert.deepEqual(good.order.map(x => x[0]), ['gun', 'crash', 'slam', 'voice']);
    const early = measure({ mix, cues, sfx: wav(dir, 'early.wav', [tone(1, 0.9), tone(2, 0.5), tone(2.85, 0.3)].join('+')), vo });
    assert.equal(verdict(early).S2, false); assert.ok(Math.abs(early.sync[2].ms + 150) < 11, `${early.sync[2].ms} ms`);
    const gone = measure({ mix, cues, sfx: wav(dir, 'gone.wav', [tone(1, 0.9), tone(2, 0.5)].join('+')), vo });
    assert.equal(verdict(gone).S3, false);
    const loud = measure({ mix: wav(dir, 'loud.wav', [tone(1, 0.9), tone(2, 0.5), tone(3, 0.3), tone(3.7, 0.4, 0.8)].join('+')), cues, vo });
    assert.equal(verdict(loud).S1, false, 'voice over the slam');
    assert.deepEqual([verdict(loud).S2, verdict(loud).S3], [null, null], 'no sfx stem: sync not measured');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
