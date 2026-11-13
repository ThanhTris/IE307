import { MOCK_DEFAULT_ROOM_CODE, createMockApiClient } from '../mocks/api/mockApiClient';
import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReadResult, RoomSnapshot, SessionUser } from '../../src/data/api/contracts';
import { HomeScreen, type HomeLiveSession } from '../../src/features/home/screens/HomeScreen';
import { ContinueSessionScreen } from '../../src/features/home/screens/ContinueSessionScreen';
import { GuestSessionExpiredScreen } from '../../src/features/home/screens/GuestSessionExpiredScreen';

const user: SessionUser = { id: 'gm09-home-test-user', displayName: 'Minh', isGuest: true, createdAt: '2026-11-01T00:00:00Z' };
const receipt = { roomId: 'room_mock_001', code: MOCK_DEFAULT_ROOM_CODE, version: 1, role: 'host' as const };
const client = () => createMockApiClient({ currentUser: user, delayMs: 0 });
const session = (): HomeLiveSession => ({ status: 'active', issue: 'none', user, isInitializing: false, ensureSession: jest.fn(), restoreSession: jest.fn(), logout: jest.fn() });
const press = async (label: string) => { await fireEvent.press(screen.getByRole('button', { name: label })); };
function deferred<T>() { let resolve!: (result: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test.each(['loading', 'error', 'empty'] as const)('friends %s does not block create/join or invent presence', async state => {
  const repository = client();
  jest.spyOn(repository, 'listFriends').mockImplementation(() => state === 'loading' ? new Promise(() => {}) : Promise.resolve(state === 'error' ? { ok: false, error: { messageKey: 'NETWORK_ERROR' } } : { ok: true, data: [] }));
  const onCreate = jest.fn(), onJoin = jest.fn();
  await render(<HomeScreen repository={repository} liveSession={session()} onCreate={onCreate} onJoin={onJoin} onResume={jest.fn()} />);
  await (state === 'loading' ? screen.findByLabelText('Đang tải bạn bè') : screen.findByText(state === 'error' ? 'Chưa tải được bạn bè' : 'Mời bạn để bắt đầu kèo nhanh.'));
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Tham gia phòng' })).toBeEnabled();
  expect(screen.queryByLabelText('Đang hoạt động')).toBeNull();
  expect(screen.queryByText('Linh')).toBeNull();
  await press('Tạo phòng'); await press('Tham gia phòng');
  expect(onCreate).toHaveBeenCalledTimes(1); expect(onJoin).toHaveBeenCalledTimes(1);
});

test('friends retry only retries the read, and disabled CTAs do not navigate', async () => {
  const repository = client();
  const friends = jest.spyOn(repository, 'listFriends').mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } }).mockResolvedValue({ ok: true, data: [] });
  const create = jest.spyOn(repository, 'createRoom'), join = jest.spyOn(repository, 'joinRoom');
  await render(<HomeScreen repository={repository} liveSession={session()} onCreate={jest.fn()} onJoin={jest.fn()} onResume={jest.fn()} />);
  await screen.findByText('Chưa tải được bạn bè'); await press('Tải lại bạn bè');
  await screen.findByText('Mời bạn để bắt đầu kèo nhanh.');
  expect(friends).toHaveBeenCalledTimes(2); expect(create).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
});

