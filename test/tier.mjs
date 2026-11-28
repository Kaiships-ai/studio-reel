#!/usr/bin/env node
// test/tier.mjs: the unit tests in two tiers. A file whose first lines hold `// tier: heavy` is heavy; every other
// test/unit/*.test.mjs is fast.
//   node test/tier.mjs fast                         every fast file, timed (checks.yml and the pre-push hook)
//   node test/tier.mjs heavy --shard k/n [--base REF | --all]   this leg's share of the heavy files the change needs, traced
//   node test/tier.mjs plan [--base REF | --all]    which heavy files the change needs, and why
//   node test/tier.mjs guards [file...]             run heavy files traced and write what they read to test/heavy.json
// A heavy file runs when the change touches a path in its guards (test/heavy.json, written by `guards` from a traced
// run, never by hand), and every heavy leg checks that what the file read this time is still inside its guards.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FAST = { fileSecs: 15, wallSecs: 120 };
export const HEAVY = { fileSecs: 480, legSecs: 480, shards: 4 };   // a leg's test wall stays well under the job's 10 min cap (Linux 28/11: 166-310 s)
export const MARK = /^\/\/ tier: heavy$/m;
export const GUARDS = 'test/heavy.json';
// A change to any of these runs every heavy file: the tier machinery itself, or what every test loads.
export const RUN_ALL = ['test/tier.mjs', 'test/trace.mjs', GUARDS, '.github/workflows/checks.yml', 'package.json', 'package-lock.json', 'pixi.lock'];
const UNKNOWN_SECS = 60;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TRACE = join(ROOT, 'test', 'trace.mjs');

export const tierOf = src => MARK.test(src.split('\n').slice(0, 5).join('\n')) ? 'heavy' : 'fast';

export function tiers(root = ROOT) {
  const files = readdirSync(join(root, 'test', 'unit')).filter(f => f.endsWith('.test.mjs')).sort().map(f => `test/unit/${f}`);
  const out = { fast: [], heavy: [] };
  for (const f of files) out[tierOf(readFileSync(join(root, f), 'utf8'))].push(f);
  return out;
}

export function trackedSets(root = ROOT) {
  const files = new Set(spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }).stdout.split('\n').filter(Boolean));
  const dirs = new Set(['.']);
  for (const f of files) for (let d = dirname(f); d !== '.'; d = dirname(d)) dirs.add(d);
  return { files, dirs };
}

// The guard a traced line stands for: a file under test/ or at the root guards itself, any other file its folder, a
// listed folder itself. Paths git does not track (outside the repo, temp output, ignored folders, node_modules and
// .pixi, whose lockfiles are in RUN_ALL) guard nothing. A missing path guards the tracked folder it would be in.
export function guardOf(line, root, { files, dirs }) {
  const kind = line[0], abs = line.slice(2);
  if (kind === 'o') return 'always';
  const rel = relative(root, abs).split('\\').join('/');
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  if (/^(node_modules|\.pixi)(\/|$)/.test(rel)) return null;
  if (files.has(rel)) return !rel.includes('/') || rel.startsWith('test/') ? rel : dirname(rel);
  if (dirs.has(rel || '.')) return kind === 'l' ? rel || '.' : null;
  if (!rel.includes('/')) return rel;
  for (let d = dirname(rel); ; d = dirname(d)) { if (dirs.has(d)) return d === '.' ? null : d; if (d === '.') return null; }
}

export const covers = (g, path) => g === '.' || path === g || path.startsWith(`${g}/`);

// Minimal set: drop a guard another guard already covers.
export function guardsOf(lines, root, tracked) {
  const all = new Set(lines.map(l => guardOf(l, root, tracked)).filter(Boolean));
  if (all.has('always')) return 'always';
  return [...all].filter(g => ![...all].some(h => h !== g && covers(h, g))).sort();
}

/** @returns {{ file: string, why: string }[]} the heavy files a change needs; changed null means every file */
export function select({ heavy, guards, changed }) {
  if (!changed) return heavy.map(file => ({ file, why: 'every heavy file (no base, nightly, by hand or the heavy-all label)' }));
  const all = changed.find(c => RUN_ALL.includes(c));
  return heavy.flatMap(file => {
    const g = guards[file]?.guards;
    const why = all ? `${all} changed`
      : !g ? 'not in test/heavy.json yet'
      : g === 'always' ? 'reads through a program the tracer cannot follow'
      : (c => c && `${c} changed`)(changed.find(c => g.some(x => covers(x, c))));
    return why ? [{ file, why }] : [];
  });
}

