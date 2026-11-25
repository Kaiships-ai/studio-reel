// The stick-man kit's shared prop catalog (kit/props/catalog.js): the CC0 .glb props (assets/props/<place>/<slug>.glb)
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
const { PROP_HEIGHT, heightRange, poseFault, PROP_POSE, NEAR_BLACK, BLACK_OK, DARK, FRONT, NO_FRONT, frontFault, propLuma, diagonalSplits } = await import('../../styles/stick-man/kit/props/sizes.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../styles/stick-man/assets/props');
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
// the first prop list's code-built items, id -> place (the list itself lives in films/, which git ignores: a test reads no file there)
const CODE_BUILT = {
  hospital: ['cb-gurney', 'cb-ivstand', 'cb-monstand', 'cb-bassinet', 'cb-sanitiser', 'cb-privacycurtain', 'cb-blind', 'cb-doublewindowdoor', 'cb-bedrail'],
  'care-home': ['cb-walkingframe', 'cb-memorybox', 'cb-firedoor', 'cb-servinghatch'],
  street: ['cb-childshoe', 'cb-policetower', 'cb-screentruck', 'cb-crowdpen'],
  office: ['cb-cubicle', 'cb-whiteboard', 'cb-glasswall'],
  supermarket: ['cb-shoptrolley', 'cb-checkoutbelt', 'cb-glasscabinet', 'cb-nappystack'],
  'kitchen-home': ['cb-highchair', 'cb-steriliser', 'cb-bottlerack', 'cb-calendar'],
  lab: ['cb-eyewash', 'cb-incubator', 'cb-biocabinet', 'cb-labbench', 'cb-gantry'],
};
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
  return { tris, lo, hi, colours, list: glbTris(b, j, 28 + jn) };
}
// the same file as triangles: Blender axes, sRGB base colour (null where the material is a picture)
function glbTris(b, j, o0) {
  const A = { 5121: [Uint8Array, 1], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] }, N = { SCALAR: 1, VEC2: 2, VEC3: 3 }, out = [];
  const read = i => { const a = j.accessors[i], v = j.bufferViews[a.bufferView], [C, s] = A[a.componentType], o = b.byteOffset + o0 + (v.byteOffset || 0) + (a.byteOffset || 0); return new C(b.buffer.slice(o, o + a.count * N[a.type] * s)); };
  for (const m of j.meshes) for (const p of m.primitives) {
    const P = read(p.attributes.POSITION), ix = p.indices != null ? read(p.indices) : Uint32Array.from({ length: P.length / 3 }, (_, i) => i), pb = j.materials?.[p.material]?.pbrMetallicRoughness || {};
    const c = pb.baseColorTexture ? null : (pb.baseColorFactor || [1, 1, 1]).slice(0, 3).map(s8);
    for (let i = 0; i < ix.length; i += 3) out.push({ v: [0, 1, 2].map(k => { const q = 3 * ix[i + k]; return [P[q], -P[q + 2], P[q + 1]]; }), c });
  }
  return out;
}
// a built prop measured like a glb: triangles, bounds, flat colours (painted cards carry a map and are skipped)
function readBuilt(name) {
  const g = builtGroup(name); g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), colours = [], list = []; let tris = 0; const p = new THREE.Vector3();
  g.traverse(o => { if (!o.isMesh) return; const ix = o.geometry.index; tris += (ix ? ix.count : o.geometry.attributes.position.count) / 3;
    const mt = o.material, at = o.geometry.attributes.position, flat = mt.map || !mt.color || mt.transparent ? null : [mt.color.r, mt.color.g, mt.color.b].map(s8);
    for (let i = 0; i < (ix ? ix.count : at.count); i += 3) list.push({ v: [0, 1, 2].map(k => { p.fromBufferAttribute(at, ix ? ix.getX(i + k) : i + k).applyMatrix4(o.matrixWorld); return [p.x, -p.z, p.y]; }), c: flat });
    if (mt.map || !mt.color) return; colours.push({ name: o.name || mt.type, srgb: [mt.color.r, mt.color.g, mt.color.b].map(s8) }); });
  return { tris, lo: [box.min.x, -box.max.z, box.min.y], hi: [box.max.x, -box.min.z, box.max.y], colours, list };
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

