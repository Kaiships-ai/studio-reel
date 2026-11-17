#!/usr/bin/env node
// The bible check: loads a film's acts in node (reel.js + reel2.js of each part, as engine/play.js does) and reports every
// use of a part outside the film's bible (catalog.json), with where it is and the catalog part to use instead.
//   node styles/stick-man/bible/check.mjs films/<slug>[/<part>] [--parts s4,s5,s6] [--films-root <dir>] [--bible <dir>] [--json]
// The bible is the one whose catalog `governs` the film's slug (hm-ep* -> hot-money); with none, there is nothing to check.
// films/<slug>/bible-exceptions.json, [{ rule, where: '<act>/<actor or ->/<what>' (a prefix, * for any segment), reason }],
// silences a finding and counts it. Exit 1 on any blocking finding left, 2 on a usage or load error. Read-only.
import * as nodeModule from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, loadBible } from './catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RULES = {
  'hand-keyed-action': { severity: 'block', vi: 'key tay cho động tác thư viện có clip' },
  'clip-missing-for-body': { severity: 'gap', vi: 'thư viện có clip, nhưng chưa có cho thân này' },
  'clip-not-in-catalog': { severity: 'block', vi: 'clip không có trong danh mục' },
  'clip-wrong-body': { severity: 'block', vi: 'clip của thân khác' },
  'face-not-in-catalog': { severity: 'block', vi: 'nét mặt ngoài danh mục' },
  'camera-kind-not-in-catalog': { severity: 'block', vi: 'loại shot ngoài danh mục' },
  'camera-move-not-in-catalog': { severity: 'block', vi: 'di máy ngoài danh mục' },
  'prop-not-in-catalog': { severity: 'block', vi: 'đạo cụ ngoài danh mục' },
  'fx-not-in-catalog': { severity: 'block', vi: 'hiệu ứng ngoài danh mục' },
  'overlay-not-in-catalog': { severity: 'block', vi: 'overlay 2D ngoài danh mục' },
  'set-not-in-catalog': { severity: 'block', vi: 'bối cảnh ngoài danh mục' },
  'look-not-in-catalog': { severity: 'block', vi: 'ánh sáng, grade ngoài danh mục' },
  'retired-part': { severity: 'block', vi: 'phần đã bỏ' },
  'trial-part': { severity: 'info', vi: 'phần đang thử' },
};
const SEV = ['block', 'gap', 'info'];
const TAGGED = ['camera-move', 'look-preset'];
// a stepTurn that carries the body further than a stride is a walk or a run; one that turns this far is a turn clip
const STRIDE_M = 0.6, TURN_DEG = 45, HAND_TRAVEL_M = 0.5;

class UsageError extends Error {}

// ---------------------------------------------------------------- arguments, film, bible, exceptions (the boundary)
function parseArgs(argv) {
  const o = { json: false }, rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (['--parts', '--films-root', '--bible'].includes(a)) { if (argv[i + 1] == null) throw new UsageError(`${a} needs a value`); o[a.slice(2)] = argv[++i]; }
    else if (a.startsWith('--')) throw new UsageError(`unknown flag ${a}`);
    else rest.push(a);
  }
  if (rest.length !== 1) throw new UsageError('usage: check.mjs films/<slug>[/<part>] [--parts a,b] [--films-root <dir>] [--bible <dir>] [--json]');
  return { ...o, target: rest[0] };
}

export function locateFilm(target, filmsRoot) {
  const abs = path.isAbsolute(target) ? target : target.startsWith('films/') ? path.join(path.resolve(filmsRoot || path.join(REPO, 'films')), target.slice(6)) : path.resolve(target);
  if (!fs.existsSync(abs)) throw new UsageError(`${target}: no such folder ${abs}`);
  let root = filmsRoot && path.resolve(filmsRoot);
  if (!root) {
    const i = abs.lastIndexOf(`${path.sep}films${path.sep}`);
    if (i < 0) return { root: null, rel: path.relative(REPO, abs).split(path.sep).join('/'), slug: null, dir: abs };   // a kit page (motion-lib/proof), not a film
    root = abs.slice(0, i + 6);
  }
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) throw new UsageError(`${target}: not inside ${root}`);
  return { root, rel, slug: rel.split('/')[0], dir: abs };
}

