// series.mjs: a series = one folder with series.json (the show's name, cast, palette, texts: shared by every episode)
// and one folder per episode (ep1, ep2, ...). Ep N+1 starts from Ep N and the vote that won. Run from the library root:
//   node episode/series.mjs new <series folder> [--from episodes/sample]   ep1 = a copy of that episode (voice and MP4 too)
//   node episode/series.mjs next <series folder> --winner A               records the winner, writes ep<N+1>/episode.json
//   node episode/series.mjs status <series folder>                         every episode, its MP4 and its winner
// `next` writes the PREVIOUSLY opening (ST-79: the card "PREVIOUSLY · EP N" with the winning answer, then the recap beat)
// and leaves "beats" after it for you (Claude) to write: the story that follows the winning comment.
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [cmd, dirArg, ...rest] = process.argv.slice(2), opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const die = (m) => { console.error('✗ ' + m); process.exit(1); };
if (!['new', 'next', 'status'].includes(cmd) || !dirArg) { console.error('usage: node episode/series.mjs new|next|status <series folder> [--from <episode>] [--winner A]'); process.exit(2); }
const dir = resolve(dirArg), SJ = join(dir, 'series.json');
const read = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (x) { die(`${f}: ${x.message}`); } };
const write = (f, o) => writeFileSync(f, JSON.stringify(o, null, 2) + '\n');
const SHARED = ['series', 'cast', 'palette', 'texts', 'narrator', 'model'];   // one narrator voice (and model) for the whole show

if (cmd === 'new') {
  const from = resolve(opt('--from') ?? 'episodes/sample');
  if (!existsSync(join(from, 'episode.json'))) die(`${from} has no episode.json`);
  if (existsSync(SJ)) die(`${SJ} already exists: this folder is a series (use next)`);
  const e = read(join(from, 'episode.json')), ep1 = join(dir, 'ep1');
  mkdirSync(ep1, { recursive: true });
  for (const f of ['index.html', 'vo']) if (existsSync(join(from, f))) cpSync(join(from, f), join(ep1, f), { recursive: true });
  if (existsSync(join(from, `${basename(from)}.mp4`))) cpSync(join(from, `${basename(from)}.mp4`), join(ep1, 'ep1.mp4'));
  write(SJ, { ...Object.fromEntries(SHARED.filter(k => e[k] !== undefined).map(k => [k, e[k]])), episodes: [{ ep: 1, dir: 'ep1' }] });
  write(join(ep1, 'episode.json'), { ...Object.fromEntries(Object.entries(e).filter(([k]) => !SHARED.includes(k))), ep: 1 });
  console.log(`✓ ${SJ}\n✓ ${ep1} (from ${from})`);
}

if (cmd === 'next') {
  const S = read(SJ), last = S.episodes.at(-1), le = read(join(dir, last.dir, 'episode.json')), v = le.vote;
  // the vote can only be in for an episode that was finished and rendered (re-running next must not skip ahead)
  if (/WRITE THE (TITLE|RECAP LINE|NEXT QUESTION)/.test(JSON.stringify(le))) die(`ep${last.ep} still has WRITE ... placeholders: write its story and render it first`);
  if (!existsSync(join(dir, last.dir, `${last.dir}.mp4`))) die(`ep${last.ep} is not rendered yet (${join(dir, last.dir, last.dir + '.mp4')}): render it, post it, then give its winner`);
  const tags = [v.tagA ?? 'A', v.tagB ?? 'B'], w = opt('--winner');
  if (!tags.includes(w)) die(`--winner must be ${tags.join(' or ')} (the vote of ep${last.ep}: "${v.question}")`);
  const win = w === tags[0] ? { tag: tags[0], text: v.a } : { tag: tags[1], text: v.b }, lose = w === tags[0] ? { tag: tags[1], text: v.b } : { tag: tags[0], text: v.a };
  const n = last.ep + 1, nd = join(dir, `ep${n}`);
  if (existsSync(join(nd, 'episode.json'))) die(`${nd} already has an episode.json`);
  mkdirSync(nd, { recursive: true }); cpSync(join(dir, last.dir, 'index.html'), join(nd, 'index.html'));
  last.winner = w; S.episodes.push({ ep: n, dir: `ep${n}` }); write(SJ, S);
  // the lead = the first human in the room, with the seed's own role and kind (as episode/main.js places them)
  const W = {}; new Function('window', readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'characters', 'cast.js'), 'utf8'))(W);
  const cast = (le.cast ?? S.cast ?? []).map(c => ({ ...(W.TMV_SEEDS[c.seed] ?? {}), ...c }));
  const lead = (cast.find(c => c.kind === 'human' && (c.place ?? (c.role === 'rival' ? 'corner' : 'room')) === 'room') ?? cast[0]).id;
  write(join(nd, 'episode.json'), {
    ep: n, title: 'WRITE THE TITLE',
    previously: { ep: last.ep, question: v.question, winner: win, loser: lose },
    beats: [
      { who: lead, shot: 'previously', line: `Last time, you picked ${win.text}.` },
      { who: lead, shot: 'room', line: 'WRITE THE RECAP LINE: what happened because of that choice.', exp: 'determined' },
    ],
    vote: { question: 'WRITE THE NEXT QUESTION', a: 'option a', b: 'option b', tagA: 'A', tagB: 'B' },
  });
  console.log(`✓ ep${last.ep} winner: ${w} · ${win.text}\n✓ ${join(nd, 'episode.json')}: PREVIOUSLY · EP ${last.ep} opening written; now write the title, the recap line, the story beats and the vote`);
}

if (cmd === 'status') {
  const S = read(SJ);
  for (const e of S.episodes) { const mp4 = join(dir, e.dir, `${e.dir}.mp4`);
    console.log(`ep${e.ep}  ${e.dir}  ${existsSync(mp4) ? mp4 : '(not rendered)'}  ${e.winner ? 'winner ' + e.winner : '(vote open)'}`); }
}
