import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type RoomResult,
  type RoomSnapshot,
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
  onRoundTwo?: (survivorCandidates?: PoolDish[]) => void;
  onGoToResult?: (result: RoomResult) => void;
  onGoToNoConsensus?: (result: RoomResult) => void;
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
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(
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
  const [waitingCountdown, setWaitingCountdown] = useState(WAITING_DEADLINE_SECONDS);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);
  const [canHostEarlyFinish, setCanHostEarlyFinish] = useState(false);

  // Room & Pool version from server snapshot (F2)
  const [roomVersion, setRoomVersion] = useState(1);
  const [poolVersion, setPoolVersion] = useState(1);

  // Durable request & intent ID references across retries (F6)
  const activeRequestIdRef = useRef<string | null>(null);
  const activeIntentIdRef = useRef<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});

  const pool = localPool.length > 0 ? localPool : (initialPool || []);
  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;
  const allVoted = pool.length > 0 && votedCount === pool.length;
  const isLocked = submissionState === 'pending' || submissionState === 'ack';
  const canUndo = activeCardIndex > 0 && !isLocked;

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
        setLocalPool(mapSnapshotPoolToPoolDishes(snap.pool));
      }

      if (snap.canEndWaiting != null) {
        setIsHost(snap.canEndWaiting || (snap.hostUserId ? isHost : false));
      }

      // Synchronize waiting deadline (F3)
      if (snap.deadline) {
        const remaining = Math.max(0, Math.ceil((new Date(snap.deadline).getTime() - Date.now()) / 1000));
        setWaitingCountdown(remaining);
      }

      // Synchronize transitions (F3, F5)
      if (snap.state === 'ROUND_2' || snap.round === 2) {
        setIsWaitingForMembers(false);
        setNeedsRoundTwo(true);
        const survivors = mapSnapshotPoolToPoolDishes(snap.pool);
        setRoundTwoCandidates(survivors);
        onRoundTwo?.(survivors);
      } else if (snap.state === 'DECIDED') {
        setIsWaitingForMembers(false);
        if (snap.result) {
          onGoToResult?.(snap.result as unknown as RoomResult);
        }
      } else if (snap.state === 'NO_CONSENSUS') {
        setIsWaitingForMembers(false);
        if (snap.result) {
          onGoToNoConsensus?.(snap.result as unknown as RoomResult);
        }
      } else if (snap.state === 'WAITING_1') {
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
  }, [repository, roomId, isHost, onRoundTwo, onGoToResult, onGoToNoConsensus]);

  // Initial load
  useEffect(() => {
    if (repository && (!initialPool || initialPool.length === 0)) {
      void fetchSnapshot();
    } else {
      setIsLoadingSnapshot(false);
    }
  }, [repository, initialPool, fetchSnapshot]);

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
            // Deadline reached: poll snapshot immediately
            void fetchSnapshot();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Periodically poll snapshot to receive updates from other clients or transitions
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

  /**
   * Flashcard vote handler: sets the vote and automatically advances to the next card if not at end.
   */
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

  // Retry waiting if enterWaiting failed after ballot ACK (F4)
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

  const handleSubmit = async (overrideScenario?: VoteScreenScenario) => {
    if (!allVoted || (isLocked && typeof overrideScenario !== 'string')) return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setSubmissionState('pending');
    setErrorMessage('');
    setWaitingError(null);

    // Reuse activeRequestId and activeIntentId across retries unless votes changed (F6)
    let reqId = activeRequestIdRef.current;
    let intentId = activeIntentIdRef.current;
    if (!reqId || !intentId) {
      reqId = createDurableRequestId('vote_r1');
      intentId = `intent_${reqId}`;
      activeRequestIdRef.current = reqId;
      activeIntentIdRef.current = intentId;
    }

    const ballotVotes: BallotVoteItem[] = pool.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: votes[dish.roundDishId]!,
    }));

    try {
      if (repository) {
        const res = await repository.submitBallot({
          roomId,
          round: 1,
          poolVersion,
          expectedVersion: roomVersion,
          votes: ballotVotes,
          intentId,
          requestId: reqId,
        });

        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 1,
            intentId,
            requestId: res.requestId ?? reqId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
          });

          // If room already advanced on submit (last member) (F4)
          if (res.data.allMembersSubmitted || res.state === 'ROUND_2' || res.state === 'DECIDED' || res.state === 'NO_CONSENSUS') {
            void fetchSnapshot();
            return;
          }

          // Enter waiting room (F4)
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
              const remaining = Math.max(0, Math.ceil((new Date(waitRes.data.deadline).getTime() - Date.now()) / 1000));
              setWaitingCountdown(remaining);
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
          roomId,
          round: 1 as const,
          poolVersion,
          intentId,
          expectedVersion: roomVersion,
          votes: ballotVotes,
          requestId: reqId,
        };
        const res = await api.submitBallot(req);
        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 1,
            intentId,
            requestId: res.requestId ?? reqId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setNeedsRoundTwo(false);
          } else {
            setIsWaitingForMembers(false);
            if (res.data.round === 2 || res.state === 'ROUND_2') {
              setNeedsRoundTwo(true);
              setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
              onRoundTwo?.(FIXTURE_ROUND_TWO_CANDIDATES);
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
          setReceipt({
            round: 1,
            intentId,
            requestId: reqId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
            votesSummary: ballotVotes,
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
    lastActionNotice,
    lastTapRef,
    activeCardIndex,
    setActiveCardIndex,
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
    votedCount,
    allVoted,
    isLocked,
    canUndo,
    isLoadingSnapshot,
    snapshotError,
    pool,
    fetchSnapshot,
    handleSetWant,
    handleVote,
    handleQuickFill,
    handleCardVote,
    handleCardDoubleTap,
    handleFlashcardVote,
    handleCardPress,
    handleClearVote,
    handleUndoCard,
    handleNextCard,
    handlePrevCard,
    handleHostEarlyFinish,
    handleRetryWaiting,
    handleSubmit,
  };
}
