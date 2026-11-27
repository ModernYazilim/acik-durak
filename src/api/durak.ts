// durak.iett.gov.tr: araç bazında detay (kapı no, klima, wifi vb.). Her durak sorgusu için
// kullanıcının girdiği bir doğrulama kodu gerekiyor; kod uygulamada gösterilir, kullanıcı yazar.
import { HttpError, requestJson } from '@/lib/http';

const BASE = 'https://durak.iett.gov.tr';
const H = { 'Content-Type': 'application/json', Referer: `${BASE}/`, Origin: BASE };

export type DurakVehicle = {
  lineCode: string;
  route: string;
  door: string;
  minutes: number;
  air: boolean;
  wifi: boolean;
  usb: boolean;
  bicycle: boolean;
  accessible: boolean;
};

export type DurakDetail = {
  lat?: number;
  lng?: number;
  lines: string[];
  vehicles: DurakVehicle[];
};

type Any = Record<string, any>;
const pick = (o: Any, k: string) => o[k] ?? o[k[0].toUpperCase() + k.slice(1)];

/** Site çok sık isteği reddediyor ({"error":"Çok fazla istek..."} ya da 429). */
export class RateLimited extends Error {}

async function call<T = Any>(url: string, opts: { method?: 'GET' | 'POST'; body?: string } = {}): Promise<T> {
  try {
    // Sitenin kendi JS'i gibi istek atıyoruz (X-Requested-With yok).
    const res = await requestJson<Any>(url, { method: opts.method ?? 'POST', headers: { ...H, 'X-Requested-With': '' }, body: opts.body ?? '' });
    if (res && typeof res.error === 'string') throw new RateLimited(res.error);
    return res as T;
  } catch (e) {
    if (e instanceof HttpError && e.status === 429) throw new RateLimited('Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.');
    if (e instanceof SyntaxError) return {} as T; // ana sayfa HTML
    throw e;
  }
}

let sessionReady = false;
async function ensureSession() {
  if (sessionReady) return;
  await call(`${BASE}/`, { method: 'GET' }).catch(() => {});
  sessionReady = true;
}

/** Durak koduna karşılık gelen şifreli anahtarı bulur. */
export async function findStopKey(code: string): Promise<string | null> {
  await ensureSession();
  const res = await call<{ data?: Any[] }>(`${BASE}/Home/GetAllStationSelectList`, {
    body: JSON.stringify({ search: code, page: 1, pageSize: 5 }),
  });
  const hit = (res.data ?? []).find((d) => String(pick(d, 'code')) === code) ?? res.data?.[0];
  return hit ? String(pick(hit, 'value')) : null;
}

/** data URI döner. Sunucu her çağrıda oturuma yeni kod yazar, eski görsel geçersiz olur. */
let captchaInFlight: Promise<string> | null = null;
export function getCaptcha(): Promise<string> {
  captchaInFlight ??= (async () => {
    try {
      await ensureSession();
      const res = await call<{ isSuccess: boolean; captchaImage?: string }>(`${BASE}/Home/Captcha`);
      if (!res.isSuccess || !res.captchaImage) throw new Error('Doğrulama kodu alınamadı');
      const img = res.captchaImage;
      return `data:image/${img.startsWith('iVBOR') ? 'png' : 'jpeg'};base64,${img}`;
    } finally {
      captchaInFlight = null;
    }
  })();
  return captchaInFlight;
}

export async function submitCaptcha(stopKey: string, text: string): Promise<{ ok: boolean; message?: string }> {
  const res = await call<{ isSuccess: boolean; message?: string }>(`${BASE}/Home/Control`, {
    body: JSON.stringify({ StationCode: stopKey, CaptchaText: text }),
  });
  if (res.isSuccess) return { ok: true };
  const m = res.message ?? '';
  // Sunucu yanlış kodda da "Doğrulama işlemi sırasında hata oluştu" diyor.
  const message = /hata olu|süresi doldu/i.test(m) ? 'Kod hatalı ya da süresi dolmuş. Yeni kodu dene.' : m || 'Kod hatalı';
  return { ok: false, message };
}

export class CaptchaRequired extends Error {}

export async function getPassingDetail(stopKey: string): Promise<DurakDetail> {
  const res = await call(`${BASE}/Home/GetPassingDetail`, { body: JSON.stringify({ StationCode: stopKey }) });
  if (pick(res, 'isTokenExpired')) throw new CaptchaRequired(res.message ?? 'Doğrulama gerekli');
  if (!pick(res, 'isSuccess')) throw new Error(res.message || 'Veri alınamadı');
  const d: Any = pick(res, 'data') ?? {};
  const lat = Number(pick(d, 'latitude'));
  const lng = Number(pick(d, 'longitude'));
  const flag = (v: Any, k: string) => Number(pick(v, k)) === 1;
  return {
    lat: Number.isFinite(lat) && lat ? lat : undefined,
    lng: Number.isFinite(lng) && lng ? lng : undefined,
    lines: ((pick(d, 'passingLinesStop') as Any[]) ?? []).map((l) => String(pick(l, 'lineCode'))),
    vehicles: ((pick(d, 'stopArrivals') as Any[]) ?? [])
      .map((v) => ({
        lineCode: String(pick(v, 'lineCode') ?? ''),
        route: String(pick(v, 'lineType') ?? ''),
        door: String(pick(v, 'doorNumber') ?? '-'),
        minutes: parseInt(pick(v, 'minute') ?? '0', 10) || 0,
        air: flag(v, 'haveAir'),
        wifi: flag(v, 'haveWifi'),
        usb: flag(v, 'haveUsb'),
        bicycle: flag(v, 'haveBicycle'),
        accessible: flag(v, 'haveAccessibility'),
      }))
      .sort((a, b) => a.minutes - b.minutes),
  };
}
