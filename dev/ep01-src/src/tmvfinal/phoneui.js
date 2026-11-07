// phoneui.js · TMV Ep1: everything drawn on the 3D phone's screen (a live canvas texture). Units: 1080 × 2160 (PX scales).
// Pure functions of t. The screens: insights (the 10M counter), player (the 12 s Reel Studio clip, as a reel), rule1 (a view per
// start), post (caption link in grey, taps do nothing), comments ("link??" flood, one "price?" scrolls past), profile (the link
// flies to the bio), theo (his repost: same clip, a working button, a checkout sheet), theoComments (he answers every one),
// compose (+ New reel), reply (answering one comment). Story numbers only; nothing here is a real account.
import { clamp, seg, ss, sio, eout, lerp, hsh } from './stage.js';
import { PINK, WHITE } from './hud.js';

export const BLUE = '#3D8BFF', CYAN = '#38D6FF', GREY_LINK = '#8E909C', BG = '#0B0C12', CARD = '#16181F';

export function makePhoneUI(HP, EV, img) {
  const { txt, rr, measure, roll } = HP, g = HP.g, P = HP.P;
  const W = 1080, H = 2160;
  const fillR = (x, y, w, h, r, col) => { rr(x, y, w, h, r); g.fillStyle = col; g.fill(); };
  function heart(x, y, r, col, o = {}) {
    g.save(); g.translate(P(x), P(y)); g.scale(P(r) / 10, P(r) / 10);
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 14; }
    g.beginPath(); g.moveTo(0, 9); g.bezierCurveTo(-13, 0, -10, -10, -5, -10); g.bezierCurveTo(-2, -10, 0, -8, 0, -5); g.bezierCurveTo(0, -8, 2, -10, 5, -10); g.bezierCurveTo(10, -10, 13, 0, 0, 9); g.closePath();
    if (o.stroke) { g.lineWidth = 2.2; g.strokeStyle = col; g.stroke(); } else { g.fillStyle = col; g.fill(); } g.restore();
  }
  function bubbleIcon(x, y, r, col) { g.save(); g.strokeStyle = col; g.lineWidth = P(6); g.beginPath(); g.arc(P(x), P(y), P(r), 0.9, Math.PI * 2 + 0.3); g.lineTo(P(x + r * 0.95), P(y + r * 1.05)); g.closePath(); g.stroke(); g.restore(); }
  function shareIcon(x, y, r, col) { g.save(); g.strokeStyle = col; g.lineWidth = P(6); g.lineJoin = 'round'; g.beginPath(); g.moveTo(P(x - r), P(y - r * 0.2)); g.lineTo(P(x + r), P(y - r)); g.lineTo(P(x + r * 0.2), P(y + r)); g.lineTo(P(x - r * 0.05), P(y + r * 0.1)); g.closePath(); g.stroke(); g.restore(); }
  // the app's own logo (You's account avatar: he hides behind his product)
  function logo(x, y, r) {
    g.save(); const gr = g.createLinearGradient(P(x - r), P(y - r), P(x + r), P(y + r)); gr.addColorStop(0, '#FF3D8B'); gr.addColorStop(1, '#6A3DFF');
    g.beginPath(); g.arc(P(x), P(y), P(r), 0, 7); g.fillStyle = gr; g.fill();
    g.fillStyle = WHITE; g.beginPath(); g.moveTo(P(x - r * 0.28), P(y - r * 0.4)); g.lineTo(P(x - r * 0.28), P(y + r * 0.4)); g.lineTo(P(x + r * 0.42), P(y)); g.closePath(); g.fill(); g.restore();
  }
  function theoAvatar(x, y, r) {
    g.save(); g.beginPath(); g.arc(P(x), P(y), P(r), 0, 7); g.clip();
    if (img.theo && img.theo.complete && img.theo.naturalWidth) g.drawImage(img.theo, P(x - r), P(y - r), P(2 * r), P(2 * r));
    else { g.fillStyle = '#2bb39a'; g.fillRect(P(x - r), P(y - r), P(2 * r), P(2 * r)); }
    g.restore(); g.save(); g.lineWidth = P(5); const gr = g.createLinearGradient(P(x - r), P(y + r), P(x + r), P(y - r)); gr.addColorStop(0, '#FFB23D'); gr.addColorStop(0.5, '#FF3D8B'); gr.addColorStop(1, '#A13DFF');
    g.strokeStyle = gr; g.beginPath(); g.arc(P(x), P(y), P(r + 6), 0, 7); g.stroke(); g.restore();
  }
  function plainAvatar(x, y, r, i) {
    const cols = ['#3a3f52', '#4a3a52', '#3a4a4a', '#52473a', '#3a4252', '#523a44'];
    g.save(); g.beginPath(); g.arc(P(x), P(y), P(r), 0, 7); g.fillStyle = cols[i % cols.length]; g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.arc(P(x), P(y - r * 0.18), P(r * 0.36), 0, 7); g.fill(); g.beginPath(); g.arc(P(x), P(y + r * 0.9), P(r * 0.64), Math.PI, 0); g.fill(); g.restore();
  }
  function status(time = '6:12', dark = true) {
    const c = dark ? WHITE : '#111';
    txt(time, 96, 62, 40, c, { align: 'left', w: 700 });
    for (let i = 0; i < 4; i++) fillR(820 + i * 16, 74 - 10 - i * 7, 10, 10 + i * 7, 2, c);
    rr(906, 46, 76, 34, 9); g.lineWidth = P(3); g.strokeStyle = c; g.stroke(); fillR(912, 52, 50, 22, 5, c);
    fillR(425, 26, 230, 64, 32, '#000');   // the camera pill
  }
  const corners = () => { g.save(); g.beginPath(); g.rect(0, 0, P(W), P(H)); g.roundRect(0, 0, P(W), P(H), P(92)); g.fillStyle = '#000'; g.fill('evenodd'); g.restore(); };

  // ------------------------------------------------------------ the 12-second clip of Reel Studio (inside a reel). ct = clip time 0..12
  function clip(x, y, w, h, ct) {
    g.save(); rr(x, y, w, h, 0); g.clip();
    const gr = g.createLinearGradient(0, P(y), 0, P(y + h)); gr.addColorStop(0, '#1b1036'); gr.addColorStop(0.6, '#2a1046'); gr.addColorStop(1, '#120a22');
    g.fillStyle = gr; g.fillRect(P(x), P(y), P(w), P(h));
    const s = w / 1080, X = (u) => x + u * s, Y = (v) => y + v * s;
    // the app window
    fillR(X(110), Y(250), 860 * s, 1300 * s, 46 * s, 'rgba(14,15,24,.94)');
    rr(X(110), Y(250), 860 * s, 1300 * s, 46 * s); g.lineWidth = P(3); g.strokeStyle = 'rgba(255,61,139,.55)'; g.stroke();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(P(X(160 + i * 40)), P(Y(300)), P(12 * s), 0, 7); g.fillStyle = ['#ff5f57', '#febc2e', '#28c840'][i]; g.fill(); }
    txt('REEL STUDIO', X(540), Y(300), 44 * s, WHITE, { w: 900, ls: 8 * s });
    // preview: a vertical frame that fills with the cut as clips land
    const n = Math.min(5, Math.floor(ct / 1.6) + 1), pc = ['#FF3D8B', '#38D6FF', '#FFB23D', '#9B6BFF', '#2FD27A'];
    const pv = { x: X(370), y: Y(380), w: 340 * s, h: 604 * s };
    const g2 = g.createLinearGradient(P(pv.x), P(pv.y), P(pv.x + pv.w), P(pv.y + pv.h)); g2.addColorStop(0, pc[(n - 1) % 5]); g2.addColorStop(1, '#1b1036');
    fillR(pv.x, pv.y, pv.w, pv.h, 22 * s, g2);
    const bob = Math.sin(ct * 4) * 12 * s;
    g.save(); g.globalAlpha = 0.9; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(P(pv.x + pv.w / 2), P(pv.y + pv.h * 0.42 + bob), P(70 * s), 0, 7); g.fill(); g.restore();
    fillR(pv.x + 40 * s, pv.y + pv.h - 120 * s, pv.w - 80 * s, 22 * s, 11 * s, 'rgba(255,255,255,.75)');
    fillR(pv.x + 40 * s, pv.y + pv.h - 84 * s, (pv.w - 80 * s) * 0.6, 22 * s, 11 * s, 'rgba(255,255,255,.45)');
    // timeline with clips snapping in
    fillR(X(150), Y(1040), 780 * s, 230 * s, 20 * s, 'rgba(255,255,255,.05)');
    for (let i = 0; i < 5; i++) { const t0 = i * 1.6, k = seg(ct, t0, t0 + 0.35); if (k <= 0) continue;
      const cw = [180, 120, 160, 140, 150][i] * s, cx = X(170) + [0, 190, 320, 490, 640][i] * s, dy = (1 - eout(k)) * -160 * s;
      g.save(); g.globalAlpha = Math.min(1, k * 2); fillR(cx, Y(1070) + dy, cw, 70 * s, 12 * s, pc[i]); fillR(cx, Y(1160) + dy * 0.6, cw * 0.8, 70 * s, 12 * s, pc[(i + 2) % 5] + '99'); g.restore(); }
    const ph = X(170) + (780 - 40) * s * ((ct % 12) / 12); fillR(ph - 3 * s, Y(1050), 6 * s, 210 * s, 3 * s, WHITE);
    // the one button
    const pul = 1 + 0.05 * Math.sin(ct * 6);
    g.save(); g.translate(P(X(540)), P(Y(1400))); g.scale(pul, pul); g.shadowColor = PINK; g.shadowBlur = P(40 * s);
    fillR(-260 * s, -62 * s, 520 * s, 124 * s, 62 * s, PINK); g.restore();
    txt('Make it a reel  ✦', X(540), Y(1402), 46 * s, WHITE, { w: 800 });
    // the cursor clicks it at 9.2 s; then EXPORTED ✓
    if (ct > 8.2) { const k = ss(seg(ct, 8.2, 9.1)), cx = lerp(X(860), X(600), k), cy = lerp(Y(1700), Y(1420), k);
      g.save(); g.fillStyle = WHITE; g.strokeStyle = '#000'; g.lineWidth = P(2); g.beginPath(); g.moveTo(P(cx), P(cy)); g.lineTo(P(cx), P(cy + 52 * s)); g.lineTo(P(cx + 15 * s), P(cy + 40 * s)); g.lineTo(P(cx + 27 * s), P(cy + 60 * s)); g.lineTo(P(cx + 36 * s), P(cy + 55 * s)); g.lineTo(P(cx + 24 * s), P(cy + 36 * s)); g.lineTo(P(cx + 42 * s), P(cy + 35 * s)); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    if (ct > 9.3) { const k = eout(seg(ct, 9.3, 9.6)); g.save(); g.globalAlpha = k; fillR(X(300), Y(1600) - 20 * s * (1 - k), 480 * s, 100 * s, 50 * s, '#2FD27A'); txt('EXPORTED  ✓', X(540), Y(1652) - 20 * s * (1 - k), 40 * s, '#06210f', { w: 900 }); g.restore(); }
    g.restore();
  }

  // ------------------------------------------------------------ IG reel chrome over a clip
  function reelChrome(t, o) {
    // right column
    const rx = 975;
    heart(rx, 1330, 34, o.liked ? PINK : WHITE, { stroke: !o.liked, glow: o.liked ? PINK : null });
    bubbleIcon(rx, 1480, 30, WHITE);
    shareIcon(rx, 1630, 30, WHITE);
    // bottom: account + caption
    const by = o.cta ? 1730 : 1840;
    if (o.who === 'theo') theoAvatar(110, by, 42); else logo(110, by, 42);
    txt(o.handle, 170, by - 2, 38, WHITE, { align: 'left', w: 800, stroke: 5 });
    const fw = measure(o.handle, 38, 800);
    rr(190 + fw, by - 26, 130, 52, 14); g.lineWidth = P(3); g.strokeStyle = WHITE; g.stroke(); txt('Follow', 255 + fw, by, 28, WHITE, { w: 700 });
    if (o.sponsored) txt('Sponsored', 170, by + 40, 26, 'rgba(247,245,242,.8)', { align: 'left', w: 600, stroke: 4 });
    txt(o.caption ?? 'Reel Studio: any clip → a reel, in one tap.', 70, by + (o.sponsored ? 92 : 76), 32, WHITE, { align: 'left', w: 600, stroke: 5 });
    if (o.cta) {   // the paid post's button: it works
      const pr = o.press ?? 0, sc = 1 - 0.04 * pr;
      g.save(); g.translate(P(540), P(1990)); g.scale(sc, sc); g.translate(-P(540), -P(1990));
      fillR(40, 1935, 1000, 110, 22, pr > 0.01 ? '#5aa2ff' : BLUE); txt('Get Reel Studio', 90, 1990, 40, WHITE, { align: 'left', w: 800 }); txt('↗', 990, 1990, 46, WHITE, { w: 800, align: 'right' });
      g.restore();
    }
    // progress bar
    fillR(0, 2148, 1080, 8, 0, 'rgba(255,255,255,.25)'); fillR(0, 2148, 1080 * ((o.ct ?? 0) / 12), 8, 0, WHITE);
  }
  function views10M(x, y, size, col = WHITE) { txt('▶ 10M', x, y, size, col, { align: 'left', w: 800, stroke: 5 }); }

  // ------------------------------------------------------------ screens
  const S = {};
  S.insights = (t) => {
    status();
    txt('‹', 70, 190, 80, WHITE, { w: 400 }); txt('Reel insights', 540, 190, 46, WHITE, { w: 800 });
    g.save(); rr(70, 280, 300, 534, 24); g.clip(); clip(70, 280, 300, 534, (t * 1.0) % 12); g.restore();
    txt('Reel Studio · 0:12', 410, 330, 40, WHITE, { align: 'left', w: 800 }); txt('Posted yesterday, 11:48 PM', 410, 388, 30, 'rgba(247,245,242,.55)', { align: 'left', w: 500 });
    fillR(410, 440, 250, 60, 30, 'rgba(255,61,139,.18)'); txt('🔥 Trending', 535, 471, 30, PINK, { w: 800 });
    txt('VIEWS', 540, 960, 44, 'rgba(247,245,242,.6)', { w: 800, ls: 10 });
    const k = seg(t, 0.9, EV.viewsSlam), v = k >= 1 ? 10000000 : Math.round(lerp(9412408, 10000000, Math.pow(k, 0.45)) / 7) * 7;
    const hot = k >= 1, j = hot ? Math.exp(-(t - EV.viewsSlam) * 8) : 0;
    g.save(); g.translate(P(540), P(1110)); g.scale(1 + 0.12 * j, 1 + 0.12 * j);
    txt(v.toLocaleString('en-US'), 0, 0, 150, hot ? PINK : WHITE, { w: 800, mono: true, glow: hot ? PINK : null, glowR: 40 }); g.restore();
    // the curve: flat, then straight up
    g.save(); g.beginPath(); const x0 = 90, x1 = 990, y0 = 1640, y1 = 1260, N = 60, kk = clamp(0.35 + t / 3);
    for (let i = 0; i <= N; i++) { const u = i / N; if (u > kk) break; const yy = y0 - (y0 - y1) * Math.pow(Math.max(0, (u - 0.5) / 0.5), 2.4); i ? g.lineTo(P(lerp(x0, x1, u)), P(yy)) : g.moveTo(P(lerp(x0, x1, u)), P(yy)); }
    g.lineWidth = P(9); g.strokeStyle = PINK; g.shadowColor = PINK; g.shadowBlur = P(24); g.stroke(); g.restore();
    fillR(x0, y0 + 8, x1 - x0, 3, 0, 'rgba(255,255,255,.14)');
  };
  S.player = (t, o = {}) => {
    const ct = o.ct ?? (t % 12);
    clip(0, 0, 1080, 2160, ct);
    const gr = g.createLinearGradient(0, P(1500), 0, P(2160)); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = gr; g.fillRect(0, P(1500), P(1080), P(660));
    status('6:13');
    txt('Reels', 80, 170, 52, WHITE, { align: 'left', w: 800, stroke: 4 });
    views10M(80, 250, 40);
    reelChrome(t, { ct, handle: o.handle ?? 'you.builds', who: o.who, sponsored: o.sponsored, cta: o.cta, press: o.press, caption: o.caption, liked: o.liked });
  };
  S.rule1 = (t, o = {}) => {
    status('6:14');
    txt('One reel. Every start = 1 view.', 540, 200, 40, 'rgba(247,245,242,.7)', { w: 700 });
    // the reel tile in the middle; it (re)starts at each event
    const starts = [...EV.plays, ...EV.replay], cur = starts.filter(s => t >= s), n = cur.length, last = cur[cur.length - 1] ?? -9, ct = n ? (t - last) * 3.2 : 0;
    g.save(); rr(240, 300, 600, 1066, 36); g.clip(); clip(240, 300, 600, 1066, ct % 12);
    const fl = n ? Math.exp(-(t - last) * 7) : 0; g.fillStyle = `rgba(255,255,255,${0.5 * fl})`; g.fillRect(P(240), P(300), P(600), P(1066)); g.restore();
    rr(240, 300, 600, 1066, 36); g.lineWidth = P(4); g.strokeStyle = 'rgba(255,255,255,.2)'; g.stroke();
    fillR(240, 1356, 600 * clamp(ct / 12), 10, 5, WHITE);
    // a big ▶ (start) or ↻ (replay) at each start
    if (n) { const k = seg(t, last, last + 0.5), isRe = last >= EV.replay[0] - 1e-3;
      g.save(); g.globalAlpha = 1 - ss(seg(k, 0.5, 1)); g.translate(P(540), P(833)); g.scale(0.7 + 0.5 * eout(k), 0.7 + 0.5 * eout(k));
      g.beginPath(); g.arc(0, 0, P(110), 0, 7); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill();
      if (isRe) { g.strokeStyle = WHITE; g.lineWidth = P(16); g.beginPath(); g.arc(0, 0, P(58), -2.6, 1.9); g.stroke(); g.fillStyle = WHITE; g.beginPath(); g.moveTo(P(40), P(70)); g.lineTo(P(-8), P(56)); g.lineTo(P(36), P(26)); g.fill(); }
      else { g.fillStyle = WHITE; g.beginPath(); g.moveTo(P(-34), P(-56)); g.lineTo(P(-34), P(56)); g.lineTo(P(60), 0); g.closePath(); g.fill(); }
      g.restore(); }
    txt('VIEWS', 540, 1520, 44, 'rgba(247,245,242,.6)', { w: 800, ls: 10 });
    const j = n ? Math.exp(-(t - last) * 9) : 0;
    g.save(); g.translate(P(540), P(1700)); g.scale(1 + 0.25 * j, 1 + 0.25 * j); txt(String(n), 0, 0, 240, j > 0.4 ? PINK : WHITE, { w: 800, mono: true, glow: j > 0.2 ? PINK : null, glowR: 40 }); g.restore();
    if (n) { const k = seg(t, last, last + 0.7); txt('+1', 780, 1640 - 120 * eout(k), 80, PINK, { w: 900, alpha: 1 - ss(seg(k, 0.6, 1)), glow: PINK }); }
    txt('people: ?', 540, 1900, 40, 'rgba(247,245,242,.45)', { w: 600, mono: true });
  };
  S.post = (t, o = {}) => {
    status('6:15');
    txt('‹', 70, 190, 80, WHITE, { w: 400 }); txt('Post', 540, 190, 46, WHITE, { w: 800 });
    logo(110, 330, 46); txt('you.builds', 180, 330, 40, WHITE, { align: 'left', w: 800 });
    g.save(); rr(0, 410, 1080, 900, 0); g.clip(); clip(0, 410, 1080, 1920, (t * 0.8) % 12); g.restore();
    heart(90, 1395, 34, PINK); bubbleIcon(200, 1395, 30, WHITE); shareIcon(310, 1395, 30, WHITE);
        txt('you.builds', 60, 1560, 38, WHITE, { align: 'left', w: 800 }); txt('Reel Studio: any clip → a reel,', 270, 1560, 38, WHITE, { align: 'left', w: 500 });
    txt('in one tap. Get it here:', 60, 1620, 38, WHITE, { align: 'left', w: 500 });
    // the link: grey, plain text. Taps do nothing
    const lx = 470, ly = 1620; txt('reelstudio.app', lx, ly, 38, GREY_LINK, { align: 'left', w: 500 });
    for (const tp of [EV.tap1, EV.tap2]) if (t >= tp && t < tp + 0.6) { const k = seg(t, tp, tp + 0.6);
      g.save(); g.globalAlpha = 0.5 * (1 - k); g.beginPath(); g.arc(P(lx + 130), P(ly), P(30 + 70 * eout(k)), 0, 7); g.fillStyle = 'rgba(200,200,210,.5)'; g.fill(); g.restore();
      g.save(); g.globalAlpha = 0.85 * Math.min(1, (1 - k) * 2); g.beginPath(); g.arc(P(lx + 130), P(ly + 6 * Math.exp(-(t - tp) * 20)), P(44), 0, 7); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill(); g.restore(); }
    if (o.ring > 0) { g.save(); g.globalAlpha = Math.min(1, o.ring * 2); g.strokeStyle = PINK; g.lineWidth = P(9); g.shadowColor = PINK; g.shadowBlur = P(18); g.beginPath(); g.ellipse(P(lx + 130), P(ly), P(175 + 40 * (1 - eout(o.ring))), P(52 + 14 * (1 - eout(o.ring))), -0.04, 0, Math.PI * 2 * eout(o.ring)); g.stroke(); g.restore(); }
    txt('View all comments', 60, 1700, 34, 'rgba(247,245,242,.5)', { align: 'left', w: 500 });
    txt('link??', 60, 1770, 36, WHITE, { align: 'left', w: 500 }); txt('where is the link', 60, 1830, 36, WHITE, { align: 'left', w: 500 });
  };
  // the comment wall: one long fixed list; the scroll offset is a function of t
  const NAMES = ['jen.makes', 'marco_builds', 'dana.r', 'tobi.edits', 'lisa.m', 'kevinvlogs', 'sam_creates', 'ayo.studio', 'mara.designs', 'pj.films', 'nina.k', 'rob.shoots', 'lea.posts', 'omar.cuts', 'ivy.reels', 'chris_dt', 'zoe.motion', 'ben.ugc', 'hana.vid', 'leo.b'];
  const TEXTS = ['link??', 'link??', 'where is the link??', 'link pls', 'LINK???', 'how do I get this', 'link??', 'what app is this', 'link in bio?', 'link??', 'need this', 'drop the link', 'link??', 'where do I download', 'link?'];
  const ROWS = Array.from({ length: 60 }, (_, i) => ({ n: NAMES[i % NAMES.length], c: TEXTS[(i * 7 + 3) % TEXTS.length], ago: `${1 + (i * 3) % 9}m`, lk: (i * 37) % 90 }));
  const PRICE_ROW = 19; ROWS[PRICE_ROW] = { n: 'mara.designs', c: 'price?', ago: '2m', lk: 0 };
  ROWS[0].c = 'link??'; ROWS[1].c = 'link??'; ROWS[2].c = 'where is the link??';
  const ROW_H = 170;
  function commentRow(r, y, i, o = {}) {
    plainAvatar(110, y + 54, 46, i);
    txt(r.n, 185, y + 26, 32, 'rgba(247,245,242,.7)', { align: 'left', w: 700 }); txt(r.ago, 200 + measure(r.n, 32, 700), y + 26, 30, 'rgba(247,245,242,.4)', { align: 'left', w: 500 });
    txt(r.c, 185, y + 80, 42, WHITE, { align: 'left', w: 500 });
    heart(990, y + 54, 20, 'rgba(247,245,242,.6)', { stroke: true });
    txt('Reply', 185, y + 134, 28, 'rgba(247,245,242,.45)', { align: 'left', w: 700 });
  }
  function sheetHeader(count) {
    fillR(0, 120, 1080, 2040, 48, '#14151c'); fillR(470, 146, 140, 12, 6, 'rgba(255,255,255,.3)');
    txt('Comments', 540, 230, 44, WHITE, { w: 800 }); if (count) txt(count, 540, 290, 30, 'rgba(247,245,242,.5)', { w: 600 });
  }
  // rows visible from i0, starting at y = 340 − scroll
  function commentList(scroll, n0, o = {}) {
    g.save(); g.beginPath(); g.rect(0, P(330), P(1080), P(1640)); g.clip();
    const first = Math.max(0, Math.floor(scroll / ROW_H) - 1);
    for (let i = first; i < Math.min(ROWS.length, first + 13); i++) { const y = 340 + i * ROW_H - scroll; if (i < n0) continue; commentRow(ROWS[i], y, i, o); }
    g.restore();
  }
  S.comments = (t, o = {}) => {
    status('6:16'); const [a, b] = EV.commentRun;
    // the sheet slides up, then new comments push in from the top faster and faster; then the thumb flicks the list
    const up = eout(seg(t, a - 0.25, a + 0.15));
    g.save(); g.translate(0, P(1800 * (1 - up)));
    sheetHeader('');
    // before the flick: rows arrive one by one at the top (pile up); after: the list flies by
    let scroll;   // before the flick 8 new comments push in at the top; after it the list runs at ~11 rows/s ("price?" passes in ~1 s)
    if (t < EV.flick) { const k = seg(t, a, EV.flick), arrivals = Math.pow(k, 1.5) * 8; scroll = (8 - arrivals) * ROW_H; }
    else { const k = t - EV.flick, kc = Math.min(k, 1.9); scroll = 1880 * kc + (k > 1.9 ? 1880 * (1 - Math.exp(-(k - 1.9) * 2.5)) / 2.5 : 0); }
    commentList(scroll, 0);
    // input bar
    fillR(0, 1970, 1080, 190, 0, '#14151c'); logo(100, 2050, 40); fillR(170, 2010, 860, 80, 40, '#1e2029'); txt('Add a comment…', 210, 2051, 34, 'rgba(247,245,242,.4)', { align: 'left', w: 500 });
    g.restore();
    // (the thumb itself is a 3D object in main.js)
  };
  S.flood = (t, o = {}) => {   // v3: comments push in at the top; one says "price?" (o.ring rings it), it scrolls on
    status('6:16'); sheetHeader('');
    const A = o.arrivals, n = A.filter(a => t >= a).length;
    g.save(); g.beginPath(); g.rect(0, P(330), P(1080), P(1640)); g.clip();
    for (let i = 0; i < n; i++) {   // newest on top; each arrival pushes the rest down (eased)
      let below = 0; for (let j = i + 1; j < n; j++) below += eout(seg(t, A[j], A[j] + 0.14));
      const k = eout(seg(t, A[i], A[i] + 0.14)), y = 340 + below * ROW_H - ROW_H * (1 - k);
      const r = o.rows[i]; g.save(); g.globalAlpha = k; commentRow(r, y, i + 3); g.restore();
      if (r.c === 'price?' && o.ring > 0) { g.save(); g.globalAlpha = Math.min(1, o.ring * 2); g.strokeStyle = PINK; g.lineWidth = P(9); g.shadowColor = PINK; g.shadowBlur = P(18);
        g.beginPath(); g.ellipse(P(300), P(y + 80), P(170), P(62), 0, 0, Math.PI * 2 * eout(o.ring)); g.stroke(); g.restore(); }
    }
    g.restore();
    fillR(0, 1970, 1080, 190, 0, '#14151c'); logo(100, 2050, 40); fillR(170, 2010, 860, 80, 40, '#1e2029'); txt('Add a comment…', 210, 2051, 34, 'rgba(247,245,242,.4)', { align: 'left', w: 500 });
  };
  S.clicks = (t, o = {}) => {   // v3: the link in bio, its clicks (story numbers 4 · 11 · 26 · 41)
    status('6:19'); txt('‹', 70, 190, 80, WHITE, { w: 400 }); txt('Link in bio', 540, 190, 46, WHITE, { w: 800 });
    txt('🔗 reelstudio.app', 540, 380, 44, BLUE, { w: 800 });
    txt('LINK CLICKS', 540, 640, 46, 'rgba(247,245,242,.6)', { w: 800, ls: 10 });
    const n = o.n ?? 0, j = o.j ?? 0;
    g.save(); g.translate(P(540), P(900)); g.scale(1 + 0.18 * j, 1 + 0.18 * j); txt(String(n), 0, 0, 330, j > 0.3 ? PINK : WHITE, { w: 800, mono: true, glow: j > 0.15 ? PINK : null, glowR: 50 }); g.restore();
    const H0 = [8, 5, 9, 6, 7, 5];
    for (let i = 0; i < 7; i++) { const h = i === 6 ? 14 + n * 4 : H0[i]; fillR(150 + i * 115, 1560 - h, 70, h, 8, i === 6 ? PINK : 'rgba(247,245,242,.25)'); }
    fillR(120, 1568, 840, 3, 0, 'rgba(255,255,255,.15)');
    txt('today', 875, 1620, 30, 'rgba(247,245,242,.5)', { w: 600 });
  };
  S.climb = (t, o = {}) => {   // v3: the counter is still climbing (no new figure: 10M and up)
    status('6:29'); txt('‹', 70, 190, 80, WHITE, { w: 400 }); txt('Reel insights', 540, 190, 46, WHITE, { w: 800 });
    txt('VIEWS', 540, 620, 44, 'rgba(247,245,242,.6)', { w: 800, ls: 10 });
    const bump = 0.5 + 0.5 * Math.sin(t * 9);
    txt('10M', 470, 830, 260, WHITE, { w: 800, glow: PINK, glowR: 30 }); txt('▲', 830, 800 - 20 * bump, 110, PINK, { w: 900, glow: PINK, glowR: 30 });
    txt('and climbing', 540, 1000, 48, PINK, { w: 700 });
    g.save(); g.beginPath(); const x0 = 90, x1 = 990, y0 = 1700, y1 = 1150, N = 80, kk = clamp(0.6 + (o.k ?? 0) * 0.4);
    for (let i = 0; i <= N; i++) { const u = i / N; if (u > kk) break; const yy = y0 - (y0 - y1) * Math.pow(Math.max(0, (u - 0.35) / 0.65), 1.8); i ? g.lineTo(P(lerp(x0, x1, u)), P(yy)) : g.moveTo(P(lerp(x0, x1, u)), P(yy)); }
    g.lineWidth = P(10); g.strokeStyle = PINK; g.shadowColor = PINK; g.shadowBlur = P(28); g.stroke(); g.restore();
    fillR(x0, y0 + 8, x1 - x0, 3, 0, 'rgba(255,255,255,.14)');
  };
  S.priceRowY = (t) => 340 + PRICE_ROW * ROW_H;   // for checks
  S.profile = (t) => {
    status('6:18');
    txt('you.builds', 540, 190, 46, WHITE, { w: 800 });
    logo(190, 400, 120);
    txt('you.builds', 360, 380, 50, WHITE, { align: 'left', w: 800 }); txt('Solo developer', 360, 440, 30, 'rgba(247,245,242,.6)', { align: 'left', w: 500 });
    txt('Reel Studio', 70, 600, 40, WHITE, { align: 'left', w: 800 });
    txt('Any clip → a reel, in one tap.', 70, 660, 36, 'rgba(247,245,242,.85)', { align: 'left', w: 500 });
    txt('Built alone, at night.', 70, 715, 36, 'rgba(247,245,242,.85)', { align: 'left', w: 500 });
    // the link flies from the caption (below) into the bio, and turns blue
    const [fa, fb] = EV.bioFly, k = seg(t, fa, fb), e = sio(k);
    const lx = lerp(560, 70, e), ly = lerp(1650, 780, e) - Math.sin(Math.PI * k) * 120;
    if (t >= fa - 0.4) { g.save(); const col = k >= 1 ? BLUE : GREY_LINK; txt('🔗 reelstudio.app', lx, ly, 38 + 4 * Math.sin(Math.PI * k), col, { align: 'left', w: 800, glow: k >= 1 ? BLUE : null, glowR: 20 * Math.exp(-(t - fb) * 3) }); g.restore(); }
    fillR(70, 830, 450, 84, 18, '#1e2029'); txt('Edit profile', 295, 872, 34, WHITE, { w: 700 }); fillR(540, 830, 450, 84, 18, '#1e2029'); txt('Share profile', 765, 872, 34, WHITE, { w: 700 });
    // the grid: the viral reel first, with a "link in bio" sticker
    for (let i = 0; i < 6; i++) { const x = (i % 3) * 362, y = 960 + Math.floor(i / 3) * 640;
      g.save(); rr(x, y, 356, 634, 0); g.clip(); clip(x, y, 356, 634, (i * 2.7 + (i === 0 ? t : 0)) % 12); g.fillStyle = i ? 'rgba(11,12,18,.45)' : 'rgba(0,0,0,0)'; g.fillRect(P(x), P(y), P(356), P(634)); g.restore();
      if (i === 0) txt('▶ 10M', x + 20, y + 600, 32, WHITE, { align: 'left', w: 800, stroke: 4 }); }
    if (t > fb - 0.1) { const k2 = seg(t, fb - 0.1, fb + 0.15), s = k2 < 1 ? lerp(1.8, 1, eout(k2)) : 1;
      g.save(); g.translate(P(180), P(1100)); g.scale(s, s); g.rotate(-0.08); fillR(-150, -40, 300, 80, 16, WHITE); txt('link in bio 👆', 0, 2, 32, '#111', { w: 800 }); g.restore(); }
  };
  S.theo = (t, o = {}) => {
    const ct = o.ct ?? (t % 12);
    clip(0, 0, 1080, 2160, ct);
    const gr = g.createLinearGradient(0, P(1400), 0, P(2160)); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = gr; g.fillRect(0, P(1400), P(1080), P(760));
    status('6:21');
    txt('Reels', 80, 170, 52, WHITE, { align: 'left', w: 800, stroke: 4 });
    const press = t >= EV.theoTap ? Math.exp(-(t - EV.theoTap) * 9) : 0;
    reelChrome(t, { ct, handle: 'theo.ships', who: 'theo', sponsored: true, cta: true, press, caption: 'Found the app everyone’s asking about 👇' });
    if (t >= EV.theoTap && t < EV.theoTap + 0.5) { const k = seg(t, EV.theoTap, EV.theoTap + 0.5); g.save(); g.globalAlpha = 0.6 * (1 - k); g.beginPath(); g.arc(P(760), P(1990), P(40 + 160 * eout(k)), 0, 7); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill(); g.restore(); }
    // the checkout sheet: the link works
    const sk = eout(seg(t, EV.checkout, EV.checkout + 0.3));
    if (sk > 0) { g.save(); g.translate(0, P(1100 * (1 - sk)));
      fillR(0, 1130, 1080, 1100, 48, '#F7F5F2'); fillR(470, 1156, 140, 12, 6, 'rgba(0,0,0,.2)');
      logo(150, 1290, 64); txt('Reel Studio Pro', 250, 1268, 46, '#111', { align: 'left', w: 800 }); txt('by theo.ships', 250, 1322, 32, '#666', { align: 'left', w: 500 });
      txt('Checkout', 70, 1490, 96, '#111', { align: 'left', w: 900 });
      fillR(70, 1640, 940, 130, 30, BLUE); txt('Buy now', 540, 1706, 50, WHITE, { w: 800 });
      txt('✓ secure checkout', 540, 1840, 32, '#2a9d5c', { w: 700 });
      g.restore(); }
  };
  S.theoComments = (t) => {
    status('6:22'); sheetHeader('2,914 comments · theo.ships replied to all');
    const items = [['link??', 'Tap the blue button above ↗'], ['where is the link??', 'Sent it to your DMs! 🙌'], ['how much?', '$12/mo, cancel anytime 👍']];
    let y = 350;
    items.forEach(([q, a], i) => {
      commentRow({ n: NAMES[i * 3], c: q, ago: `${2 + i}m`, lk: 12 + i * 7 }, y, i);
      const k = seg(t, EV.replies[i], EV.replies[i] + 0.22);
      if (k > 0) { g.save(); g.globalAlpha = Math.min(1, k * 2.5); const s = lerp(0.85, 1, eout(k)); g.translate(P(200), P(y + 250)); g.scale(s, s); g.translate(-P(200), -P(y + 250));
        theoAvatar(240, y + 230, 34); txt('theo.ships', 295, y + 205, 30, WHITE, { align: 'left', w: 800 }); txt('✓ Author', 455, y + 205, 26, BLUE, { align: 'left', w: 700 });
        txt(a, 295, y + 256, 38, WHITE, { align: 'left', w: 500 });
        g.restore(); }
      y += 330;
    });
  };
  S.compose = (t) => {
    status('6:30'); txt('you.builds', 540, 190, 46, WHITE, { w: 800 }); logo(190, 400, 120);
    txt('Day 1 · the wave is still up', 540, 640, 36, 'rgba(247,245,242,.6)', { w: 600 });
    const pul = 1 + 0.06 * Math.sin(t * 7), k = eout(seg(t, EV.newReel - 0.2, EV.newReel + 0.1));
    g.save(); g.translate(P(540), P(1000)); g.scale(pul * lerp(0.6, 1, k), pul * lerp(0.6, 1, k)); g.globalAlpha = k; g.shadowColor = PINK; g.shadowBlur = P(60);
    fillR(-380, -110, 760, 220, 110, PINK); g.restore();
    txt('＋  New reel', 540, 1004, 70, WHITE, { w: 900, alpha: k });
    txt('A follow-up? Ride the wave.', 540, 1220, 44, WHITE, { w: 700, alpha: k });
    for (let i = 0; i < 3; i++) { const x = i * 362; g.save(); rr(x, 1400, 356, 634, 0); g.clip(); clip(x, 1400, 356, 634, (i * 3.1 + t) % 12); g.fillStyle = 'rgba(11,12,18,.5)'; g.fillRect(P(x), P(1400), P(356), P(634)); g.restore(); }
  };
  S.reply = (t) => {
    status('6:31'); sheetHeader('');
    commentRow({ n: 'jen.makes', c: 'link??', ago: '9m', lk: 41 }, 350, 0);
    commentRow({ n: 'marco_builds', c: 'how do I get this', ago: '9m', lk: 12 }, 520, 1);
    // the reply being typed under the first one
    const msg = 'It’s at reelstudio.app 🙏 ask me anything', k = seg(t, EV.reply, EV.sent - 0.25), n = Math.floor(msg.length * k);
    fillR(0, 1940, 1080, 220, 0, '#14151c'); logo(100, 2040, 40); fillR(170, 1990, 760, 100, 50, '#1e2029');
    txt('@jen.makes ' + msg.slice(0, n), 210, 2042, 30, WHITE, { align: 'left', w: 500 });
    if (Math.floor(t * 3) % 2 === 0 && t < EV.sent) fillR(210 + measure('@jen.makes ' + msg.slice(0, n), 30, 500) + 4, 2018, 4, 48, 2, BLUE);
    const sent = t >= EV.sent; g.beginPath(); g.arc(P(990), P(2040), P(44), 0, 7); g.fillStyle = sent ? '#2FD27A' : BLUE; g.fill(); txt(sent ? '✓' : '↑', 990, 2042, 44, WHITE, { w: 900 });
    if (sent) { const k2 = eout(seg(t, EV.sent, EV.sent + 0.25)); g.save(); g.globalAlpha = k2;
      logo(240, 760, 32); txt('you.builds', 290, 738, 30, WHITE, { align: 'left', w: 800 }); txt('It’s at reelstudio.app 🙏', 290, 788, 36, WHITE, { align: 'left', w: 500 }); g.restore();
      txt('answered ✓  next…', 540, 1800, 40, 'rgba(56,214,255,.9)', { w: 800, alpha: k2 }); }
  };
  // the desk phone at the start: a lock screen, notifications stacking
  S.lock = (t) => {   // lock screen; notifications slide in one by one and push the stack down (eased, no jumps)
    const gr = g.createLinearGradient(0, 0, 0, P(H)); gr.addColorStop(0, '#1a1840'); gr.addColorStop(1, '#3a1a4a'); g.fillStyle = gr; g.fillRect(0, 0, P(W), P(H));
    txt('6:12', 540, 380, 260, WHITE, { w: 300 }); txt('Tuesday, 3 November', 540, 560, 50, 'rgba(247,245,242,.8)', { w: 600 });
    const T0 = (i) => 0.05 + i * 0.17, MSG = ['Your reel is taking off', 'People are sharing your reel', 'Your reel is trending 🔥', 'New comments on your reel', 'Your reel is going viral', 'Your reel hit 10M views 🔥'];
    for (let i = 0; i < 6; i++) { if (t < T0(i)) continue; const k = eout(seg(t, T0(i), T0(i) + 0.16));
      let below = 0; for (let j = i + 1; j < 6; j++) below += eout(seg(t, T0(j), T0(j) + 0.16));
      const y = 700 + below * 230 - 60 * (1 - k);
      g.save(); g.globalAlpha = k; fillR(60, y, 960, 200, 40, 'rgba(247,245,242,.92)'); logo(140, y + 100, 44);
      txt('Instagram · now', 210, y + 64, 32, '#555', { align: 'left', w: 700 }); txt(MSG[i], 210, y + 128, 42, '#111', { align: 'left', w: 800 }); g.restore(); }
  };
  return { S, draw(mode, t, o) { g.fillStyle = BG; g.fillRect(0, 0, P(W), P(H)); (S[mode] ?? S.insights)(t, o ?? {}); corners(); } };
}
