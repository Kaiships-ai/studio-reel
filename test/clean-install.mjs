// test/clean-install.mjs: what a buyer does, start to finish, in a folder that came out of a zip.
//   node test/clean-install.mjs <unzipped folder> [--full-episode] [--style 3d|paper|handdraw]
// The folder must not be a git checkout (the bug this test exists for: an installer that only trusted git).
// Needs `pixi` on PATH, nothing else. Runs: studio install → studio doctor (twice; the second must change nothing)
// → make.mjs on a copy of the check reel (audio, render, verify; no network). Exit 0 only if every step passes.
import { spawnSync } from 'node:child_process';
import { existsSync, cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { smokeEpisode } from './tmv-smoke.mjs';

const dir = resolve(process.argv[2] || '');
const fail = m => { console.error(`✗ ${m}`); process.exit(1); };
if (!existsSync(join(dir, 'pixi.toml'))) fail(`no pixi.toml in ${dir}: pass the unzipped folder`);
if (existsSync(join(dir, '.git'))) fail(`${dir} is a git checkout; unzip the release into a clean folder`);
const step = (label, args, { timeout = 30 * 60e3, env = {} } = {}) => {
  const t = Date.now();
  console.log(`\n=== ${label}: pixi ${args.join(' ')}`);
  const r = spawnSync('pixi', args, { cwd: dir, stdio: 'inherit', timeout, env: { ...process.env, PIXI_NO_TELEMETRY: '1', ...env } });
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

// The TMV kit: the sample ships rendered and install only draws 2 s of it, so CI makes an episode itself, with its voice
// cut from the shipped take (no Gemini key), and its check report must be all ✓. A PR makes ci-smoke, 13-17 s cut from
// the sample at test time (test/tmv-smoke.mjs): the vo step, a stats card, a card and the vote. --full-episode makes the
// whole sample and its 11 gates (install.yml: nightly on main, v* tags, by hand, the PR label full-episode).
// Linux CI has no GPU (software WebGL, 2-4 s a frame): the full sample draws at 8 fps, the smoke at 4 (~68 frames), so a slow
// runner still ends under 10 min. The checks are in seconds (length ±0.2 s vs a 0.125 s half-frame at 4 fps, freezedetect 1.5 s).
if (!existsSync(join(dir, 'kit', 'check-reel'))) {
  const sample = join(dir, 'episodes', 'sample');
  if (!existsSync(join(sample, 'sample.mp4'))) fail('the zip has no episodes/sample/sample.mp4 (the buyer must see the sample at once)');
  const full = process.argv.includes('--full-episode'), si = process.argv.indexOf('--style'), style = si > 1 ? process.argv[si + 1] : undefined, fps = process.platform === 'linux' ? ['--fps', full ? '8' : '4'] : [];
  const name = full ? 'ci-full' : 'ci-smoke', ep = join(dir, 'episodes', name);
  const make = steps => ['run', 'node', 'episode/make.mjs', `episodes/${name}`, ...steps, ...fps];
  rmSync(ep, { recursive: true, force: true });
  if (full) {
    cpSync(sample, ep, { recursive: true, filter: f => !/[\\/](out|sample\.mp4)$/.test(f) });
    const ej = join(ep, 'episode.json');
    if (style) writeFileSync(ej, JSON.stringify({ ...JSON.parse(readFileSync(ej, 'utf8')), style }, null, 1));
    // ubuntu-24.04 draws 3.9-4.4 s a frame: the 83 s sample at 8 fps (~680 frames) is ~45-50 min, so 80 min leaves 1.6x
    step('make the full sample episode (render, check, gates)', make(['render', 'check', 'gates']), { timeout: 80 * 60e3 });
  } else {
    const smoke = smokeEpisode(sample, ep, style);
    console.log(`ci-smoke: beats ${smoke.beats.join(', ')} of the sample, ${smoke.seconds.toFixed(1)} s take, style ${style ?? 'of the sample'}`);
    step('make the ci-smoke episode (vo, render, check)', make(['vo', 'render', 'check']), { env: { TMV_VO_TAKE: smoke.take } });
  }
  const rep = JSON.parse(readFileSync(join(ep, 'out', 'check.json'), 'utf8'));
  const bad = rep.checks.filter(c => c.ok !== true && c.ok !== null);
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
