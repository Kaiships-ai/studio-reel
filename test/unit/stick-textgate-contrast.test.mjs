// The text gate's T6 (styles/stick-man/tools/gates/textgate.mjs): a line of words must read against the picture right
// behind it. The film measures each box's WCAG ratio (`cr`: the glyphs' luminance against the 90th percentile of the
// picture in a ring round them) and writes it in the rows; the gate fails a box under 4.5:1 for 6 frames in a row while
// it is fully shown, and reads PARTIAL when a shown box carries no ratio. The colours are Studio's three v5 frames (27/11).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { textgate, ratio, relLum, CR_MIN, CR_HOLD } from '../../styles/stick-man/tools/gates/textgate.mjs';

const GATE = path.join(ROOT, 'styles/stick-man/tools/gates/textgate.mjs');
const BOX = [0.2, 0.3, 0.8, 0.38];
const words = (text, cr, alpha = 1) => ({ i: 0, kind: 'words', text, box: BOX, cr, alpha });
const rows = (n, make) => Array.from({ length: n }, (_, f) => ({ f, px: [1080, 1920], actors: {}, text: [make(f)] }));
const ids = R => R.runs.map(r => r.id);
const cr = (fg, bg) => ratio(relLum(fg), relLum(bg));

const PALE_GOLD = [244, 214, 128], WHITE = [255, 255, 255];
const WARM_WALL = [252, 236, 206], RED_TICKER = [235, 60, 50], DARK_WALL = [40, 34, 46];

test('the ratio is WCAG: white on black is 21:1, a colour on itself 1:1', () => {
  assert.equal(Math.round(cr(WHITE, [0, 0, 0])), 21);
  assert.equal(cr(PALE_GOLD, PALE_GOLD), 1);
});

test('T6: pale gold "87%" on a bright warm wall fails (34.9 s)', () => {
  const c = cr(PALE_GOLD, WARM_WALL); assert.ok(c < CR_MIN, `${c}`);
  const R = textgate(rows(CR_HOLD, () => words('87%', c)));
  assert.equal(R.ok, false); assert.deepEqual(ids(R), ['T6']); assert.equal(R.verdict, 'FAIL');
});

test('T6: a white line on red ticker numbers fails (52.5 s)', () => {
  const c = cr(WHITE, RED_TICKER); assert.ok(c < CR_MIN, `${c}`);
  assert.deepEqual(ids(textgate(rows(30, () => words('THE MARKET NEVER SLEEPS', c)))), ['T6']);
});

test('T6: white on a dark wall passes', () => {
  const R = textgate(rows(30, () => words('90%', cr(WHITE, DARK_WALL))));
  assert.equal(R.ok, true); assert.deepEqual(ids(R), []); assert.equal(R.verdict, 'PASS');
});

test('T6: a 5-frame dip passes, 6 frames fail', () => {
  const low = cr(PALE_GOLD, WARM_WALL), ok = cr(WHITE, DARK_WALL);
  assert.equal(textgate(rows(30, f => words('90%', f >= 10 && f < 10 + CR_HOLD - 1 ? low : ok))).ok, true);
  assert.equal(textgate(rows(30, f => words('90%', f >= 10 && f < 10 + CR_HOLD ? low : ok))).ok, false);
});

test('T6: a fade-in at low alpha is not judged', () => {
  const low = cr(PALE_GOLD, WARM_WALL);
  const R = textgate(rows(20, f => words('90%', low, Math.min(0.5, f / 30))));
  assert.equal(R.ok, true); assert.equal(R.verdict, 'PASS');
});

test('T6: a shown box with no ratio is unmeasured: PARTIAL, never PASS; the CLI exits 1', () => {
  const R = textgate(rows(20, () => words('90%', undefined)));
  assert.equal(R.ok, true); assert.equal(R.verdict, 'PARTIAL'); assert.equal(R.crUnmeasured, 20);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'textgate-cr-')), f = path.join(dir, 'rows.jsonl');
  fs.writeFileSync(f, rows(20, () => words('90%', undefined)).map(r => JSON.stringify(r)).join('\n'));
  const p = run('node', [GATE, '--rows', f], { capture: true }); assert.equal(p.status, 1); assert.match(p.stdout, /PARTIAL/); assert.match(p.stdout, /unmeasured/);
});

test('T6 reads the prototype field name cr1 as the ratio when cr is absent', () => {
  const box = { ...words('87%', undefined), cr1: cr(PALE_GOLD, WARM_WALL) }; delete box.cr;
  assert.deepEqual(ids(textgate(rows(CR_HOLD, () => box))), ['T6']);
});
