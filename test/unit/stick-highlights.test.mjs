import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { budgetMaterial, isFigurePart, rollLuma, expLinear, actRoll, BUDGET, ROLL, GLOW_MAX } from '../../styles/stick-man/kit/look/highlights.js';

test('a prop never reflects more than the budget and never glows unless it is a light', () => {
  const bag = new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 1), emissive: new THREE.Color(0.86, 0.85, 0.82), emissiveIntensity: 0.22 });
  assert.ok(budgetMaterial(bag));
  assert.ok(Math.abs(Math.max(bag.color.r, bag.color.g, bag.color.b) - BUDGET.albedo) < 1e-6);
  assert.ok(Math.abs(0.86 * bag.emissiveIntensity - BUDGET.emissive) < 1e-6);
  assert.equal(budgetMaterial(bag), null, 'once per material');
  const hoodie = new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 1) });
  budgetMaterial(hoodie, { figure: true }); assert.equal(hoodie.color.r, 1, 'a stick figure keeps its own cap');
  const shade = new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 0.9, 0.7), emissive: new THREE.Color(1, 0.8, 0.5), emissiveIntensity: 2 });
  budgetMaterial(shade, { light: true }); assert.equal(shade.emissiveIntensity, 2, 'a glow() lamp is a light');
  const card = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });
  assert.equal(budgetMaterial(card), null); assert.equal(card.color.r, 1, 'an unlit card (text, overlay) is not a surface');
});

test('the roll-off keeps a gradient: monotone, below the ceiling, never flat', () => {
  assert.equal(rollLuma(0.5), 0.5);
  let prev = rollLuma(ROLL.knee);
  for (let L = ROLL.knee + 0.1; L < 20; L += 0.1) { const v = rollLuma(L); assert.ok(v > prev, `rises at ${L}`); assert.ok(v < ROLL.ceil); prev = v; }
  assert.ok(rollLuma(3) - rollLuma(2) > 0.002, 'two different highlights stay apart');
  // the brightest a surface can reach, through the neutral tone mapper (exposure 0.88) and the sRGB encode, stays under 235
  const neutral = x => { const s = 0.76, d = 0.24; if (x < s) return x; return 1 - d * d / (x + d - s); };
  const srgb = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  assert.ok(255 * srgb(neutral(ROLL.ceil * 0.88)) < 235, `ceiling lands at ${(255 * srgb(neutral(ROLL.ceil * 0.88))).toFixed(0)}`);
  assert.ok(Math.abs(expLinear(1.5) - 1.5 ** 2.2) < 1e-9);
  assert.ok(GLOW_MAX < 0.5);
});

test('the engine uses the budget, the roll-off before the blooms, and no post-tone-map exposure or shoulder', () => {
  const look = fs.readFileSync(new URL('../../styles/stick-man/engine/look.js', import.meta.url), 'utf8');
  assert.match(look, /budgetMaterial\(mt, \{ figure: isFigurePart\(o, PROPS\) \}\)/);
  assert.match(look, /if \(o\.isMesh && o\.userData\.glow\) for \(const mt of mats\(o\)\) mt\.userData\.light = 1/, 'a glow material is a light whatever the traversal order');
  assert.ok(look.indexOf('composer.addPass(rollPass)') < look.indexOf('composer.addPass(mixPass)'), 'roll-off before the glow is added');
  assert.ok(look.indexOf('composer.addPass(rollPass)') < look.indexOf('composer.addPass(hotPass)'), 'roll-off before the highlight bloom');
  assert.match(look, /gradePass\.uniforms\.uExp\.value = 1; rollPass\.uniforms\.uExpLin\.value = expLinear\(gr\.exp\)/);
  assert.doesNotMatch(look, /uShoulder \* c \* c/);
  assert.match(look, /min\(texture2D\(tB, vUv\)\.rgb, vec3\(gMax\)\)/);
  assert.doesNotMatch(look, /min\(col, vec3\(0\.96\)\)/, 'a figure has a soft knee, not a hard cap (a flat white hoodie)');
  const shot = fs.readFileSync(new URL('../../styles/stick-man/tools/render/shot.mjs', import.meta.url), 'utf8');
  assert.match(shot, /m\.type\(\) === 'warning' && m\.text\(\)\.startsWith\('\[kit\]'\)/, 'shot.mjs prints [kit] warnings');
});

test("an act's grade.roll lowers the ceiling for that act only; without it, or with a broken one, the film's roll-off stays", () => {
  const neutral = x => { const s = 0.76, d = 0.24; if (x < s) return x; return 1 - d * d / (x + d - s); };
  const srgb = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055), out = (L, r) => 255 * srgb(neutral(rollLuma(L, r.knee, r.ceil) * 0.88));
  const close = actRoll({ roll: { knee: 0.46, ceil: 0.70 } });
  assert.ok(out(1.6, close) < out(1.6, ROLL) - 8, `a lit white head lands at ${out(1.6, close).toFixed(0)} instead of ${out(1.6, ROLL).toFixed(0)}`);
  assert.ok(out(1.6, close) - out(1.1, close) > 2, 'and keeps its shading');
  assert.equal(actRoll({}), ROLL); assert.equal(actRoll(undefined, ROLL), ROLL);
  assert.deepEqual(actRoll({ roll: { ceil: 0.7 } }), { knee: ROLL.knee, ceil: 0.7 }, 'a missing key keeps the film value');
  const bad = actRoll({ roll: { knee: 0.6, ceil: 0.5 } }); assert.equal(bad.knee, ROLL.knee); assert.equal(bad.ceil, ROLL.ceil); assert.match(bad.bad, /above knee/);
  const look = fs.readFileSync(new URL('../../styles/stick-man/engine/look.js', import.meta.url), 'utf8');
  assert.match(look, /const RL = actRoll\(gr, ROLL0\); rollPass\.uniforms\.uRollK\.value = RL\.knee; rollPass\.uniforms\.uRollC\.value = RL\.ceil;/, 'set on every frame from the act');
});

test('a prop held in a hand is a prop, not part of the figure (the budget caps it)', () => {
  const root = new THREE.Group(); root.userData.stick = true;
  const hoodie = new THREE.Mesh(); root.add(hoodie);
  const hp = new THREE.Group(); hp.name = 'hp_bag'; root.add(hp); const bag = new THREE.Mesh(); hp.add(bag);
  const held = new THREE.Group(); held.userData.rest = { pos: [0, 0, 0] }; root.add(held); const bill = new THREE.Mesh(); held.add(bill);
  const onLayer = new THREE.Mesh(); onLayer.layers.enable(5); root.add(onLayer);
  assert.equal(isFigurePart(hoodie, 5), true);
  assert.equal(isFigurePart(bag, 5), false, 'a hand prop');
  assert.equal(isFigurePart(bill, 5), false, 'a held scene prop');
  assert.equal(isFigurePart(onLayer, 5), false, 'a mesh on the props layer');
  assert.equal(isFigurePart(new THREE.Mesh(), 5), false, 'a set mesh');
});
