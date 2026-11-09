import { useCallback, useEffect, useState } from 'react';
import type { RoomSnapshot } from '../../../data/api/contracts';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { DishResultFlow } from '../../result/screens/DishResultFlow';
import type { ResultInput, ResultReadState } from '../../result/services/resultPresentation';
import { callSessionApi } from '../../shared/services/sessionApi';

type Props = { roomId?: string; resultId?: string; onHome: () => void; onNewSession: () => void };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GM-28 read-only destination for pre-v4 result notifications.
 * It uses the authorized legacy snapshot RPC and the shared result presentation;
 * it never calls the canonical dish_session result endpoint.
 */
export function LegacyInboxResultScreen({ roomId, resultId, onHome, onNewSession }: Props) {
  const { repository } = useRoomRepository();
  const [input, setInput] = useState<ResultInput | null>(null);
  const [readState, setReadState] = useState<ResultReadState>('loading');
  const [retry, setRetry] = useState(0);

  const readResult = useCallback(async (): Promise<{ input: ResultInput | null; state: ResultReadState }> => {
    if (!roomId || !UUID.test(roomId) || !resultId || !UUID.test(resultId)) return { input: null, state: 'error' };

    const snapshot = await callSessionApi(repository, client => client.getRoomSnapshot(roomId));
    if (!snapshot.ok) return { input: null, state: snapshot.error.messageKey === 'NOT_READY' ? 'finalizing' : 'error' };

    const raw = snapshot.data as RoomSnapshot;
    const result = raw.result;
    const terminalState = raw.state === 'DECIDED' || raw.state === 'NO_CONSENSUS'
      || raw.state === 'FINALIZED' || raw.state === 'COMPLETED';
    if (raw.roomId !== roomId || !terminalState || !result || result.roomId !== roomId
      || result.resultId !== resultId || result.policyVersion !== 'decision-v2'
      || result.matchTier === undefined) return { input: null, state: 'error' };

    return { input: { capability: 'legacy-unscored-v1', result }, state: 'ready' };
  }, [repository, roomId, resultId]);

  useEffect(() => {
    let active = true;
    void readResult().then(outcome => {
      if (!active) return;
      setInput(outcome.input);
      setReadState(outcome.state);
    }).catch(() => {
      if (!active) return;
      setInput(null);
      setReadState('error');
    });
    return () => { active = false; };
  }, [readResult, retry]);

  const retryResult = () => {
    setReadState('loading');
    setInput(null);
    setRetry(value => value + 1);
  };

  return <DishResultFlow
    input={input}
    readState={readState}
    isMock={false}
    celebrate={false}
    onHome={onHome}
    onNewSession={onNewSession}
    onRetryResult={retryResult}
  />;
}
