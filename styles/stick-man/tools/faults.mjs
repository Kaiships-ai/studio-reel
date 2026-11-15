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
