// The five hand props whatif1 v5 faked (a 4 mm stand-in in the hand, a loose set prop beside it): baby, tin, lantern,
// photo, balloon. Each is a kit hand prop (kit/cast/handprops.js BUILD), measured headless in every pose a film holds it
// in (fits_kinds.mjs hands(): the clip played with the prop in the hand, engine/grip.js each frame, each hand of a
// two-hand prop to its own point), against GAP_CM frozen in handgrip.limits.json; its rows in kit/compat.json say so.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const { BUILD } = await import('../../styles/stick-man/kit/cast/handprops.js');
const K = await import('../../styles/stick-man/tools/gates/fits_kinds.mjs');
const { GAP_CM } = await import('../../styles/stick-man/tools/gates/handgrip.mjs');
const { tableFaults } = await import('../../styles/stick-man/tools/gates/fits.mjs');
const TABLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'styles/stick-man/kit/compat.json'), 'utf8'));
const NEW = ['baby', 'tin', 'lantern', 'photo', 'balloon'], TWO = ['baby', 'lantern', 'photo'];

test('the five props are kit hand props with grip points; a two-hand prop names a point for each fist', () => {
  for (const k of NEW) {
    const g = BUILD[k]?.(); assert.ok(g, `${k} in BUILD`); const U = g.userData;
    assert.equal(U.grip.length, 3, `${k} grip`);
    assert.equal(U.mode, TWO.includes(k) ? 'both' : 'up', k);
    if (TWO.includes(k)) { assert.ok(U.hands.L[0] < 0 && U.hands.R[0] > 0, `${k}: the left fist at -x`); }
  }
  let light = 0; BUILD.lantern().traverse(o => { if (o.isPointLight) light++; }); assert.equal(light, 1, 'a warm light inside the lantern');
});

const R = await K.hands(NEW);

test('every pose a film holds them in is measured, and the 5 cm control fails for each prop', () => {
  for (const k of NEW) {
    const rows = R.rows.filter(r => r.pair.startsWith(`hand|${k}|`));
    assert.ok(rows.length >= 2, `${k}: rows for its bodies`);
    for (const r of rows) {
      assert.equal(typeof r.number, 'number', r.pair); assert.ok(r.frames > 0, `${r.pair}: frames measured`);
      assert.equal(r.verdict, r.number <= GAP_CM ? 'pass' : 'blocked', `${r.pair}: ${r.number} cm`);
    }
    const c = R.controls.find(x => x.prop === k);
    assert.ok(c && c.minCm > GAP_CM, `${k}: the prop 5 cm off reads ${c?.minCm} cm on its least frame (limit ${GAP_CM})`);
  }
  assert.ok(R.rows.some(r => r.pair === 'hand|balloon|child|hand'), 'the balloon on the child walk');
  assert.ok(R.rows.some(r => r.pair === 'hand|baby|adult|hand' && r.verdict === 'pass'), 'the baby in the adult carry');
});

test('kit/compat.json holds the rows this measure writes, with the same verdicts; a hand row over the limit is a table fault', () => {
  for (const r of R.rows) {
    const t = TABLE.rows.find(x => x.pair === r.pair);
    assert.ok(t, `${r.pair} in compat.json`); assert.equal(t.verdict, r.verdict, r.pair); assert.ok(Math.abs(t.number - r.number) < 0.05, `${r.pair}: ${t.number} vs ${r.number}`);
  }
  const bad = tableFaults({ limits: TABLE.limits, rows: [{ pair: 'hand|tin|adult|hand', kind: 'hand', verdict: 'pass', number: GAP_CM + 1, unit: 'cm', bad: 3 }] });
  assert.ok(bad.some(s => /hand\|tin\|adult\|hand: pass, but/.test(s)), bad.join('; '));
});