export function bibleFor(slug, dir) {
  if (dir) return path.resolve(dir);
  const glob = g => new RegExp(`^${g.replace(/\*/g, '.*')}$`);
  for (const d of fs.readdirSync(HERE)) {
    const f = path.join(HERE, d, 'catalog.json');
    if (fs.existsSync(f) && (JSON.parse(fs.readFileSync(f, 'utf8')).governs || []).some(g => glob(g).test(slug))) return path.join(HERE, d);
  }
  return null;
}

function readExceptions(file) {
  if (!fs.existsSync(file)) return [];
  let list;
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new UsageError(`${file}: not JSON (${e.message})`); }
  if (!Array.isArray(list)) throw new UsageError(`${file}: a list of { rule, where, reason }`);
  return list.map((x, i) => {
    const bad = m => { throw new UsageError(`${file} entry ${i}: ${m}`); };
    if (!x || typeof x !== 'object') bad('not an object');
    if (x.rule !== '*' && !RULES[x.rule]) bad(`rule "${x.rule}" is not one of ${Object.keys(RULES).join(', ')}`);
    if (typeof x.where !== 'string' || !x.where) bad('no where');
    if (typeof x.reason !== 'string' || !x.reason.trim()) bad('no reason: an exception says why');
    return { rule: x.rule, where: x.where, reason: x.reason, used: 0 };
  });
}
// where: '<act>/<actor or ->/<what>', each segment * or left out for any (a what may itself hold '/')
const covers = (ex, f) => {
  const [a, s, ...w] = ex.where.split('/'), want = [a, s, w.length ? w.join('/') : undefined];
  return (ex.rule === '*' || ex.rule === f.rule) && [f.act, f.subject, f.what].every((v, i) => want[i] == null || want[i] === '*' || want[i] === v);
};

// ---------------------------------------------------------------- the catalog as lookups
export function indexBible(catalog) {
  const C = catalog.components, byId = new Map(C.map(c => [c.id, c]));
  const first = (m, k, v) => { if (!m.has(k)) m.set(k, v); };
  const provided = {}, cover = { poses: new Map(), moves: new Map(), props: new Map() }, places = new Map(), named = {};
  for (const c of C) {
    for (const [k, list] of Object.entries(c.provides || {})) for (const n of list) first(provided[k] ||= new Map(), n, c.id);
    for (const [k, list] of Object.entries(c.covers || {})) for (const n of list) first(cover[k], n, c.id);
    for (const r of c.kit || []) {
      if (c.kind === 'set') first(places, '/' + r.path, c.id);
      // a film's own camera moves and looks are seen by tagging what their export makes (other parts are seen by name)
      if (TAGGED.includes(c.kind) && r.path.startsWith('films/') && r.export) (named[r.path.slice(6)] ||= {})[r.export] = c.id;
    }
  }
  return { byId, provided, cover, places, named, marks: C.filter(c => c.mark).map(c => [c.mark, c.id]) };
}

