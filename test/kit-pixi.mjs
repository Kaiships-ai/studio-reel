// kit-pixi.mjs: run `pixi run <args>` inside an unzipped kit, as a buyer would (verify journeys use it; test/ may spawn pixi).
//   node test/kit-pixi.mjs <kit folder> <args...>      e.g. -e full node episode/make.mjs episodes/x vo
import { spawnSync } from 'node:child_process';
const [dir, ...args] = process.argv.slice(2);
const r = spawnSync('pixi', ['run', ...args], { cwd: dir, stdio: 'inherit', env: { ...process.env, PIXI_NO_TELEMETRY: '1' } });
process.exit(r.status ?? 1);
