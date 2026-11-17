// Reviewer calibration: a review brief counts at a stage gate only after a blind reviewer that follows it agreed with Kai
// on a replay set of his real complaints, praise and A/B picks. The set's answers are Kai's private notes, so they stay
// outside the repo: every command takes the key's path, and nothing here prints more than ids and numbers.
//   node styles/stick-man/tools/calibrate.mjs hash [<brief dir>]                 -> kai-taste@<sha12>, the reviewer's `brief:` line
//   node styles/stick-man/tools/calibrate.mjs blind <key.json> <out dir> [<brief dir>] [--seed n]
//        -> one prompt per job (a clip, or an A/B pair) with neutral ids and no answers in it; the seeded A/B order and
//           the neutral ids are written into key.json as `blind`, so only the private key maps them back
//   node styles/stick-man/tools/calibrate.mjs score <key.json> <answers dir> [--half tune|test|all] [--model m] [--record]
//        -> agreement per item and the verdict; --record writes it to calibration.json (next to this tool)
// key.json: { set, clips: [{ id, video }], complaints: [{ id, clip, t0?, t1?, kind, half }] (no t0 = film-wide),
//             praise: [{ id, clip, t0, t1, kinds, half }], ab: [{ id, a, b, pick: <clip id>, half }],
//             blind?: { seed, clips: { <neutral>: <clip id> }, ab: { <neutral>: { id, A: <clip id>, B: <clip id> } } } }
// answers:  every *.json in the dir, in neutral ids: { brief, clips: { <neutral>: { findings: [{ t0, t1, scope, kind, root, severity, what }] } }, ab: { <neutral>: 'A'|'B' } }
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RECORD = process.env.STICK_CALIBRATION || path.join(HERE, 'calibration.json');
export const BRIEF_DIR = path.join(os.homedir(), '.claude/skills/kai-taste');
export const THRESHOLD = { hit: 0.7, falseAlarm: 0.25 };
export const SLACK = 0.5, HALF_HIT = 0.5;
export const KINDS = {
  pop: ['R1', 'a thing appears, vanishes, teleports or snaps (size, pose, place) between frames'],
  slide: ['R1', 'a body glides, skates or is dragged without real steps'],
  jerk: ['R1', 'motion stutters, hitches, jitters or moves jerkily'],
  clip: ['R1', 'a body or prop passes through another body, prop or the set'],
  grip: ['R2', 'a held prop and the hand do not attach like the real thing, or a prop has no weight'],
  scale: ['R2', 'a thing or an effect is the wrong size or kind for the real thing'],
  'face-fit': ['R2', 'a face or expression the moment gives no cause for'],
  unreadable: ['R3', 'a face, shape or action is lost at phone size (hidden, blob, blank, covered)'],
  dark: ['R3', 'too dark, or one hue drowns the frame'],
  text: ['R3', 'too much text on screen at once'],
  cutting: ['R4', 'too many hard cuts, ping-pong, an insert cut where a move would do'],
  angle: ['R4', 'a wrong camera angle, or the same angle over and over'],
  repeat: ['R5', 'the same face, move or angle comes back too often'],
  'missing-action': ['R5', 'an action told by a caption or a cut, or a stronger library move left unused'],
  other: ['', 'none of the above'],
};

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export function briefTag(dir = BRIEF_DIR) {
  const h = crypto.createHash('sha256');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) h.update(f).update('\0').update(fs.readFileSync(path.join(dir, f)));
  return `${path.basename(dir)}@${h.digest('hex').slice(0, 12)}`;
}

const inHalf = (x, half) => half === 'all' || !x.half || x.half === half;
const overlaps = (f, a, b) => f.t0 <= b + SLACK && f.t1 >= a - SLACK;

export function scoreComplaint(c, findings) {
  if (c.t0 == null) return findings.some(f => f.scope === 'film' && f.kind === c.kind) ? 1 : 0;
  const near = findings.filter(f => f.scope !== 'film' && overlaps(f, c.t0, c.t1));
  return near.some(f => f.kind === c.kind) ? 1 : near.length ? HALF_HIT : 0;
}

export const falseAlarms = (p, findings) => findings.filter(f => f.scope !== 'film' && p.kinds.includes(f.kind)
  && (f.severity === 'High' || f.severity === 'Medium') && overlaps(f, p.t0, p.t1));

export function unblind(key, answers) {
  const m = key.blind || { clips: {}, ab: {} }, clips = {}, ab = {};
  for (const [n, c] of Object.entries(answers.clips || {})) clips[m.clips[n] || n] = c;
  for (const [n, pos] of Object.entries(answers.ab || {})) { const x = m.ab[n]; if (x) ab[x.id] = x[pos] || null; }
  return { ...answers, clips, ab };
}

