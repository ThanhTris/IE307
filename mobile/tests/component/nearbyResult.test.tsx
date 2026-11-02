import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { nearbyCaseOptions, nearbyFixture, scoredResultFixture } from '../../src/bootstrap/dishResultFixtures';
import { DishResultFlow } from '../../src/features/result/screens/DishResultFlow';
import type { ResultActionReply } from '../../src/features/result/services/resultPresentation';

const actions = () => ({ onHome: jest.fn(), onNewSession: jest.fn(), onRetryResult: jest.fn(), onRequestLocation: jest.fn(), onRetryPlaces: jest.fn(), onOpenSettings: jest.fn(), onExternalAction: jest.fn(() => ({ ok: true })) });
test.each(nearbyCaseOptions.map(item => item.id))('Places state %s keeps result immutable and never requests location automatically', async status => {
  const result = scoredResultFixture(), original = JSON.stringify(result), callbacks = actions();
  await render(<DishResultFlow {...callbacks} input={{ capability: 'scored-v4', result }} nearby={nearbyFixture(result, status)} celebrate={false} isMock />);
  expect(screen.getByText('Quán có món này')).toBeOnTheScreen(); expect(screen.getByText('6 điểm')).toBeOnTheScreen();
  expect(callbacks.onRequestLocation).not.toHaveBeenCalled(); expect(callbacks.onRetryPlaces).not.toHaveBeenCalled();
  if (status === 'permission' || status === 'denied') { await fireEvent.press(screen.getByText('Cho phép vị trí')); expect(callbacks.onRequestLocation).toHaveBeenCalledTimes(1); }
  if (status === 'blocked' || status === 'location-off') { await fireEvent.press(screen.getByText('Mở cài đặt vị trí')); expect(callbacks.onOpenSettings).toHaveBeenCalledTimes(1); }
  if (status === 'loading') expect(screen.queryByText('Chưa tìm thấy quán phù hợp')).toBeNull();
  expect(JSON.stringify(result)).toBe(original);
});
test('wrong result/winner place data is hidden and no fabricated venue goes into Maps target', async () => {
  const result = scoredResultFixture(), callbacks = actions();
  await render(<DishResultFlow {...callbacks} input={{ capability: 'scored-v4', result }} nearby={{ ...nearbyFixture(result, 'ready'), winnerDishId: 'wrong' }} celebrate={false} />);
  expect(screen.queryByText('Quán phở A · mẫu')).toBeNull();
  await fireEvent.press(screen.getByText('Mở Google Maps'));
  expect(callbacks.onExternalAction).toHaveBeenCalledWith('maps', { resultId: result.resultId, dishId: result.winner!.dishId, dishName: result.winner!.name });
});
test('NO_CONSENSUS does not render or call Places/map/location', async () => {
  const result = scoredResultFixture('removed-r2'), callbacks = actions(), renderMap = jest.fn();
  await render(<DishResultFlow {...callbacks} input={{ capability: 'scored-v4', result }} nearby={nearbyFixture(result, 'ready')} renderMap={renderMap} />);
  expect(screen.queryByText('Quán có món này')).toBeNull(); expect(renderMap).not.toHaveBeenCalled(); expect(callbacks.onRequestLocation).not.toHaveBeenCalled();
});
test('map capability renders in-app, retains attribution and never uses a mock illustration in real mode', async () => {
  const result = scoredResultFixture(), callbacks = actions(), renderMap = jest.fn(() => <Text>Bản đồ được cấp</Text>);
  await render(<DishResultFlow {...callbacks} input={{ capability: 'scored-v4', result }} nearby={nearbyFixture(result, 'ready')} renderMap={renderMap} celebrate={false} />);
  expect(screen.getByText('Bản đồ được cấp')).toBeOnTheScreen(); expect(screen.queryByText('Bản đồ minh họa · không phải vị trí thật')).toBeNull();
  expect(renderMap).toHaveBeenCalledWith(expect.objectContaining({ resultId: result.resultId, winnerDishId: result.winner!.dishId }));
});
test('double action is locked and failure retains the winner', async () => {
  const result = scoredResultFixture(), callbacks = actions(); let resolve!: (value: ResultActionReply) => void;
  const external = jest.fn(() => new Promise<ResultActionReply>(done => { resolve = done; }));
  await render(<DishResultFlow {...callbacks} onExternalAction={external} input={{ capability: 'scored-v4', result }} nearby={nearbyFixture(result, 'ready')} celebrate={false} />);
  await fireEvent.press(screen.getByText('Mở bản đồ')); await fireEvent.press(screen.getByText('Mở bản đồ')); expect(external).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ ok: false }));
  await waitFor(() => expect(screen.getByText('Chưa thực hiện được thao tác. Hãy thử lại.')).toBeOnTheScreen()); expect(screen.getByText('6 điểm')).toBeOnTheScreen();
});
test('cached error data is labeled and remains separate from successful empty', async () => {
  const result = scoredResultFixture(), callbacks = actions();
  await render(<DishResultFlow {...callbacks} input={{ capability: 'scored-v4', result }} nearby={{ ...nearbyFixture(result, 'ready'), status: 'error', cached: true }} celebrate={false} />);
  expect(screen.getByText('Dữ liệu lần tải trước · chưa cập nhật thành công')).toBeOnTheScreen(); expect(screen.getByText('Quán phở A · mẫu')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa tìm thấy quán phù hợp')).toBeNull();
});
