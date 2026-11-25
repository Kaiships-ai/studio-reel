// The on-screen claims of a cut, for a story skeptic to mark: in H2 V2.1 the threat and rule words ("OVER $10,000 =
// REPORTED") were checked against the story by hand. The rows' readable boxes (`text`, the boxes textgate.mjs reads) give
// every overlay line the viewer reads, captions left out (they are the voice, checked with it); each distinct line is one
// row with the times it is on screen.
//   node styles/stick-man/tools/review/claims.mjs films/<slug> [--rows review/shot-rows.jsonl] [--fps 30]
//     -> films/<slug>/review/claims.md: | # | claim | on screen | verdict | why |, verdict _ for the skeptic to fill
//   node styles/stick-man/tools/review/claims.mjs check films/<slug>    exit 1 while a verdict is blank or a claim is false
// A verdict is true (the story shows or says it), false (the story contradicts it, or it is wrong) or unclear (the story
// never sets it up: a viewer cannot know); false and unclear need a why.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';

export const VERDICTS = ['true', 'false', 'unclear'];
// a clock or counter changes every frame: its readings are one row per box, every distinct value listed (a wrong figure
// among them is the skeptic's to catch)
const NUMBERS = /^[\d\s:.,$€£%+\-x×/]+$/;
const BLANK = '_';

// rows rendered before the rows carried readable boxes have none: an empty list from them is no clearance
export const hasText = rows => rows.some(r => Array.isArray(r.text));
// [{ claim, values, spans: [[f0, f1], ...] }] in the order the claims first appear; a span runs on over gaps up to the
// rows' usual step (rows sampled every n frames)
export function collect(rows) {
  const F = rows.map(r => r.f), steps = F.slice(1).map((f, i) => f - F[i]).filter(d => d > 0).sort((a, b) => a - b), step = steps[steps.length >> 1] || 1;
  const by = new Map();
  for (const r of rows) for (const t of r.text || []) {
    const s = (t.text || '').replace(/\s+/g, ' ').trim();
    if (!s || t.kind === 'caption') continue;
    const num = NUMBERS.test(s), key = num ? `${t.kind}${t.i ?? ''} numbers` : s;
    let c = by.get(key); if (!c) by.set(key, c = { claim: key, values: [], spans: [] });
    if (num && !c.values.includes(s)) c.values.push(s);
    const last = c.spans.at(-1);
    if (last && r.f <= last[1] + step) last[1] = Math.max(last[1], r.f); else c.spans.push([r.f, r.f]);
  }
  return [...by.values()];
}

const sec = (f, fps) => (f / fps).toFixed(1);
const cell = s => String(s).replace(/\|/g, '\\|');
const said = c => c.values.length ? `${c.claim}: ${c.values.join(', ')}` : c.claim;
export function table(claims, fps = 30) {
  return [`<!-- claims: ${claims.length} -->`, '| # | claim | on screen | verdict | why |', '|---|---|---|---|---|',
    ...claims.map((c, i) => `| ${i + 1} | ${cell(said(c))} | ${c.spans.map(([a, b]) => `${sec(a, fps)}-${sec(b + 1, fps)} s`).join(', ')} | ${BLANK} | |`)].join('\n');
}

// what still stops the cut: a row with no verdict, a false claim, a false or unclear one with no why, a row that no longer
// parses, rows missing from the count the list was written with
export function problems(md) {
  const out = [], n0 = Number(/<!-- claims: (\d+) -->/.exec(md)?.[1]), seen = new Set();
  for (const line of md.split('\n')) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map(s => s.replace(/\\\|/g, '|').trim());
    if (!line.trim().endsWith('|') || cells.length !== 5) { out.push(`malformed row: ${line.trim()}`); continue; }
    const [n, claim, , verdict, why] = cells, v = verdict.toLowerCase(); seen.add(n);
    if (!VERDICTS.includes(v)) out.push(`#${n} ${claim}: no verdict (true / false / unclear)`);
    else if (v !== 'true' && !why) out.push(`#${n} ${claim}: ${v} with no why`);
    else if (v === 'false') out.push(`#${n} ${claim}: false (${why})`);
  }
  if (!Number.isFinite(n0)) out.push('no claim count: write the list with claims.mjs');
  else if (seen.size < n0) out.push(`${n0 - seen.size} of ${n0} claims missing from the list`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), check = argv[0] === 'check'; if (check) argv.shift();
  const usage = () => { console.error('usage: claims.mjs films/<slug> [--rows <rows.jsonl>] [--fps 30] | check films/<slug>'); process.exit(2); };
  const film = argv[0], A = {}; for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!film || film.startsWith('--')) usage();
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
