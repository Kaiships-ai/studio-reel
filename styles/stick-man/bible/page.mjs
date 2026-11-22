#!/usr/bin/env node
// The bible's docs page, generated from the same source the kit and the checker read (tokens.json + catalog.json), plus
// Kai's taste (kai-taste SKILL.md roots and praise, EXAMPLES.md frames). Nothing on the page is typed by hand: a token or
// a part that is in the source and not on the page fails the run.
//   node styles/stick-man/bible/page.mjs --out <dir> [--dir <bible dir>] [--taste <kai-taste dir>] [--media <dir>]
//        [--proof <dir>]... [--films <films root>] [--report <checker report.json>]
// --media holds clips/<name>.mp4 + poster/<name>.jpg (rick-* is the gold bar, ours-<ver>-* our cuts) and strip/<tag>_<sec>.jpg
// (the colour script). --proof is a motion-lib proof folder (<Clip>_phys1.mp4, tools/gates/motionlib.mjs --proof); default: the
// two under the films root. Everything missing shows as an empty state, never as a made-up picture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { REPO, KINDS, loadBible, validate, KIND_VI, ST_VI, TIER_VI } from './catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOTS = ['R1', 'R2', 'R3', 'R4', 'R5'];
// Kai's short words for the five questions (approved on the prototype board); a root kai-taste adds later shows its English title
const ROOT_VI = { R1: 'Chuyển động như thật?', R2: 'Trông như thật?', R3: 'Liếc là hiểu?', R4: 'Máy bay, không chặt?', R5: 'Mỗi nhịp mới, mạnh?' };
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isRick = n => /^(rick|aim)-/.test(path.basename(n));

export function readTaste(dir) {
  const read = f => { const p = path.join(dir, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
  const skill = read('SKILL.md'), ex = read('EXAMPLES.md');
  const roots = [...skill.matchAll(/^### (R\d)\. (.+)\n([\s\S]*?)(?=^### |^## )/gm)].map(([, id, title, body]) => ({
    id, title, vi: ROOT_VI[id] || title,
    ask: (/\*\*Ask\.\*\* (.+)/.exec(body) || [])[1] || '',
    evidence: ((/\*\*Evidence:\*\* (.+)/.exec(body) || [])[1] || '').match(/\b(?:S\d|M)-\d{3}\b/g) || [],
  }));
  const praiseBlock = (/## What Kai praised[^\n]*\n([\s\S]*?)(?=\n## )/.exec(skill) || [])[1] || '';
  const praise = praiseBlock.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).replace(/`/g, ''));
  // EXAMPLES.md rows: | `a.jpg`, `b.jpg` | [complaint] | roots | what it shows |
  const examples = [];
  let sec = '';
  for (const l of ex.split('\n')) {
    if (l.startsWith('## ')) sec = l.includes('Criticised') ? 'bad' : 'aim';
    const cells = l.startsWith('| `') ? l.split('|').slice(1, -1).map(s => s.trim()) : null;
    if (!cells) continue;
    const files = cells[0].match(/[\w.-]+\.jpg/g) || [];
    const [rootCell, text] = sec === 'bad' ? [cells[2], cells[3]] : [cells[1], cells[2]];
    const ids = sec === 'bad' ? (cells[1].match(/\b(?:S\d|M)-\d{3}\b/g) || []) : (files.join(' ').match(/\b(?:S\d|M)-\d{3}\b/g) || []);
    examples.push({ kind: sec === 'bad' ? 'bad' : files[0].startsWith('praised') ? 'praised' : 'aim', files, ids, roots: rootCell.match(/R\d/g) || [], text,
      quote: sec === 'bad' ? (/"([^"]+)"/.exec(cells[1]) || [])[1] || '' : '' });
  }
  return { roots, praise, examples, dir };
}

// A canvas-2D stand-in that keeps the transform stack and turns every path into a device-space polygon, so the face on the
// page is the one engine/faces.js draws in a film, not a copy of it.
class SvgCtx {
  constructor(m) { this.m = m; this.st = []; this.path = []; this.out = []; this.defs = []; this.clips = 0; this.depth = 0; Object.assign(this, { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1 }); }
  P(x, y) { const [a, b, c, d, e, f] = this.m; return [a * x + c * y + e, b * x + d * y + f]; }
  mul(n) { const [a, b, c, d, e, f] = this.m, [A, B, C, D, E, F] = n; this.m = [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f]; }
  save() { this.st.push({ m: this.m, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, globalAlpha: this.globalAlpha, depth: this.depth }); }
  restore() { const s = this.st.pop(); if (!s) return; while (this.depth > s.depth) { this.out.push('</g>'); this.depth--; } Object.assign(this, s); }
  translate(x, y) { this.mul([1, 0, 0, 1, x, y]); }
  scale(x, y) { this.mul([x, 0, 0, y, 0, 0]); }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push([this.P(x, y)]); }
  lineTo(x, y) { if (!this.path.length) this.path.push([]); this.path.at(-1).push(this.P(x, y)); }
  closePath() { const s = this.path.at(-1); if (s?.length) s.closed = true; }
  ellipse(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = Math.PI * 2, ccw = false) {
    let span = a1 - a0; if (ccw && span > 0) span -= Math.PI * 2; if (!ccw && span < 0) span += Math.PI * 2;
    const n = Math.max(6, Math.ceil(Math.abs(span) / (Math.PI / 16))), cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const t = a0 + span * i / n, x = rx * Math.cos(t), y = ry * Math.sin(t), p = this.P(cx + x * cr - y * sr, cy + x * sr + y * cr);
      if (i === 0 && !this.path.length) this.path.push([p]); else this.path.at(-1).push(p);
    }
  }
  arc(cx, cy, r, a0, a1, ccw) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }
  rect(x, y, w, hh) { this.path.push(Object.assign([this.P(x, y), this.P(x + w, y), this.P(x + w, y + hh), this.P(x, y + hh)], { closed: true })); }
  roundRect(x, y, w, hh) { this.rect(x, y, w, hh); }
  fillRect(x, y, w, hh) { const p = this.path; this.path = []; this.rect(x, y, w, hh); this.fill(); this.path = p; }
  d() { return this.path.filter(s => s.length).map(s => 'M' + s.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + (s.closed ? 'Z' : '')).join(''); }
  paint(style) {
    if (typeof style === 'string') return style;
    const id = `g${this.defs.length}`, [c, r] = [this.P(style.x, style.y), Math.hypot(this.m[0], this.m[1]) * style.r];
    this.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r.toFixed(1)}">${style.stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</radialGradient>`);
    return `url(#${id})`;
  }
  alpha() { return this.globalAlpha < 1 ? ` opacity="${this.globalAlpha.toFixed(2)}"` : ''; }
  fill() { const d = this.d(); if (d) this.out.push(`<path d="${d}" fill="${this.paint(this.fillStyle)}"${this.alpha()}/>`); }
  stroke() {
    const d = this.d(), w = this.lineWidth * Math.sqrt(Math.abs(this.m[0] * this.m[3] - this.m[1] * this.m[2]));
    if (d) this.out.push(`<path d="${d}" fill="none" stroke="${this.paint(this.strokeStyle)}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${this.alpha()}/>`);
  }
  clip() { const id = `c${this.clips++}`; this.defs.push(`<clipPath id="${id}"><path d="${this.d()}"/></clipPath>`); this.out.push(`<g clip-path="url(#${id})">`); this.depth++; }
  createRadialGradient(x, y, r0, x1, y1, r) { const g = { x, y, r, stops: [] }; g.addColorStop = (o, c) => g.stops.push([o, c]); return g; }
}

