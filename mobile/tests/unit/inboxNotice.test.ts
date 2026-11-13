import type { InboxItem } from '../../src/data/api/contracts';
import { isRoomResultForCurrentRoom, noticeForInboxItem, summaryNotice } from '../../src/features/inbox/services/inboxNotice';

const base = { id: '11111111-1111-4111-8111-111111111111', eventId: '22222222-2222-4222-8222-222222222222', read: false, createdAt: '2026-11-13T10:00:00.000Z' };
const item = (patch: Partial<InboxItem>): InboxItem => ({ ...base, type: 'friend_invite', title: 'Linh', body: 'muốn kết bạn với bạn', metadata: {}, ...patch });

test('a friend request names who sent it and opens the inbox', () => {
  expect(noticeForInboxItem(item({}))).toMatchObject({ title: 'Lời mời kết bạn', message: 'Linh muốn kết bạn với bạn', path: '/inbox', icon: 'friends' });
});

test('an accepted request tells the sender who accepted and opens the friend list', () => {
  const notice = noticeForInboxItem(item({ type: 'friend_accepted', title: 'Kết bạn thành công', body: 'Linh đã chấp nhận lời mời kết bạn của bạn' }));
  expect(notice).toMatchObject({ title: 'Kết bạn thành công', message: 'Linh đã chấp nhận lời mời kết bạn của bạn', path: '/friends' });
});

test('an invite to eat names the host', () => {
  expect(noticeForInboxItem(item({ type: 'room_invite', title: 'Trí', body: 'rủ bạn đi ăn' })))
    .toMatchObject({ title: 'Rủ đi ăn', message: 'Trí rủ bạn đi ăn', path: '/inbox' });
});

test('a sender the server could not name falls back to the generic body', () => {
  expect(noticeForInboxItem(item({ title: 'Lời mời kết bạn', body: 'Bạn có lời mời kết bạn mới' })).message).toBe('Bạn có lời mời kết bạn mới');
});

test('a result opens through its own event, decided or not', () => {
  const decided = noticeForInboxItem(item({ type: 'room_result', title: 'Đã chốt món', body: 'Nhóm chọn: Cơm sườn' }));
  expect(decided).toMatchObject({ icon: 'check', path: `/inbox?openEventId=${base.eventId}` });
  const none = noticeForInboxItem(item({ type: 'room_result', title: 'Chưa chốt được món', body: 'Phòng kết thúc mà chưa có món chung' }));
  expect(none).toMatchObject({ icon: 'bell', title: 'Chưa chốt được món' });
});

test('old unread rows collapse into one summary', () => {
  expect(summaryNotice(1).message).toBe('Bạn có 1 thông báo chưa đọc');
  expect(summaryNotice(4).message).toBe('Bạn có 4 thông báo chưa đọc');
});

test('a result banner is skipped only for the room the person is in', () => {
  const result = item({ type: 'room_result', metadata: { roomId: 'room-a', resultId: 'r' } });
  expect(isRoomResultForCurrentRoom(result, '/room/vote', 'room-a')).toBe(true);
  expect(isRoomResultForCurrentRoom(result, '/room/vote', 'room-b')).toBe(false);
  expect(isRoomResultForCurrentRoom(result, '/', undefined)).toBe(false);
  expect(isRoomResultForCurrentRoom(item({ type: 'room_invite', metadata: { roomId: 'room-a' } }), '/room/lobby', 'room-a')).toBe(false);
});
