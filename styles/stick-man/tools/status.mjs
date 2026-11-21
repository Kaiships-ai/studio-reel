// Where a film stands, read from films/<film>/status.json, never from memory. A worker's first command (WORKER.md).
//   node styles/stick-man/tools/status.mjs films/<film> [--json]
import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const VERBS = {
  'status <film>': 'this summary',
  'render <film> [part] [--on pro]': 'render the film or one part at 720p, here through the render lock or on the Mac Pro',
};

const REQUIRED = ['series', 'ep', 'film', 'status', 'stage', 'kit_commit', 'latest.mp4', 'deliver.current', 'approval.state',
  'needs', 'published', 'worker_can', 'worker_cannot'];
const LISTS = ['worker_can', 'worker_cannot'];
export const APPROVAL = ['draft', 'waiting_kai', 'kai_approved', 'posted'];

const pick = (obj, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
const rel = p => path.relative(ROOT, p);

function fileInfo(p, key) {
  if (p === null) return null;
  const abs = path.resolve(ROOT, p);
  if (!fs.existsSync(abs)) throw new Error(`${key} ${p} does not exist`);
  const st = fs.statSync(abs);
  return { path: p, mb: +(st.size / 1e6).toFixed(1), modified: st.mtime.toLocaleString('sv-SE').slice(0, 16) };
}

// every mp4 under deliver/ outside archive/ that is neither the post copy nor an alternative hook cut (PUBLISH.md [5.1], deliver/hook-*.mp4)
function strayCuts(filmDir, postCopy) {
  const dir = path.join(filmDir, 'deliver'), out = [];
  const walk = d => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (p !== path.join(dir, 'archive')) walk(p); } else if (/\.mp4$/i.test(e.name) && !/^hook-.*\.mp4$/i.test(e.name) && (!postCopy || p !== path.resolve(ROOT, postCopy))) out.push(rel(p));
    }
  };
  walk(dir);
  return out;
}

export function readStatus(filmArg) {
  const dir = path.resolve(ROOT, filmArg);
  const file = path.join(dir, 'status.json');
  if (!fs.existsSync(file)) throw new Error(`${rel(file)} is missing: start from .claude/skills/make-reel-stick-man/templates/status.json`);
  let s;
  try { s = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${rel(file)} is not valid JSON: ${e.message}`); }
  const missing = REQUIRED.filter(k => pick(s, k) === undefined);
  if (missing.length) throw new Error(`${rel(file)} lacks: ${missing.join(', ')}`);
  const notLists = LISTS.filter(k => !Array.isArray(s[k]));
  if (notLists.length) throw new Error(`${rel(file)}: ${notLists.join(', ')} must be lists`);
  if (!APPROVAL.includes(s.approval.state)) throw new Error(`${rel(file)}: approval.state "${s.approval.state}" is not one of ${APPROVAL.join(', ')}`);
  let head = 'unknown';
  try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
  return {
    status: s, head, verbs: VERBS,
    latest: fileInfo(s.latest.mp4, 'latest.mp4'),
    post_copy: fileInfo(s.deliver.current, 'deliver.current'),
    stray: strayCuts(dir, s.deliver.current),
  };
}

export function summary({ status: s, latest, post_copy, stray, head }) {
  const a = s.approval, f = x => `${x.path} (${x.mb} MB, ${x.modified})`;
  const approved = a.state === 'kai_approved' || a.state === 'posted' ? `${a.state} by ${a.by ?? '?'} ${a.at ?? ''}`.trim() : `${a.state}, NOT approved to post`;
  const needs = typeof s.needs === 'string' ? s.needs : [s.needs.item, s.needs.question].filter(Boolean).join(': ');
  const out = [
    `${s.series} ep${s.ep} · ${s.film} · ${s.status}${s.updated_at ? ` · updated ${s.updated_at}` : ''}`,
    `POST COPY = ${post_copy ? f(post_copy) : 'none yet'} (${approved})`,
    ...stray.map(p => `WARNING  ${p} sits in deliver/ outside archive/: move it to deliver/archive/`),
    `stage    ${s.stage}`,
    `latest   ${[s.latest.version, latest ? f(latest) : 'no render yet'].filter(Boolean).join(' ')}`,
    `kit      rendered on ${s.kit_commit ?? 'n/a'} · repo now ${head}`,
  ];
  if (s.latest.review_page) out.push(`review   ${s.latest.review_page}`);
  out.push(`needs    ${needs}`);
  const pub = Object.entries(s.published).filter(([, v]) => v);
  out.push(`published ${pub.length ? pub.map(([k, v]) => `${k} ${v}`).join(' · ') : 'nowhere yet'}`);
  for (const o of s.obsolete ?? []) out.push(`stale    ${o}`);
  out.push('can', ...s.worker_can.map(x => `  + ${x}`), 'cannot', ...s.worker_cannot.map(x => `  - ${x}`));
  out.push('verbs', ...Object.entries(VERBS).map(([v, d]) => `  ${v.padEnd(32)} ${d}`));
  return out.join('\n');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), json = args.includes('--json'), film = args.find(a => !a.startsWith('--'));
  if (!film) { console.error('usage: status.mjs films/<film> [--json]'); process.exit(2); }
  try {
    const r = readStatus(film);
    console.log(json ? JSON.stringify(r, null, 1) : summary(r));
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