export async function faceSVGs(names, repo = REPO) {
  const mod = await import(pathToFileURL(path.join(repo, 'styles/stick-man/engine/faces.js')).href);
  const out = {};
  for (const n of names) {
    if (!mod.EXPR?.[n]) continue;
    const S = 100, g = new SvgCtx([S * 0.8, 0, 0, -S * 0.8, S / 2, S / 2]);
    mod.drawFace(g, n, 0, 0);
    const pre = `f-${n}-`, body = g.out.join('').replace(/url\(#([gc]\d+)\)/g, `url(#${pre}$1)`), defs = g.defs.join('').replace(/id="([gc]\d+)"/g, `id="${pre}$1"`);
    out[n] = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${h(n)}"><defs>${defs}</defs><ellipse cx="50" cy="50" rx="40" ry="37.6" fill="#fff" stroke="#000" stroke-width="3"/>${body}</svg>`;
  }
  return out;
}

const lin2srgb = c => Math.round(255 * Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
const pct = (v, max) => Math.max(0, Math.min(100, v / max * 100)).toFixed(1);
const band = v => (v && typeof v === 'object' && !Array.isArray(v) && ('min' in v || 'max' in v)) ? v : null;
const box = (inner, cls = '') => `<div class="pv ${cls}">${inner}</div>`;
function rangeBar(v, max, unitLabel = '') {
  const b = band(v), n = typeof v === 'number' ? v : null;
  if (b) { const lo = Number(b.min ?? 0), hi = Number(b.max ?? max); return box(`<div class="bar"><i class="bandi" style="left:${pct(lo, max)}%;width:${(pct(hi, max) - pct(lo, max)).toFixed(1)}%"></i></div>`); }
  if (n === null) return box(`<span class="chipv">${h(show(v))}</span>`);
  return box(`<div class="bar"><i style="width:${pct(n, max)}%"></i></div>${unitLabel}`);
}
const frameHeight = (v, axis) => {
  const b = band(v), n = typeof v === 'number' ? v : null;
  const line = (x, cls = '') => axis === 'y' ? `<i class="${cls}" style="bottom:${pct(x, 1)}%"></i>` : `<i class="v ${cls}" style="left:${pct(x, 1)}%"></i>`;
  const inner = b ? (axis === 'y' ? `<b style="bottom:${pct(b.min ?? 0, 1)}%;height:${(pct(b.max ?? 1, 1) - pct(b.min ?? 0, 1)).toFixed(1)}%"></b>` : `<b class="v" style="left:${pct(b.min ?? 0, 1)}%;width:${(pct(b.max ?? 1, 1) - pct(b.min ?? 0, 1)).toFixed(1)}%"></b>`) : n !== null ? line(n) : '';
  return box(`<div class="mini916">${inner}</div>`);
};
const PREVIEW = {
  'rgb-linear': v => Array.isArray(v) ? box(`<span class="sw" style="background:rgb(${v.map(lin2srgb).join(',')})"></span>`) : null,
  hex: v => box(`<span class="sw" style="background:${h(v)}"></span>`),
  'luma-0-255': v => {
    const b = band(v);
    const mark = b ? `<i class="bandi" style="left:${pct(b.min, 255)}%;width:${(pct(b.max, 255) - pct(b.min, 255)).toFixed(1)}%"></i>` : typeof v === 'number' ? `<i class="mk" style="left:${pct(v, 255)}%"></i>` : '';
    return box(`<div class="ramp">${mark}</div>`);
  },
  frames: v => rangeBar(v, 90, '<span class="ticks"></span>'),
  mm: v => typeof v === 'number' ? box(`<svg viewBox="0 0 60 34" class="fov"><path d="M4 17 L56 ${(17 - 15 * Math.min(1, 18 / v)).toFixed(1)} L56 ${(17 + 15 * Math.min(1, 18 / v)).toFixed(1)} Z"/></svg>`) : rangeBar(v, 100),
  m: v => rangeBar(v, 2.5),
  'px@1080': v => typeof v === 'number' ? box(`<span class="aa" style="font-size:${Math.max(6, v * 54 / 1080 * 2).toFixed(1)}px">Aa</span>`) : null,
  'font-weight': v => box(`<span class="aa" style="font-weight:${h(v)}">Aa</span>`),
  'share-of-height': v => frameHeight(v, 'y'),
  'share-of-width': v => frameHeight(v, 'x'),
  'share-of-runtime': v => rangeBar(v, 1), 'share-of-frame': v => rangeBar(v, 1), 'share-of-figure': v => rangeBar(v, 1), 'share-of-views': v => rangeBar(v, 1), share: v => rangeBar(v, 1),
  percent: v => rangeBar(v, 100),
  'deg-elevation': v => typeof v === 'number' ? box(`<svg viewBox="0 0 60 34" class="fov"><path d="M6 28 H54 M6 28 L${6 + 46 * Math.cos(v * Math.PI / 180)} ${28 - 46 * Math.sin(v * Math.PI / 180)}"/></svg>`) : rangeBar(v, 90),
};
export const show = v => v === null ? 'trống' : Array.isArray(v) ? `[${v.join(', ')}]` : v && typeof v === 'object' ? (v.min != null || v.max != null ? `${show(v.min ?? '')}–${show(v.max ?? '')}` : JSON.stringify(v)) : String(v);
function preview(t, value) {
  if (t.gap) return box('<span class="gapbox">trống</span>');
  return (PREVIEW[t.unit] && PREVIEW[t.unit](value)) || (typeof value === 'number' ? box(`<span class="chipv">${h(value)}</span>`) : box(`<span class="chipv">${h(show(value)).slice(0, 18)}</span>`));
}

const ls = d => d && fs.existsSync(d) ? fs.readdirSync(d) : [];
function gitLog(repo, rel) {
  const r = spawnSync('git', ['log', '--format=%h%x09%ad%x09%s', '--date=short', '--', rel], { cwd: repo, encoding: 'utf8', timeout: 20000 });
  return r.status === 0 ? r.stdout.trim().split('\n').filter(Boolean).map(l => { const [hash, date, ...s] = l.split('\t'); return { hash, date, subject: s.join('\t') }; }) : [];
}
function readReport(p) {
  if (!p) return null;
  const j = JSON.parse(fs.readFileSync(p, 'utf8')), L = Array.isArray(j) ? j : j.findings || j.rows || [];
  return L.map(f => ({ root: f.root || null, part: f.id || f.part || f.component || f.token || '', severity: f.severity || '', what: f.what || f.message || f.text || '', where: f.where || f.time || f.file || '' }));
}

export async function buildModel({ dir = path.join(HERE, 'hot-money'), taste = path.join(os.homedir(), '.claude/skills/kai-taste'), media = null, proof = [], films, report = null, repo = REPO } = {}) {
  const bible = loadBible(dir);
  const v = await validate(bible, { repo, films, taste });
  const T = readTaste(taste);
  const proofIndex = new Map();
  for (const d of proof) for (const f of ls(d)) { const m = /^(?:(?:Adult)_)?(.+)_phys1\.mp4$/.exec(f); if (m && !proofIndex.has(m[1])) proofIndex.set(m[1], path.join(d, f)); }
  const bad = T.examples.filter(e => e.kind === 'bad'), good = T.examples.filter(e => e.kind !== 'bad');
  const exFile = f => path.join(taste, 'examples', f);
  const findings = readReport(report);
  const rootOf = id => bible.catalog.components.find(c => c.id === id)?.roots?.[0] || bible.tokens.tokens.find(t => t.name === id)?.root || null;
  if (findings) for (const f of findings) f.root ||= rootOf(f.part);

  const tokens = bible.tokens.tokens.map(t => { let value; try { value = v.resolve(t.value); } catch { value = undefined; } return { ...t, resolved: value, family: t.name.split('.')[0] }; });
  const components = bible.catalog.components.map(c => {
    const key = c.kit?.[0]?.key;
    const sai = bad.find(e => e.ids.some(i => c.evidence?.complaints?.includes(i)));
    const dung = sai && (good.find(e => e.kind === 'praised' && e.ids.some(i => c.evidence?.praise?.includes(i))) || good.find(e => e.roots[0] === sai.roots[0]) || good.find(e => e.roots.includes(sai.roots[0])));
    const clip = c.kind === 'motion-clip' && proofIndex.get(key);
    return { ...c, key, local: (c.kit || []).some(r => r.path?.startsWith('films/')), clip: clip || null,
      pair: sai && dung ? { ok: { file: dung.files[0], text: dung.text }, bad: { file: sai.files.at(-1), text: sai.quote || sai.text, id: sai.ids[0] } } : null };
  });
  const clipsDir = media && path.join(media, 'clips'), stripDir = media && path.join(media, 'strip');
  const clips = ls(clipsDir).filter(f => f.endsWith('.mp4')).map(f => f.slice(0, -4));
  const gold = clips.filter(n => n.startsWith('rick-'));
  const ours = clips.filter(n => n.startsWith('ours-')).map(n => { const m = /^ours-(v\d+)-(.+)$/.exec(n); return m && { n, ver: m[1], topic: m[2] }; }).filter(Boolean);
  const latest = ours.map(o => o.ver).sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)))[0];
  const compare = gold.map(g => { const topic = g.slice(5).split('-')[0]; const o = ours.find(x => x.ver === latest && x.topic.split('-')[0] === topic); return o && { gold: g, ours: o.n, topic, ver: latest }; }).filter(Boolean);
  const beats = ls(stripDir).map(f => /^(.+)_(\d+)\.jpg$/.exec(f)).filter(Boolean).map(([f, tag, s]) => ({ file: f, tag, sec: Number(s) })).sort((a, b) => a.sec - b.sec);
  const faces = await faceSVGs(components.filter(c => c.kind === 'face').map(c => c.key), repo);

  return {
    film: bible.tokens.film, dir, repo, taste: T, tokens, components, faces, findings, compare, gold, beats, media,
    validation: { errors: v.errors, warnings: v.warnings, stats: v.stats },
    exFile, changelog: gitLog(repo, path.relative(repo, path.dirname(dir)) || '.'),
    examples: { good, bad },
  };
}

