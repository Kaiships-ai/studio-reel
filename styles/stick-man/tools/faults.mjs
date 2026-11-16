// The per-actor faults of a stick-man film report (shot.mjs --report), from its __dbg rows, kept apart from the
// browser so a test can judge rows without a render.
// A fault fails the shot only where the shot's camera sees it (Kai, Hot Money ep01 SH245: a hand 40 cm off its target
// behind the counter failed the shot, nobody could see it, and the actor was moved to please the check). faultList()
// names every fault frame with the points that show it; the page tags each 'in' / 'occluded' / 'off' (engine/visible.js,
// window.__vis) from the camera of that render, so a new camera judges again. Hidden faults stay in the report as "ẩn"
// with their numbers. Rows judged without a camera count every fault as seen. The library gate (motionlib.mjs) has no
// film camera and judges every fault in 3D.
import { jointSteps, JOINT_STEP_MAX, stepPoints } from './jointstep.mjs';

export const compress = list => {
  const o = []; for (let i = 0; i < list.length; i++) { let j = i; while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++; o.push(i === j ? `${list[i]}` : `${list[i]}-${list[j]}`); i = j; }
  return o.join(', ');
};

// Acting numbers for one actor from __dbg rows (frames where it is in frame, cut frames left out):
// frozen = longest DEAD run: every joint within 1 mm and every angle within 0.3 deg of where the run began (a hold that
// breathes is alive: the old test, 2 mm / 0.5 deg against the frame before, called a breathing hold frozen and so pushed
// the kit toward constant fidget, while reference holds last up to 86 f - FORENSIC.md section 3, fix 14);
// ratio = (shoulder-elbow + elbow-hand) / rest arm length.
export const GRIP_CM = 2, PROP_CM = 1;                                  // (h) a gripping hand off its target, (i) a held prop in the body
const JOINTS = ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'hand'], ANG = ['kneeFlex', 'elbowFlex', 'footPitch'], ARM = 2 * 0.5125 * 0.60;   // rest arm length (m) = 2 x cast.js LIMB.upper x W_M
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function acting(rows, n) {
  let run = 1, frozen = 0, frozenAt = null, ratio = 0, ratioAt = null, anchor = null;
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i].actors[n], l = a.limbs; if (!a.inFrame || !l) { run = 1; continue; }
    for (const s of ['L', 'R']) { const q = (dist(l[s].shoulder, l[s].elbow) + dist(l[s].elbow, l[s].hand)) / ARM; if (q > ratio) { ratio = q; ratioAt = rows[i].f; } }
    const p = rows[i - 1]?.actors[n];
    // a sleeping face is meant to be still: it never counts toward a frozen run
    if (!p || !p.inFrame || !p.limbs || rows[i].motion.cut || rows[i].act !== rows[i - 1].act || a.expr === 'sleep') { run = 1; anchor = a; continue; }
    const q = (anchor || p).limbs, qa = anchor || p;
    let moved = dist(a.headW, qa.headW) > 0.001 || Math.abs(l.torsoLean - q.torsoLean) > 0.3 || Math.abs(l.torsoRoll - q.torsoRoll) > 0.3;
    for (const s of ['L', 'R']) {
      for (const j of JOINTS) if (dist(l[s][j], q[s][j]) > 0.001) moved = true;
      for (const k of ANG) if (Math.abs(l[s][k] - q[s][k]) > 0.3) moved = true;
    }
    if (moved) { run = 1; anchor = a; } else run++;
    if (run > frozen) { frozen = run; frozenAt = rows[i].f; }
  }
  return { frozen: frozen > 1 ? frozen : 0, frozenAt, ratio, ratioAt };
}

// the frame pairs a joint step is measured on: both posed, one act, no cut, not asleep
const stepPairs = (rows, n) => rows.flatMap((r, i) => { const a = r.actors[n], p = rows[i - 1]?.actors[n];
  return a.limbs && p?.limbs && !r.motion.cut && r.act === rows[i - 1].act && a.expr !== 'sleep' ? [[r.f, p.limbs, a.limbs]] : []; });

