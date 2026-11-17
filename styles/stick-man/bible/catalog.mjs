#!/usr/bin/env node
// A film's bible: the closed set of parts a film may use (catalog.json) and the numbers they obey (tokens.json), one source
// that the kit, the docs page and a checker all read. This loads both, checks every entry against the kit as it is now and
// against Kai's feedback ids (~/.claude/skills/kai-taste/SKILL.md), prints a summary and writes the human view CATALOG.md.
//   node styles/stick-man/bible/catalog.mjs [--dir <bible dir>] [--films <films root>] [--taste <kai-taste dir>] [--check] [--strict]
// --check validates without writing CATALOG.md. Parts under films/ and the feedback ids are checked when those folders are
// here (they are not in CI); --strict makes their absence an error. Exits 1 on any broken entry.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../..');
export const KINDS = ['motion-clip', 'face', 'camera-kind', 'camera-move', 'prop', 'set', 'cast', 'rig', 'caption-style', 'card-2d', 'fx', 'look-preset'];
export const TIERS = ['primitive', 'semantic', 'component'];
export const SOURCES = ['measured', 'inferred', 'kit-gate', 'kai', 'judgement'];
const STATUS = { component: ['stable', 'trial', 'retired'], token: ['stable', 'trial'] };
const ROOTS = ['R1', 'R2', 'R3', 'R4', 'R5'];
export const COVERS = ['poses', 'moves', 'props'];
const ID = /^[a-z0-9-]+(\.[A-Za-z0-9_-]+)+$/, ALIAS = /^\{([\w.-]+)\}$/, KAI_ID = /\b(?:S\d|M)-\d{3}\b/g;
// the kit registries a catalog must cover in full: a part the kit has and the catalog does not is outside the closed set
const REGISTRIES = [
  { kind: 'motion-clip', path: 'styles/stick-man/motion-lib/index.js', export: 'CLIPS', keys: v => Object.keys(v) },
  { kind: 'face', path: 'styles/stick-man/engine/faces.js', export: 'EXPR_NAMES', keys: v => v.filter(k => !k.endsWith('_O')) },
  { kind: 'camera-kind', path: 'styles/stick-man/engine/camera.js', export: 'SHOT_KINDS', keys: v => v },
];

const same = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') return same(Object.keys(a).sort(), Object.keys(b).sort()) && Object.keys(a).every(k => same(a[k], b[k]));
  return a === b;
};
const literal = s => { try { return JSON.parse(s.trim()); } catch { return undefined; } };

async function resolveRef(ref, ctx) {
  if (!ref || typeof ref.path !== 'string') return { error: 'kit entry without a path' };
  const film = ref.path.startsWith('films/');
  if (film && !ctx.films) return { unchecked: `films/ is not here (${ref.path})` };
  const abs = film ? path.join(ctx.films, ref.path.slice('films/'.length)) : path.join(ctx.repo, ref.path);
  if (!fs.existsSync(abs)) return { error: `missing kit path ${ref.path}` };
  const src = () => fs.readFileSync(abs, 'utf8');
  if (ref.text && !src().includes(ref.text)) return { error: `${ref.path} has no "${ref.text}"` };
  if (ref.pattern && !new RegExp(ref.pattern).test(src())) return { error: `${ref.path} does not match /${ref.pattern}/` };
  let value;
  if (ref.const) {
    const m = new RegExp(`\\b${ref.const}\\s*=\\s*(\\[[^\\]]*\\]|[^,;\\n]+)`).exec(src());
    if (!m) return { error: `${ref.path} has no constant ${ref.const}` };
    value = literal(m[1]);
  }
  if (ref.export) {
    const exported = () => new RegExp(`export\\s+(async\\s+)?(function\\*?|const|let|class)\\s+${ref.export}\\b|export\\s*\\{[^}]*\\b${ref.export}\\b`).test(src())
      ? { value } : { error: `${ref.path} exports no ${ref.export}` };
    // a film's modules fetch and draw on import: they are read, never run
    if (film || !/\.m?js$/.test(abs)) return exported();
    let mod;
    try {
      for (const r of ref.requires || []) await import(pathToFileURL(path.join(ctx.repo, r)).href);
      mod = await import(pathToFileURL(abs).href);
    } catch (e) {
      // a browser-only kit module (allout/hoodie.js loads its glb on import): its source names the export or not
      if (ref.key != null) return { error: `${ref.path} cannot load in node to check key "${ref.key}" (${e.message.split('\n')[0]})` };
      return exported();
    }
    if (!(ref.export in mod)) return { error: `${ref.path} exports no ${ref.export}` };
    value = mod[ref.export];
    if (ref.key != null) {
      const has = Array.isArray(value) ? value.includes(ref.key) : value && typeof value === 'object' && ref.key in value;
      if (!has) return { error: `${ref.path} ${ref.export} has no key "${ref.key}"` };
      return { value: Array.isArray(value) ? ref.key : value[ref.key], parent: value };
    }
  }
  return { value };
}

