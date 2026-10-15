import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { createSetupPreview, setupCatalogue, type SetupScenario } from '../../src/bootstrap/roomSetupPreview';
import { ContextScreen } from '../../src/features/context/screens/ContextScreen';
import { PreferencesScreen } from '../../src/features/preferences/screens/PreferencesScreen';
import { localTime, nextMealTime } from '../../src/features/context/services/roomSetup';

const press = async (label: string) => { await fireEvent.press(screen.queryByRole('button', { name: label }) ?? screen.getByRole('checkbox', { name: label })); };
const selectedDateTime = () => `${screen.getByRole('button', { name: 'Chọn ngày ăn' }).props.accessibilityValue.text} ${screen.getByLabelText('Giờ ăn (UTC+7)').props.value}`;
async function setDateTime(value: string) {
  await press('Chọn ngày ăn');
  await fireEvent.changeText(screen.getByLabelText('Ngày ăn (YYYY-MM-DD)'), value.slice(0, 10));
  await press('Xong chọn ngày');
  await fireEvent.changeText(screen.getByLabelText('Giờ ăn (UTC+7)'), value.slice(11));
}
async function context(scenario: SetupScenario = 'default') {
  const fixture = await createSetupPreview(scenario);
  const onSaved = jest.fn(); const onContinue = jest.fn(); const onHome = jest.fn();
  const update = jest.spyOn(fixture.repository, 'updateContext');
  const preview = jest.spyOn(fixture.repository, 'previewFoodPool');
  const view = await render(<ContextScreen {...fixture} onBack={jest.fn()} onHome={onHome} onSaved={onSaved} onContinue={onContinue} />);
  await screen.findByLabelText('Giờ ăn (UTC+7)');
  return { ...fixture, update, preview, view, onSaved, onContinue, onHome };
}
async function preferences(scenario: SetupScenario = 'default') {
  const fixture = await createSetupPreview(scenario);
  const update = jest.spyOn(fixture.repository, 'updatePreferences'); const onSaved = jest.fn(); const onHome = jest.fn();
  const view = await render(<PreferencesScreen {...fixture} catalogue={setupCatalogue} onBack={jest.fn()} onHome={onHome} onSaved={onSaved} />);
  await screen.findByRole('button', { name: 'Gì cũng được' });
  return { ...fixture, update, view, onSaved, onHome };
}
async function confirmAndPreview() {
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  await press('Xem món mẫu theo bối cảnh');
  await screen.findByText('Phở bò tái nạm');
}

test('context requires host confirmation and a nonempty preview before any write', async () => {
  const fixture = await context();
  expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeDisabled();
  await press('Lưu bối cảnh mẫu'); expect(fixture.update).not.toHaveBeenCalled();
  await press('Xem món mẫu theo bối cảnh'); expect(fixture.preview).not.toHaveBeenCalled();
  await confirmAndPreview();
  await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  expect(fixture.update).toHaveBeenCalledTimes(1);
  expect(fixture.update.mock.calls[0]![0].context.budget).toBeNull();
  expect(fixture.update.mock.calls[0]![0].context).not.toHaveProperty('lat');
  await press('Chọn khẩu vị →'); expect(fixture.onContinue).toHaveBeenCalledWith(expect.objectContaining({ roomId: fixture.roomId }));
  await press('Đã lưu bối cảnh mẫu'); expect(fixture.update).toHaveBeenCalledTimes(1);
});

