import { fireEvent, render, screen } from '@testing-library/react-native';
import { dishResultFixture, scoredResultFixture } from '../../src/bootstrap/dishResultFixtures';
import { DishResultFlow } from '../../src/features/result/screens/DishResultFlow';

const actions = () => ({ onHome: jest.fn(), onNewSession: jest.fn(), onRetryResult: jest.fn() });
test.each([['empty-r1', 'Không thể chốt được món ăn', 'VÒNG 2 KHÔNG MỞ'], ['removed-r2', 'Chưa chọn được món', 'KẾT THÚC VÒNG 2']] as const)('%s has the correct terminal reason and no winner/podium/places', async (id, title, round) => {
  const props = actions(); await render(<DishResultFlow {...props} {...dishResultFixture(id)} />);
  expect(screen.getByText(title)).toBeOnTheScreen(); expect(screen.getByText(round)).toBeOnTheScreen();
  expect(screen.queryByLabelText('Bảng xếp hạng món ăn')).toBeNull(); expect(screen.queryByText('Quán có món này')).toBeNull();
  await fireEvent.press(screen.getByText('Tạo phòng mới')); expect(props.onNewSession).toHaveBeenCalledTimes(1);
});
test.each(['loading','finalizing','error','unknown','invalid'] as const)('%s never masquerades as no consensus or calls a finalization action', async id => {
  const props = actions(); await render(<DishResultFlow {...props} {...dishResultFixture(id)} />);
  expect(screen.queryByText('Không thể chốt được món ăn')).toBeNull(); expect(screen.queryByText('Món chiến thắng')).toBeNull();
  expect(screen.queryByLabelText('Bảng xếp hạng món ăn')).toBeNull();
  if(id === 'error' || id === 'unknown' || id === 'invalid') { await fireEvent.press(screen.getByText('Thử lại')); expect(props.onRetryResult).toHaveBeenCalledTimes(1); }
  expect(props.onNewSession).not.toHaveBeenCalled();
});
test('legacy winner hides scores and new podium, corrupted winner is rejected', async () => {
  const props = actions(); const view = await render(<DishResultFlow {...props} {...dishResultFixture('legacy')} />);
  expect(screen.getByText('Phiên cũ không có dữ liệu điểm và bảng xếp hạng.')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Bảng xếp hạng món ăn')).toBeNull();
  const bad = { ...scoredResultFixture(), winner: { ...scoredResultFixture().winner!, name: 'Changed' } };
  await view.rerender(<DishResultFlow {...props} input={{ capability: 'scored-v4', result: bad }} />);
  expect(screen.getByText('Chưa tải được kết quả')).toBeOnTheScreen();
});
