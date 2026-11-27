// Şehir Hatları: JSON servis yok, sefer tabloları sitenin HTML'inden okunuyor.
import { decodeEntities, stripTags } from '@/lib/html';
import { request } from '@/lib/http';

const BASE = 'https://sehirhatlari.istanbul';

export type FerryLine = { group: string; name: string; path: string };

export type FerryTable = {
  notes: string[];
  columns: { pier: string; kind: string }[]; // kind: Kalkış / Varış
  rows: string[][];
};

export type Pier = { name: string; lat: number; lng: number };

const GROUPS: { name: string; path: string }[] = [
  { name: 'İstanbul İçi Hatlar', path: '/tr/seferler/ic-hatlar/istanbul-ici-hatlar-26' },
  { name: 'Boğaz Hatları', path: '/tr/seferler/ic-hatlar/bogaz-hatlari-52' },
  { name: 'Adalar Hatları', path: '/tr/seferler/ic-hatlar/adalar-hatlari-176' },
];

export async function getFerryLines(): Promise<FerryLine[]> {
  const html = await request(`${BASE}/tr/seferler/ic-hatlar`, { headers: { 'X-Requested-With': '' } });
  const seen = new Set<string>();
  const out: FerryLine[] = [];
  const re = /<a[^>]*href="(\/tr\/seferler\/ic-hatlar\/([a-z-]+)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const path = m[1];
    if (seen.has(path)) continue;
    const name = stripTags(m[3]);
    if (!name) continue;
    seen.add(path);
    const group = GROUPS.find((g) => g.path.includes(m![2]))?.name ?? 'Diğer';
    out.push({ group, name, path });
  }
  return out;
}

export async function getFerryTimetable(path: string): Promise<FerryTable[]> {
  const html = await request(`${BASE}${path}`, { headers: { 'X-Requested-With': '' } });
  const tables = [...html.matchAll(/<table[^>]*single-table[^>]*>([\s\S]*?)<\/table>/g)].map((x) => x[1]);
  return tables
    .map((t) => {
      const head = /table-head-information[^>]*>([\s\S]*?)<\/td>/.exec(t)?.[1] ?? '';
      const notes = [...head.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => stripTags(x[1])).filter(Boolean);
      const headRow = /<tr class="table-head-text">([\s\S]*?)<\/tr>/.exec(t)?.[1] ?? '';
      const piers = [...headRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => stripTags(x[1]));
      const kindRow = /<tr class="voyage-off">([\s\S]*?)<\/tr>/.exec(t)?.[1] ?? '';
      const kinds = [...kindRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => stripTags(x[1]));
      const rows = [...t.matchAll(/<tr class="[^"]*hours-tr[^"]*">([\s\S]*?)<\/tr>/g)].map((r) =>
        [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripTags(c[1])),
      );
      return { notes, columns: piers.map((p, i) => ({ pier: p, kind: kinds[i] ?? '' })), rows };
    })
    .filter((t) => t.rows.length > 0);
}

export type FerryNotice = { date: string; text: string; others: string[] };

/** İptal edilen seferler sayfası. Sayfada JSON yok, metni başlıklar arasından kesiyoruz. */
export async function getFerryCancellations(): Promise<FerryNotice> {
  const html = await request(`${BASE}/tr/iptal-seferler`, { headers: { 'X-Requested-With': '' } });
  const body = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  const text = stripTags(body.slice(body.indexOf('<body')).replace(/<\/(p|div|li|h\d|a|span)>/g, '<br>'));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const from = lines.lastIndexOf('A+');
  const to = lines.indexOf('Diğer Duyurular');
  const content = from >= 0 && to > from ? lines.slice(from + 1, to) : [];
  const date = content[0] && /\d{2}\.\d{2}\.\d{4}/.test(content[0]) ? content.shift()! : '';
  const end = lines.findIndex((l, i) => i > to && /^Tüm Duyurular/.test(l));
  return { date, text: content.join('\n'), others: to >= 0 && end > to ? lines.slice(to + 1, end) : [] };
}

const PIER_KML =
  'https://data.ibb.gov.tr/dataset/b47b5391-bcca-4bb3-a575-8ece68901d5d/resource/bcbeff5d-14d7-4ec0-a211-4c4d3e96cfba/download/ehir-hatlar-iskeleleri.kml';

export async function getPiers(): Promise<Pier[]> {
  const kml = await request(PIER_KML, { timeoutMs: 30000 });
  const out: Pier[] = [];
  for (const m of kml.matchAll(/<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g)) {
    const name = decodeEntities(/<name>([\s\S]*?)<\/name>/.exec(m[1])?.[1] ?? '').trim();
    const c = /<coordinates>\s*([\d.]+),([\d.]+)/.exec(m[1]);
    if (name && c) out.push({ name, lng: parseFloat(c[1]), lat: parseFloat(c[2]) });
  }
  return out;
}
