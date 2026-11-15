// Adult_Act_TorchReady_Loop: standing, a torch (flashlight) held out ahead in the left fist (motion-lib/props.js torch, the
// same hand as Move_WalkFlashlight_Loop), from motion capture (Quaternius UAL "Idle_Torch_Loop", CC0, ref/ual/idle_torch_loop.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip, holdKeys } from '../../base.js';
import SRC from '../../ref/ual/idle_torch_loop.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_TorchReady_Loop', clip: 'Act_TorchReady_Loop', body: 'adult', group: 'Act', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['torch'], hands: 'L', marks: M.marks }, keys: holdKeys(M.keys, 'L', 'torch'), captured: M.captured, rest: M.rest };
