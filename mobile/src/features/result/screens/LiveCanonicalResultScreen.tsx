import { useCallback, useEffect, useState } from 'react';
import type { RoomResult } from '../../../data/api/contracts';
import { isCanonicalRoomSnapshot, isCanonicalTerminalResult, isRoomSnapshot } from '../../../data/api/responseGuards';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { StatusNotice } from '../../../shared/ui';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { DishResultFlow } from './DishResultFlow';
import { validScoredResult, type ResultDish, type ResultInput, type ScoredResult } from '../services/resultPresentation';

type Props = {
  repository: RoomRepository;
  roomId: string;
  expectedResultId?: string;
  onHome: () => void;
  onNewSession: () => void;
};

export function LiveCanonicalResultScreen({ repository, roomId, expectedResultId, onHome, onNewSession }: Props) {
  const { colors } = useShellTheme();
  const [input, setInput] = useState<ResultInput | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [revision, setRevision] = useState(0);
  const load = useCallback(async () => {
    setState('loading');
    setInput(null);
    const response = await repository.getRoomSnapshot(roomId);
    if (!response.ok) { setState('error'); return; }
    const snapshot = response.data as unknown;
    if (!isCanonicalRoomSnapshot(snapshot) && !isRoomSnapshot(snapshot)) { setState('error'); return; }
    const raw = snapshot as unknown as Record<string, unknown>;
    const result = raw.result;
    if (!result || typeof result !== 'object') { setState('error'); return; }
    if (expectedResultId && (result as { resultId?: unknown }).resultId !== expectedResultId) { setState('error'); return; }
    if (isCanonicalTerminalResult(result)) {
      const scored = toScoredResult(result);
      if (!scored || !validScoredResult(scored)) { setState('error'); return; }
      setInput({ capability: 'scored-v4', result: scored });
      setState('ready');
      return;
    }
    if (raw.state === 'DECIDED' || raw.state === 'NO_CONSENSUS') {
      const legacy = result as RoomResult;
      setInput({ capability: 'legacy-unscored-v1', result: legacy });
      setState('ready');
      return;
    }
    setState('error');
  }, [expectedResultId, repository, roomId]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load, revision]);

  if (state === 'loading') return <StatusNotice title="Đang xác minh kết quả" message="Đang tải lại kết quả đã lưu từ máy chủ theo quyền phòng hiện tại." tone="info" colors={colors} />;
  if (state === 'error' || !input) return <StatusNotice title="Chưa thể mở kết quả" message="Tham chiếu đã cũ, phòng không còn khả dụng hoặc phản hồi chưa đúng hợp đồng. Hãy tải lại để xác minh với máy chủ." tone="error" actionLabel="Tải lại" onAction={() => setRevision(value => value + 1)} colors={colors} />;
  return <DishResultFlow
    input={input}
    readState="ready"
    isMock={false}
    celebrate={false}
    onHome={onHome}
    onNewSession={onNewSession}
    onRetryResult={() => setRevision(value => value + 1)}
  />;
}

function toScoredResult(raw: Record<string, unknown>): ScoredResult | null {
  const mapDish = (value: unknown): ResultDish | null => {
    if (typeof value !== 'object' || value === null) return null;
    const dish = value as Record<string, any>;
    if (typeof dish.dishId !== 'string' || typeof dish.roundDishId !== 'string' || typeof dish.name !== 'string') return null;
    const artwork = dish.artwork && typeof dish.artwork === 'object'
      ? { uri: dish.artwork.uri, altText: dish.artwork.altText, attribution: dish.artwork.attribution }
      : null;
    const priceReference = dish.priceReference && typeof dish.priceReference === 'object'
      ? {
          amount: dish.priceReference.amount,
          currency: dish.priceReference.currency,
          unit: dish.priceReference.unit,
          servingSize: dish.priceReference.servingSize,
          sourceRef: dish.priceReference.sourceRef,
          checkedAt: dish.priceReference.checkedAt,
        }
      : null;
    return { dishId: dish.dishId, roundDishId: dish.roundDishId, name: dish.name, description: dish.description, artwork, priceReference };
  };
  if (!Array.isArray(raw.topDishes)) return null;
  const topDishes = raw.topDishes.map(item => {
    const entry = item as Record<string, unknown>;
    return { dish: mapDish(entry.dish), score: entry.score, rank: entry.rank, isWinner: entry.isWinner };
  });
  if (topDishes.some(entry => !entry.dish)) return null;
  const winner = raw.winner === null ? null : mapDish(raw.winner);
  if (raw.winner !== null && !winner) return null;
  return {
    resultId: raw.resultId as string,
    contractVersion: raw.contractVersion as ScoredResult['contractVersion'],
    policyVersion: raw.policyVersion as ScoredResult['policyVersion'],
    status: raw.status as ScoredResult['status'],
    round: raw.round as ScoredResult['round'],
    winner,
    reasonCode: raw.reasonCode as ScoredResult['reasonCode'],
    finalizedAt: raw.finalizedAt as string,
    scoreVersion: raw.scoreVersion as ScoredResult['scoreVersion'],
    rankingVersion: raw.rankingVersion as ScoredResult['rankingVersion'],
    topDishes: topDishes as ScoredResult['topDishes'],
    round1BallotCount: raw.round1BallotCount as number,
  };
}
