// The costume cloth (styles/stick-man/allout/cloth.js, the hoodie's cords): a pinned chain falls under gravity, stays
// outside a body volume it drapes over, keeps its length, and gives the same result from the same start.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cloth } from '../../styles/stick-man/allout/cloth.js';

const N = 10, SEG = 0.04, C = new THREE.Vector3(0, -0.2, 0.05), R = 0.1;
// a sphere collider: a point inside (plus margin) goes to its surface
const ball = (p, m) => { const d = p.distanceTo(C); return d < R + m ? p.clone().sub(C).multiplyScalar((R + m) / Math.max(d, 1e-9)).add(C) : null; };
function chain() {
  const edges = [], bends = []; for (let i = 0; i < N - 1; i++) edges.push([i, i + 1, SEG]); for (let i = 0; i < N - 2; i++) bends.push([i, i + 2, 2 * SEG]);
  const pin = new Uint8Array(N); pin[0] = 1;
  const c = new Cloth(N, edges, bends, pin, { bend: 0.12, damp: 0.05, iters: 10, margin: 0.01 });
  for (let i = 0; i < N; i++) c.set(i, [0, 0, i * SEG]);   // starts horizontal, out from the pin
  return c;
}
function run(c, steps = 240) { for (let s = 0; s < steps; s++) c.sub(1 / 240, () => [0, 0, 0], [ball], []); return c; }

test('a pinned cord falls and drapes over a volume without going inside it', () => {
  const c = run(chain());
  assert.ok(c.x[3 * (N - 1) + 1] < -0.15, `the free end fell (y ${c.x[3 * (N - 1) + 1]})`);
  for (let i = 1; i < N; i++) assert.ok(new THREE.Vector3(c.x[3 * i], c.x[3 * i + 1], c.x[3 * i + 2]).distanceTo(C) >= R - 1e-3, `particle ${i} inside`);
  assert.equal(c.x[0] + c.x[1] + c.x[2], 0, 'the pin stays put');
});

test('the cord keeps its length (under 5 % stretch)', () => {
  assert.ok(run(chain()).stretch() < 0.05);
});

test('the same start gives the same result', () => {
  assert.deepEqual([...run(chain()).x], [...run(chain()).x]);
});
