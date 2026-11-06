// hud.js (TMV ep1, from ep01 v3): the 2D layer on #fx. Layout in 1080×1920 units (PX scales to the real canvas).
// HUD = saveo-style chip row (DAY · CASH · REVENUE) + the big HUD close-ups (CASH roll, 40 DAYS LEFT, −$412), word-by-word captions,
// slam titles, the rewind counter and the phone. Every function is a pure function of t.
import { clamp, seg, ss, sio, eout, lerp, hsh } from './stage.js';

export const PINK = '#FF3D8B', WHITE = '#F7F5F2', DIM = 'rgba(247,245,242,0.32)', INK = '#0B0D14';
const SANS = 'Inter, Arial, sans-serif', MONO = '"JetBrains Mono", Menlo, monospace';
export const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

export function createHud(g, W, H) {
  const PX = W / 1080;
  const P = (v) => v * PX;
  function font(w, size, fam = SANS) { g.font = `${w} ${P(size)}px ${fam}`; }
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(P(x), P(y), P(w), P(h), P(r)); }
  function txt(s, x, y, size, col, o = {}) {
    g.save(); font(o.w ?? 800, size, o.mono ? MONO : SANS); g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'middle';
    if (o.ls) g.letterSpacing = `${P(o.ls)}px`;
    if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = P(o.glowR ?? 30); }
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = P(o.stroke); g.strokeStyle = o.strokeCol ?? 'rgba(0,0,0,.75)'; g.strokeText(s, P(x), P(y)); }
    g.fillStyle = col; g.fillText(s, P(x), P(y)); g.restore();
  }
  function measure(s, size, w = 800, mono = false) { g.save(); font(w, size, mono ? MONO : SANS); const m = g.measureText(s).width / PX; g.restore(); return m; }
  // a digit string where every changed character rolls up from below (slot roll), k = 0..1
  function roll(a, b, k, x, y, size, col, o = {}) {
    const n = Math.max(a.length, b.length); a = a.padStart(n, ' '); b = b.padStart(n, ' ');
    const cw = measure('0', size, o.w ?? 800, true), wTot = cw * n, x0 = o.align === 'left' ? x : o.align === 'right' ? x - wTot : x - wTot / 2;
    g.save(); g.beginPath(); g.rect(P(x0 - 10), P(y - size * 0.62), P(wTot + 20), P(size * 1.24)); g.clip();
    for (let i = 0; i < n; i++) {
      const cx = x0 + cw * (i + 0.5);
      if (a[i] === b[i] || k >= 1) txt(k >= 1 ? b[i] : a[i], cx, y, size, col, { ...o, mono: true, align: 'center' });
      else { const e = eout(k); txt(a[i], cx, y - size * 1.1 * e, size, col, { ...o, mono: true, align: 'center', alpha: 1 - e });
        txt(b[i], cx, y + size * 1.1 * (1 - e), size, col, { ...o, mono: true, align: 'center', alpha: e }); }
    }
    g.restore();
  }
  // ------------------------------------------------------------ the chip row (saveo): REVENUE · ATTENTION · COPIES. Danger = pink.
  // st = { att (percent), attDanger 0..1, copies, copiesFrom, copiesK (roll 0..1), copiesFlash 0..1, alpha, shake, pop:[k0,k1,k2] (slam-in per chip) }
  function chips(t, st) {
    const a = st.alpha ?? 1; if (a <= 0) return;
    const sx = (st.shake ?? 0) * 14 * Math.sin(t * 93), sy = (st.shake ?? 0) * 6 * Math.cos(t * 71);
    const y = st.y ?? 150, h = 112;
    const att = st.att ?? 100, cop = st.copies ?? 0;
    const items = [
      { w: 372, label: 'REVENUE', val: '$0 / $10,000', bar: 0 },
      { w: 270, label: 'ATTENTION', val: (att >= 99.95 ? '100' : att.toFixed(1)) + '%', danger: st.attDanger ?? 0, bar: att / 100 },
      { w: 214, label: 'COPIES', val: String(cop), from: st.copiesFrom !== undefined ? String(st.copiesFrom) : null, danger: cop > 0 ? 1 : 0, flash: st.copiesFlash ?? 0 },
    ];
    const tot = items.reduce((s_, it) => s_ + it.w, 0) + 16 * (items.length - 1);
    g.save(); g.globalAlpha = a; g.translate(P(sx), P(sy));
    let x = 540 - tot / 2;
    items.forEach((it, i) => {
      const pk = st.pop ? st.pop[i] : 1; if (pk <= 0) { x += it.w + 16; return; }
      const sc = pk < 1 ? lerp(1.6, 1, eout(pk)) : 1;
      g.save(); g.globalAlpha *= Math.min(1, pk * 3); g.translate(P(x + it.w / 2), P(y + h / 2)); g.scale(sc, sc); g.translate(-P(x + it.w / 2), -P(y + h / 2));
      const dz = it.danger ?? 0, fl = it.flash ?? 0;
      rr(x, y, it.w, h, 18); g.fillStyle = 'rgba(9,10,16,.84)'; g.fill();
      if (dz > 0 || fl > 0) { rr(x, y, it.w, h, 18); g.fillStyle = `rgba(255,61,139,${0.16 * dz + 0.6 * fl})`; g.fill(); }
      rr(x, y, it.w, h, 18); g.lineWidth = P(2 + 3 * fl); g.strokeStyle = dz > 0 || fl > 0 ? `rgba(255,61,139,${Math.min(1, 0.6 + 0.4 * dz + fl)})` : 'rgba(255,255,255,.18)'; g.stroke();
      if (fl > 0) { g.save(); g.shadowColor = PINK; g.shadowBlur = P(60 * fl); rr(x, y, it.w, h, 18); g.strokeStyle = PINK; g.stroke(); g.restore(); }
      txt(it.label, x + 20, y + 30, 21, dz > 0 ? PINK : 'rgba(247,245,242,.6)', { align: 'left', w: 700, ls: 3 });
      const col = dz > 0 ? (fl > 0.5 ? WHITE : PINK) : WHITE;
      if (it.from !== null && it.from !== undefined && (st.copiesK ?? 1) < 1) roll(it.from, it.val, st.copiesK, x + 20, y + 76, 46, col, { align: 'left', w: 800, glow: PINK, glowR: 18 });
      else txt(it.val, x + 20, y + 76, it.label === 'REVENUE' ? 40 : 46, col, { align: 'left', mono: true, w: 800, glow: dz > 0 ? PINK : null, glowR: 18 });
      if (it.bar !== undefined) { rr(x + 20, y + h - 12, it.w - 40, 5, 2.5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
        if (it.bar > 0) { rr(x + 20, y + h - 12, (it.w - 40) * it.bar, 5, 2.5); g.fillStyle = dz > 0 ? PINK : 'rgba(247,245,242,.85)'; g.fill(); } }
      g.restore(); x += it.w + 16;
    });
    g.restore();
  }
  // ------------------------------------------------------------ slam: a word block lands from big to its size with an impact
  function slam(lines, t, t0, y, o = {}) {
    if (t < t0) return 0;
    const k = seg(t, t0, t0 + (o.dur ?? 0.16)), s = k < 1 ? lerp(o.from ?? 2.4, 1, eout(k)) : 1 + 0.05 * Math.exp(-(t - t0 - (o.dur ?? 0.16)) * 14) * Math.cos((t - t0) * 40);
    const fade = o.out ? 1 - ss(seg(t, o.out, o.out + 0.2)) : 1; if (fade <= 0) return 0;
    const sh = Math.exp(-(t - t0) * 9) * (o.shake ?? 18);
    g.save(); g.globalAlpha = Math.min(1, k * 3) * fade;
    g.translate(P(540 + sh * Math.sin(t * 87)), P(y + sh * 0.5 * Math.cos(t * 61))); g.scale(s, s); g.translate(-P(540), -P(y));
    let yy = y;
    for (const L of lines) {
      const chroma = Math.exp(-(t - t0) * 10) * 10;
      if (chroma > 0.3) { txt(L.text, 540 - chroma, yy, L.size, 'rgba(0,255,255,.55)', { w: 900, ls: L.ls ?? 0 }); txt(L.text, 540 + chroma, yy, L.size, 'rgba(255,0,80,.55)', { w: 900, ls: L.ls ?? 0 }); }
      if (L.parts) {   // mixed colours on one line
        const wTot = L.parts.reduce((s_, p) => s_ + measure(p.text, L.size, 900), 0); let x = 540 - wTot / 2;
        for (const p of L.parts) { const w = measure(p.text, L.size, 900); txt(p.text, x + w / 2, yy, L.size, p.col, { w: 900, stroke: L.stroke ?? 10, glow: p.glow, glowR: 40 }); x += w; }
      } else txt(L.text, 540, yy, L.size, L.col ?? WHITE, { w: 900, stroke: L.stroke ?? 10, glow: L.glow, glowR: 40, ls: L.ls ?? 0 });
      yy += L.size * (L.lead ?? 1.08);
    }
    g.restore(); return k;
  }
  // ------------------------------------------------------------ captions: words appear as they are spoken; the phrase stays until the next
  // words = [{w, s, e}] already on the reel timeline; phrases split on punctuation / every ~4 words
  function captions(t, words, y = 1360, o = {}) {
    const ph = []; let cur = [];
    for (const w of words) { cur.push(w); if (/[.,!?…]$/.test(w.w) || cur.length >= (o.maxWords ?? 4)) { ph.push(cur); cur = []; } }
    if (cur.length) ph.push(cur);
    let P_ = null;
    for (let i = 0; i < ph.length; i++) { const a = ph[i][0].s - 0.04, b = i + 1 < ph.length ? Math.min(ph[i + 1][0].s - 0.04, ph[i][ph[i].length - 1].e + 0.55) : ph[i][ph[i].length - 1].e + 0.55; if (t >= a && t < b) P_ = ph[i]; }
    if (!P_) return;
    if (o.cut !== undefined && P_[P_.length - 1].e < o.cut) return;   // a phrase already spoken before this cut doesn't linger into the new shot
    // v3: readable on any frame. A dark pill behind the phrase; words not yet spoken at 62 % white (v2 was 32 %), spoken = full white
    const size = o.size ?? 64, gap = size * 0.28, ws = P_.map(w => ({ ...w, wd: measure(w.w, size, 800) }));
    const tot = ws.reduce((s, w) => s + w.wd, 0) + gap * (ws.length - 1); let x = 540 - tot / 2;
    const a0 = ss(seg(t, P_[0].s - 0.06, P_[0].s + 0.04)), padX = 34, ph_ = size * 1.36;
    if (!o.paper) { g.save(); g.globalAlpha *= a0; rr(540 - tot / 2 - padX, y - ph_ / 2, tot + padX * 2, ph_, ph_ / 2); g.fillStyle = 'rgba(6,7,12,.80)'; g.fill();
      rr(540 - tot / 2 - padX, y - ph_ / 2, tot + padX * 2, ph_, ph_ / 2); g.lineWidth = P(2); g.strokeStyle = 'rgba(255,255,255,.10)'; g.stroke(); g.restore(); }
    for (const w of ws) {
      const on = t >= w.s - 0.03, k = ss(seg(t, w.s - 0.03, w.s + 0.08));
      const s = 1 + 0.08 * k * (1 - ss(seg(t, w.s + 0.08, w.s + 0.25)));
      g.save(); g.translate(P(x + w.wd / 2), P(y)); g.scale(s, s);
      if (o.paper) {   // on the cream/white cards: black ink, no pill; words not yet spoken in light grey, hot words pink
        const col = on ? (w.hot ? '#E8226F' : '#111111') : 'rgba(17,17,17,0.28)';
        txt(w.w, 0, 0, size, col, { w: 900 });
      } else {
        const col = on ? (w.hot ? PINK : WHITE) : 'rgba(247,245,242,0.72)';
        txt(w.w, 0, 0, size, col, { w: 800, stroke: 10, strokeCol: 'rgba(0,0,0,.8)', glow: on && w.hot ? PINK : null, glowR: 24 });
      }
      g.restore(); x += w.wd + gap;
    }
  }
  function veil(a, col = '0,0,0') { if (a <= 0) return; g.save(); g.fillStyle = `rgba(${col},${a})`; g.fillRect(0, 0, W, H); g.restore(); }
  return { P, PX, txt, rr, measure, roll, chips, slam, captions, veil, font, g };
}
