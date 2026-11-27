// the lowest cut (W, 0.02 steps from the style's own lowest point up) at which a style passes every clip of CLIPS at 4 mm:
//   node test/unit/hair-length.mjs <style> [...]   (a minute or more a style)
const m = await import('./hair-measure.mjs');
for (const s of process.argv.slice(2)) { const low0 = m.hairPoints(s).low; let cut = Math.ceil(low0 * 50) / 50, res;
  // coarse first: 0.06 steps, then back off by 0.02
  const ok = async c => { const r = await m.sweep(s, m.CLIPS, { cut: c }); const w = Object.entries(r).sort((a, b) => b[1].mm - a[1].mm)[0]; return { pass: w[1].mm <= 4, w }; };
  let c = cut; for (; c < 0.0; c += 0.06) { res = await ok(c); if (res.pass) break; console.log(s, c.toFixed(2), 'fail', res.w[0], res.w[1].mm.toFixed(1), res.w[1].what); }
  for (let d = c - 0.02; d > c - 0.06; d -= 0.02) { const r = await ok(d); if (!r.pass) break; c = d; res = r; }
  console.log('RESULT', s, 'from', low0.toFixed(2), 'cut', c.toFixed(2), 'low now', m.hairPoints(s, { cut: c }).low.toFixed(2), 'worst', res.w[0], res.w[1].mm.toFixed(1)); }
