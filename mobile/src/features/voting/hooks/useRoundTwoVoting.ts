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

interface InFlightIntentR2 {
  requestId: string;
  intentId: string;
  roomId: string;
  round: 2;
  poolVersion: number;
  expectedVersion: number;
  votes: BallotVoteItem[];
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
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(() =>
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
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(WAITING_DEADLINE_SECONDS);
  const [activeDeadline, setActiveDeadline] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);
  const [serverCanHostEarlyFinish, setServerCanHostEarlyFinish] = useState(false);

  // Derived early finish permission (R8: no setState in effect)
  const canHostEarlyFinish = repository
    ? serverCanHostEarlyFinish
    : (isHost && isWaitingForMembers && isHostEarlyFinishAllowed(rosterAcknowledgedCount, totalRosterCount));

  // Server version & cap (F2)
  const [roomVersion, setRoomVersion] = useState(2);
  const [poolVersion, setPoolVersion] = useState(2);
  const [serverCap, setServerCap] = useState<number | null>(null);

  // R1: Stable callback references
  const onFinishRef = useRef(onFinish);
  const onGoToResultRef = useRef(onGoToResult);
  const onGoToNoConsensusRef = useRef(onGoToNoConsensus);

  useEffect(() => {
    onFinishRef.current = onFinish;
    onGoToResultRef.current = onGoToResult;
    onGoToNoConsensusRef.current = onGoToNoConsensus;
  }, [onFinish, onGoToResult, onGoToNoConsensus]);

  // R5: Guard against duplicate outcome navigation
  const navigatedOutcomeRef = useRef<string | null>(null);

  // R6: Clock skew calibration
  const clockSkewRef = useRef<number>(0);

  // R7: Durable in-flight ballot intent preserved across retries
  const inFlightIntentRef = useRef<InFlightIntentR2 | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const activeIntentIdRef = useRef<string | null>(null);

  const candidates = localCandidates.length > 0 ? localCandidates : (initialCandidates || []);
  const eliminationCap = serverCap ?? getRoundTwoEliminationCap(candidates.length);
  const removedCount = Object.values(choices).filter(c => c === 'REMOVE').length;
  const keptCount = candidates.length - removedCount;
  const allRemoved = candidates.length > 0 && removedCount === candidates.length;
  const isLocked = submissionState === 'pending' || submissionState === 'ack';

  // Helper to compute remaining seconds adjusted for server clock skew (R6)
  const computeRemainingFromDeadline = useCallback((deadlineStr: string | null | undefined): number | null => {
    if (!deadlineStr) return null;
    const deadlineMs = new Date(deadlineStr).getTime();
    if (isNaN(deadlineMs)) return null;
    const estimatedServerNow = Date.now() + clockSkewRef.current;
    return Math.max(0, Math.ceil((deadlineMs - estimatedServerNow) / 1000));
  }, []);

