import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UpdateRequiredScreen } from '../../src/features/release/screens/UpdateRequiredScreen';
import { EmbeddedDishMap, dishMapHtml, dishMapUrl } from '../../src/features/result/components/EmbeddedDishMap';
import { NearbyPlacesSection } from '../../src/features/result/components/NearbyPlacesSection';
import { PushSettingsScreen } from '../../src/features/inbox/screens/PushSettingsScreen';
import { PermissionsWelcomeScreen } from '../../src/features/permissions/screens/PermissionsWelcomeScreen';
import type { PermissionKind, PermissionService } from '../../src/features/permissions/services/appPermissions';
import { scoredResultFixture } from '../../src/features/result/services/devResultCases';
import DevIconsRoute from '../../src/app/dev/icons';
import DevResultRoute from '../../src/app/dev/result';
import DevFlashcardRoute from '../../src/app/dev/flashcard';
import DevRoundTwoRoute from '../../src/app/dev/round-two';

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  isLoading: () => false,
  loadAsync: async () => undefined,
}));

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ status: 'undetermined', granted: false }),
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false }),
  getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[test]' }),
  setNotificationChannelAsync: async () => undefined,
  addNotificationResponseReceivedListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponseAsync: async () => null,
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlocked',
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));

jest.mock('react-native-webview', () => ({
  WebView: ({ source }: { source?: { html?: string } }) => {
    const react = jest.requireActual<typeof import('react')>('react');
    const rn = jest.requireActual<typeof import('react-native')>('react-native');
    return react.createElement(rn.View, { testID: 'mock-webview' }, react.createElement(rn.Text, null, source?.html ?? ''));
  },
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function wrap(ui: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

describe('GM-54 component safety, update gate, maps embed, and push hiding', () => {
  const prevProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const prevPlacesKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  const prevDev = (globalThis as Record<string, unknown>).__DEV__;

  afterEach(() => {
    if (prevProjectId === undefined) delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    else process.env.EXPO_PUBLIC_EAS_PROJECT_ID = prevProjectId;
    if (prevPlacesKey === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    else process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = prevPlacesKey;
    (globalThis as Record<string, unknown>).__DEV__ = prevDev;
    if (Constants.expoConfig?.extra) {
      delete Constants.expoConfig.extra.eas;
    }
    jest.clearAllMocks();
  });

  test('TC-REL-003 UpdateRequiredScreen renders versions and opens update store URL', async () => {
    const onOpenUrl = jest.fn().mockResolvedValue(undefined);
    const rendered = await wrap(
      <UpdateRequiredScreen
        currentVersion="1.0.0"
        minimumVersion="1.2.0"
        updateUrl="https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile"
        message="Có phiên bản mới bắt buộc."
        onOpenUrl={onOpenUrl}
      />,
    );

    expect(screen.getByRole('header', { name: 'Cần cập nhật' })).toBeOnTheScreen();
    expect(screen.getByText('1.0.0')).toBeOnTheScreen();
    expect(screen.getByText('1.2.0')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật ứng dụng' }));
    expect(onOpenUrl).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile');
    await rendered.unmount();
  }, 30000);

  test('UpdateRequiredScreen surfaces an accessible error if opening the store fails', async () => {
    const onOpenUrl = jest.fn().mockRejectedValue(new Error('cannot open'));
    const rendered = await wrap(
      <UpdateRequiredScreen
        currentVersion="1.0.0"
        minimumVersion="1.2.0"
        updateUrl="javascript:alert(1)"
        message="Vui lòng cập nhật."
        onOpenUrl={onOpenUrl}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật ứng dụng' }));
    expect(onOpenUrl).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile');
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    await rendered.unmount();
  });

  test('EmbeddedDishMap uses Maps Embed API v1 when key exists, omits output=embed, and skips WebView when unkeyed', async () => {
    expect(dishMapUrl('Phở bò', '')).toBeNull();
    expect(dishMapHtml('Phở bò', '')).toBeNull();

    const embedUrl = dishMapUrl('Phở bò', 'maps-api-key');
    expect(embedUrl).toContain('https://www.google.com/maps/embed/v1/search?');
    expect(embedUrl).not.toContain('output=embed');

    const result = scoredResultFixture();
    const unkeyedView = await wrap(
      <NearbyPlacesSection
        result={result}
        mapApiKey=""
        actions={{
          onHome: jest.fn(),
          onNewSession: jest.fn(),
          onRetryResult: jest.fn(),
          onRetryPlaces: jest.fn(),
          onRequestLocation: jest.fn(),
          onOpenSettings: jest.fn(),
          onExternalAction: jest.fn(async () => ({ ok: true })),
        }}
      />,
    );
    expect(screen.queryByTestId('embedded-dish-map')).toBeNull();
    expect(screen.getByRole('button', { name: 'Mở Google Maps' })).toBeOnTheScreen();
    await unkeyedView.unmount();

    const keyedView = await wrap(<EmbeddedDishMap dishName="Bún bò" apiKey="maps-api-key" />);
    expect(screen.getByTestId('embedded-dish-map')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-webview')).toHaveTextContent(/google\.com\/maps\/embed\/v1\/search\?key=maps-api-key/);
    await keyedView.unmount();
  });

  test('TC-REL-009 hides missing-EAS prompt on PushSettingsScreen when EAS project ID is unset', async () => {
    delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (Constants.expoConfig?.extra) {
      delete Constants.expoConfig.extra.eas;
    }

    const onInbox = jest.fn();
    const fakeRepo = {
      getCurrentUser: () => ({ id: 'usr-1', displayName: 'Trang', isGuest: false, createdAt: '2026-01-01T00:00:00Z' }),
      getSessionStatus: () => 'active' as const,
      getApiClient: () => ({}) as never,
    } as never;

    const pushView = await wrap(<PushSettingsScreen repository={fakeRepo} onHome={jest.fn()} onInbox={onInbox} />);
    expect(screen.queryByText(/Thiếu cấu hình EAS Project ID/)).toBeNull();
    expect(screen.queryByText('Bật thông báo')).toBeNull();
    const inboxButton = await screen.findByRole('button', { name: 'Mở Hộp thư' });
    await fireEvent.press(inboxButton);
    expect(onInbox).toHaveBeenCalledTimes(1);
    await pushView.unmount();
  }, 30000);

  test('TC-REL-009 hides unavailable notifications permission row on PermissionsWelcomeScreen', async () => {
    const ensured: PermissionKind[] = [];
    const service: PermissionService = {
      status: async kind => (kind === 'notifications' ? 'unavailable' : 'undetermined'),
      ensure: async kind => {
        ensured.push(kind);
        return 'granted';
      },
      openSettings: async () => undefined,
    };
    const onDone = jest.fn();
    const permView = await wrap(<PermissionsWelcomeScreen service={service} onDone={onDone} />);
    await waitFor(() => expect(screen.queryByText('Thông báo')).toBeNull());
    expect(screen.queryByText('Chưa hỗ trợ trên bản này')).toBeNull();
    expect(screen.getByText('Camera')).toBeOnTheScreen();
    expect(screen.getByText('Vị trí')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cho phép' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(ensured).toEqual(['camera', 'location']);
    await permView.unmount();
  }, 30000);

  test('TC-REL-008 dev routes redirect home when __DEV__ is false', async () => {
    (globalThis as Record<string, unknown>).__DEV__ = false;

    for (const Route of [DevIconsRoute, DevResultRoute, DevFlashcardRoute, DevRoundTwoRoute]) {
      jest.mocked(Redirect).mockClear();
      const rendered = await render(<Route />);
      expect(jest.mocked(Redirect)).toHaveBeenCalled();
      expect(jest.mocked(Redirect).mock.lastCall?.[0]).toMatchObject({ href: '/' });
      await rendered.unmount();
    }
  }, 30000);
});
