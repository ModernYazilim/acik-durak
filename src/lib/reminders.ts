// Yerel hatırlatıcılar. Sunucu yok, bildirim telefonda zamanlanır.
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { actions, FavKey, getState } from '@/lib/store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const CHANNEL = 'reminders';
let channelReady = false;

export async function notificationsAllowed() {
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

async function ensurePermission() {
  if (Platform.OS === 'android' && !channelReady) {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Sefer hatırlatıcıları',
        importance: 6, // AndroidImportance.HIGH
        vibrationPattern: [0, 250, 150, 250],
        enableVibrate: true,
        showBadge: false,
        sound: 'default',
        lightColor: '#E30613',
      });
      channelReady = true;
    } catch (e) {
      if (__DEV__) console.warn('[reminders] kanal oluşturulamadı', e);
    }
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type Input = { title: string; body: string; at: Date; target?: FavKey & { name: string } };

export async function scheduleReminder({ title, body, at, target }: Input) {
  if (at.getTime() < Date.now() + 15000) {
    Alert.alert('Süre çok kısa', 'Hatırlatma zamanı geçmiş ya da çok yakın.');
    return false;
  }
  if (!(await ensurePermission())) {
    Alert.alert('Bildirim izni yok', 'Hatırlatıcı için telefon ayarlarından bu uygulamaya bildirim izni vermelisin.');
    return false;
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, data: target ? { target } : {}, sound: true },
    // alarmClock: Android'de bildirim tam zamanında gelir (varsayılan mod birkaç dakika geciktirebiliyor)
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, delivery: 'alarmClock', ...(channelReady ? { channelId: CHANNEL } : {}) },
  });
  actions.addReminder({ id, title, body, at: at.getTime(), target });
  return true;
}

export async function cancelReminder(id: string) {
  actions.removeReminder(id);
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

const hhmm = (d: Date) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/**
 * "X dakika sonra gelecek" türü bir sefer için kullanıcıya sorup hatırlatıcı kurar.
 * departure: aracın tahmini geliş / kalkış zamanı.
 */
export function askReminder(opts: { what: string; place: string; departure: Date; target?: FavKey & { name: string } }) {
  const lead = getState().settings.remindBefore;
  const minsLeft = Math.round((opts.departure.getTime() - Date.now()) / 60000);
  if (minsLeft <= 1) {
    Alert.alert('Çok yakın', `${opts.what} zaten gelmek üzere.`);
    return;
  }
  const options = [...new Set([lead, 2, 10].filter((m) => m < minsLeft))].sort((a, b) => b - a).slice(0, 2);
  Alert.alert(
    `${opts.what} hatırlatıcısı`,
    `${opts.place}, tahmini ${hhmm(opts.departure)} (${minsLeft} dk sonra). Ne zaman haber verelim?`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      ...options.map((m) => ({
        text: `${m} dk kala`,
        onPress: async () => {
          const at = new Date(opts.departure.getTime() - m * 60000);
          try {
            const ok = await scheduleReminder({
              title: `${opts.what} ${m} dk sonra`,
              body: `${opts.place}, tahmini ${hhmm(opts.departure)}. Süre trafiğe göre değişebilir.`,
              at,
              target: opts.target,
            });
            if (ok) Alert.alert('Hatırlatıcı kuruldu', `${hhmm(at)} saatinde bildirim gelecek.`);
          } catch (e) {
            Alert.alert('Hatırlatıcı kurulamadı', e instanceof Error ? e.message : String(e));
          }
        },
      })),
    ],
  );
}

/** "08:45" gibi bir saati bugünün (geçtiyse yarının) tarihine çevirir. */
export function timeToday(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now() - 2 * 3600000) d.setDate(d.getDate() + 1);
  return d;
}
