// job.mjs: films/<slug>/job.json, the state of one /make-reel run, rewritten at every step boundary so another app
// can draw the progress from the file. Run from the library root:
//   node core/job.mjs <film> <step> <status> [--files=a,b] [--pct=N] [--qa=9/9] [--style=<slug>] [--type=<name>] [--preset=test] [--change="..."]
// make.mjs, reel.mjs and the draft verify import step() and write their own steps; the agent writes the others.
// Only a film in a films/ folder gets a job.json (a style's demo never does). campaign comes from the front matter of
// the script in workspace/scripts/ (next to films/) named <slug>.md or with `slug: <slug>`, and so does preset
// (core/preset.mjs) when the front matter has one. Each write goes to a temp file that is then renamed, so a reader
// never sees half a file. A tool that marked a step running and then exits with an error marks it failed on the way
// out. A signal kills it at once (no handler can run while it waits on a child step) and leaves the step running with
// the tool's pid: a reader whose pid is gone shows the step as failed.
import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preset } from './preset.mjs';

export const STAGES = ['script', 'voice', 'storyboard', 'chapters', 'audio', 'draft', 'render', 'verify', 'review', 'deliver'];
export const STATUSES = ['pending', 'running', 'done', 'failed', 'waiting'];   // waiting = stopped at a human decision
const OUTPUT_STEPS = ['draft', 'render', 'deliver'];   // the files of these steps, once done, are the job's outputs
const TOP = ['qa', 'style', 'type', 'preset', 'change'];   // change: what a feedback round changed, given with deliver done

const field = (text, k) => {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return (fm && fm[1].match(new RegExp(`^${k}:\\s*['"]?([^'"#\\s]+)`, 'm')) || [])[1];
};
const scriptOf = film => {
  const dir = join(dirname(dirname(film)), 'workspace/scripts'), slug = basename(film), own = join(dir, `${slug}.md`);
  if (existsSync(own)) return readFileSync(own, 'utf8');
  if (!existsSync(dir)) return '';
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(f => readFileSync(join(dir, f), 'utf8')).find(t => field(t, 'slug') === slug) || '';
};

const CLI = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
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
  const s = job.steps.find(x => x.name === name), now = new Date().toISOString();
  if (status === 'running' && s.status !== 'running') { s.started = now; delete s.ended; }   // a pct update keeps started
  if (status === 'done' || status === 'failed') s.ended = now;
  s.status = status;
  if (files) s.files = files.map(f => isAbsolute(f) ? relative(film, f) : f);
  else if (status === 'running') delete s.files;   // a rerun: the last run's files are not this run's
  if (status === 'running' && pct != null) s.pct = +pct; else delete s.pct;
  if (status === 'running' && !CLI) s.pid = process.pid; else delete s.pid;   // the agent's own steps have no pid
  if (name === 'deliver' && status === 'running' && s.started === now) delete job.change;   // a new round's deliver starts with no change
  if (top.preset) preset(top.preset);   // refuse a name core/preset.mjs does not know
  Object.assign(job, top);
  const script = scriptOf(film), fm = field(script, 'preset');
  job.campaign = field(script, 'campaign') ?? job.campaign;
  if (fm) job.preset = preset(fm).name;
  job.outputs = job.steps.filter(x => OUTPUT_STEPS.includes(x.name) && x.status === 'done').flatMap(x => x.files || []);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(job, null, 1) + '\n');
  renameSync(tmp, file);
  running = status === 'running' ? [film, name] : null;
  if (running && !hooked) {
    hooked = true;
    process.on('exit', code => { if (running && code !== 0) step(...running, 'failed'); });
  }
  return file;
}

if (CLI) {
  const [film, name, status, ...rest] = process.argv.slice(2);
  if (!film || !name || !status) {
    console.error(`usage: node core/job.mjs <film> <step> <status> [--files=a,b] [--pct=N] [--qa=9/9] [--style=<slug>] [--type=<name>] [--preset=test] [--change="..."]\n  steps: ${STAGES.join(' ')}\n  statuses: ${STATUSES.join(' ')}`);
    process.exit(2);
  }
  const o = Object.fromEntries(rest.map(a => { const i = a.indexOf('='); return [a.slice(2, i < 0 ? undefined : i), i < 0 ? '' : a.slice(i + 1)]; }));
  try {
    const file = step(film, name, status, { ...o, ...(o.files != null && { files: o.files.split(',').filter(Boolean) }) });
    console.log(file ? `✓ ${file}: ${name} ${status}` : `– ${film} is not in a films/ folder: no job.json`);
  } catch (e) { console.error('✗ ' + e.message); process.exit(2); }
}