function measure(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { capture: true, encoding: 'buffer', timeout: 20000 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < 3) return null;
  const [R, G, B] = r.stdout;
  return { rgb: `rgb(${R},${G},${B})`, luma: Math.round(0.299 * R + 0.587 * G + 0.114 * B) };
}
function fresh(dst, src) { return fs.existsSync(dst) && fs.statSync(dst).size > 0 && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs; }
function copy(src, dst) { if (!fresh(dst, src)) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); } }
function shrink(src, dst) {
  if (fresh(dst, src)) return true;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const r = run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-t', '6', '-an', '-vf', 'scale=240:-2,fps=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'veryfast', '-movflags', '+faststart', dst], { capture: true, timeout: 60000 });
  const p = run('ffmpeg', ['-v', 'error', '-y', '-ss', '1', '-i', src, '-frames:v', '1', '-vf', 'scale=240:-2', '-q:v', '5', dst.replace(/\.mp4$/, '.jpg')], { capture: true, timeout: 30000 });
  return r.status === 0 && p.status === 0;
}
function gatherMedia(M, out) {
  const md = path.join(out, 'media');
  const ex = new Set();
  for (const c of M.components) {
    if (c.clip) c.clipUrl = shrink(c.clip, path.join(md, 'proof', `${c.key}.mp4`)) ? `media/proof/${c.key}` : null;
    if (c.pair) { ex.add(c.pair.ok.file); ex.add(c.pair.bad.file); }
  }
  for (const e of [...M.examples.good, ...M.examples.bad]) for (const f of e.files) ex.add(f);
  M.exUrl = {};
  for (const f of ex) if (fs.existsSync(M.exFile(f))) { copy(M.exFile(f), path.join(md, 'ex', f)); M.exUrl[f] = `media/ex/${f}`; }
  M.clipUrl = {};
  if (M.media) for (const n of new Set([...M.gold, ...M.compare.flatMap(c => [c.gold, c.ours])])) {
    const v = path.join(M.media, 'clips', n + '.mp4'), p = path.join(M.media, 'poster', n + '.jpg');
    if (!fs.existsSync(v)) continue;
    copy(v, path.join(md, 'clips', n + '.mp4'));
    if (fs.existsSync(p)) copy(p, path.join(md, 'poster', n + '.jpg'));
    M.clipUrl[n] = `media/clips/${n}`;
  }
  for (const b of M.beats) {
    const src = path.join(M.media, 'strip', b.file);
    copy(src, path.join(md, 'strip', b.file));
    Object.assign(b, { url: `media/strip/${b.file}` }, measure(src) || {});
  }
}

const tc = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const badge = s => `<span class="st st-${s}">${h(ST_VI[s] || s)}</span>`;
const rootChip = r => `<a class="rc" href="#${r}">${r}</a>`;
const ids = ev => [...(ev?.praise || []).map(i => `<span class="ev plus">+${i}</span>`), ...(ev?.complaints || []).map(i => `<span class="ev minus">−${i}</span>`)].join('');
function exFrame(M, file, tag, cls) {
  const url = M.exUrl?.[file];
  const inner = url ? `<img src="${url}" alt="" loading="lazy">` : '<div class="empty">chưa có ảnh</div>';
  return `<div class="frame ${cls}">${inner}<span class="tag ${cls}">${tag}</span>${isRick(file) ? '<span class="priv">Rick · nội bộ</span>' : ''}</div>`;
}
const pairHTML = (M, p) => `<div class="pair">
  <figure>${exFrame(M, p.ok.file, 'Đúng', 'ok')}<figcaption>${h(p.ok.text)}</figcaption></figure>
  <figure>${exFrame(M, p.bad.file, 'Sai', 'bad')}<figcaption>${p.bad.id ? `<b>${h(p.bad.id)}</b> ` : ''}${h(p.bad.text)}</figcaption></figure></div>`;
