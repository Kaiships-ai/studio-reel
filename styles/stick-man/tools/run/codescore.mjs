// The stick-man appearance path's codebase scorecard: how hard the code makes it to add or swap a part, measured from the
// source (and, for the JSON round trip and the import order, by running it). The golden fingerprint proves a look did not
// get worse; this proves the code got easier. Each PR measures it at its head; no score may get worse than
// test/golden/codescore.json (test/unit/stick-codescore.test.mjs), and a better one is written back with --write.
//   node styles/stick-man/tools/run/codescore.mjs [--write] [--json]
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, posix, sep } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as acorn from 'acorn';
import { simple, full } from 'acorn-walk';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const CARD = join(ROOT, 'test/golden/codescore.json');
// every layer word of today's wardrobe (kit/cast/compat.js SHAPES): a literal naming three of them is a hand-kept garment list
const LAYERS = ['shirt', 'scrubs', 'coat', 'jacket', 'vest', 'blazer', 'cardigan', 'sweater', 'dress', 'skirt', 'apron', 'scarf', 'tie',
  'stethoscope', 'nametag', 'pens', 'badge', 'epaulettes', 'dutybelt', 'backpack', 'cap', 'hat', 'hoodie', 'belt', 'holster'];
// each score, and which way is better
export const SCORES = {
  garmentLists: { better: 'lower', what: 'files that hold a hand-kept list of garment layers' },
  costumeHookWriters: { better: 'lower', what: 'files that assign HOOKS.costume' },
  engineKitImports: { better: 'lower', what: 'static and dynamic imports from engine/ into kit/' },
  specsJsonSafe: { better: 'higher', what: 'repo specs whose hair survives a JSON round trip', of: 'specs' },
  makeStickFiles: { better: 'lower', what: 'tracked files outside engine/ that call makeStick' },
  longestCastFn: { better: 'lower', what: 'lines of the longest function in engine/cast.js', name: 'longestCastFnName' },
  importOrderMatters: { better: 'lower', what: 'hoodie looks whose fingerprint differs across the three import orders' },
};

const parse = src => acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });
const tracked = (root, ...paths) => execFileSync('git', ['ls-files', '--', ...paths], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const jsFiles = dir => !existsSync(dir) ? [] : readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? jsFiles(p) : /\.m?js$/.test(f) ? [p] : []; });
const scripts = (file, src) => (file.endsWith('.html') ? [...src.matchAll(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]) : [src]);
const asts = file => { const src = readFileSync(file, 'utf8'); return scripts(file, src).flatMap(s => { try { return [parse(s)]; } catch { return []; } }); };

// a literal that names three layer words or more: an array of bare names, an object's keys, or a regex's alternatives
// (an outfit such as ['coat:doctor', 'stethoscope', ...] is a preset, not a list of layers)
function namesLayers(node) {
  if (node.type === 'ArrayExpression' && node.elements.some(e => typeof e?.value === 'string' && e.value.includes(':'))) return false;
  const words = node.type === 'ArrayExpression' ? node.elements.filter(e => e?.type === 'Literal').map(e => e.value)
    : node.type === 'ObjectExpression' ? node.properties.filter(p => p.type === 'Property' && !p.computed).map(p => p.key.name ?? p.key.value)
      : node.regex ? node.regex.pattern.split(/[^a-z]+/) : [];
  return new Set(words.filter(w => LAYERS.includes(w))).size >= 3;
}
export function garmentLists(root) {
  const S = join(root, 'styles/stick-man');
  return [...jsFiles(join(S, 'kit')), ...jsFiles(join(S, 'engine'))].filter(f => asts(f).some(ast => {
    let hit = false; full(ast, n => { if (!hit && (n.type === 'ArrayExpression' || n.type === 'ObjectExpression' || n.regex) && namesLayers(n)) hit = true; }); return hit;
  })).map(f => relative(root, f)).sort();
}
export function costumeHookWriters(root) {
  const S = join(root, 'styles/stick-man');
  return [...jsFiles(join(S, 'kit')), ...jsFiles(join(S, 'engine'))].filter(f => asts(f).some(ast => {
    let hit = false;
    simple(ast, { AssignmentExpression(n) { const L = n.left; if (L.type === 'MemberExpression' && L.object.name === 'HOOKS' && (L.property.name ?? L.property.value) === 'costume') hit = true; } });
    return hit;
  })).map(f => relative(root, f)).sort();
}
// the kit module an import's source names, or null: '#kit/…', a relative path from `file` (root-relative) that lands in
// styles/stick-man/kit/, or the page's root path to it; a computed source counts by its static start (`#kit/sets/${n}.js`,
// '#kit/' + n). A film's set or reel (import(R.setModule)) has no static start and is not the kit.
const KIT = 'styles/stick-man/kit/';
const head = n => (n?.type === 'Literal' && typeof n.value === 'string' ? n.value : n?.type === 'TemplateLiteral' ? n.quasis[0].value.cooked
  : n?.type === 'BinaryExpression' && n.operator === '+' ? head(n.left) : null);