export function loadBible(dir) {
  const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { tokens: read('tokens.json'), catalog: read('catalog.json') };
}

export function kaiIds(taste) {
  const f = taste && path.join(taste, 'SKILL.md');
  return f && fs.existsSync(f) ? new Set(fs.readFileSync(f, 'utf8').match(KAI_ID) || []) : null;
}

export async function validate({ tokens, catalog }, { repo = REPO, films = path.join(REPO, 'films'), taste = path.join(os.homedir(), '.claude/skills/kai-taste'), strict = false } = {}) {
  const errors = [], warnings = [], unchecked = new Set();
  const ctx = { repo, films: films && fs.existsSync(films) ? films : null };
  const ids = kaiIds(taste);
  if (!ids) (strict ? errors : warnings).push(`kai-taste SKILL.md not found under ${taste}: feedback ids unchecked`);
  if (!ctx.films) (strict ? errors : warnings).push(`films root ${films} not found: film-local parts unchecked`);
  const checkIds = (where, list) => { for (const id of list || []) if (ids && !ids.has(id)) errors.push(`${where}: feedback id ${id} is not in kai-taste SKILL.md`); };
  const ref = async (where, r) => { const o = await resolveRef(r, ctx); if (o.error) errors.push(`${where}: ${o.error}`); if (o.unchecked) unchecked.add(where); return o; };

  const T = tokens.tokens || [], byName = new Map();
  for (const t of T) { if (byName.has(t.name)) errors.push(`token ${t.name}: duplicate name`); byName.set(t.name, t); }
  const resolve = (v, seen = []) => {
    if (typeof v === 'string' && ALIAS.test(v)) {
      const n = ALIAS.exec(v)[1];
      if (seen.includes(n)) throw new Error(`alias cycle ${[...seen, n].join(' -> ')}`);
      if (!byName.has(n)) throw new Error(`dangling alias {${n}}`);
      return resolve(byName.get(n).value, [...seen, n]);
    }
    if (Array.isArray(v)) return v.map(x => resolve(x, seen));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, seen)]));
    return v;
  };
  const hasAlias = v => (typeof v === 'string' && ALIAS.test(v)) || (v && typeof v === 'object' && Object.values(v).some(hasAlias));
  for (const t of T) {
    const w = `token ${t.name}`;
    if (!TIERS.includes(t.tier)) errors.push(`${w}: tier "${t.tier}" is not one of ${TIERS.join(', ')}`);
    if (!ROOTS.includes(t.root)) errors.push(`${w}: root "${t.root}" is not R1-R5`);
    if (!STATUS.token.includes(t.status)) errors.push(`${w}: status "${t.status}"`);
    for (const f of ['unit', 'usage']) if (!t[f]) errors.push(`${w}: no ${f}`);
    if (!SOURCES.includes(t.source?.kind)) errors.push(`${w}: source kind "${t.source?.kind}" is not one of ${SOURCES.join(', ')}`);
    if ((t.value === null) !== (typeof t.gap === 'string')) errors.push(`${w}: a gap has value null and says why in "gap", and only a gap does`);
    if (t.gap && t.status !== 'trial') errors.push(`${w}: a gap is trial`);
    if (t.tier === 'primitive' && hasAlias(t.value)) errors.push(`${w}: a primitive holds a raw value, not an alias`);
    let v; try { v = resolve(t.value); } catch (e) { errors.push(`${w}: ${e.message}`); }
    checkIds(w, t.source?.evidence);
    if (t.source?.kit) {
      const o = await ref(w, t.source.kit);
      if (t.source.kit.match && !o.error && !o.unchecked && v !== undefined && !same(v, o.value))
        errors.push(`${w}: value ${JSON.stringify(v)} differs from the kit's ${JSON.stringify(o.value)} (${t.source.kit.path})`);
    }
  }

  const C = catalog.components || [], byId = new Map(), coveredBy = new Map();
  for (const c of C) { if (byId.has(c.id)) errors.push(`component ${c.id}: duplicate id`); byId.set(c.id, c); }
  for (const c of C) {
    const w = `component ${c.id}`;
    if (!ID.test(c.id || '')) errors.push(`${w}: id does not match ${ID}`);
    if (!KINDS.includes(c.kind)) errors.push(`${w}: kind "${c.kind}" is not one of ${KINDS.join(', ')}`);
    if (!STATUS.component.includes(c.status)) errors.push(`${w}: status "${c.status}"`);
    for (const f of ['name', 'use', 'never']) if (!c[f]) errors.push(`${w}: no ${f}`);
    if (!Array.isArray(c.kit) || !c.kit.length) errors.push(`${w}: no kit path`);
    const ev = c.evidence || {};
    checkIds(w, ev.praise); checkIds(w, ev.complaints);
    if (c.status === 'stable' && !ev.praise?.length) errors.push(`${w}: stable needs a praise id`);
    if (c.status === 'retired' && !ev.complaints?.length) errors.push(`${w}: retired needs a complaint id`);
    const local = (c.kit || []).some(r => r.path?.startsWith('films/'));
    if (local && c.status === 'stable') errors.push(`${w}: a film-local part stays trial until it is promoted to the kit`);
    for (const n of c.tokens || []) if (!byName.has(n)) errors.push(`${w}: token ${n} does not exist`);
    const res = [];
    for (const r of c.kit || []) res.push(await ref(w, r));
    const [first] = res;
    if (c.kind === 'motion-clip' && first && !first.error && first.value) {
      const have = Object.keys(first.value).sort(), want = [...(c.bodies || [])].sort();
      if (!same(have, want)) errors.push(`${w}: bodies ${want.join(',')} but the kit has ${have.join(',')}`);
    }
    for (const v of c.variants || []) if (first?.parent && !(c.kit[0].key + v in first.parent)) errors.push(`${w}: the kit has no ${c.kit[0].key}${v}`);
    if (c.provides && (!local || ctx.films)) {
      const r0 = c.kit[0], src = fs.readFileSync(local ? path.join(ctx.films, r0.path.slice('films/'.length)) : path.join(repo, r0.path), 'utf8');
      for (const n of Object.values(c.provides).flat()) if (!new RegExp(`['.]${n}\\b|^\\s*${n}\\s*[:(]`, 'm').test(src)) errors.push(`${w}: ${r0.path} does not define ${n}`);
    }
    // covers: the hand poses, moves and film-made props this part replaces, which the checker names as "use instead"
    for (const [k, list] of Object.entries(c.covers || {})) {
      if (!COVERS.includes(k) || !Array.isArray(list) || list.some(n => typeof n !== 'string')) { errors.push(`${w}: covers.${k} is not one of ${COVERS.join(', ')} with a list of names`); continue; }
      for (const n of list) { const was = coveredBy.get(`${k}:${n}`); if (was) errors.push(`${w}: covers ${k} "${n}", which ${was} covers already`); coveredBy.set(`${k}:${n}`, c.id); }
    }
    if (c.mark != null && (typeof c.mark !== 'string' || !c.mark)) errors.push(`${w}: mark is the text a shot's \`why\` carries for this part`);
  }
  if (catalog.governs != null && (!Array.isArray(catalog.governs) || catalog.governs.some(g => typeof g !== 'string' || !/^[a-z0-9*-]+$/.test(g))))
    errors.push(`governs: a list of film-slug patterns (letters, digits, - and *)`);
  for (const R of REGISTRIES) {
    const mod = await import(pathToFileURL(path.join(repo, R.path)).href);
    const covered = new Set(C.filter(c => c.kind === R.kind).map(c => c.kit?.[0]?.key));
    for (const k of R.keys(mod[R.export])) if (!covered.has(k)) errors.push(`kit ${R.kind} "${k}" (${R.path}) has no catalog entry: add it, trial or retired`);
  }
  if (unchecked.size) warnings.push(`${unchecked.size} entries point into films/ and were not checked`);
  const count = (L, f) => L.reduce((o, x) => (o[f(x)] = (o[f(x)] || 0) + 1, o), {});
  const stats = { tokens: T.length, tiers: count(T, t => t.tier), tokenStatus: count(T, t => t.status), gaps: T.filter(t => t.gap).map(t => t.name),
    components: C.length, kinds: count(C, c => c.kind), status: count(C, c => c.status), filmLocal: C.filter(c => (c.kit || []).some(r => r.path?.startsWith('films/'))).length, unchecked: unchecked.size };
  return { errors, warnings, stats, resolve };
}

