// Colour gate (◇5) on the final render, against the film's colour script (colour-script.json, Kai-approved at [1.7]).
// A look the script declares passes; a colour change the script does not motivate fails.
//   node styles/stick-man/tools/colourgate.mjs films/<slug>   -> review/colourgate.md + review/colour.json, exit 1 unless PASS
//   node styles/stick-man/tools/colourgate.mjs --mp4 <file> --script <colour-script.json> [--decisions <json>] [--json 1]
// Shots: hard cuts measured on the mp4 (cutgate.mjs), the script's `cuts` and every scene start. Pictures are sampled at
// 10 a second at 144x256 with the HUD bands cropped (script `crop`). Per sample: L = mean Rec.601 luma 0-255, S = mean HSV
// saturation 0-1, R/B = mean red over mean blue, black = 2nd percentile luma, hero white = pixels with luma > 140 and
// chroma under 15 % (the hoodie and white props), hue families of the pixels with S >= .25 and V >= .2.
// Verdicts: PASS, FAIL (a finding not waived), DRAFT (no finding, but the script is not approved by Kai). Only PASS exits 0.
// Needs T3 pixels (shot.mjs --tier review, 720x1280 full quality or larger): a T2 proof (480p, no lens blur, low shadows) or
// anything under 720 wide is refused with exit 2 (tools/render/tiers.mjs pixelGateError). gate() itself measures any mp4.
// A finding is waived by an approved DECISIONS.json entry { "waives": "colourgate.G9", "by": "kai", "at": "<date>" }.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { finalRender } from './renders.mjs';
import { sceneScores, hardCuts, duration } from './cutgate.mjs';
import { waiverFor } from './kituse.mjs';
import { median } from './stats.mjs';
import { renderInfo, pixelGateError } from './render/tiers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const W = 144, H = 256, FPS = 10, EDGE_S = 0.1;

// hue families on the HSV wheel (degrees, start inclusive); the script names them in `palette`, `hues` and `flood`
export const FAMILIES = { red: [[345, 360], [0, 15]], warm: [[15, 70]], green: [[70, 170]], cool: [[170, 280]], pink: [[280, 345]] };
const FAMILY_NAMES = Object.keys(FAMILIES);

export const DEFAULTS = {
  rb: [0.8, 1.6], sat: [0.25, 0.7], black: [10, 26],
  hero: { luma: 175, rb: [0.95, 1.10], minShare: 0.05 },
  cut: { same: { luma: 25, sat: 0.15 }, scene: { luma: 50, sat: 0.25 } },
  inShot: { luma: 25, window: 0.5 },
  flood: { share: 0.9, seconds: 3 }, offPalette: 0.2,
  film: { luma: 100, dark: 70, darkShare: 0.15 },
  crop: { top: 0.10, bottom: 0.12 },
};

const familyOf = h => FAMILY_NAMES.find(n => FAMILIES[n].some(([a, b]) => h >= a && h < b));

export function frameStats(rgb, w = W, h = H, crop = DEFAULTS.crop) {
  const y0 = Math.round(crop.top * h), y1 = h - Math.round(crop.bottom * h);
  const hist = new Uint32Array(256), hues = Object.fromEntries(FAMILY_NAMES.map(n => [n, 0]));
  let n = 0, sumL = 0, sumS = 0, sumR = 0, sumB = 0, heroN = 0, heroL = 0, heroR = 0, heroB = 0, coloured = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3, r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = 0.299 * r + 0.587 * g + 0.114 * b, s = mx ? (mx - mn) / mx : 0;
    n++; sumL += L; sumS += s; sumR += r; sumB += b; hist[L | 0]++;
    if (L > 140 && s < 0.15) { heroN++; heroL += (r + g + b) / 3; heroR += r; heroB += b; }
    if (s >= 0.25 && mx >= 51) {
      const d = mx - mn, hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hues[familyOf(hh * 60)]++; coloured++;
    }
  }
  let acc = 0, black = 0; while (black < 255 && (acc += hist[black]) < 0.02 * n) black++;
  return { L: sumL / n, S: sumS / n, rb: sumR / Math.max(sumB, 1), black,
    hero: { share: heroN / n, L: heroN ? heroL / heroN : null, rb: heroN ? heroR / Math.max(heroB, 1) : null },
    coloured: coloured / n, hues: Object.fromEntries(FAMILY_NAMES.map(k => [k, coloured ? hues[k] / coloured : 0])) };
}