// Every fault frame of the rows: { f, actor, kind: 'h' | 'i' | 'j', key, d, pts }.
//   h  a gripping hand off its target: key L/R, d cm; pts the hand, its target and what it holds
//   i  a held prop in the body: d cm; pts the prop's box
//   j  a joint over JOINT_STEP_MAX in one frame: key the channel, d deg; pts the joints and bones it moves, where they were
//      and where they went (a limb that drops behind the counter in the pop is seen leaving)
export function faultList(rows) {
  const out = [];
  for (const n of Object.keys(rows[0].actors)) {
    for (const r of rows) {
      const l = r.actors[n].limbs; if (!l || r.motion.cut) continue;
      for (const s of ['L', 'R']) if (l[s]?.grip && l[s].targetGapCm > GRIP_CM) out.push({ f: r.f, actor: n, kind: 'h', key: s, d: l[s].targetGapCm, pts: [l[s].hand, ...(l[s].target ? [l[s].target] : []), ...(l[s].heldPts || [])] });
      if (l.propPenCm > PROP_CM) out.push({ f: r.f, actor: n, kind: 'i', key: l.propIn || 'prop', d: l.propPenCm, pts: l.propPts || [l.L.hand, l.R.hand] });
    }
    for (const [f, m, l] of stepPairs(rows, n)) for (const [k, d] of jointSteps(m, l)) if (d > JOINT_STEP_MAX) out.push({ f, actor: n, kind: 'j', key: k, d, pts: [...stepPoints(k, m), ...stepPoints(k, l)] });
  }
  return out;
}
// the faults the camera cannot see: "actor f kind key" -> 'occluded' | 'off' (vis[i] is faults[i]'s state)
export const hiddenOf = (faults, vis) => new Map(faults.flatMap((x, i) => (vis?.[i] && vis[i] !== 'in' ? [[`${x.actor} ${x.f} ${x.kind} ${x.key}`, { ...x, vis: vis[i] }]] : [])));
const hiddenText = (list, fmt) => {
  if (!list.length) return null;
  const by = v => compress([...new Set(list.filter(x => x.vis === v).map(x => x.f))]) || 'none', w = list.reduce((a, b) => (b.d > a.d ? b : a));
  return `ẩn (the camera does not see it, not judged): occluded ${by('occluded')}; off frame ${by('off')}; worst ${fmt(w)}`;
};

// One-frame joint change for one actor, faults the camera does not see left out: jump = the largest, top = the five
// worst frames (fixing one pop otherwise reveals the next), over = frames over JOINT_STEP_MAX, hidden = the line of the
// faults left out (null when none)
export function joints(rows, n, hidden = new Map()) {
  let jump = 0, jumpAt = null; const per = [], gone = [];
  for (const [f, m, l] of stepPairs(rows, n)) {
    const chg = jointSteps(m, l).filter(([k]) => { const h = hidden.get(`${n} ${f} j ${k}`); if (h) { gone.push(h); return false; } return true; });
    for (const [k, d] of chg) if (d > jump) { jump = d; jumpAt = `frame ${f}, ${k}`; }
    const w = chg.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]); per.push({ f, k: w[0], d: w[1] });
  }
  const top = [...per].sort((a, b) => b.d - a.d).slice(0, 5), over = per.filter(x => x.d > JOINT_STEP_MAX).map(x => x.f);
  return { jump, jumpAt, top, over, hidden: hiddenText(gone, x => `${x.d.toFixed(1)} deg (frame ${x.f}, ${x.key})`) };
}

