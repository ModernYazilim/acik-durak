import { router } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getFerryCancellations, getFerryLines } from '@/api/ferry';
import { Card, ErrorBox, Loading, Row, SectionTitle, Separator, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';

export default function FerryHome() {
  const c = useTheme();
  const lines = useAsync(() => getFerryLines(), []);
  const cancel = useAsync(() => getFerryCancellations(), [], { refreshMs: 300000 });

  const groups = [...new Set((lines.data ?? []).map((l) => l.group))];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => (lines.reload(), cancel.reload())} />}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <T bold size={28}>
            Vapur
          </T>
          <T dim size={13}>
            Şehir Hatları sefer tarifeleri
          </T>
        </View>

        {cancel.data ? (
          <Card style={{ margin: 16, gap: 4, backgroundColor: cancel.data.text.includes('bulunmamaktadır') ? c.backgroundElement : c.warnBackground }}>
            <T bold size={14}>
              İptal seferler {cancel.data.date ? `· ${cancel.data.date}` : ''}
            </T>
            <T size={13}>{cancel.data.text || 'Bilgi alınamadı'}</T>
            {cancel.data.others.length ? (
              <T dim size={12} style={{ marginTop: 6 }}>
                Son duyurular: {cancel.data.others.slice(0, 4).join(' · ')}
              </T>
            ) : null}
          </Card>
        ) : null}

        <View style={{ paddingHorizontal: 16 }}>
          <ErrorBox error={lines.error} onRetry={lines.reload} />
        </View>
        {lines.loading && !lines.data ? <Loading /> : null}

        {groups.map((g) => (
          <View key={g}>
            <SectionTitle>{g}</SectionTitle>
            {(lines.data ?? [])
              .filter((l) => l.group === g)
              .map((l) => (
                <View key={l.path}>
                  <Row
                    onPress={() => router.push({ pathname: '/ferry/line', params: { path: l.path, name: l.name } })}
                    left={<T size={22}>⛴</T>}
                    title={l.name}
                    right={<T dim>›</T>}
                  />
                  <Separator />
                </View>
              ))}
          </View>
        ))}

        <T dim size={12} style={{ padding: 16 }}>
          Turyol, Dentur ve İDO seferleri için herkese açık güncel bir veri servisi bulunamadı. <T size={12} color={c.link}>Yakınımda</T> sekmesinde iskeleleri haritada görebilirsin.
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}