export function kitTarget(source, file) {
  const s = head(source);
  if (s == null || s.startsWith('#kit/')) return s;
  const at = s.startsWith('.') ? posix.join(posix.dirname(file.split(sep).join('/')), s) : s.startsWith('/') ? posix.normalize(s.slice(1)) : '';
  return at.startsWith(KIT) ? s : null;
}
// every import, re-export and dynamic import in `src` (of root-relative `file`) that reaches the kit: [{ spec, line }]
export function kitImportsOf(src, file) {
  const out = [], ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true, locations: true });
  const hit = n => { const spec = n.source && kitTarget(n.source, file); if (spec != null) out.push({ spec, line: n.loc.start.line }); };
  simple(ast, { ImportDeclaration: hit, ExportNamedDeclaration: hit, ExportAllDeclaration: hit, ImportExpression: hit });
  return out;
}
export function engineKitImports(root) {
  return jsFiles(join(root, 'styles/stick-man/engine')).flatMap(f => kitImportsOf(readFileSync(f, 'utf8'), relative(root, f)).map(i => `${relative(root, f)}:${i.line}`)).sort();
}
export function makeStickFiles(root) {
  return tracked(root, '*.js', '*.mjs', '*.html').filter(f => !f.startsWith('styles/stick-man/engine/')).filter(f => asts(join(root, f)).some(ast => {
    let hit = false;
    simple(ast, { CallExpression(n) { const c = n.callee; if (c.name === 'makeStick' || (c.type === 'MemberExpression' && (c.property.name === 'makeStick'))) hit = true; } });
    return hit;
  })).sort();
}
export function longestCastFn(root) {
  const [ast] = asts(join(root, 'styles/stick-man/engine/cast.js')); let best = { lines: 0, name: null };
  const name = (n, parent) => n.id?.name ?? (parent?.type === 'VariableDeclarator' ? parent.id.name : parent?.type === 'Property' || parent?.type === 'MethodDefinition' ? parent.key.name : parent?.type === 'AssignmentExpression' ? srcOf(parent.left) : '(anonymous)');
  const srcOf = n => (n.type === 'MemberExpression' ? `${srcOf(n.object)}.${n.property.name}` : n.name ?? '?');
  const visit = (n, parent) => {
    if (!n || typeof n.type !== 'string') return;
    if (/Function/.test(n.type)) { const lines = n.loc.end.line - n.loc.start.line + 1; if (lines > best.lines) best = { lines, name: name(n, parent), at: n.loc.start.line }; }
    for (const k of Object.keys(n)) { const v = n[k]; if (k === 'loc') continue; for (const c of [v].flat()) if (c && typeof c.type === 'string') visit(c, n); }
  };
  visit(ast, null);
  return best;
}
export async function specsJsonSafe(root) {
  const S_ = p => import(pathToFileURL(join(root, 'styles/stick-man', p)).href);
  await (await S_('tools/gates/motionlib.mjs')).rigStick('adult');   // the headless canvas
  await S_('kit/cast/rail.js'); const { SPECS } = await S_('engine/play.js');
  const all = Object.entries(SPECS), safe = all.filter(([, s]) => JSON.stringify(JSON.parse(JSON.stringify(s.hair ?? null))) === JSON.stringify(s.hair ?? null) && !(s.hair || []).some(h => typeof h === 'function'));
  return { safe: safe.length, of: all.length, unsafe: all.filter(x => !safe.includes(x)).map(([n]) => n) };
}
export async function importOrderMatters(root) {
  const fp = join(root, 'test/unit/look-fingerprint.mjs'), { ORDERS, HOODIES, MARK } = await import(pathToFileURL(fp).href);
  const runs = await Promise.all(ORDERS.map(order => new Promise((ok, fail) => {
    const p = spawn(process.execPath, [fp, '--order', order, '--only', '^hoodie'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }); let out = '', err = '';
    p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (err += d));
    p.on('close', c => (c ? fail(new Error(err.slice(-1500))) : ok(JSON.parse(out.slice(out.lastIndexOf(MARK) + MARK.length)).cases)));
  })));
  const differ = HOODIES.map(([n]) => n).filter(n => new Set(ORDERS.map((o, i) => runs[i][`${n}@${o}`]?.hash)).size > 1);
  return { count: differ.length, looks: differ };
}

