// Uygulamanın tüm kullanıcı verisi (profil, favoriler, ayarlar, hatırlatıcılar).
// Şimdilik sadece cihazda (AsyncStorage) tutuluyor. İleride bir hesap servisine
// bağlanırsa senkronizasyon bu dosyadan yapılır, ekranlar değişmez.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

export type Place = { label: string; lat: number; lng: number; stopCode?: string; stopName?: string };

export type Profile = { name: string; color: string; createdAt: number; home?: Place; work?: Place };

export type Favorite =
  | { kind: 'stop'; code: string; name: string; district?: string; alias?: string; lines?: string[] }
  | { kind: 'line'; code: string; name: string; alias?: string }
  | { kind: 'rail'; code: string; name: string; color?: string; alias?: string }
  // code: `${lineId}:${stationId}:${dirId}`
  | { kind: 'station'; code: string; name: string; alias?: string; lineId: number; lineCode: string; color?: string; stationId: number; dirId: number; dirName: string }
  // code: Şehir Hatları sayfa yolu
  | { kind: 'ferry'; code: string; name: string; alias?: string };

export type FavKind = Favorite['kind'];
export type FavKey = { kind: FavKind; code: string };

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  refreshSec: number;
  radius: number;
  accessibleOnly: boolean;
  remindBefore: number;
  showRecents: boolean;
  liveOnHome: boolean;
};

export type Reminder = { id: string; title: string; body: string; at: number; target?: FavKey & { name: string } };

type State = {
  ready: boolean;
  onboarded: boolean;
  profile: Profile | null;
  favorites: Favorite[];
  recents: Favorite[];
  settings: Settings;
  reminders: Reminder[];
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  refreshSec: 30,
  radius: 1000,
  accessibleOnly: false,
  remindBefore: 5,
  showRecents: true,
  liveOnHome: true,
};

export const PROFILE_COLORS = ['#E30613', '#0B5CAD', '#1E8E3E', '#F29100', '#00838F', '#6A1B9A', '#455A64'];

const KEY = 'acik-durak:v2';
const PREV_KEY = 'istanbul-ulasim:v2';
const OLD_KEY = 'otobus:v1';

let state: State = {
  ready: false,
  onboarded: false,
  profile: null,
  favorites: [],
  recents: [],
  settings: DEFAULT_SETTINGS,
  reminders: [],
};
const listeners = new Set<() => void>();

function persist() {
  const { ready: _r, ...rest } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
}

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
  persist();
}

function applyTheme(t: Settings['theme']) {
  try {
    Appearance.setColorScheme(t === 'system' ? 'auto' : t);
  } catch {}
}

