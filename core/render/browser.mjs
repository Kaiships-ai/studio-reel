// Headless Chrome launch options. The browser itself is Playwright's chromium-headless-shell (installed by
// `pixi run studio install`); PLAYWRIGHT_CHROME=/path/to/chrome-headless-shell uses another one.
// GPU flags come from kit/env.mjs: Metal on macOS, the system GPU elsewhere with SwiftShader allowed as a fallback.
// STUDIO_ANGLE=metal|gl|vulkan|swiftshader|default overrides the backend.
import { env } from '../../kit/env.mjs';

export const EXE = process.env.PLAYWRIGHT_CHROME || undefined;   // undefined = Playwright finds its own
export const ARGS = env().browser.args;

// Say once when WebGL runs in software (2D canvas pages are unaffected; rendering never fails because of it).
let warned = false;
export async function warnIfSoftwareGL(page) {
  if (warned) return; warned = true;
  try {
    const r = await page.evaluate(() => {
      const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return null;
      const e = g.getExtension('WEBGL_debug_renderer_info'), name = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '';
      g.getExtension('WEBGL_lose_context')?.loseContext(); return String(name);
    });
    if (r && /swiftshader|llvmpipe|software/i.test(r)) console.error(`[note] WebGL runs on software rendering (${r.slice(0, 80)}): rendering works but is slower. A machine with a GPU renders several times faster.`);
  } catch {}
}
