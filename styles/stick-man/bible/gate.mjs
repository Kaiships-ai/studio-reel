// The render gate: a film render (stills or an mp4 from tools/shot.mjs --film) starts only when the bible check
// (bible/check.mjs) passes. A bypass needs a reason; it prints a warning and adds a line to films/<slug>/bible-bypass.tsv.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, ROOT } from '../../../kit/env.mjs';

const CHECK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'check.mjs');
const SHOW = 8;

export function bibleGate({ film, bypass = null, frames = '' }) {
  const r = run('node', [CHECK, film, '--json'], { capture: true, timeout: 300000 });
  let rep = null;
  try { rep = JSON.parse(r.stdout); } catch { /* exit 2: the check could not load the film */ }
  const line = rep ? summary(rep) : `bible check ${film}: could not run (${(r.stderr || r.error?.message || '').trim().split('\n')[0]})`;
  if (bypass != null) {
    const dir = rep?.governed ? filmDir(film, rep.film) : null;
    if (dir) fs.appendFileSync(path.join(dir, 'bible-bypass.tsv'), [new Date().toISOString(), film, frames, bypass, line].map(x => String(x).replace(/[\t\n]/g, ' ')).join('\t') + '\n');
    return { ok: true, warn: `! bible check bypassed (--no-bible-check "${bypass}"), logged${dir ? ` in ${path.relative(ROOT, path.join(dir, 'bible-bypass.tsv'))}` : ''}: ${line}` };
  }
  if (r.status === 0 && rep) return { ok: true, warn: rep.governed && rep.summary.gaps ? line : null };
  const top = (rep?.findings || []).filter(f => f.severity === 'block').slice(0, SHOW)
    .map(f => `  ${f.rule}  ${f.act}${f.subject !== '-' ? '/' + f.subject : ''} f${f.f0}-${f.f1}  ${f.what}${f.instead ? `  -> use ${f.instead}` : ''}${f.file ? `  (${f.file}${f.line ? ':' + f.line : ''})` : ''}`);
  return { ok: false, text: [`render refused: ${line}`, ...top, ...(rep && rep.summary.blocking > SHOW ? [`  ... ${rep.summary.blocking - SHOW} more`] : []),
    `full report: node styles/stick-man/bible/check.mjs ${film}`, `render anyway: add --no-bible-check "<reason>" (logged)`].join('\n') };
}

const summary = rep => !rep.governed ? `no bible governs ${rep.film}` : `${rep.pass ? 'PASS' : 'BLOCK'} ${rep.summary.blocking} blocking, ${rep.summary.gaps} gaps, exceptions ${rep.summary.exceptions.used}`;
function filmDir(film, rel) {
  const abs = path.resolve(ROOT, film), parts = rel.split('/');
  return path.resolve(abs, ...parts.slice(1).map(() => '..'));
}
