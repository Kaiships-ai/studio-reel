// job.mjs: films/<slug>/job.json, the state of one /make-reel run, rewritten at every step boundary so another app
// can draw the progress from the file. Run from the library root:
//   node core/job.mjs <film> <step> <status> [--files=a,b] [--pct=N] [--qa=9/9] [--style=<slug>] [--type=<name>]
// make.mjs, reel.mjs and the draft verify import step() and write their own steps; the agent writes the others.
// Only a film in a films/ folder gets a job.json (a style's demo never does). campaign comes from the front matter of
// workspace/scripts/<slug>.md, next to films/. Each write goes to a temp file that is then renamed, so a reader
// never sees half a file. A process that marked a step running and then exits non-zero (a failed step, Ctrl-C,
// kill) marks it failed on the way out; only a SIGKILL leaves it running.
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STAGES = ['script', 'voice', 'storyboard', 'chapters', 'audio', 'draft', 'render', 'verify', 'review', 'deliver'];
export const STATUSES = ['pending', 'running', 'done', 'failed', 'waiting'];   // waiting = stopped at a human decision
const OUTPUT_STEPS = ['draft', 'render', 'deliver'];   // the files of these steps, once done, are the job's outputs
const TOP = ['qa', 'style', 'type'];

const campaignOf = film => {
  const f = join(dirname(dirname(film)), 'workspace/scripts', `${basename(film)}.md`);
  const fm = existsSync(f) && readFileSync(f, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const m = fm && fm[1].match(/^campaign:\s*['"]?([^'"#\s]+)/m);
  return m ? m[1] : null;
};

let running = null, hooked = false;   // [film, step] this process last marked running

export function step(film, name, status, { files, pct, ...top } = {}) {
  if (!STAGES.includes(name)) throw new Error(`unknown step "${name}": use ${STAGES.join(', ')}`);
  if (!STATUSES.includes(status)) throw new Error(`unknown status "${status}": use ${STATUSES.join(', ')}`);
  const bad = Object.keys(top).filter(k => !TOP.includes(k));
  if (bad.length) throw new Error(`unknown field ${bad.join(', ')}: use files, pct, ${TOP.join(', ')}`);
  film = resolve(film);
  if (basename(dirname(film)) !== 'films') return null;
  const file = join(film, 'job.json');
  const job = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8'))
    : { slug: basename(film), campaign: null, steps: STAGES.map(n => ({ name: n, status: 'pending' })), outputs: [] };
  const s = job.steps.find(x => x.name === name);
  s.status = status;
  if (files) s.files = files.map(f => isAbsolute(f) ? relative(film, f) : f);
  if (status === 'running' && pct != null) s.pct = +pct; else delete s.pct;
  Object.assign(job, top);
  job.campaign = campaignOf(film) ?? job.campaign;
  job.outputs = job.steps.filter(x => OUTPUT_STEPS.includes(x.name) && x.status === 'done').flatMap(x => x.files || []);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(job, null, 1) + '\n');
  renameSync(tmp, file);
  running = status === 'running' ? [film, name] : null;
  if (running && !hooked) {
    hooked = true;
    process.on('exit', code => { if (running && code !== 0) step(...running, 'failed'); });
    for (const [sig, n] of [['SIGINT', 2], ['SIGTERM', 15]]) process.on(sig, () => process.exit(128 + n));
  }
  return file;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [film, name, status, ...rest] = process.argv.slice(2);
  if (!film || !name || !status) {
    console.error(`usage: node core/job.mjs <film> <step> <status> [--files=a,b] [--pct=N] [--qa=9/9] [--style=<slug>] [--type=<name>]\n  steps: ${STAGES.join(' ')}\n  statuses: ${STATUSES.join(' ')}`);
    process.exit(2);
  }
  const o = Object.fromEntries(rest.map(a => { const i = a.indexOf('='); return [a.slice(2, i < 0 ? undefined : i), i < 0 ? '' : a.slice(i + 1)]; }));
  try {
    const file = step(film, name, status, { ...o, ...(o.files != null && { files: o.files.split(',').filter(Boolean) }) });
    console.log(file ? `✓ ${file}: ${name} ${status}` : `– ${film} is not in a films/ folder: no job.json`);
  } catch (e) { console.error('✗ ' + e.message); process.exit(2); }
}
