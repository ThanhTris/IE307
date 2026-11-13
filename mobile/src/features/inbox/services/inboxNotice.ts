import type { InboxItem } from '../../../data/api/contracts';
import type { AppIconName } from '../../../shared/ui/icons/AppIcon';

/** What the in-app banner shows for one inbox row, and where tapping it goes. */
export interface InboxNotice {
  key: string;
  title: string;
  message: string;
  icon: AppIconName;
  path: string;
}

/** The server falls back to these generic titles when it cannot name the sender. */
const GENERIC_TITLES = new Set(['Lời mời kết bạn', 'Lời mời vào phòng']);

/**
 * Maps an inbox row to banner copy. The server already writes plain-language titles and bodies (ADR-026), so this only
 * decides the heading, the icon and the screen: invitations read "<name> <what they want>", the rest show title + body.
 */
export function noticeForInboxItem(item: InboxItem): InboxNotice {
  const key = `inbox:${item.eventId}`;
  const named = !GENERIC_TITLES.has(item.title);
  if (item.type === 'friend_invite') {
    return { key, title: 'Lời mời kết bạn', message: named ? `${item.title} ${item.body}` : item.body, icon: 'friends', path: '/inbox' };
  }
  if (item.type === 'room_invite') {
    return { key, title: 'Rủ đi ăn', message: named ? `${item.title} ${item.body}` : item.body, icon: 'bell', path: '/inbox' };
  }
  if (item.type === 'friend_accepted') {
    return { key, title: item.title, message: item.body, icon: 'friends', path: '/friends' };
  }
  return {
    key, title: item.title, message: item.body,
    icon: item.title === 'Đã chốt món' || item.metadata?.status === 'DECIDED' ? 'check' : 'bell',
    path: `/inbox?openEventId=${encodeURIComponent(item.eventId)}`,
  };
}

/** One summary for notifications that piled up while the app was closed (instead of a banner for each). */
export function summaryNotice(count: number): InboxNotice {
  return { key: 'inbox:summary', title: 'Thông báo mới', message: count === 1 ? 'Bạn có 1 thông báo chưa đọc' : `Bạn có ${count} thông báo chưa đọc`, icon: 'bell', path: '/inbox' };
}

/** A result banner would only repeat the screen the person is already looking at. */
export function isRoomResultForCurrentRoom(item: InboxItem, pathname: string, currentRoomId: string | undefined): boolean {
  return item.type === 'room_result' && pathname.startsWith('/room') && currentRoomId !== undefined
    && item.metadata?.roomId === currentRoomId;
}
