// clawd-v3.js: Clawd v3, the astronaut kit (glass dome, collar, pack, hoses, moods, stamp, clipboard). Load after core.js + clawd.js.
// Rule of thumb: plain Clawd on normal days,
// astronaut kit only when shipping.
//
//   clawdV3(x, y, u, o)   (x, y) = ground point between the feet, u = body unit (body 10u wide, 6u tall, like clawd()).
//     o.astro  true = glass dome + collar (+ pack and hoses by default)
//     o.mood   'deadpan' (default) | 'proud' | 'reading' | 'fired' | 'skeptical' | 'dead' | 'happy'
//     o.view   'front' (default) | 'three-quarter' | 'back'
//     o.kit    { pack, hoses (both default = astro), pouches, boots, tether }
//     o.stamp  holds the stamp in the right arm · o.slam 0..1 stamp comes down, red square mark on the floor
//     o.clip   holds a clipboard · o.wind 0..1 tails · o.aL / o.aR · o.flip · o.noShadow · o.dy
//   clawdV3.stampMark(x, y, size, rot)  red square imprint · clawdV3.part(name, x, y, u)  'dome'|'pack'|'stamp'|'tether'|'badge'
// Loading this file wraps clawd(): clawd(x, y, u, { astro: true }) or { look: 'v3' } draws v3; every other call is unchanged.
(function () {
  const clawd0 = clawd;
  const C = {
    clay: '#D97757', clayDk: '#A84D33', clayLt: '#F5B394', side: '#B9603F', back: '#C66A48', leg: '#8E3D25',
    red: '#D93A27', redDk: '#9C2417', cream: '#F6EBD3', creamDk: '#D3C2A0', grey: '#9AA0B4', greyDk: '#5E6580',
    blue: '#5B9BEA', blueLt: '#D3ECFF', blueDk: '#2B5DB0', glass: '#CFE6F7', orange: '#F07A2A', gold: '#F6C445',
    smoke: '#9C98A8', wood: '#7A5236', dark: '#3A3036',
  };
  const INK = PAL.ink;
  const MOODS = {
    deadpan: {}, reading: { eyes: 'down' }, happy: { eyes: 'happy', mouth: 'smile' },
    proud: { eyes: 'closed', mouth: 'smile' }, fired: { eyes: 'angry', mouth: 'grin', aL: 1, aR: 1, flame: 'fired' },
    skeptical: { eyes: 'skeptic', mouth: 'crooked' }, dead: { eyes: 'x', mouth: 'wobble', flame: 'out' },
  };

  // ---------- helpers ----------
  const bez = (a, b, c, n = 10) => { const p = []; for (let i = 0; i <= n; i++) { const k = i / n, m = 1 - k; p.push([m * m * a[0] + 2 * m * k * b[0] + k * k * c[0], m * m * a[1] + 2 * m * k * b[1] + k * k * c[1]]); } return p; };
  // a tube along a polyline (hoses, tether): filled band + ink outline + optional rib ticks
  function tube(pts, r, col, sw, ribs = true, ribCol = '#9C8E70') {
    const L = [], R = [], N = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      N.push([-dy, dx]); L.push([pts[i][0] - dy * r, pts[i][1] + dx * r]); R.push([pts[i][0] + dy * r, pts[i][1] - dx * r]);
    }
    paint([...L, ...R.slice().reverse()], { wash: col, ink: INK, sw: sw * .5 });
    if (ribs) for (let i = 1; i < pts.length - 1; i++) inkLine([[L[i][0] + N[i][0] * r * .2, L[i][1] + N[i][1] * r * .2], [R[i][0] - N[i][0] * r * .2, R[i][1] - N[i][1] * r * .2]], sw * .3, ribCol, 'inkfine', 0);
  }
  function flamePts(cx, by, h, w, lean = 0) {
    return [[-.5, 0], [-.6, -.3], [-.42, -.62], [-.2, -.5], [lean * 1 - .02, -1], [.18, -.66], [.36, -.78], [.6, -.34], [.5, 0]]
      .map(([px, py], i) => [cx + px * w + (py < -.9 ? lean * w : 0), by + py * h]);
  }
  const bolt = (x, y, r, sw) => { paint(ellPts(x, y, r, r, 10), { wash: C.grey, fill: C.greyDk, fillOp: 50, ink: INK, sw: sw * .4 }); };
  function badge(x, y, r, sw) {
    paint(ellPts(x, y, r, r, 20), { wash: C.cream, ink: INK, sw: sw * .55 });
    brush.noFill(); brush.noWash(); brush.noHatch(); brush.set('ink', C.red, Math.max(.4, sw * .75));
    brush.beginShape(0); for (const p of ellPts(x, y, r * .7, r * .7, 20)) brush.vertex(p[0], p[1]); brush.endShape(true);
  }
  function band(x0, y0, w, h, u, sw, arrows) {
    paint(rectPts(x0, y0, w, h, u * .03), { wash: C.red, fill: C.redDk, fillOp: 40, tex: .4, ink: INK, sw: sw * .6 });
    for (const ax of arrows) inkLine([[ax - .2 * u, y0 + h * .3], [ax + .15 * u, y0 + h * .5], [ax - .2 * u, y0 + h * .7]], sw * .45, C.cream, 'inkfine', 0);
  }
  function knot(kx, ky, u, sw) {
    for (const a of [-.75, .75]) paint(ellPts(kx + Math.sin(a) * .5 * u, ky - Math.cos(a) * .45 * u, .45 * u, .55 * u, 12, 0, a), { wash: C.red, fill: C.redDk, fillOp: 60, ink: INK, sw: sw * .5 });
    paint(ellPts(kx, ky, .42 * u, .45 * u, 10), { wash: C.redDk, ink: INK, sw: sw * .5 });
  }
  function tails(kx, ky, dir, u, sw, wind, t) {
    [[3.6, 0, -.4, .48], [3.2, 1.9, .1, .45], [2.7, 3.1, .6, .42]].forEach(([len, ph, drop, wd]) => {
      const top = [], bot = [], N = 7;
      for (let i = 0; i <= N; i++) {
        const k = i / N, fl = Math.sin(t * 8 * (.6 + .4 * wind) + k * 2.6 + ph) * u * .35 * k * wind;
        const cx = kx + dir * k * len * u * (.7 + .3 * wind), cy = ky + (drop + Math.pow(k, 1.5) * (2.4 - wind * 1.6 + drop)) * u + fl, w = wd * u * (1 - k * .3);
        top.push([cx, cy - w]); bot.push([cx, cy + w]);
      }
      paint([...top, ...bot.reverse()], { wash: C.red, fill: C.redDk, fillOp: 55, tex: .4, ink: INK, sw: sw * .5 });
    });
  }
  // pilot flame on its nub. state: 'calm' | 'fired' | 'out'. (x, y) = top of the body.
  function pilot(x, y, u, state, t, sw) {
    paint(rrPts(x - .4 * u, y - .55 * u, .8 * u, .6 * u, .12 * u), { wash: C.grey, fill: C.greyDk, fillOp: 60, ink: INK, sw: sw * .45 });
    const top = y - .55 * u;
    if (state === 'out') {
      const sp = []; for (let i = 0; i < 16; i++) { const k = i / 15; sp.push([x + Math.sin(k * 8 + t * 2.4) * .55 * u * k, top - k * 4.2 * u]); }
      inkLine(sp, sw * 1.3, C.smoke, 'ink', .7);
      paint(ellPts(x + .3 * u, top - 4.3 * u, .5 * u, .4 * u, 10), { fill: C.smoke, fillOp: 110, bleed: .3, ink: null });
      return;
    }
    const lean = Math.sin(t * 6) * .12;
    if (state === 'fired') {
      const hh = 3.8 * u;
      for (let i = 0; i < 3; i++) paint(ellPts(x, top - hh * .5, hh * (.55 + i * .2), hh * (.6 + i * .2), 20, 1), { wash: C.gold, washOp: 22, ink: null });
      paint(flamePts(x, top, hh, 2.1 * u, lean), { wash: C.orange, fill: C.red, fillOp: 50, ink: INK, sw: sw * .55, curv: .35 });
      paint(flamePts(x, top, hh * .66, 1.4 * u, lean * .6), { wash: C.gold, ink: null, curv: .35 });
      paint(flamePts(x, top, hh * .35, .8 * u, 0), { wash: '#FFF0B8', ink: null, curv: .35 });
      for (const a of [-1.2, -.75, .75, 1.2]) inkLine([[x + Math.sin(a) * hh * .62, top - hh * .55 - Math.cos(a) * hh * .45], [x + Math.sin(a) * hh * .9, top - hh * .55 - Math.cos(a) * hh * .7]], sw * .8, C.orange, 'ink', 0);
      return;
    }
    const hh = 1.7 * u;
    for (let i = 0; i < 2; i++) paint(ellPts(x, top - hh * .4, hh * (.45 + i * .2), hh * (.55 + i * .2), 16, 1), { wash: C.blueLt, washOp: 30, ink: null });
    paint(flamePts(x, top, hh, 1.05 * u, lean), { wash: C.blue, fill: C.blueDk, fillOp: 45, ink: INK, sw: sw * .45, curv: .35 });
    paint(flamePts(x, top, hh * .55, .55 * u, lean * .5), { wash: C.blueLt, ink: null, curv: .35 });
  }
  // glass dome: base centre (cx, by), half width rx, height ry. Fill first; rim + highlights after (so they sit on top).
  function domeFill(cx, by, rx, ry) {
    const d = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; d.push([cx + Math.cos(a) * rx, by + Math.sin(a) * ry]); }
    paint(d, { wash: C.glass, washOp: 70, fill: '#A9C8E4', fillOp: 35, bleed: .1, tex: .3, border: .6, ink: null });
  }
  function domeRim(cx, by, rx, ry, sw) {
    const arc = (a0, a1, k, n = 18) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx * k, by + Math.sin(a) * ry * k]); } return p; };
    inkLine(arc(Math.PI * 1.17, Math.PI * 1.42, .84, 10), sw * 1.5, '#FFFFFF', 'ink', .5);
    inkLine(arc(Math.PI * 1.47, Math.PI * 1.53, .84, 4), sw * 1.2, '#FFFFFF', 'ink', .5);
    inkLine(arc(Math.PI * 1.7, Math.PI * 1.8, .86, 6), sw * .9, '#FFFFFF', 'ink', .5);
    inkLine(arc(Math.PI, Math.PI * 2, 1, 26), sw * 1.35, INK, 'ink', .5);
  }
  function collar(x0, y0, w, u, sw, bolts) {
    paint(rrPts(x0, y0, w, 1.2 * u, .45 * u), { wash: C.cream, fill: C.creamDk, fillOp: 55, tex: .4, ink: INK, sw: sw * .7 });
    inkLine([[x0 + .4 * u, y0 + .9 * u], [x0 + w - .4 * u, y0 + .9 * u]], sw * .3, C.creamDk, 'inkfine', 0);
    for (const bx of bolts) bolt(bx, y0 + .6 * u, .3 * u, sw);
  }
  // collar ring: a thick cream frame round the top of the body (top edge at yt, sides down to yb); hoses drop from its lower ends
  function ring(x0, x1, yt, yb, u, sw, hoses) {
    const r = .7 * u, p = [[x0, yb], [x0, yt + r]];
    for (let i = 1; i < 5; i++) { const a = Math.PI + i / 5 * Math.PI / 2; p.push([x0 + r + Math.cos(a) * r, yt + r + Math.sin(a) * r]); }
    p.push([x0 + r, yt], [x1 - r, yt]);
    for (let i = 1; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * Math.PI / 2; p.push([x1 - r + Math.cos(a) * r, yt + r + Math.sin(a) * r]); }
    p.push([x1, yt + r], [x1, yb]);
    tube(p, .42 * u, C.cream, sw * 1.2, false);
    inkLine(p.slice(1, -1).map(([a, b]) => [a + (a < (x0 + x1) / 2 ? .15 : -.15) * u * (b > yt + r ? 1 : 0), b + .18 * u]), sw * .3, C.creamDk, 'inkfine', .3);
    for (const bx of [x0 + .9 * u, x1 - .9 * u]) bolt(bx, yt, .26 * u, sw);
    for (const bx of [x0, x1]) {
      if (hoses) { const d = bx < x0 + 1 ? -1 : 1; tube(bez([bx, yb - .1 * u], [bx + d * .9 * u, yb + .6 * u], [bx + d * .5 * u, yb + 1.3 * u], 6), .3 * u, C.cream, sw); bolt(bx + d * .5 * u, yb + 1.35 * u, .3 * u, sw); }
      bolt(bx, yb, .34 * u, sw);
    }
  }
  function packBox(x0, y0, w, h, u, sw, handle = true) {
    if (handle) inkLine([[x0 + w * .3, y0 + .05 * u], [x0 + w * .3, y0 - .55 * u], [x0 + w * .7, y0 - .55 * u], [x0 + w * .7, y0 + .05 * u]], sw * 1.1, C.greyDk, 'ink', 0);
    paint(rrPts(x0, y0, w, h, .5 * u), { wash: C.cream, fill: C.creamDk, fillOp: 60, tex: .45, ink: INK, sw: sw * .7 });
    paint(rectPts(x0 + .05 * u, y0 + h * .42, w - .1 * u, .45 * u, u * .02), { wash: C.red, ink: null });
  }
  function pouch(x, y, u, sw) {
    paint(rrPts(x, y, 1.9 * u, 1.5 * u, .2 * u), { wash: C.cream, fill: C.creamDk, fillOp: 60, ink: INK, sw: sw * .5 });
    paint(rrPts(x - .05 * u, y - .05 * u, 2 * u, .6 * u, .15 * u), { wash: C.cream, ink: INK, sw: sw * .45 });
    paint(rectPts(x + .8 * u, y + .3 * u, .3 * u, .4 * u), { wash: C.greyDk, ink: null });
  }
  function belt(u, sw, pouches) {
    paint(rectPts(-5.15 * u, -3.4 * u, 10.3 * u, .75 * u, u * .02), { wash: C.cream, fill: C.creamDk, fillOp: 50, ink: INK, sw: sw * .55 });
    paint(rrPts(-.55 * u, -3.55 * u, 1.1 * u, 1.05 * u, .12 * u), { wash: C.grey, ink: INK, sw: sw * .5 });
    paint(rectPts(-.25 * u, -3.25 * u, .5 * u, .45 * u), { wash: C.greyDk, ink: null });
    if (pouches) { pouch(-4.6 * u, -3.75 * u, u, sw); pouch(2.6 * u, -3.75 * u, u, sw); }
  }
  function boots(u, sw, lxs, lw) {
    for (const lx of lxs) {
      paint(rrPts(lx * u - .2 * u, -1.25 * u, lw * u + .4 * u, 1.05 * u, .15 * u), { wash: C.cream, fill: C.creamDk, fillOp: 50, ink: INK, sw: sw * .5 });
      paint(rectPts(lx * u - .18 * u, -.95 * u, lw * u + .36 * u, .22 * u), { wash: C.red, ink: null });
      paint(rectPts(lx * u - .25 * u, -.25 * u, lw * u + .5 * u, .38 * u, u * .02), { wash: C.dark, ink: INK, sw: sw * .4 });
    }
  }
  // the stamp prop, neck bottom at (0,0) in the current transform, block below
  function stampProp(u, sw) {
    paint(ellPts(0, -1.55 * u, .85 * u, .7 * u, 16), { wash: C.red, fill: C.redDk, fillOp: 50, ink: INK, sw: sw * .55 });
    paint(ellPts(-.3 * u, -1.75 * u, .22 * u, .15 * u, 8), { wash: '#FFD9DD', ink: null });
    paint(rectPts(-.32 * u, -1.05 * u, .64 * u, 1.05 * u, u * .02), { wash: C.cream, fill: C.creamDk, fillOp: 50, ink: INK, sw: sw * .5 });
    paint(rectPts(-1.25 * u, 0, 2.5 * u, 1.1 * u, u * .03), { wash: C.dark, fill: '#1E181C', fillOp: 50, ink: INK, sw: sw * .55 });
    paint(rectPts(-1.25 * u, 1.1 * u, 2.5 * u, .25 * u), { wash: C.red, ink: INK, sw: sw * .35 });
  }
  function stampMark(x, y, size, rot = -.15) {
    push(); translate(x, y); scale(1, .5); rotate(rot);
    for (const [g, k] of [[0, 1.3], [size * .16, .7]]) {
      brush.noWash(); brush.noFill(); brush.noHatch(); brush.set('ink', C.red, Math.max(.6, size / 40) * k);
      brush.beginShape(0); for (const p of rectPts(-size / 2 + g, -size / 2 + g, size - 2 * g, size - 2 * g, size * .02)) brush.vertex(p[0], p[1]); brush.endShape(true);
    }
    pop();
  }
  function clipboard(u, sw) {
    paint(rectPts(-1.3 * u, -1.7 * u, 2.6 * u, 3.4 * u, u * .03), { wash: C.wood, ink: INK, sw: sw * .5 });
    paint(rectPts(-1.1 * u, -1.4 * u, 2.2 * u, 2.95 * u, u * .02), { wash: '#FFFDF6', ink: INK, sw: sw * .35 });
    for (let i = 0; i < 6; i++) inkLine([[-.85 * u, -.9 * u + i * .42 * u], [(i % 3 === 2 ? .3 : .8) * u, -.9 * u + i * .42 * u]], sw * .3, '#8A8296', 'inkfine', 0);
    paint(rrPts(-.5 * u, -1.9 * u, 1 * u, .5 * u, .12 * u), { wash: C.grey, ink: INK, sw: sw * .4 });
  }
  function tether(x, y, u, sw, t) {   // coil starting at (x, y) (the carabiner), drooping down to the floor
    const p = []; for (let i = 0; i <= 40; i++) { const k = i / 40, a = k * 3 * TAU; p.push([x + Math.sin(a) * .8 * u + k * 1.2 * u, y + .6 * u + k * 3.4 * u + Math.cos(a) * .45 * u]); }
    tube(p, .17 * u, C.red, sw, true, C.redDk);
    push(); translate(x, y); rotate(-.5);
    brush.noWash(); brush.noFill(); brush.noHatch(); brush.set('ink', INK, sw * 1.4);
    brush.beginShape(0); for (const q of rrPts(-.45 * u, -1.1 * u, .9 * u, 1.7 * u, .42 * u)) brush.vertex(q[0], q[1]); brush.endShape(true);
    brush.set('ink', C.grey, sw * .9);
    brush.beginShape(0); for (const q of rrPts(-.45 * u, -1.1 * u, .9 * u, 1.7 * u, .42 * u)) brush.vertex(q[0], q[1]); brush.endShape(true);
    pop();
  }

  // ---------- eyes + mouth (front, body-local) ----------
  function face(u, sw, M, o, ey, xs = [-3, 2], w = .95) {
    const e = M.eyes || 'deadpan';
    for (const ex of xs) {
      const X = ex * u, Y = ey * u;
      if (e === 'deadpan' || e === 'down' || (e === 'skeptic' && ex === xs[0])) {
        const yy = Y + (e === 'down' ? .35 * u : 0);
        paint(rectPts(X, yy, w * u, w * u, u * .03), { wash: INK, ink: null });
        inkLine([[X - .2 * u, Y - .12 * u], [X + (w + .2) * u, Y - .12 * u]], sw * .7, INK, 'ink', 0);
        if (u > 9) paint(ellPts(X + .3 * u, yy + .28 * u, u * .13, u * .13, 8), { wash: PAL.cream, washOp: 230, ink: null });
      } else if (e === 'skeptic') {
        paint(rectPts(X, Y + .45 * u, w * u, .5 * u, u * .03), { wash: INK, ink: null });
        inkLine([[X - .3 * u, Y + .5 * u], [X + (w + .3) * u, Y + .2 * u]], sw * .9, INK, 'ink', 0);
      } else if (e === 'closed') inkLine([[X - .2 * u, Y + .3 * u], [X + w / 2 * u, Y + .75 * u], [X + (w + .2) * u, Y + .3 * u]], sw, INK, 'ink', .5);
      else if (e === 'happy') inkLine([[X - .2 * u, Y + .8 * u], [X + w / 2 * u, Y + .1 * u], [X + (w + .2) * u, Y + .8 * u]], sw, INK, 'ink', .3);
      else if (e === 'angry') { const L = ex === xs[0]; paint([[X - .2 * u, Y + (L ? -.1 : .45) * u], [X + (w + .2) * u, Y + (L ? .45 : -.1) * u], [X + (w + .2) * u, Y + 1.05 * u], [X - .2 * u, Y + 1.05 * u]], { wash: INK, ink: null }); }
      else if (e === 'x') { inkLine([[X - .15 * u, Y - .1 * u], [X + (w + .15) * u, Y + 1.05 * u]], sw, INK, 'ink', 0); inkLine([[X + (w + .15) * u, Y - .1 * u], [X - .15 * u, Y + 1.05 * u]], sw, INK, 'ink', 0); }
    }
    const m = M.mouth, my = (ey + 1.9) * u, mx = (xs[0] + xs[1] + w) / 2 * u;
    if (m === 'smile') inkLine([[mx - .6 * u, my - .15 * u], [mx, my + .25 * u], [mx + .6 * u, my - .15 * u]], sw * .7, INK, 'ink', .6);
    else if (m === 'grin') paint([[mx - 1.1 * u, my - .3 * u], [mx + 1.1 * u, my - .3 * u], [mx + .7 * u, my + .6 * u], [mx - .7 * u, my + .6 * u]], { wash: '#4A1F2A', ink: INK, sw: sw * .55, curv: .3 });
    else if (m === 'crooked') inkLine([[mx - .7 * u, my + .1 * u], [mx + .1 * u, my], [mx + .7 * u, my - .25 * u]], sw * .7, INK, 'ink', .4);
    else if (m === 'wobble') inkLine([[mx - .8 * u, my + .1 * u], [mx - .4 * u, my - .15 * u], [mx, my + .1 * u], [mx + .4 * u, my - .15 * u], [mx + .8 * u, my + .1 * u]], sw * .6, INK, 'ink', .3);
  }

  function opts(o) {
    const astro = !!o.astro, k = o.kit || {};
    return { astro, pack: astro && (k.pack ?? true), hoses: astro && (k.hoses ?? true), pouches: !!k.pouches, belt: !!(k.pouches || k.belt), boots: !!k.boots, tether: !!k.tether };
  }

  function clawdV3(x, y, u, o = {}) {
    const M = { ...(MOODS[o.mood || 'deadpan'] || {}) }, view = o.view || 'front', t = T, wind = o.wind ?? .7;
    const sw = clamp(u / 15, .45, 2.4), K = opts(o), J = u * .07, f = o.flip ? -1 : 1, dy = (o.dy || 0) * u;
    const fl = M.flame || 'calm';
    if (view === 'front') {
      let aR = o.aR ?? M.aR ?? .2;
      if (o.stamp) aR = o.aR ?? (1.15 - (o.slam || 0) * 1.7);
      if (o.clip) aR = o.aR ?? -.35;
      // behind the body: pack (+ tether clip on its strap)
      push(); translate(x, y + dy); scale(f, 1);
      if (!o.noShadow) paint(ellPts(0, u * .15, u * 6.2, u, 22), { fill: INK, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null });
      if (K.pack) packBox(3.4 * u, -7.9 * u, 4 * u, 5.4 * u, u, sw);
      pop();
      clawd0(x, y, u, { ...o, flip: o.flip, noShadow: true, eyes: 'none', mouth: null, hat: null, aL: o.aL ?? M.aL ?? .2, aR, draw: (uu, s) => {
        if (K.boots) boots(uu, s, [-4, -2, 1, 3], 1);
        face(uu, s, M, o, K.astro ? -6.3 : -6.6);
        if (K.belt) belt(uu, s, K.pouches);
        badge(3 * uu, (K.belt ? -4.6 : -3.5) * uu, .95 * uu, s);
        band(-5.15 * uu, -8.3 * uu, 10.3 * uu, 1.05 * uu, uu, s, [-3.9 * uu, -2.3 * uu, 2.1 * uu, 3.7 * uu]);
        if (fl !== 'fired') pilot(0, -8.25 * uu, uu, fl, t, s);
        if (K.astro) {
          domeFill(0, -7.3 * uu, 3.9 * uu, 4.9 * uu);
          domeRim(0, -7.3 * uu, 3.9 * uu, 4.9 * uu, s);
          ring(-5.25 * uu, 5.25 * uu, -7.35 * uu, -4.3 * uu, uu, s, K.hoses);
        }
        knot(5.05 * uu, -8.25 * uu, uu, s);
        tails(5.3 * uu, -8.3 * uu, 1, uu, s, wind, t);
        if (fl === 'fired') pilot(0, -8.25 * uu, uu, fl, t, s);
        if (K.tether) tether(5.4 * uu, -3.3 * uu, uu, s, t);
        if (o.clip) { push(); translate(2.2 * uu, -4.3 * uu); rotate(-.12); clipboard(uu, s); pop(); }
      } });
      if (o.stamp) {
        const hx = x + f * (4.9 * u + 2.2 * u * Math.cos(aR)), hy = y + dy - 4.5 * u - 2.2 * u * Math.sin(aR);
        const sl = o.slam || 0, sy = lerp(hy - .2 * u, y - 1.35 * u * .9, sl);
        if (sl > .6) { stampMark(hx + f * 1.6 * u, y + .9 * u, 2.6 * u, .75); for (const a of [-1.1, -.6, -.15]) inkLine([[hx + f * .3 * u + Math.cos(a) * 1.8 * u * f, y - .6 * u + Math.sin(a) * 1.1 * u], [hx + f * .3 * u + Math.cos(a) * 2.4 * u * f, y - .6 * u + Math.sin(a) * 1.5 * u]], sw * .6, C.red, 'ink', 0); }
        push(); translate(hx + f * .3 * u, sl > .6 ? y - 1.35 * u * .95 : sy); scale(.95); rotate(f * (sl > .6 ? 0 : -.12)); stampProp(u, sw); pop();
      }
      return;
    }
    // ---------- three-quarter and back: painted here ----------
    push(); translate(x, y + dy); scale(f, 1);
    if (!o.noShadow) paint(ellPts(0, u * .15, u * 6, u, 22), { fill: INK, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null });
    const R = (x0, y0, w, h, c) => paint(rectPts(x0 * u, y0 * u, w * u, h * u, J * .6), { wash: c, washOp: 255, ink: INK, sw: sw * .8 });
    const armP = (px, py, a, c, len = 2.2) => { push(); translate(px * u, py * u); rotate(a); paint(rectPts(px < 0 ? -len * u : 0, -.5 * u, len * u, u, J * .6), { wash: c, fill: C.clayDk, fillOp: 50, ink: INK, sw: sw * .8 }); pop(); };
    if (view === 'three-quarter') {
      if (K.pack) packBox(4.2 * u, -9 * u, 2.9 * u, 5.8 * u, u, sw);
      tails(5.4 * u, -8.8 * u, 1, u, sw, wind, t);
      for (const lx of [3.4, 4.4]) R(lx, -2.9, .75, 2.3, C.leg);
      for (const lx of [-4, -1.3]) R(lx, -2.4, .95, 2.4, C.clayDk);
      if (K.boots) boots(u, sw, [-4, -1.3], .95);
      armP(-4.9, -4.5, o.aL ?? .2, C.clay);
      const front = [[-5 * u, -8 * u], [2.6 * u, -8 * u], [2.6 * u, -2 * u], [-5 * u, -2 * u]], side = [[2.6 * u, -8 * u], [5.2 * u, -8.8 * u], [5.2 * u, -2.8 * u], [2.6 * u, -2 * u]];
      paint(side, { wash: C.side, fill: C.clayDk, fillOp: 70, tex: .5, ink: INK, sw });
      paint(front, { wash: C.clay, ink: null });
      paint(ellPts(-1.8 * u, -6.2 * u, 2.6 * u, 1.3 * u, 18, J * 2), { fill: C.clayLt, fillOp: 110, bleed: .2, tex: .85, border: .8, ink: null });
      paint(rectPts(-4.8 * u, -3.8 * u, 7.2 * u, 1.6 * u, J), { fill: C.clayDk, fillOp: 120, bleed: .03, tex: .7, border: .5, ink: null });
      paint(front, { ink: INK, sw });
      armP(5.1, -5.2, -(o.aR ?? .2) * .6, C.side, 1.7);
      face(u, sw, M, o, K.astro ? -6.3 : -6.6, [-3.6, .3], .85);
      if (K.belt) { paint(rectPts(-5.1 * u, -3.4 * u, 7.7 * u, .75 * u), { wash: C.cream, ink: INK, sw: sw * .5 }); if (K.pouches) pouch(-4.5 * u, -3.75 * u, u, sw); }
      badge(1.4 * u, -3.5 * u, .85 * u, sw);
      band(-5.15 * u, -8.3 * u, 7.75 * u, 1.05 * u, u, sw, [-4.2 * u, -2.7 * u, 1.3 * u]);
      paint([[2.6 * u, -8.3 * u], [5.3 * u, -9.1 * u], [5.3 * u, -8.05 * u], [2.6 * u, -7.25 * u]], { wash: C.redDk, fill: C.red, fillOp: 40, ink: INK, sw: sw * .6 });
      if (fl !== 'fired') pilot(-.8 * u, -8.25 * u, u, fl, t, sw);
      if (K.astro) {
        domeFill(-.6 * u, -7.4 * u, 3.9 * u, 4.9 * u); domeRim(-.6 * u, -7.4 * u, 3.9 * u, 4.9 * u, sw);
        ring(-5.25 * u, 2.5 * u, -7.35 * u, -4.3 * u, u, sw, false);
        paint([[2.8 * u, -7.55 * u], [5.8 * u, -8.4 * u], [5.8 * u, -7.35 * u], [2.8 * u, -6.5 * u]], { wash: C.creamDk, fill: C.cream, fillOp: 50, ink: INK, sw: sw * .6 });
        bolt(4.4 * u, -7.4 * u, .26 * u, sw);
        if (K.hoses) tube(bez([2.6 * u, -4.4 * u], [4.4 * u, -3.4 * u], [5.2 * u, -4.6 * u], 9), .28 * u, C.cream, sw);
      }
      knot(5.2 * u, -8.8 * u, u, sw);
      if (fl === 'fired') pilot(-.8 * u, -8.25 * u, u, fl, t, sw);
    } else {   // back: knot + tails on the viewer's left
      tails(-5.1 * u, -8.3 * u, -1, u, sw, wind, t);
      [-4, -2, 1, 3].forEach(lx => R(lx, -2.4, 1, 2.2, C.clayDk));
      if (K.boots) boots(u, sw, [-4, -2, 1, 3], 1);
      armP(-4.9, -4.5, o.aR ?? .2, C.back); armP(4.9, -4.5, -(o.aL ?? .2), C.back);
      const body = rectPts(-5 * u, -8 * u, 10 * u, 6 * u, J);
      paint(body, { wash: C.back, ink: null });
      paint(ellPts(1.6 * u, -6.4 * u, 3.2 * u, 1.4 * u, 18, J * 2), { fill: '#F0A585', fillOp: 100, bleed: .2, tex: .85, border: .8, ink: null });
      paint(rectPts(-4.8 * u, -3.8 * u, 9.6 * u, 1.6 * u, J), { fill: C.clayDk, fillOp: 120, bleed: .03, tex: .7, border: .5, ink: null });
      paint(body, { ink: INK, sw });
      if (K.belt) paint(rectPts(-5.15 * u, -3.4 * u, 10.3 * u, .75 * u), { wash: C.cream, ink: INK, sw: sw * .5 });
      band(-5.15 * u, -8.3 * u, 10.3 * u, 1.05 * u, u, sw, []);
      if (fl !== 'fired') pilot(0, -8.25 * u, u, fl, t, sw);
      if (K.astro) { domeFill(0, -7.3 * u, 3.9 * u, 4.9 * u); domeRim(0, -7.3 * u, 3.9 * u, 4.9 * u, sw); ring(-5.25 * u, 5.25 * u, -7.35 * u, -4.3 * u, u, sw, false); }
      if (K.pack) {
        for (const sx of [-2.2, 2.2]) inkLine([[sx * u, -7 * u], [sx * u, -6.1 * u]], sw * 1, C.greyDk, 'ink', 0);
        packBox(-3.6 * u, -6.4 * u, 7.2 * u, 4.2 * u, u, sw, false);
        if (K.hoses) for (const s of [-1, 1]) tube(bez([s * 3.6 * u, -4.6 * u], [s * 5.4 * u, -5 * u], [s * 4.8 * u, -6.6 * u], 8), .28 * u, C.cream, sw);
      } else paint(rectPts(-.4 * u, -5.3 * u, .8 * u, .8 * u), { wash: C.clayDk, ink: INK, sw: sw * .5 });
      knot(-5.05 * u, -8.25 * u, u, sw);
      if (fl === 'fired') pilot(0, -8.25 * u, u, fl, t, sw);
    }
    pop();
  }

  // ---------- kit parts, each upright and centred on (x, y) = its bottom centre ----------
  clawdV3.part = (name, x, y, u) => {
    const sw = clamp(u / 15, .45, 2.4);
    push(); translate(x, y);
    paint(ellPts(0, u * .2, u * 3.6, u * .6, 20), { fill: INK, fillOp: 60, bleed: .25, tex: .3, border: .1, ink: null });
    if (name === 'dome') {
      paint(ellPts(0, -.9 * u, 5 * u, 1 * u, 24), { wash: '#C9C3B6', ink: INK, sw: sw * .5 });
      pilot(0, -.8 * u, u, 'calm', T, sw);
      domeFill(0, -.9 * u, 4.8 * u, 4.8 * u); domeRim(0, -.9 * u, 4.8 * u, 4.8 * u, sw);
      paint(rrPts(-5.2 * u, -1.1 * u, 10.4 * u, 1 * u, .45 * u), { wash: C.cream, fill: C.creamDk, fillOp: 55, ink: INK, sw: sw * .7 });
      for (const bx of [-4.4, -3.6, 3.6, 4.4]) bolt(bx * u, -.6 * u, .22 * u, sw);
    } else if (name === 'pack') {
      for (const s of [-1, 1]) tube(bez([s * 1.6 * u, -6 * u], [s * 5.2 * u, -4.4 * u], [s * 3 * u, -.6 * u], 10), .28 * u, C.cream, sw);
      packBox(-2.4 * u, -6.4 * u, 4.8 * u, 4.6 * u, u, sw);
      for (const s of [-1, 1]) { paint(rrPts(s * 3 * u - .45 * u, -.9 * u, .9 * u, .7 * u, .15 * u), { wash: C.greyDk, ink: INK, sw: sw * .4 }); }
    } else if (name === 'stamp') { translate(0, -1.35 * u * 1.4); scale(1.4); stampProp(u, sw); }
    else if (name === 'tether') tether(-.8 * u, -5 * u, u * 1.1, sw, T);
    else if (name === 'badge') badge(0, -2 * u, 2 * u, sw * 1.4);
    pop();
  };
  clawdV3.stampMark = stampMark;
  clawdV3.original = clawd0;
  window.clawdV3 = clawdV3;
  clawd = (x, y, u, o = {}) => (o.astro || o.look === 'v3') ? clawdV3(x, y, u, o) : clawd0(x, y, u, o);
})();
