import { chromium } from 'playwright-core';
import { startServer } from '../../render/serve.mjs';
const { server, url } = await startServer();
const b = await chromium.launch({ args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 270, height: 480 } });
p.on('pageerror', e => { console.log('ERR', e.message); process.exit(1); });
await p.goto(url+'/reel.html?norender=1'); await p.waitForFunction(() => window.__dbg, null, { timeout: 120000 });
const out = await p.evaluate(() => {
  const D = window.__dbg, N = Math.round(D.T_END * 30), cam=D.camera, V=D.S_.pos.constructor;
  const pts=[]; for(let x=-4;x<=6;x+=0.5) for(let z=-2.5;z<=4;z+=0.5) for (const y of [0,1]) pts.push(new V(x,y,z));
  const proj=(f)=>{const s=D.prep(f/30); cam.position.copy(s.pos); cam.fov=s.fov; cam.updateProjectionMatrix(); cam.up.set(0,1,0); cam.lookAt(s.tgt); if(s.roll) cam.rotateZ(s.roll); cam.updateMatrixWorld(); return {i:s.i, q:pts.map(p=>p.clone().project(cam))};};
  const res=[]; let a=proj(0);
  for(let f=0;f<N-1;f++){const b=proj(f+1); let mx=0,ds=[];
    for(let k=0;k<pts.length;k++){const A=a.q[k],B=b.q[k]; if(Math.abs(A.x)>1||Math.abs(A.y)>1||A.z>1||A.z<-1) continue; const d=Math.hypot((B.x-A.x)*540,(B.y-A.y)*960); ds.push(d);}
    ds.sort((x,y)=>x-y); res.push([f,a.i,b.i,ds.length?+ds[Math.floor(ds.length*0.5)].toFixed(1):-1, ds.length?+ds[ds.length-1].toFixed(1):-1]); a=b;}
  return res;
});
await b.close(); server.close();
for (const r of out) console.log(r.join(' '));
