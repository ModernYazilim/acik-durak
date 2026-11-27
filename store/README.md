# Mağaza materyalleri

Play Store sayfasındaki metinler ve görseller burada tutulur. Mağaza sayfasını değiştirmek isteyen PR gönderebilir, bakımcılar Play Console'a aktarır.

- `android/tr-TR/` başlık (en fazla 30 karakter), kısa açıklama (80) ve tam açıklama (4000)
- `android/icon-512.png` mağaza simgesi, `android/feature-graphic.png` öne çıkan görsel (1024x500)
- `android/screenshots/` telefon ekran görüntüleri. `raw-*.png` emülatörden alınan ham görüntüler, numaralı dosyalar mağazaya yüklenen hali.

Görselleri yeniden üretmek için:

```bash
python scripts/make-icons.py        # simge, açılış ekranı, öne çıkan görsel
python scripts/make-screenshots.py  # ham görüntülerden mağaza görselleri
```

Ekran görüntüsü alırken durum çubuğunu temiz göstermek için emülatörde demo modu:

```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb exec-out screencap -p > store/android/screenshots/raw-home.png
```