export function decodeSamples(mp4, crop) {
  const r = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', mp4, '-an', '-vf', `fps=${FPS},scale=${W}:${H},format=rgb24`,
    '-f', 'rawvideo', '-'], { capture: true, encoding: 'buffer', maxBuffer: 2 ** 31 });
  if (r.status) throw new Error(`ffmpeg could not read ${mp4}: ${String(r.stderr).trim().split('\n').at(-1)}`);
  const F = W * H * 3, out = [];
  for (let i = 0; (i + 1) * F <= r.stdout.length; i++) out.push({ t: (i + 0.5) / FPS, ...frameStats(r.stdout.subarray(i * F, (i + 1) * F), W, H, crop) });
  return out;
}

// ---------------------------------------------------------------- the colour script (parsed once, at the boundary)
const range = (v, where) => {
  if (!Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite) || v[0] > v[1]) throw new Error(`${where}: a [min, max] range`);
  return v;
};
const families = (v, where) => {
  for (const f of v || []) if (!FAMILIES[f]) throw new Error(`${where}: "${f}" is not a hue family (${FAMILY_NAMES.join(', ')})`);
  return v || [];
};

export function parseScript(raw, dur) {
  const D = { ...DEFAULTS, ...raw.defaults, hero: { ...DEFAULTS.hero, ...raw.defaults?.hero } };
  const pal = raw.palette || {};
  const palette = families([pal.signature, pal.offColor].filter(Boolean), 'palette');
  if (!Array.isArray(raw.scenes) || !raw.scenes.length) throw new Error('scenes: at least one scene { id, from, to, intent }');
  let at = 0;
  const scenes = raw.scenes.map((s, i) => {
    const w = `scene ${s.id ?? i}`;
    if (!s.id || !s.intent) throw new Error(`${w}: needs id and intent`);
    range([s.from, s.to], `${w} from/to`);
    if (Math.abs(s.from - at) > 0.05) throw new Error(`${w}: starts at ${s.from} s, the scene before ends at ${at} s (scenes cover the film back to back)`);
    at = s.to;
    return { id: s.id, from: s.from, to: s.to, intent: s.intent,
      rb: range(s.rb || D.rb, `${w} rb`), sat: range(s.sat || D.sat, `${w} sat`), black: range(s.black || D.black, `${w} black`),
      hero: s.hero === false ? false : { ...D.hero, ...s.hero, rb: range(s.hero?.rb || D.hero.rb, `${w} hero.rb`) },
      allowed: [...new Set([...palette, ...families(s.hues, `${w} hues`)])], flood: families(s.flood, `${w} flood`) };
  });
  if (dur != null && Math.abs(at - dur) > 0.5) throw new Error(`scenes end at ${at} s, the render is ${dur.toFixed(1)} s`);
  const events = [...raw.events || [], ...raw.scenes.flatMap(s => s.events || [])].map((e, i) => {
    range([e.from, e.to], `event ${i} from/to`);
    if (!e.why) throw new Error(`event ${e.from}-${e.to} s: a light event says why (a muzzle flash, a lamp switched off)`);
    return { from: e.from, to: e.to, why: e.why };
  });
  const cuts = (raw.cuts || []).map(Number);
  const ok = raw.approved?.by === 'kai' && Number.isFinite(Date.parse(raw.approved?.at));
  return { D, palette, scenes, events, cuts, approved: ok ? raw.approved : null };
}

// ---------------------------------------------------------------- shots and their medians

