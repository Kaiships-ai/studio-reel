// Render on the Mac Pro: renders never run on the MacBook Air. Syncs the episode folder there, pulls origin/main in the Pro's
// checkout, runs tools/shot.mjs with the arguments after `--`, and copies what it wrote back into the local films/<ep>/.
//   node styles/stick-man/tools/render/pro.mjs [--dry-run 1] -- --film films/hm-ep01/parts/gun --frames 1140-1346 --tier review --mp4 films/hm-ep01/renders/gun.mp4
//   node styles/stick-man/tools/render/pro.mjs --remote <job dir>      (on the Pro, from its checkout: what the Orca terminal runs)
// How: ssh cannot read ~/Desktop on the Pro, so the episode goes as a tarball (without renders/ and deliver/, so the Pro keeps
// its own renders and their cache sidecars) by scp into ~/stick-sync/<job>/, and the Pro side runs in an Orca terminal on the
// paired server `mac-pro` (--env), in the checkout --repo. The Pro side refuses when its HEAD after the pull is not the
// origin/main commit this machine fetched (the kit the gates checked), and shot.mjs there holds the render lock and checks disk.
// Outputs go under films/<ep>/renders/ (stills in a folder of their own there).
// Options: --env mac-pro, --host pro (ssh alias), --repo <Pro checkout>, --timeout-min 120, --min-free-gb 5, --dry-run 1 (print the steps)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveTier } from './tiers.mjs';
import { freeGB } from './lock.mjs';
import { gitEnv } from './cache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SHOT = 'styles/stick-man/tools/shot.mjs', SELF = 'styles/stick-man/tools/render/pro.mjs';
export const DEFAULTS = { env: 'mac-pro', host: 'pro', repo: '/Users/kienbeovl/Desktop/kaiships/studio-reel', 'timeout-min': 120, 'min-free-gb': 5 };
const OUT_FLAGS = ['mp4', 'out', 'dbg', 'report', 'cues'];

const flags = list => { const A = {}; for (let i = 0; i < list.length; i += 2) A[list[i].replace(/^--/, '')] = list[i + 1]; return A; };

// the episode folder (films/<ep>) and the repo-relative files shot.mjs writes; every one must sit inside the episode
export function jobOf(shotArgs, root = ROOT) {
  const A = flags(shotArgs);
  const m = /^films\/([^/]+)/.exec(A.film || '');
  if (!m) throw new Error('give shot.mjs --film films/<ep>[/parts/<part>] after --');
  const t = resolveTier(A);
  if (t?.error) throw new Error(t.error);
  if (!t?.pixels) throw new Error('the Pro is for pixel renders: give --tier still|proof|review|final (data tiers run anywhere)');
  const ep = `films/${m[1]}`, outputs = [];
  for (const k of OUT_FLAGS) if (A[k]) {
    const rel = path.relative(root, path.resolve(root, A[k])).split(path.sep).join('/');
    // what comes back is untarred over the local episode: only files under renders/, and a stills folder of its own
    const got = k === 'out' && rel.includes('%d') ? path.posix.dirname(rel) : rel;
    if (k === 'out' && got === ep + '/renders') throw new Error(`--out ${A[k]}: give the stills a folder of their own, e.g. ${ep}/renders/stills/f_%d.png`);
    if (!got.startsWith(ep + '/renders/')) throw new Error(`--${k} ${A[k]}: write under ${ep}/renders/ so copying it back cannot overwrite the episode`);
    outputs.push(got);
    if (k === 'mp4') outputs.push(rel + '.json');
  }
  if (!outputs.length) throw new Error('shot.mjs writes nothing here: give --mp4 or --out');
  return { ep, outputs, tier: t.tier };
}

// the local steps, in order; '{terminal}' is the handle step "start" prints
export function plan({ shotArgs, kit, id, tmp, o = DEFAULTS }) {
  const { ep } = jobOf(shotArgs), dir = `stick-sync/${id}`, remote = `$HOME/${dir}`;
  const cmd = `git pull --ff-only -q origin main && node ${SELF} --remote ${remote}; exit`;
  return [
    { what: 'pack', cmd: ['tar', '-czf', path.join(tmp, 'job.tgz'), `--exclude=${ep.slice(6)}/renders`, `--exclude=${ep.slice(6)}/deliver`, '-C', path.join(ROOT, 'films'), ep.slice(6)] },
    { what: 'job', write: path.join(tmp, 'job.json'), json: { id, ep, kit, args: shotArgs, minFreeGB: Number(o['min-free-gb']) } },
    { what: 'mkdir', cmd: ['ssh', o.host, `mkdir -p ${dir}`] },
    { what: 'send', cmd: ['scp', '-q', path.join(tmp, 'job.tgz'), path.join(tmp, 'job.json'), `${o.host}:${dir}/`] },
    { what: 'start', cmd: ['orca', 'terminal', 'create', '--environment', o.env, '--worktree', `path:${o.repo}`, '--title', `render ${id}`, '--command', cmd, '--json'] },
    { what: 'wait', cmd: ['orca', 'terminal', 'wait', '--environment', o.env, '--terminal', '{terminal}', '--for', 'exit', '--timeout-ms', String(60000 * Number(o['timeout-min']))] },
    { what: 'fetch', cmd: ['scp', '-q', `${o.host}:${dir}/done.json`, `${o.host}:${dir}/out.tgz`, tmp + '/'], mayFail: true },
    { what: 'unpack', cmd: ['tar', '-xzf', path.join(tmp, 'out.tgz'), '-C', path.join(ROOT, 'films')], mayFail: true },
  ];
}

