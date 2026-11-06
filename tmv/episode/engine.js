// engine.js: plays one episode (episode.json + vo/vo.json next to the page) as a 9:16 film, in the season-1
// design system (ST-79): navy stage lit by two neon lights, rim-lit cast, type system v1 cards (Inter Tight +
// JetBrains Mono, three sizes, paper #F4EFE6, ink #15120F, accent #E2457A, no glow), no end card: the vote is
// the last frame. Keeps the page contract (window.READY, window.render(t), window.DUR). Layout is in 1080x1920
// units and scales to any viewport (the preview renders at 540x960).
(async function () {
  const PAPER = '#F4EFE6', INK = '#15120F', ACCENT = '#E2457A', WHITE = '#F7F5F2';
  const SANS = '"Inter Tight", Arial, sans-serif', MONO = '"JetBrains Mono", Menlo, monospace';
  const SIZE = { big: 96, mid: 60, small: 28 };   // the three type sizes
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  const W = cv.width = innerWidth, H = cv.height = innerHeight, K = W / 1080;

  const [ep, vo] = await Promise.all(['episode.json', 'vo/vo.json'].map(f => fetch(f).then(r => {
    if (!r.ok) throw new Error(`${f} is missing next to the page: run node episode/make.mjs <episode> vo`); return r.json(); })));
  await Promise.all([`800 ${SIZE.big}px ${SANS}`, `600 ${SIZE.small}px ${MONO}`].map(f => document.fonts.load(f)));
  const pal = { bg: '#0B1230', bg2: '#1A2150', left: '#FF3D8B', right: '#29E0FF', ...(ep.palette || {}) };
  const cast = {};
  for (const m of ep.cast) {
    const base = m.seed ? window.TMV_SEEDS[m.seed] : {};
    if (m.seed && !base) throw new Error(`episode.json: cast "${m.id}" names seed "${m.seed}", which is not in characters/cast.js`);
    cast[m.id] = { ...base, ...m };
  }
  const order = Object.keys(cast);
  const lines = vo.lines, END = vo.duration + 1.4, VOTE = lines[lines.length - 1];
  window.DUR = END;

  // beat i runs from just before its line starts to just before the next one; the vote line is the last beat
  const beats = lines.map((l, i) => ({ ...l, ...(ep.beats[i] || {}), t0: i ? l.s - 0.12 : 0, t1: i + 1 < lines.length ? lines[i + 1].s - 0.12 : END }));
  const hudAt = [];   // HUD values in force during each beat, and what changed at its start
  beats.forEach((b, i) => { const prev = i ? hudAt[i - 1].v : {}; hudAt.push({ v: { ...prev, ...(b.hud || {}) }, prev }); });

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), eout = k => 1 - Math.pow(1 - clamp(k), 3);
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const font = (w, size, fam) => { g.font = `${w} ${size}px ${fam}`; };
  function text(s, x, y, size, col, o = {}) {
    g.save(); font(o.w ?? 800, size, o.mono ? MONO : SANS); g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle';
    if (o.ls) g.letterSpacing = `${o.ls}px`; g.fillStyle = col; g.fillText(s, x, y); g.restore();
  }
  const measure = (s, size, w = 800, mono = false) => { g.save(); font(w, size, mono ? MONO : SANS); const m = g.measureText(s).width; g.restore(); return m; };

  function stage(t) {
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, pal.bg); bg.addColorStop(1, pal.bg2);
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    // the two neon lights: soft cones from the upper corners that breathe slowly
    for (const [x, col, ph] of [[-60, pal.left, 0], [1140, pal.right, 2]]) {
      const a = 0.32 + 0.06 * Math.sin(t * 0.9 + ph), r = g.createRadialGradient(x, 520, 0, x, 520, 1150);
      r.addColorStop(0, col + Math.round(a * 255).toString(16).padStart(2, '0')); r.addColorStop(1, col + '00');
      g.fillStyle = r; g.fillRect(0, 0, 1080, 1920);
    }
    // floor and its light pools
    g.fillStyle = 'rgba(5,7,20,0.55)'; g.fillRect(0, 1560, 1080, 360);
    for (const [x, col] of [[300, pal.left], [780, pal.right]]) {
      g.save(); g.globalAlpha = 0.22; g.fillStyle = col; g.beginPath(); g.ellipse(x, 1600, 360, 60, 0, 0, 7); g.fill(); g.restore();
    }
    // dust drifting through the light: keeps every frame alive
    for (let i = 0; i < 46; i++) {
      const x = (hash(i) * 1080 + t * (12 + hash(i + 9) * 22)) % 1080, y = (hash(i + 3) * 1700 - t * (8 + hash(i + 5) * 16) + 1700 * 4) % 1700;
      g.fillStyle = `rgba(247,245,242,${0.10 + 0.25 * hash(i + 7)})`; g.beginPath(); g.arc(x, y, 1.5 + 3 * hash(i + 1), 0, 7); g.fill();
    }
  }

  function wordsOf(b) { return vo.words.filter(w => w.line === b.id); }
  function talking(b, t) { return wordsOf(b).some(w => t >= w.s && t <= w.e + 0.04) ? 0.55 + 0.45 * Math.abs(Math.sin(t * 19)) : 0.06; }

  // who is on screen for a shot, where, and how big
  function layout(b) {
    const who = b.who, shot = b.shot || 'two';
    if (shot === 'close') return [{ id: who, x: 540, y: 2080, s: 1.45 }];
    if (shot === 'wide') return order.map((id, i) => ({ id, x: 1080 * (i + 1) / (order.length + 1), y: 1600, s: 0.72 }));
    const other = b.with || order.find(id => id !== who && cast[id].role !== 'mascot') || order.find(id => id !== who);
    const left = order.indexOf(who) < order.indexOf(other);
    return [{ id: who, x: left ? 330 : 750, y: 1720, s: 0.98 }, { id: other, x: left ? 750 : 330, y: 1720, s: 0.98 }];
  }

  function actors(b, t) {
    const k = (t - b.t0) / Math.max(0.5, b.t1 - b.t0), push = 1 + 0.05 * k;   // a slow push-in through every beat
    g.save(); g.translate(540, 1100); g.scale(push, push); g.translate(-540, -1100);
    const spots = layout(b);
    for (const p of spots) {
      const c = cast[p.id]; if (!c) throw new Error(`episode.json: beat "${b.id}" names "${p.id}", who is not in the cast`);
      const sp = spots.find(q => q.id === b.who) || p;
      window.TMV_FIGURE(g, c, { x: p.x, y: p.y, s: p.s, t: t + order.indexOf(p.id), talk: p.id === b.who ? talking(b, t) : 0.06,
        look: p.id === b.who ? 0 : Math.sign(sp.x - p.x) * 0.8, rim: [pal.left, pal.right] });
    }
    g.restore();
  }

  function hud(i, t) {
    const { v, prev } = hudAt[i], keys = Object.keys(v); if (!keys.length) return;
    const k = clamp((t - beats[i].t0) / 0.45);
    let x = 60;
    for (const key of keys) {
      const val = String(v[key]), changed = prev[key] !== v[key];
      const w = measure(key, SIZE.small, 600, true) + measure(val, SIZE.small, 700, true) + 60;
      g.fillStyle = changed && k < 1 ? ACCENT : 'rgba(21,18,15,0.82)'; g.beginPath(); g.roundRect(x, 150, w, 64, 32); g.fill();
      text(key, x + 22, 182, SIZE.small, 'rgba(247,245,242,0.6)', { mono: true, w: 600, align: 'left', ls: 2 });
      g.save(); g.beginPath(); g.rect(x, 150, w, 64); g.clip();
      const vx = x + w - 22, e = changed ? eout(k) : 1;
      if (changed && prev[key] !== undefined) text(String(prev[key]), vx, 182 - 60 * e, SIZE.small, WHITE, { mono: true, w: 700, align: 'right' });
      text(val, vx, 182 + 60 * (1 - e), SIZE.small, WHITE, { mono: true, w: 700, align: 'right' });
      g.restore();
      x += w + 16;
    }
  }

  // word-by-word captions: the line's words appear as they are said, the word being said is in the accent
  function captions(b, t, base) {
    const ws = wordsOf(b).filter(w => t >= w.s - 0.05); if (!ws.length) return;
    const size = SIZE.mid, rows = [[]]; let rowW = 0;
    for (const w of wordsOf(b)) {   // wrap on the whole line so words never jump between rows
      const ww = measure(w.w + ' ', size); if (rowW + ww > 900 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(w); rowW += ww;
    }
    const y0 = base - (rows.length - 1) * 38;
    text(cast[b.who]?.name?.toUpperCase() || '', 540, y0 - 74, SIZE.small, ACCENT, { mono: true, w: 600, ls: 4 });
    rows.forEach((row, r) => {
      const full = row.reduce((a, w) => a + measure(w.w + ' ', size), 0) - measure(' ', size);
      let x = 540 - full / 2;
      for (const w of row) {
        if (t >= w.s - 0.05) {
          const all = wordsOf(b), nx = all[all.indexOf(w) + 1], now = t >= w.s - 0.05 && t < (nx ? nx.s - 0.05 : w.e + 0.1);
          g.save(); font(800, size, SANS); g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = 'rgba(11,13,20,0.85)';
          g.strokeText(w.w, x, y0 + r * 76 + 22); g.fillStyle = now ? ACCENT : WHITE; g.fillText(w.w, x, y0 + r * 76 + 22); g.restore();
        }
        x += measure(w.w + ' ', size);
      }
    });
  }

  // type system v1 card: paper, kicker in mono, one title, an accent rule
  const kicker = `${(ep.series || 'Ten Million Views').toUpperCase()} · EP ${ep.ep ?? 1}`;
  function titleCard(t) {
    const out = clamp((t - 2.2) / 0.35), k = eout(t / 0.4) * (1 - eout(out)); if (k <= 0) return;
    const y = 260 - 40 * (1 - k);
    g.save(); g.globalAlpha = k; g.fillStyle = PAPER; g.beginPath(); g.roundRect(60, y, 960, 300, 28); g.fill();
    text(kicker, 110, y + 70, SIZE.small, INK, { mono: true, w: 600, align: 'left', ls: 3 });
    text(ep.title, 110, y + 170, SIZE.big, INK, { align: 'left' });
    g.fillStyle = ACCENT; g.fillRect(110, y + 240, 120 * eout(t / 0.8), 8); g.restore();
  }

  function voteFrame(t) {
    const t0 = VOTE.s - 0.12, k = eout((t - t0) / 0.45); if (k <= 0) return;
    const v = ep.vote, y = 980 + 80 * (1 - k);
    g.save(); g.globalAlpha = k;
    g.fillStyle = PAPER; g.beginPath(); g.roundRect(60, y, 960, 780, 32); g.fill();
    text(kicker, 110, y + 74, SIZE.small, INK, { mono: true, w: 600, align: 'left', ls: 3 });
    g.save(); font(800, SIZE.mid, SANS); g.fillStyle = INK; g.textBaseline = 'middle';
    const qs = [], words = v.question.split(' '); let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (g.measureText(n).width > 860) { qs.push(cur); cur = w; } else cur = n; }
    qs.push(cur); qs.forEach((q, i) => g.fillText(q, 110, y + 170 + i * 72)); g.restore();
    const oy = y + 200 + qs.length * 72;
    [['A', v.a], ['B', v.b]].forEach(([l, w], i) => {
      const bx = 110 + i * 440, pulse = 1 + 0.015 * Math.sin(t * 4 + i * 3);
      g.save(); g.translate(bx + 200, oy + 120); g.scale(pulse, pulse);
      g.fillStyle = i ? INK : ACCENT; g.beginPath(); g.roundRect(-200, -120, 400, 240, 24); g.fill();
      text(l, 0, -40, SIZE.big, PAPER); text(w.toUpperCase(), 0, 60, SIZE.small, PAPER, { mono: true, w: 700, ls: 3 }); g.restore();
    });
    text('COMMENT A OR B', 540, oy + 320, SIZE.small, ACCENT, { mono: true, w: 700, ls: 4 });
    g.restore();
  }

  window.render = function (t) {
    t = clamp(t, 0, END);
    g.setTransform(K, 0, 0, K, 0, 0);
    const i = Math.max(0, beats.findIndex(b => t >= b.t0 && t < b.t1)), b = beats[t >= END ? beats.length - 1 : i];
    stage(t);
    actors(b, t);
    hud(beats.indexOf(b), t);
    titleCard(t);
    voteFrame(t);
    captions(b, t, b === beats[beats.length - 1] ? 860 : 1390);
  };
  window.render(0);
  window.READY = true;
})().catch(e => { document.title = 'error'; throw e; });
