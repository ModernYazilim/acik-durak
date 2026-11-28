import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { PlaceButton } from '@/components/place-button';
import { Avatar, Brand, ChoiceRow, Row, SectionTitle, Separator, T, ToggleRow } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { openStorePage } from '@/lib/rating';
import { actions, exportBackup, PROFILE_COLORS, useStore } from '@/lib/store';

export default function ProfileScreen() {
  const c = useTheme();
  const { profile, favorites, reminders, settings, updateSettings } = useStore();
  const [name, setName] = useState(profile?.name ?? '');

  const since = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const backup = async () => {
    const text = exportBackup();
    await Clipboard.setStringAsync(text);
    Alert.alert('Yedek kopyalandı', 'Yedek metni panoya kopyalandı. Kendine mesaj ya da not olarak kaydedebilirsin.', [
      { text: 'Tamam' },
      { text: 'Paylaş', onPress: () => Share.share({ message: text, title: 'Açık Durak yedeği' }) },
    ]);
  };

  const reset = () =>
    Alert.alert('Tüm veriler silinsin mi?', 'Profil, favoriler, ayarlar ve hatırlatıcılar bu telefondan silinir. Geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          actions.resetAll();
          router.dismissAll();
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Avatar name={name || profile?.name} color={profile?.color} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={() => actions.updateProfile({ name: name.trim() })}
            placeholder="Adın"
            placeholderTextColor={c.textSecondary}
            style={[styles.name, { color: c.text, borderColor: c.backgroundSelected }]}
          />
          <T dim size={12}>
            {since ? `${since} tarihinden beri · ` : ''}Bu telefonda kayıtlı
          </T>
        </View>
      </View>
      <View style={styles.colors}>
        {PROFILE_COLORS.map((col) => (
          <Pressable
            key={col}
            onPress={() => actions.updateProfile({ color: col })}
            style={[styles.swatch, { backgroundColor: col, borderColor: col === profile?.color ? c.text : 'transparent' }]}
          />
        ))}
      </View>

      <SectionTitle>Yerlerim</SectionTitle>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <PlaceButton slot="home" label="Ev" />
        <PlaceButton slot="work" label="İş / Okul" />
      </View>

      <SectionTitle>Kişisel</SectionTitle>
      <Row onPress={() => router.push('/favorites')} title="Favorilerim" subtitle={`${favorites.length} kayıt · sırala, yeniden adlandır, sil`} right={<T dim>›</T>} />
      <Separator />
      <Row
        onPress={() => router.push('/reminders')}
        title="Hatırlatıcılar"
        subtitle={reminders.length ? `${reminders.length} aktif hatırlatıcı` : 'Aktif hatırlatıcı yok'}
        right={<T dim>›</T>}
      />

      <SectionTitle>Görünüm</SectionTitle>
      <ChoiceRow
        title="Tema"
        value={settings.theme}
        options={[
          { value: 'system', label: 'Sistem' },
          { value: 'light', label: 'Açık' },
          { value: 'dark', label: 'Koyu' },
        ]}
        onChange={(theme) => updateSettings({ theme })}
      />
      <Separator />
      <ToggleRow
        title="Ana sayfada canlı süreler"
        subtitle="Favori duraklarının ve istasyonlarının varış süreleri ana sayfada görünür"
        value={settings.liveOnHome}
        onChange={(liveOnHome) => updateSettings({ liveOnHome })}
      />
      <Separator />
      <ToggleRow
        title="Son bakılanları göster"
        value={settings.showRecents}
        onChange={(showRecents) => {
          updateSettings({ showRecents });
          if (!showRecents) actions.clearRecents();
        }}
      />

      <SectionTitle>Veri ve bildirim</SectionTitle>
      <ChoiceRow
        title="Varış sürelerini yenile"
        subtitle="Sık yenileme daha fazla mobil veri harcar"
        value={settings.refreshSec}
        options={[
          { value: 15, label: '15 sn' },
          { value: 30, label: '30 sn' },
          { value: 60, label: '1 dk' },
        ]}
        onChange={(refreshSec) => updateSettings({ refreshSec })}
      />
      <Separator />
      <ChoiceRow
        title="Hatırlatma süresi"
        subtitle="Araç gelmeden kaç dakika önce bildirim gelsin"
        value={settings.remindBefore}
        options={[3, 5, 10, 15].map((m) => ({ value: m, label: `${m} dk` }))}
        onChange={(remindBefore) => updateSettings({ remindBefore })}
      />
      <Separator />
      <ChoiceRow
        title="Yakınımda arama mesafesi"
        value={settings.radius}
        options={[500, 1000, 2000].map((m) => ({ value: m, label: m < 1000 ? `${m} m` : `${m / 1000} km` }))}
        onChange={(radius) => updateSettings({ radius })}
      />
      <Separator />
      <ToggleRow
        title="Sadece engelli erişimine uygun duraklar"
        subtitle="Yakınımda ekranında uygun olmayan duraklar gizlenir"
        value={settings.accessibleOnly}
        onChange={(accessibleOnly) => updateSettings({ accessibleOnly })}
      />

      <SectionTitle>Yedekleme</SectionTitle>
      <T dim size={13} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        Hesap sunucusu olmadığı için verilerin sadece bu telefonda duruyor. Telefon değiştirirken yedeği al, yeni telefonda geri yükle.
      </T>
      <Row onPress={backup} title={<T color={c.link}>Yedeği kopyala / paylaş</T>} />
      <Separator />
      <Row onPress={() => router.push('/restore')} title={<T color={c.link}>Yedekten geri yükle</T>} />

      <SectionTitle>Açık Durak</SectionTitle>
      <Row onPress={openStorePage} title={<T color={c.link}>Uygulamayı puanla</T>} subtitle="Beğendiysen mağazada puan vermen daha çok kişiye ulaşmamıza yardım eder" />

      <SectionTitle>Hesap</SectionTitle>
      <Row onPress={reset} title={<T color={Brand.red}>Tüm verileri sil ve çıkış yap</T>} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  name: { fontSize: 22, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 4 },
  colors: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3 },
});
