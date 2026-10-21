// config.js: this film's settings.
//   name:     the output file: <film>/<name>.mp4 and <film>/<name>-cover.png
//   duration: the reel's length in seconds. VO_DUR comes from src/vo.js (the voiceover plus a short tail), so the
//             picture always ends with the voice. `make.mjs <film> vo` rewrites src/vo.js.
//   fps:      30 for Instagram.
//   bpm:      the rhythm that bounces, dances and pulse() follow. Keep it equal to "bpm" in audio/cues.json.
//   cover:    the time (seconds) of the frame saved as the cover image, painted without captions.
//   caption:  optional overrides of CAPTION in engine/reel.js, e.g. { brands: ['Claude Code', 'Cursor'] }.
const PROJECT = {
  name: 'my-reel',
  duration: typeof VO_DUR !== 'undefined' ? VO_DUR : 15,
  fps: 30, bpm: 120, offset: 0,
  cover: 1.2,
  caption: { brands: ['Claude Code'] },
};