// (h) and (i): the report lines for every actor in the rows; a fault in `hidden` (hiddenOf) is listed, not judged
export function holdLines(rows, hidden = new Map()) {
  const L = [];
  // (h) a hand that grips (an ik target, a held prop) stays on its target: the solver's distance from where the hand was
  // keyed (rig K4); (i) a held prop inside a leg, the trunk or the head, before and after the solve (rig K5)
  L.push(`(h) hand off its target while it grips (ik / held prop), max cm where the camera sees it (FAIL > ${GRIP_CM}):`);
  L.push(`(i) held prop inside the body (legs, trunk, head), max cm before / after the solve, after where the camera sees it (FAIL > ${PROP_CM} after):`);
  const hi = L.length - 1; let hk = 0;
  for (const n of Object.keys(rows[0].actors)) {
    let g = 0, gAt = null, gN = 0, p0 = 0, p1 = 0, pAt = null, kg = 0, bal = 0; const over = [], pOver = [], hG = [], hP = [];
    const gone = (f, kind, key) => hidden.get(`${n} ${f} ${kind} ${key}`);
    for (const r of rows) {
      const l = r.actors[n].limbs; if (!l || r.motion.cut) continue;
      for (const s of ['L', 'R']) if (l[s]?.grip) { const d = l[s].targetGapCm || 0, h = gone(r.f, 'h', s); if (h) { hG.push(h); continue; }
        gN++; if (d > g) { g = d; gAt = `${r.f} ${s}`; } if (d > GRIP_CM) over.push(r.f); }
      if (l.propPenCm0 > p0) p0 = l.propPenCm0;
      const h = l.propPenCm > PROP_CM && gone(r.f, 'i', l.propIn || 'prop');
      if (h) hP.push(h); else { if (l.propPenCm > p1) { p1 = l.propPenCm; pAt = r.f; } if (l.propPenCm > PROP_CM) pOver.push(r.f); }
      kg = Math.max(kg, l.carryKg || 0); bal = Math.max(bal, l.balanceCm || 0);
    }
    const hgT = hiddenText(hG, x => `${x.d.toFixed(2)} cm (frame ${x.f} ${x.key})`), hpT = hiddenText(hP, x => `${x.d.toFixed(2)} cm (frame ${x.f})`);
    L.splice(hi + hk++, 0, `    ${n}: ${g.toFixed(2)} cm${gAt ? ' (frame ' + gAt + ')' : ''} over ${gN} grip hand-frames; frames over ${GRIP_CM} cm: ${compress([...new Set(over)]) || 'none'}  ${over.length ? 'FAIL' : 'PASS'}`,
      ...(hgT ? [`      ${hgT}`] : []));
    if (hgT) hk++;
    L.push(`    ${n}: before ${p0.toFixed(2)} cm, after ${p1.toFixed(2)} cm${pAt != null ? ' (frame ' + pAt + ')' : ''}; carried up to ${kg.toFixed(1)} kg, balance shift up to ${bal.toFixed(2)} cm  ${pOver.length ? 'FAIL' : 'PASS'}`,
      ...(hpT ? [`      ${hpT}`] : []));
  }
  return L;
}

