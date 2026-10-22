// node render/dbg.mjs "JSON.stringify(window.__cues())" > audio/cues.json   (any JS expression; page loaded with norender)  → prints result (page loaded with norender)
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';
const { server, url } = await startServer();
const b = await chromium.launch({ args: ['--use-angle=metal'] }); const p = await b.newPage({ viewport: { width: 108, height: 192 } });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.text().startsWith('LOG') && console.log(m.text()));
await p.goto(url + '/' + (process.argv[3] || 'reel.html') + '?norender=1'); await p.waitForFunction(() => typeof window.__frame === 'function', null, { timeout: 120000 });
console.log(await p.evaluate(process.argv[2]));
await b.close(); server.close();
