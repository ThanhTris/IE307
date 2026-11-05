import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type RoomResult,
  type SubmissionReceipt,
} from '../../../data/api';
import {
  FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT,
  FIXTURE_ROUND_TWO_CANDIDATES,
  FIXTURE_ROUND_TWO_CONSENSUS_RESULT,
  WAITING_DEADLINE_SECONDS,
  getRoundTwoEliminationCap,
  isHostEarlyFinishAllowed,
  simulateDeferredRequest,
  type FinalScreenScenario,
} from '../fixtures';
import {
  createDurableRequestId,
  mapSnapshotPoolToPoolDishes,
  type VoteRepository,
} from '../services/voteRepository';

export type FinalChoice = 'KEEP' | 'REMOVE';

export interface UseRoundTwoVotingParams {
  candidates?: PoolDish[];
  roomId: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  repository?: VoteRepository;
  initialScenario?: FinalScreenScenario;
  initialResult?: RoomResult | null;
  simulateError?: boolean;
  simulateDelayMs?: number;
  enforceCap?: boolean;
  initialIsHost?: boolean;
  onFinish?: (result: RoomResult) => void;
  onGoToResult?: (result: RoomResult) => void;
  onGoToNoConsensus?: (result: RoomResult) => void;
}

export function useRoundTwoVoting({
  candidates: initialCandidates,
  roomId,
  initialChoices,
  api,
  repository,
  initialScenario = 'consensus',
  initialResult = null,
  simulateError = false,
  simulateDelayMs = 0,
  enforceCap = true,
  initialIsHost = true,
  onFinish,
  onGoToResult,
  onGoToNoConsensus,
}: UseRoundTwoVotingParams) {
  const [localCandidates, setLocalCandidates] = useState<PoolDish[]>(initialCandidates || []);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(
    Boolean(repository && (!initialCandidates || initialCandidates.length === 0))
  );
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [choices, setChoices] = useState<Record<string, FinalChoice>>(initialChoices || {});
  const [scenario, setScenario] = useState<FinalScreenScenario>(initialScenario);
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [result, setResult] = useState<RoomResult | null>(initialResult);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [isRetryingWaiting, setIsRetryingWaiting] = useState(false);
  const [capNotice, setCapNotice] = useState<string>('');

  // Waiting countdown & Host early finish state
  const [waitingCountdown, setWaitingCountdown] = useState(WAITING_DEADLINE_SECONDS);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);
  const [canHostEarlyFinish, setCanHostEarlyFinish] = useState(false);

  // Server version & cap (F2)
  const [roomVersion, setRoomVersion] = useState(2);
  const [poolVersion, setPoolVersion] = useState(2);
  const [serverCap, setServerCap] = useState<number | null>(null);

  // Durable request ID for retry (F6)
  const activeRequestIdRef = useRef<string | null>(null);
  const activeIntentIdRef = useRef<string | null>(null);

  const candidates = localCandidates.length > 0 ? localCandidates : (initialCandidates || []);
  const eliminationCap = serverCap ?? getRoundTwoEliminationCap(candidates.length);
  const removedCount = Object.values(choices).filter(c => c === 'REMOVE').length;
  const keptCount = candidates.length - removedCount;
  const allRemoved = candidates.length > 0 && removedCount === candidates.length;
  const isLocked = submissionState === 'pending' || submissionState === 'ack';

  // Snapshot fetching & synchronization (F2, F3, F5)
  const fetchSnapshot = useCallback(async () => {
    if (!repository) return;
    const res = await repository.getSnapshot(roomId);
    if (res.ok) {
      const snap = res.data;
      setRoomVersion(snap.version);
      setPoolVersion(snap.poolVersion);
      if (typeof snap.submittedCount === 'number') {
        setRosterAcknowledgedCount(snap.submittedCount);
      }
      if (typeof snap.memberCount === 'number') {
        setTotalRosterCount(snap.memberCount);
      }
      setCanHostEarlyFinish(Boolean(snap.canEndWaiting));

      if (snap.pool && snap.pool.length > 0) {
        setLocalCandidates(mapSnapshotPoolToPoolDishes(snap.pool));
      }

      if (snap.removalCap != null) {
        setServerCap(snap.removalCap);
      }

      if (snap.canEndWaiting != null) {
        setIsHost(snap.canEndWaiting || (snap.hostUserId ? isHost : false));
      }

      // Synchronize waiting deadline (F3)
      if (snap.deadline) {
        const remaining = Math.max(0, Math.ceil((new Date(snap.deadline).getTime() - Date.now()) / 1000));
        setWaitingCountdown(remaining);
      }

      // Synchronize outcome (F5)
      if (snap.state === 'DECIDED') {
        setIsWaitingForMembers(false);
        if (snap.result) {
          const finalRes = snap.result as unknown as RoomResult;
          setResult(finalRes);
          onGoToResult?.(finalRes);
          onFinish?.(finalRes);
        }
      } else if (snap.state === 'NO_CONSENSUS') {
        setIsWaitingForMembers(false);
        if (snap.result) {
          const finalRes = snap.result as unknown as RoomResult;
          setResult(finalRes);
          onGoToNoConsensus?.(finalRes);
          onFinish?.(finalRes);
        }
      } else if (snap.state === 'WAITING_2') {
        if (snap.ownWaiting || snap.ownBallot) {
          setSubmissionState('ack');
          setIsWaitingForMembers(true);
        }
      }
      setIsLoadingSnapshot(false);
      setSnapshotError(null);
    } else {
      setIsLoadingSnapshot(false);
      setSnapshotError(res.error.messageKey);
    }
  }, [repository, roomId, isHost, onGoToResult, onGoToNoConsensus, onFinish]);

  // Initial mount load
  useEffect(() => {
    if (repository && (!initialCandidates || initialCandidates.length === 0)) {
      void fetchSnapshot();
    } else {
      setIsLoadingSnapshot(false);
    }
  }, [repository, initialCandidates, fetchSnapshot]);

  // Update early finish capability if offline/mock
  useEffect(() => {
    if (!repository) {
      setCanHostEarlyFinish(isHost && isWaitingForMembers && isHostEarlyFinishAllowed(rosterAcknowledgedCount, totalRosterCount));
    }
  }, [isHost, isWaitingForMembers, rosterAcknowledgedCount, totalRosterCount, repository]);

  // Countdown timer & polling in waiting state (F3)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    if (submissionState === 'ack' && isWaitingForMembers) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => {
          if (prev <= 1) {
            void fetchSnapshot();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      if (repository) {
        pollTimer = setInterval(() => {
          void fetchSnapshot();
        }, 2500);
      }
    }

    return () => {
      if (timer) clearInterval(timer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [submissionState, isWaitingForMembers, repository, fetchSnapshot]);

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

  const handleSetAllKeep = () => {
    if (isLocked) return;
    const allKeep: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allKeep[dish.roundDishId] = 'KEEP';
    }
    setChoices(allKeep);
    setCapNotice('');
  };

  const handleHostEarlyFinish = async () => {
    if (!canHostEarlyFinish) return;

    if (repository) {
      const res = await repository.finalize({
        roomId,
        expectedVersion: roomVersion,
        rosterAcknowledgedCount,
        totalRosterCount,
        isHost,
      });
      if (res.ok) {
        setIsWaitingForMembers(false);
        void fetchSnapshot();
        return;
      } else {
        setErrorMessage(`Không thể kết thúc chờ: ${res.error.messageKey}`);
        return;
      }
    }

    // Mock mode fallback
    setIsWaitingForMembers(false);
    const mockRes = scenario === 'all_removed' ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT : FIXTURE_ROUND_TWO_CONSENSUS_RESULT;
    setResult(mockRes);
    onFinish?.(mockRes);
  };

  // Retry waiting if enterWaiting failed after ballot ACK (F4)
  const handleRetryWaiting = async () => {
    if (!repository || submissionState !== 'ack') return;
    setIsRetryingWaiting(true);
    setWaitingError(null);
    try {
      const waitRes = await repository.enterWaiting({
        roomId,
        round: 2,
        poolVersion,
        expectedVersion: roomVersion,
        requestId: createDurableRequestId('wait_retry_r2'),
      });
      setIsRetryingWaiting(false);
      if (waitRes.ok) {
        setIsWaitingForMembers(true);
        if (waitRes.data.deadline) {
          const remaining = Math.max(0, Math.ceil((new Date(waitRes.data.deadline).getTime() - Date.now()) / 1000));
          setWaitingCountdown(remaining);
        }
      } else {
        if (waitRes.error.messageKey === 'VERSION_CONFLICT') {
          void fetchSnapshot();
        } else {
          setWaitingError(`Không thể vào hàng chờ: ${waitRes.error.messageKey}`);
        }
      }
    } catch {
      setIsRetryingWaiting(false);
      setWaitingError('Lỗi kết nối khi vào hàng chờ. Vui lòng thử lại.');
    }
  };

  const handleSubmit = async (overrideScenario?: FinalScreenScenario) => {
    if (isLocked && typeof overrideScenario !== 'string') return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setConfirmModalVisible(false);
    setSubmitting(true);
    setSubmissionState('pending');
    setErrorMessage('');
    setCapNotice('');
    setWaitingError(null);

    // Reuse requestId across retries (F6)
    let reqId = activeRequestIdRef.current;
    let intentId = activeIntentIdRef.current;
    if (!reqId || !intentId) {
      reqId = createDurableRequestId('vote_r2');
      intentId = `intent_${reqId}`;
      activeRequestIdRef.current = reqId;
      activeIntentIdRef.current = intentId;
    }

    const ballotVotes: BallotVoteItem[] = candidates.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: choices[dish.roundDishId] === 'REMOVE' ? 'REMOVE' : 'KEEP',
    }));

    try {
      if (repository) {
        const res = await repository.submitBallot({
          roomId,
          round: 2,
          poolVersion,
          expectedVersion: roomVersion,
          votes: ballotVotes,
          intentId,
          requestId: reqId,
        });
        setSubmitting(false);

        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId,
            requestId: res.requestId ?? reqId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
          });

          // Check if server already transitioned on submit (F4, F5)
          if (res.data.allMembersSubmitted || res.state === 'DECIDED' || res.state === 'NO_CONSENSUS') {
            void fetchSnapshot();
            return;
          }

          // Enter waiting room (F4)
          const waitRes = await repository.enterWaiting({
            roomId,
            round: 2,
            poolVersion,
            expectedVersion: res.version ?? roomVersion,
            requestId: createDurableRequestId('wait_r2'),
          });

          if (waitRes.ok) {
            setIsWaitingForMembers(true);
            setResult(null);
            if (waitRes.data.deadline) {
              const remaining = Math.max(0, Math.ceil((new Date(waitRes.data.deadline).getTime() - Date.now()) / 1000));
              setWaitingCountdown(remaining);
            }
          } else {
            if (waitRes.error.messageKey === 'VERSION_CONFLICT') {
              void fetchSnapshot();
            } else {
              setWaitingError(`Không thể vào hàng chờ: ${waitRes.error.messageKey}`);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else if (api) {
        const req = {
          roomId,
          round: 2 as const,
          poolVersion,
          intentId,
          expectedVersion: roomVersion,
          votes: ballotVotes,
          requestId: reqId,
        };
        const res = await api.submitBallot(req);
        setSubmitting(false);

        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId,
            requestId: res.requestId ?? reqId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            if (initialResult) {
              setResult(initialResult);
              onFinish?.(initialResult);
            } else if (allRemoved || res.state === 'NO_CONSENSUS') {
              setResult(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              onFinish?.(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
            } else {
              setResult(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              onFinish?.(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || 'Lỗi gửi phiếu');
        }
      } else {
        // Pure mock fallback
        await simulateDeferredRequest(null, { delayMs: simulateDelayMs });
        setSubmitting(false);

        if (simulateError || activeScenario === 'error') {
          setSubmissionState('error');
          setErrorMessage('Mô phỏng lỗi kết nối máy chủ (Fixture Error). Vui lòng thử lại.');
        } else {
          setSubmissionState('ack');
          setReceipt({
            round: 2,
            intentId,
            requestId: reqId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
            votesSummary: ballotVotes,
          });

          if (activeScenario === 'waiting') {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            const mockOutcome = (allRemoved || activeScenario === 'all_removed')
              ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT
              : (initialResult || FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
            setResult(mockOutcome);
            onFinish?.(mockOutcome);
          }
        }
      }
    } catch {
      setSubmitting(false);
      setSubmissionState('error');
      setErrorMessage('Đã xảy ra lỗi không xác định khi nộp lựa chọn Vòng 2.');
    }
  };

  return {
    choices,
    scenario,
    setScenario,
    submitting,
    submissionState,
    errorMessage,
    confirmModalVisible,
    setConfirmModalVisible,
    receipt,
    result,
    isWaitingForMembers,
    waitingError,
    isRetryingWaiting,
    capNotice,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    setTotalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    eliminationCap,
    removedCount,
    keptCount,
    allRemoved,
    isLocked,
    candidates,
    isLoadingSnapshot,
    snapshotError,
    fetchSnapshot,
    handleToggleChoice,
    handleSetAllKeep,
    handleHostEarlyFinish,
    handleRetryWaiting,
    handleSubmit,
  };
}