/** Longest first onto the lightest of n legs; the same input gives the same legs on every machine. */
export function pack(files, secs, n) {
  const legs = Array.from({ length: n }, () => ({ s: 0, files: [] }));
  for (const f of [...files].sort((a, b) => (secs[b] ?? UNKNOWN_SECS) - (secs[a] ?? UNKNOWN_SECS) || a.localeCompare(b))) {
    const leg = legs.reduce((m, l) => l.s < m.s ? l : m);
    leg.s += secs[f] ?? UNKNOWN_SECS; leg.files.push(f);
  }
  return legs.map(l => l.files);
}

/** @returns {string[]} the failure lines; empty when the run is inside its budget */
export function budget(results, { fileSecs, wallSecs }, wall, tier) {
  const fix = tier === 'fast'
    ? 'Make it faster, or put `// tier: heavy` in its first lines and run `node test/tier.mjs guards <file>`: then it runs in the heavy legs when a path it reads changes.'
    : 'Split it like the hair writer: a stamped table plus small tripwire tests (the hair rows of .claude/CLAUDE.md).';
  const over = results.filter(r => r.secs > fileSecs).map(r => `${r.file} took ${r.secs.toFixed(1)} s, over the ${tier} tier's ${fileSecs} s a file. ${fix}`);
  if (wallSecs && wall > wallSecs) over.push(tier === 'fast' ? `the fast tier took ${wall.toFixed(0)} s of wall time, over its ${wallSecs} s. Make the slowest files below faster or move them to the heavy tier.` : `this heavy leg took ${wall.toFixed(0)} s of wall time, over its ${wallSecs} s (the job is cancelled at 10 min). Split the slowest files below, or raise HEAVY.shards and the matrix in checks.yml together.`);
  return over;
}

/** Each file in its own `node --test` child, `jobs` at a time. */
export function runFiles(files, { jobs, root = ROOT, trace = null, onDone = () => {} }) {
  const results = [], queue = [...files]; let n = 0;
  const one = f => new Promise(done => {
    const t = Date.now(), env = { ...process.env };
    if (trace) Object.assign(env, { TIER_TRACE: join(trace, `${n++}-${f.replace(/\W/g, '_')}.trace`), NODE_OPTIONS: `${env.NODE_OPTIONS || ''} --import=${TRACE}`.trim() });
    const p = spawn(process.execPath, ['--test', f], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    p.on('close', code => { const r = { file: f, code, secs: (Date.now() - t) / 1000, out, trace: env.TIER_TRACE }; results.push(r); onDone(r); done(); });
  });
  const worker = async () => { while (queue.length) await one(queue.shift()); };
  return Promise.all(Array.from({ length: Math.min(jobs, files.length) }, worker)).then(() => results);
}

/** Derived guards a traced run read outside the committed ones. */
export function uncovered(derived, committed) {
  if (committed === 'always') return [];
  if (derived === 'always') return ['always'];
  return derived.filter(g => !(committed || []).some(c => covers(c, g)));
}

const readGuards = root => existsSync(join(root, GUARDS)) ? JSON.parse(readFileSync(join(root, GUARDS), 'utf8')) : {};
const arg = (argv, k) => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const jobsFor = () => process.env.CI ? Math.max(1, availableParallelism() - 1) : 2;
const slowest = rs => [...rs].sort((a, b) => b.secs - a.secs).slice(0, 5).map(r => `${r.secs.toFixed(1)} ${r.file.replace(/^test\/unit\//, '')}`).join(' · ');
const summary = text => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);

// --no-renames: a file moved out of a guarded folder must count at its old path too
export function changedSince(base, root = ROOT) {
  const d = spawnSync('git', ['diff', '--name-only', '--no-renames', `${base}...HEAD`], { cwd: root, encoding: 'utf8' });
  return d.status === 0 ? d.stdout.split('\n').filter(Boolean) : null;
}

function changedFiles(argv, root) {
  if (argv.includes('--all')) return null;
  const base = arg(argv, '--base');
  if (!base) return null;
  const changed = changedSince(base, root);
  if (!changed) console.log(`no usable base "${base}": every heavy file runs`);
  return changed;
}

function report(results, failed) {
  for (const r of failed) console.log(`\n✗ ${r.file} (exit ${r.code}, ${r.secs.toFixed(1)} s)\n${r.out}`);
}

