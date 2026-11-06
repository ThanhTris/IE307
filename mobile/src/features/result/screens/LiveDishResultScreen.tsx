import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { DishResultFlow } from './DishResultFlow';
import {
  type NearbyState,
  type ResultActionReply,
  type ResultActionTarget,
  type ResultCompanion,
  type ResultExternalAction,
  type ResultInput,
  type ResultReadState,
} from '../services/resultPresentation';
import {
  createLiveResultRepository,
  mapSnapshotMembersToCompanions,
  type ResultRepository,
} from '../services/resultRepository';
import type { ResultMapRenderer } from '../services/nearbyPresentation';

export interface LiveDishResultScreenProps {
  roomId: string;
  repository?: ResultRepository;
  onHome: () => void;
  onNewSession: () => void;
  onOtherScreen?: () => void;
  artworkSources?: Readonly<Record<string, ImageSourcePropType>>;
  renderMap?: ResultMapRenderer;
  pollIntervalMs?: number;
}

export function LiveDishResultScreen({
  roomId,
  repository: customRepository,
  onHome,
  onNewSession,
  artworkSources,
  renderMap,
  pollIntervalMs,
}: LiveDishResultScreenProps) {
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = useMemo<ResultRepository>(() => {
    if (customRepository) return customRepository;
    if (isReal) {
      return createLiveResultRepository({ roomRepository: live.repository });
    }
    return createLiveResultRepository();
  }, [customRepository, isReal, live.repository]);

  const [currentRoomId, setCurrentRoomId] = useState(roomId);
  const [input, setInput] = useState<ResultInput | null>(null);
  const [readState, setReadState] = useState<ResultReadState>(roomId ? 'loading' : 'error');
  const [members, setMembers] = useState<readonly ResultCompanion[]>([]);
  const [nearby, setNearby] = useState<NearbyState | undefined>();
  const [refreshIndex, setRefreshIndex] = useState(0);

  const isRoomChanged = roomId !== currentRoomId;
  const effectiveInput = isRoomChanged ? null : input;
  const effectiveReadState = isRoomChanged ? (roomId ? 'loading' : 'error') : readState;
  const effectiveMembers = isRoomChanged ? [] : members;
  const effectiveNearby = isRoomChanged ? undefined : nearby;

  const mountedRef = useRef(true);
  const activeRoomIdRef = useRef(roomId);
  const fetchSeqRef = useRef(0);
  const placesSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toNearbyError = useCallback((resultId: string, winnerDishId: string, error?: { messageKey?: string }): NearbyState => {
    const isNet = error?.messageKey === 'NETWORK_ERROR' || error?.messageKey === 'OFFLINE';
    const isPerm = error?.messageKey === 'PERMISSION_DENIED';
    return {
      resultId,
      winnerDishId,
      status: isPerm ? 'denied' : isNet ? 'offline' : 'error',
      places: [],
      fetchedAt: new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    activeRoomIdRef.current = roomId;
    const currentSeq = ++fetchSeqRef.current;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollAttempts = 0;
    const maxPollAttempts = 10;
    let cancelled = false;

    if (!roomId) return;

    // Concurrently load room snapshot for companions if available
    if (repository.getSnapshot) {
      void repository.getSnapshot(roomId).then(snapRes => {
        if (!cancelled && activeRoomIdRef.current === roomId && currentSeq === fetchSeqRef.current && snapRes.ok && snapRes.data?.members) {
          setMembers(mapSnapshotMembersToCompanions(snapRes.data.members));
        }
      }).catch(() => {
        // Non-blocking companion fetch
      });
    }

    const executeFetch = () => {
      void repository.getResult(roomId).then(res => {
        if (cancelled || activeRoomIdRef.current !== roomId || currentSeq !== fetchSeqRef.current) return;

        if (res.ok) {
          setCurrentRoomId(roomId);
          setInput(res.data);
          setReadState('ready');

          // If decided winner exists, initiate non-blocking nearby places load
          if (res.data.capability === 'scored-v4' && res.data.result.status === 'DECIDED' && res.data.result.winner) {
            const winner = res.data.result.winner;
            const resultId = res.data.result.resultId;
            const currentPlacesSeq = ++placesSeqRef.current;

            if (repository.fetchNearbyPlaces) {
              void repository.fetchNearbyPlaces({
                resultId,
                winnerDishId: winner.dishId,
                dishName: winner.name,
              }).then(placesRes => {
                if (cancelled || activeRoomIdRef.current !== roomId || currentPlacesSeq !== placesSeqRef.current) return;
                if (placesRes.ok) {
                  setNearby(placesRes.data);
                } else {
                  setNearby(toNearbyError(resultId, winner.dishId, placesRes.error));
                }
              }).catch(() => {
                if (!cancelled && activeRoomIdRef.current === roomId && currentPlacesSeq === placesSeqRef.current) {
                  setNearby(toNearbyError(resultId, winner.dishId, { messageKey: 'NETWORK_ERROR' }));
                }
              });
            }
          }
        } else {
          setCurrentRoomId(roomId);
          if (res.error?.messageKey === 'NOT_READY') {
            setReadState('finalizing');
            if (pollAttempts < maxPollAttempts) {
              pollAttempts++;
              const delay = pollIntervalMs ?? Math.min(1500 + pollAttempts * 500, 5000);
              pollTimer = setTimeout(() => {
                if (!cancelled && activeRoomIdRef.current === roomId && currentSeq === fetchSeqRef.current) {
                  executeFetch();
                }
              }, delay);
            } else {
              setReadState('error');
            }
          } else {
            setReadState('error');
          }
        }
      }).catch(() => {
        if (!cancelled && activeRoomIdRef.current === roomId && currentSeq === fetchSeqRef.current) {
          setCurrentRoomId(roomId);
          setReadState('error');
        }
      });
    };

    executeFetch();

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [roomId, repository, refreshIndex, toNearbyError, pollIntervalMs]);

  const handleRetryResult = useCallback(() => {
    setReadState('loading');
    setRefreshIndex(prev => prev + 1);
  }, []);

  const handleRetryPlaces = useCallback(async () => {
    if (!input || input.capability !== 'scored-v4' || input.result.status !== 'DECIDED' || !input.result.winner) return;
    const winner = input.result.winner;
    const resultId = input.result.resultId;
    const targetRoomId = roomId;

    if (repository.fetchNearbyPlaces) {
      setNearby(prev => prev ? { ...prev, status: 'loading' } : undefined);
      const currentPlacesSeq = ++placesSeqRef.current;

      try {
        const res = await repository.fetchNearbyPlaces({
          resultId,
          winnerDishId: winner.dishId,
          dishName: winner.name,
        });
        if (!mountedRef.current || activeRoomIdRef.current !== targetRoomId || currentPlacesSeq !== placesSeqRef.current) return;

        if (res.ok) {
          setNearby(res.data);
        } else {
          setNearby(toNearbyError(resultId, winner.dishId, res.error));
        }
      } catch {
        if (mountedRef.current && activeRoomIdRef.current === targetRoomId && currentPlacesSeq === placesSeqRef.current) {
          setNearby(toNearbyError(resultId, winner.dishId, { messageKey: 'NETWORK_ERROR' }));
        }
      }
    }
  }, [input, repository, roomId, toNearbyError]);

  const handleRequestLocation = useCallback(async () => {
    await handleRetryPlaces();
  }, [handleRetryPlaces]);

  const handleOpenSettings = useCallback(async () => {
    await handleRetryPlaces();
  }, [handleRetryPlaces]);

  const handleExternalAction = useCallback((_action: ResultExternalAction, _target: ResultActionTarget): ResultActionReply => {
    // Supplementary external action (e.g. open Maps or search) requires GM-30.
    // Return ok: false to notify caller that capability is not yet available.
    return { ok: false };
  }, []);

  return (
    <DishResultFlow
      input={effectiveInput}
      readState={effectiveReadState}
      members={effectiveMembers}
      nearby={effectiveNearby}
      artworkSources={artworkSources}
      isMock={!isReal}
      renderMap={renderMap}
      onHome={onHome}
      onNewSession={onNewSession}
      onRetryResult={handleRetryResult}
      onRetryPlaces={handleRetryPlaces}
      onRequestLocation={handleRequestLocation}
      onOpenSettings={handleOpenSettings}
      onExternalAction={handleExternalAction}
    />
  );
}
