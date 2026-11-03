import { fireEvent, render, screen } from '@testing-library/react-native';
import { ResultCasePicker } from '../../src/bootstrap/ResultCasePicker';

test('QA starts collapsed, searches cases and keeps no-consensus cases separate from podium options', async () => {
  const onCase = jest.fn(), props = { noConsensus: false, showPlaces: true, locked: false, onCase, onNearby: jest.fn(), onOtherScreen: jest.fn(), onActionFailure: jest.fn() };
  const view = await render(<ResultCasePicker {...props} />);
  expect(screen.queryByText('Kết quả · Top 3 món')).toBeNull();
  await fireEvent.press(screen.getByText('Tình huống kiểm thử kết quả'));
  await fireEvent.changeText(screen.getByLabelText('Tìm tình huống kết quả'), 'Đồng hạng cuối');
  await fireEvent.press(screen.getByText('Kết quả · Đồng hạng cuối'));
  expect(onCase).toHaveBeenCalledWith('tie-last');
  await view.rerender(<ResultCasePicker {...props} noConsensus showPlaces={false} />);
  expect(screen.queryByText('Kết quả · Đồng hạng cuối')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Tìm tình huống kết quả'), 'vòng');
  expect(screen.getByText('Kết quả · Không còn món sau vòng 1')).toBeOnTheScreen();
  expect(screen.getByText('Kết quả · Loại hết sau vòng 2')).toBeOnTheScreen();
});
