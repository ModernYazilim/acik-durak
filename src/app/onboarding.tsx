import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceButton } from '@/components/place-button';
import { Avatar, Brand, Button, Card, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { actions, PROFILE_COLORS, useStore } from '@/lib/store';

const FEATURES: [string, string, string][] = [
  ['★', 'Favori durak ve hatların', 'Ana sayfada canlı varış süreleriyle'],
  ['⌂', 'Ev ve iş adresin', 'Tek dokunuşla toplu taşımayla yol tarifi'],
  ['⏰', 'Hatırlatıcılar', 'Otobüs, metro ya da vapur gelmeden bildirim'],
  ['⇅', 'Yedekleme', 'Telefon değiştirince verilerini taşı'],
];

export default function Onboarding() {
  const c = useTheme();
  const { profile } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name ?? '');
  const [color, setColor] = useState(profile?.color ?? PROFILE_COLORS[0]);

  const saveName = () => {
    actions.updateProfile({ name: name.trim(), color, createdAt: profile?.createdAt ?? Date.now() });
    setStep(2);
  };

  const finish = () => {
    actions.completeOnboarding({ createdAt: Date.now(), ...profile, name: name.trim(), color });
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i <= step ? Brand.red : c.backgroundSelected }]} />
            ))}
          </View>

          {step === 0 ? (
            <>
              <T bold size={30}>
                Açık Durak&apos;a hoş geldin
              </T>
              <T dim size={15}>
                Otobüs, metro, tramvay ve vapur bilgilerini tek yerde topladık. Birkaç adımda profilini oluşturalım.
              </T>
              <View style={{ gap: 10, marginTop: 8 }}>
                {FEATURES.map(([icon, title, sub]) => (
                  <Card key={title} style={styles.feature}>
                    <T size={22} style={styles.icon}>
                      {icon}
                    </T>
                    <View style={{ flex: 1 }}>
                      <T bold>{title}</T>
                      <T dim size={13}>
                        {sub}
                      </T>
                    </View>
                  </Card>
                ))}
              </View>
              <T dim size={12}>
                Profilin sadece bu telefonda saklanır, hiçbir yere gönderilmez. Şifre ya da e-posta gerekmez.
              </T>
              <Button title="Başlayalım" onPress={() => setStep(1)} />
              <Pressable onPress={() => router.push('/restore')} style={styles.link}>
                <T color={Brand.blue}>Yedeğim var, geri yükle</T>
              </Pressable>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <T bold size={26}>
                Sana nasıl hitap edelim?
              </T>
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <Avatar name={name || '?'} color={color} size={84} />
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Adın"
                placeholderTextColor={c.textSecondary}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={saveName}
                style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
              />
              <T dim size={13}>
                Profil rengi
              </T>
              <View style={styles.colors}>
                {PROFILE_COLORS.map((col) => (
                  <Pressable
                    key={col}
                    onPress={() => setColor(col)}
                    style={[styles.swatch, { backgroundColor: col, borderColor: col === color ? c.text : 'transparent' }]}
                  />
                ))}
              </View>
              <Button title="Devam" onPress={saveName} />
              <Pressable onPress={() => setStep(0)} style={styles.link}>
                <T dim>Geri</T>
              </Pressable>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <T bold size={26}>
                {name.trim() ? `Merhaba ${name.trim().split(' ')[0]}, sık gittiğin yerler?` : 'Sık gittiğin yerler?'}
              </T>
              <T dim size={15}>
                Ev ve iş adresini eklersen ana sayfada en yakın durağın canlı varış süreleri ve tek dokunuşla yol tarifi görünür. İstersen sonra da
                ekleyebilirsin.
              </T>
              <PlaceButton slot="home" label="Ev" />
              <PlaceButton slot="work" label="İş / Okul" />
              <Button title="Bitir" onPress={finish} style={{ marginTop: 8 }} />
              <Pressable onPress={finish} style={styles.link}>
                <T dim>Şimdilik atla</T>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 14, flexGrow: 1, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dot: { height: 4, flex: 1, borderRadius: 2 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 30, textAlign: 'center' },
  link: { alignSelf: 'center', padding: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18 },
  colors: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
});
