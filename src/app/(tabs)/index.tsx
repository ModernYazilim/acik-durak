import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { search, SearchItem } from '@/api/iett';
import { FavIcon, favSubtitle } from '@/components/fav-icon';
import { FavFerryRow, FavLineRow, FavStationCard, FavStopCard, PlaceCard, PlaceStopCard } from '@/components/home-cards';
import { Avatar, Brand, Card, Empty, ErrorBox, LineBadge, Loading, Row, SectionTitle, Separator, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { openItem } from '@/lib/nav';
import { Favorite, favTitle, useStore } from '@/lib/store';

const QUICK = [
  { code: '34', name: 'Metrobüs (Avcılar - Zincirlikuyu)' },
  { code: '34BZ', name: 'Metrobüs (Beylikdüzü - Zincirlikuyu)' },
  { code: '500T', name: 'Tuzla Şifa Mahallesi - 4. Levent Metro' },
];

const LIVE_LIMIT = 6; // ana sayfada canlı kart sayısı (fazlası düz satır olur)

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function Home() {
  const c = useTheme();
  const { profile, favorites, recents, reminders, settings, clearRecents, isFavorite, toggleFavorite } = useStore();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const searching = q.trim().length >= 2;
  const res = useAsync(() => search(term), [term], { enabled: term.length >= 2 });
  const results: SearchItem[] | null = searching ? (res.data ?? null) : null;
  const loading = searching && (res.loading || term !== q.trim());

  const firstName = profile?.name?.trim().split(' ')[0];
  const activeReminders = reminders;
  const home = profile?.home;
  const work = profile?.work;
  const favStops = new Set(favorites.filter((f) => f.kind === 'stop').map((f) => f.code));

  const liveIds = new Set(
    settings.liveOnHome
      ? favorites
          .filter((f) => f.kind === 'stop' || f.kind === 'station')
          .slice(0, LIVE_LIMIT)
          .map((f) => `${f.kind}-${f.code}`)
      : [],
  );
  const renderFav = (f: Favorite) => {
    const key = `${f.kind}-${f.code}-${refreshKey}`;
    const live = liveIds.has(`${f.kind}-${f.code}`);
    if (f.kind === 'stop' && live) return <FavStopCard key={key} f={f} />;
    if (f.kind === 'station' && live) return <FavStationCard key={key} f={f} />;
    if (f.kind === 'line' && settings.liveOnHome) return <FavLineRow key={key} f={f} />;
    if (f.kind === 'ferry') return <FavFerryRow key={key} f={f} />;
    return <Row key={key} onPress={() => openItem(f)} left={<FavIcon f={f} />} title={favTitle(f)} subtitle={favSubtitle(f)} right={<T dim>›</T>} />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <T dim size={14}>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </T>
            <T bold size={26}>
              Nereye gidiyoruz?
            </T>
          </View>
          <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
            <Avatar name={profile?.name} color={profile?.color} size={42} />
          </Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: c.backgroundElement }]}>
          <T dim>⌕</T>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Hat kodu, hat adı ya da durak ara"
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text }]}
            autoCorrect={false}
            autoCapitalize="characters"
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10}>
              <T dim>✕</T>
            </Pressable>
          ) : null}
        </View>
      </View>

      {searching ? (
        <FlatList
          data={results ?? []}
          keyExtractor={(i) => `${i.kind}-${i.code}`}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <>
              {loading && !results ? <Loading /> : null}
              {res.error ? (
                <View style={{ padding: 16 }}>
                  <ErrorBox error={res.error} />
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={!loading && !res.error ? <Empty text="Sonuç bulunamadı" /> : undefined}
          renderItem={({ item }) => {
            const fav = isFavorite(item);
            return (
              <Row
                onPress={() => openItem(item)}
                left={<FavIcon f={item} />}
                title={item.name}
                subtitle={item.kind === 'stop' ? `Durak kodu ${item.code}` : 'Otobüs hattı'}
                right={
                  <Pressable hitSlop={10} onPress={() => toggleFavorite(item)}>
                    <T size={22} color={fav ? Brand.orange : c.textSecondary}>
                      {fav ? '★' : '☆'}
                    </T>
                  </Pressable>
                }
              />
            );
          }}
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => setRefreshKey((k) => k + 1)} />}>
          <View style={styles.places}>
            <PlaceCard slot="home" place={home} />
            <PlaceCard slot="work" place={work} />
          </View>
          {settings.liveOnHome && home?.stopCode && !favStops.has(home.stopCode) ? (
            <PlaceStopCard key={`h${refreshKey}`} slot="home" place={{ ...home, stopCode: home.stopCode }} />
          ) : null}
          {settings.liveOnHome && work?.stopCode && work.stopCode !== home?.stopCode && !favStops.has(work.stopCode) ? (
            <PlaceStopCard key={`w${refreshKey}`} slot="work" place={{ ...work, stopCode: work.stopCode }} />
          ) : null}

          {activeReminders.length ? (
            <Pressable onPress={() => router.push('/reminders')}>
              <Card style={[styles.reminder, { backgroundColor: c.warnBackground }]}>
                <T color={c.warnText} size={14}>
                  ⏰ {activeReminders.length} aktif hatırlatıcı · sıradaki{' '}
                  {new Date(activeReminders[0].at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </T>
              </Card>
            </Pressable>
          ) : null}

          <SectionTitle
            right={
              favorites.length ? (
                <Pressable onPress={() => router.push('/favorites')} hitSlop={8}>
                  <T size={13} color={c.link}>
                    Düzenle
                  </T>
                </Pressable>
              ) : undefined
            }>
            Favorilerim
          </SectionTitle>
          {favorites.length === 0 ? (
            <Card style={{ marginHorizontal: 16, gap: 6 }}>
              <T size={14}>Sık kullandığın durak, hat, metro istasyonu ve vapur hatlarını favorilere ekle.</T>
              <T dim size={13}>
                Sayfalardaki ☆ işaretine ya da aramadaki yıldıza dokunman yeterli. Favori durakların burada canlı varış süreleriyle görünür, bir süreye
                basılı tutarak hatırlatıcı kurabilirsin.
              </T>
            </Card>
          ) : (
            favorites.map(renderFav)
          )}

          {settings.showRecents && recents.length > 0 ? (
            <>
              <SectionTitle
                right={
                  <Pressable onPress={clearRecents} hitSlop={8}>
                    <T size={13} color={c.link}>
                      Temizle
                    </T>
                  </Pressable>
                }>
                Son bakılanlar
              </SectionTitle>
              {recents.slice(0, 6).map((f) => (
                <Row key={`r-${f.kind}-${f.code}`} onPress={() => openItem(f)} left={<FavIcon f={f} />} title={f.name} subtitle={favSubtitle(f)} />
              ))}
            </>
          ) : null}

          <SectionTitle>Hızlı erişim</SectionTitle>
          {QUICK.map((l) => (
            <Row
              key={l.code}
              onPress={() => openItem({ kind: 'line', code: l.code, name: l.name })}
              left={<LineBadge code={l.code} color={l.code.startsWith('34') ? Brand.red : Brand.blue} />}
              title={l.name}
              subtitle="Canlı konum ve sefer saatleri"
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  places: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  reminder: { marginHorizontal: 16, marginBottom: 4 },
});
