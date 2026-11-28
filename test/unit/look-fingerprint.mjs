// The golden fingerprint of every stick-man look this checkout builds, headless (no GPU): per case a hash of the scene graph
// (names, visibility, world matrices), every geometry attribute, every material's values and textures, and every 2D canvas
// as a log of the draw calls made on it, with the bytes of each putImageData (the hair maps are pixels written straight in).
// A look that changes by one colour step changes its hash; one that is rebuilt the same way keeps it.
//   node test/unit/look-fingerprint.mjs [--all | --order wh|hw|h-w [--part k/n] [--only <regex>]] [--mutate coral] [--out file.json] [--write]
// --all: every case, the three orders and the reference order's parts each in its own process; --order: the import order of
// costume.js / hoodie.js / wardrobe.js (only the hoodie cases differ by it, so the other two orders build only those);
// --part k/n: every n-th case from k; --only <regex>: the cases it names; --mutate coral: PALETTES.coral.main[0] += 0.01 (the
// test's control); --write: add cases missing from test/golden/looks.json (never rewrites a recorded hash: a changed look
// needs Kai's row in approvals.json)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GOLDEN = join(ROOT, 'test/golden/looks.json'), APPROVALS = join(ROOT, 'test/golden/approvals.json');
export const ORDERS = ['wh', 'hw', 'h-w'];
export const HOODIES = [['hoodie', ['hoodie:grey']], ['hoodie + scarf', ['hoodie:grey', 'scarf:mustard']], ['hoodie down', ['hoodie:grey:down']]];
export const MARK = '\n@@look-fingerprint@@\n';   // engine code may log to stdout: the JSON follows the last marker
const WH_PROCESSES = 4;
export const BODIES = ['adult', 'heavy', 'thin', 'elder', 'child'];

const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);
const r5 = x => (typeof x === 'number' ? Math.round(x * 1e5) / 1e5 : x);
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);

function recordingDocument() {
  const canvas = () => {
    const cv = { width: 1, height: 1, style: {}, __log: [], addEventListener() {}, toDataURL: () => '' };
    const base = {
      measureText: () => ({ width: 10 }),
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x, y, w, h) => { cv.__log.push(['getImageData', [x, y, w, h]]); return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
      putImageData: (im, ...a) => cv.__log.push(['putImageData', [im.width, im.height, sha(bytes(im.data)), ...a]]),
    };
    const ctx = new Proxy(base, {
      get: (t, k) => (k in t ? t[k] : (t[k] = /^create(Linear|Radial|Conic)Gradient$|^createPattern$/.test(String(k))
        ? (...a) => { cv.__log.push([k, a]); return { addColorStop: (...b) => cv.__log.push(['stop', b]) }; }
        : (...a) => cv.__log.push([k, a]))),
      set: (t, k, v) => { cv.__log.push(['=' + String(k), v]); t[k] = v; return true; },
    });
    cv.getContext = () => ctx;
    return cv;
  };
  return { createElement: canvas, createElementNS: canvas };
}
const hashingInProgress = new Set();
function canvasHash(cv) {
  if (hashingInProgress.has(cv)) return 'self';
  hashingInProgress.add(cv);
  try { return sha(JSON.stringify([cv.width, cv.height, cv.__log], (k, v) => (v?.__log ? 'cv:' + canvasHash(v) : ArrayBuffer.isView(v) ? 'b:' + sha(bytes(v)) : r5(v)))); }
  finally { hashingInProgress.delete(cv); }
}
function textureHash(t) {
  const im = t.image;
  if (im?.__log) return 'cv:' + canvasHash(im);
  if (im?.data) return 'dt:' + sha(bytes(im.data)) + ':' + im.width + 'x' + im.height;
  return 'tex';
}
const value = v => (v == null || typeof v !== 'object' ? r5(v) : v.isTexture ? textureHash(v) : v.isColor ? v.toArray().map(r5)
  : typeof v.toArray === 'function' ? v.toArray().map(r5) : Array.isArray(v) ? v.map(value) : typeof v);
