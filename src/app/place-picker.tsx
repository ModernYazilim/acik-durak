import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllStops, nearestStops } from '@/api/ibb';
import { getStopInfo, search } from '@/api/iett';
import { MapView } from '@/components/map-view';
import { Brand, Button, Row, Separator, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { actions, useStore } from '@/lib/store';

const ISTANBUL = { lat: 41.015, lng: 28.979 };
type LatLng = { lat: number; lng: number };

/** Ev / iş konumu seçimi: haritayı kaydır, durak ara ya da mevcut konumu kullan. */
export default function PlacePicker() {
  const { slot } = useLocalSearchParams<{ slot: 'home' | 'work' }>();
  const c = useTheme();
  const { profile } = useStore();
  const existing = profile?.[slot];
  const defaultLabel = slot === 'home' ? 'Ev' : 'İş';

  const [target, setTarget] = useState<{ p: LatLng; zoom: number }>(
    existing ? { p: existing, zoom: 16 } : { p: ISTANBUL, zoom: 11 },
  );
  const [pos, setPos] = useState<LatLng>(existing ?? ISTANBUL);
  const [zoom, setZoom] = useState(existing ? 16 : 11);
  const [label, setLabel] = useState(existing?.label ?? defaultLabel);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [locErr, setLocErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const results = useAsync(async () => (await search(term)).filter((r) => r.kind === 'stop').slice(0, 8), [term], {
    enabled: term.length >= 2,
  });
  const stops = useAsync(() => getAllStops(), []);
  const near = stops.data && zoom >= 14 ? nearestStops(stops.data, pos, 1, 800)[0] : undefined;

  const pickStop = async (code: string) => {
    setQ('');
    setTerm('');
    const i = await getStopInfo(code).catch(() => null);
    if (i?.lat && i.lng) {
      setTarget({ p: { lat: i.lat, lng: i.lng }, zoom: 17 });
      setPos({ lat: i.lat, lng: i.lng });
      setZoom(17);
    }
  };

  const useMyLocation = async () => {
    setLocErr(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocErr('Konum izni verilmedi.');
      return;
    }
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const ll = { lat: p.coords.latitude, lng: p.coords.longitude };
    setTarget({ p: ll, zoom: 17 });
    setPos(ll);
    setZoom(17);
  };

  const save = () => {
    actions.setPlace(slot, {
      label: label.trim() || defaultLabel,
      lat: pos.lat,
      lng: pos.lng,
      stopCode: near?.c,
      stopName: near?.n,
    });
    router.back();
  };

  const searching = term.length >= 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: slot === 'home' ? 'Ev konumu' : 'İş konumu' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ padding: 12 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Yakınındaki bir durağı ara"
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
            autoCorrect={false}
          />
        </View>

        {searching ? (
          <FlatList
            data={results.data ?? []}
            keyExtractor={(i) => i.code}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={<T dim style={{ padding: 16 }}>{results.loading ? 'Aranıyor' : 'Durak bulunamadı'}</T>}
            renderItem={({ item }) => <Row onPress={() => pickStop(item.code)} title={item.name} subtitle={`Durak ${item.code}`} />}
          />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <MapView
                style={{ flex: 1 }}
                center={[target.p.lat, target.p.lng]}
                zoom={target.zoom}
                markers={near ? [{ id: near.c, lat: near.la, lng: near.lo, label: 'D', color: Brand.green, title: near.n }] : []}
                onMoveEnd={(m) => {
                  setPos({ lat: m.lat, lng: m.lng });
                  setZoom(m.zoom);
                }}
              />
              <View pointerEvents="none" style={styles.pinWrap}>
                <T size={36} color={Brand.red} style={{ marginBottom: 34 }}>
                  📍
                </T>
              </View>
              <View style={styles.locBtn}>
                <Button title="Konumum" onPress={useMyLocation} color={c.neutral} />
              </View>
            </View>

            <View style={styles.bottom}>
              <T dim size={13}>
                {zoom < 14
                  ? 'Haritayı yakınlaştırıp iğneyi adresinin üstüne getir.'
                  : near
                    ? `En yakın durak: ${near.n} (${Math.round(near.dist)} m). Ana sayfada bu durağın varış süreleri görünecek.`
                    : 'Bu noktaya 800 m içinde durak bulunamadı.'}
              </T>
              {locErr ? <T size={13} color={Brand.red}>{locErr}</T> : null}
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Bu yere bir ad ver"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {existing ? (
                  <Button
                    title="Kaldır"
                    color={c.neutral}
                    style={{ flex: 1 }}
                    onPress={() => {
                      actions.setPlace(slot, undefined);
                      router.back();
                    }}
                  />
                ) : null}
                <Button title="Kaydet" onPress={save} disabled={zoom < 14} style={{ flex: 2 }} />
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  pinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  locBtn: { position: 'absolute', right: 12, bottom: 28 },
  bottom: { padding: 16, gap: 10 },
});
