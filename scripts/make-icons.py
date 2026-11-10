"""Build Gainmark's app icon set from the user's flattened 1080px icon.

Separates the dumbbell from the dark gradient (fits the gradient as a plane,
then un-blends each pixel), so it can be re-placed inside Android's safe zone.
Usage: python -I scripts/make-icons.py assets/source/gainmark-icon-original.png assets/images assets/source
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

src_path, out_dir, source_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
src = Image.open(src_path).convert('RGB')
W, H = src.size
px = np.asarray(src).astype(np.float64)

# 1. Fit the background gradient: per channel, value = a + b*x + c*y.
ys, xs = np.mgrid[0:H, 0:W]
sat = px.max(axis=2) - px.min(axis=2)
bgmask = (px.max(axis=2) < 90) & (sat < 12)
def terms(x, y):
    x, y = x / W, y / H
    return [np.ones_like(x), x, y, x * x, y * y, x * y, x ** 3, y ** 3, x * x * y, x * y * y]


A = np.stack(terms(xs[bgmask].astype(float), ys[bgmask].astype(float)), axis=1)
coef = [np.linalg.lstsq(A, px[..., ch][bgmask], rcond=None)[0] for ch in range(3)]
T = terms(xs.astype(float), ys.astype(float))
bg = np.stack([sum(k * t for k, t in zip(c, T)) for c in coef], axis=2)
resid = np.abs(px[bgmask] - bg[bgmask]).mean()
print(f'background fit: mean residual {resid:.2f}')

# 2. Un-blend: alpha from how far each pixel is pushed toward a light colour.
diff = px - bg
alpha = np.clip((diff / np.maximum(255 - bg, 1)).max(axis=2) * 1.04, 0, 1)
alpha[alpha < 0.06] = 0
safe = np.where(alpha > 0, alpha, 1)[..., None]
fg = np.clip(bg + diff / safe, 0, 255)
rgba = np.dstack([fg, alpha * 255]).round().astype(np.uint8)
fg_img = Image.fromarray(rgba, 'RGBA')

opaque = alpha > 0.5
yy, xx = np.nonzero(alpha > 0.06)
x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
print(f'dumbbell bbox: x {x0}-{x1}, y {y0}-{y1}')
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
# Furthest visible pixel from the centre decides how small it must be for a circle mask.
radius = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2).max()
crop = fg_img.crop((x0, y0, x1, y1))


def place(canvas: int, max_radius_frac: float) -> Image.Image:
    """Dumbbell centred on a transparent square, its furthest pixel at max_radius_frac * canvas."""
    scale = (max_radius_frac * canvas) / radius
    w, h = round(crop.width * scale), round(crop.height * scale)
    small = crop.resize((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    out.paste(small, ((canvas - w) // 2, (canvas - h) // 2), small)
    return out


source_dir.mkdir(parents=True, exist_ok=True)
src.save(source_dir / 'gainmark-icon-original.png')

# iOS / general icon: the user's design as-is (opaque, 1024).
icon = src.resize((1024, 1024), Image.LANCZOS)
icon.save(out_dir / 'icon.png')

# Android adaptive icon. Safe circle radius is 33/108 of the canvas; stay a bit inside it.
SAFE = 0.29
place(512, SAFE).save(out_dir / 'android-icon-foreground.png')

bg_img = Image.fromarray(np.clip(bg, 0, 255).round().astype(np.uint8), 'RGB').resize((512, 512), Image.LANCZOS)
bg_img.save(out_dir / 'android-icon-background.png')

# Android 13+ themed icon: single-colour silhouette.
mono = place(432, SAFE)
m = np.asarray(mono).copy()
m[..., :3] = 255
Image.fromarray(m, 'RGBA').save(out_dir / 'android-icon-monochrome.png')

# Splash: the dumbbell alone on transparent, tightly cropped.
splash_w = 800
crop.resize((splash_w, round(crop.height * splash_w / crop.width)), Image.LANCZOS).save(out_dir / 'splash-icon.png')

# Web favicon.
src.resize((48, 48), Image.LANCZOS).save(out_dir / 'favicon.png')

# Preview sheet: Android circle + squircle masks, so the crop can be checked by eye.
def masked(shape: str) -> Image.Image:
    s = 400
    layer = Image.alpha_composite(bg_img.convert('RGBA'), place(512, SAFE)).resize((s, s), Image.LANCZOS)
    # Adaptive icons show the middle 72/108 of the layer.
    inset = round(s * 18 / 108)
    layer = layer.crop((inset, inset, s - inset, s - inset)).resize((s, s), Image.LANCZOS)
    mask = Image.new('L', (s, s), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(mask)
    if shape == 'circle':
        d.ellipse((0, 0, s - 1, s - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * 0.3, fill=255)
    out = Image.new('RGBA', (s, s), (255, 255, 255, 0))
    out.paste(layer, (0, 0), mask)
    return out

sheet = Image.new('RGBA', (1300, 440), (235, 235, 235, 255))
sheet.paste(masked('circle'), (20, 20), masked('circle'))
sheet.paste(masked('squircle'), (450, 20), masked('squircle'))
ios = icon.convert('RGBA').resize((400, 400), Image.LANCZOS)
iosmask = Image.new('L', (400, 400), 0)
from PIL import ImageDraw
ImageDraw.Draw(iosmask).rounded_rectangle((0, 0, 399, 399), radius=90, fill=255)
sheet.paste(ios, (880, 20), iosmask)
sheet.save(source_dir / 'icon-preview.png')
print('done')
