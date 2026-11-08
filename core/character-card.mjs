// character-card.mjs: one character, every style. A card is the TMV cast format (tmv/characters/cast.js, TMV_SEEDS):
//   { name, role, kind: human|bot, build, skin, hair, hairColor, top, topColor, legs, eyes, extra }
// The 3D episode engine reads a card as it is. toHandDraw(card) gives the kai-hand-draw presenter (the CHARACTER block
// of a film's src/character.js, the keys of styles/kai-hand-draw/engine/kaip.js) that looks the most like it, and
// lists what that style cannot show, so the buyer sees the same character whichever style they pick.

export const CARD = {
  kind: ['human', 'bot'],
  build: ['average', 'tall', 'small', 'round'],
  hair: ['short', 'bun', 'spiky', 'long', 'curly', 'none', 'jay'],
  top: ['hoodie', 'jacket', 'tee', 'vest'],
  eyes: ['dot', 'wide', 'sleepy', 'visor'],
  extra: ['none', 'headset', 'glasses', 'cap', 'scarf', 'antenna'],
};
const COLOURS = ['skin', 'hairColor', 'topColor', 'legs'];
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** The card's problems, one sentence each; an empty list is a valid card. */
export function checkCard(card) {
  const errs = [];
  if (!card || typeof card !== 'object') return ['a character card must be an object like {"name": "Nova", "kind": "human", ...}'];
  if (typeof card.name !== 'string' || !card.name.trim()) errs.push('"name" must be a text');
  for (const [k, opts] of Object.entries(CARD)) if (card[k] !== undefined && !opts.includes(card[k])) errs.push(`"${k}": "${card[k]}" is not one of ${opts.join(', ')}`);
  for (const k of COLOURS) if (card[k] !== undefined && !HEX.test(card[k])) errs.push(`"${k}": "${card[k]}" is not a colour like "#C9663A"`);
  return errs;
}

const HAIR = { short: 'short', bun: 'bun', spiky: 'spiky', long: 'long', curly: 'curly', none: 'bald', jay: 'short' };
const TOP = { hoodie: 'hoodie', jacket: 'jacket', tee: 'tee', vest: 'sweater' };
const EYES = { dot: 'classic', wide: 'big', sleepy: 'sleepy', visor: 'classic' };
const up = (c) => c && c.toUpperCase();

/** The hand-draw presenter for a card: { character, lost } — lost names what this style draws differently. */
export function toHandDraw(card) {
  const errs = checkCard(card);
  if (errs.length) throw new Error(`character card: ${errs.join('; ')}`);
  const lost = [];
  if (card.kind === 'bot') lost.push('a robot: hand-draw draws a person (Clawd is the show\'s robot there)');
  if (card.build && card.build !== 'average') lost.push(`build "${card.build}": one body size in hand-draw`);
  if (card.hair === 'jay') lost.push('hair "jay" (the 3D base figure\'s own hair): short hair');
  if (card.top === 'vest') lost.push('top "vest": a sweater');
  if (['scarf', 'antenna'].includes(card.extra)) lost.push(`extra "${card.extra}": not drawn`);
  const character = {
    name: card.name.trim(),
    skin: up(card.skin) ?? '#E4AE84',
    eyes: EYES[card.eyes] ?? 'classic',
    brows: 'classic',
    hair: HAIR[card.hair] ?? 'short',
    hair_color: up(card.hairColor) ?? '#261E2B',
    facial_hair: 'none',
    glasses: card.extra === 'glasses' ? 'round' : 'none',
    accessory: card.extra === 'headset' ? 'headphones' : card.extra === 'cap' ? 'cap' : 'none',
    accessory_color: '#2B2733',
    top: TOP[card.top] ?? 'tee',
    top_color: up(card.topColor) ?? '#2B2733',
    pants_color: up(card.legs) ?? '#1F1B26',
  };
  return { character, lost };
}
