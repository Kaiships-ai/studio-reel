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
// o.wipe: the two colours of the brush wipe INTO this chapter. o.cut: true for a hard cut instead.
// o.shotWipes: [[c1, c2], ...], one pair per shot after the first, to wipe between the chapter's own shots too
// (without it, shots inside a chapter cut straight to each other: do that on action only).
const CHAPTERS = [], WIPES = [];
const WIPE_HALF = .25;   // the wipe covers the frame for this long on each side of a cut
function chapter(name, start, end, shotList, o = {}) {
  CHAPTERS.push({ name, start, end });
  if (!o.cut && start > 0) WIPES.push({ t: start, cols: o.wipe || [PAL.clayDk, PAL.clay] });
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
    brushWipe(.5 + d / (2 * WIPE_HALF), w.cols);
  }
}

// ---------- captions ----------
// Short chunks of the voiceover, centred on CAPTION.y. Each chunk appears with its first word and the word being
// spoken is highlighted, so the text is locked to the voice. Change the look here.
const CAPTION = {
  y: 1395, size: 78, maxWidth: 900, band: [1335, 1455],
  maxWords: 4, maxChars: 20, gap: .38,           // a chunk ends after this many words/characters, or at a pause this long
  col: '#FFF5E2', hi: '#FFC94A', ink: '#2B2233',
  font: s => `700 ${s}px "Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif`,
};
let _chunks = null;
function captionChunks() {
  if (_chunks) return _chunks;
  _chunks = []; let cur = null, stop = false, line = null, pos = 0;
  for (const w of REEL_WORDS) {
    const len = cur ? cur.words.reduce((n, x) => n + x.w.length + 1, 0) : 0, last = cur && cur.words[cur.words.length - 1];
    if (!cur || stop || cur.line !== w.line || cur.words.length >= CAPTION.maxWords || len + w.w.length > CAPTION.maxChars || w.s - last.e > CAPTION.gap) {
      cur = { line: w.line, words: [] }; _chunks.push(cur);
    }
    cur.words.push(w);
    // a chunk also ends where the script has . ! ? or : after this word
    if (line !== w.line) { line = w.line; pos = 0; }
    const text = voLine(w.line).text, at = text.indexOf(w.w, pos);
    stop = false;
    if (at >= 0) { pos = at + w.w.length; stop = /^["')\]]*[.!?:…]/.test(text.slice(pos)); }
  }
  _chunks.forEach((c, i) => {
    c.s = c.words[0].s - .04;
    const next = _chunks[i + 1];
    c.e = Math.min(next ? next.words[0].s - .04 : Infinity, c.words[c.words.length - 1].e + .4);
  });
  return _chunks;
}
function drawCaptions(c, t) {
  if (window.SHOW_SAFE) drawSafe(c);
  const ch = captionChunks().find(k => t >= k.s && t < k.e);
  if (!ch) return;
  let size = CAPTION.size; c.font = CAPTION.font(size);
  const widthOf = () => ch.words.reduce((n, w) => n + c.measureText(w.w).width, 0) + size * .34 * (ch.words.length - 1);
  let total = widthOf();
  if (total > CAPTION.maxWidth) { size *= CAPTION.maxWidth / total; c.font = CAPTION.font(size); total = widthOf(); }
  const space = size * .34, pop = .9 + .1 * backOut((t - ch.s) / .12);
  c.save(); c.translate(W / 2, CAPTION.y); c.scale(pop, pop);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  // two passes, so one word's outline never covers its neighbour's fill
  for (const pass of ['stroke', 'fill']) {
    let x = -total / 2;
    ch.words.forEach((w, i) => {
      const ww = c.measureText(w.w).width, next = ch.words[i + 1];
      const on = t >= w.s && (!next || t < next.s), k = on ? 1 + .1 * backOut((t - w.s) / .1) : 1;
      c.save(); c.translate(x + ww / 2, 0); c.scale(k, k);
      if (pass === 'stroke') {
        c.strokeStyle = CAPTION.ink; c.lineWidth = size * .26; c.strokeText(w.w, 0, 0);
        c.fillStyle = CAPTION.ink; c.fillText(w.w, size * .05, size * .07);
      } else { c.fillStyle = on ? CAPTION.hi : CAPTION.col; c.fillText(w.w, 0, 0); }
      c.restore();
      x += ww + space;
    });
  }
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
