import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type RoomResult,
  type SubmissionReceipt,
} from '../../../data/api';
import type { VoteValue } from '../../../shared/ui';
import {
  FIXTURE_ROUND_TWO_CANDIDATES,
  WAITING_DEADLINE_SECONDS,
  isHostEarlyFinishAllowed,
  simulateDeferredRequest,
  type VoteScreenScenario,
} from '../fixtures';
import {
  createDurableRequestId,
  mapSnapshotPoolToPoolDishes,
  type VoteRepository,
} from '../services/voteRepository';

export interface UseRoundOneVotingParams {
  pool?: PoolDish[];
  roomId: string;
  initialVotes?: Record<string, VoteValue>;
  api?: ApiClient;
  repository?: VoteRepository;
  initialScenario?: VoteScreenScenario;
  simulateError?: boolean;
  simulateDelayMs?: number;
  initialIsHost?: boolean;
  initialViewMode?: 'flashcard' | 'list';
  onRoundTwo?: (survivorCandidates: PoolDish[]) => void;
  onGoToResult?: (result: RoomResult) => void;
  onGoToNoConsensus?: (result: RoomResult) => void;
}

interface InFlightIntentR1 {
  requestId: string;
  intentId: string;
  roomId: string;
  round: 1;
  poolVersion: number;
  expectedVersion: number;
  votes: BallotVoteItem[];
}