test('editing a saved context refetches the latest version and makes a new intent for the same room', async () => {
  const fixture = await context('ready');
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeDisabled();
  const first = fixture.update.mock.calls[0]![0];
  const snapshot = await fixture.repository.getRoomSnapshot(fixture.roomId);
  if (!snapshot.ok) throw new Error('Expected saved snapshot');
  // Model a preferences write made on the next screen before the host returns.
  const changed = await fixture.repository.updatePreferences({ roomId: fixture.roomId, expectedVersion: snapshot.data.version, requestId: 'test-prefs-between-context-edits', preferences: { cuisineIds: [], categoryIds: ['cat_mon_com'], historyConsent: true } });
  if (!changed.ok) throw new Error('Expected preferences save');
  const latest = await fixture.repository.getRoomSnapshot(fixture.roomId);
  if (!latest.ok) throw new Error('Expected latest snapshot');
  await press('Chỉnh lại bối cảnh');
  await screen.findByLabelText('Giờ ăn (UTC+7)');
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeDisabled();
  await press('2 km'); await press('Lưu bối cảnh mẫu');
  expect(fixture.update).toHaveBeenCalledTimes(1);
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(2));
  const second = fixture.update.mock.calls[1]![0];
  expect(second.roomId).toBe(first.roomId);
  expect(second.requestId).not.toBe(first.requestId);
  expect(second.expectedVersion).toBe(latest.data.version);
  expect(second.expectedVersion).toBeGreaterThan(first.expectedVersion);
  expect(second.context.radiusM).toBe(2000);
  expect(fixture.onSaved.mock.calls[1]![0].members.every((m: { ready: boolean }) => !m.ready)).toBe(true);
});

test('stale preview keeps its reload action when save is pressed and requires fresh confirmation', async () => {
  const fixture = await context();
  fixture.preview.mockResolvedValueOnce({ ok: false, error: { messageKey: 'VERSION_CONFLICT' } });
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  await press('Xem món mẫu theo bối cảnh');
  await screen.findByRole('button', { name: 'Tải lại bối cảnh' });
  await press('Lưu bối cảnh mẫu');
  expect(screen.getByRole('button', { name: 'Tải lại bối cảnh' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Lưu bối cảnh mẫu' })).toBeDisabled();
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeDisabled();
  expect(fixture.update).not.toHaveBeenCalled();
  await press('Tải lại bối cảnh'); await screen.findByLabelText('Giờ ăn (UTC+7)');
  expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }).props.accessibilityState.checked).toBe(false);
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
});

test('manual input, meal and budget changes invalidate confirmation and preview', async () => {
  const fixture = await context(); await confirmAndPreview();
  await fireEvent.changeText(screen.getByLabelText('Ngân sách tham khảo (VNĐ/người)'), '-1');
  expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }).props.accessibilityState.checked).toBe(false);
  await press('Xem món mẫu theo bối cảnh'); expect(fixture.preview).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Ngân sách là số nguyên/)).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Ngân sách tham khảo (VNĐ/người)'), '');
  await setDateTime('2030-02-30 12:00');
  await press('Xem món mẫu theo bối cảnh'); expect(fixture.preview).toHaveBeenCalledTimes(1);
  await setDateTime('2000-01-01 12:00');
  await press('Xem món mẫu theo bối cảnh'); expect(fixture.preview).toHaveBeenCalledTimes(1);
});

test('date changes clear the checked confirmation and preview without changing time or writing', async () => {
  const fixture = await context(); await confirmAndPreview();
  expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' })).toBeChecked();
  const beforeTime = screen.getByLabelText('Giờ ăn (UTC+7)').props.value;
  await press('Chọn ngày ăn'); await press('Ngày mai');
  expect(screen.getByLabelText('Giờ ăn (UTC+7)').props.value).toBe(beforeTime);
  expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' })).not.toBeChecked();
  expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
  await press('Lưu bối cảnh mẫu'); expect(fixture.update).not.toHaveBeenCalled();
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  expect(localTime(fixture.update.mock.calls[0]![0].context.desiredAt)).toBe(selectedDateTime());
});

test('confirmation can be unchecked and time edits require it again before preview or save', async () => {
  const fixture = await context(); await confirmAndPreview();
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' })).not.toBeChecked();
  await press('Lưu bối cảnh mẫu'); expect(fixture.update).not.toHaveBeenCalled();
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  await fireEvent.changeText(screen.getByLabelText('Giờ ăn (UTC+7)'), '23:30');
  expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' })).not.toBeChecked();
  expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
  await press('Lưu bối cảnh mẫu'); expect(fixture.update).not.toHaveBeenCalled();
});

