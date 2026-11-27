// İBB açık servisleri: İETT SOAP (canlı konum, durak ana verisi, duyurular), İSPARK, trafik indeksi.
import { File, Paths } from 'expo-file-system';

import { decodeEntities } from '@/lib/html';
import { request, requestJson } from '@/lib/http';

const IETT = 'https://api.ibb.gov.tr/iett';

async function soap(path: string, op: string, params: Record<string, string> = {}): Promise<string> {
  const body =
    '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    `<${op} xmlns="http://tempuri.org/">` +
    Object.entries(params)
      .map(([k, v]) => `<${k}>${v.replace(/[<>&]/g, '')}</${k}>`)
      .join('') +
    `</${op}></soap:Body></soap:Envelope>`;
  const xml = await request(`${IETT}/${path}`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"http://tempuri.org/${op}"` },
    timeoutMs: 30000,
  });
  const m = new RegExp(`<${op}Result>([\\s\\S]*?)</${op}Result>`).exec(xml);
  return m ? decodeEntities(m[1]) : '';
}

async function soapJson<T>(path: string, op: string, params?: Record<string, string>): Promise<T> {
  const s = await soap(path, op, params);
  return (s ? JSON.parse(s) : []) as T;
}

// ---------- Canlı araç konumları ----------

export type LiveBus = {
  door: string;
  lat: number;
  lng: number;
  line: string;
  routeCode: string; // ör. 500T_D_D0
  direction: 'G' | 'D';
  heading: string; // yön adı
  lastSeen: string;
  nearStop?: string;
};

export async function getLiveBuses(line: string): Promise<LiveBus[]> {
  const raw = await soapJson<Record<string, string>[]>('FiloDurum/SeferGerceklesme.asmx', 'GetHatOtoKonum_json', {
    HatKodu: line,
  });
  return raw
    .map((r) => ({
      door: r.kapino,
      lat: parseFloat(r.enlem),
      lng: parseFloat(r.boylam),
      line: r.hatkodu,
      routeCode: r.guzergahkodu ?? '',
      direction: (r.guzergahkodu ?? '').includes('_D_') ? ('D' as const) : ('G' as const),
      heading: r.yon ?? '',
      lastSeen: r.son_konum_zamani ?? '',
      nearStop: r.yakinDurakKodu,
    }))
    .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng));
}

// ---------- Hat bilgisi ----------

export type LineMeta = { code: string; name: string; tariff?: string; lengthKm?: number; tripMinutes?: number };

export async function getLineMeta(line: string): Promise<LineMeta | null> {
  const raw = await soapJson<Record<string, any>[]>('UlasimAnaVeri/HatDurakGuzergah.asmx', 'GetHat_json', { HatKodu: line });
  const r = raw.find((x) => x.SHATKODU === line) ?? raw[0];
  if (!r) return null;
  return {
    code: r.SHATKODU,
    name: r.SHATADI,
    tariff: r.TARIFE ?? undefined,
    lengthKm: r.HAT_UZUNLUGU ? Number(r.HAT_UZUNLUGU) : undefined,
    tripMinutes: r.SEFER_SURESI ? Number(r.SEFER_SURESI) : undefined,
  };
}

// ---------- Tüm duraklar (yakındaki duraklar için, önbellekli) ----------

export type StopLite = { c: string; n: string; d: string; y: string; la: number; lo: number; a?: 1 };

const STOP_CACHE = 'iett-stops-v1.json';
const STOP_TTL = 7 * 24 * 3600 * 1000;
let stopsMem: StopLite[] | null = null;

export async function getAllStops(force = false): Promise<StopLite[]> {
  if (stopsMem && !force) return stopsMem;
  const file = new File(Paths.cache, STOP_CACHE);
  if (!force && file.exists) {
    try {
      const cached = JSON.parse(await file.text()) as { at: number; stops: StopLite[] };
      if (Date.now() - cached.at < STOP_TTL && cached.stops.length) {
        stopsMem = cached.stops;
        return stopsMem;
      }
    } catch {}
  }
  const raw = await soapJson<Record<string, any>[]>('UlasimAnaVeri/HatDurakGuzergah.asmx', 'GetDurak_json', { DurakKodu: '' });
  const stops: StopLite[] = [];
  for (const r of raw) {
    const m = /POINT\s*\(\s*([\d.]+)\s+([\d.]+)\s*\)/.exec(r.KOORDINAT ?? '');
    if (!m) continue;
    stops.push({
      c: String(r.SDURAKKODU),
      n: r.SDURAKADI ?? '',
      d: r.ILCEADI ?? '',
      y: r.SYON ?? '',
      lo: parseFloat(m[1]),
      la: parseFloat(m[2]),
      ...(r.ENGELLIKULLANIM === 'Uygun' ? { a: 1 as const } : {}),
    });
  }
  stopsMem = stops;
  try {
    if (file.exists) file.delete();
    file.create();
    await file.write(JSON.stringify({ at: Date.now(), stops }));
  } catch {}
  return stops;
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestStops(stops: StopLite[], at: { lat: number; lng: number }, limit = 20, maxM = 1500) {
  const dLat = maxM / 111000;
  const dLng = maxM / (111000 * Math.cos((at.lat * Math.PI) / 180));
  return stops
    .filter((s) => Math.abs(s.la - at.lat) < dLat && Math.abs(s.lo - at.lng) < dLng)
    .map((s) => ({ ...s, dist: distanceM(at, { lat: s.la, lng: s.lo }) }))
    .filter((s) => s.dist <= maxM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

// ---------- Duyurular ----------

export type IettAnnouncement = { line: string; lineName: string; type: string; time: string; message: string };

export async function getIettAnnouncements(): Promise<IettAnnouncement[]> {
  const raw = await soapJson<Record<string, string>[]>('UlasimDinamikVeri/Duyurular.asmx', 'GetDuyurular_json');
  return raw.map((r) => ({
    line: r.HATKODU,
    lineName: r.HAT,
    type: r.TIP,
    time: (r.GUNCELLEME_SAATI ?? '').replace(/^Kayit Saati:\s*/i, ''),
    message: (r.MESAJ ?? '').trim(),
  }));
}

// ---------- İSPARK ----------

export type Park = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  empty: number;
  hours: string;
  type: string;
  freeMinutes: number;
  district: string;
  open: boolean;
};

export async function getParks(): Promise<Park[]> {
  const raw = await requestJson<Record<string, any>[]>('https://api.ibb.gov.tr/ispark/Park');
  return raw
    .map((p) => ({
      id: p.parkID,
      name: p.parkName,
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lng),
      capacity: Number(p.capacity) || 0,
      empty: Number(p.emptyCapacity) || 0,
      hours: p.workHours ?? '',
      type: p.parkType ?? '',
      freeMinutes: Number(p.freeTime) || 0,
      district: p.district ?? '',
      open: p.isOpen === 1 || p.isOpen === true,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export async function getParkDetail(id: number) {
  const raw = await requestJson<Record<string, any>[] | Record<string, any>>(`https://api.ibb.gov.tr/ispark/ParkDetay?id=${id}`);
  const p = Array.isArray(raw) ? raw[0] : raw;
  return p
    ? {
        address: p.address as string | undefined,
        tariff: p.tariff as string | undefined,
        monthlyFee: p.monthlyFee as number | undefined,
        updated: p.updateDate as string | undefined,
      }
    : null;
}

// ---------- Trafik ----------

export type TrafficIndex = { city: number; anadolu: number; avrupa: number };

export async function getTrafficIndex(): Promise<TrafficIndex> {
  const r = await requestJson<{ TI: number; TI_An: number; TI_Av: number }>(
    'https://api.ibb.gov.tr/tkmservices/api/TrafficData/v1/TrafficIndex_Sc1_Cont',
  );
  return { city: r.TI, anadolu: r.TI_An, avrupa: r.TI_Av };
}

export async function getTrafficHistory(): Promise<{ time: string; value: number }[]> {
  const r = await requestJson<Record<string, any>[]>(
    'https://api.ibb.gov.tr/tkmservices/api/TrafficData/v1/TrafficIndexHistory/1/5M',
  );
  return (r ?? [])
    .map((x) => ({ time: String(x.TrafficIndexDate ?? ''), value: Number(x.TrafficIndex ?? 0) }))
    .filter((x) => x.time)
    .sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- Taksi durakları ----------

export type TaxiStand = { name: string; lat: number; lng: number; district?: string };

export async function getTaxiStands(): Promise<TaxiStand[]> {
  const gj = await requestJson<{ features: { properties: Record<string, any>; geometry: { coordinates: number[] } }[] }>(
    'https://data.ibb.gov.tr/dataset/10fc48d1-ba69-423d-9414-8bb3487e6e2a/resource/33c384f3-f456-474c-90cf-1c4e65ac221f/download/istanbul_taksi_duraklari.geojson',
    { timeoutMs: 30000 },
  );
  return gj.features
    .map((f) => ({
      name: f.properties.DURAK_ADI ?? 'Taksi durağı',
      district: f.properties.ILCE_ADI ?? f.properties.ILCE,
      lng: f.geometry?.coordinates?.[0],
      lat: f.geometry?.coordinates?.[1],
    }))
    .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng));
}
