// A style page that loads a font file the release zip lacks falls back to a browser font with no error.
// release/build.mjs refuses to build such a zip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { missingFonts } from '../../release/build.mjs';

const zip = files => [Object.keys(files), f => Buffer.from(files[f])];

test('a font a style loads but the zip lacks fails the build, naming the page and the url', () => {
  const [files, blob] = zip({
    'styles/a/demo/fonts.css': "@font-face{src:url(fonts/A.woff2) format('woff2')}@font-face{src:url('fonts/B.ttf')}",
    'styles/a/demo/fonts/A.woff2': '',
  });
  assert.deepEqual(missingFonts(files, blob), ['styles/a/demo/fonts.css: font fonts/B.ttf is not in the zip']);
});

test('relative, parent and root paths resolve; remote fonts, /core/fonts and images are not checked', () => {
  const [files, blob] = zip({
    'styles/a/demo/fonts/fonts.css': '@font-face{src:url(A.woff2)} @font-face{src:url(../../kit/B.otf?v=2)}',
    'styles/a/demo/index.html': '<style>@font-face{src:url("/styles/a/demo/fonts/A.woff2")} @font-face{src:url(https://x.org/C.woff2)} @font-face{src:url(/core/fonts/D.ttf)} body{background:url(bg.png)}</style>',
    'styles/a/demo/fonts/A.woff2': '', 'styles/a/kit/B.otf': '',
  });
  assert.deepEqual(missingFonts(files, blob), []);
});
