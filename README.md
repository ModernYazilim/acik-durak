# Açık Durak

[![CI](https://github.com/ModernYazilim/acik-durak/actions/workflows/ci.yml/badge.svg)](https://github.com/ModernYazilim/acik-durak/actions/workflows/ci.yml)
[![Lisans: GPL-3.0](https://img.shields.io/badge/lisans-GPL--3.0-blue.svg)](LICENSE)
[![Katkıya açık](https://img.shields.io/badge/PR-bekliyoruz-brightgreen.svg)](CONTRIBUTING.md)

İstanbul'un açık kaynak ulaşım uygulaması. Toplu taşıma verilerini tek yerde topluyor (Expo / React Native). Otobüs varış süreleri, canlı araç konumları, metro, tramvay ve vapur seferleri, İSPARK ve daha fazlası.

> Bu proje İETT, İBB ya da başka bir kamu kurumunun resmi uygulaması değildir ve bu kurumlarla bağlantısı yoktur. Veriler kurumların herkese açık sayfa ve servislerinden alınır, doğruluğu garanti edilmez.

## Özellikler

- **Otobüs:** hat ve durak arama, duraktaki yaklaşan otobüsler ve kaç dakika kaldığı (30 sn'de bir yenilenir), duraktan geçen hatlar, durak duyuruları, yol tarifi.
- **Araç detayları:** durak.iett.gov.tr üzerinden kapı no, klima, wifi, USB, bisiklet aparatı, engelli erişimi. Bu servis her sorguda doğrulama kodu istiyor, kodu kullanıcı uygulamada girer.
- **Hat:** haritada güzergah, iki yönün durakları, canlı araç konumları (20 sn), durak listesinde aracın yaklaştığı duraklar, sefer saatleri (iş günü / cumartesi / pazar, ÖHO ayrımı), hat uzunluğu, sefer süresi, tarife, güzergah varyantları.
- **Yakınımda:** konuma göre yakındaki otobüs durakları, metro/tramvay istasyonları, vapur iskeleleri, İSPARK otoparkları ve taksi durakları.
- **Raylı sistemler:** Metro İstanbul'un tüm hatları, istasyonlar (asansör, yürüyen merdiven, WC, mescit), yöne göre sonraki seferler, istasyonlar arası süre, arıza ve hat durumu.
- **Vapur:** Şehir Hatları hatları ve sefer tarifeleri, iptal seferler.
- **Daha fazla:** İETT ve Metro duyuruları, İSPARK anlık boş yer, trafik indeksi ve son 24 saat, ücret tarifesi.
- **Profil:** ilk açılışta ad, profil rengi, ev ve iş konumu. Hesap sunucusu yok, her şey telefonda (AsyncStorage) duruyor. Telefon değiştirirken Profil > Yedeği kopyala ile alınan metin yeni telefonda geri yüklenir.
- **Ana sayfa panosu:** favori durakların canlı varış süreleri (istenen hatlarla sınırlanabilir), favori metro istasyonunun sonraki seferleri, favori hatlarda seferdeki araç sayısı, vapur hattında sıradaki sefer, ev ve işe tek dokunuşla toplu taşıma yol tarifi.
- **Favoriler:** durak, otobüs hattı, raylı hat, metro istasyonu + yön, vapur hattı. Sıralama, takma ad, durakta gösterilecek hat seçimi.
- **Hatırlatıcılar:** durakta zile, metro saatine ya da vapur seferine dokununca "X dk kala" yerel bildirim. Bildirime dokununca ilgili ekran açılır.
- **Ayarlar:** tema, yenileme sıklığı, hatırlatma süresi, yakınımda arama mesafesi, sadece engelli erişimine uygun duraklar.

## Veri kaynakları

| Kaynak | Kullanım |
|---|---|
| iett.istanbul (site uçları) | arama, durak varış süreleri, hat durakları, güzergah çizgisi, sefer saatleri |
| api.ibb.gov.tr/iett (SOAP) | canlı araç konumu, tüm duraklar, hat bilgisi, duyurular |
| durak.iett.gov.tr | araç özellikleri (doğrulama kodlu) |
| api.ibb.gov.tr/MetroIstanbul | raylı sistem hatları, istasyonlar, sefer saatleri, durum |
| sehirhatlari.istanbul | vapur tarifeleri (HTML) |
| api.ibb.gov.tr/ispark, tkmservices | otopark doluluk, trafik indeksi |
| data.ibb.gov.tr | iskele ve taksi durağı konumları |

Bu servislerin çoğu resmi olarak belgelenmiş değil, sitelerin kendi kullandığı uçlar. Yapıları değişirse `src/api/` altındaki ilgili dosya güncellenmeli. Marmaray için açık bir servis bulunamadı.

Harita OpenStreetMap karolarıyla çalışıyor. Yayına almadan önce OSM kullanım politikası gereği kendi karo sunucusuna ya da ücretli bir sağlayıcıya (MapTiler, Stadia vb.) geçilmeli.

## Çalıştırma

```bash
npm ci
npx expo start
```

Telefonda Expo Go ile QR kodu okutmak yeterli. Expo Go'da bildirimler 1-2 dk gecikebiliyor ve özel bildirim kanalı oluşturulamıyor; tam zamanlı hatırlatma için development build gerekir. Android emülatör için `npx expo start --android`.

## Yapı

- `src/api/` veri servisleri (iett, ibb, durak, metro, ferry)
- `src/app/` ekranlar (expo-router)
- `src/components/` harita (Leaflet/WebView), doğrulama kodu penceresi, ana sayfa kartları, ortak UI
- `src/lib/store.ts` profil, favori, ayar ve hatırlatıcı verisi. İleride hesap sistemi eklenirse senkronizasyon buradan yapılır.
- `src/lib/reminders.ts` yerel bildirimler

## Yol haritası

Sırada olanlar ve yardım beklediğimiz konular [issue'larda](https://github.com/ModernYazilim/acik-durak/issues) duruyor. Başlangıç için [`good first issue`](https://github.com/ModernYazilim/acik-durak/labels/good%20first%20issue) etiketli işlere bak.

- Marmaray ve banliyö seferleri için veri kaynağı
- İngilizce arayüz
- Ana ekran widget'ı ve saat (Wear OS / watchOS) desteği
- Otomatik testler
- Ekran okuyucu erişilebilirliği

## Katkı

Katkılara açığız. Nasıl başlayacağın [CONTRIBUTING.md](CONTRIBUTING.md) dosyasında. Kısaca: fork'la, dal aç, PR gönder. İlk PR'da [Katkı Lisans Sözleşmesi](CLA.md)'ni tek bir yorumla kabul etmen istenir. Her PR'da otomatik kontroller çalışır, bir bakımcı inceleyip birleştirir. Birleştirilen PR'ların sahipleri aşağıdaki listeye otomatik eklenir.

## Katkıcılar

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/codebycinar"><img src="https://avatars.githubusercontent.com/u/53220399?v=4&size=80" width="80px" height="80px" alt="Hüseyin Çınar"/><br /><sub><b>Hüseyin Çınar</b></sub></a><br /><a href="https://github.com/ModernYazilim/acik-durak/commits?author=codebycinar" title="Code">💻</a> <a href="#maintenance-codebycinar" title="Maintenance">🚧</a> <a href="https://github.com/ModernYazilim/acik-durak/commits?author=codebycinar" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Lisans

Copyright (C) 2026 Modern Yazılım ve Bilişim Teknolojileri San. Tic. Ltd. Şti.

Kaynak kod [GNU General Public License v3.0](LICENSE) ile lisanslıdır. Kodu kullanabilir, değiştirebilir ve dağıtabilirsin. Dağıttığın her sürümün kaynak kodunu da aynı lisansla açman gerekir.

"Açık Durak" adı, uygulama simgesi ve logoları lisansın kapsamında değildir. Kendi sürümünü yayınlayacaksan [TRADEMARKS.md](TRADEMARKS.md) dosyasına bak. App Store ve Google Play'deki resmi uygulama sadece Modern Yazılım tarafından yayınlanır.

Harita verisi © [OpenStreetMap](https://www.openstreetmap.org/copyright) katkıcıları (ODbL).
