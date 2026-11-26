// Reel runtime: one reel DATA module (plain object) + words.json -> every frame, as a pure function of its number.
// Beats name a word (`on`, nth occurrence in `line`, `offset` frames, default -2); verbs, acting, camera and captions
// do the rest. Exposes window.__frame / __dbg / __cues / __T_END / __ready (see boot()).
// A reel is one or more ACTS (reel.js is the first; reel2.js, when present, adds more): each act builds its own set,
// cast, beats and camera; boot() shows the act whose window holds the frame and dissolves between them.
import * as THREE from 'three';
import { createStage, B as toThree, lin, PLACE } from './look.js';
import { makeStick, KAI, TELLER, GUARD, HEAD_C } from './cast.js';
import { VERBS, STAND, SIT, REST_ARM, W, DEG, lerp, lerp3, add3, angDiff, toLocal, smoother, hash, handEase } from './verbs.js';
import { blinkTrack, exprAt, idle, saccade, focusAt, gaze, springs, idleBeats, exprAccent, bodyFollow, LATE, EXPR_LEAD, exprKeyAt, markOwner, MARK_CLEAR, isBodyVerb, autoActing, faceStateAt, visemeTrack, faceChanges, BLINKS, BLINK_GAP, focusEase, blinkAt, isTense, CHEW } from './acting.js';
import { mixFace, faceParams, designKey, CLENCH, FACE_STYLE } from './faces.js';
import { useFaceStyle } from './facestyles/index.js';
import { useHeadMarks, checkMark } from './headmarks.js';
// face timing in the runtime (face-research.md rules 13-14): focus changes, free-blink shape
// TURN_BLINK: the gaze shift that blinks (the kit's own faces 0.6; under a face style 0.8, with NEAR and GAP, turnBlinkAt)
const FOCUS_N = 12, PUPIL_K = 1.6, TURN_BLINK = 0.6, STYLE_TURN_BLINK = 0.8, TURN_BLINK_NEAR = [20, 10], TURN_BLINK_GAP = 90;
// per-key face options (acting.js changeClass) carried from a beat or an anim key onto its expression key
const faceOpts = k => Object.fromEntries(['take', 'small', 'exprSpeed', 'cut'].filter(n => k[n] != null).map(n => [n, k[n]]));
import { createCamera } from './camera.js';
import { pointVis, foldVis, opaque } from './visible.js';
import { planShots } from './shotplan.js';
import { createCaptions } from './captions.js';
import { createOverlays } from './overlays.js';
import { ACT, PROPV, MAKE, keyTracks } from './verbs_fx.js';
import { POSE_VERBS, POSES } from './poses.js';
import { compileTrack, playActor, toPose, MOTION_POSES } from './motion.js';
import { propPlan } from './propobj.js';
import { gripGap } from './grip.js';
import { solidBoxes, restBoxes, inBoxes, drawnBox, boxPoints, armIn } from './solids.js';
import * as EXTRAS from '#kit/cast/extras.js';
import { PHYS } from '#kit/fx/physfx.js';
import { STORY } from '#kit/props/story.js';
import { ablate, listLights, frameLights } from '#kit/look/ablate.js';
import { exposureWarnings } from '#kit/look/exposure.js';
// default acting size: the reference's big beats travel ~2.3 head widths, ours ~0.5-0.7 (reference study), so every pose plays 1.2x unless an act or cast entry says otherwise
const ACT_AMP = 1.2;
Object.assign(MAKE, PHYS, STORY);                               // story props that animate (kit/props/story.js)                                       // physical FX kinds (SETS.md "Physical effects")

// every cast spec exported by kit/cast/extras.js (an object with a name and a shirt) registers itself by its export name
const dye = EXTRAS.dye;
export const SPECS = { KAI, TELLER, GUARD, ...Object.fromEntries(Object.entries(EXTRAS).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v) && v.name && v.shirt)) };
const KEYV = new Set(['set', 'pulse', 'shake', 'fire', 'flash', 'sound']);
const THICK = { b1: 0.045, b2: 0.045, stack: 0.07, note: 0.003 };
const toB = v => [v.x, -v.z, v.y];
const PROP_IN_MAX = 1.5, PROP_IN_GRACE = 0.02;   // m: a prop this long or longer is a set piece; this far in is touching
const normNoHyphen = w => w.toLowerCase().replace(/[^a-z0-9']/g, '');

async function getJSON(url) { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } }

export function resolveBeatFrame(b, words, fps) {
  if (typeof b.f === 'number') return b.f;
  const ws = words.filter(w => w.line === b.line && normNoHyphen(w.word) === normNoHyphen(b.on));
  const w = ws[(b.nth || 1) - 1];
  if (!w) throw new Error(`beat: no "${b.on}" #${b.nth || 1} in ${b.line}`);
  return Math.max(0, Math.round(w.t0 * fps) + (b.offset ?? -2));
}

// opt-in module hooks (kit/cast/costume.js sets HOOKS.costume)
export const HOOKS = {};
// where a Blender point lands on screen (0..1, y down) for a { pos, aim, lens } camera; null behind it
function projUV(c, p, aspect) {
  const f = c.aim.map((x, i) => x - c.pos[i]), fl = Math.hypot(...f); if (!fl) return null; const F = f.map(x => x / fl);
  let R = [F[1], -F[0], 0]; const rl = Math.hypot(...R) || 1; R = R.map(x => x / rl); const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const v = p.map((x, i) => x - c.pos[i]), z = v[0] * F[0] + v[1] * F[1] + v[2] * F[2]; if (z <= 0.01) return null;
  const tv = 18 / c.lens, th = tv * aspect;
  return [0.5 + 0.5 * (v[0] * R[0] + v[1] * R[1] + v[2] * R[2]) / z / th, 0.5 - 0.5 * (v[0] * U[0] + v[1] * U[1] + v[2] * U[2]) / z / tv];
}

const ZERO_KEY = /^(head_|shrug|x_|f[LR][xyz]$)/;
function mixObj(a, b, w) {
  if (w >= 1 || a == null) return b; if (w <= 0 || b == null) return a;
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if ((x == null) !== (y == null) && ZERO_KEY.test(k) && typeof (x ?? y) === 'number') o[k] = lerp(x ?? 0, y ?? 0, w);
    else if (x == null || y == null) o[k] = w < 0.5 ? (x ?? y) : (y ?? x);
    else if (k === 'yaw') o[k] = x + angDiff(x, y) * w;
    else if (typeof x === 'number' && typeof y === 'number') o[k] = lerp(x, y, w);
    else if (Array.isArray(x) && Array.isArray(y)) o[k] = lerp3(x, y, w);
    else if (typeof x === 'object' && typeof y === 'object') o[k] = mixObj(x, y, w);
    else o[k] = w < 0.5 ? x : y;
  }
  return o;
}
// hand hand-over: wind-up, an arc that bows up and out (never a straight line), ease out, small settle
function mixHand(a, b, x) {
  const w = handEase(x), o = mixObj(a, b, Math.min(1, Math.max(0, w)));
  const d = b.l.map((q, i) => q - a.l[i]), len = Math.hypot(...d);
  o.l = lerp3(a.l, b.l, w);
  if (len > 1e-4) {
    const up = [0.25 * Math.sign(a.l[0] + b.l[0] || 1), 1, 0.35], k = up.reduce((s, q, i) => s + q * d[i], 0) / (len * len);
    const n = up.map((q, i) => q - k * d[i]), nl = Math.hypot(...n) || 1, bow = 0.16 * len * Math.sin(Math.PI * Math.min(1, Math.max(0, x)));
    o.l = o.l.map((q, i) => q + n[i] / nl * bow);
  }
  return o;
}
// owners sorted by start; the newest started owner wins, cross-faded from the one before it over its fade
// (hands: over the fade plus a 35 % settle tail, see mixHand)
const HAND_FADE = 9, HAND_FIR = [0.28, 0.24, 0.20, 0.16, 0.12];
// body-acting poses move a hand far and fast (ear, hip, over the head): their hand owners (and the release after them)
// take a longer filter, so the forearm never swings more than the joint gate allows (poses.js `smooth`)
const HAND_FIR_POSE = [0.15, 0.15, 0.14, 0.13, 0.12, 0.10, 0.09, 0.07, 0.05];
function chain(list, f, val, env, hand = false) {
  let i = list.length - 1; while (i > 0 && list[i].start > f) i--;
  // a hand never changes owner in under HAND_FADE frames (a fade of 0 is a cut-in and stays one)
  const go = j => { const v = val(list[j].fn(f, env), j); const o = list[j]; const fd = hand && o.fade && !o.fast ? Math.max(HAND_FADE, o.fade) : o.fade || 0;
    if (j > 0 && fd > 0 && hand && !o.fast && f - o.start < fd * 1.35 + 1) return mixHand(go(j - 1), v, (f - o.start + 1) / (fd + 1));
    if (j > 0 && fd > 0 && f - o.start < fd) return mixObj(go(j - 1), v, smoother((f - o.start + 1) / (fd + 1))); return v; };
  return go(i);
}

