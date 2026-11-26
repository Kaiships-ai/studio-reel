// The one kit file a film imports: import { person, place, ... } from '/styles/stick-man/kit/film.js'. Everything it hands out goes
// together by the fits table (kit/cast/compat.js); a pair that is blocked or untested throws here, not in a render.
//   person({ name, body, age, face, outfit, girth, hair, shirt, skin, prop, clips, waivers })
//     body adult | heavy | thin | child | elder · age elder | adult | child ... (left out: the adult face) · face: the face it starts
//     with, or a list of the expressions it plays (engine/expressions.js) · outfit: a costume list · prop: its hand prop(s) · clips
//     -> { name, spec, cast(o), clip(name, key), expression(name, where, o), path(keys), frames(clip) }
//       cast(o)        the act's cast entry (put it under the person's own name): at, yaw, posture, look ... are the film's
//       clip(n, key)   an anim key of this person: the clip and every prop it holds are asked again
//       expression()   the beats of a feeling, its marks asked against the hat worn (the reel sets headMarks: 'bold')
//       path, frames   where its clip keys take it (for faceCam), how long a clip is
//   place(name, { light, props, waivers, collide })   name: a place of the prop catalog ('street' of 'street/bench'); light: the
//     name the fits table knows the set's light by; props: the props this set puts -> { name, COLLIDE, waivers, open(stage, o) }
//       export const COLLIDE = P.COLLIDE;  in build(): const { kit, put } = await P.open(stage, { env, envK, kit, material, parent })
//       material: kit => (src, mesh, name) => THREE.Material (left out: the kit toon), parent: the set's group (left out: kit.root)
//       collide: another place's COLLIDE, when one set takes props of two places
//   a waiver { pair, why, by } lets exactly that pair through. Gates read them back from the cast entry (act.cast[who].waivers),
//   the spec (SPECS[name].waivers), the set's COLLIDE.waivers, and waivers() (all of them, with where)
import { SPECS } from '#engine/play.js';
import { expressionBeats, EXPRESSIONS, marksOf } from '#engine/expressions.js';
import { seatTop, getClip, expandClips } from '#motion-lib/index.js';
import { bodySpec } from '#motion-lib/bodies.js';
import { propSwap } from '#motion-lib/props.js';
import { BUILD } from './cast/handprops.js';
import { expand } from './cast/wardrobe.js';
import { personKey, pair, usable, shapeOf } from './cast/compat.js';
import { propKit, propNames, resolveProp } from './props/catalog.js';
import { createKit } from './sets/kit.js';
import { pathOf } from './camera/flight.js';
import './fx/make.js';

export { flyCam, faceCam, crT, faceAngle } from './camera/flight.js';
export { createKit, room, windowY, SURF, tex, label, rng, B, col, css, envMap } from './sets/kit.js';
export { lightBar } from './fx/lightbar.js';
export { STAND, BREATH, BLOCKING, hold, polishAt } from './acting/keys.js';
export { STYLE_PRESETS } from '#engine/motion.js';
export { solid, lathe, hairCap, curls, W_M, HEAD_H, HAT_LIFT } from '#engine/cast.js';
export { toon, lin, INK_RGB } from '#engine/look.js';
export { bun } from './cast/extras.js';
export { toonHair, HAIR_STYLES } from './cast/hair.js';
export { PALETTES, PALETTE_ORDER, UNIFORM, outfit } from './cast/wardrobe.js';

const list = v => (v == null ? [] : [].concat(v));
const only = (where, o, allowed) => { const odd = Object.keys(o).filter(k => !allowed.includes(k)); if (odd.length) throw new Error(`${where}: no "${odd.join('", "')}" (${allowed.join(', ')})`); };
const never = (where, o, keys, why) => { for (const k of keys) if (k in o) throw new Error(`${where}: "${k}" ${why}`); };

