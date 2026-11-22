// Retake log: every note Kai gives on a film is a row with the round it was given on, its type and the round that closed
// it, so a note he has to repeat is counted instead of lost.
//   node styles/stick-man/tools/review/retakes.mjs films/<slug>     -> one line per round; exit 1 when the latest round fails
//   node styles/stick-man/tools/review/retakes.mjs films/<slug> --premise   -> only the PREMISE check (exit 0 with no log): ◇4 ◇5 run it
// A round fails when Kai gave more notes on it than on the round before (version regression) or when one of its notes
// repeats a note that was already closed (a re-open). Every verdict shows the round's repeat count; an open repeat alone
// does not fail it. The log is films/<slug>/review/retakes.json:
//   { rounds: [{ id, of, at }],   in the order Kai saw them
//     notes:  [{ id, round, where, type, class?, kind?, root?, says, repeats?, closed?, closedBy? }],
//     k3:     [{ shot, kind, round, pick, at }] }   Kai's answer at K3, given after `round`
// where is the shot id; kind is the WHOCHECKS.json row the fault belongs to; root is the kai-taste root R1-R5.
// PREMISE: the same shot and fault kind (kind, else class) got notes on 2 rounds and the latest is still open. The fix
// direction itself failed, so a third round on it is refused: show Kai 2-3 different approaches (K3) and record his pick
// in k3 with the round it answers. Notes up to that round no longer count; the new approach gets its own 2 rounds.
// id is Kai's complaint id when he has one; says is a short paraphrase, never his words; repeats names the earlier note a
// not-addressed note gives again; closed is the round on which Kai accepted the fix, closedBy the note or praise that says so.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KINDS = JSON.parse(fs.readFileSync(path.join(HERE, '../gates/WHOCHECKS.json'), 'utf8')).rows.map(r => r.id);
export const ROOTS = ['R1', 'R2', 'R3', 'R4', 'R5'];

export const TYPES = {
  careless: 'a slip the maker could have caught: a pop, a vanish, a clip, a jerk',
  'style-break': 'breaks what the film already approved: the bible, the library, the look',
  artistic: 'a taste call about a choice that works as built',
  'not-addressed': 'a note Kai already gave, given again',
};
export const CLASSES = ['body in the set', 'camera jumps', 'cord shakes', 'figure appears', 'figure jumps', 'figure skates',
  'figure vanishes', 'foot slides', 'hand off its grip', 'joint pops', 'prop appears', 'prop changes at cut', 'prop floats',
  'prop gone after cut', 'prop in the body', 'prop jumps', 'prop resizes', 'prop vanishes'];

export function problems(log) {
  const order = new Map(log.rounds.map((r, i) => [r.id, i])), byId = new Map(log.notes.map(n => [n.id, n])), out = [];
  if (order.size !== log.rounds.length) out.push('two rounds share an id');
  if (byId.size !== log.notes.length) out.push('two notes share an id');
  for (const n of log.notes) {
    const at = order.get(n.round), bad = m => out.push(`${n.id}: ${m}`);
    if (at == null) bad(`round "${n.round}" is not in rounds`);
    if (!TYPES[n.type]) bad(`type "${n.type}" is not one of ${Object.keys(TYPES).join(', ')}`);
    if (n.class && !CLASSES.includes(n.class)) bad(`class "${n.class}" is not a shot-gate class`);
    if (n.kind && !KINDS.includes(n.kind)) bad(`kind "${n.kind}" is not a WHOCHECKS.json row`);
    if (n.root && !ROOTS.includes(n.root)) bad(`root "${n.root}" is not one of ${ROOTS.join(' ')}`);
    if (n.type === 'not-addressed' && !n.repeats) bad('a not-addressed note names the note it repeats ("repeats")');
    if (n.repeats) { const p = byId.get(n.repeats);
      if (!p) bad(`repeats "${n.repeats}", which is not in the log`);
      else if (order.get(p.round) >= at) bad(`repeats ${p.id} from round ${p.round}, which is not earlier`); }
    if (n.closed != null && !(order.get(n.closed) > at)) bad(`closed on "${n.closed}", which is not a later round`);
  }
  for (const [i, a] of (log.k3 || []).entries()) {
    if (!order.has(a.round)) out.push(`k3[${i}]: round "${a.round}" is not in rounds`);
    if (!a.shot || !a.kind || !a.pick) out.push(`k3[${i}]: needs shot, kind and Kai's pick`);
  }
  return out;
}

