import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FinalRoundScreen, VoteScreen } from '../../src/features/voting';
import { RequireActiveSession } from '../../src/features/auth/components/RequireActiveSession';
import { RoundTwoSkeleton } from '../../src/features/voting/components/RoundTwoSkeleton';
import { VoteSkeleton } from '../../src/features/voting/components/VoteSkeleton';

let mockLive: Record<string, unknown> = { isInitializing: true, status: 'empty', user: null, issue: 'none' };
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: () => mockLive }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>);

test('the round 1 skeleton has the flashcard layout (title, progress, card) and no home-style header', async () => {
  await wrap(<VoteSkeleton />);
  expect(screen.getByLabelText('Đang tải phòng bình chọn')).toBeOnTheScreen();
  expect(screen.getByText('Vòng 1')).toBeOnTheScreen();
  expect(screen.queryByText('Gì Cũng Được')).toBeNull();
  expect(screen.queryByText(/Bình chọn · Vòng/)).toBeNull();
});

test('the round 2 skeleton has the list layout and its own title', async () => {
  await wrap(<RoundTwoSkeleton />);
  expect(screen.getByLabelText('Đang tải Vòng 2')).toBeOnTheScreen();
  expect(screen.getByText('Vòng 2')).toBeOnTheScreen();
  expect(screen.queryByText('Gì Cũng Được')).toBeNull();
});

test('while the session is restoring, a screen that brings its own skeleton shows only that', async () => {
  mockLive = { isInitializing: true, status: 'empty', user: null, issue: 'none' };
  await wrap(<RequireActiveSession onHome={jest.fn()} loading={<VoteSkeleton />}><></></RequireActiveSession>);
  expect(screen.getByLabelText('Đang tải phòng bình chọn')).toBeOnTheScreen();
  expect(screen.queryByText('Đang khôi phục phiên…')).toBeNull();
  expect(screen.queryByText('Gì Cũng Được')).toBeNull();
});

test('without a skeleton the restoring notice still shows', async () => {
  mockLive = { isInitializing: true, status: 'empty', user: null, issue: 'none' };
  await wrap(<RequireActiveSession onHome={jest.fn()}><></></RequireActiveSession>);
  expect(screen.getByText('Đang khôi phục phiên…')).toBeOnTheScreen();
});

const pendingRepository = { getSnapshot: () => new Promise(() => undefined), submitBallot: jest.fn(), enterWaiting: jest.fn(), finalize: jest.fn() } as never;

test('round 1 loading shows its skeleton and no home-style header', async () => {
  await wrap(<VoteScreen identityId="u1" roomId="room-1" repository={pendingRepository} initialViewMode="flashcard" />);
  expect(screen.getByLabelText('Đang tải phòng bình chọn')).toBeOnTheScreen();
  expect(screen.queryByText(/Bình chọn · Vòng/)).toBeNull();
  expect(screen.queryByText('Gì Cũng Được')).toBeNull();
});

test('round 2 loading shows its own list skeleton and no home-style header', async () => {
  await wrap(<FinalRoundScreen identityId="u1" roomId="room-1" repository={pendingRepository} />);
  expect(screen.getByLabelText('Đang tải Vòng 2')).toBeOnTheScreen();
  expect(screen.queryByText(/Bình chọn · Vòng/)).toBeNull();
});

test('when round 1 has no winner only the notice is drawn over a blank screen, and it moves on once', async () => {
  const pool = [1, 2, 3].map(n => ({ roundDishId: `d${n}`, choiceId: `c${n}`, dishId: `dish${n}`, name: `Món ${n}`, cuisineIds: [], categoryIds: [] }));
  const repository = { ...(pendingRepository as object), getSnapshot: async () => ({ ok: true, data: { roomId: 'room-1', code: 'ABC234', hostUserId: 'u1', version: 5, state: 'ROUND_2', round: 2, poolVersion: 1, pool, members: [], expiresAt: '2030-01-01T00:00:00Z' } }) } as never;
  const onGoToFinalRound = jest.fn();
  await wrap(<VoteScreen identityId="u1" roomId="room-1" repository={repository} initialViewMode="flashcard" onGoToFinalRound={onGoToFinalRound} />);
  expect(await screen.findByText('Còn 3 món vào vòng 2.')).toBeOnTheScreen();
  expect(screen.queryByText('Vòng 1')).toBeNull();
  const go = screen.getByRole('button', { name: /Vào vòng 2/ });
  await fireEvent.press(go);
  await fireEvent.press(screen.getByRole('button', { name: /Vào vòng 2/ }));
  expect(onGoToFinalRound).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Còn 3 món vào vòng 2.')).toBeOnTheScreen();
});
