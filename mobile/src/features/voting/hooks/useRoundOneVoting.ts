import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import {
  clearBallotIntent,
  clearVoteDraft,
  getBallotIntent,
  getSubmissionReceipt,
  getVoteDraft,
  getWaitingRequestId,
  resetWaitingRequestId,
  saveBallotIntent,
  saveSubmissionReceipt,
  saveVoteDraft,
  SnapshotReadOrder,
  type VoteContextToken,
  type VoteScope,
} from '../services/voteSessionState';

export interface UseRoundOneVotingParams {
  pool?: PoolDish[];
  roomId: string;
  identityId?: string;
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
  identityId: string;
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
  identityId = 'anonymous',
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
  const initialScope: VoteScope = { identityId, roomId, round: 1, poolVersion: 1 };
  const [localPool, setLocalPool] = useState<PoolDish[]>(initialPool || []);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(() =>
    Boolean(repository && (!initialPool || initialPool.length === 0))
  );
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [votes, setVotes] = useState<Record<string, VoteValue>>(() =>
    initialVotes ?? (getVoteDraft(initialScope) as Record<string, VoteValue> | null) ?? {}
  );
  const votesRef = useRef(votes);
  const [scenario, setScenario] = useState<VoteScreenScenario>(initialScenario);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>(() =>
    getSubmissionReceipt(initialScope) ? 'ack' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(() => getSubmissionReceipt(initialScope));
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [isRetryingWaiting, setIsRetryingWaiting] = useState(false);
  const [needsWaitingTransition, setNeedsWaitingTransition] = useState(false);
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
  const lastTapRef = useRef<Record<string, number>>({});
  const lastAppliedScopeRef = useRef(JSON.stringify([identityId, roomId, 1, 1]));
  const contextKey = JSON.stringify([identityId, roomId]);
  const activeContextRef = useRef(contextKey);
  const contextGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const snapshotOrderRef = useRef(new SnapshotReadOrder());
  const autoWaitingAttemptsRef = useRef(new Set<string>());
  const activeScope = useCallback((poolVersionForScope = poolVersion): VoteScope => ({
    identityId,
    roomId,
    round: 1,
    poolVersion: poolVersionForScope,
  }), [identityId, roomId, poolVersion]);
  const replaceVotes = useCallback((next: Record<string, VoteValue>) => {
    votesRef.current = next;
    setVotes(next);
    saveVoteDraft(activeScope(), next);
  }, [activeScope]);

  const captureContext = useCallback((): VoteContextToken => ({
    key: contextKey,
    generation: contextGenerationRef.current,
  }), [contextKey]);
  const isCurrentContext = useCallback((token: VoteContextToken) => mountedRef.current
    && activeContextRef.current === token.key
    && contextGenerationRef.current === token.generation, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useLayoutEffect(() => {
    if (activeContextRef.current !== contextKey) {
      activeContextRef.current = contextKey;
      contextGenerationRef.current += 1;
    }
    snapshotOrderRef.current.activate(contextKey);
  }, [contextKey]);

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
    const snapshotScope: VoteScope = { identityId, roomId, round: 1, poolVersion: snap.poolVersion };
    const scopeKey = JSON.stringify([identityId, roomId, 1, snap.poolVersion]);
    const scopeChanged = lastAppliedScopeRef.current !== null && lastAppliedScopeRef.current !== scopeKey;
    lastAppliedScopeRef.current = scopeKey;
    const storedReceipt = getSubmissionReceipt(snapshotScope);
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
    setActiveDeadline(snap.deadline ?? null);
    if (snap.deadline) {
      const remaining = computeRemainingFromDeadline(snap.deadline);
      if (remaining !== null) {
        setWaitingCountdown(remaining);
      }
    } else if (!String(snap.state).startsWith('WAITING_')) {
      setWaitingCountdown(null);
    }

    // R4: 1. Terminal states ALWAYS take precedence over round numbers
    if (snap.state === 'DECIDED' && snap.result) {
      setIsWaitingForMembers(false);
      setNeedsWaitingTransition(false);
      clearBallotIntent({ identityId, roomId, round: 1, poolVersion: snap.poolVersion });
      clearVoteDraft(snapshotScope);
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
      setNeedsWaitingTransition(false);
      clearBallotIntent({ identityId, roomId, round: 1, poolVersion: snap.poolVersion });
      clearVoteDraft(snapshotScope);
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
      setNeedsWaitingTransition(false);
      clearBallotIntent({ identityId, roomId, round: 1, poolVersion: snap.poolVersion });
      clearVoteDraft(snapshotScope);
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
      if (storedReceipt) setReceipt(storedReceipt);
      setIsWaitingForMembers(snap.state === 'WAITING_1');
      setNeedsWaitingTransition((snap.state === 'ROUND_1' || snap.state === 'WAITING_1') && !snap.ownWaiting && hasCompleteBallot);
      if (hasCompleteBallot) {
        clearBallotIntent({ identityId, roomId, round: 1, poolVersion: snap.poolVersion });
        clearVoteDraft(snapshotScope);
      }
      if (Array.isArray(snap.ownBallot) && snap.ownBallot.length > 0) {
        const restoredVotes: Record<string, VoteValue> = {};
        for (const b of snap.ownBallot as any[]) {
          if (b.roundDishId && b.choice) {
            restoredVotes[b.roundDishId] = b.choice as VoteValue;
          }
        }
        votesRef.current = restoredVotes;
        setVotes(restoredVotes);
      }
    } else {
      // Caller has NOT submitted! Keep idle & unlocked so they can vote before deadline
      const pendingIntent = getBallotIntent(snapshotScope) as InFlightIntentR1 | null;
      if (pendingIntent) {
        setNeedsWaitingTransition(false);
        const restoredVotes = Object.fromEntries(pendingIntent.votes.map(item => [item.roundDishId, item.vote])) as Record<string, VoteValue>;
        votesRef.current = restoredVotes;
        setVotes(restoredVotes);
        setSubmissionState('error');
        setErrorMessage('Chưa xác nhận được lần gửi trước. Có thể thử gửi lại đúng yêu cầu đã tạo.');
      } else if (scopeChanged) {
        const scopedDraft = getVoteDraft(snapshotScope);
        const nextVotes = (scopedDraft as Record<string, VoteValue> | null) ?? {};
        votesRef.current = nextVotes;
        setVotes(nextVotes);
        setSubmissionState(storedReceipt ? 'ack' : 'idle');
        setReceipt(storedReceipt);
        setErrorMessage('');
        setNeedsWaitingTransition(Boolean(storedReceipt) && (snap.state === 'ROUND_1' || snap.state === 'WAITING_1') && !snap.ownWaiting);
      } else {
        if (storedReceipt) {
          setReceipt(storedReceipt);
          setSubmissionState('ack');
          setNeedsWaitingTransition((snap.state === 'ROUND_1' || snap.state === 'WAITING_1') && !snap.ownWaiting);
        } else {
          setNeedsWaitingTransition(false);
        }
      }
      setIsWaitingForMembers(false);
    }
  }, [computeRemainingFromDeadline, identityId, isHost, roomId]);

