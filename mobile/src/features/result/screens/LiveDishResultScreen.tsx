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
  type FetchNearbyPlacesParams,
  type ResultRepository,
} from '../services/resultRepository';
import type { ResultMapRenderer } from '../services/nearbyPresentation';
import {
  createPlacesRepository,
  getPlacesApiKeyFromEnv,
  isPlacesSimulatedFromEnv,
  type PlacesConfig,
  type PlacesRepository,
} from '../services/placesRepository';
import { openExternalAction } from '../services/externalLinks';
import { defaultResultMapRenderer } from '../components/DefaultResultMapView';

export interface LiveDishResultScreenProps {
  roomId: string;
  resultId?: string;
  repository?: ResultRepository;
  placesRepository?: PlacesRepository;
  placesConfig?: PlacesConfig;
  onHome: () => void;
  onNewSession: () => void;
  onOtherScreen?: () => void;
  artworkSources?: Readonly<Record<string, ImageSourcePropType>>;
  renderMap?: ResultMapRenderer;
  pollIntervalMs?: number;
  isReal?: boolean;
}

export function LiveDishResultScreen({
  roomId,
  resultId,
  repository: customRepository,
  placesRepository: customPlacesRepository,
  placesConfig,
  onHome,
  onNewSession,
  onOtherScreen,
  artworkSources,
  renderMap: renderMapProp,
  pollIntervalMs,
  isReal: isRealProp,
}: LiveDishResultScreenProps) {
  const live = useRoomRepository();
  const isReal = isRealProp ?? (live ? live.mode === 'real' : false);
  const renderMap = renderMapProp ?? defaultResultMapRenderer;

  const placesRepository = useMemo<PlacesRepository>(() => {
    if (customPlacesRepository) return customPlacesRepository;
    const envApiKey = getPlacesApiKeyFromEnv();
    const envSimulated = isPlacesSimulatedFromEnv();
    const effectiveApiKey = placesConfig?.apiKey ?? envApiKey;
    const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
    const effectiveSimulated = placesConfig?.isDevSimulated !== undefined
      ? (isDev ? placesConfig.isDevSimulated : false)
      : (isDev && envSimulated);

    return createPlacesRepository({
      apiKey: effectiveApiKey,
      isDevSimulated: effectiveSimulated,
    });
  }, [customPlacesRepository, placesConfig]);

  const placesFetcher = useMemo(() => {
    if (customPlacesRepository?.fetchNearbyPlaces) {
      return customPlacesRepository.fetchNearbyPlaces.bind(customPlacesRepository);
    }
    if (placesConfig) {
      return placesRepository.fetchNearbyPlaces.bind(placesRepository);
    }
    if (customRepository?.fetchNearbyPlaces) {
      return customRepository.fetchNearbyPlaces.bind(customRepository);
    }
    return placesRepository.fetchNearbyPlaces.bind(placesRepository);
  }, [customPlacesRepository, placesConfig, customRepository, placesRepository]);

  const repository = useMemo<ResultRepository>(() => {
    if (customRepository) return customRepository;
    const getCurrentIdentity = () =>
      live.user?.id ??
      (live.repository && typeof live.repository.getCurrentUser === 'function'
        ? live.repository.getCurrentUser()?.id
        : null) ??
      null;

    const repositoryPlacesFetcher = (params: FetchNearbyPlacesParams) =>
      placesFetcher(params);

    if (isReal) {
      return createLiveResultRepository({
        roomRepository: live.repository,
        getCurrentIdentity,
        placesFetcher: repositoryPlacesFetcher,
      });
    }
    return createLiveResultRepository({
      getCurrentIdentity,
      placesFetcher: repositoryPlacesFetcher,
    });
  }, [customRepository, isReal, live.repository, live.user?.id, placesFetcher]);

  const [currentRoomId, setCurrentRoomId] = useState(roomId);
  const [currentResultId, setCurrentResultId] = useState(resultId);
  const [input, setInput] = useState<ResultInput | null>(null);
  const [readState, setReadState] = useState<ResultReadState>(roomId ? 'loading' : 'error');
  const [members, setMembers] = useState<readonly ResultCompanion[]>([]);
  const [nearby, setNearby] = useState<NearbyState | undefined>();
  const [refreshIndex, setRefreshIndex] = useState(0);

  const isContextChanged = roomId !== currentRoomId || (resultId !== undefined && resultId !== currentResultId);
  const effectiveInput = isContextChanged ? null : input;
  const effectiveReadState = isContextChanged ? (roomId ? 'loading' : 'error') : readState;
  const effectiveMembers = isContextChanged ? [] : members;
  const effectiveNearby = isContextChanged ? undefined : nearby;

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

  // Lifecycle cleanup: dispose internally-created repository or placesRepository on unmount.
  useEffect(() => {
    return () => {
      if (!customRepository && repository && typeof repository.dispose === 'function') {
        repository.dispose();
      }
      if (!customPlacesRepository && placesRepository && typeof placesRepository.dispose === 'function') {
        placesRepository.dispose();
      }
    };
  }, [customRepository, repository, customPlacesRepository, placesRepository]);

  const toNearbyError = useCallback((targetResultId: string, winnerDishId: string, error?: { messageKey?: string }): NearbyState => {
    const isNet = error?.messageKey === 'NETWORK_ERROR' || error?.messageKey === 'OFFLINE';
    const isPerm = error?.messageKey === 'PERMISSION_DENIED';
    return {
      resultId: targetResultId,
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
          // If expected resultId was requested, ensure it matches (guard for both scored-v4 and legacy-unscored-v1)
          if (resultId && res.data.result.resultId !== resultId) {
            setCurrentRoomId(roomId);
            setCurrentResultId(resultId);
            setReadState('error');
            return;
          }

          setCurrentRoomId(roomId);
          setCurrentResultId(resultId);
          setInput(res.data);
          setReadState('ready');

          // If decided winner exists, initiate non-blocking nearby places load
          if (res.data.capability === 'scored-v4' && res.data.result.status === 'DECIDED' && res.data.result.winner) {
            const winner = res.data.result.winner;
            const targetResultId = res.data.result.resultId;
            const currentPlacesSeq = ++placesSeqRef.current;

            void placesFetcher({
              resultId: targetResultId,
              winnerDishId: winner.dishId,
              dishName: winner.name,
            }).then(placesRes => {
              if (cancelled || activeRoomIdRef.current !== roomId || currentPlacesSeq !== placesSeqRef.current) return;
              if (placesRes.ok) {
                setNearby(placesRes.data);
              } else {
                setNearby(toNearbyError(targetResultId, winner.dishId, placesRes.error));
              }
            }).catch(() => {
              if (!cancelled && activeRoomIdRef.current === roomId && currentPlacesSeq === placesSeqRef.current) {
                setNearby(toNearbyError(targetResultId, winner.dishId, { messageKey: 'NETWORK_ERROR' }));
              }
            });
          }
        } else {
          setCurrentRoomId(roomId);
          setCurrentResultId(resultId);
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
  }, [roomId, resultId, repository, placesFetcher, refreshIndex, toNearbyError, pollIntervalMs]);

  const handleRetryResult = useCallback(() => {
    setReadState('loading');
    setRefreshIndex(prev => prev + 1);
  }, []);

  const handleRetryPlaces = useCallback(async () => {
    if (!input || input.capability !== 'scored-v4' || input.result.status !== 'DECIDED' || !input.result.winner) return;
    const winner = input.result.winner;
    const targetResultId = input.result.resultId;
    const targetRoomId = roomId;

    setNearby(prev => prev ? { ...prev, status: 'loading' } : undefined);
    const currentPlacesSeq = ++placesSeqRef.current;

    try {
      const res = await placesFetcher({
        resultId: targetResultId,
        winnerDishId: winner.dishId,
        dishName: winner.name,
      });
      if (!mountedRef.current || activeRoomIdRef.current !== targetRoomId || currentPlacesSeq !== placesSeqRef.current) return;

      if (res.ok) {
        setNearby(res.data);
      } else {
        setNearby(toNearbyError(targetResultId, winner.dishId, res.error));
      }
    } catch {
      if (mountedRef.current && activeRoomIdRef.current === targetRoomId && currentPlacesSeq === placesSeqRef.current) {
        setNearby(toNearbyError(targetResultId, winner.dishId, { messageKey: 'NETWORK_ERROR' }));
      }
    }
  }, [input, placesFetcher, roomId, toNearbyError]);

  const handleRequestLocation = useCallback(async () => {
    await placesRepository.requestLocationPermission();
    await handleRetryPlaces();
  }, [placesRepository, handleRetryPlaces]);

  const handleOpenSettings = useCallback(async () => {
    await placesRepository.openLocationSettings();
  }, [placesRepository]);

  const handleExternalAction = useCallback(async (action: ResultExternalAction, target: ResultActionTarget): Promise<ResultActionReply> => {
    return openExternalAction(action, target);
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
