// Freshness of judged evidence (stagegate.mjs `newerThan`): a review is stale only when what it judged changed, not when
// the file was touched. For a JSON file the tool hashes everything except metadata no viewer sees or hears (DROP below):
//   storyboard.json  each shot's picked option is applied first, then `options` (the other picks) and `pick` are dropped
//   any .json        DROP keys are removed at every depth; key order and formatting do not count
//   anything else    mtime only (the review must be newer than the file)
// What a review was checked against is kept in review/.fresh.json: { "<review>": { "<target>": { hash, ev } } }, where
// ev is the review's mtime. The record is written the first time stagegate sees the review newer than the target; from
// then on, while the review file is unchanged, the review is fresh exactly when the target's judged hash is the same.
// Rewriting the review drops the record (its mtime no longer matches), and the next run records the new state.
// Limit (first sight): a target changed before stagegate ever saw the review has no record, so mtime decides (stale).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';

export const DROP = new Set(['notes', 'note', 'purpose', 'why', 'comments', 'comment']);

const strip = v => Array.isArray(v) ? v.map(strip)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !DROP.has(k)).map(([k, x]) => [k, strip(x)])) : v;
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v ?? null);
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** A parsed JSON file without what a reviewer did not judge (see the header). */
export function judgedView(rel, data) {
  if (path.basename(rel) === 'storyboard.json' && Array.isArray(data?.shots)) data = { ...data, shots: data.shots.map(s => {
    const o = s.pick != null && s.options?.[s.pick], m = o ? { ...s, ...o } : { ...s };
    delete m.options; delete m.pick; return m; }) };
  return strip(data);
}

/** Hash of the judged view of `file` (absolute), or null when it is not a JSON file (mtime decides then). */
export function judgedHash(file, rel = file) {
  if (!/\.json$/i.test(file) || !fs.existsSync(file)) return null;
  try { return sha(canon(judgedView(rel, JSON.parse(fs.readFileSync(file, 'utf8'))))); } catch { return null; }
}

/**
 * Is review `ev` fresh against target `n` (both relative to the film folder)? Updates `book` (review/.fresh.json) in
 * place when it records a new state. Returns { fresh, why }.
 */
export function isFresh(dir, ev, n, book) {
  const F = p => path.join(dir, p), mt = p => fs.existsSync(F(p)) ? Math.round(fs.statSync(F(p)).mtimeMs) : 0;
  const tm = mt(n), em = mt(ev);
  if (!tm) return { fresh: true, why: 'no target yet' };
  const h = judgedHash(F(n), n);
  if (h == null) return tm > em ? { fresh: false, why: `older than ${n} (stale: review again)` } : { fresh: true, why: 'newer' };
  if (!book[ev] || typeof book[ev] !== 'object') book[ev] = {};
  const rec = book[ev][n];
  if (rec && rec.ev === em) return rec.hash === h ? { fresh: true, why: 'same judged content' }
    : { fresh: false, why: `${n} changed what a viewer sees or hears since this review (stale: review again)` };
  if (tm > em) return { fresh: false, why: `older than ${n} and no record of what it judged (stale: review again)` };
  book[ev][n] = { hash: h, ev: em };
  return { fresh: true, why: 'newer (recorded)' };
}
