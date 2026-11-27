# Katkı rehberi

Katkı göndermek istediğin için teşekkürler. Hata düzeltmesi, yeni özellik, yeni bir veri kaynağı, çeviri ya da belge düzeltmesi, hepsi işimize yarar. Katkısı birleştirilen herkes README'deki katkıcılar listesine otomatik eklenir.

## Başlamadan önce

- Büyük bir değişiklik düşünüyorsan önce bir issue açıp anlat. Boşa emek harcanmasını önler.
- `good first issue` etiketli issue'lar ilk katkı için uygun.
- Bir issue üzerinde çalışmaya başlarken yorumla haber ver, aynı işi iki kişi yapmasın.

## Kurulum

Node.js 22 veya üstü gerekiyor.

```bash
git clone https://github.com/<kendi-hesabın>/acik-durak.git
cd acik-durak
npm ci
npx expo start
```

Telefonda Expo Go ile QR kodu okutman yeterli. Android emülatörde `npx expo start --android`.

## Pull request süreci

1. Projeyi fork'la, `main` üzerinden yeni bir dal aç (`fix/durak-arama`, `feat/vapur-favori` gibi).
2. Değişikliğini yap. Gönderiden önce şunlar temiz olmalı:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```
3. Pull request aç. Şablondaki soruları doldur, ekran değiştiyse ekran görüntüsü ekle.
4. İlk katkında CLA botu senden [Katkı Lisans Sözleşmesi](CLA.md)'ni kabul etmeni ister. PR'a şu cümleyi yorum olarak yazman yeterli: `Katkı Lisans Sözleşmesini okudum ve kabul ediyorum.`
5. Otomatik kontroller çalışır: typecheck, lint, Expo uyumluluk kontrolü, Android paketleme ve bağımlılık lisans kontrolü.
6. Bir bakımcı PR'ı inceler. Gerekirse AI destekli kod incelemesini de başlatır, bulguları PR'a yorum olarak düşer. Son kararı her zaman bir bakımcı verir.
7. Onaylanan PR `main`'e birleştirilir ve adın katkıcılar listesine eklenir.

## Kod kuralları

- TypeScript strict açık, `any` kullanımını en aza indir.
- Projede React Compiler açık. Render sırasında `Date.now()` gibi saf olmayan çağrılar, effect içinde senkron `setState` ve render sırasında ref okuma lint hatası verir.
- Paket eklerken `npm install` değil `npx expo install <paket>` kullan. Bu komut SDK ile uyumlu sürümü seçer.
- Arayüz metinleri Türkçe. Kısa ve sade yaz, Türkçe karakterleri doğru kullan.
- Ekranlar `src/app/`, veri servisleri `src/api/`, ortak bileşenler `src/components/`, kullanıcı verisi `src/lib/store.ts` altında.

## Veri kaynakları

Uygulama İETT, İBB, Metro İstanbul ve Şehir Hatları'nın herkese açık sayfa ve servislerini kullanıyor. Bu konuda kesin kurallarımız var:

- **Captcha, erişim sınırı ya da benzeri güvenlik önlemlerini aşan kod kabul edilmez.** Kullanıcıdan doğrulama kodu istenen yerlerde kodu kullanıcı kendisi girer.
- Servisleri gereğinden sık çağırma. Yenileme aralıkları kullanıcı ayarlarından gelir.
- API anahtarı, token ya da kişisel veri commit'leme. Anahtar gerektiren bir servis eklemek istiyorsan önce issue aç.
- Kullanıcı verisi sadece cihazda tutulur. Analitik, reklam ya da izleme kodu kabul edilmez.
- Bir servis yapısını değiştirdiyse ilgili dosya `src/api/` altında. Düzeltmeyi gönderirken hangi sayfada neyin değiştiğini PR'da yaz.

## Lisans

Gönderdiğin katkılar projenin [GPL-3.0](LICENSE) lisansıyla yayınlanır, [CLA](CLA.md) ile de Şirket'e mağaza dağıtımı için ek izin vermiş olursun. Başkasına ait kod ekliyorsan kaynağını ve lisansını PR'da belirt. GPL-3.0 ile uyumsuz lisanslı kod kabul edilmez.

## Davranış kuralları

Tüm katılımcılardan [Davranış Kuralları](CODE_OF_CONDUCT.md)'na uymalarını bekliyoruz.
