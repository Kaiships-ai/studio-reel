// films/<slug>/job.json, the file Lead Studio draws a /make-reel run from: one fake run, the literal file after each step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { step, STAGES } from '../../core/job.mjs';

const JOB = fileURLToPath(new URL('../../core/job.mjs', import.meta.url));
const library = () => {
  const root = mkdtempSync(join(tmpdir(), 'job-')), film = join(root, 'films/git-r12');
  mkdirSync(film, { recursive: true });
  mkdirSync(join(root, 'workspace/scripts'), { recursive: true });
  const raw = () => JSON.parse(readFileSync(join(film, 'job.json'), 'utf8'));
  // read() leaves out the started/ended stamps, which the stamps test checks on raw()
  return { root, film, raw, read: () => { const j = raw(); return { ...j, steps: j.steps.map(({ started, ended, ...s }) => s) }; } };
};
const steps = (over = {}) => STAGES.map(name => ({ name, status: 'pending', ...over[name] }));

test('a run writes the literal job.json after every step, a failed step and a rerun included', () => {
  const { root, film, read } = library();
  writeFileSync(join(root, 'workspace/scripts/git-r12.md'), '---\nslug: git-r12\ncampaign: git-r12   # the key\nstatus: humanized\n---\n## Script\nHi.\n');
  const base = { slug: 'git-r12', campaign: 'git-r12' };

  step(film, 'script', 'running', { style: 'kai-hand-draw', type: 'listicle' });
  assert.deepEqual(read(), { ...base, steps: steps({ script: { status: 'running', pid: process.pid } }), outputs: [], style: 'kai-hand-draw', type: 'listicle' });

  step(film, 'script', 'done', { files: [join(film, 'vo/script.json')] });
  const script = { status: 'done', files: ['vo/script.json'] };
  assert.deepEqual(read(), { ...base, steps: steps({ script }), outputs: [], style: 'kai-hand-draw', type: 'listicle' });

  step(film, 'voice', 'running');
  step(film, 'voice', 'failed');
  assert.deepEqual(read().steps, steps({ script, voice: { status: 'failed' } }));

  step(film, 'voice', 'done', { files: ['vo/vo.json'] });
  step(film, 'storyboard', 'waiting', { files: ['STORYBOARD.md'] });
  assert.deepEqual(read().steps.slice(0, 3), [
    { name: 'script', ...script },
    { name: 'voice', status: 'done', files: ['vo/vo.json'] },
    { name: 'storyboard', status: 'waiting', files: ['STORYBOARD.md'] },
  ]);

  step(film, 'render', 'running', { pct: 60 });
  assert.deepEqual(read().steps.find(s => s.name === 'render'), { name: 'render', status: 'running', pct: 60, pid: process.pid });
  assert.deepEqual(read().outputs, []);

  step(film, 'render', 'done', { files: ['git-r12.mp4', 'git-r12-cover.png'] });
  step(film, 'verify', 'done', { files: ['out/check/verify.json'], qa: '9/9' });
  step(film, 'deliver', 'done', { files: ['CAPTION.md'] });
  const job = read();
  assert.deepEqual(job.steps.find(s => s.name === 'render'), { name: 'render', status: 'done', files: ['git-r12.mp4', 'git-r12-cover.png'] });
  assert.deepEqual(job.outputs, ['git-r12.mp4', 'git-r12-cover.png', 'CAPTION.md']);
  assert.equal(job.qa, '9/9');
  assert.deepEqual(readdirSync(film), ['job.json']);   // no temp file left behind

  step(film, 'render', 'running');   // a rerun after a fix, killed: last run's files and outputs are gone
  step(film, 'render', 'failed');
  assert.deepEqual(read().steps.find(s => s.name === 'render'), { name: 'render', status: 'failed' });
  assert.deepEqual(read().outputs, ['CAPTION.md']);
});

test('a step is stamped started when it starts running and ended when it is done or failed; a rerun starts over', async () => {
  const { film, raw } = library();
  const at = name => raw().steps.find(s => s.name === name);
  const tick = () => new Promise(r => setTimeout(r, 5));
  const t0 = new Date().toISOString();
  step(film, 'render', 'running', { pct: 10 });
  const { started } = at('render');
  assert.ok(started >= t0 && !isNaN(Date.parse(started)), started);
  assert.equal(at('render').ended, undefined);
  await tick();
  step(film, 'render', 'running', { pct: 50 });   // a pct update is the same run
  assert.equal(at('render').started, started);
  await tick();
  step(film, 'render', 'done', { files: ['git-r12.mp4'] });
  assert.equal(at('render').started, started);
  assert.ok(at('render').ended > started);
  await tick();
  step(film, 'render', 'running');   // a rerun: a new started, no ended
  assert.ok(at('render').started > started);
  assert.equal(at('render').ended, undefined);
  step(film, 'render', 'failed');
  assert.ok(at('render').ended >= at('render').started);
  step(film, 'storyboard', 'waiting');   // waiting and pending get no stamps
  assert.deepEqual(at('storyboard'), { name: 'storyboard', status: 'waiting' });
  assert.deepEqual(at('script'), { name: 'script', status: 'pending' });
});

