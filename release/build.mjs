// release/build.mjs: the release zips, straight from git (uncommitted changes never ship).
//   node release/build.mjs [--ref HEAD] [--tag v1.6] [--tier starter|pro|tmv|all] [--out dist] [--dry-run]
// kit.manifest decides what ships. Writes dist/kaiships-studio-<tier>-<version>.zip (every entry under
// kaiships-studio/) and dist/SHA256SUMS. Same ref = same bytes (sorted entries, the commit's time on every file).
// Refuses to write anything when a check fails: unclassified files, a Pro or dev file in Starter, a forbidden string,
// anything that names this repository (in any file, binaries included),
// Chinese text in a buyer document, a skill a document names that the edition lacks, missing licences,
// a font a style's css/html loads that is not in the zip.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateRawSync, crc32 } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const REF = opt('ref', opt('tag', 'HEAD')), TAG = opt('tag', ''), OUT = resolve(opt('out', join(ROOT, 'dist')));
// tmv = the paid "How we make Ten Million Views" kit (PLAN.md); it also refuses everything in [tmv_forbid]
const TIERS = { starter: ['starter'], pro: ['starter', 'pro'], tmv: ['starter'] };
const tiers = opt('tier', 'all') === 'all' ? ['starter', 'pro', 'tmv'] : [opt('tier')];
const DRY = argv.includes('--dry-run');
const git = (args, input) => {
  const r = spawnSync('git', args, { cwd: ROOT, input, maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error(`✗ git ${args.join(' ')}: ${String(r.stderr).trim()}`); process.exit(1); }
  return r.stdout;
};

// ---------- the manifest ----------
export function parseManifest(text) {
  const m = { dev: [], pro: [], starter: [], forbid: [], identity: [], tmv_forbid: [], tmv_exclude: [], vendored: [] }; let sec = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const s = /^\[(\w+)\]$/.exec(line); if (s) { sec = s[1]; if (!m[sec]) throw new Error(`kit.manifest: unknown section [${sec}]`); continue; }
    if (!sec) throw new Error(`kit.manifest: "${line}" is outside a section`);
    m[sec].push(line);
  }
  return m;
}
const globRe = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*') + (g.endsWith('/') ? '.*' : '') + '$');
export function classify(files, m) {
  const order = ['dev', 'pro', 'starter'].map(s => [s, m[s].map(globRe)]);
  const by = { dev: [], pro: [], starter: [] }, none = [];
  for (const f of files) { const hit = order.find(([, res]) => res.some(r => r.test(f))); hit ? by[hit[0]].push(f) : none.push(f); }
  return { by, none };
}

