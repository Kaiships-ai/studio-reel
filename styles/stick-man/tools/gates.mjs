// Gates for a stick-man reel: reads the shot.mjs report and measures the mp4 (loudness, colour), prints PASS/FAIL
// per gate and exits 1 on any FAIL. Thresholds and their sources: .claude/skills/make-reel-stick-man/GATES.md.
// Never loosen a threshold to make a reel pass: fix the reel, or ask Kai.
//   node styles/stick-man/tools/gates.mjs --report films/x/review/x-stats.txt --in films/x/renders/x.mp4 [--out films/x/review/x-gates.txt]
//     [--film films/x [--dbg films/x/review/x-dbg.jsonl]]
// The report comes from: node styles/stick-man/tools/shot.mjs --film films/x --frames 0-<last> --report <stats.txt> --in <mp4>
// --film adds the story gates (storyboard.json against __dbg: duration, sets, shot variety, shot grammar, props / fx use and presence,
// and the judged board verdict review/board-verdict.json). Without --dbg it runs shot.mjs --dbg itself (~1 min).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { decode, measure } from './look_measure.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!A.report || !A.in) { console.error('usage: gates.mjs --report <stats.txt> --in <reel.mp4> [--film films/<slug>] [--profile full|pilot] [--out <gates.txt>]'); process.exit(2); }
// --profile pilot (GATES.md "Gate profiles"): the reference gates (measured from one reference short) still print, as
// WAIVED instead of FAIL, and never set the exit code; safety and quality gates block as always. Thresholds never change.
const PROFILE = A.profile || 'full';
if (!['full', 'pilot'].includes(PROFILE)) { console.error(`unknown --profile ${PROFILE} (full | pilot)`); process.exit(2); }
const REFERENCE_GATES = new Set(['clear frames', 'still frames', 'small-figure run', 'colour SATAVG', 'shadow contrast', 'colour per shot', 'ink thickness',
  'caption height', 'caption weight', 'hard cuts', 'dissolves', 'rush peak', 'time in moves', 'shot length CV', 'light per place', 'first move',
  'outline thick/thin', 'mouth movement', 'bed in pauses', 'duration', 'distinct sets', 'shot variety', 'shot types', 'shot type run',
  'establishing shot', 'insert shot', 'wide share', 'low angle share', 'open on the verb', 'dressing density', 'style judge', 'blind test']);
const waived = g => PROFILE === 'pilot' && !g[2] && REFERENCE_GATES.has(g[0]);
for (const f of [A.report, A.in]) if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
const R = fs.readFileSync(A.report, 'utf8');

const G = [];                                             // [name, value text, pass, threshold text]
const gate = (name, ok, got, want) => G.push([name, got, ok, want]);
const num = (re, s = R) => { const m = re.exec(s); return m ? Number(m[1]) : null; };
const missing = name => gate(name, false, 'not in report', 're-run shot.mjs --report with --in and --frames');

// (a) clear and still frames
const clear = num(/clear \(>= 1\.0\) \d+\s+([\d.]+) %/), still = num(/still \(< 0\.2\) \d+\s+([\d.]+) %/);
clear == null ? missing('clear frames') : gate('clear frames', clear >= 94, `${clear} %`, '>= 94 %');
still == null ? missing('still frames') : gate('still frames', still < 1, `${still} %`, '< 1 %');

// (b) camera speed
const cam = /camera speed at 720p: peak ([\d.]+) px\/frame \(frame (\d+)\)/.exec(R);
// a ceiling only (FORENSIC.md fix 2: the reference rushes at 97-106 px/f p90, max 142 at 1080 = 95 at 720; the old 25 px/f cap
// was the opposite of the reference). The rush itself is the forensic `rush peak` gate.
cam ? gate('camera speed', Number(cam[1]) <= 95, `${cam[1]} px/f (frame ${cam[2]})`, '<= 95 px/f at 720p') : missing('camera speed');

