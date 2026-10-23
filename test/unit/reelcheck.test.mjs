// The reel checks that replace what reviewers caught by eye, on the mistakes the first risograph reel made.
import test from 'node:test';
import assert from 'node:assert/strict';
import { quietStretches, pageFindings } from '../../core/render/reelcheck.mjs';

const fps = 30;
// a change every 0.3 s for 10 s, except inside the given [from, to) windows
const frames = (...quiet) => Array.from({ length: 10 * fps }, (_, f) => f % 9 === 0 && !quiet.some(([a, b]) => f / fps > a && f / fps < b));

test('a reel with something new every 0.3 s has no quiet stretch', () => {
  assert.deepEqual(quietStretches(frames(), fps), []);
});

test('2.4 s with nothing new after the hook is flagged, 1.2 s is not', () => {
  const q = quietStretches(frames([4.8, 7.2]), fps);
  assert.equal(q.length, 1);
  assert.ok(Math.abs(q[0].t0 - 4.8) < 1e-6 && Math.abs(q[0].d - 2.4) < 1e-6 && !q[0].hook);
  assert.deepEqual(quietStretches(frames([4.8, 6]), fps), []);
});

test('a 0.9 s gap inside the hook is flagged as a hook gap', () => {
  const q = quietStretches(frames([.9, 1.8]), fps);
  assert.equal(q.length, 1);
  assert.ok(q[0].hook && Math.abs(q[0].d - .9) < 1e-6);
});

const step = .1, samples = (sec, at) => Array.from({ length: sec * 10 }, (_, i) => ({ t: i * step, ...at(i * step) }));

test('a phone held in the caption band is flagged; a fly-through and a caption strip are not', () => {
  const s = samples(3, t => ({
    texts: [{ id: 'cap', text: 'One: CapCut.', x0: 72, y0: 1340, x1: 955, y1: 1450, caption: true }],
    boxes: [
      ...(t < 1 ? [{ id: 'phone', x0: 350, y0: 1040, x1: 730, y1: 1680 }] : []),
      ...(t >= 2 && t < 2.2 ? [{ id: 'card', x0: 900, y0: 600, x1: 1100, y1: 800 }] : []),
      { id: 'gone', x0: 1200, y0: 600, x1: 1400, y1: 800 },
    ],
  }));
  const { outside } = pageFindings(s, step);
  assert.deepEqual(outside.map(r => r.id), ['phone']);
  assert.ok(Math.abs(outside[0].t1 - outside[0].t0 - 1) < 1e-6);
});

test('text past x 960 (under the like and share buttons) is flagged', () => {
  const { outside } = pageFindings(samples(1, () => ({ texts: [{ id: 'apps', text: 'APPS', x0: 100, y0: 620, x1: 980, y1: 880 }] })), step);
  assert.deepEqual(outside.map(r => r.text), ['APPS']);
});

test('a number badge alone for 0.5 s is flagged; with its title it is not', () => {
  const badge = { id: 'badge3', text: '3', x0: 86, y0: 442, x1: 214, y1: 570 }, title = { id: 'title3', text: 'ChatGPT', x0: 238, y0: 450, x1: 928, y1: 590 };
  const { lone } = pageFindings(samples(2, t => ({ texts: t < .5 ? [badge] : [badge, title] })), step);
  assert.equal(lone.length, 1);
  assert.deepEqual(lone[0].texts, ['3']);
  assert.deepEqual(pageFindings(samples(2, () => ({ texts: [badge, title] })), step).lone, []);
  assert.deepEqual(pageFindings(samples(2, t => ({ texts: t < .2 ? [badge] : [badge, title] })), step).lone, []);
});