  // Central snapshot applicator (R1, R2, R4, R5, R6)
  const applySnapshot = useCallback((snap: any) => {
    setRoomVersion(snap.version);
    setPoolVersion(snap.poolVersion);
    if (typeof snap.submittedCount === 'number') {
      setRosterAcknowledgedCount(snap.submittedCount);
    }
    if (typeof snap.memberCount === 'number') {
      setTotalRosterCount(snap.memberCount);
    }
    setServerCanHostEarlyFinish(Boolean(snap.canEndWaiting));

    if (Array.isArray(snap.pool) && snap.pool.length > 0) {
      setLocalCandidates(mapSnapshotPoolToPoolDishes(snap.pool));
    }

    if (snap.removalCap != null) {
      setServerCap(snap.removalCap);
    }

    if (snap.canEndWaiting != null) {
      setIsHost(snap.canEndWaiting || (snap.hostUserId ? isHost : false));
    }

    // R6: Calibrate clock skew
    if (snap.serverTime) {
      const sTime = new Date(snap.serverTime).getTime();
      if (!isNaN(sTime)) {
        clockSkewRef.current = sTime - Date.now();
      }
    }

    // R6: Synchronize waiting deadline
    if (snap.deadline) {
      setActiveDeadline(snap.deadline);
      const remaining = computeRemainingFromDeadline(snap.deadline);
      if (remaining !== null) {
        setWaitingCountdown(remaining);
      }
    }

    // R4 & R5: Terminal states ALWAYS take precedence
    if (snap.state === 'DECIDED' && snap.result) {
      setIsWaitingForMembers(false);
      const finalRes = snap.result as unknown as RoomResult;
      setResult(finalRes);
      const outcomeKey = `DECIDED_${finalRes.resultId || 'done'}`;
      if (navigatedOutcomeRef.current !== outcomeKey) {
        navigatedOutcomeRef.current = outcomeKey;
        if (onGoToResultRef.current) {
          onGoToResultRef.current(finalRes);
        } else {
          onFinishRef.current?.(finalRes);
        }
      }
      return;
    }

    if (snap.state === 'NO_CONSENSUS' && snap.result) {
      setIsWaitingForMembers(false);
      const finalRes = snap.result as unknown as RoomResult;
      setResult(finalRes);
      const outcomeKey = `NO_CONSENSUS_${finalRes.resultId || 'done'}`;
      if (navigatedOutcomeRef.current !== outcomeKey) {
        navigatedOutcomeRef.current = outcomeKey;
        if (onGoToNoConsensusRef.current) {
          onGoToNoConsensusRef.current(finalRes);
        } else {
          onFinishRef.current?.(finalRes);
        }
      }
      return;
    }

    // R2: Caller ACK separation for Round 2
    const hasCompleteBallot = Array.isArray(snap.ownBallot)
      && snap.ownBallot.length > 0
      && Array.isArray(snap.pool)
      && snap.ownBallot.length === snap.pool.length
      && snap.ownBallot.every((b: any) => typeof b?.roundDishId === 'string' && typeof b?.choice === 'string');
    const callerSubmitted = Boolean(snap.ownWaiting || hasCompleteBallot);

    if (callerSubmitted) {
      setSubmissionState('ack');
      inFlightIntentRef.current = null;
      setIsWaitingForMembers(snap.state === 'WAITING_2');
      if (Array.isArray(snap.ownBallot) && snap.ownBallot.length > 0) {
        const restoredChoices: Record<string, FinalChoice> = {};
        for (const b of snap.ownBallot as any[]) {
          if (b.roundDishId && b.choice) {
            restoredChoices[b.roundDishId] = b.choice === 'REMOVE' ? 'REMOVE' : 'KEEP';
          }
        }
        setChoices(prev => ({ ...prev, ...restoredChoices }));
      }
    } else {
      // Caller has NOT submitted R2 yet! Keep idle & unlocked
      if (!inFlightIntentRef.current) {
        setSubmissionState(prev => (prev === 'ack' ? 'idle' : prev));
      }
      setIsWaitingForMembers(false);
    }
  }, [computeRemainingFromDeadline, isHost]);

  // Snapshot fetching method (R1: only depends on repository and roomId)
  const fetchSnapshot = useCallback(async () => {
    if (!repository) return;
    const res = await repository.getSnapshot(roomId);
    if (res.ok) {
      applySnapshot(res.data);
      setIsLoadingSnapshot(false);
      setSnapshotError(null);
    } else {
      setIsLoadingSnapshot(false);
      setSnapshotError(res.error.messageKey);
    }
  }, [repository, roomId, applySnapshot]);

  // Initial mount load (stable, runs once)
  useEffect(() => {
    if (!repository || (initialCandidates && initialCandidates.length > 0)) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await repository.getSnapshot(roomId);
      if (cancelled) return;
      if (res.ok) {
        applySnapshot(res.data);
        setIsLoadingSnapshot(false);
        setSnapshotError(null);
      } else {
        setIsLoadingSnapshot(false);
        setSnapshotError(res.error.messageKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, roomId, initialCandidates, applySnapshot]);

  // Countdown timer & polling in waiting state (F3, R6)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    if (submissionState === 'ack' && isWaitingForMembers) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => {
          if (activeDeadline) {
            const recomputed = computeRemainingFromDeadline(activeDeadline);
            if (recomputed !== null) {
              if (recomputed <= 0) {
                void fetchSnapshot();
                return 0;
              }
              return recomputed;
            }
          }
          if (prev === null) return null;
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
  }, [submissionState, isWaitingForMembers, repository, fetchSnapshot, activeDeadline, computeRemainingFromDeadline]);

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
    if (mockRes.matchTier === 'NO_CONSENSUS' || mockRes.reasonCode === 'ALL_REMOVED') {
      if (onGoToNoConsensusRef.current) {
        onGoToNoConsensusRef.current(mockRes);
      } else {
        onFinishRef.current?.(mockRes);
      }
    } else {
      if (onGoToResultRef.current) {
        onGoToResultRef.current(mockRes);
      } else {
        onFinishRef.current?.(mockRes);
      }
    }
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
          setActiveDeadline(waitRes.data.deadline);
          const remaining = computeRemainingFromDeadline(waitRes.data.deadline);
          if (remaining !== null) {
            setWaitingCountdown(remaining);
          }
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