export function shots(samples, cutTimes, script) {
  const dur = script.scenes.at(-1).to;
  const edges = [...new Set([0, ...cutTimes, ...script.scenes.map(s => s.from), dur].map(t => +t.toFixed(2)))].sort((a, b) => a - b)
    .filter((t, i, a) => i === 0 || t - a[i - 1] > 0.15);
  return edges.slice(0, -1).map((a, i) => {
    const b = edges[i + 1], mid = (a + b) / 2, xs = samples.filter(x => x.t >= a + EDGE_S && x.t < b - EDGE_S);
    const scene = script.scenes.find(s => mid >= s.from && mid < s.to) || script.scenes.at(-1);
    const heroXs = xs.filter(x => x.hero.share >= scene.hero?.minShare);
    const col = xs.reduce((acc, x) => { for (const k of FAMILY_NAMES) acc[k] += x.hues[k] * x.coloured; return acc; }, Object.fromEntries(FAMILY_NAMES.map(k => [k, 0])));
    const colSum = FAMILY_NAMES.reduce((s, k) => s + col[k], 0);
    return { i, from: a, to: b, scene, xs, n: xs.length,
      L: median(xs.map(x => x.L)), S: median(xs.map(x => x.S)), rb: median(xs.map(x => x.rb)), black: median(xs.map(x => x.black)),
      heroShare: median(xs.map(x => x.hero.share)), heroL: median(heroXs.map(x => x.hero.L)), heroRb: median(heroXs.map(x => x.hero.rb)),
      coloured: median(xs.map(x => x.coloured)), hues: Object.fromEntries(FAMILY_NAMES.map(k => [k, colSum ? col[k] / colSum : 0])) };
  });
}

const inEvent = (events, t) => events.find(e => t >= e.from && t <= e.to);
const outside = (v, [lo, hi]) => v < lo || v > hi;
const f2 = v => v == null ? 'n/a' : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2);
const at = s => `${s.from.toFixed(1)}-${s.to.toFixed(1)} s`;

// ---------------------------------------------------------------- the nine checks
export const CHECKS = [
  { id: 'G1', what: 'cut step: luma and saturation across a cut',
    run: ({ shots: S, script }) => S.slice(1).flatMap((b, k) => {
      const a = S[k], ev = inEvent(script.events, b.from);
      if (a.n < 2 || b.n < 2 || ev) return [];
      const scene = a.scene !== b.scene, lim = scene ? script.D.cut.scene : script.D.cut.same, dL = b.L - a.L, dS = b.S - a.S;
      return Math.abs(dL) > lim.luma || Math.abs(dS) > lim.sat
        ? [{ t: b.from, shot: b.i, got: `dL ${f2(dL)}, dS ${f2(dS)}`, limit: `${scene ? 'scene change' : 'same scene'} dL ±${lim.luma}, dS ±${lim.sat}` }] : [];
    }) },
  { id: 'G2', what: 'in-shot step: luma change inside a shot',
    run: ({ shots: S, script }) => S.flatMap(s => {
      const { luma, window } = script.D.inShot, xs = s.xs, back = Math.round(window * FPS);
      const sm = xs.map((_, i) => median(xs.slice(Math.max(0, i - 1), i + 2).map(x => x.L)));
      let worst = null;
      for (let i = back; i < xs.length; i++) {
        const d = sm[i] - sm[i - back];
        if (Math.abs(d) > luma && !inEvent(script.events, xs[i].t) && !inEvent(script.events, xs[i - back].t) && (!worst || Math.abs(d) > Math.abs(worst.d))) worst = { d, t: xs[i - back].t };
      }
      return worst ? [{ t: worst.t, shot: s.i, got: `dL ${f2(worst.d)} in ${window} s`, limit: `dL ±${luma} unless a light event` }] : [];
    }) },
  { id: 'G3', what: 'cast: frame R/B against the scene range',
    run: ({ shots: S }) => S.filter(s => s.n && outside(s.rb, s.scene.rb)).map(s => ({ t: s.from, shot: s.i, got: `R/B ${f2(s.rb)}`, limit: `${s.scene.id} ${s.scene.rb.join('-')}` })) },
  { id: 'G4', what: 'saturation: HSV S against the scene range',
    run: ({ shots: S }) => S.filter(s => s.n && outside(s.S, s.scene.sat)).map(s => ({ t: s.from, shot: s.i, got: `S ${f2(s.S)}`, limit: `${s.scene.id} ${s.scene.sat.join('-')}` })) },
  { id: 'G5', what: 'hero white: luma and tint of the white proxy',
    run: ({ shots: S }) => S.filter(s => s.n && s.scene.hero && s.heroShare >= s.scene.hero.minShare && s.heroL != null
      && (s.heroL < s.scene.hero.luma || outside(s.heroRb, s.scene.hero.rb)))
      .map(s => ({ t: s.from, shot: s.i, got: `hero ${f2(s.heroL)}, R/B ${f2(s.heroRb)}`, limit: `>= ${s.scene.hero.luma}, R/B ${s.scene.hero.rb.join('-')}` })) },
  { id: 'G6', what: 'black level: 2nd percentile luma',
    run: ({ shots: S }) => S.filter(s => s.n && outside(s.black, s.scene.black)).map(s => ({ t: s.from, shot: s.i, got: `black ${f2(s.black)}`, limit: `${s.scene.id} ${s.scene.black.join('-')}` })) },
  { id: 'G7', what: 'flood: one hue family over the share for longer than the limit',
    run: ({ samples, script }) => {
      const { share, seconds } = script.D.flood, out = [];
      let runF = null, from = 0, last = 0;
      const close = () => { if (runF && last - from > seconds) out.push({ t: from, got: `${runF} ${(last - from).toFixed(1)} s`, limit: `>= ${share * 100} % of coloured pixels for <= ${seconds} s, or the scene lists it in flood` }); };
      for (const x of samples) {
        const scene = script.scenes.find(s => x.t >= s.from && x.t < s.to) || script.scenes.at(-1);
        const top = FAMILY_NAMES.find(k => x.hues[k] >= share && x.coloured >= 0.05 && !scene.flood.includes(k)) || null;
        if (top !== runF) { close(); runF = top; from = x.t; }
        last = x.t;
      }
      close();
      return out;
    } },
  { id: 'G8', what: 'palette: coloured pixels outside the allowed hue families',
    run: ({ shots: S, script }) => S.flatMap(s => {
      if (!s.n || s.coloured < 0.05) return [];
      const off = FAMILY_NAMES.filter(k => !s.scene.allowed.includes(k)), share = off.reduce((a, k) => a + s.hues[k], 0);
      return share > script.D.offPalette
        ? [{ t: s.from, shot: s.i, got: `${(share * 100).toFixed(0)} % off (${off.filter(k => s.hues[k] > 0.05).map(k => `${k} ${(s.hues[k] * 100).toFixed(0)} %`).join(', ')})`,
          limit: `<= ${script.D.offPalette * 100} %, allowed ${s.scene.allowed.join(', ')}` }] : [];
    }) },
  { id: 'G9', what: 'film: mean luma and dark seconds',
    run: ({ samples, script }) => {
      const { luma, dark, darkShare } = script.D.film, mean = samples.reduce((a, x) => a + x.L, 0) / samples.length;
      const secs = new Map(); for (const x of samples) (secs.get(Math.floor(x.t)) || secs.set(Math.floor(x.t), []).get(Math.floor(x.t))).push(x.L);
      const darkS = [...secs.values()].filter(v => v.reduce((a, b) => a + b, 0) / v.length < dark).length / secs.size;
      return [mean < luma && { t: 0, got: `mean luma ${f2(mean)}`, limit: `>= ${luma}` },
        darkS > darkShare && { t: 0, got: `${(darkS * 100).toFixed(1)} % dark seconds`, limit: `<= ${darkShare * 100} % under luma ${dark}` }].filter(Boolean);
    } },
];

