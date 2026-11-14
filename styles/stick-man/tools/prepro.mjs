// Pre-production checker: reads the shot list in films/<slug>/storyboard.json (`scenes`, `shots`) with vo/script.json and
// vo/words.json, resolves every shot to frames, scores story vs visual intensity (Bruce Block's contrast model, the
// animation-camera-pass table) and checks the pre-production standards in .claude/skills/make-reel-stick-man/PREPRO.md.
// Pure data in, a report out: no renderer needed, so it runs from the first thumbnail pass on.
//   node styles/stick-man/tools/prepro.mjs films/<slug>                -> review/prepro.md, review/intensity.svg, review/shots.csv
//   options: --fps 30  --out review/prepro.md  --last <frame>  --strict 1 (WARN counts as FAIL)  --opt SH040:emo (check another option)
//   --gate 2a | 2b   the gate checks on top (story lock, final voice, decisions placed; options on flagged shots)
//   --lock-story kai   record Kai's confirmation of the scene feels and story scores (review/locks.json)
// Exit code 1 when any FAIL. Every finding names its check id (T1, C5 ...) so PREPRO.md section 8 gives the fix.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadFilm, visual, lensN, SIZES, ANGLES, MOVES, WIDE, TEXT_SAFE } from './shotlist.mjs';

import { storyLockDiff } from './storylock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const argv = process.argv.slice(2), A = {};
const film = argv[0];
for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!film || film.startsWith('--')) { console.error('usage: prepro.mjs films/<slug> [--fps 30] [--out review/prepro.md] [--last <frame>] [--strict 1]'); process.exit(2); }
const DIR = path.resolve(ROOT, film);
let L;
try { L = loadFilm(DIR, { fps: A.fps, last: A.last, opt: A.opt }); } catch (e) { console.error(e.message); process.exit(2); }
const { SB, fps, shots, last, voEnd, lineIds, F } = L;
const CPS = 15, TEXT_MIN_F = Math.ceil(fps * 5 / 6), MIN_SHOT_F = 15, MIN_FAST_F = 8, CARD_RUN_S = 8, HOLD_S = 4.5;
const findings = [];
const add = (lvl, id, where, msg) => findings.push({ lvl, id, where, msg });
for (const e of L.errors) add('FAIL', 'T0', e.where, e.msg);
for (const s of shots) s.vis = visual(s);