const vid = (url, extra = '') => `<video src="${url}.mp4" poster="${url}.jpg" muted loop playsinline preload="none" ${extra}></video>`;

function homeHTML(M) {
  const cmp = M.compare[0];
  const slider = cmp && M.clipUrl[cmp.gold] && M.clipUrl[cmp.ours] ? `<div class="cmp">
    <div class="cmpcol"><div class="cmpbox" id="cmpbox">${vid(M.clipUrl[cmp.ours])}${vid(M.clipUrl[cmp.gold], 'class="top-v"')}<div class="knife"></div>
      <span class="lab l">Gold</span><span class="lab r">${h(cmp.ver)}</span><span class="priv left">Rick · nội bộ</span></div>
      <input type="range" min="0" max="100" value="50" id="knife" aria-label="Kéo so sánh"></div>
    <div><h3>Gold vs mới nhất</h3><p class="muted">${h(cmp.topic)} · ${h(cmp.ver)}</p>
      <div class="seg" id="cmpMode"><button aria-pressed="true" data-m="wipe">Kéo</button><button data-m="ov">Chồng</button></div></div></div>`
    : '<div class="cmp empty-state">Chưa có cặp clip gold / mới nhất (--media clips/rick-* và ours-v*-*).</div>';
  const nav = M.taste.roots.map(r => {
    const n = M.findings ? M.findings.filter(f => f.root === r.id).length : null;
    return `<a href="#${r.id}"><b>${r.id}</b>${n === null ? '' : `<em class="${n ? 'nbad' : 'nok'}">${n}</em>`}<span>${h(r.vi)}</span></a>`;
  }).join('');
  const roots = M.taste.roots.map(r => {
    const ok = M.examples.good.find(e => e.roots[0] === r.id) || M.examples.good.find(e => e.roots.includes(r.id));
    const bads = M.examples.bad.filter(e => e.roots[0] === r.id);
    const pair = ok && bads[0] ? pairHTML(M, { ok: { file: ok.files[0], text: ok.text }, bad: { file: bads[0].files.at(-1), text: bads[0].quote || bads[0].text, id: bads[0].ids[0] } }) : '';
    const more = bads.slice(1).map(b => `<figure class="thumb">${exFrame(M, b.files.at(-1), b.ids[0] || 'Sai', 'bad')}</figure>`).join('');
    const nt = M.tokens.filter(t => t.root === r.id).length, nc = M.components.filter(c => c.roots?.includes(r.id)).length;
    const meas = M.tokens.filter(t => t.root === r.id && t.tier === 'semantic' && !t.gap).slice(0, 4)
      .map(t => `<div><span>${h(t.usage)}</span><b>${h(show(t.resolved))}</b></div>`).join('');
    const F = M.findings?.filter(f => f.root === r.id) || [];
    const fx = M.findings ? `<div class="sub">Checker · ${F.length}</div>${F.length ? `<ul class="finds">${F.map(f => `<li><span class="sev">${h(f.severity)}</span> <code>${h(f.part)}</code> ${h(f.what)} <span class="muted">${h(f.where)}</span></li>`).join('')}</ul>` : '<p class="muted">0 lỗi</p>'}` : '';
    return `<section class="q" id="${r.id}"><div class="qh"><span class="rn">${r.id}</span><h3>${h(r.vi)}</h3></div>
      <div class="qgrid"><div>${pair}${more ? `<div class="morebad">${more}</div>` : ''}</div>
      <div><div class="meas">${meas}</div><div class="counts"><a href="#tok-${r.id}">${nt} token</a> · <span>${nc} phần</span> · <span>${r.evidence.length} lời Kai</span></div>
      ${fx}<details><summary>Câu hỏi gốc</summary><p>${h(r.ask)}</p></details></div></div></section>`;
  }).join('');
  const praise = M.taste.praise.map(p => `<li>${h(p).replace(/\b((?:S\d|M)-\d{3})\b/g, '<span class="ev plus">$1</span>')}</li>`).join('');
  return `<section class="page" id="home"><div class="crumb">Soát · ${h(M.film)}</div><h2>5 câu hỏi Kai hỏi</h2>
    ${slider}<nav class="qnav">${nav}</nav>${roots}
    <div class="sub">Kai đã khen · đừng phá (${M.taste.praise.length})</div><ul class="praise">${praise}</ul></section>`;
}

