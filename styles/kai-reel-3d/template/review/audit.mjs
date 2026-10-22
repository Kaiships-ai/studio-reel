// node review/audit.mjs → review/audit-page.json: per-frame scene state of reel.html (no rendering): shot, Kai mouth/blink,
// Clawd squash/yaw/talk/blink/expr, Clawd face on screen. review/audit.py turns it (+ audio measurements) into review/audit.txt.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
import { startServer, ROOT } from '../render/serve.mjs';
const { server, url } = await startServer();
const b = await chromium.launch({ args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 270, height: 480 } });
p.on('pageerror', e => { console.log('ERR', e.message); process.exit(1); });
await p.goto(`${url}/reel.html?norender=1`); await p.waitForFunction(() => window.__dbg, null, { timeout: 120000 });
const out = await p.evaluate(() => {
  const D = window.__dbg, N = Math.round(D.T_END * 30), rows = [];
  for (let f = 0; f < N; f++) {
    const t = f / 30, s = D.prep(t); D.camera.position.copy(s.pos); D.camera.fov = s.fov; D.camera.updateProjectionMatrix(); D.camera.lookAt(s.tgt); D.camera.updateMatrixWorld();
    const fp = D.S_.face.clone().project(D.camera);
    const capOn = D.CAP.some(c => t >= c.s && t < c.e), tops = D.topsAt(s.shot).map(q => q.project(D.camera)).filter(q => Math.abs(q.x) < 1 && q.z < 1);
    const topY = tops.length ? Math.min(...tops.map(q => (1 - q.y) / 2)) : 1;      // highest head top, screen y (0 = top)
    const kh = D.K.bones.Head.getWorldPosition(D.S_.pos.clone()).project(D.camera);
    const rgt = new D.S_.pos.constructor().setFromMatrixColumn(D.camera.matrixWorld, 0);       // camera right, world units
    const khw = D.K.bones.Head.getWorldPosition(D.S_.pos.clone()), kre = khw.clone().addScaledVector(rgt, 0.10).project(D.camera);   // face edge ≈ 0.10 m (the afro may cross 900 px, the face may not)
    const cre = D.S_.face.clone().addScaledVector(rgt, 0.14).project(D.camera);                // Clawd's outer eye ≈ 0.14 m off the face centre
    const capY = D.capY ? D.capY(s.shot) : null;
    rows.push({ f, shot: s.shot, km: s.k.m.shape, ko: +s.k.m.open.toFixed(2), kb: +s.k.bl.toFixed(2), csq: +D.S_.sq.toFixed(3), cy: +D.S_.yaw.toFixed(3),
      ct: +D.S_.talk.toFixed(2), cb: +D.S_.blink.toFixed(2), ce: D.S_.expr, cx: +fp.x.toFixed(2), cyy: +fp.y.toFixed(2), capOn, topY: +topY.toFixed(3), khx: +((kh.x + 1) / 2).toFixed(3), khy: +((1 - kh.y) / 2).toFixed(3), kscale: D.K.holder.scale.x, cbody: +D.S_.body.toFixed(4), carm: +D.S_.arm.toFixed(3), cpx: +D.S_.pos.x.toFixed(4), cpy: +D.S_.pos.y.toFixed(4), flame: +D.S_.flame.toFixed(2), kre: +((kre.x + 1) / 2).toFixed(3), cre: +((cre.x + 1) / 2).toFixed(3), capY });
  }
  return { rows, CAP_CLEAR: D.CAP_CLEAR, B: D.B, CUTS: D.CUTS, SHOTS: D.SHOTS, lines: VO_LINES, WORK: D.WORK, STATE_T: D.STATE_T };
});
await b.close(); server.close();
fs.writeFileSync(path.join(ROOT, 'review/audit-page.json'), JSON.stringify(out)); console.log('frames', out.rows.length);
