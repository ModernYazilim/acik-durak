import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Brand } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { onboarded } = useStore();

  // Profil oluşturulmamışsa önce karşılama ekranı
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      tintColor={Brand.red}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Otobüs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bus', selected: 'bus.fill' }} md="directions_bus" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nearby">
        <NativeTabs.Trigger.Label>Yakınımda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'location', selected: 'location.fill' }} md="near_me" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rail">
        <NativeTabs.Trigger.Label>Raylı</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tram', selected: 'tram.fill' }} md="subway" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ferry">
        <NativeTabs.Trigger.Label>Vapur</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'ferry', selected: 'ferry.fill' }} md="directions_boat" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>Daha fazla</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="apps" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
