"""Ham ekran görüntülerinden (store/android/screenshots/raw-*.png) Play Store görselleri üretir.

Kullanım: python scripts/make-screenshots.py
Ham görüntüleri emülatörden almak için: adb exec-out screencap -p > store/android/screenshots/raw-home.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / 'store' / 'android' / 'screenshots'
spec = importlib.util.spec_from_file_location('icons', ROOT / 'scripts' / 'make-icons.py')
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

W, H = 1080, 1920
SHOTS = [
    ('home', 'Favori duraklarının', 'varış süreleri ana sayfada'),
    ('stop', 'Otobüs kaç dakikada', 'gelecek, anında gör'),
    ('map', 'Hattaki otobüsler', 'canlı haritada'),
    ('metro', 'Metro ve tramvayda', 'sıradaki sefer'),
    ('nearby', 'Yakınındaki durak,', 'istasyon ve iskeleler'),
    ('ferry', 'Vapur saatleri', 'tek dokunuşta'),
    ('rail', 'Arıza ve hat durumu', 'anlık bilgi'),
    ('search', 'Hat, durak ve', 'durak kodu ile arama'),
]


def frame(raw, l1, l2):
    bg = icons.background(0, W, H)
    d = ImageDraw.Draw(bg)
    f = icons.font(70)
    for i, t in enumerate((l1, l2)):
        w = d.textlength(t, font=f)
        d.text(((W - w) / 2, 90 + i * 92), t, font=f, fill=icons.WHITE)
    shot = Image.open(raw).convert('RGB')
    h = 1560
    w = round(shot.width * h / shot.height)
    shot = shot.resize((w, h), Image.LANCZOS)
    x, y = (W - w) // 2, 330
    r = 44
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x, y + 12, x + w, y + h + 12), radius=r, fill=(0, 0, 0, 90))
    bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    bg.paste(shot, (x, y), mask)
    return bg.convert('RGB')


def main():
    for i, (name, l1, l2) in enumerate(SHOTS, 1):
        frame(DIR / f'raw-{name}.png', l1, l2).save(DIR / f'{i:02d}-{name}.png')


if __name__ == '__main__':
    main()