test('meal chips replace the time while snack preserves custom time and invalidates preview', async () => {
  const fixture = await context();
  const discovery = await fixture.repository.getDiscoveryContext();
  if (!discovery.ok) throw new Error('Expected discovery');
  await confirmAndPreview();
  for (const [label, meal] of [['Bữa sáng', 'breakfast'], ['Bữa trưa', 'lunch'], ['Bữa tối', 'dinner']] as const) {
    await press(label);
    expect(selectedDateTime()).toBe(localTime(nextMealTime(meal, Date.parse(discovery.data.serverTime))!));
    expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }).props.accessibilityState.checked).toBe(false);
  }
  await setDateTime('2030-10-15 16:30');
  await press('Ăn nhẹ'); await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  expect(fixture.update.mock.calls[0]![0].context).toMatchObject({ desiredAt: '2030-10-15T09:30:00.000Z', mealSlot: 'snack' });
});

test('changing area clears the anchor and an area without anchors cannot preview or save', async () => {
  const fixture = await context();
  await press('TP. Thủ Đức, TP. Hồ Chí Minh');
  expect(screen.queryByRole('button', { name: 'Hồ Con Rùa' })).toBeNull();
  expect(screen.getByText('Chưa có điểm công cộng')).toBeOnTheScreen();
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  await press('Xem món mẫu theo bối cảnh'); await press('Lưu bối cảnh mẫu');
  expect(fixture.preview).not.toHaveBeenCalled(); expect(fixture.update).not.toHaveBeenCalled();
});

test('custom late-night time is sent unchanged and context save resets every ready flag', async () => {
  const fixture = await context('ready');
  const before = await fixture.repository.getRoomSnapshot(fixture.roomId);
  expect(before.ok && before.data.members.every(m => m.ready)).toBe(true);
  await press('Bữa tối');
  await setDateTime('2030-10-15 23:30');
  await fireEvent(screen.getByRole('switch', { name: 'Tránh lặp món gần đây' }), 'valueChange', true);
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalled());
  const request = fixture.update.mock.calls[0]![0];
  expect(request.context).toMatchObject({ desiredAt: '2030-10-15T16:30:00.000Z', mealSlot: 'dinner', timeHint: 'late_night', avoidRecent: true });
  expect(fixture.onSaved.mock.calls[0]![0].members.every((m: { ready: boolean }) => !m.ready)).toBe(true);
});

test('eat-now adds the buffer once and retry preserves delivered request bytes/id/version', async () => {
  const fixture = await context('timeout');
  await press('Ăn ngay · sau 15 phút');
  const before = selectedDateTime();
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu lưu bối cảnh' });
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Chọn ngày ăn' })).toBeDisabled();
  await press('Thử lại cùng yêu cầu lưu bối cảnh');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  expect(fixture.update.mock.calls[0]![0]).toEqual(fixture.update.mock.calls[1]![0]);
  expect(localTime(fixture.update.mock.calls[1]![0].context.desiredAt)).toBe(before);
});