test('catalog: every code-built item of the prop list is built, in its place; replaced models stay out', () => {
  const ids = Object.values(BUILT).map(b => b.id).filter(Boolean).sort();
  assert.deepEqual(ids, Object.values(CODE_BUILT).flat().sort());
  for (const [place, list] of Object.entries(CODE_BUILT)) for (const id of list) { const [n, b] = Object.entries(BUILT).find(([, b]) => b.id === id); assert.equal(n.split('/')[0], place, `${id} lives in ${place}`); assert.ok(b.make, n); }
  assert.ok(BUILT['kitchen-home/tv'] && BUILT['street/scaffolding'], 'the code-built TV and scaffolding replace the misnamed glbs');
  assert.equal(resolveProp('kitchen-home/dishrack').source, 'code', 'the code-built dish rack replaces the stool-like glb');
  for (const n of ['care-home/wall-clock', 'office/mug', 'lab/bunsen-burner', 'supermarket/shopping-basket']) assert.equal(resolveProp(n).source, 'code', n);
  const drop = { y9mMoShXnI: 'dish rack', wall_clock: 'blank clock', fis2ugeLbn: 'broken mug', wicker_basket_01: 'bread tray' };
  for (const v of Object.values(MAN.props)) assert.ok(!drop[v.id], `${v.file}: the dropped ${drop[v.id]} stays out of the manifest`);
  assert.equal(resolveProp('misc/scuba-tanks').entry.id, 'j59k7ctnZM'); assert.equal(resolveProp('lab/tripod-stand').entry.id, 'bunsen_burner');
  assert.ok(BUILT['supermarket/shelf-stocked'] && BUILT['supermarket/shelf-end-cap']);
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

// Contact sheets 25/11: a 20 cm mic stand, a screen rig on its side, a phone screen to +x, a tipped jug. The pose table
// (sizes.js PROP_POSE) says how each such prop stands; every named prop must exist so a rename cannot drop it silently.
test('catalog: every prop stands the way the real thing does (PROP_POSE: upright, front, handle, flat)', () => {
  const bad = [], all = ALL();
  for (const { name, m } of all) { const f = poseFault(name, [0, 1, 2].map(k => m.hi[k] - m.lo[k])); if (f) bad.push(`${name}: ${f}`); }
  assert.deepEqual(bad, []);
  const names = all.map(x => x.name);
  for (const [k, re] of Object.entries(PROP_POSE)) assert.ok(names.filter(n => re.test(n)).length >= 3, `PROP_POSE.${k} matches the catalog`);
  assert.ok(poseFault('misc/smartphone', [0.01, 0.068, 0.15]) && poseFault('arena/screen-rig', [2.63, 0.89, 3.0]) && poseFault('lab/measuring-cup', [0.062, 0.068, 0.11]));
});

test('catalog: no base colour near black unless the real thing is black (BLACK_OK)', () => {
  const bad = [];
  for (const { name, m } of ALL()) for (const c of m.colours) if (Math.max(...c.srgb) <= NEAR_BLACK && !BLACK_OK[name]) bad.push(`${name} ${c.name}: max channel ${Math.max(...c.srgb).toFixed(3)} sRGB`);
  assert.deepEqual(bad, []);
  const names = new Set(ALL().map(x => x.name));
  for (const n of Object.keys(BLACK_OK)) assert.ok(names.has(n), `BLACK_OK names ${n}, not in the catalog`);
});

// 25/11: the armchair (0.139) and the sofa (0.162) were black lumps though no single colour of theirs was near black
test('catalog: no prop is too dark as a whole (area-weighted luminance, DARK.ok by name)', () => {
  const bad = [], all = ALL();
  for (const { name, m } of all) { const l = propLuma(m.list); if (l != null && l < DARK.min && !DARK.ok[name]) bad.push(`${name}: ${l.toFixed(3)} < ${DARK.min}`); }
  assert.deepEqual(bad, []);
  for (const n of Object.keys(DARK.ok)) assert.ok(propLuma(all.find(x => x.name === n).m.list) < DARK.min, `DARK.ok names ${n}, which is not that dark`);
  const tri = c => [{ v: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], c: c.map(v => v / 255) }];
  assert.ok(propLuma(tri([36, 34, 39])) < DARK.min && propLuma(tri([41, 41, 41])) < DARK.min, 'the old armchair and sofa cloth');
});

// 25/11: the lounge chair, desk chair, screen, laptop and picture frame showed their backs, and seven more
test('catalog: every .glb prop faces the front (FRONT, measured) or says why it has none (NO_FRONT)', () => {
  const glb = ALL().filter(x => x.src === 'glb'), bad = [];
  for (const { name, m } of glb) {
    const none = Object.values(NO_FRONT).filter(re => re.test(name)).length;
    if (!FRONT[name] && !none) bad.push(`${name}: in neither FRONT nor NO_FRONT`);
    if (none + (FRONT[name] ? 1 : 0) > 1) bad.push(`${name}: in FRONT and NO_FRONT`);
    const f = frontFault(name, m.list); if (f) bad.push(`${name}: ${f}`);
    if (FRONT[name] && ['mark', 'back', 'x'].includes(FRONT[name][0])) {           // the row must fail on the same prop turned round
      const turned = m.list.map(t => ({ c: t.c, v: t.v.map(([x, y, z]) => [-x, -y, z]) })); if (!frontFault(name, turned)) bad.push(`${name}: FRONT row also holds turned 180 (it proves nothing)`); }
  }
  for (const n of Object.keys(FRONT)) if (!glb.some(x => x.name === n)) bad.push(`FRONT names ${n}, not in the catalog`);
  assert.deepEqual(bad, []);
});

// 25/11: a picture, a desk top and a mirror split along the diagonal in two colours
test('catalog: no flat panel is split along its diagonal in two colours', () => {
  const bad = []; for (const { name, src, m } of ALL()) if (src === 'glb') { const d = diagonalSplits(m.list); if (d.length) bad.push(`${name}: ${d.length} (largest triangle ${(100 * Math.max(...d)).toFixed(1)} % of the prop)`); }
  assert.deepEqual(bad, []);
  const A = [0, 0, 0], B = [1, 0, 0], C = [1, 0, 1], D = [0, 0, 1], pic = [{ v: [A, B, C], c: [0.4, 0.3, 0.3] }, { v: [A, C, D], c: [0.7, 0.8, 0.7] }];
  assert.equal(diagonalSplits(pic).length, 1); assert.equal(diagonalSplits(pic.map(t => ({ ...t, c: [0.5, 0.5, 0.5] }))).length, 0);
});

test('catalog: the wall clock reads 11:59: 12 marks, the hour hand just before 12, the minute hand at 59', () => {
  const g = builtGroup('care-home/wall-clock'), hands = []; let marks = 0; g.updateMatrixWorld(true);
  g.traverse(o => { if (!/^clock:/.test(o.name)) return; const h = o.geometry.parameters.height, deg = +o.name.slice(6), tip = new THREE.Vector3(0, h / 2, 0).applyMatrix4(o.matrixWorld);
    const a = (Math.atan2(tip.x, tip.y - 0.16) * 180 / Math.PI + 360) % 360, r = Math.hypot(tip.x, tip.y - 0.16);
    if (deg % 30 === 0) { marks++; assert.ok(Math.abs(((a - deg + 540) % 360) - 180) < 0.5 && r > 0.13, `mark ${deg}`); } else hands.push([r, a]); });
  assert.equal(marks, 12); hands.sort((x, y) => x[0] - y[0]); assert.equal(hands.length, 2);
  assert.ok(Math.abs(hands[0][1] - 359.5) < 0.2, `hour hand at ${hands[0][1]}`); assert.ok(Math.abs(hands[1][1] - 354) < 0.2 && hands[1][0] < 0.13, `minute hand at ${hands[1][1]}`);
});

test('catalog: docs/PROPS.md lists the catalog: every name, every count', () => {
  const md = fs.readFileSync(path.join(ROOT, '../../docs/PROPS.md'), 'utf8'), want = {};
  for (const r of catalog()) (want[r.place] ??= []).push(r.name.split('/')[1] + (r.source === 'code' ? '*' : ''));
  const got = Object.fromEntries([...md.matchAll(/^\| `([a-z-]+)` \| (\d+) \| ([a-z0-9*, -]+) \|$/gm)].map(m => { assert.equal(+m[2], m[3].split(', ').length, `${m[1]}: n`); return [m[1], m[3].split(', ')]; }));
  assert.deepEqual(got, want);
  const c = catalog(), glb = c.filter(r => r.source === 'glb').length, head = md.match(/(\d+) set props by one name.*?: (\d+) CC0 `\.glb` models.*?and (\d+) code-built ones/s);
  assert.ok(head, 'the counts sentence'); assert.deepEqual(head.slice(1).map(Number), [c.length, glb, c.length - glb]);
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
  for (const name of ['supermarket/shelf-stocked', 'supermarket/shelf-end-cap']) { const t = readBuilt(name).tris; assert.ok(t <= 3000, `${name}: ${t} triangles (a stocked shelf <= 3000)`); }
});
