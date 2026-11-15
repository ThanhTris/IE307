import { router, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import { AppState } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { InboxBadgeContext } from '../shared/lib/inboxBadge';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { isRoomResultForCurrentRoom, noticeForInboxItem, summaryNotice } from '../features/inbox/services/inboxNotice';
import { subscribeInboxRealtime } from '../features/inbox/services/inboxRealtime';
import { useNotifications } from '../shared/ui/feedback/NotificationBanner';
import { useRoomRepository } from './RoomRepositoryProvider';

/** Only while the Realtime connection is down: how often the inbox is read instead. The server allows 60 reads a minute. */
export const INBOX_FALLBACK_POLL_MS = 30_000;
/** Several rows written together (a room result for many members) cause one read. */
export const INBOX_PUSH_DEBOUNCE_MS = 300;

/**
 * Keeps the bell's unread count fresh and shows a banner for each notification that arrived since the last read
 * (ADR-026). The server pushes each new inbox row through Supabase Realtime while the app is in the foreground, so a
 * notification shows within about a second and nothing is read while nothing happens. The inbox is also read at
 * sign-in, when the app returns to the foreground, after the push connection comes back, and on request. Only while the
 * push connection is down does it fall back to reading every 30 seconds. In the background the connection is closed.
 * The first read of a session never replays old rows one by one: unread rows become one summary banner.
 */
export function InboxBadgeProvider({ children }: PropsWithChildren) {
  const roomSession = useRoomRepository();
  const notifications = useNotifications();
  const pathname = usePathname();
  const { roomId } = useGlobalSearchParams<{ roomId?: string }>();
  const userId = roomSession.user?.id;
  const repository = useMemo(() => createInboxRepository(roomSession.repository), [roomSession.repository]);
  const [unread, setUnread] = useState(0);
  const [revision, setRevision] = useState(0);
  const pollRef = useRef<() => void>(() => undefined);
  // Reads on request without tearing down the push connection.
  const refresh = useCallback(() => pollRef.current(), []);
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
    let again = false;
    let fallback: ReturnType<typeof setInterval> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let stopRealtime: (() => void) | undefined;
    let pushLive = false;
    const open = (path: string) => router.push(path as Href);
    const poll = async () => {
      // A push that arrives during a read must not be lost: read once more afterwards.
      if (inFlight) { again = true; return; }
      inFlight = true;
      again = false;
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
      } catch { /* the bell keeps its last value; the next read retries */ } finally {
        inFlight = false;
        if (again && active) void poll();
      }
    };
    const startFallback = () => { if (fallback === undefined) fallback = setInterval(() => { void poll(); }, INBOX_FALLBACK_POLL_MS); };
    const stopFallback = () => { if (fallback !== undefined) { clearInterval(fallback); fallback = undefined; } };
    const pushed = () => {
      if (debounce !== undefined) clearTimeout(debounce);
      debounce = setTimeout(() => { debounce = undefined; void poll(); }, INBOX_PUSH_DEBOUNCE_MS);
    };
    const start = () => {
      if (stopRealtime) return;
      const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL, apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const session = roomSession.repository.getSessionApi();
      if (!baseUrl || !apiKey || !session) { startFallback(); return; }
      stopRealtime = subscribeInboxRealtime({
        baseUrl, apiKey, userId,
        getAccessToken: async () => { const token = await session.getAccessToken(); return token.ok ? token.data : undefined; },
        onInsert: pushed,
        onStatus: status => {
          if (status === 'live') {
            stopFallback();
            // Rows written while the connection was down were not pushed: read once to catch up.
            if (!pushLive) { pushLive = true; void poll(); }
          } else if (status === 'down') { pushLive = false; startFallback(); }
        },
      });
    };
    const stop = () => {
      stopRealtime?.(); stopRealtime = undefined; pushLive = false;
      stopFallback();
      if (debounce !== undefined) { clearTimeout(debounce); debounce = undefined; }
    };
    pollRef.current = () => { void poll(); };
    const first = setTimeout(() => { void poll(); }, 0);
    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { void poll(); start(); } else if (state === 'background') stop(); // iOS 'inactive' is brief (prompt, Control Center)
    });
    return () => { active = false; pollRef.current = () => undefined; clearTimeout(first); stop(); subscription.remove(); };
  }, [repository, userId, roomSession.repository]);

  const value = useMemo(() => ({ unread, setUnread, refresh, revision, syncFriends: refresh }), [unread, refresh, revision]);
  return <InboxBadgeContext.Provider value={value}>{children}</InboxBadgeContext.Provider>;
}
