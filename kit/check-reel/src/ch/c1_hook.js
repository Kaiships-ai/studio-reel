// c1_hook.js: a working example chapter (replace it). Kai and Clawd on one set, one long take: the camera pushes in and
// cranes up while each key word lands as an event. The CTA chapter reuses the set.
(() => {
  const END = cutAfter('l01');
  function set(t) {
    boilSeed('bg'); bgWash(t, '#F6E9DA', { blobs: [PAL.rose, PAL.ochre] });
    paint(rectPts(-200, 1240, W + 400, 900), { wash: '#E8D2B8', ink: null });           // floor, wider than any camera
  }
  chapter('hook', 0, END, [[0, t => {
    set(t);
    const T1 = vo('Clawd'), T2 = vo('painted'), T3 = vo('code');
    camBegin(540, 980 - 20 * ease(seg(t, 0, END)), 1 + .06 * ease(seg(t, 0, END)) + .015 * ring(t, [T3]));   // feet stay above the caption band
    // the brush stroke is already moving on frame 0
    const k = easeOut(seg(t, 0, T2 + .3));
    boilSeed('stroke'); paint(ribbon([[140, 640], [400, 560], [700, 660], [940, 580]].slice(0, 2 + Math.floor(k * 2.99)), 110, 50), { wash: PAL.clay, fill: PAL.clayDk, fillOp: 60, ink: null });
    kai('present', 330, 1240, 600, {});
    clawd(770, 1240, 30, { ...emotions(t, [[0, 'happy'], [T3, 'excited']]), ...jump(t, T1 - .3, T1 + .1, 2) });
    burst(770, 1000, t - T1, PAL.clay);
    if (t > T3) { boilSeed('stamp'); chip(540, 440, 'CODE', { size: 90, pop: (t - T3) / .25, bg: PAL.ochre }); }
    camEnd();
    progressProp(540, 300, seg(t, T3, END));                                         // screen space, above the set
  }]]);
  chapter('cta', END, DUR, [[END, t => {
    set(t);
    const K = vo('PAINT');
    camBegin(540, 960, 1.06 - .04 * seg(t, END, DUR));
    kai('point-down', 330, 1240, 600, {});
    clawd(770, 1240, 30, emotions(t, [[END, 'happy'], [K, 'excited']]));
    if (t > K) { boilSeed('cta'); chip(540, 480, 'COMMENT PAINT', { size: 70, pop: (t - K) / .25, bg: PAL.cream }); }
    camEnd();
    progressProp(540, 300, 1);
  }]], { wipe: [PAL.clay, PAL.rose], trans: 'splat', at: [540, 900] });
})();
