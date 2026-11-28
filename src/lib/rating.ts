// Mağaza puanlama penceresi. Uygulamayı birkaç farklı gün kullanan kişiye, ilk
// açılıştan en az birkaç gün sonra bir kez sorulur; sonra uzun süre sorulmaz.
// Pencerenin gerçekten gösterilip gösterilmeyeceğine Google Play / App Store karar verir.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

const KEY = 'acik-durak:rating';
const MIN_DAYS_USED = 3;
const MIN_AGE_MS = 4 * 86400000;
const ASK_AGAIN_MS = 120 * 86400000;

type RatingState = { firstOpen: number; days: string[]; askedAt?: number };

const today = () => new Date().toISOString().slice(0, 10);

/** Uygulama açılışında çağrılır. Koşullar uygunsa birkaç saniye sonra puanlama penceresini ister. */
export async function trackOpenAndMaybeAsk() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s: RatingState = raw ? JSON.parse(raw) : { firstOpen: Date.now(), days: [] };
    const d = today();
    if (!s.days.includes(d)) s.days = [...s.days, d].slice(-10);

    const now = Date.now();
    const due =
      s.days.length >= MIN_DAYS_USED &&
      now - s.firstOpen >= MIN_AGE_MS &&
      (!s.askedAt || now - s.askedAt >= ASK_AGAIN_MS);

    if (due && (await StoreReview.isAvailableAsync())) {
      s.askedAt = now;
      await AsyncStorage.setItem(KEY, JSON.stringify(s));
      // Kullanıcı ekrana baktıktan sonra sorulsun
      setTimeout(() => StoreReview.requestReview().catch(() => {}), 8000);
      return;
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Puanlama isteğe bağlı, hata uygulamayı etkilememeli
  }
}

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.modernyazilim.acikdurak';

/** Profil ekranındaki "Uygulamayı puanla" bağlantısı: doğrudan mağaza sayfasını açar. */
export function openStorePage() {
  const url = StoreReview.storeUrl() ?? (Platform.OS === 'android' ? `market://details?id=com.modernyazilim.acikdurak` : null);
  if (url) Linking.openURL(url).catch(() => Linking.openURL(PLAY_URL));
  else Linking.openURL(PLAY_URL);
}
