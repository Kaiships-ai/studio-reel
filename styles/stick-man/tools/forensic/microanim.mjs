// Micro-animation numbers from a reel's __dbg rows (shot.mjs --dbg out.jsonl), the same quantities FORENSIC.md section 3
// measured on the reference (pink / jar / rail / pirate) and on our reels:
//   node styles/stick-man/tools/forensic/microanim.mjs films/x/review/dbg.jsonl [--json out.json]
// Per actor, frames where it is in frame (dissolve / cut frames end a run):
//   mouth   dark mouth area (W^2, measured on the face canvas) - CV over talking frames and over all face frames
//           (reference CV 0.33-0.56, ours 0.06-0.21)
//   faces   distinct face drawings in the 12 frames after each expression change (reference pink f500-512: 5)
//   head    world head speed in head widths (W = 0.60 m) per frame: a hold = < 1.2 % W/f for >= 6 f, a move = >= 1.2 % W/f
//           for >= 4 f (gaps under 3 f merged). Median move length (ref 12-15 f), mean travel of the 6 biggest moves (ref 2.3 W;
//           big beats include walks and throws), median / longest hold (ref 12 / up to 86 f), speed p90 in W/s (ref 3.24).
//           Ours is 3D world motion; the reference is screen motion with the camera removed: compare shapes, not decimals.
//   dead    longest run in which no joint moved 1 mm and no angle 0.3 deg from where the run began (a truly still pose)
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: microanim.mjs <dbg.jsonl> [--json out.json]'); process.exit(2); }
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const W = 0.60, HOLD = 0.012;
const med = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const cv = xs => { if (xs.length < 2) return null; const m = xs.reduce((a, b) => a + b, 0) / xs.length; if (m <= 0) return 0; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m; };
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const JOINTS = ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'hand'], ANG = ['kneeFlex', 'elbowFlex', 'footPitch'];