// ------------------------------------------------------------------ checks
const scenes = SB.scenes || [];
const sceneIds = new Set(scenes.map(c => c.id));
for (const c of scenes) if (!c.feel) add('FAIL', 'B1', c.id, 'scene has no "feel" (what the audience must feel): write the scene brief first');
for (const [i, s] of shots.entries()) {
  const w = s.id || `#${i + 1}`;
  const need = ['id', 'scene', 'size', 'angle', 'move', 'purpose', 'see', 'story'];
  if (s.size !== 'CARD') need.push('lens');
  const miss = need.filter(k => s[k] == null || s[k] === '');
  if (miss.length) add('FAIL', 'C2', w, `missing ${miss.join(', ')}`);
  if (s.size && !SIZES.includes(s.size)) add('FAIL', 'C2', w, `size "${s.size}" not in ${SIZES.join('/')}`);
  if (s.angle && !ANGLES.includes(s.angle)) add('FAIL', 'C2', w, `angle "${s.angle}" not in ${ANGLES.join('/')}`);
  if (s.move && !MOVES.includes(s.move)) add('FAIL', 'C2', w, `move "${s.move}" not in ${MOVES.join('/')}`);
  if (s.scene && scenes.length && !sceneIds.has(s.scene)) add('FAIL', 'C2', w, `scene "${s.scene}" is not in "scenes"`);
  if (s.purpose && !/^P\d*\s*·/.test(s.purpose) && s.purpose.split(/\s+/).length < 4) add('WARN', 'C2', w, 'purpose is too thin: say what the viewer must get in this shot');
  if (i && s.a <= shots[i - 1].a) add('FAIL', 'T1', w, `starts at f${s.a}, not after ${shots[i - 1].id} (f${shots[i - 1].a})`);
  const minF = ['INS', 'CARD'].includes(s.size) || s.move === 'whip' ? MIN_FAST_F : MIN_SHOT_F;
  if (s.n < minF) add('FAIL', 'T1', w, `${s.n} f is too short to read (min ${minF} f)`);
  if (s.sec > HOLD_S && (!s.move || s.move === 'static') && !s.hold) add('WARN', 'T2', w, `${s.sec.toFixed(1)} s static hold: add a move, a second panel, a cut, or mark hold: "why" if the breath is the point`);
  const panels = s.panels || [];
  if (!panels.length) add('FAIL', 'P1', w, 'no panel');
  for (const p of panels) { const f = typeof p === 'string' ? p : p.img; if (f && !fs.existsSync(F(f))) add('FAIL', 'P1', w, `panel ${f} not found`); }
  // a 2D move on one panel (cam2d) already defines its start and end framing; an action still needs its key poses
  if (panels.length < 2 && s.size !== 'CARD' && ((s.move && s.move !== 'static' && !s.cam2d) || s.kind === 'action') && s.sec > 1.5)
    add('WARN', 'P2', w, `${s.kind === 'action' ? 'action' : 'moving'} shot with one panel: draw the start and end keys (and the extreme pose for action)`);
  for (const t of s.text || []) {
    const chars = String(t.text || '').length, n = t.dur ?? s.n, cps = chars / (n / fps);
    if (n < TEXT_MIN_F) add('FAIL', 'C9', w, `text "${t.text}" on screen ${n} f (min ${TEXT_MIN_F} f)`);
    if (cps > CPS) add('FAIL', 'C9', w, `text "${t.text}" needs ${(chars / CPS).toFixed(1)} s, has ${(n / fps).toFixed(1)} s (${cps.toFixed(1)} cps > ${CPS})`);
    if (t.zone === 'bottom' || t.zone === 'top-edge') add('FAIL', 'C9', w, `text "${t.text}" in zone ${t.zone}: the platform UI covers it`);
    // width of the word block, estimated: ~0.6 em per character at `size` (share of the frame height), in frame widths
    const [W9, H9] = String(SB.size || '1080x1920').split('x').map(Number), wN = chars * (t.size ?? 0.034) * 0.6 * (H9 / W9);
    if (wN > TEXT_SAFE.x1 - TEXT_SAFE.x0) add('FAIL', 'C9', w, `text "${t.text}" is ~${Math.round(wN * 100)} % of the frame wide, wider than the text-safe box (${Math.round((TEXT_SAFE.x1 - TEXT_SAFE.x0) * 100)} %): fewer words or a smaller size`);
    else if (Array.isArray(t.at) && (t.at[0] - wN / 2 < TEXT_SAFE.x0 - 0.005 || t.at[0] + wN / 2 > TEXT_SAFE.x1 + 0.005)) add('FAIL', 'C9', w, `text "${t.text}" runs past the side of the text-safe box`);
    if (Array.isArray(t.at)) { const [x, y] = t.at;
      if (x < TEXT_SAFE.x0 || x > TEXT_SAFE.x1 || y < TEXT_SAFE.y0 || y > TEXT_SAFE.y1) add('FAIL', 'C9', w, `text "${t.text}" at [${x}, ${y}] is outside the text-safe box`); }
  }
}
// coverage
for (const id of lineIds) if (!shots.some(s => s.on.includes(id))) add('FAIL', 'C1', id, 'no shot plays under this line');
if (voEnd != null && last < voEnd) add('FAIL', 'T3', 'film', `last frame ${last} is before the voice ends (f${voEnd})`);
// continuity inside a scene: each shot against the last shot of the same scene that states a screen direction / axis side
const lastDir = {}, lastAxis = {};
for (let i = 0; i < shots.length; i++) {
  const s = shots[i], flip = d => ({ 'L>R': 'R>L', 'R>L': 'L>R' })[d];
  const pd = lastDir[s.scene], pa = lastAxis[s.scene];
  if (pd && s.screen_dir && flip(pd.screen_dir) === s.screen_dir && !s.turn && !s.axis_cross)
    add('FAIL', 'C6', `${pd.id}→${s.id}`, `screen direction flips ${pd.screen_dir} → ${s.screen_dir} with no turn shown (add turn: true, a neutral shot, or fix the direction)`);
  if (pa && s.axis && pa.axis !== s.axis && !s.axis_cross)
    add('FAIL', 'C7', `${pa.id}→${s.id}`, `camera jumps the 180° line (${pa.axis} → ${s.axis}); legal: move across it in-shot, a character crosses it, a neutral shot on the line, or a re-establishing wide (axis_cross: "how")`);
  if (s.screen_dir && s.screen_dir !== '-') lastDir[s.scene] = s;
  if (s.axis) lastAxis[s.scene] = s;
  const p = shots[i - 1];
  if (p && p.scene === s.scene && p.size === s.size && p.angle === s.angle && lensN(p) === lensN(s) && (p.subject ?? 1) === (s.subject ?? 1) && s.size !== 'CARD' && !(p.montage && s.montage))
    add('WARN', 'C3', `${p.id}→${s.id}`, 'same size, angle and lens on the same subject: a jump cut unless the angle changes ≥ 30° or the size changes clearly');
}
// runs
for (let i = 0; i < shots.length;) {
  let j = i; while (j + 1 < shots.length && shots[j + 1].size === shots[i].size) j++;
  if (j - i + 1 >= 3 && shots[i].size !== 'CARD' && !shots.slice(i, j + 1).every(x => x.montage)) add('WARN', 'C4', `${shots[i].id}…${shots[j].id}`, `${j - i + 1} ${shots[i].size} shots in a row: vary the size with the beat`);
  i = j + 1;
}
for (let i = 0; i < shots.length;) {
  if (shots[i].size !== 'CARD') { i++; continue; }
  let j = i, s = 0; while (j < shots.length && shots[j].size === 'CARD') s += shots[j++].sec;
  if (s > CARD_RUN_S) add('FAIL', 'C5', `${shots[i].id}…${shots[j - 1].id}`, `${s.toFixed(1)} s of cards in a row (max ${CARD_RUN_S} s): show the fact inside the action (PREPRO.md 4.3)`);
  i = j;
}
const total = last, cardSec = shots.filter(s => s.size === 'CARD').reduce((a, s) => a + s.sec, 0);
if (cardSec / (total / fps) > 0.25) add('WARN', 'C5', 'film', `${Math.round(100 * cardSec / (total / fps))} % of the film is cards (aim ≤ 25 %)`);
// establishing per scene
for (const c of (scenes.length ? scenes.map(x => x.id) : [...new Set(shots.map(s => s.scene))])) {
  const ss = shots.filter(s => s.scene === c);
  if (ss.length && !ss.slice(0, 2).some(s => WIDE.has(s.size)) && !scenes.find(x => x.id === c)?.noEst)
    add('WARN', 'C8', c, 'no wide in the first two shots: establish the place, or write noEst: "why" on the scene');
}
// hook
const s0 = shots[0];
if (s0.a !== 0) add('FAIL', 'H1', s0.id, 'the film does not start on a shot at frame 0');
if (s0.sec > 3 && (!s0.move || s0.move === 'static')) add('WARN', 'H1', s0.id, `first shot holds ${s0.sec.toFixed(1)} s without a move: the hook needs a change inside 3 s`);
// intensity flags
const st = shots.map(s => Number(s.story) || 0), vv = shots.map(s => s.vis.v);
const climax = SB.climax ? shots.findIndex(s => s.id === SB.climax) : st.indexOf(Math.max(...st));
// the hook (shots starting in the first 3 s) may spike on purpose: the early-peak test starts after it
const hookEnd = shots.findIndex(s => s.a >= 3 * fps), body = hookEnd < 0 ? [] : vv.map((v, i) => (i >= hookEnd ? v : -1));
const vmax = Math.max(...body, -1), firstVmax = body.indexOf(vmax);
const flags = shots.map(() => []);
if (climax >= 0 && firstVmax >= 0 && firstVmax < climax && vmax > vv[climax]) { flags[firstVmax].push('EARLY_PEAK');
  add('FAIL', 'I1', shots[firstVmax].id, `visual peak ${vmax} comes before the climax ${shots[climax].id} (visual ${vv[climax]}): save the biggest size/lens/move for the climax`); }
