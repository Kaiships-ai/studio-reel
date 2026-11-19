// Faces against the story (QA area M7, Kai 16/11 on Hot Money ep01: "biểu cảm nó chẳng ăn nhập gì cả ... đang cười? sao
// lúc này lại cười?" S3-041, "bất ngờ?" S3-042, "giận dữ?" S3-043, "lạm dụng khuôn mặt này nhiều quá?" S3-053).
// Reads what the picture draws (shot.mjs --dbg rows: each actor's expr, head box and inFrame per frame) and the story
// (storyboard.json: shots, lines, beats and their feel; review/acting.json: each shot's think / do / change), and reports
//   (1) a face that does not match its beat: a face of an emotion its beat (the beat's feel, lines, and every shot's
//       brief, purpose and picture) never names, held
//       HOLD frames or more on a readable head. Neutral faces (deadpan, focus, stern, suspicious ...) always pass.
//   (2) a face that keeps coming back: one character's face (neutral ones excepted) taken up more than REPEAT_MAX times
//       (a face held on across cuts is one take).
//   (3) a face design (an expression and the numbers it draws with) that is not on the face sheet Kai approved
//       (review/faces-approved.json, tools/facesheet.mjs --approve).
// All three are visible faults (a face on screen 0.5 s or more; a film-wide repeat), so either fails (exit 1). A story with no
// shots, or faces none of its shots cover, is PARTIAL (exit 1): nothing was judged, so it never passes.
//   node styles/stick-man/tools/facebeat.mjs films/<slug> [--rows review/shot-rows.jsonl] [--h 1920] [--story films/<slug>] [--out <dir>]
//   rows: shot.mjs --film films/<slug> --frames <first>-<last> --dbg review/shot-rows.jsonl --w 1080 --h 1920 (--h = that height)
//   --story: the film whose storyboard.json, review/acting.json and reel.js CUTS tell the story (default: the film itself);
//   a cut built outside its film (a bible cut) reads its story here.
//   A row may carry sb (its frame on the storyboard's timeline, when the picture was re-timed) and t (its second in the
//   cut): writes faces.md and faces.json to --out (default the film's review/).
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { faceDesigns, approvalLine } from './facesheet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// HOLD: kai-taste Severity "High: on a face, 0.5 s or more". MIN_FACE: a head under 3 % of the frame height is too
// small to read a face at phone size (inferred). REPEAT_MAX: kai-taste TOKENS "Repeats": a face in 3 or more shots is a
// film-wide finding; the flat deadpan default does not count.
export const HOLD = 15, MIN_FACE = 0.03, REPEAT_MAX = 2;
// Each face of the kit (faces.js EXPR) and the films' closed-mouth twins (a prefix such as y_) in one emotion family, and
// the words a beat uses for that family. Family 'neutral' never mismatches.
export const FAMILY = {
  neutral: ['neutral', 'deadpan', 'focus', 'alert', 'calm', 'suspicious', 'skeptic', 'squint', 'bored', 'stern', 'sleep', 'confused'],
  joy: ['happy', 'grin', 'closed', 'blush', 'excited', 'relief', 'content', 'manic'],
  smug: ['smug', 'sly'],
  fear: ['worried', 'nervous', 'panic', 'fear', 'fret', 'scared'],
  surprise: ['shock', 'dizzy'],
  anger: ['angry', 'furious', 'defiant', 'shout'],
  sad: ['sad', 'cry'],
  effort: ['strain', 'sweat', 'pain', 'tired'],
};
export const WORDS = {
  joy: /\b(joy|happ|glad|delight|laugh|smil|grin|pleas|triumph|celebrat|relie|relax|proud|pride|excit|thrill|giddy|hope|hopeful|confiden|it works|win)/i,
  smug: /\b(smug|sly|cock|greed|confiden|gloat|satisf|scheme|cunning|tempt|hunger|over-confiden)/i,
  fear: /\b(fear|afraid|scare|panic|dread|terror|nerv|anxi|worr|tense|alarm|fright|danger|threat|desperat|trapped|trap|hunted|caught|horror|helpless|doubt|flinch|shak)/i,
  surprise: /\b(surpris|shock|startl|stun|gasp|sudden|jolt|realis|realiz|disbelie|snap|found out|bang|horror|shoot|shot|gun|bullet|fire)/i,
  anger: /\b(anger|angry|rage|furi|mad\b|hostil|aggress|defian|shout|yell|command|menac|glare|fierce|threat|freeze|warning|shooting)/i,
  sad: /\b(sad|grief|cry|tear|loss|despair|defeat|gloom|regret|sorrow|alone|helpless)/i,
  effort: /\b(strain|effort|heav|lift|weight|push|struggl|grit|haul|drag|exhaust|tired|sweat|pant|spent|kg|kilo|arms gone)/i,
};
const BY_FACE = Object.fromEntries(Object.entries(FAMILY).flatMap(([fam, faces]) => faces.map(f => [f, fam])));
const displayPath = p => path.relative(ROOT, p).startsWith('..') ? p : path.relative(ROOT, p);
// a face's family: its name, or its name without a film prefix (y_fear -> fear); null when the face is unknown
export const familyOf = e => BY_FACE[e] ?? BY_FACE[String(e).replace(/^[a-z]+_/, '')] ?? null;

