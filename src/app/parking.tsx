import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, TextInput, View } from 'react-native';

import { getParkDetail, getParks, Park } from '@/api/ibb';
import { MapView } from '@/components/map-view';
import { Brand, Button, Card, Empty, ErrorBox, Loading, Separator, T, timeAgo } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { trLower } from '@/lib/html';

function fillColor(p: Park) {
  if (!p.open) return '#888';
  const r = p.capacity ? p.empty / p.capacity : 0;
  if (r > 0.3) return Brand.green;
  if (r > 0.1) return Brand.orange;
  return Brand.red;
}

export default function Parking() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const c = useTheme();
  const parks = useAsync(() => getParks(), [], { refreshMs: 60000 });
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<number | null>(id ? Number(id) : null);
  const detail = useAsync(() => getParkDetail(selected!), [selected], { enabled: selected !== null });

  const list = useMemo(() => {
    const t = trLower(q.trim());
    return (parks.data ?? [])
      .filter((p) => !t || trLower(`${p.name} ${p.district}`).includes(t))
      .sort((a, b) => b.empty - a.empty);
  }, [parks.data, q]);

  const sel = parks.data?.find((p) => p.id === selected);

  const directions = (p: Park) =>
    Linking.openURL(
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${p.lat},${p.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
    );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <MapView
        style={{ height: 260 }}
        center={sel ? [sel.lat, sel.lng] : [41.02, 28.98]}
        zoom={sel ? 16 : 11}
        markers={list.slice(0, 400).map((p) => ({
          id: String(p.id),
          lat: p.lat,
          lng: p.lng,
          label: String(p.empty),
          kind: 'badge' as const,
          color: fillColor(p),
        }))}
        onMarkerPress={(mid) => setSelected(Number(mid))}
      />

      {sel ? (
        <Card style={{ margin: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold style={{ flex: 1 }}>
              {sel.name}
            </T>
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <T dim>✕</T>
            </Pressable>
          </View>
          <T size={14} color={fillColor(sel)} bold>
            {sel.empty} / {sel.capacity} boş {sel.open ? '' : '· Kapalı'}
          </T>
          <T dim size={13}>
            {[sel.type, sel.hours, sel.freeMinutes ? `İlk ${sel.freeMinutes} dk ücretsiz` : ''].filter(Boolean).join(' · ')}
          </T>
          {detail.data?.address ? <T dim size={13}>{detail.data.address}</T> : null}
          {detail.data?.tariff ? (
            <T size={12}>{detail.data.tariff.split(';').join('\n')}</T>
          ) : null}
          {detail.data?.monthlyFee ? <T size={12}>Aylık abonman: {detail.data.monthlyFee} ₺</T> : null}
          <Button title="Yol tarifi" onPress={() => directions(sel)} color={Brand.blue} style={{ marginTop: 6 }} />
        </Card>
      ) : null}

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Otopark ya da ilçe ara"
        placeholderTextColor={c.textSecondary}
        style={{ marginHorizontal: 12, marginVertical: 8, padding: 10, borderRadius: 10, backgroundColor: c.backgroundElement, color: c.text }}
      />
      <T dim size={11} style={{ paddingHorizontal: 12 }}>
        {parks.data ? `${parks.data.length} otopark · ${timeAgo(parks.updatedAt)}` : ''}
      </T>
      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <>
            {parks.loading && !parks.data ? <Loading /> : null}
            <ErrorBox error={parks.error} onRetry={parks.reload} />
          </>
        }
        ListEmptyComponent={!parks.loading ? <Empty text="Sonuç yok" /> : undefined}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
            <View style={{ width: 56, alignItems: 'center' }}>
              <T bold size={18} color={fillColor(item)}>
                {item.empty}
              </T>
              <T dim size={10}>
                / {item.capacity}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T bold size={14} numberOfLines={1}>
                {item.name}
              </T>
              <T dim size={12}>
                {item.district} · {item.type}
              </T>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
