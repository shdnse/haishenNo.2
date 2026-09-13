"""Encode existing certificate pixels as lossless WebP for the archive wall."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
sources = [
    'Ai大学认证证书.png', 'Ai大学认证证书 (1).png',
    'Ai大学认证证书 (2).png', 'Ai大学认证证书 (3).png',
    'img_50225f3df651f93dc6eb3931aa52e673.png',
    'img_b544fc7e6850a9314dd3ccb9b9de4ba2.png',
    'img_c1c6e384de04e7517135c7b624d73d04.png',
    'img_c5ee885494f037bb59ff6baaaa695d32.png',
    '阿里达摩院高级.jpg', '阿里达摩院初级.png',
]
destination = root / 'assets' / 'archive' / 'certificates'
destination.mkdir(parents=True, exist_ok=True)
before = after = 0
for index, name in enumerate(sources, 1):
    source = root / name
    if source.suffix.lower() == '.jpg':
        print(f'{index:02}: reuse original JPEG without re-encoding')
        before += source.stat().st_size
        after += source.stat().st_size
        continue
    target = destination / f'{index:02}.webp'
    with Image.open(source) as image:
        original = image.convert('RGB')
        original.save(target, 'WEBP', lossless=True, method=6, exact=True)
        with Image.open(target) as encoded:
            assert encoded.convert('RGB').tobytes() == original.tobytes(), name
        print(f'{index:02}: {original.width}x{original.height} | {source.stat().st_size} -> {target.stat().st_size} bytes | identical pixels')
    before += source.stat().st_size
    after += target.stat().st_size
print(f'Total: {before:,} -> {after:,} bytes ({100 * (1 - after / before):.1f}% smaller)')
