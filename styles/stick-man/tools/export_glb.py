# Blender -> .glb for the stick-man sets (GLB.md). Runs inside Blender, headless, on a COPY of the source .blend:
#   Blender -b <copy.blend> --python styles/stick-man/tools/export_glb.py -- --out styles/stick-man/assets/<pack> [--pieces a,b] [--max-kb 1500] [--tex 512]
# Each piece is one kit master collection (KIT_<group>_<name>) or one object. Per piece: every visible mesh, curve and
# text (collection instances flattened) is evaluated with its modifiers, baked to world space, merged into ONE mesh,
# triangulated. A material whose colour comes from an image keeps it: the Mapping node is baked into the UVs and the
# image is resized to <= --tex px and stored as JPEG inside the .glb; every other material is a flat base colour.
# No Draco (the stock GLTFLoader reads it); metres, glTF +Y up. Material names: tex_|flat_ + e_ (emissive) | s_.
# Origin = the kit's own origin (buildings: facade plane y = 0, body in +y; vehicles point +x; street pieces centred).
# A piece over --max-kb is decimated until it fits. Writes <name>.glb per piece and manifest.json (sizes, bounds, tris).
import bpy, bmesh, sys, os, json, re, time
import numpy as np
from mathutils import Matrix, Euler, Vector

DEFAULT = [
    'facades_corner_shop', 'facades_brick_walkup', 'facades_stone_bank', 'facades_diner', 'facades_police_station',
    'facades_glass_tower', 'street_street_lamp', 'street_tree', 'street_bench', 'street_hydrant', 'street_mailbox',
    'street_trash_can', 'street_bus_stop', 'street_newsbox', 'vehicles_sedan', 'vehicles_taxi',
    'street_sidewalk_0e7e2', 'street_road_straight_0a81b',
]

def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = {'out': None, 'pieces': ','.join(DEFAULT), 'max-kb': '1500', 'tex': '512'}
    for i in range(0, len(a) - 1, 2): o[a[i].lstrip('-')] = a[i + 1]
    if not o['out']: raise SystemExit('export_glb: --out DIR is required')
    return o

def s2l(c):                                    # sRGB -> linear
    c = np.clip(c, 0, 1); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

_IMG = {}
def img_mean(img):
    if img.name in _IMG: return _IMG[img.name]
    v = None
    try:
        n = len(img.pixels)
        if n:
            px = np.empty(n, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)[::7, :3]
            m = px.mean(axis=0)
            v = s2l(m) if img.colorspace_settings.name.lower().startswith('srgb') and not img.is_float else m
    except Exception: v = None
    _IMG[img.name] = v; return v

def flat(mat):
    """(rgb linear, emissive 0/1, roughness) for a kit material"""
    if mat is None: return (0.5, 0.5, 0.5), 0, 0.8
    rgb, emis, rough = None, 0, 0.75
    nodes = mat.node_tree.nodes if mat.use_nodes and mat.node_tree else []
    for n in nodes:
        if n.type == 'GROUP' and 'Color' in n.inputs:
            i = n.inputs['Color']
            if not i.is_linked: rgb = tuple(i.default_value[:3])
            if 'Glow' in n.inputs and not n.inputs['Glow'].is_linked and n.inputs['Glow'].default_value > 0.05: emis = 1
        if n.type == 'EMISSION':
            emis = 1
            if not n.inputs['Color'].is_linked and rgb is None: rgb = tuple(n.inputs['Color'].default_value[:3])
        if n.type == 'BSDF_PRINCIPLED' and rgb is None and not n.inputs['Base Color'].is_linked:
            rgb = tuple(n.inputs['Base Color'].default_value[:3]); rough = n.inputs['Roughness'].default_value
    if rgb is None:
        for n in nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                m = img_mean(n.image)
                if m is not None: rgb = tuple(float(x) for x in m); break
    if rgb is None: rgb = tuple(mat.diffuse_color[:3])
    return tuple(round(float(x), 3) for x in rgb), emis, round(float(rough), 2)

def tex_info(mat):
    """(image, mapping matrix or None) for the image that feeds the material's colour, else None"""
    if not mat or not mat.use_nodes or not mat.node_tree: return None
    for want in ('GROUP', 'EMISSION', 'BSDF_PRINCIPLED'):
        for l in mat.node_tree.links:
            if l.from_node.type == 'TEX_IMAGE' and l.from_node.image and l.to_node.type == want and l.to_socket.name in ('Color', 'Base Color'):
                t = l.from_node; v = t.inputs['Vector']; M = None
                if v.is_linked and v.links[0].from_node.type == 'MAPPING':
                    mp = v.links[0].from_node; g = lambda k: mp.inputs[k].default_value
                    M = Matrix.LocRotScale(Vector(g('Location')), Euler(g('Rotation')), Vector(g('Scale')))
                    if mp.vector_type == 'TEXTURE': M = M.inverted()
                return t.image, M
    return None

_SMALL = {}
def small(img, px):
    """a copy of img no larger than px on its long side (shared per image)"""
    if img.name in _SMALL: return _SMALL[img.name]
    w, h = img.size; c = img.copy(); c.name = 'glb_' + img.name
    if max(w, h) > px: c.scale(max(1, round(w * px / max(w, h))), max(1, round(h * px / max(w, h))))
    _SMALL[img.name] = c; return c

def mat_key(mat):
    rgb, emis, rough = flat(mat); t = tex_info(mat)
    return (('tex', t[0].name, emis, rough), t) if t else (('flat', rgb, emis, rough), None)

def find_piece(name):
    c = bpy.data.collections.get('KIT_' + name) or bpy.data.collections.get(name)
    if c: return c
    o = bpy.data.objects.get(name)
    if o: return o
    raise SystemExit(f'export_glb: no collection KIT_{name} / {name} and no object {name}')

