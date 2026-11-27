import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getRailDirections, getRailLines, getRailStations, getRailStatuses, getRailTimes, getTravelTimes, RailStation } from '@/api/metro';
import { MapView } from '@/components/map-view';
import { Brand, Button, Card, Chip, Empty, ErrorBox, LineBadge, Loading, SectionTitle, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { askReminder, timeToday } from '@/lib/reminders';
import { useStore } from '@/lib/store';

function minutesUntil(hhmm: string) {
  const now = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  let diff = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  if (diff < -120) diff += 24 * 60;
  return diff;
}

export default function RailLineScreen() {
  const { id, name: paramName, station: paramStation, dir: paramDir } = useLocalSearchParams<{ id: string; name?: string; station?: string; dir?: string }>();
  const lineId = Number(id);
  const c = useTheme();
  const { isFavorite, toggleFavorite, addRecent } = useStore();

  const line = useAsync(async () => (await getRailLines()).find((l) => l.id === lineId), [lineId]);
  const stations = useAsync(() => getRailStations(lineId), [lineId]);
  const directions = useAsync(() => getRailDirections(lineId), [lineId]);
  const status = useAsync(async () => (await getRailStatuses()).filter((s) => s.lineId === lineId && s.active), [lineId]);

  const [pickedDir, setDirId] = useState<number | null>(paramDir ? Number(paramDir) : null);
  const [pickedStation, setStationId] = useState<number | null>(paramStation ? Number(paramStation) : null);
  const [showInfo, setShowInfo] = useState(false);
  const stationId = pickedStation ?? stations.data?.[0]?.id ?? null;
  // Varsayılan yön: seçili istasyonun varış noktası olmadığı yön
  const stName = stations.data?.find((s) => s.id === stationId)?.name.toLocaleLowerCase('tr-TR') ?? '';
  const autoDir =
    directions.data?.find((d) => !d.name.toLocaleLowerCase('tr-TR').split(' - ').pop()?.startsWith(stName.split('-')[0])) ??
    directions.data?.[0];
  const dirId = pickedDir ?? autoDir?.id ?? null;

  const code = line.data?.code ?? paramName ?? '';
  const color = line.data?.color ?? Brand.blue;
  useEffect(() => {
    if (line.data) addRecent({ kind: 'rail', code: String(lineId), name: `${line.data.code} ${line.data.name}`, color: line.data.color });
  }, [line.data, lineId, addRecent]);

  const times = useAsync(
    () => getRailTimes(stationId!, dirId!),
    [stationId, dirId],
    { enabled: stationId !== null && dirId !== null, refreshMs: 60000 },
  );
  const travel = useAsync(() => getTravelTimes(stationId!, dirId!), [stationId, dirId], {
    enabled: stationId !== null && dirId !== null,
  });

  const station = stations.data?.find((s) => s.id === stationId);
  const travelById = useMemo(() => Object.fromEntries((travel.data ?? []).map((t) => [t.id, t.minutes])), [travel.data]);

  const dir = directions.data?.find((d) => d.id === dirId);
  const stationKey = `${lineId}:${stationId}:${dirId}`;
  const stationFav = isFavorite({ kind: 'station', code: stationKey });

  const coords = (stations.data ?? []).filter((s): s is RailStation & { lat: number; lng: number } => !!s.lat && !!s.lng);
  const fav = isFavorite({ kind: 'rail', code: String(lineId) });

  return (
    <>
      <Stack.Screen
        options={{
          title: code || 'Raylı sistem',
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() => toggleFavorite({ kind: 'rail', code: String(lineId), name: `${code} ${line.data?.name ?? ''}`.trim(), color })}>
              <T size={22} color={fav ? Brand.orange : c.textSecondary}>
                {fav ? '★' : '☆'}
              </T>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 40 }}>
        {coords.length ? (
          <MapView
            style={{ height: 220 }}
            fit
            lines={[{ coords: coords.map((s) => [s.lat, s.lng]), color, width: 5 }]}
            markers={coords.map((s) => ({
              id: String(s.id),
              lat: s.lat,
              lng: s.lng,
              color: s.id === stationId ? Brand.red : color,
              size: s.id === stationId ? 16 : 10,
              title: s.name,
            }))}
            onMarkerPress={(sid) => setStationId(Number(sid))}
          />
        ) : null}

        <View style={styles.head}>
          <LineBadge code={code} color={color} />
          <View style={{ flex: 1 }}>
            <T bold size={16}>
              {line.data?.name ?? ''}
            </T>
            {line.data?.first ? (
              <T dim size={12}>
                İşletme saatleri {line.data.first} - {line.data.last}
              </T>
            ) : null}
          </View>
        </View>

        {status.data?.map((s, i) => (
          <Card key={i} style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: c.warnBackground }}>
            <T size={13} color={c.warnText}>
              {s.text}
            </T>
          </Card>
        ))}

        <SectionTitle>Yön</SectionTitle>
        <View style={styles.chips}>
          {(directions.data ?? []).map((d) => (
            <Chip key={d.id} label={d.name} active={dirId === d.id} color={color} onPress={() => setDirId(d.id)} />
          ))}
        </View>

        <SectionTitle>{station ? `${station.name} kalkış saatleri` : 'Kalkış saatleri'}</SectionTitle>
        {station && dir ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <Button
              title={stationFav ? '★ Bu istasyon ve yön favorilerinde' : '☆ Bu istasyon ve yönü favorilere ekle'}
              color={stationFav ? c.neutral : color}
              onPress={() =>
                toggleFavorite({
                  kind: 'station',
                  code: stationKey,
                  name: station.name,
                  lineId,
                  lineCode: code,
                  color,
                  stationId: station.id,
                  dirId: dir.id,
                  dirName: dir.name,
                })
              }
            />
            <T dim size={12} style={{ marginTop: 6 }}>
              Saate dokunarak hatırlatıcı kurabilirsin.
            </T>
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 16 }}>
          <ErrorBox error={times.error} onRetry={times.reload} />
        </View>
        {times.loading && !times.data ? <Loading /> : null}
        {times.data && times.data.length === 0 ? <Empty text="Bu saatten sonra sefer görünmüyor" /> : null}
        {times.data?.length ? (
          <View style={styles.grid}>
            {times.data.slice(0, 16).map((t, i) => {
              const m = minutesUntil(t);
              return (
                <Pressable
                  key={`${t}-${i}`}
                  onPress={() =>
                    station &&
                    askReminder({
                      what: `${code} seferi`,
                      place: `${station.name}${dir ? `, ${dir.name} yönü` : ''}`,
                      departure: timeToday(t),
                      target: { kind: 'station', code: stationKey, name: station.name },
                    })
                  }
                  style={[styles.time, { backgroundColor: i === 0 ? color : c.backgroundElement }]}>
                  <T bold size={15} color={i === 0 ? '#fff' : undefined}>
                    {t}
                  </T>
                  <T size={11} color={i === 0 ? '#fff' : c.textSecondary}>
                    {m <= 0 ? 'şimdi' : `${m} dk`}
                  </T>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <SectionTitle>İstasyonlar</SectionTitle>
        {stations.loading && !stations.data ? <Loading /> : null}
        <ErrorBox error={stations.error} onRetry={stations.reload} />
        {(stations.data ?? []).map((s, i, arr) => {
          const active = s.id === stationId;
          const tt = travelById[s.id];
          return (
            <Pressable key={s.id} onPress={() => setStationId(s.id)} style={[styles.station, active && { backgroundColor: c.backgroundSelected }]}>
              <View style={styles.timeline}>
                <View style={[styles.tl, { backgroundColor: i === 0 ? 'transparent' : color }]} />
                <View style={[styles.dot, { borderColor: color, backgroundColor: active ? color : c.background }]} />
                <View style={[styles.tl, { backgroundColor: i === arr.length - 1 ? 'transparent' : color }]} />
              </View>
              <View style={{ flex: 1, paddingVertical: 10 }}>
                <T bold={active}>{s.name}</T>
                <T dim size={12}>
                  {[
                    s.lifts ? `${s.lifts} asansör` : '',
                    s.escalators ? `${s.escalators} yürüyen merdiven` : '',
                    s.wc ? 'WC' : '',
                    s.babyRoom ? 'Bebek odası' : '',
                    s.masjid ? 'Mescit' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </T>
              </View>
              {tt !== undefined && tt > 0 ? (
                <T dim size={12} style={{ paddingRight: 16 }}>
                  +{tt} dk
                </T>
              ) : null}
            </Pressable>
          );
        })}
        {travel.data?.length ? (
          <T dim size={12} style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            +dk değerleri seçili istasyondan seçili yönde tahmini yolculuk süresidir.
          </T>
        ) : null}

        {line.data?.info ? (
          <>
            <SectionTitle
              right={
                <Pressable onPress={() => setShowInfo(!showInfo)}>
                  <T size={13} color={c.link}>
                    {showInfo ? 'Gizle' : 'Göster'}
                  </T>
                </Pressable>
              }>
              Hat hakkında
            </SectionTitle>
            {showInfo ? (
              <Card style={{ marginHorizontal: 16 }}>
                <T size={13}>{line.data.info}</T>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  time: { width: 72, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  station: { flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingLeft: 16 },
  timeline: { width: 16, alignItems: 'center' },
  tl: { width: 3, flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
});