// the story per shot: [{ id, f0, f1, text }] on the storyboard's timeline
export function story(dir) {
  const read = p => fs.existsSync(path.join(dir, p)) ? JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8')) : null;
  const SB = read('storyboard.json');
  if (!SB) throw new Error(`${displayPath(dir)} has no storyboard.json: pass --story films/<slug> for the film whose storyboard tells this cut's story`);
  const briefs = read('review/acting.json') || {};
  const reel = fs.existsSync(path.join(dir, 'reel.js')) ? fs.readFileSync(path.join(dir, 'reel.js'), 'utf8') : '';
  const cuts = (reel.match(/export const CUTS = \[([\d,\s]+)\]/)?.[1] || '').split(',').map(Number).filter(Number.isFinite);
  const lineOf = {}; for (const l of SB.lines || []) for (const s of l.shots || []) lineOf[s] = l;
  const beatOf = {}; for (const sc of SB.scenes || []) for (const b of sc.beats || []) for (const l of b.lines || []) beatOf[l] = b;
  const shots = (SB.shots || []).map((s, i) => {
    const l = lineOf[s.id], b = l && beatOf[l.id], br = { ...briefs[s.id], ...s.acting };
    const f0 = s.f0 ?? cuts[i], f1 = cuts[i + 1] ?? SB.shots[i + 1]?.f0 ?? Infinity;
    return { id: s.id, f0, f1, beat: b?.id ?? null, feel: b?.feel ?? '', change: br.change ?? '',
      own: [b?.name, b?.feel, l?.act, br.think, br.do, br.change, s.purpose, s.see].filter(Boolean).join(' · ') };
  }).filter(s => Number.isFinite(s.f0));
  const beatText = {}; for (const s of shots) if (s.beat) beatText[s.beat] = [beatText[s.beat], s.own].filter(Boolean).join(' · ');
  return shots.map(s => ({ ...s, text: s.beat ? beatText[s.beat] : s.own }));
}

// runs of one face on one actor's readable head, inside one shot: { who, expr, fam, shot, f0, f1 (storyboard), t0, t1, n, first, last (row frames) }
export function faceRuns(rows, shots, H) {
  const shotAt = sb => shots.find(s => sb >= s.f0 && sb < s.f1) ?? null, runs = [], open = {};
  const close = who => { const r = open[who]; if (r) { runs.push(r); delete open[who]; } };
  for (const row of rows) {
    const sb = row.sb ?? row.f, t = row.t ?? row.f / 30, sh = shotAt(sb);
    for (const [who, a] of Object.entries(row.actors || {})) {
      const h = a.head ? (a.head[3] - a.head[1]) / H : 0, seen = a.inFrame && a.expr && h >= MIN_FACE && sh;
      const r = open[who];
      if (!seen) { close(who); continue; }
      if (r && r.expr === a.expr && r.shot === sh.id && row.f === r.last + 1) { r.n++; r.last = row.f; r.f1 = sb; r.t1 = t; continue; }
      close(who); open[who] = { who, expr: a.expr, fam: familyOf(a.expr), shot: sh.id, f0: sb, f1: sb, t0: t, t1: t, n: 1, first: row.f, last: row.f };
    }
  }
  for (const who of Object.keys(open)) close(who);
  return runs;
}

export function coverage(rows, shots, H) {
  let faced = 0, judged = 0;
  for (const row of rows) {
    const sb = row.sb ?? row.f;
    if (!Object.values(row.actors || {}).some(a => a.inFrame && a.expr && a.head && (a.head[3] - a.head[1]) / H >= MIN_FACE)) continue;
    faced++; if (shots.some(s => sb >= s.f0 && sb < s.f1)) judged++;
  }
  return { shots: shots.length, faced, judged };
}

export function verdict(J, cov) {
  if (!cov.shots) return { status: 'PARTIAL', reason: 'the storyboard has no shots, so no face was judged' };
  if (cov.faced && !cov.judged) return { status: 'PARTIAL', reason: `${cov.faced} frames show a face, none inside a storyboard shot` };
  if (J.mismatch.length || J.over.length) return { status: 'FAIL', reason: '' };
  return { status: 'PASS', reason: '' };
}

function takes(runs) {
  const out = []; for (const r of [...runs].sort((a, b) => a.first - b.first)) {
    const p = out.findLast(t => t.who === r.who);
    if (p && p.expr === r.expr && p.last + 1 === r.first) { p.n += r.n; p.last = r.last; if (!p.shots.includes(r.shot)) p.shots.push(r.shot); }
    else out.push({ who: r.who, expr: r.expr, fam: r.fam, t0: r.t0, first: r.first, last: r.last, n: r.n, shots: [r.shot] });
  }
  return out;
}

