"""Draws the amivo app icon at full size for the App Store and Google Play.

Writes assets/icon.png (1024px, square, no transparency: Apple adds the rounded corners),
assets/icon-foreground.png and assets/icon-background.png (Android adaptive icon layers),
and assets/splash.png. Run: python3 scripts/make-app-icons.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

CREAM = (248, 246, 239)
GREEN = (39, 75, 62)
GOLD = (200, 165, 107)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")


def mark(size, scale=1.0, bg=CREAM):
    """The lowercase "a" with the gold line under it, centred on a square canvas."""
    im = Image.new("RGBA", (size, size), bg)
    d = ImageDraw.Draw(im)
    s = size * scale
    font = ImageFont.truetype(FONT, int(s * 0.64))
    cx = size / 2
    # The glyph sits a little above centre so the gold line balances it.
    l, t, r, b = d.textbbox((0, 0), "a", font=font)
    w, h = r - l, b - t
    top = size / 2 - h / 2 - s * 0.04
    d.text((cx - w / 2 - l, top - t), "a", font=font, fill=GREEN)
    line_y = top + h + s * 0.07
    lw, lh = s * 0.16, s * 0.024
    d.rounded_rectangle((cx - lw / 2, line_y, cx + lw / 2, line_y + lh), radius=lh / 2, fill=GOLD)
    return im


os.makedirs(OUT, exist_ok=True)
mark(1024).convert("RGB").save(os.path.join(OUT, "icon.png"))
# Android crops adaptive icons to a circle or squircle, so the mark stays inside the middle 66%.
mark(1024, scale=0.72, bg=(0, 0, 0, 0)).save(os.path.join(OUT, "icon-foreground.png"))
Image.new("RGB", (1024, 1024), CREAM).save(os.path.join(OUT, "icon-background.png"))
splash = Image.new("RGB", (2732, 2732), CREAM)
splash.paste(mark(800).convert("RGB"), ((2732 - 800) // 2, (2732 - 800) // 2))
splash.save(os.path.join(OUT, "splash.png"))
print("Wrote icon, adaptive icon layers and splash to assets/")

# Android notification icon: a white "a" on transparent, which Android tints with iconColor.
RES = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")
for density, px in {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}.items():
    big = Image.new("RGBA", (px * 8, px * 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    font = ImageFont.truetype(FONT, int(px * 8 * 0.95))
    l, t, r, b = d.textbbox((0, 0), "a", font=font)
    d.text(((px * 8 - (r - l)) / 2 - l, (px * 8 - (b - t)) / 2 - t), "a", font=font, fill=(255, 255, 255, 255))
    folder = os.path.join(RES, "drawable-" + density)
    os.makedirs(folder, exist_ok=True)
    big.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_stat_amivo.png"))
print("Wrote the Android notification icon")
