// The fits table's rows that are not clips (fits.mjs --kinds), each measured with the frozen limits of kit/compat-limits.json.
//   face|<age>|<body>         the face of that age on its own body: pass when the age is on Kai's approved sheet (limits.face.approved)
//                             and eyegate passes; an age that waits for Kai's face sheet at S2 (limits.face.waits) is blocked; another body: no row (untested)
//   outfit|<garment>|<body>   the garment alone on the body, by trims() of test/unit/wardrobe-measure.mjs: no piece floats, a ring's gap
//                             under limits.outfit.ring_mm, a piece moves at most limits.outfit.TRIM_MM on the shell as it bends
//   mark|bold:<mark>|<hat>    the share of the bold mark's card a wardrobe hat hides, front and 24 deg round (stick-wardrobe-age.test.mjs);
//                             over limits.mark.cover (0) is blocked
//   hand|<prop>|<body>|hand   the prop held in every pose a film holds it in (HAND_POSES), each frame each fist's drawn edge to the
//                             prop's drawn surface (engine/grip.js), worst frame over GAP_CM (handgrip.limits.json) is blocked; seat and light: no row (untested)
//   hair|<style>|adult/g<n>|<clip>  a shipped toon hair style through an adult clip at a girth of GIRTHS (test/unit/hair-measure.mjs sweepAll, every frame,
//                             worn over the layer standing furthest off the neck and shoulders, worstLayer()):
//                             its drawn surface deepest in the torso shell or a limb, over HAIR_IN_MM (4, frozen 26/11) is blocked;
//                             stick-hair-body*.test.mjs fails when a row is not what it measures now (either way)
import * as THREE from 'three';
import { pair, SHAPES, FACE_BODIES } from '#kit/cast/compat.js';
import { drawnSolid } from '#kit/props/drawn.js';

import fs from 'node:fs';
// (read here, not from fits.mjs: fits.mjs loads this module while it runs)
const LIMITS = JSON.parse(fs.readFileSync(new URL('../../kit/compat-limits.json', import.meta.url), 'utf8'));
export const OWN = FACE_BODIES;
export const HATS = ['cap:police', 'cap:pilot', 'cap:scrub', 'hat:hard', 'hat:toque'];
const row = (p, kind, verdict, number, unit, bad, why) => ({ pair: p, kind, verdict, number, unit, bad, ...(why ? { why } : {}) });

export async function faces() {
  const { eyegate } = await import('./eyegate.mjs'), E = await eyegate(), low = +(100 * Math.min(...E.rows.filter(r => r.kind === 's2' && r.pupilW != null).map(r => r.pupilW))).toFixed(1), F = LIMITS.face, U = '% pupil of the eye (eyegate, lowest)', rows = [];
  for (const [age, bodies] of Object.entries(OWN)) for (const body of bodies) {
    const p = pair('face', age, body);
    if (!F.approved.includes(age)) rows.push(row(p, 'face', 'blocked', 0, 'approvals by Kai of this face on this body', 0, F.waits.includes(age) ? `the ${age} face on the ${body} body waits for Kai at S2, the face sheet (${F.from})` : `not on Kai's face sheet (${F.from})`));
    else rows.push(E.ok ? row(p, 'face', 'pass', low, U, 0) : row(p, 'face', 'blocked', low, U, 0, 'eyegate fails'));
  }
  return rows;
}

