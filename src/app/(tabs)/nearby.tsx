import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPiers } from '@/api/ferry';
import { distanceM, getAllStops, getParks, getTaxiStands, nearestStops } from '@/api/ibb';
import { getAllRailStations, getRailLines, RailStation } from '@/api/metro';
import { MapMarker, MapView } from '@/components/map-view';
import { Brand, Button, Chip, ErrorBox, Loading, Row, Separator, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { openItem } from '@/lib/nav';
import { useSettings } from '@/lib/store';

type Layer = 'stops' | 'rail' | 'ferry' | 'park' | 'taxi';
const LAYERS: { key: Layer; label: string; color: string }[] = [
  { key: 'stops', label: 'Duraklar', color: Brand.green },
  { key: 'rail', label: 'Raylı', color: Brand.blue },
  { key: 'ferry', label: 'İskele', color: Brand.ferry },
  { key: 'park', label: 'İSPARK', color: '#6A1B9A' },
  { key: 'taxi', label: 'Taksi', color: '#F9A825' },
];

const TAKSIM = { lat: 41.0369, lng: 28.985 };

type Place = { id: string; layer: Layer; name: string; sub: string; lat: number; lng: number; dist: number; onPress?: () => void };

export default function Nearby() {
  const c = useTheme();
  const { radius: RADIUS, accessibleOnly } = useSettings();
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState(TAKSIM);
  const [mapCenter, setMapCenter] = useState(TAKSIM);
  const [perm, setPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [layers, setLayers] = useState<Set<Layer>>(new Set(['stops', 'rail', 'ferry']));

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPerm('denied');
      return;
    }
    setPerm('granted');
    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      const p = { lat: last.coords.latitude, lng: last.coords.longitude };
      setUser(p);
      setCenter(p);
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setUser(p);
    setCenter(p);
  };

  useEffect(() => {
    (async () => {
      try {
        // Açılışta izin penceresi göstermiyoruz, sadece daha önce izin verildiyse konumu alıyoruz.
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') await locate();
      } catch {
        setPerm('denied');
      }
    })();
  }, []);

  const stops = useAsync(() => getAllStops(), [], { enabled: layers.has('stops') });
  const rail = useAsync(async () => {
    const [st, lines] = await Promise.all([getAllRailStations(), getRailLines()]);
    const color = Object.fromEntries(lines.map((l) => [l.code, l.color]));
    return st.map((s) => ({ ...s, color: color[s.line] ?? Brand.blue }));
  }, [], { enabled: layers.has('rail') });
  const piers = useAsync(() => getPiers(), [], { enabled: layers.has('ferry') });
  const parks = useAsync(() => getParks(), [], { enabled: layers.has('park'), refreshMs: 120000 });
  const taxis = useAsync(() => getTaxiStands(), [], { enabled: layers.has('taxi') });

  const places: Place[] = useMemo(() => {
    const out: Place[] = [];
    const near = <T extends { lat: number; lng: number }>(arr: T[]) =>
      arr
        .map((x) => ({ x, dist: distanceM(center, x) }))
        .filter((p) => p.dist <= RADIUS * 1.5);
    if (layers.has('stops') && stops.data) {
      nearestStops(accessibleOnly ? stops.data.filter((x) => x.a) : stops.data, center, 40, RADIUS).forEach((s) =>
        out.push({
          id: `s${s.c}`,
          layer: 'stops',
          name: s.n,
          sub: [s.y ? `${s.y} yönü` : '', s.d, s.a ? 'Engelli uygun' : ''].filter(Boolean).join(' · '),
          lat: s.la,
          lng: s.lo,
          dist: s.dist,
          onPress: () => openItem({ kind: 'stop', code: s.c, name: s.n }),
        }),
      );
    }
    if (layers.has('rail') && rail.data) {
      near(rail.data.filter((s) => s.lat && s.lng) as (RailStation & { lat: number; lng: number; color: string })[]).forEach(({ x, dist }) =>
        out.push({
          id: `r${x.id}`,
          layer: 'rail',
          name: `${x.line} ${x.name}`,
          sub: [x.lifts ? `${x.lifts} asansör` : '', x.escalators ? `${x.escalators} yürüyen merdiven` : ''].filter(Boolean).join(' · '),
          lat: x.lat,
          lng: x.lng,
          dist,
          onPress: () => router.push({ pathname: '/rail/[id]', params: { id: String(x.lineId), name: x.line, station: String(x.id) } }),
        }),
      );
    }
    if (layers.has('ferry') && piers.data) {
      near(piers.data).forEach(({ x, dist }) =>
        out.push({ id: `f${x.name}`, layer: 'ferry', name: `${x.name} iskelesi`, sub: 'Şehir Hatları', lat: x.lat, lng: x.lng, dist, onPress: () => router.push('/ferry') }),
      );
    }
    if (layers.has('park') && parks.data) {
      near(parks.data).forEach(({ x, dist }) =>
        out.push({
          id: `p${x.id}`,
          layer: 'park',
          name: x.name,
          sub: `${x.empty}/${x.capacity} boş · ${x.type} · ${x.hours}`,
          lat: x.lat,
          lng: x.lng,
          dist,
          onPress: () => router.push({ pathname: '/parking', params: { id: String(x.id) } }),
        }),
      );
    }
    if (layers.has('taxi') && taxis.data) {
      near(taxis.data).forEach(({ x, dist }) =>
        out.push({ id: `t${x.name}${x.lat}`, layer: 'taxi', name: x.name, sub: 'Taksi durağı', lat: x.lat, lng: x.lng, dist }),
      );
    }
    return out.sort((a, b) => a.dist - b.dist);
  }, [center, layers, stops.data, rail.data, piers.data, parks.data, taxis.data, RADIUS, accessibleOnly]);

  const markers: MapMarker[] = useMemo(
    () =>
      places.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        color: LAYERS.find((l) => l.key === p.layer)!.color,
        size: p.layer === 'stops' ? 10 : 13,
        title: `${p.name}\n${p.sub}`,
        ...(p.layer === 'park' ? { label: 'P', kind: 'badge' as const } : {}),
        ...(p.layer === 'rail' ? { label: p.name.split(' ')[0], kind: 'badge' as const } : {}),
      })),
    [places],
  );

  const toggle = (k: Layer) =>
    setLayers((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const loadingAny = stops.loading || rail.loading || piers.loading || parks.loading || taxis.loading;
  const moved = distanceM(mapCenter, center) > 300;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <T bold size={28}>
          Yakınımda
        </T>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0, flexShrink: 0 }}>
        {LAYERS.map((l) => (
          <Chip key={l.key} label={l.label} active={layers.has(l.key)} color={l.color} onPress={() => toggle(l.key)} />
        ))}
      </ScrollView>

      <View style={{ height: 300 }}>
        <MapView
          style={{ flex: 1 }}
          center={[center.lat, center.lng]}
          zoom={16}
          markers={markers}
          user={user}
          onMarkerPress={(id) => places.find((p) => p.id === id)?.onPress?.()}
          onMoveEnd={(m) => setMapCenter({ lat: m.lat, lng: m.lng })}
        />
        <View style={styles.mapButtons}>
          {moved ? <Button title="Bu bölgede ara" onPress={() => setCenter(mapCenter)} color={Brand.blue} /> : null}
          <Button title="Konumum" onPress={() => locate().catch(() => setPerm('denied'))} color="#333" />
        </View>
      </View>

      {perm === 'denied' ? (
        <T dim size={13} style={{ padding: 12 }}>
          Konum izni verilmedi. Haritayı kaydırıp &quot;Bu bölgede ara&quot; ile istediğin yeri görebilirsin.
        </T>
      ) : null}
      {stops.error ? (
        <View style={{ padding: 12 }}>
          <ErrorBox error={stops.error} onRetry={stops.reload} />
        </View>
      ) : null}

      <FlatList
        data={places}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={loadingAny && places.length === 0 ? <Loading label="İlk açılışta durak listesi indiriliyor" /> : undefined}
        ListEmptyComponent={!loadingAny ? <T dim style={{ padding: 24, textAlign: 'center' }}>Bu çevrede seçili türde yer yok</T> : undefined}
        renderItem={({ item }) => (
          <Row
            onPress={item.onPress}
            left={<View style={[styles.dot, { backgroundColor: LAYERS.find((l) => l.key === item.layer)!.color }]} />}
            title={item.name}
            subtitle={item.sub}
            right={<T dim size={13}>{item.dist < 1000 ? `${Math.round(item.dist)} m` : `${(item.dist / 1000).toFixed(1)} km`}</T>}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  mapButtons: { position: 'absolute', right: 10, bottom: 10, gap: 6, alignItems: 'flex-end' },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
