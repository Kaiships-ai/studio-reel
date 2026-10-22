// mux.mjs: the finished film from frames + mix.
//   node core/render/mux.mjs video.mp4 mix.wav out.mp4 [fps=24] [grain=2]
// Video is re-timed to the target fps (held shots repeat frames); grain = film grain strength (0 = none, for
// pixel/vector looks). Audio: two-pass loudnorm to -14 LUFS / TP -1.2 (one pass misses by ~0.5 LU); then prints the
// measured I / LRA / true peak and warns if the film missed (loudness outside ±1 LU or peak above -1 dB).
// Any ffmpeg failure exits non-zero and leaves no half-written file; the output path is printed only when it exists.
// Silent or very quiet audio (below -70 LUFS, which loudnorm cannot measure) skips normalisation with a warning.
// Not audio, no audio stream, or a damaged file: exit 1, no film. "Damaged" is judged by what actually decodes:
//   · the decoder reported an error (damaged FLAC/MP3/M4A often still exit 0);
//   · far less decodes than the container claims (truncated FLAC/MP3);
//   · the WAV header promises more audio than the file holds (write interrupted).
//   A WAV streamed with `ffmpeg … -f wav -` has a placeholder length and three demuxer notes at the end: that is a good
//   file and is muxed as usual (with a note).
// Audio shorter than the picture is padded with silence (the video is never cut); longer audio is cut (-shortest).
// Colour: by default unchanged from video.mjs (full-range yuvj420p / bt470bg tags); STUDIO_COLOR=bt709 makes standard
// limited-range yuv420p / bt709.
// Same ffmpeg arguments, in the same order, as the former core/render/mux.sh.
import { existsSync, readFileSync, statSync, rmSync, openSync, readSync, closeSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { run } from '../../kit/env.mjs';

class MuxError extends Error {}
const die = m => { throw new MuxError(m); };
const note = m => console.error(`mux: ${m}`);

/** true when the WAV header's data chunk claims more bytes than the file holds (placeholder lengths = unknown). */
export function wavTruncated(file) {
  let fd;
  try {
    const size = statSync(file).size; fd = openSync(file, 'r');
    const read = (off, n) => { const b = Buffer.alloc(n); readSync(fd, b, 0, n, off); return b; };
    if (size < 12 || read(0, 4).toString('latin1') !== 'RIFF' || read(8, 4).toString('latin1') !== 'WAVE') return false;
    for (let off = 12; off + 8 <= size;) {
      const id = read(off, 4).toString('latin1'), len = read(off + 4, 4).readUInt32LE(0);
      if (id === 'data') return len !== 0 && len !== 0xFFFFFFFF && off + 8 + len > size;
      off += 8 + len + (len & 1);
    }
    return false;
  } catch { return false; } finally { if (fd !== undefined) closeSync(fd); }
}

const probeDur = f => parseFloat((run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { capture: true }).stdout || '').split('\n')[0]);
const hms = s => { if (!s || s.startsWith('-') || !s.includes(':')) return 0; const [h, m, x] = s.split(':'); return +h * 3600 + +m * 60 + +x; };

