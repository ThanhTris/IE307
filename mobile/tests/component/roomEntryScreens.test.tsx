import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { createApiClient, MOCK_DEFAULT_ROOM_CODE } from '../../src/data/api';
import type { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, WriteResult } from '../../src/data/api/contracts';
import { HomeScreen } from '../../src/features/home/screens/HomeScreen';
import { CreateRoomScreen } from '../../src/features/rooms/screens/CreateRoomScreen';
import { JoinRoomScreen } from '../../src/features/rooms/screens/JoinRoomScreen';
import { RoomEntryReceiptScreen } from '../../src/features/rooms/screens/RoomEntryReceiptScreen';
import { errorCopy, type RoomEntryRepository } from '../../src/features/rooms/services/roomEntry';

const client = () => createApiClient('mock', { delayMs: 0 });
const press = async (name: string) => { await fireEvent.press(screen.getByRole('button', { name })); };
const input = async (label: string, value: string) => { await fireEvent.changeText(screen.getByLabelText(label), value); };
const homeProps = { sessionToken: 'fixture', onCreate: jest.fn(), onJoin: jest.fn(), onResume: jest.fn(), onOpenFoundation: jest.fn() };

async function createForm(repository: RoomEntryRepository = client(), onEntered = jest.fn()) {
  const original = repository.getDiscoveryContext.bind(repository);
  repository.getDiscoveryContext = async () => {
    const result = await original();
    return result.ok ? { ok: true, data: { ...result.data, serverTime: '2030-10-12T05:00:00.000Z' } } : result;
  };
  await render(<CreateRoomScreen repository={repository} onBack={jest.fn()} onEntered={onEntered} />);
  await screen.findByRole('button', { name: 'Hồ Con Rùa' });
  await input('Tên của bạn (chủ phòng)', ' Tuấn ');
  await press('Hồ Con Rùa');
  await press('Tôi xác nhận điểm ăn, buổi và giờ');
  return { repository, onEntered };
}

async function joinForm(repository: RoomEntryRepository = client(), onEntered = jest.fn()) {
  await render(<JoinRoomScreen repository={repository} sampleCode={MOCK_DEFAULT_ROOM_CODE} onBack={jest.fn()} onEntered={onEntered} />);
  await input('Tên của bạn', ' Tuấn ');
  await input('Mã phòng (6 ký tự)', ' gcd234 ');
  return { repository, onEntered };
}

test('home loads guest and friends, exposes CTA and explains manual location privacy', async () => {
  await render(<HomeScreen repository={client()} {...homeProps} />);
  expect(await screen.findByText(/Chào /)).toBeOnTheScreen();
  expect(screen.getByText('Khách · phiên mô phỏng')).toBeOnTheScreen();
  expect(screen.getByLabelText('Danh sách bạn ăn cùng')).toBeOnTheScreen();
  expect(screen.getByText('Điểm ăn chung, không chia sẻ GPS')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Xem cấu trúc ứng dụng' })).toBeNull();
  await press('Công cụ kiểm thử');
  expect(screen.getByRole('button', { name: 'Công cụ kiểm thử' }).props.accessibilityState.expanded).toBe(true);
  expect(screen.getByRole('button', { name: 'Xem cấu trúc ứng dụng' })).toBeOnTheScreen();
  await press('Công cụ kiểm thử');
  expect(screen.queryByRole('button', { name: 'Xem cấu trúc ứng dụng' })).toBeNull();
  await press('＋ Tạo kèo ăn');
  await press('Tôi có mã phòng');
  expect(homeProps.onCreate).toHaveBeenCalledTimes(1);
  expect(homeProps.onJoin).toHaveBeenCalledTimes(1);
});

test('home empty friends is distinct from session failure', async () => {
  await render(<HomeScreen repository={createApiClient('mock', { mode: 'empty', delayMs: 0 })} {...homeProps} />);
  expect(await screen.findByText('Chưa có bạn ăn cùng')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '＋ Tạo kèo ăn' })).toBeEnabled();
});

