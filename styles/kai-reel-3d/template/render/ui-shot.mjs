// screenshot a real local page for the in-scene laptop screen (dark mode via the page's own toggle)
import { chromium } from 'playwright-core';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
await p.goto(url); await p.waitForTimeout(1500); await p.click('#mDark').catch(() => {}); await p.click('text=Terminal Plaza >> nth=0').catch(() => {}); await p.waitForTimeout(2500);
await p.screenshot({ path: out }); await b.close();
