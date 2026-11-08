// The TMV style switch: "style" in episode.json picks the engine (tmv/episode/engines.mjs); every engine cuts on the
// shared timeline (tmv/episode/timeline.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT, run } from '../../kit/env.mjs';
import { ENGINES, DEFAULT_STYLE, enginePage } from '../../tmv/episode/engines.mjs';
import { SCHEMA, shapeErrors } from '../../tmv/episode/script.mjs';
import { timeline, cardsOf } from '../../tmv/episode/timeline.js';

const TMV = join(ROOT, 'tmv'), read = p => JSON.parse(readFileSync(join(TMV, p), 'utf8'));
const sample = read('episodes/sample/episode.json'), vo = read('episodes/sample/vo/vo.json');

test('the registry has the three styles the schema allows, and a missing style is 3d', () => {
  assert.deepEqual(Object.keys(ENGINES), ['3d', 'paper', 'handdraw']);
  assert.deepEqual(SCHEMA.properties.style.enum, Object.keys(ENGINES));
  assert.equal(DEFAULT_STYLE, '3d');
  assert.equal(sample.style, undefined);
  assert.equal(enginePage(undefined, TMV), join(TMV, 'episode/index.html'));
  assert.equal(enginePage('3d', TMV), join(TMV, 'episode/index.html'));
});

test('the schema refuses an unknown style and takes the three', () => {
  assert.deepEqual(shapeErrors({ ...sample, style: 'clay' }), ['"style": "clay" is not one of 3d, paper, handdraw']);
  for (const style of Object.keys(ENGINES)) assert.deepEqual(shapeErrors({ ...sample, style }), []);
});

test('a style whose page is not built stops with one line naming the page', () => {
  const empty = mkdtempSync(join(tmpdir(), 'tmv-engines-'));
  try {
    assert.throws(() => enginePage('paper', empty), { message: 'the paper engine is not built yet (no episode/paper/index.html): set "style": "3d" to render this episode now' });
    assert.throws(() => enginePage('handdraw', empty), { message: 'the hand-draw engine is not built yet (no episode/handdraw/index.html): set "style": "3d" to render this episode now' });
    assert.throws(() => enginePage('clay', empty), /"style": "clay" is not one of 3d, paper, handdraw/);
  } finally { rmSync(empty, { recursive: true, force: true }); }
});

test('series.mjs new keeps the style in series.json for every episode', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tmv-series-')), from = join(dir, 'from'), show = join(dir, 'show');
  try {
    mkdirSync(from); writeFileSync(join(from, 'episode.json'), JSON.stringify({ ...sample, style: 'paper' }));
    const r = run('node', [join(TMV, 'episode/series.mjs'), 'new', show, '--from', from], { capture: true });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(readFileSync(join(show, 'series.json'), 'utf8')).style, 'paper');
    assert.equal(JSON.parse(readFileSync(join(show, 'ep1/episode.json'), 'utf8')).style, undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the shared timeline cuts the sample end to end on its voice, every cut on a line or word start', () => {
  const W = {}; new Function('window', readFileSync(join(TMV, 'characters/cast.js'), 'utf8'))(W);
  const { SHOTS, DUR, lead } = timeline(sample, vo, cardsOf(sample, W.TMV_SEEDS));
  const starts = new Set([...vo.lines, ...vo.words].map(w => w.s - 0.12));
  assert.equal(lead, 'nova');
  assert.equal(SHOTS[0].a, 0); assert.equal(SHOTS.at(-1).b, DUR);
  SHOTS.slice(1).forEach((s, k) => { assert.equal(s.a, SHOTS[k].b); assert.ok(starts.has(s.a), `cut at ${s.a} s is on a line or word start`); });
  assert.ok(SHOTS.every(s => s.b - s.a <= 4.5), 'no shot over 4.5 s');
});
