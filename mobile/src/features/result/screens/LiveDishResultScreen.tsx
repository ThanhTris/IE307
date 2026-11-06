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
}

export function LiveDishResultScreen({
  roomId,
  repository: customRepository,
  onHome,
  onNewSession,
  artworkSources,
  renderMap,
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

  const [input, setInput] = useState<ResultInput | null>(null);
  const [readState, setReadState] = useState<ResultReadState>(roomId ? 'loading' : 'error');
  const [members, setMembers] = useState<readonly ResultCompanion[]>([]);
  const [nearby, setNearby] = useState<NearbyState | undefined>();
  const [refreshIndex, setRefreshIndex] = useState(0);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    // Concurrently load room snapshot for companions if available
    if (repository.getSnapshot) {
      void repository.getSnapshot(roomId).then(snapRes => {
        if (!cancelled && snapRes.ok && snapRes.data?.members) {
          setMembers(mapSnapshotMembersToCompanions(snapRes.data.members));
        }
      }).catch(() => {
        // Non-blocking companion fetch
      });
    }

    void repository.getResult(roomId).then(res => {
      if (cancelled) return;

      if (res.ok) {
        setInput(res.data);
        setReadState('ready');

        // If decided winner exists, initiate non-blocking nearby places load
        if (res.data.capability === 'scored-v4' && res.data.result.status === 'DECIDED' && res.data.result.winner) {
          const winner = res.data.result.winner;
          if (repository.fetchNearbyPlaces) {
            void repository.fetchNearbyPlaces({
              resultId: res.data.result.resultId,
              winnerDishId: winner.dishId,
              dishName: winner.name,
            }).then(placesRes => {
              if (!cancelled && placesRes.ok) {
                setNearby(placesRes.data);
              }
            }).catch(() => {
              if (!cancelled) {
                setNearby({
                  resultId: res.data.result.resultId,
                  winnerDishId: winner.dishId,
                  status: 'error',
                  places: [],
                  fetchedAt: new Date().toISOString(),
                });
              }
            });
          }
        }
      } else {
        if (res.error?.messageKey === 'NOT_READY') {
          setReadState('finalizing');
        } else {
          setReadState('error');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roomId, repository, refreshIndex]);

  const handleRetryResult = useCallback(() => {
    setReadState('loading');
    setRefreshIndex(prev => prev + 1);
  }, []);

  const handleRetryPlaces = useCallback(async () => {
    if (!input || input.capability !== 'scored-v4' || input.result.status !== 'DECIDED' || !input.result.winner) return;
    const winner = input.result.winner;
    if (repository.fetchNearbyPlaces) {
      setNearby(prev => prev ? { ...prev, status: 'loading' } : undefined);
      const res = await repository.fetchNearbyPlaces({
        resultId: input.result.resultId,
        winnerDishId: winner.dishId,
        dishName: winner.name,
      });
      if (mountedRef.current && res.ok) {
        setNearby(res.data);
      }
    }
  }, [input, repository]);

  const handleRequestLocation = useCallback(async () => {
    await handleRetryPlaces();
  }, [handleRetryPlaces]);

  const handleOpenSettings = useCallback(async () => {
    await handleRetryPlaces();
  }, [handleRetryPlaces]);

  const handleExternalAction = useCallback((_action: ResultExternalAction, _target: ResultActionTarget): ResultActionReply => {
    // Supplementary external action (e.g. open Maps or search)
    return { ok: true };
  }, []);

  return (
    <DishResultFlow
      input={input}
      readState={readState}
      members={members}
      nearby={nearby}
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
