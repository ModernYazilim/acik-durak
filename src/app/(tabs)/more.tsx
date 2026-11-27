import { Href, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTrafficIndex } from '@/api/ibb';
import { Avatar, Card, Row, SectionTitle, Separator, T, trafficColor } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

const LINKS: { title: string; sub: string; href: Href }[] = [
  { title: 'Favorilerim', sub: 'Sırala, yeniden adlandır, durakta görünecek hatları seç', href: '/favorites' },
  { title: 'Hatırlatıcılar', sub: 'Kurulu sefer hatırlatıcıları', href: '/reminders' },
  { title: 'Duyurular', sub: 'İETT sefer iptalleri, güzergah değişiklikleri ve raylı sistem duyuruları', href: '/announcements' },
  { title: 'İSPARK otoparkları', sub: 'Anlık boş yer sayısı, ücret ve çalışma saatleri', href: '/parking' },
  { title: 'Trafik durumu', sub: 'İstanbul trafik indeksi ve son 24 saat', href: '/traffic' },
  { title: 'Ücret tarifesi', sub: 'İstanbulkart ve elektronik bilet ücretleri', href: '/fares' },
];

const EXTERNAL = [
  { title: 'Nasıl Giderim?', sub: 'İETT yol tarifi planlayıcı', url: 'https://nasilgiderim.iett.gov.tr/' },
  { title: 'Bulunmuş eşya', sub: 'Araçlarda unutulan eşyalar', url: 'https://www.iett.istanbul/icerik/bulunmus-esya' },
  { title: 'İstanbulkart', sub: 'Bakiye, kart işlemleri', url: 'https://www.istanbulkart.istanbul/' },
  { title: 'Çözüm Merkezi (153)', sub: 'Şikayet ve öneri', url: 'https://cozummerkezi.ibb.istanbul/' },
  { title: 'Havalimanlarına ulaşım', sub: 'İETT bilgi sayfası', url: 'https://www.iett.istanbul/icerik/havalimanlarina-ulasim' },
  { title: 'Gece hatları', sub: 'İETT bilgi sayfası', url: 'https://www.iett.istanbul/icerik/gece-hatlari' },
];

export default function More() {
  const c = useTheme();
  const { profile, favorites, reminders } = useStore();
  const traffic = useAsync(() => getTrafficIndex(), [], { refreshMs: 300000 });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <T bold size={28}>
            Daha fazla
          </T>
        </View>

        <Row
          onPress={() => router.push('/profile')}
          left={<Avatar name={profile?.name} color={profile?.color} />}
          title={profile?.name || 'Profilim'}
          subtitle={`${favorites.length} favori · ${reminders.length} hatırlatıcı · ayarlar ve yedekleme`}
          right={<T dim>›</T>}
          style={{ marginTop: 8 }}
        />

        {traffic.data ? (
          <Card style={{ margin: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
            {(
              [
                ['İstanbul', traffic.data.city],
                ['Avrupa', traffic.data.avrupa],
                ['Anadolu', traffic.data.anadolu],
              ] as [string, number][]
            ).map(([l, v]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <T bold size={26} color={trafficColor(v)}>
                  %{v}
                </T>
                <T dim size={12}>
                  {l} trafik
                </T>
              </View>
            ))}
          </Card>
        ) : null}

        {LINKS.map((l) => (
          <View key={l.title}>
            <Row onPress={() => router.push(l.href)} title={l.title} subtitle={l.sub} right={<T dim>›</T>} />
            <Separator />
          </View>
        ))}

        <SectionTitle>Faydalı bağlantılar</SectionTitle>
        {EXTERNAL.map((l) => (
          <View key={l.title}>
            <Row onPress={() => WebBrowser.openBrowserAsync(l.url)} title={l.title} subtitle={l.sub} right={<T dim>↗</T>} />
            <Separator />
          </View>
        ))}

        <T dim size={11} style={{ padding: 16 }}>
          Veriler İETT, Metro İstanbul, Şehir Hatları ve İBB Açık Veri Portalı&apos;ndan anlık alınır. Varış süreleri tahminidir, trafiğe göre değişebilir. Harita © OpenStreetMap katkıcıları.
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}
