// config.js: project settings.
//   name:     the output file: out/<name>.mp4 and out/<name>-cover.png
//   duration: the reel's length in seconds. VO_DUR comes from src/vo.js (the voiceover plus a short tail), so the
//             picture always ends with the voice. Re-run `node make.mjs vo` and it updates itself.
//   fps:      30 for Instagram.
//   bpm:      the rhythm that bounces, dances and pulse() follow. Keep it equal to "bpm" in audio/cues.json.
//   audio:    the final mix from `node make.mjs audio`, muxed into the MP4.
//   cover:    the time (seconds) of the frame saved as the cover image, painted without captions.
const PROJECT = {
  name: 'three-checks',
  duration: typeof VO_DUR !== 'undefined' ? VO_DUR : 15,
  fps: 30, bpm: 120, offset: 0,
  audio: 'assets/reel-audio.wav',
  cover: 2.6,
};
