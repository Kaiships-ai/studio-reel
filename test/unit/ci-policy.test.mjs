// Actions minutes are a monthly budget on a private repo (macOS x10, Windows x2). Kai: "not every PR runs the
// install tests". These checks fail when a workflow change would spend minutes on every PR again.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { TIERS, fullEpisode, tierNeeded, zipEntries } from '../../release/install-needed.mjs';
import { classify, parseManifest, tierFiles, zip } from '../../release/build.mjs';

const WF = join(ROOT, '.github', 'workflows');
const read = f => readFileSync(join(WF, f), 'utf8');
const section = (y, key) => (y.match(new RegExp(`^  ${key}:\\n((?:    .*\\n|\\s*\\n)*)`, 'm')) || [])[1] || '';

test('install.yml: PRs are path-filtered, no branch pushes, five machines only when FULL', () => {
  const y = read('install.yml');
  assert.match(section(y, 'pull_request'), /paths:/, 'install.yml pull_request needs a paths: filter');
  assert.doesNotMatch(section(y, 'push'), /branches:/, 'install.yml must not run on branch pushes (tags only)');
  assert.match(y, /cancel-in-progress: true/);
  for (const line of y.split('\n').filter(l => /windows-|macos-/.test(l) && /m=/.test(l)))
    assert.match(line, /\$FULL" = true/, `windows/macOS added to the matrix outside the FULL branch: ${line.trim()}`);
});

test('only checks.yml runs on every PR, and only on Linux', () => {
  for (const f of readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) {
    const y = read(f), pr = section(y.replace(/^on:\n/m, ''), 'pull_request');
    if (!/^\s*pull_request:/m.test(y) || /paths:/.test(pr)) continue;
    assert.equal(f, 'checks.yml', `${f} runs on every PR: add a paths: filter or move the job into checks.yml`);
    assert.doesNotMatch(y, /runs-on:.*(windows|macos)/, 'checks.yml must stay on Linux');
  }
});

const FILES = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const MANIFEST = parseManifest(readFileSync(join(ROOT, 'kit.manifest'), 'utf8'));
const zips = (edited = []) => {
  const blobs = new Map(FILES.map(f => [f, Buffer.from(edited.includes(f) ? `${f} edited` : f)])), { by } = classify(FILES, MANIFEST);
  return Object.fromEntries(TIERS.map(t => {
    const { list, blob } = tierFiles(t, by, MANIFEST, blobs);
    return [t, zipEntries(zip(list.map(f => ({ name: `kit/${f}`, data: blob(f) })), '2026-01-01T00:00:00Z'))];
  }));
};
const BASE = zips();
const tiers = edited => { const head = zips(edited); return TIERS.filter(t => tierNeeded(edited, BASE[t], head[t]).run); };

test('install test runs exactly the tiers whose zip a change reaches', () => {
  assert.deepEqual(tiers(['tmv/episode/make.mjs']), ['tmv'], 'a tmv engine change runs tmv and only tmv');
  assert.deepEqual(tiers(['tmv/README.md', 'core/README.md']), [], 'docs that ship change no install');
  assert.deepEqual(tiers(['core/render/mux.mjs']), ['pro', 'tmv'], 'core code ships in both zips');
  assert.deepEqual(tiers(['.claude/skills/verify/SKILL.md', 'test/unit/ci-policy.test.mjs']), [], 'dev-only files are in no zip');
  assert.deepEqual(tiers(['test/clean-install.mjs']), ['pro', 'tmv'], 'a change to the test itself runs both');
  assert.deepEqual(tiers(['test/tmv-smoke.mjs']), ['pro', 'tmv'], 'so does a change to the ci-smoke episode');
});

test('zipEntries reads back what zip wrote, stored and deflated', () => {
  const big = Buffer.alloc(4096, 'a'), z = zip([{ name: 'k/a.txt', data: Buffer.from('hi') }, { name: 'k/d/b.bin', data: big }], '2026-01-01T00:00:00Z');
  assert.deepEqual([...zipEntries(z)], [['a.txt', `${zlib.crc32(Buffer.from('hi')) >>> 0}:2`], ['d/b.bin', `${zlib.crc32(big) >>> 0}:4096`]]);
});

test('the whole tmv sample runs nightly on main, for a tag, by hand or with the PR label full-episode; a plain PR makes ci-smoke', () => {
  assert.equal(fullEpisode({ event: 'schedule', ref: 'refs/heads/main' }), true);
  assert.equal(fullEpisode({ event: 'schedule', ref: 'refs/heads/ci/x' }), false, 'a schedule runs the full episode only on main');
  assert.equal(fullEpisode({ event: 'pull_request', ref: 'refs/pull/9/merge', labels: [] }), false, 'a plain PR never runs the full episode');
  assert.equal(fullEpisode({ event: 'pull_request', ref: 'refs/pull/9/merge', labels: ['test-all-os'] }), false);
  assert.equal(fullEpisode({ event: 'pull_request', ref: 'refs/pull/9/merge', labels: ['full-episode'] }), true);
  assert.equal(fullEpisode({ event: 'push', ref: 'refs/tags/v1.6.0' }), true);
  assert.equal(fullEpisode({ event: 'workflow_dispatch', ref: 'refs/heads/main' }), true);
  assert.equal(fullEpisode({ event: 'pull_request', ref: 'refs/pull/9/merge', labels: ['full-episode'], base: 'lane/paper' }), false, 'a lane PR never runs the full episode');
  assert.equal(fullEpisode({ event: 'pull_request', ref: 'refs/pull/9/merge', labels: ['full-episode'], base: 'main' }), true, 'a lane to main PR with the label does');
  const y = read('install.yml');
  assert.match(y, /full=\$\(node release\/install-needed\.mjs --full-episode\); full=\$\{full#full=\}/, 'the matrix step decides the episode with fullEpisode()');
  assert.deepEqual(y.match(/--full-episode/g).length, 2, 'the clean-install run passes --full-episode only from matrix.episode');
  assert.match(y, /test\/clean-install\.mjs "[^"]+" \$\{\{ matrix\.episode == 'full' && '--full-episode' \|\| '' \}\}/);
  assert.deepEqual(y.split('\n').filter(l => /"episode":/.test(l)).map(l => /ubuntu/.test(l) && !/windows|macos/.test(l)), [true], 'the full episode runs on the Linux tmv leg only');
});

test('lane/** PRs: checks run, never the five machines, main PRs unchanged', () => {
  for (const f of ['checks.yml', 'install.yml']) {
    const y = read(f);
    assert.match(section(y.replace(/^on:\n/m, ''), 'pull_request'), /branches: \[main, 'lane\/\*\*'\]/, `${f} runs for PRs into main and lane/**`);
  }
  const full = read('install.yml').match(/^ {10}FULL: (.*)$/m)[1];
  assert.match(full, /startsWith\(github\.ref, 'refs\/tags\/v'\)/, 'tags stay FULL');
  assert.match(full, /workflow_dispatch/, 'manual runs stay FULL');
  assert.match(full, /'test-all-os'\) && !startsWith\(github\.base_ref, 'lane\/'\)/, 'the test-all-os label never makes a lane PR FULL');
});