// the garments a body wears as a kit part: every SHAPES layer and its shape words (no colour)
export const garments = () => Object.entries(SHAPES).flatMap(([k, w]) => (k === 'hoodie' || k === 'belt' || k === 'holster' ? [] : [k, ...w.map(x => `${k}:${x}`)])).filter(g => !/^(cap|hat|hat:(cowboy|flat|bowler|top))$/.test(g));
export async function outfits(bodies = ['adult', 'heavy', 'thin', 'elder', 'child'], list = garments()) {
  const M = await import('../../../../test/unit/wardrobe-measure.mjs'), { rigStick } = await import('./motionlib.mjs'), O = LIMITS.outfit, rows = [];
  // a piece that lies on another layer (a tie, a stethoscope, a backpack's straps) is measured over a plain shirt when alone it floats;
  // a shape word that follows a colour ('apron:<colour>:low') is worn in the kit's slate
  const item = g => { const [k, ...w] = g.split(':'); return w.length && !['cap', 'hat', 'shirt', 'coat', 'jacket', 'vest', 'tie', 'badge'].includes(k) ? `${k}:slate:${w.join(':')}` : g; };
  const dress = async (body, list) => { const { S } = await rigStick(body); M.wears(S, list); return S; };
  for (const body of bodies) for (const g of list) {
    const p = pair('outfit', g, body); let t, over = '';
    try {
      let S = await dress(body, [item(g)]); if (!S.wardrobe.group.children.length && !S.wardrobe.drapes?.length && !S.wardrobe.hats?.length) { rows.push(row(p, 'outfit', 'untested', null, null, null, 'nothing drawn')); continue; }
      t = M.trims(S, g); if (t.floats.length && g.split(':')[0] !== 'shirt') { S = await dress(body, ['shirt', item(g)]); t = M.trims(S, g); over = ' (over a plain shirt)'; }
    } catch (e) { rows.push(row(p, 'outfit', 'untested', null, null, null, String(e.message).slice(0, 160))); continue; }
    const worst = Math.max(t.shift.mm, t.gapMax), why = [...t.floats.slice(0, 2), t.ring.mm >= O.ring_mm ? t.ring.what : '', t.shift.mm > O.TRIM_MM ? t.shift.what : ''].filter(Boolean).join(' | ');
    rows.push(why ? row(p, 'outfit', 'blocked', +worst.toFixed(1), `mm, a trim off or moving on the shell${over}`, t.floats.length, why) : row(p, 'outfit', 'pass', +t.shift.mm.toFixed(1), `mm a trim moves on the shell as it bends${over}`, 0));
  }
  return rows;
}

// the share of a bold mark's card (its middle 90 %) a hat hides from the lens, front and 24 deg round
export async function marks(hats = HATS) {
  const { rigStick } = await import('./motionlib.mjs'), M = await import('../../../../test/unit/wardrobe-measure.mjs'), { useHeadMarks, BOLD_MARKS } = await import('#engine/headmarks.js');
  const CAMS = [[0, -4, 1.5], [1.6, -3.6, 1.5]], ray = new THREE.Raycaster(), rows = [], P0 = { pos: [0, 0, 0], yaw: 0, expr: 'neutral' };
  const cards = S => { const l = []; S.parts.marks.traverse(m => { if (m.isMesh && m.visible) l.push(m); }); return l; };
  const hidden = (S, kind) => { let hid = 0, n = 0; const hat = []; for (const h of S.wardrobe?.hats || []) h.traverse(o => { if (o.isMesh) hat.push(o); });
    for (let t = 0; t < 90; t += 12) for (const cam of CAMS) { S.face({ expr: 'neutral', t, age: 60, cam, marks: [[kind, 30]] }); S.root.updateMatrixWorld(true); const C = new THREE.Vector3(cam[0], cam[2], -cam[1]);
      for (const m of cards(S)) for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { if (Math.hypot(i, j) > 3.6) continue; const q = new THREE.Vector3(i / 8, j / 8, 0).applyMatrix4(m.matrixWorld), d = q.distanceTo(C); ray.set(C, q.sub(C).normalize()); ray.far = d - 1e-3; n++; if (ray.intersectObjects(hat, false).length) hid++; } }
    return n ? hid / n : null; };
  useHeadMarks('bold');
  try { for (const h of hats) { const { S } = await rigStick('adult'); M.wears(S, [h]); S.pose2(P0);
    for (const k of BOLD_MARKS) { const x = hidden(S, k), p = pair('mark', `bold:${k}`, h);
      rows.push(x == null ? row(p, 'mark', 'untested', null, null, null, 'no card drawn') : x > LIMITS.mark.cover ? row(p, 'mark', 'blocked', +(100 * x).toFixed(1), '% of the mark under the hat', 0, `the ${h} hides ${(100 * x).toFixed(1)} % of the ${k} mark`) : row(p, 'mark', 'pass', 0, '% of the mark under the hat', 0)); } } }
  finally { useHeadMarks(); }
  return rows;
}

