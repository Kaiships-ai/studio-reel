// Auto shot planner: a storyboard line that names no shot (or `shot: "auto"`) gets one from its role, with no repeats.
// Pure data in, shot specs out (the same shape as an act's `shots`), so it runs in node tests and in the page.
// Roles (storyboard `role`, else guessed from the line): hook, setup, fact / number, compare, reaction, twist, panic,
// explain, payoff.
// A line over ~2.6 s gets a second shot on its key word (`on` / `still`), so the reel cuts every 1.5-3 s like the reference;
// a small-figure shot (est, aerial, top) always hands over within 40 frames (GATES.md small-figure run <= 45 f).

export const ROLE_SHOTS = {
  hook: ['aerial', 'est'],
  setup: ['profile', 'low', 'ots', 'two'],
  fact: ['macro', 'top'], number: ['macro', 'top'],
  reaction: ['punch', 'dutch', 'cu'],
  compare: ['top', 'profile', 'two'],
  twist: ['punch', 'dutch', 'low'],
  panic: ['dutch', 'punch'],
  explain: ['low', 'ots', 'profile', 'top', 'est', 'ms'],
  payoff: ['punch', 'low', 'dutch'],
};
// what follows a line's first shot inside the same line (opposite scale: far -> near, near -> far)
export const FOLLOW = {
  aerial: ['low', 'profile', 'two'], est: ['low', 'punch', 'profile'], top: ['punch', 'low', 'cu'], macro: ['punch', 'low', 'cu'],
  cu: ['top', 'low', 'est', 'macro'], punch: ['top', 'low', 'est'], dutch: ['top', 'low', 'punch'], ms: ['punch', 'macro', 'top'], low: ['top', 'punch', 'macro', 'ots'],
  ots: ['top', 'punch', 'profile'], profile: ['low', 'top', 'punch'], two: ['top', 'low', 'punch'], wide: ['low', 'cu'], follow: ['cu'], insert: ['cu'],
};
export const DRAWN_ON_TOP = new Set(['stamp', 'callout']);
export const SMALL = new Set(['est', 'aerial', 'top']);       // figures under 30 % of the frame: hand over within 40 f
const SOLO = new Set(['cu', 'punch', 'dutch', 'low', 'ms']), PAIR = new Set(['two', 'profile', 'ots']);
const NUM = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|nineteen|percent|degrees?)\b/i;