test.each(['AUTH_REQUIRED', 'NETWORK_ERROR'] as const)('home %s disables entry and offers restore retry', async messageKey => {
  await render(<HomeScreen repository={createApiClient('mock', { mode: 'error', simulatedErrorCode: messageKey, delayMs: 0 })} {...homeProps} />);
  expect(await screen.findByText(errorCopy[messageKey])).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '＋ Tạo kèo ăn' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Thử tải lại' })).toBeEnabled();
});

test('home active receipt prevents opening a second room and resumes through callback', async () => {
  await render(<HomeScreen repository={client()} {...homeProps} activeRoom={{ roomId: 'r', code: 'ABC234', version: 2, role: 'host' }} />);
  await screen.findByText(/Chào /);
  expect(screen.getByRole('button', { name: 'Tôi có mã phòng' })).toBeDisabled();
  await press('Quay lại phòng mô phỏng');
  expect(homeProps.onResume).toHaveBeenCalled();
});

test('create validates name and host confirmation before any write', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'createRoom');
  await render(<CreateRoomScreen repository={repository} onBack={jest.fn()} onEntered={jest.fn()} />);
  await screen.findByRole('button', { name: 'Hồ Con Rùa' });
  await press('Tạo phòng mô phỏng');
  expect(screen.getByRole('alert')).toHaveTextContent(/Tên của bạn/);
  await input('Tên của bạn (chủ phòng)', 'Tuấn');
  await press('Hồ Con Rùa');
  await press('Tạo phòng mô phỏng');
  expect(screen.getByRole('alert')).toHaveTextContent(/Hãy xác nhận/);
  expect(spy).not.toHaveBeenCalled();
});

test('create sends DTO with public anchor, metres, nullable budget and adapter-generated code', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'createRoom');
  const { onEntered } = await createForm(repository);
  await press('Tạo phòng mô phỏng');
  await waitFor(() => expect(onEntered).toHaveBeenCalledTimes(1));
  expect(spy.mock.calls[0]?.[0]).toMatchObject({ displayName: 'Tuấn', context: { anchorId: 'anc_ho_con_rua', radiusM: 2000, mealSlot: 'lunch', budget: null, avoidRecent: false, serviceMode: 'dine_in' } });
  const sent = spy.mock.calls[0]?.[0] as CreateRoomRequest;
  expect(sent.context.desiredAt).toBe('2030-10-12T05:15:00.000Z');
  expect(sent.context).not.toHaveProperty('lat');
  expect(sent.context).not.toHaveProperty('lng');
  expect(onEntered.mock.calls[0]?.[0]).toMatchObject({ role: 'host', code: expect.stringMatching(/^[A-HJ-NP-Z2-9]{6}$/) });
});

test('context edits clear confirmation; custom time is UTC+7 with no extra buffer', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'createRoom');
  await createForm(repository);
  await press('Hẹn giờ');
  await input('Giờ hẹn (UTC+7)', '2030-10-12 13:30');
  await input('Ngân sách tham khảo (VNĐ/người)', '70000');
  expect(screen.getByRole('button', { name: 'Tôi xác nhận điểm ăn, buổi và giờ' }).props.accessibilityState.selected).toBe(false);
  await press('Tôi xác nhận điểm ăn, buổi và giờ');
  await press('Tạo phòng mô phỏng');
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  expect(spy.mock.calls[0]?.[0].context).toMatchObject({ desiredAt: '2030-10-12T06:30:00.000Z', budget: 70000 });
});

test.each(['2030-10-12 11:59', '2030-02-31 13:00', '12:30'])('create rejects past/invalid time %s without write', async value => {
  const repository = client();
  const spy = jest.spyOn(repository, 'createRoom');
  await createForm(repository);
  await press('Hẹn giờ');
  await input('Giờ hẹn (UTC+7)', value);
  await press('Tôi xác nhận điểm ăn, buổi và giờ');
  await press('Tạo phòng mô phỏng');
  expect(screen.getByRole('alert')).toBeOnTheScreen();
  expect(spy).not.toHaveBeenCalled();
});

