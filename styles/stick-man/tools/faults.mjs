// The per-actor faults of a stick-man film report (shot.mjs --report), from its __dbg rows, kept apart from the
// browser so a test can judge rows without a render.
import { jointSteps, JOINT_STEP_MAX } from './jointstep.mjs';

export const compress = list => {
  const o = []; for (let i = 0; i < list.length; i++) { let j = i; while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++; o.push(i === j ? `${list[i]}` : `${list[i]}-${list[j]}`); i = j; }
  return o.join(', ');
};

// Acting numbers for one actor from __dbg rows (frames where it is in frame, cut frames left out):
// frozen = longest DEAD run: every joint within 1 mm and every angle within 0.3 deg of where the run began (a hold that
// breathes is alive: the old test, 2 mm / 0.5 deg against the frame before, called a breathing hold frozen and so pushed
// the kit toward constant fidget, while reference holds last up to 86 f - FORENSIC.md section 3, fix 14);
// ratio = (shoulder-elbow + elbow-hand) / rest arm length; jump = largest one-frame change of a flex, a foot pitch,
// the torso lean or roll, or a limb segment's direction (deg).
export const GRIP_CM = 2, PROP_CM = 1;                                  // (h) a gripping hand off its target, (i) a held prop in the body
const JOINTS = ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'hand'], ANG = ['kneeFlex', 'elbowFlex', 'footPitch'], ARM = 2 * 0.5125 * 0.60;   // rest arm length (m) = 2 x cast.js LIMB.upper x W_M
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function acting(rows, n) {
  let run = 1, frozen = 0, frozenAt = null, ratio = 0, ratioAt = null, jump = 0, jumpAt = null, anchor = null; const per = [];   // per = worst joint change of each frame
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i].actors[n], l = a.limbs; if (!a.inFrame || !l) { run = 1; continue; }
    for (const s of ['L', 'R']) { const q = (dist(l[s].shoulder, l[s].elbow) + dist(l[s].elbow, l[s].hand)) / ARM; if (q > ratio) { ratio = q; ratioAt = rows[i].f; } }
    const p = rows[i - 1]?.actors[n];
    // a sleeping face is meant to be still: it never counts toward a frozen run
    if (!p || !p.inFrame || !p.limbs || rows[i].motion.cut || rows[i].act !== rows[i - 1].act || a.expr === 'sleep') { run = 1; anchor = a; continue; }
    const m = p.limbs, q = (anchor || p).limbs, qa = anchor || p;
    let moved = dist(a.headW, qa.headW) > 0.001 || Math.abs(l.torsoLean - q.torsoLean) > 0.3 || Math.abs(l.torsoRoll - q.torsoRoll) > 0.3;
    const chg = jointSteps(m, l);
    for (const s of ['L', 'R']) {
      for (const j of JOINTS) if (dist(l[s][j], q[s][j]) > 0.001) moved = true;
      for (const k of ANG) if (Math.abs(l[s][k] - q[s][k]) > 0.3) moved = true;
    }
    for (const [k, d] of chg) if (d > jump) { jump = d; jumpAt = `frame ${rows[i].f}, ${k}`; }
    const w = chg.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]); per.push({ f: rows[i].f, k: w[0], d: w[1] });
    if (moved) { run = 1; anchor = a; } else run++;
    if (run > frozen) { frozen = run; frozenAt = rows[i].f; }
  }
  // the five worst frames (not only the max: fixing one pop otherwise reveals the next) and how many frames are over 25 deg
  const top = [...per].sort((a, b) => b.d - a.d).slice(0, 5), over = per.filter(x => x.d > JOINT_STEP_MAX).map(x => x.f);
  return { frozen: frozen > 1 ? frozen : 0, frozenAt, ratio, ratioAt, jump, jumpAt, top, over };
}

// (h) and (i): the report lines for every actor in the rows
export function holdLines(rows) {
  const L = [];
  // (h) a hand that grips (an ik target, a held prop) stays on its target: the solver's distance from where the hand was
  // keyed (rig K4); (i) a held prop inside a leg, the trunk or the head, before and after the solve (rig K5)
  L.push(`(h) hand off its target while it grips (ik / held prop), max cm (FAIL > ${GRIP_CM}):`);
  L.push(`(i) held prop inside the body (legs, trunk, head), max cm before / after the solve (FAIL > ${PROP_CM} after):`);
  const hi = L.length - 1; let hk = 0;
  for (const n of Object.keys(rows[0].actors)) {
    let g = 0, gAt = null, gN = 0, p0 = 0, p1 = 0, pAt = null, kg = 0, bal = 0; const over = [], pOver = [];
    for (const r of rows) {
      const a = r.actors[n], l = a.limbs; if (!a.inFrame || !l || r.motion.cut) continue;
      for (const s of ['L', 'R']) if (l[s]?.grip) { gN++; const d = l[s].targetGapCm || 0; if (d > g) { g = d; gAt = `${r.f} ${s}`; } if (d > GRIP_CM) over.push(r.f); }
      if (l.propPenCm0 > p0) p0 = l.propPenCm0; if (l.propPenCm > p1) { p1 = l.propPenCm; pAt = r.f; } if (l.propPenCm > PROP_CM) pOver.push(r.f);
      kg = Math.max(kg, l.carryKg || 0); bal = Math.max(bal, l.balanceCm || 0);
    }
    L.splice(hi + hk++, 0, `    ${n}: ${g.toFixed(2)} cm${gAt ? ' (frame ' + gAt + ')' : ''} over ${gN} grip hand-frames; frames over ${GRIP_CM} cm: ${compress([...new Set(over)]) || 'none'}  ${over.length ? 'FAIL' : 'PASS'}`);
    L.push(`    ${n}: before ${p0.toFixed(2)} cm, after ${p1.toFixed(2)} cm${pAt != null ? ' (frame ' + pAt + ')' : ''}; carried up to ${kg.toFixed(1)} kg, balance shift up to ${bal.toFixed(2)} cm  ${pOver.length ? 'FAIL' : 'PASS'}`);
  }
  return L;
}
