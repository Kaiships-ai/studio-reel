// What the capture tools share to drive a page headless: a static file server on 127.0.0.1 and Chromium on the GPU
// (Metal ANGLE). `mounts` serves a URL prefix from another folder, e.g. { '/__camtry/': toolsDir }.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

export async function serveFiles(root, { port = 0, mounts = {} } = {}) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), m = Object.keys(mounts).find(k => u.startsWith(k));
    const base = m ? mounts[m] : root, f = path.join(base, m ? u.slice(m.length) : u);
    if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  return server;
}

export async function launchGpu() {
  const { chromium } = await import('playwright-core');
  return chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
}
