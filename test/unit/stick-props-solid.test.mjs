// The shot gate on Hot Money ep01 r5 (19/11): each check fails on the v3 film's rows and passes on the fixed film's,
// both measured by this PR's engine (shot.mjs --dbg, 540x960) and cut to the frames of each fault in
// test/fixtures/hm-r5/. v3 = the code in review/r5/p1/bak/, fix = the film after the P1 fix round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { shotFaults, blocks } from '../../styles/stick-man/tools/shotfaults.mjs';
import { scaleFault, kindOf } from '../../styles/stick-man/lib/props/sizes.js';

const W = 540, H = 960;
const rows = n => zlib.gunzipSync(fs.readFileSync(new URL(`../fixtures/hm-r5/${n}.jsonl.gz`, import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const blocking = (n, kind) => shotFaults(rows(n), { W, H }).filter(x => blocks(x) && x.kind === kind);

test('class 1: the bag through the head, the dresser and door 9\'s jamb blocks on v3 LOAD-A and is gone on the fix', () => {
  const head = blocking('v3-load-a', 'prop in the head'), set = blocking('v3-load-a', 'prop in the set');
  assert.ok(head.some(x => x.who === 'bagA' && x.frames >= 6), head.map(x => x.what).join('\n'));
  for (const piece of ['dresser', 'wall9-south-of-door', 'bed']) assert.ok(set.some(x => x.what.includes(`into ${piece}`)), `bag in ${piece}: ${set.map(x => x.what).join('\n')}`);
  assert.match(head[0].what, /fix: carry it clear of the head/);
  assert.deepEqual([...blocking('fix-load-a', 'prop in the head'), ...blocking('fix-load-a', 'prop in the set')].map(x => x.what), []);
});

test('class 2: the bait bill held out of the top of the frame (v3 LOAD-B 741-757) blocks; the fix keeps it in frame', () => {
  const v3 = blocking('v3-load-b', 'prop leaves view');
  assert.ok(v3.some(x => x.who === 'bill' && x.F === 741 && x.frames === 17), v3.map(x => `${x.F} ${x.what}`).join('\n'));
  assert.deepEqual(blocking('fix-load-b', 'prop leaves view').map(x => x.F), []);
});

test('class 3: a round 14 cm long (the r5 s5 bullet at scale 1) is out of scale, one at 2.5 cm (scale 0.18) is not; kinds come from names', () => {
  assert.equal(kindOf('bullet'), 'bullet'); assert.equal(kindOf('cop:Lpistol'), 'pistol'); assert.equal(kindOf('bagA'), null);
  for (const [id, k] of [['bullet2', 'bullet'], ['you:Rhotdog', 'hotdog'], ['baitBill', 'bill'], ['bait_bill', 'bill'], ['billA', 'bill']]) assert.equal(kindOf(id), k, id);
  for (const set of ['cupboard', 'billboard', 'billy', 'phonebooth', 'torchlight', 'hotdogStand']) assert.equal(kindOf(set), null, `${set} is a set piece, not a hand prop`);
  assert.equal(scaleFault('cupboard', 1.8), null, 'a 1.8 m cupboard is never "prop out of scale"');
  assert.ok(scaleFault('bullet', 0.14)); assert.equal(scaleFault('bullet', 0.025), null); assert.equal(scaleFault('cop:Lpistol', 0.2615), null);
  const r = rows('v3-load-b')[5], at = r.track.bill?.c || [0, 0, 1];
  const fly = s => Array.from({ length: 6 }, (_, i) => ({ ...r, f: r.f + i, propIn: [], track: { bullet: { shown: true, held: false, on: 'in', box: [200, 300, 260, 330], size: s, dims: [s, s / 2.3, s / 2.3], c: at } } }));
  assert.equal(shotFaults(fly(0.14), { W, H }).filter(x => blocks(x) && x.kind === 'prop out of scale').length, 1);
  assert.equal(shotFaults(fly(0.025), { W, H }).filter(x => x.kind === 'prop out of scale').length, 0);
});

test('class 5: the hot dog let go over room 2\'s bed rests on it (engine/solids.js), where the old engine dropped it to the floor (-0.05 m)', () => {
  for (const v of ['v3', 'fix']) {
    const t = rows(`${v}-ending-a`).at(-1).track['you:Lhotdog'], bottom = t.c[2] - t.dims[2] / 2;
    assert.ok(bottom > 0.5, `${v}: bottom ${bottom.toFixed(3)} m`);
  }
});

test('class 8: the motel world\'s 220 x 60 m sky card cut by the far plane in CHASE blocks; hidden, the shot is clean', () => {
  const cut = blocking('chase', 'cut by the far plane');
  assert.ok(cut.some(x => /PlaneGeometry .*220 x 0 x 60|0 x 220 x 60/.test(x.what)), cut.map(x => `${x.F} ${x.what}`).join('\n'));
  assert.match(cut[0].what, /fix: the engine's sky dome is the sky/);
  assert.deepEqual(blocking('chase-cards', 'cut by the far plane').filter(x => /PlaneGeometry/.test(x.what)).map(x => x.what), []);
});