const ALL_WAIVERS = [];
export const waivers = () => ALL_WAIVERS.map(w => ({ ...w }));
function checkWaivers(where, ws) {
  if (!Array.isArray(ws)) throw new Error(`${where}: waivers is a list of { pair, why, by }`);
  for (const w of ws) if (!w?.pair || !w.why || !w.by) throw new Error(`${where}: a waiver needs pair, why, by: ${JSON.stringify(w)}`);
  return Object.freeze(ws.map(w => Object.freeze({ ...w })));
}
const record = (where, ws) => { for (const w of ws) if (!ALL_WAIVERS.some(x => x.where === where && x.pair === w.pair)) ALL_WAIVERS.push({ ...w, where }); };
function must(where, pairs, ws) {
  const bad = [...new Set(pairs)].map(p => [p, usable(p, ws)]).filter(([, u]) => !u.ok);
  if (bad.length) throw new Error(bad.map(([p, { row }]) => `${where}: ${p}: ${row.verdict}${row.number != null ? `, ${row.number} ${row.unit ?? ''}`.trimEnd() : ''}${row.why ? ` (${row.why})` : ''}`).join('\n'));
}

const PERSON = ['name', 'body', 'age', 'face', 'outfit', 'girth', 'hair', 'shirt', 'skin', 'prop', 'clips', 'waivers', 'bald'];
const OURS = new Map();   // name -> its definition: a reel file the tools load twice asks for the same person again
const sits = c => [c.base, c.end].includes('SIT');

export function person(def) {
  const where = `person ${def?.name}`;
  if (!def?.name || typeof def.name !== 'string') throw new Error('person: needs a name');
  only(where, def, PERSON);
  const { name, body = 'adult', age, face, girth, hair = [], bald = false, shirt, skin, waivers: given = [] } = def, outfit = list(def.outfit), props = list(def.prop), clips = list(def.clips), faces = list(face);
  const sig = JSON.stringify({ ...def, hair: hair.length });
  if (name in SPECS && OURS.get(name) !== sig) throw new Error(`${where}: the name is taken (${OURS.has(name) ? 'another person of this film' : "the kit's own"})`);
  const ws = checkWaivers(where, given), key = personKey({ body, girth, outfit }), worn = expand(outfit).map(shapeOf), hats = worn.filter(g => /^(cap|hat):/.test(g));
  const hoodie = worn.find(g => g.startsWith('hoodie')); if (hoodie) throw new Error(`${where}: ${hoodie} is not a wardrobe layer (kit/cast/hoodie.js loads its own cloth model; film.js does not)`);

  const seatsUsed = new Map();   // a seat the film names (clip key `seat`) -> the first clip that sat on it
  const pClip = n => pair('clip', key, n);
  const pMarks = ms => hats.flatMap(h => list(ms).map(m => pair('mark', `bold:${m}`, h)));
  const pHand = (kinds, seated) => kinds.flatMap(k => { if (!BUILD[k]) throw new Error(`${where}: no hand prop "${k}" (${Object.keys(BUILD).join(', ')})`); return ['hand', ...(seated ? ['seat'] : [])].map(at => pair('hand', k, body, at)); });

  const recs = clips.map(n => getClip(n, body));
  must(where, [pair('face', age ?? 'adult', body), ...worn.map(g => pair('outfit', g, body)), ...clips.map(pClip),
    ...faces.flatMap(f => (EXPRESSIONS[f] ? pMarks(marksOf(EXPRESSIONS[f])) : [])), ...pHand(props, recs.some(sits))], ws);

  const spec = Object.freeze({ ...bodySpec({ name, hair, ...(shirt ? { shirt } : {}), ...(skin ? { skin } : {}), ...(age ? { faceAge: age } : {}) }, body), ...(girth != null ? { girth } : {}),
    ...(outfit.length ? { costume: Object.freeze([...outfit]) } : {}),
    // every person reads with hair (Kai 24/11): no hair, no cap or hat and no `bald: true` is a fits.mjs problem, not a throw (old films still load)
    ...(bald ? { bald: true } : !hair.length && !hats.length ? { noHair: true } : {}), waivers: ws });
  SPECS[name] = spec; OURS.set(name, sig); record(where, ws);

  return Object.freeze({ name, spec,
    cast(o = {}) {
      never(`${where}: cast`, o, ['spec', 'costume', 'clips', 'waivers'], 'comes from person()');
      return { ...(faces.length ? { expr: EXPRESSIONS[faces[0]]?.face ?? faces[0] } : {}), ...o, spec: name, clips: [...clips], waivers: [...ws] };
    },
    clip(n, { seat, ...k } = {}) {
      never(`${where}: clip ${n}`, k, ['clip', 'body'], 'comes from person()');
      if (!Number.isFinite(k.f)) throw new Error(`${where}: clip ${n}: f (the frame it starts on) is missing`);
      const c = getClip(n, body), swap = propSwap(k.swap), held = [...(c.needs?.props || []).map(p => swap[p] ?? p), ...Object.values(k.props || {}).filter(Boolean), ...Object.keys(k).flatMap(x => /^x_hp[LRBH]_(\w+)$/.exec(x)?.[1] ?? [])];
      must(where, [pClip(n), ...pHand(held, sits(c))], ws);
      const top = seat != null ? seatTop(c) : null;   // `seat`: the film's name for the seat this clip sits on (not an engine key)
      if (top != null) { const was = seatsUsed.get(seat); if (!was) seatsUsed.set(seat, { clip: n, top }); else if (Math.abs(was.top - top) > 0.02) throw new Error(`${where}: seat "${seat}" is used by ${was.clip} (seat ${was.top.toFixed(3)} m) and ${n} (seat ${top.toFixed(3)} m): clips on one seat are within 2 cm of each other; use them in separate shots`); }
      return { ...k, ...(k.swap ? { swap } : {}), clip: n, body };
    },
    expression(n, at, { who = name, ...o } = {}) {
      const beats = expressionBeats(n, at, who, o);
      must(where, pMarks(beats.flatMap(b => (b.mark ? [list(b.mark)[0]] : []))), ws);
      return beats;
    },
    path: (keys, from = {}) => pathOf(expandClips(keys, from)),
    frames: n => getClip(n, body).frames,
  });
}

