// The stick-man kit's shared prop catalog (kit/props/catalog.js): 124 CC0 .glb props (assets/props/<place>/<slug>.glb)
// and the code-built ones (kit/props/built.js), one name space '<place>/<slug>'. Every prop is held to: a file that parses
// and matches the manifest's triangles, a real height (kit/props/sizes.js PROP_HEIGHT), its pivot on the floor, no
// near-white or black base colour (the valuegate 'blown object' / crushed intent: importer clamp max 0.90 sRGB, floor 0.08),
// and a load-time budget (assets/props <= 15 MB, one file <= 400 KB, a built prop <= 6k triangles).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

// built props paint cards on a canvas (kit/sets/canvas.js): a canvas that draws nothing is enough to measure geometry
const ctx = new Proxy({}, { get: (_, k) => k === 'measureText' ? () => ({ width: 10 }) : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const { BUILT, builtGroup } = await import('../../styles/stick-man/kit/props/built.js');
const { catalog, propNames, resolveProp } = await import('../../styles/stick-man/kit/props/catalog.js');
const { PROP_HEIGHT, heightRange } = await import('../../styles/stick-man/kit/props/sizes.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../styles/stick-man/assets/props');
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const LIST = JSON.parse(fs.readFileSync(path.resolve(ROOT, '../../../../films/kit-props-list/manifest.json'), 'utf8'));
const s8 = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;   // linear -> sRGB
const WHITE = 0.905, BLACK = 0.07;

// a .glb read by hand: JSON + BIN chunks, triangles, Blender-space bounds (glTF is +Y up), flat base colours
function readGlb(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.readUInt32LE(0), 0x46546c67, `${file}: not a glb`); assert.equal(b.readUInt32LE(8), b.length, `${file}: length`);
  const jn = b.readUInt32LE(12); assert.equal(b.readUInt32LE(16), 0x4e4f534a, `${file}: JSON chunk`);
  const j = JSON.parse(b.subarray(20, 20 + jn).toString('utf8')), bn = b.readUInt32LE(20 + jn);
  assert.equal(b.readUInt32LE(24 + jn), 0x004e4942, `${file}: BIN chunk`); assert.ok(bn >= j.buffers[0].byteLength, `${file}: BIN shorter than its buffer`);
  for (const v of j.bufferViews) assert.ok((v.byteOffset || 0) + v.byteLength <= j.buffers[0].byteLength, `${file}: a view past the buffer`);
  for (const n of j.nodes) assert.ok(!n.matrix && !n.rotation && !n.scale && !n.translation, `${file}: node ${n.name} has a transform (bounds would be wrong)`);
  let tris = 0; const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], colours = [];
  for (const m of j.meshes) for (const p of m.primitives) {
    const pos = j.accessors[p.attributes.POSITION]; tris += (p.indices != null ? j.accessors[p.indices].count : pos.count) / 3;
    const bl = [[pos.min[0], -pos.max[2], pos.min[1]], [pos.max[0], -pos.min[2], pos.max[1]]];
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], bl[0][k]); hi[k] = Math.max(hi[k], bl[1][k]); }
  }
  for (const mt of j.materials || []) { const pb = mt.pbrMetallicRoughness || {}; if (pb.baseColorTexture) continue;
    colours.push({ name: mt.name, srgb: (pb.baseColorFactor || [1, 1, 1]).slice(0, 3).map(s8) }); }
  return { tris, lo, hi, colours };
}
// a built prop measured like a glb: triangles, bounds, flat colours (painted cards carry a map and are skipped)
function readBuilt(name) {
  const g = builtGroup(name); g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), colours = []; let tris = 0;
  g.traverse(o => { if (!o.isMesh) return; const ix = o.geometry.index; tris += (ix ? ix.count : o.geometry.attributes.position.count) / 3;
    const mt = o.material; if (mt.map || !mt.color) return; colours.push({ name: o.name || mt.type, srgb: [mt.color.r, mt.color.g, mt.color.b].map(s8) }); });
  return { tris, lo: [box.min.x, -box.max.z, box.min.y], hi: [box.max.x, -box.min.z, box.max.y], colours };
}
const ALL = () => [
  ...Object.entries(MAN.props).map(([slug, v]) => ({ name: `${v.place}/${slug}`, src: 'glb', m: readGlb(path.join(ROOT, v.file)), v })),
  ...Object.keys(BUILT).map(name => ({ name, src: 'code', m: readBuilt(name), v: BUILT[name] })),
];

test('catalog: every manifest entry has a file that parses and holds the manifest triangles and bounds', () => {
  for (const [slug, v] of Object.entries(MAN.props)) {
    assert.equal(v.file, `${v.place}/${slug}.glb`, `${slug}: file is <place>/<slug>.glb`);
    const m = readGlb(path.join(ROOT, v.file));
    assert.equal(m.tris, v.tris, `${v.file}: ${m.tris} triangles, manifest says ${v.tris}`);
    assert.equal(fs.statSync(path.join(ROOT, v.file)).size, v.bytes, `${v.file}: bytes`);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(m.lo[k] - v.lo[k]) < 0.01 && Math.abs(m.hi[k] - v.hi[k]) < 0.01, `${v.file}: bounds ${'xyz'[k]} ${m.lo[k].toFixed(3)}..${m.hi[k].toFixed(3)} vs manifest ${v.lo[k]}..${v.hi[k]}`);
  }
  const onDisk = fs.readdirSync(ROOT, { recursive: true }).filter(f => f.endsWith('.glb')).map(f => f.split(path.sep).join('/')).sort();
  assert.deepEqual(onDisk, Object.values(MAN.props).map(v => v.file).sort(), 'every .glb on disk is in the manifest');
});

