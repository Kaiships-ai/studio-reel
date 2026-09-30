// c1_hook.js: the hook, line l01: "Wait! Before you post that reel, check three things."
// Frame 0 is already moving: a phone drops in and a thumb heads for POST. On "Wait!" Clawd leaps in and the thumb
// recoils (the surprise). "post" rings the button, then on "check three things" the phone lifts and 1, 2, 3 pop in.
(() => {
  const END = cutAfter('l01');
  const T_WAIT = vo('wait'), T_BEFORE = vo('before'), T_POST = vo('post'), T_REEL = vo('reel'), T_CHECK = vo('check'), T_THREE = vo('three'), T_THINGS = vo('things');
  const T_NUM = [T_THREE, (T_THREE + T_THINGS) / 2, T_THINGS];
  const COLS = [PAL.teal, PAL.violet, PAL.ochre];

  // the reel on the phone: a little landscape, a play mark, and the POST button
  function reelScreen(w, h, t) {
    paint(rrPts(14, 56, w - 28, 430, 26, 1), { wash: PAL.sky, washOp: 255, fill: PAL.indigo, fillOp: 30, tex: .5, ink: null });
    paint(ellPts(w * .72, 150 + Math.sin(t * 2) * 5, 38, 38, 18), { wash: PAL.ochre, ink: null });
    paint([[14, 486], [14, 380], [110, 300 + Math.sin(t * 1.5) * 4], [200, 370], [w - 14, 310], [w - 14, 486]], { wash: PAL.sap, washOp: 255, ink: null });
    paint([[w / 2 - 26, 232], [w / 2 + 34, 270], [w / 2 - 26, 308]], { wash: PAL.cream, washOp: 235, ink: PAL.ink, sw: 1 });
    const k = 1 + .07 * pulse(t, 5) + .16 * Math.exp(-Math.max(0, t - T_POST) * 7) * (t > T_POST ? 1 : 0);
    push(); translate(w / 2, 590); scale(k);
    paint(rrPts(-116, -46, 232, 92, 46, 1.5), { wash: PAL.clay, washOp: 255, fill: PAL.clayDk, fillOp: 50, tex: .5, ink: PAL.ink, sw: 1.3 });
    pop();
  }

  function hook(t) {
    boilSeed('bg');
    bgWash(t, '#FBEBDD', { blobs: [PAL.clayLt, PAL.ochre, PAL.rose, PAL.clayLt], op: 60 });
    const hitW = t - T_WAIT, shake = hitW > 0 && hitW < .35 ? shakeXY(t, 16 * (1 - hitW / .35)) : [0, 0];
    const lift = ease(seg(t, T_CHECK - .1, T_CHECK + .3));
    camBegin(540 + Math.sin(t * 1.3) * 10 + shake[0], 960 + Math.cos(t * 1.1) * 12 + shake[1] - 30 * lift,
      kf(t, [[0, 1.16], [.45, 1.0], [T_CHECK, 1.05], [END, 1.0]]) + .02 * pulse(t, 6), Math.sin(t * .9) * .008);

    // phone: dropping in at frame 0, lands with a wobble, lifts and shrinks on "check"
    const drop = backOut(seg(t, -.22, .3));
    const px = 600 - 60 * lift, py = lerp(-300, 860, drop) - 230 * lift, ps = lerp(1.08, .8, lift);
    const prot = (1 - drop) * -.5 + spring(t, .3, 5, 16) * .06 + spring(t, T_REEL, 6, 20) * .05 + Math.sin(t * 2.1) * .012;
    boilSeed('phone');
    phone(px, py, ps, { rot: prot, bg: '#FFFBF1', screen: (w, h) => reelScreen(w, h, t) });
    const [bx, by] = phoneAt(px, py, ps, prot, 164, 590);
    letter('POST', bx, by, 58 * ps, PAL.cream, { font: HAND(58 * ps), rot: prot, stroke: PAL.ink });
    // "post": a ring snaps round the button
    const ra = t - T_POST;
    if (ra > 0 && t < T_CHECK) {
      boilSeed('ring');
      const n = Math.max(3, Math.round(30 * easeOut(clamp(ra / .22))));
      inkLine(ellPts(bx, by, 190 * ps, 84 * ps, 30, 2, -2).slice(0, n), 2.6, PAL.ochre, 'ink', .6);
      burst(bx, by, ra, PAL.ochre, { r: 170, len: 60, n: 12, sw: 1.8, life: .3 });
    }
    for (let k = 0; k < 3; k++) { boilSeed('tw' + k); if (t > T_REEL) twinkle(px - 230 * ps + k * 230 * ps, py - 420 * ps - (k % 2) * 30, 22 * clamp((t - T_REEL - k * .06) / .15), t, PAL.ochre, k); }

    // the thumb heading for POST: recoils on "Wait!"
    const th = kf(t, [[0, [930, 1330]], [T_WAIT + .02, [bx + 40, by + 70]], [T_WAIT + .3, [960, 1320]], [T_CHECK, [1000, 1330]], [T_CHECK + .25, [1250, 1500]]], easeOut);
    boilSeed('thumb');
    paint(ribbon([[th[0] + 200, th[1] + 330], [th[0] + 90, th[1] + 150], [th[0], th[1]]], 130, 84), { wash: PAL.clayLt, washOp: 255, fill: PAL.rose, fillOp: 40, tex: .4, ink: PAL.ink, sw: 1.5 });
    paint(ellPts(th[0] - 4, th[1] + 6, 26, 20, 12, 1, -.6), { wash: PAL.cream, washOp: 220, ink: PAL.ink, sw: .7 });

    // Clawd leaps in on "Wait!" and lands between the thumb and the phone's corner
    const fly = seg(t, T_WAIT - .16, T_WAIT + .16), [cx, cy] = arcPt([-260, 1150], [235, 1270], 330, easeOut(fly));
    const land = T_WAIT + .16, mood = emotions(t, [[-1, 'determined'], [land, 'surprised', { emote: '!!', lookX: .7, lookY: -.2 }], [T_BEFORE + .2, 'determined', { lookX: .8 }], [T_CHECK, 'excited', { lookX: .5 }]]);
    const sq = clamp((mood.sq || 0) + (fly < 1 ? -.2 * Math.sin(fly * Math.PI) : .3 * Math.exp(-(t - land) * 9) * Math.cos((t - land) * 20)), -.3, .14);
    const stop = t > land && t < T_CHECK;   // one arm thrown out at the thumb: STOP
    clawd(cx, cy, 25, { ...mood, sq, rot: (mood.rot || 0) + (1 - fly) * .5, smear: fly < 1 ? .7 : 0, smearDir: 1, aR: stop ? 1.0 + .25 * Math.sin(t * 9) : mood.aR, aL: stop ? -.3 : mood.aL });
    if (t > land) burst(cx, cy - 100, t - land, PAL.clayDk, { r: 190, len: 90, n: 14, sw: 2, life: .32 });

    // 1, 2, 3
    T_NUM.forEach((tn, i) => {
      boilSeed('num' + i);
      const x = 455 + i * 205, y = 1150 - 14 * pulse(t - i * .07, 6) * clamp((t - tn - .3) * 4);
      badge(x, y, 88, i + 1, COLS[i], t - tn);
      burst(x, y, t - tn, COLS[i], { r: 100, len: 50, n: 9, sw: 1.5, life: .28 });
    });
    camEnd();

    // WAIT!
    const wa = t - T_WAIT;
    if (wa > 0 && t < T_CHECK + .2) {
      const out = easeIn(seg(t, T_CHECK - .05, T_CHECK + .2)), f = MARKER(180); let x = 540 - textW('WAIT!', f) / 2;
      [...'WAIT!'].forEach((ch, k) => {
        const cw = textW(ch, f);
        letter(ch, x + cw / 2, 305 - 320 * out + Math.sin(t * 8 + k) * 5, 180, k % 2 ? PAL.clayDk : PAL.clay, { pop: (wa - k * .03) / .2, rot: -.05 + (hash(k) - .5) * .14, stroke: PAL.ink });
        x += cw;
      });
    }
  }

  chapter('hook', 0, END, [[0, hook]]);
})();
