// A name of this repository in a release zip lets a buyer follow it back here. release/build.mjs refuses such a zip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseManifest, repoLinks } from '../../release/build.mjs';

const { identity } = parseManifest(readFileSync(new URL('../../kit.manifest', import.meta.url), 'utf8'));
const zip = files => [Object.keys(files), f => Buffer.from(files[f], 'latin1')];

test('the repository named anywhere fails the build: docs, code, the exempt notices, a binary, a path, any case', () => {
  const [files, blob] = zip({
    'README.md': 'Clone https://github.com/Kaiships-ai/studio-reel',
    'kit/x.mjs': "fetch('https://raw.githubusercontent.com/KAISHIPS-AI/x/main/y')",
    'THIRD_PARTY_NOTICES.md': 'see kaiships-ai',
    'styles/a/cover.jpg': '\xff\xd8\xff\xe1<xmp>studio-reel</xmp>\xff\xd9',
    'styles/kinebeo/x.txt': '',
  });
  const hits = repoLinks(files, blob, identity).map(e => e.split(':')[0]);
  assert.deepEqual([...new Set(hits)], ['README.md', 'kit/x.mjs', 'THIRD_PARTY_NOTICES.md', 'styles/a/cover.jpg', 'styles/kinebeo/x.txt']);
});

test('the product name, its social handle and third-party repositories are not a link to this repository', () => {
  const [files, blob] = zip({
    'README.md': 'Kaiships Studio, @kaiships.ai, kaiships-studio-pro-1.6.zip',
    'kit/assets.json': '{"repo":"lemomo-ai/lemo-opuscar"}',
    'TECHNIQUE.md': 'https://github.com/google/fonts',
  });
  assert.deepEqual(repoLinks(files, blob, identity), []);
});
