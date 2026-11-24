// The on-screen claims of a cut, for a story skeptic to mark (H2 V2.1: "OVER $10,000 = REPORTED" and the other threat and
// rule words were checked against the story by hand). The rows' readable boxes (`text`, the same boxes textgate.mjs reads)
// give every overlay line the viewer reads, captions left out (they are the voice, checked with it); each distinct line
// becomes one row with the times it is on screen. Lines that are only numbers (a clock, a counter) are one row per box.
//   node styles/stick-man/tools/review/claims.mjs films/<slug> [--rows review/shot-rows.jsonl] [--fps 30]
//     -> films/<slug>/review/claims.md: | # | claim | on screen | verdict | why |, verdict _ for the skeptic to fill
//   node styles/stick-man/tools/review/claims.mjs check films/<slug>    exit 1 while a verdict is blank or a claim is false
// A verdict is true (the story shows or says it), false (the story contradicts it, or it is wrong) or unclear (the story
// never sets it up: a viewer cannot know); false and unclear need a why.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';

export const VERDICTS = ['true', 'false', 'unclear'];
const NUMBERS = /^[\d\s:.,$€£%+\-x×/]+$/;
const BLANK = '_';

// rows rendered before the rows carried readable boxes have none: an empty list from them is no clearance
export const hasText = rows => rows.some(r => Array.isArray(r.text));
// [{ claim, spans: [[f0, f1], ...] }] in the order the claims first appear
export function collect(rows) {
  const by = new Map();
  for (const r of rows) for (const t of r.text || []) {
    const s = (t.text || '').replace(/\s+/g, ' ').trim();
    if (!s || t.kind === 'caption') continue;
    const key = NUMBERS.test(s) ? `numbers in ${t.kind}${t.i ?? ''}` : s;
    let c = by.get(key); if (!c) by.set(key, c = { claim: key, spans: [] });
    const last = c.spans.at(-1);
    if (last && r.f <= last[1] + 1) last[1] = r.f; else if (!last || r.f > last[1]) c.spans.push([r.f, r.f]);
  }
  return [...by.values()];
}

const sec = (f, fps) => (f / fps).toFixed(1);
const cell = s => String(s).replace(/\|/g, '\\|');
export function table(claims, fps = 30) {
  return ['| # | claim | on screen | verdict | why |', '|---|---|---|---|---|',
    ...claims.map((c, i) => `| ${i + 1} | ${cell(c.claim)} | ${c.spans.map(([a, b]) => `${sec(a, fps)}-${sec(b + 1, fps)} s`).join(', ')} | ${BLANK} | |`)].join('\n');
}

// what still stops the cut: rows with no verdict, false claims, false or unclear ones with no why
export function problems(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*(\d+)\s*\|(.*)\|(.*)\|(.*)\|(.*)\|\s*$/.exec(line); if (!m) continue;
    const [, n, claim, , verdict, why] = m.map(s => s.trim()), v = verdict.toLowerCase();
    if (!VERDICTS.includes(v)) out.push(`#${n} ${claim}: no verdict (true / false / unclear)`);
    else if (v !== 'true' && !why) out.push(`#${n} ${claim}: ${v} with no why`);
    else if (v === 'false') out.push(`#${n} ${claim}: false (${why})`);
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), check = argv[0] === 'check'; if (check) argv.shift();
  const film = argv[0], A = {}; for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!film) { console.error('usage: claims.mjs films/<slug> [--rows <rows.jsonl>] [--fps 30] | check films/<slug>'); process.exit(2); }
  const out = path.join(film, 'review', 'claims.md');
  if (check) {
    if (!fs.existsSync(out)) { console.error(`no ${out}: run claims.mjs ${film} first`); process.exit(1); }
    const p = problems(fs.readFileSync(out, 'utf8'));
    console.log(p.length ? `claims not cleared:\n${p.map(x => `  ${x}`).join('\n')}` : 'claims cleared');
    process.exit(p.length ? 1 : 0);
  }
  const rowsFile = A.rows || path.join(film, 'review', 'shot-rows.jsonl');
  const rows = fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  if (!hasText(rows)) { console.error(`${rowsFile} carries no readable boxes (rows from an older render): re-run shot.mjs --dbg`); process.exit(1); }
  const claims = collect(rows);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `# On-screen claims: ${path.basename(film)}\n\nFor the story skeptic: mark each claim true, false or unclear against the story, with a why for false and unclear.\n\n${table(claims, Number(A.fps) || 30)}\n`);
  console.log(`${out}: ${claims.length} claims to mark`);
}
