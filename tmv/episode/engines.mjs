// engines.mjs: one episode engine per style ("style" in episode.json or series.json, default 3d). make.mjs render
// copies the style's page into the episode folder and renders it there, so the page fetches episode.json,
// ../series.json and vo/vo.json next to it.
//
// An engine is a page (index.html) and its module. The module gets the episode, its voice and its timeline from
// episode/timeline.js (loadEpisode, cardsOf, timeline: shots cut on word starts, caption words, the HUD), draws
// each cast card in its own style (core/character-card.mjs: toPaper, toHandDraw; 3D reads the card as it is), and
// keeps the contract of core/render/video.mjs: window.render(t), window.DUR, window.READY.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_STYLE = '3d';
export const ENGINES = {
  '3d': { name: '3D', page: 'episode/index.html' },
  paper: { name: 'paper', page: 'episode/paper/index.html' },
  handdraw: { name: 'hand-draw', page: 'episode/handdraw/index.html' },
};

/** The page that renders `style` (undefined = 3d), as a path under `root`; throws one line when it is not built. */
export function enginePage(style = DEFAULT_STYLE, root) {
  const e = ENGINES[style];
  if (!e) throw new Error(`"style": "${style}" is not one of ${Object.keys(ENGINES).join(', ')}`);
  const page = join(root, e.page);
  if (!existsSync(page)) throw new Error(`the ${e.name} engine is not built yet (no ${e.page}): set "style": "${DEFAULT_STYLE}" to render this episode now`);
  return page;
}
