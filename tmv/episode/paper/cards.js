// paper/cards.js: the paper engine's type layer in the Paper Pop-up Book look (styles/paper-popup): explain cards,
// the HUD, captions and the vote, each a pure function of t on the 1080x1920 frame. On a card the sheet is the brightest
// tone and everything else is thin or 60+ levels darker, so gates G4 and G4b (episode/gates.py) hold.
const W = 1080, H = 1920;
const INK = '#3A2A24', MUTED = 'rgba(58,42,36,.6)', UNSAID = 'rgba(58,42,36,.28)';
const SHEET = '#FFFAF0', BORDER = '#FFFDF7', EDGE = '#B9AD9C', KRAFT = '#BFA67E', RED = '#D8423A', TEAL = '#24807A', GOLD = '#FFCF3F';
const DISPLAY = '"Lilita One", "Fredoka", Arial, sans-serif', ROUND = 'Fredoka, Arial, sans-serif';
const CARD_SHOTS = new Set(['card', 'stats', 'previously']);
export const isCardShot = (sh) => CARD_SHOTS.has(sh.shot);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (x, y, k) => x + (y - x) * k;
const back = (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;
const eout = (x) => 1 - (1 - x) ** 3;
const hsh = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

export function createPaperCards(g, { EP, WORDS, LINES, LAST, hudAt }) {
  const TX = { kicker: '{series} · EP {ep}', or: 'or', voteFooter: 'COMMENT {a} OR {b} · EP {next} FOLLOWS', ...(EP.texts ?? {}) };
  const TAG_A = EP.vote.tagA ?? 'A', TAG_B = EP.vote.tagB ?? 'B';
  const fill = (s) => String(s).replace(/\{series\}/g, EP.series).replace(/\{ep\}/g, EP.ep).replace(/\{next\}/g, EP.ep + 1)
    .replace(/\{a\}/g, TAG_A).replace(/\{b\}/g, TAG_B);
  const KICKER = fill(TX.kicker).toUpperCase();
  const lastWords = WORDS.filter(w => w.line === LINES[LAST.i].id), bare = (s) => s.replace(/[^\w]/g, '');
  const wordAt = (tag, d) => lastWords.find(w => bare(w.w) === bare(tag))?.s ?? LAST.ls + d;
  // the vote lies over a last story beat from its first word; a last card shows first and turns into the vote just
  // before the first tag is said. Each tag pops on its word, or just after the vote opens when its word came earlier.
  const VOTE_AT = isCardShot(LAST) ? Math.max(LAST.a + 0.8, wordAt(TAG_A, 0.5) - 0.35) : LAST.ls - 0.1;
  const T_A = Math.max(wordAt(TAG_A, 0.5), VOTE_AT + 0.15), T_B = Math.max(wordAt(TAG_B, 1.6), T_A + 0.2);

  const grain = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), img = x.createImageData(256, 256), d = img.data;
    for (let i = 0; i < 256 * 256; i++) { const v = hsh(i, 9); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v < 0.5 ? 0 : 255; d[i * 4 + 3] = Math.abs(v - 0.5) * 30; }
    x.putImageData(img, 0, 0); return g.createPattern(c, 'repeat');
  })();
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  function font(size, o = {}) { g.font = o.display ? `400 ${size}px ${DISPLAY}` : `${o.w ?? 600} ${size}px ${ROUND}`; }
  function measure(s, size, o) { font(size, o); return g.measureText(s).width; }
  const fit = (s, size, maxW, o) => Math.min(size, size * maxW / Math.max(measure(s, size, o), 1));
  function txt(s, x, y, size, col, o = {}) {
    font(size, o); g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle';
    if (o.ls) g.letterSpacing = `${o.ls}px`;
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.stroke; g.strokeStyle = o.strokeCol ?? INK; g.strokeText(s, x, y); }
    g.fillStyle = col; g.fillText(s, x, y); g.letterSpacing = '0px';
  }
  // a cut-paper piece: soft shadow, cardboard edge, off-white border, the face with an ink outline, paper grain
  function piece(x, y, w, h, r, face = SHEET, line = 6) {
    g.save(); g.shadowColor = 'rgba(40,25,15,.35)'; g.shadowBlur = 16; g.shadowOffsetY = 8;
    rr(x - 10, y - 6, w + 20, h + 16, r + 8); g.fillStyle = EDGE; g.fill(); g.restore();
    rr(x - 10, y - 10, w + 20, h + 16, r + 8); g.fillStyle = BORDER; g.fill();
    rr(x, y, w, h, r); g.fillStyle = face; g.fill(); g.lineWidth = line; g.strokeStyle = INK; g.stroke();
    g.save(); rr(x, y, w, h, r); g.clip(); g.fillStyle = grain; g.fillRect(x, y, w, h); g.restore();
  }
  function ribbon(s, cx, y, size, k = 1) {
    if (k <= 0) return;
    const w = measure(s, size, { display: true }) + 110, h = size * 1.5;
    g.save(); g.translate(cx, y); g.scale(k, k);
    g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 2); g.lineTo(w / 2 - 22, 0); g.lineTo(w / 2, h / 2); g.lineTo(-w / 2, h / 2); g.lineTo(-w / 2 + 22, 0); g.closePath();
    g.fillStyle = RED; g.fill(); g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
    txt(s, 0, 2, size, '#FFF4D6', { display: true, ls: 2 }); g.restore();
  }
  // draw() at (x, y), popping in at t0 with an overshoot
  function pop(t, t0, x, y, draw) {
    const k = seg(t, t0, t0 + 0.3); if (k <= 0) return;
    g.save(); g.translate(x, y); g.scale(lerp(0.4, 1, back(k)), lerp(0.4, 1, back(k))); draw(); g.restore();
  }

  // ------------------------------------------------------------ the card page: kraft board, one sheet hinged at its foot
  const SX = 80, SY = 230, SW = W - 160, SH = 1490;
  function page(t, sh, content) {
    g.fillStyle = KRAFT; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { g.fillStyle = hsh(i, 1) < 0.5 ? 'rgba(90,64,34,.18)' : 'rgba(255,244,220,.16)'; g.fillRect(hsh(i, 2) * W, hsh(i, 3) * H, 2 + 5 * hsh(i, 4), 2 + 2 * hsh(i, 5)); }
    const up = lerp(0.25, 1, back(seg(t, sh.a, sh.a + 0.4))), push = lerp(1, 1.03, seg(t, sh.a, sh.b)), foot = SY + SH;
    g.save(); g.translate(W / 2, foot); g.scale(push, up * push); g.rotate(-0.006); g.translate(-W / 2, -foot);
    piece(SX, SY, SW, SH, 30);
    txt(KICKER, W / 2, SY + 70, 24, MUTED, { ls: 6 });
    content(t, sh);
    g.restore();
  }
  function card(t, sh) {
    const L = sh.card ?? [], ribbonFirst = L.length > 1, rest = ribbonFirst ? L.slice(1) : L;
    const y0 = 900 - (rest.length - 1) * 75 + (ribbonFirst ? 60 : 0);
    if (ribbonFirst) ribbon(L[0].toUpperCase(), W / 2, y0 - 190, 52, back(seg(t, sh.a + 0.1, sh.a + 0.4)));
    rest.forEach((ln, i) => pop(t, sh.a + 0.3 + i * 0.3, W / 2, y0 + i * 150,
      () => txt(ln, 0, 0, fit(ln, 120, 820, { display: true }), i === rest.length - 1 ? RED : INK, { display: true })));
  }
  function stats(t, sh) {
    if (sh.head) ribbon(sh.head.toUpperCase(), W / 2, 400, fit(sh.head.toUpperCase(), 42, 780, { display: true }), back(seg(t, sh.a + 0.1, sh.a + 0.4)));
    const rows = sh.stats ?? [], gap = Math.min(250, 880 / Math.max(rows.length, 1));
    rows.forEach((r, i) => {
      const y = 540 + i * gap, t0 = sh.a + 0.25 + i * 0.3, k = eout(seg(t, t0, t0 + 0.25)); if (k <= 0) return;
      g.save(); g.globalAlpha = k; g.translate(-40 * (1 - k), 0);
      txt(String(r.label).toUpperCase(), 150, y, 30, MUTED, { align: 'left', ls: 3 });
      const v = String(r.value), vs = fit(v, 110, 520, { display: true }), col = r.style === 'danger' ? RED : INK;
      txt(v, 150, y + 90, vs, col, { display: true, align: 'left' });
      if (r.extra) txt(String(r.extra), 150 + measure(v, vs, { display: true }) + 16, y + 100, 44, MUTED, { align: 'left' });
      if (r.bar != null) {
        rr(150, y + 160, 780, 20, 10); g.fillStyle = 'rgba(58,42,36,.12)'; g.fill();
        rr(150, y + 160, Math.max(20, 780 * clamp(r.bar) * eout(seg(t, t0 + 0.3, t0 + 1.0))), 20, 10); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      }
      g.fillStyle = 'rgba(58,42,36,.18)'; g.fillRect(150, y + gap - 40, 780, 3);
      g.restore();
    });
    if (sh.source) txt(sh.source, W / 2, 1470, 28, MUTED);
  }
  function previously(t, sh) {
    const P = EP.previously;
    ribbon(fill(TX.previously ?? 'PREVIOUSLY · EP {prev}').replace(/\{prev\}/g, P.ep).toUpperCase(), W / 2, 420, 44, back(seg(t, sh.a + 0.05, sh.a + 0.35)));
    pop(t, sh.a + 0.2, W / 2, 590, () => txt(P.question, 0, 0, fit(P.question, 72, 820, { display: true }), INK, { display: true }));
    const tag = (y, side, win, t0) => pop(t, t0, W / 2, y, () => {
      const lab = `${side.tag} · ${String(side.text).toUpperCase()}`;
      piece(-380, -62, 760, 124, 62, win ? RED : SHEET, win ? 6 : 4);
      txt(lab, 0, 4, fit(lab, 56, 660, { display: true }), win ? '#FFF4D6' : MUTED, { display: true });
      if (!win) { g.fillStyle = INK; g.fillRect(-340, -2, 680 * eout(seg(t, t0 + 0.4, t0 + 0.7)), 6); }
    });
    tag(780, P.winner, true, sh.a + 0.5); tag(960, P.loser, false, sh.a + 0.65);
    const k = eout(seg(t, sh.a + 1.0, sh.a + 1.3));
    if (k > 0) { g.save(); g.globalAlpha = k; txt(fill(TX.youPicked ?? 'YOU PICKED {tag}').replace(/\{tag\}/g, P.winner.tag).toUpperCase(), W / 2, 1140, 42, INK, { ls: 4 }); g.restore(); }
  }
  const CONTENT = { card, stats, previously };
  // a card shot; the last card gives its sheet to the vote once the vote starts
  const cardShot = (t, sh) => page(t, sh, t >= VOTE_AT ? (tt) => voteOn(tt, 700) : CONTENT[sh.shot]);

  // ------------------------------------------------------------ HUD: one paper tag per label, a changed value pops in
  function hud(t) {
    const items = hudAt(t).items; if (!items.length) return;
    const ws = items.map(it => Math.max(measure(it.label, 22, { w: 600 }) + 2 * it.label.length + 40, measure(it.val, 46, { display: true }) + 44, 150));
    const gap = 26, tot = ws.reduce((s, w) => s + w, 0) + gap * (items.length - 1), sc = Math.min(1, 980 / tot);
    const a = seg(t, 0.3, 0.6); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(W / 2, 140); g.scale(sc, sc); g.translate(-tot / 2, 0);
    let x = 0;
    items.forEach((it, n) => {
      const w = ws[n], k = it.from != null ? back(clamp(it.k)) : 1, col = it.danger ? RED : INK;
      g.save(); g.translate(x + w / 2, 0); g.rotate((hsh(n, 7) - 0.5) * 0.04); g.scale(lerp(0.6, 1, k), lerp(0.6, 1, k));
      piece(-w / 2, -54, w, 108, 16, SHEET, 4);
      txt(it.label, -w / 2 + 20, -24, 22, it.danger ? RED : MUTED, { align: 'left', ls: 2 });
      txt(it.val, -w / 2 + 20, 20, 46, col, { align: 'left', display: true });
      if (it.bar !== undefined) { rr(-w / 2 + 20, 40, w - 40, 6, 3); g.fillStyle = 'rgba(58,42,36,.15)'; g.fill(); if (it.bar > 0) { rr(-w / 2 + 20, 40, Math.max(6, (w - 40) * Math.min(1, it.bar)), 6, 3); g.fillStyle = col; g.fill(); } }
      g.restore(); x += w + gap;
    });
    g.restore();
  }

  // ------------------------------------------------------------ captions: the phrase being said, word by word
  // phrases split on punctuation or every 4 words and hold until the next one (0.55 s after the last word at most)
  const PHRASES = [];
  { let cur = []; for (const w of WORDS) { cur.push(w); if (/[.,!?…]$/.test(w.w) || cur.length >= 4) { PHRASES.push(cur); cur = []; } } if (cur.length) PHRASES.push(cur); }
  const phraseAt = (t) => PHRASES.find((p, i) => t >= p[0].s - 0.04 && t < Math.min((PHRASES[i + 1]?.[0].s ?? Infinity) - 0.04, p[p.length - 1].e + 0.55));
  // On a card the words sit inside the sheet in ink. Over a story shot there is no bar (it hid the legs in close-ups):
  // cream words with a thick ink outline, as the style's subtitles.
  function captions(t, sh, onCard) {
    if (sh.i === LAST.i && t >= LAST.le + 0.3) return;
    const P = phraseAt(t); if (!P || P[P.length - 1].e < sh.a) return;
    const size = onCard ? 58 : 64, gap = size * 0.3, ws = P.map(w => ({ ...w, wd: measure(w.w, size, { w: 600 }) }));
    let x = W / 2 - (ws.reduce((s, w) => s + w.wd, 0) + gap * (ws.length - 1)) / 2;
    const y = onCard ? 1600 : 1590;
    for (const w of ws) {
      const on = t >= w.s - 0.03, k = seg(t, w.s - 0.03, w.s + 0.08), s = 1 + 0.1 * k * (1 - seg(t, w.s + 0.08, w.s + 0.25));
      g.save(); g.translate(x + w.wd / 2, y); g.scale(s, s);
      if (onCard) txt(w.w, 0, 0, size, on ? (w.hot ? RED : INK) : UNSAID);
      else {
        g.shadowColor = 'rgba(40,25,15,.35)'; g.shadowBlur = 14;
        txt(w.w, 0, 0, size, on ? (w.hot ? GOLD : SHEET) : '#B7AB9C', { stroke: 12, strokeCol: on ? INK : 'rgba(58,42,36,.55)' });
      }
      g.restore(); x += w.wd + gap;
    }
  }

  // ------------------------------------------------------------ the vote: the question and the two tags, each popping on its word
  // y = the top of the block: the question, A, "or", B, then the footer once the line is said, all within 560
  function voteOn(t, y) {
    const q = EP.vote.question;
    pop(t, VOTE_AT, W / 2, y + 80, () => txt(q, 0, 0, fit(q, 58, 740, { display: true }), INK, { display: true }));
    const tag = (dy, label, face, t0) => pop(t, t0, W / 2, y + dy, () => {
      piece(-350, -64, 700, 128, 64, face, 6);
      txt(label, 0, 4, fit(label, 60, 600, { display: true }), '#FFF4D6', { display: true, ls: 1 });
    });
    tag(200, `${TAG_A} · ${EP.vote.a.toUpperCase()}`, RED, T_A);
    if (t > T_B + 0.2) { g.save(); g.globalAlpha = eout(seg(t, T_B + 0.2, T_B + 0.4)); txt(TX.or, W / 2, y + 293, 34, MUTED); g.restore(); }
    tag(385, `${TAG_B} · ${EP.vote.b.toUpperCase()}`, TEAL, T_B);
    const d = eout(seg(t, LAST.le, LAST.le + 0.3)); if (d <= 0) return;
    const ft = fill(TX.voteFooter).toUpperCase(), fw = Math.min(760, measure(ft, 28, { w: 600 }) + 3 * ft.length + 60);
    g.save(); g.globalAlpha = d; rr(W / 2 - fw / 2, y + 470, fw, 58, 29); g.fillStyle = INK; g.fill();
    txt(ft, W / 2, y + 500, 28, SHEET, { ls: 3 }); g.restore();
  }
  // over a story shot the vote gets its own sheet under the HUD, above a close-up's face (the Reels safe zone starts
  // at y 250); a last card already gave it the page
  function vote(t, sh) {
    if (t < VOTE_AT || isCardShot(sh)) return;
    const k = back(seg(t, VOTE_AT, VOTE_AT + 0.35)), top = 250, foot = top + 560;
    g.save(); g.translate(W / 2, top); g.scale(1, lerp(0.25, 1, k)); g.translate(-W / 2, -top);
    piece(130, top, W - 260, foot - top, 30); g.restore();
    voteOn(t, top);
  }

  return { cardShot, hud, captions, vote };
}
