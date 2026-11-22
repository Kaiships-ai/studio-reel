// Render by purpose (styles/stick-man/tools/render/): tiers, the segment cache, the render lock and the Mac Pro job.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../../kit/env.mjs';
import { resolveTier, pixelGateError, sceneFrames } from '../../styles/stick-man/tools/render/tiers.mjs';
import * as cache from '../../styles/stick-man/tools/render/cache.mjs';
import { gitEnv } from '../../styles/stick-man/tools/render/cache.mjs';
import { tryLock, beat, release, stale } from '../../styles/stick-man/tools/render/lock.mjs';
import { jobOf, plan, remote } from '../../styles/stick-man/tools/render/pro.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'stick-tiers-'));
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
// (the pre-push hook sets GIT_DIR: with it, `git init` here rewrote the real repository's config to bare)
const git = (cwd, ...a) => spawnSync('git', a, { cwd, env: gitEnv(), encoding: 'utf8' }).stdout.trim();

test('each tier sets its size; T0 makes no pixels; T4 needs Kai\'s words', () => {
  assert.deepEqual([resolveTier({ tier: 'proof', mp4: 'a.mp4' })].map(t => [t.w, t.h, t.query]), [[480, 854, 'q=proof']]);
  assert.deepEqual([resolveTier({ tier: 'review', mp4: 'a.mp4' })].map(t => [t.w, t.h, t.query]), [[720, 1280, null]]);
  assert.equal(resolveTier({ tier: 'still', out: 'f_%d.png', scenes: '1' }).w, 1080);
  assert.equal(resolveTier({ tier: 'dbg', dbg: 'rows.jsonl' }).pixels, false);
  assert.equal(resolveTier({}), null, 'no --tier: the old flags decide');
  assert.match(resolveTier({ tier: 'final', mp4: 'a.mp4' }).error, /kai-ok/);
  assert.equal(resolveTier({ tier: 'final', mp4: 'a.mp4', 'kai-ok': 'Kai 22/11: render full' }).w, 1080);
  assert.match(resolveTier({ tier: 'dbg', mp4: 'a.mp4' }).error, /data only|no pixels/);
  assert.match(resolveTier({ tier: 'still', mp4: 'a.mp4' }).error, /stills/);
  assert.match(resolveTier({ tier: 'review', w: '1080', mp4: 'a.mp4' }).error, /drop --w/);
  assert.match(resolveTier({ tier: 'proof', scenes: '1', mp4: 'a.mp4' }).error, /--tier still/);
  assert.match(resolveTier({ tier: 'huge' }).error, /pick one of/);
});

