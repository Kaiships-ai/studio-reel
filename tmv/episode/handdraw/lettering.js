// lettering.js: the hand-draw episode's type, in the kai-hand-draw look (STYLE.md §4, engine/kit.js, engine/reel.js):
// paper index cards for `card`, `stats` and `previously`, a paper tag for the HUD, the vote as two paper cards, and the
// captions on a painted ink plate. Display type is Permanent Marker, the rest Shantell Sans 800. Shapes are painted with
// core.js's brush (paint, inkLine) and the type queued with letter(), so the paper grain lies over both; only the caption
// words are drawn after the grain, to stay crisp. phrases() and phraseAt() are pure, the rest uses core.js's globals.

const MARKER = s => `${s}px "Permanent Marker", "Comic Sans MS", cursive`;
const HAND = s => `800 ${s}px "Shantell Sans", "Comic Sans MS", sans-serif`;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const MC = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
const width = (s, font) => { MC.font = font; return MC.measureText(s).width; };
const fit = (s, size, max, font) => Math.min(size, size * max / Math.max(1, width(s, font(size))));

export const CAP = { y: 1580, size: 60, maxWords: 3, maxChars: 18 };

/** Caption phrases: up to 3 words / 18 characters, ending early on punctuation. Each shows from just before its first
 * word to just before the next phrase, at most 0.55 s after its last word. */
export function phrases(words, o = CAP) {
  const out = []; let cur = [];
  const close = () => { if (cur.length) out.push(cur); cur = []; };
  for (const w of words) {
    if (cur.length && (cur[0].line !== w.line || [...cur, w].map(x => x.w).join(' ').length > o.maxChars)) close();
    cur.push(w);
    if (/[.,!?…:;]$/.test(w.w) || cur.length >= o.maxWords) close();
  }
  close();
  return out.map((ws, i) => ({ words: ws, a: ws[0].s - 0.04, b: Math.min(out[i + 1] ? out[i + 1][0].s - 0.04 : Infinity, ws[ws.length - 1].e + 0.55) }));
}
/** The phrase on screen at t; none once its words were all spoken before the shot's cut at `cut`. */
export const phraseAt = (P, t, cut = -Infinity) => P.find(p => t >= p.a && t < p.b && p.words[p.words.length - 1].e >= cut);

