// sf-ep01-allout v3 "The Doctor Who Drank the Bug" (Sounds Fake ep 1). Round 3 (controlled experiment): camera,
// storytelling, acting, props & effects raised; captions, characters, faces, set looks and light kept from round 2.
// Every beat is a gag the cast acts out with the whole body (the reference: one visual gag per beat, setup -> payoff),
// every camera move has a word or an action that starts it. Act 1 = the night lab: the hook (l01) and its payoff (l07-l08).
import '/styles/stick-man/allout/handprops.js';
import '/styles/stick-man/allout/fx.js';
import '/styles/stick-man/allout/acting.js';
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });
const anim = (...names) => Object.fromEntries(names.map(n => [n, { kind: 'ao_anim', prop: n }]));
const set = (who, key, to, dur = 0, b = {}) => ({ who, do: 'set', key, to, dur, ...b });
const fire = (who, b) => ({ ...b, who, do: 'fire' });
const GAS = [0.50, 0.82, 0.22];

export default {
  title: 'The Doctor Who Drank the Bug', fps: 30, glasses: false, frames: [0, 95],
  look: { ao: 0.8, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.3, con: 1.06, vig: 0.06, split: 0.25, bloom: 0.5, hot: 0.35, ink: 2.1, shafts: 0.003, shaftK: 1.0 },
  set: 'lab-night', setModule: '/styles/stick-man/allout/sets/lab-night.js', name: 'lab-night', lines: ['l01'],
  show: [{ from: 0 }, { from: at('l07', '1984.', 4), dissolve: 12 }],
  light: { sun: [0.65, 0.75, 1.0], power: 1.6, sky: [0.55, 0.62, 0.9], ground: [0.4, 0.34, 0.3], hemi: 0.35, fill: [0.95, 0.97, 1.0], fillPower: 0.5, lit: [1.04, 1.0, 0.96], shade: [0.62, 0.68, 1.0], lamp: 0.5 },
  grade: { exp: 1.14, lift: 0.03, sat: 1.05 },
  cast: { kip: { spec: 'KAI', at: [0.1, 0.05, 0], yaw: 0, expr: 'closed', focus: 'camera', lead: true } },
  make: {
    ...anim('beaker_set', 'photo', 'door', 'dish1', 'dish2'),
    // the burp: a green puff with volume (the hook's payoff, and the motif: it comes back at the Nobel)
    burp: { kind: 'smoke', at: { head: 'kip', up: -0.32, fwd: 0.36 }, size: 0.24, count: 10, color: GAS, life: 1.3, rise: 0.22, seed: 4 },
    burp2: { kind: 'smoke', at: { head: 'kip', up: -0.32, fwd: 0.36 }, size: 0.22, count: 9, color: GAS, life: 1.1, rise: 0.2, seed: 9 },
    // the gas that rolls out at the camera and fills the frame: the FX wipe into the kitchen (putrid breath)
    gas: { kind: 'smoke', at: { head: 'kip', up: -0.25, fwd: 0.45 }, size: 0.85, count: 18, color: GAS, life: 3.0, rise: 0.08, seed: 7, spread: 1.4 },
  },
  beats: [
    // l01: frame 0 he is mid-CHUG, head and back thrown back, the beaker upended; the bugs slide down the glass
    { f: -40, ...set('beaker_set', 'show', 0) }, { f: -26, who: 'kip', do: 'chug', hold: 94 },
    { ...at('l01', 'bacteria.', -4), who: 'kip', expr: 'deadpan', look: 'camera' },
    // "On purpose.": SLAM, the empty beaker crashes down on the trolley; a green burp; the grin
    { ...at('l01', 'on', -11), who: 'kip', do: 'slam_beaker', hold: 60, expr: 'grin', look: 'camera' },
    { ...at('l01', 'purpose.', -1), who: 'kip', do: 'sound', name: 'thud', strength: 0.9 },
    { ...at('l01', 'purpose.', 2), ...fire('burp') }, { ...at('l01', 'purpose.', 2), who: 'kip', do: 'sound', name: 'pop', strength: 0.5 },
    // l07 1984: the same trolley, the broth full again, two culture dishes on the bench; he rubs his hands
    { ...at('l07', '1984.', -10), who: 'kip', do: 'place', to: [0.1, 0.05, 0], yaw: 0 },
    { ...at('l07', '1984.', -10), ...set('beaker_set', 'show', 1) }, { ...at('l07', '1984.', -10), ...set('beaker_set', 'level', 1) },
    { ...at('l07', '1984.', -2), who: 'kip', do: 'dust_hands', hold: 40, expr: 'sly', look: 'camera' },
    // "Two dishes of the bug go into a beaker": each dish tips in, plop, the broth clouds green (his hands on them)
    { ...at('l07', 'two', -8), who: 'kip', do: 'reach', hand: 'L', to: [0.22, -0.40, 1.15], dur: 12, look: 'beaker_set', expr: 'suspicious' },
    { ...at('l07', 'two', -6), ...set('dish1', 'tip', 1, 30, { ease: 'linear' }) },
    { ...at('l07', 'go', 0), ...set('beaker_set', 'plop', 1, 6, { sound: 'pop', strength: 0.6 }) },
    { ...at('l07', 'bug', -6), who: 'kip', do: 'reach', hand: 'R', to: [0.46, -0.40, 1.15], dur: 12 },
    { ...at('l07', 'bug', -4), ...set('dish2', 'tip', 1, 30, { ease: 'linear' }) },
    { ...at('l07', 'beef', 0), ...set('beaker_set', 'plop', 2, 6, { sound: 'pop', strength: 0.6 }) },
    { ...at('l07', 'broth,', 0), who: 'kip', do: 'idle', fade: 10 },
    // "and down it goes": the hook again, now we know why: he grabs it and chugs
    { ...at('l07', 'and', -6), ...set('beaker_set', 'show', 0) },
    { ...at('l07', 'and', -8), who: 'kip', do: 'chug', hold: 40, expr: 'closed' },
    // l08 "He doesn't clear it with the hospital": at the corridor door, he eases it shut on the ETHICS COMMITTEE
    { ...at('l08', 'he', -6), who: 'kip', do: 'place', to: [3.0, 0.95, 0], yaw: 70 },
    { ...at('l08', 'he', -2), who: 'kip', do: 'tiptoe', hold: 30, expr: 'nervous', look: 'door' },
    { ...at('l08', 'clear', -2), who: 'kip', do: 'reach', hand: 'R', to: [3.55, 1.45, 1.1], dur: 14 },
    { ...at('l08', 'clear', 2), ...set('door', 'shut', 1, 18, { ease: 'smoother', sound: 'clunk', soundAt: 18, strength: 0.4 }) },
    { ...at('l08', 'hospital,', -2), who: 'kip', do: 'shush', expr: 'sly', look: 'camera', hold: 16 },
    // "or his wife": back at the trolley, her photo laid face down
    { ...at('l08', 'or', -6), who: 'kip', do: 'place', to: [0.1, 0.05, 0], yaw: -10 },
    { ...at('l08', 'or', -4), who: 'kip', do: 'reach', hand: 'L', to: [-0.08, -0.47, 1.0], dur: 12, look: 'photo', expr: 'nervous' },
    { ...at('l08', 'wife.', -6), ...set('photo', 'down', 1, 8, { sound: 'clunk', strength: 0.5 }) },
    { ...at('l08', 'wife.', 6), who: 'kip', do: 'idle', fade: 12 },
    // "In his words: easier to get forgiveness than permission.": the shrug, the sly grin, then a burp he can't hold
    { ...at('l08', 'in', -2), who: 'kip', do: 'shrug', expr: 'sly', look: 'camera', hold: 22 },
    { ...at('l08', 'forgiveness', -4), who: 'kip', do: 'shush', expr: 'grin', look: 'camera', hold: 24 },
    { ...at('l08', 'permission.', 4), who: 'kip', expr: 'shock' },
    { ...at('l08', 'permission.', 6), ...fire('burp2') },
    { ...at('l08', 'permission.', 12), ...fire('gas') }, { ...at('l08', 'permission.', 12), who: 'kip', do: 'sound', name: 'hiss', strength: 0.7 },
    { ...at('l08', 'permission.', 10), who: 'kip', do: 'cough', n: 2 },
  ],
  direct: [
    // ---- l01: three framings in one place, chained by travels
    { at: { f: 0 }, intent: 'hook', why: 'frame 0 is the act itself: low under the lab lights, a doctor mid-chug, head back, the beaker upended',
      cam: { look: 'kip', up: -0.3, az: 60, el: -12, d: 2.0, lens: 30, ky: 0.42 }, dof: { gain: 0.2 } },
    { at: at('l01', 'beaker', -3), n: 10, travel: 'rush', intent: 'emphasise', why: '"a beaker of bacteria": rush in to the glass at his lips, the green bugs sliding down into him',
      cam: { look: 'kip', up: 0.05, az: 58, el: 4, d: 1.25, lens: 40, ky: 0.42 }, dof: { gain: 0.35 } },
    { at: at('l01', 'on', -6), n: 9, travel: 'rush', intent: 'payoff', why: '"On purpose.": snap back out and low as he slams it down; the kick lands on "purpose", the burp',
      cam: { look: 'kip.chest', az: -12, el: -10, d: 2.6, lens: 32, ky: 0.5 }, kick: [{ at: at('l01', 'purpose.', 0), amp: 0.7 }], dof: { gain: 0.2 } },
    // ---- l07 (1984): the year on the wall, then top-down on the dishes, then the chug from low again
    { at: at('l07', '1984.', -2), cut: 'cut', intent: 'establish-time', why: '"1984.": the room again, wide, the 1984 calendar on the wall, Kip rubbing his hands at the trolley',
      cam: { look: [-1.2, 0.5, 1.45], az: 10, el: 5, d: 4.6, lens: 26, ky: 0.48 }, to: { look: [-0.5, 0.3, 1.35], az: 6, el: 3, d: 3.6, lens: 27, ky: 0.48 }, move: { dur: 50, ease: 'inout' } },
    { at: at('l07', 'two', -10), n: 14, intent: 'high-angle', why: '"Two dishes of the bug go into a beaker": high over the trolley, his sly face behind, each dish tips in, plop, it goes green',
      cam: { look: [0.3, -0.42, 1.15], az: 24, el: 38, d: 1.6, lens: 30, ky: 0.55 }, dof: { gain: 0.15 } },
    { at: at('l07', 'and', -8), n: 12, travel: 'rush', intent: 'payoff', why: '"and down it goes": back down low like the hook (the rhyme), he chugs it all',
      cam: { look: 'kip', up: -0.35, az: 66, el: -12, d: 2.6, lens: 30, ky: 0.42 }, dof: { gain: 0.2 } },
    // ---- l08
    { at: at('l08', 'he', -6), cut: 'dissolve', n: 8, intent: 'act', why: '"doesn\'t clear it with the hospital": at the corridor door, tiptoe, he eases it shut on the lit ETHICS COMMITTEE',
      cam: { pos: [1.2, 0.9, 1.5], aim: [4.4, 1.9, 1.45], lens: 30 }, drift: 0.02 },
    { at: at('l08', 'or', -6), cut: 'dissolve', n: 8, intent: 'act', why: '"or his wife": close on his hand laying her photo face down on the trolley',
      cam: { look: [-0.05, -0.45, 1.05], az: -18, el: 22, d: 1.5, lens: 34, ky: 0.55 }, dof: { gain: 0.3 } },
    { at: at('l08', 'in', -4), n: 12, intent: 'quote', why: 'his own words: medium on him, shrug and shush; on "permission" the burp, the gas rolls at us and fills the frame',
      cam: { look: 'kip', az: 6, el: 0, d: 2.5, lens: 36, ky: 0.42 }, to: { look: 'kip', up: -0.1, az: 4, el: 0, d: 1.9, lens: 38, ky: 0.45 }, move: { from: at('l08', 'permission.', 4), to: at('l08', 'permission.', 26), ease: 'in' }, dof: { gain: 0.25 } },
  ],
};
