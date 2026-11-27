import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FavIcon, favSubtitle } from '@/components/fav-icon';
import { Card, Row, Separator, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { openItem } from '@/lib/nav';
import { actions, favTitle, useStore } from '@/lib/store';

export default function Favorites() {
  const c = useTheme();
  const { favorites } = useStore();

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      {favorites.length === 0 ? (
        <Card style={{ margin: 16 }}>
          <T dim size={14}>
            Henüz favorin yok. Durak, hat, metro istasyonu ya da vapur sayfasındaki yıldıza dokunarak ekleyebilirsin.
          </T>
        </Card>
      ) : (
        <T dim size={13} style={{ padding: 16 }}>
          Ana sayfada bu sırayla görünürler. Oklarla sırala, kaleme dokunarak ad ver ya da durakta hangi hatları görmek istediğini seç.
        </T>
      )}
      {favorites.map((f, i) => (
        <View key={`${f.kind}-${f.code}`}>
          <Row
            onPress={() => openItem(f)}
            left={<FavIcon f={f} />}
            title={favTitle(f)}
            subtitle={favSubtitle(f)}
            right={
              <View style={styles.actions}>
                <Btn label="↑" disabled={i === 0} onPress={() => actions.moveFavorite(f, -1)} />
                <Btn label="↓" disabled={i === favorites.length - 1} onPress={() => actions.moveFavorite(f, 1)} />
                <Btn label="✎" onPress={() => router.push({ pathname: '/favorite-edit', params: { kind: f.kind, code: f.code } })} />
              </View>
            }
          />
          <Separator />
        </View>
      ))}
    </ScrollView>
  );
}

function Btn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4} style={[styles.btn, { backgroundColor: c.backgroundElement, opacity: disabled ? 0.3 : 1 }]}>
      <T bold>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 6 },
  btn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
