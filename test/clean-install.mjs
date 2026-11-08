// test/clean-install.mjs: what a buyer does, start to finish, in a folder that came out of a zip.
//   node test/clean-install.mjs <unzipped folder>
// The folder must not be a git checkout (the bug this test exists for: an installer that only trusted git).
// Needs `pixi` on PATH, nothing else. Runs: studio install → studio doctor (twice; the second must change nothing)
// → make.mjs on a copy of the check reel (audio, render, verify; no network). Exit 0 only if every step passes.
import { spawnSync } from 'node:child_process';
import { existsSync, cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] || '');
const fail = m => { console.error(`✗ ${m}`); process.exit(1); };
if (!existsSync(join(dir, 'pixi.toml'))) fail(`no pixi.toml in ${dir}: pass the unzipped folder`);
if (existsSync(join(dir, '.git'))) fail(`${dir} is a git checkout; unzip the release into a clean folder`);
const step = (label, args, { timeout = 30 * 60e3 } = {}) => {
  const t = Date.now();
  console.log(`\n=== ${label}: pixi ${args.join(' ')}`);
  const r = spawnSync('pixi', args, { cwd: dir, stdio: 'inherit', timeout, env: { ...process.env, PIXI_NO_TELEMETRY: '1' } });
  const s = ((Date.now() - t) / 1000).toFixed(0);
  if (r.error) fail(`${label}: ${r.error.message}`);
  if (r.status !== 0) fail(`${label} failed after ${s} s (exit ${r.status})`);
  console.log(`✓ ${label} (${s} s)`);
  return +s;
};

step('install', ['run', 'studio', 'install']);
step('doctor', ['run', 'studio', 'doctor']);
const again = step('install again (must be a no-op)', ['run', 'studio', 'install']);
if (again > 60) fail(`the second install took ${again} s: it should skip everything`);
if (existsSync(join(dir, 'episode', 'voice.py'))) step('voice.py self-check (cuts, pauses, a line read twice)', ['run', 'python', 'episode/voice.py', '--self-check']);

// The TMV kit: the sample ships rendered and install only draws 2 s of it, so CI renders a whole episode itself, on a
// copy of the sample (its voice is the shipped take: no Gemini key), and its check report must be all ✓.
// Linux CI has no GPU (software WebGL, seconds a frame): 8 fps there keeps it to minutes, as on a buyer's machine without one.
if (!existsSync(join(dir, 'kit', 'check-reel'))) {
  if (!existsSync(join(dir, 'episodes', 'sample', 'sample.mp4'))) fail('the zip has no episodes/sample/sample.mp4 (the buyer must see the sample at once)');
  const ep = join(dir, 'episodes', 'ci-ep');
  rmSync(ep, { recursive: true, force: true });
  cpSync(join(dir, 'episodes', 'sample'), ep, { recursive: true, filter: f => !/[\\/](out|sample\.mp4)$/.test(f) });
  step('make an episode (render, check)', ['run', 'node', 'episode/make.mjs', 'episodes/ci-ep', 'render', 'check', ...(process.platform === 'linux' ? ['--fps', '8'] : [])]);
  const rep = JSON.parse(readFileSync(join(ep, 'out', 'check.json'), 'utf8'));
  const bad = rep.checks.filter(c => !c.ok);
  if (bad.length || !existsSync(rep.mp4)) fail(`episode: ${bad.map(c => c.name).join(', ') || 'no MP4'}`);
  console.log(`\n✓ clean install passed in ${dir}: ${rep.mp4}`);
  process.exit(0);
}
const film = join(dir, 'films', 'ci-reel');
rmSync(film, { recursive: true, force: true });
cpSync(join(dir, 'kit', 'check-reel'), film, { recursive: true });
// CI machines draw WebGL in software (seconds per frame): 6 fps keeps the whole pipeline in the test, minutes not hours
const cfg = join(film, 'src', 'config.js');
writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/fps:(\s*)30/g, (_, s) => `fps:${s}6`).replace(/name: '[^']*'/, "name: 'ci-reel'"));
step('make a reel (audio, render, verify)', ['run', 'make', 'films/ci-reel', 'audio', 'render', 'verify', '--no-asr', '--no-camscan']);
const report = JSON.parse(readFileSync(join(film, 'out', 'check', 'verify.json'), 'utf8'));
const failed = report.checks.filter(c => c.ok === false);
if (failed.length) fail(`verify: ${failed.map(c => c.name).join(', ')}`);
console.log(`\n✓ clean install passed in ${dir}`);