// per actor: frozen run, arm ratio, joint change, head cut
const actors = [...R.matchAll(/^ {4}(\w+): blinks[^\n]*\n([\s\S]*?)(?=^ {4}\w+: blinks|^ {4}largest figure|^\(d\))/gm)];
if (!actors.length) missing('acting (per actor)');
const worst = (key, pick) => { let w = null; for (const [, n, body] of actors) { const v = pick(body); if (v && (!w || v.v > w.v)) w = { ...v, n }; } return w; };
const frozen = worst('frozen', b => { const m = /longest frozen run (\d+) frames(?: \(ends (\d+)\))?/.exec(b); return m && { v: +m[1], at: m[2] }; });
const ratio = worst('ratio', b => { const m = /largest arm length ratio ([\d.]+)(?: \(frame (\d+)\))?/.exec(b); return m && { v: +m[1], at: m[2] }; });
const joint = worst('joint', b => { const m = /largest one-frame joint change ([\d.]+) deg(?: \(frame (\d+), ([^)]+)\))?/.exec(b); return m && { v: +m[1], at: m[2] && `${m[2]}, ${m[3]}` }; });
const perActor = (label, w, limit, unit, want) => {
  if (!w) return missing(label);
  const bad = actors.map(([, n, b]) => [n, b]).filter(([, b]) => { const v = label === 'frozen run' ? num(/longest frozen run (\d+)/, b)
    : label === 'arm length ratio' ? num(/arm length ratio ([\d.]+)/, b) : num(/joint change ([\d.]+) deg/, b); return v > limit; }).map(([n]) => n);
  // joint change: the worst actor's five worst frames, so one fix round can take them all
  const top = label === 'joint change' ? /joint change top 5: ([^\n]*); frames over/.exec(actors.find(([, n]) => n === w.n)?.[2] || '')?.[1] : null;
  gate(label, w.v <= limit, `${w.v}${unit} (${w.n}${w.at ? ', frame ' + w.at : ''})${bad.length ? '; over: ' + bad.join(', ') : ''}${top && w.v > limit ? '; top 5: ' + top : ''}`, want);
};
if (actors.length) {
  perActor('frozen run', frozen, 8, ' f', '<= 8 f');
  perActor('arm length ratio', ratio, 1.03, '', '<= 1.03');
  perActor('joint change', joint, 25, ' deg', '<= 25 deg/f');
  const cut = actors.filter(([, , b]) => !/head cut by the top edge: never/.test(b)).map(([, n, b]) => `${n} ${/head cut by the top edge: (.*)/.exec(b)?.[1]}`);
  gate('head never cut', !cut.length, cut.length ? cut.join('; ') : 'never', 'never');
  // acting gates (GATES.md): every lead acts with the body >= 70 % of its in-frame frames
  const ba = actors.map(([, n, b]) => { const m = /body acting: ([\d.]+) % of (\d+) lead frames/.exec(b); return m && +m[2] > 0 ? [n, +m[1], +m[2]] : null; }).filter(Boolean);
  if (!actors.some(([, , b]) => /body acting:/.test(b))) missing('body acting');
  else if (!ba.length) gate('body acting', false, 'no lead in frame', '>= 70 % per lead');
  else { const low = ba.filter(x => x[1] < 70), w = ba.reduce((a, b) => (b[1] < a[1] ? b : a));
    gate('body acting', !low.length, `lowest ${w[1]} % (${w[0]}, ${w[2]} f)${low.length ? '; under: ' + low.map(x => x[0]).join(', ') : ''}; ${ba.map(x => x[0] + ' ' + x[1]).join(', ')}`, '>= 70 % per lead'); }
}
// mouth range (FORENSIC.md fix 8: reference mouth-area CV 0.33-0.56, ours was 0.06-0.21): an actor who talks >= 30 frames
// opens and closes the mouth for real. Head holds / moves are principles (report line "micro:"), not gates.
const mouths = actors.map(([, n, b]) => { const m = /mouth CV ([\d.]+) over (\d+) talking frames/.exec(b); return m && +m[2] >= 30 ? [n, +m[1]] : null; }).filter(Boolean);
if (mouths.length) { const w = mouths.reduce((a, b) => (b[1] < a[1] ? b : a)); gate('mouth range', w[1] >= 0.4, `lowest CV ${w[1]} (${w[0]})`, '>= 0.4 per talking actor'); }
const fg = /\(g\) faces: (\d+) distinct expressions on screen over ([\d.]+) s \(([^)]*)\); expression lead before its word: worst (-?\d+|-)(?: f \(([^)]*)\))?/.exec(R);
if (!fg) { missing('expressions'); missing('expression lead'); }
else {
  const need = Math.ceil(5 * Math.max(30, +fg[2]) / 30);
  gate('expressions', +fg[1] >= need, `${fg[1]} (${fg[3]})`, `>= ${need} per reel (5 / 30 s)`);
  gate('expression lead', fg[4] === '-' || +fg[4] >= 3, fg[4] === '-' ? 'no worded changes' : `worst ${fg[4]} f before its word (${fg[5]})`, '>= 3 f before the word');
}

// small figures
const small = /largest figure under 30 % of frame height in ([\d-]+): longest run (\d+) frames(?: \(ends (\d+)\))?/.exec(R);
// <= 120 f (was 45): wide / establishing shots carry ~a third of the reference runtime and hold like any shot (shot p90 4.2-6.4 s)
small ? gate('small-figure run', +small[2] <= 120, `${small[2]} f${small[3] ? ' (ends ' + small[3] + ')' : ''}, over ${small[1]}`, '<= 120 f') : missing('small-figure run');