for (let i = 0; i + 3 < shots.length; i++) {
  const win = vv.slice(i, i + 4);
  if (Math.max(...win) - Math.min(...win) <= 2 && st[i + 3] - st[i] >= 2) {
    for (let k = i; k < i + 4; k++) if (!flags[k].includes('FLAT')) flags[k].push('FLAT');
  }
}
const flatRuns = []; for (let i = 0; i < shots.length; i++) if (flags[i].includes('FLAT') && !(i && flags[i - 1].includes('FLAT'))) { let j = i; while (j + 1 < shots.length && flags[j + 1].includes('FLAT')) j++; flatRuns.push([i, j]); }
for (const [i, j] of flatRuns) add('WARN', 'I2', `${shots[i].id}…${shots[j].id}`, 'FLAT: the story rises but the picture does not (vary size, lens, angle, move or cut rhythm)');
shots.forEach((s, i) => { if (Math.abs(st[i] - vv[i]) >= 4) { flags[i].push('MISMATCH'); add('WARN', 'I3', s.id, `MISMATCH story ${st[i]} vs visual ${vv[i]}`); } });
if (climax >= 0 && climax < shots.length - 2 && vv.slice(climax + 1).every(v => v >= 7)) add('WARN', 'I4', 'after climax', 'NO_RELEASE: the picture never calms after the climax');

