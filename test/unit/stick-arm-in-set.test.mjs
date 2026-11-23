// Hot Money ep01, City Bank (23/11): you's left forearm runs through the counter top's front edge at 1908-1914 with the
// elbow and the hand both clear, and the counter hides its middle (a stub); the teller's right forearm touches it at
// 1929-1930. The crossing raycasts follow the head, chest, pelvis and knees only, so the shot gate let it through. Rows cut
// from the film's shot rows (720x1280) to frames 1896-1936: old = the faulty take (review/v40), new = the re-keyed one
// (review/v41). The counter is the film's city counter (r5/world/bank_*_blend.py, window x 160) built as box meshes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import * as THREE from 'three';
import { solidBoxes, armIn } from '../../styles/stick-man/engine/solids.js';
import { shotFaults, blocks } from '../../styles/stick-man/tools/gates/shotfaults.mjs';

const KIND = 'arm in the set';
const box = (lo, hi, name) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]), new THREE.MeshBasicMaterial());
  m.position.set((lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2, -(lo[1] + hi[1]) / 2); m.name = name; return m;
};
const counter = new THREE.Group();
for (const [lo, hi, name] of [[[-1.6, -0.38, 0], [4.4, 0.38, 1.05], 'counter body'], [[-1.68, -0.45, 1.05], [4.48, 0.45, 1.12], 'counter top'],
  [[-1.6, 1.58, 0], [4.4, 2.36, 0.96], 'back counter']]) counter.add(box([lo[0] + 160, lo[1], lo[2]], [hi[0] + 160, hi[1], hi[2]], name));
counter.updateMatrixWorld(true);
const solids = solidBoxes(counter);
// what engine/play.js adds to each row: out.armIn for every actor shown
const withArms = rs => rs.map(r => ({ ...r, armIn: Object.entries(r.actors).flatMap(([n, a]) => armIn(a.limbs, solids).map(x => ({ who: n, ...x }))) }));
const rows = n => withArms(zlib.gunzipSync(fs.readFileSync(new URL(`../fixtures/hm-ep01/counter-v-${n}.jsonl.gz`, import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l)));
const armFaults = rs => shotFaults(rs, { W: 720, H: 1280 }).filter(x => x.kind === KIND);

test('the forearm through the counter top blocks on the old take (1909-1914, after the cut at 1909); the 1-2 frame touches are watched; the re-keyed take has none', () => {
  const old = armFaults(rows('old')), msg = old.map(x => `${x.F} ${x.what} ${x.px.toFixed(1)} px x ${x.frames} f x seen ${x.seen}`).join('\n');
  const block = old.filter(blocks);
  assert.equal(block.length, 1, msg);
  assert.match(block[0].what, /^you left forearm .* into counter top/, msg);
  assert.deepEqual([block[0].F, block[0].frames], [1909, 6], msg);
  assert.ok(old.some(x => x.who === 'you' && x.F === 1908 && x.frames === 1), `the frame before the cut is watched: ${msg}`);
  assert.ok(old.some(x => x.who === 't' && x.F === 1929 && x.frames === 2), `the teller's forearm at 1929-1930 is watched: ${msg}`);
  assert.deepEqual(armFaults(rows('new')).map(x => x.what), []);
});

// a still figure at the counter's front, one arm keyed per frame; the other arm hangs at the side
const base = rows('old').find(r => r.f === 1910), you0 = base.actors.you;   // the customer-side camera, 1.7 m off
const y0 = -0.45, top = 1.12, X = 159.6;                            // the counter top's front face and top, a spot along it
const hang = x => ({ shoulder: [x, y0 - 0.25, 1.35], elbow: [x, y0 - 0.25, 1.05], hand: [x, y0 - 0.25, 0.77], grip: false });
const frame = (f, R) => ({ ...base, f, actors: { you: { ...you0, inFrame: true, limbs: { ...you0.limbs, L: { ...you0.limbs.L, ...hang(X - 0.34) }, R: { ...you0.limbs.R, ...R } } } } });
const take = (n, R, rest) => withArms(Array.from({ length: 10 }, (_, i) => frame(1900 + i, i >= 3 && i < 3 + n ? R : rest)));
const sh = [X, y0 - 0.25, 1.35], DOWN = hang(X);
const kinds = rs => armFaults(rs).map(x => (blocks(x) ? 'blocks' : 'watch'));

test('a forearm across the counter top front edge blocks from 3 frames and is watched for 1', () => {
  const across = { shoulder: sh, elbow: [X, y0 + 0.15, 1.19], hand: [X, y0 - 0.1, 0.92], grip: false };
  const hit = armIn({ R: across }, solids);
  assert.deepEqual(hit.map(x => [x.part, x.in.split(' at ')[0], x.cm > 3]), [['forearm', 'counter top', true]], 'the elbow over the top, the hand in front: only the middle is in');
  assert.deepEqual(kinds(take(5, across, DOWN)), ['blocks']);
  assert.deepEqual(kinds(take(1, across, DOWN)), ['watch']);
});

test('a hand laid on the counter top or holding a prop on it, and a forearm resting on the top, are no fault', () => {
  const laid = { shoulder: sh, elbow: [X, y0 - 0.12, 1.22], hand: [X, y0 + 0.2, top - 0.02], grip: true };
  assert.deepEqual(kinds(take(5, laid, DOWN)), [], 'the hand on its IK target 2 cm into the top');
  const holding = { ...laid, grip: false, heldPts: [[X, y0 + 0.2, top + 0.03]] };
  assert.deepEqual(kinds(take(5, holding, DOWN)), [], 'the hand holding a prop on the top');
  const free = { ...laid, grip: false, hand: [X, y0 + 0.2, top + 0.005] };
  assert.deepEqual(kinds(take(5, free, DOWN)), [], 'a free hand touching the top');
  const r = 0.023 / 0.5125 * 0.3, lean = { shoulder: [X, y0 - 0.1, top + 0.3], elbow: [X, y0 + 0.05, top + r], hand: [X, y0 + 0.3, top + r], grip: false };
  assert.deepEqual(kinds(take(5, lean, DOWN)), [], 'a forearm lying on the top');
});