export function judge({ samples, cutTimes, script, decisions = null }) {
  const S = shots(samples, [...cutTimes, ...script.cuts], script);
  const findings = CHECKS.flatMap(c => c.run({ samples, shots: S, script }).map(f => {
    const w = waiverFor(decisions, `colourgate.${c.id}`);
    return { check: c.id, ...f, waived: w ? `${w.by} ${w.at}${w.decision ? ` · ${w.decision}` : ''}` : null };
  }));
  const open = findings.filter(f => !f.waived);
  const verdict = open.length ? 'FAIL' : script.approved ? 'PASS' : 'DRAFT';
  return { verdict, findings, shots: S.map(({ xs, scene, ...s }) => ({ ...s, scene: scene.id })) };
}

export function report(res, name, script) {
  const by = Object.fromEntries(CHECKS.map(c => [c.id, res.findings.filter(f => f.check === c.id)]));
  const open = res.findings.filter(f => !f.waived).length;
  return [`# Colour gate · ${name}`, '',
    res.verdict === 'DRAFT' ? '**DRAFT**: no finding, but colour-script.json is not approved by Kai (`approved: { by: "kai", at }`), so this is not a PASS'
      : `**${res.verdict}**: ${open} finding${open === 1 ? '' : 's'} on ${new Set(res.findings.filter(f => !f.waived && f.shot != null).map(f => f.shot)).size} shots${script.approved ? '' : ' (script not approved by Kai)'}`, '',
    '| Check | Findings |', '| --- | --- |', ...CHECKS.map(c => `| ${c.id} ${c.what} | ${by[c.id].length || 'PASS'} |`), '',
    '| Check | Shot | Time | Got | Limit | Waived |', '| --- | --- | --- | --- | --- | --- |',
    ...res.findings.map(f => `| ${f.check} | ${f.shot ?? 'film'} | ${f.t.toFixed(1)} s | ${f.got} | ${f.limit} | ${f.waived || ''} |`), '',
    '| Shot | Time | Scene | L | S | R/B | black | hero | hues (coloured share) |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...res.shots.map(s => `| ${s.i} | ${at(s)} | ${s.scene} | ${f2(s.L)} | ${f2(s.S)} | ${f2(s.rb)} | ${f2(s.black)} | ${s.heroL == null ? '-' : `${f2(s.heroL)} (${(s.heroShare * 100).toFixed(0)} %)`} | ${FAMILY_NAMES.filter(k => s.hues[k] >= 0.1).map(k => `${k} ${(s.hues[k] * 100).toFixed(0)}`).join(', ')} |`),
  ].join('\n') + '\n';
}

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export function gate(mp4, scriptRaw, decisions) {
  const dur = duration(mp4), script = parseScript(scriptRaw, dur);
  const samples = decodeSamples(mp4, { ...DEFAULTS.crop, ...scriptRaw.crop });
  return { script, ...judge({ samples, cutTimes: hardCuts(sceneScores(mp4)).map(c => c.t), script, decisions }) };
}

