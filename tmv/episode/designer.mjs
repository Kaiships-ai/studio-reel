// designer.mjs: serves the library on 127.0.0.1 for the character designer (3D pages cannot run from file://).
//   pixi run designer          prints the address to open in your browser; Ctrl+C stops it
import { serve } from '../core/render/serve.mjs';
import { ROOT } from '../kit/env.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
// the page loads three.js from node_modules, which pixi run studio install puts there (its first minute)
if (!existsSync(join(ROOT, 'node_modules', 'three', 'build', 'three.module.js'))) { console.error('✗ designer: the 3D packages are not installed yet. Wait for pixi run studio install to finish (or run it), then run this again.'); process.exit(1); }
const { port } = await serve(ROOT);
console.log(`Character designer: http://127.0.0.1:${port}/character-designer.html\n(open it in your browser; leave this running while you design; Ctrl+C stops it)`);