let loading: Promise<void> | null = null;
function load() {
  loading ??= (async () => {
    try {
      const raw = (await AsyncStorage.getItem(KEY)) ?? (await AsyncStorage.getItem(PREV_KEY));
      if (raw) {
        const saved = JSON.parse(raw) as Partial<State>;
        state = { ...state, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
      } else {
        // v1'den taşıma: eski favoriler ve son bakılanlar korunur
        const old = await AsyncStorage.getItem(OLD_KEY);
        if (old) {
          const o = JSON.parse(old) as { favorites?: Favorite[]; recents?: Favorite[] };
          state = { ...state, favorites: o.favorites ?? [], recents: o.recents ?? [] };
        }
      }
    } catch {}
    state = { ...state, ready: true, reminders: state.reminders.filter((r) => r.at > Date.now()) };
    applyTheme(state.settings.theme);
    listeners.forEach((l) => l());
  })();
  return loading;
}
load();

const same = (a: FavKey, b: FavKey) => a.kind === b.kind && a.code === b.code;
export const favId = (f: FavKey) => `${f.kind}:${f.code}`;
export const favTitle = (f: Favorite) => f.alias || f.name;

// --- Aksiyonlar (ekranlardan doğrudan çağrılabilir) ---

export const actions = {
  completeOnboarding(profile: Profile) {
    set({ profile, onboarded: true });
  },
  updateProfile(patch: Partial<Profile>) {
    set((s) => ({ profile: { ...(s.profile ?? { name: '', color: PROFILE_COLORS[0], createdAt: Date.now() }), ...patch } }));
  },
  setPlace(slot: 'home' | 'work', place: Place | undefined) {
    actions.updateProfile({ [slot]: place });
  },
  toggleFavorite(f: Favorite) {
    set((s) => ({
      favorites: s.favorites.some((x) => same(x, f)) ? s.favorites.filter((x) => !same(x, f)) : [...s.favorites, f],
    }));
  },
  updateFavorite(key: FavKey, patch: Partial<Favorite>) {
    set((s) => ({ favorites: s.favorites.map((x) => (same(x, key) ? ({ ...x, ...patch } as Favorite) : x)) }));
  },
  removeFavorite(key: FavKey) {
    set((s) => ({ favorites: s.favorites.filter((x) => !same(x, key)) }));
  },
  moveFavorite(key: FavKey, delta: number) {
    set((s) => {
      const list = [...s.favorites];
      const i = list.findIndex((x) => same(x, key));
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return {};
      [list[i], list[j]] = [list[j], list[i]];
      return { favorites: list };
    });
  },
  addRecent(f: Favorite) {
    set((s) => ({ recents: [f, ...s.recents.filter((x) => !same(x, f))].slice(0, 12) }));
  },
  clearRecents() {
    set({ recents: [] });
  },
  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    if (patch.theme) applyTheme(patch.theme);
  },
  addReminder(r: Reminder) {
    set((s) => ({ reminders: [...s.reminders.filter((x) => x.at > Date.now()), r].sort((a, b) => a.at - b.at) }));
  },
  /** Zamanı geçmiş hatırlatıcıları listeden atar. */
  pruneReminders() {
    const now = Date.now();
    if (state.reminders.some((r) => r.at <= now)) set((s) => ({ reminders: s.reminders.filter((r) => r.at > now) }));
  },
  removeReminder(id: string) {
    set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }));
  },
  resetAll() {
    AsyncStorage.multiRemove([OLD_KEY, PREV_KEY]).catch(() => {});
    set({ onboarded: false, profile: null, favorites: [], recents: [], settings: DEFAULT_SETTINGS, reminders: [] });
    applyTheme('system');
  },
};

export function getState() {
  return state;
}

export function useStore() {
  useEffect(() => {
    load();
  }, []);
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  const isFavorite = (f: FavKey) => snap.favorites.some((x) => same(x, f));
  const getFavorite = (f: FavKey) => snap.favorites.find((x) => same(x, f));
  return { ...snap, ...actions, isFavorite, getFavorite };
}

export function useSettings() {
  return useStore().settings;
}

// --- Yedekleme ---

const BACKUP_APP = 'acik-durak';
const BACKUP_APPS = [BACKUP_APP, 'istanbul-ulasim'];

export function exportBackup() {
  return JSON.stringify({
    app: BACKUP_APP,
    v: 2,
    at: new Date().toISOString(),
    profile: state.profile,
    favorites: state.favorites,
    settings: state.settings,
  });
}

/** Yedek metnini içe alır. Profil ve ayarlar değiştirilir, favoriler birleştirilir. */
export function importBackup(text: string): { ok: true; favorites: number } | { ok: false; error: string } {
  let data: any;
  try {
    const start = text.indexOf('{');
    data = JSON.parse(text.slice(start, text.lastIndexOf('}') + 1));
  } catch {
    return { ok: false, error: 'Yedek metni okunamadı. Metnin tamamını kopyaladığından emin ol.' };
  }
  if (!BACKUP_APPS.includes(data?.app) || !Array.isArray(data.favorites)) {
    return { ok: false, error: 'Bu metin Açık Durak yedeği değil.' };
  }
  const favs = (data.favorites as Favorite[]).filter((f) => f && typeof f.code === 'string' && typeof f.name === 'string');
  set((s) => ({
    onboarded: true,
    profile: data.profile ?? s.profile ?? { name: '', color: PROFILE_COLORS[0], createdAt: Date.now() },
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    favorites: [...s.favorites, ...favs.filter((f) => !s.favorites.some((x) => same(x, f)))],
  }));
  applyTheme(state.settings.theme);
  return { ok: true, favorites: favs.length };
}