const sh = (cmd, opts = {}) => spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', timeout: opts.timeout ?? 600000, maxBuffer: 1 << 26 });

function local(argv) {
  const i = argv.indexOf('--'); if (i < 0) { console.error('usage: pro.mjs [options] -- <shot.mjs args>'); process.exit(2); }
  const o = { ...DEFAULTS, ...flags(argv.slice(0, i)) }, shotArgs = argv.slice(i + 1);
  const dry = !!o['dry-run'];
  if (!dry) { const f = sh(['git', 'fetch', '-q', 'origin'], { timeout: 120000 }); if (f.status) { console.error('git fetch origin failed:', f.stderr); process.exit(1); } }
  const kit = sh(['git', 'rev-parse', 'origin/main']).stdout.trim(), head = sh(['git', 'rev-parse', 'HEAD']).stdout.trim();
  if (head !== kit) console.warn(`! this checkout is at ${head.slice(0, 8)}, the Pro renders origin/main ${kit.slice(0, 8)}`);
  const ep = (() => { try { return jobOf(shotArgs).ep; } catch (e) { console.error(e.message); process.exit(2); } })();
  const id = `${path.basename(ep)}-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-pro-')), steps = plan({ shotArgs, kit, id, tmp, o });
  let terminal = null;
  for (const s of steps) {
    if (s.write) { if (dry) console.log(`[${s.what}] write ${s.write} ${JSON.stringify(s.json)}`); else fs.writeFileSync(s.write, JSON.stringify(s.json, null, 1)); continue; }
    const cmd = s.cmd.map(x => x === '{terminal}' && terminal ? terminal : x);
    if (dry) { console.log(`[${s.what}] ${cmd.map(x => /[\s;&$]/.test(x) ? JSON.stringify(x) : x).join(' ')}`); continue; }
    console.log(`[${s.what}]`);
    const r = sh(cmd, { timeout: s.what === 'wait' ? 60000 * Number(o['timeout-min']) + 60000 : 1800000 });
    if (r.status && !s.mayFail) { console.error(`${s.what} failed (${r.status}):\n${(r.stderr || r.stdout || '').trim()}`); process.exit(1); }
    if (s.what === 'start') terminal = (/"handle"\s*:\s*"([^"]+)"/.exec(r.stdout) || [])[1];
    if (s.what === 'start' && !terminal) { console.error(`no terminal handle in: ${r.stdout}`); process.exit(1); }
  }
  if (dry) { fs.rmSync(tmp, { recursive: true, force: true }); return; }
  const done = (() => { try { return JSON.parse(fs.readFileSync(path.join(tmp, 'done.json'), 'utf8')); } catch { return null; } })();
  if (!done) { console.error(`the Pro wrote no done.json: read the Orca terminal ${terminal} on ${o.env}`); process.exit(1); }
  console.log(done.log || ''); console.log(done.ok ? `done on the Pro at ${done.head?.slice(0, 8)}: ${done.outputs.join(', ')}` : `failed on the Pro: ${done.why}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(done.ok ? 0 : 1);
}

// on the Pro, cwd = its checkout
export function remote(dir, { root = ROOT, shot = [process.execPath, SHOT] } = {}) {
  const job = JSON.parse(fs.readFileSync(path.join(dir, 'job.json'), 'utf8'));
  const done = d => { fs.writeFileSync(path.join(dir, 'done.json'), JSON.stringify(d, null, 1)); return d; };
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, env: gitEnv(), encoding: 'utf8' }).stdout.trim();
  if (job.kit && head !== job.kit) return done({ ok: false, head, why: `the Pro checkout is at ${head.slice(0, 8)}, the job wants ${job.kit.slice(0, 8)} (origin/main moved, or the pull failed): run again` });
  const free = freeGB(root);
  if (free < job.minFreeGB) return done({ ok: false, head, why: `only ${free.toFixed(1)} GB free on the Pro, need ${job.minFreeGB}` });
  fs.mkdirSync(path.join(root, 'films'), { recursive: true });
  const x = spawnSync('tar', ['-xzf', path.join(dir, 'job.tgz'), '-C', path.join(root, 'films')], { encoding: 'utf8' });
  if (x.status) return done({ ok: false, head, why: `unpack failed: ${x.stderr}` });
  const r = spawnSync(shot[0], [...shot.slice(1), ...job.args], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const log = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-40).join('\n');
  fs.writeFileSync(path.join(dir, 'log.txt'), (r.stdout || '') + (r.stderr || ''));
  const outputs = jobOf(job.args, root).outputs.filter(p => fs.existsSync(path.join(root, p)));
  if (outputs.length) spawnSync('tar', ['-czf', path.join(dir, 'out.tgz'), '-C', path.join(root, 'films'), ...outputs.map(p => p.slice(6))]);
  return done({ ok: r.status === 0, head, why: r.status ? `shot.mjs exit ${r.status}` : null, outputs, log });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); process.exit(argv.length ? 0 : 2); }
  if (argv[0] === '--remote') process.exit(remote(argv[1]).ok ? 0 : 1);
  local(argv);
}
