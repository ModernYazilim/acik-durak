"""Uygulama simgesi, açılış ekranı ve mağaza görsellerini üretir.

Kullanım: python scripts/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / 'assets' / 'images'
STORE = ROOT / 'store' / 'android'
RED = (227, 6, 19, 255)
DARK = (176, 0, 12, 255)
WHITE = (255, 255, 255, 255)
S = 4  # süper örnekleme


def glyph(size, fg=WHITE, bus=RED, scale=1.0):
    """Durak tabelası: direk üzerinde yuvarlak levha, içinde otobüs önü."""
    n = size * S
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = n / 1024 * scale
    o = (n - 1024 * k) / 2

    def p(*v):
        return [o + x * k for x in v]

    d.rounded_rectangle(p(490, 560, 534, 880), radius=10 * k, fill=fg)          # direk
    d.rounded_rectangle(p(430, 852, 594, 892), radius=20 * k, fill=fg)          # taban
    d.ellipse(p(272, 150, 752, 630), fill=fg)                                   # levha
    d.rounded_rectangle(p(382, 262, 642, 520), radius=44 * k, fill=bus)         # otobüs gövdesi
    d.rounded_rectangle(p(412, 290, 612, 392), radius=18 * k, fill=fg)          # ön cam
    d.rounded_rectangle(p(470, 272, 554, 282), radius=5 * k, fill=fg)           # hat tabelası
    d.ellipse(p(408, 440, 448, 480), fill=fg)                                   # farlar
    d.ellipse(p(576, 440, 616, 480), fill=fg)
    d.rounded_rectangle(p(404, 512, 454, 552), radius=10 * k, fill=bus)         # tekerler
    d.rounded_rectangle(p(570, 512, 620, 552), radius=10 * k, fill=bus)
    return im.resize((size, size), Image.LANCZOS)


def background(size, w=None, h=None):
    w, h = w or size, h or size
    im = Image.new('RGBA', (w, h), RED)
    d = ImageDraw.Draw(im)
    # hafif çapraz geçiş
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(int(RED[i] * (1 - t) + DARK[i] * t) for i in range(3)) + (255,)
        d.line([(0, y), (w, y)], fill=c)
    return im


def icon(size=1024, scale=0.92):
    im = background(size)
    im.alpha_composite(glyph(size, scale=scale))
    return im


def font(sz, bold=True):
    for f in (['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'] if bold else
              ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf']) + ['DejaVuSans-Bold.ttf']:
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    STORE.mkdir(parents=True, exist_ok=True)
    icon(1024).convert('RGB').save(IMG / 'icon.png')
    icon(512).convert('RGB').save(STORE / 'icon-512.png')
    icon(48).save(IMG / 'favicon.png')
    # Android uyarlanabilir simge: içerik ortadaki güvenli alanda kalmalı
    glyph(1024, scale=0.62).save(IMG / 'android-icon-foreground.png')
    background(1024).convert('RGB').save(IMG / 'android-icon-background.png')
    glyph(1024, fg=WHITE, bus=(0, 0, 0, 0), scale=0.62).save(IMG / 'android-icon-monochrome.png')
    glyph(512, scale=1.0).save(IMG / 'splash-icon.png')

    # Play Store öne çıkan görsel (1024x500)
    fg = background(0, 1024, 500)
    g = glyph(420, scale=1.0)
    fg.alpha_composite(g, (40, 40))
    d = ImageDraw.Draw(fg)
    d.text((470, 150), 'Açık Durak', font=font(84), fill=WHITE)
    d.text((474, 260), 'Otobüs, metro, tramvay, vapur', font=font(34, False), fill=WHITE)
    d.text((474, 306), 'İstanbul ulaşımı tek uygulamada', font=font(34, False), fill=WHITE)
    fg.convert('RGB').save(STORE / 'feature-graphic.png')


if __name__ == '__main__':
    main()
