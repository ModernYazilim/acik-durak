// iett.istanbul web sitesinin kullandığı uçlar (captcha yok).
import { decodeEntities, divBlocks, hiddenInput, stripTags, toAscii } from '@/lib/html';
import { request, requestJson } from '@/lib/http';

const BASE = 'https://www.iett.istanbul';

export type SearchItem =
  | { kind: 'line'; code: string; name: string }
  | { kind: 'stop'; code: string; name: string };

export type Arrival = {
  line: string;
  route: string;
  time?: string; // tahmini saat, ör. 08:16
  minutes?: number;
  notStarted: boolean; // "B" işaretli: sefere başlamamış ya da sinyal sorunlu
  raw: string;
};

export type StopInfo = {
  code: string;
  name: string;
  district: string;
  lat?: number;
  lng?: number;
};

export type StopArrivals = {
  arrivals: Arrival[];
  notes: string[];
  announcements: { line: string; text: string }[];
};

export type LineRef = { code: string; name: string };

export type RouteVariant = { code: string; name: string; direction: 'G' | 'D'; depar: number };

export type RouteStop = { order: number; code: string; name: string; district: string };

export type RouteDirection = { title: string; stops: RouteStop[] };

export type RouteShape = {
  color: string;
  lines: [number, number][][]; // [lat, lng] dizileri
  stops: { name: string; district: string; lat: number; lng: number }[];
};

export type Timetable = {
  title: string;
  days: { label: string; times: { time: string; note?: string; highlighted: boolean }[] }[];
}[];

export async function search(key: string): Promise<SearchItem[]> {
  const res = await requestJson<{ list?: { Path: string; Code: string; Name: string; Stationcode: number }[] }>(
    `${BASE}/tr/RouteStation/GetSearchItems`,
    { query: { key, langid: 1 } },
  );
  return (res.list ?? []).map((i) => {
    if (i.Stationcode > 0) return { kind: 'stop', code: String(i.Stationcode), name: i.Name };
    const m = /hkod=([^&]+)/.exec(i.Path);
    return { kind: 'line', code: m ? decodeURIComponent(m[1]) : stripTags(i.Code), name: i.Name };
  });
}

