// c2_checks.js: the three checks, lines l02–l04. One shot per check, the same staging each time so they read as a
// set: a header (number + name), the phone showing the problem and then the fix, and Clawd reacting beside it.
//   1 THE HOOK    a dead, sleepy frame; on "move" a ball starts bouncing; "first second" gets a 0:01 chip
//   2 CAPTIONS    a talking head; on "off" the speaker is crossed out; on "follow" captions appear
//   3 SAFE ZONE   text sits under the buttons; "safe zone" draws the zone; on "away" the text slides into it
(() => {
  const START = cutAfter('l01'), CUT2 = cutAfter('l02'), CUT3 = cutAfter('l03'), END = cutAfter('l04');
  const PX = 640, PY = 830, PS = .95, GROUND = 1272, CX = 222, U = 27;
  const at = (rot, sx, sy) => phoneAt(PX, PY, PS, rot, sx, sy);

  // shared staging: background, camera, header, phone, Clawd. c = { n, title, col, bg, blobs, t0, hits, keys, screen, extra }
  function stage(t, c) {
    boilSeed('bg');
    bgWash(t, c.bg, { blobs: c.blobs, op: 60 });
    const sh = c.hits.reduce((s, h) => { const a = t - h; const v = a > 0 && a < .3 ? shakeXY(t, 10 * (1 - a / .3)) : [0, 0]; return [s[0] + v[0], s[1] + v[1]]; }, [0, 0]);
    const punch = c.hits.reduce((s, h) => s + (t > h ? .035 * Math.exp(-(t - h) * 6) : 0), 0);
    camBegin(540 + Math.sin(t * 1.1) * 9 + sh[0], 960 + Math.cos(t * .9) * 10 + sh[1], 1.0 + .03 * seg(t, c.t0, c.t1) + punch, Math.sin(t * .8) * .006);
    const rot = Math.sin(t * 1.7) * .014 + c.hits.reduce((s, h) => s + spring(t, h, 6, 22) * .035, 0);
    boilSeed('phone');
    phone(PX, PY + Math.sin(t * 2.2) * 6, PS, { rot, bg: c.screenBg || '#FFFBF1', screen: (w, h) => c.screen(w, h, t) });
    if (c.extra) c.extra(t, rot);
    clawd(CX, GROUND, U, { ...emotions(t, c.keys), lookX: .7, boilKey: 'clawd' });
    camEnd();
    boilSeed('header');
    stepHeader(t, c.t0 + .06, c.n, c.title, c.col);
  }

  // ---------- 1: the hook ----------
  const HK = { move: vo('move', 1, 'l02'), first: vo('first', 1, 'l02'), second: vo('second', 1, 'l02') };
  function hookScreen(w, h, t) {
    const live = clamp((t - HK.move) / .25);
    paint(rrPts(14, 56, w - 28, h - 120, 26, 1), { wash: mixCol('#CFC8BC', PAL.sky, live), washOp: 255, ink: null });
    paint(rectPts(14, h - 190, w - 28, 126, 1), { wash: mixCol('#B5AEA2', PAL.sap, live), washOp: 255, ink: null });
    if (live <= 0) { codeBars(60, 150, 200, 4, 3, { lh: 40, th: 16, cols: ['#B5AEA2', '#A69F93'] }); return; }
    // the ball: bouncing left to right and back, squashing on each landing
    const a = t - HK.move, ph = frac(a / .46), x = 70 + 190 * (.5 - .5 * Math.cos(a * 2.6)), floor = h - 200, y = floor - 300 * 4 * ph * (1 - ph) * (.55 + .45 * Math.exp(-a * .4));
    const sq = ph < .12 || ph > .9 ? .22 : -.08;
    for (let k = 1; k < 4; k++) { const p2 = frac((a - k * .035) / .46); paint(ellPts(x - k * 9, floor - 300 * 4 * p2 * (1 - p2) * (.55 + .45 * Math.exp(-a * .4)) - 30, 26 - k * 5, 26 - k * 5, 12), { wash: PAL.clayLt, washOp: 170 - k * 40, ink: null }); }
    paint(ellPts(x, y - 34 * (1 - sq), 36 * (1 + sq), 36 * (1 - sq), 18, 1), { wash: PAL.clay, washOp: 255, fill: PAL.clayDk, fillOp: 50, tex: .4, ink: PAL.ink, sw: 1.2 });
  }
  const shot1 = t => stage(t, {
    n: 1, title: 'THE HOOK', col: PAL.teal, bg: '#E9F3EE', blobs: [PAL.sky, '#BFE3D6', PAL.sky], t0: START, t1: CUT2, hits: [HK.move],
    keys: [[START - 1, 'bored'], [HK.move, 'surprised', { emote: '!' }], [HK.first, 'excited']],
    screen: hookScreen,
    extra: (t, rot) => {
      if (t < HK.move) { boilSeed('zzz'); emote('zzz', ...at(rot, 250, 120), 46, clamp((t - START - .5) / .3), t - START); }
      burst(...at(rot, 164, 300), t - HK.move, PAL.teal, { r: 250, len: 80, n: 14, sw: 1.8, life: .32 });
      chip(PX, 1238, '0:00 → 0:01', { size: 50, pop: (t - HK.first) / .25, bg: PAL.ochre });
      burst(PX, 1238, t - HK.second, PAL.ochre, { r: 210, len: 40, n: 12, sw: 1.4, life: .28 });
    },
  });

  // ---------- 2: captions ----------
  const C = { off: vo('off', 1, 'l03'), sound: vo('sound', 1, 'l03'), follow: vo('follow', 1, 'l03'), people: vo('people', 1, 'l03') };
  function capScreen(w, h, t) {
    paint(rrPts(14, 56, w - 28, h - 120, 26, 1), { wash: '#E4DAF2', washOp: 255, ink: null });
    // a talking head
    const talk = .5 + .5 * Math.sin(t * 17) * Math.sin(t * 5.3), bob = Math.sin(t * 3) * 5;
    paint(ellPts(w / 2, 470 + bob, 150, 170, 22, 1), { wash: PAL.violet, washOp: 255, ink: PAL.ink, sw: 1.2 });
    paint(ellPts(w / 2, 270 + bob, 86, 92, 22, 1), { wash: PAL.clayLt, washOp: 255, ink: PAL.ink, sw: 1.2 });
    for (const s of [-1, 1]) paint(ellPts(w / 2 + s * 30, 255 + bob, 8, 12, 10), { wash: PAL.ink, ink: null });
    paint(ellPts(w / 2, 305 + bob, 22, 5 + 15 * talk, 12), { wash: PAL.ink, ink: null });
    paint(rectPts(14, h - 260, w - 28, 196, 1), { wash: '#E4DAF2', washOp: 255, ink: null });   // crops the shoulders
    // captions on the phone, from "follow": three word pills, the highlight stepping along
    const a = t - C.follow;
    if (a > 0) {
      const on = Math.floor(a / .22) % 3, ws = [84, 66, 96]; let x = (w - (ws[0] + ws[1] + ws[2] + 24)) / 2;
      ws.forEach((bw, i) => {
        const k = backOut(clamp((a - i * .06) / .2));
        if (k > .02) paint(rrPts(x, h - 190 - 14 * (k - 1), bw, 40 * k, 20 * k, 1), { wash: i === on ? PAL.ochre : PAL.cream, washOp: 255, ink: PAL.ink, sw: 1 });
        x += bw + 12;
      });
    }
  }
  const shot2 = t => stage(t, {
    n: 2, title: 'CAPTIONS', col: PAL.violet, bg: '#F1EBF8', blobs: ['#D3C6EC', PAL.rose, '#D3C6EC'], t0: CUT2, t1: CUT3, hits: [C.off, C.follow],
    keys: [[CUT2 - 1, 'happy'], [C.off, 'confused'], [C.follow, 'excited']],
    screen: capScreen,
    extra: (t, rot) => {
      // speaker above the phone's top-right corner: waves while there is sound, a cross once it's off
      boilSeed('speaker');
      const [sx, sy] = at(rot, 322, 96), k = backOut(clamp((t - C.sound + .15) / .25)), s = 1.5 * k;
      if (k < .02) return;
      paint(ellPts(sx + 8, sy, 70 * k, 70 * k, 22, 1.5), { wash: PAL.cream, washOp: 255, ink: PAL.ink, sw: 1.3 });
      paint([[-24, -10], [-8, -10], [10, -26], [10, 26], [-8, 10], [-24, 10]].map(([a, b]) => [sx + a * s, sy + b * s]), { wash: PAL.ink, ink: null });
      if (t < C.off) for (let i = 0; i < 2; i++) { const r = (20 + i * 14 + 4 * Math.sin(t * 12 - i)) * s; inkLine(ellPts(sx + 10 * s, sy, r, r, 16, 0, -.7).slice(0, 5), 1.6, PAL.ink, 'ink', .7); }
      else {
        const q = easeOut(clamp((t - C.off) / .14));
        inkLine([[sx - 34 * s, sy - 34 * s], [sx - 34 * s + 84 * s * q, sy - 34 * s + 68 * s * q]], 4, '#D8453A', 'ink', 0);
        burst(sx, sy, t - C.off, '#D8453A', { r: 90, len: 50, n: 10, sw: 1.8, life: .3 });
      }
      burst(...at(rot, 164, 520), t - C.follow, PAL.ochre, { r: 190, len: 60, n: 12, sw: 1.6, life: .3 });
    },
  });

  // ---------- 3: the safe zone ----------
  const Z = { safe: vo('safe', 1, 'l04'), zone: vo('zone', 1, 'l04'), away: vo('away', 1, 'l04'), buttons: vo('buttons', 1, 'l04'), text: vo('text', 1, 'l04') };
  function safeScreen(w, h, t) {
    paint(rrPts(14, 56, w - 28, h - 120, 26, 1), { wash: '#F6E7C4', washOp: 255, fill: PAL.ochre, fillOp: 30, tex: .5, ink: null });
    // the app's buttons: a column on the right, a bar along the bottom
    const bp = t > Z.buttons ? 1 + .35 * Math.exp(-(t - Z.buttons) * 6) * Math.abs(Math.cos((t - Z.buttons) * 14)) : 1;
    [0, 1, 2].forEach(i => paint(i ? ellPts(282, 360 + i * 78, 22 * bp, 22 * bp, 16, 1) : heartPts(282, 360, 24 * bp), { wash: i ? PAL.cream : PAL.rose, washOp: 255, ink: PAL.ink, sw: 1 }));
    paint(rrPts(30, h - 142, w - 60, 56, 28, 1), { wash: PAL.cream, washOp: 255, ink: PAL.ink, sw: 1 });
    // the zone: a dashed frame that draws itself round the clear area
    const zx = 36, zy = 96, zw = 200, zh = 410, zk = easeOut(seg(t, Z.safe, Z.zone + .25)), ok = t > Z.away + .2;
    if (zk > 0) {
      const per = 2 * (zw + zh), n = Math.floor(44 * zk);
      for (let i = 0; i < n; i += 2) {
        const P = [i, i + 1].map(j => { let d = j / 44 * per; if (d < zw) return [zx + d, zy]; d -= zw; if (d < zh) return [zx + zw, zy + d]; d -= zh; if (d < zw) return [zx + zw - d, zy + zh]; return [zx, zy + zh - (d - zw)]; });
        inkLine(P, 2.4, ok ? PAL.sap : PAL.teal, 'ink', 0);
      }
    }
    // the text block: starts under the buttons (bad), slides into the zone on "away"
    const m = backOut(seg(t, Z.away, Z.away + .35)), tx = lerp(150, 60, m), ty = lerp(430, 250, m), badK = 1 - clamp((t - Z.away) / .2);
    const wig = badK * Math.sin(t * 22) * 3 * (t > Z.text ? 1 : .3);
    [150, 120, 138].forEach((bw, i) => paint(rrPts(tx + wig, ty + i * 44, bw, 26, 13, 1), { wash: mixCol(PAL.ink, '#D8453A', badK * .8), washOp: 255, ink: null }));
  }
  const shot3 = t => stage(t, {
    n: 3, title: 'SAFE ZONE', col: PAL.ochre, bg: '#FBF1DC', blobs: [PAL.ochre, PAL.clayLt, PAL.ochre], t0: CUT3, t1: END, hits: [Z.away, Z.buttons],
    keys: [[CUT3 - 1, 'nervous'], [Z.away, 'relieved'], [Z.buttons, 'proud']],
    screen: safeScreen,
    extra: (t, rot) => {
      boilSeed('fx3');
      if (t < Z.away) emote('!', ...at(rot, 236, 388), 40, clamp((t - CUT3 - .45) / .25) * (.8 + .2 * Math.sin(t * 10)), t - CUT3);
      tick(...at(rot, 136, 480), 34, t - Z.away - .3, PAL.sap, 3.4);
      burst(...at(rot, 136, 300), t - Z.away - .3, PAL.sap, { r: 150, len: 50, n: 12, sw: 1.6, life: .3 });
      burst(...at(rot, 282, 430), t - Z.buttons, PAL.rose, { r: 120, len: 44, n: 10, sw: 1.5, life: .28 });
    },
  });

  chapter('checks', START, END, [[START, shot1], [CUT2, shot2], [CUT3, shot3]], { wipe: [PAL.teal, '#BFE3D6'], shotWipes: [[PAL.violet, '#D3C6EC'], [PAL.ochre, PAL.clayLt]] });
})();
