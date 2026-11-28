// What the golden look fingerprint sees: each control changes one thing a viewer would see on a stick-man figure and
// must move the hash (review 28/11: a rim step, a shader patch and a red light all kept hash ca8a2aa74d9e0079).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { hashFigure } from './look-fingerprint.mjs';
import { toonify } from '../../styles/stick-man/engine/look.js';

const figure = (edit = () => {}) => {
  const root = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x8899aa });
  toonify(m);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m), light = new THREE.PointLight(0xffffff, 1.6, 2.2, 2);
  root.add(mesh, light);
  edit({ m, mesh, light });
  return hashFigure({ root }).hash;
};
const base = figure();

test('the same figure built twice keeps its hash', () => assert.equal(figure(), base));

test('a toon uniform step moves the hash (uRim 0.35 to 0.36)', () => assert.notEqual(figure(({ m }) => { m.userData.toon.uRim.value += 0.01; }), base));

test('a shader patch that writes different GLSL moves the hash, also when only a value its closure holds changes', () => {
  assert.notEqual(figure(({ m }) => { const f = m.onBeforeCompile; m.onBeforeCompile = sh => { f(sh); sh.fragmentShader += '\n// other'; }; }), base);
  const patch = k => sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${k.toFixed(4)};`); };
  assert.notEqual(figure(({ m }) => { m.onBeforeCompile = patch(0.01); }), figure(({ m }) => { m.onBeforeCompile = patch(0.02); }));
});

test('a light colour, intensity or shadow change moves the hash', () => {
  assert.notEqual(figure(({ light }) => light.color.set(0xff0000)), base);
  assert.notEqual(figure(({ light }) => { light.intensity = 2; }), base);
  assert.notEqual(figure(({ light }) => { light.castShadow = true; }), base);
});

test('texture sampling and geometry groups move the hash', () => {
  const tex = edit => figure(({ m }) => { m.map = new THREE.DataTexture(new Uint8Array(16), 2, 2); edit(m.map); });
  assert.notEqual(tex(t => { t.wrapS = THREE.RepeatWrapping; }), tex(() => {}));
  assert.notEqual(tex(t => t.repeat.set(2, 2)), tex(() => {}));
  assert.notEqual(tex(t => { t.colorSpace = THREE.SRGBColorSpace; }), tex(() => {}));
  assert.notEqual(figure(({ mesh }) => mesh.geometry.clearGroups()), base);
});