// hand|<prop>|<body>|hand: the prop held in every pose a film holds it in on that body, each frame each holding
// fist's drawn edge to the prop's drawn surface (engine/grip.js, as #208 measures a film), worst frame against GAP_CM (handgrip.limits.json,
// frozen before anything was measured). A clip that holds a prop of its own holds this one in that slot (a film's swap);
// any other clip has it added in the hand. A frame the prop is not fully in the hand (a hand-over) is left out.
const CARRY = ['Idle_CarryBag_Loop', 'Move_CarryBag_Walk_Loop', 'Gest_LookBackCarry_Once'], OLD = ['Idle_Stooped_Loop', 'Idle_Breath_Loop'];
export const HAND_POSES = {
  baby: { adult: CARRY, elder: OLD }, lantern: { adult: CARRY, elder: OLD }, photo: { adult: CARRY, elder: OLD },
  tin: { adult: ['Act_HandOver_Once', 'Idle_Stand_Loop'], elder: OLD },
  balloon: { adult: ['Act_HandOver_Once', 'Idle_Stand_Loop'], elder: OLD, child: ['Move_Walk_Fwd_Loop'] },
  photoPrint: { elder: ['Act_Give_Once'] },
};
export const CONTROL_M = 0.03;   // the off control: the prop 3 cm off the fist on its film pose must fail; touching it must pass
// the nearest point on a prop's drawn triangles to a world point (the same parts engine/grip.js measures: kit/props/drawn.js)
function nearest(prop, c) {
  const P = new THREE.Vector3(), best = new THREE.Vector3(), t = new THREE.Triangle(); let d = Infinity;
  prop.traverseVisible(o => { if (!drawnSolid(o) || !o.geometry.attributes?.position) return;
    const A = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : A.count, ix = k => (I ? I.getX(k) : k);
    for (let k = 0; k + 2 < n; k += 3) { t.a.fromBufferAttribute(A, ix(k)).applyMatrix4(o.matrixWorld); t.b.fromBufferAttribute(A, ix(k + 1)).applyMatrix4(o.matrixWorld); t.c.fromBufferAttribute(A, ix(k + 2)).applyMatrix4(o.matrixWorld);
      t.closestPointToPoint(c, P); const x = P.distanceTo(c); if (x < d) { d = x; best.copy(P); } } });
  return best;
}
// the controls on a held frame: the prop first moved along the fist's line to its nearest drawn point so it touches
// the fist's drawn edge, then out along the line from the fist to the prop's centre to the last place it still
// touches (must pass) and 3 cm past it (must fail); a two-hand prop is moved for the fist farther off it
function controlAt(S, o, fists, gripGap, handRadius) {
  const far = fists.reduce((a, s) => ((gripGap(S.parts.hands[s], o).cm ?? 0) >= (gripGap(S.parts.hands[a], o).cm ?? 0) ? s : a)), h = S.parts.hands[far];
  const c = h.getWorldPosition(new THREE.Vector3()), r = handRadius(h), q = nearest(o, c), u = c.clone().sub(q), d = u.length(); u.normalize();
  const p0 = o.position.clone(), w0 = o.getWorldPosition(new THREE.Vector3());
  const put = w => { o.position.copy(o.parent.worldToLocal(w.clone())); o.updateMatrixWorld(true); return gripGap(h, o).cm; };
  const w1 = w0.clone().addScaledVector(u, d - r); put(w1);
  const v = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).sub(c).normalize();
  let lo = 0, hi = 0.6; while (hi - lo > 0.0005) { const m = (lo + hi) / 2; if (put(w1.clone().addScaledVector(v, m)) > 0) hi = m; else lo = m; }
  const touchCm = put(w1.clone().addScaledVector(v, lo)), offCm = put(w1.clone().addScaledVector(v, lo + CONTROL_M));
  o.position.copy(p0); o.updateMatrixWorld(true);
  return { fist: far, touchCm, offCm };
}
// a clip's prop channels with this prop in the hand: a clip's own prop slot (x_hp<L|R|B>_<kind>) holds it instead (a
// film's swap; the same slot and kind kept, never dropped), any other clip has it added in the right hand (both for a two-hand prop)
export function holdIn(Q, kind, two, own) {
  const o = {}, put = [];
  for (const [k, x] of Object.entries(Q)) { const m = /^x_hp([LRB])_\w+$/.exec(k); if (!m) o[k] = x; else if (own) put.push([`x_hp${two ? 'B' : m[1]}_${kind}`, x]); }
  for (const [k, x] of put) o[k] = x;
  if (!put.length) o[`x_hp${two ? 'B' : 'R'}_${kind}`] = 1;
  return o;
}
export async function hands(props = Object.keys(HAND_POSES)) {
  const M = await import('../../../../test/unit/wardrobe-measure.mjs'), { gripGap, handRadius } = await import('#engine/grip.js'), { GAP_CM } = await import('./handgrip.mjs');
  const { BUILD } = await import('#kit/cast/handprops.js'), { getClip } = await import('#motion-lib/index.js'); await import('#motion-lib/props.js');
  const rows = [], controls = [], U = 'cm, a fist\'s drawn edge off the prop\'s drawn surface (handgrip, worst frame)';
  for (const kind of props) {
    const two = BUILD[kind]().userData.mode === 'both';
    for (const [body, clips] of Object.entries(HAND_POSES[kind])) {
      let worst = 0, at = '', frames = 0, over = 0, ctl = null; const per = {}, p = pair('hand', kind, body, 'hand');
      for (const clip of clips) {
        const own = (getClip(clip, body).needs?.props || []).length > 0;
        const q = Q => holdIn(Q, kind, two, own);
        await M.play([], body, { clip, whole: true }, { q, each: (f, S) => {
          S.root.updateMatrixWorld(true);
          for (const [id, o] of Object.entries(S.props)) {
            if (!o.visible || !id.endsWith(kind) || (S.propState[id]?.w ?? 1) < 0.999) continue;
            const side = id[0], fists = side === 'B' ? ['L', 'R'] : [side], gap = s => gripGap(S.parts.hands[s], o).cm ?? Infinity;
            frames++; const g = Math.max(...fists.map(gap)); per[clip] = Math.max(per[clip] ?? 0, g); if (g > GAP_CM) over++; if (g > worst) { worst = g; at = `${clip} f${f}`; }
            if (!ctl) ctl = { pair: p, pose: `${clip} f${f}`, ...controlAt(S, o, fists, gripGap, handRadius) };   // the film pose: the first clip's first held frame
          } } });
      }
      const n = +worst.toFixed(2), each = `worst per clip: ${Object.entries(per).map(([c, x]) => `${c} ${x.toFixed(2)}`).join(', ')}`;
      rows.push(!frames ? { ...row(p, 'hand', 'untested', null, null, null, 'no frame held it'), frames }
        : n <= GAP_CM ? { ...row(p, 'hand', 'pass', n, U, 0, each), frames } : { ...row(p, 'hand', 'blocked', n, U, over, `${at}: a fist ${n} cm off the prop (limit ${GAP_CM}), ${over} of ${frames} frames over; ${each}`), frames });
      if (ctl) controls.push(ctl);
    }
  }
  return { rows, controls };
}