function materialHash(m) {
  const own = Object.keys(m).filter(k => !k.startsWith('_') && k !== 'uuid' && k !== 'id' && k !== 'version' && k !== 'userData').sort();
  const u = m.uniforms ? Object.keys(m.uniforms).sort().map(k => [k, value(m.uniforms[k].value)]) : null;
  return JSON.stringify([own.map(k => [k, value(m[k])]), u]);
}
export function hashFigure(S, group) {
  const h = createHash('sha256'); let meshes = 0, canvases = 0;
  for (const top of [S.root, group].filter(Boolean)) {
    top.updateMatrixWorld(true);
    top.traverse(o => {
      h.update(o.type + '|' + o.name + '|' + o.visible + '|' + o.renderOrder + '|' + Array.from(o.matrixWorld.elements, r5).join(','));
      if (o.geometry) {
        meshes++;
        for (const k of Object.keys(o.geometry.attributes).sort()) h.update(k + Array.from(o.geometry.attributes[k].array, r5).join(','));
        if (o.geometry.index) h.update(bytes(o.geometry.index.array));
      }
      for (const m of [o.material].flat().filter(Boolean)) { h.update(materialHash(m)); for (const v of Object.values(m)) if (v?.isTexture && v.image?.__log) canvases++; }
    });
  }
  return { hash: h.digest('hex').slice(0, 16), meshes, canvases };
}

// every case on this checkout under one import order, in this process (the import order is module state: one per process)
export async function fingerprintCases({ order = 'wh', part = [0, 1], only = null, mutate = null } = {}) {
  if (!ORDERS.includes(order)) throw new Error(`--order: one of ${ORDERS.join(', ')}`);
  globalThis.document = recordingDocument();   // before rigStick (tools/gates/motionlib.mjs) would install its no-op canvas
  const S_ = p => import(pathToFileURL(join(ROOT, 'styles/stick-man', p)).href);
  (await S_('tools/gates/cordjump.mjs')).serveRoot();   // hoodie.js loads its .glb with fetch: served from the repo
  const { rigStick } = await S_('tools/gates/motionlib.mjs');
  await rigStick('adult');
  if (order === 'wh') { await S_('kit/cast/wardrobe.js'); await S_('kit/cast/hoodie.js'); }
  else if (order === 'hw') { await S_('kit/cast/costume.js'); await S_('kit/cast/hoodie.js'); await S_('kit/cast/wardrobe.js'); }
  else { await S_('kit/cast/hoodie.js'); await S_('kit/cast/wardrobe.js'); }
  await S_('kit/cast/rail.js');
  const THREE = await import('three');
  const { makeStick } = await S_('engine/cast.js'), { HOOKS, SPECS } = await S_('engine/play.js');
  const { toonHair, HAIR_STYLES } = await S_('kit/cast/hair.js'), { LOOKS } = await S_('kit/cast/sheetcells.js');
  const { EXPRESSION_NAMES } = await S_('engine/expressions.js'), { useFaceStyle } = await S_('engine/facestyles/index.js');
  const { play } = await import(pathToFileURL(join(ROOT, 'test/unit/wardrobe-measure.mjs')).href);
  const face = await useFaceStyle();
  if (mutate === 'coral') { const { PALETTES } = await S_('kit/cast/palette.js'); PALETTES.coral.main[0] += 0.01; }
  else if (mutate) throw new Error(`--mutate: only coral`);
  const dressed = (spec, list) => { const S = makeStick(spec), group = new THREE.Group(); if (list?.length) HOOKS.costume(S, list, { group }); return { S, group }; };
  const todo = order !== 'wh' ? [] : [
    ...BODIES.map(b => [`body:${b}`, async () => (await rigStick(b)).S]),
    ...BODIES.map(b => [`face:${b}`, async () => {
      const { S } = await rigStick(b);
      EXPRESSION_NAMES.forEach((expr, t) => S.face({ t, expr, age: 6, cam: [0, -4, 1.6] }));
      return S;
    }]),
    ...HAIR_STYLES.map(st => [`hair:${st}`, async () => { const { S } = await rigStick('adult'); return makeStick({ ...S.spec, hair: [toonHair(st)] }); }]),
    ...LOOKS.map(([n, list]) => [`look:${n}`, () => play(list, 'adult', 'stand', { to: 4 })]),
    ...LOOKS.slice(0, 3).map(([n, list]) => [`look:${n}@walk`, () => play(list, 'adult', 'walk', { to: 12 })]),
    ...Object.entries(SPECS).map(([n, spec]) => [`spec:${n}`, () => dressed(spec, spec.costume)]),
  ];
  todo.push(...HOODIES.map(([n, list]) => [`${n}@${order}`, () => play(list, 'adult', 'stand', { to: 4 })]));
  const cases = {}, ms = {};
  for (const [i, [name, build]] of todo.entries()) {
    if (i % part[1] !== part[0] || (only && !only.test(name))) continue;
    const t0 = performance.now(), out = await build(), t1 = performance.now();
    cases[name] = hashFigure(out.S || out, out.group);
    ms[name] = [Math.round(t1 - t0), Math.round(performance.now() - t1)];
  }
  return { order, face, cases, ms };
}

