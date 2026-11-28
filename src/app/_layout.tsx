import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Brand } from '@/components/ui';
import { Colors } from '@/constants/theme';
import '@/lib/reminders';
import { openItem } from '@/lib/nav';
import { trackOpenAndMaybeAsk } from '@/lib/rating';
import { actions, FavKey, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

// Başlık çubuğu ve ekran zemini uygulama paletiyle aynı olsun
const navTheme = (dark: boolean) => {
  const base = dark ? DarkTheme : DefaultTheme;
  const c = Colors[dark ? 'dark' : 'light'];
  return {
    ...base,
    colors: { ...base.colors, primary: Brand.red, background: c.background, card: c.background, text: c.text, border: c.backgroundSelected },
  };
};

export default function RootLayout() {
  const scheme = useColorScheme();
  const { ready } = useStore();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    trackOpenAndMaybeAsk();
  }, [ready]);

  // Hatırlatıcı bildirimine dokununca ilgili sayfayı aç
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const req = r.notification.request;
      actions.removeReminder(req.identifier);
      const t = req.content.data?.target as (FavKey & { name: string }) | undefined;
      if (t?.kind && t.code) setTimeout(() => openItem(t), 300);
    });
    const recv = Notifications.addNotificationReceivedListener((n) => actions.removeReminder(n.request.identifier));
    const timer = setInterval(actions.pruneReminders, 30000);
    return () => {
      sub.remove();
      recv.remove();
      clearInterval(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider value={navTheme(scheme === 'dark')}>
      <Stack screenOptions={{ headerBackTitle: 'Geri' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stop/[code]" options={{ title: 'Durak' }} />
        <Stack.Screen name="line/[code]" options={{ title: 'Hat' }} />
        <Stack.Screen name="rail/[id]" options={{ title: 'Raylı sistem' }} />
        <Stack.Screen name="ferry/line" options={{ title: 'Vapur seferleri' }} />
        <Stack.Screen name="parking" options={{ title: 'İSPARK otoparkları' }} />
        <Stack.Screen name="announcements" options={{ title: 'Duyurular' }} />
        <Stack.Screen name="fares" options={{ title: 'Ücret tarifesi' }} />
        <Stack.Screen name="traffic" options={{ title: 'Trafik durumu' }} />
        <Stack.Screen name="profile" options={{ title: 'Profil ve ayarlar' }} />
        <Stack.Screen name="favorites" options={{ title: 'Favorilerim' }} />
        <Stack.Screen name="favorite-edit" options={{ title: 'Favoriyi düzenle', presentation: 'modal' }} />
        <Stack.Screen name="reminders" options={{ title: 'Hatırlatıcılar' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="place-picker" options={{ title: 'Konum seç' }} />
        <Stack.Screen name="restore" options={{ title: 'Yedekten geri yükle', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
