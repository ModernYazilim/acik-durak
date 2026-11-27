import { StyleSheet, View } from 'react-native';

import { Brand, LineBadge, T } from '@/components/ui';
import type { Favorite, FavKind } from '@/lib/store';

type Item = { kind: FavKind; code: string; name: string } | Favorite;

export function FavIcon({ f }: { f: Item }) {
  if (f.kind === 'line') return <LineBadge code={f.code} />;
  if (f.kind === 'rail') return <LineBadge code={f.name.split(' ')[0]} color={('color' in f && f.color) || Brand.blue} />;
  if (f.kind === 'station') return <LineBadge code={'lineCode' in f ? f.lineCode : 'M'} color={('color' in f && f.color) || Brand.blue} />;
  const ferry = f.kind === 'ferry';
  return (
    <View style={[styles.icon, { backgroundColor: ferry ? Brand.ferry : Brand.green }]}>
      <T color="#fff" bold size={ferry ? 16 : 12}>
        {ferry ? '⛴' : 'D'}
      </T>
    </View>
  );
}

export function favSubtitle(f: Favorite) {
  switch (f.kind) {
    case 'stop':
      return [f.alias ? f.name : null, f.district, `Durak ${f.code}`, f.lines?.length ? `${f.lines.join(', ')} hatları` : null]
        .filter(Boolean)
        .join(' · ');
    case 'line':
      return f.alias ? `${f.code} · ${f.name}` : 'Otobüs hattı';
    case 'rail':
      return 'Raylı sistem hattı';
    case 'station':
      return `${f.lineCode} · ${f.dirName} yönü`;
    case 'ferry':
      return 'Vapur hattı';
  }
}

const styles = StyleSheet.create({
  icon: { width: 48, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
