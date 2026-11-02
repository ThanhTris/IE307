import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createApiClient } from '../../src/data/api';
import type { JoinRoomResponse, ReadResult, WriteResult } from '../../src/data/api/contracts';
import { JoinRoomEntryScreen, type JoinRoomEntryProps } from '../../src/features/rooms/screens/JoinRoomEntryScreen';
import { createJoinPreviewFixture, type JoinRoomPublicPreview } from '../../src/features/rooms/services/joinPreview';

const press = async (label: string) => { await fireEvent.press(screen.getByRole('button', { name: label })); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function props(): JoinRoomEntryProps { return { repository: createApiClient('mock', { delayMs: 0 }), preview: createJoinPreviewFixture(), initialCode: 'gcd234', initialDisplayName: ' Minh ', onBack: jest.fn(), onEntered: jest.fn() }; }

test('preview shows count only, ignores supplied private fields, and confirmation is the only join mutation', async () => {
  const p = props(), client = p.repository as ReturnType<typeof createApiClient>;
  const join = jest.spyOn(client, 'joinRoom'), snapshot = jest.spyOn(client, 'getRoomSnapshot');
  p.preview = jest.fn().mockResolvedValue({ ok: true, data: { code: 'GCD234', memberCount: 2, capacity: 20, members: [{ displayName: 'PRIVATE ROSTER' }], ownVotes: { secret: 'WANT' } } });
  await render(<JoinRoomEntryScreen {...p} />);
  expect(join).not.toHaveBeenCalled();
  await press('Tiếp tục →');
  expect(screen.getByText('2/20 thành viên')).toBeOnTheScreen();
  expect(screen.queryByText('PRIVATE ROSTER')).toBeNull();
  expect(snapshot).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
  await press('Xác nhận vào phòng');
  expect(join).toHaveBeenCalledWith(expect.objectContaining({ code: 'GCD234', displayName: 'Minh' }));
  expect(p.onEntered).toHaveBeenCalledWith(expect.objectContaining({ role: 'member', code: 'GCD234' }));
});

test.each(['', 'ABC', 'ABC01I'])('invalid code %s never previews or joins', async initialCode => {
  const p = props(); p.initialCode = initialCode; p.preview = jest.fn();
  const join = jest.spyOn(p.repository, 'joinRoom');
  await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →');
  expect(screen.getByRole('alert')).toBeOnTheScreen(); expect(p.preview).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
});

test.each(['full', 'locked', 'expired', 'lost-session', 'network'] as const)('preview %s keeps inputs and never offers confirmation or joins', async scenario => {
  const p = props(); p.preview = createJoinPreviewFixture(scenario);
  const join = jest.spyOn(p.repository, 'joinRoom');
  await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →');
  expect(await screen.findByText(scenario === 'full' ? 'Phòng đã đủ 20 người' : scenario === 'expired' ? 'Phòng đã hết hạn' : 'Không thể kiểm tra phòng')).toBeOnTheScreen();
  await press('Quay lại');
  expect(screen.getByLabelText('Mã phòng (6 ký tự)')).toHaveDisplayValue('GCD234');
  expect(screen.queryByRole('button', { name: 'Xác nhận vào phòng' })).toBeNull(); expect(join).not.toHaveBeenCalled();
});

test('unknown join retry reuses frozen input/request ID; new route code and duplicate clicks cannot replace it', async () => {
  const p = props(), pending = deferred<WriteResult<JoinRoomResponse>>();
  const join = jest.spyOn(p.repository, 'joinRoom').mockReturnValueOnce(pending.promise).mockResolvedValue({ ok: true, data: { roomId: 'r', code: 'GCD234', version: 2, memberId: 'me' } });
  const view = await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →'); await press('Xác nhận vào phòng'); await press('Xác nhận vào phòng');
  expect(join).toHaveBeenCalledTimes(1);
  await view.rerender(<JoinRoomEntryScreen {...p} initialCode="XYZ789" />);
  await act(async () => pending.resolve({ ok: false, error: { messageKey: 'TIMEOUT' } }));
  expect(screen.getByText('Phòng GCD234')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Nhập mã khác' })).toBeDisabled();
  await press('Quay lại'); expect(p.onBack).not.toHaveBeenCalled();
  await press('Thử lại cùng yêu cầu vào phòng');
  expect(join).toHaveBeenCalledTimes(2);
  expect(join.mock.calls[1]?.[0]).toEqual(join.mock.calls[0]?.[0]); expect(p.onEntered).toHaveBeenCalledTimes(1);
});

test('a distinct confirmed intent after a definite error gets a new request ID', async () => {
  const p = props();
  const join = jest.spyOn(p.repository, 'joinRoom').mockResolvedValue({ ok: false, error: { messageKey: 'ROOM_FULL' } });
  await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →'); await press('Xác nhận vào phòng');
  await press('Nhập mã khác'); await press('Tiếp tục →'); await press('Xác nhận vào phòng');
  expect(join).toHaveBeenCalledTimes(2);
  expect(join.mock.calls[0]?.[0]?.requestId).not.toBe(join.mock.calls[1]?.[0]?.requestId);
});

test('cancel and warm incoming code invalidate preview without joining', async () => {
  const p = props(), join = jest.spyOn(p.repository, 'joinRoom');
  const view = await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →'); await press('Nhập mã khác');
  expect(screen.queryByText('2/20 thành viên')).toBeNull();
  await press('Tiếp tục →');
  await view.rerender(<JoinRoomEntryScreen {...p} initialCode="XYZ789" />);
  expect(screen.queryByText('2/20 thành viên')).toBeNull(); expect(join).not.toHaveBeenCalled();
});

test.each(['denied', 'unavailable', 'error', 'scanned'] as const)('QR %s always retains manual entry and never auto-joins', async status => {
  const p = props(), join = jest.spyOn(p.repository, 'joinRoom');
  p.onScan = status === 'error' ? jest.fn().mockRejectedValue(new Error('camera')) : jest.fn().mockResolvedValue(status === 'scanned' ? { status, code: 'gcd234' } : { status });
  p.preview = jest.fn();
  await render(<JoinRoomEntryScreen {...p} />); await press('Quét mã QR'); await press('Thử quét QR');
  if (status !== 'scanned') await press('Nhập mã bằng tay');
  expect(screen.getByLabelText('Mã phòng (6 ký tự)')).toBeOnTheScreen();
  expect(p.preview).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
});

test('a missing live preview port stays unavailable without falling back to mock', async () => {
  const p = props(); p.preview = undefined;
  const join = jest.spyOn(p.repository, 'joinRoom');
  await render(<JoinRoomEntryScreen {...p} isMock={false} />);
  expect(screen.getByRole('button', { name: 'Tiếp tục →' })).toBeDisabled();
  expect(screen.queryByText('Mô phỏng · GM-09 · dữ liệu mẫu')).toBeNull(); expect(join).not.toHaveBeenCalled();
});

test.each([
  { code: 'FOREIGN', memberCount: 2, capacity: 20 },
  { code: 'GCD234', memberCount: 2, capacity: 21 },
  { code: 'GCD234', memberCount: -1, capacity: 20 },
])('malformed preview $code/$memberCount/$capacity never enables join', async data => {
  const p = props(); p.preview = jest.fn().mockResolvedValue({ ok: true, data });
  await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →');
  expect(await screen.findByText('Không thể kiểm tra phòng')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Xác nhận vào phòng' })).toBeNull();
});

test('unmounted preview ignores a late private response', async () => {
  const p = props(), pending = deferred<ReadResult<JoinRoomPublicPreview>>(); p.preview = () => pending.promise;
  const view = await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →'); await view.unmount();
  await act(async () => pending.resolve({ ok: true, data: { code: 'GCD234', memberCount: 2, capacity: 20 } }));
  expect(p.onEntered).not.toHaveBeenCalled();
});

test('Back can cancel a pending read without abandoning a join intent', async () => {
  const p = props(), pending = deferred<ReadResult<JoinRoomPublicPreview>>(); p.preview = () => pending.promise;
  const join = jest.spyOn(p.repository, 'joinRoom');
  await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →');
  expect(screen.getByRole('button', { name: 'Quay lại' })).toBeEnabled();
  await press('Quay lại'); expect(p.onBack).toHaveBeenCalledTimes(1); expect(join).not.toHaveBeenCalled();
  await act(async () => pending.resolve({ ok: true, data: { code: 'GCD234', memberCount: 2, capacity: 20 } }));
  expect(screen.queryByText('2/20 thành viên')).toBeNull();
});

test('Back from confirmation returns to the entered code without a join', async () => {
  const p = props(), join = jest.spyOn(p.repository, 'joinRoom');
  await render(<JoinRoomEntryScreen {...p} />); await press('Tiếp tục →');
  expect(screen.queryByLabelText('Mã phòng (6 ký tự)')).toBeNull();
  await press('Quay lại');
  expect(screen.getByLabelText('Mã phòng (6 ký tự)')).toHaveDisplayValue('GCD234');
  expect(p.onBack).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
});

test('a guest without a received name can enter it; failed reads preserve the draft', async () => {
  const p = props(); p.initialCode = ''; p.initialDisplayName = ''; p.preview = createJoinPreviewFixture('network');
  await render(<JoinRoomEntryScreen {...p} />);
  await fireEvent.changeText(screen.getByLabelText('Tên của bạn'), 'Tên khách');
  await fireEvent.changeText(screen.getByLabelText('Mã phòng (6 ký tự)'), 'gcd234');
  await press('Tiếp tục →'); await screen.findByText('Không thể kiểm tra phòng');
  await press('Sửa mã phòng');
  expect(screen.getByLabelText('Tên của bạn')).toHaveDisplayValue('Tên khách');
  expect(screen.getByLabelText('Mã phòng (6 ký tự)')).toHaveDisplayValue('GCD234');
});
