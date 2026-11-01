import { SessionUser, Friend, InboxItem, HistoryItem } from '../contracts';

export const MOCK_CURRENT_USER: SessionUser = {
  id: 'usr_me_001',
  displayName: 'Bạn (Trang)',
  isGuest: true,
  createdAt: '2026-10-10T12:00:00Z',
};

export const MOCK_DEFAULT_ROOM_CODE = 'GCD234';
const MOCK_ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateMockRoomCode(): string {
  let suffix = '';
  for (let index = 0; index < 3; index += 1) {
    suffix += MOCK_ROOM_CODE_ALPHABET[Math.floor(Math.random() * MOCK_ROOM_CODE_ALPHABET.length)];
  }
  return `GCD${suffix}`;
}

export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'fr_01',
    friendUserId: 'usr_tuan_002',
    displayName: 'Tuấn',
    friendCode: 'TUAN88',
    status: 'active',
    since: '2026-10-01T08:00:00Z',
  },
  {
    id: 'fr_02',
    friendUserId: 'usr_tri_003',
    displayName: 'Trí',
    friendCode: 'TRIS99',
    status: 'active',
    since: '2026-10-02T09:30:00Z',
  },
  {
    id: 'fr_03',
    friendUserId: 'usr_vinh_004',
    displayName: 'Vinh',
    friendCode: 'VINH55',
    status: 'active',
    since: '2026-10-05T14:15:00Z',
  },
];

export const MOCK_INBOX_ITEMS: InboxItem[] = [
  {
    id: 'inbox_01',
    eventId: 'evt_invite_01',
    type: 'room_invite',
    title: 'Lời mời ăn trưa',
    body: `Tuấn mời bạn tham gia phòng chọn món #${MOCK_DEFAULT_ROOM_CODE}`,
    read: false,
    metadata: { roomId: 'room_mock_001', roomCode: MOCK_DEFAULT_ROOM_CODE },
    createdAt: '2026-10-11T07:45:00Z',
  },
  {
    id: 'inbox_02',
    eventId: 'evt_result_02',
    type: 'room_result',
    title: 'Kết quả bữa trưa hôm qua',
    body: 'Nhóm bạn đã chốt món: Phở bò tái nạm tại Phở Phú Vương.',
    read: true,
    metadata: { roomId: 'room_mock_past', dishName: 'Phở bò tái nạm' },
    createdAt: '2026-10-10T12:30:00Z',
  },
];

export const MOCK_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: 'hist_01',
    roomId: 'room_hist_01',
    roomCode: 'PAST23',
    mealDate: '2026-10-10T12:30:00Z',
    winnerName: 'Phở bò tái nạm',
    winnerArtworkUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
    memberCount: 4,
    scope: 'group',
  },
  {
    id: 'hist_02',
    roomId: 'room_hist_02',
    roomCode: 'PAST45',
    mealDate: '2026-10-08T18:45:00Z',
    winnerName: 'Cơm tấm sườn bì chả',
    winnerArtworkUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
    memberCount: 3,
    scope: 'personal',
  },
];
