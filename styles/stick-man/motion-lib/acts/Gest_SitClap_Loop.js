// Seated, clapping in front of the chest.
import { ownClip } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/sitting_clap.js';
import { BODIES } from '../bodies.js';
import { clapSource, loopSource, retime } from '../ref/perform.js';

// the capture claps on its frames 10-78, low over the knees: those, opened wider and carried up to the chest
// (a stooped body lifts them a further 15 cm for its stoop, so they still meet at its lowered chest, not over its knees)
const clap = body => retime(loopSource(clapSource(SRC, { open: 1.5 * BODIES[body].life.arm, meet: 0.12, up: 0.16 + 0.15 * (BODIES[body].perform.stoop ?? 0) }), 20, 76, 8), { rate: 1.15, cap: false });

export default act({ clip: 'Gest_SitClap_Loop', loop: true, base: 'SIT' }, body => ownClip({ body, src: clap(body), own: { arm: 0, lag: false }, ...seated(), loop: true, ease: 20 }));
