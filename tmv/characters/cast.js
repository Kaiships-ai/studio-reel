// cast.js: the three seeded characters. Each one is only parameters; characters/figure.js draws them.
// An episode names a seed in episode.json ("cast": [{"id": "nova", "seed": "nova"}]) or carries its own
// parameters copied from character-designer.html ("Copy for Claude"). Every field and its options: TMV_PARTS.
window.TMV_PARTS = {
  kind: ['human', 'bot'],
  build: ['average', 'tall', 'small', 'round'],
  hair: ['short', 'bun', 'spiky', 'long', 'curly', 'none'],
  top: ['hoodie', 'jacket', 'tee', 'vest'],
  eyes: ['dot', 'wide', 'sleepy', 'visor'],
  extra: ['none', 'headset', 'glasses', 'cap', 'scarf', 'antenna'],
  voice: ['af_heart', 'af_bella', 'af_nicole', 'af_sky', 'bf_emma', 'am_michael', 'am_adam', 'am_puck', 'am_echo', 'bm_george'],
};
window.TMV_SEEDS = {
  nova: { name: 'Nova', role: 'lead', kind: 'human', build: 'average', skin: '#C98E6B', hair: 'bun', hairColor: '#2A1B14',
    top: 'hoodie', topColor: '#2F6F73', legs: '#1E2433', eyes: 'dot', extra: 'headset', voice: 'af_heart', speed: 1.0 },
  rook: { name: 'Rook', role: 'rival', kind: 'human', build: 'tall', skin: '#E8C2A0', hair: 'spiky', hairColor: '#C9B27A',
    top: 'jacket', topColor: '#1B1B22', legs: '#2B2B36', eyes: 'sleepy', extra: 'glasses', voice: 'am_michael', speed: 1.02 },
  blip: { name: 'Blip', role: 'mascot', kind: 'bot', build: 'small', skin: '#D9DEE8', hair: 'none', hairColor: '#000000',
    top: 'vest', topColor: '#E2A23B', legs: '#3A4258', eyes: 'visor', extra: 'antenna', voice: 'am_puck', speed: 1.08 },
};
