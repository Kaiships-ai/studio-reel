// reel.js: the reel layer of the Kaiships Reel Kit, on top of the painting engine (core.js, clawd.js, timeline.js).
//   - chapter(name, start, end, shots, o): one file per chapter; the timeline paints a brush wipe over each chapter cut
//   - voiceover lookups: vo('word'), voLine('l02'), cutAfter('l02'), so events lock to spoken words instead of typed numbers
//   - captions: the words being spoken, in short chunks, the current word highlighted, drawn over every frame
//   - the Instagram safe zone, as numbers (SAFE) and as an overlay for checks (render.mjs --safe)
// Voiceover timings come from src/vo.js, which vo/make_vo.py writes.

const REEL_WORDS = typeof VO_WORDS !== 'undefined' ? VO_WORDS : [];
const REEL_LINES = typeof VO_LINES !== 'undefined' ? VO_LINES : [];

// Instagram covers the bottom ~380 px (caption, audio, nav) and the right ~120 px (like, comment, share).
// Keep everything that matters inside SAFE. Captions sit just below it, in CAPTION.band.
const SAFE = { x0: 60, x1: 960, y0: 250, y1: 1300 };

// ---------- voiceover lookups ----------
const _norm = s => String(s).toLowerCase().replace(/[^a-z0-9']/g, '');
// Start time of the nth time `word` is spoken (n counts from 1). Pass a line id to search one line only.
//   vo('post')   vo('check', 2)   vo('move', 1, 'l02')
function vo(word, n = 1, line = null) {
  const key = _norm(word); let k = 0;
  for (const w of REEL_WORDS) if (_norm(w.w) === key && (!line || w.line === line) && ++k === n) return w.s;
  console.warn(`vo(): "${word}" #${n}${line ? ' in ' + line : ''} is not in the voiceover`);
  return 0;
}
// { s, e, text } of a voiceover line.
function voLine(id) {
  const l = REEL_LINES.find(x => x.id === id);
  if (!l) { console.warn(`voLine(): no line "${id}"`); return { s: 0, e: 0, text: '' }; }
  return l;
}
// The cut point after a line: halfway through the pause between it and the next line.
function cutAfter(id) {
  const i = REEL_LINES.findIndex(x => x.id === id);
  if (i < 0) { console.warn(`cutAfter(): no line "${id}"`); return 0; }
  const next = REEL_LINES[i + 1];
  return Math.round((next ? (REEL_LINES[i].e + next.s) / 2 : DUR) * 1000) / 1000;
}

// ---------- chapters ----------
// chapter('hook', 0, cutAfter('l01'), [[0, shotFn], ...], { wipe: [PAL.clayDk, PAL.clay] })
// A shot fn(t, lt, dur) paints the whole frame, as in ANIMATION_GUIDE.md. Shot times are video times.
// o.wipe: the two colours of the transition INTO this chapter. o.cut: true for a hard cut instead.
// o.trans: 'brush' (default, paint strokes sweep across) | 'splat' (an ink blot blooms from o.at and opens again)
//          | 'iris' (the frame closes to a dot at o.at, then opens; uses o.wipe[0]). o.at = [x, y], default the centre.
// o.shotWipes: [[c1, c2], ...], one pair per shot after the first, to wipe between the chapter's own shots too
// (without it, shots inside a chapter cut straight to each other: do that on action only).
const CHAPTERS = [], WIPES = [];
const WIPE_HALF = .25;   // the wipe covers the frame for this long on each side of a cut
function chapter(name, start, end, shotList, o = {}) {
  CHAPTERS.push({ name, start, end });
  if (!o.cut && start > 0) WIPES.push({ t: start, cols: o.wipe || [PAL.clayDk, PAL.clay], kind: o.trans || 'brush', at: o.at || [W / 2, H / 2] });
  (o.shotWipes || []).forEach((cols, i) => { if (shotList[i + 1]) WIPES.push({ t: shotList[i + 1][0], cols }); });
  shots(shotList);
}
// Called by the timeline after every shot, in screen space: paints the wipe over a cut.
function reelOverlay(t) {
  for (const w of WIPES) {
    const d = t - w.t;
    if (Math.abs(d) >= WIPE_HALF) continue;
    flushLetters();                 // the shot's lettering goes under the wipe
    boilSeed('reel-wipe' + w.t);
    const p = .5 + d / (2 * WIPE_HALF), [x, y] = w.at || [W / 2, H / 2];
    if (w.kind === 'splat') splatWipe(p, w.cols[0], w.cols[1], x, y);
    else if (w.kind === 'iris') iris(x, y, p < .5 ? lerp(1250, 0, easeIn(p * 2)) : lerp(0, 1250, easeOut((p - .5) * 2)), w.cols[0]);
    else brushWipe(p, w.cols);
  }
}
// An ink blot blooms out of (x, y) and covers the frame; after the swap (p = .5) a hole opens in it from the same point.
function splatWipe(p, c1, c2, x = W / 2, y = H / 2) {
  if (p <= 0 || p >= 1) return;
  const R = 1500, blob = (r, seed) => { const pts = []; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, w = 1 + .16 * Math.sin(a * 5 + seed) + .09 * Math.sin(a * 9 + seed * 2); pts.push([x + Math.cos(a) * r * w, y + Math.sin(a) * r * w]); } return pts; };
  if (p < .5) {
    const r = R * easeIn(clamp(p * 2.05)) + 20;
    paint(blob(r, 1.3), { wash: c1, washOp: 255, fill: c2, fillOp: 90, bleed: .08, tex: .7, border: .6, ink: null });
    for (let k = 0; k < 9; k++) {   // flying droplets ahead of the blot
      const a = k / 9 * TAU + .4, d = r * (1.12 + .25 * hash(k)), s = 14 + 30 * hash(k + 5);
      paint(ellPts(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s * .8, 12, 3), { wash: c1, ink: null });
    }
  } else {
    const r = R * easeOut((p - .5) * 2);
    if (r < 8) paint(rectPts(-60, -60, W + 120, H + 120), { wash: c1, ink: null });
    else irisShape(blob(r, 4.1), c1);
  }
}

// ---------- captions ----------
// The published @kaiships.ai caption: short chunks of the voiceover on a painted ink plate, centred on CAPTION.y.
// The words already spoken turn ochre, the word being spoken is 7 % bigger, numbers are shown as digits (clay), brand
// names stay on one card. Back-to-back chunks swap text inside a held plate (no blink). Captions hide while a chapter
// wipe covers the frame. A film may override any field with PROJECT.caption = { ... } in src/config.js.
const CAPTION = Object.assign({
  y: 1395, size: 64, band: [1320, 1470],
  maxWords: 3, maxChars: 18,                     // a chunk ends after this many words/characters, or after punctuation
  col: PAL.cream, lit: PAL.ochre, num: PAL.clayLt, plate: PAL.ink, plateWash: PAL.violet,
  font: s => `800 ${s}px "Shantell Sans", "Comic Sans MS", sans-serif`,
  brands: ['Claude Code'],                       // multi-word names kept on one card; add yours in PROJECT.caption.brands
  digits: { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    ten: '10', eleven: '11', twelve: '12', fifteen: '15', twenty: '20', thirty: '30', fifty: '50', hundred: '100' },
}, (typeof PROJECT !== 'undefined' && PROJECT.caption) || {});
let _chunks = null;
function captionChunks() {
  if (_chunks) return _chunks;
  _chunks = [];
  const brands = CAPTION.brands.map(b => b.split(/\s+/));
  for (const L of REEL_LINES) {
    const raw = REEL_WORDS.filter(w => w.line === L.id); if (!raw.length) continue;
    // punctuation after each spoken word, read from the line text
    let pos = 0;
    const words = raw.map(w => { const at = L.text.indexOf(w.w, pos); let p = ''; if (at >= 0) { pos = at + w.w.length; p = (L.text.slice(pos).match(/^["')\]]*([,.!?…:;]+)/) || [])[1] || ''; } return { ...w, p }; });
    // brand names → one unit
    const units = [];
    for (let i = 0; i < words.length; i++) {
      const b = brands.find(b => b.every((part, k) => words[i + k] && _norm(words[i + k].w) === _norm(part)));
      if (b) { const last = words[i + b.length - 1]; units.push({ w: words.slice(i, i + b.length).map(x => x.w).join(' '), s: words[i].s, e: last.e, p: last.p }); i += b.length - 1; }
      else units.push(words[i]);
    }
    // numbers as digits on screen (the voice still says them)
    units.forEach(u => { const d = CAPTION.digits[_norm(u.w)]; if (d) u.w = d; });
    let cur = [];
    const push = () => { if (!cur.length) return; const last = cur[cur.length - 1];
      _chunks.push({ words: cur.map(u => ({ w: u.w, s: u.s, e: u.e })), txt: cur.map(u => u.w).join(' ') + (/\?/.test(last.p) ? '?' : ''), s: cur[0].s - .06, e: last.e + .35, we: last.e }); cur = []; };
    for (const u of units) {
      if (cur.length && (cur.map(x => x.w).join(' ') + ' ' + u.w).length > CAPTION.maxChars) push();
      cur.push(u);
      if (u.p || cur.length >= CAPTION.maxWords) push();
    }
    push();
  }
  for (let i = 0; i + 1 < _chunks.length; i++) { const c = _chunks[i], n = _chunks[i + 1]; c.e = n.s - c.e < .1 ? n.s : Math.min(c.e, n.s); }
  return _chunks;
}
const _capHidden = t => (typeof WIPES !== 'undefined') && WIPES.some(w => t > w.t - WIPE_HALF && t < w.t + WIPE_HALF * .3);
function _capState(t) {
  if (window.LOOP || window.NO_CAPTIONS || _capHidden(t)) return null;
  const all = captionChunks(), k = all.findIndex(c => t >= c.s && t < c.e); if (k < 0) return null;
  const C = all[k], prev = all[k - 1], next = all[k + 1], age = t - C.s;
  const grow = prev && C.s - prev.e < .1 ? 1 + .06 * Math.sin(Math.PI * clamp(age / .14)) : backOut(clamp(age / .16));
  const fade = next && next.s - C.e < .1 ? 1 : 1 - ease((t - (C.e - .06)) / .06);
  return { C, grow, fade };
}
// The plate is painted with the brush in the frame itself (core.js draw), so it sits on the paper with grain on top.
function captionPlate(t) {
  const S = _capState(t); if (!S || S.grow < .25 || S.fade < .02) return;
  const { C, grow, fade } = S, size = CAPTION.size;
  const ctx = outX; ctx.font = CAPTION.font(size);
  const tw = Math.min(ctx.measureText(C.txt).width, W - 260), w = (tw + 84) * clamp(grow, 0, 1.1), x0 = W / 2 - w / 2, y0 = CAPTION.y - 58;
  if (w < 20) return;
  boilSeed('caption' + C.s);
  const pts = [[x0 + jit(8), y0 + jit(4)], [x0 + w / 2, y0 - 5 + jit(4)], [x0 + w + jit(8), y0 + jit(4)], [x0 + w + 16 + jit(8), y0 + 58], [x0 + w + jit(8), y0 + 116 + jit(4)], [x0 + w / 2, y0 + 121 + jit(4)], [x0 + jit(8), y0 + 116 + jit(4)], [x0 - 16 + jit(8), y0 + 58]];
  paint(pts, { wash: CAPTION.plate, washOp: 232 * fade, fill: CAPTION.plateWash, fillOp: 50 * fade, tex: .7, border: .4, ink: null });
}
function drawCaptions(c, t) {
  if (window.SHOW_SAFE) drawSafe(c);
  const S = _capState(t); if (!S || S.grow < .25) return;
  const { C, grow, fade } = S, words = C.words;
  const disp = words.map((w, i) => w.w + (i === words.length - 1 && /\?$/.test(C.txt) ? '?' : ''));   // the shown text
  let size = CAPTION.size; c.font = CAPTION.font(size);
  const sp0 = c.measureText(' ').width, w0 = disp.map(d => c.measureText(d).width), tot0 = w0.reduce((p, q) => p + q, 0) + sp0 * (words.length - 1);
  if (tot0 > W - 260) { size *= (W - 260) / tot0; c.font = CAPTION.font(size); }
  const sp = c.measureText(' ').width, ws = disp.map(d => c.measureText(d).width), total = ws.reduce((p, q) => p + q, 0) + sp * (words.length - 1);
  c.save(); c.globalAlpha = fade; c.textBaseline = 'middle'; c.textAlign = 'center';
  let x = W / 2 - total / 2 * grow;
  words.forEach((w, i) => {
    const on = t >= w.s, cur = on && (i === words.length - 1 ? t < C.we + .1 : t < words[i + 1].s), hot = /\d/.test(w.w);
    const k = grow * (cur ? 1.07 : 1);
    c.save(); c.translate(x + ws[i] / 2 * grow, CAPTION.y); c.scale(k, k);
    c.fillStyle = on ? (hot ? CAPTION.num : CAPTION.lit) : CAPTION.col; c.fillText(disp[i], 0, 0);
    c.restore();
    x += (ws[i] + sp) * grow;
  });
  c.restore();
}
// Check overlay (render.mjs --safe): what Instagram's UI covers, the safe zone, and the caption band.
function drawSafe(c) {
  c.save();
  c.fillStyle = 'rgba(220,40,40,.22)';
  c.fillRect(0, H - 380, W, 380); c.fillRect(W - 120, 0, 120, H - 380); c.fillRect(0, 0, W, 180);
  c.strokeStyle = 'rgba(30,160,90,.9)'; c.lineWidth = 4; c.setLineDash([18, 12]);
  c.strokeRect(SAFE.x0, SAFE.y0, SAFE.x1 - SAFE.x0, SAFE.y1 - SAFE.y0);
  c.strokeStyle = 'rgba(40,90,220,.9)'; c.strokeRect(60, CAPTION.band[0], W - 120, CAPTION.band[1] - CAPTION.band[0]);
  c.restore();
}
