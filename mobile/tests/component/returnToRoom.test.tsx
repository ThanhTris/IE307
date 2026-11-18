import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChoiceGrid } from '../../src/features/context/components/ChoiceGrid';
import { ReturnToRoomCard } from '../../src/features/rooms/components/ReturnToRoomCard';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const snapshot = (state: string) => ({ ok: true as const, data: { roomId: 'room-1', code: 'ABC234', version: 3, state, members: [{ userId: 'u1' }] } });
const card = async (state: string, onReturn = jest.fn()) => {
  const repository = {
    getActiveRoom: jest.fn(async () => ({ ok: true, data: { roomId: 'room-1', code: 'ABC234', version: 3, state } })),
    getRoomSnapshot: jest.fn(async () => snapshot(state)),
  };
  await render(<SafeAreaProvider initialMetrics={metrics}><ReturnToRoomCard repository={repository as never} userId="u1" onReturn={onReturn} /></SafeAreaProvider>);
  return { onReturn };
};

test('round 1 offers the way back', async () => {
  const { onReturn } = await card('ROUND_1');
  await fireEvent.press(await screen.findByRole('button', { name: 'Quay lại phòng' }));
  expect(onReturn).toHaveBeenCalledTimes(1);
});

test('round 2 says the room cannot be entered again and offers no button', async () => {
  await card('ROUND_2');
  expect(await screen.findByText(/đã sang vòng 2/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Quay lại phòng' })).toBeNull();
});

test('an old account lookup cannot show its room after a switch', async () => {
  const room = { ok: true, data: { roomId: 'room-1', code: 'ABC234', version: 3, state: 'LOBBY' } };
  let finishOldLookup!: (value: typeof room) => void;
  const oldLookup = new Promise<typeof room>(resolve => { finishOldLookup = resolve; });
  const repository = {
    getActiveRoom: jest.fn().mockReturnValueOnce(oldLookup).mockResolvedValue({ ok: true, data: null }),
    getRoomSnapshot: jest.fn(),
  };
  const view = (userId: string) => <SafeAreaProvider initialMetrics={metrics}>
    <ReturnToRoomCard repository={repository as never} userId={userId} onReturn={jest.fn()} />
  </SafeAreaProvider>;
  const rendered = await render(view('u1'));
  await rendered.rerender(view('u2'));
  await act(async () => finishOldLookup(room));
  expect(repository.getRoomSnapshot).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Quay lại phòng' })).toBeNull();
});

test('a short last row is padded so every tile keeps its width', async () => {
  Dimensions.set({ window: { width: 390, height: 844, scale: 2, fontScale: 1 } });
  await render(<ChoiceGrid>{['a', 'b', 'c', 'd', 'e'].map(key => <Text key={key}>{key}</Text>)}</ChoiceGrid>);
  expect(screen.getAllByTestId('choice-grid-pad')).toHaveLength(1);
});