// (d) hand to held prop
const holds = [...R.matchAll(/^ {4}(\w+): ([\d.]+) px(?: \(frame ([^)]+)\))? over (\d+) held frames/gm)];
if (/no held props on screen/.test(R)) gate('hand-prop gap', true, 'no held props', '<= 2 px at 1080p');
else if (!holds.length) missing('hand-prop gap');
else { const w = holds.reduce((a, b) => (+b[2] > +a[2] ? b : a)); gate('hand-prop gap', +w[2] <= 2, `${w[2]} px (${w[1]}${w[3] ? ', frame ' + w[3] : ''})`, '<= 2 px at 1080p'); }

// (e) collisions
const col = /\(e\) actor body inside set collision boxes \(target none\): (.*)/.exec(R);
col ? gate('collisions', col[1].trim() === 'none', col[1].trim(), 'none') : missing('collisions');

// (f) close-ups head x
const cus = [...R.matchAll(/^ {4}shot (.*), frames ([\d-]+): min ([\d.]+), median [\d.]+, max ([\d.]+)/gm)];
if (!/\(f\) close-ups/.test(R)) missing('close-up head x');
else if (!cus.length) gate('close-up head x', true, 'no close-ups', '45-55 %');
else {
  const bad = cus.filter(m => +m[3] < 45 || +m[4] > 55);
  const lo = Math.min(...cus.map(m => +m[3])), hi = Math.max(...cus.map(m => +m[4]));
  gate('close-up head x', !bad.length, `${lo}-${hi} % over ${cus.length} shots${bad.length ? '; out: ' + bad.map(m => `${m[1]} (${m[2]})`).join(', ') : ''}`, '45-55 %');
}

// loudness of the mp4's audio (ffmpeg ebur128, true peak)
const eb = run('ffmpeg', ['-hide_banner', '-nostats', '-i', path.resolve(A.in), '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { capture: true });
const sum = (eb.stderr || '').split('Summary:').pop();
const I = num(/I:\s+(-?[\d.]+) LUFS/, sum), TP = num(/Peak:\s+(-?[\d.]+) dBFS/, sum);
I == null ? missing('mix loudness') : gate('mix loudness', Math.abs(I + 14) <= 0.5, `${I} LUFS`, '-14 +-0.5 LUFS');
TP == null ? missing('true peak') : gate('true peak', TP <= -1, `${TP} dBTP`, '<= -1 dBTP');

// colour: signalstats on 2 frames a second, median over the samples
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-gates-')), mt = path.join(tmp, 'c.txt');
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.resolve(A.in), '-vf',
  `fps=2,signalstats,metadata=print:file=${mt.replace(/\\/g, '/').replace(/:/g, '\\:')}`, '-f', 'null', '-']);
const ct = fs.existsSync(mt) ? fs.readFileSync(mt, 'utf8') : ''; fs.rmSync(tmp, { recursive: true, force: true });
const col1 = k => ct.split('\n').filter(l => l.includes(`.${k}=`)).map(l => Number(l.split('=')[1])).sort((a, b) => a - b);
const med = v => v[v.length >> 1];
const Y = col1('YAVG'), S = col1('SATAVG');
if (!Y.length) missing('colour'); else {
  // (the old `colour YAVG median 109-163` gate is gone: jar 104 and rail 107 failed it; brightness per place is the forensic
  // `light per place` gate: shot YAVG std >= 20, a shot under 95, median 105-130)
  gate('colour SATAVG', med(S) >= 19 && med(S) <= 47, `median ${med(S).toFixed(1)} (range ${S[0].toFixed(0)}-${S[S.length - 1].toFixed(0)})`, 'median 19-47');
}