export function score(key, blindAnswers, half = 'test') {
  const answers = unblind(key, blindAnswers), findings = id => answers.clips?.[id]?.findings || [];
  const complaints = key.complaints.filter(c => inHalf(c, half)).map(c => ({ id: c.id, clip: c.clip, kind: c.kind, got: scoreComplaint(c, findings(c.clip)) }));
  const praise = (key.praise || []).filter(p => inHalf(p, half)).map(p => ({ id: p.id, clip: p.clip, alarms: falseAlarms(p, findings(p.clip)).length }));
  const ab = (key.ab || []).filter(x => inHalf(x, half)).map(x => ({ id: x.id, pick: answers.ab?.[x.id] || null, ok: answers.ab?.[x.id] === x.pick }));
  const hit = complaints.length ? complaints.reduce((s, c) => s + c.got, 0) / complaints.length : 0;
  const falseAlarm = praise.length ? praise.filter(p => p.alarms).length / praise.length : 0;
  const why = [];
  if (half !== 'test') why.push(`half ${half}: only the test half can calibrate`);
  if (!complaints.length) why.push('no complaints in this half');
  if (hit < THRESHOLD.hit) why.push(`hit ${pct(hit)} < ${pct(THRESHOLD.hit)}`);
  if (falseAlarm > THRESHOLD.falseAlarm) why.push(`false alarms ${pct(falseAlarm)} > ${pct(THRESHOLD.falseAlarm)}`);
  for (const x of ab.filter(x => !x.ok)) why.push(`A/B ${x.id}: picked ${x.pick || 'nothing'}`);
  return { half, complaints, praise, ab, hit, falseAlarm, calibrated: !why.length, why };
}

const pct = x => `${Math.round(x * 100)}%`;

export function loadAnswers(dir) {
  const out = { brief: null, clips: {}, ab: {} };
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const a = readJson(path.join(dir, f));
    if (out.brief && a.brief && a.brief !== out.brief) throw new Error(`${f}: brief ${a.brief}, others ${out.brief}`);
    out.brief ||= a.brief;
    for (const [id, c] of Object.entries(a.clips || {})) for (const x of c.findings || []) {
      if (!KINDS[x.kind]) throw new Error(`${f}: clip ${id}: kind "${x.kind}" is not one of ${Object.keys(KINDS).join(', ')}`);
      (out.clips[id] ||= { findings: [] }).findings.push(x);
    }
    Object.assign(out.ab, a.ab || {});
  }
  return out;
}

export function calibration(tag, file = RECORD) {
  const recs = fs.existsSync(file) ? readJson(file).records || [] : [];
  const r = recs.filter(r => r.brief === tag).at(-1);
  if (!tag) return { ok: false, why: 'uncalibrated: no "brief:" line (calibrate.mjs hash)' };
  if (!r) return { ok: false, why: `uncalibrated: brief ${tag} was never scored against Kai (calibrate.mjs score)` };
  return r.calibrated && r.half === 'test' ? { ok: true, why: `calibrated ${tag}: hit ${pct(r.hit)}, false alarms ${pct(r.falseAlarm)}` }
    : { ok: false, why: `uncalibrated: brief ${tag} scored ${r.half === 'test' ? r.why.join('; ') : `on the ${r.half} half, not the test half`}` };
}

export function calibratedBrief(file = RECORD) {
  const recs = fs.existsSync(file) ? readJson(file).records || [] : [];
  return [...new Set(recs.map(r => r.brief))].filter(b => calibration(b, file).ok).at(-1) || null;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
}

