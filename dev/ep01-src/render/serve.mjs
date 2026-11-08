// Static server over the reel project folder, random free port.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.md': 'text/plain',
  '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
export function startServer(root = ROOT) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
        const st = fs.existsSync(f) && fs.statSync(f);
        if (!st || st.isDirectory()) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(f).pipe(res);
      } catch (e) { res.writeHead(500).end(String(e)); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const { url } = await startServer(); console.log(url + '/reel.html'); }
