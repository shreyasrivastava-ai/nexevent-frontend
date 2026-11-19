// src/hooks/useApi.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import api from '../utils/axiosConfig';

/* ═══════════════════════════════════════════════════════════════
 *  useFetch
 *  Declarative GET hook. Fires on mount and whenever `url`,
 *  `params`, or `enabled` changes. Aborts in-flight requests on
 *  unmount / input change so late responses can't clobber state.
 *
 *  Usage:
 *    const { data, loading, error, refetch } = useFetch('/events', {
 *      params: { mine: true },
 *      select: (d) => Array.isArray(d) ? d : d?.items ?? [],
 *    });
 * ═══════════════════════════════════════════════════════════════ */
export function useFetch(url, options = {}) {
  const {
    params,
    enabled = true,
    select,
    initialData = null,
  } = options;

  // Serialize params so callers can pass inline objects without triggering loops.
  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);

  // Always call the latest `select` — it's an inline arrow in most call sites
  // and we don't want its identity to drive refetches.
  const selectRef = useRef(select);
  selectRef.current = select;

  const [data, setData]           = useState(initialData);
  const [loading, setLoading]     = useState(Boolean(enabled && url));
  const [refetching, setRefetching] = useState(false);
  const [error, setError]         = useState(null);

  const abortRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const execute = useCallback(async () => {
    if (!enabled || !url) return;

    // Abort any in-flight request before starting a new one.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setError(null);
    if (hasFetchedRef.current) setRefetching(true);
    else setLoading(true);

    try {
      const res = await api.get(url, {
        params: JSON.parse(paramsKey),
        signal: ctrl.signal,
      });
      const raw = res.data;
      setData(selectRef.current ? selectRef.current(raw) : raw);
    } catch (err) {
      // Aborted requests are not errors — the caller moved on.
      if (axios.isCancel?.(err) || err?.name === 'CanceledError' || err?.name === 'AbortError') {
        return;
      }
      setError(err);
    } finally {
      if (abortRef.current === ctrl) {
        hasFetchedRef.current = true;
        setLoading(false);
        setRefetching(false);
      }
    }
  }, [url, paramsKey, enabled]);

  useEffect(() => {
    execute();
    return () => abortRef.current?.abort();
  }, [execute]);

  return { data, loading, refetching, error, refetch: execute };
}

/* ═══════════════════════════════════════════════════════════════
 *  useMutation
 *  Imperative write hook. Fires only when the caller invokes
 *  `mutate`. Re-throws the error so call sites can branch on
 *  HTTP status (409 = conflict, 404 = gone, etc).
 *
 *  Usage:
 *    const { mutate, loading } = useMutation(
 *      (payload) => api.post('/events', payload),
 *      { onSuccess: (data) => toast.success('Created!') }
 *    );
 *    await mutate(payload);
 * ═══════════════════════════════════════════════════════════════ */
export function useMutation(mutator, options = {}) {
  const { onSuccess, onError } = options;

  // Keep callbacks in refs so callers can pass inline arrows without
  // recreating `mutate` on every render.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef   = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current   = onError;

  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  const mutate = useCallback(async (variables) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutatorRef.current(variables);
      const payload = result?.data ?? result;
      setData(payload);
      onSuccessRef.current?.(payload, variables);
      return payload;
    } catch (err) {
      setError(err);
      onErrorRef.current?.(err, variables);
      throw err; // let callers try/catch for status-code branching
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { mutate, loading, error, data, reset };
}