function main(argv) {
  const USAGE = 'usage: colourgate.mjs films/<slug> | colourgate.mjs --mp4 <file> --script <colour-script.json> [--decisions <json>] [--json 1]';
  const [first] = argv;
  if (!first || first === '--help' || first === '-h') { console[first ? 'log' : 'error'](USAGE); process.exit(first ? 0 : 2); }
  let mp4, scriptFile, decisions = null, out = null;
  if (first.startsWith('--')) {
    const A = {}; for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
    if (!A.mp4 || !A.script) { console.error(USAGE); process.exit(2); }
    mp4 = path.resolve(A.mp4); scriptFile = path.resolve(A.script); decisions = A.decisions ? readJson(path.resolve(A.decisions)) : null;
    if (A.json) out = 'json';
  } else {
    const DIR = path.resolve(ROOT, first), final = finalRender(path.join(DIR, 'renders'));
    if (!final) { console.error(`${first}: no final render in renders/`); process.exit(1); }
    mp4 = path.join(DIR, 'renders', final); scriptFile = path.join(DIR, 'colour-script.json'); out = DIR;
    if (!fs.existsSync(scriptFile)) { console.error(`${first}: no colour-script.json (write it at [1.7] from .claude/skills/make-reel-stick-man/templates/colour-script.json, Kai approves it)`); process.exit(1); }
    if (fs.existsSync(path.join(DIR, 'DECISIONS.json'))) decisions = readJson(path.join(DIR, 'DECISIONS.json'));
  }
  const low = pixelGateError(renderInfo(mp4), 'colourgate');
  if (low) { console.error(low); process.exit(2); }
  let res;
  try { res = gate(mp4, readJson(scriptFile), decisions); } catch (e) { console.error(`colour-script.json: ${e.message}`); process.exit(2); }
  const md = report(res, path.basename(mp4), res.script), line = `${res.verdict} · ${CHECKS.map(c => `${c.id} ${res.findings.filter(f => f.check === c.id && !f.waived).length}`).join(', ')} · ${path.basename(mp4)}`;
  if (out === 'json') console.log(JSON.stringify({ file: mp4, verdict: res.verdict, findings: res.findings, shots: res.shots }));
  else if (out) {
    fs.mkdirSync(path.join(out, 'review'), { recursive: true });
    fs.writeFileSync(path.join(out, 'review/colourgate.md'), md);
    fs.writeFileSync(path.join(out, 'review/colour.json'), JSON.stringify({ file: path.basename(mp4), verdict: res.verdict, findings: res.findings, shots: res.shots }, null, 1));
    console.log(`review/colourgate.md: ${line}`);
  } else console.log(md);
  process.exit(res.verdict === 'PASS' ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
