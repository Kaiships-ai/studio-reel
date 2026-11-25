#!/usr/bin/env node
// Which kit parts go together (kit/compat.json), measured and enforced. Headless: the kit's own measures (test/unit/wardrobe-measure.mjs,
// bodylife.mjs) with the limits frozen in kit/compat-limits.json; no render.
//   node …/fits.mjs films/<slug>                        every pair the film lists has a usable row in the table, else exit 1
//   node …/fits.mjs films/<slug> --measure              first measures the pairs that have none and writes their rows
//                          --measure --all             every clip of the body for every person in the film, listed or not
//   node …/fits.mjs --person '{"body":"elder","outfit":["shirt:office","cardigan"],"girth":1}' [--clips A,B]     measures one person (every clip of
//                                                       the body without --clips) and writes the rows
//   node …/fits.mjs --kinds                             the kinds that are not clips (faces, marks, outfits; props and lights stay untested)
//   --table <file>  another table   --no-controls  (only with --table) skip the known-bad and known-good pairs a writing run starts with
// What a film lists: each clip key in an act's `anim`, and a `clips` list on a cast entry (['Idle_Stand_Loop', …]): a film that bakes its
// clips into keys with no name has to declare them there. Whose body, girth and costume: the film's own reels, each loaded as its own page.
// A run only adds rows or makes one stricter (merge). `fail` is never written: a red pair is `blocked`, with its number.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { pathToFileURL, fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
import { ROOT, run } from '../../../../kit/env.mjs';
import { personKey, pair, table as tableOf, measured, USABLE, VERDICTS } from '../../kit/cast/compat.js';
import { UNSAFE, HANGS, hangs, clipId } from '../../kit/cast/clothsafe.js';
import { expand } from '../../kit/cast/jobs.js';

const SELF = fileURLToPath(import.meta.url), KIT = path.join(ROOT, 'styles/stick-man/kit'), LIMITS_FILE = path.join(KIT, 'compat-limits.json');
export const TABLE = path.join(KIT, 'compat.json'), LIMITS = JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8'));
export const limitsSha = () => crypto.createHash('sha256').update(fs.readFileSync(LIMITS_FILE)).digest('hex').slice(0, 16);
const L = LIMITS.clip, TRIM = 'mm of a trim in an arm', BAKED_F = 15, MARK = '@@fits@@';

