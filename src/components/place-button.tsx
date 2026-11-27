import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Brand, Card, T } from '@/components/ui';
import { useStore } from '@/lib/store';

export function PlaceButton({ slot, label }: { slot: 'home' | 'work'; label: string }) {
  const { profile } = useStore();
  const place = profile?.[slot];
  return (
    <Pressable onPress={() => router.push({ pathname: '/place-picker', params: { slot } })}>
      <Card style={styles.card}>
        <T size={22} style={styles.icon}>
          {slot === 'home' ? '⌂' : '▣'}
        </T>
        <View style={{ flex: 1 }}>
          <T bold>{label}</T>
          <T dim size={13} numberOfLines={1}>
            {place ? (place.stopName ? `${place.label} · ${place.stopName} durağı` : place.label) : 'Eklemek için dokun'}
          </T>
        </View>
        <T color={place ? Brand.green : Brand.blue} bold size={18}>
          {place ? '✓' : '+'}
        </T>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 30, textAlign: 'center' },
});
