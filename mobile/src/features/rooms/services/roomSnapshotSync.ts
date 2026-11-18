import type { ApiError } from '../../../data/api/contracts';
import type { RoomSubscription } from './roomRealtime';

type VersionedSnapshot = { roomId: string; version: number };
export function startRoomSnapshotSync(options: {
  roomId: string;
  subscribe: RoomSubscription;
  read(shouldApply: () => boolean): Promise<VersionedSnapshot | null>;
  isCurrent(): boolean;
  onError(error: ApiError): void;
}) {
  let active = true;
  let live = false;
  let busy = false;
  let dirty = false;
  let target = 0;
  let applied = 0;
  const delays = [2500, 5000, 10000, 30000];
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopSubscription = () => {};
  const stop = () => { active = false; clearTimeout(timer); stopSubscription(); };
  const current = () => active && options.isCurrent();
  const schedule = () => {
    clearTimeout(timer);
    if (current()) timer = setTimeout(() => { void refresh(); }, delays[attempt]);
  };
  async function refresh() {
    if (!current()) return;
    if (busy) { dirty = true; return; }
    clearTimeout(timer);
    busy = true;
    dirty = false;
    let succeeded = false;
    try {
      const snapshot = await options.read(current);
      if (!current()) return;
      if (snapshot?.roomId === options.roomId && Number.isSafeInteger(snapshot.version)) {
        applied = Math.max(applied, snapshot.version);
        succeeded = applied >= target;
      }
    } catch { /* Retry bounded transport failures through the same read path. */ }
    finally {
      busy = false;
      if (!current()) stop();
      else {
        attempt = succeeded ? 0 : Math.min(attempt + 1, delays.length - 1);
        if (dirty) void refresh();
        else if (!live || !succeeded) schedule();
      }
    }
  }
  stopSubscription = options.subscribe(options.roomId, signal => {
    if (!current()) { stop(); return; }
    if (signal.version <= Math.max(target, applied)) return;
    target = signal.version;
    if (busy) dirty = true;
    else void refresh();
  }, status => {
    if (!current()) { stop(); return; }
    live = status === 'live';
    clearTimeout(timer);
    if (live) void refresh(); // Read after channel registration to close the subscribe/read race.
    else schedule();
  }, error => {
    if (!current()) return;
    options.onError(error);
    stop();
  });
  if (!active) stopSubscription();
  return stop;
}
