// release/install-needed.mjs: does a change need the clean-install test? Prints true or false (install.yml's `changes` job).
//   node release/install-needed.mjs <base ref> [head ref]
// A file on the install path changed → true. A kit.manifest edit counts only when it moves a file that already existed in
// or out of a zip: a new [dev] line for Kai's own tools changes nothing a buyer installs.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest, classify } from './build.mjs';

export const INSTALL_PATH = /^(kit\/|core\/render\/|styles\/kai-hand-draw\/tools\/|pixi\.(toml|lock)|package(-lock)?\.json|release\/|test\/clean-install\.mjs|tmv\/(?!.*\.md$)|\.github\/workflows\/install\.yml)/;

/** Pure. changed = files the diff touches; files = files in both refs; before/after = parsed manifests. */
export function installNeeded(changed, files, before, after) {
  if (changed.some(f => INSTALL_PATH.test(f))) return true;
  if (!changed.includes('kit.manifest')) return false;
  const section = m => { const { by } = classify(files, m), s = new Map(); for (const k of Object.keys(by)) for (const f of by[k]) s.set(f, k); return s; };
  const a = section(before), b = section(after);
  return files.some(f => a.get(f) !== b.get(f));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const git = (...args) => { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); return r.status === 0 ? r.stdout : null; };
  const [base, head = 'HEAD'] = process.argv.slice(2);
  const changed = base && git('diff', '--name-only', base, head);
  if (changed == null) { console.log('true'); process.exit(0); }   // no usable base: test to be safe
  const list = ref => new Set(git('ls-tree', '-r', '--name-only', ref).split('\n').filter(Boolean));
  const inBase = list(base), files = [...list(head)].filter(f => inBase.has(f));
  const manifest = ref => parseManifest(git('show', `${ref}:kit.manifest`));
  console.log(String(installNeeded(changed.split('\n').filter(Boolean), files, manifest(base), manifest(head))));
}
