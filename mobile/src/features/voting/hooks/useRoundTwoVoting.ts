import { useEffect, useState } from 'react';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type RoomResult,
  type SubmissionReceipt,
} from '../../../data/api';
import {
  FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT,
  FIXTURE_ROUND_TWO_CONSENSUS_RESULT,
  WAITING_DEADLINE_SECONDS,
  getRoundTwoEliminationCap,
  isHostEarlyFinishAllowed,
  simulateDeferredRequest,
  type FinalScreenScenario,
} from '../fixtures';
import type { VoteRepository } from '../services/voteRepository';

export type FinalChoice = 'KEEP' | 'REMOVE';

export interface UseRoundTwoVotingParams {
  candidates: PoolDish[];
  roomId: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  repository?: VoteRepository;
  initialScenario: FinalScreenScenario;
  initialResult: RoomResult | null;
  simulateError: boolean;
  simulateDelayMs: number;
  initialIsHost?: boolean;
  enforceCap?: boolean;
}

export function useRoundTwoVoting({
  candidates,
  roomId,
  initialChoices,
  api,
  repository,
  initialScenario,
  initialResult,
  simulateError,
  simulateDelayMs,
  initialIsHost = true,
  enforceCap = true,
}: UseRoundTwoVotingParams) {
  const [choices, setChoices] = useState<Record<string, FinalChoice>>(() => {
    if (initialChoices) return initialChoices;
    const initial: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      initial[dish.roundDishId] = 'KEEP';
    }
    return initial;
  });

  const [scenario, setScenario] = useState<FinalScreenScenario>(initialScenario);
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [capNotice, setCapNotice] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [result, setResult] = useState<RoomResult | null>(initialResult);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);

  // Waiting countdown & Host control state
  const [waitingCountdown, setWaitingCountdown] = useState(WAITING_DEADLINE_SECONDS);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);

  const eliminationCap = getRoundTwoEliminationCap(candidates.length);
  const keptCount = candidates.filter(dish => choices[dish.roundDishId] === 'KEEP').length;
  const removedCount = candidates.filter(dish => choices[dish.roundDishId] === 'REMOVE').length;
  const allRemoved = candidates.length > 0 && removedCount === candidates.length;
  const isLocked = submitting || submissionState === 'pending' || submissionState === 'ack';

  // Countdown timer in waiting state
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (submissionState === 'ack' && isWaitingForMembers && waitingCountdown > 0) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [submissionState, isWaitingForMembers, waitingCountdown]);

  /**
   * Toggles choice between KEEP and REMOVE with cap enforcement:
   * cap = max(1, floor(0.30 * N)).
   * If already at cap, prevents selecting more REMOVE items and shows a notice.
   */
  const handleToggleChoice = (dishId: string, choice: FinalChoice) => {
    if (isLocked) return;

    if (choice === 'REMOVE' && enforceCap) {
      const currentDishChoice = choices[dishId];
      if (currentDishChoice !== 'REMOVE' && removedCount >= eliminationCap) {
        setCapNotice(
          `Bạn chỉ được loại tối đa ${eliminationCap} món ở Vòng 2 (Quy tắc Cap 30% theo ADR-019). Vui lòng đổi món đã loại thành "Giữ" trước khi loại thêm.`
        );
        return;
      }
    }

    setCapNotice('');
    setChoices(prev => ({
      ...prev,
      [dishId]: choice,
    }));
  };

  /**
   * Quick action: resets all items to KEEP and clears any cap notice.
   */
  const handleSetAllKeep = () => {
    if (isLocked) return;
    const allKeep: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allKeep[dish.roundDishId] = 'KEEP';
    }
    setChoices(allKeep);
    setCapNotice('');
  };

  const canHostEarlyFinish = isHost && isWaitingForMembers && isHostEarlyFinishAllowed(rosterAcknowledgedCount, totalRosterCount);

  const handleHostEarlyFinish = async () => {
    if (!canHostEarlyFinish) return;

    if (repository) {
      const res = await repository.finalize({
        roomId,
        expectedVersion: 2,
        rosterAcknowledgedCount,
        totalRosterCount,
        isHost,
      });
      if (res.ok) {
        setIsWaitingForMembers(false);
        if (res.data.state === 'NO_CONSENSUS' || allRemoved) {
          setResult(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
        } else {
          setResult(initialResult || FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
        }
        return;
      } else {
        setErrorMessage(`Không thể kết thúc chờ: ${res.error.messageKey}`);
        return;
      }
    }

    setIsWaitingForMembers(false);
    setResult(scenario === 'all_removed' ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT : FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
  };

  const handleSubmit = async (overrideScenario?: FinalScreenScenario) => {
    if (isLocked && typeof overrideScenario !== 'string') return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setConfirmModalVisible(false);
    setSubmitting(true);
    setSubmissionState('pending');
    setErrorMessage('');
    setCapNotice('');
    setWaitingCountdown(WAITING_DEADLINE_SECONDS);

    const votes: BallotVoteItem[] = candidates.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: choices[dish.roundDishId] === 'REMOVE' ? 'REMOVE' : 'KEEP',
    }));

    const req = {
      roomId,
      round: 2 as const,
      poolVersion: 2,
      intentId: `intent_r2_${Date.now()}`,
      expectedVersion: 2,
      votes,
      requestId: `req_r2_${Date.now()}`,
    };

    try {
      if (repository) {
        const res = await repository.submitBallot({
          roomId,
          round: 2,
          poolVersion: 2,
          expectedVersion: 2,
          votes,
          intentId: req.intentId,
          requestId: req.requestId,
        });
        setSubmitting(false);

        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId: req.intentId,
            requestId: res.requestId ?? req.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: votes.length,
          });

          await repository.enterWaiting({
            roomId,
            round: 2,
            poolVersion: 2,
            expectedVersion: res.version ?? 2,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            if (initialResult) {
              setResult(initialResult);
            } else if (allRemoved || res.state === 'NO_CONSENSUS') {
              setResult(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
            } else {
              setResult(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else if (api) {
        const res = await api.submitBallot(req);
        setSubmitting(false);

        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId: req.intentId,
            requestId: res.requestId ?? req.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: votes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            if (initialResult) {
              setResult(initialResult);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else {
        const shouldFail = simulateError ? true : activeScenario === 'error';
        const isWaitingScenario = activeScenario === 'waiting';
        const mockResultData = await simulateDeferredRequest(
          {
            accepted: true,
            round: 2 as const,
            allMembersSubmitted: !isWaitingScenario,
            roomVersion: 3,
            requestId: req.requestId,
            receipt: {
              round: 2 as const,
              intentId: req.intentId,
              requestId: req.requestId,
              submittedAt: new Date().toISOString(),
              voteCount: votes.length,
            },
            result:
              activeScenario === 'all_removed' || allRemoved
                ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT
                : activeScenario === 'consensus'
                ? FIXTURE_ROUND_TWO_CONSENSUS_RESULT
                : null,
          },
          {
            delayMs: simulateDelayMs,
            shouldFail,
            errorMessage: 'Mô phỏng lỗi kết nối máy chủ (Fixture Error). Vui lòng thử lại.',
          }
        );

        setSubmitting(false);
        setSubmissionState('ack');
        setReceipt(mockResultData.receipt);

        if (mockResultData.allMembersSubmitted === false) {
          setIsWaitingForMembers(true);
          setResult(null);
        } else {
          setIsWaitingForMembers(false);
          setResult(initialResult || mockResultData.result);
        }
      }
    } catch (err: unknown) {
      setSubmitting(false);
      setSubmissionState('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi gửi phiếu Vòng 2.'
      );
    }
  };

  return {
    choices,
    scenario,
    setScenario,
    submitting,
    submissionState,
    confirmModalVisible,
    setConfirmModalVisible,
    errorMessage,
    capNotice,
    receipt,
    result,
    isWaitingForMembers,
    eliminationCap,
    keptCount,
    removedCount,
    allRemoved,
    isLocked,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    handleHostEarlyFinish,
    handleToggleChoice,
    handleSetAllKeep,
    handleSubmit,
  };
}
