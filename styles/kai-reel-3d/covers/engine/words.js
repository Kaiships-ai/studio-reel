// words.js: the voice drives the picture. vo/make_vo.py writes src/vo.js (VO_LINES, VO_WORDS: {w, s, e, line}).
// Every visual hit is keyed to a WORD, never to a hard-coded second: re-record the voice and the picture follows.
//
//   const VO = voice();                 // reads the globals from src/vo.js
//   VO.at('three')                      // start time of the 1st spoken "three" (case/punctuation-insensitive)
//   VO.at('tools', 2)                   // 2nd occurrence;  VO.end('tools') = its end time
//   VO.line('l03')                      // {s, e} of a line
//   VO.drawCaptions(g2, t, W, H)        // the caption band (y ≈ 0.727 H, i.e. 1395 px on 1080×1920)
const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

export function voice() {
  // src/vo.js declares top-level consts (global lexical bindings, not window properties): read them by name
  const LINES = typeof VO_LINES !== 'undefined' ? VO_LINES : [], WORDS = typeof VO_WORDS !== 'undefined' ? VO_WORDS : [], END = typeof VO_END !== 'undefined' ? VO_END : 0;
  const find = (w, n = 1) => {
    const k = norm(w); let c = 0;
    for (const x of WORDS) if (norm(x.w) === k && ++c === n) return x;
    console.warn('LOG words.js: no spoken word', w, n); return null;
  };
  // caption chunks: ≤ 4 words, break after punctuation or a pause > 0.25 s
  const CHUNKS = [];
  { let cur = null;
    WORDS.forEach((x, i) => {
      if (!cur) cur = { ws: [], s: x.s, e: x.e, line: x.line };
      cur.ws.push(x); cur.e = x.e;
      const nx = WORDS[i + 1], br = !nx || nx.line !== x.line || cur.ws.length >= 4 || /[.,!?;:…]$/.test(x.w) || (nx.s - x.e) > 0.25;
      if (br) { CHUNKS.push(cur); cur = null; }
    });
    for (let i = 0; i + 1 < CHUNKS.length; i++) CHUNKS[i].e = CHUNKS[i + 1].s - CHUNKS[i].e < 0.1 ? CHUNKS[i + 1].s : CHUNKS[i].e + 0.05;
  }
  function drawCaptions(g, t, W, H, o = {}) {
    if (o.off) return;
    const C = CHUNKS.find(c => t >= c.s && t < c.e); if (!C) return;
    const dpr = g.canvas.width / W, size = Math.round(H * 0.034) * dpr, y = H * 0.727 * dpr, cx = g.canvas.width / 2;
    g.save(); g.font = `800 ${size}px "Shantell Sans", "Arial Rounded MT Bold", Arial, sans-serif`; g.textBaseline = 'middle';
    const words = C.ws.map(x => x.w.toUpperCase()), sp = g.measureText(' ').width * 1.7, ws = words.map(w => g.measureText(w).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    const age = t - C.s, pop = Math.min(1, age / 0.12), sc = 0.85 + 0.15 * (1 - Math.pow(1 - pop, 3));
    const pw = total + size * 1.2, ph = size * 1.6;
    g.translate(cx, y); g.scale(sc, sc);
    g.fillStyle = o.box || 'rgba(18,12,28,0.88)'; g.beginPath(); g.roundRect(-pw / 2, -ph / 2, pw, ph, ph * 0.28); g.fill();
    let x = -total / 2;
    C.ws.forEach((wd, i) => {
      const live = t >= wd.s, cur = t >= wd.s && t < wd.e + 0.05;
      g.fillStyle = cur ? (o.hot || '#ffc94a') : live ? '#fff4e0' : 'rgba(255,244,224,0.55)';
      g.save(); g.translate(x + ws[i] / 2, 0); if (cur) g.scale(1.08, 1.08); g.textAlign = 'center'; g.fillText(words[i], 0, 0); g.restore();
      x += ws[i] + sp;
    });
    g.restore();
  }
  return {
    LINES, WORDS, END, CHUNKS, drawCaptions,
    at: (w, n = 1) => find(w, n)?.s ?? null,
    end: (w, n = 1) => find(w, n)?.e ?? null,
    line: (id) => LINES.find(l => l.id === id) || null,
  };
}
