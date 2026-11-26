# Mixamo captures (joints only)

Settings for every download (Kai, 26/11): Format FBX Binary (.fbx), 30 fps, Skin: Without Skin, Keyframe Reduction: none, In Place
where the animation offers it (a capture with no In Place box is used as it comes), Y Bot, default sliders, no trim, no mirror.

Convert with `/Applications/Blender.app/Contents/MacOS/Blender -b --python styles/stick-man/tools/run/mocap_dump.py -- <in.fbx> <out.json>`,
keep the joints the other files here keep (Hips, Spine1, Neck, Head, HeadTop_End, arms, legs, toes, Hips_f/u, Spine2_f/u, Head_f/u) and
save as `<name>.js` (`export default { source, fps: 30, frames }`, first line a comment). One FBX a clip; download one, open the
Download dialog, check Skin says "Without Skin" (the page keeps the last setting), download the next.

`ELDER-PICKS.md` lists the elder batch: what was picked, and what the gates said.