test('create empty discovery disables write; GPS-denied mock keeps manual path', async () => {
  await render(<CreateRoomScreen repository={createApiClient('mock', { mode: 'empty', delayMs: 0 })} onBack={jest.fn()} onEntered={jest.fn()} />);
  expect(await screen.findByText('Chưa có điểm ăn trong vùng')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tạo phòng mô phỏng' })).toBeDisabled();
  await press('Công cụ kiểm thử');
  await press('Thử gợi ý vị trí (mô phỏng từ chối)');
  expect(screen.getByText('Chưa có quyền vị trí · mô phỏng')).toBeOnTheScreen();
});

test.each(['OUT_OF_COVERAGE', 'RATE_LIMITED'] as const)('create renders %s from adapter without inventing a room', async messageKey => {
  const repository = client();
  jest.spyOn(repository, 'createRoom').mockResolvedValue({ ok: false, error: { messageKey } });
  const { onEntered } = await createForm(repository);
  await press('Tạo phòng mô phỏng');
  expect(await screen.findByText(errorCopy[messageKey])).toBeOnTheScreen();
  expect(onEntered).not.toHaveBeenCalled();
});

test('loading locks form/back and ignores duplicate create; completion uses adapter receipt', async () => {
  const repository = client();
  let resolve!: (result: WriteResult<CreateRoomResponse>) => void;
  const spy = jest.spyOn(repository, 'createRoom').mockImplementation(() => new Promise(done => { resolve = done; }));
  const { onEntered } = await createForm(repository);
  await press('Tạo phòng mô phỏng');
  await press('Tạo phòng mô phỏng');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: '‹ Quay lại' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Công cụ kiểm thử' })).toBeDisabled();
  expect(screen.getByLabelText('Tên của bạn (chủ phòng)').props.editable).toBe(false);
  await act(async () => resolve({ ok: true, data: { roomId: 'r-real-response', code: 'XYZ789', version: 3, expiresAt: '2030-10-12T07:00:00Z' } }));
  expect(onEntered).toHaveBeenCalledWith({ roomId: 'r-real-response', code: 'XYZ789', version: 3, role: 'host' });
});

test('unknown create delivery retry retains requestId, context and name', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'createRoom').mockResolvedValueOnce({ ok: false, error: { messageKey: 'TIMEOUT' } });
  const { onEntered } = await createForm(repository);
  await press('Tạo phòng mô phỏng');
  await screen.findByText(errorCopy.TIMEOUT);
  expect(screen.getByLabelText('Tên của bạn (chủ phòng)').props.editable).toBe(false);
  await press('Thử lại cùng yêu cầu tạo phòng');
  await waitFor(() => expect(onEntered).toHaveBeenCalled());
  expect(spy.mock.calls[0]?.[0]).toEqual(spy.mock.calls[1]?.[0]);
});

test('join input is normalized, validated and explicitly confirmed before adapter call', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'joinRoom');
  const { onEntered } = await joinForm(repository);
  expect(screen.getByLabelText('Mã phòng (6 ký tự)').props.keyboardType).toBe('default');
  await press('Vào phòng →');
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByText(/Vào phòng #GCD234 với tên Tuấn/)).toBeOnTheScreen();
  await press('Xác nhận vào phòng mô phỏng');
  await waitFor(() => expect(onEntered).toHaveBeenCalled());
  expect(spy.mock.calls[0]?.[0]).toMatchObject({ code: 'GCD234', displayName: 'Tuấn', requestId: expect.any(String) });
  expect(onEntered).toHaveBeenCalledWith(expect.objectContaining({ code: 'GCD234', roomId: 'room_mock_001', role: 'member' }));
});

