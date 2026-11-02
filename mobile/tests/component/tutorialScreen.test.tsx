import { fireEvent, render, screen } from '@testing-library/react-native';
import { TutorialScreen } from '../../src/features/home/screens/TutorialScreen';
import { MockApiClient } from '../../src/data/api';

const press = async (label: string) => { await fireEvent.press(screen.getByRole('button', { name: label })); };
async function reachCard() { await press('Tạo phòng mẫu'); await press('Thử thiết lập mẫu'); }

test('tutorial only advances after the requested NO/OK choice', async () => {
  await render(<TutorialScreen onExit={jest.fn()} />); await reachCard();
  expect(screen.getByRole('button', { name: 'Tiếp tục hướng dẫn' })).toBeDisabled();
  await press('Muốn ăn'); expect(screen.getByRole('button', { name: 'Tiếp tục hướng dẫn' })).toBeDisabled();
  await press('Không ăn'); await press('Tiếp tục hướng dẫn');
  expect(screen.getByLabelText('Bước 4 trên 6')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tiếp tục hướng dẫn' })).toBeDisabled();
  await press('Ăn được'); await press('Tiếp tục hướng dẫn');
  expect(screen.getByLabelText('Bước 5 trên 6')).toBeOnTheScreen();
});

test('double tap, undo, completion and replay stay isolated from room mutations', async () => {
  const create = jest.spyOn(MockApiClient.prototype, 'createRoom'), join = jest.spyOn(MockApiClient.prototype, 'joinRoom');
  const submit = jest.spyOn(MockApiClient.prototype, 'submitBallot'), start = jest.spyOn(MockApiClient.prototype, 'startRound');
  const onComplete = jest.fn(), onExit = jest.fn();
  try {
    await render(<TutorialScreen onComplete={onComplete} onExit={onExit} />); await reachCard();
    await press('Không ăn'); await press('Tiếp tục hướng dẫn');
    await press('Ăn được'); await press('Tiếp tục hướng dẫn');
    // Two native card presses, rather than the equivalent vote button.
    const card = screen.getAllByRole('button').find(item => String(item.props.accessibilityLabel).startsWith('Mở món '));
    if (!card) throw new Error('Missing tutorial card');
    await fireEvent.press(card, { nativeEvent: { timestamp: 1000 } }); await fireEvent.press(card, { nativeEvent: { timestamp: 1100 } });
    expect(screen.getByRole('button', { name: 'Tiếp tục hướng dẫn' })).toBeEnabled();
    await press('Tiếp tục hướng dẫn');
    expect(screen.getByRole('button', { name: 'Hoàn tất hướng dẫn' })).toBeDisabled();
    await press('Hoàn tác trên thẻ mẫu'); await press('Hoàn tất hướng dẫn');
    expect(onComplete).toHaveBeenCalledTimes(1);
    await press('Xem lại hướng dẫn'); expect(screen.getByLabelText('Bước 1 trên 6')).toBeOnTheScreen();
    await press('Bỏ qua hướng dẫn'); expect(onExit).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
  } finally { create.mockRestore(); join.mockRestore(); submit.mockRestore(); start.mockRestore(); }
});

test('Back moves within tutorial first, then exits without completion or a ballot', async () => {
  const exit = jest.fn(), complete = jest.fn();
  await render(<TutorialScreen onExit={exit} onComplete={complete} />);
  await reachCard(); await press('Quay lại');
  expect(screen.getByText('Thiết lập mẫu · 12 món · không tạo phòng thật')).toBeOnTheScreen();
  await press('Quay lại'); await press('Quay lại');
  expect(exit).toHaveBeenCalledTimes(1); expect(complete).not.toHaveBeenCalled();
});