// ------------------------------------------------------------------ what a film lists
// one reel as its own page, in this process: { people: [{ who, spec, person, faceAge, clips, baked }] }
async function readReel(dir, reel) {
  const page = path.join(path.relative(ROOT, dir), path.dirname(reel)); globalThis.location = new URL(`http://localhost/?film=${encodeURIComponent(page).replaceAll('%2F', '/')}`);
  const { loadReel } = await import('#tools/render/reel_load.mjs'), { HOOKS, SPECS } = await import('#engine/play.js'); await import('#kit/cast/wardrobe.js');
  // a costume layer the film draws with a hook of its own never reaches the kit's hook: it is not the garment the table measured
  let kit = HOOKS.costume, own = null, probing = false, passed = []; const gate = (S, list, o) => { if (probing) passed.push(...list); else kit(S, list, o); };
  Object.defineProperty(HOOKS, 'costume', { get: () => own || gate, set(fn) { if (own || !new Error().stack.split('\n')[2].includes('/styles/stick-man/')) own = fn; else kit = fn; } });
  const any = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : any), apply: () => any, construct: () => any });
  const drawnByKit = it => { if (!own) return true; probing = true; passed = []; try { own(any, [it], any); } catch { /* (it reached for a real figure: its own layer) */ } probing = false; return passed.length > 0; };
  const R = await loadReel(dir, reel), acts = R?.acts || [R]; if (!acts.every(a => a && typeof a === 'object' && a.cast)) throw new Error('no cast in this reel');
  const people = [];
  for (const a of acts) for (const [who, c] of Object.entries(a.cast)) {
    const s = SPECS[c.spec]; if (!s) throw new Error(`${who}: unknown cast spec ${c.spec}`);
    const outfit = [].concat(c.costume ?? s.costume ?? []).flatMap(it => (drawnByKit(it) ? [it] : [`film:${it}`]));
    const keys = a.anim?.[who] || [], clips = [...keys.filter(k => k.clip).map(k => ({ clip: k.clip, body: k.body || 'adult', at: `f${k.f}` })), ...(c.clips || []).map(x => ({ body: s.motionBody || 'adult', ...(typeof x === 'string' ? { clip: x } : x), at: 'clips' }))];
    const bare = keys.filter(k => !k.clip).map(k => k.f).sort((x, y) => x - y); let baked = 0; for (let i = 1, n = 1; i < bare.length; i++) { n = bare[i] - bare[i - 1] <= 2 ? n + 1 : 1; baked = Math.max(baked, n); }
    people.push({ who, spec: c.spec, act: a.name || a.set || 'act', person: { body: s.motionBody || 'adult', girth: s.girth, scale: s.scale, headScale: s.headScale, legScale: s.legScale, outfit }, faceAge: c.faceAge ?? s.faceAge ?? null, clips, baked: c.clips || baked < BAKED_F ? 0 : baked, keys: keys.length });
  }
  return { people };
}
const reelsIn = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (/^(review|node_modules|frames|\..*)$/.test(e.name) ? [] : reelsIn(path.join(dir, e.name)).map(f => path.join(e.name, f))) : /^reel2?\.js$/.test(e.name) ? [e.name] : [])).sort();
export function readFilm(dir) {
  const people = [], errors = [], reels = reelsIn(dir); if (!reels.length) errors.push('no reel.js under this folder');
  for (const reel of reels) { const r = run('node', [SELF, '--read', dir, reel], { capture: true }), i = r.stdout.lastIndexOf(MARK); if (r.status || i < 0) { errors.push(`${reel}: cannot load: ${(r.stderr.match(/^\s*\w*Error: .*$/m)?.[0] || r.stderr || 'no data').trim().slice(0, 300)}`); continue; }
    const R = JSON.parse(r.stdout.slice(i + MARK.length)); if (R.error) errors.push(`${reel}: cannot load: ${R.error}`); else for (const p of R.people) people.push({ reel, ...p, key: personKey(p.person) }); }
  return { people, errors, reels };
}