test('catalog: the code-built props are the list\'s code_built items, by <place>/<slug>, plus the kitchen TV and the scaffolding', () => {
  const ids = Object.values(BUILT).map(b => b.id).filter(Boolean).sort();
  assert.deepEqual(ids, LIST.code_built.map(c => c.id).sort());
  for (const c of LIST.code_built) { const [n, b] = Object.entries(BUILT).find(([, b]) => b.id === c.id); assert.equal(n.split('/')[0], c.place, `${c.id} lives in ${c.place}`); assert.ok(b.make, n); }
  assert.ok(BUILT['kitchen-home/tv'] && BUILT['street/scaffolding'], 'the code-built TV and scaffolding replace the misnamed glbs');
  const names = propNames(); assert.equal(new Set(names).size, names.length, 'no glb and built prop share a name');
});

test('catalog: catalog() lists every prop with place, size, tris and source; an unknown name throws with close matches', () => {
  const c = catalog(), n = Object.keys(MAN.props).length + Object.keys(BUILT).length;
  assert.equal(c.length, n);
  for (const r of c) { assert.match(r.name, /^[a-z-]+\/[a-z0-9-]+$/, r.name); assert.equal(r.place, r.name.split('/')[0]); assert.equal(r.size.length, 3); assert.ok(r.tris > 0, r.name); assert.ok(['glb', 'code'].includes(r.source)); }
  assert.equal(c.find(r => r.name === 'hospital/iv-stand').source, 'code');
  assert.equal(c.find(r => r.name === 'street/bench').source, 'glb');
  assert.equal(resolveProp('street/bench').source, 'glb');
  assert.throws(() => resolveProp('street/benchh'), /street\/bench/);
  assert.throws(() => resolveProp('hospital/ivstand'), /hospital\/iv-stand/);
  assert.throws(() => resolveProp('bench'), /street\/bench/);
});

test('catalog: every prop stands at a real height, its pivot on the floor at its bottom centre', () => {
  const bad = [];
  for (const { name, m } of ALL()) {
    const h = m.hi[2] - m.lo[2], [lo, hi] = heightRange(name);
    if (!(h >= lo && h <= hi)) bad.push(`${name}: ${h.toFixed(2)} m tall, want ${lo}-${hi}`);
    if (Math.abs(m.lo[2]) > 0.01) bad.push(`${name}: bottom at z ${m.lo[2].toFixed(3)} (pivot not on the floor)`);
    for (const k of [0, 1]) { const c = (m.lo[k] + m.hi[k]) / 2, w = m.hi[k] - m.lo[k]; if (Math.abs(c) > 0.08 * w + 0.02) bad.push(`${name}: centre ${'xy'[k]} ${c.toFixed(2)} off the pivot`); }
  }
  assert.deepEqual(bad, []);
  assert.ok(PROP_HEIGHT.default[1] <= 3.5 && PROP_HEIGHT.big.some(([re]) => re.test('arena/concert-stage')));
});

test('catalog: a built prop is as big as its declared size (±15 %)', () => {
  for (const [name, b] of Object.entries(BUILT)) { const m = readBuilt(name);
    for (let k = 0; k < 3; k++) { const s = m.hi[k] - m.lo[k]; assert.ok(Math.abs(s - b.size[k]) <= 0.15 * b.size[k] + 0.01, `${name}: ${'wdh'[k]} ${s.toFixed(3)} m, declared ${b.size[k]}`); } }
});

test('catalog: no prop has a near-white or black base colour (valuegate blown object / crushed subject)', () => {
  const bad = [];
  for (const { name, m } of ALL()) for (const c of m.colours) { const mx = Math.max(...c.srgb);
    if (mx > WHITE) bad.push(`${name} ${c.name}: max channel ${mx.toFixed(3)} sRGB (near-white)`);
    if (mx < BLACK) bad.push(`${name} ${c.name}: max channel ${mx.toFixed(3)} sRGB (black)`); }
  assert.deepEqual(bad, []);
});

test('catalog: load-time budget: assets/props <= 15 MB, one file <= 400 KB, a built prop <= 6000 triangles', () => {
  const files = fs.readdirSync(ROOT, { recursive: true }).map(f => path.join(ROOT, f)).filter(f => fs.statSync(f).isFile());
  const total = files.reduce((s, f) => s + fs.statSync(f).size, 0);
  assert.ok(total <= 15 * 2 ** 20, `assets/props ${(total / 2 ** 20).toFixed(1)} MB`);
  for (const f of files.filter(f => f.endsWith('.glb'))) assert.ok(fs.statSync(f).size <= 400 * 1024, `${path.relative(ROOT, f)} ${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
  for (const name of Object.keys(BUILT)) { const t = readBuilt(name).tris; assert.ok(t <= 6000, `${name}: ${t} triangles`); }
});
