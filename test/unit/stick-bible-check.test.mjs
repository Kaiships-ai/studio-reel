// The bible check (styles/stick-man/bible/check.mjs) on small fixture films, and the render gate that runs it before
// tools/render/shot.mjs renders a film. A film under the Hot Money bible (slug hm-ep*) may only use catalog parts: a body action
// keyed by hand where the library has the clip for that body blocks, a missing clip for the body is a gap, an exception
// silences a finding and is counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../../kit/env.mjs';
import { bibleGate } from '../../styles/stick-man/bible/gate.mjs';

const CHECK = path.join(ROOT, 'styles/stick-man/bible/check.mjs');
const SHOT = path.join(ROOT, 'styles/stick-man/tools/render/shot.mjs');
const LIB = `export function buildTrack(keys) { return { keys: keys.map(k => ({ ...k })), use: [] }; }\n`;

// a films root with one film: lib.js (a buildTrack) and reel.js holding one act with `keys` for actor `you`
function film(slug, keys, { spec = 'MAGNATE', head = '', exceptions } = {}) {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bible-check-')), 'films'), dir = path.join(root, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'lib.js'), LIB);
  fs.writeFileSync(path.join(dir, 'reel.js'), [`import { buildTrack } from '/films/${slug}/lib.js';`, head, 'const T = buildTrack([',
    ...keys.map(k => `  ${JSON.stringify(k).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'")},`), ']);',
    `export default { name: 'a1', frames: [0, 40], cast: { you: { spec: '${spec}' } }, anim: { you: T.keys } };`, ''].join('\n'));
  if (exceptions) fs.writeFileSync(path.join(dir, 'bible-exceptions.json'), JSON.stringify(exceptions));
  return dir;
}
const check = dir => {
  const r = spawnSync(process.execPath, [CHECK, dir, '--json'], { encoding: 'utf8', timeout: 120000 });
  return { status: r.status, stderr: r.stderr, rep: r.stdout ? JSON.parse(r.stdout) : null };
};
const STAND = { f: 0, pose: 'STANDP', pos: [0, 0, 0], expr: 'calm' };

test('a sit keyed by hand blocks when the library has the sit clip for that body, and names the clip', () => {
  const { status, rep } = check(film('hm-ep90', [STAND, { f: 10, pose: 'SIT_LOW' }, { f: 20, pose: 'SIT_LOW' }]));
  assert.equal(status, 1);
  const f = rep.findings.find(x => x.rule === 'hand-keyed-action');
  assert.deepEqual({ what: f.what, act: f.act, subject: f.subject, f0: f.f0, f1: f.f1, instead: f.instead, severity: f.severity, file: f.file, line: f.line },
    { what: 'SIT_LOW', act: 'a1', subject: 'you', f0: 10, f1: 20, instead: 'clip.Idle_Sit_Loop', severity: 'block', file: 'films/hm-ep90/reel.js', line: 5 });
  assert.equal(rep.summary.blocking, 1);
  assert.deepEqual(rep.summary.library, { clipActions: 0, handActions: 2, clipFrames: 0, handFrames: 41, actionShare: 0, frameShare: 0 });
});

test('an exception silences that finding, the film passes and the exception is counted', () => {
  const ex = [{ rule: 'hand-keyed-action', where: 'a1/you/SIT_LOW', reason: 'the sit clip has no low stool yet' }];
  const { status, rep } = check(film('hm-ep91', [STAND, { f: 10, pose: 'SIT_LOW' }], { exceptions: ex }));
  assert.equal(status, 0);
  assert.equal(rep.summary.blocking, 0);
  assert.equal(rep.summary.exceptions.used, 1);
  assert.deepEqual(rep.excepted.map(f => [f.rule, f.what, f.reason]), [['hand-keyed-action', 'SIT_LOW', 'the sit clip has no low stool yet']]);
});

test('an exception without a reason is refused', () => {
  const { status, stderr } = check(film('hm-ep92', [STAND], { exceptions: [{ rule: 'hand-keyed-action', where: 'a1' }] }));
  assert.equal(status, 2);
  assert.match(stderr, /no reason/);
});

test('a hand-keyed aim on a thin body is a gap, not a block: the pistol clip exists only for the adult body', () => {
  const head = "import { SPECS } from '/styles/stick-man/engine/play.js';\nimport { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';\nSPECS.FIX_THIN = bodySpec(SPECS.MAGNATE, 'thin');";
  const { status, rep } = check(film('hm-ep93', [STAND, { f: 12, pose: 'C_AIM2' }], { spec: 'FIX_THIN', head }));
  assert.equal(status, 0);
  assert.deepEqual(rep.findings.filter(f => f.severity !== 'info').map(f => [f.rule, f.what, f.severity, f.instead]),
    [['clip-missing-for-body', 'C_AIM2', 'gap', 'clip.Act_PistolShoot_Once']]);
  assert.equal(rep.summary.gaps, 1);
});