// ---------------------------------------------------------------- look gates (GATES.md "Look gates")
// Reference numbers measured with the same code (tools/look_measure.mjs, ffmpeg signalstats) on ref-private frames:
// 60 tiles of the two 30-tile reference sheets (colour, contrast) and 3 full-size frames (ink, caption).
// per shot (11/11 forensic): measured with this same signalstats code on the four full reference videos (2 a second):
// YAVG p5-p95 61-168, SAT p5-p95 13-54, YLOW min 17 (pink's black frame excluded); the old 84-158 / 36-101 came from 60
// sheet tiles and failed every dark place the reference has
const LOOK = { ink: [2, 3], ratio: [0.235, 0.388], cap: 54, capTol: 0.10,
  shot: { YAVG: [60, 170], SATAVG: [13, 54], YLOW: [17, 101] } };
{
  // per-sample signalstats (2 a second) in order; mp4 is tv range, the reference stills full range: convert to full
  const per = []; let cur = null;
  for (const l of ct.split('\n')) {
    if (l.startsWith('frame:')) { cur = {}; per.push(cur); continue; }
    const m = /signalstats\.(\w+)=([\d.]+)/.exec(l); if (m && cur) cur[m[1]] = Number(m[2]);
  }
  const fy = v => (v - 16) * 255 / 219, fc = v => v * 255 / 224;
  const ratios = per.filter(x => x.YHIGH > 16).map(x => (x.YLOW - 16) / (x.YHIGH - 16)).sort((a, b) => a - b);
  ratios.length ? gate('shadow contrast', med(ratios) >= LOOK.ratio[0] && med(ratios) <= LOOK.ratio[1],
    `median ${med(ratios).toFixed(3)} (range ${ratios[0].toFixed(2)}-${ratios[ratios.length - 1].toFixed(2)})`, `P10/P90 luma ${LOOK.ratio.join('-')}`) : missing('shadow contrast');
  // per shot: needs __dbg (shot index per frame)
  const rows = await lookDbg();
  // body contact (engine/body.js): no hand or arm inside a head or a torso, measured after the contact solve
  if (rows) {
    let pen = 0, at = null, bad = 0;
    for (const r of rows) for (const [n, a] of Object.entries(r.actors || {})) for (const s of ['L', 'R']) {
      const L = a.limbs?.[s]; if (!L || !('penCm0' in L)) continue;
      if (L.penCm == null) { bad++; continue; }
      if (L.penCm > pen) { pen = L.penCm; at = `${n} f${r.f}`; }
    }
    gate('body contact', pen <= 0.1 && !bad, `max ${pen.toFixed(2)} cm${at ? ` (${at})` : ''}${bad ? `, ${bad} broken poses` : ''}`, '<= 0.1 cm into head / torso');
  }
  if (!rows) { missing('colour per shot'); missing('caption height'); }
  else {
    const byF = new Map(rows.map(r => [r.f, r])), shots = new Map();
    per.forEach((x, i) => { const r = byF.get(Math.round(i * 15)); if (!r) return; const k = `${r.act ?? ''}#${r.shotI} ${r.set}`;
      (shots.get(k) || shots.set(k, []).get(k)).push(x); });
    const bad = [];
    for (const [k, xs] of shots) {
      if (xs.length < 2) continue;
      const m3 = { YAVG: med(xs.map(x => fy(x.YAVG)).sort((a, b) => a - b)), SATAVG: med(xs.map(x => fc(x.SATAVG)).sort((a, b) => a - b)), YLOW: med(xs.map(x => fy(x.YLOW)).sort((a, b) => a - b)) };
      const off = Object.entries(LOOK.shot).filter(([q, [lo, hi]]) => m3[q] < lo || m3[q] > hi).map(([q]) => `${q} ${m3[q].toFixed(0)}`);
      if (off.length) bad.push(`${k}: ${off.join(', ')}`);
    }
    gate('colour per shot', !bad.length, bad.length ? `out: ${bad.join('; ')}` : `${shots.size} shots in range`, 'YAVG 60-170, SAT 13-54, YLOW 17-101');
    // ink + caption on 1 frame a second at 1080x1920
    const fr = decode(A.in, 1), ink = [], cap = [], stem = [], strk = [];
    fr.forEach((rgb, i) => { const m = measure(rgb); if (m.inkRuns > 50) ink.push(m.inkPx); if (m.capStem) stem.push(m.capStem); if (m.capStroke) strk.push(m.capStroke);
      const t = byF.get(i * 30)?.caption; if (t && m.capPx > 0 && !/[gjpqy,;]/.test(t) && /[A-Zbdfhiklt]/.test(t)) cap.push(m.capPx); });
    ink.sort((a, b) => a - b); cap.sort((a, b) => a - b);
    ink.length ? gate('ink thickness', med(ink) >= LOOK.ink[0] && med(ink) <= LOOK.ink[1], `median ${med(ink)} px (${ink.length} frames, range ${ink[0]}-${ink[ink.length - 1]})`, `${LOOK.ink.join('-')} px at 1080 wide`) : missing('ink thickness');
    const lo = LOOK.cap * (1 - LOOK.capTol), hi = LOOK.cap * (1 + LOOK.capTol);
    cap.length ? gate('caption height', med(cap) >= lo && med(cap) <= hi, `median ${med(cap)} px (${cap.length} frames)`, `${lo.toFixed(1)}-${hi.toFixed(1)} px at 1920`) : missing('caption height');
    // caption weight (measured on 28 reference frames 11/11: stem 15-16 px, stroke median 7 px): a heavy face with a 7 px rim
    stem.sort((a, b) => a - b); strk.sort((a, b) => a - b);
    stem.length ? gate('caption weight', med(stem) >= 14 && med(stem) <= 18 && med(strk) >= 6 && med(strk) <= 9, `stem ${med(stem)} px, stroke ${med(strk)} px (${stem.length} frames)`, 'stem 14-18, stroke 6-9 px at 1080') : missing('caption weight');
  }
}
// __dbg rows for --film (made once with shot.mjs --dbg at 540x960 and shared with the story gates through A.dbg)
async function lookDbg() {
  if (!A.film) return null;
  if (!A.dbg) {
    const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), F = p => path.join(ROOT, A.film, p);
    const R1 = await (await import('./reel_load.mjs')).loadReel(F('.'), 'reel.js');
    const R2 = fs.existsSync(F('reel2.js')) ? await (await import('./reel_load.mjs')).loadReel(F('.'), 'reel2.js') : null;
    const d = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stick-look-')), 'dbg.jsonl');
    const r = run('node', [path.join(ROOT, 'styles/stick-man/tools/shot.mjs'), '--film', A.film, '--frames', `0-${(R2 || R1).frames[1]}`, '--dbg', d, '--w', '540', '--h', '960'], { capture: true });
    if (r.status) return null;
    A.dbg = d;
  }
  return fs.readFileSync(A.dbg, 'utf8').trim().split('\n').map(l => JSON.parse(l));
}

