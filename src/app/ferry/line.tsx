import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getFerryTimetable } from '@/api/ferry';
import { Brand, Card, Chip, Empty, ErrorBox, Loading, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { askReminder, timeToday } from '@/lib/reminders';
import { useStore } from '@/lib/store';

const toMin = (s: string) => {
  const m = /(\d{1,2}):(\d{2})/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export default function FerryLine() {
  const { path, name } = useLocalSearchParams<{ path: string; name?: string }>();
  const c = useTheme();
  const tables = useAsync(() => getFerryTimetable(path), [path]);
  const [idx, setIdx] = useState(0);
  const { isFavorite, toggleFavorite, addRecent } = useStore();
  const fav = isFavorite({ kind: 'ferry', code: path });
  useEffect(() => {
    if (name) addRecent({ kind: 'ferry', code: path, name });
  }, [path, name, addRecent]);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const table = tables.data?.[idx];
  const nextRow = table?.rows.findIndex((r) => {
    const m = toMin(r[0] ?? '');
    return m !== null && m >= nowMin;
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: name ?? 'Vapur seferleri',
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => toggleFavorite({ kind: 'ferry', code: path, name: name ?? path })}>
              <T size={22} color={fav ? Brand.orange : c.textSecondary}>
                {fav ? '★' : '☆'}
              </T>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 40 }}>
        {tables.loading && !tables.data ? <Loading /> : null}
        <View style={{ padding: 16 }}>
          <ErrorBox error={tables.error} onRetry={tables.reload} />
        </View>
        {tables.data?.length === 0 ? <Empty text="Sefer tablosu bulunamadı" /> : null}

        {tables.data && tables.data.length > 1 ? (
          <View style={styles.chips}>
            {tables.data.map((t, i) => (
              <Chip key={i} label={`${t.columns[0]?.pier ?? 'Yön'} kalkışlı`} active={idx === i} color={Brand.ferry} onPress={() => setIdx(i)} />
            ))}
          </View>
        ) : null}

        {table ? (
          <>
            <T dim size={12} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              Bir sefere dokunarak hatırlatıcı kurabilirsin.
            </T>
            {table.notes.length ? (
              <Card style={{ marginHorizontal: 16, marginBottom: 12, gap: 2 }}>
                {table.notes.map((n, i) => (
                  <T key={i} size={12} dim={i > 0} bold={i === 0}>
                    {n}
                  </T>
                ))}
              </Card>
            ) : null}
            <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 16 }}>
              <View>
                <View style={[styles.tr, { backgroundColor: Brand.ferry, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}>
                  {table.columns.map((col, i) => (
                    <View key={i} style={styles.td}>
                      <T bold size={13} color="#fff">
                        {col.pier}
                      </T>
                      <T size={10} color="#fff">
                        {col.kind}
                      </T>
                    </View>
                  ))}
                </View>
                {table.rows.map((r, ri) => {
                  const past = nextRow !== undefined && nextRow >= 0 ? ri < nextRow : false;
                  const isNext = ri === nextRow;
                  return (
                    <Pressable
                      key={ri}
                      disabled={past}
                      onPress={() => {
                        const t = /(\d{1,2}:\d{2})/.exec(r[0] ?? '')?.[1];
                        if (t)
                          askReminder({
                            what: 'Vapur',
                            place: `${table.columns[0]?.pier ?? ''} kalkışı`,
                            departure: timeToday(t),
                            target: { kind: 'ferry', code: path, name: name ?? path },
                          });
                      }}
                      style={[
                        styles.tr,
                        { backgroundColor: isNext ? c.seaSoft : ri % 2 ? c.backgroundElement : c.background, opacity: past ? 0.45 : 1 },
                      ]}>
                      {r.map((cell, ci) => (
                        <View key={ci} style={styles.td}>
                          <T size={14} bold={isNext} color={isNext ? Brand.ferry : undefined}>
                            {cell}
                          </T>
                        </View>
                      ))}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingTop: 0 },
  tr: { flexDirection: 'row' },
  td: { width: 96, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
});