test('the same aim on an adult body blocks', () => {
  const { status, rep } = check(film('hm-ep94', [STAND, { f: 12, pose: 'C_AIM2' }]));
  assert.equal(status, 1);
  assert.deepEqual(rep.findings.filter(f => f.severity === 'block').map(f => [f.rule, f.what]), [['hand-keyed-action', 'C_AIM2']]);
});

test('a face the catalog does not have blocks', () => {
  const { status, rep } = check(film('hm-ep95', [STAND, { f: 8, pose: 'STANDP', expr: 'y_nope' }]));
  assert.equal(status, 1);
  const f = rep.findings.find(x => x.rule === 'face-not-in-catalog');
  assert.equal(f.what, 'y_nope');
  assert.match(f.instead, /^face\./);
});

test('a film driven by a catalog clip passes and counts it as library share', () => {
  const { status, rep } = check(film('hm-ep96', [{ f: 0, clip: 'Idle_Sit_Loop', body: 'adult', pos: [0, 0], yaw: 0, expr: 'calm' }]));
  assert.equal(status, 0);
  assert.equal(rep.summary.library.clipActions, 1);
  assert.equal(rep.summary.library.handActions, 0);
  assert.ok(rep.findings.some(f => f.rule === 'trial-part' && f.what === 'clip.Idle_Sit_Loop'), 'trial parts are listed as info');
});

test('a Hot Money bible proof film (slug hm-bible-*) is held to the bible like an episode', () => {
  const { status, rep } = check(film('hm-bible-z9', [STAND, { f: 10, pose: 'SIT_LOW' }, { f: 20, pose: 'SIT_LOW' }]));
  assert.equal(status, 1);
  assert.equal(rep.governed, true);
  assert.ok(rep.findings.some(f => f.rule === 'hand-keyed-action' && f.instead === 'clip.Idle_Sit_Loop'));
});

test('a film no bible governs has nothing to check', () => {
  const { status, rep } = check(film('pilot-z', [STAND, { f: 10, pose: 'SIT_LOW' }]));
  assert.equal(status, 0);
  assert.equal(rep.governed, false);
});

test('a kit page outside films/ (the motion-lib proof reel) is not a film: nothing to check, so its renders are never refused', () => {
  const { status, rep } = check(path.join(ROOT, 'styles/stick-man/motion-lib/proof'));
  assert.equal(status, 0);
  assert.equal(rep.governed, false);
});

test('shot.mjs refuses to render a film whose bible check fails, before any browser starts', () => {
  const dir = film('hm-ep97', [STAND, { f: 10, pose: 'SIT_LOW' }]), out = path.join(dir, 'x.jpg');
  const r = spawnSync(process.execPath, [SHOT, '--film', dir, '--frames', '0', '--out', out], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /render refused: BLOCK 1 blocking/);
  assert.match(r.stderr, /hand-keyed-action {2}a1\/you f10-10 {2}SIT_LOW {2}-> use clip\.Idle_Sit_Loop/);
  assert.equal(fs.existsSync(out), false);
});

test('a bypass lets the render start, warns and logs the reason next to the film', () => {
  const dir = film('hm-ep98', [STAND, { f: 10, pose: 'SIT_LOW' }]);
  assert.equal(bibleGate({ film: dir }).ok, false);
  const g = bibleGate({ film: dir, bypass: 'Kai wants the old cut once', frames: '0-40' });
  assert.equal(g.ok, true);
  assert.match(g.warn, /bypassed/);
  const log = fs.readFileSync(path.join(dir, 'bible-bypass.tsv'), 'utf8').trim().split('\t');
  assert.deepEqual(log.slice(1), [dir, '0-40', 'Kai wants the old cut once', 'BLOCK 1 blocking, 0 gaps, exceptions 0']);
});

test('an act with no name (an episode root stub) is reported under its file, and the markdown report prints', () => {
  const dir = film('hm-ep89', [STAND, { f: 10, pose: 'SIT_LOW' }]);
  fs.writeFileSync(path.join(dir, 'reel.js'), fs.readFileSync(path.join(dir, 'reel.js'), 'utf8').replace("name: 'a1', ", ''));
  const r = spawnSync(process.execPath, [CHECK, dir], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /\| `hand-keyed-action` \| hm-ep89\/reel\.js \/ you \|/);
});
