"""Convert the user's installed Jingji 1 scene assets to browser formats.

Reads PKG/TEX data only; never executes embedded SceneScript or shaders.
Format reference: github.com/Almamu/linux-wallpaperengine/docs/textures/TEXTURE_FORMAT.md
"""
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('D:/steam/steamapps/workshop/content/431960/3715870843/scene.pkg')
target = root / 'assets' / 'archive' / 'wallpaper'
target.mkdir(parents=True, exist_ok=True)
data = source.read_bytes()
position = 0

def uint():
    global position
    value = struct.unpack_from('<I', data, position)[0]
    position += 4
    return value

def string():
    global position
    size = uint()
    value = data[position:position + size].decode('utf-8')
    position += size
    return value

assert string() == 'PKGV0024'
entries = {}
for _ in range(uint()):
    name = string()
    entries[name] = (uint(), uint())
base = position

def read(name):
    offset, size = entries[name]
    return data[base + offset:base + offset + size]

def lz4(block, expected):
    out = bytearray()
    pos = 0
    while pos < len(block):
        token = block[pos]
        pos += 1
        literal = token >> 4
        if literal == 15:
            while True:
                extra = block[pos]
                pos += 1
                literal += extra
                if extra < 255:
                    break
        out.extend(block[pos:pos + literal])
        pos += literal
        if pos >= len(block):
            break
        offset = int.from_bytes(block[pos:pos + 2], 'little')
        pos += 2
        length = (token & 15) + 4
        if (token & 15) == 15:
            while True:
                extra = block[pos]
                pos += 1
                length += extra
                if extra < 255:
                    break
        assert 0 < offset <= len(out)
        while length:
            chunk = min(offset, length)
            out.extend(out[len(out) - offset:len(out) - offset + chunk])
            length -= chunk
    assert len(out) == expected
    return bytes(out)

def texture(name):
    tex = read(name)
    assert tex[:18] == b'TEXV0005\0TEXI0001\0'
    fmt, flags, tw, th, iw, ih, _ = struct.unpack_from('<7I', tex, 18)
    assert tex[46:55] == b'TEXB0004\0'
    count, image_format, video, mipmaps = struct.unpack_from('<4I', tex, 55)
    assert count == 1 and video == 0
    width, height, compressed, unpacked, size = struct.unpack_from('<5I', tex, 71)
    pixels = tex[91:91 + size]
    if compressed:
        pixels = lz4(pixels, unpacked)
    if image_format != 0xffffffff:
        image = Image.open(io.BytesIO(pixels)).convert('RGBA')
    elif fmt in (4, 6, 7):
        bcn = {4: (3, 'DXT5'), 6: (2, 'DXT3'), 7: (1, 'DXT1')}[fmt]
        image = Image.frombytes('RGBA', (width, height), pixels, 'bcn', bcn)
    elif fmt == 0:
        image = Image.frombytes('RGBA', (width, height), pixels)
    elif fmt == 9:
        image = Image.frombytes('L', (width, height), pixels).convert('RGBA')
    else:
        raise ValueError(f'Unsupported texture format {fmt}: {name}')
    return image.crop((0, 0, iw, ih))

textures = {}
for name in entries:
    if not name.endswith('.tex') or '/masks/' in name or '/effects/' in name or '_depth' in name:
        continue
    stem = Path(name).stem
    if stem.startswith('Firefly_'):
        label = 'background'
    elif stem == '人物23':
        label = 'subject'
    elif stem == 'tiel':
        label = 'chain'
    elif stem == '环':
        label = 'halo'
    elif stem.startswith('Magic Circle'):
        label = 'circle-' + stem.split('(')[1].split(')')[0]
    else:
        label = 'ornament'
    image = texture(name)
    image.save(target / f'{label}.webp', 'WEBP', lossless=True, method=4)
    textures[name.removeprefix('materials/').removesuffix('.tex')] = label + '.webp'
    print(f'{label}: {image.size}, {(target / (label + ".webp")).stat().st_size:,} bytes')

scene = json.loads(read('scene.json'))
layers = []
for obj in scene['objects']:
    if not obj.get('image'):
        continue
    model = json.loads(read(obj['image']))
    material = json.loads(read(model['material']))
    tex_name = material['passes'][0]['textures'][0]
    layer = {key: obj[key] for key in ('id', 'name', 'parent', 'origin', 'angles', 'scale', 'size', 'color', 'alpha', 'parallaxDepth') if key in obj}
    for key in ('origin', 'angles', 'scale', 'color', 'alpha'):
        value = layer.get(key)
        if isinstance(value, dict):
            if key == 'angles':
                layer['spin'] = value.get('scriptproperties', {}).get('speed', 0)
            layer[key] = value.get('value')
    layer['file'] = textures[tex_name]
    layers.append(layer)
manifest = {'source': 'https://steamcommunity.com/sharedfiles/filedetails/?id=3715870843', 'author': 'IMMORTAL', 'size': scene['general']['orthogonalprojection'], 'layers': layers}
(target / 'scene-data.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
sound = next(name for name in entries if name.endswith('.mp3'))
(target / 'soundtrack.mp3').write_bytes(read(sound))
print('Imported original image layers, scene manifest, and soundtrack.')
