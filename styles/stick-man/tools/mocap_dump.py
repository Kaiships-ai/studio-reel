# Dump a rigged animation to joint positions a frame, for motion-lib/ref/mocap.js:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python styles/stick-man/tools/mocap_dump.py -- <in.fbx> <out.json> [action]
# then keep the joints mocap.js reads and save them as motion-lib/ref/<source>/<name>.js (export default {...}).
# Two rigs are read, both written in Mixamo's names and axes (the character facing -Y, its left at +X, Z up):
#   - Mixamo (mixamorig:Hips ...), one animation a file
#   - Quaternius' Universal Animation Library (UE-style pelvis / thigh_l ..., CC0), many animations a file: [action]
#     names one (e.g. Push_Loop); the rig faces +Y with its left at -X, so it is turned half round about Z
import bpy, sys, json
from mathutils import Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
pick = argv[2] if len(argv) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=False)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
names = [b.name for b in arm.pose.bones]
UAL = {'Hips': 'pelvis', 'Spine1': 'spine_02', 'Spine2': 'spine_03', 'Neck': 'neck_01', 'Head': 'Head',
       'LeftArm': 'upperarm_l', 'LeftForeArm': 'lowerarm_l', 'LeftHand': 'hand_l', 'RightArm': 'upperarm_r', 'RightForeArm': 'lowerarm_r', 'RightHand': 'hand_r',
       'LeftUpLeg': 'thigh_l', 'LeftLeg': 'calf_l', 'LeftFoot': 'foot_l', 'LeftToeBase': 'ball_l', 'RightUpLeg': 'thigh_r', 'RightLeg': 'calf_r', 'RightFoot': 'foot_r', 'RightToeBase': 'ball_r'}
ual = 'pelvis' in names
if pick:
    act = next(a for a in bpy.data.actions if a.name.split('|')[-1] == pick)
    arm.animation_data.action = act
act = arm.animation_data.action if arm.animation_data else None
f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
sc = bpy.context.scene
want = ['Hips','Spine','Spine1','Spine2','Neck','Head','HeadTop_End','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','LeftToe_End','RightUpLeg','RightLeg','RightFoot','RightToeBase','RightToe_End']
pref = names[0].split(':')[0] + ':' if ':' in names[0] else ''
bone = lambda w: arm.pose.bones.get(UAL[w]) if ual and w in UAL else (None if ual else arm.pose.bones.get(pref + w))
# Mixamo's axes: a UAL rig turned half round about Z; its body faces +Y in its own bind pose
turn = Quaternion((0, 0, 1), 3.141592653589793) if ual else Quaternion()
fwd = Vector((0, 1, 0)) if ual else Vector((0, -1, 0))
frames = []
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    d = {}
    for w in want:
        b = bone(w)
        if b: p = turn @ (arm.matrix_world @ b.head); d[w] = [round(p.x, 4), round(p.y, 4), round(p.z, 4)]
    # the trunk's and head's orientation (positions alone cannot say where the face points): each bone's turn from its
    # rest (bind) pose, applied to the body's forward and up in that pose, as <Bone>_f and <Bone>_u (unit vectors)
    for w in ['Hips', 'Spine2', 'Head']:
        b = bone(w)
        if not b: continue
        q = (arm.matrix_world @ b.matrix).to_quaternion() @ (arm.matrix_world @ b.bone.matrix_local).to_quaternion().inverted()
        for k, v in (('f', fwd), ('u', Vector((0, 0, 1)))):
            r = turn @ (q @ v); d[w + '_' + k] = [round(r.x, 4), round(r.y, 4), round(r.z, 4)]
    frames.append(d)
json.dump({'src': src, 'action': pick, 'fps': sc.render.fps, 'range': [f0, f1], 'bones': names, 'frames': frames}, open(out, 'w'))
print('DUMP', src, pick or '', 'fps', sc.render.fps, 'frames', f1 - f0 + 1, 'nbones', len(names), 'meshes', sum(o.type == 'MESH' for o in sc.objects))
