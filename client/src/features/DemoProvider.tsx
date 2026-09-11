import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import type {Demo} from '../lib/contracts';
import {ApiError, request} from '../lib/http';
import {newOperationId, useForeground} from '../lib/platform';
import {draftReducer, freshDraft, type Draft, type DraftAction} from './draft';
interface Context {
  demo: Demo | null;
  loading: boolean;
  error: unknown;
  expired: boolean;
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  refresh: () => Promise<Demo>;
  create: () => Promise<Demo>;
  reset: () => Promise<Demo>;
  read: <T>(path: string, signal?: AbortSignal) => Promise<T>;
  write: <T>(path: string, method: string, body?: unknown) => Promise<T>;
  clearDraft: () => void;
  generation: string | null;
}
const DemoContext = createContext<Context | null>(null);
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error('Demo provider missing');
  return value;
}
function SessionProvider({children}: {children: ReactNode}) {
  const queryClient = useQueryClient();
  const [demo, setDemo] = useState<Demo | null>(null);
  const demoRef = useRef<Demo | null>(null);
  const epoch = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [expired, setExpired] = useState(false);
  const sessionOperation = useRef<Promise<Demo> | null>(null);
  const bootstrapOperation = useRef<Promise<Demo> | null>(null);
  const [draft, dispatch] = useReducer(draftReducer, undefined, () =>
    freshDraft(newOperationId()),
  );
  const clearDraft = useCallback(
    () => dispatch({type: 'reset', operationId: newOperationId()}),
    [],
  );
  const invalidateGeneration = useCallback(() => {
    epoch.current++;
    void queryClient.cancelQueries();
    queryClient.clear();
    clearDraft();
  }, [clearDraft, queryClient]);
  const adopt = useCallback(
    (next: Demo) => {
      if (next.generation !== demoRef.current?.generation) {
        invalidateGeneration();
      }
      demoRef.current = next;
      setDemo(next);
      if (next.active) setExpired(false);
      return next;
    },
    [invalidateGeneration],
  );
  const expire = useCallback(() => {
    if (demoRef.current?.active) {
      setExpired(true);
      adopt({
        ...demoRef.current,
        active: false,
        generation: null,
        expiresAt: null,
        csrfToken: '',
      });
    }
  }, [adopt]);
  const bootstrapRefresh = useCallback(() => {
    if (bootstrapOperation.current) return bootstrapOperation.current;
    const operation = (async () => {
      const started = epoch.current;
      try {
        const result = await request<Demo>('/api/demo');
        if (started !== epoch.current) return demoRef.current ?? result;
        if (demoRef.current?.active && !result.active) setExpired(true);
        setError(null);
        return adopt(result);
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    })().finally(() => {
      if (bootstrapOperation.current === operation)
        bootstrapOperation.current = null;
    });
    bootstrapOperation.current = operation;
    return operation;
  }, [adopt]);
  const refresh = useCallback(
    () => sessionOperation.current ?? bootstrapRefresh(),
    [bootstrapRefresh],
  );
  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);
  const foreground = useCallback(() => {
    void refresh().catch(() => {});
  }, [refresh]);
  useForeground(foreground);
  useEffect(() => {
    if (!demo?.active || !demo.expiresAt) return;
    const remaining = Date.parse(demo.expiresAt) - Date.now();
    if (remaining <= 0) {
      expire();
      return;
    }
    const timer = setTimeout(expire, remaining);
    return () => clearTimeout(timer);
  }, [demo, expire]);
  const read = useCallback(
    async <T,>(path: string, signal?: AbortSignal) => {
      const started = epoch.current;
      try {
        const result = await request<T>(path, {signal});
        if (started !== epoch.current)
          throw new ApiError(
            401,
            'obsolete_session',
            'This demo has ended. Start a fresh demo to continue.',
          );
        return result;
      } catch (e) {
        if (
          e instanceof ApiError &&
          e.status === 401 &&
          started === epoch.current
        )
          expire();
        throw e;
      }
    },
    [expire],
  );
  const write = useCallback(
    async <T,>(path: string, method: string, body?: unknown) => {
      const started = epoch.current;
      if (bootstrapOperation.current) await bootstrapOperation.current;
      let csrf = demoRef.current?.csrfToken;
      if (!csrf) csrf = (await bootstrapRefresh()).csrfToken;
      if (started !== epoch.current)
        throw new ApiError(
          401,
          'obsolete_session',
          'The demo changed. Please try again.',
        );
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await request<T>(path, {
            method,
            body: body ?? {},
            csrf,
          });
          if (started !== epoch.current)
            throw new ApiError(
              401,
              'obsolete_session',
              'This demo has ended. Start a fresh demo to continue.',
            );
          return result;
        } catch (e) {
          if (
            e instanceof ApiError &&
            e.status === 403 &&
            /csrf/i.test(e.code) &&
            attempt === 0
          ) {
            csrf = (await bootstrapRefresh()).csrfToken;
            if (started !== epoch.current)
              throw new ApiError(
                401,
                'obsolete_session',
                'This demo has ended. Start a fresh demo to continue.',
              );
            continue;
          }
          if (
            e instanceof ApiError &&
            e.status === 401 &&
            started === epoch.current
          )
            expire();
          throw e;
        }
      }
      throw new ApiError(403, 'csrf', 'Please reload Aura and try again.');
    },
    [bootstrapRefresh, expire],
  );
  const create = useCallback(() => {
    if (sessionOperation.current) return sessionOperation.current;
    const operation = (async () => {
      let timezone = 'UTC';
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch {
        /* The server also validates the UTC fallback. */
      }
      const started = epoch.current;
      await write<Demo>('/api/demo', 'POST', {timezone});
      const verified = await request<Demo>('/api/demo');
      if (started !== epoch.current)
        throw new ApiError(
          401,
          'obsolete_session',
          'The demo changed. Please try again.',
        );
      if (!verified.active)
        throw new ApiError(
          401,
          'cookies_unavailable',
          'Your browser could not keep this demo open. Open Aura directly to continue.',
        );
      return adopt(verified);
    })().finally(() => {
      if (sessionOperation.current === operation)
        sessionOperation.current = null;
    });
    sessionOperation.current = operation;
    return operation;
  }, [adopt, write]);
  const reset = useCallback(() => {
    if (sessionOperation.current) return sessionOperation.current;
    const previous = demoRef.current;
    if (!previous?.active || !previous.csrfToken)
      return Promise.reject(
        new ApiError(
          401,
          'expired',
          'This demo has ended. Start a fresh demo to continue.',
        ),
      );
    const operation = (async () => {
      const oldGeneration = previous.generation;
      const csrf = previous.csrfToken;
      invalidateGeneration();
      demoRef.current = {
        ...previous,
        active: false,
        generation: null,
        expiresAt: null,
        csrfToken: '',
      };
      setDemo(demoRef.current);
      setExpired(false);
      setError(null);
      const started = epoch.current;
      let resetCsrf = csrf;
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await request<Demo>('/api/demo/reset', {
              method: 'POST',
              body: {confirm: true},
              csrf: resetCsrf,
            });
            break;
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.status === 403 &&
              /csrf/i.test(error.code) &&
              attempt === 0
            ) {
              const bootstrap = await request<Demo>('/api/demo');
              if (!bootstrap.active || !bootstrap.csrfToken) throw error;
              resetCsrf = bootstrap.csrfToken;
              continue;
            }
            throw error;
          }
        }
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          (error.status !== 0 && error.status < 500)
        )
          throw error;
        // A reset response may have been lost after the server committed it. Verify
        // the cookie's current session once; never replay a reset against a revoked one.
      }
      const verified = await request<Demo>('/api/demo');
      if (started !== epoch.current)
        throw new ApiError(
          401,
          'obsolete_session',
          'The demo changed. Please try again.',
        );
      if (
        !verified.active ||
        !verified.generation ||
        verified.generation === oldGeneration
      )
        throw new ApiError(
          401,
          'cookies_unavailable',
          'Your browser could not keep this demo open. Open Aura directly to continue.',
        );
      return adopt(verified);
    })().finally(() => {
      if (sessionOperation.current === operation)
        sessionOperation.current = null;
    });
    sessionOperation.current = operation;
    return operation;
  }, [adopt, invalidateGeneration]);
  const value = useMemo(
    () => ({
      demo,
      loading,
      error,
      expired,
      draft,
      dispatch,
      refresh,
      create,
      reset,
      read,
      write,
      clearDraft,
      generation: demo?.generation ?? null,
    }),
    [
      demo,
      loading,
      error,
      expired,
      draft,
      refresh,
      create,
      reset,
      read,
      write,
      clearDraft,
    ],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
export function Providers({children}: {children: ReactNode}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {retry: false, staleTime: 15000, refetchOnWindowFocus: true},
          mutations: {retry: false},
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