test.each(['empty', 'outside', 'unknown', 'stale'] as const)('context %s requires correction/refetch without widening or saving', async scenario => {
  const fixture = await context(scenario);
  const time = selectedDateTime();
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  await press('Xem món mẫu theo bối cảnh');
  await waitFor(() => expect(fixture.preview).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' }).props.accessibilityState.busy).toBe(false));
  if (scenario === 'stale') {
    expect(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tải lại bối cảnh' })).toBeEnabled();
  } else expect(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' })).toBeEnabled();
  await press('Lưu bối cảnh mẫu');
  expect(fixture.update).not.toHaveBeenCalled();
  expect(selectedDateTime()).toBe(time);
  expect(fixture.preview.mock.calls[0]![0].radiusM).toBe(1000);
});

test('GPS denied keeps manual selection and distinguishes origin from selling place and unknown price', async () => {
  const fixture = await context('denied');
  await press('Gợi ý điểm ăn từ vị trí'); await screen.findByText(/Không có quyền hoặc chưa dùng được vị trí/);
  const discovery = await fixture.repository.getDiscoveryContext();
  if (!discovery.ok) throw new Error('Expected discovery');
  const next = discovery.data.anchors[1]!;
  const area = discovery.data.coverageAreas.find(v => v.id === next.coverageId)!;
  await press(area.name); await press(next.name);
  await press('Tôi xác nhận điểm công cộng, buổi và giờ ăn');
  await press('Xem món mẫu theo bối cảnh');
  await waitFor(() => expect(screen.getAllByText('Nguồn gốc món: Miền Bắc').length).toBeGreaterThan(0));
  expect(screen.getByText(/Nơi bán mẫu: Phở Phú Vương/)).toBeOnTheScreen();
  expect(fixture.preview.mock.calls[0]![0].anchorId).toBe(next.id);
});

test('unknown price is displayed without dropping dishes', async () => {
  const fixture = await context('unknown-price'); await confirmAndPreview();
  expect(screen.getAllByText('Chưa có giá')).toHaveLength(4);
  await press('Lưu bối cảnh mẫu'); await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
});

test('preview shows anchor distance and keeps missing distance unknown', async () => {
  const fixture = await context(); await confirmAndPreview();
  expect(screen.getByText('650 m đường chim bay từ điểm ăn chung')).toBeOnTheScreen();
  const preview = fixture.preview.getMockImplementation()!;
  fixture.preview.mockImplementation(async request => {
    const result = await preview(request);
    return result.ok ? { ok: true, data: { ...result.data, pool: result.data.pool.map(dish => ({ ...dish, distanceM: undefined })) } } : result;
  });
  await press('Xem món mẫu theo bối cảnh');
  await waitFor(() => expect(screen.getAllByText('Chưa có khoảng cách đường chim bay từ điểm ăn chung')).toHaveLength(4));
  expect(screen.queryByText('0 m đường chim bay từ điểm ăn chung')).toBeNull();
});

test('member cannot edit context but can continue to personal preferences', async () => {
  const fixture = await context('member');
  expect(screen.getByText('Bối cảnh do chủ phòng xác nhận')).toBeOnTheScreen();
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Lưu bối cảnh mẫu' })).toBeNull();
  await press('Chọn khẩu vị →'); expect(fixture.onContinue).toHaveBeenCalledTimes(1); expect(fixture.update).not.toHaveBeenCalled();
});

test('preferences soft choices distinguish hot from spicy and reset only caller ready/consent', async () => {
  const fixture = await preferences('ready');
  expect(screen.getByRole('button', { name: 'Gì cũng được' }).props.accessibilityState.selected).toBe(true);
  await press('Món nước'); await press('Món Việt'); await press('Nóng'); await press('Vị cay · Không');
  await fireEvent(screen.getByRole('switch', { name: 'Đồng ý lưu lịch sử bữa ăn' }), 'valueChange', true);
  expect(screen.getByRole('button', { name: 'Gì cũng được' }).props.accessibilityState.selected).toBe(false);
  await press('Lưu khẩu vị mẫu'); await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  const request = fixture.update.mock.calls[0]![0];
  expect(request.preferences).toMatchObject({ cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], temperature: 'hot', flavor: { spicy: { present: false, intensity: 'none' } }, historyConsent: true });
  expect(request).not.toHaveProperty('votes'); expect(request.preferences).not.toHaveProperty('origin');
  const snapshot = fixture.onSaved.mock.calls[0]![0];
  expect(snapshot.members.find((m: { userId: string }) => m.userId === fixture.userId).ready).toBe(false);
  expect(snapshot.members.find((m: { userId: string }) => m.userId !== fixture.userId).ready).toBe(true);
  expect(screen.getByText('Đã hoàn tất chọn khẩu vị')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Lưu khẩu vị mẫu' })).toBeNull();
  expect(fixture.update).toHaveBeenCalledTimes(1);
});

test('whatever clears soft choices while skip preserves explicitly chosen consent', async () => {
  const fixture = await preferences(); await press('Cơm'); await press('Lạnh');
  await fireEvent(screen.getByRole('switch', { name: 'Đồng ý lưu lịch sử bữa ăn' }), 'valueChange', true);
  await press('Gì cũng được');
  expect(screen.getByRole('button', { name: 'Gì cũng được' }).props.accessibilityState.selected).toBe(true);
  await press('Bỏ qua sở thích mềm'); await waitFor(() => expect(fixture.onSaved).toHaveBeenCalled());
  expect(fixture.update.mock.calls[0]![0].preferences).toEqual({ cuisineIds: [], categoryIds: [], historyConsent: true });
});

test('multiple categories toggle independently and saving shows a clear completion with edit recovery', async () => {
  const fixture = await preferences();
  await press('Món nước'); await press('Cơm'); await press('Ăn vặt'); await press('Ăn vặt');
  expect(screen.getByRole('switch', { name: 'Đồng ý lưu lịch sử bữa ăn' }).props.value).toBe(false);
  await press('Lưu khẩu vị mẫu');
  await screen.findByText('Đã hoàn tất chọn khẩu vị');
  expect(fixture.update.mock.calls[0]![0].preferences.categoryIds).toEqual(['cat_mon_nuoc', 'cat_mon_com']);
  expect(screen.getByText(/Bản mô phỏng kết thúc tại đây/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Tiếp tục đến phòng chờ' })).toBeNull();
  await press('Chỉnh lại khẩu vị');
  await screen.findByRole('button', { name: 'Gì cũng được' });
  expect(screen.getByRole('button', { name: 'Cơm' }).props.accessibilityState.selected).toBe(true);
  await press('Cơm'); await press('Lưu khẩu vị mẫu');
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(2));
  const first = fixture.update.mock.calls[0]![0], second = fixture.update.mock.calls[1]![0];
  expect(second.expectedVersion).toBeGreaterThan(first.expectedVersion);
  expect(second.requestId).not.toBe(first.requestId);
  expect(second.preferences.categoryIds).toEqual(['cat_mon_nuoc']);
});

test('skip completes explicitly and continuation only uses the saved snapshot when injected', async () => {
  const fixture = await createSetupPreview();
  const onContinue = jest.fn();
  await render(<PreferencesScreen {...fixture} catalogue={setupCatalogue} onBack={jest.fn()} onContinue={onContinue} />);
  await screen.findByRole('button', { name: 'Gì cũng được' });
  await press('Cơm'); await press('Bỏ qua sở thích mềm');
  await screen.findByText('Đã hoàn tất chọn khẩu vị');
  expect(screen.getByText('Gì cũng được · Không có ưu tiên mềm')).toBeOnTheScreen();
  expect(onContinue).not.toHaveBeenCalled();
  await press('Tiếp tục đến phòng chờ');
  expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ roomId: fixture.roomId, ownPreferences: { cuisineIds: [], categoryIds: [], historyConsent: false } }));
});

test('preferences completion waits for snapshot and retry does not send the write again', async () => {
  const fixture = await preferences();
  const read = fixture.repository.getRoomSnapshot.bind(fixture.repository);
  jest.spyOn(fixture.repository, 'getRoomSnapshot').mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } }).mockImplementation(read);
  await press('Lưu khẩu vị mẫu');
  await screen.findByText('Đã lưu, chưa tải lại được phòng');
  expect(screen.queryByText('Đã hoàn tất chọn khẩu vị')).toBeNull();
  await press('Tải lại phòng đã lưu');
  await screen.findByText('Đã hoàn tất chọn khẩu vị');
  expect(fixture.update).toHaveBeenCalledTimes(1);
});

