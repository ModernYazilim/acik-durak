// Metro İstanbul mobil API: metro, tramvay, füniküler, teleferik.
import { stripTags } from '@/lib/html';
import { request } from '@/lib/http';

const BASE = 'https://api.ibb.gov.tr/MetroIstanbul/api/MetroMobile/V2';

type Wrap<T> = { Success: boolean; Error: unknown; Data: T };

async function get<T>(path: string): Promise<T> {
  const r = JSON.parse(await request(`${BASE}/${path}`, { headers: { Accept: 'application/json' } })) as Wrap<T>;
  if (!r.Success) throw new Error('Metro servisi hata döndürdü');
  return r.Data;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = JSON.parse(
    await request(`${BASE}/${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    }),
  ) as Wrap<T>;
  if (!r.Success) throw new Error('Metro servisi hata döndürdü');
  return r.Data;
}

export type RailLine = {
  id: number;
  code: string; // M2, T1...
  name: string;
  color: string;
  first: string;
  last: string;
  info: string;
  order: number;
};

export type RailStation = {
  id: number;
  name: string;
  lineId: number;
  line: string;
  order: number;
  lat?: number;
  lng?: number;
  escalators: number;
  lifts: number;
  wc: boolean;
  babyRoom: boolean;
  masjid: boolean;
};

export type RailDirection = { id: number; name: string };

const hex = (n: string | number) => Number(n).toString(16).padStart(2, '0');

let linesCache: RailLine[] | null = null;
export async function getRailLines(): Promise<RailLine[]> {
  if (linesCache) return linesCache;
  const raw = await get<Record<string, any>[]>('GetLines');
  linesCache = raw
    .filter((l) => String(l.IsActive) !== 'False')
    .map((l) => {
      const c = typeof l.Color === 'string' ? JSON.parse(l.Color.replace(/'/g, '"')) : l.Color ?? {};
      return {
        id: Number(l.Id),
        code: l.Name,
        name: l.LongDescription ?? l.Name,
        color: `#${hex(c.Color_R ?? 80)}${hex(c.Color_G ?? 80)}${hex(c.Color_B ?? 80)}`,
        first: l.FirstTime ?? '',
        last: l.LastTime ?? '',
        info: stripTags(l.Content ?? ''),
        order: Number(l.Order) || 99,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true }));
  return linesCache;
}

function mapStation(s: Record<string, any>): RailStation {
  const d = s.DetailInfo ?? {};
  const lat = parseFloat(d.Latitude);
  const lng = parseFloat(d.Longitude);
  return {
    id: Number(s.Id),
    name: s.Description ?? s.Name,
    lineId: Number(s.LineId),
    line: s.LineName,
    order: Number(s.Order) || 0,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    escalators: Number(d.Escolator) || 0,
    lifts: Number(d.Lift) || 0,
    wc: !!d.WC,
    babyRoom: !!d.BabyRoom,
    masjid: !!d.Masjid,
  };
}

export async function getRailStations(lineId: number): Promise<RailStation[]> {
  const raw = await get<Record<string, any>[]>(`GetStationById/${lineId}`);
  return raw.map(mapStation).sort((a, b) => a.order - b.order);
}

let allStationsCache: RailStation[] | null = null;
export async function getAllRailStations(): Promise<RailStation[]> {
  if (allStationsCache) return allStationsCache;
  allStationsCache = (await get<Record<string, any>[]>('GetStations')).map(mapStation);
  return allStationsCache;
}

export async function getRailDirections(lineId: number): Promise<RailDirection[]> {
  const raw = await get<Record<string, any>[]>(`GetDirectionById/${lineId}`);
  return raw.map((d) => ({ id: Number(d.DirectionId), name: String(d.DirectionName ?? '').replace(/->/g, ' - ') }));
}

function istanbulNowIso() {
  // Servis İstanbul yerel saatini zaman dilimi olmadan bekliyor.
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 19);
}

export async function getRailTimes(stationId: number, directionId: number, at?: string): Promise<string[]> {
  const data = await post<any>('GetTimeTable', {
    BoardingStationId: stationId,
    DirectionId: directionId,
    DateTime: at ?? istanbulNowIso(),
  });
  const list = Array.isArray(data) ? data : [data];
  return list.flatMap((x: any) => x?.TimeInfos?.Times ?? []);
}

export async function getTravelTimes(stationId: number, directionId: number) {
  const data = await post<any>('GetStationBetweenTime', {
    BoardingStationId: stationId,
    DirectionId: directionId,
    DateTime: istanbulNowIso(),
  });
  const list = Array.isArray(data) ? data : [data];
  return list.flatMap((x: any) => x?.StationOrder ?? []).map((s: any) => ({
    id: Number(s.Id),
    name: s.StationName as string,
    order: Number(s.Order),
    minutes: Number(s.Time),
  }));
}

export type RailStatus = { lineId: number; line: string; text: string; active: boolean; updated: string };

export async function getRailStatuses(): Promise<RailStatus[]> {
  const raw = await get<Record<string, any>[]>('GetServiceStatuses');
  return (raw ?? []).map((s) => ({
    lineId: Number(s.LineId),
    line: s.LineName,
    text: (s.Description ?? '').trim(),
    active: !!s.IsActive,
    updated: s.UpdateDate ?? '',
  }));
}

export type RailAnnouncement = { id: number; title: string; text: string };

export async function getRailAnnouncements(): Promise<RailAnnouncement[]> {
  const raw = await get<Record<string, any>[]>('GetAnnouncements/tr');
  return (raw ?? []).map((a) => ({ id: Number(a.Id), title: stripTags(a.Title ?? ''), text: stripTags(a.Content ?? '') }));
}

export type EquipmentStatus = { name: string; active: number; inactive: number };

export async function getEquipmentStatus(): Promise<EquipmentStatus[]> {
  const raw = (await get<Record<string, any>[]>('GetFaultyEquipments')) ?? [];
  return raw
    .flatMap((x) => x.EquipmentServiceStatus ?? [])
    .filter((e: any) => e.IsShow !== false)
    .map((e: any) => ({ name: e.Name, active: Number(e.Active) || 0, inactive: Number(e.Inactive) || 0 }));
}

export type TicketGroup = { type: string; prices: { name: string; price: string }[] };

export async function getTicketPrices(): Promise<TicketGroup[]> {
  const raw = (await get<Record<string, any>[]>('GetTicketPrice/TR')) ?? [];
  return raw.map((g) => ({
    type: g.Type,
    prices: (g.TicketPrices ?? []).map((p: any) => ({ name: p.Name, price: p.Price })),
  }));
}
