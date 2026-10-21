// sheets.js: model sheets of the cast, as standalone loops (LOOPS in timeline.js). Use them to prove the look before
// building chapters (WORKFLOW.md step 4) and to check a character at final size:
//   node styles/kai-hand-draw/tools/look.mjs <film> --stills=0 --loop=kai --out=<film>/out/check/kai
// Loops: kai (painted Kai, every pose) · kaiV3 (Kai v3 canon, every pose) · clawd (moods and v3 astronaut) · cast.
(() => {
  const grid = (items, cols, cellH, draw, top = 120) => {
    const cw = W / cols;
    items.forEach((it, i) => {
      const cx = cw * (i % cols) + cw / 2, cy = top + cellH * (Math.floor(i / cols) + 1) - 70;
      draw(it, cx, cy);
      letter(String(it).toUpperCase(), cx, cy + 46, 22, PAL.ink, { font: '700 22px "JetBrains Mono"' });
    });
  };
  const title = txt => letter(txt, W / 2, 70, 44, PAL.ink);

  LOOPS.kai = t => {
    title('KAI · kai(pose, x, y, h)');
    const poses = ['front', 'three-quarter', 'side', 'back', 'point-up', 'point-down', 'think', 'shrug', 'present', 'wave',
      'celebrate', 'thumbsup', 'arms-crossed', 'phone', 'laptop', 'hold-sign', 'peek', 'exp-surprised', 'exp-focused',
      'exp-happy', 'exp-laughing', 'exp-wink'];
    grid(poses, 4, 300, (p, x, y) => kai(p, x, y, p.startsWith('exp-') ? 200 : 250, { talk: false }));
  };
  LOOPS.kai.len = 2;

  LOOPS.kaiV3 = t => {
    title('KAI V3 · kai(pose, x, y, h, { look: "v3" })');
    grid(kaiV3.poses, 4, 340, (p, x, y) => kaiV3(p, x, y, p.startsWith('exp-') ? 200 : 290, {}));
  };
  LOOPS.kaiV3.len = 2;

  LOOPS.clawd = t => {
    title('CLAWD · clawd(x, y, u, feel(mood, t))');
    const moods = ['happy', 'sad', 'angry', 'surprised', 'love', 'excited', 'thinking', 'sleepy', 'proud', 'scared', 'confused', 'determined'];
    grid(moods, 4, 300, (m, x, y) => clawd(x, y, 20, feel(m, t)));
    ['deadpan', 'proud', 'happy', 'skeptical'].forEach((m, i) => {
      const x = W / 8 + i * W / 4, y = 1720;
      clawd(x, y, 18, { astro: true, mood: m });
      letter('ASTRO ' + m.toUpperCase(), x, y + 46, 22, PAL.ink, { font: '700 22px "JetBrains Mono"' });
    });
  };
  LOOPS.clawd.len = 2;

  LOOPS.cast = t => {
    title('CAST · researcher(x, y, s, o)');
    ['smile', 'o', 'grin', 'flat'].forEach((m, i) => {
      const x = W / 8 + i * W / 4;
      researcher(x, 700, 22, { mouth: m, aL: -1.2, aR: i % 2 ? .6 : -1.2 });
      letter(m.toUpperCase(), x, 760, 22, PAL.ink, { font: '700 22px "JetBrains Mono"' });
    });
    kai('front', 330, 1500, 560, { talk: false });
    clawd(760, 1500, 34, feel('happy', t));
    letter('KAI h 560 · CLAWD u 34 (body ≥ 280 px)', W / 2, 1580, 26, PAL.ink, { font: '700 26px "JetBrains Mono"' });
  };
  LOOPS.cast.len = 2;
})();
