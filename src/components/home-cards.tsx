// Ana sayfa panosundaki canlı kartlar.
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { getFerryTimetable } from '@/api/ferry';
import { getLiveBuses } from '@/api/ibb';
import { Arrival, getStopArrivals } from '@/api/iett';
import { getRailTimes } from '@/api/metro';
import { FavIcon } from '@/components/fav-icon';
import { Brand, Card, LineBadge, minutesColor, Row, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { openDirections, openItem } from '@/lib/nav';
import { askReminder, timeToday } from '@/lib/reminders';
import { Favorite, favTitle, Place, useSettings } from '@/lib/store';

type StopFav = Extract<Favorite, { kind: 'stop' }>;
type StationFav = Extract<Favorite, { kind: 'station' }>;

function useArrivals(code: string, lines?: string[]) {
  const { refreshSec } = useSettings();
  const r = useAsync(() => getStopArrivals(code), [code], { refreshMs: refreshSec * 1000 });
  const list = (r.data?.arrivals ?? []).filter((a) => !lines?.length || lines.includes(a.line));
  return { ...r, list };
}

export function remindArrival(a: Arrival, stopName: string, stopCode: string) {
  if (a.minutes === undefined) return;
  askReminder({
    what: `${a.line} otobüsü`,
    place: stopName,
    departure: new Date(Date.now() + a.minutes * 60000),
    target: { kind: 'stop', code: stopCode, name: stopName },
  });
}

function ArrivalPills({ list, stopName, stopCode }: { list: Arrival[]; stopName: string; stopCode: string }) {
  const c = useTheme();
  return (
    <View style={styles.pills}>
      {list.slice(0, 4).map((a, i) => (
        <Pressable
          key={`${a.line}-${i}`}
          onLongPress={() => remindArrival(a, stopName, stopCode)}
          style={[styles.pill, { backgroundColor: c.background }]}>
          <LineBadge code={a.line} style={styles.pillBadge} />
          <T bold size={15} color={minutesColor(a.minutes)}>
            {a.minutes !== undefined ? `${a.minutes} dk` : '-'}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

export function FavStopCard({ f }: { f: StopFav }) {
  const r = useArrivals(f.code, f.lines);
  const title = favTitle(f);
  return (
    <Pressable onPress={() => openItem(f)}>
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <FavIcon f={f} />
          <View style={{ flex: 1 }}>
            <T bold numberOfLines={1}>
              {title}
            </T>
            <T dim size={12} numberOfLines={1}>
              {[f.alias ? f.name : null, f.district, f.lines?.length ? f.lines.join(', ') : null].filter(Boolean).join(' · ')}
            </T>
          </View>
        </View>
        {r.list.length ? (
          <ArrivalPills list={r.list} stopName={title} stopCode={f.code} />
        ) : (
          <T dim size={13}>
            {r.loading ? 'Yükleniyor' : r.error ? 'Varış bilgisi alınamadı' : 'Şu an yaklaşan otobüs yok'}
          </T>
        )}
      </Card>
    </Pressable>
  );
}

const hhmmToMin = (t: string) => {
  const d = timeToday(t).getTime() - Date.now();
  return Math.round(d / 60000);
};

export function FavStationCard({ f }: { f: StationFav }) {
  const times = useAsync(() => getRailTimes(f.stationId, f.dirId), [f.stationId, f.dirId], { refreshMs: 60000 });
  const next = (times.data ?? []).filter((t) => hhmmToMin(t) >= 0).slice(0, 4);
  return (
    <Pressable onPress={() => openItem(f)}>
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <FavIcon f={f} />
          <View style={{ flex: 1 }}>
            <T bold numberOfLines={1}>
              {favTitle(f)}
            </T>
            <T dim size={12} numberOfLines={1}>
              {f.dirName} yönü
            </T>
          </View>
        </View>
        {next.length ? (
          <View style={styles.pills}>
            {next.map((t, i) => {
              const m = hhmmToMin(t);
              return (
                <Pressable
                  key={`${t}-${i}`}
                  onLongPress={() =>
                    askReminder({ what: `${f.lineCode} seferi`, place: f.name, departure: timeToday(t), target: { kind: 'station', code: f.code, name: f.name } })
                  }
                  style={[styles.pill, { paddingLeft: 10, backgroundColor: i === 0 ? (f.color ?? Brand.blue) : undefined }]}>
                  <T bold size={15} color={i === 0 ? '#fff' : undefined}>
                    {t}
                  </T>
                  <T size={12} color={i === 0 ? '#fff' : undefined} dim={i > 0}>
                    {m <= 0 ? 'şimdi' : `${m} dk`}
                  </T>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <T dim size={13}>
            {times.loading ? 'Yükleniyor' : 'Yakın zamanda sefer görünmüyor'}
          </T>
        )}
      </Card>
    </Pressable>
  );
}

export function FavLineRow({ f }: { f: Extract<Favorite, { kind: 'line' }> }) {
  const live = useAsync(() => getLiveBuses(f.code), [f.code], { refreshMs: 60000 });
  const n = live.data?.length;
  return (
    <Row
      onPress={() => openItem(f)}
      left={<FavIcon f={f} />}
      title={favTitle(f)}
      subtitle={n === undefined ? (f.alias ? f.name : 'Otobüs hattı') : n ? `${n} araç seferde` : 'Şu an seferde araç yok'}
      right={<T dim>›</T>}
    />
  );
}

export function FavFerryRow({ f }: { f: Extract<Favorite, { kind: 'ferry' }> }) {
  const tables = useAsync(() => getFerryTimetable(f.code), [f.code]);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const next = (tables.data ?? [])
    .map((t) => {
      const row = t.rows.find((r) => {
        const m = /(\d{1,2}):(\d{2})/.exec(r[0] ?? '');
        return m && Number(m[1]) * 60 + Number(m[2]) >= nowMin;
      });
      return row ? `${t.columns[0]?.pier ?? ''} ${/(\d{1,2}:\d{2})/.exec(row[0])?.[1]}` : null;
    })
    .filter(Boolean);
  return (
    <Row
      onPress={() => openItem(f)}
      left={<FavIcon f={f} />}
      title={favTitle(f)}
      subtitle={tables.data ? (next.length ? `Sıradaki: ${next.join(' · ')}` : 'Bugün sefer kalmadı') : 'Vapur hattı'}
      right={<T dim>›</T>}
    />
  );
}

export function PlaceCard({ slot, place }: { slot: 'home' | 'work'; place?: Place }) {
  const title = slot === 'home' ? 'Eve git' : 'İşe git';
  if (!place) {
    return (
      <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/place-picker', params: { slot } })}>
        <Card style={[styles.place, { borderStyle: 'dashed', borderWidth: 1, borderColor: '#999' }]}>
          <T bold>{slot === 'home' ? '⌂ Ev ekle' : '▣ İş ekle'}</T>
          <T dim size={12}>
            Tek dokunuşla yol tarifi
          </T>
        </Card>
      </Pressable>
    );
  }
  return (
    <Pressable style={{ flex: 1 }} onPress={() => openDirections(place, 'transit')}>
      <Card style={styles.place}>
        <T bold>
          {slot === 'home' ? '⌂ ' : '▣ '}
          {title}
        </T>
        <T dim size={12} numberOfLines={1}>
          {place.label}
        </T>
        <T size={12} color={Brand.blue}>
          Toplu taşımayla yol tarifi ›
        </T>
      </Card>
    </Pressable>
  );
}

/** Ev / iş adresine en yakın duraktaki varışlar. */
export function PlaceStopCard({ slot, place }: { slot: 'home' | 'work'; place: Place & { stopCode: string } }) {
  const r = useArrivals(place.stopCode);
  const name = place.stopName ?? place.stopCode;
  return (
    <Pressable onPress={() => openItem({ kind: 'stop', code: place.stopCode, name })}>
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <FavIcon f={{ kind: 'stop', code: place.stopCode, name }} />
          <View style={{ flex: 1 }}>
            <T bold numberOfLines={1}>
              {name}
            </T>
            <T dim size={12}>
              {slot === 'home' ? 'Evine' : 'İşine'} en yakın durak
            </T>
          </View>
        </View>
        {r.list.length ? (
          <ArrivalPills list={r.list} stopName={name} stopCode={place.stopCode} />
        ) : (
          <T dim size={13}>
            {r.loading ? 'Yükleniyor' : 'Şu an yaklaşan otobüs yok'}
          </T>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 10, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, paddingLeft: 4, paddingVertical: 4, borderRadius: 10 },
  pillBadge: { minWidth: 40, height: 24, paddingHorizontal: 5 },
  place: { gap: 3, minHeight: 78 },
});
