// A run log (progress.md, LEDGER.md, a decisions or trail .tsv) only grows: one line appended per finished step, never a
// file written over. Hot Money ep01 r5, 19/11 23:08: a fix-round builder wrote review/r5/progress.md over with its own
// lines, the 18 lines before 16:08 were gone and the orchestrator restored them from its copy.
//   node styles/stick-man/tools/run/logline.mjs <log file> "<line>"      append "- DD/MM HH:MM <line>" (a .tsv: the line as is)
//   node styles/stick-man/tools/run/logline.mjs --check <folder>          every log recorded under the folder still starts with
//                                                                     what was appended to it (stagegate runs this)
// Each append records the log's line count and a hash of those lines in .logchain.json next to it. An append, or a check,
// that finds those first lines changed fails (exit 1) and names the lines lost, before anything more is written.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const sha = lines => crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
const linesOf = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\n$/, '').split('\n') : []);
const chainOf = f => path.join(path.dirname(f), '.logchain.json');
const readChain = f => { try { return JSON.parse(fs.readFileSync(chainOf(f), 'utf8')); } catch { return {}; } };

// null when the log still starts with every line the chain recorded, else what changed
export function logBroken(file) {
  const rec = readChain(file)[path.basename(file)]; if (!rec) return null;
  const now = linesOf(file);
  if (now.length < rec.lines) return `${path.basename(file)} has ${now.length} lines, ${rec.lines} were appended by ${rec.at}: lines ${now.length + 1}-${rec.lines} or earlier ones are gone (written over)`;
  if (sha(now.slice(0, rec.lines)) !== rec.sha) return `${path.basename(file)}: its first ${rec.lines} lines changed since ${rec.at} (written over or edited)`;
  return null;
}

export function appendLine(file, text, at = new Date()) {
  const bad = logBroken(file); if (bad) return { ok: false, why: bad };
  const p = n => String(n).padStart(2, '0'), stamp = `${p(at.getDate())}/${p(at.getMonth() + 1)} ${p(at.getHours())}:${p(at.getMinutes())}`;
  const line = file.endsWith('.tsv') || text.startsWith('- ') ? text : `- ${stamp} ${text}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  fs.appendFileSync(file, (before && !before.endsWith('\n') ? '\n' : '') + line + '\n');
  const all = linesOf(file), chain = readChain(file);
  chain[path.basename(file)] = { lines: all.length, sha: sha(all), at: at.toISOString() };
  fs.writeFileSync(chainOf(file), JSON.stringify(chain, null, 1) + '\n');
  return { ok: true, line };
}

// every log a .logchain.json under dir records: [{ file, why }] for the broken ones
export function checkLogs(dir) {
  const out = [], walk = d => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !e.isSymbolicLink() && !['renders', 'node_modules'].includes(e.name)) walk(p);
    else if (e.name === '.logchain.json') for (const n of Object.keys(readChain(path.join(d, '-')))) { const f = path.join(d, n), why = logBroken(f); if (why) out.push({ file: f, why }); }
  } };
  walk(dir); return out;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const [a, b] = process.argv.slice(2);
  if (a === '--check') {
    const bad = checkLogs(path.resolve(b || '.'));
    for (const x of bad) console.log(`FAIL ${x.why}; fix: restore the lost lines (the orchestrator's copy, a backup), then append with logline.mjs`);
    console.log(bad.length ? `${bad.length} run log(s) written over` : 'run logs: append-only');
    process.exit(bad.length ? 1 : 0);
  }
  if (!a || b == null) { console.error('usage: logline.mjs <log file> "<line>"  |  logline.mjs --check <folder>'); process.exit(2); }
  const r = appendLine(path.resolve(a), b);
  if (!r.ok) { console.error(`logline: ${r.why}; fix: restore the lost lines first, never write a log over`); process.exit(1); }
  console.log(r.line);
}
