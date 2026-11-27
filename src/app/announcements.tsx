import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { getIettAnnouncements } from '@/api/ibb';
import { getRailAnnouncements } from '@/api/metro';
import { Brand, Card, Chip, Empty, ErrorBox, LineBadge, Loading, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { openItem } from '@/lib/nav';
import { trLower } from '@/lib/html';

type Item = { key: string; badge: string; color: string; title: string; text: string; meta?: string; line?: string };

export default function Announcements() {
  const c = useTheme();
  const [src, setSrc] = useState<'bus' | 'rail'>('bus');
  const [q, setQ] = useState('');
  const bus = useAsync(() => getIettAnnouncements(), [], { refreshMs: 300000 });
  const rail = useAsync(() => getRailAnnouncements(), []);

  const items: Item[] = useMemo(() => {
    if (src === 'bus')
      return (bus.data ?? []).map((a, i) => ({
        key: `b${i}`,
        badge: a.line,
        color: a.type === 'Sefer' ? Brand.red : Brand.orange,
        title: a.lineName,
        text: a.message,
        meta: `${a.type} · ${a.time}`,
        line: a.line,
      }));
    return (rail.data ?? []).map((a) => ({ key: `r${a.id}`, badge: 'Metro', color: Brand.blue, title: a.title, text: a.text }));
  }, [src, bus.data, rail.data]);

  const filtered = q.trim()
    ? items.filter((i) => trLower(`${i.badge} ${i.title} ${i.text}`).includes(trLower(q.trim())))
    : items;
  const cur = src === 'bus' ? bus : rail;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 }}>
        <Chip label="Otobüs (İETT)" active={src === 'bus'} onPress={() => setSrc('bus')} />
        <Chip label="Raylı sistem" active={src === 'rail'} onPress={() => setSrc('rail')} />
      </View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Hat kodu ya da kelime ile filtrele"
        placeholderTextColor={c.textSecondary}
        style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: c.backgroundElement, color: c.text }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.key}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {cur.loading && !cur.data ? <Loading /> : null}
            <ErrorBox error={cur.error} onRetry={cur.reload} />
          </>
        }
        ListEmptyComponent={!cur.loading ? <Empty text="Duyuru yok" /> : undefined}
        renderItem={({ item }) => (
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LineBadge code={item.badge} color={item.color} />
              <T bold size={14} style={{ flex: 1 }} numberOfLines={2} onPress={item.line ? () => openItem({ kind: 'line', code: item.line!, name: item.title }) : undefined}>
                {item.title}
              </T>
            </View>
            <T size={14}>{item.text}</T>
            {item.meta ? (
              <T dim size={12}>
                {item.meta}
              </T>
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}