// ---------- checks ----------
const TEXT = /\.(md|mjs|js|cjs|json|html|css|py|txt|toml|ya?ml|srt|sh|ps1)$|(^|\/)(LICENSE|CLAUDE\.md|AGENTS\.md)$/;
const EXEMPT = new Set(['LICENSE', 'THIRD_PARTY_NOTICES.md']);
const BUYER_DOC = f => /^[^/]+\.md$/.test(f) || /^\.claude\/skills\/[^/]+\/.*\.md$/.test(f) || f === 'workspace/README.md' || f === 'styles/README.md' || f === 'styles/catalog.md' || /^content-types\/.*\.md$/.test(f) || /^styles\/[^/]+\/(STYLE|DEMO|WORKFLOW|README)\.md$/.test(f);
const SKILL_REF = /(^|[\s`("'])\/(ig-[a-z]+|make-reel|studio|crowsnest|verify|episode|series)\b/g;
const STORY_SKILLS = ['chapter-writing', 'character-management', 'interactive-fiction', 'premise-workshop', 'reader-panel', 'research', 'story-init', 'story-maintenance', 'worldbuilding'];
const TMV_SKILLS = ['episode', 'series', 'studio', ...STORY_SKILLS].sort();
const PRO_SKILLS = ['ig-plan', 'ig-reel', 'ig-human', 'ig-viral', 'ig-dm', 'ig-caption'];

// A style's page that names a font file the zip lacks renders in a browser fallback font, silently.
export function missingFonts(files, blob) {
  const set = new Set(files), out = [];
  for (const f of files) {
    if (!/^styles\/.*\.(css|html)$/.test(f)) continue;
    for (const [, raw] of blob(f).toString('utf8').matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) {
      const url = raw.replace(/[?#].*$/, '');
      if (!/\.(woff2?|ttf|otf)$/i.test(url) || /^[a-z]+:/i.test(url) || url.startsWith('/core/fonts/')) continue;
      const parts = url.startsWith('/') ? [] : f.split('/').slice(0, -1);
      for (const p of url.replace(/^\//, '').split('/')) p === '..' ? parts.pop() : p !== '.' && parts.push(p);
      if (!set.has(parts.join('/'))) out.push(`${f}: font ${url} is not in the zip`);
    }
  }
  return [...new Set(out)];
}

// A name of this repository in the zip, in any file: a buyer must not be able to follow it back here.
export function repoLinks(files, blob, patterns) {
  const res = patterns.map(p => [p, new RegExp(p, 'i')]), out = [];
  for (const f of files) {
    const t = blob(f).toString('latin1');
    for (const [p, re] of res) if (re.test(f) || re.test(t)) out.push(`${f}: names this repository ("${p}")`);
  }
  return out;
}

export function check(tier, files, blob, m) {
  const errors = [], warns = [], set = new Set(files);
  const skills = [...new Set(files.map(f => /^\.claude\/skills\/([^/]+)\//.exec(f)?.[1]).filter(Boolean))].sort();
  const want = tier === 'tmv' ? TMV_SKILLS : tier === 'pro' ? ['make-reel', 'studio', ...PRO_SKILLS].sort() : ['make-reel', 'studio'];
  if (skills.join() !== want.join()) errors.push(`skills are [${skills}] but ${tier} must have exactly [${want}]`);
  for (const f of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'pixi.toml', 'pixi.lock', 'kit/env.mjs', 'kit/studio.mjs', '.claude/skills/studio/SKILL.md'])
    if (!set.has(f)) errors.push(`${f} is missing`);
  if (set.has('THIRD_PARTY_NOTICES.md')) {
    const n = blob('THIRD_PARTY_NOTICES.md').toString('utf8');
    const owed = ['LemoLab', ...(files.some(f => f.startsWith('styles/kai-hand-draw/')) ? ['John Heibel'] : []),   // his engine ships only inside kai-hand-draw
      ...(files.some(f => f.startsWith('.claude/skills/story-maintenance/')) ? ['Daniel Dewhurst'] : [])];
    for (const who of owed) if (!n.includes(who)) errors.push(`THIRD_PARTY_NOTICES.md does not credit ${who}`);
  }
  const forbid = m.forbid.map(p => [p, new RegExp(p)]), vendored = m.vendored.map(globRe);
  for (const f of files) {
    if (!TEXT.test(f) || EXEMPT.has(f)) continue;
    const t = blob(f).toString('utf8');
    for (const [p, re] of forbid) if (re.test(t)) errors.push(`${f}: contains forbidden "${p}"`);
    if (BUYER_DOC(f)) {
      // Chinese is allowed only as a quoted term of art in inline code (`留白` = empty space), never as running text
      const cjk = vendored.some(r => r.test(f)) ? 0 : (t.replace(/`[^`\n]*`/g, '').match(/\p{Script=Han}/gu) || []).length; if (cjk) errors.push(`${f}: ${cjk} Chinese characters outside inline code in a buyer document`);
      for (const [, , s] of t.matchAll(SKILL_REF)) {
        if (skills.includes(s)) continue;
        if ((tier === 'starter' || tier === 'tmv') && PRO_SKILLS.includes(s)) warns.push(`${f}: names /${s} (Pro only)`);
        else errors.push(`${f}: names /${s}, which this edition does not have`);
      }
    }
  }
  if (tier === 'tmv') for (const p of m.tmv_forbid) {
    const re = new RegExp(p, 'i');
    for (const f of files) if (!EXEMPT.has(f) && (re.test(f) || re.test(blob(f).toString('latin1')))) errors.push(`${f}: not ours to sell ("${p}")`);
  }
  errors.push(...missingFonts(files, blob), ...repoLinks(files, blob, m.identity));
  return { errors, warns: [...new Set(warns)] };
}

// The tmv zip = Starter minus [tmv_exclude], with every tmv/<path> replacing or adding <path>.
export function tmvFiles(by, overlay, m, blobs) {
  const ex = m.tmv_exclude.map(globRe), out = new Set(by.starter.filter(f => !ex.some(r => r.test(f))));
  const own = new Map(blobs), gone = m.tmv_exclude.map(g => /^styles\/([^/]+)\/$/.exec(g)?.[1]).filter(Boolean);
  for (const f of ['styles/README.md', 'styles/catalog.md']) if (out.has(f))
    own.set(f, Buffer.from(blobs.get(f).toString('utf8').split('\n').filter(l => !gone.some(g => l.includes(`\`${g}\``) || l.includes(`(${g}/`))).join('\n')));
  for (const f of overlay) { const to = f.slice(4); own.set(to, blobs.get(f)); out.add(to); }
  return { list: [...out].sort(), blob: f => own.get(f) };
}
const tmvVersion = (blob, tag, commit) => {
  const v = JSON.parse(blob('product.json').toString()).version;
  if (tag && v !== tag.replace(/^v/, '')) { console.error(`✗ tmv/product.json says version ${v}, the tag is ${tag}`); process.exit(1); }
  return tag ? v : `${v}-dev+${commit.slice(0, 7)}`;
};

