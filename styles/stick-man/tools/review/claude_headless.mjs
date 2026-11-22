// One headless review: a fresh `claude -p` (sonnet, effort medium, no tools, no settings, no MCP, an empty temp cwd) gets
// `content` (message blocks: text and base64 images) under the `system` prompt and must answer with one JSON object.
// Resolves to that object plus { tokens, cost_usd }. CLAUDE_BIN overrides the binary.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { spawn } from 'node:child_process';

export function claudeJson(content, system) {
  return new Promise((res, rej) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-review-'));
    const c = spawn(process.env.CLAUDE_BIN || 'claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', 'sonnet', '--effort', 'medium',
      '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--disable-slash-commands', '--system-prompt', system], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let so = '', se = ''; c.stdout.on('data', d => (so += d)); c.stderr.on('data', d => (se += d)); c.on('error', rej);
    c.on('close', code => {
      fs.rmSync(cwd, { recursive: true, force: true });
      const r = so.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).find(o => o?.type === 'result');
      if (code || !r || r.is_error) return rej(new Error(`claude exit ${code} ${se.slice(0, 300)} ${r?.result || ''}`));
      const u = r.usage, tokens = u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens;
      try { const t = r.result; res({ ...JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)), tokens, cost_usd: r.total_cost_usd }); }
      catch { rej(new Error('reply is not JSON: ' + String(r.result).slice(0, 300))); }
    });
    c.stdin.end(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
  });
}