test('shot.mjs refuses a T4 render without --kai-ok before it opens a browser', () => {
  const r = spawnSync(process.execPath, ['styles/stick-man/tools/shot.mjs', '--film', 'films/none', '--tier', 'final', '--mp4', 'x.mp4'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
  assert.equal(r.status, 2); assert.match(r.stderr, /kai-ok/);
});

test('pixel gates refuse a T2 proof or anything under 720 wide', () => {
  assert.match(pixelGateError({ tier: 'proof', w: 480, h: 854 }, 'colourgate'), /T3 review render.*tier proof, 480x854/);
  assert.match(pixelGateError({ tier: null, w: 540, h: 960 }, 'colourgate'), /540x960/);
  assert.equal(pixelGateError({ tier: 'review', w: 720, h: 1280 }, 'colourgate'), null);
  assert.equal(pixelGateError({ tier: null, w: 1080, h: 1920 }, 'colourgate'), null);
});

test('T1 --scenes: the middle frame of each storyboard shot, a part reads its episode storyboard', () => {
  const root = tmp(), ep = path.join(root, 'films', 'ep');
  write(ep, 'storyboard.json', JSON.stringify({ last: 300, shots: [{ id: 'S1', f0: 0 }, { id: 'S2', f0: 100 }, { id: 'S3', f0: 160 }] }));
  fs.mkdirSync(path.join(ep, 'parts', 'p1'), { recursive: true });
  assert.deepEqual(sceneFrames(ep), [{ id: 'S1', f: 49 }, { id: 'S2', f: 129 }, { id: 'S3', f: 229 }]);
  assert.deepEqual(sceneFrames(path.join(ep, 'parts', 'p1'), [100, 200]).map(s => s.id), ['S2']);
  assert.throws(() => sceneFrames(path.join(root, 'films', 'nothing-here')), /no storyboard/);
});

test('segment cache: same inputs hit; one changed input, dep or tier misses', () => {
  const root = tmp(), out = path.join(root, 'films/ep/renders/p1.mp4');
  write(root, 'films/ep/reel.js', 'export default 1'); write(root, 'films/ep/shared/car.glb', 'glb v1');
  const inputs = { tier: 'review', w: 720, h: 1280, query: '', frames: '0-99', film: 'films/ep', kit: 'aaa bbb', bible: 'b1', words: 'w1', audio: 'a1' };
  const part = cache.begin(out); fs.writeFileSync(part, 'mp4 frames 0-99');
  cache.finish(root, out, part, inputs, ['films/ep/reel.js', 'films/ep/shared/car.glb']);
  assert.equal(cache.check(root, out, { ...inputs }).hit, true);
  for (const [k, v] of [['kit', 'aaa ccc'], ['frames', '0-100'], ['words', 'w2'], ['bible', 'b2'], ['audio', 'a2'], ['query', 'q=x']])
    assert.deepEqual(cache.check(root, out, { ...inputs, [k]: v }), { hit: false, why: `${k} changed` });
  assert.match(cache.check(root, out, { ...inputs, tier: 'proof', w: 480, h: 854 }).why, /tier review, this is proof/);
  write(root, 'films/ep/shared/car.glb', 'glb v2');
  assert.deepEqual(cache.check(root, out, inputs), { hit: false, why: 'films/ep/shared/car.glb changed' });
  write(root, 'films/ep/shared/car.glb', 'glb v1');
  assert.equal(cache.check(root, out, inputs).hit, true, 'back to the same bytes: a hit again');
  fs.rmSync(out);
  assert.equal(cache.check(root, out, inputs).hit, false, 'the render itself is gone');
});

test('segment cache: a killed render is never a hit', () => {
  const root = tmp(), out = path.join(root, 'films/ep/renders/open.mp4'), deps = ['films/ep/reel.js'];
  write(root, 'films/ep/reel.js', 'export default 1');
  const small = { tier: 'proof', w: 480, h: 854, query: 'q=proof', frames: '0-3', film: 'films/ep', kit: 'k', bible: 'b', words: 'w', audio: 'a' };
  let part = cache.begin(out); fs.writeFileSync(part, 'frames 0-3'); cache.finish(root, out, part, small, deps);
  assert.equal(cache.check(root, out, small).hit, true);
  // a longer render to the same path starts, writes 178 of 401 frames and is killed
  part = cache.begin(out); fs.writeFileSync(part, 'frames 0-177 of 0-400');
  assert.equal(fs.existsSync(out + '.json'), false, 'the old sidecar is gone as soon as a render starts');
  assert.equal(cache.check(root, out, small).hit, false, 'the first inputs again: a miss, not the old render');
  assert.equal(fs.readFileSync(out, 'utf8'), 'frames 0-3', 'the killed render never replaced the mp4');
  // an mp4 overwritten under an old sidecar (a plain --mp4 render, a copy) is not the render the sidecar describes
  part = cache.begin(out); fs.writeFileSync(part, 'frames 0-3'); cache.finish(root, out, part, small, deps);
  fs.writeFileSync(out, 'frames 0-177 of 0-400');
  assert.deepEqual(cache.check(root, out, small), { hit: false, why: 'the mp4 is not the render its sidecar describes' });
});

test('kit stamp: the committed trees, and a different stamp for an uncommitted edit', () => {
  const root = tmp();
  write(root, 'styles/stick-man/engine/look.js', 'a'); write(root, 'kit/env.mjs', 'b');
  git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x');
  const clean = cache.kitStamp(root);
  assert.equal(clean.split(' ').length, 2);
  write(root, 'styles/stick-man/engine/look.js', 'a2');
  const dirty = cache.kitStamp(root);
  assert.match(dirty, /dirty:/); assert.notEqual(dirty, clean);
  write(root, 'styles/stick-man/engine/new.js', 'c');
  assert.notEqual(cache.kitStamp(root), dirty, 'a new untracked kit file counts');
});

test('render lock: one holder, a stale or dead holder is taken over, release frees it', () => {
  const file = path.join(tmp(), 'render.lock');
  const a = tryLock({ file, what: 'A' });
  assert.equal(a.ok, true);
  const b = tryLock({ file, what: 'B' });
  assert.equal(b.ok, false); assert.equal(b.holder.what, 'A');
  assert.equal(beat(file, a.lock, Date.now()), true);
  assert.equal(tryLock({ file, what: 'C', now: Date.now() + 3600000 }).ok, false, 'a live holder on this host is never stale, whatever its beat');
  release(file, a.lock); assert.equal(fs.existsSync(file), false);
  fs.writeFileSync(file, JSON.stringify({ token: 'y', host: 'other-host', pid: 1, what: 'far', started: 0, beat: Date.now() }));
  assert.equal(tryLock({ file, what: 'C' }).ok, false, 'another host, fresh beat: held');
  const c = tryLock({ file, what: 'C', now: Date.now() + 121000 });
  assert.equal(c.ok, true, 'another host, no heartbeat for over the TTL: stale');
  release(file, c.lock);
  fs.writeFileSync(file, JSON.stringify({ token: 'x', host: os.hostname(), pid: 999999, what: 'dead', started: Date.now(), beat: Date.now() }));
  assert.equal(stale(JSON.parse(fs.readFileSync(file, 'utf8'))), true, 'its process is gone');
  const d = tryLock({ file, what: 'D' });
  assert.equal(d.ok, true); release(file, d.lock); assert.equal(fs.existsSync(file), false);
});

test('render lock: many processes on one stale lock, never two holders', async () => {
  const dir = tmp(), file = path.join(dir, 'render.lock'), N = 6, ROUNDS = 20;
  const lockUrl = new URL('../../styles/stick-man/tools/render/lock.mjs', import.meta.url).href;
  const child = path.join(dir, 'race.mjs');
  fs.writeFileSync(child, `import { tryLock } from '${lockUrl}';
const at = Number(process.argv[3]); while (Date.now() < at) {}
const r = tryLock({ file: process.argv[2], what: String(process.pid) });
process.stdout.write(r.ok ? 'HELD' : 'no');
while (Date.now() < at + 1500) {}   // a holder stays alive (a dead one is rightly taken over)`);
  const { spawn } = await import('node:child_process');
  let doubles = 0, none = 0;
  for (let r = 0; r < ROUNDS; r++) {
    fs.writeFileSync(file, JSON.stringify({ token: 'dead', host: os.hostname(), pid: 999999, what: 'killed render', started: 0, beat: 0 }));
    const at = Date.now() + 400;
    const outs = await Promise.all(Array.from({ length: N }, () => new Promise(res => {
      const p = spawn(process.execPath, [child, file, String(at)]); let o = ''; p.stdout.on('data', d => { o += d; }); p.on('close', () => res(o)); })));
    const held = outs.filter(o => o === 'HELD').length;
    if (held > 1) doubles++; if (held === 0) none++;
    fs.rmSync(file, { force: true });
  }
  assert.equal(doubles, 0, `${doubles} of ${ROUNDS} rounds had two holders`);
  assert.ok(none < ROUNDS, 'someone takes the stale lock over');
});

test('Mac Pro job: outputs stay in the episode, the plan syncs, pulls and copies back', () => {
  const args = ['--film', 'films/hm-ep01/parts/gun', '--frames', '1140-1346', '--tier', 'review', '--mp4', 'films/hm-ep01/renders/gun.mp4'];
  assert.deepEqual(jobOf(args), { ep: 'films/hm-ep01', outputs: ['films/hm-ep01/renders/gun.mp4', 'films/hm-ep01/renders/gun.mp4.json'], tier: 'review' });
  assert.throws(() => jobOf([...args.slice(0, 6), '--mp4', '/tmp/gun.mp4']), /under films\/hm-ep01\/renders/);
  assert.throws(() => jobOf([...args.slice(0, 6), '--out', 'films/hm-ep01/f_%d.png']), /under films\/hm-ep01\/renders/, 'stills in the episode folder would pack the episode');
  assert.throws(() => jobOf([...args.slice(0, 6), '--out', 'films/hm-ep01/renders/f_%d.png']), /folder of their own/);
  assert.deepEqual(jobOf([...args.slice(0, 6), '--out', 'films/hm-ep01/renders/t3/f_%d.png']).outputs, ['films/hm-ep01/renders/t3']);
  assert.throws(() => jobOf(['--film', 'films/x', '--tier', 'dbg', '--dbg', 'films/x/r.jsonl']), /pixel renders/);
  assert.throws(() => jobOf(['--film', 'films/x', '--tier', 'final', '--mp4', 'films/x/a.mp4']), /kai-ok/);
  const steps = plan({ shotArgs: args, kit: 'abc', id: 'hm-ep01-1', tmp: '/t' }), by = Object.fromEntries(steps.map(s => [s.what, s]));
  assert.deepEqual(steps.map(s => s.what), ['pack', 'job', 'mkdir', 'send', 'start', 'wait', 'fetch', 'unpack']);
  assert.ok(by.pack.cmd.includes('--exclude=hm-ep01/renders'), 'the Pro keeps its own renders and cache sidecars');
  assert.ok(by.send.cmd.at(-1) === 'pro:stick-sync/hm-ep01-1/');
  assert.deepEqual(by.start.cmd.slice(0, 7), ['orca', 'terminal', 'create', '--environment', 'mac-pro', '--worktree', 'path:/Users/kienbeovl/Desktop/kaiships/studio-reel']);
  assert.match(by.start.cmd[by.start.cmd.indexOf('--command') + 1], /^git pull --ff-only -q origin main && node styles\/stick-man\/tools\/render\/pro\.mjs --remote \$HOME\/stick-sync\/hm-ep01-1; exit$/);
  assert.equal(by.job.json.kit, 'abc');
});

test('Mac Pro side: refuses another kit commit, renders, packs the outputs', () => {
  const root = tmp(), job = tmp();
  write(root, 'README', 'x'); git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x');
  const head = git(root, 'rev-parse', 'HEAD'), src = tmp();
  write(src, 'ep/reel.js', 'export default 1');
  spawnSync('tar', ['-czf', path.join(job, 'job.tgz'), '-C', src, 'ep']);
  const fake = path.join(tmp(), 'shot.mjs');
  fs.writeFileSync(fake, "import fs from 'node:fs'; const i = process.argv.indexOf('--mp4'); fs.mkdirSync('films/ep/renders', { recursive: true }); fs.writeFileSync(process.argv[i + 1], 'mp4'); console.log('rendered');");
  const args = ['--film', 'films/ep', '--tier', 'proof', '--mp4', 'films/ep/renders/a.mp4'];
  fs.writeFileSync(path.join(job, 'job.json'), JSON.stringify({ ep: 'films/ep', kit: 'f'.repeat(40), args, minFreeGB: 0 }));
  assert.match(remote(job, { root, shot: [process.execPath, fake] }).why, /wants ffffffff/);
  fs.writeFileSync(path.join(job, 'job.json'), JSON.stringify({ ep: 'films/ep', kit: head, args, minFreeGB: 0 }));
  const d = remote(job, { root, shot: [process.execPath, fake] });
  assert.equal(d.ok, true, d.why); assert.deepEqual(d.outputs, ['films/ep/renders/a.mp4']);
  assert.ok(fs.existsSync(path.join(root, 'films/ep/reel.js')), 'the episode was unpacked');
  const list = spawnSync('tar', ['-tzf', path.join(job, 'out.tgz')], { encoding: 'utf8' }).stdout.trim().split('\n');
  assert.deepEqual(list, ['ep/renders/a.mp4']);
  assert.ok(JSON.parse(fs.readFileSync(path.join(job, 'done.json'), 'utf8')).ok);
});

test('git for a temp repo ignores the hook\'s GIT_DIR', () => {
  const decoy = tmp(), root = tmp();
  spawnSync('git', ['init', '-q', decoy], { env: gitEnv() });
  const saved = process.env.GIT_DIR; process.env.GIT_DIR = path.join(decoy, '.git');
  try {
    write(root, 'styles/stick-man/a.js', 'a'); write(root, 'kit/b.mjs', 'b');
    git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x');
    assert.equal(cache.kitStamp(root).split(' ').length, 2);
  } finally { if (saved == null) delete process.env.GIT_DIR; else process.env.GIT_DIR = saved; }
  const inDecoy = a => spawnSync('git', a, { cwd: decoy, env: gitEnv(), encoding: 'utf8' });
  assert.equal(inDecoy(['config', 'core.bare']).stdout.trim(), 'false', 'the GIT_DIR repo stays a work-tree repo');
  assert.notEqual(inDecoy(['rev-parse', '-q', '--verify', 'HEAD']).status, 0, 'and got no commit');
});
