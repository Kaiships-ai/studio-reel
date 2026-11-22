// ?ablate and tools/gates/blame.mjs (Kai 23/11, Hot Money A v11: four spots still blown, each from a different source;
// dimming one source at a time found each): one source dims for one render and comes back after it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ablate, frameLights, listLights, DIM, SOURCES } from '../../styles/stick-man/kit/look/ablate.js';
import { rank } from '../../styles/stick-man/tools/gates/blame.mjs';

const stageOf = () => {
  const scene = new THREE.Scene(), g = new THREE.Group(), off = new THREE.Group(); off.visible = false; scene.add(g, off);
  const a = new THREE.PointLight(0xffffff, 4, 5); a.position.set(1, 2, 0); g.add(a);
  const b = new THREE.SpotLight(0xffffff, 6); g.add(b);
  off.add(new THREE.PointLight(0xffffff, 9));                                          // a hidden act's lamp: not in this frame
  g.add(new THREE.PointLight(0xffffff, 0));                                            // an unlit lamp: not in this frame
  scene.fog = new THREE.Fog(0x112233, 5, 30);
  return { scene, sun: new THREE.DirectionalLight(0xffffff, 3), hemi: new THREE.HemisphereLight(0xffffff, 0x000000, 2), fill: new THREE.DirectionalLight(0xffffff, 1),
    passes: { hot: { enabled: true } }, a, b };
};

test('each source dims for one render and is put back after it', () => {
  const S = stageOf();
  assert.deepEqual(frameLights(S.scene), [S.a, S.b], 'shown, lit point and spot lights, in scene order');
  for (const [src, get, want] of [['sun', () => S.sun.intensity, 3 * DIM], ['hemi', () => S.hemi.intensity, 2 * DIM], ['light1', () => S.b.intensity, 0],
    ['lamps', () => S.a.intensity, 4 * DIM], ['fog', () => S.scene.fog, null], ['hot', () => S.passes.hot.enabled, false]]) {
    const before = get(), u = ablate(S, src, {}); assert.equal(get(), want, src); u.undo(); assert.equal(get(), before, `${src} restored`);
  }
  assert.deepEqual(ablate(S, 'air', { exp: 1.2 }).grade, { exp: 1.2, air: false });
  const frozen = frameLights(S.scene); S.a.parent.visible = false;                     // a dissolve: the act that listed is hidden now
  const u = ablate(S, 'light1', {}, frozen); assert.equal(S.b.intensity, 0, 'light1 is still the listed lamp'); u.undo(); S.a.parent.visible = true;
  assert.throws(() => ablate(S, 'light9', {}), /no light9/, 'an index past the list says so');
  assert.deepEqual(ablate(S, 'shafts', {}).grade, { haze: 0 });
  assert.equal(ablate(S, 'list', { exp: 1 }).grade.exp, 1, 'list dims nothing');
  assert.match(listLights(S.scene)[0], /^light0 point at 1\.00, -?0\.00, 2\.00 power 4\.00 reach 5\.0/);
  assert.ok(SOURCES.includes('fog') && SOURCES.includes('lamps'));
});

test('blame ranks the sources by how much the region drops without them', () => {
  const r = rank([{ source: 'none', luma: 201 }, { source: 'sun', luma: 199 }, { source: 'light5', luma: 115 }, { source: 'fog', luma: 203 }]);
  assert.deepEqual(r.map(x => [x.source, x.lift]), [['light5', 86], ['sun', 2], ['fog', -2]]);
});
