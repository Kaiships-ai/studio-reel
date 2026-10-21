// kaip.js: Kai, painted in the same watercolour + ink as Clawd (replaces the pixel sprite).
// Same call as before: kai(pose, x, y, h, o). Feet at (x, y), height h px (poses 'exp-*' = head-and-shoulders
// bust whose bottom edge sits at y). o: { flip, rot, sq, alpha (ignored), shadow:false, face, talk:false }.
// Curly black hair, round black glasses, warm tan skin, black tee, black pants, black/white sneakers.
// Mouth flaps automatically while the voiceover is speaking (Kai is the narrator); pass talk:false to stop it.
(() => {
  const SKIN = '#E4AE84', SKIN_DK = '#C98B62', HAIR = '#261E2B', TEE = '#2B2733', TEE_LT = '#4A4458', PANT = '#1F1B26', SOLE = '#F4EEE2';
  // arms: [upper angle from straight down (+ = out/up), forearm bend (+ = up)], per side. hand: 'open' | 'fist' | 'point' | 'thumb' | 'phone'
  const P = {
    front:        { L: [.15, .1], R: [.15, .1], face: 'smile' },
    'three-quarter': { L: [.15, .1], R: [.15, .1], face: 'smile', turn: .25 },
    side:         { L: [.1, .2], R: [.1, .2], face: 'smile', turn: .5 },
    back:         { L: [.12, 0], R: [.12, 0], back: true },
    'point-up':   { L: [.15, .1], R: [2.75, .15, 'point'], face: 'grin' },
    'point-down': { L: [.15, .1], R: [1.05, -.2, 'point'], face: 'talk', lean: .05 },
    think:        { L: [.5, 1.9, 'fist'], R: [.35, 2.55, 'fist'], face: 'think', eyes: 'up' },
    shrug:        { L: [.85, 1.5, 'open'], R: [.85, 1.5, 'open'], face: 'o', brows: 'up' },
    present:      { L: [.15, .1], R: [1.25, .55, 'open'], face: 'grin' },
    wave:         { L: [.15, .1], R: [2.2, .9, 'open'], face: 'grin', wave: true },
    celebrate:    { L: [2.6, .3, 'fist'], R: [2.6, .3, 'fist'], face: 'laugh', eyes: 'happy' },
    thumbsup:     { L: [.15, .1], R: [.55, 1.9, 'thumb'], face: 'grin', eyes: 'wink' },
    'arms-crossed': { L: [.45, 2.2, 'fist'], R: [.45, 2.2, 'fist'], face: 'flat', front: true },
    phone:        { L: [.3, 1.95, 'phone'], R: [.35, 1.7, 'fist'], face: 'smile', eyes: 'down' },
    laptop:       { L: [.45, 1.5, 'fist'], R: [.45, 1.5, 'fist'], face: 'focused', eyes: 'down' },
    'sitting-laptop': { L: [.45, 1.5, 'fist'], R: [.45, 1.5, 'fist'], face: 'focused', eyes: 'down' },
    'hold-sign':  { L: [2.3, .6, 'fist'], R: [2.3, .6, 'fist'], face: 'grin' },
    peek:         { L: [.15, .1], R: [.15, .1], face: 'o', lean: -.15 },
    'exp-surprised': { bust: true, face: 'O', eyes: 'wide', brows: 'up' },
    'exp-focused':   { bust: true, face: 'flat', eyes: 'narrow', brows: 'down' },
    'exp-happy':     { bust: true, face: 'grin', eyes: 'happy' },
    'exp-laughing':  { bust: true, face: 'laugh', eyes: 'happy', brows: 'up' },
    'exp-wink':      { bust: true, face: 'grin', eyes: 'wink' },
  };
  const speaking = t => (typeof VO_WORDS !== 'undefined') && VO_WORDS.some(w => t >= w.s && t < w.e);

  function hand(kind, s, sw, side) {
    if (kind === 'phone') { paint(rrPts(-4 * s, -9 * s, 8 * s, 14 * s, 1.5 * s), { wash: PAL.ink, ink: null }); paint(rrPts(-3 * s, -8 * s, 6 * s, 11 * s, 1 * s), { wash: PAL.sky, washOp: 230, ink: null }); }
    paint(ellPts(0, 0, 4.4 * s, 4.2 * s, 12), { wash: SKIN, fill: SKIN_DK, fillOp: 50, tex: .4, ink: PAL.ink, sw: sw * .7 });
    if (kind === 'point') paint(rrPts(-1.1 * s, -9.5 * s, 2.2 * s, 8 * s, 1.1 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .6 });
    if (kind === 'thumb') paint(rrPts(-1.2 * s, -8 * s, 2.4 * s, 6.5 * s, 1.2 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .6 });
    if (kind === 'open') for (let f = -1; f <= 1; f++) { push(); rotate(f * .35); paint(rrPts(-.9 * s, -7.5 * s, 1.8 * s, 5 * s, .9 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .5 }); pop(); }
  }
  // arm from the shoulder, in the character's local space (x right, y down). side = -1 left, +1 right.
  function arm(side, spec, s, sw, t, wave) {
    let [a1, a2, hk] = spec; if (wave) a2 += Math.sin(t * 9) * .35;
    push(); translate(side * 15.5 * s, -73 * s); rotate(-side * a1);
    paint(rrPts(-4.2 * s, -1 * s, 8.4 * s, 10 * s, 3 * s), { wash: TEE, fill: TEE_LT, fillOp: 50, tex: .5, ink: PAL.ink, sw: sw * .8 });   // sleeve
    paint(rrPts(-3.4 * s, 7 * s, 6.8 * s, 10 * s, 3.2 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .7 });                                    // upper arm
    translate(0, 16 * s); rotate(-side * a2);
    paint(rrPts(-3.2 * s, -1 * s, 6.4 * s, 14 * s, 3 * s), { wash: SKIN, fill: SKIN_DK, fillOp: 40, tex: .4, ink: PAL.ink, sw: sw * .7 }); // forearm
    translate(0, 14.5 * s); rotate(Math.PI); hand(hk || 'fist', s, sw, side);
    pop();
  }
  function hair(s, sw, t) {
    const puff = (x, y, r, c) => paint(ellPts(x * s, y * s, r * s, r * s * .92, 12, s * .3), { wash: c || HAIR, fill: '#4A3A52', fillOp: 40, tex: .6, ink: PAL.ink, sw: sw * .55 });
    const bob = Math.sin(t * 3) * .4;
    [[-14.2, -97.5, 5], [14.2, -97.5, 5], [-12, -101, 6], [12, -101, 6], [-7, -106, 6.5], [7, -106, 6.5], [0, -108, 6.5], [-3, -101, 6], [4, -102, 6]].forEach(([x, y, r], i) => puff(x, y + (i > 3 ? bob : 0), r));
    for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI, x = Math.cos(a) * 10 * s, y = -103 * s + Math.sin(a) * 6 * s; inkLine([[x - 1.5 * s, y], [x, y - 1.6 * s], [x + 1.5 * s, y]], sw * .45, '#6A5874', 'inkfine', .8); }
  }
  function face(s, sw, spec, o, t) {
    const f = o.face || spec.face || 'smile', eyes = o.eyes || spec.eyes || 'normal', br = spec.brows;
    const blink = eyes === 'normal' && ((t * .8 + 1.3) % 3.7) < .11;
    // glasses
    for (const ex of [-5.6, 5.6]) paint(rrPts((ex - 4.6) * s, -94.2 * s, 9.2 * s, 7.6 * s, 3 * s), { wash: '#FFFFFF', washOp: 60, ink: PAL.ink, sw: sw * 1.25 });
    inkLine([[-1 * s, -91.5 * s], [1 * s, -91.5 * s]], sw, PAL.ink, 'ink', 0);
    for (const ex of [-5.6, 5.6]) {
      const X = ex * s, Y = -90.4 * s;
      if (eyes === 'happy' || (eyes === 'wink' && ex > 0)) inkLine([[X - 2 * s, Y + .8 * s], [X, Y - 1.2 * s], [X + 2 * s, Y + .8 * s]], sw * .9, PAL.ink, 'ink', .3);
      else if (blink || eyes === 'narrow') inkLine([[X - 2 * s, Y], [X + 2 * s, Y]], sw * .9, PAL.ink, 'ink', 0);
      else {
        const r = eyes === 'wide' ? 2 : 1.3, dy = eyes === 'up' ? -1 : eyes === 'down' ? 1 : 0;
        if (eyes === 'wide') paint(ellPts(X, Y, 2.8 * s, 3 * s, 12), { wash: '#FFFFFF', ink: null });
        paint(ellPts(X, Y + dy * s, r * s, r * 1.15 * s, 10), { wash: PAL.ink, ink: null });
        paint(ellPts(X + .45 * s, Y + (dy - .5) * s, .45 * s, .45 * s, 8), { wash: '#FFFFFF', ink: null });
      }
    }
    // brows
    const by = br === 'up' ? -99.5 : br === 'down' ? -96.4 : -97.8;
    for (const ex of [-5.6, 5.6]) inkLine([[(ex - 3) * s, (by + (br === 'down' ? (ex < 0 ? -.8 : .8) : .3)) * s], [(ex + 3) * s, (by + (br === 'down' ? (ex < 0 ? .8 : -.8) : -.3)) * s]], sw * 1.1, HAIR, 'ink', .3);
    // cheeks
    for (const ex of [-8, 8]) paint(ellPts(ex * s, -85.5 * s, 2.4 * s, 1.3 * s, 10), { fill: PAL.rose, fillOp: 110, bleed: .2, ink: null });
    // mouth: talking flaps while the VO speaks
    let m = f;
    if (o.talk !== false && speaking(t) && !['O', 'laugh'].includes(f)) m = Math.floor(t * 11) % 3 === 0 ? 'smile' : (Math.floor(t * 11) % 3 === 1 ? 'talk' : 'o');
    const My = -83 * s;
    if (m === 'smile') inkLine([[-3 * s, My - .6 * s], [0, My + 1.2 * s], [3 * s, My - .6 * s]], sw, PAL.ink, 'ink', .6);
    else if (m === 'flat' || m === 'focused') inkLine([[-2.4 * s, My], [2.4 * s, My]], sw, PAL.ink, 'ink', 0);
    else if (m === 'think') inkLine([[-2.5 * s, My + .4 * s], [0, My - .2 * s], [2.5 * s, My - .8 * s]], sw, PAL.ink, 'ink', .4);
    else if (m === 'o') paint(ellPts(0, My + .4 * s, 1.5 * s, 1.8 * s, 10), { wash: '#6B2A2E', ink: PAL.ink, sw: sw * .6 });
    else if (m === 'O') paint(ellPts(0, My + 1 * s, 2.6 * s, 3.4 * s, 12), { wash: '#6B2A2E', ink: PAL.ink, sw: sw * .7 });
    else paint([[-4 * s, My - 1 * s], [4 * s, My - 1 * s], [2.6 * s, My + (m === 'laugh' ? 4 : m === 'talk' ? 2.2 : 2.8) * s], [-2.6 * s, My + (m === 'laugh' ? 4 : m === 'talk' ? 2.2 : 2.8) * s]], { wash: '#6B2A2E', ink: PAL.ink, sw: sw * .7, curv: .4 });
    if (m === 'grin' || m === 'laugh') paint(rectPts(-3.2 * s, My - .9 * s, 6.4 * s, 1.2 * s), { wash: '#FFFFFF', ink: null });
  }

  function kaiPainted(pose, x, y, h, o = {}) {
    const spec = P[pose] || P.front, t = T;
    const bust = !!spec.bust, HS = bust ? 1 : 1.5, s = bust ? h / 46 : h / 132, sw = clamp(s * .3, .3, 2.3);
    const breathe = Math.sin(t * 2.4) * .006, sq = (o.sq || 0);
    if (!bust && o.shadow !== false) paint(ellPts(x, y + 2, 20 * s, 3.2 * s, 18), { fill: PAL.ink, fillOp: 90, bleed: .25, ink: null });
    push(); translate(x, y); if (o.rot) rotate(o.rot);
    if (bust) translate(0, 58 * s);
    scale((o.flip ? -1 : 1) * (1 + sq * .5), (1 - sq) * (1 + breathe));
    if (spec.lean) rotate(spec.lean);
    if (!bust) {
      // legs + shoes
      for (const sd of [-1, 1]) {
        paint([[sd * 2 * s, -46 * s], [sd * 13 * s, -46 * s], [sd * 12 * s, -6 * s], [sd * 3 * s, -6 * s]], { wash: PANT, fill: '#3A3446', fillOp: 40, tex: .5, ink: PAL.ink, sw: sw * .8 });
        paint(rrPts((sd > 0 ? 1 : -17) * s, -8 * s, 16 * s, 8 * s, 3.5 * s), { wash: PAL.ink, ink: PAL.ink, sw: sw * .7 });
        paint(rrPts((sd > 0 ? 1 : -17) * s, -2.6 * s, 16 * s, 2.8 * s, 1.2 * s), { wash: SOLE, ink: PAL.ink, sw: sw * .5 });
        inkLine([[(sd > 0 ? 5 : -13) * s, -5.6 * s], [(sd > 0 ? 12 : -6) * s, -6.4 * s]], sw * .5, SOLE, 'inkfine', 0);
      }
    }
    const t0 = bust ? -56 : -46;
    // arms behind the torso when they hang, in front when folded (drawn after)
    const armsFront = spec.front || (spec.L && spec.L[1] > 1.2);
    if (!bust && !spec.back && !armsFront) { arm(-1, spec.L, s, sw, t); arm(1, spec.R, s, sw, t, spec.wave); }
    // torso (tee)
    paint([[-17 * s, -76 * s], [-8 * s, -79 * s], [8 * s, -79 * s], [17 * s, -76 * s], [15 * s, t0 * s], [-15 * s, t0 * s]], { wash: TEE, fill: TEE_LT, fillOp: 60, bleed: .1, tex: .6, border: .5, ink: PAL.ink, sw });
    paint(ellPts(-5 * s, -70 * s, 5 * s, 3 * s, 12), { fill: '#6A6380', fillOp: 70, bleed: .2, ink: null });
    // neck + head
    paint(rrPts(-3.6 * s, -83 * s, 7.2 * s, 7 * s, 2 * s), { wash: SKIN_DK, ink: null });
    inkLine([[-6 * s, -78.6 * s], [0, -76.6 * s], [6 * s, -78.6 * s]], sw * .7, PAL.ink, 'ink', .6);
    push(); translate(0, -80 * s); scale(HS); translate(0, 80 * s);
    for (const ex of [-12.5, 12.5]) paint(ellPts(ex * s, -90 * s, 2.4 * s, 3.2 * s, 10), { wash: SKIN, ink: PAL.ink, sw: sw * .6 });
    const head = ellPts(0, -91 * s, 12 * s, 13.2 * s, 28, s * .15);
    paint(head, { wash: SKIN, fill: SKIN_DK, fillOp: 45, bleed: .15, tex: .5, border: .5, ink: PAL.ink, sw });
    paint(ellPts(-4 * s, -96 * s, 5 * s, 3.5 * s, 14), { fill: '#FFFFFF', fillOp: 50, bleed: .25, ink: null });
    if (!spec.back) face(s, sw, spec, o, t);
    hair(s, sw, t);
    if (spec.back) paint(ellPts(0, -93 * s, 12.5 * s, 11 * s, 20), { wash: HAIR, ink: PAL.ink, sw: sw * .6 });
    pop();
    if (!bust && !spec.back && armsFront) { arm(-1, spec.L, s, sw, t); arm(1, spec.R, s, sw, t, spec.wave); }
    pop();
  }
  kai = kaiPainted;
})();