export const HAIR_UNIT = 'mm of hair into the body (worst frame; -100: nowhere near it)';
// a sweepAll result -> its rows at that girth (the tests compare the table with exactly these). The verdict is taken on the measured
// depth as it is; `number` is it rounded to 0.1 mm for reading, `exact` to 0.001 mm (a 4.04 mm pair is blocked, shown 4.0)
export function hairRows(all, limit, girth = 1) {
  const build = `adult/g${+(+girth).toFixed(3)}`, wear = (all.outfit || ['sweater:coral']).join('+');
  return Object.entries(all).flatMap(([s, per]) => Object.entries(per).map(([clip, x]) => { const p = pair('hair', s, build, clip), raw = Math.max(-100, x.mm), mm = +raw.toFixed(1);
    return { ...(raw > limit ? row(p, 'hair', 'blocked', mm, HAIR_UNIT, 1, `f${x.f}: ${mm} mm into the ${x.what} (worn: ${wear})`) : row(p, 'hair', 'pass', mm, HAIR_UNIT, 0)), exact: +raw.toFixed(3) }; }));
}
export async function hairs(styles, clips, girths) {
  const { rigStick } = await import('./motionlib.mjs'); await rigStick();
  const { HAIR_STYLES } = await import('#kit/cast/hair.js'), M = await import('../../../../test/unit/hair-measure.mjs'), out = [];
  for (const girth of girths || M.GIRTHS) out.push(...hairRows(await M.sweepAll(styles || [...HAIR_STYLES], clips || M.ADULT_CLIPS, { girth }), M.HAIR_IN_MM, girth));
  return out;
}
export async function kinds() { return [...await faces(), ...await marks(), ...await outfits(), ...(await hands()).rows]; }