export function lettering({ EP, WORDS, LAST, hudAt, ACCENT }) {
  const INK = PAL.ink, TX = EP.texts ?? {}, P = phrases(WORDS);
  const vote = EP.vote, wordAt = (tag, d) => WORDS.find(w => w.s >= LAST.ls && w.w.replace(/[^\w]/g, '') === tag)?.s ?? LAST.ls + d;
  const tagA = vote.tagA ?? 'A', tagB = vote.tagB ?? 'B', T_A = wordAt(tagA, 0.5), T_B = wordAt(tagB, 1.6);
  const pop = (t, t0) => (t - t0) * 4;

  // a paper index card: ink shadow, cream sheet with a little colour in the pulp, ink outline (kit.js statCard)
  function sheet(key, x, y, w, h, col, o = {}) {
    boilSeed(key);
    if (o.shadow !== false) paint(rrPts(x + 14, y + 16, w, h, 26, 2), { wash: INK, washOp: 210 * (o.op ?? 1), ink: null });
    paint(rrPts(x, y, w, h, 26, 2), { wash: PAL.cream, washOp: 255 * (o.op ?? 1), fill: col, fillOp: (o.fillOp ?? 30) * (o.op ?? 1), bleed: 0, tex: .6, border: .5, ink: o.op < 1 ? null : INK, sw: 1.3 });
  }
  const underline = (x, y, w, k, col) => { if (k > .01) inkLine([[x - w / 2, y + 4], [x - w / 2 + w * k, y - 4]], 2.4, col, 'dry', .2); };

  function card(t, sh) {
    sheet('card', 80, 220, 920, 1270, PAL.ochre);
    const L = sh.card ?? [], y0 = 820 - (L.length - 1) * 80;
    L.forEach((ln, i) => {
      const s = String(ln).toUpperCase(), size = fit(s, 120, 840, MARKER), last = i === L.length - 1, t0 = sh.a + 0.05 + i * 0.3;
      if (t < t0) return;
      letter(s, 540, y0 + i * 160, size, last ? ACCENT : INK, { font: MARKER(size), pop: pop(t, t0), rot: -.02 });
      if (last) underline(540, y0 + i * 160 + size * .62, Math.min(840, width(s, MARKER(size))), clamp((t - t0 - .2) / .35), ACCENT);
    });
  }
  function stats(t, sh) {
    sheet('stats', 80, 220, 920, 1270, PAL.sky);
    if (sh.head) {
      const s = String(sh.head).toUpperCase(), size = fit(s, 72, 840, MARKER);
      letter(s, 540, 350, size, INK, { font: MARKER(size), pop: pop(t, sh.a), rot: -.015 });
      underline(540, 350 + size * .6, Math.min(840, width(s, MARKER(size))), clamp((t - sh.a - .15) / .35), ACCENT);
    }
    const rows = sh.stats ?? [], gap = Math.min(250, 760 / Math.max(rows.length, 1));
    rows.forEach((r, i) => {
      const y = 500 + i * gap, t0 = sh.a + 0.15 + i * 0.35; if (t < t0) return;
      letter(String(r.label).toUpperCase(), 150, y, 36, INK, { font: HAND(36), align: 'left', ink: false, alpha: clamp(pop(t, t0)) * .8 });
      const v = String(r.value), vs = fit(v, 116, 780, MARKER);
      letter(v, 150, y + 92, vs, r.style === 'danger' ? ACCENT : INK, { font: MARKER(vs), align: 'left', pop: pop(t, t0 + .05) });
      if (r.extra) letter(String(r.extra), 170 + width(v, MARKER(vs)), y + 100, 42, INK, { font: HAND(42), align: 'left', ink: false });
      if (r.bar != null) { boilSeed('bar' + i); paint(rectPts(150, y + 160, 780, 22, 1.5), { ink: INK, sw: .6 }); paint(rectPts(150, y + 160, Math.max(24, 780 * clamp(r.bar) * clamp((t - t0) / .7)), 22, 1.5), { wash: r.style === 'danger' ? ACCENT : INK, ink: null }); }
    });
    if (sh.source) { const ss = fit(String(sh.source), 30, 840, HAND); letter(String(sh.source), 540, 1400, ss, INK, { font: HAND(ss), ink: false, alpha: .75 * clamp(pop(t, sh.a + .3)) }); }
  }
  function previously(t, sh) {
    const p = EP.previously; if (!p) return;
    sheet('previously', 80, 220, 920, 1270, PAL.rose);
    const head = String(TX.previously ?? 'PREVIOUSLY · EP {prev}').replace(/\{prev\}/g, p.ep).toUpperCase();
    letter(head, 540, 420, fit(head, 64, 840, MARKER), ACCENT, { pop: pop(t, sh.a), rot: -.02 });
    const q = String(p.question).toUpperCase(), qs = fit(q, 56, 840, HAND);
    letter(q, 540, 560, qs, INK, { font: HAND(qs), ink: false, alpha: clamp(pop(t, sh.a + .1)) });
    const pill = (y, tag, text, win, t0) => {
      if (t < t0) return; const lab = `${tag} · ${String(text).toUpperCase()}`, ls = fit(lab, 60, 640, MARKER);
      sheet('prev' + tag, 180, y - 70, 720, 140, win ? ACCENT : INK, { fillOp: win ? 90 : 20, op: win ? 1 : .55, shadow: win });
      letter(lab, 540, y, ls, win ? INK : 'rgba(43,34,51,.55)', { font: MARKER(ls), pop: pop(t, t0), ink: win });
      if (!win) inkLine([[220, y + 4], [220 + 640 * clamp((t - t0 - .4) / .3), y - 2]], 2, INK, 'ink', .2);
    };
    pill(780, p.winner.tag, p.winner.text, true, sh.a + 0.5); pill(970, p.loser.tag, p.loser.text, false, sh.a + 0.6);
    const you = String(TX.youPicked ?? 'YOU PICKED {tag}').replace(/\{tag\}/g, p.winner.tag).toUpperCase();
    if (t > sh.a + 1) letter(you, 540, 1160, 52, INK, { font: HAND(52), ink: false, pop: pop(t, sh.a + 1) });
  }
  // the HUD as a paper tag pinned top left; a value in its "danger" style takes the accent
  function hud(t) {
    const items = hudAt(t).items; if (!items.length) return;
    const lab = items.map(it => `${String(it.label).toUpperCase()} ${it.val}`), w = Math.max(...lab.map(s => width(s, HAND(38)))) + 64, h = 56 * items.length + 36;
    sheet('hud', 56, 210, w, h, PAL.ochre, { fillOp: 25 });
    lab.forEach((s, i) => letter(s, 88, 210 + 46 + i * 56, 38, items[i].danger ? ACCENT : INK, { font: HAND(38), align: 'left', ink: false }));
  }
  function title(t) {
    if (t >= 2.4) return; const s = String(EP.title).toUpperCase(), size = fit(s, 96, 900, MARKER);
    letter(s, 540, 470, size, INK, { font: MARKER(size), stroke: PAL.cream, pop: pop(t, 0.1), rot: -.03, alpha: clamp((2.4 - t) / .3) });
  }
  // the vote: the question on a paper strip, then each answer's card pops in on its spoken tag
  function voteCards(t) {
    if (t < LAST.ls - 0.1) return;
    const q = String(vote.question).toUpperCase(), qs = fit(q, 52, 820, HAND);
    sheet('voteq', 110, 760, 860, 120, PAL.cream, { fillOp: 0 });
    letter(q, 540, 820, qs, INK, { font: HAND(qs), ink: false, pop: pop(t, LAST.ls - .1) });
    [[tagA, vote.a, ACCENT, 990, T_A], [tagB, vote.b, PAL.teal, 1190, T_B]].forEach(([tag, text, col, y, t0]) => {
      if (t < t0 - .03) return; const lab = `${tag} · ${String(text).toUpperCase()}`, ls = fit(lab, 72, 660, MARKER);
      sheet('vote' + tag, 150, y - 80, 780, 160, col, { fillOp: 110 });
      letter(lab, 540, y, ls, INK, { font: MARKER(ls), pop: pop(t, t0 - .03), rot: -.02, ink: false });
    });
  }
  // the caption's ink plate, painted under the grain (reel.js captionPlate)
  function plate(t, sh) {
    const p = phraseAt(P, t, sh.a); if (!p) return;
    const tw = Math.min(W - 200, width(p.words.map(w => w.w).join(' '), HAND(CAP.size))), w = tw + 96, x0 = W / 2 - w / 2, y0 = CAP.y - 62;
    boilSeed('cap' + p.a);
    const pts = [[x0 + jit(8), y0 + jit(4)], [x0 + w / 2, y0 - 5 + jit(4)], [x0 + w + jit(8), y0 + jit(4)], [x0 + w + 16 + jit(8), y0 + 62],
      [x0 + w + jit(8), y0 + 124 + jit(4)], [x0 + w / 2, y0 + 129 + jit(4)], [x0 + jit(8), y0 + 124 + jit(4)], [x0 - 16 + jit(8), y0 + 62]];
    paint(pts, { wash: INK, washOp: 236, fill: PAL.violet, fillOp: 50, tex: .7, border: .4, ink: null });
  }
  // an explain shot is cream to the frame's edges, like the 3D cards: gates.py G4b reads bare paper next to a cream card
  // as a faint picture behind it
  const PAPER = { card, stats, previously };
  function world(t, sh) {
    if (!PAPER[sh.shot]) return;
    boilSeed('ground'); paint(rectPts(-80, -80, W + 160, H + 160), { wash: PAL.cream, ink: null });
    PAPER[sh.shot](t, sh);
  }
  function screen(t, sh) {
    if (!PAPER[sh.shot]) hud(t);
    title(t); voteCards(t); plate(t, sh);
  }
  // the caption words, after the grain: spoken words cream and popping in, the live word ochre, words not yet spoken grey
  function captions(c, t, sh) {
    const p = phraseAt(P, t, sh.a); if (!p) return;
    let size = CAP.size; c.font = HAND(size);
    const gap = c.measureText(' ').width, tot = p.words.reduce((s, w) => s + c.measureText(w.w).width, 0) + gap * (p.words.length - 1);
    if (tot > W - 200) { size *= (W - 200) / tot; c.font = HAND(size); }
    const ws = p.words.map(w => c.measureText(w.w).width), total = ws.reduce((s, x) => s + x, 0) + c.measureText(' ').width * (ws.length - 1);
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    let x = W / 2 - total / 2;
    p.words.forEach((w, i) => {
      const on = t >= w.s - 0.03, live = on && t < (p.words[i + 1]?.s ?? w.e + 0.1), k = 1 + 0.1 * clamp((t - w.s + .03) / .08) * (1 - clamp((t - w.s - .08) / .17));
      c.save(); c.translate(x + ws[i] / 2, CAP.y); c.scale(k, k);
      c.fillStyle = !on ? 'rgba(243,235,220,.42)' : live || w.hot ? PAL.ochre : PAL.cream; c.fillText(w.w, 0, 0);
      c.restore(); x += ws[i] + c.measureText(' ').width;
    });
    c.restore();
  }
  return { world, screen, captions };
}