export async function fingerprintAll({ mutate = null } = {}) {
  const jobs = [...Array.from({ length: WH_PROCESSES }, (_, k) => ['wh', k, WH_PROCESSES]), ['hw', 0, 1], ['h-w', 0, 1]];
  const runs = await Promise.all(jobs.map(([order, k, n]) => new Promise((ok, fail) => {
    const args = [fileURLToPath(import.meta.url), '--order', order, '--part', `${k}/${n}`, ...(mutate ? ['--mutate', mutate] : [])];
    const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (err += d));
    p.on('close', code => (code === 0 ? ok(JSON.parse(out.slice(out.lastIndexOf(MARK) + MARK.length))) : fail(new Error(`look-fingerprint --order ${order} exit ${code}\n${err.slice(-2000)}`))));
  })));
  return { face: runs[0].face, cases: Object.assign({}, ...runs.map(r => r.cases)), ms: Object.assign({}, ...runs.map(r => r.ms)) };
}

// what fails against the golden: a case whose hash moved with no row { case, from, to, page, by: 'Kai' } chaining from the
// recorded hash to this one, a recorded case no longer built, and a built case never recorded
export function judge(golden, approvals, cases) {
  const fails = [], rows = approvals.filter(a => a && a.by === 'Kai' && a.case && a.from && a.to && a.page);
  for (const [name, want] of Object.entries(golden.cases)) {
    const got = cases[name]?.hash;
    if (!got) { fails.push({ case: name, why: 'no longer built', want }); continue; }
    if (got === want) continue;
    const seen = new Set([want]); let at = want;
    for (let moved = true; moved && at !== got;) { moved = false; for (const a of rows) if (a.case === name && a.from === at && !seen.has(a.to)) { at = a.to; seen.add(at); moved = true; } }
    if (at !== got) fails.push({ case: name, why: 'hash changed without an approval by Kai', want, got });
  }
  for (const name of Object.keys(cases)) if (!(name in golden.cases)) fails.push({ case: name, why: 'not in test/golden/looks.json (run look-fingerprint.mjs --write)', got: cases[name].hash });
  return fails;
}
export const readJSON = f => JSON.parse(readFileSync(f, 'utf8'));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  if (process.argv.includes('--write') || process.argv.includes('--all')) {
    const t0 = performance.now(), { face, cases } = await fingerprintAll({ mutate: arg('--mutate') });
    if (process.argv.includes('--write')) {
      let golden; try { golden = readJSON(GOLDEN); } catch { golden = { note: 'never rewrite a hash: a changed look needs a row by Kai in approvals.json', face, cases: {} }; }
      let added = 0;
      for (const [n, c] of Object.entries(cases)) if (!(n in golden.cases)) { golden.cases[n] = c.hash; added++; }
      if (added) golden.sha = { ...golden.sha, [execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()]: added };
      golden.cases = Object.fromEntries(Object.entries(golden.cases).sort(([a], [b]) => a.localeCompare(b)));
      writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n');
      console.error(`${added} cases added, ${Object.keys(golden.cases).length} in ${GOLDEN}`);
    }
    console.error(`${Object.keys(cases).length} cases in ${Math.round(performance.now() - t0)} ms`);
    const out = JSON.stringify({ face, cases }, null, 1);
    if (arg('--out')) writeFileSync(arg('--out'), out); else if (!process.argv.includes('--write')) console.log(out);
  } else {
    const res = await fingerprintCases({ order: arg('--order') || 'wh', part: (arg('--part') || '0/1').split('/').map(Number), only: arg('--only') && new RegExp(arg('--only')), mutate: arg('--mutate') });
    if (arg('--out')) writeFileSync(arg('--out'), JSON.stringify(res, null, 1)); else process.stdout.write(MARK + JSON.stringify(res));
  }
}
