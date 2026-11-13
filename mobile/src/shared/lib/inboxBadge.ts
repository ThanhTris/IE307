import { createContext, useContext } from 'react';

export type InboxBadge = {
  /** Unread notifications, shown on the bell. */
  unread: number;
  /** The inbox screen reports its own count so the bell follows reads and answers immediately. */
  setUnread: (count: number) => void;
  refresh: () => void;
  /** Call after YOU accepted a friend invite, so it is not announced as "X accepted your invite". */
  syncFriends: () => void;
};

export const InboxBadgeContext = createContext<InboxBadge>({ unread: 0, setUnread: () => undefined, refresh: () => undefined, syncFriends: () => undefined });
export const useInboxBadge = () => useContext(InboxBadgeContext);
