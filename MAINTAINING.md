# Bakımcı rehberi

Bu dosya projeyi yönetenler için. Katkı vermek isteyenler [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakmalı.

## Açık kaynak proje nasıl işler?

Kod herkese açık ama `main` dalına sadece bakımcılar kod alabilir. Dışarıdan biri katkı vermek istediğinde süreç şöyle işler:

1. Kişi repoyu kendi hesabına kopyalar (fork), değişikliğini orada yapar.
2. Bize bir pull request (PR) gönderir: "şu değişikliği sizin projenize almak istiyorum".
3. Otomatik kontroller çalışır, AI incelemesi yorum bırakır, bakımcı inceler.
4. Bakımcı ya birleştirir (merge), ya düzeltme ister, ya da gerekçesini yazıp kapatır.

Yani kimse bizim onayımız olmadan projeye kod sokamaz. Fork'lar, bizim haberimiz olmadan başkalarının kodu kopyalayıp geliştirmesidir ve tamamen normaldir. GPL gereği onlar da kodlarını açık tutmak zorunda.

Katkıcılar genelde issue'lardan gelir. Bir kişi hata bildirir ya da öneri yazar, sonra biri "ben yaparım" der. Bu yüzden issue'ları düzenli tutmak ve `good first issue` etiketli, küçük ve net işler bulundurmak katkı sayısını en çok artıran şeydir.

## Haftalık rutin (yaklaşık 1-2 saat)

- **Yeni issue'lar:** etiket ver (`hata`, `öneri`, `veri kaynağı`), yanlış ya da tekrar edenleri kapat. Belirsizse soru sor. İlk yanıtı birkaç gün içinde vermek önemli, cevapsız kalan issue katkıcıyı kaçırır.
- **Açık PR'lar:** aşağıdaki inceleme listesine göre bak. Uzun süre bekletme, en azından "bakacağım" yaz.
- **Dependabot PR'ları:** CI yeşilse ve değişiklik küçükse birleştir.
- **Katkıcılar botu PR'ları:** doğrudan birleştir.

Her şeye hemen yanıt vermek zorunda değilsin. README'de ya da issue'larda "haftada bir bakıyoruz" demek yeterli. Bakımcı yorgunluğu açık kaynağın en sık ölüm sebebi, süreyi baştan sınırlamak doğru.

## PR inceleme listesi

Birleştirmeden önce:

- [ ] CI yeşil (typecheck, lint, paketleme, lisans kontrolü)
- [ ] CLA kabul edilmiş (`cla` kontrolü yeşil)
- [ ] AI incelemesinin bulguları okunmuş. AI bir öneri sunar, son karar senin. Yanılabilir, bazen gereksiz şeylere takılır, bazen gerçek bir hatayı kaçırır.
- [ ] Değişiklik projenin amacına uygun ve kapsamı makul. Tek PR'da birden fazla konu varsa bölünmesini iste.
- [ ] Değişiklik telefonda ya da emülatörde denendi (arayüz değiştiyse ekran görüntüsü var)
- [ ] Yeni bağımlılık varsa gerçekten gerekli
- [ ] **`hassas` etiketi varsa** her satırı kendin oku (aşağıya bak)

Birleştirirken "Squash and merge" kullan. PR'daki tüm commit'ler tek commit olur, geçmiş temiz kalır.

### Dikkat edilmesi gerekenler

Açık kaynak projelere zaman zaman kötü niyetli PR'lar gelir. Genelde masum görünürler. Şunlarda iki kez düşün:

- `.github/workflows/` değişiklikleri. Bir workflow secret'lara erişebilir, mağaza yayınını tetikleyebilir. Dışarıdan gelen workflow değişikliğini neredeyse hiç kabul etme, gerekiyorsa aynı değişikliği kendin yap.
- `package.json` script'leri (`postinstall`, `prepare` gibi). Paket kurulurken kod çalıştırabilir.
- Yeni ya da az bilinen paketler, özellikle adı popüler bir pakete çok benzeyenler.
- Ağ isteği gönderen yeni kod. Kullanıcı verisini bilinmeyen bir adrese gönderiyor mu?
- Uzun, okunması zor ya da şifrelenmiş görünen kod, büyük ikili dosyalar.
- `app.json` ve `eas.json` değişiklikleri. Uygulama kimliği, izinler, yayın ayarları.

İlk kez katkı veren birinin PR'ında CI otomatik başlamaz, GitHub "Approve and run" butonu gösterir. Butona basmadan önce değişikliğe göz at, özellikle yukarıdaki dosyalara.

### Hayır demek

Her PR'ı kabul etmek zorunda değiliz. Kapsam dışı, bakımı zor ya da kurallara aykırı katkıları nazikçe ve gerekçesiyle kapat:

> Emeğin için teşekkürler. Bu özellik uygulamanın odağının dışında kaldığı için şimdilik almıyoruz. İstersen bunu bir issue'da tartışalım, belki farklı bir şekilde ekleyebiliriz.

Kötü kod değil, yanlış yöne giden emek kırıcıdır. Büyük değişikliklerden önce issue açılmasını istemek (CONTRIBUTING'de yazıyor) bunu önler.

## Etiketler

| Etiket | Anlamı |
|---|---|
| `good first issue` | Yeni gelen biri için uygun, küçük ve net iş |
| `yardım aranıyor` | Bakımcıların zamanı yok, katkı bekleniyor |
| `hata`, `öneri`, `veri kaynağı` | Issue türü |
| `arayüz`, `kullanıcı verisi`, `belge`, `bağımlılık` | PR'ın dokunduğu alan (otomatik) |
| `hassas` | Build, yayın ya da marka dosyalarına dokunuyor, satır satır incele (otomatik) |
| `ai: birleştirilebilir`, `ai: değişiklik gerekli`, `ai: kapsam dışı` | AI incelemesinin önerisi |
| `tasarım` | Görsel ya da tasarım katkısı, katkıcılar listesinde 🎨 olarak görünür |

## Sürümler ve yayın

Sürüm numarası `app.json` içindeki `version` alanı, şu biçimde: `ANA.KÜÇÜK.YAMA`

- Sadece hata düzeltmesi: `1.0.0` olur `1.0.1`
- Yeni özellik: `1.0.1` olur `1.1.0`
- Büyük değişiklik, yeniden tasarım: `2.0.0`

Yayın adımları:

1. `main` üzerinde sürüm numarasını artıran bir PR aç, `CHANGELOG.md` dosyasına değişiklikleri yaz, birleştir.
2. GitHub'da `main` dalından `prod` dalına PR aç ve birleştir.
3. `Store yayını` workflow'u başlar, `production` ortamı için onay ister. Onaylayınca EAS iki platformda build alır ve mağazalara gönderir.
   - Android: Play Console'a taslak olarak düşer. İlk yayınlardan sonra `eas.json` içindeki `releaseStatus` değerini `completed` yaparsan doğrudan yayına çıkar.
   - iOS: App Store Connect'e yüklenir, incelemeye gönderme ve yayınlama App Store Connect'ten yapılır.
4. GitHub'da Releases bölümünden `v1.1.0` gibi bir release oluştur, CHANGELOG'daki notları yapıştır.

Mağazaya yükleme sadece bu workflow ile yapılır. Yerel makineden `eas build` ya da `eas submit` ile mağazaya gönderim yapılmaz.

Ayda bir ya da birikmiş değişiklik oldukça yayın yapmak yeterli. Veri kaynağı bozulduysa (uygulama çalışmıyorsa) hemen yama sürümü çıkar.

## Sorun çıktığında

**Güvenlik açığı bildirildi.** Bildirim Security sekmesine özel olarak gelir. Teşekkür et, doğrula, düzeltmeyi gizli bir advisory içinde hazırla, yayınla, sonra advisory'yi aç. Düzeltme yayınlanana kadar herkese açık konuşma.

**Biri secret commit'ledi.** Commit'i silmek yetmez, geçmişte kalır. Anahtarı hemen iptal et ve yenisini oluştur. GitHub'ın secret scanning özelliği çoğu zaman önceden uyarır.

**Biri uygulamayı bizim adımızla mağazaya koydu.** Kodu kullanmak serbest ama ad ve logo değil ([TRADEMARKS.md](TRADEMARKS.md)). Apple ve Google'ın fikri mülkiyet şikayet formlarıyla bildir. Marka tescili şikayeti çok güçlendirir. Kaynağı kapalı bir kopya varsa GPL ihlali de vardır.

**Kaba ya da saldırgan davranış.** [Davranış kurallarını](CODE_OF_CONDUCT.md) hatırlat. Tekrarlarsa yorumu gizle, gerekirse kişiyi engelle (organizasyon ayarlarında Moderation > Blocked users). Tartışmaya girme.

**Bir veri kaynağı değişti, uygulama bozuldu.** `veri kaynağı` etiketiyle issue aç, `yardım aranıyor` ekle. Genelde ilk düzeltmeyi topluluktan biri gönderir.

## Katkıcıları tutmak

- İlk PR'a hızlı ve sıcak yanıt ver, düzeltme istesen bile teşekkür et.
- Küçük düzeltmeleri kendin yapmak yerine katkıcıya bırak.
- Düzenli katkı verenlere issue etiketleme gibi yetkiler ver (Triage rolü), sonra bakımcı yap. CODEOWNERS'a ekle.
- Kod dışı katkılar da sayılır: hata bildirmek, test etmek, belge yazmak, tasarım. Gerekirse `npx @all-contributors/cli add <kullanıcı> <tür>` ile elle ekle.

## İlk kurulum (bir kez)

Aşağıdakilerin bir kısmı repo oluşturulurken yapıldı, işaretli olmayanları elle tamamla.

### GitHub

- [x] Repo `ModernYazilim/acik-durak` olarak oluşturuldu, etiketler eklendi
- [x] `main` dal koruması: PR zorunlu, 1 onay, CODEOWNERS onayı, zorunlu CI ve CLA kontrolleri, force push kapalı
- [x] Actions: ilk kez katkı verenlerin workflow'ları onay bekler, varsayılan token izni sadece okuma
- [x] Private vulnerability reporting, Dependabot uyarıları, secret scanning açık
- [ ] Organizasyon ayarı: Organization settings > Actions > General > Workflow permissions altında "Allow GitHub Actions to create and approve pull requests" kutusunu işaretle. Sonra aynı kutuyu repo ayarlarında (Settings > Actions > General) da işaretle. Katkıcılar listesi PR'ı bunun için gerekli. Bu ayar organizasyondaki diğer repoların workflow'larını değiştirmez, sadece izin verir.
- [ ] `ANTHROPIC_API_KEY` secret'ını ekle (Settings > Secrets and variables > Actions). AI incelemesi için. Anahtar yoksa AI inceleme işi hata verir, diğer kontroller etkilenmez.
- [ ] Settings > Environments > `production` ortamına onaylayıcı olarak kendini ekle, `EXPO_TOKEN` secret'ını bu ortama tanımla
- [ ] Settings > Variables: `STORE_RELEASE` = `true` (EAS hazır olduğunda)
- [ ] Organizasyon düzeyindeki secret'ların bu repoya açık olmadığını kontrol et (Organization settings > Secrets > her secret için "Repository access")

`cla-imzalar` dalı korumasız kalmalı, CLA botu imzaları oraya yazıyor.

### EAS ve mağazalar (şirket hesabıyla)

```bash
npx eas-cli login           # şirketin Expo hesabı
npx eas-cli init            # app.json'a projectId ve owner yazar, bunu PR ile main'e al
npx eas-cli credentials     # Android keystore ve iOS sertifikaları EAS'ta oluşturulur
```

- iOS: App Store Connect'te `com.modernyazilim.acikdurak` kimliğiyle uygulama kaydını aç. App Store Connect API anahtarını `eas credentials` ile EAS'a yükle.
- Android: Play Console'da uygulamayı oluştur, ilk AAB'yi elle yükle (Google ilk yüklemeyi zorunlu tutuyor). Servis hesabı JSON anahtarını `eas credentials` ile EAS'a yükle. Bu dosya asla repoya girmez.
- Expo hesabında bir robot kullanıcı oluştur, tokenını `EXPO_TOKEN` olarak `production` ortamına ekle.

### Yasal

- [ ] CLA metnini bir avukata okut
- [ ] "Açık Durak" adı ve logosu için TÜRKPATENT'te marka başvurusu
- [ ] `acikdurak.com` / `.app` domainleri
- [ ] Mağaza sayfaları için gizlilik politikası (uygulama veri toplamıyor, konum sadece cihazda kullanılıyor)
- [ ] Harita karoları: yayından önce OSM yerine kendi sunucu ya da ücretli bir sağlayıcı (README'de yazıyor)