async function fast(root) {
  const { fast: files } = tiers(root), t = Date.now();
  const results = await runFiles(files, { jobs: jobsFor(), root });
  const wall = (Date.now() - t) / 1000, failed = results.filter(r => r.code !== 0);
  report(results, failed);
  const over = budget(results, FAST, wall, 'fast');
  const head = `fast: ${files.length} files, ${wall.toFixed(1)} s wall (budget ${FAST.wallSecs} s, ${FAST.fileSecs} s a file)\nslowest: ${slowest(results)}`;
  console.log(head); summary(head);
  for (const o of over) console.log(`${process.env.CI ? '✗' : 'warning:'} ${o}`);
  if (failed.length) console.log(`✗ ${failed.length} fast file(s) failed: ${failed.map(r => r.file).join(', ')}`);
  return failed.length || (process.env.CI && over.length) ? 1 : 0;
}

async function heavy(argv, root) {
  const [k, n] = (arg(argv, '--shard') || '1/1').split('/').map(Number), guards = readGuards(root);
  const picks = select({ heavy: tiers(root).heavy, guards, changed: changedFiles(argv, root) });
  const secs = Object.fromEntries(Object.entries(guards).map(([f, g]) => [f, g.secs]));
  const mine = pack(picks.map(p => p.file), secs, n)[k - 1];
  console.log(`heavy leg ${k}/${n}: ${mine.length} of ${picks.length} picked heavy files`);
  for (const p of picks.filter(p => mine.includes(p.file))) console.log(`  run ${p.file}  (${p.why})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${mine.length > 0}\n`);
  if (argv.includes('--dry-run') || !mine.length) return 0;
  const dir = mkdtempSync(join(tmpdir(), 'tier-')), tracked = trackedSets(root), t = Date.now();
  const results = await runFiles(mine, { jobs: jobsFor(), root, trace: dir, onDone: r => console.log(`${r.code ? '✗' : '✓'} ${r.secs.toFixed(1)} s ${r.file}`) });
  const failed = results.filter(r => r.code !== 0);
  report(results, failed);
  const stale = results.filter(r => !r.code).flatMap(r => {
    const add = uncovered(guardsOf(readTrace(r.trace), root, tracked), guards[r.file]?.guards);
    return add.length ? [`${r.file} read outside its guards in ${GUARDS}: ${add.join(', ')}. Run \`node test/tier.mjs guards ${r.file}\` and commit ${GUARDS}.`] : [];
  });
  rmSync(dir, { recursive: true, force: true });
  const over = budget(results, { fileSecs: HEAVY.fileSecs, wallSecs: HEAVY.legSecs }, (Date.now() - t) / 1000, 'heavy');
  const head = `heavy leg ${k}/${n}: ${results.length} files, ${((Date.now() - t) / 1000).toFixed(1)} s wall\nslowest: ${slowest(results)}`;
  console.log(head); summary(head);
  for (const o of [...stale, ...over]) console.log(`✗ ${o}`);
  return failed.length || stale.length || over.length ? 1 : 0;
}

const readTrace = f => existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean) : [];

async function writeGuards(argv, root) {
  const { heavy: marked } = tiers(root), named = argv.filter(a => a.endsWith('.test.mjs')).map(a => relative(root, resolve(a)));
  const files = named.length ? named : marked;
  for (const f of files) if (!marked.includes(f)) throw new Error(`${f} has no \`// tier: heavy\` line`);
  const dir = mkdtempSync(join(tmpdir(), 'tier-')), tracked = trackedSets(root);
  const results = await runFiles(files, { jobs: Number(arg(argv, '--jobs')) || 2, root, trace: dir, onDone: r => console.log(`${r.code ? '✗' : '✓'} ${r.secs.toFixed(1)} s ${r.file}`) });
  const failed = results.filter(r => r.code !== 0);
  report(results, failed);
  const old = readGuards(root), next = Object.fromEntries(Object.entries(old).filter(([f]) => marked.includes(f)));
  for (const r of results.filter(r => !r.code)) next[r.file] = { secs: Math.round(r.secs * 10) / 10, guards: guardsOf(readTrace(r.trace), root, tracked) };
  rmSync(dir, { recursive: true, force: true });
  writeFileSync(join(root, GUARDS), `${JSON.stringify(Object.fromEntries(Object.keys(next).sort().map(k => [k, next[k]])), null, 1)}\n`);
  console.log(`${GUARDS}: ${Object.keys(next).length} heavy files${failed.length ? `; ${failed.length} failed and kept their old entry` : ''}`);
  return failed.length ? 1 : 0;
}

export async function main(argv = process.argv.slice(2), root = ROOT) {
  const cmd = argv[0];
  if (cmd === 'fast') return fast(root);
  if (cmd === 'heavy') return heavy(argv, root);
  if (cmd === 'plan') return heavy(['--shard', '1/1', '--dry-run', ...argv], root);
  if (cmd === 'guards') return writeGuards(argv.slice(1), root);
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n').replace(/^\/\/ ?/gm, ''));
  return cmd ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