test.each(['loading', 'restore-error', 'blocked-with-cached-user'] as const)('session %s blocks room and friends reads and navigation', async state => {
  const repository = client();
  const friends = jest.spyOn(repository, 'listFriends'), room = jest.spyOn(repository, 'getRoomSnapshot');
  const live = session();
  live.isInitializing = state === 'loading'; live.issue = 'restore-unavailable'; live.status = 'lost';
  if (state !== 'blocked-with-cached-user') live.user = null;
  const onCreate = jest.fn();
  await render(<HomeScreen repository={repository} activeRoom={receipt} liveSession={live} onCreate={onCreate} onJoin={jest.fn()} onResume={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
  await press('Tạo phòng');
  expect(onCreate).not.toHaveBeenCalled(); expect(friends).not.toHaveBeenCalled(); expect(room).not.toHaveBeenCalled();
  expect(live.ensureSession).not.toHaveBeenCalled();
});

test('saved receipt is checked before offering continuation; ended room enables a new entry', async () => {
  const repository = client();
  const data = await repository.getRoomSnapshot(receipt.roomId);
  if (!data.ok) throw new Error('Missing fixture');
  const pending = deferred<ReadResult<RoomSnapshot>>();
  jest.spyOn(repository, 'getRoomSnapshot').mockReturnValue(pending.promise);
  await render(<HomeScreen repository={repository} liveSession={session()} activeRoom={receipt} onCreate={jest.fn()} onJoin={jest.fn()} onResume={jest.fn()} />);
  expect(screen.getByText('Đang kiểm tra phòng đã lưu…')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Tiếp tục phiên' })).toBeNull();
  await act(async () => pending.resolve({ ok: true, data: { ...data.data, state: 'EXPIRED' } }));
  expect(screen.getByText('Phòng đã hết hạn')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
});

test('Home offers continuation only for a verified member room', async () => {
  const repository = client(), onResume = jest.fn();
  await render(<HomeScreen repository={repository} liveSession={session()} activeRoom={receipt} onCreate={jest.fn()} onJoin={jest.fn()} onResume={onResume} />);
  await screen.findByRole('button', { name: 'Tiếp tục phiên' });
  await press('Tiếp tục phiên');
  expect(onResume).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
});

test('focus refresh hides the old active room until a fresh response arrives', async () => {
  const repository = client(), result = await repository.getRoomSnapshot(receipt.roomId);
  const pending = deferred<ReadResult<RoomSnapshot>>();
  jest.spyOn(repository, 'getRoomSnapshot').mockResolvedValueOnce(result).mockReturnValue(pending.promise);
  const props = { repository, liveSession: session(), activeRoom: receipt, onCreate: jest.fn(), onJoin: jest.fn(), onResume: jest.fn() };
  const view = await render(<HomeScreen {...props} roomRevision={1} />);
  await screen.findByRole('button', { name: 'Tiếp tục phiên' });
  await view.rerender(<HomeScreen {...props} roomRevision={2} />);
  expect(screen.queryByRole('button', { name: 'Tiếp tục phiên' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
  await act(async () => pending.resolve({ ok: false, error: { messageKey: 'ROOM_EXPIRED' } }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
});

test.each(['NOT_MEMBER', 'ROOM_NOT_FOUND', 'ROOM_EXPIRED'] as const)('unavailable saved room %s does not trap Home or expose a roster', async messageKey => {
  const repository = client();
  jest.spyOn(repository, 'getRoomSnapshot').mockResolvedValue({ ok: false, error: { messageKey } });
  await render(<HomeScreen repository={repository} liveSession={session()} activeRoom={receipt} onCreate={jest.fn()} onJoin={jest.fn()} onResume={jest.fn()} />);
  await screen.findByText('Không thể tiếp tục phòng đã lưu');
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Tiếp tục phiên' })).toBeNull();
});

test('room network retry preserves the receipt and does not create or join', async () => {
  const repository = client(), onContinue = jest.fn();
  const original = repository.getRoomSnapshot.bind(repository);
  const read = jest.spyOn(repository, 'getRoomSnapshot').mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } }).mockImplementation(original);
  const create = jest.spyOn(repository, 'createRoom'), join = jest.spyOn(repository, 'joinRoom');
  await render(<ContinueSessionScreen repository={repository} receipt={receipt} userId={user.id} onHome={jest.fn()} onContinue={onContinue} />);
  await screen.findByText('Chưa kiểm tra được phòng');
  expect(screen.getByRole('button', { name: 'Tiếp tục phiên' })).toBeDisabled();
  await press('Tiếp tục phiên'); expect(onContinue).not.toHaveBeenCalled();
  await press('Kiểm tra lại phòng');
  await screen.findByText('Bạn có phiên đang diễn ra');
  expect(read.mock.calls).toEqual([[receipt.roomId], [receipt.roomId]]);
  await press('Tiếp tục phiên'); expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ roomId: receipt.roomId, state: 'LOBBY' }));
  expect(create).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
});

test.each(['wrong-room', 'old-version', 'not-member'] as const)('continue rejects %s without rendering its identity', async invalid => {
  const repository = client(), result = await repository.getRoomSnapshot(receipt.roomId);
  if (!result.ok) throw new Error('Missing fixture');
  const data = { ...result.data, roomId: invalid === 'wrong-room' ? 'foreign' : receipt.roomId, version: invalid === 'old-version' ? 0 : 1, members: invalid === 'not-member' ? [] : result.data.members };
  jest.spyOn(repository, 'getRoomSnapshot').mockResolvedValue({ ok: true, data });
  await render(<ContinueSessionScreen repository={repository} receipt={receipt} userId={user.id} onHome={jest.fn()} onContinue={jest.fn()} />);
  await screen.findByText(invalid === 'not-member' ? 'Không thể tiếp tục phòng này' : 'Chưa kiểm tra được phòng');
  expect(screen.queryByText('Phòng của Minh')).toBeNull();
  expect(screen.getByRole('button', { name: 'Tiếp tục phiên' })).toBeDisabled();
});

test.each(['EXPIRED', 'CANCELLED', 'DECIDED', 'NO_CONSENSUS', 'FINALIZED', 'COMPLETED'] as const)('continue does not label terminal state %s as active', async state => {
  const repository = client(), result = await repository.getRoomSnapshot(receipt.roomId);
  if (!result.ok) throw new Error('Missing fixture');
  jest.spyOn(repository, 'getRoomSnapshot').mockResolvedValue({ ok: true, data: { ...result.data, state } });
  await render(<ContinueSessionScreen repository={repository} receipt={receipt} userId={user.id} onHome={jest.fn()} onContinue={jest.fn()} />);
  await screen.findByText(state === 'EXPIRED' ? 'Phòng đã hết hạn' : 'Phòng đã kết thúc');
  expect(screen.getByRole('button', { name: 'Tiếp tục phiên' })).toBeDisabled();
});

test('continue never reads a private snapshot before identity is available', async () => {
  const repository = client(), read = jest.spyOn(repository, 'getRoomSnapshot');
  await render(<ContinueSessionScreen repository={repository} receipt={receipt} enabled={false} onHome={jest.fn()} onContinue={jest.fn()} />);
  expect(screen.getByText('Cần khôi phục danh tính')).toBeOnTheScreen(); expect(read).not.toHaveBeenCalled();
});

test('late room read cannot replace a changed receipt or navigate after unmount', async () => {
  const repository = client(), result = await repository.getRoomSnapshot(receipt.roomId);
  if (!result.ok) throw new Error('Missing fixture');
  const old = deferred<ReadResult<RoomSnapshot>>(), onContinue = jest.fn();
  jest.spyOn(repository, 'getRoomSnapshot').mockReturnValueOnce(old.promise).mockResolvedValue({ ok: false, error: { messageKey: 'ROOM_NOT_FOUND' } });
  const view = await render(<ContinueSessionScreen repository={repository} receipt={receipt} userId={user.id} onHome={jest.fn()} onContinue={onContinue} />);
  await view.rerender(<ContinueSessionScreen repository={repository} receipt={{ ...receipt, roomId: 'new' }} userId={user.id} onHome={jest.fn()} onContinue={onContinue} />);
  await screen.findByText('Không thể tiếp tục phòng này');
  await act(async () => old.resolve(result));
  expect(screen.queryByText('Bạn có phiên đang diễn ra')).toBeNull(); expect(onContinue).not.toHaveBeenCalled();
  await view.unmount(); expect(onContinue).not.toHaveBeenCalled();
});

test('expired guest requires explicit reset, retains an error and locks duplicate reset', async () => {
  const pending = deferred<boolean>();
  const onReset = jest.fn().mockResolvedValueOnce(false).mockReturnValue(pending.promise), onHome = jest.fn();
  await render(<GuestSessionExpiredScreen onReset={onReset} onHome={onHome} />);
  expect(onReset).not.toHaveBeenCalled();
  await press('Nhập tên'); await screen.findByText('Chưa xóa được phiên cũ');
  await press('Nhập tên'); await press('Nhập tên'); await press('Quay lại');
  expect(onReset).toHaveBeenCalledTimes(2); expect(onHome).not.toHaveBeenCalled();
  await act(async () => pending.resolve(true));
  expect(screen.getByRole('button', { name: 'Nhập tên' })).toBeDisabled();
});
