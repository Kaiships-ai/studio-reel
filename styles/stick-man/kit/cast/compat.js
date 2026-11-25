// Which kit parts go together: the reader of kit/compat.json (written by tools/gates/fits.mjs, never by hand). Browser and node.
//   personKey({ body, girth, outfit })   'elder/g1/cardigan+shirt:office': kit parts only. Colours are dropped, the garments sorted, the words
//                                        that change a garment's shape kept (SHAPES); scale, headScale, legScale too where they are
//                                        not the body's own. outfit: a costume list ('job:…' is opened)
//   pair(kind, ...parts)                 the row's name: 'clip' (personKey, clip) · 'face' (age, body) · 'mark' (mark, hat) ·
//                                        'hand' (prop, body, 'hand' | 'seat') · 'outfit' (garment, body) · 'light' (prop, light).
//                                        A bold mark is 'bold:<mark>'
//   lookup(pair)                         { pair, verdict, number, unit, why? }; a pair with no row is 'untested'
//   usable(pair, waivers)                { ok, row }: ok for a verdict in USABLE, or a waiver { pair, why, by } of exactly this pair
//   table(data)                          the same lookup and usable over another table's data ({ rows })
import T from '../compat.json' with { type: 'json' };
import { BODIES } from '#motion-lib/bodies.js';
import { expand } from './jobs.js';
import { clipId } from './clothsafe.js';

export const USABLE = ['pass', 'accepted'], VERDICTS = [...USABLE, 'blocked', 'untested'];
// a layer -> the words after it that change its shape; any other word of these layers is a colour
export const SHAPES = {
  shirt: ['office', 'police', 'work'], scrubs: [], coat: ['doctor', 'lab'], jacket: ['chef', 'pilot'], vest: ['hivis'], blazer: [], cardigan: [], sweater: [], dress: [], skirt: [], apron: ['low'], scarf: [],
  tie: ['stripe'], stethoscope: [], nametag: [], pens: [], badge: ['police', 'id', 'wings', 'crest'], epaulettes: [], dutybelt: [], backpack: [], cap: ['police', 'pilot', 'scrub'], hat: ['hard', 'toque', 'cowboy', 'flat', 'bowler', 'top'],
  hoodie: [], belt: [], holster: ['L'],
};
export const shapeOf = item => { const [k, ...w] = String(item).split(':'); return SHAPES[k] ? [k, ...w.filter(x => SHAPES[k].includes(x))].join(':') : String(item); };
// the layers the table is measured on: kit/cast/wardrobe.js's own (a hoodie, a belt, a holster and the old hats are not)
const OLD = /^(hoodie|belt|holster|hat:(cowboy|flat|bowler|top))(:|$)/;
export const measured = list => expand([].concat(list || [])).filter(it => SHAPES[String(it).split(':')[0]] && !OLD.test(it));

export function personKey({ body = 'adult', girth, scale, headScale, legScale, outfit = [] } = {}) {
  const own = BODIES[body]?.spec; if (!own) throw new Error(`compat: no body "${body}" (${Object.keys(BODIES).join(', ')})`);
  const n = v => +(+v).toFixed(3), odd = (v, k, l) => (v != null && n(v) !== n(own[k] ?? 1) ? `,${l}${n(v)}` : '');
  const build = `g${n(girth ?? own.girth ?? 1)}${odd(scale, 'scale', 's')}${odd(headScale, 'headScale', 'h')}${odd(legScale, 'legScale', 'l')}`;
  return `${body}/${build}/${expand([].concat(outfit || [])).map(shapeOf).sort().join('+') || 'plain'}`;
}

// the bodies each face age is drawn for: a face row is measured, and usable, on these only
export const FACE_BODIES = { adult: ['adult', 'heavy', 'thin'], elder: ['elder'], child: ['child'], teen: ['teen'], toddler: ['toddler'] };

const KINDS = { clip: 2, face: 2, mark: 2, hand: 3, outfit: 2, light: 2 };
export function pair(kind, ...parts) {
  if (!KINDS[kind]) throw new Error(`compat: no pair kind "${kind}" (${Object.keys(KINDS).join(', ')})`);
  if (parts.length !== KINDS[kind] || parts.some(p => !p)) throw new Error(`compat: ${kind} takes ${KINDS[kind]} parts, not ${JSON.stringify(parts)}`);
  if (kind === 'hand' && !['hand', 'seat'].includes(parts[2])) throw new Error(`compat: hand|prop|body|hand or seat, not "${parts[2]}"`);
  return [kind, ...(kind === 'clip' ? [parts[0], clipId(parts[1])] : parts)].join('|');
}

export function table({ rows }) {
  const M = new Map(); for (const r of rows) { if (M.has(r.pair)) throw new Error(`compat: ${r.pair} is in the table twice`); M.set(r.pair, r); }
  const lookup = p => { const r = M.get(p); return r && VERDICTS.includes(r.verdict) ? r : { pair: p, verdict: 'untested', number: null, unit: null, why: r ? `verdict "${r.verdict}" is not one of the table's` : 'no row: not measured' }; };
  return { lookup, usable(p, waivers = []) { const row = lookup(p); return { ok: USABLE.includes(row.verdict) || waivers.some(w => w.pair === p && !!w.why && !!w.by), row }; } };
}
export const { lookup, usable } = table(T);
