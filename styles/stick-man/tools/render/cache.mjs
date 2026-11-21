// Segment cache for tools/shot.mjs --tier ... --mp4: a part render is reused only when everything that made it is the same.
// The key (sha256) covers: the kit (git trees of styles/stick-man and kit/ at HEAD, plus any uncommitted change there), the
// tier, size and page query, the frame range, the voice timing (vo/words.json), the bible (styles/stick-man/bible/<series>/
// data and the film's bible-exceptions.json), the audio track muxed in, and every file the page loaded while rendering
// (reel.js, the film's r5 code, shared GLBs and textures, three.js), each by content. The sidecar <mp4>.json holds the key,
// the inputs and that file list; the next run re-hashes the same files, so an edit to any of them is a miss.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
export const fileHash = abs => fs.existsSync(abs) ? sha(fs.readFileSync(abs)) : null;
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const keyOf = (inputs, deps) => sha(JSON.stringify(canon({ inputs, deps })));

const KIT = ['styles/stick-man', 'kit'];
// git inside a hook inherits GIT_DIR and GIT_INDEX_FILE, which beat cwd: drop them so `root` decides the repository
export const gitEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
// the kit as it is on disk: committed trees plus the uncommitted diff and untracked files under them
export function kitStamp(root) {
  const git = args => execFileSync('git', args, { cwd: root, env: gitEnv(), stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).toString();
  const trees = KIT.map(d => git(['rev-parse', `HEAD:${d}`]).trim()).join(' ');
  const diff = git(['diff', 'HEAD', '--', ...KIT]);
  const untracked = git(['ls-files', '--others', '--exclude-standard', '--', ...KIT]).split('\n').filter(Boolean)
    .map(f => f + ' ' + fileHash(path.join(root, f))).join('\n');
  return diff || untracked ? `${trees} dirty:${sha(diff + '\n' + untracked).slice(0, 16)}` : trees;
}

// the bible that governs the film: its series folder's data files and the film's exceptions
export function bibleStamp(root, filmDir) {
  const B = path.join(root, 'styles/stick-man/bible'), parts = [];
  for (const d of fs.readdirSync(B, { withFileTypes: true }).filter(e => e.isDirectory())) {
    const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.(json|tsv|md)$/.test(e.name)) parts.push(path.relative(B, p) + ' ' + fileHash(p)); } };
    walk(path.join(B, d.name));
  }
  parts.push('exceptions ' + fileHash(path.join(filmDir, 'bible-exceptions.json')));
  return sha(parts.join('\n'));
}

// deps: repo-relative paths -> content hash (null = missing)
export const hashDeps = (root, rels) => Object.fromEntries([...rels].sort().map(r => [r, fileHash(path.join(root, r))]));

const firstDiff = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].find(k => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]));

// { hit, why }: why names the first input that differs. Never a hit across tiers.
export function check(root, out, inputs) {
  const side = out + '.json';
  if (!fs.existsSync(out) || !fs.existsSync(side)) return { hit: false, why: 'no earlier render with a sidecar' };
  let S; try { S = JSON.parse(fs.readFileSync(side, 'utf8')); } catch { return { hit: false, why: 'sidecar unreadable' }; }
  if (S.inputs?.tier !== inputs.tier) return { hit: false, why: `earlier render is tier ${S.inputs?.tier}, this is ${inputs.tier}` };
  const k = firstDiff(S.inputs, inputs);
  if (k) return { hit: false, why: `${k} changed` };
  const now = hashDeps(root, Object.keys(S.deps || {})), d = firstDiff(S.deps, now);
  if (d) return { hit: false, why: `${d} changed` };
  if (keyOf(inputs, now) !== S.key) return { hit: false, why: 'key differs' };
  return { hit: true, why: `same inputs (key ${S.key.slice(0, 12)})` };
}

export function save(root, out, inputs, depRels) {
  const deps = hashDeps(root, depRels), key = keyOf(inputs, deps);
  fs.writeFileSync(out + '.json', JSON.stringify({ key, tier: inputs.tier, at: new Date().toISOString(), inputs, deps }, null, 1) + '\n');
  return key;
}
