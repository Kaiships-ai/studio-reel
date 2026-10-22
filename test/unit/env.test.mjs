// node --test test/unit — derive() for every OS, without touching the disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { derive } from '../../kit/env.mjs';

const ROOT = '/kits/Kaiships Studio';
const facts = (os, files, more = {}) => ({
  os, arch: 'x64', root: ROOT, cores: 8, angle: '', lockHash: 'a', envLockHash: 'a',
  exists: p => files.some(f => p === join(ROOT, f)), ...more,
});
const npm = 'node_modules/p5.brush/package.json';
const prefix = '.pixi/envs/default';

test('macOS: tools from the pixi prefix bin, Metal, no SwiftShader flag', () => {
  const E = derive(facts('darwin', [npm, `${prefix}/bin/python`, `${prefix}/bin/ffmpeg`, `${prefix}/bin/ffprobe`]));
  assert.equal(E.ok, true);
  assert.equal(E.tools.python, join(ROOT, prefix, 'bin/python'));
  assert.ok(E.browser.args.includes('--use-angle=metal'));
  assert.ok(!E.browser.args.includes('--enable-unsafe-swiftshader'));
  assert.equal(E.workers, 4);
});

test('Windows: python.exe at the prefix root, ffmpeg.exe in Library\\bin, SwiftShader allowed as fallback', () => {
  const E = derive(facts('win32', [npm, `${prefix}/python.exe`, `${prefix}/Library/bin/ffmpeg.exe`, `${prefix}/Library/bin/ffprobe.exe`]));
  assert.equal(E.ok, true, JSON.stringify(E.problems));
  assert.equal(E.tools.python, join(ROOT, prefix, 'python.exe'));
  assert.equal(E.tools.ffmpeg, join(ROOT, prefix, 'Library/bin/ffmpeg.exe'));
  assert.ok(E.browser.args.includes('--enable-unsafe-swiftshader'));
  assert.ok(!E.browser.args.some(a => a.startsWith('--use-angle')));
  assert.equal(E.childEnv.PYTHONUTF8, '1');
});

test('Linux: same layout as macOS, GPU default with SwiftShader fallback', () => {
  const E = derive(facts('linux', [npm, `${prefix}/bin/python`, `${prefix}/bin/ffmpeg`, `${prefix}/bin/ffprobe`]));
  assert.equal(E.ok, true);
  assert.ok(E.browser.args.includes('--enable-unsafe-swiftshader'));
});

test('never uses a .venv or a system tool: nothing installed means one fix line per tool', () => {
  const E = derive(facts('darwin', ['.venv/bin/python']));
  assert.equal(E.ok, false);
  assert.deepEqual(E.problems.map(p => p.id).sort(), ['ffmpeg', 'ffprobe', 'npm', 'python']);
  assert.ok(E.problems.every(p => p.fix === 'pixi run studio install'));
});

test('a changed pixi.lock asks for a reinstall', () => {
  const E = derive(facts('linux', [npm, `${prefix}/bin/python`, `${prefix}/bin/ffmpeg`, `${prefix}/bin/ffprobe`], { lockHash: 'new', envLockHash: 'old' }));
  assert.deepEqual(E.problems.map(p => p.id), ['stale']);
});

test('STUDIO_ANGLE overrides the GPU backend; small machines get fewer workers', () => {
  const E = derive(facts('linux', [npm], { angle: 'swiftshader', cores: 2 }));
  assert.ok(E.browser.args.includes('--use-angle=swiftshader'));
  assert.equal(E.workers, 1);
});