export function judge(runs, shots) {
  const byId = Object.fromEntries(shots.map(s => [s.id, s])), held = runs.filter(r => r.n >= HOLD);
  const mismatch = held.filter(r => r.fam && r.fam !== 'neutral' && !WORDS[r.fam].test(byId[r.shot].text))
    .map(r => ({ ...r, beat: byId[r.shot].beat, feel: byId[r.shot].feel, change: byId[r.shot].change }));
  const unknown = [...new Set(held.filter(r => !r.fam).map(r => r.expr))];
  const seen = {}; for (const t of takes(runs)) if (t.n >= HOLD && t.fam && t.fam !== 'neutral') (seen[`${t.who} ${t.expr}`] ||= []).push(t);
  const reuse = Object.entries(seen).map(([k, ts]) => ({ who: k.split(' ')[0], expr: k.split(' ')[1], shots: ts.map(t => t.shots.join('+')), t: ts.map(t => t.t0), n: ts.length }))
    .sort((a, b) => b.n - a.n);
  return { mismatch, reuse, over: reuse.filter(r => r.n > REPEAT_MAX), unknown, held: held.length };
}

const sec = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const [film, ...rest] = process.argv.slice(2), A = {}; for (let i = 0; i < rest.length; i += 2) A[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!film) { console.error('usage: facebeat.mjs films/<slug> [--rows review/shot-rows.jsonl] [--h 1920] [--story films/<slug>] [--out <dir>]'); process.exit(2); }
  const DIR = path.resolve(ROOT, film), rowsFile = path.resolve(DIR, A.rows || 'review/shot-rows.jsonl');
  if (!fs.existsSync(rowsFile)) { console.error(`facebeat: no ${path.relative(ROOT, rowsFile)}: run shot.mjs --film ${film} --frames <first>-<last> --dbg ${path.relative(ROOT, rowsFile)} first`); process.exit(1); }
  const rows = fs.readFileSync(rowsFile, 'utf8').trim().split('\n').map(l => JSON.parse(l)).sort((a, b) => a.f - b.f);
  let shots; try { shots = story(path.resolve(ROOT, A.story || film)); } catch (e) { console.error(`facebeat: ${e.message}`); process.exit(2); }
  const H = Number(A.h || 1920), runs = faceRuns(rows, shots, H), J = judge(runs, shots), cov = coverage(rows, shots, H), V = verdict(J, cov);
  // (3) a face design Kai has not seen on a face sheet (tools/facesheet.mjs) fails, whatever the beat
  const apFile = path.join(DIR, 'review/faces-approved.json'), sheet = approvalLine(faceDesigns(rows, H), fs.existsSync(apFile) ? JSON.parse(fs.readFileSync(apFile, 'utf8')) : null, film);
  if (sheet) { if (V.status === 'PASS') V.status = 'FAIL'; V.reason = [V.reason, sheet].filter(Boolean).join('; '); }
  const line = V.reason ? `${V.status}: ${V.reason}` : `${V.status} · ${J.mismatch.length} off the beat, ${J.over.length} over ${REPEAT_MAX} takes (${J.over.map(r => `${r.who} ${r.expr} ×${r.n}`).join(', ') || '-'})`;
  const md = [`# Faces against the story · ${path.basename(DIR)}`, '',
    `**${V.status}**${V.reason ? `: ${V.reason}` : ''} · ${J.mismatch.length} face(s) off the beat, ${J.over.length} face(s) taken up more than ${REPEAT_MAX} times · ${J.held} faces held ${HOLD} f or more · ${cov.judged} of ${cov.faced} face frames inside a shot`, '',
    '## Off the beat', '', '| Second | Who | Face | Shot | Beat feel | Shot change |', '| --- | --- | --- | --- | --- | --- |',
    ...J.mismatch.map(r => `| ${sec(r.t0)}-${sec(r.t1)} | ${r.who} | ${r.expr} (${r.fam}) | ${r.shot} | ${r.feel.replace(/\|/g, '/')} | ${r.change.replace(/\|/g, '/')} |`), '',
    '## Faces per character', '', '| Who | Face | Takes (shots, first second) | Count |', '| --- | --- | --- | --- |',
    ...J.reuse.map(r => `| ${r.who} | ${r.expr} | ${r.shots.map((s, i) => `${s} ${sec(r.t[i])}`).join(', ')} | ${r.n}${r.n > REPEAT_MAX ? ` (over ${REPEAT_MAX})` : ''} |`),
    ...(J.unknown.length ? ['', `Faces with no family (not judged): ${J.unknown.join(', ')}`] : [])];
  const OUT = path.resolve(A.out || path.join(DIR, 'review'));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'faces.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'faces.json'), JSON.stringify({ limits: { HOLD, MIN_FACE, REPEAT_MAX }, ...V, coverage: cov, ...J }, null, 1) + '\n');
  console.log(`${displayPath(path.join(OUT, 'faces.md'))}: ${line}`);
  process.exit(V.status === 'PASS' ? 0 : 1);
}
