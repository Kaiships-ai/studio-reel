// The far backdrop (KIT-DEPTH): the Blender town rows load from assets/backdrop/ and stand where an act puts them, as far
// scenery the act haze and collisions leave alone, so a night set shows a detailed far layer behind its walls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { backdrop, BACKDROP_PIECES } from '../../styles/stick-man/kit/sets/backdrop.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// the page serves the repo root: answer the loader's /styles/... requests from disk
THREE.DefaultLoadingManager.setURLModifier(u => u.startsWith('/') ? 'file://' + ROOT + u : u);
globalThis.fetch = async req => new Response(fs.readFileSync(fileURLToPath(typeof req === 'string' ? req : req.url)));
globalThis.ProgressEvent ??= class extends Event { constructor(t, o = {}) { super(t); Object.assign(this, o); } };
const stage = () => ({ scene: new THREE.Scene(), prop() {}, glow() {} });

test('every backdrop piece ships as a small .glb a far row can use', () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'styles/stick-man/assets/backdrop/manifest.json'), 'utf8'));
  for (const p of BACKDROP_PIECES) {
    const m = man.pieces[p];
    assert.ok(m, `${p} in manifest.json`);
    assert.ok(m.bytes <= 1.5e6, `${p} within the 1.5 MB glb limit`);
    assert.ok(m.hi[0] - m.lo[0] >= 30 && m.hi[2] >= 10, `${p} is a town row about 32 m wide and 10 m or more tall`);
  }
});

test('backdrop() loads the rows and places them where the act says, outside haze and collisions', async () => {
  const S = stage();
  const out = await backdrop(S, [{ piece: 'backdrop_skyline_a', at: [12, 42, 0], rot: 0 }, { piece: 'backdrop_roofline', at: [-32, 13, 0], rot: 90 }], { tint: [0.2, 0.2, 0.2] });
  assert.equal(out.length, 2);
  assert.ok(out.every(g => g.parent === S.scene), 'rows are in the scene before build() returns');
  assert.deepEqual(out[0].position.toArray().map(v => +v.toFixed(3)), [12, 0, -42], 'Blender [12, 42, 0] is three [12, 0, -42]');
  assert.ok(Math.abs(out[1].rotation.y - Math.PI / 2) < 1e-9, 'rot is degrees about Blender z');
  let meshes = 0;
  for (const g of out) g.traverse(m => { if (!m.isMesh) return; meshes++;
    assert.equal(m.material.fog, false, 'the act haze never flattens a far row');
    assert.equal(m.castShadow, false); });
  assert.ok(meshes > 0, 'the pieces have meshes');
  const lit = []; out[0].traverse(m => { if (m.isMesh && m.material.emissive?.getHex()) lit.push(m); });
  assert.ok(lit.length > 0, 'lit windows keep their glow under a dark tint');
});
