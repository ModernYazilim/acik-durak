import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { getCaptcha, submitCaptcha } from '@/api/durak';
import { Brand, Button, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  stopKey: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

/** durak.iett.gov.tr doğrulama kodu. Kodu kullanıcı kendisi okuyup yazar. */
export function CaptchaSheet({ visible, stopKey, onClose, onSuccess }: Props) {
  const c = useTheme();
  const [img, setImg] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (keepErr = false) => {
    if (!keepErr) setErr(null);
    setText('');
    setImg(null);
    try {
      setImg(await getCaptcha());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Doğrulama kodu alınamadı');
    }
  };

  const submit = async () => {
    if (!stopKey || !text.trim() || busy || !img) return;
    setBusy(true);
    try {
      const r = await submitCaptcha(stopKey, text.trim());
      if (r.ok) onSuccess();
      else {
        setErr(r.message || 'Kod hatalı');
        load(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => load()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <T bold size={17}>Doğrulama kodu</T>
          <T dim size={13}>
            Araç detayları (kapı no, klima, wifi, engelli erişimi) İETT&apos;nin durak servisinden geliyor ve her sorguda kod istiyor.
          </T>
          <Pressable onPress={() => load()} style={styles.imgWrap}>
            {img ? (
              <Image source={{ uri: img }} style={styles.img} contentFit="contain" />
            ) : (
              <T dim>Yükleniyor...</T>
            )}
          </Pressable>
          <T dim size={12}>Okunmuyorsa görsele dokunup yenileyebilirsin.</T>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Kodu yaz"
            placeholderTextColor={c.textSecondary}
            keyboardType="visible-password"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onSubmitEditing={submit}
            style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
          />
          {err ? <T color={Brand.red} size={13}>{err}</T> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Vazgeç" onPress={onClose} color="#777" style={{ flex: 1 }} />
            <Button title={busy ? 'Kontrol ediliyor' : 'Göster'} onPress={submit} disabled={busy} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 18, padding: 20, gap: 12 },
  imgWrap: { height: 70, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, letterSpacing: 4, textAlign: 'center' },
});
