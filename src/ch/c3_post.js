// c3_post.js: the payoff, line l05: "All three good? Post it."
// The three badges come back and get ticked on "All", "three", "good". On "Post" Clawd jumps, the button slams and
// hearts pour out of the phone. It rhymes with the hook: the same phone and the same POST button, now allowed.
(() => {
  const START = cutAfter('l04');
  const T_TICK = [vo('all', 1, 'l05'), vo('three', 1, 'l05'), vo('good', 1, 'l05')], T_POST = vo('post', 1, 'l05'), T_IT = vo('it', 1, 'l05');
  const COLS = [PAL.teal, PAL.violet, PAL.ochre];
  const PX = 610, PY = 900, PS = .8;

  function screen(w, h, t) {
    paint(rrPts(14, 56, w - 28, 430, 26, 1), { wash: PAL.sky, washOp: 255, fill: PAL.indigo, fillOp: 30, tex: .5, ink: null });
    paint(ellPts(w * .72, 150 + Math.sin(t * 2) * 5, 38, 38, 18), { wash: PAL.ochre, ink: null });
    paint([[14, 486], [14, 380], [110, 300 + Math.sin(t * 1.5) * 4], [200, 370], [w - 14, 310], [w - 14, 486]], { wash: PAL.sap, washOp: 255, ink: null });
    const a = t - T_POST, k = 1 + .06 * pulse(t, 5) + (a > 0 ? .3 * Math.exp(-a * 6) * Math.cos(a * 18) : 0);
    push(); translate(w / 2, 590); scale(k);
    paint(rrPts(-116, -46, 232, 92, 46, 1.5), { wash: a > 0 ? PAL.sap : PAL.clay, washOp: 255, fill: PAL.ink, fillOp: 30, tex: .5, ink: PAL.ink, sw: 1.3 });
    pop();
  }

  function post(t) {
    boilSeed('bg');
    bgWash(t, '#FBEBDD', { blobs: [PAL.clayLt, PAL.ochre, PAL.rose], op: 55 });
    // slow sunburst
    for (let i = 0; i < 12; i += 2) { boilSeed('ray' + i); const a0 = t * .15 + i * TAU / 12, a1 = a0 + TAU / 12; paint([[540, 860], [540 + Math.cos(a0) * 1700, 860 + Math.sin(a0) * 1700], [540 + Math.cos(a1) * 1700, 860 + Math.sin(a1) * 1700]], { fill: PAL.cream, fillOp: 60, bleed: .15, tex: .4, ink: null }); }
    const a = t - T_POST, sh = a > 0 && a < .35 ? shakeXY(t, 16 * (1 - a / .35)) : [0, 0];
    camBegin(540 + Math.sin(t * 1.2) * 8 + sh[0], 960 + Math.cos(t) * 8 + sh[1], 1.0 + .03 * seg(t, START, T_POST) + (a > 0 ? .06 * Math.exp(-a * 5) : 0) + .012 * pulse(t, 6), Math.sin(t * .9) * .006);

    // badges, ticked one by one
    T_TICK.forEach((tt, i) => {
      boilSeed('b' + i);
      const x = 300 + i * 240, y = 470 + Math.sin(t * 3 + i * 1.3) * 6 - 22 * spring(t, tt, 7, 20);
      badge(x, y, 84, i + 1, COLS[i], t - START - .12 - i * .07);
      tick(x + 56, y + 50, 40, t - tt, PAL.sap, 3.6);
      burst(x, y, t - tt, COLS[i], { r: 96, len: 44, n: 9, sw: 1.5, life: .26 });
    });

    // phone
    const rot = Math.sin(t * 1.8) * .014 + spring(t, T_POST, 6, 22) * .05;
    boilSeed('phone');
    phone(PX, PY + Math.sin(t * 2.2) * 5, PS, { rot, bg: '#FFFBF1', screen: (w, h) => screen(w, h, t) });
    const [bx, by] = phoneAt(PX, PY, PS, rot, 164, 590);
    letter(a > 0 ? 'POSTED' : 'POST', bx, by, 52 * PS, PAL.cream, { font: HAND(52 * PS), rot, stroke: PAL.ink });
    burst(bx, by, a, PAL.sap, { r: 150, len: 110, n: 16, sw: 2.2, life: .4 });
    burst(bx, by, a - .08, PAL.ochre, { r: 230, len: 70, n: 12, sw: 1.6, life: .38, rot: .2 });
    // hearts pour out of the phone after "Post"
    if (a > 0) for (let i = 0; i < 9; i++) {
      boilSeed('heart' + i);
      const ha = a - i * .09; if (ha <= 0) continue;
      const x = PX + (hash(i) - .5) * 300 + Math.sin(ha * 4 + i) * 26, y = PY - 120 - ha * (260 + 120 * hash(i + 5)), r = (26 + 22 * hash(i + 9)) * backOut(clamp(ha / .2));
      if (y > 250) paint(heartPts(x, y, r), { wash: i % 3 ? PAL.rose : PAL.clay, washOp: 255, ink: PAL.ink, sw: 1 });
    }

    // Clawd: watches the ticks, winds up, and jumps on "Post"
    const mood = emotions(t, [[START - 1, 'hopeful', { lookX: .6, lookY: -.8 }], [T_TICK[2], 'excited', { lookX: .8 }], [T_POST, 'love']]);
    const hop = jump(t, T_POST - .22, T_POST + .12, 3.4), hop2 = jump(t, T_IT + .1, T_IT + .45, 2);
    clawd(245, 1272, 25, { ...mood, dy: (mood.dy || 0) + hop.dy + hop2.dy, sq: clamp((mood.sq || 0) + hop.sq + hop2.sq, -.25, .1), aR: a > -.2 ? 1.3 + .2 * Math.sin(t * 9) : mood.aR, boilKey: 'clawd' });
    camEnd();
    flash(a > 0 ? .5 * Math.exp(-a * 12) : 0);
  }

  chapter('post', START, DUR, [[START, post]], { wipe: [PAL.clayDk, PAL.clay] });
})();