    const ballotVotes: BallotVoteItem[] = candidates.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: choices[dish.roundDishId] === 'REMOVE' ? 'REMOVE' : 'KEEP',
    }));

    // R7: Reuse in-flight intent or construct a new durable one
    let intent = inFlightIntentRef.current;
    if (!intent || intent.roomId !== roomId) {
      let reqId = activeRequestIdRef.current;
      let intentId = activeIntentIdRef.current;
      if (!reqId || !intentId) {
        reqId = createDurableRequestId('vote_r2');
        intentId = `intent_${reqId}`;
        activeRequestIdRef.current = reqId;
        activeIntentIdRef.current = intentId;
      }
      intent = {
        requestId: reqId,
        intentId,
        roomId,
        round: 2,
        poolVersion,
        expectedVersion: roomVersion,
        votes: ballotVotes,
      };
      inFlightIntentRef.current = intent;
    }

    try {
      if (repository) {
        const res = await repository.submitBallot({
          roomId: intent.roomId,
          round: 2,
          poolVersion: intent.poolVersion,
          expectedVersion: intent.expectedVersion,
          votes: intent.votes,
          intentId: intent.intentId,
          requestId: intent.requestId,
        });
        setSubmitting(false);

        if (res.ok) {
          inFlightIntentRef.current = null;
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
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
              setActiveDeadline(waitRes.data.deadline);
              const remaining = computeRemainingFromDeadline(waitRes.data.deadline);
              if (remaining !== null) {
                setWaitingCountdown(remaining);
              }
            }
          } else {
            if (waitRes.error.messageKey === 'VERSION_CONFLICT') {
              void fetchSnapshot();
            } else {
              setWaitingError(`Không thể vào hàng chờ: ${waitRes.error.messageKey}`);
            }
          }
        } else {
          // Failure keeps inFlightIntentRef.current for identical retry
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else if (api) {
        const req = {
          roomId: intent.roomId,
          round: 2 as const,
          poolVersion: intent.poolVersion,
          intentId: intent.intentId,
          expectedVersion: intent.expectedVersion,
          votes: intent.votes,
          requestId: intent.requestId,
        };
        const res = await api.submitBallot(req);
        setSubmitting(false);

        if (res.ok) {
          inFlightIntentRef.current = null;
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            if (initialResult) {
              setResult(initialResult);
              if (initialResult.matchTier === 'NO_CONSENSUS' || initialResult.reasonCode === 'ALL_REMOVED') {
                if (onGoToNoConsensusRef.current) {
                  onGoToNoConsensusRef.current(initialResult);
                } else {
                  onFinishRef.current?.(initialResult);
                }
              } else {
                if (onGoToResultRef.current) {
                  onGoToResultRef.current(initialResult);
                } else {
                  onFinishRef.current?.(initialResult);
                }
              }
            } else if (allRemoved || res.state === 'NO_CONSENSUS') {
              setResult(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              if (onGoToNoConsensusRef.current) {
                onGoToNoConsensusRef.current(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              } else {
                onFinishRef.current?.(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              }
            } else {
              setResult(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              if (onGoToResultRef.current) {
                onGoToResultRef.current(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              } else {
                onFinishRef.current?.(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              }
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
          inFlightIntentRef.current = null;
          setSubmissionState('ack');
          setReceipt({
            round: 2,
            intentId: intent.intentId,
            requestId: intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
            votesSummary: intent.votes,
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
            if (mockOutcome.matchTier === 'NO_CONSENSUS' || mockOutcome.reasonCode === 'ALL_REMOVED') {
              if (onGoToNoConsensusRef.current) {
                onGoToNoConsensusRef.current(mockOutcome);
              } else {
                onFinishRef.current?.(mockOutcome);
              }
            } else {
              if (onGoToResultRef.current) {
                onGoToResultRef.current(mockOutcome);
              } else {
                onFinishRef.current?.(mockOutcome);
              }
            }
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
