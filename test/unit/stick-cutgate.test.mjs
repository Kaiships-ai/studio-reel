import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { hardCuts, measure, judge, segments, verdict as verdictOf } from '../../styles/stick-man/tools/cutgate.mjs';

const fps = 30;
const scores = (dur, cutAt, extra = []) => Array.from({ length: Math.round(dur * fps) }, (_, i) => {
  const t = i / fps, hit = cutAt.some(c => Math.abs(c - t) < 0.5 / fps) || extra.some(c => Math.abs(c - t) < 0.5 / fps);
  return { t, score: hit ? 0.6 : 0.02 };
});
const verdict = m => Object.fromEntries(judge(m).map(r => [r.id, r.ok]));

test('a score over 0.30 is a cut; frames over it less than 0.2 s apart are one cut; whips under 0.30 are not', () => {
  const s = scores(5, [1, 1.1, 3]).map(x => (Math.abs(x.t - 4) < 0.02 ? { ...x, score: 0.25 } : x));
  assert.deepEqual(hardCuts(s).map(c => +c.t.toFixed(2)), [1, 3]);
});

test('the bible escape cut passes and v7 escape fails, as Kai picked them', () => {
  const bible = measure({ dur: 15.4, scores: scores(15.4, [4.23, 5.97, 7.97, 8.7]) });
  const v7 = measure({ dur: 15.4, scores: scores(15.4, [0.5, 1.9, 4.23, 5.97, 7.47, 7.97, 8.7, 11, 12.37, 13, 15]) });
  assert.deepEqual([verdict(bible).C1, verdict(bible).C2], [true, true]);
  assert.deepEqual([verdict(v7).C1, verdict(v7).C2], [false, false]);
});

test('a long uncut opening does not hide a burst of cuts later in the film', () => {
  const burst = [26.7, 27.2, 28.6, 30.9, 32.7, 34.2, 34.7, 35.4, 37.7, 39.1];
  const m = measure({ dur: 81.7, scores: scores(81.7, [16, ...burst]) });
  assert.equal(m.longestTake > 15, true, 'the opening flight is a long take');
  assert.equal(verdict(m).C1, false, `${m.worstWindow} cuts in 15 s is a burst`);
});

test('one cut a minute, like the Rick clips, passes', () => {
  assert.deepEqual(verdict(measure({ dur: 65, scores: scores(65, [44]) })), { C1: true, C2: true, C3: null, C4: null });
});

const row = (f, cam, head, box) => ({ f, camera: { pos: cam }, actors: { you: { lead: true, inFrame: true, headW: head, head: box } } });
test('camera rows: a camera looking up at the lead is low; a head mostly out of frame for over a second fails', () => {
  const box = [200, 300, 340, 440], out = [-120, 300, 20, 440];
  const eye = Array.from({ length: 60 }, (_, f) => row(f, [0, -3, 1.6], [0, 0, 1.45], box));
  const low = Array.from({ length: 60 }, (_, f) => row(60 + f, [0, -3, 0.4], [0, 0, 1.45], f < 40 ? out : box));
  const m = measure({ dur: 4, scores: scores(4, []), rows: [...eye, ...low], W: 540, H: 960 });
  assert.equal(m.lowShare, 0.5);
  assert.equal(m.faceCutRun, 40 / fps);
  assert.deepEqual([verdict(m).C3, verdict(m).C4], [false, false]);
  const ok = measure({ dur: 4, scores: scores(4, []), rows: eye, W: 540, H: 960 });
  assert.deepEqual([verdict(ok).C3, verdict(ok).C4], [true, true]);
});

test('no camera rows is PARTIAL, never PASS; a FAIL still wins', () => {
  const cutsOnly = measure({ dur: 65, scores: scores(65, [44]) });
  assert.equal(verdictOf(judge(cutsOnly)), 'PARTIAL');
  assert.equal(verdictOf(judge(measure({ dur: 15.4, scores: scores(15.4, [1, 2, 3, 4, 5, 6]) }))), 'FAIL');
});

test('a film rendered in parts reads s<n>/ back to back in the render, and refuses a span that is not the render', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cutgate-parts-'));
  const span = { '.': [0, 0], s4: [0, 927], s5: [928, 1381], s6: [1307, 2375] };
  for (const d of ['s4', 's5', 's6', 'look']) { fs.mkdirSync(path.join(dir, d)); fs.writeFileSync(path.join(dir, d, 'reel.js'), ''); }
  const reelSpan = async d => span[path.relative(dir, d) || '.'];
  try {
    const segs = await segments(dir, 2451 / 30, reelSpan);
    assert.deepEqual(segs.map(s => [path.basename(s.dir), s.f0, s.at]), [['s4', 0, 0], ['s5', 928, 928], ['s6', 1307, 1382]]);
    await assert.rejects(segments(dir, 60, reelSpan), /is 81\.7 s, the render 60\.0 s/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the final render: a size-suffixed version counts, the highest version wins by number, final* wins', async () => {
  const { pickFinal } = await import('../../styles/stick-man/tools/renders.mjs');
  assert.equal(pickFinal(['hm-ep01-r2_v7_720.mp4', 'notes.txt']), 'hm-ep01-r2_v7_720.mp4');
  assert.equal(pickFinal(['ep_v2.mp4', 'ep_v10.mp4', 'ep_v9_1080.mp4']), 'ep_v10.mp4');
  assert.equal(pickFinal(['ep_v10.mp4', 'final.mp4']), 'final.mp4');
  assert.equal(pickFinal(['ep.mp4', 'draft_720.mp4']), undefined);
});
