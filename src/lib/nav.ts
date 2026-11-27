import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import type { Favorite, FavKind } from '@/lib/store';

type Target = { kind: FavKind; code: string; name: string } | Favorite;

export function openItem(f: Target) {
  switch (f.kind) {
    case 'stop':
      return router.push({ pathname: '/stop/[code]', params: { code: f.code, name: f.name } });
    case 'line':
      return router.push({ pathname: '/line/[code]', params: { code: f.code, name: f.name } });
    case 'rail':
      return router.push({ pathname: '/rail/[id]', params: { id: f.code, name: f.name } });
    case 'station': {
      const [lineId, station, dir] = f.code.split(':');
      return router.push({ pathname: '/rail/[id]', params: { id: lineId, station, dir } });
    }
    case 'ferry':
      return router.push({ pathname: '/ferry/line', params: { path: f.code, name: f.name } });
  }
}

/** Telefonun harita uygulamasında yol tarifi açar. mode: walk | transit */
export function openDirections(to: { lat: number; lng: number; label?: string }, mode: 'walk' | 'transit' = 'walk') {
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${to.lat},${to.lng}&dirflg=${mode === 'walk' ? 'w' : 'r'}${to.label ? `&q=${encodeURIComponent(to.label)}` : ''}`
      : `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${mode === 'walk' ? 'walking' : 'transit'}`;
  return Linking.openURL(url);
}
