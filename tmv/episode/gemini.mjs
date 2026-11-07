// gemini.mjs: one Gemini TTS call, one narrator voice (make.mjs vo and studio doctor use it). The key is GOOGLE_API_KEY in
// this folder's .env (pixi run studio key opens it); it is sent only in the request header, never printed or written.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../kit/env.mjs';

export const VOICE = 'Achird', MODEL = 'gemini-3.8-flash-tts', FALLBACKS = ['gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'];
const HOST = process.env.GEMINI_HOST || 'generativelanguage.googleapis.com';   // a test points it at a bad host to see the no-network message
const KEYFIX = 'pixi run studio key, paste the key from aistudio.google.com/apikey';

export class VoiceError extends Error { constructor(what, fix) { super(`${what}\n  fix: ${fix}`); } }

export function key() {
  const f = join(ROOT, '.env');
  const l = existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).find(x => x.startsWith('GOOGLE_API_KEY=')) : null;
  const k = l?.slice(15).trim().replace(/^["']|["']$/g, '');
  if (!k) throw new VoiceError('voice key: no key in .env', KEYFIX);
  return k;
}

// texts: the lines in order. Returns { wav: Buffer (24 kHz mono 16-bit), model, seconds }. On 429 it tries the fallback models.
export async function speak(texts, { voice = VOICE, style = '', model = MODEL, where = 'episode.json' } = {}) {
  const k = key(), t = Date.now();
  for (const m of [model, ...FALLBACKS.filter(x => x !== model)]) {
    const body = { model: m, response_format: { type: 'audio' },
      input: [{ type: 'user_input', content: texts.map(text => ({ type: 'text', text, ...(style ? { annotations: [{ type: 'speech_metadata', style }] } : {}) })) }],
      generation_config: { speech_config: [{ voice }] } };   // one voice: a list of one (a speakers list must name two)
    let r;
    try { r = await fetch(`https://${HOST}/v1beta/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify(body), signal: AbortSignal.timeout(300e3) }); }
    catch { throw new VoiceError(`voice: could not reach ${HOST}`, 'check the internet connection, then run the vo step again\n  (the last voice that worked is kept; render still works offline)'); }
    if (r.status === 429) continue;
    const txt = await r.text();
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const why = /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/.exec(txt)?.[0];
      if (!why) throw new VoiceError(`voice: Gemini ${r.status}: ${(/"message":\s*"([^"]{0,300})/.exec(txt)?.[1] ?? '').trim()}`, `check "narrator" and "model" in ${where}, then run the vo step again`);
      throw new VoiceError(`voice key: Google said ${r.status} ${why}`, KEYFIX);
    }
    if (!r.ok) throw new VoiceError(`voice: Gemini HTTP ${r.status} (${m})`, 'run the vo step again in a minute');
    const find = o => { if (o && typeof o === 'object') { if (typeof o.data === 'string' && (String(o.mime_type ?? '').startsWith('audio') || o.type === 'audio')) return o.data; for (const v of Object.values(o)) { const x = find(v); if (x) return x; } } };
    const a = find(JSON.parse(txt));
    if (!a) throw new VoiceError(`voice: Gemini answered with no audio (${m})`, 'run the vo step again');
    const raw = Buffer.from(a, 'base64');
    return { wav: raw.subarray(0, 4).toString() === 'RIFF' ? raw : wavOf(raw), model: m, seconds: (Date.now() - t) / 1000 };
  }
  throw new VoiceError("voice: Gemini 429, today's free quota is used up",
    `wait for the reset (about 14:00-15:00 Vietnam time), or set\n  "model": "${FALLBACKS.at(-1)}" in ${where}`);
}

function wavOf(pcm, sr = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