const PLACES = () => [...new Set(propNames().map(n => n.split('/')[0]))];
export function place(name, o = {}) {
  const where = `place ${name}`;
  if (!PLACES().includes(name)) throw new Error(`place: no place "${name}" (${PLACES().join(', ')})`);
  only(where, o, ['light', 'props', 'waivers', 'collide']);
  const { light, collide: COLLIDE = [] } = o, props = list(o.props);
  if (!light) throw new Error(`${where}: which light? (the name the fits table knows the set's light by)`);
  const ws = checkWaivers(where, o.waivers ?? []);
  for (const p of props) { resolveProp(p); if (!p.startsWith(name + '/')) throw new Error(`${where}: ${p} is not in ${name}`); }
  must(where, props.map(p => pair('light', p, light)), ws);
  if (!COLLIDE.waivers) Object.defineProperty(COLLIDE, 'waivers', { value: [], enumerable: false });
  COLLIDE.waivers.push(...ws); record(where, ws);
  return Object.freeze({ name, COLLIDE, waivers: ws,
    async open(stage, { env, envK, kit = createKit(stage, { env, envK }), material = null, parent = kit.root } = {}) {
      const P = propKit(stage, COLLIDE), mat = material?.(kit) ?? null; await P.load(props);
      return { kit, COLLIDE,
        put(p, at, deg = 0, opt = {}) {
          never(`${where}: put ${p}`, opt, ['material', 'parent'], "is the set's own (open)");
          if (!props.includes(p)) throw new Error(`${where}: ${p} is not in this set's props (${props.join(', ')})`);
          return P.place(p, at, deg, { ...opt, material: mat, parent });
        } };
    } });
}
