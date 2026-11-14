// Freshness of judged evidence (stagegate.mjs `newerThan`): a review is stale only when what it judged changed, not when
// the file was touched. For a JSON file the tool hashes a "judged view": the fields that change what a viewer sees or
// hears. Adding `options` for a shot's other picks, notes or purposes leaves the hash, and so every review, as it was.
//   storyboard.json  top: fps, size, last, climax · scenes: id, feel · each shot, with its picked option applied:
//                    SHOT_KEYS below (order counts)
//   vo/script.json   model, cast, say · each line: LINE_KEYS below
//   other .json      the whole parsed file (key order and formatting do not count)
//   anything else    mtime only (the review must be newer than the file)
// What a review was checked against is kept in review/.fresh.json: { "<review>": { "<target>": { hash, ev } } }, where
// ev is the review's mtime. The record is written the first time stagegate sees the review newer than the target; from
// then on, while the review file is unchanged, the review is fresh exactly when the target's judged hash is the same.
// Rewriting the review drops the record (its mtime no longer matches), and the next run records the new state.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';

export const SHOT_KEYS = ['id', 'scene', 'at', 'f0', 'dur', 'size', 'angle', 'lens', 'move', 'cam2d', 'panels', 'text', 'story'];
export const LINE_KEYS = ['id', 'who', 'style', 'text', 'pause_after'];

const pickKeys = (o, keys) => Object.fromEntries(keys.filter(k => o?.[k] !== undefined).map(k => [k, o[k]]));
// stable JSON: object keys sorted, so formatting and key order never change a hash
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v ?? null);
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** The fields of a parsed JSON file that a reviewer judged, by file name. */
export function judgedView(rel, data) {
  const base = path.basename(rel);
  if (base === 'storyboard.json') return {
    ...pickKeys(data, ['fps', 'size', 'last', 'climax']),
    scenes: (data.scenes || []).map(c => pickKeys(c, ['id', 'feel'])),
    shots: (data.shots || []).map(s => { const o = s.pick && s.options?.[s.pick]; return pickKeys(o ? { ...s, ...o } : s, SHOT_KEYS); }),
  };
  if (base === 'script.json') return { ...pickKeys(data, ['model', 'cast', 'say']), lines: (data.lines || []).map(l => pickKeys(l, LINE_KEYS)) };
  return data;
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
  const rec = book[ev]?.[n];
  if (rec && rec.ev === em) return rec.hash === h ? { fresh: true, why: 'same judged content' }
    : { fresh: false, why: `${n} changed what a viewer sees or hears since this review (stale: review again)` };
  if (tm > em) return { fresh: false, why: `older than ${n} and no record of what it judged (stale: review again)` };
  (book[ev] ||= {})[n] = { hash: h, ev: em };
  return { fresh: true, why: 'newer (recorded)' };
}