// ---------------------------------------------------------------- faces (films/hm-ep01-r2/review/face-research.md s. 8)
// Judged on the drawn face numbers of __dbg (`face`: v = [brow tilt deg, brow height W, lid, white, eye ry W, mouth
// width] before the blink, tgt = the same for the target expression, cls / kf / phase of the change on screen, blink
// 0..1, pupil (the eyes' lead on a head turn), look (the head's turn), focus). Each number is scaled by FACE_NORM.
export const FACE_NORM = [30, 0.1, 1, 1, 0.07, 1];
export const FACE_POP_BACK = 0.05;          // a pop: one frame moves a feature away from its target by more than this, before 80 % of the change
export const FACE_POP_STEP = 0.35;          // or carries more than 35 % of a feature's whole change in one frame (a take's accent may)
export const FACE_RISE_MIN = 6;             // a normal / slow change rises 10 % -> 90 % in >= 6 f
export const FACE_HOLD_MIN = 6;             // a change reaches 90 % and holds >= 6 f before the next one starts (rule 4)
export const FACE_CHANGES_10S = [2, 6];     // changes per 10 s on screen (the floor is judged over >= 10 s in frame)
export const FACE_TAKES_MIN = 4, FACE_TAKES_10S = 1;   // take onsets per 60 s, per 10 s, per actor
export const FACE_BLINKS_MIN = [12, 30];    // blinks per minute in frame (judged over >= 10 s in frame)
export const FACE_EYE_LEAD = [0, 3];        // head onset minus pupil onset on a focus change, frames
const ANTIC_FEAT = new Set([1, 2, 5]);   // brow height, lid, mouth width
const FACE_FEAT = ['brow tilt', 'brow height', 'lid', 'white', 'eye size', 'mouth width'];
const maxIn = (fs, w) => { let m = 0; for (let i = 0, j = 0; i < fs.length; i++) { while (fs[i] - fs[j] >= w) j++; m = Math.max(m, i - j + 1); } return m; };
export function faceFaults(rows, n) {
  const R = rows.filter(r => r.actors[n]?.inFrame && r.actors[n].face), N = R.length, out = { frames: N, pops: [], rises: [], holds: [], antic: [], blinkShape: [], eyeLead: [] };
  const V = r => r.actors[n].face.v.map((x, i) => x / FACE_NORM[i]), T = r => r.actors[n].face.tgt.map((x, i) => x / FACE_NORM[i]);
  const joined = (a, b) => a && b && a.f === b.f - 1 && a.act === b.act && !b.motion?.cut;
  // the changes: runs of rows with one change frame (kf), the start values S = the frame before the run
  const ch = [];
  for (let i = 0; i < N; i++) {
    const fc = R[i].actors[n].face; if (fc.kf == null) continue;
    if (!ch.length || ch[ch.length - 1].kf !== fc.kf) ch.push({ kf: fc.kf, cls: fc.cls, first: R[i].f, i0: i, S: joined(R[i - 1], R[i]) ? V(R[i - 1]) : null, rows: [] });
    ch[ch.length - 1].rows.push(i);
  }
  for (const c of ch) {
    if (c.cls === 'cut' || !c.S) continue;
    const Tg = T(R[c.i0]), D = Tg.map((t, k) => t - c.S[k]), dd = D.reduce((s, x) => s + x * x, 0);
    for (const i of c.rows) {
      if (!joined(R[i - 1], R[i])) continue;
      const a = V(R[i - 1]), b = V(R[i]), ph = R[i].actors[n].face.phase;
      for (let k = 0; k < b.length; k++) {
        const d = b[k] - a[k], p = Math.abs(D[k]) > 0.02 ? (a[k] - c.S[k]) / D[k] : 0;
        // a take's anticipation moves only the brow height, the lid and the mouth width on purpose (away from the
        // target); its accent may carry a big share in one frame, never a step back
        const antic = ph === 'antic' && ANTIC_FEAT.has(k);
        if (!antic && d * (Tg[k] - a[k]) < 0 && Math.abs(d) > FACE_POP_BACK && p < 0.8) out.pops.push({ f: R[i].f, k: FACE_FEAT[k], d: d * FACE_NORM[k], why: 'back' });
        else if (!antic && ph !== 'accent' && Math.abs(D[k]) > 0.1 && Math.abs(d) > FACE_POP_STEP * Math.abs(D[k])) out.pops.push({ f: R[i].f, k: FACE_FEAT[k], d: d * FACE_NORM[k], why: 'step' });
        else if (ph === 'antic' && !ANTIC_FEAT.has(k) && Math.abs(d) > FACE_POP_BACK) out.pops.push({ f: R[i].f, k: FACE_FEAT[k], d: d * FACE_NORM[k], why: 'antic' });
      }
    }
    // progress of the whole face along the change: the projection on S -> where it settles (its first hold frame: the
    // hold drift moves the end a little), or S -> the target when the next change cuts it short
    const hi = c.rows.find(i => R[i].actors[n].face.phase === 'hold'), E = hi != null ? V(R[hi]).map((x, k) => x - c.S[k]) : D;
    const ee = E.reduce((s, x) => s + x * x, 0) || dd;
    const P = i => V(R[i]).reduce((s, x, k) => s + (x - c.S[k]) * E[k], 0) / ee;
    const at = q => { const i = c.rows.find(j => P(j) >= q); return i == null ? null : R[i].f; };
    c.f90 = dd > 0.01 ? at(0.9) : c.first;
    if (dd > 0.01 && (c.cls === 'normal' || c.cls === 'slow')) { const a10 = at(0.1); if (a10 != null && c.f90 != null) out.rises.push({ kf: c.kf, rise: c.f90 - a10 }); }
    if (c.cls === 'take') { const na = c.rows.filter(i => R[i].actors[n].face.phase === 'antic').length; if (na < 3) out.antic.push({ kf: c.kf, frames: na }); }
  }
  for (let j = 0; j + 1 < ch.length; j++) { const c = ch[j]; if (c.cls === 'cut' || !c.S) continue;
    out.holds.push({ kf: c.kf, hold: c.f90 == null ? -(ch[j + 1].first - c.first) : ch[j + 1].first - c.f90 }); }
  const starts = ch.map(c => c.first), takes = ch.filter(c => c.cls === 'take' || c.cls === 'small').map(c => c.kf);
  // every new face counts, one that lands on a cut too (the viewer sees it change)
  out.changes = { n: starts.length, per10: N ? 300 * starts.length / N : 0, max10: maxIn(starts, 300) };
  out.takes = { n: takes.length, max60: maxIn(takes, 1800), max10: maxIn(takes, 300) };
  // blinks: onsets in frame, closing frames (onset to the first full value) against opening frames (judged on blinks seen whole)
  const bl = []; for (let i = 0; i < N; i++) { const b = R[i].actors[n].face.blink, pb = joined(R[i - 1], R[i]) ? R[i - 1].actors[n].face.blink : 0; if (b > 0 && !(pb > 0)) bl.push(i); }
  for (const i of bl) {
    let j = i, top = i; while (j + 1 < N && joined(R[j], R[j + 1]) && R[j + 1].actors[n].face.blink > 0) { j++; if (R[j].actors[n].face.blink > R[top].actors[n].face.blink + 1e-6) top = j; }
    const close = top - i + 1, open = j - top, whole = joined(R[j], R[j + 1]) && !(R[j + 1].actors[n].face.blink > 0); if (whole && close >= open) out.blinkShape.push({ f: R[i].f, close, open });
  }
  out.blinks = { n: bl.length, perMin: N ? 1800 * bl.length / N : 0 };
  // eye lead: on a focus change, the frame the pupils start to lead against the frame the head starts to turn
  for (let i = 1; i < N; i++) {
    const p = R[i - 1].actors[n].face, q = R[i].actors[n].face; if (p.focus == null || p.focus === q.focus || !joined(R[i - 1], R[i])) continue;
    let pe = null, he = null;
    for (let j = i; j < Math.min(N, i + 12); j++) { const x = R[j].actors[n].face; if (pe == null && Math.abs(x.pupil || 0) > 0.05) pe = R[j].f; if (he == null && Math.abs(x.look - p.look) > 0.01) he = R[j].f; }
    if (he != null) out.eyeLead.push({ f: R[i].f, lead: pe == null ? 0 : he - pe });
  }
  const F = [];
  if (out.pops.length) F.push(`pops ${out.pops.length} (frames ${compress([...new Set(out.pops.map(x => x.f))])})`);
  const r = out.rises.filter(x => x.rise < FACE_RISE_MIN); if (r.length) F.push(`rise under ${FACE_RISE_MIN} f: ${r.map(x => `${x.rise} f (key ${x.kf})`).join(', ')}`);
  const h = out.holds.filter(x => x.hold < FACE_HOLD_MIN); if (h.length) F.push(`hold under ${FACE_HOLD_MIN} f: ${h.map(x => `${x.hold} f (key ${x.kf})`).join(', ')}`);
  if (out.changes.max10 > FACE_CHANGES_10S[1]) F.push(`${out.changes.max10} changes in 10 s (max ${FACE_CHANGES_10S[1]})`);
  if (N >= 300 && out.changes.per10 < FACE_CHANGES_10S[0]) F.push(`${out.changes.per10.toFixed(1)} changes per 10 s (min ${FACE_CHANGES_10S[0]})`);
  if (out.takes.max60 > FACE_TAKES_MIN) F.push(`${out.takes.max60} takes in 60 s (max ${FACE_TAKES_MIN})`);
  if (out.takes.max10 > FACE_TAKES_10S) F.push(`${out.takes.max10} takes in 10 s (max ${FACE_TAKES_10S})`);
  if (out.antic.length) F.push(`take without anticipation: ${out.antic.map(x => 'key ' + x.kf).join(', ')}`);
  if (N >= 300 && (out.blinks.perMin < FACE_BLINKS_MIN[0] || out.blinks.perMin > FACE_BLINKS_MIN[1])) F.push(`${out.blinks.perMin.toFixed(1)} blinks a minute (${FACE_BLINKS_MIN.join('-')})`);
  if (out.blinkShape.length) F.push(`blinks that do not close faster than they open: ${out.blinkShape.map(x => `${x.close}/${x.open} f (frame ${x.f})`).join(', ')}`);
  const el = out.eyeLead.filter(x => x.lead < FACE_EYE_LEAD[0] || x.lead > FACE_EYE_LEAD[1]); if (el.length) F.push(`eye lead out of ${FACE_EYE_LEAD.join('..')} f: ${el.map(x => `${x.lead} f (frame ${x.f})`).join(', ')}`);
  out.faults = F;
  return out;
}
// the report lines for one actor (shot.mjs --report; gates.mjs reads "face: pops" and "face faults")
export function faceLines(rows, n) {
  const x = faceFaults(rows, n); if (!x.frames) return [];
  const rmin = x.rises.length ? Math.min(...x.rises.map(r => r.rise)) : null, hmin = x.holds.length ? Math.min(...x.holds.map(h => h.hold)) : null;
  return [`      face: pops ${x.pops.length}; rise min ${rmin ?? '-'} f over ${x.rises.length} changes; hold min ${hmin ?? '-'} f; changes ${x.changes.n} (${x.changes.per10.toFixed(1)} per 10 s, max ${x.changes.max10} in 10 s); takes ${x.takes.n} (max ${x.takes.max60} in 60 s, ${x.takes.max10} in 10 s); blinks ${x.blinks.n} (${x.blinks.perMin.toFixed(1)} a minute); eye lead ${x.eyeLead.map(e => e.lead).join(' ') || '-'} f; over ${x.frames} frames in frame`,
    `      face faults: ${x.faults.join('; ') || 'none'}`];
}

