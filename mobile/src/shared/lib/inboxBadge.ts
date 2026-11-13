import { createContext, useContext } from 'react';

export type InboxBadge = {
  /** Unread notifications, shown on the bell. */
  unread: number;
  /** The inbox screen reports its own count so the bell follows reads and answers immediately. */
  setUnread: (count: number) => void;
  /** Reads the inbox now (instead of waiting for the next 10-second read). */
  refresh: () => void;
  /** Counts up whenever new notifications arrived, so open lists can refresh themselves. */
  revision: number;
  /** Kept for callers that answered a friend invite: reads the inbox now. */
  syncFriends: () => void;
};

export const InboxBadgeContext = createContext<InboxBadge>({ unread: 0, setUnread: () => undefined, refresh: () => undefined, revision: 0, syncFriends: () => undefined });
export const useInboxBadge = () => useContext(InboxBadgeContext);
