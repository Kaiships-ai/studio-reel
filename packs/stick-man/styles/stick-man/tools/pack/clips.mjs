// The motion library at a glance, and where a clip key ends (so the next key starts after it, never in the middle).
//   node styles/stick-man/tools/pack/clips.mjs                       every clip: name, bodies, loop or once, frames, start / end pose, props
//   node styles/stick-man/tools/pack/clips.mjs --end '{"f":0,"clip":"Move_Walk_Fwd_Loop","pos":[-2.4,-0.45],"to":[0.45,-0.35]}'
//        prints the frame the key's last pose lands on (a key's own pos / yaw, else pass "from": {"pos": [x, y], "yaw": deg})
import { ALL, placeClip } from '../../motion-lib/index.js';

const i = process.argv.indexOf('--end');
if (i > 0) {
  const k = JSON.parse(process.argv[i + 1]), from = k.from || { pos: k.pos || [0, 0], yaw: k.yaw ?? 0 };
  const p = placeClip(k, from), last = p.keys[p.keys.length - 1];
  console.log(`${k.clip} from frame ${k.f} ends at frame ${last.f} (${last.f - k.f} frames), at [${last.pos.slice(0, 2).map(v => v.toFixed(2))}] facing ${Math.round(last.yaw)} deg`);
} else {
  const by = new Map();
  for (const c of ALL) { const r = by.get(c.clip) || { clip: c.clip, bodies: [], c }; r.bodies.push(c.body || 'any'); by.set(c.clip, r); }
  console.log(`${ALL.length} clips (${by.size} names). Use: anim: { who: [{ f, clip, body?, pos?, yaw?, to?, times? }] }\n`);
  for (const r of [...by.values()].sort((a, b) => a.clip.localeCompare(b.clip))) {
    const c = r.c, props = c.needs?.props?.length ? `  holds ${c.needs.props.join(', ')}` : '', marks = c.needs?.marks?.length ? `  needs ${c.needs.marks.map(m => m.kind).join(', ')}` : '';
    console.log(`${r.clip.padEnd(28)} ${r.bodies.join(',').padEnd(30)} ${c.loop ? 'loop' : 'once'} ${String(c.frames).padStart(4)} f  ${c.base}${c.end && c.end !== c.base ? ' > ' + c.end : ''}${c.advance ? '  travels (to: [x, y])' : ''}${props}${marks}`);
  }
}