// ------------------------------------------------------------------ the gate
// what is wrong with the table itself, whatever the film
export function tableFaults(T, sha = limitsSha()) {
  const out = [], seen = new Set(); if (T.limits !== sha) out.push(`the table's limits (${T.limits}) are not kit/compat-limits.json (${sha})`);
  for (const r of T.rows) {
    const bad = s => out.push(`${r.pair}: ${s}`); if (seen.has(r.pair)) bad('in the table twice'); seen.add(r.pair); if (!VERDICTS.includes(r.verdict)) { bad(`verdict "${r.verdict}" is not one of the table's (a fail is written as blocked)`); continue; }
    const [kind, who, clip] = r.pair.split('|'), use = USABLE.includes(r.verdict); if (use && typeof r.number !== 'number') bad(`${r.verdict} with no number`);
    if (kind === 'clip') {
      if (r.verdict === 'pass' && (r.bad !== 0 || r.number > L.ARM_MM)) bad(`pass, but it measured ${r.number} ${r.unit}, ${r.bad} bad frames`);
      if (r.verdict === 'accepted') { const a = LIMITS.accepted.clips[clip]; if (!a || a.body !== who.split('/')[0] || r.number > a.cm || r.bad > a.frames) bad(`accepted, and the frozen limits accept no such pair (${r.number} ${r.unit}, ${r.bad} frames)`); }
      if (use && UNSAFE[clip] && who.split('/')[2].split('+').some(g => HANGS.includes(g.split(':')[0]))) bad(`${r.verdict}, but kit/cast/clothsafe.js says: ${UNSAFE[clip].why}`);
    } else if (kind === 'mark' && use && r.number > LIMITS.mark.cover) bad(`${r.verdict} with ${r.number} ${r.unit}`);
    else if (kind === 'face' && use && !LIMITS.face.approved.includes(who)) bad(`${r.verdict}, but Kai has not approved this face`);
  }
  return out;
}
// film: readFilm's; T: a table (compat.js table()) -> { problems, pairs: [{ pair, row, who }] }
export function checkFilm(film, T) {
  const problems = [...film.errors], pairs = new Map(), say = (p, s) => problems.push(`${p.reel} ${p.who} (${p.key}): ${s}`);
  for (const p of film.people) {
    if (!p.clips.length || p.baked) say(p, `names no clip${p.baked ? ` for ${p.baked} baked frames` : ''}: keys with no clip name cannot be looked up, declare them in the entry's clips: [...] (untested)`);
    for (const c of p.clips) {
      if (c.body !== p.person.body) say(p, `blocked: ${clipId(c.clip)} at ${c.at} is the ${c.body} clip on ${/^[aeiou]/.test(p.person.body) ? 'an' : 'a'} ${p.person.body} body`);
      const q = pair('clip', p.key, c.clip); if (!pairs.has(q)) pairs.set(q, { pair: q, clip: clipId(c.clip), person: p.person, row: T.lookup(q), by: p });
    }
    if (p.faceAge) { const q = pair('face', p.faceAge, p.person.body); if (!pairs.has(q)) pairs.set(q, { pair: q, row: T.lookup(q), by: p }); }
  }
  for (const { pair: q, row: r, by } of pairs.values()) if (!USABLE.includes(r.verdict)) say(by, `${r.verdict}: ${q}${r.number != null ? `: ${r.number} ${r.unit}` : ''}${r.why ? ` (${r.why})` : ''}`);
  if (![...pairs.values()].some(p => p.clip)) problems.push('no pair: the film lists no (person, clip) at all');
  return { problems, pairs: [...pairs.values()] };
}