def depsgraph(scn):
    vl = scn.view_layers[0]
    with bpy.context.temp_override(scene=scn, view_layer=vl):
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    return dg

def build(piece, scn, texpx=512):
    """flatten a collection (or one object) into a single triangulated mesh object with flat materials"""
    for c in list(scn.collection.children): scn.collection.children.unlink(c)
    for o in list(scn.collection.objects): scn.collection.objects.unlink(o)
    if isinstance(piece, bpy.types.Collection): scn.collection.children.link(piece)
    else: scn.collection.objects.link(piece)
    dg = depsgraph(scn)
    bm = bmesh.new(); mats = {}
    for inst in dg.object_instances:
        ob = inst.object
        if ob.type not in ('MESH', 'CURVE', 'FONT', 'SURFACE', 'META'): continue
        try: me = ob.to_mesh()
        except RuntimeError: continue
        if me is None or not len(me.polygons): ob.to_mesh_clear(); continue
        me = me.copy(); ob.to_mesh_clear()
        me.transform(Matrix(inst.matrix_world))
        if inst.matrix_world.determinant() < 0: me.flip_normals()
        if not me.uv_layers: me.uv_layers.new(name='UVMap')
        for u in list(me.uv_layers)[1:]: me.uv_layers.remove(u)
        me.uv_layers[0].name = 'UVMap'; uv = me.uv_layers[0].data
        remap, maps = [], []
        for s in (me.materials if len(me.materials) else [None]):
            key, t = mat_key(s)
            if key not in mats: mats[key] = (len(mats), t[0] if t else None)
            remap.append(mats[key][0]); maps.append(t[1] if t else None)
        for p in me.polygons:
            si = min(p.material_index, len(remap) - 1); M = maps[si]
            if M is not None:
                for li in p.loop_indices: q = M @ Vector((uv[li].uv[0], uv[li].uv[1], 0)); uv[li].uv = (q[0], q[1])
            p.material_index = remap[si]
        bm.from_mesh(me); bpy.data.meshes.remove(me)
    if isinstance(piece, bpy.types.Collection): scn.collection.children.unlink(piece)
    else: scn.collection.objects.unlink(piece)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new('piece'); bm.to_mesh(me); bm.free()
    for key, (i, img) in sorted(mats.items(), key=lambda kv: kv[1][0]):
        kind, val, emis, rough = key
        m = bpy.data.materials.new(f'{kind}_{"e" if emis else "s"}_{i}'); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0.0
        if kind == 'tex':
            t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = small(img, texpx)
            m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
        else:
            b.inputs['Base Color'].default_value = (*val, 1)
            if emis: b.inputs['Emission Color'].default_value = (*val, 1); b.inputs['Emission Strength'].default_value = 1.0
        me.materials.append(m)
    return me

def export(me, path, scn):
    ob = bpy.data.objects.new(os.path.splitext(os.path.basename(path))[0], me); scn.collection.objects.link(ob)
    vl = scn.view_layers[0]                         # the export scene holds only this object: export the whole scene
    with bpy.context.temp_override(scene=scn, view_layer=vl):
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_active_scene=True, export_apply=True, export_yup=True,
            export_texcoords=True, export_normals=True, export_image_format='JPEG', export_jpeg_quality=82, export_materials='EXPORT', export_draco_mesh_compression_enable=False,
            export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    scn.collection.objects.unlink(ob); bpy.data.objects.remove(ob)

def main():
    o = args(); out = os.path.abspath(o['out']); os.makedirs(out, exist_ok=True); maxb = int(o['max-kb']) * 1000
    scn = bpy.data.scenes.new('GLB_EXPORT')
    man = {'source': os.path.basename(bpy.data.filepath), 'pieces': {}}
    t_all = time.time()
    for name in [p.strip() for p in o['pieces'].split(',') if p.strip()]:
        t0 = time.time(); short = re.sub(r'_[0-9a-f]{5}$', '', re.sub(r'^(facades|street|vehicles|filler)_', '', name))   # drop group + variant hash
        me = build(find_piece(name), scn, int(o['tex'])); path = os.path.join(out, short + '.glb')
        ratio = 1.0
        while True:
            export(me, path, scn)
            if os.path.getsize(path) <= maxb or ratio < 0.05: break
            ratio *= 0.6                                    # too big: decimate a copy and try again
            tmp = bpy.data.objects.new('dec', me.copy()); scn.collection.objects.link(tmp)
            d = tmp.modifiers.new('d', 'DECIMATE'); d.ratio = ratio
            dg = depsgraph(scn); ev = tmp.evaluated_get(dg)
            nm = bpy.data.meshes.new_from_object(ev); scn.collection.objects.unlink(tmp); bpy.data.objects.remove(tmp)
            me = nm
        v = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get('co', v); v = v.reshape(-1, 3)
        man['pieces'][short] = {'from': name, 'bytes': os.path.getsize(path), 'tris': len(me.polygons), 'materials': len(me.materials),
            'lo': [round(float(x), 3) for x in v.min(0)], 'hi': [round(float(x), 3) for x in v.max(0)],
            'decimate': round(ratio, 3), 'sec': round(time.time() - t0, 2)}
        print('GLB', short, man['pieces'][short], flush=True)
    man['total_bytes'] = sum(p['bytes'] for p in man['pieces'].values()); man['sec'] = round(time.time() - t_all, 2)
    with open(os.path.join(out, 'manifest.json'), 'w') as f: json.dump(man, f, indent=1)
    print('GLB total', man['total_bytes'], 'bytes', man['sec'], 's', flush=True)

main()
