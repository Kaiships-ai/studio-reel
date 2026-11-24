// A blind viewing round of 2-6 cuts (H2 V2.1: v15, H2 V1, V2.0 and V2.1 shown to a fresh reviewer under neutral names).
// ADVISORY, like abtest.mjs: one more opinion beside Kai's own look. The lesson it encodes (24/11): a blind reviewer who
// watches four films and writes at the end has lost the first three (its screenshots were gone, it compared from memory),
// so the brief makes it write each film's notes before it opens the next, and `check` refuses a round until it has.
//   node styles/stick-man/tools/review/blindround.mjs <a.mp4> <b.mp4> [...] --out <dir> [--seed n]
//     -> <dir>/films/Film A.mp4 ... (the cuts under neutral names, shuffled), <dir>/films/Film A.jpg (8 frames each),
//        <dir>/BRIEF.md (what the reviewer reads), <dir>/notes/ (one file per film, from the template), key.json (only for us)
//   node styles/stick-man/tools/review/blindround.mjs check <dir>      exit 1 until every film's notes and the ranking are filled
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { run } from '../../../../kit/env.mjs';

export const FIELDS = ['hook (first 3 s)', 'what it is about (one line)', 'where it lost me (time)', 'faces', 'words on screen (readable?)', 'best moment (time)', 'worst moment (time)', 'score /10'];
const BLANK = '_';
export const filmNames = n => Array.from({ length: n }, (_, i) => `Film ${String.fromCharCode(65 + i)}`);

// a seeded shuffle (the same seed, the same order: a test can fix it)
export function shuffle(list, seed) {
  let s = (seed >>> 0) || 1; const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = s % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export const noteTemplate = name => [`# ${name}`, '', ...FIELDS.map(f => `- ${f}: ${BLANK}`), ''].join('\n');
export function brief(names) {
  return [`# Blind round: ${names.length} cuts`, '',
    `You are a viewer scrolling short vertical videos on a phone. There are ${names.length} cuts in films/: ${names.join(', ')}.`,
    'They are cuts of one reel, in no particular order.', '',
    '## How to watch', '',
    ...names.map((n, i) => `${i + 1}. Watch films/${n}.mp4 to the end (its 8 frames are in films/${n}.jpg). Then fill in notes/${n}.md, every line, before you open the next film.`),
    `${names.length + 1}. Only then write notes/ranking.md: one line per film, best first, \`1. Film X: why\`.`, '',
    'Write as you go: you will not have this film in front of you when you write about the next one.', ''].join('\n');
}

export function prepare(mp4s, out, seed = Date.now()) {
  if (mp4s.length < 2 || mp4s.length > 6) throw new Error(`a round takes 2 to 6 cuts, not ${mp4s.length}`);
  for (const f of mp4s) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  const order = shuffle(mp4s.map(f => path.resolve(f)), seed), names = filmNames(order.length);
  for (const d of ['films', 'notes']) fs.mkdirSync(path.join(out, d), { recursive: true });
  order.forEach((src, i) => {
    fs.copyFileSync(src, path.join(out, 'films', `${names[i]}.mp4`));
    const r = run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', 'thumbnail=60,scale=180:-1,tile=8x1', '-frames:v', '1', '-q:v', '4', path.join(out, 'films', `${names[i]}.jpg`)], { capture: true });
    if (r.status) throw new Error(`contact sheet for ${src}: ${r.stderr}`);
    fs.writeFileSync(path.join(out, 'notes', `${names[i]}.md`), noteTemplate(names[i]));
  });
  fs.writeFileSync(path.join(out, 'BRIEF.md'), brief(names));
  fs.writeFileSync(path.join(out, 'key.json'), JSON.stringify({ seed, films: Object.fromEntries(names.map((n, i) => [n, order[i]])) }, null, 1) + '\n');
  return names;
}

// what is still missing from a round: films whose notes leave a field blank, and the ranking
export function missing(dir) {
  const names = fs.readdirSync(path.join(dir, 'films')).filter(f => f.endsWith('.mp4')).map(f => f.slice(0, -4)).sort(), out = [];
  for (const n of names) {
    const f = path.join(dir, 'notes', `${n}.md`), t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    const blank = FIELDS.filter(x => { const m = new RegExp(`^- ${x.replace(/[()?/]/g, '\\$&')}:\\s*(.*)$`, 'm').exec(t); return !m || !m[1].trim() || m[1].trim() === BLANK; });
    if (blank.length) out.push(`${n}: ${blank.join(', ')}`);
  }
  const rk = path.join(dir, 'notes', 'ranking.md'), ranked = fs.existsSync(rk) ? fs.readFileSync(rk, 'utf8') : '';
  const unranked = names.filter(n => !new RegExp(`^\\s*\\d+\\.\\s*${n}\\b`, 'm').test(ranked));
  if (unranked.length) out.push(`ranking: ${unranked.join(', ')} not ranked`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2);
  if (argv[0] === 'check') {
    const m = missing(argv[1]);
    console.log(m.length ? `blind round incomplete:\n${m.map(x => `  ${x}`).join('\n')}` : 'blind round complete');
    process.exit(m.length ? 1 : 0);
  }
  const files = [], A = {}; for (let i = 0; i < argv.length; i++) argv[i].startsWith('--') ? (A[argv[i].slice(2)] = argv[++i]) : files.push(argv[i]);
  if (!A.out) { console.error('usage: blindround.mjs <a.mp4> <b.mp4> [...] --out <dir> [--seed n] | check <dir>'); process.exit(2); }
  const names = prepare(files, A.out, A.seed != null ? Number(A.seed) : undefined);
  console.log(`${A.out}: ${names.join(', ')}; give the reviewer BRIEF.md, films/ and notes/ (never key.json)`);
}