export function useRoundOneVoting({
  pool: initialPool,
  roomId,
  initialVotes,
  api,
  repository,
  initialScenario = 'round_two',
  simulateError = false,
  simulateDelayMs = 0,
  initialIsHost = true,
  initialViewMode = 'list',
  onRoundTwo,
  onGoToResult,
  onGoToNoConsensus,
}: UseRoundOneVotingParams) {
  const [localPool, setLocalPool] = useState<PoolDish[]>(initialPool || []);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(() =>
    Boolean(repository && (!initialPool || initialPool.length === 0))
  );
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes || {});
  const [scenario, setScenario] = useState<VoteScreenScenario>(initialScenario);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [isRetryingWaiting, setIsRetryingWaiting] = useState(false);
  const [needsRoundTwo, setNeedsRoundTwo] = useState(false);
  const [roundTwoCandidates, setRoundTwoCandidates] = useState<PoolDish[]>(FIXTURE_ROUND_TWO_CANDIDATES);
  const [lastActionNotice, setLastActionNotice] = useState<string>('');

  // Flashcard specific state
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'flashcard' | 'list'>(initialViewMode);

  // Waiting countdown & Host control state
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(WAITING_DEADLINE_SECONDS);
  const [activeDeadline, setActiveDeadline] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);
  const [serverCanHostEarlyFinish, setServerCanHostEarlyFinish] = useState(false);

  // Derived early finish permission (R8: no setState inside useEffect)
  const canHostEarlyFinish = repository
    ? serverCanHostEarlyFinish
    : (isHost && isWaitingForMembers && isHostEarlyFinishAllowed(rosterAcknowledgedCount, totalRosterCount));

  // Room & Pool version from server snapshot (F2)
  const [roomVersion, setRoomVersion] = useState(1);
  const [poolVersion, setPoolVersion] = useState(1);

  // R1: Stable callback references
  const onRoundTwoRef = useRef(onRoundTwo);
  const onGoToResultRef = useRef(onGoToResult);
  const onGoToNoConsensusRef = useRef(onGoToNoConsensus);

  useEffect(() => {
    onRoundTwoRef.current = onRoundTwo;
    onGoToResultRef.current = onGoToResult;
    onGoToNoConsensusRef.current = onGoToNoConsensus;
  }, [onRoundTwo, onGoToResult, onGoToNoConsensus]);

  // Navigation guards (prevent repeated navigation on every 2.5s poll)
  const hasNavigatedRoundTwoRef = useRef(false);
  const navigatedOutcomeRef = useRef<string | null>(null);

  // R6: Clock skew offset: serverTime - Date.now()
  const clockSkewRef = useRef<number>(0);

  // R7: Durable in-flight ballot intent preserved across retries
  const inFlightIntentRef = useRef<InFlightIntentR1 | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const activeIntentIdRef = useRef<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});

  const pool = localPool.length > 0 ? localPool : (initialPool || []);
  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;
  const allVoted = pool.length > 0 && votedCount === pool.length;
  const isLocked = submissionState === 'pending' || submissionState === 'ack';
  const canUndo = activeCardIndex > 0 && !isLocked;

  // Helper to compute remaining seconds adjusted for server clock skew (R6)
  const computeRemainingFromDeadline = useCallback((deadlineStr: string | null | undefined): number | null => {
    if (!deadlineStr) return null;
    const deadlineMs = new Date(deadlineStr).getTime();
    if (isNaN(deadlineMs)) return null;
    const estimatedServerNow = Date.now() + clockSkewRef.current;
    return Math.max(0, Math.ceil((deadlineMs - estimatedServerNow) / 1000));
  }, []);

  // Central snapshot applicator (R1, R2, R4, R6)
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
      setLocalPool(mapSnapshotPoolToPoolDishes(snap.pool));
    }

    if (snap.canEndWaiting != null) {
      setIsHost(snap.canEndWaiting || (snap.hostUserId ? isHost : false));
    }

    // R6: Calibrate server clock skew
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

    // R4: 1. Terminal states ALWAYS take precedence over round numbers
    if (snap.state === 'DECIDED' && snap.result) {
      setIsWaitingForMembers(false);
      setNeedsRoundTwo(false);
      const finalRes = snap.result as unknown as RoomResult;
      if (navigatedOutcomeRef.current !== finalRes.resultId) {
        navigatedOutcomeRef.current = finalRes.resultId;
        onGoToResultRef.current?.(finalRes);
      }
      return;
    }
    if (snap.state === 'NO_CONSENSUS' && snap.result) {
      setIsWaitingForMembers(false);
      setNeedsRoundTwo(false);
      const finalRes = snap.result as unknown as RoomResult;
      if (navigatedOutcomeRef.current !== finalRes.resultId) {
        navigatedOutcomeRef.current = finalRes.resultId;
        onGoToNoConsensusRef.current?.(finalRes);
      }
      return;
    }

    // R4: 2. Active Round 2 states
    if (snap.state === 'ROUND_2' || snap.state === 'WAITING_2') {
      setIsWaitingForMembers(snap.state === 'WAITING_2');
      setNeedsRoundTwo(true);
      const survivors = mapSnapshotPoolToPoolDishes(snap.pool);
      setRoundTwoCandidates(survivors);
      if (!hasNavigatedRoundTwoRef.current) {
        hasNavigatedRoundTwoRef.current = true;
        onRoundTwoRef.current?.(survivors);
      }
      return;
    }

    // R2: 3. Caller ACK separation
    const hasCompleteBallot = Array.isArray(snap.ownBallot)
      && snap.ownBallot.length > 0
      && Array.isArray(snap.pool)
      && snap.ownBallot.length === snap.pool.length
      && snap.ownBallot.every((b: any) => typeof b?.roundDishId === 'string' && typeof b?.choice === 'string');
    const callerSubmitted = Boolean(snap.ownWaiting || hasCompleteBallot);

    if (callerSubmitted) {
      setSubmissionState('ack');
      inFlightIntentRef.current = null;
      setIsWaitingForMembers(snap.state === 'WAITING_1');
      if (Array.isArray(snap.ownBallot) && snap.ownBallot.length > 0) {
        const restoredVotes: Record<string, VoteValue> = {};
        for (const b of snap.ownBallot as any[]) {
          if (b.roundDishId && b.choice) {
            restoredVotes[b.roundDishId] = b.choice as VoteValue;
          }
        }
        setVotes(prev => ({ ...prev, ...restoredVotes }));
      }
    } else {
      // Caller has NOT submitted! Keep idle & unlocked so they can vote before deadline
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

  // R1 & R8: Initial mount load (stable, runs once, cleanup guard)
  useEffect(() => {
    if (!repository || (initialPool && initialPool.length > 0)) {
      return;
    }
    let cancelled = false;
    const init = async () => {
      const res = await repository.getSnapshot(roomId);
      if (cancelled) return;
      if (res.ok) {
        applySnapshot(res.data);
        setIsLoadingSnapshot(false);
        setSnapshotError(null);
      } else {
        setSnapshotError(res.error.messageKey);
        setIsLoadingSnapshot(false);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [repository, roomId, initialPool, applySnapshot]);

  // R3 & R6: Countdown timer & polling in waiting state
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    if (activeDeadline) {
      const tick = () => {
        const rem = computeRemainingFromDeadline(activeDeadline);
        if (rem !== null) {
          setWaitingCountdown(rem);
          if (rem <= 0) {
            void fetchSnapshot();
          }
        }
      };
      tick();
      timer = setInterval(tick, 1000);
    } else if (isWaitingForMembers && !repository) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => (prev != null && prev <= 1 ? 0 : (prev ?? WAITING_DEADLINE_SECONDS) - 1));
      }, 1000);
    }

    if (repository && (isWaitingForMembers || activeDeadline)) {
      pollTimer = setInterval(() => {
        void fetchSnapshot();
      }, 2500);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeDeadline, isWaitingForMembers, repository, fetchSnapshot, computeRemainingFromDeadline]);

  const handleSetWant = (dishId: string) => {
    if (isLocked) return;
    setVotes(prev => ({ ...prev, [dishId]: 'WANT' }));
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Double-tap: Đã đặt WANT (Muốn ăn) cho ${dish?.name || dishId} (chưa gửi)`);
  };

  const handleVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    setVotes(prev => {
      if (prev[dishId] === vote) {
        const next = { ...prev };
        delete next[dishId];
        return next;
      }
      return { ...prev, [dishId]: vote };
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã chọn ${vote} cho ${dish?.name || dishId} (chưa gửi)`);
  };

  const handleQuickFill = (preset: 'all_ok' | 'all_want' | 'random') => {
    if (isLocked) return;
    const next: Record<string, VoteValue> = {};
    for (const dish of pool) {
      if (preset === 'all_ok') next[dish.roundDishId] = 'OK';
      else if (preset === 'all_want') next[dish.roundDishId] = 'WANT';
      else {
        const rand = Math.random();
        next[dish.roundDishId] = rand > 0.6 ? 'WANT' : rand > 0.25 ? 'OK' : 'NO';
      }
    }
    setVotes(next);
    setLastActionNotice(`Đã điền nhanh: ${preset === 'all_ok' ? 'Tất cả OK' : preset === 'all_want' ? 'Tất cả WANT' : 'Ngẫu nhiên'}`);
  };

  const handleCardVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    handleVote(dishId, vote);
    if (activeCardIndex < pool.length - 1) {
      setActiveCardIndex(prev => prev + 1);
    }
  };

  const handleCardDoubleTap = (dishId: string) => {
    if (isLocked) return;
    const now = Date.now();
    const lastTap = lastTapRef.current[dishId] || 0;
    if (now - lastTap < 350) {
      handleSetWant(dishId);
      if (activeCardIndex < pool.length - 1) {
        setActiveCardIndex(prev => prev + 1);
      }
      lastTapRef.current[dishId] = 0;
    } else {
      lastTapRef.current[dishId] = now;
    }
  };

  const handleFlashcardVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    handleVote(dishId, vote);
    if (activeCardIndex < pool.length - 1) {
      setActiveCardIndex(prev => prev + 1);
    }
  };

  const handleCardPress = (dishId: string) => {
    if (isLocked) return;
    const now = Date.now();
    const last = lastTapRef.current[dishId] ?? 0;
    if (now - last < 350) {
      handleSetWant(dishId);
      lastTapRef.current[dishId] = 0;
    } else {
      lastTapRef.current[dishId] = now;
    }
  };

  const handleClearVote = (dishId: string) => {
    if (isLocked) return;
    setVotes(prev => {
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã hoàn tác phiếu của ${dish?.name || dishId} về UNSET`);
  };

  const handleUndoCard = () => {
    if (!canUndo) return;
    const prevIndex = activeCardIndex - 1;
    setActiveCardIndex(prevIndex);
    const prevDish = pool[prevIndex];
    if (prevDish) {
      setLastActionNotice(`Đã quay lại thẻ trước: ${prevDish.name}`);
    }
  };

  const handleNextCard = () => {
    if (activeCardIndex < pool.length - 1) {
      setActiveCardIndex(prev => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (activeCardIndex > 0) {
      setActiveCardIndex(prev => prev - 1);
    }
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
        if (res.data.outcome === 'ROUND_ADVANCED' || res.data.state === 'ROUND_2') {
          setNeedsRoundTwo(true);
          void fetchSnapshot();
        } else if (res.data.outcome === 'TERMINAL') {
          void fetchSnapshot();
        }
        return;
      } else {
        setErrorMessage(`Không thể kết thúc chờ: ${res.error.messageKey}`);
        return;
      }
    }

    // Mock mode fallback
    setIsWaitingForMembers(false);
    setNeedsRoundTwo(true);
    setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
    setLastActionNotice(`Host đã kết thúc chờ sớm (${rosterAcknowledgedCount}/${totalRosterCount} thành viên đã ACK). Server đã chuyển vòng!`);
  };

  // Retry waiting if enterWaiting failed after ballot ACK (F4, R6)
  const handleRetryWaiting = async () => {
    if (!repository || submissionState !== 'ack') return;
    setIsRetryingWaiting(true);
    setWaitingError(null);
    try {
      const waitRes = await repository.enterWaiting({
        roomId,
        round: 1,
        poolVersion,
        expectedVersion: roomVersion,
        requestId: createDurableRequestId('wait_retry_r1'),
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

  const handleSubmit = async (overrideScenario?: VoteScreenScenario) => {
    if (!allVoted || (isLocked && typeof overrideScenario !== 'string')) return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setSubmissionState('pending');
    setErrorMessage('');
    setWaitingError(null);

    // R7: Capture or reuse in-flight intent across retries
    let intent = inFlightIntentRef.current;
    if (!intent) {
      const reqId = activeRequestIdRef.current || createDurableRequestId('vote_r1');
      const intentId = activeIntentIdRef.current || `intent_${reqId}`;
      activeRequestIdRef.current = reqId;
      activeIntentIdRef.current = intentId;

      const ballotVotes: BallotVoteItem[] = pool.map(dish => ({
        roundDishId: dish.roundDishId,
        vote: votes[dish.roundDishId]!,
      }));

      intent = {
        requestId: reqId,
        intentId,
        roomId,
        round: 1,
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
          round: intent.round,
          poolVersion: intent.poolVersion,
          expectedVersion: intent.expectedVersion,
          votes: intent.votes,
          intentId: intent.intentId,
          requestId: intent.requestId,
        });

        if (res.ok) {
          setSubmissionState('ack');
          inFlightIntentRef.current = null;
          setReceipt(res.data.receipt ?? {
            round: 1,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          });

          // If room already advanced on submit (last member) (F4)
          if (res.data.allMembersSubmitted || res.state === 'ROUND_2' || res.state === 'DECIDED' || res.state === 'NO_CONSENSUS') {
            void fetchSnapshot();
            return;
          }

          // Enter waiting room (F4, R6)
          const waitRes = await repository.enterWaiting({
            roomId,
            round: 1,
            poolVersion,
            expectedVersion: res.version ?? roomVersion,
            requestId: createDurableRequestId('wait_r1'),
          });

          if (waitRes.ok) {
            setIsWaitingForMembers(true);
            setNeedsRoundTwo(false);
            if (waitRes.data.deadline) {
              setActiveDeadline(waitRes.data.deadline);
              const remaining = computeRemainingFromDeadline(waitRes.data.deadline);
              if (remaining !== null) {
                setWaitingCountdown(remaining);
              }
            }
          } else {
            // F4: Do NOT mark waiting as successful if it failed; keep ballot ACK and show waiting retry
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
          roomId: intent.roomId,
          round: 1 as const,
          poolVersion: intent.poolVersion,
          intentId: intent.intentId,
          expectedVersion: intent.expectedVersion,
          votes: intent.votes,
          requestId: intent.requestId,
        };
        const res = await api.submitBallot(req);
        if (res.ok) {
          setSubmissionState('ack');
          inFlightIntentRef.current = null;
          setReceipt(res.data.receipt ?? {
            round: 1,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setNeedsRoundTwo(false);
          } else {
            setIsWaitingForMembers(false);
            if (res.data.round === 2 || res.state === 'ROUND_2') {
              setNeedsRoundTwo(true);
              setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
              onRoundTwoRef.current?.(FIXTURE_ROUND_TWO_CANDIDATES);
            } else {
              setNeedsRoundTwo(false);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || 'Lỗi gửi phiếu');
        }
      } else {
        // Pure mock fallback
        await simulateDeferredRequest(null, { delayMs: simulateDelayMs });
        if (simulateError || activeScenario === 'error') {
          setSubmissionState('error');
          setErrorMessage('Không thể gửi phiếu: Lỗi kết nối mạng (Giả lập)');
        } else {
          setSubmissionState('ack');
          inFlightIntentRef.current = null;
          setReceipt({
            round: 1,
            intentId: intent.intentId,
            requestId: intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
            votesSummary: intent.votes,
          });

          if (activeScenario === 'waiting') {
            setIsWaitingForMembers(true);
            setNeedsRoundTwo(false);
          } else if (activeScenario === 'round_two') {
            setIsWaitingForMembers(false);
            setNeedsRoundTwo(true);
            setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
          } else {
            setIsWaitingForMembers(false);
            setNeedsRoundTwo(false);
          }
        }
      }
    } catch {
      setSubmissionState('error');
      setErrorMessage('Đã xảy ra lỗi không xác định khi gửi phiếu.');
    }
  };

  return {
    votes,
    scenario,
    setScenario,
    submissionState,
    errorMessage,
    receipt,
    isWaitingForMembers,
    waitingError,
    isRetryingWaiting,
    needsRoundTwo,
    roundTwoCandidates,
    activeCardIndex,
    viewMode,
    setViewMode,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    setTotalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    lastActionNotice,
    isLoadingSnapshot,
    snapshotError,
    pool,
    allVoted,
    isLocked,
    canUndo,
    fetchSnapshot,
    handleHostEarlyFinish,
    handleRetryWaiting,
    handleVote,
    handleCardVote,
    handleCardDoubleTap,
    handleFlashcardVote,
    handleCardPress,
    handleClearVote,
    handleUndoCard,
    handleNextCard,
    handlePrevCard,
    handleQuickFill,
    handleSubmit,
  };
}