export async function getStopInfo(code: string): Promise<StopInfo> {
  const html = await request(`${BASE}/StationDetail`, { query: { dkod: code } });
  const lat = parseFloat(hiddenInput(html, 'slat') ?? '');
  const lng = parseFloat(hiddenInput(html, 'slng') ?? '');
  return {
    code,
    name: hiddenInput(html, 'sname') ?? code,
    district: hiddenInput(html, 'sdis') ?? '',
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

export function parseArrivalText(line: string, text: string): Arrival {
  const route = text.replace(/\(.*$/s, '').replace(/\s+-\s+/g, ' - ').trim();
  const bold = /\(([^)]*)\)\s*(.*)$/s.exec(text);
  const tail = bold ? `${bold[1]} ${bold[2]}` : text;
  const time = /(\d{1,2}:\d{2})/.exec(tail)?.[1];
  const min = /(\d+)\s*dk/i.exec(tail);
  return {
    line,
    route,
    time,
    minutes: min ? parseInt(min[1], 10) : undefined,
    notStarted: /(^|\s)B(\s|$)/.test(bold?.[2] ?? '') || /(^|\s)B(\s|$)/.test(bold?.[1] ?? ''),
    raw: text,
  };
}

export async function getStopArrivals(code: string): Promise<StopArrivals> {
  const html = await request(`${BASE}/tr/RouteStation/GetStationInfo`, { query: { dcode: code, langid: 1 } });

  const arrivals: Arrival[] = [];
  const re = /<div class="content">\s*<span>([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    arrivals.push(parseArrivalText(stripTags(m[1]), stripTags(m[2])));
  }

  const header = divBlocks(html, 'departure-times-header')[0] ?? '';
  const [notesPart, annPart = ''] = header.split(/<b>\s*Duyurular\s*<\/b>/i);
  const notes = [...notesPart.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => stripTags(x[1])).filter(Boolean);
  const announcements = [...annPart.matchAll(/<p>\s*<b>([\s\S]*?)<\/b>\s*:?\s*([\s\S]*?)<\/p>/g)].map((x) => ({
    line: stripTags(x[1]),
    text: stripTags(x[2]).replace(/^:\s*/, ''),
  }));

  return { arrivals, notes, announcements };
}

export async function getLinesAtStop(code: string): Promise<LineRef[]> {
  const res = await requestJson<{ html: string }>(`${BASE}/tr/RouteStationAgent/GetRouteByStation`, {
    query: { dcode: code, langid: 1, debug: 0 },
  });
  const out: LineRef[] = [];
  const re = /hkod=([^&"]+)[^>]*>\s*<span>([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(res.html))) out.push({ code: stripTags(m[2]), name: stripTags(m[3]) });
  return out;
}

export async function getRouteVariants(line: string): Promise<RouteVariant[]> {
  const res = await requestJson<
    { GUZERGAH_GUZERGAH_KODU: string; GUZERGAH_GUZERGAH_ADI: string; GUZERGAH_DEPAR_NO: number }[]
  >(`${BASE}/tr/RouteStation/GetAllRoute`, { query: { rcode: line } });
  const seen = new Set<string>();
  return res
    .filter((r) => !seen.has(r.GUZERGAH_GUZERGAH_KODU) && seen.add(r.GUZERGAH_GUZERGAH_KODU))
    .map((r) => ({
      code: r.GUZERGAH_GUZERGAH_KODU,
      name: (r.GUZERGAH_GUZERGAH_ADI ?? '').trim(),
      direction: r.GUZERGAH_GUZERGAH_KODU.includes('_D_') ? 'D' : 'G',
      depar: r.GUZERGAH_DEPAR_NO,
    }));
}

/** Hattın iki yöndeki durak listesi (ana güzergah). */
export async function getRouteStops(line: string): Promise<RouteDirection[]> {
  const html = await request(`${BASE}/tr/RouteStation/GetStationForRoute`, {
    query: { hatkod: toAscii(line), hatstart: '', hatend: '', langid: 1 },
  });
  return parseStopColumns(html);
}

function parseStopColumns(html: string): RouteDirection[] {
  const cols = html.split(/<div class="line-pass-header[^"]*">/).slice(1);
  return cols.map((col) => {
    const title = stripTags(col.slice(0, col.indexOf('</div>')));
    const stops: RouteStop[] = [];
    const re = /dkod=(\d+)[\s\S]*?<p>\s*(\d+)\.\s*([\s\S]*?)<span>\s*-?\s*([\s\S]*?)<\/span>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(col))) {
      stops.push({ code: m[1], order: parseInt(m[2], 10), name: stripTags(m[3]), district: stripTags(m[4]) });
    }
    return { title: title || 'Güzergah', stops };
  });
}

/** Depar (alternatif) güzergahların durakları; anahtar güzergah kodu. */
export async function getVariantStops(line: string): Promise<Record<string, RouteDirection[]>> {
  const html = await request(`${BASE}/tr/RouteStation/GetFastStation`, { query: { routeid: toAscii(line), langid: 1 } });
  const out: Record<string, RouteDirection[]> = {};
  const parts = html.split(/<div id="([^"]+)" class="tab-line-content">/);
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parseStopColumns(parts[i + 1]);
  return out;
}

function parseWkt(wkt: string): [number, number][][] {
  return wkt
    .split('|')
    .map((part) => {
      const inner = /\(\s*([^()]+)\s*\)/.exec(part)?.[1] ?? '';
      return inner
        .split(',')
        .map((p) => p.trim().split(/\s+/).map(Number))
        .filter((p) => p.length === 2 && p.every(Number.isFinite))
        .map(([lng, lat]) => [lat, lng] as [number, number]);
    })
    .filter((l) => l.length > 1);
}

/** Güzergah çizgisi ve durak koordinatları. routeCode ör. "143_G_D0". */
export async function getRouteShape(routeCode: string): Promise<RouteShape | null> {
  const res = await requestJson<
    { lineColor: string; line?: string; stationPlaces?: { stationName: string; stationCity: string; lat: string; lng: string }[] }[]
  >(`${BASE}/tr/RouteStation/GetRoutePinV2`, { query: { q: toAscii(routeCode) } });
  const r = res?.[0];
  if (!r || !r.stationPlaces?.length) return null;
  return {
    color: r.lineColor,
    lines: r.line ? parseWkt(r.line) : [],
    stops: r.stationPlaces.map((s) => ({
      name: decodeEntities(s.stationName),
      district: s.stationCity,
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lng),
    })),
  };
}

export async function getLineAlerts(line: string): Promise<string[]> {
  const res = await requestJson<string[]>(`${BASE}/tr/RouteStation/GetLineStatus`, { query: { rcode: toAscii(line) } });
  return (res ?? []).map((s) => s.replace(/\?/g, "'"));
}

export async function getTimetable(line: string): Promise<Timetable> {
  const html = await request(`${BASE}/tr/RouteStation/GetScheduledDepartureTimes`, {
    method: 'POST',
    form: { rstart: '', rend: '', timeschule: '', freq: '', lngid: 1, hCode: toAscii(line) },
  });
  const tables = html.split(/<table class="line-table">/).slice(1);
  return tables.map((t) => {
    const title = stripTags(/<th[^>]*colspan[^>]*>([\s\S]*?)<\/th>/.exec(t)?.[1] ?? '');
    const headRow = /<\/tr>\s*<tr>([\s\S]*?)<\/tr>\s*<\/thead>/.exec(t)?.[1] ?? '';
    const labels = [...headRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((x) => stripTags(x[1]));
    const days = labels.map((label) => ({ label, times: [] as Timetable[number]['days'][number]['times'] }));
    const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(t)?.[1] ?? '';
    for (const row of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      [...row[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].forEach((cell, i) => {
        const text = stripTags(cell[2]);
        const tm = /(\d{1,2}[:.]\d{2})\s*(.*)/.exec(text);
        if (!tm || !days[i]) return;
        days[i].times.push({ time: tm[1].replace('.', ':'), note: tm[2] || undefined, highlighted: /color:\s*red/i.test(cell[1]) });
      });
    }
    return { title, days };
  });
}

export type LineNotes = { notes: string[]; info: string[] };

/** Hat sayfasındaki notlar (ÖHO/İETT renk açıklaması, harf işaretli seferler) ve hat bilgisi. */
export async function getLineNotes(line: string): Promise<LineNotes> {
  const html = await request(`${BASE}/RouteDetail`, { query: { hkod: toAscii(line) } });
  const desc = /id="routedesc"[^>]*>([\s\S]*?)<!--timetable-->/.exec(html)?.[1] ?? '';
  const cleaned = desc.replace(/<div id="deparDescTemplate"[\s\S]*?<\/div>/, '');
  const notes = [...cleaned.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripTags(m[1])).filter(Boolean);
  const infoBlock = /id="info" class="tab-line-content[^>]*>([\s\S]*?)<\/div>\s*<\/div>/.exec(html)?.[1] ?? '';
  const info = stripTags(infoBlock.replace(/<(p|li|br|div)[^>]*>/g, '\n'))
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && s.toUpperCase() !== 'HAT BİLGİSİ');
  return { notes, info };
}
