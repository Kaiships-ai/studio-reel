// Word-by-word captions from words.json: 1-3 words per chunk, swapped on the frame that contains the chunk's first
// word t0. Drawn on a 2D canvas over the WebGL one (round-joined stroke, which CSS text-stroke cannot do).
const MAX_WORDS = 3, MAX_CHARS = 14;
// px at 1080 wide; stroke = px outside the glyph; track = letter spacing. Measured 11/11 on 28 reference frames
// (tools/look_measure.mjs): glyph stem 15-16 px, black stroke median 7 px (5-9), text rows centred at 70.2-70.6 % of the
// height, a wide heavy face. Ours at 800 / 6 px measured stem 13, stroke 6: thinner and narrower (judge t1 "small").
export const CAP = { size: 74, weight: 900, stroke: 8, track: 1.5 };   // stroke 8 drawn measures 7 (anti-aliased edge)
// trailing punctuation stays ("pink.", "minutes,": FORENSIC.md captions); only quote marks go
const clean = w => w.replace(/^["“]+|["”]+$/g, '');

export function chunkWords(words, lines) {
  const out = [];
  for (const id of lines) {
    const ws = words.filter(w => w.line === id).sort((a, b) => a.i - b.i);
    let cur = [];
    const flush = () => { if (cur.length) out.push({ line: id, words: cur, text: cur.map(w => clean(w.word)).join(' '), t0: cur[0].t0, t1: cur[cur.length - 1].t1 }); cur = []; };
    ws.forEach((w, k) => {
      cur.push(w);
      const nx = ws[k + 1], chars = cur.map(x => clean(x.word)).join(' ').length;
      if (!nx || cur.length >= MAX_WORDS || /[.,!?;:]["”]?$/.test(w.word) || chars + 1 + clean(nx.word).length > MAX_CHARS || nx.t0 - w.t1 > 0.25) flush();
    });
    flush();
  }
  return out;
}

export function createCaptions({ words, lines, fps, width, height, font = 'InterReel' }) {
  const chunks = chunkWords(words, lines);
  // a chunk stays up until the next one starts, unless the voice pauses for more than 0.6 s
  chunks.forEach((c, i) => { const nx = chunks[i + 1]; c.until = nx && nx.t0 - c.t1 < 0.6 ? nx.t0 : c.t1 + 0.35; });
  const cv = document.createElement('canvas'); cv.width = width; cv.height = height; cv.id = 'captions';
  const g = cv.getContext('2d'), k = width / 1080;
  const chunkAt = f => { const t = f / fps; for (const c of chunks) if (t >= c.t0 && t < c.until) return c; return null; };
  function draw(f) {
    g.clearRect(0, 0, width, height);
    const c = chunkAt(f); if (!c) return null;
    const pop = 1;                                                     // the reference cuts in at final size (no pop)
    // measured on the reference frames (GATES.md "Look gates"): ascender height 54 px at 1920 tall, a ~6 px black
    // stroke outside the glyph, a hard drop shadow down-right; bold, not black weight; centre at 70 % of the height
    let size = CAP.size * k;
    g.font = `${CAP.weight} ${size}px ${font}`; g.letterSpacing = `${CAP.track * k}px`;
    const w = g.measureText(c.text).width; if (w > 940 * k) { size *= 940 * k / w; g.font = `${CAP.weight} ${size}px ${font}`; }
    g.save(); g.translate(width / 2, height * 0.70); g.scale(pop, pop);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.miterLimit = 2;
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 1.5 * k; g.shadowOffsetX = 3 * k; g.shadowOffsetY = 5 * k;
    g.lineWidth = 2 * CAP.stroke * k; g.strokeStyle = '#000'; g.strokeText(c.text, 0, 0);
    g.shadowColor = 'transparent'; g.fillStyle = '#fff'; g.fillText(c.text, 0, 0);
    g.restore();
    return c.text;
  }
  return { canvas: cv, chunks, draw, chunkAt };
}