test('a feedback round ends with deliver done --change, stored as job.change', () => {
  const { film, read } = library();
  const r = spawnSync(process.execPath, [JOB, film, 'deliver', 'done', '--files=CAPTION.md', '--change=hook 2.6 s -> 2.1 s']);
  assert.equal(r.status, 0, r.stderr.toString());
  assert.equal(read().change, 'hook 2.6 s -> 2.1 s');
  assert.deepEqual(read().outputs, ['CAPTION.md']);
});

test('campaign comes from the script whose front matter names the slug, when no file has its name', () => {
  const { root, film, read } = library();
  writeFileSync(join(root, 'workspace/scripts/other.md'), '---\nslug: other\ncampaign: nope\n---\n');
  writeFileSync(join(root, 'workspace/scripts/git-reel-12.md'), '---\nslug: git-r12\ncampaign: "c-77"\n---\n');
  step(film, 'script', 'running');
  assert.equal(read().campaign, 'c-77');
});

test('no script file: campaign is null; a style demo outside films/ gets no job.json', () => {
  const { root, film, read } = library();
  step(film, 'script', 'running');
  assert.equal(read().campaign, null);
  const demo = join(root, 'styles/kai-hand-draw/demo');
  mkdirSync(demo, { recursive: true });
  assert.equal(step(demo, 'render', 'running'), null);
  assert.ok(!existsSync(join(demo, 'job.json')));
});

test('a bad step, status or field is refused', () => {
  const { film } = library();
  assert.throws(() => step(film, 'publish', 'done'), /unknown step "publish"/);
  assert.throws(() => step(film, 'render', 'stuck'), /unknown status "stuck"/);
  assert.throws(() => step(film, 'render', 'done', { slug: 'x' }), /unknown field slug/);
});

test('a step running when the tool exits with an error is marked failed', () => {
  const { film, read, raw } = library();
  const code = `import { step } from ${JSON.stringify(JOB)}; step(${JSON.stringify(film)}, 'render', 'running', { pct: 10 }); process.exit(1);`;
  assert.equal(spawnSync(process.execPath, ['--input-type=module', '-e', code]).status, 1);
  assert.deepEqual(read().steps.find(s => s.name === 'render'), { name: 'render', status: 'failed' });
  assert.ok(raw().steps.find(s => s.name === 'render').ended);
});

// make.mjs runs each step as a blocking child: a plain kill of make.mjs must still stop it at once
test('a plain kill of a tool waiting on a child step stops it at once and leaves the step running with its pid', async () => {
  const { film, read, raw } = library();
  const code = `import { step } from ${JSON.stringify(JOB)}; import { spawnSync } from 'node:child_process';
    step(${JSON.stringify(film)}, 'render', 'running'); spawnSync('sleep', ['5']);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code]);
  while (!existsSync(join(film, 'job.json'))) await new Promise(r => setTimeout(r, 20));
  const t0 = Date.now();
  child.kill('SIGTERM');
  const signal = await new Promise(r => child.on('exit', (c, sig) => r(sig)));
  assert.equal(signal, 'SIGTERM');
  assert.ok(Date.now() - t0 < 1000, `still alive ${Date.now() - t0} ms after kill`);
  assert.deepEqual(read().steps.find(s => s.name === 'render'), { name: 'render', status: 'running', pid: child.pid });
  assert.ok(raw().steps.find(s => s.name === 'render').started);
});

test('the CLI writes a step for the agent', () => {
  const { film, read } = library();
  const r = spawnSync(process.execPath, [JOB, film, 'storyboard', 'done', '--files=STORYBOARD.md,TREATMENT.md', '--type=why']);
  assert.equal(r.status, 0, r.stderr.toString());
  assert.deepEqual(read().steps.find(s => s.name === 'storyboard'), { name: 'storyboard', status: 'done', files: ['STORYBOARD.md', 'TREATMENT.md'] });
  assert.equal(read().type, 'why');
  assert.equal(spawnSync(process.execPath, [JOB, film, 'render', 'stuck']).status, 2);
});