export const KIND_VI = { 'motion-clip': 'Clip chuyển động', face: 'Nét mặt', 'camera-kind': 'Loại shot', 'camera-move': 'Di máy', prop: 'Đạo cụ', set: 'Bối cảnh',
  cast: 'Nhân vật', rig: 'Bộ xương', 'caption-style': 'Phụ đề', 'card-2d': 'Thẻ 2D', fx: 'Hiệu ứng trong cảnh', 'look-preset': 'Ánh sáng, màu' };
export const TIER_VI = { primitive: 'Giá trị gốc', semantic: 'Theo mục đích', component: 'Theo thành phần' };
export const ST_VI = { stable: 'ổn định', trial: 'thử', retired: 'bỏ' };
const cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const show = v => v === null ? 'trống' : Array.isArray(v) ? `[${v.join(', ')}]` : v && typeof v === 'object' ? (v.min != null ? `${show(v.min)}-${show(v.max)}` : JSON.stringify(v)) : String(v);

export function render({ tokens, catalog }, { stats, resolve }) {
  const out = ['# Hot Money: danh mục (Kai duyệt 17/11)', '',
    'Sinh từ `tokens.json` và `catalog.json` bởi `node styles/stick-man/bible/catalog.mjs`. Đừng sửa tay file này.', '',
    `${stats.tokens} token (${TIERS.map(t => `${stats.tiers[t] || 0} ${TIER_VI[t].toLowerCase()}`).join(', ')}), ${stats.gaps.length} chỗ trống. ` +
    `${stats.components} thành phần (${stats.status.stable || 0} ổn định, ${stats.status.trial || 0} thử, ${stats.status.retired || 0} bỏ), ${stats.filmLocal} nằm trong phim, chờ đưa vào kit.`, ''];
  for (const k of KINDS) {
    const L = catalog.components.filter(c => c.kind === k);
    if (!L.length) continue;
    out.push(`## ${KIND_VI[k]} (${L.length})`, '', k === 'motion-clip' ? '| id | thân | trạng thái | dùng khi | không bao giờ | Kai |' : '| id | tên | trạng thái | dùng khi | không bao giờ | Kai |', '|---|---|---|---|---|---|');
    for (const c of L) {
      const ev = [...(c.evidence?.praise || []).map(i => '+' + i), ...(c.evidence?.complaints || []).map(i => '-' + i)].join(' ');
      const local = c.kit.some(r => r.path.startsWith('films/')) ? ' (phim)' : '';
      const instead = Object.values(c.covers || {}).flat();
      out.push(`| \`${c.id}\` | ${cell(k === 'motion-clip' ? c.bodies.join(', ') : c.name)} | ${ST_VI[c.status]}${local} | ${cell(c.use)}${instead.length ? ` (thay cho ${cell(instead.join(', '))})` : ''} | ${cell(c.never)} | ${ev} |`);
    }
    out.push('');
  }
  for (const tier of TIERS) {
    const L = tokens.tokens.filter(t => t.tier === tier);
    out.push(`## Token: ${TIER_VI[tier].toLowerCase()} (${L.length})`, '', '| tên | giá trị | đơn vị | dùng khi | gốc | nguồn | trạng thái |', '|---|---|---|---|---|---|---|');
    for (const t of L) {
      let v; try { v = resolve(t.value); } catch { v = '?'; }
      const val = typeof t.value === 'string' && ALIAS.test(t.value) ? `${t.value.slice(1, -1)} = ${show(v)}` : show(v);
      const src = [t.source.kind, ...(t.source.evidence || [])].join(' ');
      out.push(`| \`${t.name}\` | ${cell(val)} | ${cell(t.unit)} | ${cell(t.gap ? 'TRỐNG: ' + t.gap : t.usage)} | ${t.root} | ${cell(src)} | ${ST_VI[t.status]} |`);
    }
    out.push('');
  }
  out.push('Ký hiệu: `+S3-013` là Kai khen, `-S3-002` là Kai chê (id trong kai-taste). "(phim)" là phần nằm trong `films/`, chưa vào kit.', '');
  return out.join('\n');
}