function tokensHTML(M) {
  return ROOTS.map(r => {
    const L = M.tokens.filter(t => t.root === r);
    if (!L.length) return '';
    const fams = [...new Set(L.map(t => t.family))];
    const rows = fams.map(f => `<tr class="fam"><td colspan="5">${h(f)}</td></tr>` + L.filter(t => t.family === f).map(t =>
      `<tr data-token="${h(t.name)}" data-status="${h(t.status)}" class="${t.gap ? 'gap' : ''}"><td class="pvc">${preview(t, t.resolved)}</td>
        <td><code>${h(t.name)}</code><div class="muted small">${h(TIER_VI[t.tier] || t.tier)}</div></td>
        <td class="val">${h(show(t.resolved))}<div class="muted small">${h(t.unit)}${typeof t.value === 'string' && /^\{.+\}$/.test(t.value) ? ` · ${h(t.value)}` : ''}</div></td>
        <td>${h(t.gap ? 'TRỐNG: ' + t.gap : t.usage)}<div class="muted small">${h([t.source?.kind, ...(t.source?.evidence || [])].join(' '))}</div></td>
        <td>${rootChip(t.root)} ${badge(t.status)}</td></tr>`).join('')).join('');
    return `<section class="page" id="tok-${r}"><div class="crumb">Nền tảng · token</div><h2>${r} · ${h(ROOT_VI[r])}</h2><p class="lead">${L.length} token</p>
      <table class="ttab"><thead><tr><th>xem</th><th>tên</th><th>giá trị</th><th>dùng khi</th><th>gốc</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
}

const pairKey = p => `${p.ok.file}|${p.bad.file}`;
function cardHTML(M, c, shared) {
  const tok = (c.tokens || []).map(n => M.tokens.find(t => t.name === n)).filter(Boolean);
  let stage;
  if (c.kind === 'face' && M.faces[c.key]) stage = `<div class="facebox">${M.faces[c.key]}</div>`;
  else if (c.clipUrl) stage = `<div class="frame clip">${vid(c.clipUrl)}</div>`;
  else if (tok.length) stage = `<div class="tokstage">${tok.map(t => `<div title="${h(t.name)}">${preview(t, t.resolved)}<span class="small mono">${h(show(t.resolved))}</span></div>`).join('')}</div>`;
  else stage = `<div class="empty">chưa có clip</div>`;
  return `<article class="card" data-id="${h(c.id)}" data-status="${h(c.status)}"><div class="stage">${stage}</div><div class="body">
    <div class="ch"><code>${h(c.id)}</code>${badge(c.status)}</div>
    ${c.kind !== 'motion-clip' && c.kind !== 'face' && c.name !== c.key ? `<div class="nm">${h(c.name)}</div>` : ''}
    <div class="use"><span class="ok">✓</span> ${h(c.use)}</div><div class="use"><span class="bad">✕</span> ${h(c.never)}</div>
    <div class="meta">${(c.roots || []).map(rootChip).join('')}${ids(c.evidence)}${c.bodies ? `<span class="mono small muted">${h(c.bodies.join(' · '))}</span>` : ''}</div>
    <div class="kit mono">${c.kit.map(k => h(k.path + (k.export ? ` · ${k.export}${k.key ? '.' + k.key : ''}` : ''))).join('<br>')}${c.local ? ' <span class="loc">phim</span>' : ''}</div>
    ${c.pair && !shared?.has(pairKey(c.pair)) ? pairHTML(M, c.pair) : c.pair ? '<a class="small muted" href="#pairs-' + c.kind + '">Đúng / Sai ↑</a>' : ''}</div></article>`;
}
function componentsHTML(M) {
  return KINDS.map(k => {
    const L = M.components.filter(c => c.kind === k);
    if (!L.length) return '';
    const n = s => L.filter(c => c.status === s).length;
    // a Đúng/Sai pair three or more parts share is shown once for the group, not on every card
    const uses = new Map();
    for (const c of L) if (c.pair) uses.set(pairKey(c.pair), [...(uses.get(pairKey(c.pair)) || []), c]);
    const shared = new Set([...uses].filter(([, cs]) => cs.length >= 3).map(([key]) => key));
    const groupPairs = [...shared].map(key => { const cs = uses.get(key); return `<div class="gpair">${pairHTML(M, cs[0].pair)}<div class="small muted">${cs.length} phần</div></div>`; }).join('');
    const sheet = k === 'face' ? `<div class="expsheet">${L.filter(c => M.faces[c.key]).map(c => `<figure><div class="facebox sm">${M.faces[c.key]}</div><figcaption>${h(c.key)}</figcaption></figure>`).join('')}</div>` : '';
    return `<section class="page" id="kind-${k}"><div class="crumb">Thành phần</div><h2>${h(KIND_VI[k] || k)}</h2>
      <p class="lead">${L.length} · ${n('stable')} ổn định · ${n('trial')} thử${n('retired') ? ` · ${n('retired')} bỏ` : ''}</p>
      ${sheet}${groupPairs ? `<div class="gpairs" id="pairs-${k}">${groupPairs}</div>` : ''}
      <div class="cards${k === 'face' ? ' faces' : ''}">${L.map(c => cardHTML(M, c, shared)).join('')}</div></section>`;
  }).join('');
}

function patternsHTML(M) {
  const lm = M.tokens.find(t => t.name === 'luma.film.mean')?.resolved, th = M.tokens.find(t => t.name === 'luma.dark.threshold')?.resolved;
  const lo = lm?.min ?? 100;
  const cs = M.beats.length ? `<div class="cs">${M.beats.map(b => `<div class="c"><img src="${b.url}" alt="" loading="lazy">
      <div class="chipc" style="background:${b.rgb || 'transparent'}"></div>
      <div class="lb">${b.luma != null ? `<i class="${b.luma < lo ? 'low' : ''}" style="height:${pct(b.luma, 255)}%"></i>` : ''}<span class="bandl" style="bottom:${pct(lo, 255)}%"></span>${th != null ? `<span class="bandl dark" style="bottom:${pct(th, 255)}%"></span>` : ''}</div>
      <div class="t">${tc(b.sec)}${b.luma != null ? ` · ${b.luma}` : ''}</div></div>`).join('')}</div>
    <div class="legend"><span><i class="lg1"></i>đáy luma phim ${h(lo)}</span>${th != null ? `<span><i class="lg2"></i>tối ${h(th)}</span>` : ''}<span><i class="lg3"></i>dưới đáy</span><span class="muted">luma đo trên ảnh thu nhỏ, gần đúng</span></div>`
    : '<div class="empty-state">Chưa có dải ảnh (--media strip/).</div>';
  const goldClips = M.gold.filter(n => M.clipUrl[n]).map(n => `<figure><div class="frame">${vid(M.clipUrl[n])}<span class="tag ref">Gold</span><span class="priv">Rick · nội bộ</span></div><figcaption>${h(n.slice(5))}</figcaption></figure>`).join('');
  const goldFrames = M.examples.good.map(e => `<figure><div class="frame still">${exFrame(M, e.files[0], e.kind === 'praised' ? 'Kai khen' : 'Gold', e.kind === 'praised' ? 'ok' : 'ref')}</div><figcaption>${e.roots.map(r => `<b>${r}</b>`).join(' ')} ${h(e.text)}</figcaption></figure>`).join('');
  return `<section class="page" id="colour"><div class="crumb">Mẫu</div><h2>Color script · ${h(M.beats[0]?.tag || 'ep01')}</h2><p class="lead">${M.beats.length} nhịp</p>${cs}</section>
    <section class="page" id="gold"><div class="crumb">Mẫu</div><h2>Gold shot</h2><p class="lead">${M.gold.length} clip · ${M.examples.good.length} ảnh</p>
      ${goldClips ? `<div class="gridv">${goldClips}</div>` : ''}<div class="gridv stills">${goldFrames}</div></section>`;
}

function assetsHTML(M) {
  return `<section class="page" id="bad"><div class="crumb">Tài sản</div><h2>Kai đã chê</h2><p class="lead">${M.examples.bad.length} ảnh</p>
    <div class="gridv stills">${M.examples.bad.map(e => `<figure>${exFrame(M, e.files.at(-1), e.ids[0] || 'Sai', 'bad')}<figcaption>${e.roots.map(r => `<b>${r}</b>`).join(' ')} ${h(e.quote || e.text)}</figcaption></figure>`).join('')}</div></section>`;
}

function statusHTML(M) {
  const s = M.validation.stats, cnt = (L, k) => L.filter(x => x.status === k).length;
  const row = (k, txt) => `<tr><td>${badge(k)}</td><td>${txt}</td><td class="val">${cnt(M.components, k)} phần · ${cnt(M.tokens, k)} token</td></tr>`;
  const errs = M.validation.errors.length ? `<ul class="finds">${M.validation.errors.map(e => `<li>${h(e)}</li>`).join('')}</ul>` : '<p class="muted">Nguồn hợp lệ: 0 lỗi.</p>';
  return `<section class="page" id="status"><div class="crumb">Trạng thái</div><h2>Nhãn</h2>
    <table class="ttab slim"><tbody>${row('stable', 'Kai đã khen, dùng được')}${row('trial', 'đang thử, chưa duyệt')}${row('retired', 'Kai đã chê, không dùng')}</tbody></table>
    <p class="muted small">${s.filmLocal} phần còn nằm trong phim, chờ đưa vào kit (nhãn <span class="loc">phim</span>). ${s.gaps.length} token trống.</p>${errs}</section>
    <section class="page" id="log"><div class="crumb">Trạng thái</div><h2>Thay đổi</h2>
    <table class="ttab slim"><tbody>${M.changelog.map(c => `<tr><td class="mono">${h(c.date)}</td><td class="mono">${h(c.hash)}</td><td>${h(c.subject)}</td></tr>`).join('') || '<tr><td>chưa có commit</td></tr>'}</tbody></table></section>`;
}

export function render(M) {
  const kinds = KINDS.filter(k => M.components.some(c => c.kind === k));
  const rail = `<h5>Soát</h5><a href="#home">R1–R5</a>
    <h5>Nền tảng</h5>${ROOTS.filter(r => M.tokens.some(t => t.root === r)).map(r => `<a href="#tok-${r}">${r} token <small>${M.tokens.filter(t => t.root === r).length}</small></a>`).join('')}
    <h5>Thành phần</h5>${kinds.map(k => `<a href="#kind-${k}">${h(KIND_VI[k] || k)} <small>${M.components.filter(c => c.kind === k).length}</small></a>`).join('')}
    <h5>Mẫu</h5><a href="#colour">Color script</a><a href="#gold">Gold shot</a>
    <h5>Tài sản</h5><a href="#bad">Kai đã chê</a>
    <h5>Trạng thái</h5><a href="#status">Nhãn</a><a href="#log">Thay đổi</a>`;
  const s = M.validation.stats;
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hot Money Bible</title><style>${CSS}</style></head>
<body><header class="top"><div class="brand">${h(M.film)} <small>Show Bible</small></div>
<div class="sum mono">${s.tokens} token · ${s.components} phần · ${s.status.stable || 0} ổn định</div>
<div class="filter seg" id="stf"><button aria-pressed="true" data-s="all">Tất cả</button><button data-s="stable">Ổn định</button><button data-s="trial">Thử</button></div>
<button class="themeBtn" id="themeBtn" aria-label="Đổi giao diện">◐</button></header>
<div class="layout"><nav class="rail" id="rail">${rail}</nav><main>
${homeHTML(M)}${tokensHTML(M)}${componentsHTML(M)}${patternsHTML(M)}${assetsHTML(M)}${statusHTML(M)}
<footer class="muted small">Sinh từ ${h(path.relative(M.repo, M.dir))}/tokens.json + catalog.json bởi styles/stick-man/bible/page.mjs. Đừng sửa tay.</footer>
</main></div><script>${JS}</script></body></html>`;
}

export function coverage(html, { tokens, catalog }) {
  const got = attr => { const m = new Map(); for (const [, v] of html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))) { const k = v.replace(/&quot;/g, '"').replace(/&amp;/g, '&'); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const T = got('data-token'), C = got('data-id');
  const want = (L, M) => ({ missing: L.filter(x => !M.has(x)), twice: [...M].filter(([, n]) => n > 1).map(([k]) => k), extra: [...M.keys()].filter(k => !L.includes(k)) });
  return { tokens: want(tokens.tokens.map(t => t.name), T), components: want(catalog.components.map(c => c.id), C) };
}

export async function emit(opts) {
  const M = await buildModel(opts);
  fs.mkdirSync(opts.out, { recursive: true });
  gatherMedia(M, opts.out);
  const html = render(M);
  const cov = coverage(html, loadBible(M.dir));
  const bad = [...cov.tokens.missing, ...cov.tokens.twice, ...cov.tokens.extra, ...cov.components.missing, ...cov.components.twice, ...cov.components.extra];
  if (bad.length) throw new Error(`page out of sync with the source: ${bad.join(', ')}`);
  fs.writeFileSync(path.join(opts.out, 'index.html'), html);
  return { M, html, cov };
}

const CSS = `
:root{--bg:#f5f2ed;--surface:#fff;--sunk:#ece7e0;--ink:#1f1a1c;--muted:#6c6466;--line:#e0d9d0;--ok:#23784a;--bad:#c13a2c;--accent:#b0601c;--chip:#efe9e1;
--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131113;--surface:#1c191b;--sunk:#100e10;--ink:#eee8e1;--muted:#a2999a;--line:#2f2a2c;--ok:#5cc286;--bad:#f0705f;--accent:#e39a52;--chip:#262224;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#131113;--surface:#1c191b;--sunk:#100e10;--ink:#eee8e1;--muted:#a2999a;--line:#2f2a2c;--ok:#5cc286;--bad:#f0705f;--accent:#e39a52;--chip:#262224;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0}html{scroll-padding-top:70px}
body{background:var(--bg);color:var(--ink);font:15px/1.45 var(--sans);overflow-x:hidden}
img,video{display:block;max-width:100%}button{font:inherit;color:inherit}code,.mono{font-family:var(--mono);font-size:12px}
.muted{color:var(--muted)}.small{font-size:12px}h2,h3,h5{margin:0;line-height:1.2}
.top{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;padding:10px 16px;flex-wrap:wrap}
.brand{font-weight:800;text-transform:capitalize}.brand small{font-weight:500;color:var(--muted);margin-left:6px;text-transform:none}.sum{color:var(--muted)}
.seg{display:inline-flex;background:var(--chip);border-radius:8px;padding:3px;gap:2px}.seg button{border:0;background:transparent;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:13px}
.seg button[aria-pressed="true"]{background:var(--surface);font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.12)}.filter{margin-left:auto}
.themeBtn{border:1px solid var(--line);background:transparent;border-radius:8px;padding:6px 9px;cursor:pointer}
.layout{display:grid;grid-template-columns:220px minmax(0,1fr)}
.rail{border-right:1px solid var(--line);padding:14px 10px 40px;position:sticky;top:57px;align-self:start;height:calc(100vh - 57px);overflow:auto}
.rail h5{margin:14px 8px 4px;font:600 11px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.rail a{display:flex;justify-content:space-between;padding:4px 8px;border-radius:6px;color:var(--ink);text-decoration:none;font-size:14px}.rail a small{color:var(--muted);font-family:var(--mono);margin-left:6px}
.rail a.cur{background:var(--chip);font-weight:700}
main{padding:8px clamp(16px,3vw,40px) 80px;min-width:0;max-width:1180px}
.page{padding:26px 0 30px;border-bottom:1px solid var(--line);min-width:0}.crumb{font:12px var(--mono);color:var(--muted)}
.page h2{font-size:26px;margin:4px 0 6px;letter-spacing:-.01em}.lead{color:var(--muted);margin:0 0 14px}
.sub{font-size:13px;font-weight:700;margin:18px 0 8px}
.frame{position:relative;aspect-ratio:3/4;background:#0d0b0c;border-radius:8px;overflow:hidden}
.frame.clip{aspect-ratio:9/16;max-width:150px}
.frame>img,.frame>video{width:100%;height:100%;object-fit:contain}
.frame.ok{outline:3px solid var(--ok);outline-offset:-3px}.frame.bad{outline:3px solid var(--bad);outline-offset:-3px}
.tag{position:absolute;left:6px;top:6px;font:700 11px/1 var(--sans);padding:4px 6px;border-radius:5px;color:#fff;background:#3a3436}
.tag.ok{background:#1f7a47}.tag.bad{background:#bf3426}
.priv{position:absolute;right:6px;bottom:6px;font:600 10px/1 var(--mono);background:rgba(0,0,0,.65);color:#fff;padding:3px 5px;border-radius:4px}.priv.left{right:auto;left:6px}
.empty{display:grid;place-items:center;min-height:96px;height:100%;border:1.5px dashed var(--line);border-radius:8px;color:var(--muted);font-size:12px;background:var(--sunk)}
.empty-state{padding:18px;border:1.5px dashed var(--line);border-radius:12px;color:var(--muted);margin:12px 0}
figure{margin:0;min-width:0}figcaption{font-size:12px;color:var(--muted);margin-top:5px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.cmp{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:20px;align-items:start;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;margin:12px 0}
.cmp h3{font-size:18px;margin-bottom:4px}.cmpcol{max-width:260px;width:100%}
.expsheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:10px;margin:6px 0 18px;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.expsheet figure{text-align:center}.expsheet figcaption{font:11px var(--mono);margin-top:3px}.facebox.sm{width:100%;height:auto;aspect-ratio:1}
.gpairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:16px}.gpair{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:4px 12px 10px}
.cmpbox{position:relative;aspect-ratio:9/16;background:#000;border-radius:8px;overflow:hidden}
.cmpbox video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cmpbox .top-v{clip-path:inset(0 calc(100% - var(--x,50%)) 0 0)}.cmpbox.ov .top-v{clip-path:none;opacity:.5}
.cmpbox .knife{position:absolute;top:0;bottom:0;left:var(--x,50%);width:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.4)}.cmpbox.ov .knife{display:none}
.cmpbox .lab{position:absolute;top:8px;font:700 11px var(--sans);color:#fff;background:rgba(0,0,0,.6);padding:3px 6px;border-radius:4px}.lab.l{left:8px}.lab.r{right:8px}
input[type=range]{width:100%}
.qnav{position:sticky;top:57px;z-index:10;background:var(--bg);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:8px 0;border-bottom:1px solid var(--line)}
.qnav a{display:block;text-decoration:none;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 10px;min-width:0}
.qnav b{font:800 15px var(--mono)}.qnav span{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qnav em{float:right;font:700 11px var(--mono);font-style:normal;padding:1px 6px;border-radius:9px;color:#fff}.nbad{background:var(--bad)}.nok{background:var(--ok)}
.q{padding:22px 0;border-bottom:1px solid var(--line);scroll-margin-top:130px}
.qh{display:flex;align-items:baseline;gap:12px;margin-bottom:8px}.rn{font:800 32px/1 var(--mono);color:var(--accent)}.qh h3{font-size:21px}
.qgrid{display:grid;grid-template-columns:minmax(0,400px) minmax(0,1fr);gap:22px;align-items:start}
.morebad{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;margin-top:8px}.morebad .tag{font-size:9px;padding:2px 4px}
.meas{display:grid;gap:6px;margin-bottom:10px}.meas div{display:flex;justify-content:space-between;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font-size:13px}
.meas b{font-family:var(--mono);font-weight:600;white-space:nowrap}.counts{font-size:13px;color:var(--muted)}.counts a{color:var(--accent)}
details summary{cursor:pointer;font-size:13px;color:var(--muted);margin-top:10px}details p{font-size:13px}
.finds{margin:0;padding-left:18px;font-size:13px}.finds li{margin:3px 0}.sev{font:700 11px var(--mono);color:var(--bad)}
.praise{columns:2;column-gap:28px;font-size:13px;padding-left:18px}.praise li{margin:0 0 6px;break-inside:avoid}
.ev{font:600 11px var(--mono);padding:1px 5px;border-radius:4px;margin-right:3px;white-space:nowrap}.ev.plus{color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}.ev.minus{color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent)}
.st{font:600 11px var(--mono);padding:2px 7px;border-radius:5px;background:var(--chip);white-space:nowrap}.st-stable{color:var(--ok)}.st-trial{color:var(--accent)}.st-retired{color:var(--bad);text-decoration:line-through}
.rc{font:700 11px var(--mono);color:var(--accent);text-decoration:none;margin-right:4px}
.loc{font:600 10px var(--mono);padding:1px 5px;border-radius:4px;border:1px solid var(--accent);color:var(--accent)}
.ttab{width:100%;border-collapse:collapse;font-size:14px}
.ttab th{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:8px;border-bottom:1px solid var(--line)}
.ttab td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:middle}.ttab tr.fam td{font:700 12px var(--mono);color:var(--muted);padding-top:16px;background:var(--bg)}
.ttab td.val{font-family:var(--mono);font-size:12.5px}.ttab tr.gap td{background:color-mix(in srgb,var(--accent) 7%,transparent)}.pvc{width:96px}
.pv{width:84px;min-height:28px;display:flex;align-items:center;gap:4px;position:relative}
.sw{width:44px;height:28px;border-radius:6px;border:1px solid var(--line);display:block}
.ramp{position:relative;height:18px;width:84px;border-radius:4px;background:linear-gradient(90deg,#000,#fff)}
.ramp .mk{position:absolute;top:-3px;bottom:-3px;width:3px;margin-left:-1.5px;background:var(--accent);border-radius:2px}
.bandi{position:absolute;top:-3px;bottom:-3px;border:2px solid var(--accent);border-radius:3px;background:color-mix(in srgb,var(--accent) 22%,transparent)}
.bar{position:relative;height:10px;width:84px;border-radius:5px;background:var(--chip)}.bar>i:not(.bandi){position:absolute;left:0;top:0;bottom:0;background:var(--ink);border-radius:5px}
.ticks{position:absolute;left:0;width:84px;top:50%;height:16px;margin-top:-8px;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0 27px,var(--accent) 27px 28px)}
.fov{width:60px;height:34px}.fov path{fill:color-mix(in srgb,var(--accent) 25%,transparent);stroke:var(--accent);stroke-width:1.5}
.aa{font-weight:900;line-height:1}.chipv{font:12px var(--mono);background:var(--chip);padding:3px 6px;border-radius:5px;white-space:nowrap;overflow:hidden;max-width:84px;text-overflow:ellipsis}
.gapbox{font:700 11px var(--mono);color:var(--accent);border:1.5px dashed var(--accent);padding:4px 8px;border-radius:5px}
.mini916{position:relative;width:24px;height:42px;border:1.5px solid var(--ink);border-radius:3px;background:var(--sunk);overflow:hidden}
.mini916 i{position:absolute;left:0;right:0;height:2px;background:var(--accent)}.mini916 i.v{top:0;bottom:0;width:2px;height:auto}
.mini916 b{position:absolute;left:0;right:0;background:color-mix(in srgb,var(--accent) 45%,transparent)}.mini916 b.v{top:0;bottom:0;height:auto}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
.card .stage{background:var(--sunk);padding:12px;display:grid;place-items:center;min-height:120px}
.card .body{padding:12px 14px 14px;display:grid;gap:6px;min-width:0}.ch{display:flex;justify-content:space-between;gap:8px;align-items:center}.ch code{font-weight:700;overflow-wrap:anywhere}
.nm{font-weight:600;font-size:14px}.use{font-size:13px}.use .ok{color:var(--ok);font-weight:800}.use .bad{color:var(--bad);font-weight:800}
.meta{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.kit{color:var(--muted);font-size:11px;overflow-wrap:anywhere}
.card .pair .frame{aspect-ratio:1}.card .empty{width:100%;min-height:110px}
.facebox{width:118px;height:118px;background:#9fb6c8;border-radius:10px}.facebox svg{width:100%;height:100%;display:block}
.cards.faces{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.tokstage{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.tokstage>div{display:grid;justify-items:center;gap:3px}
.cs{display:grid;grid-template-columns:repeat(14,minmax(0,1fr));gap:4px}.cs img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:3px}
.cs .chipc{height:10px;margin-top:3px;border-radius:2px}.cs .lb{height:46px;position:relative;background:var(--sunk);margin-top:3px;border-radius:3px}
.cs .lb i{position:absolute;left:20%;right:20%;bottom:0;background:var(--muted)}.cs .lb i.low{background:var(--bad)}
.cs .lb .bandl{position:absolute;left:0;right:0;border-top:1.5px dashed var(--accent)}.cs .lb .bandl.dark{border-top-color:var(--bad)}
.cs .t{font:10px var(--mono);margin-top:2px;color:var(--muted);white-space:nowrap;overflow:hidden}
.legend{display:flex;flex-wrap:wrap;gap:14px;font:11px var(--mono);margin-top:10px}.legend i{display:inline-block;width:14px;height:0;border-top:2px dashed var(--accent);vertical-align:middle;margin-right:5px}
.legend .lg2{border-top-color:var(--bad)}.legend .lg3{border-top:6px solid var(--bad)}
.gridv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px}.gridv .frame{aspect-ratio:9/16}.gridv.stills .frame{aspect-ratio:3/4}
.ttab.slim td{padding:7px 8px}footer{padding:24px 0}
.card[hidden],tr[hidden]{display:none!important}
@media (max-width:820px){
 .layout{grid-template-columns:minmax(0,1fr)}.rail{min-width:0;max-width:100vw}
 .rail{position:sticky;top:0;z-index:15;height:auto;display:flex;gap:4px;overflow-x:auto;padding:8px 12px;border-right:0;border-bottom:1px solid var(--line);background:var(--bg)}
 .rail h5{display:none}.rail a{white-space:nowrap;flex:none;background:var(--surface);border:1px solid var(--line)}
 .top{position:static}.filter{margin-left:0}.qnav{top:52px;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.qnav a{padding:6px}.qnav span{display:none}
 .cmp,.qgrid{grid-template-columns:1fr}.cmpcol{max-width:220px}.expsheet{grid-template-columns:repeat(4,minmax(0,1fr));padding:10px;gap:6px}.gpairs{grid-template-columns:1fr}
 .ttab thead{display:none}.ttab tr:not(.fam){display:grid;grid-template-columns:96px minmax(0,1fr);gap:4px 10px;padding:10px 0;border-bottom:1px solid var(--line)}
 .ttab tr:not(.fam) td{border:0;padding:0}.ttab tr:not(.fam) td.pvc{grid-row:span 4}.ttab tr.fam{display:block}.ttab tr.fam td{display:block}
 .praise{columns:1}.cs{grid-template-columns:repeat(7,minmax(0,1fr));row-gap:10px}.cards,.cards.faces{grid-template-columns:1fr}
 .gridv{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ttab.slim tr:not(.fam){grid-template-columns:auto minmax(0,1fr)}.ttab td{min-width:0;overflow-wrap:anywhere}.ttab.slim td:last-child{grid-column:1/-1}
}`;

const JS = `
const $=(s,r=document)=>r.querySelector(s);
const k=$('#knife'),box=$('#cmpbox');if(k)k.oninput=e=>box.style.setProperty('--x',e.target.value+'%');
const cm=$('#cmpMode');if(cm)cm.onclick=e=>{const b=e.target.closest('button');if(!b)return;cm.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));box.classList.toggle('ov',b.dataset.m==='ov');k.disabled=b.dataset.m==='ov';};
const io=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting){v.play().catch(()=>{});}else v.pause();}),{rootMargin:'100px'});
document.querySelectorAll('video').forEach(v=>io.observe(v));
const links=[...document.querySelectorAll('#rail a')];
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('cur',a.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-30% 0px -60% 0px'});
document.querySelectorAll('section.page').forEach(s=>so.observe(s));
$('#stf').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('#stf').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
 document.querySelectorAll(".card,tr[data-token]").forEach(c=>c.hidden=b.dataset.s!=='all'&&c.dataset.status!==b.dataset.s);};
const th=['auto','light','dark'];$('#themeBtn').onclick=()=>{const cur=document.documentElement.dataset.theme||'auto',nx=th[(th.indexOf(cur)+1)%3];
 if(nx==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=nx;$('#themeBtn').textContent={auto:'◐',light:'☀',dark:'☾'}[nx];};`;

async function main(argv) {
  const all = n => argv.flatMap((a, i) => a === n ? [argv[i + 1]] : []), arg = n => all(n)[0];
  const out = arg('--out');
  if (!out) { console.error('usage: page.mjs --out <dir> [--dir <bible>] [--taste <dir>] [--media <dir>] [--proof <dir>]... [--films <root>] [--report <json>]'); process.exit(2); }
  const films = arg('--films') || path.join(REPO, 'films');
  const proof = all('--proof').length ? all('--proof') : [path.join(films, 'motionlib-proof'), path.join(films, 'hm-ep01/review/run/tmp/libproof')];
  const { M, cov } = await emit({ out: path.resolve(out), dir: arg('--dir') ? path.resolve(arg('--dir')) : undefined, taste: arg('--taste'), media: arg('--media') && path.resolve(arg('--media')),
    proof, films, report: arg('--report') });
  const clips = M.components.filter(c => c.kind === 'motion-clip'), faces = M.components.filter(c => c.kind === 'face');
  console.log(`page ${path.join(out, 'index.html')}`);
  console.log(`  ${M.tokens.length} token rows (want ${cov.tokens.missing.length ? 'MISSING ' + cov.tokens.missing.length : 'all'}), ${M.components.length} cards`);
  console.log(`  motion clips with a proof clip ${clips.filter(c => c.clipUrl).length}/${clips.length}; faces drawn by the kit ${faces.filter(c => M.faces[c.key]).length}/${faces.length}; Đúng/Sai pairs ${M.components.filter(c => c.pair).length}`);
  console.log(`  colour script ${M.beats.length} beats; gold clips ${M.gold.length}; compare ${M.compare.map(c => c.topic).join(',') || 'none'}; findings ${M.findings ? M.findings.length : 'no report'}; changelog ${M.changelog.length}`);
  for (const e of M.validation.errors) console.log(`  source error: ${e}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