/** Mux one film. Returns { out, I, LRA, TP }. Throws MuxError with a readable message. */
export function mux({ video, audio, out, fps = 24, grain = 2, color = process.env.STUDIO_COLOR || '' }) {
  if (!video || !audio || !out) die('usage: node core/render/mux.mjs video.mp4 mix.wav out.mp4 [fps=24] [grain=2]');
  if (!existsSync(video)) die(`video not found: ${video}`);
  if (!existsSync(audio)) die(`audio not found: ${audio}`);
  if (!/^[0-9.]+$/.test(String(fps))) die(`fps must be a number, got '${fps}'`);
  if (!/^[0-9.]+$/.test(String(grain))) die(`grain must be a number (0 = none), got '${grain}'`);
  if (!['', 'bt709'].includes(color)) die(`STUDIO_COLOR must be bt709 or unset, got '${color}'`);

  // pass 1: measure
  const hasA = (run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', audio], { capture: true }).stdout || '').trim();
  if (!hasA) die(`no audio stream in '${audio}' (is it really the mixed audio file?)`);
  const m = run('ffmpeg', ['-hide_banner', '-nostats', '-progress', 'pipe:2', '-i', audio, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], { capture: true });
  const M = (m.stdout || '') + (m.stderr || '');
  if (m.status !== 0) die(`ffmpeg cannot read the audio '${audio}': ${M.trim().split('\n').slice(-2).join('\n')}`);
  if (wavTruncated(audio)) die(`the WAV file '${audio}' is cut off: its header promises more audio than the file contains (was the write interrupted?)`);
  // decoder/demuxer log lines start with [name @ 0x…]; any error words there, except three fixed streamed-WAV notes, mean damage
  const lines = M.split('\n');
  const errs = lines.filter(l => l.startsWith('[') && /error|invalid|corrupt|header missing|overread|truncat|incomplete/i.test(l));
  const benign = /Ignoring maximum wav data size|Packet corrupt \(stream = [0-9]+, dts = NOPTS\)|corrupt input packet in stream [0-9]+/;
  const bad = errs.filter(l => !benign.test(l)).slice(0, 2);
  if (bad.length) die(`the audio '${audio}' is damaged; ffmpeg reported while decoding it:\n${bad.join('\n')}`);
  // seconds actually decoded (last -progress out_time) vs what the container claims; skip when ffmpeg only estimated it
  const dec = hms((lines.filter(l => l.startsWith('out_time=')).pop() || '').split('=')[1]);
  const cont = probeDur(audio) || 0;
  if (!M.includes('Estimating duration from bitrate') && cont > 0 && cont - dec > Math.max(cont * 0.05, 0.15))
    die(`only ${dec} s of the ${cont} s that '${audio}' claims could be decoded: the file is damaged or cut off`);
  if (errs.length) note(`note: ffmpeg complained about the header/ending of '${audio}' (typical of a WAV streamed with 'ffmpeg … -f wav -', whose length is a placeholder), but all ${dec} s decoded; continuing`);
  const json = (M.match(/\{[\s\S]*?\}/g) || []).pop() || '{}';
  let J = {}; try { J = JSON.parse(json); } catch {}
  const keys = ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'];
  const norm = keys.every(k => J[k] !== undefined && J[k] !== '' && !/inf|nan/i.test(J[k]));
  let LN = 'anull';
  if (norm) LN = `loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=${J.input_i}:measured_TP=${J.input_tp}:measured_LRA=${J.input_lra}:measured_thresh=${J.input_thresh}:offset=${J.target_offset}:linear=true`;
  else note('warning: the audio is silent or quieter than -70 LUFS, so loudness normalisation was skipped');

  // audio shorter than the picture: pad with silence
  const VD = probeDur(video), AD = probeDur(audio); let PAD = '';
  if (AD > 0 && VD > 0 && AD < VD - 0.02) { PAD = `,apad=whole_dur=${VD}`; note(`note: the audio (${AD} s) is shorter than the video (${VD} s); padding it with silence`); }

  let VF = String(grain) === '0' ? `fps=${fps}` : `fps=${fps},noise=c0s=${grain}:allf=t`, CARGS = [];
  if (color === 'bt709') {
    VF += ',scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709';
    CARGS = ['-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
  } else VF += ',format=yuv420p';
  const w = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', audio,
    '-filter_complex', `[0:v]${VF}[v];[1:a]${LN},aresample=48000${PAD}[a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-r', String(fps), ...CARGS,
    '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out]);
  if (w.status !== 0) { rmSync(out, { force: true }); die(`ffmpeg failed while writing '${out}' (its message is above)`); }
  if (!existsSync(out) || statSync(out).size === 0) { rmSync(out, { force: true }); die(`no output was written to '${out}'`); }
  console.log(out);
  const R = (run('ffmpeg', ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { capture: true }).stderr || '')
    .split('\n').filter(l => /^\s+(I|LRA|Peak):/.test(l)).slice(0, 3);
  console.log(R.join('\n'));
  const val = k => parseFloat((R.find(l => l.trim().startsWith(k + ':')) || '').trim().split(/\s+/)[1]);
  const I = val('I'), LRA = val('LRA'), TP = val('Peak');
  if (norm && (I < -15 || I > -13 || TP > -1))
    note(`warning: the film missed the target (-14 LUFS, true peak <= -1.2 dB): measured ${I} LUFS, peak ${TP} dB. The mix is probably clipping or has very hot peaks: lower it and tame the peaks, then mux again`);
  return { out, I, LRA, TP };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [video, audio, out, fps = '24', grain = '2'] = process.argv.slice(2);
  try { mux({ video, audio, out, fps, grain }); }
  catch (e) { if (e instanceof MuxError) { console.error(`mux: ${e.message}`); process.exit(1); } throw e; }
}