export async function measure(root = ROOT, { run = true } = {}) {
  const g = garmentLists(root), h = costumeHookWriters(root), e = engineKitImports(root), m = makeStickFiles(root), L = longestCastFn(root);
  const card = { garmentLists: g.length, costumeHookWriters: h.length, engineKitImports: e.length, makeStickFiles: m.length, longestCastFn: L.lines, longestCastFnName: L.name };
  const detail = { garmentLists: g, costumeHookWriters: h, engineKitImports: e, makeStickFiles: m, longestCastFn: `${L.name} at engine/cast.js:${L.at}` };
  if (run) {
    const [j, o] = await Promise.all([specsJsonSafe(root), importOrderMatters(root)]);
    Object.assign(card, { specsJsonSafe: j.safe, specs: j.of, importOrderMatters: o.count });
    Object.assign(detail, { specsJsonSafe: j.unsafe.length ? `lose their hair: ${j.unsafe.join(' ')}` : 'all', importOrderMatters: o.looks });
  }
  return { card, detail };
}
export function worse(recorded, card) {
  return Object.entries(SCORES).filter(([k, { better }]) => k in card && k in recorded && (better === 'lower' ? card[k] > recorded[k] : card[k] < recorded[k]))
    .map(([k, s]) => `${k}: ${recorded[k]} -> ${card[k]} (${s.what}, ${s.better} is better)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = performance.now(), { card, detail } = await measure();
  const recorded = existsSync(CARD) ? JSON.parse(readFileSync(CARD, 'utf8')) : null, bad = recorded ? worse(recorded.card, card) : [];
  if (process.argv.includes('--json')) console.log(JSON.stringify({ card, detail, worse: bad }, null, 1));
  else {
    for (const [k, s] of Object.entries(SCORES)) console.log(`${String(card[k]).padStart(4)}${s.of ? ' of ' + card[s.of] : ''}  ${s.what}${recorded ? `  (card ${recorded.card[k]})` : ''}`);
    console.log(`measured in ${Math.round(performance.now() - t0)} ms`);
    for (const b of bad) console.log('WORSE ' + b);
  }
  if (process.argv.includes('--write')) {
    if (bad.length) { console.error('refusing to write a worse card'); process.exit(1); }
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    writeFileSync(CARD, JSON.stringify({ ...recorded, sha, card, detail }, null, 1) + '\n');
    console.log('wrote ' + relative(ROOT, CARD));
  }
  process.exitCode = bad.length ? 1 : 0;
}
