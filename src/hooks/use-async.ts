import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

type Opts = { refreshMs?: number; enabled?: boolean };

type State<T> = { key: string; data?: T; error?: Error; updatedAt?: Date };

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/**
 * Basit veri çekme hook'u. deps değişince yeniden çeker, refreshMs verilirse
 * uygulama ön plandayken periyodik yeniler. Hata olursa son başarılı veri korunur.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], opts: Opts = {}) {
  const { refreshMs, enabled = true } = opts;
  const key = JSON.stringify(deps);
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  const [state, setState] = useState<State<T>>({ key: '' });
  const seq = useRef(0);

  const run = useCallback(async (k: string) => {
    const id = ++seq.current;
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ key: k, data, updatedAt: new Date() });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ key: k, data: s.key === k ? s.data : undefined, updatedAt: s.updatedAt, error: toError(e) }));
    }
  }, []);

  useEffect(() => {
    if (enabled) run(key);
  }, [key, enabled, run]);

  useEffect(() => {
    if (!refreshMs || !enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined = setInterval(() => run(key), refreshMs);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        run(key);
        if (!timer) timer = setInterval(() => run(key), refreshMs);
      } else if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [refreshMs, enabled, run, key]);

  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: enabled && !current,
    updatedAt: current ? state.updatedAt : undefined,
    reload: () => run(key),
  };
}
