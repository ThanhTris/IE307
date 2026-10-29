import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { act } from 'react';
import { getThemeColors, typography } from '../../src/shared/theme/tokens';
import { AppBottomNavigation, AppButton, AppHeader, AvatarRow, BrandBanner, Chip, CollectionState, ContextSummary, DishCard, DishCount, FormField, InsufficientDishes, PreferenceChoice, ProcessState, RequestBanner, ResultPodium, RoomCode, SearchSkeletonRow, StatusNotice, TutorialGesture, WaitingSummary } from '../../src/shared/ui';

const colors = getThemeColors('light');

test('light theme uses the approved Figma brand and accessible action colors', () => {
  expect(colors).toMatchObject({
    bg: '#FFFCF3',
    surface: '#FFFCF3',
    soft: '#F0F4E9',
    warm: '#ECF8EB',
    primary: '#238633',
    primaryPressed: '#1B6B29',
    onPrimary: '#FFFFFF',
    text: '#043B22',
    line: '#B9CB9B',
    green: '#46C34F',
  });
});

test('shared controls expose labels, touch actions and selected state', async () => {
  const onPress = jest.fn();
  const onChip = jest.fn();
  const user = userEvent.setup();
  await render(<><AppButton label="Tạo phòng" onPress={onPress} colors={colors} /><Chip label="Món nước" selected onPress={onChip} colors={colors} /></>);
  await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
  await user.press(screen.getByRole('button', { name: 'Món nước' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onChip).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Món nước' }).props.accessibilityState.selected).toBe(true);
});

test('Figma Home building blocks render the dining banner, branded header and selected bottom tab', async () => {
  const onInbox = jest.fn();
  const onFriends = jest.fn();
  const view = await render(<>
    <AppHeader colors={colors} onInbox={onInbox} showFriends={false} showInbox showProfile={false} />
    <BrandBanner colors={colors} />
    <AppBottomNavigation
      activeId="home"
      colors={colors}
      items={[
        { id: 'home', label: 'Trang chủ', iconSource: require('../../assets/brand/icons/home.png'), onPress: jest.fn() },
        { id: 'friends', label: 'Bạn bè', iconSource: require('../../assets/brand/icons/friends.png'), onPress: onFriends },
      ]}
    />
  </>);

  expect(screen.getByText('Gì Cũng Được')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Thông báo' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Bạn ăn cùng' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Hồ sơ' })).toBeNull();
  expect(screen.getByText(/Hợp gu cả nhóm/)).toBeOnTheScreen();
  expect(screen.getByTestId('brand-banner-illustration')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Trang chủ' }).props.accessibilityState.selected).toBe(true);
  await userEvent.setup().press(screen.getByRole('tab', { name: 'Bạn bè' }));
  expect(onFriends).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('icon action tile and quick-friend add affordance keep accessible button names', async () => {
  const onCreate = jest.fn();
  const onAdd = jest.fn();
  await render(<>
    <AppButton label="Tạo phòng" iconSource={require('../../assets/brand/icons/plus.png')} iconLayout="stacked" onPress={onCreate} colors={colors} />
    <AvatarRow items={[{ id: 'linh', label: 'Linh' }]} onAdd={onAdd} colors={colors} />
  </>);

  expect(screen.getByTestId('app-button-icon')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Tạo phòng' }));
  await userEvent.setup().press(screen.getByRole('button', { name: 'Thêm bạn' }));
  expect(onCreate).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Linh')).toBeOnTheScreen();
});

test.each(['primary', 'secondary'] as const)('AppButton %s accepts label and surface presses and preserves disabled/loading guards', async variant => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  const button = <AppButton label="Vào phòng" variant={variant} onPress={onPress} colors={colors} />;
  const view = await render(button);

  await user.press(screen.getByText('Vào phòng'));
  expect(onPress).toHaveBeenCalledTimes(1);
  await user.press(screen.getByRole('button', { name: 'Vào phòng' }));
  expect(onPress).toHaveBeenCalledTimes(2);

  for (const state of [{ disabled: true }, { loading: true }]) {
    await view.rerender(<AppButton label="Vào phòng" variant={variant} onPress={onPress} colors={colors} {...state} />);
    expect(screen.getByRole('button', { name: 'Vào phòng' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng' }));
    await fireEvent.press(screen.getByText(state.loading ? 'Đang xử lý…' : 'Vào phòng'));
    expect(onPress).toHaveBeenCalledTimes(2);
  }

  await view.rerender(button);
  await user.press(screen.getByText('Vào phòng'));
  expect(onPress).toHaveBeenCalledTimes(3);
});

test('FormField reports errors and forwards editable input', async () => {
  const onChange = jest.fn();
  const user = userEvent.setup();
  await render(<FormField label="Mã phòng" value="" onChangeText={onChange} error="Mã chưa đủ 6 ký tự" colors={colors} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Mã chưa đủ 6 ký tự');
  await user.type(screen.getByLabelText('Mã phòng'), 'GCD234');
  expect(onChange).toHaveBeenCalled();
});

test('DishCard keeps vote buttons available and falls back when artwork is absent', async () => {
  const onVote = jest.fn();
  const user = userEvent.setup();
  await render(<DishCard dish={{ id: 'dish_1', name: 'Phở bò', tags: ['Món nước'], priceLabel: '~50k' }} onVote={onVote} colors={colors} />);
  expect(screen.getByLabelText('Ảnh dự phòng Phở bò')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Muốn ăn' }));
  expect(onVote).toHaveBeenCalledWith('WANT');
});

test('DishCard retries artwork when the image source changes after a failure', async () => {
  const view = await render(<DishCard dish={{ id: 'dish_1', name: 'Phở bò', imageUrl: 'https://example.test/old.jpg' }} colors={colors} />);
  const oldImage = screen.getByLabelText('Ảnh Phở bò');
  await act(async () => {
    oldImage.props.onError();
  });
  expect(await screen.findByLabelText('Ảnh dự phòng Phở bò')).toBeOnTheScreen();

  view.rerender(<DishCard dish={{ id: 'dish_1', name: 'Phở bò', imageUrl: 'https://example.test/new.jpg' }} colors={colors} />);
  expect((await screen.findByLabelText('Ảnh Phở bò')).props.source).toEqual({ uri: 'https://example.test/new.jpg' });
});

test('DishCard tracks imageSource when imageUrl is also provided', async () => {
  const oldSource = { uri: 'https://example.test/old-source.jpg' };
  const newSource = { uri: 'https://example.test/new-source.jpg' };
  const view = await render(<DishCard dish={{ id: 'dish_1', name: 'Phở bò', imageUrl: 'https://example.test/fallback.jpg', imageSource: oldSource }} colors={colors} />);
  const oldImage = screen.getByLabelText('Ảnh Phở bò');
  expect(oldImage.props.source).toEqual(oldSource);
  await act(async () => {
    oldImage.props.onError();
  });
  expect(await screen.findByLabelText('Ảnh dự phòng Phở bò')).toBeOnTheScreen();

  view.rerender(<DishCard dish={{ id: 'dish_1', name: 'Phở bò', imageUrl: 'https://example.test/fallback.jpg', imageSource: newSource }} colors={colors} />);
  expect((await screen.findByLabelText('Ảnh Phở bò')).props.source).toEqual(newSource);
});

test('room/context/status/social components show fallback and state text', async () => {
  await render(<>
    <RoomCode code="GCD234" colors={colors} />
    <ContextSummary anchorName="Hồ Con Rùa" mealLabel="Bữa trưa" desiredAtLabel="12:00" radiusLabel="1 km" colors={colors} />
    <StatusNotice title="Đang chờ thành viên" message="Còn 1 người chưa sẵn sàng." tone="warning" colors={colors} />
    <AvatarRow items={[{ id: 'one', label: 'Minh', initial: 'M', status: 'online' }]} colors={colors} />
  </>);
  expect(screen.getByLabelText('Mã phòng GCD234')).toBeOnTheScreen();
  expect(screen.getByText('Hồ Con Rùa')).toBeOnTheScreen();
  expect(screen.getByText('Còn 1 người chưa sẵn sàng.')).toBeOnTheScreen();
  expect(screen.getByText('Minh')).toBeOnTheScreen();
});

test('Figma typography tokens use the Inter families supplied by GM-02', () => {
  expect(typography.titleLarge.fontFamily).toBe('InterBold');
  expect(typography.body.fontFamily).toBe('InterRegular');
  expect(typography.caption.fontFamily).toBe('InterMedium');
});

test('AppHeader exposes Back and Room variants with explicit callbacks', async () => {
  const onBack = jest.fn();
  const onMenu = jest.fn();
  await render(<>
    <AppHeader variant="back" title="Thiết lập" onPressBack={onBack} colors={colors} />
    <AppHeader variant="room" title="Bữa trưa" roomCode="GCD234" onPressBack={onBack} onMenu={onMenu} colors={colors} />
  </>);
  expect(screen.getByText('GCD234')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getAllByRole('button', { name: 'Quay lại' })[0]!);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Tùy chọn phòng' }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onMenu).toHaveBeenCalledTimes(1);
});

test('DishCard labels missing price as unknown and AvatarRow hides unverified presence by default', async () => {
  await render(<>
    <DishCard dish={{ id: 'dish_unknown', name: 'Tên món dài cần giữ nguyên khi xuống dòng' }} colors={colors} />
    <AvatarRow items={[{ id: 'member-1', label: 'Linh', status: 'online' }]} colors={colors} />
  </>);
  expect(screen.getByText('Giá chưa rõ')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Đang hoạt động')).toBeNull();
});

test('DishCount holds the 10–20 bounds and disables controls at both ends', async () => {
  const onChange = jest.fn();
  const view = await render(<DishCount value={10} onChange={onChange} colors={colors} />);
  expect(screen.getByLabelText('Giảm số món')).toBeDisabled();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Tăng số món' }));
  expect(onChange).toHaveBeenCalledWith(11);
  await view.rerender(<DishCount value={20} onChange={onChange} colors={colors} />);
  expect(screen.getByLabelText('Tăng số món')).toBeDisabled();
});

test('PreferenceChoice exposes selected and unknown options without choosing unknown', async () => {
  const onSelect = jest.fn();
  await render(<PreferenceChoice options={[{ id: 'anything', label: 'Không kén món' }, { id: 'unknown', label: 'Chưa rõ', unknown: true }]} selectedId="anything" onSelect={onSelect} colors={colors} />);
  expect(screen.getByRole('radio', { name: 'Không kén món' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('radio', { name: 'Chưa rõ' })).toBeDisabled();
  await userEvent.setup().press(screen.getByRole('radio', { name: 'Không kén món' }));
  expect(onSelect).toHaveBeenCalledWith('anything');
});

test('WaitingSummary displays supplied server counts/deadline and progress', async () => {
  await render(<WaitingSummary acknowledged={2} total={4} deadlineLabel="12:30:00" colors={colors} />);
  expect(screen.getByText('2/4 thành viên đã gửi')).toBeOnTheScreen();
  expect(screen.getByText('Hạn gửi: 12:30:00')).toBeOnTheScreen();
  expect(screen.getByLabelText('Tiến độ thành viên đã gửi').props.accessibilityValue.now).toBe(50);
});

test('ResultPodium keeps tied ranks equal height and marks only the server winner', async () => {
  await render(<ResultPodium dishes={[
    { id: 'dish-1', name: 'Phở bò', rank: 1, winner: true, scoreLabel: '8 điểm' },
    { id: 'dish-2', name: 'Bún bò', rank: 1, scoreLabel: '8 điểm' },
    { id: 'dish-3-tie', name: 'Bún riêu', rank: 1, scoreLabel: '8 điểm' },
    { id: 'dish-4', name: 'Cơm tấm', rank: 3, scoreLabel: '6 điểm' },
  ]} colors={colors} />);
  expect(screen.getAllByText('1')).toHaveLength(3);
  expect(screen.getByText('Chiến thắng')).toBeOnTheScreen();
  expect(screen.getAllByText('8 điểm')).toHaveLength(3);
  expect(screen.getByText('Bún riêu')).toBeOnTheScreen();
});

test('Process and collection states include pending, retry and empty paths', async () => {
  const onRetry = jest.fn();
  await render(<>
    <ProcessState state="unknown" title="Chưa rõ yêu cầu đã tới máy chủ chưa" message="Tải lại trước khi thử lại." retryLabel="Tải lại" onRetry={onRetry} colors={colors} />
    <CollectionState state="empty" title="Chưa có kết quả" message="Hãy thử lại sau." colors={colors} />
    <SearchSkeletonRow colors={colors} />
  </>);
  expect(screen.getByText('Chưa rõ yêu cầu đã tới máy chủ chưa')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Tải lại' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Chưa có kết quả')).toBeOnTheScreen();
  expect(screen.getByLabelText('Đang tải danh sách')).toBeOnTheScreen();
});

test('RequestBanner labels stale data and below-minimum dialog cannot lower the count', async () => {
  const onReduce = jest.fn();
  const onEdit = jest.fn();
  const onBack = jest.fn();
  await render(<>
    <RequestBanner state="stale" title="Đang ngoại tuyến" fetchedAtLabel="12:00" colors={colors} />
    <InsufficientDishes mode="below-minimum" count={7} onReduce={onReduce} onEdit={onEdit} onBack={onBack} colors={colors} />
  </>);
  expect(screen.getByText(/Bản lưu lúc 12:00/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Giảm số món' })).toBeNull();
  expect(screen.getByText(/Cần ít nhất 10 món/)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Sửa thiết lập' }));
  expect(onEdit).toHaveBeenCalledTimes(1);
});

test('TutorialGesture always offers a button alternative', async () => {
  const onPress = jest.fn();
  await render(<TutorialGesture title="Chọn món" instruction="Bạn có thể chọn bằng nút." onPress={onPress} colors={colors} />);
  expect(screen.getAllByText('Chạm')).toHaveLength(2);
  expect(screen.getAllByText('Vuốt trái')).toHaveLength(2);
  expect(screen.getAllByText('Vuốt phải')).toHaveLength(2);
  expect(screen.getAllByText('Nhấn đúp')).toHaveLength(2);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Thử bằng nút' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
