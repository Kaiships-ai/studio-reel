// The stamp on each hair row of kit/compat.json (hair|<style>|<clip>): a hash of what the hair-in-body measure
// (hair-measure.mjs sweepAll) reads for that pair, so the table is known to be what the measure would say today without
// replaying it, and a change to code that leaves what it reads alone (a renamed function, a part tagged, a builder moved)
// keeps every row. Three parts, each rounded to 0.01 mm (1e-5 m, as the golden fingerprint):
//   the style   every point of the style's drawn surface the measure keeps (hairPoints: position, the head under a thin
//               scalp point, the neck weight of a bound lock) and its lift, so a change to one style restales its 50 rows only;
//   the clip    on every frame the measure plays (the adult in the coral sweater, as sweepAll wears it), the torso's vertices,
//               triangles and matrix, the hair group's matrix and lift, the neck matrix, and each limb segment with its drawn
//               radius, so a change to a clip, the rig, the posing or the body restales that clip's 11 rows (or every one);
//   the method  the bytes of hair-measure.mjs (how a depth is found, HAIR_IN_MM, NEAR_W) and the code of hairRows (fits_kinds.mjs:
//               the rounding, the -100 floor, the blocked rule).
// sweepAll plays each clip once in the first shipped style, whichever styles it measures, and measures every style at that style's
// lift: every style must sit at one lift (hairStamps throws otherwise). The clip part is hashed in that same worn style.
// Written by fits.mjs --hair with each row it measures, rewritten alone by fits.mjs --restamp after restampCheck re-measured a
// sample of the rows and found them as stored; checked by stick-hair-body.test.mjs.
//   node test/unit/hair-stamp.mjs [--styles a,b] [--clips X,Y]     prints MARK + { pair: stamp } (the copy controls run it)
import fs from 'node:fs'; import crypto from 'node:crypto'; import { pathToFileURL } from 'node:url';

export const MARK = '\n@@hair-stamp@@';
const sha = () => crypto.createHash('sha256'), q = a => new Uint8Array(Int32Array.from(a, x => Math.round(x * 1e5)).buffer);
const KINDS = '../../styles/stick-man/tools/gates/fits_kinds.mjs';
const method = async () => sha().update(fs.readFileSync(new URL('./hair-measure.mjs', import.meta.url))).update((await import(KINDS)).hairRows.toString()).digest('hex');

// { 'hair|<style>|<clip>': stamp } for these styles and clips (every shipped style and adult clip by default)
export async function hairStamps({ styles, clips } = {}) {
  const { rigStick } = await import('../../styles/stick-man/tools/gates/motionlib.mjs'); await rigStick();
  const M = await import('./hair-measure.mjs'), { play } = await import('./wardrobe-measure.mjs');
  const { toonHair, HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js'), { pair } = await import('../../styles/stick-man/kit/cast/compat.js');
  styles ??= HAIR_STYLES; clips ??= M.ADULT_CLIPS;
  const of = {}, worn = toonHair(HAIR_STYLES[0]), lift = worn().position.y;   // as sweepAll wears it
  for (const s of HAIR_STYLES) if (toonHair(s)().position.y !== lift) throw new Error(`hair-stamp: ${s} sits at lift ${toonHair(s)().position.y}, ${HAIR_STYLES[0]} at ${lift}: sweepAll would measure it at the wrong height`);
  for (const s of styles) { const h = sha().update(q([lift])); for (const p of M.hairPoints(s).pts) h.update(q([p.x, p.y, p.z, p.base?.x ?? 9, p.base?.y ?? 9, p.base?.z ?? 9, p.bound ?? -1])); of[s] = h.digest('hex'); }
  for (const clip of clips) { const h = sha();
    await play(['sweater:coral'], 'adult', { clip, whole: true }, { spec: { hair: [worn] }, each: (f, S) => { S.root.updateMatrixWorld(true); const T = S.parts.torso, H = S.parts.hair;
      h.update(q(T.geometry.attributes.position.array)).update(Uint32Array.from(T.geometry.index.array)).update(q(T.matrixWorld.elements)).update(q(H.matrixWorld.elements)).update(q([M.toonHairLift(H)])).update(S.neckLm ? q(S.neckLm.elements) : 'no neck');
      for (const g of M.limbSegs(S)) h.update(`${g.k}${g.i}/${g.n}`).update(q([g.a.x, g.a.y, g.a.z, g.b.x, g.b.y, g.b.z, g.r])); } });
    of[clip] = h.digest('hex'); }
  const m = await method(), out = {};
  for (const s of styles) for (const c of clips) out[pair('hair', s, c)] = sha().update(`${m}\0${of[s]}\0${of[c]}`).digest('hex').slice(0, 16);
  return out;
}
export const STALE = 'hair rows are stale: what the measure reads moved. Run node styles/stick-man/tools/gates/fits.mjs --hair [<styles>] [--clips <clips>] for the rows named (all of them: ~30 min on the Mac Pro, ssh pro, ~/pro-fans.sh run, not on a laptop)';
// the hair rows a table holds whose stamp is not what the measure reads today (no stamp, another one, or a pair it does not measure)
export const staleRows = (T, stamps) => T.rows.filter(r => r.kind === 'hair' && (!r.inputs || !stamps[r.pair] || r.inputs !== stamps[r.pair])).map(r => r.pair);

// before a restamp: of the rows it would rewrite, each style's `per` deepest stored ones (the nearest the limit) measured again,
// each clip played once for the styles that need it; { sample, wrong }: wrong names every row that measures otherwise than stored
export async function restampCheck(T, pairs, { per = 2 } = {}) {
  const { rigStick } = await import('../../styles/stick-man/tools/gates/motionlib.mjs'); await rigStick();
  const M = await import('./hair-measure.mjs'), { hairRows } = await import(KINDS), { pair } = await import('../../styles/stick-man/kit/cast/compat.js');
  const { HAIR_STYLES } = await import('../../styles/stick-man/kit/cast/hair.js'), at = new Map(HAIR_STYLES.flatMap(s => M.ADULT_CLIPS.map(c => [pair('hair', s, c), [s, c]])));
  const stored = new Map(T.rows.map(r => [r.pair, r])), byStyle = new Map();
  for (const p of pairs) { const sc = at.get(p); if (!sc) throw new Error(`restampCheck: ${p} is not a shipped style x adult clip`); (byStyle.get(sc[0]) || byStyle.set(sc[0], []).get(sc[0])).push(p); }
  const sample = [...byStyle.values()].flatMap(ps => ps.sort((a, b) => stored.get(b).number - stored.get(a).number).slice(0, per)), byClip = new Map();
  for (const p of sample) { const [s, c] = at.get(p); (byClip.get(c) || byClip.set(c, []).get(c)).push(s); }
  const wrong = [];
  for (const [c, ss] of byClip) for (const r of hairRows(await M.sweepAll(ss, [c]), M.HAIR_IN_MM)) { const t = stored.get(r.pair);
    if (t.verdict !== r.verdict || Math.abs(t.number - r.number) > 0.01) wrong.push(`${r.pair}: measures ${r.number} mm (${r.verdict}), stored ${t.number} (${t.verdict})`); }
  return { sample, wrong };
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  const opt = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1].split(',') : undefined; };
  process.stdout.write(MARK + JSON.stringify(await hairStamps({ styles: opt('--styles'), clips: opt('--clips') })));
}
