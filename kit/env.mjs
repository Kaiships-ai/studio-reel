// kit/env.mjs: the one place that knows where Kaiships Studio's tools live, on every OS.
// Every other script asks env() for paths and starts tools with run(); nothing else spawns python/ffmpeg by name.
// Tools come from the pixi environment in <root>/.pixi/envs/default (pixi.toml + pixi.lock own the versions).
// Paths are derived on each call from the folder this file is in, never stored, so a moved folder keeps working.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { dirname, join, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TOOLS = ['python', 'ffmpeg', 'ffprobe'];

// Where a conda/pixi prefix keeps each tool, per OS. The first candidate that exists wins.
const LAYOUT = {
  win32: { bins: p => [join(p, 'Library', 'bin'), join(p, 'Scripts'), p], python: p => [join(p, 'python.exe')], exe: '.exe' },
  darwin: { bins: p => [join(p, 'bin')], python: p => [join(p, 'bin', 'python')], exe: '' },
  linux: { bins: p => [join(p, 'bin')], python: p => [join(p, 'bin', 'python')], exe: '' },
};

const FIX_INSTALL = 'pixi run studio install';

/** Pure: derive the environment from observed facts. Unit-tested for every OS; no I/O here. */
export function derive({ os, arch, root, cores, exists, angle, lockHash, envLockHash, envName }) {
  const L = LAYOUT[os];
  const problems = [];
  if (!L) return { ok: false, os, arch, root, problems: [{ id: 'os', what: `unsupported system "${os}"`, fix: 'use macOS, Windows or Linux' }] };
  const prefix = join(root, '.pixi', 'envs', envName || 'default');
  const bins = L.bins(prefix);
  const find = list => list.find(exists) || null;
  const tools = {
    python: find(L.python(prefix)),
    ffmpeg: find(bins.map(b => join(b, 'ffmpeg' + L.exe))),
    ffprobe: find(bins.map(b => join(b, 'ffprobe' + L.exe))),
  };
  for (const t of TOOLS) if (!tools[t]) problems.push({ id: t, what: `${t} is not installed in this folder yet`, fix: FIX_INSTALL });
  if (!exists(join(root, 'node_modules', 'p5.brush', 'package.json'))) problems.push({ id: 'npm', what: 'the drawing packages (p5, p5.brush) are not installed yet', fix: FIX_INSTALL });
  if (lockHash && envLockHash && lockHash !== envLockHash) problems.push({ id: 'stale', what: 'the tool versions changed since the last install (this is normal after an update)', fix: FIX_INSTALL });
  // macOS: Metal. Elsewhere: the system GPU, with SwiftShader allowed as a fallback when there is none (CI, VMs).
  // Since Chromium ~M139 that fallback needs --enable-unsafe-swiftshader; it never replaces a working GPU.
  const a = angle || (os === 'darwin' ? 'metal' : 'default');
  const browserArgs = [
    ...(a === 'default' ? [] : [`--use-angle=${a}`]),
    ...(os === 'darwin' && a === 'metal' ? [] : ['--enable-unsafe-swiftshader']),
    '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb',
  ];
  const binPath = bins.filter(exists);
  return {
    ok: problems.length === 0, problems, os, arch, root, prefix, tools,
    browser: { args: browserArgs },
    workers: Math.max(1, Math.min(4, Math.floor(cores / 2))),
    // Children get the pixi tools first on PATH, UTF-8 Python on every OS (Windows pipes default to cp1252).
    childEnv: {
      PATH: [...binPath, process.env.PATH || process.env.Path || ''].join(delimiter),
      PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8',
      ...(tools.ffmpeg ? { FFMPEG: tools.ffmpeg } : {}), ...(tools.ffprobe ? { FFPROBE: tools.ffprobe } : {}),
    },
  };
}

const sha = f => { try { return createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16); } catch { return ''; } };
export const lockHash = () => sha(join(ROOT, 'pixi.lock'));
export const installMarker = () => join(ROOT, '.pixi', 'studio-installed');

let cached = null;
/** The environment of this folder, computed once per process. */
export function env() {
  if (cached) return cached;
  let envLockHash = '';
  try { envLockHash = readFileSync(installMarker(), 'utf8').trim(); } catch {}
  cached = derive({
    os: process.platform, arch: process.arch, root: ROOT, cores: cpus().length, exists: existsSync,
    angle: process.env.STUDIO_ANGLE || process.env.LEMO_ANGLE || '', lockHash: lockHash(), envLockHash,
    envName: process.env.PIXI_ENVIRONMENT_NAME || 'default',
  });
  return cached;
}

/** Print what is missing, one ✗ and one fix line each, and exit. Never a stack trace. */
export function requireReady(E = env(), only = null) {
  const ps = E.problems.filter(p => !only || only.includes(p.id) || p.id === 'os');
  if (!ps.length) return E;
  for (const p of ps) console.error(`✗ ${p.what}\n  fix: ${p.fix}`);
  process.exit(1);
}

/**
 * The only way to start a tool. `tool` is 'node', 'python', 'ffmpeg' or 'ffprobe', never a path.
 * Runs without a shell (paths with spaces are safe), from the library root, with the pixi tools first on PATH.
 * opts: { capture: true } returns stdout/stderr as text; otherwise output is shown. Returns the spawnSync result.
 */
export function run(tool, args, opts = {}) {
  const E = env();
  const cmd = tool === 'node' ? process.execPath : E.tools?.[tool];
  if (!cmd) requireReady(E, [tool]);
  const { capture, env: extra, ...rest } = opts;
  return spawnSync(cmd, args, {
    cwd: ROOT, shell: false, windowsHide: true,
    stdio: capture ? 'pipe' : 'inherit', encoding: capture ? 'utf8' : undefined, maxBuffer: 64 << 20,
    env: childEnv(extra), ...rest,
  });
}

/** Same as run(), but streaming (returns the ChildProcess), for ffmpeg reading frames from a pipe. */
export function start(tool, args, opts = {}) {
  const E = env();
  const cmd = tool === 'node' ? process.execPath : E.tools?.[tool];
  if (!cmd) requireReady(E, [tool]);
  const { env: extra, ...rest } = opts;
  return spawn(cmd, args, { cwd: ROOT, shell: false, windowsHide: true, env: childEnv(extra), ...rest });
}

/** process.env plus the pixi PATH and UTF-8 settings. Windows spells PATH "Path": keep exactly one key. */
export function childEnv(extra = {}) {
  const base = { ...process.env };
  for (const k of Object.keys(base)) if (k.toUpperCase() === 'PATH') delete base[k];
  return { ...base, ...env().childEnv, ...extra };
}
