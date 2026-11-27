// Basit HTML yardımcıları. İETT uçları HTML parçası döndürdüğü için regex ile ayrıştırıyoruz.

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ccedil: 'ç',
  Ccedil: 'Ç',
  ouml: 'ö',
  Ouml: 'Ö',
  uuml: 'ü',
  Uuml: 'Ü',
  iacute: 'í',
  acirc: 'â',
  Acirc: 'Â',
  icirc: 'î',
  ucirc: 'û',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '-',
  mdash: '-',
  bull: '•',
  hellip: '…',
  deg: '°',
  euro: '€',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? m;
  });
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

/** Belirli bir class ile açılan div bloklarını (iç içe div'leri sayarak) döndürür. */
export function divBlocks(html: string, className: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<div[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const start = m.index + m[0].length;
    let depth = 1;
    const tag = /<\/?div\b[^>]*>/gi;
    tag.lastIndex = start;
    let t: RegExpExecArray | null;
    let end = html.length;
    while ((t = tag.exec(html))) {
      depth += t[0][1] === '/' ? -1 : 1;
      if (depth === 0) {
        end = t.index;
        break;
      }
    }
    out.push(html.slice(start, end));
    re.lastIndex = end;
  }
  return out;
}

export function hiddenInput(html: string, id: string): string | undefined {
  const m = new RegExp(`<input[^>]*value="([^"]*)"[^>]*id="${id}"`, 'i').exec(html)
    ?? new RegExp(`<input[^>]*id="${id}"[^>]*value="([^"]*)"`, 'i').exec(html);
  return m ? decodeEntities(m[1]) : undefined;
}

/** İETT WAF'ı Türkçe karakterli query parametrelerini reddediyor, ASCII'ye çeviriyoruz. */
export function toAscii(s: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
  };
  return s.replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c] ?? c);
}

export function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}
