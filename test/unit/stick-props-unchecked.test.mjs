// The chain from a turned prop to the shot verdict (review 4 of PR #200): propKit lists a prop off a quarter turn in the
// set's COLLIDE.unchecked (kit/props/catalog.js), engine/play.js dbg copies it into every row (out.unchecked), and the shot
// gate, run as a film runs it (shotgate.mjs --rows), reads PARTIAL and exits 1, never PASS. play.js builds its rows in the
// browser only, so its out.unchecked statement is taken from the source and run here on the real COLLIDE propKit wrote.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ctx = new Proxy({}, { get: (_, k) => k === 'measureText' ? () => ({ width: 10 }) : /Gradient$/.test(k) ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
// as stick-props-kit.test.mjs: the glb's bytes, its textures left out
GLTFLoader.prototype.loadAsync = function (url) {
  const b = fs.readFileSync(ROOT + url), n = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + n)); delete j.textures; delete j.images;
  for (const m of j.materials || []) { for (const o of [m, m.pbrMetallicRoughness || {}]) for (const k of Object.keys(o)) if (/Texture$/.test(k)) delete o[k]; }
  let t = JSON.stringify(j); t += ' '.repeat((4 - Buffer.byteLength(t) % 4) % 4); const h = Buffer.from(b.subarray(0, 20)), out = Buffer.concat([h, Buffer.from(t), b.subarray(20 + n)]);
  out.writeUInt32LE(Buffer.byteLength(t), 12); out.writeUInt32LE(out.length, 8); return new Promise((ok, no) => this.parse(new Uint8Array(out).buffer, '', ok, no));
};
const { propKit } = await import('../../styles/stick-man/kit/props/catalog.js');

// engine/play.js dbg: the statement that copies the set's unchecked props into the row, run on a SET and a row
const PLAY = fs.readFileSync(path.join(ROOT, 'styles/stick-man/engine/play.js'), 'utf8');
const dbgUnchecked = (() => { const lines = PLAY.split('\n').filter(l => /\bout\.unchecked\s*=/.test(l));
  return lines.length === 1 ? new Function('SET', 'out', lines[0].replace(/\/\/.*$/, '')) : null; })();
const dbgRow = (SET, row) => { assert.ok(dbgUnchecked, 'engine/play.js has no single `out.unchecked = ...` statement in its dbg rows'); dbgUnchecked(SET, row); return row; };

async function setWith(deg, o = {}) {
  const S = { scene: new THREE.Scene(), prop() {}, glow() {} }, COLLIDE = [], p = propKit(S, COLLIDE);
  if (deg != null) { await p.load(['street/taxi']); p.place('street/taxi', [3, 4, 0], deg, o); }
  return { COLLIDE };
}
// rows of one clean shot (the row shape of stick-shotgate.test.mjs), each passed through the play.js line
const shot = SET => Array.from({ length: 12 }, (_, f) => dbgRow(SET, { f, act: 'a', mix: null, set: 's', motion: { cut: true, feet: {} },
  camera: { pos: [0, -5, 1.5], target: [0, 0, 1], fov: 60, lens: 24 },
  actors: { you: { inFrame: true, head: [180, 200, 220, 240], headW: [0, 0, 1.7], pos: [0, 0, 0], figH: 0.4, feet: { L: [-0.1, 0, 0], R: [0.1, 0, 0] } } }, track: {} }));

test('engine/play.js dbg: a row carries the set\'s unchecked props by name; a quarter turn or no propKit carries none', async () => {
  const row = dbgRow(await setWith(45), {});
  assert.deepEqual(row.unchecked, [{ name: 'street/taxi@1', why: 'turned 45 deg, off a quarter turn' }]);
  const S = await setWith(45); const r = dbgRow(S, {}); r.unchecked[0].name = 'x'; assert.equal(S.COLLIDE.unchecked[0].name, 'street/taxi@1', 'the row holds a copy');
  assert.equal('unchecked' in dbgRow(await setWith(90), {}), false);
  assert.equal('unchecked' in dbgRow(await setWith(null), {}), false);
  assert.equal('unchecked' in dbgRow({}, {}), false, 'a set with no COLLIDE');
});

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'unchecked-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
// the shot gate as a film runs it: node shotgate.mjs <film dir> --rows <jsonl>
function gate(name, rows) {
  const dir = path.join(TMP, name), file = path.join(dir, 'rows.jsonl'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'styles/stick-man/tools/gates/shotgate.mjs'), dir, '--rows', file], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  return { status: r.status, out: r.stdout + r.stderr, md: fs.readFileSync(path.join(dir, 'review/shot-gate.md'), 'utf8') };
}

test('shotgate.mjs --rows: a taxi turned 45 deg reads PARTIAL, exit 1, not collision-checked by name; at 90 or with no propKit PASS, exit 0', async () => {
  const turned = gate('turned', shot(await setWith(45)));
  assert.equal(turned.status, 1, turned.out);
  assert.match(turned.out, /: PARTIAL · 0 second\(s\) to fix, not collision-checked: street\/taxi@1 \(not collision-checked 1\)/);
  assert.match(turned.md, /^\*\*PARTIAL\*\*: .*not collision-checked: street\/taxi@1,/m);
  assert.match(turned.md, /\| not collision-checked \| street\/taxi@1 \(turned 45 deg, off a quarter turn\) .*\| yes, not measured \|/);
  for (const [name, S] of [['quarter', await setWith(90)], ['none', await setWith(null)]]) {
    const g = gate(name, shot(S));
    assert.equal(g.status, 0, `${name}: ${g.out}`); assert.match(g.out, /: PASS · 0 second\(s\) to fix$/m, name); assert.doesNotMatch(g.md, /not collision-checked/, name);
  }
  const off = gate('solid-false', shot(await setWith(90, { solid: false })));
  assert.equal(off.status, 0, `solid: false is watch only: ${off.out}`);
});
