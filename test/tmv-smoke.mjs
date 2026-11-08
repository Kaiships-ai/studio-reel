// test/tmv-smoke.mjs: the ci-smoke episode, 13-17 s, cut from the shipped sample at test time so it cannot drift from it.
// Beats: the sample's first beat, its first stats card, its first card (or, when it has none, its shortest middle beat
// drawn as a card) and its vote beat. Their voice is cut from the sample's vo/vo.wav into one take with long pauses
// between lines, so `make.mjs <ep> vo` with TMV_VO_TAKE=<take> runs the real voice step on it, with no Gemini call.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GAP = 0.8;   // seconds of silence between lines: well over voice.py's in-line pause cap, so each cut lands between lines

function wav(buf) {
  const chunks = {};
  for (let at = 12; at + 8 <= buf.length; at += 8 + buf.readUInt32LE(at + 4) + (buf.readUInt32LE(at + 4) & 1))
    chunks[buf.toString('ascii', at, at + 4)] = buf.subarray(at + 8, at + 8 + buf.readUInt32LE(at + 4));
  const fmt = chunks['fmt '];
  return { fmt, data: chunks.data, rate: fmt.readUInt32LE(4), block: fmt.readUInt16LE(12) };
}

function wavFile(fmt, data) {
  const head = Buffer.alloc(20); head.write('RIFF', 0); head.writeUInt32LE(4 + 8 + fmt.length + 8 + data.length, 4);
  head.write('WAVE', 8); head.write('fmt ', 12); head.writeUInt32LE(fmt.length, 16);
  const dh = Buffer.alloc(8); dh.write('data', 0); dh.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, fmt, dh, data]);
}

export function pickBeats(beats, spoken) {
  const last = beats.length - 1, first = (shot) => beats.findIndex((b, i) => i > 0 && i < last && b.shot === shot);
  const stats = first('stats'), card = first('card');
  const recast = card < 0 && [...beats.keys()].filter(i => i > 0 && i < last && i !== stats && !['stats', 'previously'].includes(beats[i].shot))
    .sort((a, b) => spoken[a] - spoken[b])[0];
  const picked = [...new Set([0, stats, card < 0 ? recast : card, last].filter(i => i >= 0))].sort((a, b) => a - b);
  return picked.map(i => {
    if (i !== recast) return { i, beat: beats[i] };
    const w = beats[i].line.toUpperCase().split(/\s+/), h = Math.ceil(w.length / 2);
    return { i, beat: { ...beats[i], shot: 'card', card: [w.slice(0, h).join(' '), w.slice(h).join(' ')].filter(Boolean) } };
  });
}

export function smokeEpisode(sample, to) {
  const e = JSON.parse(readFileSync(join(sample, 'episode.json'), 'utf8'));
  const vo = JSON.parse(readFileSync(join(sample, 'vo', 'vo.json'), 'utf8'));
  const { fmt, data, rate, block } = wav(readFileSync(join(sample, 'vo', 'vo.wav')));
  const picked = pickBeats(e.beats, vo.lines.map(l => l.e - l.s));
  const byte = t => Math.min(Math.max(Math.round(t * rate), 0) * block, data.length);
  const gap = Buffer.alloc(Math.round(GAP * rate) * block);
  const take = Buffer.concat(picked.flatMap(({ i }) => [gap, data.subarray(byte(vo.lines[i].s - 0.04), byte(vo.lines[i].e + 0.06))]).concat(gap));
  mkdirSync(to, { recursive: true });
  writeFileSync(join(to, 'episode.json'), JSON.stringify({ ...e, beats: picked.map(p => p.beat) }, null, 1));
  cpSync(join(sample, 'index.html'), join(to, 'index.html'));
  writeFileSync(join(to, 'take.wav'), wavFile(fmt, take));
  return { take: join(to, 'take.wav'), beats: picked.map(p => p.i + 1), seconds: take.length / block / rate };
}
