import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorCode, ReadResult, WriteResult } from '../../../data/api/contracts';
import { newPreviewRequestId } from '../services/roomEntry';

export function useRead<T>(load: () => Promise<ReadResult<T>>) {
  const [attempt, setAttempt] = useState(0);
  type State = { loading: boolean; data?: T; error?: ErrorCode; receivedAt?: number };
  const [resultState, setState] = useState<State & { source: typeof load; attempt: number }>();
  // Hide the previous response immediately when the input/attempt changes.
  const state: State = resultState?.source === load && resultState.attempt === attempt ? resultState : { loading: true };
  useEffect(() => {
    let current = true;
    void load().then(result => {
      if (current) setState(result.ok ? { source: load, attempt, loading: false, data: result.data, receivedAt: Date.now() } : { source: load, attempt, loading: false, error: result.error.messageKey });
    }).catch(() => { if (current) setState({ source: load, attempt, loading: false, error: 'NETWORK_ERROR' }); });
    return () => { current = false; };
  }, [load, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}

export function useRoomSubmission<T>(onSuccess: (data: T) => void) {
  const [busy, setBusy] = useState(false);
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
    if (previous.current?.key !== key) previous.current = { key, requestId: newPreviewRequestId() };
    try {
      const result = await submit(previous.current.requestId);
      if (!mounted.current) return;
      if (result.ok) onSuccess(result.data);
      else setError(result.error.messageKey);
    } catch {
      if (mounted.current) setError('NETWORK_ERROR');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [onSuccess]);
  const clearError = () => setError(undefined);
  return { busy, error, run, clearError, uncertain: error === 'NETWORK_ERROR' || error === 'TIMEOUT' };
}