export function microanim(rows) {
  const out = {};
  for (const n of Object.keys(rows[0].actors)) {
    const R = rows.filter(r => r.actors[n].inFrame);
    if (R.length < 4) continue;
    // mouth
    const talk = R.filter(r => r.actors[n].talking).map(r => r.actors[n].mouthA ?? 0), all = R.map(r => r.actors[n].mouthA ?? 0);
    // faces: distinct drawings in the 12 frames after each expression change
    const changes = [...new Set(R.map(r => r.actors[n].exprFrom).filter(x => x != null))];
    const per12 = changes.map(c => new Set(rows.filter(r => r.f >= c && r.f < c + 12 && r.actors[n].inFrame).map(r => r.actors[n].faceKey)).size);
    // any 12-frame window
    const win12 = []; for (let i = 0; i + 12 <= R.length; i++) win12.push(new Set(R.slice(i, i + 12).map(r => r.actors[n].faceKey)).size);
    // head speed, moves and holds
    const sp = []; let prev = null;
    for (const r of rows) {
      const a = r.actors[n], brk = !a.inFrame || r.motion?.cut || (prev && prev.act !== r.act);
      sp.push(brk || !prev || !prev.actors[n].inFrame ? null : d3(a.headW, prev.actors[n].headW) / W);
      prev = r;
    }
    const runs = (test, minLen, mergeGap = 0) => {
      const o = []; let s = null;
      for (let i = 0; i <= sp.length; i++) { const ok = i < sp.length && sp[i] != null && test(sp[i]);
        if (ok && s == null) s = i; if (!ok && s != null) { o.push([s, i]); s = null; } }
      const m = []; for (const r of o) { const l = m[m.length - 1]; if (l && r[0] - l[1] < mergeGap && sp.slice(l[1], r[0]).every(x => x != null)) l[1] = r[1]; else m.push([...r]); }
      return m.filter(([a, b]) => b - a >= minLen);
    };
    const moves = runs(x => x >= HOLD, 4, 3).map(([a, b]) => ({ f: rows[a].f, len: b - a, travel: sp.slice(a, b).reduce((s, x) => s + (x || 0), 0) }));
    const holds = runs(x => x < HOLD, 6).map(([a, b]) => ({ f: rows[a].f, len: b - a }));
    const big = [...moves].sort((a, b) => b.travel - a.travel).slice(0, 6);
    const live = sp.filter(x => x != null).sort((a, b) => a - b);
    // eighth-spacing of the biggest move (FORENSIC: ref 0.07 in the first eighth, ours 0.12)
    let spacing = null;
    if (big[0]) { const i0 = rows.findIndex(r => r.f === big[0].f), seg = sp.slice(i0, i0 + big[0].len).map(x => x || 0), tot = seg.reduce((a, b) => a + b, 0);
      spacing = Array.from({ length: 8 }, (_, k) => +(seg.slice(0, Math.round(seg.length * (k + 1) / 8)).reduce((a, b) => a + b, 0) / tot).toFixed(2)); }
    // dead pose
    let dead = 0, deadAt = null, anchor = null, run = 0;
    for (const r of rows) {
      const a = r.actors[n], l = a.limbs;
      if (!a.inFrame || !l || r.motion?.cut) { anchor = null; run = 0; continue; }
      if (!anchor) { anchor = a; run = 1; continue; }
      const m = anchor.limbs; let moved = d3(a.headW, anchor.headW) > 0.001 || Math.abs(l.torsoLean - m.torsoLean) > 0.3 || Math.abs(l.torsoRoll - m.torsoRoll) > 0.3;
      for (const s of ['L', 'R']) { for (const j of JOINTS) if (d3(l[s][j], m[s][j]) > 0.001) moved = true; for (const k of ANG) if (Math.abs(l[s][k] - m[s][k]) > 0.3) moved = true; }
      if (moved) { anchor = a; run = 1; } else run++;
      if (run > dead) { dead = run; deadAt = r.f; }
    }
    out[n] = {
      frames: R.length,
      mouthCV_talk: cv(talk), mouthCV_all: cv(all), mouthMax: Math.max(...all), talkFrames: talk.length,
      drawings12_afterChange: per12, drawings12_median: med(win12), drawings12_max: win12.length ? Math.max(...win12) : null,
      headMoves: moves.length, moveLenMedian: med(moves.map(m => m.len)), bigTravelMean: big.length ? big.reduce((s, m) => s + m.travel, 0) / big.length : null,
      holdMedian: med(holds.map(h => h.len)), holdMax: holds.length ? Math.max(...holds.map(h => h.len)) : 0, holds: holds.length,
      speedP90_Wps: live.length ? live[Math.floor(0.9 * (live.length - 1))] * 30 : null, spacing,
      deadRun: dead, deadAt,
    };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = microanim(rows), f = x => x == null ? '-' : typeof x === 'number' ? +x.toFixed(3) : x;
  for (const [n, m] of Object.entries(r)) {
    console.log(`${n}: ${m.frames} f in frame`);
    console.log(`  mouth: CV talking ${f(m.mouthCV_talk)} (${m.talkFrames} f), CV all ${f(m.mouthCV_all)}, max ${f(m.mouthMax)} W^2   [ref CV 0.33-0.56]`);
    console.log(`  faces: drawings in 12 f after each change ${JSON.stringify(m.drawings12_afterChange)}; any 12 f: median ${f(m.drawings12_median)}, max ${f(m.drawings12_max)}   [ref 5 in 12 f]`);
    console.log(`  head: ${m.headMoves} moves, median ${f(m.moveLenMedian)} f, 6 biggest travel mean ${f(m.bigTravelMean)} W; holds ${m.holds}, median ${f(m.holdMedian)} f, longest ${m.holdMax} f; speed p90 ${f(m.speedP90_Wps)} W/s   [ref 13.8 f, 2.26 W, 12 f, up to 86 f, 3.24 W/s]`);
    console.log(`  spacing of the biggest move (eighths): ${m.spacing ? m.spacing.join(' ') : '-'}   [ref 0.07 0.21 0.34 0.48 0.63 0.75 0.86 1.0]`);
    console.log(`  dead pose (no joint 1 mm / angle 0.3 deg from the run start): longest ${m.deadRun} f${m.deadAt != null ? ' (ends ' + m.deadAt + ')' : ''}`);
  }
  const i = process.argv.indexOf('--json'); if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 1) + '\n');
}
