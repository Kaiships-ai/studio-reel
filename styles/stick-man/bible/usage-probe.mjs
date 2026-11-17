#!/usr/bin/env node
// Feasibility probe for a bible checker (not the checker): loads a film's acts the way engine/play.js does (reel.js +
// reel2.js of each part), with the browser stubbed, and counts what they use per kind against catalog.json.
//   node styles/stick-man/bible/usage-probe.mjs --films <films root> [--film hm-ep01-r2] [--parts s4,s5,s6] [--json]
// Read-only: film modules run in this process but write nothing. The numbers feed bible/hot-money/USAGE-v7.md.
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO, loadBible } from './catalog.mjs';

const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const FILMS = path.resolve(arg('--films', path.join(REPO, 'films'))), FILM = arg('--film', 'hm-ep01-r2'), PARTS = arg('--parts', 's4,s5,s6').split(',');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = `/films/${FILM}/s4/lib.js`;

// '/films/' and '/styles/' are the dev server's roots; the film's s4/lib.js is wrapped so every buildTrack input (the
// hand keys and clip keys as the film wrote them) and every stepTurn call is seen
const hooks = `
import { pathToFileURL } from 'node:url';
const FILMS = ${JSON.stringify(FILMS)}, KIT = ${JSON.stringify(REPO)}, LIB = ${JSON.stringify(LIB)};
const real = pathToFileURL(FILMS + LIB.slice(6)).href + '?real';
const shim = 'data:text/javascript,' + encodeURIComponent(\`export * from '\${real}';
import { buildTrack as bt, stepTurn as st } from '\${real}';
export function stepTurn(o) { const k = st(o); (globalThis.__ST ||= []).push({ pose: o.pose, steps: o.steps ?? 3, travel: Math.hypot(...(o.pos1 || o.pos).map((x, i) => x - o.pos[i])), turn: Math.abs((o.yaw1 ?? 0) - (o.yaw0 ?? 0)) }); for (const x of k) x.__step = 1; return k; }
export function buildTrack(keys, o) { (globalThis.__BT ||= []).push(keys); return bt(keys, o); }\`);
export async function resolve(spec, ctx, next) {
  if (spec === LIB) return { url: shim, shortCircuit: true };
  if (spec.startsWith('/films/')) return next(pathToFileURL(FILMS + spec.slice(6)).href, ctx);
  if (spec.startsWith('/styles/')) return next(pathToFileURL(KIT + spec).href, ctx);
  if (spec === 'three' || spec.startsWith('three/')) return next(spec, { ...ctx, parentURL: pathToFileURL(KIT + '/package.json').href });
  return next(spec, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));
const local = u => (u.startsWith('/films/') ? FILMS + u.slice(6) : u.startsWith('/styles/') ? REPO + u : u);
globalThis.ProgressEvent = class { constructor(t, o) { Object.assign(this, o, { type: t }); } };
globalThis.Request = class { constructor(u) { this.url = String(u); } };
globalThis.fetch = async u => new Response(fs.readFileSync(local(typeof u === 'object' ? u.url : String(u))), { status: 200 });
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : typeof k === 'string' ? () => ctx2d : undefined), set: () => true });
globalThis.document = { createElement: () => ({ getContext: () => ctx2d, width: 0, height: 0, style: {} }) };

const { HAND_PROPS } = await import('/styles/stick-man/lib/cast/handprops.js');
await import('/styles/stick-man/motion-lib/props.js');
const { BUILD } = await import('/styles/stick-man/lib/cast/handprops.js');
const KIT_PROPS = new Set([...HAND_PROPS, ...Object.keys(BUILD)]);   // before any film registers its own
const acts = [];
for (const p of PARTS) for (const f of ['reel.js', 'reel2.js']) {
  if (!fs.existsSync(path.join(FILMS, FILM, p, f))) continue;
  const m = (await import(`/films/${FILM}/${p}/${f}`)).default; acts.push(...(m.acts || [m]));
}
const { catalog } = loadBible(path.join(HERE, 'hot-money'));
const C = catalog.components, byId = new Map(C.map(c => [c.id, c]));
const provided = kind => new Map(C.flatMap(c => (c.provides?.[kind] || []).map(n => [n, c.id])));
const FACES = provided('faces'), HPROPS = provided('handProps');

// a hand pose the film keyed for a body action the library has a clip for (inferred from the pose name and its comment)
const HAND2CLIP = [
  [/^(DASH|C_RUNGUN)$/, 'Move_Run_Fwd_Loop'], [/^SIT_(TALL|LOW|GUARD)$/, 'Idle_Sit_Loop'], [/^SIT_EAT$/, 'Act_Consume_Once'],
  [/^(PUT|LOWER)$/, 'Act_PutDown_Once'], [/^(REACH_LOW|HEAVE|HEAVE_UP|HEAVE_LO|HEAVE_SH)$/, 'Act_PickUp_Once'],
  [/^(C_AIM2|C_FIRE2)$/, 'Act_PistolShoot_Once'], [/^(T_PHONE|D_PHONE)$/, 'Act_Phone_Once'], [/^PUSH_OUT$/, 'Act_PushBagOutWindow_Once'],
  [/^(OFFER|PAY|PAY_OFF|T_TAKE|C_TAKE)$/, 'Act_HandOver_Once'], [/^C_LIGHT$/, 'Act_TorchReady_Loop'], [/^PEER$/, 'Idle_LookAround_Loop'],
];
const tally = () => ({ inside: {}, outside: {}, neutral: {} });
const U = { clip: tally(), hand: tally(), face: tally(), camera: tally(), prop: tally(), overlay: tally(), make: tally(), set: tally(), look: tally(), cast: {} };
const put = (t, inside, k, n = 1) => { const b = inside ? t.inside : t.outside; b[k] = (b[k] || 0) + n; };

for (const keys of globalThis.__BT || []) {
  let prev = null;
  for (const k of keys) {
    if (k.clip) { put(U.clip, byId.has(`clip.${k.clip}`), k.clip); prev = null; continue; }
    if (k.__step) continue;
    const name = typeof k.pose === 'string' ? k.pose : 'inline';
    const lib = HAND2CLIP.find(([re]) => re.test(name))?.[1];
    // hand keys that carry the body across the ground are a walk keyed by hand where Move_Walk_Fwd_Loop exists
    const travel = prev?.pos && k.pos && Math.hypot(k.pos[0] - prev.pos[0], k.pos[1] - prev.pos[1]) > 0.5;
    if (lib) put(U.hand, false, `${name} -> ${lib}`);
    else if (travel) put(U.hand, false, 'travel by hand keys -> Move_Walk_Fwd_Loop');
    else U.hand.neutral[name] = (U.hand.neutral[name] || 0) + 1;   // acting or a pose no clip covers: the kit allows it
    prev = k;
  }
}
const ST = globalThis.__ST || [];
// a stepTurn that covers more than a stride is a walk or run keyed by hand; one that turns 45 deg or more has the kit's
// (left, adult) turn clip; a shorter shuffle has no clip
for (const s of ST) {
  if (s.travel > 0.6) put(U.hand, false, `stepTurn ${s.travel.toFixed(1)} m (${s.pose}) -> Move_Walk/Run`);
  else if (s.turn >= 45) put(U.hand, false, `stepTurn ${s.turn} deg (${s.pose}) -> Move_TurnLeft_Once`);
  else U.hand.neutral[`stepTurn shuffle (${s.pose})`] = 1 + (U.hand.neutral[`stepTurn shuffle (${s.pose})`] || 0);
}
const setPaths = new Set(C.filter(c => c.kind === 'set' || c.kind === 'look-preset').flatMap(c => c.kit.map(r => '/' + r.path)));
// the grades the acts may hold: an act's look is matched by value to a catalog preset or to another part's export
const LOOKS = { 'look.finish-s4': (await import(`/films/${FILM}/s4/shared.js`)).LOOK, 's6/shared.js LOOK': (await import(`/films/${FILM}/s6/shared.js`)).LOOK };

for (const a of acts) {
  for (const c of Object.values(a.cast || {})) U.cast[c.spec] = (U.cast[c.spec] || 0) + 1;
  const exprs = [...Object.values(a.cast || {}).map(c => c.expr), ...Object.values(a.anim || {}).flatMap(ks => ks.map(k => k.expr))].filter(Boolean);
  for (const e of exprs) put(U.face, byId.has(`face.${e}`) || FACES.has(e), e);
  for (const d of a.direct || []) {
    const why = d.why || '', id = /bullet cam/.test(why) ? 'cam.move.bullet' : /one flight/.test(why) ? 'cam.move.flycam' : d.kind ? `cam.${d.kind}` : 'unnamed';
    put(U.camera, byId.has(id), id);
  }
  for (const ks of Object.values(a.anim || {})) for (const k of ks) for (const n of Object.keys(k)) {
    const m = /^x_hp[LRBH]_(\w+)$/.exec(n); if (!m) continue;
    put(U.prop, byId.has(`prop.hand.${m[1]}`) || HPROPS.has(m[1]), `${m[1]}${KIT_PROPS.has(m[1]) ? '' : ' (film-built)'}`);
  }
  put(U.set, setPaths.has(a.setModule), a.setModule);
  const lk = Object.entries(LOOKS).find(([, v]) => JSON.stringify(v) === JSON.stringify(a.look))?.[0];
  put(U.look, byId.has(lk), lk || `look of ${a.name}`);
  for (const o of a.overlays || []) put(U.overlay, byId.has(`card.overlay.${o.kind}`), o.kind);
  for (const v of Object.values(a.make || {})) { const k = v.kind || v.make || v.type || 'unnamed'; put(U.make, byId.has(`fx.${k}`), k); }
}
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const out = { film: FILM, parts: PARTS, acts: acts.map(a => `${a.name} ${a.frames.join('-')}`), frames: acts.reduce((n, a) => n + a.frames[1] - a.frames[0] + 1, 0), usage: U,
  totals: Object.fromEntries(Object.entries(U).filter(([k]) => k !== 'cast').map(([k, t]) => [k, { inside: sum(t.inside), outside: sum(t.outside), neutral: sum(t.neutral) }])) };
if (argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`${FILM} ${PARTS.join(',')}: ${acts.length} acts, ${out.frames} act frames`);
  for (const [k, t] of Object.entries(out.totals)) {
    console.log(`  ${k}: ${t.inside} inside, ${t.outside} outside${t.neutral ? `, ${t.neutral} not a catalog part` : ''}`);
    for (const [n, c] of Object.entries(U[k].outside).sort((a, b) => b[1] - a[1])) console.log(`      out ${c} x ${n}`);
  }
  console.log(`  cast specs: ${Object.entries(U.cast).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
