import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HistoryScreen } from '../../src/features/history/screens/HistoryScreen';
import { SetupChoice } from '../../src/features/context/components/SetupChoice';
import { SetupScheduleSummary } from '../../src/features/context/components/SetupScheduleSummary';
import { SetupTimeMode } from '../../src/features/context/components/SetupTimeMode';
import { RoundTwoNotice } from '../../src/features/voting/components/RoundTwoNotice';
import { ToastProvider } from '../../src/shared/ui/feedback/Toast';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}><ToastProvider>{node}</ToastProvider></SafeAreaProvider>);

test('a tile given an exact width uses it as its flex basis, so it fills the row', async () => {
  await wrap(<SetupChoice label="Cơm" stacked width={150} selected={false} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Cơm' })).toHaveStyle({ width: 150, flexBasis: 150, flexGrow: 0 });
});

test('a compact tile is shorter than a normal stacked tile', async () => {
  await wrap(<><SetupChoice label="Ăn sáng" stacked compact width={150} selected={false} onPress={jest.fn()} /><SetupChoice label="Ăn trưa" stacked width={150} selected={false} onPress={jest.fn()} /></>);
  const compact = screen.getByRole('button', { name: 'Ăn sáng' }).props.style;
  const normal = screen.getByRole('button', { name: 'Ăn trưa' }).props.style;
  const minHeight = (style: unknown) => (Array.isArray(style) ? style.flat(3) : [style]).reduce((value, part) => (part && typeof part === 'object' && 'minHeight' in part ? (part as { minHeight: number }).minHeight : value), 0);
  expect(minHeight(compact)).toBeLessThan(minHeight(normal));
});

test('the time tab stays on "Hẹn giờ" while the schedule sheet is open', async () => {
  await wrap(<SetupTimeMode scheduled={false} scheduleOpen onNow={jest.fn()} onSchedule={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Hẹn giờ' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('button', { name: 'Ăn ngay' }).props.accessibilityState.selected).toBe(false);
});

test('the chosen time is one button that reopens the sheet, with no separate "Sửa"', async () => {
  const edit = jest.fn();
  await wrap(<SetupScheduleSummary value="2026-12-18T22:59:00+07:00" onEdit={edit} />);
  expect(screen.queryByText('Sửa')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /Đổi giờ hẹn/ }));
  expect(edit).toHaveBeenCalledTimes(1);
});

describe('round two notice', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  test('says how many dishes go on and the removal cap, then continues by itself after 5 seconds', async () => {
    const onContinue = jest.fn();
    await wrap(<RoundTwoNotice remaining={6} onContinue={onContinue} />);
    expect(screen.getByText('Còn 6 món vào vòng 2.')).toBeOnTheScreen();
    expect(screen.getByText('Mỗi người loại tối đa 2 món.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Vào vòng 2 (5)' })).toBeOnTheScreen();
    // One tick per act: React applies each countdown step before the next timer is set.
    for (let second = 0; second < 4; second += 1) await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('button', { name: 'Vào vòng 2 (1)' })).toBeOnTheScreen();
    expect(onContinue).not.toHaveBeenCalled();
    await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test('the button continues straight away; one dish still allows removing one', async () => {
    const onContinue = jest.fn();
    await wrap(<RoundTwoNotice remaining={1} onContinue={onContinue} />);
    expect(screen.getByText('Mỗi người loại tối đa 1 món.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Vào vòng 2/ }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

test('history shows the keep-history switch and turns it on for the account', async () => {
  const updateConsent = jest.fn(async () => ({ ok: true as const, requestId: 'r', data: undefined }));
  const repository = {
    cached: () => undefined, cachedDurable: async () => undefined,
    fetch: async () => ({ ok: true as const, data: { items: [], fetchedAt: '2026-11-13T00:00:00Z' } }),
    readConsent: async () => ({ ok: true as const, data: { personal: false, group: false } }),
    updateConsent, delete: jest.fn(), invalidate: jest.fn(),
  };
  await wrap(<HistoryScreen repository={repository as never} onNavigate={jest.fn()} onHome={jest.fn()} />);
  const toggle = await screen.findByLabelText('Lưu lịch sử bữa ăn');
  expect(toggle.props.value).toBe(false);
  expect(await screen.findByText('Bật Lưu lịch sử ở trên để lưu các bữa sau.')).toBeOnTheScreen();
  await fireEvent(toggle, 'valueChange', true);
  await waitFor(() => expect(updateConsent).toHaveBeenCalledWith({ scope: 'personal', consent: true }));
  await waitFor(() => expect(screen.getByLabelText('Lưu lịch sử bữa ăn').props.value).toBe(true));
});