// The hoodie's cords (allout/hoodie.js, __dbg actors[n].cord: each cord's drawn tip against its top, root-local m). A cord
// that swings changes its acceleration smoothly; a jittering one pushes back and forth, so consecutive accelerations point
// opposite ways. shake = at each frame where they oppose, the smaller of the two (m/frame^2); a frame the cords do not carry
// on from the last (the hoodie starts fresh, another act, a skipped frame) breaks the run; a camera cut does not (the
// numbers are root-local, the same under any camera). Kai 17/11 (Hot Money ep01 r2 s4: "the cords jitter"): before the
// fix the motion-lib carry walk, walk and turn read 0.20-0.37 (a period-2 flip) and s4's carry walk 0.09 median; after,
// <= 0.0135 and 0.0004. A free swing reads ~0.01. The limit marks report frames to look at; it is not a gate yet.
export const CORD_SHAKE_MAX = 0.015;
// seq: [x, y, z] per frame (null: none); start[i]: frame i does not follow frame i - 1. Returns the shake per frame (0: none)
export function shakeOf(seq, start = []) {
  const out = seq.map(() => 0); let run = 0, a1 = null;
  for (let i = 0; i < seq.length; i++) {
    if (!seq[i] || start[i]) { run = 0; a1 = null; }
    if (!seq[i]) continue;
    if (++run < 3) continue;
    const p = seq[i], q = seq[i - 1], r = seq[i - 2], a = [0, 1, 2].map(k => p[k] - 2 * q[k] + r[k]);
    if (a1 && a[0] * a1[0] + a[1] * a1[1] + a[2] * a1[2] < 0) out[i] = Math.min(Math.hypot(...a), Math.hypot(...a1));
    a1 = a;
  }
  return out;
}
export function cordShake(rows, n) {
  const cords = rows.find(r => r.actors[n]?.cord)?.actors[n].cord.tips.length || 0; if (!cords) return null;
  const start = rows.map((r, i) => !!(r.actors[n]?.cord?.fresh || (i && (r.act !== rows[i - 1].act || r.f !== rows[i - 1].f + 1))));
  const per = rows.map(() => 0);
  for (let c = 0; c < cords; c++) shakeOf(rows.map(r => r.actors[n]?.cord?.tips[c] || null), start).forEach((v, i) => { per[i] = Math.max(per[i], v); });
  let max = 0, at = null; per.forEach((v, i) => { if (v > max) { max = v; at = rows[i].f; } });
  return { max, at, over: rows.filter((r, i) => per[i] > CORD_SHAKE_MAX).map(r => r.f), frames: rows.filter(r => r.actors[n]?.cord).length };
}
// the report line for one actor (shot.mjs --report)
export function cordLines(rows, n) {
  const x = cordShake(rows, n); if (!x) return [];
  return [`      cords: shake max ${x.max.toFixed(4)} m/frame^2${x.at != null ? ' (frame ' + x.at + ')' : ''} over ${x.frames} frames; frames over ${CORD_SHAKE_MAX}: ${compress(x.over) || 'none'}`];
}

