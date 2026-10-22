// character.js: this film's presenter, the human drawn by kai(pose, x, y, h, o) (engine/kaip.js).
// Design one in character-designer.html at the library root, press "Copy for Claude" and paste the
// `character-spec v1` block into Claude Code: each `key: value` line becomes the same key here.
// The values below are the default presenter. A missing key keeps its default; an unknown value is a page warning.
//   skin, hair_color, accessory_color, top_color, pants_color: '#RRGGBB'
//   eyes: classic | big | sleepy | lashes          brows: classic | thick | thin | arched | none
//   hair: curly | short | long | bun | spiky | afro | bald      facial_hair: none | stubble | moustache | goatee | beard
//   glasses: round | square | big | sunglasses | none          accessory: none | cap | beanie | headband | headphones | earrings
//   top: tee | hoodie | shirt | jacket | sweater
//   name: what the script, captions and storyboard call the presenter (not drawn)
const CHARACTER = {
  name: 'Presenter',
  skin: '#E4AE84', eyes: 'classic', brows: 'classic',
  hair: 'curly', hair_color: '#261E2B', facial_hair: 'none',
  glasses: 'round', accessory: 'none', accessory_color: '#D93A27',
  top: 'tee', top_color: '#2B2733', pants_color: '#1F1B26',
};
