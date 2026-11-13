// Asset checks (stage 2, ◇3): the breakdown the shot list asks for, what the kit already has, the story states shot by
// shot, and the set measured against the distances the story promises.
//   node styles/stick-man/tools/assets.mjs films/<slug>        -> review/assets.md, exit 1 on a FAIL
// Shot fields read: set, cast [], props [], state { key: value } (REEL_DATA.md, Shot list). Storyboard `measures`:
//   [{ "name": "door 9 to trunk", "story": "34 steps", "meters": 25.5, "tol": 0.1, "module": "set/motel.js",
//      "path": ["door9", [-0.9, -2.7], "breezeway", "trunk"] }]   (names = PLACES / MARKS / DOOR keys of the set module)
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFilm } from './shotlist.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const film = process.argv[2];
if (!film) { console.error('usage: assets.mjs films/<slug>'); process.exit(2); }
const DIR = path.resolve(ROOT, film);
let L; try { L = loadFilm(DIR); } catch (e) { console.error(e.message); process.exit(2); }
const { SB, shots, F } = L;
const out = [], add = (lvl, id, where, msg) => out.push({ lvl, id, where, msg });

// ---- breakdown
const need = {};
for (const s of shots) {
  if (s.size === 'CARD') continue;
  if (!s.set && !s.cast && !s.props) add('FAIL', 'A1', s.id, 'no breakdown fields (set, cast, props): the asset list is built from them');
  for (const [kind, list] of [['set', s.set ? [s.set] : []], ['cast', s.cast || []], ['prop', s.props || []]])
    for (const n of list) (need[`${kind}:${n}`] ||= { kind, name: n, shots: [] }).shots.push(s.id);
}
// ---- where each asset lives: the kit (shared), this film (film-local), or nowhere yet
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.(m?js|json)$/.test(e.name) ? [path.join(d, e.name)] : []) : [];
const KIT = ['styles/stick-man/allout', 'styles/stick-man/lib', 'styles/stick-man/engine'].flatMap(d => walk(path.join(ROOT, d))).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const filmRoot = (() => { let d = DIR; while (d !== ROOT && !fs.existsSync(path.join(d, 'reel.js'))) d = path.dirname(d); return d === ROOT ? DIR : d; })();
const LOCAL = walk(filmRoot).filter(f => !f.includes(`${path.sep}review${path.sep}`)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
// an asset "exists" where its name is a key, an id string or a builder: 'flashlight', flashlight:, BUILD.flashlight, SPECS.COP
const has = (src, n) => { const k = n.replace(/[^a-z0-9]+/gi, '[ _-]?');
  return new RegExp(`(['"\`])${k}\\1|\\b${k}\\s*[:=(]|\\.${k}\\b`, 'i').test(src); };
for (const a of Object.values(need)) a.where = has(KIT, a.name) ? 'kit' : has(LOCAL, a.name) ? 'film-local' : 'to build';
const local = Object.values(need).filter(a => a.where === 'film-local' && a.shots.length >= 3);
for (const a of local) add('WARN', 'A2', a.name, `film-local but used in ${a.shots.length} shots: if the series reuses it, move it to the kit with its rule`);
// ---- states: numeric states never go backwards unless a shot says so (reset), and a jump of more than one needs a reason
const states = {};
for (const s of shots) for (const [k, v] of Object.entries(s.state || {})) (states[k] ||= []).push({ id: s.id, v, reset: (s.reset || []).includes(k) });
for (const [k, seq] of Object.entries(states)) for (let i = 1; i < seq.length; i++) {
  const a = Number(seq[i - 1].v), b = Number(seq[i].v);
  if (Number.isFinite(a) && Number.isFinite(b) && b < a && !seq[i].reset) add('FAIL', 'A3', `${seq[i - 1].id}→${seq[i].id}`, `${k} goes back from ${a} to ${b} with no reset: a continuity slip`);
}
// ---- measures: the set's distances against the story's numbers
function setConsts(file) {
  const src = fs.readFileSync(file, 'utf8'), scope = {};
  for (const m of src.matchAll(/^export const ([A-Z_]+) = ([[{](?:(?!\nexport )[\s\S])*?[\]}]);[ \t]*(?:\/\/.*)?$/gm)) {
    try { scope[m[1]] = Function(...Object.keys(scope), `return (${m[2]});`)(...Object.values(scope)); } catch { /* not a plain literal */ }
  }
  return scope;
}
const measured = [];
for (const m of SB.measures || []) {
  const file = path.resolve(DIR, m.module);
  if (!fs.existsSync(file)) { add('FAIL', 'A4', m.name, `set module ${m.module} not found`); continue; }
  const C = setConsts(file), pt = p => Array.isArray(p) ? p : C.PLACES?.[p] || C.MARKS?.[p] || null;
  const pts = m.path.map(pt);
  if (pts.some(p => !p)) { add('FAIL', 'A4', m.name, `unknown place in ${JSON.stringify(m.path)}`); continue; }
  const len = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0), tol = m.tol ?? 0.1, err = len / m.meters - 1;
  measured.push({ ...m, len, err });
  if (Math.abs(err) > tol && !m.cheat) add('FAIL', 'A4', m.name, `the set measures ${len.toFixed(1)} m, the story promises ${m.story} ≈ ${m.meters} m (${err > 0 ? '+' : ''}${Math.round(err * 100)} %): rebuild to scale, or record an approved cheat`);
}
// ---- report
const nF = out.filter(o => o.lvl === 'FAIL').length;
const md = [`# Asset check · ${SB.film || path.basename(DIR)}`, '', `**${nF ? 'FAIL' : 'PASS'}**: ${nF} FAIL, ${out.length - nF} WARN`, '',
  '## Findings', '', '| Level | Check | Where | What |', '| --- | --- | --- | --- |', ...out.map(o => `| ${o.lvl} | ${o.id} | ${o.where} | ${o.msg} |`), '',
  '## Breakdown', '', '| Asset | Kind | Shots | Lives in |', '| --- | --- | --- | --- |',
  ...Object.values(need).sort((a, b) => b.shots.length - a.shots.length).map(a => `| ${a.name} | ${a.kind} | ${a.shots.length}: ${a.shots.slice(0, 8).join(' ')}${a.shots.length > 8 ? ' …' : ''} | ${a.where} |`), '',
  '## States by shot', '', ...Object.entries(states).map(([k, seq]) => `- **${k}**: ${seq.map(x => `${x.id}=${x.v}`).join(' → ')}`), '',
  '## Measures', '', '| What | Story | Set | Error |', '| --- | --- | --- | --- |', ...measured.map(m => `| ${m.name} | ${m.story} (${m.meters} m) | ${m.len.toFixed(1)} m | ${Math.round(m.err * 100)} % |`)];
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(F('review/assets.md'), md.join('\n') + '\n');
console.log(`review/assets.md: ${nF ? 'FAIL' : 'PASS'} · ${nF} FAIL, ${out.length - nF} WARN · ${Object.keys(need).length} assets, ${measured.length} measures`);
process.exit(nF ? 1 : 0);
