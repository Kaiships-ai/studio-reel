// The stamp on the hair rows of kit/compat.json: a sha256 of every file the hair-in-body measure reads, so the table is known to be
// what the measure says today without replaying it. The files: the static and dynamic import closure of test/unit/hair-measure.mjs
// (hair.js and its helpers, the engine, the rig, every clip file of the motion library, wardrobe-measure.mjs; the limits are in
// hair-measure.mjs itself), plus fits_kinds.mjs and kit/cast/compat.js (hairRows, pair) and the three.js version. A commit id is not
// enough: a commit that leaves these alone keeps the rows, one that edits any of them makes them stale. Written by fits.mjs --hair
// (only a full run: every shipped style through every adult clip), checked by stick-hair-body.test.mjs.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_OF_REPO = path.resolve(HERE, '../..');
const ENTRIES = ['test/unit/hair-measure.mjs'], ALSO = ['styles/stick-man/tools/gates/fits_kinds.mjs', 'styles/stick-man/kit/cast/compat.js'];
const ALIAS = { '#engine/': 'engine/', '#kit/': 'kit/', '#motion-lib/': 'motion-lib/', '#tools/': 'tools/' }, SM = 'styles/stick-man/';
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\1/g;

function resolve(spec, from, root) {
  if (spec.startsWith('.')) return path.resolve(path.dirname(from), spec);
  for (const [a, to] of Object.entries(ALIAS)) if (spec.startsWith(a)) return path.join(root, SM, to, spec.slice(a.length));
  return null;   // a package (three, node:*): three's version is hashed below
}
// every repo file the entries load, sorted, relative to root
export function hairInputs(root = ROOT_OF_REPO) {
  const seen = new Set(), todo = ENTRIES.map(f => path.join(root, f));
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue;
    if (!fs.existsSync(f)) throw new Error(`hair-stamp: ${path.relative(root, f)} is imported but missing`);
    seen.add(f);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(SPEC)) { const r = resolve(m[2], f, root); if (r && /\.(m?js|json)$/.test(r)) todo.push(r); }
  }
  for (const f of ALSO) seen.add(path.join(root, f));
  return [...seen].map(f => path.relative(root, f).split(path.sep).join('/')).sort();
}
export function hairStamp(root = ROOT_OF_REPO) {
  const h = crypto.createHash('sha256');
  for (const f of hairInputs(root)) h.update(`${f}\0`).update(fs.readFileSync(path.join(root, f))).update('\0');
  let three = '?'; try { three = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8')).version; } catch {}
  return h.update(`three@${three}`).digest('hex').slice(0, 16);
}
export const STALE = 'hair rows are stale: run node styles/stick-man/tools/gates/fits.mjs --hair (~30 min: on the Mac Pro, ssh pro, ~/pro-fans.sh run, not on a laptop)';
// the hair rows a table holds that the measure did not write from today's inputs (no stamp, or another one)
export const staleRows = (T, stamp = hairStamp()) => T.rows.filter(r => r.kind === 'hair' && r.inputs !== stamp).map(r => r.pair);