// The report's camera numbers (shot.mjs --report (b)) from each row's motion.cam (px/frame at 720 wide): a cut frame (a
// dissolve, an act cut, a flash cut, a shot cut) is an edit, not camera motion, and is left out, as is a frame without a
// number. best / bestAt: the longest run under 0.01 px/frame and where it ends; peak / peakAt / median: null when no frame
// has a camera number (a film directed one shot per frame: every frame is a cut; Hot Money ep01 r2 crashed the report)
export function camStats(rows) {
  const camPx = rows.map(r => (r.motion?.cut || !Number.isFinite(r.motion?.cam) ? NaN : r.motion.cam));
  let run0 = 0, best = 0, bestAt = 0;
  camPx.forEach((v, i) => { if (i === 0 || Number.isNaN(v)) return; if (v < 0.01) { run0++; if (run0 > best) { best = run0; bestAt = rows[i].f; } } else run0 = 0; });
  const live = camPx.slice(1).filter(x => !Number.isNaN(x)), peak = live.length ? Math.max(...live) : null;
  return { best, bestAt, peak, peakAt: peak == null ? null : rows[camPx.indexOf(peak, 1)].f, median: live.length ? [...live].sort((a, b) => a - b)[live.length >> 1] : null,
    fast: rows.filter((r, i) => i > 0 && camPx[i] > 25).map(r => r.f), cuts: rows.filter(r => r.motion?.cut).map(r => r.f) };
}
