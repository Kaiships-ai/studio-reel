import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TOOL = path.join(ROOT, 'styles/stick-man/tools/status.mjs');
const FX = 'test/fixtures/worker-status';
const run = (...args) => spawnSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8' });

test('status.mjs leads with the post copy and its approval, then stage, latest, kit, publish state, limits and verbs', () => {
  const r = run(`${FX}/ok`);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n');
  assert.match(lines[1], /^POST COPY = test\/fixtures\/worker-status\/ok\/deliver\/current\.mp4 \(0 MB, \d{4}-\d\d-\d\d \d\d:\d\d\) \(kai_approved by Kai 2026-11-22 10:00\)$/);
  assert.ok(!r.stdout.includes('WARNING'), 'an mp4 in deliver/archive/ is not a stray cut');
  assert.match(r.stdout, /stage {4}K2: Kai reviews A v2/);
  assert.match(r.stdout, /latest {3}A v2 test\/fixtures\/worker-status\/ok\/renders\/fx_A_v2\.mp4/);
  assert.match(r.stdout, /kit {6}rendered on abc1234 · repo now \w+/);
  assert.match(r.stdout, /published r2 https:\/\/example\.invalid\/fx\.mp4/);
  assert.match(r.stdout, /stale {4}fx_A_v1\.mp4 is an old cut/);
  assert.match(r.stdout, /cannot\n {2}- post anywhere/);
  for (const v of ['status <film>', 'render <film> [part] [--on pro]']) assert.ok(r.stdout.includes(v), v);
  assert.ok(!/review <film>|version <film>/.test(r.stdout), 'only status and render are verbs');
});

test('status.mjs warns about an mp4 in deliver/ outside archive/', () => {
  const r = run(`${FX}/stray`);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /WARNING {2}test\/fixtures\/worker-status\/stray\/deliver\/hook-alt\.mp4 sits in deliver\/ outside archive\//);
  assert.equal(r.stdout.match(/WARNING/g).length, 1);
});

test('status.mjs --json gives the parsed file, both renders, the strays and the head', () => {
  const r = run(`${FX}/ok`, '--json');
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.status.approval.state, 'kai_approved');
  assert.equal(j.post_copy.path, `${FX}/ok/deliver/current.mp4`);
  assert.equal(j.latest.path, `${FX}/ok/renders/fx_A_v2.mp4`);
  assert.deepEqual(j.stray, []);
  assert.ok(j.head.length > 0);
  assert.deepEqual(Object.keys(j.verbs), ['status <film>', 'render <film> [part] [--on pro]']);
});

test('status.mjs exits 1 with the reason for a missing file, missing keys, a bad approval or a missing render', () => {
  const cases = [
    ['nowhere', /status\.json is missing/],
    ['bad', /lacks: stage, kit_commit, latest\.mp4, deliver\.current, approval\.state, needs, published, worker_cannot/],
    ['bad-approval', /approval\.state "approved" is not one of draft, waiting_kai, kai_approved, posted/],
    ['no-mp4', /latest\.mp4 test\/fixtures\/worker-status\/no-mp4\/renders\/gone\.mp4 does not exist/],
  ];
  for (const [name, why] of cases) {
    const r = run(`${FX}/${name}`);
    assert.equal(r.status, 1, name);
    assert.match(r.stderr, why, name);
  }
});

test('the new-film template passes status.mjs before anything is rendered', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-status-'));
  try {
    fs.copyFileSync(path.join(ROOT, '.claude/skills/make-reel-stick-man/templates/status.json'), path.join(dir, 'status.json'));
    const r = run(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /POST COPY = none yet \(draft, NOT approved to post\)/);
    assert.match(r.stdout, /no render yet/);
    assert.match(r.stdout, /published nowhere yet/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
