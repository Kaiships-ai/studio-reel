// release/install-needed.mjs: which zips' clean-install test a change needs (install.yml's `changes` job).
//   node release/install-needed.mjs <base ref> [head ref]
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, inflateRawSync } from 'node:zlib';

export const TIERS = ['pro', 'tmv'];
const HARNESS = /^(test\/clean-install\.mjs|\.github\/workflows\/install\.yml)$/;
const DOC = /(\.md|(^|\/)LICENSE)$/;
const unsure = e => ({ run: true, why: `${e.message}: test to be safe` });

export function zipEntries(buf) {
  const eocd = buf.length - 22, n = buf.readUInt16LE(eocd + 10), out = new Map();
  for (let i = 0, c = buf.readUInt32LE(eocd + 16); i < n; i++) {
    const method = buf.readUInt16LE(c + 10), csize = buf.readUInt32LE(c + 20), nl = buf.readUInt16LE(c + 28);
    const name = buf.toString('utf8', c + 46, c + 46 + nl), at = buf.readUInt32LE(c + 42);
    const start = at + 30 + buf.readUInt16LE(at + 26) + buf.readUInt16LE(at + 28), raw = buf.subarray(start, start + csize);
    const data = method === 8 ? inflateRawSync(raw) : raw;
    out.set(name.replace(/^[^/]+\//, ''), `${crc32(data) >>> 0}:${data.length}`);
    c += 46 + nl + buf.readUInt16LE(c + 30) + buf.readUInt16LE(c + 32);
  }
  return out;
}

export function tierNeeded(changed, before, after) {
  const list = fs => fs.slice(0, 8).join(', ') + (fs.length > 8 ? `, … (${fs.length})` : '');
  const harness = changed.filter(f => HARNESS.test(f));
  if (harness.length) return { run: true, why: `the install test changed: ${list(harness)}` };
  const diff = [...new Set([...before.keys(), ...after.keys()])].filter(f => before.get(f) !== after.get(f)).sort();
  const code = diff.filter(f => !DOC.test(f));
  return code.length ? { run: true, why: `shipped files differ: ${list(code)}` }
    : diff.length ? { run: false, why: `only docs differ: ${list(diff)}` }
    : { run: false, why: 'the zip is identical' };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const build = (script, ref, tier, out) => new Promise((ok, no) => {
  const p = spawn(process.execPath, [script, '--ref', ref, '--tier', tier, '--out', out], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  p.on('error', no).on('exit', code => code === 0 ? ok(zipEntries(readFileSync(join(out, readdirSync(out).find(f => f.endsWith('.zip')))))) : no(new Error(`build.mjs --ref ${ref} --tier ${tier} exited ${code}`)));
});

async function decide(base, head) {
  const diff = base && git('diff', '--name-only', base, head);
  if (!diff || diff.status !== 0) throw new Error(`no usable base ref "${base}"`);
  const changed = diff.stdout.split('\n').filter(Boolean);
  if (changed.some(f => HARNESS.test(f))) return Object.fromEntries(TIERS.map(t => [t, tierNeeded(changed, new Map(), new Map())]));
  const tmp = mkdtempSync(join(tmpdir(), 'install-needed-')), scripts = [];
  const own = ref => {
    const src = git('show', `${ref}:release/build.mjs`);
    if (src.status !== 0) throw new Error(`${ref} has no release/build.mjs`);
    const f = join(ROOT, 'release', `.build-${process.pid}-${scripts.length}.mjs`);
    writeFileSync(f, src.stdout); scripts.push(f); return f;
  };
  try {
    const [b, h] = [own(base), own(head)];
    const one = async t => tierNeeded(changed, ...await Promise.all([build(b, base, t, join(tmp, `base-${t}`)), build(h, head, t, join(tmp, `head-${t}`))]));
    const got = await Promise.all(TIERS.map(t => one(t).catch(unsure)));
    return Object.fromEntries(TIERS.map((t, i) => [t, got[i]]));
  } finally { for (const f of scripts) rmSync(f, { force: true }); rmSync(tmp, { recursive: true, force: true }); }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) {
  const [base, head = 'HEAD'] = process.argv.slice(2);
  const need = await decide(base, head).catch(e => Object.fromEntries(TIERS.map(t => [t, unsure(e)])));
  for (const t of TIERS) { console.error(`${t}: ${need[t].run ? 'run' : 'skip'} · ${need[t].why}`); console.log(`${t}=${need[t].run}`); }
}
