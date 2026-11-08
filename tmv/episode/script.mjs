// script.mjs: the shape of episode.json (episode.schema.json) and the script rules of the real season's script-v4.
import { readFileSync } from 'node:fs';

export const SCHEMA = JSON.parse(readFileSync(new URL('./episode.schema.json', import.meta.url), 'utf8'));

const TYPE = { string: 'a text', integer: 'a whole number', number: 'a number', object: 'an object', array: 'a list', boolean: 'true or false' };
const typeOf = v => Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : v === null ? 'null' : typeof v;
const fits = (v, t) => t === typeOf(v) || (t === 'number' && typeof v === 'number');
const LIST = { beats: 'beat', cast: 'cast', stats: 'stat' };
const where = path => path.map((p, i) => typeof p === 'number' ? `${LIST[path[i - 1]] ?? 'item'} ${p + 1}`
  : LIST[p] && typeof path[i + 1] === 'number' ? null : `"${p}"`).filter(Boolean).join(' ');

export function shapeErrors(e) {
  const errs = [];
  const walk = (v, s, path) => {
    if (s.$ref) s = { ...s.$ref.split('/').slice(1).reduce((n, k) => n[k], SCHEMA), ...s, $ref: undefined };
    const at = where(path) || 'episode.json', hint = s.description ? ` (${s.description})` : '';
    if (s.enum && !s.enum.includes(v)) return errs.push(`${at}: "${v}" is not one of ${s.enum.join(', ')}`);
    const types = [s.type ?? []].flat();
    if (types.length && !types.some(t => fits(v, t))) return errs.push(`${at} must be ${types.map(t => TYPE[t]).join(' or ')}${hint}`);
    if (typeof v === 'string' && s.minLength && !v.trim()) return errs.push(`${at} must be a text${hint}`);
    if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern).test(v)) return errs.push(`${at}: "${v}" is not ${s.description}`);
    if (typeof v === 'number' && ((s.minimum !== undefined && v < s.minimum) || (s.maximum !== undefined && v > s.maximum)))
      return errs.push(`${at}: ${v} is out of range${hint}`);
    if (Array.isArray(v)) {
      if (s.minItems && v.length < s.minItems) return errs.push(`${at} must list at least ${s.minItems}${hint}`);
      if (s.items) v.forEach((x, i) => walk(x, s.items, [...path, i]));
    } else if (v && typeof v === 'object') {
      for (const k of s.required ?? []) if (v[k] === undefined) errs.push(`${at} has no "${k}"${hint}`);
      for (const [k, x] of Object.entries(v)) {
        if (x === undefined) continue;
        if (s.properties?.[k]) walk(x, s.properties[k], [...path, k]);
        else if (s.additionalProperties === false) errs.push(`${path.length ? at + ': ' : ''}"${k}" is unknown (${Object.keys(s.properties ?? {}).filter(p => p !== '$schema').join(', ')})`);
        else if (typeof s.additionalProperties === 'object') walk(x, s.additionalProperties, [...path, k]);
      }
    }
  };
  walk(e, SCHEMA, []);
  return errs;
}

const sentences = line => line.split(/(?<=[.!?]["”']?)\s+/).map(s => s.trim()).filter(Boolean);
const words = s => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
const PAPER = ['card', 'stats', 'previously'];
const beatsOf = (e, f) => e.beats.flatMap((b, i) => f(b, i) ?? []);

export const RULES = [
  { id: 'short', what: 'every sentence is 12 words or fewer',
    check: e => beatsOf(e, (b, i) => sentences(b.line).filter(s => words(s).length > 12).map(s => ({ beat: i + 1, got: `${words(s).length} words: "${s}"` }))),
    fix: 'split the sentence in two' },
  { id: 'link', what: 'each beat follows the one before with BUT or SO, never "and then" (Story Spine)',
    check: e => beatsOf(e, (b, i) => /^(and )?then\b/i.test(b.line) ? { beat: i + 1, got: `opens with "and then": "${b.line}"` }
      : i > 0 && i < e.beats.length - 1 && !PAPER.includes(b.shot) && !b.link && !/^(but|so)\b/i.test(b.line) ? { beat: i + 1, got: `no BUT or SO: "${b.line}"` } : null),
    fix: 'open the line with But or So, or set "link": "but" or "so" when the word is implied (cards and the vote need none)' },
  { id: 'source', what: 'every claim (a card or a stats beat) names its source',
    check: e => beatsOf(e, (b, i) => ['card', 'stats'].includes(b.shot) && !b.source ? { beat: i + 1, got: `a ${b.shot} with no "source": "${b.line}"` } : null),
    fix: 'add "source": where the fact comes from (a study, a page, a post\'s insights)' },
  { id: 'vote', what: 'the episode closes on a vote: one question, exactly 2 tags, both said in the last line',
    check: e => {
      const v = e.vote, tags = [v.tagA ?? 'A', v.tagB ?? 'B'], last = e.beats.at(-1).line, n = e.beats.length;
      const said = [...new Set(words(last).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(w => w !== 'I' && /^\p{Lu}+$/u.test(w)))];
      const bad = [];
      if (tags[0] === tags[1]) bad.push(`both tags are "${tags[0]}"`);
      if (!v.question.trim().endsWith('?')) bad.push(`the question "${v.question}" is not a question`);
      if (!tags.every(t => words(last).some(w => w.replace(/[^\p{L}\p{N}]/gu, '') === String(t))) || said.some(w => !tags.includes(w))) bad.push(`the last line says ${said.join(', ') || 'no tag'}, not just ${tags.join(' and ')}: "${last}"`);
      return bad.map(got => ({ beat: n, got }));
    },
    fix: 'end on one beat like "Comment A for the demo, or B for the story." with "vote": {"question": "...?", "tagA": "A", "tagB": "B"}' },
  { id: 'you', what: 'the narrator tells it to "you": the lead is never named, and a third of the lines or more say you',
    check: (e, { lead = [] } = {}) => {
      const named = lead.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${lead.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`, 'iu') : null;
      const you = e.beats.filter(b => /\b(you|your|you're|yours)\b/i.test(b.line)).length;
      return [...beatsOf(e, (b, i) => named?.test(b.line) ? { beat: i + 1, got: `names the lead (${b.line.match(named)[0]}): "${b.line}"` } : null),
        ...(you * 3 < e.beats.length ? [{ beat: null, got: `${you} of ${e.beats.length} lines say "you"` }] : [])];
    },
    fix: 'write the lead as "you" ("You shipped your app today.")' },
];

export const checkScript = (e, ctx) => RULES.flatMap(r => r.check(e, ctx).map(f => ({ rule: r.id, ...f, fix: r.fix })));
