import { ScrollView, View } from 'react-native';

import { getTrafficHistory, getTrafficIndex } from '@/api/ibb';
import { Card, ErrorBox, Loading, SectionTitle, T, timeAgo, trafficColor } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';

export default function Traffic() {
  const c = useTheme();
  const idx = useAsync(() => getTrafficIndex(), [], { refreshMs: 120000 });
  const hist = useAsync(() => getTrafficHistory(), [], { refreshMs: 300000 });

  const points = hist.data ?? [];
  const max = Math.max(100, ...points.map((p) => p.value));
  // Saatlik ortalama, grafik okunaklı olsun
  const hourly: { hour: string; value: number }[] = [];
  points.forEach((p) => {
    const h = p.time.slice(11, 13);
    const last = hourly[hourly.length - 1];
    if (last && last.hour === h) last.value = Math.max(last.value, p.value);
    else hourly.push({ hour: h, value: p.value });
  });

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <ErrorBox error={idx.error} onRetry={idx.reload} />
      {idx.loading && !idx.data ? <Loading /> : null}
      {idx.data ? (
        <Card style={{ alignItems: 'center', gap: 4 }}>
          <T dim size={13}>
            İstanbul trafik indeksi
          </T>
          <T bold size={56} color={trafficColor(idx.data.city)}>
            %{idx.data.city}
          </T>
          <View style={{ flexDirection: 'row', gap: 32 }}>
            <View style={{ alignItems: 'center' }}>
              <T bold size={22} color={trafficColor(idx.data.avrupa)}>
                %{idx.data.avrupa}
              </T>
              <T dim size={12}>
                Avrupa yakası
              </T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T bold size={22} color={trafficColor(idx.data.anadolu)}>
                %{idx.data.anadolu}
              </T>
              <T dim size={12}>
                Anadolu yakası
              </T>
            </View>
          </View>
          <T dim size={11}>
            Güncelleme {timeAgo(idx.updatedAt)}
          </T>
        </Card>
      ) : null}

      <SectionTitle>Son 24 saat (saatlik en yüksek)</SectionTitle>
      {hist.loading && !hist.data ? <Loading /> : null}
      {hourly.length ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 3 }}>
            {hourly.map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <View style={{ width: '100%', height: `${(h.value / max) * 100}%`, backgroundColor: trafficColor(h.value), borderRadius: 3 }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
            {hourly.map((h, i) => (
              <T key={i} dim size={9} style={{ flex: 1, textAlign: 'center' }}>
                {i % 3 === 0 ? h.hour : ''}
              </T>
            ))}
          </View>
        </Card>
      ) : null}
      <T dim size={12}>
        Trafik indeksi İBB Trafik Kontrol Merkezi verisidir. 0 akıcı, 100 tamamen tıkalı trafiği ifade eder.
      </T>
    </ScrollView>
  );
}
