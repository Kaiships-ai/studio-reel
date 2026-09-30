// setup.mjs: one-time setup for the Kaiships Reel Kit. Safe to run again: it skips whatever is already in place.
//   node setup.mjs                  check everything, install what is missing, write .kit-env.json
//   node setup.mjs --local-chrome   download a Chrome into the kit even if one is installed
//   node setup.mjs --local-ffmpeg   download ffmpeg into the kit even if it is installed
// Nothing is installed globally and nothing needs sudo: npm packages go to node_modules/, Python packages to .venv/,
// downloaded tools to .tools/.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { ROOT, ENV_FILE } from './kitenv.mjs';

const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';
const flags = new Set(process.argv.slice(2));
const TOOLS = join(ROOT, '.tools');
const results = [];
const ok = (name, detail) => { results.push([true, name, detail]); console.log(`  ✓ ${name}: ${detail}`); };
const bad = (name, detail, fix) => { results.push([false, name, detail, fix]); console.log(`  ✗ ${name}: ${detail}`); };
const step = s => console.log(`\n${s}`);

// Run a program and capture its output. npm/npx are .cmd files on Windows, which need a shell.
function run(cmd, args = [], o = {}) {
  const shell = WIN && /^(npm|npx)$/.test(cmd);
  const r = spawnSync(shell ? `${cmd} ${args.map(a => /\s/.test(a) ? `"${a}"` : a).join(' ')}` : cmd, shell ? [] : args,
    { cwd: o.cwd || ROOT, encoding: 'utf8', shell, stdio: o.show ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'], timeout: o.timeout || 900000, env: { ...process.env, ...(o.env || {}) } });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), stdout: r.stdout || '' };
}
const rel = p => { const r = relative(ROOT, p); return r && !r.startsWith('..') && !isAbsolute(r) ? r.split('\\').join('/') : p; };

console.log('Kaiships Reel Kit setup');

// ---------- 1. Node ----------
step('1/5 Node.js');
const nodeMajor = +process.versions.node.split('.')[0];
if (nodeMajor >= 18) ok('Node.js', `v${process.versions.node}`);
else bad('Node.js', `v${process.versions.node} is too old`, 'Install Node.js 18 or newer from https://nodejs.org, then run: node setup.mjs');

// ---------- 2. npm packages ----------
step('2/5 npm packages (p5, p5.brush, puppeteer-core)');
const need = ['p5', 'p5.brush', 'puppeteer-core'], have = () => need.every(n => existsSync(join(ROOT, 'node_modules', n, 'package.json')));
if (have()) ok('npm packages', 'already installed');
else {
  console.log('  installing…');
  const r = run('npm', ['install', '--no-audit', '--no-fund']);
  if (r.ok && have()) ok('npm packages', 'installed');
  else bad('npm packages', 'npm install failed', `Run "npm install" in this folder and read the error.\n${r.out.trim().split('\n').slice(-6).join('\n')}`);
}

// ---------- 3. Python venv: edge-tts (voiceover) and numpy (music + SFX) ----------
step('3/5 Python (.venv with edge-tts and numpy)');
const venvPy = join(ROOT, '.venv', WIN ? 'Scripts/python.exe' : 'bin/python');
const imports = () => existsSync(venvPy) && run(venvPy, ['-c', 'import edge_tts, numpy']).ok;
let python = null;
if (imports()) { python = venvPy; ok('Python venv', 'already set up'); }
else {
  // find a system Python 3.9+
  let sys = null, found = '';
  for (const [cmd, pre] of [['python3', []], ['python', []], ['py', ['-3']]]) {
    const r = run(cmd, [...pre, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])']);
    const m = r.ok && r.stdout.trim().match(/^(\d+)\.(\d+)$/);
    if (m && (+m[1] > 3 || (+m[1] === 3 && +m[2] >= 9))) { sys = [cmd, pre]; found = r.stdout.trim(); break; }
  }
  if (!sys) {
    bad('Python', 'Python 3.9 or newer was not found',
      WIN ? 'Install it without admin rights: winget install --scope user Python.Python.3.12   (or https://www.python.org/downloads/), open a new terminal, then run: node setup.mjs'
        : MAC ? 'Install it: brew install python   (or https://www.python.org/downloads/), then run: node setup.mjs'
          : 'Install it with your package manager (python3 and python3-venv), then run: node setup.mjs');
  } else {
    console.log(`  Python ${found} found; creating .venv and installing packages…`);
    const mk = existsSync(venvPy) ? { ok: true } : run(sys[0], [...sys[1], '-m', 'venv', join(ROOT, '.venv')]);
    const pip = mk.ok && run(venvPy, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', join(ROOT, 'requirements.txt')]);
    if (mk.ok && pip.ok && imports()) { python = venvPy; ok('Python venv', `Python ${found}, edge-tts and numpy installed`); }
    else bad('Python venv', mk.ok ? 'pip install failed' : 'could not create .venv',
      (mk.ok ? pip.out : mk.out || '').trim().split('\n').slice(-6).join('\n') + (!WIN && !MAC ? '\nOn Debian/Ubuntu the venv module is a separate package: python3-venv.' : ''));
  }
}

// ---------- 4. Chrome ----------
step('4/5 Chrome or Chromium (renders the frames)');
function systemChromes() {
  const L = process.env.LOCALAPPDATA || '', P = process.env.PROGRAMFILES || 'C:/Program Files', P86 = process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)';
  const list = [process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    `${P}/Google/Chrome/Application/chrome.exe`, `${P86}/Google/Chrome/Application/chrome.exe`, L && `${L}/Google/Chrome/Application/chrome.exe`,
    `${P86}/Microsoft/Edge/Application/msedge.exe`, `${P}/Microsoft/Edge/Application/msedge.exe`,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
  const pw = `${homedir()}/.cache/ms-playwright`;
  if (existsSync(pw)) for (const n of readdirSync(pw).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => b.split('-')[1] - a.split('-')[1])) list.push(`${pw}/${n}/chrome-linux64/chrome`);
  return list.filter(Boolean);
}
// A Chrome this kit downloaded earlier: .tools/chrome/chrome/<platform>-<version>/…/<binary>
function localChrome() {
  const base = join(TOOLS, 'chrome', 'chrome');
  if (!existsSync(base)) return null;
  for (const d of readdirSync(base).sort().reverse()) {
    const root = join(base, d);
    for (const p of [`chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, `chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
      'chrome-win64/chrome.exe', 'chrome-win32/chrome.exe', 'chrome-linux64/chrome']) if (existsSync(join(root, p))) return join(root, p);
  }
  return null;
}
let chrome = flags.has('--local-chrome') ? null : systemChromes().find(p => existsSync(p)) || null;
if (chrome) ok('Chrome', chrome);
else {
  chrome = localChrome();
  if (chrome) ok('Chrome', `kit copy: ${rel(chrome)}`);
  else {
    console.log('  no Chrome found; downloading one into .tools/chrome (about 150 MB)…');
    mkdirSync(TOOLS, { recursive: true });
    const r = run('npx', ['--yes', '@puppeteer/browsers', 'install', 'chrome@stable', '--path', join(TOOLS, 'chrome')]);
    // the last line of its output is "chrome@<version> <path to the binary>"
    const line = r.stdout.trim().split('\n').reverse().find(l => /^chrome@\S+ /.test(l));
    chrome = (line && line.replace(/^chrome@\S+ /, '').trim()) || localChrome();
    if (chrome && existsSync(chrome)) ok('Chrome', `downloaded: ${rel(chrome)}`);
    else { chrome = null; bad('Chrome', 'download failed', `Install Google Chrome from https://www.google.com/chrome/ then run: node setup.mjs\n${r.out.trim().split('\n').slice(-4).join('\n')}`); }
  }
}
if (chrome && process.platform === 'linux' && chrome.startsWith(TOOLS) && !run(chrome, ['--version']).ok)
  console.log('  note: the downloaded Chrome does not start. It needs system libraries: see https://pptr.dev/troubleshooting (or install Chrome/Chromium with your package manager).');

// ---------- 5. ffmpeg ----------
step('5/5 ffmpeg (voiceover, audio mix, MP4)');
const ffOK = p => { const r = run(p, ['-hide_banner', '-encoders']); return r.ok && /libx264/.test(r.out) && /\baac\b/.test(r.out); };
function localFF() {
  if (!existsSync(join(TOOLS, 'node_modules', 'ffmpeg-static'))) return null;
  try { return createRequire(join(TOOLS, 'x.js'))('ffmpeg-static'); } catch { return null; }
}
// The kit only needs ffmpeg itself (make.mjs verify reads the MP4 with it, so ffprobe is not required).
let ffmpeg = null;
if (!flags.has('--local-ffmpeg') && ffOK('ffmpeg')) { ffmpeg = 'ffmpeg'; ok('ffmpeg', 'found on PATH (with libx264 and aac)'); }
else {
  ffmpeg = localFF();
  if (!(ffmpeg && existsSync(ffmpeg))) {
    console.log('  no usable ffmpeg on PATH; installing a static build into .tools (about 50 MB)…');
    mkdirSync(TOOLS, { recursive: true });
    if (!existsSync(join(TOOLS, 'package.json'))) writeFileSync(join(TOOLS, 'package.json'), JSON.stringify({ name: 'kit-tools', private: true }, null, 2));
    const r = run('npm', ['install', '--no-audit', '--no-fund', 'ffmpeg-static'], { cwd: TOOLS });
    ffmpeg = localFF();
    if (!r.ok) console.log(r.out.trim().split('\n').slice(-4).join('\n'));
  }
  if (ffmpeg && ffOK(ffmpeg)) ok('ffmpeg', `kit copy: ${rel(ffmpeg)}`);
  else {
    ffmpeg = null;
    bad('ffmpeg', 'could not install a static build',
      WIN ? 'Install it: winget install --scope user Gyan.FFmpeg, open a new terminal, then run: node setup.mjs' : MAC ? 'Install it: brew install ffmpeg, then run: node setup.mjs' : 'Install ffmpeg with your package manager, then run: node setup.mjs');
  }
}

// ---------- write .kit-env.json ----------
const env = { note: 'Written by setup.mjs. Delete this file and run "node setup.mjs" to rebuild it.', platform: process.platform };
if (python) env.python = rel(python);
if (chrome) env.chrome = rel(chrome);
if (ffmpeg) env.ffmpeg = rel(ffmpeg);
writeFileSync(ENV_FILE, JSON.stringify(env, null, 2) + '\n');

const fails = results.filter(r => !r[0]);
console.log('\n──────── summary ────────');
for (const [good, name, detail] of results) console.log(`${good ? '✓' : '✗'} ${name}: ${String(detail).split('\n')[0]}`);
if (fails.length) {
  console.log('\nTo fix:');
  for (const [, name, , fix] of fails) console.log(`- ${name}: ${fix}`);
  console.log('\nSetup is NOT complete.');
  process.exit(1);
}
console.log('\nSetup complete. Wrote .kit-env.json. Render the example with: node make.mjs');