async function buildAct(R, X) {
  const { stage, words, fps, F0, F1, width, height } = X;
  // act.setModule: the set module by URL (styles/stick-man/kit/sets/<name>.js)
  if (!R.setModule) throw new Error(`act ${R.set || ''} has no setModule (SETS.md)`);
  const SET = await import(R.setModule);
  // the set's meshes and lights go into this act's group (shown only while the act is on screen)
  const group = new THREE.Group(), before = new Set(stage.scene.children), bg0 = stage.scene.background;
  const built = await SET.build(stage, { use: R.use || [], ...(R.setOpts || {}) });   // act.use: opt-in set props (street: police, bag)
  // act.backdrop { rows: [{ piece, at, rot, tint }], tint }: far town rows past the set's walls (kit/sets/backdrop.js),
  // loaded here so they are in place before the first frame and belong to this act's group like the set itself
  if (R.backdrop) await (await import('#kit/sets/backdrop.js')).backdrop(stage, R.backdrop.rows, { tint: R.backdrop.tint });
  for (const c of [...stage.scene.children]) if (!before.has(c)) group.add(c);
  let background = stage.scene.background; stage.scene.background = bg0; stage.scene.add(group); group.visible = false;
  // act haze: { color (sRGB), near, far } m: distance fog toward the sky colour (aerial perspective), shown with the act
  const fog = R.haze ? new THREE.Fog(lin(...R.haze.color), R.haze.near ?? 12, R.haze.far ?? 160) : null;
  const props = built.props;
  // the set's solids as built (engine/solids.js): every box mesh but the set props, plus COLLIDE. A prop lets go and lands
  // on them (propobj.js S.rest); the dbg reports a prop inside one (out.propIn)
  const solids = solidBoxes(group, new Set(Object.values(props || {}).map(o => (o?.isObject3D ? o : o?.mesh)).filter(Boolean))), restOn = restBoxes(solids, SET.COLLIDE || []);
  // per-place light (reference study: every reference place has its own light, per-shot YAVG std 23-25 vs ours 6-9):
  // act `light: { lit, shade (tints of the toon ramp's two ends), lamp (gain of the practical lights), sun, power, sky,
  // ground, hemi, fill, fillPower, background, bounce, lamps: [{at, rgb, power, dist}] }`
  // recolours the shared sun / sky / fill while this act is on screen, scales the set's own bounce lights, and hangs
  // practical lamps (point lights in this act's group, so they only light this act)
  for (const w of exposureWarnings(R)) console.warn(w);   // grade.exp over 1.5 flattens the highlights: light the place instead
  const LT = R.light || null;
  stage.light0 ||= { sun: stage.sun.color.clone(), si: stage.sun.intensity, sky: stage.hemi.color.clone(), gr: stage.hemi.groundColor.clone(),
    hi: stage.hemi.intensity, fill: stage.fill.color.clone(), fi: stage.fill.intensity };
  if (LT) {
    group.traverse(o => { if (o.isPointLight) o.intensity *= LT.bounce ?? 1; });
    for (const l of LT.lamps || []) { const pl = new THREE.PointLight(lin(...l.rgb), l.power ?? 2, l.dist ?? 5, 1.6); pl.position.copy(toThree(...l.at)); group.add(pl); }
    if (LT.background) background = lin(...LT.background);
  }
  const L0 = stage.light0;
  const sun = () => {
    stage.setSun(LT?.sunDir || SET.SUN_DIR, R.sun?.center || SET.SUN_CENTER, R.sun?.half || SET.SUN_HALF);   // light.sunDir: a lower, warmer key per act
    stage.sun.color.copy(LT?.sun ? lin(...LT.sun) : L0.sun); stage.sun.intensity = LT?.power ?? L0.si;
    stage.hemi.color.copy(LT?.sky ? lin(...LT.sky) : L0.sky); stage.hemi.groundColor.copy(LT?.ground ? lin(...LT.ground) : L0.gr); stage.hemi.intensity = LT?.hemi ?? L0.hi;
    stage.fill.color.copy(LT?.fill ? lin(...LT.fill) : L0.fill); stage.fill.intensity = LT?.fillPower ?? L0.fi;
    PLACE.lit.value.set(...(LT?.lit || [1, 1, 1])); PLACE.shade.value.set(...(LT?.shade || [1, 1, 1])); PLACE.lamp.value = LT?.lamp ?? 0;
    const lum = LT?.lit ? 0.2126 * LT.lit[0] + 0.7152 * LT.lit[1] + 0.0722 * LT.lit[2] : 1;
    PLACE.rim.value = LT?.rim ?? (lum < 0.7 || (R.grade?.exp ?? 1) < 0.85 ? 1 : 0.35);   // dark place: full cool rim on dark figures
  };

  // ---------------------------------------------------------------- compile
  const point = s => Array.isArray(s) ? s : SET.PLACES[s] || SET.MARKS[s] || (props[s] && props[s].userData.rest.pos) ||
    (() => { throw new Error(`unknown place ${s}`); })();
  const KT = keyTracks(fps), fxo = {};                              // keyed values and the act's effect objects
  // a flow / rays anchored on the body (head anchor 0.3 m or more below the head) with no `fwd` gets fwd 0.2: at fwd 0 it
  // sits inside the torso and the body hides it (stick03 gap 6)
  const onBody = a => a && a.head && a.fwd == null && (a.up ?? 0) <= -0.3 ? { ...a, fwd: 0.2 } : a;
  for (const [name, o0] of Object.entries(R.make || {})) {
    const o = ['flow', 'rays'].includes(o0.kind) ? { ...o0, at: onBody(o0.at), hit: onBody(o0.hit) } : o0;
    fxo[name] = MAKE[o.kind](stage, { ...o, name }, { props, group, fps, point });
  }
  const rest = {}, offs = {}, impacts = {};
  for (const [n, o] of Object.entries(props)) if (o.userData?.rest) rest[n] = { ...o.userData.rest };
  const C = {
    words, fps,
    point,
    // where an actor stands: a set MARK wins over a PLACE of the same name (PLACES are prop tops: a counter, a bench)
    mark: s => typeof s === 'string' && SET.MARKS?.[s] ? SET.MARKS[s] : point(s),
    // a cast name = that actor's near shoulder (hand on shoulder, grab, shove, hand a prop over: reach / point_lean to: 'bram')
    target: (s, st) => s == null ? { rest: true } : typeof s === 'string' && props[s] ? { prop: s } : typeof s === 'string' && byName[s] && st
      ? { w: (() => { const o = byName[s].st0, dx = st.pos[0] - o[0], dy = st.pos[1] - o[1], d = Math.hypot(dx, dy) || 1; return [o[0] + 0.16 * dx / d, o[1] + 0.16 * dy / d, (o[2] || 0) + 1.28]; })() }   // on a raised stage too (was z 1.28 absolute: 0.5 m low)
      : typeof s === 'string' ? { w: point(s) }
      : Array.isArray(s) ? { w: s } : s,
    rest: n => { if (!rest[n]) throw new Error(`prop "${n}" has no rest pose (a child of another prop, e.g. cutaway pack inside stack): move its parent, or key its parts with a \`prop\` effect`); return rest[n].pos; },
    restRot: n => rest[n]?.rot ?? 0, setRest: (n, p, r) => { rest[n] = { pos: p, rot: r }; },
    thick: n => THICK[n] ?? 0.04,
    lastOff: n => offs[n], setOff: (n, o) => { offs[n] = o; },
    impact: (bag, f, s) => (impacts[bag] ||= []).push({ f, amp: s }),
    bagDip: n => (impacts[n] !== undefined || n === 'bag') ? f => springs(impacts[n] || [], f) : null,
    yawTo: (from, to) => Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180 / Math.PI,
  };
  const frameOf = b => resolveBeatFrame(b, words, fps);
  const actors = [], byName = {};
  for (const [name, c] of Object.entries(R.cast)) {
    if (!SPECS[c.spec]) throw new Error(`unknown cast spec ${c.spec} (SETS.md, Cast)`);
    // glasses: per cast entry, else per reel (R1.glasses), else the spec's own (Q2: rims make every face read as round eyes)
    const gl = c.glasses ?? X.glasses, S = makeStick(gl == null ? SPECS[c.spec] : { ...SPECS[c.spec], glasses: gl }); group.add(S.root);
    S.obstacles = SET.COLLIDE || [];   // the set's solid pieces: hands and held props stop on them (cast.js worldBox)
    S.rest = restOn;                   // what a prop out of the hand lands on: every solid the set built (propobj.js)
    const costume = c.costume ?? SPECS[c.spec].costume;   // a spec may wear a costume by default (a character's own clothes, e.g. 'hoodie:grey')
    if (costume) { if (!HOOKS.costume) throw new Error(`cast ${name}: costume needs import '/styles/stick-man/kit/cast/costume.js'`); HOOKS.costume(S, costume, { group, name }); }   // role layers (belt, holster, hat, hoodie)
    const posture = c.posture || 'stand', base = posture === 'sit' ? SIT : STAND;
    const pos = point(c.at).slice(); pos[2] = pos[2] || 0;
    const st = { name, pos, yaw: c.yaw ?? 0, posture, hold: { L: null, R: null }, handW: {}, sling: null, ampScale: c.amp ?? R.actingAmp ?? ACT_AMP };
    const a = { name, S, c, st, posture, seed: Math.round(hash(name.length, name.charCodeAt(0), name.charCodeAt(1)) * 1e6),
      focus: c.focus, watch: c.watch, owners: { body: [], handL: [], handR: [], add: [] }, verbs: [], exprs: [{ f: -1e9, expr: c.expr || 'neutral' }],
      focusSegs: [], mouth: [], holdLog: [], st0: pos.slice() };
    const p0 = pos.slice(), y0 = st.yaw;
    a.owners.body.push({ start: -1e9, fade: 0, verb: 'stand', fn: () => ({ pos: p0, yaw: y0, bob: base.bob || 0, lean: 0, pitch: base.pitch || 0, footL: base.footL, footR: base.footR }) });
    for (const s of ['L', 'R']) a.owners['hand' + s].push({ start: -1e9, fade: 0, verb: 'rest', fn: () => ({ rest: true }) });
    actors.push(a); byName[name] = a;
  }
  // motion v2: an actor with keys (act `anim`) is animated pose to pose by engine/motion.js, never by verbs or auto-acting
  for (const [name, keys] of Object.entries(R.anim || {})) {
    const a = byName[name]; if (!a) throw new Error(`anim: no cast entry ${name}`);
    const ks = keys.map(k => ({ ...k, f: frameOf(k.at || k) })).sort((x, y) => x.f - y.f);
    a.anim = { track: compileTrack(ks, { ...MOTION_POSES, ...(R.poses || {}) }, { pos: a.st0.slice(), yaw: a.c.yaw ?? 0 }, R.style), keys: ks, frames: null };
    for (const k of ks) { if (k.expr) a.exprs.push({ f: k.f, expr: k.expr, word: null, cut: k.ease === 'snap', ...faceOpts(k) }); if (k.look) a.focusSegs.push({ from: k.f, target: k.look, cut: k.ease === 'snap' }); }
  }
  const animFrame = (a, f) => {
    const A = a.anim, f0 = F0 - 30; A.frames ||= playActor(A.track, f0, F1 + 1);
    const Q = toPose(A.frames[Math.max(0, Math.min(A.frames.length - 1, Math.round(f) - f0))], a.S.root.scale.x);
    let pk = null; for (const k of A.keys) if (k.f <= f && k.props !== undefined) pk = k.props;
    for (const [side, kind] of Object.entries(pk || {})) if (kind) Q[`x_hp${side}_${kind}`] = 1;
    return Q;
  };
  const beats = R.beats.map((b, i) => ({ ...b, at: frameOf(b), i })).sort((x, y) => x.at - y.at || x.i - y.i);
  const segs = {}, active = [], cues = [], fx = [];
  const compile = b => {
    const a = byName[b.who];
    if (KEYV.has(b.do)) for (const q of KT.add(b)) cues.push({ fr: q.f, name: q.name, strength: q.strength });
    if (!a && PROPV[b.do]) { const out = PROPV[b.do](b, C); for (const s of out.segs) (segs[s.prop] ||= []).push(s); for (const q of out.cues || []) cues.push({ fr: q.f, name: q.name, strength: q.strength }); return; }
    if (!a) { if (!KEYV.has(b.do)) fx.push(b); if (b.do === 'blink') cues.push({ fr: b.at, name: 'sensor_beep', strength: 0.4 }); if (b.do === 'glint') cues.push({ fr: b.at, name: 'glint', strength: 0.4 }); return; }
    // the face leads its word by EXPR_LEAD frames (acting.js); `word` is kept for the expression-lead gate
    if (b.expr) { const word = typeof b.f === 'number' ? null : frameOf({ ...b, offset: 0 }); a.exprs.push({ f: word == null ? b.at : Math.min(b.at, word - EXPR_LEAD), expr: b.expr, word, ...faceOpts(b) }); }
    if (b.look) a.focusSegs.push({ from: b.at, target: b.look });
    // face channels from beats (a face layer that leaves the body keys alone): chew / breath (0..1, eased over t frames
    // from the value before) and a forced blink ('regular' | 'fast' | 'long')
    for (const n of ['chew', 'breath']) if (b[n] != null) (a.faceKeys ||= []).push({ f: b.at, n, v: b[n], t: b.t ?? 6 });
    if (b.blink) (a.blinkBeats ||= []).push({ f: b.at, shape: b.blink === true ? 'regular' : b.blink });
    if (b.mark) { checkMark(b.mark); a.owners.add.push(markOwner(b, b.markFace != null ? () => Math.min(...a.exprs.filter(e => e.f > b.at - b.markFace).map(e => e.f)) - MARK_CLEAR : null)); }
    if (!b.do || KEYV.has(b.do)) return;
    const V = VERBS[b.do] || ACT[b.do]; if (!V) throw new Error(`unknown verb ${b.do}`);
    // any other body verb releases the pose being held (poses.js): the new action takes over from it
    if (a.st.pose && !POSE_VERBS[b.do] && a.st.pose.t0 < b.at && a.st.pose.rel > b.at && isBodyVerb({ name: b.do, kind: b.kind })) a.st.pose.release(b.at);
    const out = V(b, a.st, C);
    a.verbs.push({ name: b.do, kind: b.kind, start: b.at, end: out.end, auto: !!b.auto, pose: out.pose });
    a.holdLog.push({ f: b.at, L: a.st.hold.L, R: a.st.hold.R });
    for (const o of out.owners || []) {
      o.verb = b.do;
      a.owners[o.chan].push(o);
    }
    for (const s of out.segs || []) (segs[s.prop] ||= []).push(s);
    for (const q of out.cues || []) cues.push({ fr: q.f, name: q.name, strength: q.strength, who: a.name });
    for (const q of out.active || []) active.push(q);
    if (out.focus) a.focusSegs.push(out.focus);
    if (out.mouth) a.mouth.push(...out.mouth);
    if (out.say) (a.says ||= []).push(out.say);
  };
  for (const b of beats) compile(b);
  // a pose's end moves when a later pose (or stand_up) releases it
  const poseEnds = () => { for (const a of actors) for (const v of a.verbs) if (v.pose) v.end = Math.min(v.end, v.pose.rel + v.pose.R + 4); };
  poseEnds();
  // auto-acting: key poses for every lead's frames no body verb covers (acting.js), picked from the words said there
  for (const b of autoActing({ R, actors, words, fps, win: R.win || [[F0, F1 + 1]] })) if (!byName[b.who]?.anim) compile({ ...b, at: b.f });
  poseEnds();
  for (const a of actors) {
    for (const k of Object.keys(a.owners)) a.owners[k].sort((x, y) => x.start - y.start);
    a.exprs.sort((x, y) => x.f - y.f);
    // blinks (acting.js blinkTrack): the change blinks belong to the face (faceStateAt); free blinks keep their distance
    // from them, never land in a take's anticipation, accent or hold (frightened eyes stay open), come faster on an
    // anxious face and less often on a listener
    const ch = faceChanges(a.exprs);
    a.quiet = ch.filter(c => c.quiet).map(c => c.quiet);
    // no free blink runs over the act's first frames: a cut never opens on lids half way through a blink
    // a look somewhere new may blink (turnBlinkAt), so a free blink keeps its distance from every look change too (Hot
    // Money r5 diner: a turn blink, a free blink 13 f later and its double, three blinks in 48 frames)
    // (both under a face style only: the kit's own faces blink as before)
    a.focusSegs.sort((x, y) => x.from - y.from);
    const looks = !FACE_STYLE.name ? [] : a.focusSegs.filter((s, i) => !s.cut && s.from > F0 + 3 && (i === 0 || String(s.target) !== String(a.focusSegs[i - 1].target))).map(s => ({ f: s.from }));
    a.blinks = blinkTrack(a.seed, F0 - 60, F1 + 60, { forced: [...ch.filter(c => c.blink).map(c => c.blink), ...(a.blinkBeats || []), ...looks], quiet: FACE_STYLE.name ? [...a.quiet, [F0 - 12, F0 + 3]] : a.quiet,
      gap: a.says?.length ? BLINK_GAP.talk : BLINK_GAP.listen, shapeAt: f => (isTense(exprAt(a.exprs, f)) ? 'fast' : 'regular') });
    if (a.faceKeys) a.faceKeys.sort((x, y) => x.f - y.f);
    a.blinkStarts = [...a.blinks.starts, ...ch.filter(c => c.blink).map(c => c.blink.f), ...(a.blinkBeats || []).map(b => b.f)];
    a.vis = a.says?.length ? visemeTrack(words, fps, a.says) : null;     // the mouth follows the letters of its lines
    a.focusSegs.sort((x, y) => x.from - y.from);
  }
  for (const n of Object.keys(props)) if (rest[n] || segs[n]) {
    const first = props[n].userData.rest;
    (segs[n] ||= []).unshift({ prop: n, start: -1e9, mode: 'rest', pos: first.pos, rot: first.rot });
    segs[n].sort((x, y) => x.start - y.start);
  }
  cues.sort((x, y) => x.fr - y.fr);

  // ---------------------------------------------------------------- per-frame evaluation
  const bodyAt = (a, f) => { if (!a.anim) return chain(a.owners.body, f, v => v, null); const Q = animFrame(a, f); return { pos: Q.pos, yaw: Q.yaw }; };
  const headZ = a => (a.posture === 'sit' ? HEAD_C[1] + SIT.bob : HEAD_C[1]) * W;
  // camera anchors: from the body channel only (no idle bob), so the framing never chases a head wobble
  const anchor = (n, f, live) => {
    const a = byName[n];
    if (a) {
      const b = bodyAt(a, f), h = [b.pos[0], b.pos[1], b.pos[2] + headZ(a)];
      // live = where the posed head really is this frame (lean, tilts, idle): a shot with opt.live keys on it
      const live = F.f === f && F.posed.has(n) ? toB(a.S.parts.head.getWorldPosition(new THREE.Vector3())) : null;
      return { head: h, top: [h[0], h[1], h[2] + 0.36], sole: b.pos, yaw: b.yaw, center: h, live };
    }
    const p = live ? live(n) : (rest[n]?.pos || point(n));
    return { center: p, head: p };
  };

  let F = { f: -1, posed: new Set(), cache: new Map(), handWorld: {}, bodies: {} };
  const hv = new THREE.Vector3();
  const handWorld = (n, side) => { const k = n + side; if (!F.handWorld[k]) F.handWorld[k] = toB(byName[n].S.parts.hands[side].getWorldPosition(hv)); return F.handWorld[k]; };
  function propWorld(n) {
    if (F.cache.has(n)) return F.cache.get(n);
    const o = props[n], L = segs[n]; let i = L.length - 1; while (i > 0 && L[i].start > F.f) i--;
    const s = L[i], f = F.f; let pos, rot = s.rot ?? rest[n]?.rot ?? 0, vis = true, tilt = [0, 0], scale = 1;
    if (n === 'bag' || impacts[n]) {                                // swells a little with every bundle, pops on impact
      const imp = impacts[n] || [], k = imp.filter(e => e.f <= f).length;
      scale = 1 + 0.035 * k + 0.035 * springs(imp, f);
    }
    if (KT.has(n, 'swell')) scale *= 1 + KT.at(n, 'swell', f, 0);      // keyed swell (a bag about to burst)
    if (s.mode === 'rest') pos = s.pos;
    else if (s.mode === 'fn') { const r = s.fn(f, env); pos = r.pos; if (r.rot != null) rot = r.rot; if (r.spin) tilt = [r.spin, r.spin * 0.6]; rot = r.rot ?? (L[i - 1]?.rot ?? rot); }
    else if (s.mode === 'bag') { pos = propWorld(s.bag); vis = false; }
    else if (s.mode === 'hand') {
      if (!F.posed.has(s.actor)) throw new Error(`prop ${n} needs ${s.actor} posed first (cast order)`);
      const hw = handWorld(s.actor, s.side), body = F.bodies[s.actor];
      const u = s.blend ? smoother((f - s.start) / s.blend) : 1, off = s.offFrom ? lerp3(s.offFrom, s.off, u) : s.off;
      const Rv = [Math.cos(body.yaw * DEG), Math.sin(body.yaw * DEG)], Fv = [Rv[1], -Rv[0]];
      const ow = s.offW || [Rv[0] * off[0] + Fv[0] * off[2], Rv[1] * off[0] + Fv[1] * off[2], off[1]];
      if (!s.keepRot) rot = (body.yaw + (s.yaw || 0)) * DEG;
      tilt = s.tilt || [0, 0];
      // a carried prop swings a little with the steps, about the hand (the grip stays in the hand)
      if ((s.swing || o.userData.grip) && body.walking != null) {
        const ph = 2 * Math.PI * (body.walking - 1 / (body.walkT || 10));
        tilt = [tilt[0] + 0.10 * Math.sin(ph), tilt[1] + 0.06 * Math.cos(ph)];
      }
      // the engine rule for held props: a prop with a grip socket (userData.grip, prop-local, per hand or one for both)
      // is parented to the hand: its grip point sits on the hand dot's centre whatever the offset asked for
      const g = o.userData.grip, gl = g && (Array.isArray(g) ? g : g[s.side]);
      if (gl && !s.free) {
        o.rotation.set(tilt[0], rot, tilt[1], 'YXZ');
        const gv = new THREE.Vector3(...gl).multiplyScalar(scale).applyEuler(o.rotation);
        pos = [hw[0] - gv.x, hw[1] + gv.z, hw[2] - gv.y];
      } else pos = add3(hw, ow);
    }
    o.position.set(pos[0], pos[2], -pos[1]); o.rotation.set(tilt[0], rot, tilt[1], 'YXZ'); o.scale.setScalar(scale); o.visible = vis;
    o.updateMatrixWorld(true);
    F.cache.set(n, pos); return pos;
  }
  const env = {
    prop: propWorld, mouth: n => propWorld(n),
    resolve: t => t.at ? { w: fenv.at(t.at), bend: t.bend, elbow: t.elbow } : t.prop ? { w: add3(propWorld(t.prop), [0, 0, t.up ?? (C.thick(t.prop) + 0.035)]), bend: t.bend } : t.mouth ? { w: add3(propWorld(t.mouth), [0, 0, t.up ?? 0.12]) } : t,
  };

  function poseActor(a, f) {
    // (the props its clips hold are scene objects: where they rest out of the hand, engine/propobj.js, once per track)
    if (a.anim) { const Q = animFrame(a, f), A = a.anim; A.plan ||= propPlan(A.track, g => animFrame(a, g), a.S); const pr = A.plan.at(Math.round(f)); if (pr) Q.propRest = pr;
      F.bodies[a.name] = { pos: Q.pos, yaw: Q.yaw }; a.S.pose2(Q); F.posed.add(a.name); a.P = Q; return; }
    const body = bodyAt(a, f), root = { pos: body.pos, yaw: body.yaw };
    F.bodies[a.name] = body;
    const id = idle(a.seed, f, a.posture);
    const add = {};
    for (const o of a.owners.add) if (o.start <= f + 30) { const r = o.fn(f); for (const k in r) add[k] = (add[k] || 0) + r[k]; }
    const base = a.posture === 'sit' ? SIT : STAND, hands = {}, bends = {}, elbows = {}, fks = {}, off = {}, late = {};
    // the body acting layer: idle beats between actions, accents on expression changes, the body following the hands
    const stand = a.posture !== 'sit', walking = body.walking != null;
    // the idle channels overlap: the head leads, the body follows 2 frames later, the arms 4 (follow-through)
    const ib = stand ? idleBeats(a.seed, f - 2) : null, ibA = stand ? idleBeats(a.seed, f - 4) : null, ibH = stand ? idleBeats(a.seed, f) : null, acc = stand ? exprAccent(a.exprs, f, a.seed) : {};
    const handAt = (side, g) => chain(a.owners['hand' + side], g, spec => {
      const sg = side === 'L' ? -1 : 1, s = spec.w || spec.prop || spec.mouth || spec.at ? env.resolve(spec, g) : spec;
      let l;
      if (s.rest) l = base['hand' + side].slice();
      else if (s.w) l = toLocal(s.w, root); else l = s.l.slice();
      if (s.dv) l[1] += s.dv;
      // a standing figure's resting arm hangs from the shoulder (FK, swung by the body verbs); fk blends it in
      return { l, bend: spec.bend ?? s.bend ?? 0.10 * sg, elbow: spec.elbow ?? s.elbow ?? [sg * 0.6, -0.2, -0.75], fk: s.rest && stand ? 1 : 0 };
    }, env, true);
    const busy = (side, v) => { const r = base['hand' + side]; return stand && !walking ? v.l.map((x, i) => (x - r[i]) * (1 - v.fk)) : [0, 0, 0]; };
    // hand targets pass a short pure FIR over the last frames: a fast hand move keeps its shape but loses its spike, so a
    // joint never snaps (one frame of an arm is the weighted mean of where the verbs put the hand over 5 frames)
    const fir = (side, g) => {
      const L = a.owners['hand' + side], smoothAt = h => { let q = L.length - 1; while (q > 0 && L[q].start > h) q--; return L[q].smooth ? 1 : 0; };
      const ownerAt = h => { let q = L.length - 1; while (q > 0 && L[q].start > h) q--; return L[q]; };
      // strikes (owners marked fast) and the 3 frames after one skip the filter: a 9-frame mean takes the contact frame
      // out of a punch, and the glove never arrives (Kai, kai-boxing v1: "the punches go nowhere")
      if ([0, 1, 2, 3].some(j => ownerAt(g - j)?.fast)) return handAt(side, g);
      let k = 0; for (let j = 0; j < 10; j++) k += smoothAt(g - j) / 10;            // share of pose hands over the last 10 frames
      const xs = HAND_FIR_POSE.map((_, j) => handAt(side, Math.max(X.F0, g - j)));
      const avg = taps => { let o = null, ws = 0; taps.forEach((w, j) => { ws += w; o = o ? mixObj(o, xs[j], w / ws) : xs[j]; }); return o; };
      const o = avg(HAND_FIR);
      return k > 0 ? mixObj(o, avg(HAND_FIR_POSE), k) : o;
    };
    const vs = {};
    for (const side of ['L', 'R']) { vs[side] = fir(side, f); off[side] = busy(side, vs[side]); late[side] = busy(side, handAt(side, f - LATE)); }
    // a pose that owns the whole body (spec.noFollow: a boxing guard and its punches) turns the body-follows-the-hands layer
    // off: that layer twists the torso toward busy hands, and in a guard both hands are always busy, so it swung the
    // shoulders 40 deg in 3 frames under every punch and whipped the other elbow round
    let owning = null; for (const o of a.owners.add) if (o.pose && o.pose.t0 <= f && f <= o.pose.rel + o.pose.R && (!owning || o.pose.t0 > owning.t0)) owning = o.pose;
    const bf = stand && !walking && !(owning && POSES[owning.name]?.noFollow) ? bodyFollow(off, late) : { arm: {} }, iw = walking ? 0.2 : 1;
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? -1 : 1, v = vs[side];
      const im = ibA ? ibA[side] : [0, 0, 0];
      // a busy hand keeps a third of the idle move (a prop in it drifts a little, never slides)
      hands[side] = add3(v.l, add3(id.hand.map(x => x * sg), [sg * 0.003 * im[1], 0.002 * im[0], 0.002 * im[2]].map(x => x * (1 - v.fk))));
      bends[side] = v.bend; elbows[side] = v.elbow;
      const fk = body.arm?.[side] || REST_ARM, ca = bf.arm[side] || { fwd: 0, out: 0, flex: 0 };
      fks[side] = { fwd: fk.fwd + 60 * id.hand[2] + iw * im[0] + ca.fwd, out: fk.out + 40 * id.hand[0] + iw * im[1] + ca.out,
        flex: fk.flex + 40 * id.hand[1] + iw * im[2] + ca.flex, w: v.fk };
    }
    const k = n => (ib ? iw * ((n.startsWith('head') ? ibH : ib)[n] || 0) : 0) + (acc[n] || 0) + (bf[n] || 0);
    const bob = (body.bob || 0) + id.bob + k('bob'), P = {
      pos: root.pos, yaw: root.yaw, bob, lean: (body.lean || 0) + (add.lean || 0) + k('lean'), pitch: (body.pitch || 0) + (add.pitch || 0) + k('pitch'),
      head_tilt: id.head_tilt + (add.head_tilt || 0) + (a.c.head_tilt || 0) + k('head_tilt'), head_dv: id.head_dv + (add.head_dv || 0) + k('head_dv'),
      head_dx: id.head_dx + (add.head_dx || 0) + k('head_dx'), head_pitch: (add.head_pitch || 0) + k('head_pitch'), shrug: k('shrug') + id.shrug,
      footL: body.footL, footR: body.footR, toeL: body.toeL, toeR: body.toeR, toeF: body.toeF,
      handL: hands.L, handR: hands.R, bendL: bends.L, bendR: bends.R, expr: a.lastExpr || a.c.expr,
      elbowL: elbows.L, elbowR: elbows.R, armFKL: fks.L, armFKR: fks.R,
    };
    for (const n of ['dx', 'footPitchL', 'footPitchR', 'footYawL', 'footYawR', 'kneeDir', 'shTwist', 'hipTwist']) if (body[n] != null) P[n] = body[n];
    for (const n of ['dx', 'shTwist', 'hipTwist', 'footPitchL', 'footPitchR']) { const x = k(n) + (add[n] || 0); if (x) P[n] = (P[n] || 0) + x; }
    // body-acting poses (poses.js) add bob, shrug and feet moves; x_ keys (hand props, marks) go straight to the figure
    P.bob += add.bob || 0; P.shrug += add.shrug || 0;
    for (const s of ['L', 'R']) if (add['f' + s + 'x'] || add['f' + s + 'y'] || add['f' + s + 'z']) { const q = P['foot' + s] || base['foot' + s];
      P['foot' + s] = [q[0] + (add['f' + s + 'x'] || 0), q[1] + (add['f' + s + 'y'] || 0), (q[2] || 0) + (add['f' + s + 'z'] || 0)]; }
    for (const n in add) if (n.startsWith('x_') || n === 'head_yaw') P[n] = add[n];
    a.idleLook = ibH ? iw * ibH.look : 0;
    a.S.pose(P); F.posed.add(a.name); a.P = P;
  }

  // a face channel (beats' chew / breath) at f: each key eases from the value before it to its own over its t frames
  function faceChan(a, n, f) {
    let v = 0;
    for (const k of a.faceKeys || []) { if (k.n !== n) continue; if (k.f > f) break; v = v + (k.v - v) * smoother(Math.min(1, (f - k.f + 1) / Math.max(1, k.t))); }
    return v;
  }
  // turn blinks (ASK p. 87): a gaze shift over TURN_BLINK brings one long blink in the head move. Hot Money r5 A v6 had the
  // lids half shut on 17 % of the hero's frames (29-31 % in the close-ups, 51 blinks a minute, closures up to 15 f): every
  // look key also changed the face, so a change blink and a turn blink ran into one long closure, and the next glance
  // restarted a blink half way (the lids flickered open for a frame). Now a shift blinks only when no other blink starts
  // within TURN_BLINK_NEAR of it, and only the first big shift in TURN_BLINK_GAP frames does (a run of glances is one
  // blink); a later glance never restarts one under way. Stateless: every frame looks back over the focus changes.
  function turnBlinkAt(a, f, gz) {
    const L = BLINKS.long.length, key = x => focusAt(a, x, a.focusSegs, active).key, big = c => {
      const p = focusAt(a, c - 1, a.focusSegs, active), q = focusAt(a, c, a.focusSegs, active);
      if (p.key === q.key || q.cut) return false;
      const g0 = gz(p), g1 = gz(q); return Math.abs(g1[0] - g0[0]) + Math.abs(g1[1] - g0[1]) > STYLE_TURN_BLINK;
    };
    const near = b0 => (a.blinkStarts || []).some(s => s >= b0 - TURN_BLINK_NEAR[0] && s <= b0 + TURN_BLINK_NEAR[1]) || a.quiet.some(([x, y]) => b0 < y && b0 + L > x);
    const memo = (a.turnMemo ||= new Map()), isBig = c => { if (!memo.has(c)) memo.set(c, key(c) !== key(c - 1) && big(c)); return memo.get(c); };
    for (let c = f; c > f - L; c--) {
      if (!isBig(c)) continue;
      let first = true; for (let e = c - 1; e >= c - TURN_BLINK_GAP && first; e--) if (isBig(e)) first = false;
      if (!first || near(c + 1) || c <= F0 + 3) continue;   // the act's own first look is not a glance
      const k = f - (c + 1), S = isTense(exprAt(a.exprs, c + 1)) ? BLINKS.fast : BLINKS.long; return k >= 0 && k < S.length ? S[k] : 0;
    }
    return 0;
  }
  function faceActor(a, f, camPos) {
    const ek = exprKeyAt(a.exprs, f), e = ek.expr; a.exprKey = ek;
    const id = idle(a.seed, f, a.posture);
    // the micro-animation face (acting.js faceStateAt, faces.js mixFace): an expression change is in-betweened over 10
    // frames with a slow start and overshoot (a new drawing every frame, eyes squeeze and mouth gasps through the swap),
    // the mouth follows the visemes of the actor's lines, and a held face drifts a little (brows, lids, mouth width)
    const state = faceStateAt(a.exprs, f, a.seed, a.vis);
    if (!state.talk && e === 'sleep' && id.snore) state.talk = { open: 0.3, wide: 0, round: 1, teeth: 0 };
    // chewing (a clip's x_chew channel or a chew beat: how hard, 0..1, motion-lib Act_Consume_Once): one chew every CHEW.T
    // frames (the kit's faces 9 f; a face style sets its own, s2 19 f, ~1.6 a second, the human rate), wide, not round;
    // under a face style a shut mouth (no rest opening) chews shut: the jaw drops, the lips squash wide and slide side to side
    const xc = Math.max(a.P?.x_chew || 0, faceChan(a, 'chew', f)), ph = Math.sin(Math.PI * f / CHEW.T) ** 2, chew = xc * ph, shut = !!FACE_STYLE.name && !faceParams(e).rest;
    if (!state.talk && chew > 0.02 && !shut) state.talk = { open: chew, wide: 0.35, round: 0.1, teeth: 0 };
    // a shut mouth chews as a dark slit that parts and closes (never the open lens: an open chew read as a smile)
    const bite = xc > 0.06 ? Math.max(0, (ph - 0.4) / 0.6) * xc : 0;   // the open half of each chew
    // (0.06-0.21 open was a slit width change nobody saw at phone size: the jaw now drops to about a third open)
    if (!state.talk && bite > 0.02 && shut) state.talk = { open: 0.06 + CHEW.open * bite, wide: 0.25, round: 0.3, teeth: 0 };
    // breathing hard (x_breath 0..1): the mouth opens and closes about twice a second, its corners from the face
    const xb = Math.max(a.P?.x_breath || 0, faceChan(a, 'breath', f)), br = xb * (0.55 + 0.45 * Math.sin(2 * Math.PI * f / 14));
    // a clenched mouth pants through its teeth: it widens and drops on each breath, never opens (an open lens swapping
    // with the grimace's teeth flickered twice a second)
    const clench = CLENCH.has(faceParams(e).mouth) || (state.phase === 'change' && CLENCH.has(faceParams(state.change?.from).mouth));   // (and while a change leaves the teeth)
    if (!state.talk && xb > 0.02 && !clench) state.talk = { open: br, wide: 0.1, round: 0.25, teeth: 0 };
    a.talking = !!state.talk;
    const tgtPos = t => t === 'camera' ? camPos : byName[t] ? toB(byName[t].S.parts.head.getWorldPosition(hv)) : Array.isArray(t) ? t : t ? livePos(t) : camPos;
    const cur = focusAt(a, f, a.focusSegs, active), head = toB(a.S.parts.head.getWorldPosition(new THREE.Vector3()));
    const yaw = F.bodies[a.name].yaw, gz = x => gaze(head, yaw, tgtPos(x.prop || x.target));
    // a focus change (acting.js focusEase, rule 14): the pupils dart first, the head follows; a big shift brings a long
    // blink in the middle of the head move (ASK p. 87), unless the face is in a take
    const g = gz(cur); let d = 0;
    while (d < FOCUS_N && focusAt(a, f - d - 1, a.focusSegs, active).key === cur.key) d++;
    let gH = g, gE = g, turnBlink = 0;
    if (d < FOCUS_N && !focusAt(a, f - d, a.focusSegs, active).cut) {   // a look that changed on a cut is already there
      const g0 = gz(focusAt(a, f - d - 1, a.focusSegs, active));
      const w = focusEase(d); gE = lerp3(g0, g, w.eye); gH = lerp3(g0, g, w.head);
      const b0 = f - d + 1, k = d - 1;   // the kit's own faces: every big shift blinks long, unless a quiet span is under way
      if (!FACE_STYLE.name && Math.abs(g[0] - g0[0]) + Math.abs(g[1] - g0[1]) > TURN_BLINK && k >= 0 && k < BLINKS.long.length && !a.quiet.some(([x, y]) => b0 < y && b0 + BLINKS.long.length > x)) turnBlink = BLINKS.long[k];
    }
    if (FACE_STYLE.name) turnBlink = turnBlinkAt(a, f, gz);
    state.pupil = Math.max(-1, Math.min(1, PUPIL_K * (gE[0] - gH[0])));
    const sc = saccade(a.seed, f);
    const mix = mixFace(state), blink = Math.max(a.blinks.at(f), turnBlink, mix.blink, a.blinkBeats ? blinkAt(a.blinkBeats, f) : 0);
    const mwFace = mix.F.mw;   // the face's own mouth width, before a chew squashes it (the face QA judges the face, as with talking)
    if (clench && xb > 0.02 && !state.talk) { mix.F.mw *= 1 + 0.10 * br; mix.F.my = (mix.F.my || 0) - 0.010 * br; }
    if (xc > 0.02 && shut && (!state.talk || bite > 0.02)) { mix.F.mw *= 1 + 0.35 * chew; mix.F.my = (mix.F.my || 0) - 0.022 * chew; mix.F.mx += 0.012 * xc * Math.sin(Math.PI * f / CHEW.T); }
    if (FACE_STYLE.name) { mix.F.chewX = xc > 0.02 ? xc : 0; mix.F.breathX = xb > 0.02 ? br : 0; }   // a face style draws its own chew and breath
    // a face style's design also gets the face 1 and 2 frames ago (its own overlap inside a take, where every feature
    // shares one clock), the change class and phase, the frames since the face's key, and the head's height on screen (px
    // at 1920 high: marks thicken on a small face so they still read on a phone)
    if (mix.F.style) {
      mix.F.prev = [1, 2].map(k => { const s = faceStateAt(a.exprs, f - k, a.seed, null), p = mixFace(s).F; return { white: p.white, brow: p.brow, mw: p.mw, x: p.x, u: s.u ?? 1 }; });
      mix.F.cls = state.change?.cls ?? null; mix.F.ph = state.phase || 'hold'; mix.F.age = f - ek.f;
      // the change under way (its frame from the key, its clock, from and to), so a style can lead a feature through it
      const ch = state.change, side = x => typeof x === 'object' ? x : faceParams(x);
      mix.F.chg = ch && f < ch.end ? { cls: ch.cls, a: f - ch.kf, antic: ch.antic, u: state.u ?? 1, A: side(state.a), B: side(state.b), b: typeof state.b === 'string' ? state.b : state.b?.name } : null;
      const hd = Math.hypot(...head.map((x, i) => x - camPos[i])) || 1;
      mix.F.hpx = Math.round(0.94 * W / (2 * hd * Math.tan(stage.camera.fov * Math.PI / 360)) * 1920);
    }
    const P = { expr: e, state, mix, blink, look: gH[0] + sc[0] + (cur.prop ? 0 : a.idleLook || 0), look_v: gH[1] + sc[1], t: f, age: f - ek.f, cam: camPos };
    a.S.face(P); a.face = P; a.lastExpr = e;
    // the numbers the face QA reads (tools/gates/faults.mjs faceFaults): the drawn face (before the blink), its target, the change
    const F_ = mix.F, T_ = faceParams(state.b), r4 = x => +(+x).toFixed(4), c = state.change;
    a.faceDbg = { v: [F_.brow[0], F_.brow[1], F_.lid, F_.white, F_.ry, mwFace].map(r4), tgt: [T_.brow[0], T_.brow[1], T_.lid, T_.white, T_.ry, T_.mw].map(r4),
      cls: c?.cls ?? null, kf: c?.kf ?? null, s: c?.s ?? null, phase: state.phase || 'hold', blink: r4(blink), pupil: r4(state.pupil), look: r4(gH[0]), focus: cur.key };
  }

  // where a named thing is right now: effect objects and set props by their world position, places by name
  const livePos = n => fxo[n]?.obj ? toB(fxo[n].obj.getWorldPosition(hv)) : props[n] && segs[n] ? propWorld(n)
    : props[n]?.getWorldPosition ? toB(props[n].getWorldPosition(hv)) : point(n);
  const fenv = { at: spec => {
    if (Array.isArray(spec)) return spec;
    if (typeof spec === 'string') return livePos(spec);
    if (spec.head) { const a = byName[spec.head], h = toB(a.S.parts.head.getWorldPosition(hv)), y = F.bodies[spec.head].yaw * DEG;
      const fw = spec.fwd || 0, sd = spec.side || 0;                // fwd: where he faces; side: toward his LEFT (screen right when he faces the camera)
      return [h[0] + Math.sin(y) * fw + Math.cos(y) * sd, h[1] - Math.cos(y) * fw + Math.sin(y) * sd, h[2] + (spec.up || 0)]; }
    // sole: the body channel's floor point (pos + yaw, no lean or bob): a holster on the hip that does not swing with the head
    if (spec.sole) { const b = F.bodies[spec.sole] || bodyAt(byName[spec.sole], F.f), y = b.yaw * DEG, fw = spec.fwd || 0, sd = spec.side || 0;
      return [b.pos[0] + Math.sin(y) * fw + Math.cos(y) * sd, b.pos[1] - Math.cos(y) * fw + Math.sin(y) * sd, b.pos[2] + (spec.up || 0)]; }
    return add3(livePos(spec.prop), spec.off || [0, 0, 0]);
  } };
  const camera = createCamera({ aspect: width / height, side: SET.CAMERA_SIDE, bounds: R.cameraRoom || SET.CAMERA_ROOM, zRange: R.zRange,
    zMax: R.zMax ?? SET.CAMERA_ZMAX, actors: actors.map(a => a.name) });
  // compile sees the real scene at each shot change (everything is a pure function of the frame)
  // act.direct: hand-directed camera (kit/acting/director.js): every shot names its intent, cuts are cuts, a move has a trigger
  const DIR = R.direct ? (await import('#kit/acting/director.js')).createDirector(R.direct, { frameOf, aspect: width / height, F1, dofAuto: R.look?.dofAuto ?? X.dofAuto, drift: R.directDrift ?? X.directDrift ?? 0,
    anchor: (n, f) => { if (F.f !== f) poseAll(f); return anchor(n, f, livePos); } }) : null;
  // a whoosh under every camera travel (act `travelWhoosh`, strength 0..1; off by default): the reference has an SFX on
  // almost every visible action, camera rushes included (15.6 hits / 10 s, REF_SPEC.md rail)
  if (DIR && (R.travelWhoosh ?? X.travelWhoosh)) for (const S of DIR.shots) if (S.i > 0 && S.cut !== 'dissolve' && S.cut !== 'cut' && (S.n ?? 16) > 4)
    cues.push({ fr: S.f, name: 'whoosh', strength: (R.travelWhoosh ?? X.travelWhoosh) * Math.min(1, 16 / (S.n ?? 16)) });
  const shots = DIR ? [] : camera.compile((R.shots || []).map(s => ({ f: frameOf(s), kind: s.shot, subjects: s.of, opt: s })).sort((x, y) => x.f - y.f),
    (n, f) => { if (F.f !== f) poseAll(f); return anchor(n, f, livePos); }, F1 + 1);

  let cam = null, caption = null, blurV = null;

  function poseAll(f) {
    F = { f, posed: new Set(), cache: new Map(), handWorld: {}, bodies: {} };
    for (const a of actors) {
      poseActor(a, f);
      for (const n of Object.keys(segs)) { const L = segs[n]; let i = L.length - 1; while (i > 0 && L[i].start > f) i--; if (L[i].mode === 'hand' && L[i].actor === a.name) propWorld(n); }
    }
    for (const n of Object.keys(segs)) propWorld(n);
    for (const b of fx) {
      const d = f - b.at;
      if (b.do === 'blink') props[b.who].set(d >= 0 && d < 4 ? 1 : d >= 4 && d < 8 ? 1 - (d - 3) / 5 : 0);
      if (b.do === 'glint') { const k = d >= 0 && d < 14 ? Math.sin(Math.PI * d / 14) : 0; props[b.who].userData.top.material.emissive.setRGB(0.9 * k, 0.95 * k, 1.0 * k); }
    }
    for (const a of actors) {                                       // keyed: dye level 0..1, shown / hidden
      if (KT.has(a.name, 'dye')) dye(a.S, KT.at(a.name, 'dye', f, 0));
      if (KT.has(a.name, 'show')) a.S.root.visible = KT.at(a.name, 'show', f, 1) > 0.5;
    }
    for (const [n, h] of Object.entries(fxo)) h.apply((k, d) => KT.at(n, k, f, d), f, fenv);
  }
  function update(f, force = null) {
    sun(); poseAll(f);
    // motion blur on very fast camera moves only (act look.mblur: { px (threshold, px/frame at 1080 wide), k }): the aim point's
    // travel across the screen since the frame before, smeared along that travel when it passes the threshold
    const MB = R.look?.mblur, pc = MB && DIR && f > F0 ? DIR.at(f - 1, force) : null;
    cam = DIR ? DIR.at(f, force) : camera.at(shots, f, n => anchor(n, f, livePos), cues, force);
    blurV = null;
    if (pc && !DIR.cutAt(f)) { const a = projUV(cam, cam.aim, width / height), b = projUV(pc, cam.aim, width / height);
      if (a && b) { const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx * width, dy * height) * (1080 / width), th = MB.px ?? 60;
        if (L > th) { const k = (MB.k ?? 0.7) * (L - th) / L; blurV = [-dx * k, dy * k]; } } }
    // a director shot aimed at an actor reads its anchor at the shot's first frame, and the anchor hook poses the whole scene
    // there: pose this frame again, or every body, prop and effect renders frozen at the shot's start (only faces moved)
    if (F.f !== f) poseAll(f);
    // light.camKey { az, el } (deg): the key light comes from beside and above the lens every shot (the cartoon cheat: the face
    // in the shot is lit, whichever way it faces), shadows fall away from the camera
    if (LT?.camKey) { const F = cam.aim.map((x, i) => x - cam.pos[i]), a = Math.atan2(F[0], F[1]) + (LT.camKey.az ?? 30) * DEG, e = (LT.camKey.el ?? 35) * DEG;
      stage.setSun([Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), -Math.sin(e)], R.sun?.center || SET.SUN_CENTER, R.sun?.half || SET.SUN_HALF); }
    const px = height / 1920;
    stage.camera.setViewOffset(width, height, cam.offset[0] * px, cam.offset[1] * px, width, height);
    stage.setCamera(cam.pos, cam.aim, cam.lens);
    if (cam.roll) { stage.camera.rotateZ(cam.roll * DEG); stage.camera.updateMatrixWorld(); }   // dutch tilt
    // depth of field: a band round the focus (macro: a thin one, so the prop and its label stay sharp and the room melts)
    if (cam.dof > 0.02) { const d = Math.hypot(...cam.pos.map((x, i) => x - cam.focus[i])), bd = cam.band || [0.86, 1.22];
      stage.setDof({ near: d * bd[0], far: d * bd[1], gain: 2.4 * cam.dof, px: cam.band ? 20 : 14 }); }
    else stage.setDof(null);
    for (const h of Object.values(fxo)) h.post?.(cam.pos);
    for (const a of actors) faceActor(a, f, cam.pos);
    caption = X.cap.chunkAt(f)?.text ?? null;
  }

  const v = new THREE.Vector3();
  const toPx = p => { v.copy(p).project(stage.camera); return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height]; };
  function dbg(f) {
    update(f);
    const camM = stage.camera.matrixWorld, Rv = new THREE.Vector3().setFromMatrixColumn(camM, 0), Uv = new THREE.Vector3().setFromMatrixColumn(camM, 1);
    const out = { f, camera: { pos: cam.pos, target: cam.aim, fov: +stage.camera.fov.toFixed(3), lens: +cam.lens.toFixed(2), shot: cam.shot, offset: cam.offset, glide: cam.u ?? null }, actors: {}, caption };
    for (const a of actors) {
      const c = a.S.parts.head.getWorldPosition(new THREE.Vector3());
      const xs = [-1, 1].map(s => toPx(c.clone().addScaledVector(Rv, 0.5 * W * s))[0]), ys = [1, -1].map(s => toPx(c.clone().addScaledVector(Uv, 0.47 * W * s))[1]);
      v.copy(c).project(stage.camera); const vz = v.z;
      const feet = {}; for (const s of ['L', 'R']) feet[s] = toB(a.S.parts.ankles[s].getWorldPosition(new THREE.Vector3())).map(x => +x.toFixed(4));
      const box = [xs[0], ys[0], xs[1], ys[1]].map(x => +x.toFixed(1));
      const sole = Math.max(...['L', 'R'].flatMap(s => [a.S.parts.ankles[s], a.S.parts.toes[s]].map(o => toPx(o.getWorldPosition(new THREE.Vector3()))[1])));
      out.actors[a.name] = { pos: F.bodies[a.name].pos.map(x => +x.toFixed(4)), yaw: +F.bodies[a.name].yaw.toFixed(2), expr: a.face.expr, blink: a.face.blink,
        verb: [...a.verbs.filter(x => x.start <= f && f < x.end).map(x => x.name), ...(a.anim && a.anim.keys.length > 1 ? ['key'] : [])], head: box, feet, limbs: a.S.rigWorld(),
        // a motion v2 actor acts from hand-set keys, not verbs: past its first key it is acting ('key')
        body: a.verbs.filter(x => x.start <= f && f < x.end && isBodyVerb(x)).map(x => x.name).pop() || (a.anim && a.anim.keys.length > 1 && f >= a.anim.keys[0].f ? 'key' : null), lead: !!a.lead,
        mouthA: +(a.S.faceStats?.mouth ?? 0).toFixed(5), faceVis: a.S.faceVis ?? null, faceSlide: a.S.faceSlide ?? null, faceStretch: +(a.S.faceStats?.stretch ?? 1).toFixed(3), faceLag: +(a.S.faceStats?.lag ?? 0).toFixed(3), faceRoll: a.S.faceRoll ?? 0, facePlate: a.S.facePlate ?? null, faceKey: a.S.faceStats?.key ?? '', exprDesign: designKey(a.face.expr), talking: !!a.talking,
        face: a.faceDbg || null, cord: a.S.hoodie?.dbg ?? null, headP: a.P ? [a.P.head_pitch || 0, a.P.head_dv || 0, a.P.head_tilt || 0].map(x => +(+x).toFixed(4)) : null,
        exprFrom: a.exprKey?.f > -1e8 ? a.exprKey.f : null, exprWord: a.exprKey?.word ?? null,
        headW: toB(c).map(x => +x.toFixed(4)), figH: +((sole - ys[0]) / height).toFixed(3),
        inFrame: a.S.root.visible && vz < 1 && box[2] > 0 && box[0] < width && box[3] > 0 && box[1] < height };
    }
    // held props: the gap between the hand dot and the prop's grip socket (or its bounding box), cm (engine/grip.js,
    // tools/gates/handgrip.mjs) and px at this frame size
    const pxPerM = p => { const d = p.distanceTo(stage.camera.position); return height / 2 / (Math.tan(stage.camera.fov * Math.PI / 360) * d); };
    out.held = [];
    for (const n of Object.keys(segs)) {
      const L = segs[n]; let i = L.length - 1; while (i > 0 && L[i].start > f) i--; const s = L[i];
      if (s.mode !== 'hand' || !props[n].visible) continue;
      const a = byName[s.actor]; if (!a?.S.root.visible) continue;
      const hp = a.S.parts.hands[s.side].getWorldPosition(new THREE.Vector3()), gap = gripGap(hp, props[n], s.side);
      v.copy(hp).project(stage.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      out.held.push({ actor: s.actor, prop: n, side: s.side, onScreen: on, gapPx: +(gap.cm / 100 * pxPerM(hp)).toFixed(2), gapCm: gap.cm, anchor: gap.anchor });
    }
    // hand props (cast.js x_hp<L|R|B>_<kind>, a bag, a phone): the gap from the hand to the prop's grip socket; a prop held
    // between both hands (B) hangs its socket at the hands' midpoint, so each hand is measured as that midpoint to the socket
    for (const a of actors) {
      if (!a.S.root.visible) continue;
      for (const [id, o] of Object.entries(a.S.props)) {
        const side = id[0];
        if (!o.visible || side === 'H') continue;                 // worn on the head: no hand holds it
        if ((a.S.propState?.[id]?.w ?? 1) < 0.999) continue;       // resting, falling or on its way into the hand (engine/propobj.js): not held
        for (const s of side === 'B' ? ['L', 'R'] : [side]) {
          const hp = side === 'B' ? a.S.parts.hands.L.getWorldPosition(new THREE.Vector3()).add(a.S.parts.hands.R.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5)
            : a.S.parts.hands[s].getWorldPosition(new THREE.Vector3());
          const gap = gripGap(hp, o, s);
          v.copy(hp).project(stage.camera);
          out.held.push({ actor: a.name, prop: id.slice(1), side: s, onScreen: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1, gapPx: +(gap.cm / 100 * pxPerM(hp)).toFixed(2), gapCm: gap.cm, anchor: gap.anchor });
        }
      }
    }
    // bodies inside set geometry: the torso (a box between hips and shoulders) and the knees and ankles of every shown
    // actor against the set's collision boxes (1 cm grace), and torso against torso
    const torsoPts = a => { const r = a.S.rig, wq = q => toB(q.clone().multiplyScalar(W).applyMatrix4(a.S.root.matrixWorld));
      const hip = wq(r.L.hip.clone().add(r.R.hip).multiplyScalar(0.5)), sh = wq(r.L.shoulder.clone().add(r.R.shoulder).multiplyScalar(0.5));
      const y = F.bodies[a.name].yaw * DEG, Rv2 = [Math.cos(y), Math.sin(y)], Fv2 = [Math.sin(y), -Math.cos(y)], pts = [];
      for (const u of [0, 0.5, 1]) for (const sx of [-1, 0, 1]) for (const sy of [-1, 0, 1]) {
        const c = lerp3(hip, sh, u); pts.push([c[0] + Rv2[0] * 0.15 * sx + Fv2[0] * 0.11 * sy, c[1] + Rv2[1] * 0.15 * sx + Fv2[1] * 0.11 * sy, c[2] + (u - 0.5) * 0.06]); }
      return pts; };
    const inBox = (p, b, e = 0.01) => p[0] > b.lo[0] + e && p[0] < b.hi[0] - e && p[1] > b.lo[1] + e && p[1] < b.hi[1] - e && p[2] > b.lo[2] + e && p[2] < b.hi[2] - e;
    out.collide = [];
    const shown = actors.filter(a => a.S.root.visible), T = {};
    for (const a of shown) {
      T[a.name] = torsoPts(a);
      const lim = a.S.rigWorld(), pts = [...T[a.name].map(p => ['torso', p]), ...['L', 'R'].flatMap(s => [['knee' + s, lim[s].knee], ['ankle' + s, lim[s].ankle]])];
      for (const b of SET.COLLIDE || []) { const hit = pts.find(([, p]) => inBox(p, b, b.grace ?? 0.01)); if (hit) out.collide.push(`${a.name}.${hit[0]} in ${b.name}`); }
    }
    for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
      const A = shown[i], Bb = shown[j], b = T[Bb.name], lo = [0, 1, 2].map(k => Math.min(...b.map(p => p[k]))), hi = [0, 1, 2].map(k => Math.max(...b.map(p => p[k])));
      if (T[A.name].some(p => inBox(p, { lo, hi }, 0.01))) out.collide.push(`${A.name}.torso in ${Bb.name}.torso`);
    }
    out.shotI = cam.shotIndex; out.set = R.set;
    // what the viewer can see: every set prop and effect object that is shown, in front of the camera and covers at least
    // 0.2 % of the frame (the story gates check a line's storyboard props / fx against this list)
    stage.scene.updateMatrixWorld();
    out.seen = [...new Set([...Object.keys(props), ...Object.keys(fxo)])].filter(n => onScreen(fxo[n]?.obj || props[n]?.isObject3D && props[n] || props[n]?.mesh));
    const tracked = [], held = new Set();
    for (const n of Object.keys(props)) { const L = segs[n] || []; let i = L.length - 1; while (i > 0 && L[i].start > f) i--;
      tracked.push([n, props[n]?.isObject3D ? props[n] : props[n]?.mesh]); if (L[i]?.mode === 'hand') held.add(n); }
    for (const a of actors) for (const [id, o] of Object.entries(a.S.props || {})) {
      tracked.push([`${a.name}:${id}`, o]); if ((a.S.propState?.[id]?.w ?? 1) >= 0.999) held.add(`${a.name}:${id}`); }
    out.track = {}; const drawn = [];
    for (const [id, o] of tracked) {
      if (!o?.isObject3D) continue;
      let shown = true; for (let q = o; q; q = q.parent) if (!q.visible) shown = false;
      box3.makeEmpty();
      if (shown) o.traverseVisible(m => { if (!m.isMesh || !m.geometry) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        box3.union(bb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld)); });
      if (box3.isEmpty()) { out.track[id] = { shown: false }; continue; }
      const loc = drawnBox(o); if (loc.isEmpty()) loc.copy(box3).applyMatrix4(o.matrixWorld.clone().invert());
      drawn.push([id, loc, o]);
      const c = box3.getCenter(new THREE.Vector3()), ls = loc.getSize(new THREE.Vector3()), pts = [c.clone()];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        const q = new THREE.Vector3(i & 1 ? box3.max.x : box3.min.x, i & 2 ? box3.max.y : box3.min.y, i & 4 ? box3.max.z : box3.min.z);
        pts.push(q.clone().lerp(c, 0.4)); cv.copy(q).project(stage.camera); if (cv.z >= 1 || cv.z <= -1) continue;
        const px = (cv.x + 1) / 2 * width, py = (1 - cv.y) / 2 * height; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      const own = h => { for (let q = h; q; q = q.parent) if (q === o) return true; return false; };
      out.track[id] = { shown: true, held: held.has(id), on: foldVis(pts.map(p => pointVis(stage.camera, stage.scene, p, own))),
        box: Number.isFinite(x0) ? [x0, y0, x1, y1].map(x => +x.toFixed(1)) : null, size: +(Math.max(ls.x, ls.y, ls.z) * o.matrixWorld.getMaxScaleOnAxis()).toFixed(4), dims: [ls.x, ls.y, ls.z].map(x => +(x * o.matrixWorld.getMaxScaleOnAxis()).toFixed(4)), c: toB(c).map(x => +x.toFixed(4)) };
    }
    // a prop inside a head or a solid of the set (Hot Money ep01 r5: a bag carried up past the face, 27 cm into the head for
    // 30 frames, and through the dresser and door 9's jamb; shotgate passed): each hand-sized prop's drawn box as a 4x4x4
    // grid against every shown head (an ellipsoid 0.5 x 0.5 x 0.47 head widths) and every solid (engine/solids.js), its
    // deepest point, 2 cm of grace (a prop laid on a top or held to an ear touches it)
    out.propIn = [];
    for (const [id, loc, o] of drawn) {
      if (/^[^:]+:H/.test(id)) continue;                                  // worn on the head (a cap)
      const sz = loc.getSize(new THREE.Vector3()).multiplyScalar(o.matrixWorld.getMaxScaleOnAxis());
      if (Math.max(sz.x, sz.y, sz.z) > PROP_IN_MAX) continue;               // a door, a roof, a car: set pieces moved as props
      const P = boxPoints(loc, o.matrixWorld), skipSelf = new Set([o]);
      for (const a of actors) { if (!a.S.root.visible) continue;
        const c = a.S.parts.head.getWorldPosition(new THREE.Vector3()), k = a.S.root.scale.x, hx = 0.5 * W * k, hy = 0.47 * W * k;
        let d = 0, at = null;
        for (const p of P) { const r = Math.hypot((p.x - c.x) / hx, (p.y - c.y) / hy, (p.z - c.z) / hx); if (r < 1 && (1 - r) * hy > d) { d = (1 - r) * hy; at = p; } }
        if (d > PROP_IN_GRACE) out.propIn.push({ id, in: `${a.name}.head`, cm: +(d * 100).toFixed(1), at: toB(at).map(x => +x.toFixed(3)) }); }
      for (const h of inBoxes(P, [...solids.filter(b => !skipSelf.has(b.mesh)), ...(SET.COLLIDE || [])], PROP_IN_GRACE))
        out.propIn.push({ id, in: h.name, cm: +(h.depth * 100).toFixed(1), at: toB(h.at).map(x => +x.toFixed(3)) });
    }
    // an arm inside a solid of the set (engine/solids.js armIn), the points between the joints too
    out.armIn = actors.filter(a => a.S.root.visible).flatMap(a => armIn(out.actors[a.name]?.limbs, [...solids, ...(SET.COLLIDE || [])]).map(x => ({ who: a.name, ...x })));
    if (SET.COLLIDE?.unchecked?.length) out.unchecked = SET.COLLIDE.unchecked.map(u => ({ ...u }));   // set props no gate checks (kit/props/catalog.js)
    // an object cut by the camera's far plane inside the shot: a straight-edged hole where the sky dome (drawn first, no
    // depth) shows through or a flat card draws over it (Hot Money r5 CHASE 1601-1637: motel.js's 220 x 60 m sky cards at
    // 60-70 m against far 80 m). Every opaque mesh 2 m tall or more whose box reaches both nearer and further than far
    // and whose near part is in the frustum; the floor and the dome (BackSide) are left out
    out.farCut = [];
    { const cam = stage.camera, far = cam.far, cp = cam.position, cb = new THREE.Box3(), q = new THREE.Vector3();
      pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frust.setFromProjectionMatrix(pm);
      const liveR = new Set(actors.map(a => a.S.root)), fwd = cam.getWorldDirection(new THREE.Vector3());
      stage.scene.traverseVisible(m => {
        if (!m.isMesh || !m.geometry || m.isSprite) return;
        for (let o = m; o; o = o.parent) if (liveR.has(o)) return;
        const mt = Array.isArray(m.material) ? m.material[0] : m.material;
        if (!mt || mt.side === THREE.BackSide || mt.transparent || mt.colorWrite === false || mt.blending === THREE.AdditiveBlending) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        cb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
        if (cb.max.y - cb.min.y < 2) return;
        // depth along the view axis, as the far plane clips (a plane, not a sphere: a card's top can be in while its middle is out)
        let lo = Infinity, hi = -Infinity; for (let i = 0; i < 8; i++) { const z = q.set(i & 1 ? cb.max.x : cb.min.x, i & 2 ? cb.max.y : cb.min.y, i & 4 ? cb.max.z : cb.min.z).sub(cp).dot(fwd); lo = Math.min(lo, z); hi = Math.max(hi, z); }
        if (!(lo < far && hi > far) || !frust.intersectsBox(cb)) return;
        // what the lens sees of it near the cut: rays through a 12 x 21 grid of the frame; a ray counts when this mesh is
        // the first thing drawn along it (the dome, drawn first with no depth, hides nothing) within 10 m of far
        const rc = new THREE.Raycaster(), ndc = new THREE.Vector2(), seenAt = [];
        rc.far = far * 2;
        for (let gx = 0; gx < 12; gx++) for (let gy = 0; gy < 21; gy++) {
          ndc.set(-1 + (gx + 0.5) / 6, -1 + (gy + 0.5) / 10.5); rc.setFromCamera(ndc, cam);
          const h = rc.intersectObject(m, false)[0], z = h && h.point.clone().sub(cp).dot(fwd); if (!h || z > far || z < far - 10) continue;
          const first = rc.intersectObject(stage.scene, true).find(x => opaque(x) && x.object.material?.depthWrite !== false && x.object.material?.side !== THREE.BackSide && ![...liveR].some(r => { for (let o = x.object; o; o = o.parent) if (o === r) return true; return false; }));
          if (first?.object === m) seenAt.push(h.point);
        }
        if (!seenAt.length) return;
        const mid = toB(cb.getCenter(new THREE.Vector3())).map(x => x.toFixed(0)).join(', ');
        out.farCut.push({ name: `${m.name || m.parent?.name || m.geometry.type} at (${mid})`, at: toB(seenAt[seenAt.length >> 1]).map(x => +x.toFixed(2)), share: +(seenAt.length / 252).toFixed(3),
          size: toB(cb.getSize(new THREE.Vector3())).map(x => +Math.abs(x).toFixed(1)), far: +far.toFixed(1) });
      }); }
    out.cross = [];
    const live = new Set(actors.filter(a => a.S.root.visible).map(a => a.S.root)), heldO = new Set(tracked.filter(([id]) => held.has(id)).map(([, o]) => o));
    const skip = x => { if (!opaque(x)) return true; for (let q = x.object; q; q = q.parent) if (live.has(q) || heldO.has(q)) return true; return false; };
    const now = {}, wp = o => o.getWorldPosition(new THREE.Vector3());
    for (const a of actors) { if (!a.S.root.visible) continue;
      const l = a.S.rigWorld(), mid = (u, v) => toThree(...u.map((x, i) => (x + v[i]) / 2));
      const pts = { head: wp(a.S.parts.head), kneeL: toThree(...l.L.knee), kneeR: toThree(...l.R.knee), pelvis: mid(l.L.hip, l.R.hip), chest: mid(l.L.shoulder, l.R.shoulder) };
      for (const [k, v] of Object.entries(pts)) now[`${a.name}.${k}`] = v; }
    for (const [id, o] of tracked) if (held.has(id) && o?.visible) { box3.makeEmpty().setFromObject(o); if (!box3.isEmpty()) now[`prop ${id}`] = box3.getCenter(new THREE.Vector3()); }
    const where = new Map(), walk = (o, d) => { if (live.has(o)) return; where.set(o, wp(o)); if (d < 5) for (const c of o.children) walk(c, d + 1); };
    walk(stage.scene, 0);
    const moved = h => { for (let q = h; q; q = q.parent) { const a = crossPrev?.where.get(q), b = where.get(q); if (a && b && a.distanceTo(b) > 0.01) return true; } return false; };
    if (crossPrev?.f === f - 1) for (const [k, p] of Object.entries(now)) {
      const q = crossPrev.pts[k]; if (!q) continue; const d = p.distanceTo(q); if (d < 1e-4) continue;
      crossRay.set(q, p.clone().sub(q).divideScalar(d)); crossRay.near = 0; crossRay.far = d; crossRay.camera = stage.camera;
      const h = crossRay.intersectObject(stage.scene, true).find(x => !skip(x) && !moved(x.object));
      if (h) out.cross.push({ what: k, through: h.object.name || h.object.parent?.name || 'set', d: +d.toFixed(3), at: toB(h.point).map(x => +x.toFixed(3)) });
    }
    crossPrev = { f, pts: now, where };
    // lights within 4 m of a figure (valuegate 'light rides a figure', Kai 23/11: "light comes FROM the character"). `carried`:
    // the light sits on a visible object (a hand prop, a car, a gun's flash, a lamp fixture: a group between it and the act's
    // group that holds a visible mesh); a light hung straight off the act with nothing to show for it is an invisible key
    out.px = [width, height];
    out.lights = [];
    const heads = actors.filter(a => a.S.root.visible).map(a => a.S.parts.head.getWorldPosition(new THREE.Vector3()));
    const shows = q => { const st = [q]; while (st.length) { const x = st.pop(); if (!x.visible) continue; if (x.isMesh) return true; st.push(...x.children); } return false; };
    stage.scene.traverse(o => {
      if (!(o.isPointLight || o.isSpotLight) || !(o.intensity > 0)) return;
      for (let q = o; q; q = q.parent) if (!q.visible) return;
      const P = o.getWorldPosition(new THREE.Vector3()); if (!heads.some(h => h.distanceTo(P) < 4)) return;
      // a hand prop or a held prop first: a lamp in the hand; a figure's root first: a light on its own body (not carried);
      // neither: carried when a group between it and the act's group shows a mesh (a car, a fixture)
      let carried = null, onMesh = false;
      for (let q = o.parent; q && q.parent && q.parent !== stage.scene && carried === null; q = q.parent) {
        if (/^hp_/.test(q.name || '') || q.userData?.prop || q.userData?.rest) carried = true;
        else if (q.userData?.stick) carried = false;
        else onMesh ||= shows(q); }
      carried ??= onMesh;
      out.lights.push({ id: o.uuid.slice(0, 8), pos: toB(P).map(x => +x.toFixed(3)), power: +o.intensity.toFixed(2), carried });
    });
    return out;
  }
  // the shot camera's view of a fault (engine/visible.js): items [{ actor, pts: [[x, y, z] Blender world] }], one state
  // each: 'in' when any point is seen, 'occluded' when hidden, 'off' when out of the frame. The actor's own body and what
  // it holds never hide its fault.
  function vis(f, items) {
    update(f); stage.scene.updateMatrixWorld(); stage.camera.updateMatrixWorld();
    const heldBy = n => Object.keys(segs).flatMap(k => { const L = segs[k]; let i = L.length - 1; while (i > 0 && L[i].start > f) i--;
      return L[i].mode === 'hand' && L[i].actor === n ? [props[k], props[k]?.mesh].filter(Boolean) : []; });
    return items.map(({ actor, pts }) => {
      const a = byName[actor]; if (!a?.S.root.visible) return 'off';
      const mine = new Set([a.S.root, ...heldBy(actor)]), own = o => { for (let q = o; q; q = q.parent) if (mine.has(q)) return true; return false; };
      return foldVis(pts.map(p => pointVis(stage.camera, stage.scene, toThree(...p), own)));
    });
  }
  const box3 = new THREE.Box3(), bb = new THREE.Box3(), cv = new THREE.Vector3(), frust = new THREE.Frustum(), pm = new THREE.Matrix4();
  const crossRay = new THREE.Raycaster(); let crossPrev = null;
  function onScreen(o) {
    if (!o?.isObject3D) return false;
    for (let q = o; q; q = q.parent) if (!q.visible) return false;
    box3.makeEmpty();
    const add = m => { if (!m.isMesh || !m.geometry) return;
      if (m.isInstancedMesh) { if (!m.boundingBox) m.computeBoundingBox(); bb.copy(m.boundingBox).applyMatrix4(m.matrixWorld); }   // the instances, not one unit box at the origin
      else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); }
      box3.union(bb); };
    o.traverseVisible(add);
    for (const q of o.userData?.seenParts || []) if (q.visible) q.traverseVisible(add);   // a prop whose visible body lives elsewhere (the hero joint's rail ends)
    if (box3.isEmpty()) return false;
    // a long prop seen close up (a 12 m rail piece in an extreme close-up) has its box corners behind the camera or far off
    // screen, so the corner projection below misses it: inside the view and within 3 m of the lens counts as seen
    stage.camera.updateMatrixWorld(); frust.setFromProjectionMatrix(pm.multiplyMatrices(stage.camera.projectionMatrix, stage.camera.matrixWorldInverse));
    if (frust.intersectsBox(box3) && box3.distanceToPoint(stage.camera.position) < 3) return true;
    let x0 = 1, y0 = 1, x1 = -1, y1 = -1, n = 0;
    for (let i = 0; i < 8; i++) {
      cv.set(i & 1 ? box3.max.x : box3.min.x, i & 2 ? box3.max.y : box3.min.y, i & 4 ? box3.max.z : box3.min.z).project(stage.camera);
      if (cv.z >= 1 || cv.z <= -1) continue; n++;
      x0 = Math.min(x0, cv.x); x1 = Math.max(x1, cv.x); y0 = Math.min(y0, cv.y); y1 = Math.max(y1, cv.y);
    }
    if (!n) return false;
    const w = Math.min(1, x1) - Math.max(-1, x0), h = Math.min(1, y1) - Math.max(-1, y0);
    return w > 0 && h > 0 && w * h / 4 >= 0.002;
  }

  // camera speed = mean screen move of a 3x3 grid of world points fixed at the aim's depth (0.8 of the half frame), px at 720 wide
  // (camPeak = the worst of the nine, i.e. the frame corners during a zoom);
  // foot slide = how far a planted foot moves in the world between frames, seen through this frame's camera
  const feetW = () => Object.fromEntries(actors.map(a => [a.name, Object.fromEntries(['L', 'R'].map(s => [s, toB(a.S.parts.ankles[s].getWorldPosition(new THREE.Vector3()))]))]));
  const motion = f => {
    update(Math.max(F0, f - 1)); const c0 = { ...cam }, ft0 = feetW(), i0 = cam.shotIndex;
    update(f); const ft1 = feetW();
    const px = (c, p) => { const q = camera.project(c, p); return [q[0] * 720 + c.offset[0] * 720 / 1080, q[1] * 1280 + c.offset[1] * 720 / 1080]; };
    const d = Math.hypot(...cam.pos.map((x, i) => x - cam.aim[i])), fw = cam.aim.map((x, i) => (x - cam.pos[i]) / d);
    const rt = [fw[1], -fw[0], 0].map(x => x / (Math.hypot(fw[0], fw[1]) || 1)), up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
    const hw = d * 18 / cam.lens * width / height, hh = d * 18 / cam.lens;
    let camPx = 0, camPeak = 0;
    for (const i of [-0.8, 0, 0.8]) for (const j of [-0.8, 0, 0.8]) {
      const q = cam.aim.map((x, k) => x + rt[k] * hw * i + up[k] * hh * j), a = px(c0, q), b = px(cam, q);
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]); camPx += m / 9; camPeak = Math.max(camPeak, m);
    }
    const feet = {};
    for (const n in ft1) { feet[n] = {}; for (const s of ['L', 'R']) {
      const p0 = ft0[n][s], p1 = ft1[n][s], q0 = px(cam, p0), q1 = px(cam, p1);
      feet[n][s] = { planted: p0[2] < 0.014 && p1[2] < 0.014, px: +Math.hypot(q1[0] - q0[0], q1[1] - q0[1]).toFixed(3) }; } }
    // a shot asked as a cut (glide 0) is an edit, not camera motion
    const shotCut = DIR ? DIR.cutAt(f) : (cam.shotIndex !== i0 && shots[cam.shotIndex].glide === 0) || !!camera.mixAt(shots, f);
    return { cam: f === F0 ? 0 : +camPx.toFixed(3), camPeak: f === F0 ? 0 : +camPeak.toFixed(3), feet, shotCut };
  };
  return { name: R.name || R.set, R, grade: { ...(R.grade || {}) }, group, background, fog, update, dbg, vis, motion, cues, actors, frameOf, flash: f => KT.at('screen', 'flash', f, 0) || 0, blur: () => blurV,
    impact: f => KT.at('screen', 'impact', f, 0) || 0, shotMix: f => DIR ? DIR.mixAt(f) : camera.mixAt(shots, f) };
}

