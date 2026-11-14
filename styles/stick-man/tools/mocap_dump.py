# Dump a rigged animation (a Mixamo FBX) to joint positions a frame, for motion-lib/ref/mocap.js:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python styles/stick-man/tools/mocap_dump.py -- <in.fbx> <out.json>
# then keep the joints mocap.js reads and save them as motion-lib/ref/mixamo/<name>.js (export default {...}).
import bpy, sys, json
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=False)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
act = arm.animation_data.action if arm.animation_data else None
f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
sc = bpy.context.scene
names = [b.name for b in arm.pose.bones]
want = ['Hips','Spine','Spine1','Spine2','Neck','Head','HeadTop_End','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','LeftToe_End','RightUpLeg','RightLeg','RightFoot','RightToeBase','RightToe_End']
pref = names[0].split(':')[0] + ':' if ':' in names[0] else ''
frames = []
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    d = {}
    for w in want:
        b = arm.pose.bones.get(pref + w)
        if b: p = arm.matrix_world @ b.head; d[w] = [round(p.x, 4), round(p.y, 4), round(p.z, 4)]
    frames.append(d)
json.dump({'src': src, 'fps': sc.render.fps, 'range': [f0, f1], 'bones': names, 'frames': frames}, open(out, 'w'))
print('DUMP', src, 'fps', sc.render.fps, 'frames', f1 - f0 + 1, 'nbones', len(names), 'meshes', sum(o.type == 'MESH' for o in sc.objects))
