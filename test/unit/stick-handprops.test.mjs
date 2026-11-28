// tier: heavy
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

test('the five props are kit hand props with grip points; a two-hand prop names a point for each fist', async () => {
  for (const k of NEW) {
    const g = BUILD[k]?.(); assert.ok(g, `${k} in BUILD`); const U = g.userData;
    assert.equal(U.grip.length, 3, `${k} grip`);
    assert.equal(U.mode, TWO.includes(k) ? 'both' : 'up', k);
    if (TWO.includes(k)) { assert.ok(U.hands.L[0] < 0 && U.hands.R[0] > 0, `${k}: the left fist at -x`); }
  }
  let light = 0; BUILD.lantern().traverse(o => { if (o.isPointLight) light++; }); assert.equal(light, 1, 'a warm light inside the lantern');
  const { drawnSolid } = await import('../../styles/stick-man/kit/props/drawn.js');
  for (const k of NEW) BUILD[k]().traverse(o => { if (o.isMesh && drawnSolid(o)) assert.ok(o.visible && o.material.visible !== false && (o.material.opacity ?? 1) > 0.5, `${k}: ${o.name || o.geometry.type} is drawn, not a stand-in`); });
  let glow = 0; BUILD.lantern().traverse(o => { if (o.isMesh && !drawnSolid(o)) glow++; }); assert.equal(glow, 1, 'the lantern flame is a glow (drawn.js leaves it out)');
});

test('a clip that holds its own prop in the same slot keeps it (the phone in its own slot was dropped: 0 frames)', () => {
  assert.deepEqual(K.holdIn({ x_hpR_phone: 1, a: 2 }, 'phone', false, true), { a: 2, x_hpR_phone: 1 });
  assert.deepEqual(K.holdIn({ x_hpL_cup: 0.5 }, 'tin', false, true), { x_hpL_tin: 0.5 });
  assert.deepEqual(K.holdIn({ x_hpR_cup: 1 }, 'baby', true, false), { x_hpB_baby: 1 });
});

const R = await K.hands(NEW);

test('every pose a film holds them in is measured, and on its film pose a touching control passes and a 3 cm-off control fails', () => {
  for (const k of NEW) {
    const rows = R.rows.filter(r => r.pair.startsWith(`hand|${k}|`));
    assert.ok(rows.length >= 2, `${k}: rows for its bodies`);
    for (const r of rows) {
      assert.equal(typeof r.number, 'number', r.pair); assert.ok(r.frames > 0, `${r.pair}: frames measured`);
      assert.equal(r.verdict, r.number <= GAP_CM ? 'pass' : 'blocked', `${r.pair}: ${r.number} cm`);
    }
    for (const r of rows) {
      const c = R.controls.find(x => x.pair === r.pair);
      assert.ok(c, `${r.pair}: controls on its film pose`);
      assert.ok(c.touchCm <= GAP_CM, `${r.pair}: the prop touching the fist reads ${c.touchCm} cm (must pass, limit ${GAP_CM})`);
      assert.ok(c.offCm > GAP_CM && c.offCm < 3.5, `${r.pair}: the prop 3 cm off the fist reads ${c.offCm} cm (must fail, limit ${GAP_CM})`);
    }
  }
  assert.ok(R.rows.some(r => r.pair === 'hand|balloon|child|hand'), 'the balloon on the child walk');
});

test('kit/compat.json holds the rows this measure writes, with the same verdicts; a hand row over the limit is a table fault', () => {
  for (const r of R.rows) {
    const t = TABLE.rows.find(x => x.pair === r.pair);
    assert.ok(t, `${r.pair} in compat.json`); assert.equal(t.verdict, r.verdict, r.pair); assert.ok(Math.abs(t.number - r.number) < 0.05, `${r.pair}: ${t.number} vs ${r.number}`);
  }
  const bad = tableFaults({ limits: TABLE.limits, rows: [{ pair: 'hand|tin|adult|hand', kind: 'hand', verdict: 'pass', number: GAP_CM + 1, unit: 'cm', bad: 3 }] });
  assert.ok(bad.some(s => /hand\|tin\|adult\|hand: pass, but/.test(s)), bad.join('; '));
});

// photoPrint: a one-hand 10 x 15 cm photo print with a thin white border (like the phone: a grip socket in the fist),
// handed over on the elder's Act_Give_Once; every frame of the clip, the held end included
test('photoPrint: a one-hand print, a real visible mesh, measured on the elder Give with its controls', async () => {
  const g = BUILD.photoPrint?.(); assert.ok(g, 'photoPrint in BUILD'); const U = g.userData;
  assert.equal(U.mode, 'up'); assert.equal(U.grip.length, 3); assert.equal(U.hands, undefined, 'one hand');
  const THREE = await import('three'); const s = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  assert.ok(Math.abs(s.x - 0.10) < 0.01 && Math.abs(s.y - 0.15) < 0.01, `about 10 x 15 cm: ${s.x} x ${s.y}`);
  assert.deepEqual(K.HAND_POSES.photoPrint, { elder: ['Act_Give_Once'] });
  const P = await K.hands(['photoPrint']), r = P.rows.find(x => x.pair === 'hand|photoPrint|elder|hand');
  assert.ok(r && r.frames > 0, 'frames measured');
  assert.equal(r.verdict, r.number <= GAP_CM ? 'pass' : 'blocked', `${r.number} cm`);
  const c = P.controls.find(x => x.pair === r.pair); assert.ok(c.touchCm <= GAP_CM && c.offCm > GAP_CM, JSON.stringify(c));
  const t = TABLE.rows.find(x => x.pair === r.pair); assert.ok(t && t.verdict === r.verdict && Math.abs(t.number - r.number) < 0.05, 'in compat.json');
});
