// cast.js: the three seeded characters. Each one is only parameters; characters/rig.js builds the 3D figure from them.
// An episode names a seed in episode.json ("cast": [{"id": "nova", "seed": "nova"}]) or carries its own
// parameters copied from character-designer.html ("Copy for Claude"). Every field and its options: TMV_PARTS.
// human = our rigged base figure (characters/jay.glb) recoloured and restyled; hair "jay" keeps the base figure's own hair
// and colours (that is Theo). bot = a low-poly robot built from primitives. "eyes" changes bots only.
// Every seed speaks in Nova's voice, af_heart (Kokoro); speed alone tells them apart. Pick another voice per character in the designer.
window.TMV_PARTS = {
  kind: ['human', 'bot'],
  build: ['average', 'tall', 'small', 'round'],
  hair: ['short', 'bun', 'spiky', 'long', 'curly', 'none', 'jay'],
  top: ['hoodie', 'jacket', 'tee', 'vest'],
  eyes: ['dot', 'wide', 'sleepy', 'visor'],
  extra: ['none', 'headset', 'glasses', 'cap', 'scarf', 'antenna'],
  voice: ['af_heart', 'af_bella', 'af_nicole', 'af_sky', 'bf_emma', 'am_michael', 'am_adam', 'am_puck', 'am_echo', 'bm_george'],
};
window.TMV_SEEDS = {
  nova: { name: 'Nova', role: 'lead', kind: 'human', build: 'small', skin: '#D29A74', hair: 'bun', hairColor: '#3B1E14',
    top: 'hoodie', topColor: '#C9663A', legs: '#2A2F45', eyes: 'dot', extra: 'headset', voice: 'af_heart', speed: 1.0 },
  theo: { name: 'Theo', role: 'rival', kind: 'human', build: 'average', skin: '#94522F', hair: 'jay', hairColor: '#0A0A0C',
    top: 'hoodie', topColor: '#0B3A33', legs: '#0B0D14', eyes: 'dot', extra: 'none', voice: 'af_heart', speed: 1.02 },
  blip: { name: 'Blip', role: 'mascot', kind: 'bot', build: 'average', skin: '#D9DEE8', hair: 'none', hairColor: '#000000',
    top: 'vest', topColor: '#E2A23B', legs: '#3A4258', eyes: 'visor', extra: 'antenna', voice: 'af_heart', speed: 1.08 },
};
