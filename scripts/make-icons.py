"""Uygulama simgesi, açılış ekranı ve mağaza görsellerini üretir.

Simge: konum işareti, içi üç bant. Üstte otobüs, ortada tramvay, altta vapur.
Kullanım: python scripts/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / 'assets' / 'images'
STORE = ROOT / 'store' / 'android'
S = 4  # süper örnekleme


def hexc(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


RED = hexc('E3141E')
NAVY = hexc('101C3A')
RAIL = hexc('F5B700')
SEA = hexc('1FA2E0')
WHITE = hexc('FFFFFF')
CLEAR = (0, 0, 0, 0)

COLOR = dict(sky=WHITE, rail=RAIL, sea=SEA,
             bus=RED, bus_win=WHITE, wheel=NAVY,
             tram=WHITE, tram_win=RAIL, tram_light=RED, wire=NAVY,
             cabin=WHITE, ferry_win=SEA, hull=NAVY, stripe=WHITE, funnel=NAVY, funnel_band=RED, wave=WHITE)
# Tek renk (Android temalı simge): işaret dolu, araçlar oyuk, pencereler dolu
MONO = dict(sky=WHITE, rail=WHITE, sea=WHITE,
            bus=CLEAR, bus_win=WHITE, wheel=CLEAR,
            tram=CLEAR, tram_win=WHITE, tram_light=WHITE, wire=CLEAR,
            cabin=CLEAR, ferry_win=WHITE, hull=CLEAR, stripe=CLEAR, funnel=CLEAR, funnel_band=CLEAR, wave=CLEAR)


def cubic(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        pts.append(tuple(u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)))
    return pts


def quad(p0, p1, p2, n=12):
    return [tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c for a, b, c in zip(p0, p1, p2)) for t in (i / n for i in range(n + 1))]


# Konum işareti (1024 tuvalde)
PIN = (cubic((512, 70), (306, 70), (166, 220), (166, 414))
       + cubic((166, 414), (166, 664), (512, 974), (512, 974))
       + cubic((512, 974), (512, 974), (858, 664), (858, 414))
       + cubic((858, 414), (858, 220), (718, 70), (512, 70)))


class Pen:
    """1024 birimlik çizimi, ölçekli ve ortalanmış olarak gerçek piksellere çevirir."""

    def __init__(self, im, scale=1.0):
        self.d = ImageDraw.Draw(im)
        n = im.size[0]
        self.k = n / 1024 * scale
        self.o = (n - 1024 * self.k) / 2

    def pt(self, x, y):
        return (self.o + x * self.k, self.o + y * self.k)

    def rect(self, x, y, w, h, fill, r=0):
        box = [*self.pt(x, y), *self.pt(x + w, y + h)]
        if r:
            self.d.rounded_rectangle(box, radius=r * self.k, fill=fill)
        else:
            self.d.rectangle(box, fill=fill)

    def circle(self, cx, cy, r, fill):
        self.d.ellipse([*self.pt(cx - r, cy - r), *self.pt(cx + r, cy + r)], fill=fill)

    def poly(self, pts, fill):
        self.d.polygon([self.pt(*p) for p in pts], fill=fill)

    def line(self, pts, fill, w):
        self.d.line([self.pt(*p) for p in pts], fill=fill, width=max(1, round(w * self.k)), joint='curve')
        for p in (pts[0], pts[-1]):
            self.circle(*p, w / 2, fill)


def group(tx, ty, s):
    return lambda x, y: (tx + x * s, ty + y * s)


def bus(p, c, tx, ty, s):
    g = group(tx, ty, s)
    R = lambda x, y, w, h, r, f: p.rect(*g(x, y), w * s, h * s, c[f], r * s)
    R(-120, -130, 240, 250, 40, 'bus')
    R(-90, -100, 180, 110, 16, 'bus_win')
    p.circle(*g(-68, 64), 18 * s, c['bus_win'])
    p.circle(*g(68, 64), 18 * s, c['bus_win'])
    R(-104, 120, 44, 34, 10, 'wheel')
    R(60, 120, 44, 34, 10, 'wheel')


def tram(p, c, tx, ty, s):
    g = group(tx, ty, s)
    p.line([g(-50, -130), g(0, -176), g(50, -130)], c['wire'], 14 * s)
    p.rect(*g(-110, -130), 220 * s, 250 * s, c['tram'], 40 * s)
    p.rect(*g(-80, -100), 160 * s, 100 * s, c['tram_win'], 14 * s)
    p.circle(*g(-60, 50), 16 * s, c['tram_light'])
    p.circle(*g(60, 50), 16 * s, c['tram_light'])
    p.line([g(-70, 120), g(-100, 160)], c['wire'], 16 * s)
    p.line([g(70, 120), g(100, 160)], c['wire'], 16 * s)


def ferry(p, c, tx, ty, s):
    g = group(tx, ty, s)
    p.rect(*g(250, -70), 46 * s, 70 * s, c['funnel'], 6 * s)
    p.rect(*g(250, -70), 46 * s, 18 * s, c['funnel_band'])
    p.rect(*g(70, 0), 290 * s, 70 * s, c['cabin'], 14 * s)
    for i in range(4):
        p.rect(*g(96 + 56 * i, 20), 40 * s, 30 * s, c['ferry_win'], 6 * s)
    p.poly([g(0, 70), g(440, 70), g(400, 150), g(50, 150)], c['hull'])
    p.rect(*g(20, 70), 410 * s, 14 * s, c['stripe'])


def mark(size, scale=1.0, c=COLOR):
    """Şeffaf zemin üzerinde konum işareti ve araçlar."""
    n = size * S
    art = Image.new('RGBA', (n, n), CLEAR)
    p = Pen(art, scale)
    p.rect(0, 0, 1024, 330, c['sky'])
    p.rect(0, 330, 1024, 280, c['rail'])
    p.rect(0, 610, 1024, 414, c['sea'])
    bus(p, c, 512, 200, 0.82)
    tram(p, c, 512, 480, 0.78)
    fs = 0.66
    ferry(p, c, 512 - 220 * fs, 690, fs)
    wave = []
    for i in range(22):
        wave += quad((i * 48, 820), (i * 48 + 24, 804), (i * 48 + 48, 820))
    p.line(wave, c['wave'], 14)

    mask = Image.new('L', (n, n), 0)
    Pen(mask, scale).poly(PIN, 255)
    art.putalpha(ImageChops.multiply(art.getchannel('A'), mask))
    return art.resize((size, size), Image.LANCZOS)


def background(size, w=None, h=None):
    """Düz kırmızı zemin. Ekran görüntüsü çerçeveleri de bunu kullanır."""
    return Image.new('RGBA', (w or size, h or size), RED)


def icon(size, scale=1.0, bg=RED):
    im = Image.new('RGBA', (size, size), bg)
    im.alpha_composite(mark(size, scale))
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
    mark(1024, scale=0.6).save(IMG / 'android-icon-foreground.png')
    Image.new('RGB', (1024, 1024), RED[:3]).save(IMG / 'android-icon-background.png')
    mark(1024, scale=0.6, c=MONO).save(IMG / 'android-icon-monochrome.png')
    mark(512).save(IMG / 'splash-icon.png')

    # Play Store öne çıkan görsel (1024x500)
    fg = background(0, 1024, 500)
    fg.alpha_composite(mark(440), (20, 30))
    d = ImageDraw.Draw(fg)
    d.text((470, 150), 'Açık Durak', font=font(84), fill=WHITE)
    d.text((474, 260), 'Otobüs, metro, tramvay, vapur', font=font(34, False), fill=WHITE)
    d.text((474, 306), 'İstanbul ulaşımı tek uygulamada', font=font(34, False), fill=WHITE)
    fg.convert('RGB').save(STORE / 'feature-graphic.png')


if __name__ == '__main__':
    main()
