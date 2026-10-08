import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { BootstrapScreen } from '../src/features/bootstrap/screens/BootstrapScreen';
import { readCounter } from '../src/features/bootstrap/services/counterStore';
import { configureLocalNotifications, scheduleLocalNotification } from '../src/features/bootstrap/services/localNotifications';

jest.mock('expo-camera', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory must load View inside its isolated scope
  CameraView: require('react-native').View, useCameraPermissions: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'bare' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }) }));
jest.mock('../src/features/bootstrap/services/counterStore', () => ({ readCounter: jest.fn(), incrementCounter: jest.fn(), resetCounter: jest.fn() }));
jest.mock('../src/features/bootstrap/services/localNotifications', () => ({ configureLocalNotifications: jest.fn(), scheduleLocalNotification: jest.fn() }));

describe('bootstrap user actions with mocked native SDKs', () => {
  const askCamera = jest.fn();
  function cameraPermission(granted: boolean) {
    const permission = { granted, canAskAgain: true, status: granted ? 'granted' : 'undetermined', expires: 'never' };
    jest.mocked(useCameraPermissions).mockReturnValue([permission, askCamera, jest.fn()] as ReturnType<typeof useCameraPermissions>);
    askCamera.mockResolvedValue(permission);
  }
  beforeEach(() => {
    askCamera.mockReset();
    cameraPermission(false);
    jest.mocked(readCounter).mockResolvedValue(3);
    jest.mocked(scheduleLocalNotification).mockResolvedValue('denied');
  });
  test('launch reads storage but does not ask either permission', async () => {
    render(<BootstrapScreen />);
    expect(await screen.findByText(/Bộ đếm: 3/)).toBeTruthy();
    expect(askCamera).not.toHaveBeenCalled();
    expect(scheduleLocalNotification).not.toHaveBeenCalled();
    expect(configureLocalNotifications).toHaveBeenCalledTimes(1);
  });
  test('camera deny keeps manual entry usable without auto-join', async () => {
    render(<BootstrapScreen />);
    await screen.findByText(/Bộ đếm: 3/);
    fireEvent.press(screen.getByRole('button', { name: 'Mở camera quét QR' }));
    expect(await screen.findByText(/Camera chưa được cấp quyền/)).toBeTruthy();
    const codeInput = screen.getByLabelText('Mã phòng thử nghiệm');
    fireEvent.changeText(codeInput, 'abc234');
    expect(codeInput.props.value).toBe('ABC234');
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra mã' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/join', params: { code: 'ABC234' } });
  });
  test('notification deny is shown and other controls remain available', async () => {
    render(<BootstrapScreen />);
    await screen.findByText(/Bộ đếm: 3/);
    fireEvent.press(screen.getByRole('button', { name: 'Xin quyền và thử thông báo cục bộ' }));
    expect(await screen.findByText(/Quyền thông báo bị từ chối/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tăng bộ đếm' })).toBeEnabled();
  });
  test('duplicate camera callbacks navigate only once', async () => {
    cameraPermission(true);
    render(<BootstrapScreen />);
    await screen.findByText(/Bộ đếm: 3/);
    fireEvent.press(screen.getByRole('button', { name: 'Mở camera quét QR' }));
    const camera = await screen.findByLabelText('Camera quét QR thử nghiệm');
    const onScan = camera.props.onBarcodeScanned;
    act(() => {
      onScan({ data: 'gi-cung-duoc://join?code=ABC234' });
      onScan({ data: 'gi-cung-duoc://join?code=ABC234' });
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