// ------------------------------------------------------------------ measuring
let M_, G_; const measureKit = async () => (M_ ||= await import('../../../../test/unit/wardrobe-measure.mjs'), G_ ||= await import('./motionlib.mjs'), { M: M_, G: G_, lib: await import('../../motion-lib/index.js') });
const COPY = new Map();
// why a clip record on this body is the adult's performance, or null
export async function copyOf(C, body) {
  if (body === 'adult') return null; if (C.body !== body) return { why: 'the shared or adult clip played on this body', shape: 0 };
  const { G } = await measureKit(); if (!COPY.has(C)) COPY.set(C, (await G.bodyFails(C)).filter(x => /'s shape/.test(x))); const f = COPY.get(C); return f.length ? { why: f[0], shape: +(/ is (-?[\d.]+) of/.exec(f[0])?.[1] ?? 0) } : null;
}
// { frames, faults: ['f37: …'], arm: [mm a frame], armMm, copy, error }
export async function measure(person, clip) {
  const { M, lib } = await measureKit(), { body = 'adult', outfit = [], ...spec } = person, faults = [], arm = [], id = clipId(clip), mode = M.SIT_CLIPS.includes(id) ? 'sit' : /Run|Sprint|Jump/.test(id) ? 'fast' : 'walk'; let frames = 0;
  try {
    const C = lib.getClip(clip, body), copy = await copyOf(C, body); if (copy) return { frames: C.frames, faults, arm, armMm: null, copy };
    const worn = measured(outfit).length > 0, build = Object.fromEntries(Object.entries(spec).filter(([k, v]) => ['girth', 'scale', 'headScale', 'legScale'].includes(k) && v != null));
    await M.play([].concat(outfit), body, { clip: id, whole: true }, { spec: Object.keys(build).length ? build : null, each: (f, S, P) => { frames++; if (!worn) return; for (const d of S.wardrobe.drapes) if (!d.under) faults.push(...M.clothFaults(S, d, P, f, mode)); if (S.wardrobe.group.children.length) arm.push(M.trimInArm(S).mm); } });
  } catch (e) { return { frames, faults, arm, armMm: null, error: String(e.message).slice(0, 160) }; }
  return { frames, mode, faults, arm, armMm: arm.length ? arm.reduce((a, b) => Math.max(a, b)) : null, summary: M.summary(faults).slice(0, 3) };
}
const FAULT = [[/stretched ([\d.]+) %/, k => 100 * k.stretch, '% stretched (p99)'], [/an edge ([\d.]+) %/, k => 100 * k.edge, '% longer, an edge'], [/jerks ([\d.]+) cm/, k => k.acc, 'cm a frame a frame'], [/cloth ([\d.]+) mm into the hand/, () => L.HAND_IN, 'mm of cloth in a hand'], [/cloth ([\d.]+) mm into/, () => L.ARM_IN, 'mm of cloth in an arm'],
  [/column bends ([\d.]+)/, k => k.kink, 'deg, a column bends'], [/hem turns ([\d.]+)/, k => k.hem, 'deg, the hem turns'], [/torso ([\d.]+) mm/, () => L.TORSO_MM, 'mm of torso past the cloth'], [/([\d.]+) mm inside/, () => L.SOLID_MM, 'mm inside a solid'], [/crumpled\D*([\d.]+) %/, () => 100 * L.FOLD, '% folded over']];
const round = v => +v.toFixed(1);
// a measurement -> { verdict, number, unit, bad, why? }. force: what it measured, whatever clothsafe.js says (the controls)
export function verdictOf(person, clip, x, { force = false } = {}) {
  const id = clipId(clip), out = (verdict, number, unit, bad, why) => ({ verdict, number, unit, bad, ...(why ? { why } : {}) }), list = expand([].concat(person.outfit || [])), other = list.filter(it => !measured([it]).length);
  if (x.error || !x.frames) return out('untested', null, null, null, x.error || 'no frame was played'); if (x.copy) return out('blocked', x.copy.shape, "share of the motion that is not the adult's", 0, `an adult's clip on another body: ${x.copy.why}`);
  if (other.length) return out('untested', null, null, null, `not measured: ${other.join(', ')} is not drawn by kit/cast/wardrobe.js`);
  const worst = [], bad = new Set(x.faults.map(f => f.split(':')[0])).size, K = L.MODES[x.mode || 'walk'], rest = {};
  for (const f of x.faults) { const what = f.replace(/^f\d+: /, ''), k = FAULT.find(([re]) => re.test(what)); if (k) { const v = +k[0].exec(what)[1]; worst.push([v / k[1](K), v, k[2]]); } else rest[what.replace(/[\d.]+/g, '#')] = (rest[what.replace(/[\d.]+/g, '#')] || 0) + 1; }
  const arm = x.armMm ?? null, armBad = arm != null && arm > L.ARM_MM; if (armBad) worst.push([arm / L.ARM_MM, round(arm), TRIM]); worst.sort((a, b) => b[0] - a[0]);
  const top = worst[0] || Object.entries(rest).sort((a, b) => b[1] - a[1]).map(([k, n]) => [0, n, `frames: ${k}`])[0], why = [...(armBad ? [`a trim ${round(arm)} mm in an arm`] : []), ...(x.summary || x.faults.slice(0, 3))].join(' | ');
  const a = LIMITS.accepted.clips[id], jerk = Math.max(0, ...worst.filter(w => w[2] === 'cm a frame a frame').map(w => w[1])), unsafe = !force && hangs(list).length ? UNSAFE[id] : null;
  if (!top) return unsafe ? out('blocked', arm == null ? 0 : round(arm), arm == null ? 'bad frames' : TRIM, 0, `clothsafe.js: ${unsafe.why}`) : out('pass', arm == null ? 0 : round(arm), arm == null ? 'no trim or cloth worn' : TRIM, 0);
  if (!unsafe && !armBad && a && a.body === (person.body || 'adult') && x.faults.every(f => /: jerks /.test(f)) && jerk <= a.cm && bad <= a.frames) return out('accepted', jerk, 'cm a frame a frame', bad, `a known exceedance of the walk limit (${L.MODES.walk.acc}), accepted in kit/cast/clothsafe.js`);
  return out('blocked', top[1], top[2], bad, unsafe ? `clothsafe.js: ${unsafe.why}; ${why}` : why);
}
export async function controls(list = LIMITS.controls) {
  const out = [], { lib } = await measureKit(), put = (name, must, r) => out.push({ name, must, got: r.verdict, why: r.why || `${r.number} ${r.unit}` });
  for (const c of [...list.bad, ...list.good]) put(`${personKey(c.person)} x ${c.clip}`, c.must, verdictOf(c.person, c.clip, await measure(c.person, c.clip), { force: true }));
  for (const c of list.copy) for (const body of c.bodies) { const A = lib.getClip(c.clip, c.of), B = { ...A, body, name: `${body}_${c.clip}_copy` }; put(`the ${c.of}'s ${c.clip} copied onto ${body}`, c.must, verdictOf({ body }, c.clip, { frames: A.frames, faults: [], armMm: null, copy: await copyOf(B, body) })); }
  return out;
}

// ------------------------------------------------------------------ the table
const HARD = { pass: 0, accepted: 1, blocked: 2 };
export function merge(rows, add) {
  const M = new Map(rows.map(r => [r.pair, r]));
  for (const r of add) { const o = M.get(r.pair); if (!o || (o.verdict === 'untested' && r.verdict !== 'untested') || HARD[r.verdict] > HARD[o.verdict]) M.set(r.pair, r); }
  return [...M.values()].sort((a, b) => (a.pair < b.pair ? -1 : a.pair > b.pair ? 1 : 0));
}
export const text = T => `${JSON.stringify({ version: T.version, limits: T.limits }).slice(0, -1)},"rows":[\n${T.rows.map(r => JSON.stringify(r)).join(',\n')}\n]}\n`;
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim();
// the kit as committed; a '+' says the parts that are measured are not
const commitOf = () => git('rev-parse', '--short=8', 'HEAD') + (git('status', '--porcelain', '--', 'styles/stick-man/engine', 'styles/stick-man/motion-lib', 'styles/stick-man/kit/cast', 'test/unit/wardrobe-measure.mjs') ? '+' : '');

async function main(argv) {
  const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; }, has = n => argv.includes(n);
  if (has('--read')) { const [dir, reel] = argv.slice(argv.indexOf('--read') + 1); let r; try { r = await readReel(dir, reel); } catch (e) { r = { error: String(e.message || e).slice(0, 300) }; } process.stdout.write(`\n${MARK}${JSON.stringify(r)}`); return 0; }
  const file = path.resolve(opt('--table') || TABLE), film = argv[0] && !argv[0].startsWith('-') ? path.resolve(ROOT, argv[0]) : null, read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!film && !has('--person') && !has('--kinds')) { console.error("usage: fits.mjs films/<slug> [--measure] | --person '{…}' [--clips A,B] | --kinds   [--table file]"); return 2; }
  if (has('--no-controls') && file === TABLE) { console.error('the controls are never skipped on the committed table'); return 2; }
  const started = Date.now(), secs = t => ((Date.now() - t) / 1000).toFixed(1), commit = commitOf();
  const ready = async () => { if (has('--no-controls')) return true; const t = Date.now(), bad = (await controls()).filter(c => { console.log(`control ${c.got === c.must ? 'ok' : 'WRONG'}: ${c.name}: ${c.got} (must be ${c.must}): ${c.why}`); return c.got !== c.must; }); console.log(`controls ${secs(t)} s`); return !bad.length; };
  const write = rows => { const T = read(); fs.writeFileSync(file, text({ ...T, rows: merge(T.rows, rows) })); };
  const measureAll = async (person, clips) => { const t = Date.now(), key = personKey(person), n = {}; for (const clip of clips) { const x = await measure(person, clip), v = verdictOf(person, clip, x), r = { pair: pair('clip', key, clip), kind: 'clip', ...v, commit }; n[v.verdict] = (n[v.verdict] || 0) + 1; if (!USABLE.includes(v.verdict)) console.log(`${v.verdict} ${r.pair} ${v.number ?? ''} ${v.unit ?? ''} ${v.why || ''}`); if (!x.error) write([r]); } console.log(`${key}: ${clips.length} clips, ${Object.entries(n).map(([k, c]) => `${c} ${k}`).join(', ')}, ${secs(t)} s`); return n; };

  if (has('--kinds')) { if (!await ready()) return 1; const { kinds } = await import('./fits_kinds.mjs'), rows = (await kinds(opt('--film') ? path.resolve(ROOT, opt('--film')) : null)).map(r => ({ ...r, commit })); write(rows); for (const r of rows) if (r.verdict === 'blocked') console.log(`blocked ${r.pair} ${r.number} ${r.unit} ${r.why || ''}`); console.log(`${rows.length} rows, ${secs(started)} s`); return 0; }
  if (has('--person')) {
    let person, key; try { person = JSON.parse(opt('--person')); key = personKey(person); } catch (e) { console.error(`--person: ${e.message}`); return 2; }
    if (!await ready()) { console.error('a control is wrong: nothing is written'); return 1; }
    const { lib } = await measureKit(), body = person.body || 'adult', clips = opt('--clips') ? opt('--clips').split(',') : lib.ALL.filter(C => (C.body || 'adult') === body).map(C => C.clip); if (!clips.length) { console.error(`${key}: no pair`); return 1; }
    return (await measureAll(person, [...new Set(clips)])).untested ? 1 : 0;
  }
  if (!fs.existsSync(film)) { console.error(`no film at ${film}`); return 2; }
  const F = readFilm(film); let T; const load = () => { const D = read(), faults = tableFaults(D), seen = new Set(); T = tableOf({ rows: D.rows.filter(r => !seen.has(r.pair) && seen.add(r.pair)) }); return faults; };
  let faults = load();
  if (has('--measure') && !faults.length) { const todo = new Map(), listed = checkFilm(F, T).pairs, lib = has('--all') ? (await measureKit()).lib : null;
    if (lib) for (const p of F.people) if (!listed.some(q => q.by.key === p.key && q.all)) for (const c of lib.ALL) if ((c.body || 'adult') === p.person.body && !p.key.includes('film:')) { const q = pair('clip', p.key, c.clip); listed.push({ pair: q, clip: c.clip, person: p.person, row: T.lookup(q), by: p, all: true }); }
    for (const p of listed) if (p.clip && p.row.verdict === 'untested') (todo.get(p.by.key) || todo.set(p.by.key, { person: p.person, clips: [] }).get(p.by.key)).clips.push(p.clip);
    if (todo.size) { if (!await ready()) return 1; for (const { person, clips } of todo.values()) await measureAll(person, clips); faults = load(); } }
  const R = checkFilm(F, T), problems = [...faults.map(f => `table: ${f}`), ...R.problems], n = v => R.pairs.filter(p => p.row.verdict === v).length; for (const p of problems) console.log(p);
  console.log(`fits ${problems.length ? 'FAIL' : 'PASS'}: ${F.reels.length} reel(s), ${F.people.length} cast entries, ${R.pairs.length} pair(s): ${VERDICTS.map(v => `${n(v)} ${v}`).join(', ')}; ${problems.length} problem(s)`); return problems.length ? 1 : 0;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) { const code = await main(process.argv.slice(2)); process.stdout.write('', () => process.exit(code)); }
