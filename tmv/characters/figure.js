// figure.js: draws one character from its parameters (characters/cast.js) on a 2D canvas. Used by the episode
// engine (episode/engine.js) and character-designer.html, so the designer shows exactly what the episode draws.
//   TMV_FIGURE(g, c, { x, y, s, t, talk, look, rim: [leftColor, rightColor] })
// x, y = the point between the feet; s = scale (1 = about 820 px tall); t = seconds (blink, breathing);
// talk = 0..1 mouth open; look = -1..1 head turn; rim = the two neon lights behind (ST-79), drawn as an edge glow.
(function () {
  const BUILD = { average: [1, 1], tall: [1.12, 0.92], small: [0.72, 1.05], round: [0.95, 1.25] };
  const shade = (hex, k) => {
    const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : /^#[0-9a-f]{3}$/i.test(hex) ? '#' + [...hex.slice(1)].map(x => x + x).join('') : '#808080', n = parseInt(h.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  function body(g, c, o, sil) {
    const [hk, wk] = BUILD[c.build] || BUILD.average, bot = c.kind === 'bot';
    const col = v => sil || v;
    const H = 820 * hk, legH = H * 0.36, torsoH = H * 0.34, headR = (bot ? 118 : 104) * (hk > 1 ? 1 : Math.max(0.9, hk + 0.2));
    const tw = 230 * wk, breathe = Math.sin(o.t * 2.1) * 4, sway = Math.sin(o.t * 1.3) * 3;
    const hipY = -legH, shY = hipY - torsoH + breathe, headY = shY - headR * 0.92;
    // legs
    g.fillStyle = col(c.legs);
    rr(g, -tw * 0.36, hipY - 10, tw * 0.3, legH + 10, 24); g.fill();
    rr(g, tw * 0.06, hipY - 10, tw * 0.3, legH + 10, 24); g.fill();
    g.fillStyle = col('#111318'); rr(g, -tw * 0.42, -26, tw * 0.38, 30, 14); g.fill(); rr(g, tw * 0.04, -26, tw * 0.38, 30, 14); g.fill();
    // arms (swing a little while talking)
    const sw = (o.talk || 0) * 10 + sway;
    g.fillStyle = col(shade(c.topColor, 0.82));
    g.save(); g.translate(-tw * 0.5, shY + 30); g.rotate((8 + sw) * Math.PI / 180); rr(g, -30, 0, 60, torsoH * 0.95, 30); g.fill();
    g.fillStyle = col(c.skin); g.beginPath(); g.arc(0, torsoH * 0.98, 30, 0, 7); g.fill(); g.restore();
    g.fillStyle = col(shade(c.topColor, 0.82));
    g.save(); g.translate(tw * 0.5, shY + 30); g.rotate((-8 - sw * 0.6) * Math.PI / 180); rr(g, -30, 0, 60, torsoH * 0.95, 30); g.fill();
    g.fillStyle = col(c.skin); g.beginPath(); g.arc(0, torsoH * 0.98, 30, 0, 7); g.fill(); g.restore();
    // torso
    g.fillStyle = col(c.topColor); rr(g, -tw / 2, shY, tw, torsoH + 20, [70, 70, 30, 30]); g.fill();
    if (!sil) {
      g.strokeStyle = shade(c.topColor, 0.6); g.lineWidth = 6; g.lineCap = 'round';
      if (c.top === 'hoodie') { g.beginPath(); g.ellipse(0, shY + 8, tw * 0.3, 26, 0, 0, Math.PI); g.stroke(); rr(g, -tw * 0.22, shY + torsoH * 0.55, tw * 0.44, torsoH * 0.28, 16); g.stroke();
        g.beginPath(); g.moveTo(-14, shY + 30); g.lineTo(-18, shY + 80); g.moveTo(14, shY + 30); g.lineTo(18, shY + 80); g.stroke(); }
      if (c.top === 'jacket') { g.fillStyle = '#E9E4DA'; g.beginPath(); g.moveTo(-34, shY + 4); g.lineTo(0, shY + 90); g.lineTo(34, shY + 4); g.fill();
        g.beginPath(); g.moveTo(-36, shY + 2); g.lineTo(-6, torsoH + shY + 18); g.moveTo(36, shY + 2); g.lineTo(6, torsoH + shY + 18); g.stroke(); }
      if (c.top === 'vest') { g.fillStyle = shade(c.topColor, 0.75);
        for (const [px, py] of [[-0.36, 0.25], [0.08, 0.25], [-0.36, 0.58], [0.08, 0.58]]) { rr(g, tw * px, shY + torsoH * py, tw * 0.28, torsoH * 0.22, 10); g.fill(); g.stroke(); } }
      if (c.top === 'tee') { g.beginPath(); g.arc(0, shY + 4, 34, 0.1, Math.PI - 0.1); g.stroke(); }
      if (c.extra === 'scarf') { g.fillStyle = '#E2457A'; rr(g, -tw * 0.32, shY - 14, tw * 0.64, 40, 20); g.fill(); rr(g, tw * 0.08, shY + 10, 38, 120, 14); g.fill(); }
    }
    // head
    const lk = (o.look || 0) * 18;
    g.save(); g.translate(lk * 0.4, headY);
    if (bot) {
      g.fillStyle = col(c.skin); rr(g, -headR * 1.1, -headR * 0.9, headR * 2.2, headR * 1.8, 44); g.fill();
      if (!sil) { g.fillStyle = '#141826'; rr(g, -headR * 0.9, -headR * 0.66, headR * 1.8, headR * 1.3, 30); g.fill(); }
    } else {
      g.fillStyle = col(c.skin); g.beginPath(); g.ellipse(0, 0, headR * 0.94, headR, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(-headR * 0.92, 8, 16, 24, 0, 0, 7); g.ellipse(headR * 0.92, 8, 16, 24, 0, 0, 7); g.fill();
    }
    hair(g, c, headR, col);
    if (!sil) face(g, c, o, headR, lk, bot);
    extra(g, c, headR, col, sil, bot);
    g.restore();
  }

  function hair(g, c, R, col) {
    if (c.kind === 'bot' || c.hair === 'none') return;
    g.fillStyle = col(c.hairColor); g.beginPath();
    if (c.hair === 'short') { g.ellipse(0, -R * 0.42, R * 0.98, R * 0.62, 0, Math.PI, 0); g.fill(); }
    if (c.hair === 'bun') { g.ellipse(0, -R * 0.42, R * 0.98, R * 0.62, 0, Math.PI, 0); g.fill(); g.beginPath(); g.arc(0, -R * 1.08, R * 0.38, 0, 7); g.fill(); }
    if (c.hair === 'long') { g.ellipse(0, -R * 0.36, R * 1.02, R * 0.7, 0, Math.PI, 0); g.fill(); rr(g, -R * 1.04, -R * 0.4, R * 0.34, R * 1.5, 30); g.fill(); rr(g, R * 0.7, -R * 0.4, R * 0.34, R * 1.5, 30); g.fill(); }
    if (c.hair === 'curly') { for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; g.beginPath(); g.arc(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82 - R * 0.12, R * 0.32, 0, 7); g.fill(); } }
    if (c.hair === 'spiky') { g.moveTo(-R, -R * 0.2); for (let i = 0; i <= 6; i++) { const x = -R + i * R / 3; g.lineTo(x - R / 6, -R * (i % 2 ? 1.0 : 1.42)); } g.lineTo(R, -R * 0.2); g.closePath(); g.fill(); }
  }

  function face(g, c, o, R, lk, bot) {
    const blink = ((o.t * 0.37 + (c.name || '').length * 0.13) % 1) > 0.965, ey = bot ? -R * 0.12 : -R * 0.02, ex = R * 0.36;
    if (c.eyes === 'visor' || bot) {
      g.fillStyle = '#7CF3FF'; const h = blink ? 4 : (c.eyes === 'wide' ? 34 : 24);
      rr(g, -ex - 22 + lk, ey - h / 2, 44, h, 10); g.fill(); rr(g, ex - 22 + lk, ey - h / 2, 44, h, 10); g.fill();
    } else {
      g.fillStyle = '#15120F';
      for (const sx of [-ex, ex]) {
        if (blink || c.eyes === 'sleepy') { g.fillRect(sx - 14 + lk, ey - 2, 28, blink ? 4 : 7); continue; }
        const r = c.eyes === 'wide' ? 15 : 10; g.beginPath(); g.arc(sx + lk, ey, r, 0, 7); g.fill();
        if (c.eyes === 'wide') { g.fillStyle = '#FFF'; g.beginPath(); g.arc(sx + lk + 4, ey - 5, 4, 0, 7); g.fill(); g.fillStyle = '#15120F'; }
      }
    }
    const m = Math.max(0.08, o.talk || 0);
    g.fillStyle = bot ? '#7CF3FF' : '#5A2A2A'; g.beginPath(); g.ellipse(lk, R * (bot ? 0.3 : 0.42), bot ? 34 : 22, 4 + m * (bot ? 16 : 20), 0, 0, 7); g.fill();
  }

  function extra(g, c, R, col, sil, bot) {
    const e = c.extra; g.lineCap = 'round';
    if (e === 'headset') { g.strokeStyle = col('#15120F'); g.lineWidth = 12; g.beginPath(); g.arc(0, -R * 0.1, R * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.fillStyle = col('#15120F'); rr(g, -R * 1.12, -R * 0.2, 34, 64, 12); g.fill(); rr(g, R * 1.12 - 34, -R * 0.2, 34, 64, 12); g.fill();
      g.lineWidth = 7; g.beginPath(); g.moveTo(-R * 1.0, R * 0.2); g.quadraticCurveTo(-R * 0.8, R * 0.62, -R * 0.3, R * 0.56); g.stroke();
      if (!sil) { g.fillStyle = '#E2457A'; g.beginPath(); g.arc(-R * 0.28, R * 0.56, 10, 0, 7); g.fill(); } }
    if (e === 'glasses' && !sil) { g.strokeStyle = '#15120F'; g.lineWidth = 6; rr(g, -R * 0.62, -R * 0.2, R * 0.5, R * 0.36, 10); g.stroke(); rr(g, R * 0.12, -R * 0.2, R * 0.5, R * 0.36, 10); g.stroke();
      g.beginPath(); g.moveTo(-R * 0.12, -R * 0.06); g.lineTo(R * 0.12, -R * 0.06); g.stroke(); }
    if (e === 'cap') { g.fillStyle = col('#E2457A'); g.beginPath(); g.ellipse(0, -R * 0.5, R * 0.98, R * 0.56, 0, Math.PI, 0); g.fill(); rr(g, -R * 0.2, -R * 0.56, R * 1.4, 24, 12); g.fill(); }
    if (e === 'antenna') { g.strokeStyle = col('#9AA3B8'); g.lineWidth = 8; g.beginPath(); g.moveTo(0, -R * 0.9); g.lineTo(0, -R * 1.45); g.stroke();
      g.fillStyle = col('#E2457A'); g.beginPath(); g.arc(0, -R * 1.5, 16, 0, 7); g.fill(); }
  }

  window.TMV_FIGURE = function (g, c, o = {}) {
    o = { x: 0, y: 0, s: 1, t: 0, talk: 0, look: 0, ...o };
    g.save(); g.translate(o.x, o.y); g.scale(o.s, o.s);
    if (o.rim) {   // the edge light: the silhouette in each neon colour, nudged outwards, under the figure
      g.save(); g.translate(-9, -4); body(g, c, o, o.rim[0]); g.restore();
      g.save(); g.translate(9, -4); body(g, c, o, o.rim[1]); g.restore();
    }
    body(g, c, o, null);
    g.restore();
  };
  window.TMV_FIGURE_HEIGHT = c => 820 * (BUILD[c.build] || BUILD.average)[0] + 260;
})();
