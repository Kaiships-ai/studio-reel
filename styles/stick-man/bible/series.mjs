// What a series' bible folder may hold, and the check for a new series' skeleton (bible/_template/).
//   node styles/stick-man/bible/series.mjs <series.json>   -> lists what is missing or still a placeholder
// A series is data: names, hashes, palettes, clip lists. A number that decides pass or fail (a limit, a threshold) is a
// kit gate's job (tools/GATES.json, WHOCHECKS.json) so every series is held to the same bar. thresholdKeys() finds such keys;
// the boundary test (test/unit/stick-boundary.test.mjs) fails CI on any in bible/<series>/*.json.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// min/max inside a token's `value` is the range of a colour or a size (data), so it is allowed there.
const GATE_KEY = /^(limit|limits|threshold|thresholds|tolerance|tol|min[A-Z_-].*|max[A-Z_-].*|.*(Min|Max|Limit|Threshold))$/;
const RANGE_KEY = /^(min|max)$/;
export function thresholdKeys(node, path = '$', parentKey = '') {
  const out = [];
  if (Array.isArray(node)) node.forEach((v, i) => out.push(...thresholdKeys(v, `${path}[${i}]`, parentKey)));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) {
    const bad = GATE_KEY.test(k) || (RANGE_KEY.test(k) && parentKey !== 'value');
    if (bad) out.push(`${path}.${k}`);
    out.push(...thresholdKeys(v, `${path}.${k}`, k));
  }
  return out;
}

export const SECTIONS = {
  characters: 'array', facesApproved: 'object', palette: 'object', colourScript: 'object', sets: 'array',
  sound: 'object', voice: 'object', episodeFrame: 'object', referenceClips: 'array',
};
const typeOf = v => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;

// problems in a series file: a missing section, a wrong type, a threshold key. strict = also every "<fill>" left in it.
export function validateSeries(s, { strict = false } = {}) {
  const p = [];
  if (typeOf(s) !== 'object') return ['the file is not an object'];
  if (typeof s.series !== 'string' || !s.series) p.push('series: the series slug is missing');
  for (const [k, t] of Object.entries(SECTIONS)) if (typeOf(s[k]) !== t) p.push(`${k}: expected ${t}, found ${typeOf(s[k])}`);
  if (s.facesApproved && !('hash' in s.facesApproved)) p.push('facesApproved: hash is missing');
  p.push(...thresholdKeys(s).map(k => `${k}: a threshold belongs in a kit gate, not in series data`));
  if (strict) (function walk(n, at) {
    if (n === '<fill>') p.push(`${at}: still <fill>`);
    else if (Array.isArray(n)) n.forEach((v, i) => walk(v, `${at}[${i}]`));
    else if (n && typeof n === 'object') for (const [k, v] of Object.entries(n)) walk(v, `${at}.${k}`);
  })(s, '$');
  return p;
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const f = process.argv[2];
  if (!f) { console.error('usage: series.mjs <series.json>'); process.exit(2); }
  const probs = validateSeries(JSON.parse(fs.readFileSync(f, 'utf8')), { strict: true });
  console.log(probs.length ? probs.join('\n') : 'ok: every section is filled');
  process.exit(probs.length ? 1 : 0);
}
