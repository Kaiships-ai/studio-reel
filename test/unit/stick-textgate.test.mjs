// The text gate (styles/stick-man/tools/gates/textgate.mjs) on hand-made rows: words under the app's bands, on a face,
// stacked, outside the safe box (a warning), with a middle dot, and rows that carry no text field.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { textgate, frameFaults, HOLD, FACE_HOLD } from '../../styles/stick-man/tools/gates/textgate.mjs';

const GATE = path.join(ROOT, 'styles/stick-man/tools/gates/textgate.mjs');
const word = (text, box, i = 0, kind = 'text') => ({ i, kind, text, box });
const actor = (head, faceVis = 1) => ({ hero: { inFrame: true, head, faceVis } });
const rows = (n, make) => Array.from({ length: n }, (_, f) => ({ f, px: [1080, 1920], actors: {}, ...make(f) }));
const ids = R => R.runs.map(r => r.id);

test('T1: a word held in the bottom band fails; a shorter flash does not', () => {
  const low = word('DECIDES EPISODE 2', [0.09, 0.77, 0.84, 0.83]);
  const R = textgate(rows(HOLD, () => ({ text: [low] })));
  assert.equal(R.ok, false); assert.deepEqual(ids(R), ['T1', 'T2']);
  assert.equal(textgate(rows(HOLD - 1, () => ({ text: [low] }))).ok, true);
});

test('T1: a word under the right-hand buttons fails', () => {
  assert.ok(frameFaults({ text: [word('= REPORTED', [0.53, 0.55, 0.95, 0.61])], actors: {} }).some(p => p.id === 'T1' && /right/.test(p.what)));
});

test('T3: a card over a face the lens sees fails after 0.5 s; over the back of a head it does not', () => {
  const card = word('WANTED', [0.3, 0.2, 0.7, 0.35]), head = [324, 300, 756, 800];
  assert.deepEqual(ids(textgate(rows(FACE_HOLD, () => ({ text: [card], actors: actor(head) })))).filter(x => x === 'T3'), ['T3']);
  assert.equal(textgate(rows(FACE_HOLD - 1, () => ({ text: [card], actors: actor(head) }))).runs.some(r => r.id === 'T3'), false);
  assert.equal(textgate(rows(FACE_HOLD, () => ({ text: [card], actors: actor(head, 0) }))).runs.some(r => r.id === 'T3'), false);
});

test('T4: two cards from different overlays stacked fail; the parts of one overlay do not', () => {
  const a = word('$27,000', [0.3, 0.52, 0.7, 0.6], 0), b = word('OVER $10,000', [0.25, 0.55, 0.75, 0.62], 1);
  assert.ok(ids(textgate(rows(HOLD, () => ({ text: [a, b] })))).includes('T4'));
  assert.equal(ids(textgate(rows(HOLD, () => ({ text: [a, { ...b, i: 0 }] })))).includes('T4'), false);
  const cap = { kind: 'caption', text: 'over ten', box: [0.3, 0.55, 0.7, 0.6] };
  assert.ok(ids(textgate(rows(HOLD, () => ({ text: [a, cap] })))).includes('T4'), 'a card on the caption counts');
});

test('T2 alone is a warning: the gate passes and lists it', () => {
  const top = word('4:00', [0.3, 0.09, 0.7, 0.2]);
  const R = textgate(rows(HOLD, () => ({ text: [top] })));
  assert.equal(R.ok, true); assert.deepEqual(ids(R), ['T2']);
});

test('T5: a middle dot fails on a single frame', () => {
  const R = textgate([{ f: 0, actors: {}, text: [word('SAVINGS · LOANS', [0.3, 0.3, 0.7, 0.35])] }]);
  assert.equal(R.ok, false); assert.deepEqual(ids(R), ['T5']);
});

test('the CLI: PASS on clean rows (T6 contrast measured), PARTIAL (exit 1) on rows from an older kit with no text field', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'textgate-')), f = path.join(dir, 'rows.jsonl');
  fs.writeFileSync(f, rows(20, () => ({ text: [{ ...word('MOM', [0.3, 0.3, 0.7, 0.4]), cr: 12 }] })).map(r => JSON.stringify(r)).join('\n'));
  let p = run('node', [GATE, '--rows', f], { capture: true }); assert.equal(p.status, 0, p.stdout); assert.match(p.stdout, /textgate PASS/);
  fs.writeFileSync(f, rows(5, () => ({})).map(r => JSON.stringify(r)).join('\n'));
  p = run('node', [GATE, '--rows', f], { capture: true }); assert.equal(p.status, 1); assert.match(p.stdout, /PARTIAL/);
});