export function premises(log) {
  const order = new Map(log.rounds.map((r, i) => [r.id, i])), groups = new Map();
  for (const n of log.notes) { const kind = n.kind || n.class; if (!n.where || !kind) continue;
    const k = `${n.where}\t${kind}`; groups.set(k, [...(groups.get(k) || []), n]); }
  const out = [];
  for (const [k, all] of groups) {
    const [shot, kind] = k.split('\t');
    const after = Math.max(-1, ...(log.k3 || []).filter(a => a.shot === shot && a.kind === kind && a.pick && order.has(a.round)).map(a => order.get(a.round)));
    const ns = all.filter(n => order.get(n.round) > after); if (!ns.length) continue;
    const rs = [...new Set(ns.map(n => n.round))].sort((a, b) => order.get(a) - order.get(b));
    const last = ns.reduce((a, n) => order.get(n.round) > order.get(a.round) ? n : a);
    if (rs.length < 2 || last.closed != null) continue;
    out.push({ shot, kind, rounds: rs, notes: ns.map(n => n.id) });
  }
  return out;
}

export function rounds(log) {
  const order = new Map(log.rounds.map((r, i) => [r.id, i])), byId = new Map(log.notes.map(n => [n.id, n]));
  return log.rounds.map((r, i) => {
    const notes = log.notes.filter(n => n.round === r.id), prev = i ? log.notes.filter(n => n.round === log.rounds[i - 1].id).length : null;
    const reopened = notes.filter(n => n.repeats && byId.get(n.repeats).closed != null && order.get(byId.get(n.repeats).closed) <= i)
      .map(n => `${n.id} re-opens ${n.repeats} (closed on ${byId.get(n.repeats).closed})`);
    const why = [...(prev != null && notes.length > prev ? [`${notes.length} notes after ${prev} on ${log.rounds[i - 1].id}: version regression`] : []), ...reopened];
    return { id: r.id, of: r.of, notes: notes.length, repeats: notes.filter(n => n.type === 'not-addressed').map(n => n.id),
      closed: log.notes.filter(n => n.closed === r.id).map(n => n.id),
      open: log.notes.filter(n => order.get(n.round) <= i && !(n.closed != null && order.get(n.closed) <= i)).length,
      types: Object.fromEntries(Object.keys(TYPES).map(t => [t, notes.filter(n => n.type === t).length])), ok: !why.length, why };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const film = process.argv[2], only = process.argv.includes('--premise');
  if (!film || film.startsWith('-')) { console.error('usage: retakes.mjs films/<slug> [--premise]'); process.exit(2); }
  const file = path.join(film, 'review/retakes.json');
  if (!fs.existsSync(file)) { if (only) { console.log('PASS: no retake log yet, no premise to test'); process.exit(0); } console.error(`${file}: no retake log`); process.exit(2); }
  const log = JSON.parse(fs.readFileSync(file, 'utf8')), bad = problems(log);
  if (bad.length) { console.error(bad.map(b => `! ${b}`).join('\n')); process.exit(2); }
  const open = premises(log);
  const say = p => `PREMISE ${p.shot} ${p.kind}: notes ${p.notes.join(' ')} on rounds ${p.rounds.join(', ')}; stop fixing, show Kai 2-3 different approaches (K3) and record his pick in k3 with round ${p.rounds.at(-1)}`;
  if (only) { if (open.length) { console.log(open.map(say).join('\n') + `\nFAIL: ${open.length} PREMISE`); process.exit(1); } console.log('PASS: no open PREMISE'); process.exit(0); }
  const rs = rounds(log);
  console.log('round\tnotes\trepeats\tcareless/style/artistic\tclosed\topen\tverdict');
  for (const r of rs) console.log([r.id, r.notes, r.repeats.length ? `${r.repeats.length} (${r.repeats.join(' ')})` : 0,
    `${r.types.careless}/${r.types['style-break']}/${r.types.artistic}`, r.closed.length, r.open, `${r.ok ? 'PASS' : `FAIL: ${r.why.join('; ')}`} · ${r.repeats.length} repeat${r.repeats.length === 1 ? '' : 's'}`].join('\t'));
  for (const p of open) console.log(say(p));
  process.exit(rs.at(-1)?.ok === false || open.length ? 1 : 0);
}