const pad = (s, n) => String(s).padEnd(n);
const fmt = g => { const [n, got, ok, want] = g; return `${ok ? 'PASS' : waived(g) ? 'WAIVED' : 'FAIL'}  ${pad(n, 18)} ${pad(want, 20)} ${got}`; };
const lines = [`gates for ${path.basename(A.in)} (report ${path.basename(A.report)})`, ...G.map(fmt)];
const fails = G.filter(g => !g[2]).length;
lines.push(fails ? `${fails} of ${G.length} gates FAIL` : `all ${G.length} gates PASS`);
const SG = A.film ? await story(A.film) : [];
// forensic gates (FORENSIC.md ranked fixes 1-10, measured on the mp4 by the scripts that measured the reference)
const FG = [];
if (A.film) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const out = A.forensic || A.in.replace(/\.mp4$/, '') + '-forensic.json';
  const r = run('python', [path.join(ROOT, 'styles/stick-man/tools/forensic/measure.py'), path.resolve(A.in), '--words', path.join(ROOT, A.film, 'vo/words.json'), '--out', path.resolve(out)], { capture: true });
  if (r.status || !fs.existsSync(out)) FG.push(['forensic', 'measure.py failed: ' + String(r.stderr || '').slice(-300), false, 'runs']);
  else for (const [n, ok, got, want] of JSON.parse(fs.readFileSync(out, 'utf8')).gates) FG.push([n, got, ok, want]);
}
if (FG.length) { const ff = FG.filter(g => !g[2]).length; lines.push('', 'forensic gates (FORENSIC.md fixes 1-10)', ...FG.map(fmt), ff ? `${ff} of ${FG.length} forensic gates FAIL` : `all ${FG.length} forensic gates PASS`); }
if (SG.length) { const sf = SG.filter(g => !g[2]).length; lines.push('', `story gates (${A.film}/storyboard.json)`, ...SG.map(fmt), sf ? `${sf} of ${SG.length} story gates FAIL` : `all ${SG.length} story gates PASS`); }
{ const all = [...G, ...SG, ...FG], w = all.filter(waived).length, b = all.filter(g => !g[2] && !waived(g)).length;
  lines.push('', `profile ${PROFILE}: ${all.length - b - w} PASS, ${b} blocking FAIL${w ? `, ${w} reference gates WAIVED` : ''}`); }
const out = lines.join('\n') + '\n'; process.stdout.write(out);
if (A.out) { fs.mkdirSync(path.dirname(path.resolve(A.out)), { recursive: true }); fs.writeFileSync(A.out, out); }
const blocking = [...G, ...SG, ...FG].filter(g => !g[2] && !waived(g));
process.exit(blocking.length ? 1 : 0);

