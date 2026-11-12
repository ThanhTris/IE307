import { AppState } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { InboxBadgeContext } from '../shared/lib/inboxBadge';
import { createSocialRepository } from '../features/friends/services/socialRepository';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { useToast } from '../shared/ui/feedback/Toast';
import { useRoomRepository } from './RoomRepositoryProvider';

/**
 * Keeps the bell's unread count fresh and pops a toast for each notification that arrived since the last read.
 * It reads when the session starts, whenever the app returns to the foreground, and when something asks for a
 * refresh. It also notices when someone accepted YOUR friend invite (a friend appeared since the last read). There is no timer: nothing is fetched while the app sits idle. The first read only seeds what already
 * existed, so opening the app never replays old notifications.
 */
export function InboxBadgeProvider({ children }: PropsWithChildren) {
  const live = useRoomRepository();
  const toast = useToast();
  const userId = live.user?.id;
  const repository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const [unread, setUnread] = useState(0);
  const social = useMemo(() => createSocialRepository(live.repository), [live.repository]);
  const seen = useRef<Set<string> | null>(null);
  const friendsSeen = useRef<Map<string, string> | null>(null);
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(value => value + 1), []);

  useEffect(() => { seen.current = null; friendsSeen.current = null; }, [userId]);
  /** Reads the friend list; announces newcomers unless `quiet`. */
  const readFriends = useCallback(async (quiet: boolean) => {
    const result = await social.listFriends();
    if (!result.ok) return;
    if (friendsSeen.current && !quiet) {
      for (const friend of result.data) {
        if (!friendsSeen.current.has(friend.friendUserId)) toastRef.current?.show({ title: 'Kết bạn thành công', message: `${friend.displayName} đã chấp nhận lời mời của bạn.`, tone: 'success' });
      }
    }
    friendsSeen.current = new Map(result.data.map(friend => [friend.friendUserId, friend.displayName]));
  }, [social]);
  const syncFriends = useCallback(() => { void readFriends(true).catch(() => undefined); }, [readFriends]);
  useEffect(() => {
    if (!userId) { const reset = setTimeout(() => setUnread(0), 0); return () => clearTimeout(reset); }
    let active = true;
    const poll = async () => {
      try {
        const result = await repository.list();
        if (!active || !result.ok) return;
        const fresh = result.data.items.filter(item => !item.read);
        setUnread(fresh.length);
        if (seen.current) {
          for (const item of fresh) {
            if (seen.current.has(item.eventId)) continue;
            toastRef.current?.show({ title: item.title, message: item.body, tone: 'info' });
          }
        }
        seen.current = new Set(result.data.items.map(item => item.eventId));
        await readFriends(false);
      } catch { /* the bell keeps its last value; the next poll retries */ }
    };
    const first = setTimeout(() => { void poll(); }, 0);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void poll(); });
    return () => { active = false; clearTimeout(first); subscription.remove(); };
  }, [repository, userId, tick, readFriends]);

  const value = useMemo(() => ({ unread, setUnread, refresh, syncFriends }), [unread, refresh, syncFriends]);
  return <InboxBadgeContext.Provider value={value}>{children}</InboxBadgeContext.Provider>;
}
