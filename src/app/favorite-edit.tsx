import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { getLinesAtStop } from '@/api/iett';
import { Button, Chip, Empty, Loading, SectionTitle, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { actions, FavKind, useStore } from '@/lib/store';

export default function FavoriteEdit() {
  const { kind, code } = useLocalSearchParams<{ kind: FavKind; code: string }>();
  const c = useTheme();
  const { getFavorite } = useStore();
  const fav = getFavorite({ kind, code });

  const [alias, setAlias] = useState(fav?.alias ?? '');
  const [lines, setLines] = useState<string[]>(fav?.kind === 'stop' ? (fav.lines ?? []) : []);
  const stopLines = useAsync(() => getLinesAtStop(code), [code], { enabled: kind === 'stop' });

  if (!fav) return <Empty text="Bu favori artık yok" />;

  const toggleLine = (l: string) => setLines((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));

  const save = () => {
    actions.updateFavorite(fav, { alias: alias.trim() || undefined, ...(fav.kind === 'stop' ? { lines: lines.length ? lines : undefined } : {}) });
    router.back();
  };

  const remove = () =>
    Alert.alert('Favoriden çıkarılsın mı?', fav.name, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: () => {
          actions.removeFavorite(fav);
          router.back();
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ padding: 16, gap: 4 }}>
        <T bold size={18}>
          {fav.name}
        </T>
        <T dim size={13}>
          {fav.kind === 'stop' ? `Durak ${fav.code}` : fav.kind === 'line' ? `Hat ${fav.code}` : ''}
        </T>
      </View>

      <SectionTitle>Görünen ad</SectionTitle>
      <View style={{ paddingHorizontal: 16 }}>
        <TextInput
          value={alias}
          onChangeText={setAlias}
          placeholder={fav.kind === 'stop' ? 'Ör. Ev durağı, Okul önü' : 'Ör. İşe giden'}
          placeholderTextColor={c.textSecondary}
          style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
        />
      </View>

      {fav.kind === 'stop' ? (
        <>
          <SectionTitle>Ana sayfada gösterilecek hatlar</SectionTitle>
          <T dim size={13} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            Hiçbirini seçmezsen duraktan geçen tüm hatlar görünür.
          </T>
          {stopLines.loading && !stopLines.data ? <Loading /> : null}
          <View style={styles.chips}>
            {(stopLines.data ?? []).map((l) => (
              <Chip key={l.code} label={l.code} active={lines.includes(l.code)} onPress={() => toggleLine(l.code)} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ padding: 16, gap: 10, marginTop: 12 }}>
        <Button title="Kaydet" onPress={save} />
        <Button title="Favorilerden çıkar" onPress={remove} color="#777" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
});
