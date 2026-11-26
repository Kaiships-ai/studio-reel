// C6 of cutgate.mjs: a close head (its box 20 % of the frame height or more) cut by the frame edge (more than 2 % of its height
// past an edge) for 3 frames or more fails. What if 1 REMIX v1, 97-99 s: the last man's head, about 45 % of the frame height,
// its top 40 % past the top edge for 87 frames, passed C4 (lead only, under half the box) and was called grotesque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { measure, judge, closeCuts } from '../../styles/stick-man/tools/gates/cutgate.mjs';

const fps = 30, W = 1080, H = 1920, hh = 0.45 * H;
const scores = dur => Array.from({ length: Math.round(dur * fps) }, (_, i) => ({ t: i / fps, score: 0.02 }));
const lead = { lead: true, inFrame: true, headW: [0, 0, 1.45], head: [400, 700, 560, 860], pos: [0, 0, 0] };
// rows: the lead framed well (so C3 and C4 read), plus `lastman` with the head box `box(f)` per frame
const film = (n, box, extra = {}) => Array.from({ length: n }, (_, f) => ({ f, px: [W, H], camera: { pos: [0, -3, 1.45] },
  actors: { you: lead, ...(box(f) ? { lastman: { inFrame: true, head: box(f), ...extra } } : {}) } }));
const c6 = rows => {
  const m = measure({ dur: rows.length / fps, scores: scores(rows.length / fps), rows, W, H });
  return { m, row: judge(m).find(r => r.id === 'C6'), all: Object.fromEntries(judge(m).map(r => [r.id, r.ok])) };
};
const v1Box = [200, -0.4 * hh, 900, 0.6 * hh];

test('C6: the v1 last man, a close head with its top 40 % past the edge for 87 frames, fails', () => {
  const { m, row } = c6(film(87, () => v1Box));
  assert.equal(m.closeCutRun, 87);
  assert.equal(row.ok, false);
  assert.equal(m.closeCut[0].actor, 'lastman');
  assert.equal(Math.round(m.closeCut[0].cut * 100), 40);
});

test('C6: the same head inside the frame passes', () => {
  const { m, row } = c6(film(87, () => [200, 300, 900, 300 + hh]));
  assert.equal(m.closeCutRun, 0); assert.equal(row.ok, true);
});

test('C6: a far crowd head cut by the edge (under 20 % of the frame height) passes', () => {
  const { m, row } = c6(film(87, () => [-20, 800, 40, 860]));
  assert.equal(m.closeCutRun, 0); assert.equal(row.ok, true);
});

test('C6: a close head leaving the frame fast (a run past the lens) passes', () => {
  // the centre moves 60 px a frame (3 % of the frame height) up and out of the top edge
  const { m, row } = c6(film(30, f => [200, 200 - 60 * f, 900, 200 - 60 * f + hh]));
  assert.equal(m.closeCutRun, 0); assert.equal(row.ok, true);
});

test('C6: a close head cut for 2 frames passes; 3 frames fails', () => {
  // the head is on screen only for those frames (a 2-frame flash of a cut close, then a cut away)
  const cutFor = k => film(60, f => (f >= 20 && f < 20 + k ? v1Box : null));
  assert.equal(c6(cutFor(2)).row.ok, true);
  assert.equal(c6(cutFor(3)).row.ok, false);
});

test('C6: a cut under 2 % of the head height is not counted', () => {
  const { m } = c6(film(60, () => [200, -0.01 * hh, 900, 0.99 * hh]));
  assert.equal(m.closeCutRun, 0);
});

test('C4 is unchanged: the lead-only, under-half rule still reads the same on the v1 case', () => {
  const { all, m } = c6(film(87, () => v1Box));
  assert.equal(m.faceCutRun, 0); assert.equal(all.C4, true);
});

test('C6: one jittery frame (a jump over 1.2 %) inside a cut neither counts nor splits the run', () => {
  const jit = [200, -0.4 * hh + 60, 900, 0.6 * hh + 60];
  const runs = closeCuts(film(40, f => (f === 20 ? jit : v1Box)), W, H).filter(s => s.actor === 'lastman');
  assert.equal(runs.length, 1);
  // frame 20 jumps in and frame 21 jumps back: both left out, the other 38 frames count
  assert.deepEqual([runs[0].f0, runs[0].f1, runs[0].n], [0, 39, 38]);
});

test('C6: a row with its own px is read at that size', () => {
  // a 720 x 1280 row: the v1 box scaled to it fails; read at 1080 x 1920 it would be under 20 % and pass
  const k = 720 / 1080, box = v1Box.map(v => v * k);
  const rows = Array.from({ length: 10 }, (_, f) => ({ f, px: [720, 1280], actors: { lastman: { head: box } } }));
  assert.equal(closeCuts(rows, W, H)[0].n, 10);
  const small = [200, -0.4 * 300, 600, 0.6 * 300];   // 300 px tall: 23 % of 1280, 16 % of 1920
  const rows2 = Array.from({ length: 10 }, (_, f) => ({ f, px: [720, 1280], actors: { lastman: { head: small } } }));
  assert.equal(closeCuts(rows2, W, H)[0]?.n, 10);
  assert.equal(closeCuts(rows2.map(({ px, ...r }) => r), W, H).length, 0);
});

test('C6: two actors cut at once are two runs, each its own length', () => {
  const rows = Array.from({ length: 30 }, (_, f) => ({ f, px: [W, H], actors: {
    a: { head: v1Box }, ...(f < 5 ? { b: { head: [100, 1500, 700, 1500 + hh] } } : {}) } }));
  const runs = closeCuts(rows, W, H);
  assert.deepEqual(runs.map(s => [s.actor, s.n]), [['a', 30], ['b', 5]]);
  assert.equal(Math.round(runs[1].cut * 100), Math.round((1500 + hh - H) / hh * 100));
});

test('C6: a run that ends at the last frame is counted', () => {
  const runs = closeCuts(film(50, f => (f >= 45 ? v1Box : null)), W, H);
  assert.deepEqual([runs[0].f0, runs[0].f1, runs[0].n], [45, 49, 5]);
  assert.equal(c6(film(50, f => (f >= 45 ? v1Box : null))).row.ok, false);
});
