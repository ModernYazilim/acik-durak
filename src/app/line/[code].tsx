import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { getLiveBuses, getLineMeta } from '@/api/ibb';
import { getLineAlerts, getLineNotes, getRouteShape, getRouteStops, getRouteVariants, getTimetable } from '@/api/iett';
import { MapLine, MapMarker, MapView } from '@/components/map-view';
import { Brand, Card, Chip, Empty, ErrorBox, LineBadge, Loading, Row, SectionTitle, Separator, T, timeAgo } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { openItem } from '@/lib/nav';
import { useStore } from '@/lib/store';

type Tab = 'map' | 'stops' | 'times' | 'info';
const DIR_COLORS = { G: Brand.red, D: Brand.blue } as const;

export default function LineScreen() {
  const { code, name: paramName } = useLocalSearchParams<{ code: string; name?: string }>();
  const c = useTheme();
  const { isFavorite, toggleFavorite, addRecent } = useStore();
  const [tab, setTab] = useState<Tab>('map');
  const [dir, setDir] = useState(0);
  const [day, setDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 2 : d === 6 ? 1 : 0;
  });

  const meta = useAsync(async () => {
    const m = await getLineMeta(code);
    addRecent({ kind: 'line', code, name: m?.name ?? paramName ?? code });
    return m;
  }, [code]);
  const shapes = useAsync(
    async () => {
      const [g, d] = await Promise.all([getRouteShape(`${code}_G_D0`), getRouteShape(`${code}_D_D0`)]);
      return { G: g, D: d };
    },
    [code],
  );
  const live = useAsync(() => getLiveBuses(code), [code], { refreshMs: 20000 });
  const stops = useAsync(() => getRouteStops(code), [code]);
  const times = useAsync(() => getTimetable(code), [code], { enabled: tab === 'times' });
  const alerts = useAsync(() => getLineAlerts(code), [code]);
  const notes = useAsync(() => getLineNotes(code), [code], { enabled: tab === 'times' || tab === 'info' });
  const variants = useAsync(() => getRouteVariants(code), [code], { enabled: tab === 'info' });

  const name = meta.data?.name ?? paramName ?? code;
  const fav = isFavorite({ kind: 'line', code });

  const mapLines: MapLine[] = useMemo(() => {
    const out: MapLine[] = [];
    (['G', 'D'] as const).forEach((k) => {
      shapes.data?.[k]?.lines.forEach((l) => out.push({ coords: l, color: DIR_COLORS[k], width: 5 }));
    });
    return out;
  }, [shapes.data]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    (['G', 'D'] as const).forEach((k) =>
      shapes.data?.[k]?.stops.forEach((s, i) =>
        out.push({ id: `s-${k}-${i}`, lat: s.lat, lng: s.lng, color: DIR_COLORS[k], size: 7, title: `${s.name} (${s.district})` }),
      ),
    );
    (live.data ?? []).forEach((b) =>
      out.push({
        id: `b-${b.door}`,
        lat: b.lat,
        lng: b.lng,
        label: `🚌 ${b.door}`,
        color: b.direction === 'G' ? '#B00010' : '#063C73',
        title: `${b.door} · ${b.heading} yönü · ${b.lastSeen.slice(11)}`,
        kind: 'badge',
      }),
    );
    return out;
  }, [shapes.data, live.data]);

  // Durak listesinde hangi durağa yakın araç olduğunu göster
  const busesNearStop = useMemo(() => {
    const m: Record<string, string[]> = {};
    (live.data ?? []).forEach((b) => {
      if (b.nearStop) (m[b.nearStop] ??= []).push(b.door);
    });
    return m;
  }, [live.data]);

  const directions = stops.data ?? [];
  const currentDir = directions[dir];
  const dirTitle = (i: number) => {
    const s = directions[i]?.stops;
    return s?.length ? `${s[0].name} kalkışlı` : `Yön ${i + 1}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: code,
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => toggleFavorite({ kind: 'line', code, name })}>
              <T size={22} color={fav ? Brand.orange : c.textSecondary}>
                {fav ? '★' : '☆'}
              </T>
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View style={styles.head}>
          <LineBadge code={code} color={code.startsWith('34') ? Brand.red : Brand.blue} />
          <View style={{ flex: 1 }}>
            <T bold size={16} numberOfLines={2}>
              {name}
            </T>
            <T dim size={12}>
              {live.data ? `${live.data.length} araç seferde · ${timeAgo(live.updatedAt)}` : 'Canlı konum yükleniyor'}
            </T>
          </View>
        </View>

        {alerts.data?.length ? (
          <Card style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: c.warnBackground }}>
            {alerts.data.map((a, i) => (
              <T key={i} size={13} color={c.warnText}>
                {a}
              </T>
            ))}
          </Card>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ['map', 'Harita'],
              ['stops', 'Duraklar'],
              ['times', 'Saatler'],
              ['info', 'Bilgi'],
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <Chip key={k} label={l} active={tab === k} onPress={() => setTab(k)} />
          ))}
        </View>

        {tab === 'map' ? (
          <View style={{ flex: 1 }}>
            {shapes.loading && !shapes.data ? <Loading label="Güzergah yükleniyor" /> : null}
            <ErrorBox error={shapes.error ?? live.error} onRetry={() => (shapes.reload(), live.reload())} />
            <MapView style={{ flex: 1 }} lines={mapLines} markers={mapMarkers} fit={shapes.data ? code : false} />
            <View style={[styles.legend, { backgroundColor: c.background }]}>
              <Legend color={DIR_COLORS.G} label={shapes.data?.G ? `${shapes.data.G.stops[0]?.name ?? ''} kalkışlı` : 'Gidiş'} />
              <Legend color={DIR_COLORS.D} label={shapes.data?.D ? `${shapes.data.D.stops[0]?.name ?? ''} kalkışlı` : 'Dönüş'} />
            </View>
          </View>
        ) : null}

        {tab === 'stops' ? (
          <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={() => (stops.reload(), live.reload())} />}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {directions.map((_, i) => (
                <Chip key={i} label={dirTitle(i)} active={dir === i} onPress={() => setDir(i)} color={i === 0 ? Brand.red : Brand.blue} />
              ))}
            </ScrollView>
            {stops.loading && !stops.data ? <Loading /> : null}
            <ErrorBox error={stops.error} onRetry={stops.reload} />
            {currentDir?.stops.map((s, i) => {
              const buses = busesNearStop[s.code];
              return (
                <View key={`${s.code}-${i}`}>
                  <Row
                    onPress={() => openItem({ kind: 'stop', code: s.code, name: s.name })}
                    left={
                      <View style={styles.timeline}>
                        <View style={[styles.line, { backgroundColor: i === 0 ? 'transparent' : c.backgroundSelected }]} />
                        <View style={[styles.dot, { backgroundColor: buses ? Brand.red : c.textSecondary }]} />
                        <View style={[styles.line, { backgroundColor: i === currentDir.stops.length - 1 ? 'transparent' : c.backgroundSelected }]} />
                      </View>
                    }
                    title={`${s.order}. ${s.name}`}
                    subtitle={buses ? `${s.district} · Yakında: ${buses.join(', ')}` : s.district}
                    style={{ paddingVertical: 6 }}
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {tab === 'times' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {times.loading && !times.data ? <Loading /> : null}
            <ErrorBox error={times.error} onRetry={times.reload} />
            {times.data ? (
              <>
                <View style={styles.chips}>
                  {(times.data[0]?.days ?? []).map((d, i) => (
                    <Chip key={d.label} label={d.label} active={day === i} onPress={() => setDay(i)} />
                  ))}
                </View>
                {times.data.length === 0 ? <Empty text="Planlanan sefer saati bulunamadı" /> : null}
                {times.data.map((t) => {
                  const d = t.days[day];
                  return (
                    <View key={t.title}>
                      <SectionTitle>{t.title}</SectionTitle>
                      {!d?.times.length ? (
                        <T dim style={{ paddingHorizontal: 16 }}>
                          Bu gün için sefer yok
                        </T>
                      ) : (
                        <View style={styles.grid}>
                          {d.times.map((x, i) => (
                            <View key={i} style={[styles.time, { backgroundColor: x.highlighted ? c.redSoft : c.backgroundElement }]}>
                              <T bold size={14} color={x.highlighted ? Brand.red : undefined}>
                                {x.time}
                              </T>
                              {x.note ? (
                                <T dim size={10}>
                                  {x.note}
                                </T>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <Card style={{ margin: 16, gap: 6 }}>
                  <T dim size={12}>Saatler hat başından kalkış saatleridir.</T>
                  {(notes.data?.notes ?? []).map((n, i) => (
                    <T key={i} dim size={12}>
                      {n}
                    </T>
                  ))}
                  <T dim size={12}>Harf işaretli saatlerin güzergahı Bilgi sekmesindeki varyantlarda.</T>
                </Card>
              </>
            ) : null}
          </ScrollView>
        ) : null}

        {tab === 'info' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Card style={{ margin: 16, gap: 8 }}>
              <Info label="Hat" value={`${code} · ${name}`} />
              {meta.data?.lengthKm ? <Info label="Hat uzunluğu" value={`${meta.data.lengthKm.toFixed(1)} km`} /> : null}
              {meta.data?.tripMinutes ? <Info label="Ortalama sefer süresi" value={`${Math.round(meta.data.tripMinutes)} dk`} /> : null}
              {meta.data?.tariff ? <Info label="Tarife" value={meta.data.tariff} /> : null}
              {(notes.data?.info ?? []).map((l) => {
                const [k, ...v] = l.split(':');
                return v.length ? <Info key={l} label={k.trim()} value={v.join(':').trim()} /> : null;
              })}
              {shapes.data?.G ? <Info label="Durak sayısı" value={`${shapes.data.G.stops.length} / ${shapes.data.D?.stops.length ?? '-'}`} /> : null}
            </Card>
            <SectionTitle>Güzergah varyantları</SectionTitle>
            {variants.loading && !variants.data ? <Loading /> : null}
            {(variants.data ?? []).map((v) => (
              <View key={v.code}>
                <Row left={<LineBadge code={v.direction === 'G' ? 'Gidiş' : 'Dönüş'} color={DIR_COLORS[v.direction]} />} title={v.name} subtitle={v.code} />
                <Separator />
              </View>
            ))}
            {variants.data?.length === 0 ? <Empty text="Ek güzergah yok" /> : null}
          </ScrollView>
        ) : null}
      </View>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
      <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: color }} />
      <T size={12} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </T>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T dim size={14}>
        {label}
      </T>
      <T bold size={14} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, flexWrap: 'wrap' },
  legend: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  timeline: { width: 16, alignSelf: 'stretch', alignItems: 'center' },
  line: { width: 2, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  time: { width: 68, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
});
