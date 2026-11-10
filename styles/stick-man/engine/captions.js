// Word-by-word captions from words.json: 1-3 words per chunk, swapped on the frame that contains the chunk's first
// word t0. Drawn on a 2D canvas over the WebGL one (round-joined stroke, which CSS text-stroke cannot do).
const MAX_WORDS = 3, MAX_CHARS = 14;
const clean = w => w.replace(/^["“]+|["”]+$/g, '').replace(/[.,;:"”]+$/g, '');

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
    const age = f - Math.ceil(c.t0 * fps - 1e-6), pop = age < 3 ? 1 + 0.06 * (1 - age / 3) : 1;
    let size = 104 * k;
    g.font = `900 ${size}px ${font}`;
    const w = g.measureText(c.text).width; if (w > 940 * k) { size *= 940 * k / w; g.font = `900 ${size}px ${font}`; }
    g.save(); g.translate(width / 2, height * 0.70); g.scale(pop, pop);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.miterLimit = 2;
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 18 * k; g.shadowOffsetY = 6 * k;
    g.lineWidth = 22 * k; g.strokeStyle = '#000'; g.strokeText(c.text, 0, 0);   // 11 px outside the glyph
    g.shadowColor = 'transparent'; g.fillStyle = '#fff'; g.fillText(c.text, 0, 0);
    g.restore();
    return c.text;
  }
  return { canvas: cv, chunks, draw, chunkAt };
}
