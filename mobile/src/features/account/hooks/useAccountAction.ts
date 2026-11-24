import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import type { ApiError, ReadResult } from '../../../data/api/contracts';

export function useAccountAction() {
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<ApiError>();
  const inFlight = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => inFlight.current);
    return () => listener.remove();
  }, []);

  async function run<T>(label: string, work: () => Promise<ReadResult<T>>, onSuccess?: (data: T) => void, onError?: (error: ApiError) => void) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(label);
    setError(undefined);
    try {
      let result: ReadResult<T>;
      try { result = await work(); }
      catch { result = { ok: false, error: { messageKey: 'UNKNOWN_ERROR' } }; }
      if (!mounted.current) return;
      if (result.ok) onSuccess?.(result.data);
      else {
        setError(result.error);
        onError?.(result.error);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(undefined);
    }
  }

  return { pending, error, clearError: () => setError(undefined), run };
}
