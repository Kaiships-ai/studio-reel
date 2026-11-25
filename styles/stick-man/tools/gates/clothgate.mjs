#!/usr/bin/env node
// Cloth where the kit's cloth is not clean (advisory, ◇4). Reads a film's reel data (reel.js, reel2.js: each act's cast, anim keys and
// beats) and reports every figure that wears a hanging garment (a coat, a skirt, a dress, an apron: kit/cast/clothsafe.js HANGS) while
// it plays a motion the kit marks as not safe for cloth (clothsafe.js UNSAFE: runs, jumps, the window leap, and the clips measured with
// faults). A figure with no hanging garment is never looked at, so a film without wardrobe items passes untouched.
// Three ways a figure plays one: a clip key that names it; a beat (walk_to with style 'run', leap, jump_joy); keys with no clip name (a
// film that baked its clips) that travel faster than a walk, or leave the ground (where a key says what holds the figure up), on its feet.
// It does not see the framing: a runner too far off to read is reported too (the director's call), so it is advisory in GATES.json.
//   node styles/stick-man/tools/gates/clothgate.mjs films/<slug>          -> review/clothgate.md, exit 1 on a finding
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { loadReel } from '#tools/render/reel_load.mjs';
import { ROOT } from '../../../../kit/env.mjs';
import { UNSAFE, UNSAFE_BEATS, hangs, clipId } from '#kit/cast/clothsafe.js';

// RUN_MPS: people change from a walk to a run near 2 m/s (the Froude number 0.5); times the figure's scale. An elder's run in the library
// is slower than that (1.2 m/s): baked with no clip name it is not seen. FLIGHT_M: both feet well off the floor. RUN_F: held this long
export const RUN_MPS = 2.0, FLIGHT_M = 0.10, RUN_F = 6, SEATED = -0.35;

// frames of keys that carry no clip name where the figure runs or flies: [{ f0, f1, what }]
export function bakedRuns(keys, scale = 1) {
  const ks = []; let pos = null, bob = 0, support = null; for (const k of keys.filter(k => !k.clip).sort((a, b) => a.f - b.f)) { const o = { ...(typeof k.pose === 'object' ? k.pose : {}), ...k }; pos = o.pos || pos; bob = o.bob ?? bob; support = o.support ?? support; if (pos) ks.push({ f: k.f, pos, bob, support, cut: k.ease === 'snap' }); }
  const out = []; let run = null; const close = () => { if (run && run.f1 - run.f0 >= RUN_F) out.push(run); run = null; };
  for (let i = 1; i < ks.length; i++) { const a = ks[i - 1], b = ks[i], df = b.f - a.f; if (df <= 0) continue;
    const v = b.cut ? 0 : Math.hypot(b.pos[0] - a.pos[0], b.pos[1] - a.pos[1]) * 30 / df, up = b.support == null ? 0 : (b.pos[2] || 0) - b.support, what = b.bob < SEATED ? null : v > RUN_MPS * scale ? 'run' : up > FLIGHT_M ? 'flight' : null;
    if (!what) { close(); continue; } if (!run) run = { f0: a.f, f1: b.f, v: 0, up: 0 }; run.f1 = b.f; run.v = Math.max(run.v, v); run.up = Math.max(run.up, up); }
  close(); return out.map(r => ({ f0: r.f0, f1: r.f1, what: r.v > RUN_MPS * scale ? `keys with no clip name that travel ${r.v.toFixed(1)} m/s` : `keys with no clip name ${(100 * r.up).toFixed(0)} cm off the ground` }));
}

// acts: the reel's acts; specs: cast specs by name (engine/play.js SPECS) -> findings [{ act, who, wears, clip, f, why }]
export function clothGate(acts, specs = {}) {
  const out = []; let dressed = 0;
  for (const act of acts) for (const [who, c] of Object.entries(act.cast || {})) {
    const spec = specs[c.spec] || {}, wears = hangs(c.costume ?? spec.costume ?? []); if (!wears.length) continue; dressed++;
    const keys = act.anim?.[who] || [], add = (clip, f, why) => out.push({ act: act.name || act.set || 'act', who, wears: wears.join(' + '), clip, f, why });
    for (const k of keys) if (k.clip) { const id = clipId(k.clip), u = UNSAFE[id]; if (u) add(id, k.f, u.why); }
    for (const r of bakedRuns(keys, spec.scale ?? 1)) add(r.what, `${r.f0}-${r.f1}`, UNSAFE.Move_Run_Fwd_Loop.why);
    for (const b of act.beats || []) if (b.who === who) { const u = UNSAFE_BEATS.find(x => x.do === b.do && (!x.style || x.style === b.style)); if (u) add(`beat ${b.do}${b.style ? ` (${b.style})` : ''}`, b.f ?? b.at ?? '?', u.why); }
  }
  return { dressed, findings: out };
}
export const message = (film, x) => `${film}: ${x.who} (${x.wears}) plays ${x.clip} at f${x.f} in ${x.act}: ${x.why}`;

export async function filmCloth(dir) {
  const acts = []; for (const r of ['reel.js', 'reel2.js']) if (fs.existsSync(path.join(dir, r))) { const R = await loadReel(dir, r); acts.push(...(R.acts ? [R, ...R.acts] : [R])); }
  if (!acts.some(a => a.cast)) return clothGate([]);
  let specs = {}; try { ({ SPECS: specs } = await import('#engine/play.js')); } catch { /* (a cast entry's own costume is still read) */ }
  return clothGate(acts.filter(a => a.cast), specs);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const film = process.argv[2], dir = film && path.resolve(ROOT, film);
  if (!dir || film.startsWith('-') || !fs.existsSync(path.join(dir, 'reel.js'))) { console.error('usage: clothgate.mjs films/<slug>  (a film folder with reel.js)'); process.exit(2); }
  const name = path.basename(dir), R = await filmCloth(dir), lines = R.findings.map(x => message(name, x)), verdict = lines.length ? 'FAIL' : 'PASS';
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'review/clothgate.md'), [`# Cloth gate · ${name}`, '', `**${verdict}**: ${R.dressed} figure(s) in a coat, a skirt, a dress or an apron; ${lines.length} in a motion the kit's cloth is not clean in`, '', ...lines.map(l => `- ${l}`), '', 'Dress the figure for that shot without the hanging garment, or pick another clip (kit/cast/clothsafe.js).'].join('\n') + '\n');
  for (const l of lines) console.log(l); console.log(`clothgate ${verdict} (${R.dressed} dressed, ${lines.length} finding(s))`); process.exit(lines.length ? 1 : 0);
}
