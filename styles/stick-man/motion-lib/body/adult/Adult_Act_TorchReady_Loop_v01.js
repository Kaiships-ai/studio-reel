// Adult_Act_TorchReady_Loop: standing, a torch (flashlight) held out ahead, from motion capture (Quaternius UAL "Idle_Torch_Loop", CC0, ref/ual/idle_torch_loop.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/idle_torch_loop.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_TorchReady_Loop', clip: 'Act_TorchReady_Loop', body: 'adult', group: 'Act', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
