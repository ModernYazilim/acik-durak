import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Brand, Button, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { importBackup } from '@/lib/store';

export default function Restore() {
  const c = useTheme();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const paste = async () => setText(await Clipboard.getStringAsync());

  const restore = () => {
    const r = importBackup(text);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    Alert.alert('Yedek yüklendi', `Profilin, ayarların ve ${r.favorites} favori geri yüklendi.`);
    router.dismissTo('/');
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <T dim size={14}>
        Eski telefonunda Profil ve ayarlar &gt; Yedeği kopyala ile aldığın metni buraya yapıştır. Favoriler mevcut olanlarla birleştirilir; profil ve ayarlar
        yedektekiyle değiştirilir.
      </T>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setErr(null);
        }}
        multiline
        placeholder="Yedek metni"
        placeholderTextColor={c.textSecondary}
        style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {err ? <T color={Brand.red} size={13}>{err}</T> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Panodan yapıştır" onPress={paste} color={Brand.blue} style={{ flex: 1 }} />
        <Button title="Geri yükle" onPress={restore} disabled={!text.trim()} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 160, borderRadius: 12, padding: 12, fontSize: 13, textAlignVertical: 'top' },
});
