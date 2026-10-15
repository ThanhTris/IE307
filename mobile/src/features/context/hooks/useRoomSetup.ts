import { useEffect, useRef, useState } from 'react';
import type { DiscoveryContextResponse, RoomSnapshot, WriteResult } from '../../../data/api/contracts';
import type { RequestIdFactory, RoomSetupRepository } from '../services/roomSetup';

export type RoomSetupData = { room: RoomSnapshot; discovery: DiscoveryContextResponse; loadedAt: number };
export function useRoomSetup(repository: RoomSetupRepository, roomId: string) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ repository: RoomSetupRepository; roomId: string; revision: number; value?: RoomSetupData; error?: string }>();
  useEffect(() => {
    let current = true;
    void Promise.all([repository.getRoomSnapshot(roomId), repository.getDiscoveryContext()]).then(([room, discovery]) => {
      if (!current) return;
      const base = { repository, roomId, revision };
      if (!room.ok) setResult({ ...base, error: room.error.messageKey });
      else if (!discovery.ok) setResult({ ...base, error: discovery.error.messageKey });
      else setResult({ ...base, value: { room: room.data, discovery: discovery.data, loadedAt: Date.now() } });
    }).catch(() => { if (current) setResult({ repository, roomId, revision, error: 'NETWORK_ERROR' }); });
    return () => { current = false; };
  }, [repository, roomId, revision]);
  const current = result?.repository === repository && result?.roomId === roomId && result?.revision === revision;
  return { value: current ? result.value : undefined, loading: !current, error: current ? result.error : undefined, reload: () => setRevision(v => v + 1) };
}

let previewSequence = 0;
const previewRequestId = () => `gm10-preview-${Date.now().toString(16)}-${++previewSequence}`;

// Default IDs belong to the mock preview. Integration injects its durable request ID factory.
export function useSetupIntent<T extends object>(createRequestId: RequestIdFactory = previewRequestId) {
  const [state, setState] = useState<'idle' | 'pending' | 'uncertain' | 'accepted' | 'error'>('idle');
  const [error, setError] = useState<string>();
  const intent = useRef<(T & { requestId: string }) | undefined>(undefined);
  const busy = useRef(false);
  const accepted = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(body: T, send: (request: T & { requestId: string }) => Promise<WriteResult<void>>) {
    if (busy.current || accepted.current) return;
    busy.current = true;
    intent.current ??= { ...JSON.parse(JSON.stringify(body)), requestId: createRequestId() };
    setState('pending'); setError(undefined);
    let result: WriteResult<void>;
    try { result = await send(intent.current!); }
    catch { result = { ok: false, error: { messageKey: 'NETWORK_ERROR' } }; }
    busy.current = false;
    if (!alive.current) return;
    if (result.ok) { accepted.current = true; setState('accepted'); }
    else {
      setError(result.error.messageKey);
      const uncertain = result.error.messageKey === 'TIMEOUT' || result.error.messageKey === 'NETWORK_ERROR';
      setState(uncertain ? 'uncertain' : 'error');
      if (!uncertain) intent.current = undefined;
    }
    return result;
  }
  function clear() { if (busy.current || accepted.current || state === 'uncertain') return; intent.current = undefined; setError(undefined); setState('idle'); }
  return { submit, clear, state, error, pending: state === 'pending', uncertain: state === 'uncertain', accepted: state === 'accepted', locked: state === 'pending' || state === 'uncertain' || state === 'accepted' };
}
