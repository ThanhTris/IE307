import { useState } from 'react';
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
  simulateDeferredRequest,
  type FinalScreenScenario,
} from '../fixtures';

export type FinalChoice = 'KEEP' | 'REMOVE';

export interface UseRoundTwoVotingParams {
  candidates: PoolDish[];
  roomId: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  initialScenario: FinalScreenScenario;
  initialResult: RoomResult | null;
  simulateError: boolean;
  simulateDelayMs: number;
}

export function useRoundTwoVoting({
  candidates,
  roomId,
  initialChoices,
  api,
  initialScenario,
  initialResult,
  simulateError,
  simulateDelayMs,
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
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [result, setResult] = useState<RoomResult | null>(initialResult);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);

  const keptCount = candidates.filter(dish => choices[dish.roundDishId] === 'KEEP').length;
  const removedCount = candidates.filter(dish => choices[dish.roundDishId] === 'REMOVE').length;
  const allRemoved = candidates.length > 0 && removedCount === candidates.length;
  const isLocked = submitting || submissionState === 'pending' || submissionState === 'ack';

  const handleToggleChoice = (dishId: string, choice: FinalChoice) => {
    if (isLocked) return;
    setChoices(prev => ({ ...prev, [dishId]: choice }));
  };

  const handleSetAllKeep = () => {
    if (isLocked) return;
    const allKeep: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allKeep[dish.roundDishId] = 'KEEP';
    }
    setChoices(allKeep);
  };

  const handleSetAllRemove = () => {
    if (isLocked) return;
    const allRemove: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allRemove[dish.roundDishId] = 'REMOVE';
    }
    setChoices(allRemove);
  };

  const handleSubmit = async (overrideScenario?: FinalScreenScenario) => {
    if (isLocked && typeof overrideScenario !== 'string') return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setConfirmModalVisible(false);
    setSubmitting(true);
    setSubmissionState('pending');
    setErrorMessage('');

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
      if (api) {
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
        const mockResultData = await simulateDeferredRequest(
          {
            accepted: true,
            round: 2 as const,
            allMembersSubmitted: activeScenario !== 'waiting',
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
    } catch (err) {
      setSubmitting(false);
      setSubmissionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi gửi phiếu');
    }
  };

  return {
    choices,
    scenario,
    setScenario,
    submissionState,
    confirmModalVisible,
    setConfirmModalVisible,
    errorMessage,
    receipt,
    result,
    isWaitingForMembers,
    keptCount,
    removedCount,
    allRemoved,
    isLocked,
    handleToggleChoice,
    handleSetAllKeep,
    handleSetAllRemove,
    handleSubmit,
  };
}
