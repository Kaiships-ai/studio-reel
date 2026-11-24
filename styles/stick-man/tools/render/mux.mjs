// The mp4 mux of tools/render/shot.mjs: the frames piped in as JPEGs, the film's audio cut to the same span.
// ffmpeg's -shortest ends the file with its shorter stream, so a voice track that stops before the last frame cuts the
// picture there (a held end card loses its last frames without a word). `pad` (shot.mjs --pad-audio 1)
// pads the audio with silence so every frame is kept; without it the args are the ones shot.mjs always used, and
// `framesLost` lets it say how many frames the mp4 will lack.
export function muxArgs({ fps, f0, n, wav, out, pad = false }) {
  return ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', (f0 / fps).toFixed(4), '-t', (n / fps).toFixed(4), '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-c:a', 'aac', '-b:a', '192k',
    ...(pad ? ['-af', 'apad'] : []), '-shortest', '-movflags', '+faststart', out];
}

// frames the picture loses to -shortest when the audio (wavSeconds long) ends before frame f0 + n
export function framesLost(wavSeconds, { fps, f0, n }) {
  return Math.max(0, n - Math.floor(Math.max(0, wavSeconds - f0 / fps) * fps + 1e-6));
}
