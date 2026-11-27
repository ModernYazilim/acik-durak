const UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Opts = {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  form?: Record<string, string | number | undefined>;
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

function qs(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export async function request(url: string, opts: Opts = {}): Promise<string> {
  const full = opts.query ? `${url}${url.includes('?') ? '&' : '?'}${qs(opts.query)}` : url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  const headers: Record<string, string> = {
    'User-Agent': UA,
    'X-Requested-With': 'XMLHttpRequest',
    ...opts.headers,
  };
  for (const k of Object.keys(headers)) if (headers[k] === '') delete headers[k]; // boş değer: başlığı gönderme
  let body = opts.body;
  if (opts.form) {
    body = qs(opts.form);
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  }
  try {
    const res = await fetch(full, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`);
    if (text.includes('Request Rejected')) throw new HttpError(403, 'İstek sunucu tarafından reddedildi');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestJson<T>(url: string, opts: Opts = {}): Promise<T> {
  const text = await request(url, { ...opts, headers: { Accept: 'application/json', ...opts.headers } });
  return JSON.parse(text) as T;
}
