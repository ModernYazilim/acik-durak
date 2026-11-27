import { router } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getEquipmentStatus, getRailLines, getRailStatuses } from '@/api/metro';
import { Brand, Card, ErrorBox, LineBadge, Loading, Row, SectionTitle, Separator, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';

const GROUP = (code: string) =>
  code.startsWith('M') ? 'Metro' : code.startsWith('T') && !code.startsWith('TF') ? 'Tramvay' : code.startsWith('F') ? 'Füniküler' : 'Teleferik';

export default function RailHome() {
  const c = useTheme();
  const lines = useAsync(() => getRailLines(), []);
  const statuses = useAsync(() => getRailStatuses(), [], { refreshMs: 120000 });
  const equip = useAsync(() => getEquipmentStatus(), []);

  const groups = ['Metro', 'Tramvay', 'Füniküler', 'Teleferik'].map((g) => ({
    g,
    items: (lines.data ?? []).filter((l) => GROUP(l.code) === g),
  }));
  const disrupted = new Set((statuses.data ?? []).filter((s) => s.active).map((s) => s.lineId));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => (lines.reload(), statuses.reload(), equip.reload())} />}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <T bold size={28}>
            Raylı sistemler
          </T>
          <T dim size={13}>
            Metro, tramvay, füniküler ve teleferik (Metro İstanbul)
          </T>
        </View>

        {statuses.data?.filter((s) => s.active).length ? (
          <>
            <SectionTitle>Hat durumu</SectionTitle>
            {statuses.data
              .filter((s) => s.active)
              .map((s) => (
                <Card key={s.lineId} style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: c.warnBackground, flexDirection: 'row', gap: 10 }}>
                  <LineBadge code={s.line} color={Brand.orange} />
                  <T size={13} color={c.warnText} style={{ flex: 1 }}>
                    {s.text}
                  </T>
                </Card>
              ))}
          </>
        ) : null}

        {equip.data?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
            {equip.data.map((e) => (
              <Card key={e.name} style={{ paddingVertical: 8, paddingHorizontal: 12, minWidth: '47%', flexGrow: 1 }}>
                <T dim size={12}>
                  {e.name}
                </T>
                <T bold size={14}>
                  {e.active} çalışıyor{e.inactive ? ` · ${e.inactive} arızalı` : ''}
                </T>
              </Card>
            ))}
          </View>
        ) : null}

        <View style={{ padding: 16 }}>
          <ErrorBox error={lines.error} onRetry={lines.reload} />
        </View>
        {lines.loading && !lines.data ? <Loading /> : null}

        {groups
          .filter((g) => g.items.length)
          .map(({ g, items }) => (
            <View key={g}>
              <SectionTitle>{g}</SectionTitle>
              {items.map((l) => (
                <View key={l.id}>
                  <Row
                    onPress={() => router.push({ pathname: '/rail/[id]', params: { id: String(l.id), name: l.code } })}
                    left={<LineBadge code={l.code} color={l.color} />}
                    title={l.name}
                    subtitle={[l.first && l.last ? `${l.first} - ${l.last}` : '', disrupted.has(l.id) ? 'Aksaklık var' : ''].filter(Boolean).join(' · ')}
                    right={<T dim>›</T>}
                  />
                  <Separator />
                </View>
              ))}
            </View>
          ))}

        <SectionTitle>Marmaray</SectionTitle>
        <Card style={{ marginHorizontal: 16, gap: 4 }}>
          <T bold>Halkalı - Gebze banliyö hattı</T>
          <T dim size={13}>
            TCDD Taşımacılık işletiyor, herkese açık bir canlı veri servisi yok. Sefer aralığı Halkalı - Gebze arasında yaklaşık 15 dk, Zeytinburnu - Maltepe arasında yaklaşık 8 dk. Bu değerler resmi kaynaktan değil, değişebilir.
          </T>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