// ------------------------------------------------------------------ voice, decisions, locks (AUDIT X1-X3)
// V1: the voice must be the voice of this script: every script line's words must be the aligned words of that line
const { script, words } = L;
if (script && words) for (const l of script.lines) {
  const want = String(l.text).split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean);
  if (!want.length) continue;
  const got = words.filter(w => w.line === l.id).map(w => String(w.word).toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean);
  const same = want.filter((w, i) => got[i] === w).length;
  if (!got.length) add('FAIL', 'V1', l.id, 'no aligned words: vo/words.json is from another script version (record or re-align the voice)');
  else if (same / Math.max(want.length, got.length) < 0.8) add('FAIL', 'V1', l.id, `vo/words.json does not match the script line (${same}/${want.length} words): the voice is from another version`);
}
const extra = words ? [...new Set(words.map(w => w.line))].filter(id => script && !script.lines.some(l => l.id === id)) : [];
if (extra.length) add('FAIL', 'V1', 'vo/words.json', `lines not in the script: ${extra.slice(0, 6).join(' ')}${extra.length > 6 ? ' …' : ''} (stale voice)`);
const estimated = (words || []).some(w => w.est);
// D1: every approved decision is placed on a shot, scene or cue that exists
const DEC = fs.existsSync(F('DECISIONS.json')) ? JSON.parse(fs.readFileSync(F('DECISIONS.json'), 'utf8')) : null;
const ids = new Set(shots.map(s => s.id)), sids = new Set((SB.scenes || []).map(c => c.id));
for (const d of DEC?.decisions || []) {
  if (d.status === 'dropped') { if (!d.droppedBy) add('FAIL', 'D1', d.id, `dropped without Kai's approval (droppedBy): ${d.decision}`); continue; }
  const w = d.where || {}, refs = [...(w.shots || []), ...(w.scenes || [])];
  if (!refs.length && !(w.cues || []).length && !w.note) add(A.gate ? 'FAIL' : 'WARN', 'D1', d.id, `approved decision not placed anywhere: ${d.decision}`);
  for (const r of refs) if (!ids.has(r) && !sids.has(r)) add('FAIL', 'D1', d.id, `placed on ${r}, which is not in the shot list: ${d.decision}`);
  // D2: decisions that can be checked by the machine say how (`check`); a broken one is a FAIL whatever the other rules say,
  // because Kai approved it. A conflict with a skill rule is Kai's call, not the agent's.
  for (const c of (d.status === 'approved' ? d.check || [] : [])) {
    const inScope = s => !c.scenes || c.scenes.includes(s.scene), texts = s => (s.text || []).map(t => String(t.text)).join(' ');
    const fail = m => add('FAIL', 'D2', d.id, `${m} (approved: ${d.decision})`);
    if (c.type === 'noCutBefore') { const s = shots.find(x => x.a > 0 && x.a < c.sec * fps); if (s) fail(`${s.id} cuts at ${(s.a / fps).toFixed(1)} s, before ${c.sec} s`); }
    else if (c.type === 'maxSec') { if (last / fps > c.sec) fail(`the film runs ${(last / fps).toFixed(1)} s, over ${c.sec} s`); }
    else if (c.type === 'textMust') { if (!shots.filter(inScope).some(s => texts(s).includes(c.text))) fail(`no on-screen text contains "${c.text}"`); }
    else if (c.type === 'textMustNot') { const s = shots.filter(inScope).find(x => texts(x).includes(c.text)); if (s) fail(`${s.id} shows "${c.text}"`); }
    else if (c.type === 'seeIncludes') { if (!shots.filter(inScope).some(s => new RegExp(c.text, 'i').test(`${s.see} ${s.purpose}`))) fail(`no shot${c.scenes ? ' in ' + c.scenes.join(',') : ''} shows "${c.text}"`); }
    else if (c.type === 'sizeShare') { const ss = shots.filter(inScope), sec = ss.reduce((a, s) => a + s.sec, 0), on = ss.filter(s => s.size === c.size).reduce((a, s) => a + s.sec, 0);
      if (sec && on / sec < c.min) fail(`${c.size} is ${Math.round(100 * on / sec)} % of ${c.scenes?.join(',') || 'the film'} (approved ≥ ${Math.round(c.min * 100)} %)`); }
    else add('WARN', 'D2', d.id, `unknown check type ${c.type}`);
  }
}
// a skill rule that an approved decision overrides is reported once, so Kai decides which one stands
for (const d of DEC?.decisions || []) for (const c of d.check || []) if (d.status === 'approved' && c.type === 'sizeShare' && c.size === 'CARD' && c.min > 0.25)
  add('WARN', 'D3', d.id, `conflicts with the skill rule "cards ≤ 25 % / ≤ 8 s in a row" (C5): Kai picks which stands, and the loser is recorded in DECISIONS.json`);
