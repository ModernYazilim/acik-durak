import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';

import { CaptchaRequired, DurakDetail, findStopKey, getPassingDetail } from '@/api/durak';
import { getLinesAtStop, getStopArrivals, getStopInfo } from '@/api/iett';
import { CaptchaSheet } from '@/components/captcha-sheet';
import { MapView } from '@/components/map-view';
import { Brand, Button, Card, Chip, Empty, ErrorBox, LineBadge, Loading, minutesColor, Row, SectionTitle, Separator, T, timeAgo } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { remindArrival } from '@/components/home-cards';
import { openDirections, openItem } from '@/lib/nav';
import { Favorite, useStore } from '@/lib/store';

export default function StopScreen() {
  const { code, name: paramName } = useLocalSearchParams<{ code: string; name?: string }>();
  const c = useTheme();
  const { toggleFavorite, addRecent, getFavorite, settings } = useStore();
  const [filter, setFilter] = useState<string | null>(null);

  const info = useAsync(async () => {
    const i = await getStopInfo(code);
    addRecent({ kind: 'stop', code, name: i.name, district: i.district });
    return i;
  }, [code]);
  const arrivals = useAsync(() => getStopArrivals(code), [code], { refreshMs: settings.refreshSec * 1000 });
  const lines = useAsync(() => getLinesAtStop(code), [code]);

  // durak.iett.gov.tr araç detayları
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [stopKey, setStopKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<DurakDetail | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const startDetail = async () => {
    setDetailErr(null);
    try {
      const key = stopKey ?? (await findStopKey(code));
      if (!key) throw new Error('Durak İETT durak servisinde bulunamadı');
      setStopKey(key);
      try {
        setDetail(await getPassingDetail(key));
      } catch (e) {
        if (e instanceof CaptchaRequired) setCaptchaOpen(true);
        else throw e;
      }
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Hata');
    }
  };

  const afterCaptcha = async () => {
    setCaptchaOpen(false);
    if (!stopKey) return;
    try {
      setDetail(await getPassingDetail(stopKey));
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Hata');
    }
  };

  const name = info.data?.name ?? paramName ?? code;
  const lineCodes = useMemo(() => [...new Set((arrivals.data?.arrivals ?? []).map((a) => a.line))], [arrivals.data]);
  const list = (arrivals.data?.arrivals ?? []).filter((a) => !filter || a.line === filter);
  const routeNames = useMemo(() => Object.fromEntries((lines.data ?? []).map((l) => [l.code, l.name])), [lines.data]);

  const fav = getFavorite({ kind: 'stop', code }) as Extract<Favorite, { kind: 'stop' }> | undefined;

  const share = () =>
    Share.share({
      message: `${name} durağı (${code})
https://www.iett.istanbul/StationDetail?dkod=${code}`,
    });

  return (
    <>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
              <Pressable hitSlop={10} onPress={share}>
                <T size={20} color={c.textSecondary}>
                  ⇪
                </T>
              </Pressable>
              <Pressable hitSlop={10} onPress={() => toggleFavorite({ kind: 'stop', code, name, district: info.data?.district })}>
                <T size={22} color={fav ? Brand.orange : c.textSecondary}>
                  {fav ? '★' : '☆'}
                </T>
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => (arrivals.reload(), info.reload())} />}>
        {info.data?.lat && info.data.lng ? (
          <MapView
            style={{ height: 180 }}
            center={[info.data.lat, info.data.lng]}
            zoom={16}
            markers={[{ id: code, lat: info.data.lat, lng: info.data.lng, label: 'D', color: Brand.green, title: name }]}
          />
        ) : null}

        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <T bold size={20}>
              {name}
            </T>
            <T dim size={13}>
              {[info.data?.district, `Durak kodu ${code}`].filter(Boolean).join(' · ')}
            </T>
          </View>
          {info.data?.lat && info.data.lng ? (
            <Button title="Yol tarifi" onPress={() => openDirections({ lat: info.data!.lat!, lng: info.data!.lng!, label: name })} color={Brand.blue} />
          ) : null}
        </View>

        {fav ? (
          <Pressable onPress={() => router.push({ pathname: '/favorite-edit', params: { kind: 'stop', code } })}>
            <T size={13} color={Brand.blue} style={{ paddingHorizontal: 16 }}>
              {fav.alias ? `Favorilerinde "${fav.alias}" olarak kayıtlı · ` : 'Favorilerinde · '}
              {fav.lines?.length ? `${fav.lines.join(', ')} hatları seçili · ` : ''}düzenle
            </T>
          </Pressable>
        ) : null}

        <SectionTitle right={<T dim size={12}>{arrivals.loading ? 'Yenileniyor' : `Güncelleme ${timeAgo(arrivals.updatedAt)}`}</T>}>
          Yaklaşan otobüsler
        </SectionTitle>

        {lineCodes.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Tümü" active={!filter} onPress={() => setFilter(null)} />
            {lineCodes.map((l) => (
              <Chip key={l} label={l} active={filter === l} onPress={() => setFilter(filter === l ? null : l)} />
            ))}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 16 }}>
          <ErrorBox error={arrivals.error} onRetry={arrivals.reload} />
        </View>
        {!arrivals.data && arrivals.loading ? <Loading /> : null}
        {arrivals.data && list.length === 0 ? <Empty text="Şu an yaklaşan otobüs görünmüyor" /> : null}

        {list.map((a, i) => (
          <View key={`${a.line}-${i}`}>
            <Row
              onPress={() => openItem({ kind: 'line', code: a.line, name: routeNames[a.line] ?? a.route })}
              left={<LineBadge code={a.line} />}
              title={a.route || routeNames[a.line] || a.line}
              subtitle={[a.time ? `Tahmini varış ${a.time}` : null, a.notStarted ? 'Henüz sefere başlamadı / sinyal yok' : null].filter(Boolean).join(' · ')}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {a.minutes !== undefined && a.minutes > 1 ? (
                  <Pressable hitSlop={8} onPress={() => remindArrival(a, name, code)}>
                    <T size={18} color={c.textSecondary}>
                      🔔
                    </T>
                  </Pressable>
                ) : null}
                <View style={[styles.eta, { borderColor: minutesColor(a.minutes) }]}>
                  <T bold size={20} color={minutesColor(a.minutes)}>
                    {a.minutes ?? '-'}
                  </T>
                  <T dim size={10}>
                    dk
                  </T>
                </View>
                </View>
              }
            />
            <Separator />
          </View>
        ))}

        <View style={{ padding: 16, gap: 8 }}>
          {detail ? null : (
            <Button title="Araç detaylarını göster (kapı no, klima, wifi)" onPress={startDetail} color={Brand.blue} />
          )}
          {detailErr ? <T size={13} color={Brand.red}>{detailErr}</T> : null}
        </View>

        {detail ? (
          <>
            <SectionTitle right={<Pressable onPress={startDetail}><T size={13} color={Brand.blue}>Yenile</T></Pressable>}>Araç detayları</SectionTitle>
            {detail.vehicles.length === 0 ? <Empty text="Araç bilgisi yok" /> : null}
            {detail.vehicles.map((v, i) => (
              <View key={`${v.door}-${i}`}>
                <Row
                  left={<LineBadge code={v.lineCode} />}
                  title={v.route}
                  subtitle={
                    <View style={styles.features}>
                      <T dim size={12}>Kapı {v.door}</T>
                      {v.air ? <Feature label="Klima" /> : null}
                      {v.wifi ? <Feature label="Wi-Fi" /> : null}
                      {v.usb ? <Feature label="USB" /> : null}
                      {v.bicycle ? <Feature label="Bisiklet" /> : null}
                      {v.accessible ? <Feature label="Engelli erişimi" /> : null}
                    </View>
                  }
                  right={
                    <T bold size={18} color={minutesColor(v.minutes)}>
                      {v.minutes} dk
                    </T>
                  }
                />
                <Separator />
              </View>
            ))}
          </>
        ) : null}

        {arrivals.data?.announcements.length ? (
          <>
            <SectionTitle>Duyurular</SectionTitle>
            {arrivals.data.announcements.map((a, i) => (
              <Card key={i} style={styles.note}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <LineBadge code={a.line} color={Brand.orange} />
                  <T size={14} style={{ flex: 1 }}>
                    {a.text}
                  </T>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        <SectionTitle>Bu duraktan geçen hatlar</SectionTitle>
        {lines.loading && !lines.data ? <Loading /> : null}
        {(lines.data ?? []).map((l) => (
          <View key={l.code}>
            <Row onPress={() => openItem({ kind: 'line', code: l.code, name: l.name })} left={<LineBadge code={l.code} />} title={l.name} right={<T dim>›</T>} />
            <Separator />
          </View>
        ))}

        {arrivals.data?.notes.length ? (
          <Card style={[styles.note, { marginTop: 16 }]}>
            {arrivals.data.notes.map((n, i) => (
              <T key={i} dim size={12}>
                {n}
              </T>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <CaptchaSheet visible={captchaOpen} stopKey={stopKey} onClose={() => setCaptchaOpen(false)} onSuccess={afterCaptcha} />
    </>
  );
}

function Feature({ label }: { label: string }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: c.backgroundSelected, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
      <T size={11}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  eta: { width: 54, height: 48, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  note: { marginHorizontal: 16, marginBottom: 8, gap: 6 },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 2 },
});
