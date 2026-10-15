import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorCode, ReadResult, WriteResult } from '../../../data/api/contracts';
import { newPreviewRequestId, type RequestIdFactory } from '../services/roomEntry';

export function useRead<T>(load: () => Promise<ReadResult<T>>, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  type State = { loading: boolean; data?: T; error?: ErrorCode; receivedAt?: number };
  const [resultState, setState] = useState<State & { source: typeof load; attempt: number }>();
  // Hide the previous response immediately when the input/attempt changes.
  const state: State = !enabled ? { loading: false } : resultState?.source === load && resultState.attempt === attempt ? resultState : { loading: true };
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void load().then(result => {
      if (current) setState(result.ok ? { source: load, attempt, loading: false, data: result.data, receivedAt: Date.now() } : { source: load, attempt, loading: false, error: result.error.messageKey });
    }).catch(() => { if (current) setState({ source: load, attempt, loading: false, error: 'NETWORK_ERROR' }); });
    return () => { current = false; };
  }, [load, attempt, enabled]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}

export function useRoomSubmission<T>(onSuccess: (data: T) => void, createRequestId: RequestIdFactory = newPreviewRequestId) {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<ErrorCode>();
  const locked = useRef(false);
  const mounted = useRef(false);
  const previous = useRef<{ key: string; requestId: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (key: string, submit: (requestId: string) => Promise<WriteResult<T>>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(undefined);
    if (previous.current?.key !== key) previous.current = { key, requestId: createRequestId() };
    let result: WriteResult<T>;
    try {
      result = await submit(previous.current.requestId);
    } catch {
      locked.current = false;
      if (mounted.current) { setError('NETWORK_ERROR'); setBusy(false); }
      return;
    }
    if (!mounted.current) { locked.current = false; return; }
    setBusy(false);
    if (result.ok) {
      // Keep the successful intent locked even if navigation has not unmounted us yet.
      setAccepted(true);
      onSuccess(result.data);
    } else {
      locked.current = false;
      setError(result.error.messageKey);
    }
  }, [onSuccess, createRequestId]);
  const clearError = () => setError(undefined);
  return { busy, accepted, error, run, clearError, uncertain: error === 'NETWORK_ERROR' || error === 'TIMEOUT' };
}