// storyboard lines the reel data does not shoot get planned shots (shotplan.js): each line goes to the act on screen at
// its first word, with that act's cast, the line's fx / props (the one fired first first) and its key word
function autoShots(defs, SB, words, fps, F1, ids) {
  if (!SB?.lines) return;
  const fr = x => typeof x === 'number' ? x : resolveBeatFrame(x, words, fps), E = Object.fromEntries(SB.lines.map(e => [e.id, e]));
  const starts = defs.flatMap((d, k) => d.show.map(w => ({ k, a: fr(w.from) }))).sort((x, y) => x.a - y.a);
  const actAt = f => { let j = 0; while (j + 1 < starts.length && starts[j + 1].a <= f) j++; return starts[j]; };
  const t0 = id => words.find(w => w.line === id)?.t0, A = ids.map(id => Math.round(t0(id) * fps));
  const lines = ids.map((id, i) => {
    const a = A[i], s = actAt(a + 3), d = defs[s.k], e = E[id] || {};
    const cut = starts.find(x => x.a > a + 3 && x.k !== s.k)?.a ?? Infinity, b = Math.min(i + 1 < ids.length ? A[i + 1] : F1 + 1, cut);   // another act cuts in
    const explicit = (d.shots || []).filter(x => { const f = fr(x); return f >= a - 6 && f < b - 6; }).map(x => x.shot);
    const kw = e.still || e.on, w = kw && words.find(x => x.line === id && x.word.toLowerCase().replace(/[^a-z0-9']/g, '') === kw.toLowerCase());
    const beats = (d.beats || []).map(x => { try { return { ...x, at: fr(x) }; } catch { return null; } }).filter(x => x && x.at >= a - 10 && x.at < b);
    // size = metres a macro takes in across the frame, lift = its centre above the object's origin (a thermometer stands on its bulb)
    const size = m => m.kind === 'thermo' ? { size: 0.62 * (m.scale ?? 1), lift: 0.26 * (m.scale ?? 1) } : m.kind === 'stamp' ? { size: Math.max(0.45, (m.h ?? 0.3) * (String(m.text || '').length * 0.62 + 0.8)) } : {};
    const things = [...(e.fx || []).filter(n => d.make?.[n]).map(n => ({ name: n, kind: d.make[n].kind, ...size(d.make[n]) })), ...(e.props || []).map(n => ({ name: n, kind: 'prop' }))]
      .map(t => ({ ...t, beats: beats.filter(x => x.who === t.name).map(x => x.at).sort((p, q) => p - q) }));
    const beatsBy = {}; for (const x of beats) if (d.cast?.[x.who]) beatsBy[x.who] = (beatsBy[x.who] || 0) + 1;
    return { id, a, b, key: w ? Math.round(w.t0 * fps) : null, text: words.filter(x => x.line === id).map(x => x.word).join(' '), entry: e, things, explicit,
      act: { name: String(s.k), start: s.a, actors: Object.keys(d.cast || {}), beatsBy } };
  });
  const out = planShots(lines);
  for (const [k, list] of Object.entries(out)) defs[+k].shots = [...(defs[+k].shots || []), ...list];
}

// internal cue names -> the sound bank (tools/run/sound_bank.py); steps alternate left / right
const SOUND = { cash_lift: 'rustle', bundle_drop: 'thud', paper_slide: 'slide', swoosh: 'whoosh', sensor_beep: 'beep', glint: 'ting' };
const BANK = new Set(['slide', 'thud', 'rustle', 'ting', 'ding', 'whoosh', 'step_l', 'step_r', 'beep', 'tick', 'poof', 'hiss', 'scratch', 'pop', 'snore',
  'clunk', 'blip', 'ping', 'sizzle', 'slide_whistle_up', 'flutter', 'wah', 'siren', 'sting',
  'saw', 'chug', 'whistle', 'clack', 'groan', 'boom', 'crowd', 'crank']);   // = tools/run/sound_bank.py BANK (test/unit/stick-sound-bank.test.mjs)

export async function boot({ film, width, height }) {
  const R1 = (await import(`/${film}/reel.js`)).default;
  let R2 = null;
  try { R2 = (await import(`/${film}/reel2.js`)).default; } catch (e) { if (e instanceof SyntaxError || !/fetch|module|404/i.test(String(e))) throw e; }
  const words = (await getJSON(`/${film}/vo/words.json`)) || (await getJSON(`/${film}/words.json`));
  if (!words) throw new Error(`no words.json in ${film}/vo or ${film}`);
  const fps = R1.fps || 30, F0 = R1.frames[0], F1 = R2 ? R2.frames[1] : R1.frames[1];
  // the film's face style (reel.js faceStyle, engine/facestyles/index.js; left out = s2): set before any figure or the stage is built
  await useFaceStyle(R1.faceStyle);
  useHeadMarks(R1.headMarks);   // the film's head-mark set (reel.js headMarks: 'bold'; left out = the marks as they always were)
  const stage = createStage({ width, height, faceInk: !!FACE_STYLE.name, ...(R1.look || {}) });
  // ?ablate=<source> (kit/look/ablate.js; tools/gates/blame.mjs): every render with that one light source dimmed, to find
  // what blows a region; ?ablate=list prints the lights it can name
  const ABL = new URLSearchParams(globalThis.location?.search || '').get('ablate');
  if (ABL) { const r0 = stage.render; let lights = null;   // light<i>: the first render's list, frozen (a dissolve renders two acts)
    stage.render = (o = {}) => { if (!lights) { lights = frameLights(stage.scene); for (const l of listLights(stage.scene)) console.warn(`[kit] ablate ${l}`); }
      const u = ablate(stage, ABL, o.grade, lights); try { return r0({ ...o, grade: u.grade }); } finally { u.undo(); } }; }
  try { await document.fonts.load('900 100px InterReel'); } catch { /* falls back to the system sans */ }
  const cap = createCaptions({ words, lines: [...R1.lines, ...(R2?.lines || [])], fps, width, height, mode: R1.captions?.mode });
  const X = { stage, words, fps, F0, F1, width, height, cap, glasses: R1.glasses, directDrift: R1.directDrift, travelWhoosh: R1.travelWhoosh }, bg0 = stage.scene.background;
  const defs = [{ ...R1, name: R1.name || 'lobby', show: R1.show || [{ from: R1.frames[0] }] }, ...(R2?.acts || [])];
  for (const am of R2?.amend || []) { const d = defs.find(x => x.name === am.act); d.shots = [...d.shots, ...(am.shots || [])]; d.beats = [...d.beats, ...(am.beats || [])]; }
  autoShots(defs, await getJSON(`/${film}/storyboard.json`), words, fps, F1, [...R1.lines, ...(R2?.lines || [])]);
  // each act's on-screen windows (auto-acting fills them): from each `show` to the next act's
  const fr0 = x => typeof x === 'number' ? x : resolveBeatFrame(x, words, fps);
  const starts = defs.flatMap((d, k) => d.show.map(w => [fr0(w.from), k])).sort((x, y) => x[0] - y[0]);
  defs.forEach((d, k) => { d.win = starts.map(([a], i) => [a, i + 1 < starts.length ? starts[i + 1][0] : F1 + 1]).filter((_, i) => starts[i][1] === k); });
  const acts = [];
  for (const d of defs) acts.push(await buildAct(d, X));
  // drawn overlays (engine/overlays.js): each act's `overlays` list, over the picture on the captions canvas
  acts.forEach((A, k) => { A.ov = createOverlays({ stage, width, height, list: defs[k].overlays }); });
  const capG = cap.canvas.getContext('2d');
  // windows: act k is on screen from its `from`; a dissolve of n frames is centred on that frame
  const fr = x => typeof x === 'number' ? x : resolveBeatFrame(x, words, fps);
  // place changes dissolve (the reference cross-dissolves, median ~9 f, almost never hard-cuts)
  // `whip: n` instead of `dissolve`: an n-frame whip pan (a horizontal smear peaking mid-transition, then the cross-fade)
  const wins = acts.flatMap((A, k) => defs[k].show.map(w => ({ A, a: fr(w.from), whip: w.whip ? (w.dir ?? 1) : 0, n: w.whip ?? w.dissolve ?? (A === acts[0] && w.from === F0 ? 0 : 9) }))).sort((x, y) => x.a - y.a);
  const at = f => {
    for (let k = 1; k < wins.length; k++) { const w = wins[k], h = w.n / 2; if (w.n && f >= w.a - h && f < w.a + h) return { cur: w.A, prev: wins[k - 1].A, u: (f - (w.a - h) + 0.5) / w.n, whip: w.whip }; }
    let k = 0; while (k + 1 < wins.length && wins[k + 1].a <= f) k++; return { cur: wins[k].A };
  };
  const show = A => { for (const x of acts) x.group.visible = x === A; stage.scene.background = A.background ?? bg0; stage.scene.fog = A.fog || null; };
  function frame(f) {
    const s = at(f); let ms = 0;
    const wp = s.whip ? 0.22 * s.whip * Math.sin(Math.PI * s.u) : 0, wu = s.whip ? Math.min(1, Math.max(0, (s.u - 0.3) / 0.4)) : s.u;
    if (s.prev) { show(s.prev); s.prev.update(f); ms += stage.render({ flash: s.prev.flash(f), grade: s.prev.grade, whip: wp }); stage.grab(); }
    const sm = s.prev ? null : s.cur.shotMix(f);                   // a shot dissolve inside the act: the outgoing camera first
    const sw = sm?.whip ? 0.22 * sm.whip * Math.sin(Math.PI * (sm.ws ?? sm.u)) : 0;   // a whip between two shots of one place (kit/acting/director.js)
    if (sm) { show(s.cur); s.cur.update(f, sm.i); ms += stage.render({ flash: s.cur.flash(f), grade: s.cur.grade, whip: sw }); stage.grab(); }
    const lo = !s.prev && !sm ? s.cur.ov.loupeAt(f) : null;       // a loupe: one extra render from its own camera first
    if (lo) { show(s.cur); s.cur.update(f); stage.setCamera(lo.cam.pos, lo.cam.aim, lo.cam.lens ?? 50); stage.setDof(null);
      ms += stage.render({ grade: s.cur.grade }); s.cur.ov.grabLoupe(stage.renderer.domElement); }
    show(s.cur); s.cur.update(f); ms += stage.render({ prev: s.prev ? 1 - wu : sm ? 1 - sm.u : 0, flash: s.cur.flash(f), grade: s.cur.grade, whip: wp || sw, impact: s.cur.impact(f), blur: wp || sw ? null : s.cur.blur(), t: f / fps });
    cap.draw(f); s.cur.ov.draw(capG, f); return ms;
  }
  window.__motion = f => { const s = at(f), p = at(Math.max(F0, f - 1)); show(s.cur); const m = s.cur.motion(f); return { ...m, cut: !!s.prev || p.cur !== s.cur || !!p.prev || s.cur.flash(f) > 0.3 || m.shotCut }; };   // dissolves, act cuts, flash cuts, shot cuts
  window.__vis = (f, items) => { const s = at(f); show(s.cur); return s.cur.vis(f, items); };
  window.__dbg = f => {
    const s = at(f); show(s.cur); const out = s.cur.dbg(f); out.act = s.cur.name; out.mix = s.prev ? +s.u.toFixed(2) : null;
    const cb = cap.boxAt(f); out.text = [...s.cur.ov.boxes(f, capG), ...(cb ? [{ kind: 'caption', ...cb }] : [])];
    for (const A of acts) for (const a of A.actors) if (!out.actors[a.name]) out.actors[a.name] = { blink: 0, head: [0, 0, 0, 0], inFrame: false, verb: [] };
    return JSON.stringify(out);
  };
  // sound from the picture: every act's cues while that act is on screen, renamed to the sound bank
  window.__cues = () => {
    const out = []; let step = 0;
    for (const A of acts) for (const q of A.cues) {
      const s = at(q.fr); if (s.cur !== A && s.prev !== A) continue;
      if (q.fr > F1 - 2) continue;
      let name = SOUND[q.name] || q.name;
      if (name === 'step') { const hero = A.R.steps === 'all' || !q.who || q.who === 'kai' || A.actors.some(x => x.name === q.who && x.c.lead); if (q.strength < 0.2 || !hero) continue; name = step++ % 2 ? 'step_r' : 'step_l'; }   // the leads' feet only (act steps: 'all' = every walker's feet)
      if (!BANK.has(name)) continue;
      out.push({ t: +(q.fr / fps).toFixed(4), name, strength: +Math.min(1, Math.max(0.55, 0.55 + 0.6 * q.strength)).toFixed(2) });
    }
    return out.sort((a, b) => a.t - b.t);
  };
  window.__T_END = (F1 + 1) / fps;
  window.__F = [F0, F1];
  window.__frame = f => frame(f);
  frame(F0);
  window.__ready = true;
  return { R: R1, fps, F0, F1, stage, captions: cap, audio: `/${film}/vo/vo.wav` };
}
