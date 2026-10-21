// kai-v3.js: Kai v3, drawn from Kai's own canon (kaiship-business/01-kai/profile/kai-world/canon/kai-sheet.png, 2026-10-09).
// Self-contained: needs only core.js (paint, inkLine, ellPts, rrPts, rectPts, PAL, T, clamp, lerp, hash). Works in
// _template-reel-handdrawn and _kai-world. Opt-in: old reels keep their old Kai until Kai approves v3.
//
//   kaiV3(pose, x, y, h, o)        feet at (x, y), h = height to the top of the hair (~5.5 heads, not chibi).
//                                  'exp-*' poses = head-and-shoulders bust: h = bust height, bottom edge at y.
//   kai(pose, x, y, h, { look: 'v3', ... })   same thing through the old kai() call (any other call is untouched).
//   o: face ('smile'|'grin'|'laugh'|'smirk'|'o'|'flat') · eyes ('normal'|'happy'|'wink'|'half'|'down'|'side')
//      · brows ('cock'|'up'|'down') · tails (-1 viewer-left, 1 viewer-right) · wind 0..1 · ticks 0..1 (the little
//      yellow "!" strokes) · flip · rot · shadow:false · bag:false · holdR(s, sw) / holdL: draw a prop at that hand
// Poses: 'front' (hands in pockets) · 'tighten' (tying the headband, the signature) · 'point-down' (the CTA) ·
//   'sit-laptop' (on a crate, laptop on the knees) · 'clipboard' (shows the clipboard) · 'fist-pump' (walking, wink)
//   · 'wave' · 'thumbsup' · 'arms-crossed' · busts 'exp-look', 'exp-laugh', 'exp-smirk', 'exp-smile'
// Outfit (locked by Kai): red open work jacket (2 chest flap pockets, sleeves rolled), white tee, black crossbody
// sling bag, black cargo pants with side pockets, black/white sneakers with red laces + red heel; dark-brown afro,
// red headband with a white zigzag/arrow pattern + 2 tails, heavy black square glasses, warm smile.
const kaiV3 = (() => {
  const C = {
    skin: '#F3C9A2', skinDk: '#D9A07A', blush: '#EE8F7E',
    hair: '#5B3522', hairDk: '#3A2015', hairLt: '#B9763F',
    band: '#D93A27', bandDk: '#9C2417', bandLt: '#FFF4E8',
    jacket: '#E2482C', jacketDk: '#A92F1C', jacketLt: '#F57E56',
    tee: '#F6EFE4', teeDk: '#D9CDBD',
    pants: '#2A2527', pantsLt: '#4B4140', rim: '#8A5532',
    bag: '#26211F', bagLt: '#4A403C',
    shoe: '#2B2A33', sole: '#F3EFE7', lace: '#E3412B', metal: '#A7A3AE',
    lens: '#FFFFFF', frame: '#1C171B', eye: '#2B1A12', mouth: '#7A2A26', tick: '#E8AA38', wood: '#C9A06A', woodDk: '#8C6438',
  };
  // arms: [upper angle from straight down (+ = out/up), forearm bend (+ = further out/up, - = back across), hand, hand world angle]
  const P = {
    front:        { L: [.26, -.7, 'pocket'], R: [.26, -.7, 'pocket'], tails: 1 },
    tighten:      { L: [2.5, 1.28, 'fist'], R: [2.53, 1.18, 'fist'], behindR: true, tails: -1, grip: true, ticks: 1 },
    'point-down': { L: [.4, -1.75, 'point', 0], R: [.4, -1.75, 'point', 0], tails: -1, ticks: 1, legs: 'wide' },
    clipboard:    { L: [.05, -1.44, 'palm', -Math.PI / 2], R: [.31, -2.99, 'fist'], tails: -1, clip: true, face: 'grin' },
    'fist-pump':  { L: [.17, -2.4, 'fist'], R: [2.57, .87, 'fist'], tails: -1, face: 'grin', eyes: 'happy', ticks: 1, legs: 'walk' },
    'sit-laptop': { L: [.255, -1.0, 'fist'], R: [.255, -1.1, 'fist'], tails: -1, sit: true, eyes: 'down' },
    wave:         { L: [.22, -.62, 'pocket'], R: [2.2, .9, 'open'], tails: -1, face: 'grin' },
    thumbsup:     { L: [.22, -.62, 'pocket'], R: [.5, -2.6, 'thumb', Math.PI], tails: -1, face: 'grin', eyes: 'wink' },
    'arms-crossed': { L: [.12, -1.5, 'fist'], R: [.12, -1.75, 'fist'], tails: -1, face: 'smirk', brows: 'cock' },
    'exp-look':   { bust: true, turn: .3, tails: -1, eyes: 'side' },
    'exp-laugh':  { bust: true, face: 'laugh', eyes: 'happy', brows: 'up', tails: -1, ticks: 1 },
    'exp-smirk':  { bust: true, turn: -.22, face: 'smirk', eyes: 'half', brows: 'cock', tails: 1 },
    'exp-smile':  { bust: true, tails: -1 },
  };
  const SH = 11.3, SHY = -69.8, UP = 14.5, FORE = 11.6;   // shoulder x, shoulder y, upper arm, forearm (units of h/100)
  const speaking = t => (typeof VO_WORDS !== 'undefined') && VO_WORDS.some(w => t >= w.s && t < w.e);
  let s = 1, sw = 1;
  const Q = (x, y) => [x * s, y * s], QS = a => a.map(([x, y]) => [x * s, y * s]);
  const arc = (cx, cy, rx, ry, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

  // ---------- hair: a big round afro of small curls, dark brown with orange-brown C highlights ----------
  function hairCloud(cx, t) {
    const cy = -87.4, rx = 14.2, ryU = 12.2, ryD = 10.2, N = 240, lobes = 22, out = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, ry = Math.sin(a) > 0 ? ryD : ryU, lobe = Math.pow(Math.abs(Math.sin(lobes * a / 2)), .55);
      const bump = 1.55 * lobe * (1 + .04 * Math.sin(t * 2.2 + Math.floor(i * lobes / N)));
      const ex = Math.cos(a), ey = Math.sin(a);
      out.push(Q(cx + ex * (rx + bump), cy + ey * (ry + bump * (ey > 0 ? .6 : 1))));
    }
    paint(out, { wash: C.hair, fill: C.hairDk, fillOp: 70, tex: .7, border: .5, ink: PAL.ink, sw: sw * 1.05 });
    // curls: dark pocket + light "C" stroke, scattered inside the cloud (seeded, stable)
    for (let i = 0; i < 64; i++) {
      const u = hash(i * 3.17 + 1), v = hash(i * 7.31 + 2), a = u * TAU, r = Math.sqrt(v) * .93;
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * (Math.sin(a) > 0 ? ryD : ryU) * r;
      if (Math.abs(x - cx) < 7.6 && y > -90.5) continue;   // the face covers this
      const cr = .95 + hash(i * 1.9) * .55;
      if (i % 3 === 0) paint(ellPts(x * s, (y + .3) * s, cr * 1.1 * s, cr * s, 9), { fill: C.hairDk, fillOp: 120, bleed: .2, ink: null });
      inkLine(arc(x * s, y * s, cr * s * 1.05, cr * s, 2.6 + hash(i) * .6, 2.6 + hash(i) * .6 + 3.6, 8), sw * .8, C.hairLt, 'inkfine', 0);
    }
  }
  // curls that frame the face under the band (temples) + a couple on the forehead
  function hairFront(cx, turn) {
    // hair over the top of the forehead (no skin above the band)
    const cap = arc((cx + turn * .8) * s, -84.4 * s, 7.9 * s, 9.4 * s, Math.PI + .25, TAU - .25, 14); cap.push(Q(cx + 7, -87.6), Q(cx - 7, -87.6));
    paint(cap, { wash: C.hair, fill: C.hairDk, fillOp: 60, tex: .6, ink: null });
    for (let i = 0; i < 6; i++) { const x = cx + turn + (i - 2.5) * 2.4, y = -90.2 - (i % 2) * 1.1; inkLine(arc(x * s, y * s, 1.1 * s, 1 * s, 2.7, 6.2, 7), sw * .8, C.hairLt, 'inkfine', 0); }
    const tuft = (x, y, r, i) => { paint(ellPts(x * s, y * s, r * s, r * .95 * s, 12, s * .06), { wash: C.hair, fill: C.hairDk, fillOp: 60, ink: PAL.ink, sw: sw * .55 }); inkLine(arc(x * s, y * s, r * .55 * s, r * .5 * s, 2.4 + i, 6.2 + i, 7), sw * .45, C.hairLt, 'inkfine', 0); };
    [[-7.4, -86.4, 1.7], [7.4, -86.4, 1.7]].forEach(([x, y, r], i) => { if (Math.abs(turn) > .2 && (i > 0) === (turn > 0)) return; tuft(cx + x * (1 - Math.abs(turn) * .3) + turn * 2, y, r, i); });
    
  }
  // ---------- headband: red band, white zigzag arrows, knot on one side, two tails ----------
  function band(cx, turn, t) {
    const x0 = cx - 12.6 + turn * 2.5, x1 = cx + 12.6 + turn * 2.5, yc = -88.3, top = [], bot = [];
    for (let i = 0; i <= 12; i++) { const k = i / 12, x = lerp(x0, x1, k), d = (k - .5) * 2, lift = -.7 * (1 - d * d); top.push(Q(x, yc - 1.3 + lift)); bot.push(Q(x, yc + 1.25 + lift * .6)); }
    paint([...top, ...bot.reverse()], { wash: C.band, fill: C.bandDk, fillOp: 50, tex: .45, ink: PAL.ink, sw: sw * .95 });
    // the pattern: a white zigzag running along the band, broken by a bigger arrow ">" in the middle
    const ax = cx + turn * 4.2, lf = x => -.7 * Math.pow(1 - Math.pow((x - cx - turn * 2.5) / 12.6, 2), 1);
    for (const dir of [-1, 1]) {
      const zz = []; for (let k = 0; k < 7; k++) { const x = ax + dir * (2.4 + k * 1.3); if (Math.abs(x - cx - turn * 2.5) > 11.2) break; zz.push(Q(x, yc + lf(x) * .8 + (k % 2 ? .65 : -.65))); }
      if (zz.length > 1) inkLine(zz, sw * .7, C.bandLt, 'ink', 0);
    }
    inkLine([Q(ax - 1.1, yc - 1.0 + lf(ax) * .8), Q(ax + .8, yc + lf(ax) * .8), Q(ax - 1.1, yc + 1.0 + lf(ax) * .8)], sw * 1.15, C.bandLt, 'ink', 0);
  }
  function knot(kx, ky) {
    for (const a of [-.9, .7]) paint(ellPts(kx * s + Math.sin(a) * 1.1 * s, ky * s - Math.cos(a) * 1.0 * s, 1.15 * s, 1.35 * s, 12, 0, a), { wash: C.band, fill: C.bandDk, fillOp: 60, ink: PAL.ink, sw: sw * .65 });
    paint(ellPts(kx * s, ky * s, .95 * s, 1.05 * s, 10), { wash: C.bandDk, ink: PAL.ink, sw: sw * .6 });
  }
  function tails(kx, ky, dir, t, wind) {
    [[12.5, 0, -.6, 1.2], [10.2, 1.9, 1.1, 1.05]].forEach(([len, ph, drop, wd]) => {
      const top = [], bot = [], N = 9;
      for (let i = 0; i <= N; i++) {
        const k = i / N, fl = Math.sin(t * 7 * (.6 + .4 * wind) + k * 3 + ph) * 1.1 * k * wind;
        const x = kx + dir * k * len * (.6 + .4 * wind), y = ky + drop * k * 1.4 + Math.pow(k, 1.5) * (6 - wind * 5) + fl, w = wd * (1 - k * .25);
        top.push(Q(x, y - w)); bot.push(Q(x, y + w));
      }
      const e = top[N], eb = bot[N];
      paint([...top, [lerp(e[0], eb[0], .5) - dir * .5 * s, lerp(e[1], eb[1], .5)], ...bot.reverse()], { wash: C.band, fill: C.bandDk, fillOp: 55, tex: .4, ink: PAL.ink, sw: sw * .7 });
    });
  }
  // ---------- face ----------
  function headShape(cx) {
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU, sn = Math.sin(a), lo = Math.max(0, sn);
      pts.push(Q(cx + Math.cos(a) * 7.15 * (1 - .36 * Math.pow(lo, 2.4)), -84.4 + (sn > 0 ? sn * 8.6 : sn * 8.2)));
    }
    return pts;
  }
  function face(cx, spec, o, t) {
    const turn = spec.turn || 0, tf = turn * 2.6, fx = cx + tf;
    const f = o.face || spec.face || 'smile', eyes = o.eyes || spec.eyes || 'normal', br = o.brows || spec.brows;
    // ears
    for (const d of [-1, 1]) { if (turn * d > .2) continue; const ex = cx + d * (7.2 - (turn * d < 0 ? Math.abs(turn) * 1.2 : 0)) + turn * .6; paint(ellPts(ex * s, -82.4 * s, 1.35 * s, 2.0 * s, 12), { wash: C.skin, fill: C.skinDk, fillOp: 50, ink: PAL.ink, sw: sw * .65 }); inkLine([Q(ex + d * .1, -83.4), Q(ex - d * .4, -82.2), Q(ex + d * .1, -81.2)], sw * .4, C.skinDk, 'inkfine', .5); }
    paint(headShape(cx + turn * .8), { wash: C.skin, fill: C.skinDk, fillOp: 22, bleed: .12, tex: .4, border: .5, ink: PAL.ink, sw: sw * 1.05 });
    paint(ellPts((fx - 2.6) * s, -86 * s, 3.4 * s, 2.2 * s, 14), { fill: '#FFFFFF', fillOp: 40, bleed: .25, ink: null });
    // blush, nose
    for (const d of [-1, 1]) paint(ellPts((fx + d * 4.7 * (1 - turn * d * .4)) * s, -79.7 * s, 1.5 * s, .8 * s, 10), { fill: C.blush, fillOp: 70, bleed: .25, ink: null });
    inkLine([Q(fx + .3 + turn, -81.1), Q(fx + .65 + turn, -80.2), Q(fx + .1 + turn, -80.0)], sw * .45, C.skinDk, 'inkfine', .5);
    // brows (thick, dark brown, just under the band)
    const by = br === 'up' ? -86.6 : br === 'down' ? -85.5 : -86.0;
    for (const d of [-1, 1]) {
      let a = 0, b = 0; if (br === 'down') { a = d < 0 ? -.4 : .4; b = -a; } if (br === 'cock' && d > 0) { a = -.9; b = -1.1; } if (br === 'up') { a = d * .2; b = -a; }
      const w = 1 - turn * d * .35, x0 = fx + d * 1.3, x1 = fx + d * 5.4 * w;
      inkLine([Q(x0, by + (d < 0 ? b : a)), Q((x0 + x1) / 2, by - .35 + (a + b) / 2), Q(x1, by + (d < 0 ? a : b))], sw * 1.5, C.hairDk, 'ink', .4);
    }
    // glasses: heavy black square frames
    for (const d of [-1, 1]) {
      const lx = fx + d * 3.7 * (1 - turn * d * .3), lw = 6.2 * (1 - turn * d * .3);
      paint(rrPts((lx - lw / 2) * s, -85.1 * s, lw * s, 4.8 * s, 1.0 * s), { wash: C.frame, ink: null });
      paint(rrPts((lx - lw / 2 + .78) * s, -84.3 * s, (lw - 1.56) * s, 3.2 * s, .5 * s), { wash: C.skin, ink: null });
      paint(rrPts((lx - lw / 2 + .78) * s, -84.3 * s, (lw - 1.56) * s, 3.2 * s, .5 * s), { wash: '#FFFFFF', washOp: 40, ink: null });
    }
    const iL = fx - 3.7 * (1 + turn * .3) + 3.05 * (1 + turn * .3), iR = fx + 3.7 * (1 - turn * .3) - 3.05 * (1 - turn * .3);
    paint(QS([[iL - .3, -84.4], [iR + .3, -84.4], [iR + .3, -83.5], [iL - .3, -83.5]]), { wash: C.frame, ink: null });
    for (const d of [-1, 1]) { if (turn * d > .2) continue; const ox = fx + d * (3.7 + 3.05) * (1 - turn * d * .3); inkLine([Q(ox, -84.3), Q(cx + d * 7.3 + turn * .6, -83.7)], sw * .9, C.frame, 'ink', 0); }
    // eyes
    for (const d of [-1, 1]) {
      const ex = fx + d * 3.7 * (1 - turn * d * .3), ey = -82.5, look = eyes === 'side' ? .7 : 0, dn = eyes === 'down' ? .6 : 0;
      const closedSmile = eyes === 'happy' || (eyes === 'wink' && d > 0);
      if (closedSmile) inkLine([Q(ex - 1.5, ey + .5), Q(ex, ey - .7), Q(ex + 1.5, ey + .5)], sw * .95, PAL.ink, 'ink', .4);
      else if (eyes === 'down') { inkLine([Q(ex - 1.5, ey + .1), Q(ex, ey + .7), Q(ex + 1.5, ey + .1)], sw * .95, PAL.ink, 'ink', .4); }
      else {
        const half = eyes === 'half';
        paint(ellPts((ex + look) * s, (ey + .2 + dn + (half ? .35 : 0)) * s, 1.12 * s, (half ? .85 : 1.42) * s, 12), { wash: C.eye, ink: null });
        paint(ellPts((ex + look + .35) * s, (ey - .3 + dn + (half ? .3 : 0)) * s, .36 * s, .36 * s, 8), { wash: '#FFFFFF', ink: null });
        inkLine([Q(ex - 1.5, ey - (half ? .35 : .9)), Q(ex, ey - (half ? .55 : 1.25)), Q(ex + 1.5, ey - (half ? .35 : .9))], sw * (half ? 1.1 : .8), PAL.ink, 'ink', .4);
      }
    }
    // mouth
    let m = f; if (o.talk !== false && speaking(t) && !['laugh'].includes(f)) m = ['smile', 'grin', 'o'][Math.floor(t * 11) % 3];
    const mx = fx + turn * 1.2, my = -78.5;
    if (m === 'smile') inkLine([Q(mx - 1.9, my - .3), Q(mx, my + .6), Q(mx + 1.9, my - .3)], sw * .62, PAL.ink, 'ink', .5);
    else if (m === 'smirk') { inkLine([Q(mx - 1.8, my + .1), Q(mx + .3, my + .55), Q(mx + 2.2, my - .7)], sw * .62, PAL.ink, 'ink', .5); }
    else if (m === 'flat') inkLine([Q(mx - 1.4, my), Q(mx + 1.4, my)], sw * .9, PAL.ink, 'ink', 0);
    else if (m === 'o') paint(ellPts(mx * s, (my + .2) * s, .9 * s, 1.1 * s, 10), { wash: C.mouth, ink: PAL.ink, sw: sw * .6 });
    else {   // grin / laugh: open D with teeth (+ tongue when laughing)
      const lo = m === 'laugh' ? 3.2 : 1.9;
      paint([Q(mx - 2.6, my - .6), Q(mx + 2.6, my - .6), Q(mx + 1.6, my + lo * .8), Q(mx, my + lo), Q(mx - 1.6, my + lo * .8)], { wash: C.mouth, ink: PAL.ink, sw: sw * .75, curv: .45 });
      paint(rectPts((mx - 2.1) * s, (my - .55) * s, 4.2 * s, .75 * s), { wash: '#FFFFFF', ink: null });
      if (m === 'laugh') paint(ellPts(mx * s, (my + lo - .9) * s, 1.4 * s, .7 * s, 12), { wash: C.blush, ink: null });
    }
  }
  // ---------- body ----------
  function torso(cut, turn) {
    const hem = cut ?? -47, tw = (y) => lerp(10.4, 11.0, (y + 71) / 24);
    if (cut) for (const d of [-1, 1]) paint(QS([[d * 9.6, -72.4], [d * 13.4, -69.6], [d * 14.6, cut], [d * 9.8, cut]]), { wash: C.jacket, fill: C.jacketDk, fillOp: 55, tex: .5, ink: PAL.ink, sw: sw * .9, curv: .2 });   // bust: sleeve caps
    // tee
    paint(QS([[-5.4, -73.6], [5.4, -73.6], [5.8, cut ? hem : -50], [-5.8, cut ? hem : -50]]), { wash: C.tee, fill: C.teeDk, fillOp: 40, tex: .3, ink: PAL.ink, sw: sw * .7 });
    inkLine(QS(arc(0, -73.7, 3.1, 1.6, .15, Math.PI - .15, 8)), sw * .6, C.teeDk, 'inkfine', .5);
    if (!cut) {   // belt + buckle between the open jacket panels
      paint(rectPts(-6.4 * s, -51.4 * s, 12.8 * s, 2.5 * s), { wash: '#1E1A1D', ink: PAL.ink, sw: sw * .6 });
      paint(rrPts(-1.5 * s, -51.7 * s, 3 * s, 3.1 * s, .4 * s), { wash: C.metal, ink: PAL.ink, sw: sw * .5 });
      paint(rectPts(-.8 * s, -51 * s, 1.6 * s, 1.6 * s), { wash: '#1E1A1D', ink: null });
    }
    // jacket panels (open), boxy, hem at the hips
    for (const d of [-1, 1]) {
      const out = d * tw(hem), sh = d * 11.0, iTop = d * 3.4, iBot = d * 4.6;
      const pnl = [[d * 4.9, -74.6], [d * 8.2, -73.0], [sh, -71.0], [d * 11.9, -66], [out * 1.02, hem], [iBot, hem + .2], [d * 4.2, -60], [iTop, -71.5]];
      paint(QS(pnl), { wash: C.jacket, fill: C.jacketDk, fillOp: 55, bleed: .1, tex: .55, border: .45, ink: PAL.ink, sw: sw, curv: .08 });
      paint(ellPts(d * 7.6 * s, -68 * s, 3 * s, 2 * s, 12), { fill: C.jacketLt, fillOp: 90, bleed: .25, ink: null });
      if (!cut) inkLine(QS([[d * 10.6, -64], [d * 10.9, -50]]), sw * .5, C.jacketDk, 'inkfine', .5);   // side seam shade
      // chest flap pocket + snap
      const px = d * 7.3;
      paint(rrPts((px - 2.6) * s, -66 * s, 5.2 * s, 5.4 * s, .5 * s), { wash: C.jacket, fill: C.jacketDk, fillOp: 40, ink: PAL.ink, sw: sw * .6 });
      paint(QS([[px - 2.8, -66.4], [px + 2.8, -66.4], [px + 2.6, -64.4], [px - 2.6, -64.4]]), { wash: C.jacketDk, fill: C.jacket, fillOp: 50, ink: PAL.ink, sw: sw * .6 });
      paint(ellPts(px * s, -64.9 * s, .38 * s, .38 * s, 8), { wash: C.metal, ink: PAL.ink, sw: sw * .3 });
      // placket snaps
      if (d > 0) for (const yy of [-66, -60, -54]) if (yy > hem + 1) paint(ellPts((iTop + .9 + (yy + 66) * .02) * s, yy * s, .3 * s, .3 * s, 8), { wash: C.metal, ink: null });
      // collar: stands up beside the neck, then folds into the lapel
      paint(QS([[d * 2.5, -73.4], [d * 4.1, -77.0], [d * 7.9, -72.4], [d * 5.4, -69.6], [d * 3.6, -71.6]]), { wash: C.jacketDk, fill: C.jacket, fillOp: 60, ink: PAL.ink, sw: sw * .8, curv: .1 });
    }
    if (!cut) for (const d of [-1, 1]) inkLine(QS([[d * 4.6, -47.6], [d * 11, -47.8]]), sw * .45, C.jacketDk, 'inkfine', 0);   // hem band
  }
  function bagAndStrap(sit) {
    const by = sit ? -38 : -57;
    // strap: viewer-right shoulder → viewer-left hip, with a slider
    const sp = [[6.6, -73.6], [2.6, -67.5], [-3.6, -61.5], [-8.4, by + 1.6]];
    const rib = [], rb = []; sp.forEach(([x, y], i) => { rib.push(Q(x + .95, y + .65)); rb.push(Q(x - .95, y - .65)); });
    paint([...rib, ...rb.reverse()], { wash: C.bag, fill: C.bagLt, fillOp: 50, ink: PAL.ink, sw: sw * .6 });
    paint(QS([[1.4, -67.6], [3.6, -65.6], [2.8, -64.6], [.6, -66.6]]), { wash: C.metal, ink: PAL.ink, sw: sw * .45 });
    // the bag on the viewer-left hip
    const bx = -15.6, bw = 9.4, bh = 8.6;
    paint(rrPts(bx * s, by * s, bw * s, bh * s, 1.3 * s), { wash: C.bag, fill: C.bagLt, fillOp: 45, tex: .4, ink: PAL.ink, sw: sw * .9 });
    paint(rrPts((bx + .4) * s, (by - .2) * s, (bw - .8) * s, 4.2 * s, 1 * s), { wash: '#332B29', ink: PAL.ink, sw: sw * .7 });   // flap
    paint(rectPts((bx + 1) * s, (by + 2.4) * s, (bw - 2) * s, .8 * s), { wash: C.band, ink: null });                         // red trim
    paint(rrPts((bx + bw / 2 - .9) * s, (by + 3.2) * s, 1.8 * s, 2.4 * s, .3 * s), { wash: C.metal, ink: PAL.ink, sw: sw * .4 });
    paint(rrPts((bx + 1) * s, (by + 5.4) * s, 1.4 * s, 2.6 * s, .4 * s), { wash: C.band, ink: PAL.ink, sw: sw * .4 });       // red pull tab
    inkLine([Q(bx + bw - 1.4, by + bh - .3), Q(bx + bw - .9, by + bh + 1.6), Q(bx + bw - 1.7, by + bh + 2.3), Q(bx + bw - 2.1, by + bh + 1.2)], sw * .55, C.metal, 'ink', .6);   // carabiner
  }
  function shoe(fx, d, lift = 0) {
    push(); translate(fx * s, 0); if (lift) { translate(0, -lift * s); rotate(-d * .32); }
    const X = (x, y) => [d * x * s, y * s];
    paint([X(-6.2, -2.4), X(-6.0, -6.2), X(-3.6, -8.4), X(1.2, -8.8), X(4.8, -7.2), X(6.9, -4.4), X(7.1, -2.4)], { wash: C.shoe, fill: '#46444F', fillOp: 40, ink: PAL.ink, sw: sw * .85, curv: .25 });
    paint([X(-6.2, -2.4), X(-6.0, -5.6), X(-4.0, -6.2), X(-3.6, -2.4)], { wash: C.lace, fill: C.bandDk, fillOp: 40, ink: PAL.ink, sw: sw * .55 });   // red heel
    paint(ellPts(d * 4.5 * s, -3.6 * s, 2.9 * s, 1.9 * s, 14), { wash: C.sole, ink: PAL.ink, sw: sw * .6 });                                    // toe cap
    paint(rrPts(-7 * s, -2.7 * s, 14.4 * s, 2.7 * s, 1 * s), { wash: C.sole, fill: '#D9D3C8', fillOp: 40, ink: PAL.ink, sw: sw * .75 });
    for (let k = 0; k < 3; k++) inkLine([X(-1.6 + k * 1.5, -8.0 + k * .45), X(.6 + k * 1.5, -6.6 + k * .45)], sw * .75, C.lace, 'ink', 0);    // red laces
    pop();
  }
  function legs(mode) {
    const L = mode === 'walk' ? [[-10, 2.6, 1], [11.6, 0, 0]] : mode === 'wide' ? [[-13.6, 0, 0], [13.6, 0, 0]] : [[-12.6, 0, 0], [12.6, 0, 0]];
    L.forEach(([fx, lift], i) => shoe(fx, i ? 1 : -1, lift));
    L.forEach(([fx, lift], i) => {
      const d = i ? 1 : -1, hy = -7 - lift;
      const leg = [[d * .2, -49.4], [d * 11.1, -49.4], [d * 12.1, -40], [lerp(d * 12.1, fx + d * 6.3, .5) + d * .9, (-40 + hy) / 2], [fx + d * 6.3, hy - 1], [fx + d * 6.0, hy], [fx - d * 5.6, hy], [fx - d * 5.1, hy - 1], [d * .9, -40.2]];
      paint(QS(leg), { wash: C.pants, fill: C.pantsLt, fillOp: 50, tex: .5, ink: PAL.ink, sw: sw * .95, curv: .06 });
      inkLine(QS([[d * 11.2, -44], [fx + d * 5.0, hy - 2]]), sw * .7, C.rim, 'inkfine', .3);                    // warm rim light
      inkLine(QS([[lerp(d * 1, fx, .45), -30], [lerp(d * 2, fx, .55) + d * 1.5, -24], [lerp(d * 1.5, fx, .62), -18]]), sw * .45, C.pantsLt, 'inkfine', .5);   // fold
      // cargo pocket on the outer thigh (pokes out of the silhouette a little)
      const oy = -32, ox = lerp(d * 11.9, fx + d * 6.3, (oy + 40) / (hy + 40)) + d * .8;
      paint(QS([[ox - d * 5.2, oy - 4], [ox + d * .3, oy - 4.2], [ox + d * .6, oy + 4.6], [ox - d * 5.0, oy + 4.8]]), { wash: C.pants, fill: '#1C181A', fillOp: 50, ink: PAL.ink, sw: sw * .7 });
      paint(QS([[ox - d * 5.5, oy - 4.6], [ox + d * .6, oy - 4.8], [ox + d * .6, oy - 2.1], [ox - d * 5.3, oy - 1.9]]), { wash: '#1C181A', fill: C.pantsLt, fillOp: 40, ink: PAL.ink, sw: sw * .65 });
      inkLine(QS([[ox - d * 4.8, oy + 4.2], [ox + d * .2, oy + 4.1]]), sw * .5, C.rim, 'inkfine', 0);
      // front pocket opening
      inkLine(QS([[d * 6.6, -48.6], [d * 9.4, -43.6], [d * 11.2, -42.8]]), sw * .55, '#141113', 'ink', .5);
    });
  }
  function sitLegs() {
    // the crate he sits on: wide enough to show on both sides of his legs
    paint(rrPts(-19 * s, -25 * s, 36 * s, 25 * s, .6 * s), { wash: C.wood, fill: C.woodDk, fillOp: 60, tex: .6, ink: PAL.ink, sw: sw * .9 });
    for (const yy of [-17, -8.5]) inkLine([Q(-18.6, yy), Q(16.6, yy)], sw * .55, C.woodDk, 'inkfine', 0);
    for (const xx of [-19, 14]) paint(rrPts(xx * s, -25 * s, 3 * s, 25 * s, .3 * s), { wash: '#B48852', ink: PAL.ink, sw: sw * .55 });
    paint(rrPts(-19.6 * s, -26.4 * s, 37.2 * s, 2.2 * s, .4 * s), { wash: '#D8B27C', ink: PAL.ink, sw: sw * .6 });
    for (const d of [-1, 1]) {
      const kx = d * 8.4, fx = d * 10.6;
      shoe(fx, d, 0);
      paint(QS([[kx - d * 4.8, -22], [kx + d * 4.6, -22], [fx + d * 5.4, -7], [fx - d * 5.4, -7]]), { wash: C.pants, fill: C.pantsLt, fillOp: 45, tex: .5, ink: PAL.ink, sw: sw * .9 });   // shin
      paint(QS([[d * .6, -36.5], [d * 11.4, -36.5], [kx + d * 5.2, -26.5], [kx + d * 4.8, -21.4], [kx - d * 5.0, -21.4], [d * .6, -28]]), { wash: C.pants, fill: C.pantsLt, fillOp: 50, tex: .5, ink: PAL.ink, sw: sw * .95, curv: .12 });   // thigh toward us
      inkLine(QS([[kx - d * 3.8, -21.8], [kx + d * 3.6, -21.8]]), sw * .5, C.rim, 'inkfine', 0);
      inkLine(QS([[fx + d * 4.6, -18], [fx + d * 4.9, -9]]), sw * .6, C.rim, 'inkfine', 0);
      paint(QS([[fx + d * 4.4, -18.6], [fx + d * 6.7, -18.8], [fx + d * 6.6, -12.2], [fx + d * 4.6, -12]]), { wash: '#1C181A', ink: PAL.ink, sw: sw * .55 });   // cargo pocket
    }
  }
  // ---------- arms ----------
  function hand(kind, cum, side, hold) {
    if (hold) { push(); rotate(-cum); hold(s, sw); pop(); }
    const sk = { wash: C.skin, fill: C.skinDk, fillOp: 45, tex: .3, ink: PAL.ink, sw: sw * .7 };
    if (kind === 'pocket') return;
    if (kind === 'point') { paint(rrPts(-.75 * s, 0, 1.5 * s, 5.2 * s, .7 * s), sk); }
    if (kind === 'thumb') paint(rrPts(-.8 * s, -4.6 * s, 1.7 * s, 4.4 * s, .8 * s), sk);
    if (kind === 'open' || kind === 'palm') for (let f = -1.5; f <= 1.5; f++) { push(); rotate(f * .28); paint(rrPts(-.55 * s, .4 * s, 1.1 * s, 4.0 * s, .55 * s), sk); pop(); }
    paint(ellPts(0, 0, 2.2 * s, 2.35 * s, 14), sk);
    if (kind === 'fist' || kind === 'point' || kind === 'thumb') inkLine([[-1.4 * s, .9 * s], [0, 1.3 * s], [1.4 * s, .9 * s]], sw * .4, C.skinDk, 'inkfine', .5);
  }
  function arm(side, spec, t, hold) {
    const [a1, a2, hk, wa] = spec;
    push(); translate(side * SH * s, SHY * s); rotate(-side * a1);
    // sleeve (upper arm), puffy
    paint(QS([[-4.0, -2.6], [4.0, -2.6], [4.3, 6], [3.8, UP + .8], [-3.8, UP + .8], [-4.3, 6]]), { wash: C.jacket, fill: C.jacketDk, fillOp: 55, tex: .5, ink: PAL.ink, sw: sw * .9, curv: .3 });
    inkLine(QS([[side * -1.2, 3], [side * -1.6, 9], [side * -.6, 13]]), sw * .45, C.jacketDk, 'inkfine', .5);
    translate(0, UP * s); rotate(-side * a2);
    // forearm, then the rolled cuff over its top
    const fl = hk === 'pocket' ? FORE - 1.6 : FORE;
    paint(rrPts(-1.85 * s, 1 * s, 3.7 * s, (fl - .6) * s, 1.6 * s), { wash: C.skin, fill: C.skinDk, fillOp: 40, tex: .3, ink: PAL.ink, sw: sw * .75 });
    paint(rrPts(-3.7 * s, -1.8 * s, 7.4 * s, 4.6 * s, 1.5 * s), { wash: C.jacket, fill: C.jacketDk, fillOp: 60, tex: .4, ink: PAL.ink, sw: sw * .8 });
    inkLine(QS([[-3, .5], [3, .5]]), sw * .45, C.jacketDk, 'inkfine', 0);
    if (hk === 'pocket') { inkLine(QS([[-2.6, fl - .2], [0, fl + .5], [2.6, fl - .2]]), sw * .9, '#141113', 'ink', .5); pop(); return; }
    translate(0, FORE * s);
    const cum = -side * (a1 + a2);
    if (wa != null) rotate(-cum + wa);
    hand(hk, wa != null ? wa : cum, side, hold);
    pop();
  }
  function handAt(spec, side, h, sitDy = 0) {
    const S = h / 100, [a1, a2] = side < 0 ? spec.L : spec.R, R = (th, d) => [-Math.sin(th) * d, Math.cos(th) * d];
    const th1 = -side * a1, e = R(th1, UP * S), f = R(th1 - side * a2, FORE * S);
    return [side * SH * S + e[0] + f[0], (SHY + sitDy) * S + e[1] + f[1]];
  }
  function ticks(x0, y0, side, k) {
    for (const [a, l] of [[-.55, 2.2], [0, 2.8], [.55, 2.2]]) { const ang = -Math.PI / 2 + side * (.75 + a); inkLine([Q(x0 + Math.cos(ang) * 2.6, y0 + Math.sin(ang) * 2.6), Q(x0 + Math.cos(ang) * (2.6 + l * k), y0 + Math.sin(ang) * (2.6 + l * k))], sw * 1.1, C.tick, 'ink', 0); }
  }
  function clipboard() {
    push(); translate(7.4 * s, -63.4 * s); rotate(.16);
    paint(rrPts(-5.2 * s, -7.2 * s, 10.4 * s, 13.8 * s, .7 * s), { wash: '#D8BC92', fill: '#B8956A', fillOp: 50, tex: .5, ink: PAL.ink, sw: sw * .85 });
    paint(rrPts(-1.8 * s, -7.8 * s, 3.6 * s, 1.8 * s, .4 * s), { wash: '#3A3438', ink: PAL.ink, sw: sw * .5 });
    paint(ellPts(0, -.6 * s, 2.2 * s, 2.2 * s, 18), { wash: C.band, washOp: 70, ink: C.band, sw: sw * .7 });
    paint(ellPts(0, -.6 * s, 1.1 * s, 1.1 * s, 12), { ink: C.band, sw: sw * .5 });
    pop();
  }
  function laptopLap() {   // on his knees, lid toward us, turned a little to the viewer's right (drawn in hip-dropped space)
    paint(QS([[-6.8, -37.6], [13.6, -37.2], [14.8, -35.4], [-7.6, -35.8]]), { wash: '#B9B6C2', ink: PAL.ink, sw: sw * .7 });
    paint(QS([[-6.4, -37.4], [13.2, -37.0], [15.6, -51.4], [-2.6, -52.6]]), { wash: '#A6A2B0', fill: '#77738A', fillOp: 50, tex: .4, ink: PAL.ink, sw: sw * .95 });
    paint(ellPts(5.4 * s, -45 * s, 1.5 * s, 1.5 * s, 14), { wash: '#F2F0F6', ink: null });
  }
  function kaiV3(pose, x, y, h, o = {}) {
    const spec = P[pose] || P.front, t = T, bust = !!spec.bust, wind = o.wind ?? .8;
    s = bust ? h / 40 : h / 100; sw = clamp(s * .2, .3, 2.2);
    const turn = spec.turn || 0, side = o.tails ?? spec.tails ?? -1, sit = !!spec.sit, dy = sit ? 11.5 : 0;
    if (!bust && o.shadow !== false) paint(ellPts(x, y + 2, 21 * s, 2.8 * s, 20), { fill: PAL.ink, fillOp: 80, bleed: .25, ink: null });
    push(); translate(x, y); if (o.rot) rotate(o.rot);
    if (bust) translate(0, 61 * s);
    scale((o.flip ? -1 : 1) * (1 + (o.sq || 0) * .5), (1 - (o.sq || 0)) * (1 + Math.sin(t * 2.4) * .004));
    if (!bust) { if (sit) sitLegs(); else legs(spec.legs); }
    push(); translate(0, dy * s);   // sitting: everything above the hips drops onto the crate
    const doArm = (sd) => arm(sd, sd < 0 ? spec.L : spec.R, t, sd < 0 ? o.holdL : o.holdR);
    if (!bust && spec.behindR) doArm(1);
    hairCloud(turn * 1.5, t);
    torso(bust ? -60.5 : null, turn);
    if (!bust && o.bag !== false) bagAndStrap(false);
    paint(rrPts(-2.2 * s, -77.6 * s, 4.4 * s, 5.4 * s, 1.4 * s), { wash: C.skinDk, fill: C.skin, fillOp: 40, ink: PAL.ink, sw: sw * .6 });   // neck
    face(0, spec, o, t);
    hairFront(0, turn);
    band(0, turn, t);
    const kx = side * 12.4 + turn * 2.5, ky = -88.4;
    if (!spec.grip) { tails(kx + side * .6, ky, side, t, wind); knot(kx, ky); }
    if (!bust) {
      if (sit) { doArm(-1); doArm(1); laptopLap(); }
      else { if (!spec.behindR) doArm(1); doArm(-1); }
      if (spec.clip) { clipboard(); const [hx, hy] = handAt(spec, 1, 100); paint(ellPts(hx * s, hy * s, 2.1 * s, 2.3 * s, 14), { wash: C.skin, fill: C.skinDk, fillOp: 40, ink: PAL.ink, sw: sw * .7 }); paint(rrPts((hx - 2.4) * s, (hy - .8) * s, 2.6 * s, 1.5 * s, .7 * s), { wash: C.skin, ink: PAL.ink, sw: sw * .5 }); }
      if (spec.grip) { const [hx, hy] = handAt(spec, -1, 100); tails(hx + .6, hy - .6, -1, t, wind); knot(-11.4, -88.8); }
    }
    const tk = o.ticks ?? spec.ticks ?? 0;
    if (tk) { ticks(side * -15.6, -98, -side, tk); if (bust || pose === 'tighten') ticks(side * 16.6, -91, side, tk * .9); }
    pop();
    pop();
  }
  // World position of a hand: kaiV3.hand(pose, side, x, y, h). side -1 = viewer-left. Full-body poses, no flip/rot.
  kaiV3.hand = (pose, side, x, y, h) => { const spec = P[pose] || P.front, [hx, hy] = handAt(spec, side, h, spec.sit ? 11.5 : 0); return [x + hx, y + hy]; };
  kaiV3.poses = Object.keys(P);
  kaiV3.C = C;
  return kaiV3;
})();
// Opt-in through the old call: kai(pose, x, y, h, { look: 'v3' }). Any call without look:'v3' draws exactly as before.
if (typeof kai === 'function') { const kaiBeforeV3 = kai; kai = (pose, x, y, h, o = {}) => (o && o.look === 'v3') ? kaiV3(pose, x, y, h, o) : kaiBeforeV3(pose, x, y, h, o); }
