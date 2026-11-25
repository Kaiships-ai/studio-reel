// A blind viewing round of 2-6 cuts of one reel, shown to a fresh reviewer under neutral names. ADVISORY, like abtest.mjs:
// one more opinion beside Kai's own look. A reviewer who watched every cut and wrote at the end had lost the first ones
// (its screenshots were gone and it compared from memory), so the brief asks for each film's notes before the next film,
// and `check` refuses the round until every film's notes and one ranking are written.
//   node styles/stick-man/tools/review/blindround.mjs <a.mp4> <b.mp4> [...] --out <dir> [--seed n] [--force 1]
//     -> <dir>/films/Film A.mp4 ... (the cuts shuffled, their metadata stripped), <dir>/films/Film A.jpg (8 frames across
//        the whole cut), <dir>/BRIEF.md, <dir>/notes/ (a template per film); the key goes beside the folder, <dir>.key.json
//   node styles/stick-man/tools/review/blindround.mjs check <dir>      exit 1 until every film's notes and the ranking are filled
// Give the reviewer the folder only, never the key.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { run } from '../../../../kit/env.mjs';

export const FIELDS = ['hook (first 3 s)', 'what it is about (one line)', 'where it lost me (time)', 'faces', 'words on screen (readable?)', 'best moment (time)', 'worst moment (time)', 'score /10'];
const BLANK = '_';   // the template's placeholder: a field still reading _ is not written
export const filmNames = n => Array.from({ length: n }, (_, i) => `Film ${String.fromCharCode(65 + i)}`);

// seeded, so a test can pin the order
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
    ...names.map((n, i) => `${i + 1}. Watch films/${n}.mp4 to the end (8 frames across it are in films/${n}.jpg). Then fill in notes/${n}.md, every line, before you open the next film.`),
    `${names.length + 1}. Only then write notes/ranking.md: one line per film, best first, \`1. Film X: why\`.`, '',
    'Write as you go: you will not have this film in front of you when you write about the next one.', ''].join('\n');
}

export const keyFile = dir => `${path.resolve(dir)}.key.json`;
// a folder that already holds a round is refused: its notes would be read against reshuffled cuts (--force clears it)
export function prepare(mp4s, out, seed = Date.now(), force = false) {
  if (mp4s.length < 2 || mp4s.length > 6) throw new Error(`a round takes 2 to 6 cuts, not ${mp4s.length}`);
  for (const f of mp4s) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  if (['films', 'notes'].some(d => fs.existsSync(path.join(out, d)))) {
    if (!force) throw new Error(`${out} already holds a round: pick a new --out, or --force 1 to clear it`);
    for (const d of ['films', 'notes']) fs.rmSync(path.join(out, d), { recursive: true, force: true });
  }
  const order = shuffle(mp4s.map(f => path.resolve(f)), seed), names = filmNames(order.length);
  for (const d of ['films', 'notes']) fs.mkdirSync(path.join(out, d), { recursive: true });
  order.forEach((src, i) => {
    const mp4 = path.join(out, 'films', `${names[i]}.mp4`), ff = a => { const r = run('ffmpeg', ['-y', '-v', 'error', ...a], { capture: true }); if (r.status) throw new Error(`${src}: ${r.stderr}`); };
    ff(['-i', src, '-c', 'copy', '-map_metadata', '-1', '-map_chapters', '-1', mp4]);   // a title tag would name the cut
    const d = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { capture: true }).stdout) || 8;
    ff(['-i', src, '-vf', `fps=${8 / d},scale=180:-1,tile=8x1`, '-frames:v', '1', '-q:v', '4', path.join(out, 'films', `${names[i]}.jpg`)]);
    fs.writeFileSync(path.join(out, 'notes', `${names[i]}.md`), noteTemplate(names[i]));
  });
  fs.writeFileSync(path.join(out, 'BRIEF.md'), brief(names));
  fs.writeFileSync(keyFile(out), JSON.stringify({ seed, films: Object.fromEntries(names.map((n, i) => [n, order[i]])) }, null, 1) + '\n');
  return names;
}

// films whose notes leave a field blank, then the ranking's gaps and repeats
export function missing(dir) {
  const names = fs.readdirSync(path.join(dir, 'films')).filter(f => f.endsWith('.mp4')).map(f => f.slice(0, -4)).sort(), out = [];
  for (const n of names) {
    const f = path.join(dir, 'notes', `${n}.md`), lines = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n') : [];
    const blank = FIELDS.filter(x => { const l = lines.find(s => s.startsWith(`- ${x}:`)), v = l ? l.slice(x.length + 3).trim() : ''; return !v || v === BLANK; });
    if (blank.length) out.push(`${n}: ${blank.join(', ')}`);
  }
  const rk = path.join(dir, 'notes', 'ranking.md'), ranked = fs.existsSync(rk) ? fs.readFileSync(rk, 'utf8').split('\n').map(l => /^\s*\d+\.\s*(Film [A-Z])\b/.exec(l)?.[1]).filter(Boolean) : [];
  const unranked = names.filter(n => !ranked.includes(n)), twice = names.filter(n => ranked.filter(r => r === n).length > 1);
  if (unranked.length) out.push(`ranking: ${unranked.join(', ')} not ranked`);
  if (twice.length) out.push(`ranking: ${twice.join(', ')} ranked twice`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), usage = () => { console.error('usage: blindround.mjs <a.mp4> <b.mp4> [...] --out <dir> [--seed n] [--force 1] | check <dir>'); process.exit(2); };
  if (argv[0] === 'check') {
    if (!argv[1] || !fs.existsSync(path.join(argv[1], 'films'))) usage();
    const m = missing(argv[1]);
    console.log(m.length ? `blind round incomplete:\n${m.map(x => `  ${x}`).join('\n')}` : 'blind round complete');
    process.exit(m.length ? 1 : 0);
  }
  const files = [], A = {}; for (let i = 0; i < argv.length; i++) argv[i].startsWith('--') ? (A[argv[i].slice(2)] = argv[++i]) : files.push(argv[i]);
  if (!A.out) usage();
  const names = prepare(files, A.out, A.seed != null ? Number(A.seed) : undefined, A.force === '1');
  console.log(`${A.out}: ${names.join(', ')}; give the reviewer this folder only (the key is ${keyFile(A.out)})`);
}