test('preferences retry after possible delivery reuses intent and never enables a second save after ACK', async () => {
  const fixture = await preferences('timeout'); await press('Cơm'); await press('Lưu khẩu vị mẫu');
  await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu lưu khẩu vị' });
  expect(screen.getByRole('button', { name: 'Cơm' })).toBeDisabled();
  await press('Thử lại cùng yêu cầu lưu khẩu vị'); await waitFor(() => expect(fixture.onSaved).toHaveBeenCalled());
  expect(fixture.update.mock.calls[0]![0]).toEqual(fixture.update.mock.calls[1]![0]);
  expect(screen.getByText('Đã hoàn tất chọn khẩu vị')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Lưu khẩu vị mẫu' })).toBeNull();
});

test('skip timeout retry shows whatever from the saved snapshot and preserves chosen consent', async () => {
  const fixture = await preferences('timeout');
  await press('Cơm'); await press('Nóng');
  await fireEvent(screen.getByRole('switch', { name: 'Đồng ý lưu lịch sử bữa ăn' }), 'valueChange', true);
  await press('Bỏ qua sở thích mềm');
  await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu lưu khẩu vị' });
  expect(screen.getByRole('button', { name: 'Về trang chủ' })).toBeDisabled();
  await press('Về trang chủ'); expect(fixture.onHome).not.toHaveBeenCalled();
  await press('Thử lại cùng yêu cầu lưu khẩu vị');
  await screen.findByText('Đã hoàn tất chọn khẩu vị');
  expect(screen.getByText('Gì cũng được · Không có ưu tiên mềm')).toBeOnTheScreen();
  expect(screen.getByText('Đồng ý lưu lịch sử bữa ăn: Đang bật')).toBeOnTheScreen();
  expect(fixture.update.mock.calls[0]![0]).toEqual(fixture.update.mock.calls[1]![0]);
  expect(fixture.update.mock.calls[1]![0].preferences).toEqual({ cuisineIds: [], categoryIds: [], historyConsent: true });
  await press('Về trang chủ'); expect(fixture.onHome).toHaveBeenCalledTimes(1);
});

test('empty discovery keeps an explicit manual-data error and blocks preview', async () => {
  const fixture = await createSetupPreview('discovery-empty');
  await render(<ContextScreen {...fixture} onBack={jest.fn()} onContinue={jest.fn()} />);
  await screen.findByText('Chưa có điểm công cộng');
  await press('Xem món mẫu theo bối cảnh'); expect(screen.getByText('Hãy chọn điểm ăn công cộng trong vùng hỗ trợ.')).toBeOnTheScreen();
});

test('network read failure offers reload and does not retain stale form data', async () => {
  const fixture = await createSetupPreview();
  const discovery = jest.spyOn(fixture.repository, 'getDiscoveryContext');
  discovery.mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  await render(<ContextScreen {...fixture} onBack={jest.fn()} onContinue={jest.fn()} />);
  await screen.findByText('Chưa tải được bối cảnh');
  expect(screen.queryByLabelText('Giờ ăn (UTC+7)')).toBeNull();
  await press('Tải lại bối cảnh'); await screen.findByLabelText('Giờ ăn (UTC+7)');
  expect(discovery).toHaveBeenCalledTimes(2);
});

test('after ACK a failed snapshot blocks continuation and retries only the read', async () => {
  const fixture = await context();
  const read = fixture.repository.getRoomSnapshot.bind(fixture.repository);
  jest.spyOn(fixture.repository, 'getRoomSnapshot').mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } }).mockImplementation(read);
  await confirmAndPreview(); await press('Lưu bối cảnh mẫu');
  await screen.findByText('Đã lưu, chưa tải lại được phòng');
  expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeDisabled();
  expect(fixture.onSaved).not.toHaveBeenCalled();
  await press('Tải lại phòng đã lưu'); await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
  expect(fixture.update).toHaveBeenCalledTimes(1);
});

