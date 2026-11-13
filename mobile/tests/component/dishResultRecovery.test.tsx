import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { DishResultPreview } from '../fixtures/result/DishResultPreview';
import { completeNativeAnimations } from '../helpers/completeNativeAnimations';

beforeEach(completeNativeAnimations);
afterEach(() => jest.restoreAllMocks());

const press = async (name: string) => { await fireEvent.press(screen.getByRole('button', { name })); };
const choose = async (label: string) => {
  await press('Tình huống kiểm thử kết quả');
  await fireEvent.changeText(screen.getByLabelText('Tìm tình huống kết quả'), label);
  await press(`Kết quả · ${label}`);
};

test.each(['Lỗi tải kết quả', 'Chưa xác nhận kết quả', 'Kết quả không hợp lệ'])('%s retry receives a valid mock result and celebrates once', async label => {
  await render(<DishResultPreview onHome={jest.fn()} onNewSession={jest.fn()} onOtherScreen={jest.fn()} />);
  await press('Chạm để bỏ qua');
  await choose(label);
  expect(screen.queryByLabelText('Bảng xếp hạng món ăn')).toBeNull();
  await press('Thử lại');
  expect(screen.getByRole('button', { name: 'Chạm để bỏ qua' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Bảng xếp hạng món ăn')).toBeOnTheScreen();
  await press('Chạm để bỏ qua');
  expect(screen.queryByRole('button', { name: 'Chạm để bỏ qua' })).toBeNull();
  expect(within(screen.getByTestId('podium-group-1')).getByLabelText(/Phở bò tái nạm.* · Món chiến thắng$/)).toBeOnTheScreen();
  await press('Tình huống kiểm thử kết quả');
  await fireEvent.changeText(screen.getByLabelText('Tìm tình huống kết quả'), 'Lỗi tải quán');
  await press('Quán · Lỗi tải quán');
  expect(screen.getByRole('button', { name: 'Mở Google Maps' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Thử lại/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Chạm để bỏ qua' })).toBeNull();
});

test('reselecting a malformed fixture still rejects it after a successful mock retry', async () => {
  await render(<DishResultPreview onHome={jest.fn()} onNewSession={jest.fn()} onOtherScreen={jest.fn()} />);
  await press('Chạm để bỏ qua');
  await choose('Kết quả không hợp lệ');
  await press('Thử lại');
  await press('Chạm để bỏ qua');
  await choose('Kết quả không hợp lệ');
  expect(screen.getByText('Chưa tải được kết quả')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Bảng xếp hạng món ăn')).toBeNull();
});
