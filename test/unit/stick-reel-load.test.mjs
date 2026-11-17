import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReel } from '../../styles/stick-man/tools/reel_load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('a reel that imports another film by /films/ and fetches a kit asset at load reads in Node (Hot Money bible films)', async () => {
  const slug = `_reel-load-test-${process.pid}`, dir = path.join(ROOT, 'films', slug);
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(path.join(dir, 'acts.js'), `const glb = await (await fetch(new Request('/styles/stick-man/assets/costume/hoodie_grey.glb'))).arrayBuffer();
export const act = { frames: [801, 1262], bytes: glb.byteLength };`);
    fs.writeFileSync(path.join(dir, 'reel.js'), `import { act } from '/films/${slug}/acts.js';\nexport default act;`);
    const reel = await loadReel(dir, 'reel.js');
    assert.deepEqual(reel.frames, [801, 1262]);
    assert.ok(reel.bytes > 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
