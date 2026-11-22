import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { budgetMaterial, rollLuma, expLinear, BUDGET, ROLL, GLOW_MAX } from '../../styles/stick-man/kit/look/highlights.js';

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
  assert.ok(rollLuma(3) - rollLuma(2) > 0.005, 'two different highlights stay apart');
  assert.ok(Math.abs(expLinear(1.5) - 1.5 ** 2.2) < 1e-9);
  assert.ok(GLOW_MAX < 0.5);
});

test('the engine uses the budget, the roll-off before the blooms, and no post-tone-map exposure or shoulder', () => {
  const look = fs.readFileSync(new URL('../../styles/stick-man/engine/look.js', import.meta.url), 'utf8');
  assert.match(look, /budgetMaterial\(mt, \{ figure: isFigure\(o\), light: !!o\.userData\.glow \}\)/);
  assert.ok(look.indexOf('composer.addPass(rollPass)') < look.indexOf('composer.addPass(mixPass)'), 'roll-off before the glow is added');
  assert.ok(look.indexOf('composer.addPass(rollPass)') < look.indexOf('composer.addPass(hotPass)'), 'roll-off before the highlight bloom');
  assert.match(look, /gradePass\.uniforms\.uExp\.value = 1; rollPass\.uniforms\.uExpLin\.value = expLinear\(gr\.exp\)/);
  assert.doesNotMatch(look, /uShoulder \* c \* c/);
  assert.match(look, /min\(texture2D\(tB, vUv\)\.rgb, vec3\(gMax\)\)/);
  assert.doesNotMatch(look, /min\(col, vec3\(0\.96\)\)/, 'a figure has a soft knee, not a hard cap (a flat white hoodie)');
  const shot = fs.readFileSync(new URL('../../styles/stick-man/tools/render/shot.mjs', import.meta.url), 'utf8');
  assert.match(shot, /m\.type\(\) === 'warning' && m\.text\(\)\.startsWith\('\[kit\]'\)/, 'shot.mjs prints [kit] warnings');
});