// ---------------------------------------------------------------- loading the acts with every use recorded
async function loadActs(film, parts, named) {
  const rec = { tracks: [], steps: [] };
  const toRel = u => { const f = u.startsWith('file:') ? fileURLToPath(u.split('?')[0]) : u; return f.startsWith(film.root + path.sep) ? f.slice(film.root.length + 1) : path.relative(REPO, f); };
  const callSite = () => {
    const l = new Error().stack.split('\n')[3] || '', m = /(file:\/\/[^\s)]+?):(\d+):\d+\)?$/.exec(l.trim());
    return m ? { file: toRel(m[1]), line: +m[2] } : null;
  };
  const tag = (v, id, site) => {
    if (Array.isArray(v)) { for (const e of v) if (e && typeof e === 'object') { e.__part ??= id; if (e.cam) { e.__cam = JSON.stringify(e.cam); e.__site = site; } } }
    else if (v && typeof v === 'object') { v.__part ??= id; for (const x of Object.values(v)) if (x && typeof x === 'object' && !Array.isArray(x)) x.__part ??= id; }
    return v;
  };
  globalThis.__BIBLE = { wrap: {
    track: fn => function buildTrack(keys, o) {
      const site = callSite(), r = fn(keys, o), id = rec.tracks.length;
      for (const k of r?.keys || []) if (k && typeof k === 'object') k.__track = id;
      rec.tracks.push({ id, input: keys, use: r?.use || [], site });
      return r;
    },
    step: fn => function stepTurn(o) {
      const site = callSite(), k = fn(o), id = rec.steps.length;
      for (const x of k) x.__step = id;
      const p0 = o.pos, p1 = o.pos1 || o.pos;
      rec.steps.push({ id, pose: typeof o.pose === 'string' ? o.pose : 'inline', travel: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), turn: Math.abs((o.yaw1 ?? 0) - (o.yaw0 ?? 0)), f0: k[0]?.f, f1: k.at(-1)?.f, site });
      return k;
    },
    part: (v, id) => typeof v === 'function' ? function (...a) { return tag(v.apply(this, a), id, callSite()); } : tag(v, id),
  } };
  const local = u => (u.startsWith('/films/') ? film.root + u.slice(6) : u.startsWith('/styles/') ? REPO + u : u);
  globalThis.ProgressEvent ??= class { constructor(t, o) { Object.assign(this, o, { type: t }); } };
  globalThis.Request = class { constructor(u) { this.url = String(u); } };   // three's loaders build a Request from a root path
  globalThis.fetch = async u => new Response(fs.readFileSync(local(typeof u === 'object' ? u.url : String(u))), { status: 200 });
  const ctx2d = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : typeof k === 'string' ? () => ctx2d : undefined), set: () => true });
  globalThis.document = { createElement: () => ({ getContext: () => ctx2d, width: 0, height: 0, style: {} }) };
  const data = { films: film.root, kit: REPO, named };
  if (nodeModule.registerHooks) { const h = await import('./hooks.mjs'); h.initialize(data); nodeModule.registerHooks({ resolve: h.resolve, load: h.load }); }
  else nodeModule.register('./hooks.mjs', import.meta.url, { data });

  const acts = [];
  for (const p of parts) for (const f of ['reel.js', 'reel2.js']) {
    const rel = [film.rel, p].filter(Boolean).join('/') + '/' + f;
    if (!fs.existsSync(path.join(film.root, rel))) continue;
    const m = (await import(`/films/${rel}`)).default;
    for (const a of m.acts || [m]) acts.push({ act: a, file: rel });
  }
  if (!acts.length) throw new UsageError(`no reel.js or reel2.js in ${parts.map(p => [film.rel, p].filter(Boolean).join('/')).join(', ')}`);
  const { SPECS } = await import('/styles/stick-man/engine/play.js');
  return { acts, rec, SPECS };
}