// K1: Kai's confirmation of the scene feels and story scores is locked; any later change is a FAIL until he confirms again.
// One exception: a shot added after the lock whose score lies between its two locked neighbours' (inclusive), at most
// two per gap, is INFO (storylock.mjs). The hash keeps the pre-scene-id format, so a hash-only lock still compares.
const scenesNow = (SB.scenes || []).map(c => [c.id, c.feel]);
const storyHash = crypto.createHash('sha256').update(JSON.stringify({ scenes: scenesNow, shots: shots.map(s => [s.id, s.story]) })).digest('hex').slice(0, 16);
const storyNow = { scenes: scenesNow, shots: shots.map(s => [s.id, s.story, s.scene]) };
const LK = F('review/locks.json'), locks = fs.existsSync(LK) ? JSON.parse(fs.readFileSync(LK, 'utf8')) : {};
if (A['lock-story']) { locks.story = { hash: storyHash, by: A['lock-story'], at: new Date().toISOString(), ...storyNow }; fs.mkdirSync(F('review'), { recursive: true }); fs.writeFileSync(LK, JSON.stringify(locks, null, 1)); }
if (locks.story && (Array.isArray(locks.story.shots) || locks.story.hash !== storyHash)) {
  const k = storyLockDiff(locks.story, storyNow), who = `${locks.story.by} confirmed them (${locks.story.at.slice(0, 10)})`;
  if (k.changed.length) add('FAIL', 'K1', 'story', `scene feels or story scores changed after ${who}${k.changed[0] === 'unknown' ? '' : ': ' + k.changed.join(', ')}: change the picture, not the score, or ask Kai again`);
  for (const id of k.added) add('INFO', 'K1', id, 'added after lock, interpolated (its story score lies between its locked neighbours)');
  for (const m of k.info) add('INFO', 'K1', 'story', m);
}
if (A.gate === '2a' || A.gate === '2b') {
  if (!locks.story) add('FAIL', 'K1', 'story', 'Kai has not confirmed the scene feels and story scores (prepro.mjs --lock-story kai after he does)');
  if (estimated) add('FAIL', 'V2', 'vo/words.json', 'word times are estimated (scratch voice): lock on the final voice');
  if (!DEC) add('FAIL', 'D1', 'DECISIONS.json', 'no decision log: the treatment decisions must be listed and placed');
}
if (A.gate === '2b') shots.forEach((s, i) => {
  const flagged = flags[i].length;
  if (flagged && !(s.options && Object.keys(s.options).length >= 2 && s.pick)) add('FAIL', 'O1', s.id, `flagged ${flags[i].join(' ')}: needs options (safe / emo / bold) cut into the animatic and Kai's pick`);
});