// ---------- zip (stored or deflated, deterministic) ----------
export function zip(entries, date) {
  const dt = new Date(date), dosT = (dt.getUTCHours() << 11) | (dt.getUTCMinutes() << 5) | (dt.getUTCSeconds() >> 1);
  const dosD = ((dt.getUTCFullYear() - 1980) << 9) | ((dt.getUTCMonth() + 1) << 5) | dt.getUTCDate();
  const parts = [], central = []; let off = 0;
  for (const { name, data } of entries) {
    const nm = Buffer.from(name, 'utf8'), crc = crc32(data) >>> 0;
    const def = deflateRawSync(data, { level: 9 }), store = def.length >= data.length, body = store ? data : def;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(store ? 0 : 8, 8); h.writeUInt16LE(dosT, 10); h.writeUInt16LE(dosD, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nm, body);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(0x0314, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(store ? 0 : 8, 10); c.writeUInt16LE(dosT, 12); c.writeUInt16LE(dosD, 14); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28);
    c.writeUInt32LE((0o100644 << 16) >>> 0, 38); c.writeUInt32LE(off, 42);
    central.push(c, nm); off += 30 + nm.length + body.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}

// ---------- main ----------
if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) {
  const commit = git(['rev-parse', '--verify', `${REF}^{commit}`]).toString().trim();
  const date = git(['show', '-s', '--format=%cI', commit]).toString().trim();
  const files = git(['ls-tree', '-r', '-z', '--name-only', commit]).toString().split('\0').filter(Boolean).sort();
  const m = parseManifest(git(['show', `${commit}:kit.manifest`]).toString());
  const { by, none } = classify(files, m);
  if (none.length) { console.error(`✗ ${none.length} tracked file(s) match no section of kit.manifest:\n  ${none.slice(0, 30).join('\n  ')}`); process.exit(1); }
  // read every shipped blob once
  const overlay = by.dev.filter(f => f.startsWith('tmv/'));
  const ship = [...by.starter, ...by.pro, ...overlay];
  const out = git(['cat-file', '--batch'], ship.map(f => `${commit}:${f}`).join('\n') + '\n');
  const blobs = new Map(); let p = 0;
  for (const f of ship) {
    const nl = out.indexOf(10, p), head = out.subarray(p, nl).toString(), size = +head.split(' ')[2];
    blobs.set(f, out.subarray(nl + 1, nl + 1 + size)); p = nl + 1 + size + 1;
  }
  const baseBlob = f => blobs.get(f), blob = baseBlob;
  const product = JSON.parse(blob('product.json')?.toString() || '{}');
  const version = TAG ? TAG.replace(/^v/, '') : `${product.version || '0'}-dev+${commit.slice(0, 7)}`;
  if (TAG && !tiers.includes('tmv') && product.version !== TAG.replace(/^v/, '')) { console.error(`✗ product.json says version ${product.version}, the tag is ${TAG}`); process.exit(1); }
  console.log(`Kaiships Studio ${version} from ${commit.slice(0, 10)} (${date})\n  tracked ${files.length}: starter ${by.starter.length}, pro ${by.pro.length}, dev ${by.dev.length}`);
  let failed = false; const sums = [];
  for (const tier of tiers) {
    if (!TIERS[tier]) { console.error(`✗ unknown tier ${tier}`); process.exit(2); }
    const { list, blob } = tier === 'tmv' ? tmvFiles(by, overlay, m, blobs) : { list: TIERS[tier].flatMap(s => by[s]).sort(), blob: baseBlob };
    const { errors, warns } = check(tier, list, blob, m);
    for (const w of warns) console.log(`  ! ${tier}: ${w}`);
    if (errors.length) { failed = true; console.error(`✗ ${tier}: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`); continue; }
    const bytes = list.reduce((n, f) => n + blob(f).length, 0);
    console.log(`  ✓ ${tier}: ${list.length} files, ${(bytes / 1e6).toFixed(1)} MB before compression, every check passed`);
    if (DRY) continue;
    const dir = tier === 'tmv' ? 'tmv-studio' : 'kaiships-studio';
    const name = tier === 'tmv' ? `tmv-studio-${tmvVersion(blob, TAG, commit)}.zip` : `${dir}-${tier}-${version}.zip`;
    const z = zip(list.map(f => ({ name: `${dir}/${f}`, data: blob(f) })), date);
    mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, name), z);
    sums.push(`${createHash('sha256').update(z).digest('hex')}  ${name}`);
    console.log(`  → ${join(OUT, name)} (${(z.length / 1e6).toFixed(1)} MB)`);
  }
  if (failed) process.exit(1);
  if (sums.length) { writeFileSync(join(OUT, 'SHA256SUMS'), sums.join('\n') + '\n'); console.log(`  → ${join(OUT, 'SHA256SUMS')}`); }
}