// ---------------------------------------------------------------- story gates (computed from the storyboard and __dbg)
// Thresholds: GATES.md "Story gates". A line's window = its first word to the next line's first word.
async function story(film) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), F = p => path.join(ROOT, film, p);
  const T = []; const sg = (name, ok, got, want) => T.push([name, got, ok, want]);
  if (!fs.existsSync(F('storyboard.json'))) { sg('storyboard', false, `no ${film}/storyboard.json`, 'one entry per line'); return T; }
  const SB = JSON.parse(fs.readFileSync(F('storyboard.json'), 'utf8')), script = JSON.parse(fs.readFileSync(F('vo/script.json'), 'utf8'));
  const words = JSON.parse(fs.readFileSync(F('vo/words.json'), 'utf8'));
  let dbg = A.dbg;
  const R1 = await (await import('./reel_load.mjs')).loadReel(F('.'), 'reel.js');
  const R2 = fs.existsSync(F('reel2.js')) ? await (await import('./reel_load.mjs')).loadReel(F('.'), 'reel2.js') : null;
  if (!dbg) {
    const last = (R2 || R1).frames[1];
    dbg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stick-story-')), 'dbg.jsonl');
    const r = run('node', [path.join(ROOT, 'styles/stick-man/tools/shot.mjs'), '--film', film, '--frames', `0-${last}`, '--dbg', dbg, '--w', '540', '--h', '960'], { capture: true });
    if (r.status) { sg('story dbg', false, 'shot.mjs --dbg failed: ' + (r.stderr || '').slice(0, 200), 'runs'); return T; }
  }
  const rows = fs.readFileSync(dbg, 'utf8').trim().split('\n').map(l => JSON.parse(l)), fps = 30;
  const ids = script.lines.map(l => l.id), E = Object.fromEntries((SB.lines || []).map(e => [e.id, e]));
  const t0 = id => words.find(w => w.line === id)?.t0;
  const win = ids.map((id, i) => { const a = Math.round(t0(id) * fps), b = i + 1 < ids.length ? Math.round(t0(ids[i + 1]) * fps) : rows[rows.length - 1].f + 1; return { id, a, b }; });
  const inWin = w => rows.filter(r => r.f >= w.a && r.f < w.b);
  // 1 duration
  const dur = rows.length / fps;
  // the locked series length (Kai 11/11: episodes 60-80 s; the reference runs 63.5-65.2 s). A test film (slug with "test")
  // is a short engine check and is exempt.
  if (/test/i.test(path.basename(A.film))) sg('duration', true, `${dur.toFixed(1)} s (${rows.length} frames), test film: exempt`, '60-80 s (test films exempt)');
  else sg('duration', dur >= 60 && dur <= 80, `${dur.toFixed(1)} s (${rows.length} frames)`, '60-80 s');
  // 2 distinct sets (on screen >= 15 frames each)
  const setN = {}; for (const r of rows) if (r.set) setN[r.set] = (setN[r.set] || 0) + 1;
  const sets = Object.entries(setN).filter(([, n]) => n >= 15).map(([k]) => k);
  sg('distinct sets', sets.length >= 3, `${sets.length}: ${sets.join(', ')}`, '>= 3 sets or cutaways');
  // 3 shot variety: each line's main set + shot kind (most frames in its window); no run of more than 2 lines alike
  const kind = r => `${r.set}/${(r.camera?.shot || '?').split('(')[0]}`;
  const main = win.map(w => { const c = {}; for (const r of inWin(w)) c[kind(r)] = (c[kind(r)] || 0) + 1; return [w.id, Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] || '?']; });
  let run1 = 1, worst = 1, at = main[0]?.[0];
  for (let i = 1; i < main.length; i++) { run1 = main[i][1] === main[i - 1][1] ? run1 + 1 : 1; if (run1 > worst) { worst = run1; at = `${main[i - run1 + 1][0]}-${main[i][0]} ${main[i][1]}`; } }
  sg('shot variety', worst <= 2, `longest run ${worst} line(s) alike${worst > 1 ? ' (' + at + ')' : ''}`, '<= 2 lines same set + shot');
  // 3b shot grammar (camera.js kinds): how many kinds, no run of 3 lines in one kind, an establishing and an insert shot
  const kindOf = r => (r.camera?.shot || '?').split('(')[0], kindN = {};
  for (const r of rows) kindN[kindOf(r)] = (kindN[kindOf(r)] || 0) + 1;
  const kinds = Object.entries(kindN).filter(([k, n]) => n >= 15 && k !== '?').map(([k]) => k), needK = Math.max(4, Math.round(4 * dur / 30));
  sg('shot types', kinds.length >= needK, `${kinds.length}: ${kinds.join(', ')}`, `>= ${needK} kinds (>= 15 f each)`);
  const lk = win.map(w => { const c = {}; for (const r of inWin(w)) c[kindOf(r)] = (c[kindOf(r)] || 0) + 1; return [w.id, Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] || '?']; });
  let kr = 1, kw = 1, kat = lk[0]?.[0];
  for (let i = 1; i < lk.length; i++) { kr = lk[i][1] === lk[i - 1][1] ? kr + 1 : 1; if (kr > kw) { kw = kr; kat = `${lk[i - kr + 1][0]}-${lk[i][0]} ${lk[i][1]}`; } }
  sg('shot type run', kw <= 2, `longest run ${kw} line(s)${kw > 1 ? ' (' + kat + ')' : ''}; lines: ${lk.map(x => x[1]).join(' ')}`, '<= 2 lines same shot kind');
  const est = kinds.filter(k => ['est', 'aerial'].includes(k)), ins = kinds.filter(k => ['insert', 'macro', 'top'].includes(k));
  sg('establishing shot', est.length > 0, est.join(', ') || 'none', '>= 1 est / aerial');
  sg('insert shot', ins.length > 0, ins.join(', ') || 'none', '>= 1 insert / macro / top');
  // 3c shot sizes (FORENSIC.md fix 5): establishing + wide >= 30 % of frames, low angle >= 7 % (reference 32 %, 7.3 %)
  const shareOf = ks => Math.round(1000 * rows.filter(r => ks.includes(kindOf(r))).length / rows.length) / 10;
  const ew = shareOf(['est', 'aerial', 'wide']), lo = shareOf(['low']);
  sg('wide share', ew >= 30, `${ew} % est / aerial / wide`, '>= 30 % of frames');
  sg('low angle share', lo >= 7, `${lo} % low`, '>= 7 % of frames');
  // 3d open on the verb (FORENSIC.md fix 6): a character is mid-action (a body verb) in >= 10 of frames 0-20
  const open = rows.filter(r => r.f <= 20 && Object.values(r.actors).some(a => a.inFrame && (a.verb || []).some(v => !['talk', 'look', 'blink'].includes(v)))).length;
  sg('open on the verb', open >= 10, `${open} of the first 21 frames show a body verb`, '>= 10 of frames 0-20');
  // 4 + 5 every line has an entry; its props / fx are seen (>= 3 frames in its window); >= 40 % of lines use one
  const noEntry = ids.filter(id => !E[id]), unseen = [], using = [];
  for (const w of win) {
    const e = E[w.id]; if (!e) continue; const want = [...(e.props || []), ...(e.fx || []), ...(e.labels || [])], fr = inWin(w);
    const miss = want.filter(n => fr.filter(r => (r.seen || []).includes(n)).length < 3);
    if (miss.length) unseen.push(`${w.id}: ${miss.join(' ')}`);
    if (want.length && miss.length < want.length) using.push(w.id);
  }
  sg('storyboard entries', !noEntry.length, noEntry.length ? 'missing ' + noEntry.join(', ') : `${ids.length}/${ids.length} lines`, 'one entry per spoken line');
  const share = using.length / ids.length;
  sg('props / fx used', share >= 0.4, `${Math.round(100 * share)} % (${using.length}/${ids.length}: ${using.join(' ') || '-'})`, '>= 40 % of lines');
  sg('props / fx seen', !unseen.length, unseen.length ? 'not on screen: ' + unseen.join('; ') : 'every listed prop / fx on screen in its line', 'listed = in __dbg seen');
  // 6-8 world and fx (GATES.md "World and fx gates"): dressing density, floating-label budget, every storyboard fx in the world
  const ACTS = [{ ...R1, name: R1.name || 'lobby' }, ...(R2?.acts || [])].map(a => ({ name: a.name || a.set, make: a.make || {} }));
  const makeKind = (act, n) => ACTS.find(a => a.name === act)?.make?.[n]?.kind;
  // dressing: registered set pieces the camera sees (dress.js); cu frames, prop-only cutaway tables and dissolves left out
  const DRESS_N = 16;                                       // distinct objects in the reference medium frame (wide: 21)
  const dr = rows.filter(r => r.dress != null && r.mix == null && r.set !== 'cutaway' && !/^cu/.test(r.camera?.shot || ''));
  if (!dr.length) sg('dressing density', false, 'no dress counts in __dbg (re-run shot.mjs --dbg)', `>= ${DRESS_N} pieces in 85 % of frames`);
  else {
    const ok = dr.filter(r => r.dress >= DRESS_N).length / dr.length, med = dr.map(r => r.dress).sort((a, b) => a - b)[dr.length >> 1];
    const per = {}; for (const r of dr) (per[r.act] ||= []).push(r.dress);
    const low = Object.entries(per).map(([a, v]) => [a, v.sort((x, y) => x - y)[v.length >> 1]]).filter(([, m]) => m < DRESS_N);
    sg('dressing density', ok >= 0.85, `${Math.round(100 * ok)} % of ${dr.length} non-cu frames >= ${DRESS_N}, median ${med}${low.length ? '; low acts: ' + low.map(([a, m]) => `${a} ${m}`).join(', ') : ''}`, `>= ${DRESS_N} pieces in 85 % of frames`);
  }
  // floating labels: stamp / callout / bars / split entries seen >= 3 frames anywhere in the reel
  const LABELS = ['stamp', 'callout', 'bars', 'split'], DIAGRAM = ['rings', 'flow', 'rays', 'star', 'shimmer'];   // lib/props/physfx.js
  const lab = {}; for (const r of rows) for (const n of r.seen || []) if (LABELS.includes(makeKind(r.act, n))) lab[`${r.act}.${n}`] = (lab[`${r.act}.${n}`] || 0) + 1;
  // 0 (FORENSIC.md fix 9): the reference has no text stickers in 4 videos; a fact goes on a sign, label, poster or paper
  const labs = Object.entries(lab).filter(([, c]) => c >= 3).map(([k]) => k);
  sg('floating labels', labs.length === 0, `${labs.length} (${labs.join(', ') || '-'})`, '0 (put it on a sign in the world)');
  // every storyboard fx is an in-world kind (labels go in the entry's `labels`, never in `fx`)
  const notWorld = [];
  for (const w of win) { const e = E[w.id]; if (!e) continue; const acts = [...new Set(inWin(w).map(r => r.act))];
    for (const n of e.fx || []) { const k = acts.map(a => makeKind(a, n)).find(Boolean); if (!k || LABELS.includes(k) || DIAGRAM.includes(k)) notWorld.push(`${w.id}.${n}${k ? ' (' + k + ')' : ' (no make entry)'}`); } }
  sg('fx in world', !notWorld.length, notWorld.length ? notWorld.join(', ') : 'every storyboard fx is a physical object or event', 'no label / diagram kinds in fx');
  // director rule: every line with a character on screen names its body action(s) in `act` (a known verb, never talk)
  // known = engine/poses.js poses + the opt-in pose modules in allout/ (a pose table entry `  name: { A:` or a
  // `POSE_VERBS.name =` registration), so a reel that imports allout/acting.js or allout/rail.js is not failed for using them
  const poseSrc = ['styles/stick-man/engine/poses.js', ...fs.readdirSync(path.join(ROOT, 'styles/stick-man/allout')).filter(n => n.endsWith('.js')).map(n => 'styles/stick-man/allout/' + n)]
    .map(p => fs.readFileSync(path.join(ROOT, p), 'utf8'));
  const known = new Set([...poseSrc[0].matchAll(/^  (\w+): \{/gm), ...poseSrc.slice(1).flatMap(t => [...t.matchAll(/^  (\w+): \{ ?A:/gm), ...t.matchAll(/POSE_VERBS\.(\w+) =/g)])].map(m => m[1])
    .concat(['walk_to', 'turn_to', 'startle', 'step_back', 'cough', 'point', 'wave_small', 'slump', 'pluck', 'let_fall', 'lift', 'drop_in', 'slide', 'sling', 'gesture', 'stand_up']));
  const noAct = [];
  for (const w of win) {
    const e = E[w.id]; if (!e) continue; const people = inWin(w).filter(r => Object.values(r.actors).some(a => a.inFrame)).length >= 15;   // a character on screen >= 0.5 s of the line
    const acts = Object.values(e.act || {}).flat().map(x => String(x).split(/[\s@]/)[0]);
    if (people && (!acts.length || acts.some(v => !known.has(v)))) noAct.push(w.id + (acts.length ? ' (' + acts.filter(v => !known.has(v)).join(' ') + ')' : ''));
  }
  sg('acting plan', !noAct.length, noAct.length ? 'no body action named: ' + noAct.join(', ') : 'every line with a character names its body action', 'storyboard act per line');
  // judged: the board reviewer's verdict (GATES.md, reviewer prompt)
  const vf = F('review/board-verdict.json');
  if (!fs.existsSync(vf)) sg('board shown', false, 'no review/board-verdict.json: run board.mjs, then the reviewer (GATES.md)', '>= 85 % shown');
  else {
    const V = JSON.parse(fs.readFileSync(vf, 'utf8')), L = V.lines || [], ok = L.filter(x => x.shown === true), no = L.filter(x => x.shown !== true).map(x => x.id);
    const cover = ids.every(id => L.some(x => x.id === id)), pct = L.length ? ok.length / ids.length : 0;
    sg('board shown', cover && pct >= 0.85, `${Math.round(100 * pct)} % (${ok.length}/${ids.length})${no.length ? '; not shown: ' + no.join(', ') : ''}${cover ? '' : '; verdict misses lines'}`, '>= 85 % shown');
  }
  // judged: style judge + blind test against the reference (tools/judge.mjs, GATES.md "Style judge"); --judge picks the file
  const jf = A.judge ? path.resolve(A.judge) : F('review/judge.json');
  if (!fs.existsSync(jf)) { sg('style judge', false, 'no review/judge.json: run judge.mjs (GATES.md)', 'mean >= 8.5, no category < 8'); sg('blind test', false, 'no review/judge.json', '<= 8 / 12 told apart'); }
  else {
    const J = JSON.parse(fs.readFileSync(jf, 'utf8')), low = Object.entries(J.categories).sort((a, b) => a[1] - b[1]);
    sg('style judge', J.overall >= 8.5 && low[0][1] >= 8, `overall ${J.overall}, lowest ${low.slice(0, 3).map(([c, v]) => `${c} ${v}`).join(', ')}`, 'mean >= 8.5, no category < 8');
    sg('blind test', !!J.blind && J.blind.separation <= 8, J.blind ? `${J.blind.separation}/12 told apart` : 'not run', '<= 8 / 12 told apart');
  }
  return T;
}