  // Snapshot fetching method (R1: only depends on repository and roomId)
  const fetchSnapshot = useCallback(async () => {
    if (!repository) return null;
    const requestedContext = captureContext();
    const ticket = snapshotOrderRef.current.begin(requestedContext.key);
    const res = await repository.getSnapshot(roomId);
    if (!isCurrentContext(requestedContext)) return null;
    if (res.ok) {
      if (!snapshotOrderRef.current.accepts(ticket, res.data)) return null;
      applySnapshot(res.data);
      setIsLoadingSnapshot(false);
      setSnapshotError(null);
      return res.data;
    } else {
      if (snapshotOrderRef.current.isLatest(ticket)) {
        setIsLoadingSnapshot(false);
        setSnapshotError(res.error.messageKey);
      }
      return null;
    }
  }, [repository, roomId, applySnapshot, captureContext, isCurrentContext]);

  // R1 & R8: Initial mount load (stable, runs once, cleanup guard)
  useEffect(() => {
    if (!repository || (initialPool && initialPool.length > 0)) {
      return;
    }
    void fetchSnapshot();
  }, [repository, roomId, initialPool, fetchSnapshot]);

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

  const attemptEnterWaiting = useCallback(async (allowConflictRetry = true) => {
    if (!repository) return;
    const requestedContext = captureContext();
    const scope = activeScope();
    setIsRetryingWaiting(true);
    setWaitingError(null);

    const send = async (expectedVersion: number, mayRetryConflict: boolean): Promise<void> => {
      const requestId = getWaitingRequestId(scope, () => createDurableRequestId('wait_r1'));
      try {
        const waitRes = await repository.enterWaiting({
          roomId,
          round: 1,
          poolVersion: scope.poolVersion,
          expectedVersion,
          requestId,
        });
        if (!isCurrentContext(requestedContext)) return;
        if (waitRes.ok) {
          resetWaitingRequestId(scope);
          setNeedsWaitingTransition(false);
          setIsWaitingForMembers(true);
          if (waitRes.data.deadline) {
            setActiveDeadline(waitRes.data.deadline);
            const remaining = computeRemainingFromDeadline(waitRes.data.deadline);
            if (remaining !== null) setWaitingCountdown(remaining);
          }
          void fetchSnapshot();
          return;
        }
        if (waitRes.error.messageKey === 'VERSION_CONFLICT' && mayRetryConflict) {
          const fresh = await fetchSnapshot();
          if (!isCurrentContext(requestedContext)) return;
          const hasAcceptedBallot = Boolean(fresh
            && (fresh.state === 'ROUND_1' || fresh.state === 'WAITING_1')
            && fresh.poolVersion === scope.poolVersion
            && !fresh.ownWaiting
            && Array.isArray(fresh.ownBallot)
            && fresh.ownBallot.length === fresh.pool.length
            && fresh.ownBallot.length > 0);
          if (fresh && hasAcceptedBallot) {
            resetWaitingRequestId(scope);
            await send(fresh.version, false);
            return;
          }
          if (!fresh) setWaitingError('Không thể xác nhận trạng thái phòng. Tải lại rồi thử vào hàng chờ.');
          else if ((fresh.state === 'ROUND_1' || fresh.state === 'WAITING_1') && fresh.poolVersion === scope.poolVersion && !fresh.ownWaiting) {
            setWaitingError('Snapshot chưa xác nhận đủ phiếu đã ACK. Hãy tải lại trạng thái rồi thử tiếp; không cần gửi lại phiếu.');
          }
          return;
        }
        setWaitingError(`Không thể vào hàng chờ: ${waitRes.error.messageKey}`);
      } catch {
        if (isCurrentContext(requestedContext)) {
          setWaitingError('Lỗi kết nối khi vào hàng chờ. Vui lòng thử lại.');
        }
      }
    };

    try {
      await send(roomVersion, allowConflictRetry);
    } finally {
      if (isCurrentContext(requestedContext)) setIsRetryingWaiting(false);
    }
  }, [repository, activeScope, roomId, roomVersion, fetchSnapshot, computeRemainingFromDeadline, captureContext, isCurrentContext]);