export function inferRole(entry, i, n, text = '') {
  if (entry?.role) return entry.role;
  const t = text.toLowerCase();
  if (i === 0) return 'hook';
  if (i === n - 1) return 'payoff';
  if (/^(but|here's|here is|except|actually|turns out|the trick)\b/.test(t)) return 'twist';
  if (NUM.test(t)) return 'number';
  if (/\b(same|versus|vs|than|both)\b/.test(t)) return 'compare';
  if (/!|\b(what|no way|wow|oh)\b/.test(t)) return 'reaction';
  return 'explain';
}

// a macro reads only on a thing with a face to read: a number, a label, a gauge, a set prop (not haze, rays or flows)
export const MACRO_KINDS = new Set(['thermo', 'stamp', 'cutbox', 'prop', 'clock', 'dial', 'sign']);
// the macro subject at frame f: the readable thing that pops nearest just after f (a stamp before it fires is empty air)
export function macroThing(things, f, last = Infinity) {
  const c = things.filter(t => MACRO_KINDS.has(t.kind) && !((t.beats || []).find(x => x >= f - 12) - 6 > last)), cost = t => { const b = (t.beats || []).filter(x => x >= f - 12);
    return b.length ? Math.abs(b[0] - (f + 6)) : 500; };
  return c.sort((x, y) => cost(x) - cost(y))[0]?.name ?? null;
}

// lines: [{ id, a, b, key, text, entry, things, explicit, act: { name, start, actors: [names], beatsBy: { actor: count } } }]
// (a, b = the line's window in frames; key = frame of its key word or null; things = the line's fx / props as
// { name, kind, beats: [frames] }; explicit = kinds of the reel's own shots in the window). Returns { actName: [shot, ...] }.
export function planShots(lines, { lead = 3, split = 78, small = 36, seg = 34, maxSeg = 46 } = {}) {
  const out = {}, used = {}, n = lines.length;
  let prev = null, prev2 = null, side = 1;
  const pick = (list, ok, avoid) => {
    const c = list.filter(k => ok(k) && !avoid.includes(k));
    const pool = c.length ? c : list.filter(ok);
    return pool.sort((x, y) => (used[x] || 0) - (used[y] || 0) || list.indexOf(x) - list.indexOf(y))[0];
  };
  lines.forEach((L, i) => {
    const e = L.entry || {}, act = L.act;
    // the reel data already shoots this line: keep it, and remember its kind for the no-repeat rule
    if (L.explicit?.length) { prev2 = prev; prev = L.explicit[L.explicit.length - 1]; return; }
    const role = inferRole(e, i, n, L.text), actors = act.actors, things = (L.things || []).filter(Boolean);
    const lead1 = [...actors].sort((x, y) => (act.beatsBy?.[y] || 0) - (act.beatsBy?.[x] || 0))[0];
    const readable = things.filter(t => MACRO_KINDS.has(t.kind));
    const ok = k => (PAIR.has(k) ? actors.length >= 2 : SOLO.has(k) ? actors.length >= 1 : k === 'macro' ? readable.length > 0
      : k === 'top' ? things.length > 0 || actors.length > 0 : true);
    const named = e.shot && !['auto', 'cutaway'].includes(e.shot) && ok(e.shot) ? e.shot : null;   // a storyboard shot with no reel shot: plan that kind
    let k1 = named || pick(ROLE_SHOTS[role] || ROLE_SHOTS.explain, k => ok(k) && !(SMALL.has(prev) && SMALL.has(k)), [prev, prev2].filter(Boolean)) || (actors.length ? 'ms' : 'macro');
    const shots = (out[act.name] ||= []);
    const f1 = i === 0 || L.a - lead <= act.start ? Math.min(act.start, L.a - lead) : L.a - lead;
    const spec = (k, f, thing) => {
      const s = { f: Math.max(f, act.start), shot: k, cut: true, auto: role };
      const names = things.map(t => t.name), of = e.of || (actors.length ? [lead1] : names.slice(0, 1));
      if (PAIR.has(k) || k === 'est' || k === 'aerial' || k === 'top') s.of = actors.length ? actors : names.slice(0, 1);
      else if (k === 'macro') { const t = things.find(x => x.name === (thing || macroThing(things, s.f))); s.of = [t.name];
        if (t.size) s.width = t.size; if (t.lift) s.at = [0, 0, t.lift];
        if (DRAWN_ON_TOP.has(t.kind)) s.dof = 0; }                  // drawn over the depth buffer: a blur band would smear the label
      else s.of = of;
      if (k === 'top' && actors.length && readable.length) s.with = readable.map(t => t.name).slice(0, 3);
      if (k === 'ots') { const fore = actors.find(a => a !== lead1); s.of = [lead1]; s.fore = fore; }
      if ((k === 'est' || k === 'aerial') && readable.length) s.with = readable.map(t => t.name).slice(0, 3);
      if (SOLO.has(k) || k === 'profile') s.dof = 0;                 // stamps and callouts beside a face stay sharp
      if (k === 'ms' || k === 'low') {                              // the line's readable things stay in frame (up to 3)
        const w = readable.map(t => t.name).slice(0, 3);
        if (w.length) s.with = w; }
      if (k === 'cu') s.live = 0.35;                                   // follow a share of the head's lean: head x stays 45-55 %
      if (k === 'dutch') s.rollSide = side;
      if (k === 'low' || k === 'cu') s.angle = (k === 'cu' ? 12 : 22) * side;
      if (k === 'low' || k === 'ms') s.kx = 0.5 + 0.14 * side;       // off-centre: the figure on a third, never the same spot twice
      side = -side; used[k] = (used[k] || 0) + 1; return s;
    };
    // a macro waits for its thing to pop (a stamp before it fires is empty air): a lead shot covers the wait
    const beatAfter = (name, f) => things.find(t => t.name === name)?.beats?.find(x => x >= f - 12);
    const macroAt = f => { const t = macroThing(things, f, L.b - 26), b0 = t && beatAfter(t, f); return { t, f: b0 != null ? Math.max(f, b0 - 6) : f }; };
    const plan = [];
    const m0 = k1 === 'macro' ? macroAt(L.key != null ? L.key - lead : f1) : null;
    if (k1 === 'macro' && !m0.t) k1 = pick(ROLE_SHOTS.explain, ok, [prev, prev2].filter(Boolean));
    if (k1 === 'macro') {
      const m = m0;
      if (m.f - f1 >= 18) plan.push({ k: pick(['low', 'punch', 'top', 'cu'], ok, [prev, prev2].filter(Boolean)), f: f1 });
      plan.push({ k: 'macro', f: plan.length ? m.f : f1, t: m.t });
      if (L.b - (m.f + 36) >= 24) plan.push({ k: pick(FOLLOW.macro, ok, ['macro', plan[0].k]), f: m.f + 36 });
    } else {
      plan.push({ k: k1, f: f1 });
      // second shot: on the key word, or after `small` frames for a small-figure shot, when the line is long enough
      const len = L.b - L.a;
      let f2 = null;
      if (SMALL.has(k1)) f2 = Math.min(L.key && L.key - L.a >= 18 ? L.key - lead : L.a + small, f1 + small);
      else if (len >= split) f2 = L.key && L.key - L.a >= 30 && L.b - L.key >= 24 ? L.key - lead : L.a + Math.round(len / 2);
      if (f2 != null && L.b - f2 >= 20) {
        let k2 = pick(role === 'payoff' ? ROLE_SHOTS.payoff : FOLLOW[k1] || ['cu'], ok, [k1]);   // the last word lands close
        if (k2 === 'macro') { const m = macroAt(f2); if (m.f > L.b - 30) k2 = pick((FOLLOW[k1] || ['cu']).filter(k => k !== 'macro'), ok, [k1]); else { f2 = m.f; } }
        if (k2) plan.push({ k: k2, f: f2 });
      }
    }
    // the reference cuts about once a second: any stretch over maxSeg frames gets more shots, each the opposite scale of
    // the one before (FOLLOW), never the last two kinds again, never two small-figure shots in a row
    for (let j = 0; j < plan.length; j++) {
      const end = j + 1 < plan.length ? plan[j + 1].f : L.b, gap = end - plan[j].f;
      if (gap <= maxSeg) continue;
      const f = plan[j].f + Math.round(gap / Math.ceil(gap / seg)), pk = plan[j].k, pp = plan[j - 1]?.k ?? prev;
      let k = pick(role === 'payoff' && end === L.b && L.b - f < seg + 6 ? ROLE_SHOTS.payoff : FOLLOW[pk] || ['cu'],
        x => ok(x) && !(SMALL.has(pk) && SMALL.has(x)) && !(SMALL.has(plan[j + 1]?.k) && SMALL.has(x)), [pk, pp, plan[j + 1]?.k, 'macro'].filter(Boolean));
      if (!k || end - f < 18) continue;
      plan.splice(j + 1, 0, { k, f });
    }
    // the key word carries the line: when the line names 2+ readable things, the shot on it shows them, not one face
    if (L.key != null && readable.length >= 2) {
      let j = plan.length - 1; while (j > 0 && plan[j].f > L.key) j--;
      if (['punch', 'dutch', 'cu', 'macro'].includes(plan[j].k)) {
        const k = pick(['low', 'profile', 'two', 'top'], ok, [plan[j - 1]?.k ?? prev, plan[j + 1]?.k].filter(Boolean));
        if (k) plan[j] = { k, f: plan[j].f };
      }
    }
    for (const q of plan) shots.push(spec(q.k, q.f, q.t));
    const last = plan[plan.length - 1].k;
    prev2 = prev; prev = last;
  });
  for (const k of Object.keys(out)) out[k].sort((x, y) => x.f - y.f);
  return out;
}