// ------------------------------------------------------------------ reports
const strict = A.strict === '1';
const nF = findings.filter(f => f.lvl === 'FAIL').length + (strict ? findings.filter(f => f.lvl === 'WARN').length : 0);
const nW = findings.filter(f => f.lvl === 'WARN').length;
const tc = f => { const s = f / fps; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
fs.mkdirSync(F('review'), { recursive: true });
const md = [];
md.push(`# Pre-production check · ${SB.film || path.basename(DIR)}`, '');
md.push(`${shots.length} shots · ${scenes.length} scenes · ${(total / fps).toFixed(2)} s (${total} f at ${fps} fps)${voEnd != null ? ` · voice ends f${voEnd}` : ' · no vo/words.json yet (timing from dur)'}`);
md.push(`Climax: ${climax >= 0 ? shots[climax].id : '?'} · cards ${(cardSec).toFixed(1)} s · **${nF ? 'FAIL' : 'PASS'}**: ${findings.filter(f => f.lvl === 'FAIL').length} FAIL, ${nW} WARN${strict ? ' (strict)' : ''}`, '');
md.push('## Findings', '', '| Level | Check | Where | What |', '| --- | --- | --- | --- |');
const RANK = { FAIL: 0, WARN: 1, INFO: 2 };
for (const f of [...findings].sort((a, b) => RANK[a.lvl] - RANK[b.lvl])) md.push(`| ${f.lvl} | ${f.id} | ${f.where} | ${f.msg.replace(/\|/g, '/')} |`);
if (!findings.length) md.push('| – | – | – | no findings |');
md.push('', 'Fixes for each check id: PREPRO.md section 8.', '', '> This is the **measured** half only. A PASS here is not an approval: the judged evidence and Kai\'s approval are checked by `stagegate.mjs` (GATES.json).', '', '## Shots', '',
  '| Shot | Scene | In | Len | Size | Angle | Lens | Move | Story | Visual (sz/ln/an/mv/ct) | Flags | Lines | Purpose |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
shots.forEach((s, i) => md.push(`| ${s.id} | ${s.scene ?? ''} | ${tc(s.a)} | ${s.sec.toFixed(1)} s | ${s.size ?? ''} | ${s.angle ?? ''} | ${s.lens ?? ''} | ${s.move ?? ''} | ${s.story ?? ''} | ${s.vis.v} (${s.vis.size}/${s.vis.lens}/${s.vis.ang}/${s.vis.mv}/${s.vis.cut}) | ${flags[i].join(' ')} | ${s.on.join(' ')} | ${String(s.purpose ?? '').replace(/\|/g, '/')} |`));
const out = path.resolve(DIR, A.out || 'review/prepro.md');
fs.writeFileSync(out, md.join('\n') + '\n');
fs.writeFileSync(F('review/shots.csv'), ['shot,scene,f0,f1,sec,size,angle,lens,move,story,visual,flags,lines',
  ...shots.map((s, i) => [s.id, s.scene, s.a, s.b, s.sec.toFixed(2), s.size, s.angle, s.lens ?? '', s.move, s.story, s.vis.v, flags[i].join(' '), s.on.join(' ')].join(','))].join('\n') + '\n');

// intensity graph: story (dashed) vs visual (solid) per shot, climax marked, flagged shots dotted red
const W = 960, H = 360, L0 = 56, R0 = 24, T0 = 48, B0 = 64, n = shots.length;
const X = i => L0 + (n === 1 ? 0.5 : i / (n - 1)) * (W - L0 - R0), Y = v => T0 + (1 - v / 10) * (H - T0 - B0);
const pl = arr => arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif" font-size="12">`,
  `<rect width="${W}" height="${H}" fill="#fff"/>`,
  `<text x="${L0}" y="24" font-size="15" font-weight="600" fill="#222">Story vs visual intensity · ${SB.film || ''}</text>`,
  ...[0, 2, 4, 6, 8, 10].map(v => `<line x1="${L0}" x2="${W - R0}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5e5e5"/><text x="${L0 - 8}" y="${Y(v) + 4}" text-anchor="end" fill="#777">${v}</text>`),
  hookEnd > 0 ? `<rect x="${L0}" y="${T0}" width="${Math.max(0, X(hookEnd - 1) - L0 + 6)}" height="${H - T0 - B0}" fill="#f3efe6"/><text x="${L0 + 4}" y="${H - B0 - 6}" fill="#999">hook</text>` : '',
  climax >= 0 ? `<line x1="${X(climax)}" x2="${X(climax)}" y1="${T0}" y2="${H - B0}" stroke="#d97757" stroke-dasharray="4 4"/><text x="${X(climax) > W - 90 ? X(climax) - 4 : X(climax) + 4}" y="${T0 + 12}" text-anchor="${X(climax) > W - 90 ? 'end' : 'start'}" fill="#b4583a">climax ${shots[climax].id}</text>` : '',
  `<polyline points="${pl(st)}" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="6 4"/>`,
  `<polyline points="${pl(vv)}" fill="none" stroke="#2a5bd8" stroke-width="2.5"/>`,
  ...shots.map((s, i) => `<circle cx="${X(i)}" cy="${Y(vv[i])}" r="${flags[i].length ? 5 : 3.5}" fill="${flags[i].length ? '#c0392b' : '#2a5bd8'}"/><text x="${X(i)}" y="${H - B0 + 16}" text-anchor="end" transform="rotate(-50 ${X(i)} ${H - B0 + 16})" fill="#444">${s.id}</text>`),
  `<text x="${W - R0}" y="24" text-anchor="end" fill="#555">— visual (blue) · - - story (grey) · red dot = flagged</text>`, '</svg>'];
fs.writeFileSync(F('review/intensity.svg'), svg.join('\n'));
console.log(`${path.relative(ROOT, out)}: ${nF ? 'FAIL' : 'PASS'} · ${findings.filter(f => f.lvl === 'FAIL').length} FAIL, ${nW} WARN · ${shots.length} shots, ${(total / fps).toFixed(1)} s · review/intensity.svg, review/shots.csv`);
process.exit(nF ? 1 : 0);