  useEffect(() => {
    if (!repository || !needsWaitingTransition) return;
    const attemptKey = `${contextKey}:${poolVersion}:R1`;
    if (autoWaitingAttemptsRef.current.has(attemptKey)) return;
    autoWaitingAttemptsRef.current.add(attemptKey);
    void attemptEnterWaiting();
  }, [repository, needsWaitingTransition, contextKey, poolVersion, attemptEnterWaiting]);

  const handleSetWant = (dishId: string) => {
    if (isLocked) return;
    const next = { ...votesRef.current, [dishId]: 'WANT' as const };
    replaceVotes(next);
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Double-tap: Đã đặt WANT (Muốn ăn) cho ${dish?.name || dishId} (chưa gửi)`);
  };

  const handleVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    const next = { ...votesRef.current };
    if (next[dishId] === vote) delete next[dishId];
    else next[dishId] = vote;
    replaceVotes(next);
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
    replaceVotes(next);
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
    const next = { ...votesRef.current };
    delete next[dishId];
    replaceVotes(next);
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
    const requestedContext = captureContext();

    if (repository) {
      const res = await repository.finalize({
        roomId,
        expectedVersion: roomVersion,
        rosterAcknowledgedCount,
        totalRosterCount,
        isHost,
      });
      if (!isCurrentContext(requestedContext)) return;

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
    if (submissionState !== 'ack') return;
    await attemptEnterWaiting();
  };

  const handleSubmit = async (overrideScenario?: VoteScreenScenario) => {
    if (!allVoted || (isLocked && typeof overrideScenario !== 'string')) return;
    const requestedContext = captureContext();
    const scope = activeScope();

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setSubmissionState('pending');
    setErrorMessage('');
    setWaitingError(null);

    // R7: Capture or reuse in-flight intent across retries
    let intent = getBallotIntent(scope) as InFlightIntentR1 | null;
    if (!intent) {
      const reqId = createDurableRequestId('vote_r1');
      const intentId = `intent_${reqId}`;

      const ballotVotes: BallotVoteItem[] = pool.map(dish => ({
        roundDishId: dish.roundDishId,
        vote: votes[dish.roundDishId]!,
      }));

      intent = {
        identityId,
        requestId: reqId,
        intentId,
        roomId,
        round: 1,
        poolVersion,
        expectedVersion: roomVersion,
        votes: ballotVotes,
      };
      saveBallotIntent(intent);
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

        if (!isCurrentContext(requestedContext)) return;

        if (res.ok) {
          clearBallotIntent(scope);
          clearVoteDraft(scope);
          setSubmissionState('ack');
          const acknowledgedReceipt = res.data.receipt ?? {
            round: 1,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          };
          saveSubmissionReceipt(scope, acknowledgedReceipt);
          setReceipt(acknowledgedReceipt);

          // If room already advanced on submit (last member) (F4)
          if (res.data.allMembersSubmitted || res.state === 'ROUND_2' || res.state === 'DECIDED' || res.state === 'NO_CONSENSUS') {
            void fetchSnapshot();
            return;
          }
          // A successful ballot and entering the result wait are separate acknowledged steps.
          setNeedsWaitingTransition(true);
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
        if (!isCurrentContext(requestedContext)) return;
        if (res.ok) {
          clearBallotIntent(scope);
          clearVoteDraft(scope);
          setSubmissionState('ack');
          const acknowledgedReceipt = res.data.receipt ?? {
            round: 1,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          };
          saveSubmissionReceipt(scope, acknowledgedReceipt);
          setReceipt(acknowledgedReceipt);

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
        if (!isCurrentContext(requestedContext)) return;
        if (simulateError || activeScenario === 'error') {
          setSubmissionState('error');
          setErrorMessage('Không thể gửi phiếu: Lỗi kết nối mạng (Giả lập)');
        } else {
          setSubmissionState('ack');
          clearBallotIntent(scope);
          clearVoteDraft(scope);
          const acknowledgedReceipt: SubmissionReceipt = {
            round: 1,
            intentId: intent.intentId,
            requestId: intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
            votesSummary: intent.votes,
          };
          saveSubmissionReceipt(scope, acknowledgedReceipt);
          setReceipt(acknowledgedReceipt);

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
      if (!isCurrentContext(requestedContext)) return;
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
    needsWaitingTransition,
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