export function blindMap(key, seed) {
  const r = rng(seed), shuffle = xs => xs.map(x => [r(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const clips = Object.fromEntries(shuffle(key.clips.map(c => c.id)).map((id, i) => [`c${i + 1}`, id]));
  const ab = Object.fromEntries(shuffle(key.ab || []).map((x, i) => [`ab${i + 1}`, r() < 0.5 ? { id: x.id, A: x.a, B: x.b } : { id: x.id, A: x.b, B: x.a }]));
  return { seed, clips, ab };
}

function blind(keyFile, out, briefDir, seed) {
  const key = readJson(keyFile), map = blindMap(key, seed), neutral = Object.fromEntries(Object.entries(map.clips).map(([n, id]) => [id, n]));
  const tag = briefTag(briefDir), kinds = Object.entries(KINDS).map(([k, [r, d]]) => `- \`${k}\`${r ? ` (${r})` : ''}: ${d}`).join('\n');
  const clip = id => key.clips.find(c => c.id === id) || (() => { throw new Error(`no clip ${id}`); })();
  const paired = new Set((key.ab || []).flatMap(x => [x.a, x.b]));
  const jobs = [...Object.values(map.clips).filter(id => !paired.has(id)).map(id => ({ id: neutral[id], videos: [['clip', clip(id)]] })),
    ...Object.entries(map.ab).map(([n, x]) => ({ id: n, ab: n, videos: [['A', clip(x.A)], ['B', clip(x.B)]] }))];
  for (const [n, j] of jobs.entries()) {
    const dir = path.join(out, `job${n + 1}`); fs.mkdirSync(dir, { recursive: true });
    const vids = j.videos.map(([label, c]) => { const p = path.join(dir, `${label}.mp4`); fs.copyFileSync(c.video, p); return [label, neutral[c.id], p]; });
    const clipsJson = vids.map(([, n]) => `"${n}": { "findings": [ ... ] }`).join(', ');
    const md = [`# Blind review, job ${n + 1}`, '',
      `Read \`${briefDir}/SKILL.md\` and the files it names. Judge as Kai would at 1x on a phone; name the root each finding breaks; never mark down what Kai praised. Follow its Review procedure (\`${briefDir}/tools/look.sh\`, every step under \`timeout\`).`, '',
      'Watch only these videos. Read nothing else about them: no notes, reviews or folders outside the brief and this job folder.', '',
      ...vids.map(([label, n, p]) => `- ${j.ab ? `**${label}** ` : ''}\`${p}\` (report times in this video's own seconds; clip id \`${n}\`)`), '',
      j.ab ? `These are two cuts of the same scene. Review both, then say which one should ship as it is: \`"A"\` or \`"B"\`.` : '', '',
      `Write look.sh output under \`${dir}/work/\` only. Every finding gets one \`kind\` from this closed list:`, '', kinds, '',
      'Use `"scope": "film"` (and the clip\'s whole span) for a fault of the whole clip, `"moment"` otherwise. End with one JSON code block and nothing after it:', '',
      '```json', `{ "brief": "${tag}", "clips": { ${clipsJson} }${j.ab ? `, "ab": { "${j.ab}": "A or B" }` : ''} }`, '```', '',
      'Each finding: `{ "t0": s, "t1": s, "scope": "moment|film", "kind": "...", "root": "R1-R5", "severity": "High|Medium|Low", "what": "what the viewer sees over time" }`.'];
    fs.writeFileSync(path.join(dir, 'PROMPT.md'), md.filter((l, i, a) => l || a[i - 1]).join('\n') + '\n');
    console.log(`job${n + 1}\t${j.ab ? `A/B ${j.ab}` : j.id}\t${path.join(dir, 'PROMPT.md')}`);
  }
  fs.writeFileSync(keyFile, JSON.stringify({ ...key, blind: map }, null, 1) + '\n');
  console.log(`seed ${seed}: neutral ids and A/B order written to ${keyFile} (blind)`);
}

function report(key, ans, s) {
  const rows = [...s.complaints.map(c => `${c.id}\t${c.clip}\t${c.kind}\t${c.got === 1 ? 'hit' : c.got ? 'half' : 'miss'}`),
    ...s.praise.map(p => `${p.id}\t${p.clip}\tpraise\t${p.alarms ? `false alarm x${p.alarms}` : 'kept'}`),
    ...s.ab.map(x => `${x.id}\tA/B\tpick\t${x.ok ? 'agrees' : `disagrees (${x.pick || 'none'})`}`)];
  return [`brief ${ans.brief || '?'} · set ${key.set} · half ${s.half} · seed ${key.blind?.seed ?? 'none'}`, ...rows,
    `hit ${pct(s.hit)} (${s.complaints.reduce((a, c) => a + c.got, 0)}/${s.complaints.length}) · false alarms ${pct(s.falseAlarm)} · A/B ${s.ab.filter(x => x.ok).length}/${s.ab.length}`,
    s.calibrated ? 'CALIBRATED' : `UNCALIBRATED: ${s.why.join('; ')}`].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
  const pos = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  if (cmd === 'hash') console.log(briefTag(pos[0] || BRIEF_DIR));
  else if (cmd === 'blind' && pos.length >= 2) blind(pos[0], pos[1], pos[2] || BRIEF_DIR, opt('--seed') != null ? Number(opt('--seed')) : crypto.randomInt(2 ** 31));
  else if (cmd === 'score' && pos.length >= 2) {
    const key = readJson(pos[0]), ans = loadAnswers(pos[1]);
    const half = args.includes('--half') ? opt('--half') : 'test';
    const s = score(key, ans, half);
    console.log(report(key, ans, s));
    if (args.includes('--record')) {
      const file = fs.existsSync(RECORD) ? readJson(RECORD) : { records: [] };
      file.records.push({ brief: ans.brief, model: opt('--model'), set: key.set, half, seed: key.blind?.seed ?? null, n: s.complaints.length,
        hit: +s.hit.toFixed(3), falseAlarm: +s.falseAlarm.toFixed(3), ab: s.ab.map(x => ({ id: x.id, ok: x.ok })), calibrated: s.calibrated, why: s.why, at: new Date().toISOString() });
      fs.writeFileSync(RECORD, JSON.stringify(file, null, 1) + '\n');
    }
    process.exit(s.calibrated ? 0 : 1);
  } else { console.error('usage: calibrate.mjs hash [<brief dir>] | blind <key.json> <out dir> [<brief dir>] [--seed n] | score <key.json> <answers dir> [--half tune|test|all] [--model m] [--record]'); process.exit(2); }
}
