// Which rows are edits (styles/stick-man/tools/faults.mjs editCuts). Hot Money ep01 r5 keyed its camera one shot per frame
// (flyCam: every frame a 'cut' shot), so every row carried motion.cut and faceFaults, acting, joints and camStats judged
// nothing on the whole reel (the face round had to re-derive cuts in a film tool).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editCuts, faceFaults, camStats } from '../../styles/stick-man/tools/faults.mjs';
import { rowsOf } from './stick-face-smooth.test.mjs';

const T0 = (...keys) => [{ f: -1e9, expr: keys[0] }, ...keys.slice(1).map(([f, expr, o]) => ({ f, expr, ...o }))];
// a camera flying 0.4 m a frame along x (a chase), with a hard cut to a new place at frame 60 and a new act at 90
const flown = rows => rows.map(r => {
  const f = r.f, far = f >= 60 ? 12 : 0;
  return { ...r, act: f >= 90 ? 1 : 0, mix: null, motion: { ...r.motion, cut: true, shotCut: true, cam: 3 },
    camera: { pos: [0.4 * f + far, 1.6, 4], target: [0.4 * f + far, 1.2, 0], lens: 28 } };
});

test('a camera keyed one shot per frame is one flight: only the hard cut and the new act are edits', () => {
  const rows = flown(rowsOf(T0('calm'), 0, 120));
  assert.deepEqual([...editCuts(rows)].map(r => r.f), [0, 60, 90]);
});

test('a lens jump at a still camera is an edit; a slow zoom is not', () => {
  const rows = flown(rowsOf(T0('calm'), 0, 40)).map(r => ({ ...r, act: 0, camera: { pos: [0, 1.6, 4], target: [0, 1.2, 0], lens: r.f < 20 ? 28 + 0.5 * r.f : 60 } }));
  assert.deepEqual([...editCuts(rows)].map(r => r.f), [0, 20]);
});

test('rows without a camera keep the cut they carry', () => {
  const rows = [{ f: 1, motion: { cut: true } }, { f: 2, motion: { cut: false } }, { f: 3, motion: { cut: true, shotCut: true } }];
  assert.deepEqual([...editCuts(rows)].map(r => r.f), [1, 3]);
});

test('Hot Money r5: on a flown camera faceFaults judges the face (a pop is found), camStats has camera numbers', () => {
  const clean = flown(rowsOf(T0('calm', [30, 'worried'], [75, 'shock'], [100, 'panic'], [140, 'calm']), 0, 180));
  const bad = clean.map(r => JSON.parse(JSON.stringify(r))); bad[40].actors.you.face.v[0] -= 8;
  assert.ok(faceFaults(bad, 'you').pops.some(p => p.f === 40), 'the pop at 40 is judged');
  assert.ok(faceFaults(clean, 'you').rises.length >= 1, 'the changes are judged');
  assert.equal(camStats(clean).median, 3);
});
