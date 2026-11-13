import { router, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import { AppState } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { InboxBadgeContext } from '../shared/lib/inboxBadge';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { isRoomResultForCurrentRoom, noticeForInboxItem, summaryNotice } from '../features/inbox/services/inboxNotice';
import { useNotifications } from '../shared/ui/feedback/NotificationBanner';
import { useRoomRepository } from './RoomRepositoryProvider';

/** How often the inbox is read while the app is in the foreground. The server allows 60 reads a minute. */
export const INBOX_POLL_MS = 10_000;

/**
 * Keeps the bell's unread count fresh and shows a banner for each notification that arrived since the last read
 * (ADR-026). While the app is in the foreground it reads the inbox every 10 seconds; it also reads at sign-in, when the
 * app returns to the foreground and when something asks for a refresh, and it stops while the app is in the
 * background. The first read of a session never replays old rows one by one: unread rows become one summary banner.
 * Friend requests, accepted requests, invites to eat and room results all arrive as server inbox events.
 */
export function InboxBadgeProvider({ children }: PropsWithChildren) {
  const live = useRoomRepository();
  const notifications = useNotifications();
  const pathname = usePathname();
  const { roomId } = useGlobalSearchParams<{ roomId?: string }>();
  const userId = live.user?.id;
  const repository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const [unread, setUnread] = useState(0);
  const [revision, setRevision] = useState(0);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(value => value + 1), []);
  const seen = useRef<Set<string> | null>(null);
  const notificationsRef = useRef(notifications);
  const whereRef = useRef({ pathname, roomId: typeof roomId === 'string' ? roomId : undefined });
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { whereRef.current = { pathname, roomId: typeof roomId === 'string' ? roomId : undefined }; }, [pathname, roomId]);
  useEffect(() => { seen.current = null; }, [userId]);

  useEffect(() => {
    if (!userId) { const reset = setTimeout(() => setUnread(0), 0); return () => clearTimeout(reset); }
    let active = true;
    let inFlight = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const open = (path: string) => router.push(path as Href);
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await repository.list();
        if (!active || !result.ok) return;
        const fresh = result.data.items.filter(item => !item.read);
        setUnread(fresh.length);
        const known = seen.current;
        seen.current = new Set(result.data.items.map(item => item.eventId));
        const notify = notificationsRef.current?.notify;
        if (!known) {
          if (fresh.length && notify) { const notice = summaryNotice(fresh.length); notify({ ...notice, onPress: () => open(notice.path) }); }
          return;
        }
        const arrived = fresh.filter(item => !known.has(item.eventId));
        if (!arrived.length) return;
        setRevision(value => value + 1);
        const where = whereRef.current;
        // The inbox list refreshes itself; a banner on top of it would only repeat it.
        if (!notify || where.pathname === '/inbox') return;
        for (const item of arrived) {
          if (isRoomResultForCurrentRoom(item, where.pathname, where.roomId)) continue;
          const notice = noticeForInboxItem(item);
          notify({ key: notice.key, title: notice.title, message: notice.message, icon: notice.icon, onPress: () => open(notice.path) });
        }
      } catch { /* the bell keeps its last value; the next read retries */ } finally { inFlight = false; }
    };
    const start = () => { if (timer === undefined) timer = setInterval(() => { void poll(); }, INBOX_POLL_MS); };
    const stop = () => { if (timer !== undefined) { clearInterval(timer); timer = undefined; } };
    const first = setTimeout(() => { void poll(); }, 0);
    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { void poll(); start(); } else stop();
    });
    return () => { active = false; clearTimeout(first); stop(); subscription.remove(); };
  }, [repository, userId, tick]);

  const value = useMemo(() => ({ unread, setUnread, refresh, revision, syncFriends: refresh }), [unread, refresh, revision]);
  return <InboxBadgeContext.Provider value={value}>{children}</InboxBadgeContext.Provider>;
}
