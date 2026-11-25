// What a viewer reads off a body (bodies-measure.mjs): an idle that moves and is nobody else's, a face its hood does not hide.
// The limits and these controls were committed before anything was measured.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { onBody } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { stillSpans, STILL_F, STILL_IN } from '../../styles/stick-man/tools/gates/bodylife.mjs';
import { standing, copyOf, coverFrom, hoodCover, COVER_MAX, COVER_SAME } from './bodies-measure.mjs';

const mean = P => P[0].map((_, i) => P.reduce((a, p) => a + p[i], 0) / P.length);
const retimed = (P, k) => Array.from({ length: Math.round(P.length * k) }, (_, i) => P[Math.min(P.length - 1, Math.round(i / k))]);
const resized = (P, k) => { const m = mean(P); return P.map(p => p.map((v, i) => m[i] + k * (v - m[i]))); };
const each = (paths, f) => Object.fromEntries(Object.entries(paths).map(([k, P]) => [k, f(P)]));

test('control: the adult\'s idles played on the child are called copies, as they are, retimed or resized', async () => {
  const adult = standing('child').filter(C => (C.body || 'adult') === 'adult'); assert.ok(adult.length >= 2, `${adult.length} adult idles`);
  for (const A of adult) { const { paths } = await onBody(A, 'child');
    for (const [n, f] of [['plain', P => P], ['x 0.76 time', P => retimed(P, 0.76)], ['x 1.5 size', P => resized(P, 1.5)], ['x 1.25 size, x 0.8 time', P => resized(retimed(P, 0.8), 1.25)]])
      assert.ok((await copyOf(each(paths, f), 'child')).some(r => r.of === A.name), `${A.name}, ${n}: not called a copy`);
  }
});
test('control: the still limit calls a held figure and a slow drift still, and a moving hand not', () => {
  const rows = fn => Array.from({ length: 2 * STILL_F }, (_, f) => ({ head: [0, 0, 1], handL: [fn(f), 0, 0.5], handR: [0, 0, 0.5], pelvis: [0, 0, 0.6] }));
  assert.ok(stillSpans(rows(() => 0)).length);
  assert.ok(stillSpans(rows(f => 0.01 * f / STILL_IN)).length);
  assert.equal(stillSpans(rows(f => 0.05 * Math.sin(Math.PI * f / STILL_IN))).length, 0);
});
test('control: the cover is 0 with nothing on the head, 1 behind a wall, 0.5 behind a wall to the face\'s middle', () => {
  const W = 0.6, g = { W, HA: 0.5 * W, HEAD_H: 0.94 }, head = new THREE.Group(); head.scale.setScalar(0.85); head.position.set(0.3, 1.2, 0);
  const wall = (w, x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 5), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.position.set(x, 1.2, 1); m.updateMatrixWorld(true); return m; };
  const none = coverFrom(head, [], 0, g); assert.ok(none.seen > 100); assert.equal(none.share, 0);
  assert.equal(coverFrom(head, [wall(5, 0.3)], 0, g).share, 1);
  assert.ok(Math.abs(coverFrom(head, [wall(5, 2.8)], 0, g).share - 0.5) < 0.05);
  assert.ok(coverFrom(head, [], 90, g).seen > 50, 'some of the face is seen from the side');
});
test('the hoodie hides no more of the teen\'s face than of the adult\'s, and not most of it from the side', async () => {
  const [a, t] = [await hoodCover('adult'), await hoodCover('teen')];
  for (const az of [0, 45, 90]) {
    assert.ok(t.cover[az] <= COVER_MAX && a.cover[az] <= COVER_MAX, `az ${az}: adult ${a.cover[az]}, teen ${t.cover[az]}`);
    assert.ok(t.cover[az] - a.cover[az] <= COVER_SAME, `az ${az}: teen ${t.cover[az]}, adult ${a.cover[az]}`);
  }
});
