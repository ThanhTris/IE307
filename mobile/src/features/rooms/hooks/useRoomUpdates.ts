import { createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { ApiError } from '../../../data/api/contracts';
import type { RoomSubscription } from '../services/roomRealtime';
import { startRoomSnapshotSync } from '../services/roomSnapshotSync';
import { startVotingSnapshotPolling } from '../../voting/services/snapshotPolling';

export const RoomUpdatesContext = createContext<RoomSubscription | undefined>(undefined);

export function useRoomUpdates(options: {
  roomId: string;
  userId?: string;
  enabled: boolean;
  readEpoch?: unknown;
  read(shouldApply: () => boolean): Promise<{ roomId: string; version: number } | null>;
  isCurrent(): boolean;
  onError(error: ApiError): void;
}) {
  const subscribe = useContext(RoomUpdatesContext);
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  const { roomId, userId, enabled } = options;
  useEffect(() => {
    if (!enabled || !roomId) return;
    let active = true;
    let stop: (() => void) | undefined;
    const current = () => active && latest.current.roomId === roomId
      && latest.current.userId === userId && latest.current.isCurrent();
    const read = (guard: () => boolean) => {
      const epoch = latest.current.readEpoch;
      return latest.current.read(() => guard() && latest.current.readEpoch === epoch);
    };
    const start = () => {
      stop?.();
      if (!current()) return;
      // Injected fixture repositories outside the live provider retain the existing test adapter.
      stop = subscribe ? startRoomSnapshotSync({
        roomId, subscribe, isCurrent: current,
        read,
        onError: error => latest.current.onError(error),
      }) : startVotingSnapshotPolling(read, () => !current());
    };
    if (AppState.currentState !== 'background') start();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else { stop?.(); stop = undefined; }
    });
    return () => { active = false; stop?.(); listener.remove(); };
  }, [subscribe, roomId, userId, enabled]);
}
