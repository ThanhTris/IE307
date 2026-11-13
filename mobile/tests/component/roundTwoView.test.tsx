import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { FinalRoundScreen } from '../../src/features/voting';
import { roundTwoCandidates } from '../../src/features/voting/fixtures';

// 6 dishes -> cap = max(1, ceil(0.30 * 6)) = 2 removals per person.
const SIX = roundTwoCandidates(6);
const box = (index: number) => screen.getByRole('checkbox', { name: `Loại ${SIX[index]!.name}` });

const renderScreen = (scenario: 'consensus' | 'waiting' | 'error' | 'all_removed' = 'waiting', props: Record<string, unknown> = {}) =>
  render(<FinalRoundScreen candidates={SIX} showScenarioPicker={false} initialScenario={scenario} simulateDelayMs={0} {...props} />);

describe('Round 2 screen', () => {
  test('lists only dish names with an unticked box, and shows the removal limit', async () => {
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Vòng 2' })).toBeOnTheScreen();
    expect(screen.getByText('Đã loại 0/2 món')).toBeOnTheScreen();
    for (const [index, dish] of SIX.entries()) {
      expect(screen.getByTestId(`round-two-row-${dish.roundDishId}`)).toBeOnTheScreen();
      expect(screen.getByText(dish.name)).toBeOnTheScreen();
      expect(box(index).props.accessibilityState.checked).toBe(false);
    }
    // No photos, prices, Giữ/Loại buttons or QA banners.
    expect(screen.queryByRole('button', { name: /^Giữ / })).toBeNull();
    expect(screen.queryByText(/QA \/ Demo/)).toBeNull();
    expect(screen.queryByText(/Cap 30%/)).toBeNull();
  });

  test('ticking removes a dish; at the limit the other boxes are disabled; unticking frees one', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(box(0));
    expect(screen.getByText('Đã loại 1/2 món')).toBeOnTheScreen();
    expect(box(0).props.accessibilityState.checked).toBe(true);
    expect(box(1).props.accessibilityState.disabled).toBe(false);
    await user.press(box(1));
    expect(screen.getByText('Đã loại 2/2 món')).toBeOnTheScreen();
    expect(box(2).props.accessibilityState.disabled).toBe(true);
    // A ticked box can always be unticked.
    expect(box(0).props.accessibilityState.disabled).toBe(false);
    await user.press(box(0));
    expect(screen.getByText('Đã loại 1/2 món')).toBeOnTheScreen();
    expect(box(2).props.accessibilityState.disabled).toBe(false);
  });

  test('"Bỏ chọn" clears every tick', async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByRole('button', { name: 'Bỏ chọn tất cả' })).toBeDisabled();
    await user.press(box(2));
    await user.press(box(3));
    await user.press(screen.getByRole('button', { name: 'Bỏ chọn tất cả' }));
    expect(screen.getByText('Đã loại 0/2 món')).toBeOnTheScreen();
    expect(box(2).props.accessibilityState.checked).toBe(false);
  });

  test('help is one short sentence', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Hướng dẫn' }));
    expect(screen.getByText('Hãy loại những món bạn không thích nhất trong danh sách.')).toBeOnTheScreen();
  });

  test('sending goes straight to the waiting screen without a confirmation dialog', async () => {
    const user = userEvent.setup();
    await renderScreen('waiting');
    await user.press(screen.getByRole('button', { name: 'Gửi phiếu' }));
    await waitFor(() => expect(screen.getByText('Đã gửi phiếu')).toBeOnTheScreen());
    expect(screen.queryByText(/Xác nhận nộp/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gửi phiếu' })).toBeNull();
    expect(screen.getByText(/thành viên đã gửi phiếu/)).toBeOnTheScreen();
  });

  test('a failed send keeps the ticks and offers one retry button', async () => {
    const user = userEvent.setup();
    await renderScreen('error');
    await user.press(box(3));
    await user.press(screen.getByRole('button', { name: 'Gửi phiếu' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen());
    expect(screen.getByText('Đã loại 1/2 món')).toBeOnTheScreen();
    expect(box(3).props.accessibilityState.checked).toBe(true);
  });

  test('ticking every dish warns the person (only possible when the limit allows it)', async () => {
    const user = userEvent.setup();
    await renderScreen('all_removed', { candidates: [SIX[0]!] });
    await user.press(box(0));
    expect(screen.getByText(/Bạn đang loại hết/)).toBeOnTheScreen();
  });
});