async function main(argv) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const dir = path.resolve(arg('--dir') || path.join(HERE, 'hot-money'));
  const bible = loadBible(dir);
  const r = await validate(bible, { films: arg('--films') || path.join(REPO, 'films'), taste: arg('--taste') || path.join(os.homedir(), '.claude/skills/kai-taste'), strict: argv.includes('--strict') });
  const s = r.stats;
  const rel = path.relative(REPO, dir);
  console.log(`bible ${rel.startsWith('..') ? dir : rel}`);
  console.log(`  tokens ${s.tokens}: ${TIERS.map(t => `${t} ${s.tiers[t] || 0}`).join(', ')}; ${s.tokenStatus.stable || 0} stable, ${s.tokenStatus.trial || 0} trial, ${s.gaps.length} gaps`);
  console.log(`  components ${s.components}: ${KINDS.filter(k => s.kinds[k]).map(k => `${k} ${s.kinds[k]}`).join(', ')}`);
  console.log(`  status: ${s.status.stable || 0} stable, ${s.status.trial || 0} trial, ${s.status.retired || 0} retired; ${s.filmLocal} film-local`);
  for (const w of r.warnings) console.log(`  warn: ${w}`);
  for (const e of r.errors) console.error(`  ERROR ${e}`);
  if (r.errors.length) { console.error(`${r.errors.length} broken entries`); process.exit(1); }
  if (!argv.includes('--check')) { fs.writeFileSync(path.join(dir, 'CATALOG.md'), render(bible, r)); console.log(`  wrote ${path.relative(REPO, path.join(dir, 'CATALOG.md'))}`); }
  console.log('ok');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
