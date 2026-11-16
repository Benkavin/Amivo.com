"""Draws the amivo app icon (a sunrise over green hills) and writes every size the apps and website use.

Writes assets/icon.png and the other files in assets/ (1024px, square, no transparency: Apple adds the
rounded corners), then overwrites the existing launcher icons and splash screens in android/ and ios/,
the website icons in icons/, and the Android notification icon. Run: python3 scripts/make-app-icons.py
"""
from PIL import Image, ImageDraw
import glob
import os

CREAM = (248, 246, 239)
SKY_LOW = (241, 217, 168)
SUN = (224, 169, 90)
HILL = (63, 122, 99)
GREEN = (39, 75, 62)
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets")
SS = 4  # draw big, then shrink, for smooth edges


def bezier(p0, p1, p2, p3, steps=64):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        pts.append(tuple(u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)))
    return pts


def hill(d, k, start, c1, c2, mid, c3, c4, end, fill):
    s = lambda p: (p[0] * k, p[1] * k)
    pts = bezier(s(start), s(c1), s(c2), s(mid)) + bezier(s(mid), s(c3), s(c4), s(end))
    d.polygon(pts + [(1024 * k, 1024 * k), (0, 1024 * k)], fill=fill)


def scene(size):
    """The full icon: a warm sky, the sun, and two hills. Coordinates are on a 1024 grid."""
    big = size * SS
    k = big / 1024
    im = Image.new("RGB", (big, big))
    d = ImageDraw.Draw(im)
    for y in range(big):
        t = y / (big - 1)
        d.line([(0, y), (big, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(CREAM, SKY_LOW)))
    d.ellipse([(512 - 190) * k, (600 - 190) * k, (512 + 190) * k, (600 + 190) * k], fill=SUN)
    hill(d, k, (0, 640), (220, 560), (380, 580), (512, 640), (650, 700), (820, 690), (1024, 610), HILL)
    hill(d, k, (0, 760), (250, 690), (420, 720), (560, 780), (720, 845), (880, 820), (1024, 770), GREEN)
    return im.resize((size, size), Image.LANCZOS)


def rounded(im, radius=0.225):
    mask = Image.new("L", (im.width * SS, im.height * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, mask.width - 1, mask.height - 1], radius=mask.width * radius, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask.resize(im.size, Image.LANCZOS))
    return out


def circle(im):
    mask = Image.new("L", (im.width * SS, im.height * SS), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, mask.width - 1, mask.height - 1], fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask.resize(im.size, Image.LANCZOS))
    return out


def splash(w, h):
    """Cream screen with the icon as a rounded tile in the middle."""
    im = Image.new("RGB", (w, h), CREAM)
    tile = int(min(w, h) * 0.29)
    if tile > 0:
        icon = rounded(scene(tile))
        im.paste(icon, ((w - tile) // 2, (h - tile) // 2), icon)
    return im


def size_of(path):
    with Image.open(path) as im:
        return im.size


os.makedirs(OUT, exist_ok=True)
icon = scene(1024)
icon.save(os.path.join(OUT, "icon.png"))
icon.save(os.path.join(OUT, "icon-background.png"))
Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)).save(os.path.join(OUT, "icon-foreground.png"))
splash(2732, 2732).save(os.path.join(OUT, "splash.png"))

# iOS: the 1024 App Store icon and the launch screen.
IOS = os.path.join(ROOT, "ios", "App", "App", "Assets.xcassets")
icon.save(os.path.join(IOS, "AppIcon.appiconset", "AppIcon-512@2x.png"))
for path in glob.glob(os.path.join(IOS, "Splash.imageset", "*.png")):
    splash(*size_of(path)).save(path)

# Android: launcher icons (the adaptive icon is the whole scene as its background layer) and splash screens.
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
for path in glob.glob(os.path.join(RES, "mipmap-*", "*.png")):
    w, _ = size_of(path)
    name = os.path.basename(path)
    if name == "ic_launcher_foreground.png":
        Image.new("RGBA", (w, w), (0, 0, 0, 0)).save(path)
    elif name == "ic_launcher_round.png":
        circle(scene(w)).save(path)
    else:
        scene(w).save(path)
for path in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
    splash(*size_of(path)).save(path)

# Website icons.
ICONS = os.path.join(ROOT, "icons")
scene(180).save(os.path.join(ICONS, "apple-touch-icon.png"))
rounded(scene(192)).save(os.path.join(ICONS, "icon-192.png"))
rounded(scene(512)).save(os.path.join(ICONS, "icon-512.png"))
scene(512).save(os.path.join(ICONS, "icon-maskable-512.png"))
print("Wrote the icon, splash screens and launcher icons for iOS, Android and the website")

# Android notification icon: a white half sun over a hill on transparent, which Android tints with iconColor.
for density, px in {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}.items():
    big = Image.new("RGBA", (px * 8, px * 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    k = px * 8 / 1024
    white = (255, 255, 255, 255)
    d.pieslice([232 * k, 300 * k, 792 * k, 860 * k], 180, 360, fill=white)
    hill(d, k, (0, 660), (250, 600), (400, 620), (512, 660), (640, 700), (800, 700), (1024, 640), white)
    d.rectangle([0, 900 * k, 1024 * k, 1024 * k], fill=(0, 0, 0, 0))
    folder = os.path.join(RES, "drawable-" + density)
    os.makedirs(folder, exist_ok=True)
    big.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_stat_amivo.png"))
print("Wrote the Android notification icon")
