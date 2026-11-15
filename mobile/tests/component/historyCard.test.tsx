import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HistoryCard } from '../../src/features/history/components/HistoryCard';
import { SWIPE_DELETE_THRESHOLD } from '../../src/shared/ui/layout/SwipeToDeleteRow';
import { useShellTheme } from '../../src/shared/lib/useShellTheme';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
function Host({ onOpen, onDelete }: { onOpen?: () => void; onDelete: () => void }) {
  const { colors } = useShellTheme();
  return <SafeAreaProvider initialMetrics={metrics}><HistoryCard title="Phở bò" meta="Hôm nay · 2 thành viên" decided footer="2 điểm" winnerLabel="Món được chọn" onOpen={onOpen} onDelete={onDelete} colors={colors} /></SafeAreaProvider>;
}

test('a history card opens on tap and shows no big buttons', async () => {
  const onOpen = jest.fn();
  await render(<Host onOpen={onOpen} onDelete={jest.fn()} />);
  expect(screen.getByText('Phở bò')).toBeOnTheScreen();
  expect(screen.getByText('Món được chọn')).toBeOnTheScreen();
  expect(screen.queryByText('Xem chi tiết đã lưu')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /Phở bò\. Hôm nay/ }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('the bin button (TalkBack path) deletes without a confirmation', async () => {
  const onDelete = jest.fn();
  await render(<Host onOpen={jest.fn()} onDelete={onDelete} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa Phở bò' }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('a swipe deletes once it passes half of the row', () => {
  expect(SWIPE_DELETE_THRESHOLD).toBeGreaterThanOrEqual(0.5);
  expect(SWIPE_DELETE_THRESHOLD).toBeLessThanOrEqual(0.75);
});
