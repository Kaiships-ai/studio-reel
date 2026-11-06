// designer.mjs: serves the library on 127.0.0.1 for the character designer (3D pages cannot run from file://).
//   pixi run designer          prints the address to open in your browser; Ctrl+C stops it
import { serve } from '../core/render/serve.mjs';
import { ROOT } from '../kit/env.mjs';
const { port } = await serve(ROOT);
console.log(`Character designer: http://127.0.0.1:${port}/character-designer.html\n(open it in your browser; leave this running while you design; Ctrl+C stops it)`);