// ---------------------------------------------------------------- source lines (file:line for a finding)
function sourceLines(root) {
  const cache = new Map();
  const lines = rel => { if (!cache.has(rel)) { const f = [path.join(root, rel), path.join(REPO, rel)].find(x => fs.existsSync(x)); cache.set(rel, f ? fs.readFileSync(f, 'utf8').split('\n') : []); } return cache.get(rel); };
  // the first line in `files` (in order) matching every pattern
  return (files, ...res) => {
    for (const rel of files.filter(Boolean)) { const L = lines(rel), i = L.findIndex(l => res.every(r => r.test(l))); if (i >= 0) return { file: rel, line: i + 1 }; }
    return null;
  };
}
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const near = (name, names) => {
  const d = (a, b) => { const m = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let p = m[0]; m[0] = i; for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = Math.min(m[j] + 1, m[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return m[b.length]; };
  return [...names].sort((a, b) => d(name, a) - d(name, b))[0];
};

// ---------------------------------------------------------------- the rules
export function judge({ acts, rec, SPECS }, bible, film) {
  const { byId, provided, cover, places, marks, named } = bible;
  const findings = [], used = new Map(), lib = { clipActions: 0, handActions: 0, clipFrames: 0, handFrames: 0 };
  const find = sourceLines(film.root), filmFiles = filmImports(acts.map(a => a.file), film.root);
  const add = (rule, o) => findings.push({ rule, severity: RULES[rule].severity, subject: '-', ...o, key: `${o.act}/${o.subject || '-'}/${o.what}` });
  const usedMost = kind => [...used].filter(([id]) => byId.get(id).kind === kind).sort((x, y) => y[1].uses - x[1].uses)[0]?.[0] || null;
  const use = (id, act, f0, f1 = f0) => { const u = used.get(id) || used.set(id, { uses: 0, acts: new Set(), f0, f1 }).get(id); u.uses++; u.acts.add(act); u.f0 = Math.min(u.f0, f0); u.f1 = Math.max(u.f1, f1); };
  const fromWhere = (o, loc) => ({ ...o, ...(loc || {}) });
  // one entry per name, with its frame span and count (`extra` is kept from the first sighting)
  const tally = (m, k, f, extra) => { const e = m.get(k) || m.set(k, { f0: f, f1: f, n: 0, ...extra }).get(k); e.f0 = Math.min(e.f0, f); e.f1 = Math.max(e.f1, f); e.n++; };
  // a hand-keyed body action the clip `clipId` covers: off the bible when the clip exists for this body, a gap when not
  const handAction = (clipId, o) => {
    const c = byId.get(clipId), ok = c.bodies.includes('*') || c.bodies.includes(o.body);
    if (ok) add('hand-keyed-action', { ...o, instead: clipId });
    else add('clip-missing-for-body', { ...o, instead: clipId, note: `${c.name} chỉ có thân ${c.bodies.join(', ')}, chưa có ${o.body}` });
  };
  const moveClip = pose => { const id = cover.poses.get(pose); return id && byId.get(id).name.startsWith('Move_') ? id : null; };

  for (const { act: a, file } of acts) {
    const act = a.name ?? file, [F0, F1] = a.frames, inAct = (f0, f1 = f0) => f1 >= F0 && f0 <= F1;
    const actFiles = [find(filmFiles, new RegExp(`name:\\s*'${esc(act)}'`))?.file, file, ...filmFiles];
    // ---- body actions, per actor: clip runs, runs of hand keys of one pose, stepTurns
    for (const [actor, keys] of Object.entries(a.anim || {})) {
      const body = SPECS[a.cast?.[actor]?.spec]?.motionBody || 'adult', subject = actor;
      const ids = [...new Set(keys.map(k => k.__track).filter(n => n != null))];
      const sources = ids.length ? ids.map(i => ({ input: rec.tracks[i].input, use: rec.tracks[i].use, site: rec.tracks[i].site })) : [{ input: keys, use: [], site: { file, line: null } }];
      const actions = [];
      for (const src of sources) {
        const ks = [...src.input].sort((x, y) => x.f - y.f), siteFiles = [src.site?.file, file];
        let run = null, prev = null, nClip = 0;
        const close = () => { if (run) actions.push(run); run = null; };
        for (const k of ks) {
          if (k.clip) {
            close(); prev = null;
            const u = src.use[nClip++], f0 = u?.f0 ?? k.f, f1 = u?.f1 ?? k.f, id = `clip.${k.clip}`;
            if (!inAct(f0, f1)) continue;
            actions.push({ type: 'clip', f0, f1 });
            if (!byId.has(id)) { add('clip-not-in-catalog', fromWhere({ act, subject, what: k.clip, f0, f1 }, find(siteFiles, new RegExp(`clip:\\s*'${esc(k.clip)}'`)))); continue; }
            use(id, act, f0, f1);
            const cb = k.body || 'adult';
            if (cb !== body) add('clip-wrong-body', fromWhere({ act, subject, what: `${k.clip} (${cb}) trên thân ${body}`, f0, f1, note: 'mỗi thân dùng clip của chính nó' }, find(siteFiles, new RegExp(`clip:\\s*'${esc(k.clip)}'`))));
            continue;
          }
          if (k.__step != null) { close(); prev = null; continue; }
          const pose = typeof k.pose === 'string' ? k.pose : 'inline';
          if (prev?.pos && k.pos && inAct(prev.f, k.f) && Math.hypot(k.pos[0] - prev.pos[0], k.pos[1] - prev.pos[1]) > HAND_TRAVEL_M && cover.moves.get('walk'))
            handAction(moveClip(pose) || cover.moves.get('walk'), fromWhere({ act, subject, body, what: `đi bằng key tay (${pose})`, f0: prev.f, f1: k.f }, find(siteFiles, new RegExp(`\\bf:\\s*${k.f}\\b`))));
          if (run && run.pose === pose) { run.f1 = k.f; run.n++; } else { close(); run = { type: 'hand', pose, f0: k.f, f1: k.f, n: 1, siteFiles }; }
          prev = k;
        }
        close();
        for (const sid of new Set(src.input.map(k => k.__step).filter(n => n != null))) {
          const s = rec.steps[sid];
          if (!inAct(s.f0, s.f1)) continue;
          actions.push({ type: 'step', f0: s.f0, f1: s.f1 });
          const clip = s.travel > STRIDE_M ? moveClip(s.pose) || cover.moves.get('walk') : s.turn >= TURN_DEG ? cover.moves.get('turn') : null;
          if (clip) handAction(clip, { act, subject, body, what: s.travel > STRIDE_M ? `stepTurn ${s.travel.toFixed(1)} m (${s.pose})` : `stepTurn ${Math.round(s.turn)}° (${s.pose})`, f0: s.f0, f1: s.f1, ...(s.site || {}) });
        }
      }
      for (const r of actions.filter(x => x.type === 'hand' && inAct(x.f0, x.f1))) {
        const clip = cover.poses.get(r.pose);
        if (clip) handAction(clip, fromWhere({ act, subject, body, what: r.pose, f0: r.f0, f1: r.f1, count: r.n },
          find(r.siteFiles, new RegExp(`\\bf:\\s*${r.f0}\\b`), new RegExp(`'${esc(r.pose)}'`)) || find(r.siteFiles, new RegExp(`pose:\\s*'${esc(r.pose)}'`))));
      }
      // library share: each action owns the frames up to the next one (the last, to the act's end)
      actions.sort((x, y) => x.f0 - y.f0).forEach((x, i, L) => {
        const n = Math.max(0, Math.min(F1 + 1, L[i + 1]?.f0 ?? F1 + 1) - Math.max(F0, x.f0));
        if (x.type === 'clip') { lib.clipActions++; lib.clipFrames += n; } else { lib.handActions++; lib.handFrames += n; }
      });
      // ---- faces and hand props on this actor's keys
      const faces = new Map(), props = new Map();
      if (a.cast?.[actor]?.expr) tally(faces, a.cast[actor].expr, F0);
      const lastBefore = keys.filter(k => k.f < F0).at(-1);
      for (const k of keys.filter(k => k === lastBefore || inAct(k.f))) {
        if (typeof k.expr === 'string') tally(faces, k.expr, Math.max(F0, k.f));
        for (const [ch, v] of Object.entries(k)) { const m = /^x_hp[LRBH]_(\w+)$/.exec(ch); if (m && v > 0) tally(props, m[1], Math.max(F0, k.f)); }
      }
      const allFaces = [...[...byId.values()].filter(c => c.kind === 'face' && c.kit[0]?.key).map(c => c.kit[0].key), ...(provided.faces?.keys() || [])];
      for (const [e, s] of faces) {
        const id = byId.has(`face.${e}`) ? `face.${e}` : provided.faces?.get(e);
        if (id) { use(id, act, s.f0, s.f1); continue; }
        const alt = near(e, allFaces);
        add('face-not-in-catalog', fromWhere({ act, subject, what: e, f0: s.f0, f1: s.f1, count: s.n, instead: byId.has(`face.${alt}`) ? `face.${alt}` : `${provided.faces?.get(alt)} (${alt})`, note: 'tên gần nhất trong danh mục' },
          find([...sources.map(x => x.site?.file), file, ...filmFiles], new RegExp(`'${esc(e)}'`))));
      }
      for (const [n, s] of props) {
        const id = byId.has(`prop.hand.${n}`) ? `prop.hand.${n}` : provided.handProps?.get(n);
        if (id) { use(id, act, s.f0, s.f1); continue; }
        add('prop-not-in-catalog', fromWhere({ act, subject, what: n, f0: s.f0, f1: s.f1, count: s.n, instead: cover.props.get(n) || null, note: cover.props.get(n) ? null : 'chưa có phần nào trong danh mục: thêm vào bible trước' },
          find(filmFiles, new RegExp(`BUILD\\.${esc(n)}\\b`)) || find(filmFiles, new RegExp(`x_hp[LRBH]_${esc(n)}\\b`))));
      }
    }
    // ---- the camera
    const cams = new Map();
    for (const d of a.direct || []) {
      const f = d.at?.f ?? F0, kind = d.intent || d.kind;
      if (kind) { if (byId.has(`cam.${kind}`)) use(`cam.${kind}`, act, f); else tally(cams, `camera-kind-not-in-catalog|${kind}`, f, { instead: `cam.${near(kind, [...byId.values()].filter(c => c.kind === 'camera-kind').map(c => c.kit[0].key))}` }); }
      const moved = d.__part && d.__cam && d.__cam !== JSON.stringify(d.cam);
      const id = d.__part && byId.get(d.__part)?.kind === 'camera-move' ? d.__part : marks.find(([m]) => (d.why || '').includes(m))?.[1];
      if (id && !moved) use(id, act, f);
      else if (moved) tally(cams, `camera-move-not-in-catalog|${d.__part} bị sửa sau khi tạo (rung tay, lớp bọc)`, f, { loc: d.__site, instead: d.__part });
      else if (d.cam) tally(cams, 'camera-move-not-in-catalog|máy đặt tay từng frame', f);
      for (const [flag, what] of [['kick', 'rung máy (kick)'], ['to', 'di máy director (to/move)']]) if (d[flag]) tally(cams, `camera-move-not-in-catalog|${what}`, f);
    }
    for (const [k, s] of cams) {
      const [rule, what] = k.split('|');
      add(rule, { act, what, f0: s.f0, f1: s.f1, count: s.n, ...(s.loc?.line ? s.loc : find(actFiles, /\bdirect:/) || { file }), instead: s.instead || usedMost('camera-move') });
    }
    // ---- effects, overlays, set, look
    for (const [name, m] of Object.entries(a.make || {})) {
      const kind = m.kind || 'unnamed', id = byId.has(`fx.${kind}`) ? `fx.${kind}` : provided.make?.get(kind);
      if (id) use(id, act, F0, F1);
      else add('fx-not-in-catalog', fromWhere({ act, what: `${kind} (${name})`, f0: F0, f1: F1, instead: null, note: 'chưa có phần nào trong danh mục: thêm vào bible trước' }, find(filmFiles, new RegExp(`kind:\\s*'${esc(kind)}'`))));
    }
    for (const o of a.overlays || []) {
      const id = `card.overlay.${o.kind}`, f0 = o.from ?? F0, f1 = o.to ?? F1;
      if (byId.has(id)) use(id, act, f0, f1);
      else add('overlay-not-in-catalog', fromWhere({ act, what: o.kind, f0, f1, instead: 'card.overlay.text' }, find(filmFiles, new RegExp(`kind:\\s*'${esc(o.kind)}'`))));
    }
    if (a.setModule) {
      const id = places.get(a.setModule);
      if (id) use(id, act, F0, F1);
      else {
        const from = setsInside(a.setModule, places, film.root);
        add('set-not-in-catalog', fromWhere({ act, what: a.setModule.replace(/^\/films\//, ''), f0: F0, f1: F1, instead: from.length ? from.join(' + ') : null,
          note: from.length ? 'module ghép từ các phần này: đưa nó vào danh mục, hoặc dùng thẳng các phần' : 'thêm bối cảnh vào bible trước' }, find(actFiles, new RegExp(`setModule:\\s*'${esc(a.setModule)}'`)) || find([actFiles[0]], /setModule:/)));
      }
    }
    const looks = Object.values(named).flatMap(m => Object.values(m)).filter(id => byId.get(id)?.kind === 'look-preset');
    const off = ['look', 'light', 'grade', 'haze'].filter(k => a[k] && typeof a[k] === 'object');
    for (const k of off) if (a[k].__part) use(a[k].__part, act, F0, F1);
    const bad = off.filter(k => !a[k].__part);
    if (bad.length) add('look-not-in-catalog', fromWhere({ act, what: bad.join(', '), f0: F0, f1: F1, instead: [...new Set(looks)].join(' + ') || null, note: 'không lấy từ preset trong danh mục' },
      find(actFiles, new RegExp(`\\b(${bad.join('|')}):\\s*[A-Za-z_{.]`))));
  }
  // ---- retired and trial parts: one finding per part
  for (const [id, u] of used) {
    const c = byId.get(id), o = { act: [...u.acts].join(', '), what: id, f0: u.f0, f1: u.f1, count: u.uses };
    if (c.status === 'retired') add('retired-part', { ...o, note: `Kai chê: ${(c.evidence?.complaints || []).join(', ')}`, instead: null });
    else if (c.status === 'trial') add('trial-part', o);
  }
  return { findings: merge(findings), used, lib };

}

// every film file the acts load (their static imports), act files first: where a finding's line is looked up
function filmImports(files, root) {
  const out = new Set();
  const walk = rel => {
    if (out.has(rel) || !fs.existsSync(path.join(root, rel))) return;
    out.add(rel);
    for (const [, s] of fs.readFileSync(path.join(root, rel), 'utf8').matchAll(/(?:from|import)\s*'((?:\/films\/|\.\.?\/)[^']+)'/g))
      walk(s.startsWith('/films/') ? s.slice(7) : path.posix.normalize(path.posix.join(path.posix.dirname(rel), s)));
  };
  files.forEach(walk);
  return [...out];
}

// the catalog sets a film's set module builds on, through its film-local imports
function setsInside(spec, places, root, seen = new Set()) {
  if (seen.has(spec) || !spec.startsWith('/films/')) return [];
  seen.add(spec);
  const f = path.join(root, spec.slice(7));
  if (!fs.existsSync(f)) return [];
  const out = [];
  for (const [, s] of fs.readFileSync(f, 'utf8').matchAll(/from\s+'(\/(?:films|styles)\/[^']+)'/g)) out.push(...(places.has(s) ? [places.get(s)] : setsInside(s, places, root, seen)));
  return [...new Set(out)];
}

function merge(list) {
  const m = new Map();
  for (const f of list) {
    const k = `${f.rule}|${f.key}`, e = m.get(k);
    if (!e) { m.set(k, { ...f, count: f.count ?? 1 }); continue; }
    e.f0 = Math.min(e.f0, f.f0); e.f1 = Math.max(e.f1, f.f1); e.count += f.count ?? 1;
  }
  return [...m.values()].sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity) || b.count - a.count || a.f0 - b.f0);
}

// ---------------------------------------------------------------- the report
export async function check({ target, parts, filmsRoot, bible: bibleDir }) {
  const film = locateFilm(target, filmsRoot);
  const dir = film.slug && bibleFor(film.slug, bibleDir);
  if (!dir) return { film: film.rel, governed: false, pass: true, findings: [], excepted: [] };
  const { catalog } = loadBible(dir);
  const bible = indexBible(catalog);
  const exceptions = readExceptions(path.join(film.root, film.slug, 'bible-exceptions.json'));
  const P = parts ? parts.split(',').map(s => s.trim()).filter(Boolean) : [''];
  const loaded = await loadActs(film, P, bible.named);
  const { findings: all, lib } = judge(loaded, bible, film);
  for (const f of all) if (f.file && !f.file.startsWith('styles/')) f.file = `films/${f.file}`;
  const findings = [], excepted = [];
  for (const f of all) { const ex = exceptions.find(x => covers(x, f)); if (ex) { ex.used++; excepted.push({ ...f, reason: ex.reason }); } else findings.push(f); }
  const byRule = {}; for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  const count = s => findings.filter(f => f.severity === s).length;
  const actorFrames = lib.clipFrames + lib.handFrames;
  return {
    film: film.rel, parts: P.filter(Boolean), bible: path.relative(REPO, dir), governed: true,
    acts: loaded.acts.map(({ act, file }) => ({ name: act.name, frames: act.frames, file })),
    summary: { library: { ...lib, actionShare: +(lib.clipActions / Math.max(1, lib.clipActions + lib.handActions)).toFixed(3), frameShare: +(lib.clipFrames / Math.max(1, actorFrames)).toFixed(3) },
      byRule, blocking: count('block'), gaps: count('gap'), info: count('info'),
      exceptions: { used: excepted.length, unused: exceptions.filter(x => !x.used).map(({ rule, where }) => ({ rule, where })) } },
    pass: count('block') === 0, findings, excepted,
  };
}

const pct = x => `${Math.round(x * 100)}%`;
export function summaryLine(r) {
  if (!r.governed) return `bible check ${r.film}: no bible governs this film, nothing to check`;
  const s = r.summary, L = s.library;
  return `bible check ${r.film}${r.parts.length ? ` (${r.parts.join(',')})` : ''}: ${r.pass ? 'PASS' : 'BLOCK'} · ${s.blocking} blocking, ${s.gaps} gaps, ${s.info} info · ` +
    `library share ${L.clipActions} clip / ${L.handActions} hand-keyed actions (${pct(L.actionShare)}), ${pct(L.frameShare)} of actor-frames · ` +
    `${Object.entries(s.byRule).map(([k, v]) => `${k} ${v}`).join(', ') || 'no findings'} · exceptions ${s.exceptions.used}`;
}

export function toMarkdown(r) {
  if (!r.governed) return summaryLine(r) + '\n';
  const s = r.summary, cell = x => String(x ?? '').replace(/\|/g, '/');
  const acts = x => { const L = x.split(', '); return L.length > 3 ? `${L.length} act` : x; };
  const where = f => `${acts(f.act)}${f.subject !== '-' ? ' / ' + f.subject : ''}`, at = f => (f.file ? `\`${f.file}${f.line ? ':' + f.line : ''}\`` : '');
  const table = (L, extra) => ['| # | luật | ở đâu | frame | file:line | đã dùng | dùng thay | ghi chú |', '|---|---|---|---|---|---|---|---|',
    ...L.map((f, i) => `| ${i + 1} | \`${f.rule}\` | ${cell(where(f))} | ${f.f0}-${f.f1} | ${at(f)} | ${cell(f.what)}${f.count > 1 ? ` ×${f.count}` : ''} | ${f.instead ? `\`${cell(f.instead)}\`` : '—'} | ${cell(extra ? extra(f) : f.note)} |`)];
  const sec = (title, L, extra) => L.length ? [`## ${title} (${L.length})`, '', ...table(L, extra), ''] : [];
  const out = [`# Soát bible: ${r.film}${r.parts.length ? ` (${r.parts.join(', ')})` : ''}`, '', summaryLine(r), '',
    `**${r.pass ? 'ĐẠT' : 'CHẶN RENDER'}.** Bible \`${r.bible}\`, ${r.acts.length} act. Thư viện: ${s.library.clipActions} động tác bằng clip, ${s.library.handActions} bằng key tay ` +
    `(${pct(s.library.actionShare)} theo động tác, ${pct(s.library.frameShare)} theo frame nhân vật).`, '',
    '| luật | số | nghĩa |', '|---|---|---|', ...Object.entries(s.byRule).map(([k, v]) => `| \`${k}\` | ${v} | ${RULES[k].vi} |`), '',
    ...sec('Chặn', r.findings.filter(f => f.severity === 'block')),
    ...sec('Thiếu clip (không chặn)', r.findings.filter(f => f.severity === 'gap')),
    ...sec('Phần đang thử (thông tin)', r.findings.filter(f => f.severity === 'info')),
    ...sec('Ngoại lệ đã dùng (đếm, không chặn)', r.excepted, f => f.reason)];
  if (s.exceptions.unused.length) out.push(`Ngoại lệ không còn khớp gì: ${s.exceptions.unused.map(x => `\`${x.rule} ${x.where}\``).join(', ')}`, '');
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const o = parseArgs(process.argv.slice(2));
    const r = await check({ target: o.target, parts: o.parts, filmsRoot: o['films-root'], bible: o.bible });
    process.stdout.write(o.json ? JSON.stringify(r, null, 1) + '\n' : toMarkdown(r));
    process.exit(r.pass ? 0 : 1);
  } catch (e) {
    console.error(e instanceof UsageError ? e.message : `bible check failed to load the film: ${e.stack || e.message}`);
    process.exit(2);
  }
}
