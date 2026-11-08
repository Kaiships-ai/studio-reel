// The ci-smoke episode a PR's tmv install renders (test/tmv-smoke.mjs): short, cut from the shipped sample, every paper beat and the vote.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { pickBeats, smokeEpisode } from '../tmv-smoke.mjs';
import { shapeErrors } from '../../tmv/episode/script.mjs';

const SAMPLE = join(ROOT, 'tmv', 'episodes', 'sample');

test('ci-smoke: the sample opener, a stats card, a card and the vote, its voice cut from the sample', () => {
  const to = mkdtempSync(join(tmpdir(), 'ci-smoke-'));
  try {
    const s = smokeEpisode(SAMPLE, to), e = JSON.parse(readFileSync(join(to, 'episode.json'), 'utf8'));
    const sample = JSON.parse(readFileSync(join(SAMPLE, 'episode.json'), 'utf8')), vo = JSON.parse(readFileSync(join(SAMPLE, 'vo', 'vo.json'), 'utf8'));
    assert.deepEqual(shapeErrors(e), []);
    assert.deepEqual(e.beats[0], sample.beats[0]);
    assert.deepEqual(e.beats.at(-1), sample.beats.at(-1), 'the vote beat');
    for (const shot of ['stats', 'card']) assert.ok(e.beats.some(b => b.shot === shot), `a ${shot} beat`);
    const spoken = s.beats.reduce((t, n) => t + vo.lines[n - 1].e - vo.lines[n - 1].s, 0);
    assert.ok(spoken < 18 && spoken < vo.duration / 2, `${spoken.toFixed(1)} s of voice: the smoke is short`);
    assert.ok(Math.abs(s.seconds - spoken - 0.1 * s.beats.length - 0.8 * (s.beats.length + 1)) < 0.01, 'the take is the lines plus the pauses');
    assert.equal(statSync(s.take).size, 44 + Math.round(s.seconds * 24000) * 2);
  } finally { rmSync(to, { recursive: true, force: true }); }
});

test('ci-smoke: a sample with no card draws its shortest middle beat as one', () => {
  const b = (shot, line) => ({ who: 'x', shot, line });
  const picked = pickBeats([b('room', 'One two.'), b('close', 'A long middle line here.'), b('stats', 'Numbers.'), b('two', 'So short.'), b('close', 'Comment A or B.')], [1, 3, 1, 0.9, 1]);
  assert.deepEqual(picked.map(p => [p.i, p.beat.shot]), [[0, 'room'], [2, 'stats'], [3, 'card'], [4, 'close']]);
  assert.deepEqual(picked[2].beat.card, ['SO', 'SHORT.']);
});