test('pending preference write locks skip and duplicate presses until ACK', async () => {
  const fixture = await preferences('ready');
  const send = fixture.update.getMockImplementation()!;
  let release!: () => void;
  const gate = new Promise<void>(done => { release = done; });
  fixture.update.mockImplementation(async req => { const result = await send(req); await gate; return result; });
  await press('Lưu khẩu vị mẫu');
  expect(screen.getByRole('button', { name: 'Lưu khẩu vị mẫu' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Về trang chủ' })).toBeDisabled();
  await press('Về trang chủ'); expect(fixture.onHome).not.toHaveBeenCalled();
  await press('Bỏ qua sở thích mềm'); await press('Lưu khẩu vị mẫu');
  expect(fixture.update).toHaveBeenCalledTimes(1);
  await act(async () => { release(); });
  await waitFor(() => expect(fixture.onSaved).toHaveBeenCalledTimes(1));
});

test.each(['LOBBY', 'ROUND_1'] as const)('expired/locked %s room cannot submit context or preferences', async state => {
  const fixture = await createSetupPreview();
  const read = fixture.repository.getRoomSnapshot.bind(fixture.repository);
  jest.spyOn(fixture.repository, 'getRoomSnapshot').mockImplementation(async id => {
    const result = await read(id);
    return result.ok ? { ok: true, data: { ...result.data, state, expiresAt: state === 'LOBBY' ? '2000-01-01T00:00:00Z' : result.data.expiresAt } } : result;
  });
  const update = jest.spyOn(fixture.repository, 'updatePreferences');
  await render(<PreferencesScreen {...fixture} catalogue={setupCatalogue} onBack={jest.fn()} />);
  await screen.findByText('Chưa thể sửa khẩu vị');
  await press('Lưu khẩu vị mẫu'); expect(update).not.toHaveBeenCalled();
});