test.each(['123456', 'ABCD23x', 'AB C23'])('join invalid code %s never calls adapter', async code => {
  const repository = client();
  const spy = jest.spyOn(repository, 'joinRoom');
  await joinForm(repository);
  await input('Mã phòng (6 ký tự)', code);
  await press('Vào phòng →');
  expect(screen.getByRole('alert')).toHaveTextContent(/Mã cần đúng 6/);
  expect(spy).not.toHaveBeenCalled();
});

test.each(['ROOM_FULL', 'ROOM_LOCKED', 'ROOM_EXPIRED', 'ROOM_NOT_FOUND', 'NETWORK_ERROR', 'VERSION_CONFLICT'] as const)('join renders contract error %s without success', async messageKey => {
  const repository = createApiClient('mock', { mode: 'error', simulatedErrorCode: messageKey, delayMs: 0 });
  const { onEntered } = await joinForm(repository);
  await press('Vào phòng →');
  await press('Xác nhận vào phòng mô phỏng');
  expect(await screen.findByText(errorCopy[messageKey])).toBeOnTheScreen();
  expect(onEntered).not.toHaveBeenCalled();
});

test('join network retry preserves payload/requestId and blocks edits', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'joinRoom').mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const { onEntered } = await joinForm(repository);
  await press('Vào phòng →');
  await press('Xác nhận vào phòng mô phỏng');
  await screen.findByText(errorCopy.NETWORK_ERROR);
  expect(screen.getByLabelText('Mã phòng (6 ký tự)').props.editable).toBe(false);
  await press('Thử lại cùng yêu cầu vào phòng');
  await waitFor(() => expect(onEntered).toHaveBeenCalled());
  expect(spy.mock.calls[0]?.[0] as JoinRoomRequest).toEqual(spy.mock.calls[1]?.[0]);
});

test('QR denial falls back to manual; scanned input never auto-joins', async () => {
  const repository = client();
  const spy = jest.spyOn(repository, 'joinRoom');
  const scan = jest.fn().mockResolvedValueOnce({ status: 'denied' }).mockResolvedValueOnce({ status: 'scanned', code: 'gcd234' });
  await render(<JoinRoomScreen repository={repository} onBack={jest.fn()} onEntered={jest.fn()} onScan={scan} />);
  await press('Quét mã QR');
  await press('Thử quét QR');
  expect(await screen.findByText(/Camera bị từ chối/)).toBeOnTheScreen();
  await press('Thử quét QR');
  expect((await screen.findByLabelText('Mã phòng (6 ký tự)')).props.value).toBe('GCD234');
  expect(spy).not.toHaveBeenCalled();
});

test('unmount ignores a late create response instead of navigating stale screen', async () => {
  const repository = client();
  let resolve!: (result: WriteResult<CreateRoomResponse>) => void;
  jest.spyOn(repository, 'createRoom').mockImplementation(() => new Promise(done => { resolve = done; }));
  const onEntered = jest.fn();
  await createForm(repository, onEntered);
  await press('Tạo phòng mô phỏng');
  await act(async () => { screen.unmount(); });
  await act(async () => resolve({ ok: true, data: { roomId: 'r', code: 'ABC234', version: 1, expiresAt: '2030-10-12T07:00:00Z' } }));
  expect(onEntered).not.toHaveBeenCalled();
});

test('receipt keeps context from snapshot and offers typed downstream callbacks only', async () => {
  const repository = client();
  const ready = jest.spyOn(repository, 'setReady');
  const start = jest.spyOn(repository, 'startRound');
  const onPreferences = jest.fn();
  const receipt = { roomId: 'room_mock_001', code: 'GCD234', version: 1, role: 'member' as const };
  await render(<RoomEntryReceiptScreen repository={repository} receipt={receipt} onBack={jest.fn()} onPreferences={onPreferences} />);
  expect(await screen.findByText('Hồ Con Rùa')).toBeOnTheScreen();
  await press('Chọn khẩu vị →');
  expect(onPreferences).toHaveBeenCalledWith(receipt);
  expect(ready).not.toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();
});
